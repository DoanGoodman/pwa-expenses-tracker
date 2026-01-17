# Auth & Data Flow Fixes (Post-Refresh Infinite Loading)

## Vấn đề
- `loading` không được set `false` nếu fetch profile timeout/abort → UI kẹt spinner sau refresh.
- Các hook fetch data gọi khi `session` chưa sẵn → RLS chặn/timeout.
- Protected routes chưa phân biệt rõ `authReady` vs `unauthenticated`.
- BigInt ID (projects/categories/expenses) có nguy cơ bị ép Number khi đọc từ URL/localStorage.

## Giải pháp chính
1) **AuthContext**
   - Sau `getSession`, đặt `loading=false` ngay, không chờ fetch profile.
   - Thêm `authReady` flag.
   - Dùng cache `cached_profile` để render tức thì; fetch profile chạy nền có timeout (8s).
   - `onAuthStateChange` luôn `setLoading(false)` và `setAuthReady(true)`.

2) **Protected Routes**
   - Nếu `!authReady` → loader.
   - Nếu `authReady && !user` → redirect `/login`.
   - Ngược lại render nội dung.

3) **Data Fetch Hooks (expenses, dashboard, receiptService, feature perms)**
   - Guard: chỉ fetch khi `authReady && session.user.id`; nếu chưa sẵn sàng, `setIsLoading(false)` và trả mảng rỗng.

4) **BigInt Safety**
   - Giữ ID từ URL/localStorage dưới dạng string; không `Number()`.
   - Khi query Supabase: `.eq('project_id', projectIdStr)`.

## Mã cần cập nhật (tóm tắt)
- `src/contexts/AuthContext.jsx`: thêm `authReady`, bỏ chặn loading bởi profile fetch, fetch profile nền với timeout.
- `src/App.jsx` (hoặc PrivateRoute): dùng `authReady` trong logic render/redirect.
- `src/hooks/useSupabase.js` & các hook/services fetch: guard theo `authReady && session?.user?.id`.
- Các nơi đọc BigInt ID từ URL/localStorage: giữ dạng string khi so sánh/filter/query.

## Kết quả kỳ vọng
- Refresh không còn spinner vô hạn.
- Không còn call API khi session null → tránh RLS block.
- Join/filter BigInt an toàn, không mất chính xác.