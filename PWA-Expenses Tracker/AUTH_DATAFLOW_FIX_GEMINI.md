# Auth & Data Flow Audit: Fix Infinite Loading on RefreshTài liệu này tổng hợp nguyên nhân và giải pháp sửa lỗi "Treo App (Infinite Loading)" khi refresh trang, cũng như chuẩn hóa luồng dữ liệu dựa trên `#DATABASE_MAP.md`.---## 🛑 Nguyên nhân Gốc rễ (Root Cause Analysis)1.  **Blocking Auth Initialization**:    *   `AuthContext` hiện tại đang chờ `fetchProfile` (lấy dữ liệu từ bảng `profiles`) hoàn tất mới set `loading = false`.    *   Khi mạng chậm hoặc RLS Policy của bảng `profiles` xử lý lâu → `loading` state bị kẹt mãi ở `true`.2.  **Race Conditions**:    *   Các hook lấy dữ liệu (`useExpenses`, `useDashboardStats`) chạy ngay khi component mount, bất chấp `session` đã sẵn sàng hay chưa.    *   Hậu quả: Gọi API với `uid = null` → Bị RLS chặn → Lỗi logic/Crash.3.  **BigInt Data Loss**:    *   `projects.id` là **BigInt**. Nếu ép kiểu sang `Number` trong JS để lưu vào State/URL, giá trị sẽ bị sai lệch (mất độ chính xác) hoặc gây lỗi so sánh.---## 🛠️ Kế hoạch Triển khai (Implementation Plan)### 1. Sửa `AuthContext.jsx` (Ưu tiên cao nhất)Mục tiêu: Tách rời quá trình "Lấy Session" và "Lấy Profile". App phải render được ngay khi có Session, Profile sẽ load ngầm (Background).```javascript// filepath: src/contexts/AuthContext.jsximport { createContext, useContext, useEffect, useState, useRef } from 'react';import { supabase } from '../lib/supabase';const AuthContext = createContext();export const AuthProvider = ({ children }) => {  const [user, setUser] = useState(null);  const [session, setSession] = useState(null);  const [profile, setProfile] = useState(null);  const [userRole, setUserRole] = useState(null); // Fallback: 'owner'
  
  // State mới: authReady xác định việc khởi tạo session đã xong chưa
  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);

  // Hàm fetch profile chạy ngầm, không block UI
  const fetchProfileBackground = async (userId) => {
    // 1. Thử load từ cache LocalStorage ngay lập tức để render UI
    const cached = localStorage.getItem('cached_profile');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.id === userId) {
            setProfile(parsed);
            setUserRole(parsed.role ?? 'owner');
        }
      } catch (e) {}
    }

    // 2. Fetch mới từ Server (có timeout để tránh treo)
    const ctrl = new AbortController();
    const timeoutId = setTimeout(() => ctrl.abort(), 8000);

    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
        .abortSignal(ctrl.signal);

      if (data) {
        setProfile(data);
        setUserRole(data.role ?? 'owner');
        localStorage.setItem('cached_profile', JSON.stringify(data));
      }
    } catch (err) {
      console.warn('Profile background fetch warning:', err);
    } finally {
      clearTimeout(timeoutId);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const currentSession = data?.session ?? null;

        if (mounted) {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          
          // ⚠️ QUAN TRỌNG: Auth đã sẵn sàng, dù chưa có profile
          setAuthReady(true);
          setLoading(false); 

          if (currentSession?.user) {
            fetchProfileBackground(currentSession.user.id);
          } else {
             // Clear cache nếu logout
             localStorage.removeItem('cached_profile');
          }
        }
      } catch (error) {
        console.error("Auth init failed", error);
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (mounted) {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setAuthReady(true);
        setLoading(false);
        
        if (newSession?.user) {
          fetchProfileBackground(newSession.user.id);
        } else {
          setProfile(null);
          localStorage.removeItem('cached_profile');
        }
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const value = {
    user,
    session,
    profile,
    userRole: userRole || 'owner', // Default role để tránh crash UI
    loading,
    authReady // Expose cờ này cho Router
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
```

### 2. Sửa `App.jsx` (Routing Logic)

Sử dụng `authReady` để quyết định khi nào hiện Loading và khi nào Redirect.

```javascript
// filepath: src/App.jsx
// ...
const ProtectedRoute = ({ children }) => {
  const { user, authReady } = useAuth();

  if (!authReady) {
    // Chưa sẵn sàng, hiện loader
    return <LoadingSpinner />;
  }

  if (!user) {
    // Đã sẵn sàng nhưng không có user (chưa đăng nhập)
    return <Navigate to="/login" replace />;
  }

  // Đã đăng nhập và authReady là true
  return children;
};
// ...
```

### 3. Sửa các Hook và Service Fetch Dữ Liệu

Tất cả các hook/service fetch dữ liệu cần phải guard theo `authReady` và `session?.user?.id`.

Ví dụ với `useSupabase.js`:

```javascript
// filepath: src/hooks/useSupabase.js
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export const useExpenses = () => {
  const { authReady, session } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!authReady || !session?.user?.id) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await supabase
          .from('expenses')
          .select('*')
          .eq('user_id', session.user.id);

        setExpenses(data);
      } catch (error) {