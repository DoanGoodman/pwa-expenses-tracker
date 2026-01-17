# Auth & Data Flow Audit: Fix Infinite Loading on Refresh

Tài liệu này tổng hợp nguyên nhân và giải pháp sửa lỗi "Treo App (Infinite Loading)" khi refresh trang.

**Tổng hợp từ:** `AUTH_DATAFLOW_FIX_GPT.md`, `AUTH_DATAFLOW_FIX_GEMINI.md`, Console logs

---

## 🛑 Nguyên nhân Gốc rễ (Root Cause Analysis)

### 1. Blocking Auth Initialization
- **Vấn đề:** `AuthContext` đang chờ `fetchProfile()` hoàn tất mới set `loading = false`
- **Hậu quả:** Khi mạng chậm hoặc RLS timeout (15s) → `loading` kẹt ở `true`
- **Evidence từ Console:**
  ```
  [AuthContext] fetchProfile START
  [AuthContext] Querying profiles table...
  [AuthContext] ⏰ Fetch timeout, aborting...  ← TIMEOUT
  ```

### 2. Routing Logic Sai
- **Vấn đề:** `OwnerRoute` trong `App.jsx` check điều kiện:
  ```javascript
  if (loading || userRole === null) { return <Spinner/> }
  ```
- **Hậu quả:** Dù `loading=false`, nếu `userRole=null` → vẫn hiện spinner vô hạn

### 3. Race Conditions trong Data Hooks
- **Vấn đề:** Hooks như `useExpenses` fetch data ngay khi mount
- **Hậu quả:** Gọi API với `uid = null` → RLS chặn → Silent fail

### 4. BigInt Data Loss (Tiềm ẩn)
- **Vấn đề:** `projects.id`, `expenses.id` (BigInt) nếu ép sang `Number` sẽ mất độ chính xác
- **Quy tắc:** Luôn giữ dạng **String** khi lưu/đọc từ URL/localStorage

---

## 🛠️ Giải pháp Tổng hợp (Consolidated Fix)

### 1. Thêm `authReady` flag vào AuthContext

```javascript
// src/contexts/AuthContext.jsx
const [authReady, setAuthReady] = useState(false) // NEW

// Trong getSession():
const currentUser = session?.user ?? null
setUser(currentUser)
setAuthReady(true)   // ← Session check xong
setLoading(false)    // ← Không chờ profile

// Fetch profile trong background (không await)
if (currentUser) {
  fetchProfile(currentUser.id) // Fire-and-forget
}
```

### 2. Sửa Protected Routes dùng `authReady`

```javascript
// src/App.jsx
const OwnerRoute = ({ children }) => {
  const { authReady, user, isStaff } = useAuth()

  // Chỉ check authReady, KHÔNG check userRole
  if (!authReady) {
    return <Spinner />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (isStaff) {
    return <Navigate to="/expenses" replace />
  }

  return children
}
```

### 3. Guard Data Hooks với authReady

```javascript
// src/hooks/useSupabase.js
useEffect(() => {
  // Guard: Chỉ fetch khi auth sẵn sàng VÀ có user
  if (!authReady || !user?.id) {
    setLoading(false)
    return
  }
  
  // Fetch data...
}, [authReady, user?.id])
```

### 4. Default Role Fallback

```javascript
// AuthContext value
const value = {
  // ...
  userRole: userRole || 'owner', // Fallback để tránh null check
  isOwner: !userRole || userRole === 'owner',
  isStaff: userRole === 'staff',
}
```

---

## 📋 Checklist Implementation

- [ ] **AuthContext.jsx:**
  - [ ] Thêm state `authReady`
  - [ ] Set `authReady=true` + `loading=false` ngay sau `getSession()`
  - [ ] Profile fetch chạy background (không await)
  - [ ] Export `authReady` trong context value
  
- [ ] **App.jsx:**
  - [ ] `OwnerRoute` chỉ check `authReady`, không check `userRole === null`
  - [ ] `AppContent` dùng `authReady` thay vì `loading`

- [ ] **useSupabase.js & các hooks:**
  - [ ] Guard clause: `if (!authReady || !user?.id) return`

---

## ✅ Checklist Kiểm tra Sau sửa

- [ ] **Refresh Test:** F5 trang Dashboard → Spinner biến mất sau < 1s
- [ ] **Slow Network Test:** Throttle 3G → App vẫn render (spinner biến mất)
- [ ] **RLS Check:** Staff không thấy data của Owner
- [ ] **Tab Resume:** Ẩn tab 5+ phút → Mở lại → Không bị logout/crash
- [ ] **URL Params:** Share link `?projectId=...` → Refresh → Đúng project
