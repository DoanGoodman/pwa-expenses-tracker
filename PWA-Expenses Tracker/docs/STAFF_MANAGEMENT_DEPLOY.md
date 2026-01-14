# Hướng dẫn Triển khai Tính năng Quản lý Nhân viên (Cha-Con)

## Tổng quan
Tính năng này cho phép **Owner** (người sở hữu) tạo và quản lý tài khoản **Staff** (nhân viên). Staff chỉ có thể truy cập các trang Chi phí và Thêm mới, đồng thời chỉ thấy dữ liệu do chính họ tạo ra.

---

## 📋 Các bước triển khai

### Bước 1: Chạy Migration SQL

1. Truy cập [Supabase Dashboard](https://supabase.com/dashboard)
2. Chọn project của bạn
3. Vào **SQL Editor**
4. Copy nội dung file `supabase/migrations/002_staff_management.sql`
5. Paste và chạy query

**Lưu ý**: Migration này sẽ:
- Tạo bảng `profiles` với các cột: id, username, email, role, parent_id
- Tạo trigger tự động tạo profile khi user mới đăng ký
- Tạo RLS policies cho bảng `profiles` và `expenses`
- Tự động tạo profile cho các user hiện có

---

### Bước 2: Deploy Edge Function

1. Cài đặt Supabase CLI (nếu chưa có):
```bash
npm install -g supabase
```

2. Đăng nhập:
```bash
supabase login
```

3. Link project:
```bash
supabase link --project-ref <your-project-ref>
```

4. Deploy Edge Function:
```bash
supabase functions deploy create-staff-account
```

5. Set secrets (bắt buộc):
```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

**Lấy Service Role Key:**
- Vào Supabase Dashboard > Settings > API
- Copy giá trị `service_role` (giữ bí mật, không commit lên Git!)

---

### Bước 3: Deploy Frontend lên Vercel

1. Commit tất cả thay đổi:
```bash
git add .
git commit -m "feat: add staff management feature"
git push origin main
```

2. Vercel sẽ tự động build và deploy

---

## 🔧 Cấu trúc file đã thay đổi

### Database
- `supabase/migrations/002_staff_management.sql` - Migration tạo bảng và policies

### Edge Function
- `supabase/functions/create-staff-account/index.ts` - API tạo tài khoản staff

### Frontend
- `src/contexts/AuthContext.jsx` - Thêm profile và userRole
- `src/components/layout/Header.jsx` - Thêm menu "Quản lý nhân viên"
- `src/components/layout/BottomNav.jsx` - Ẩn tab theo role
- `src/components/common/StaffManagementModal.jsx` - Modal quản lý nhân viên
- `src/App.jsx` - Thêm route protection cho staff

---

## 📱 Cách sử dụng

### Đối với Owner:
1. Nhấn vào avatar (góc trên phải)
2. Chọn "Quản lý nhân viên"
3. Nhấn "Thêm nhân viên mới"
4. Nhập tên đăng nhập và mật khẩu
5. Nhấn "Tạo tài khoản"

### Đối với Staff:
1. Đăng nhập bằng email ảo: `<username>@qswings.app`
2. Sử dụng mật khẩu được Owner cung cấp
3. Chỉ có thể truy cập tab "Chi phí" và "Thêm mới"
4. Chỉ thấy và quản lý dữ liệu do chính mình tạo

---

## 🔒 Bảo mật

### RLS Policies đã thiết lập:

**Bảng `profiles`:**
- SELECT: User có thể xem profile của mình và staff của mình
- UPDATE: User chỉ có thể sửa profile của mình
- INSERT: Chỉ service role (Edge Function) mới có thể insert

**Bảng `expenses`:**
- Staff: Chỉ CRUD dữ liệu có `user_id = auth.uid()`
- Owner: CRUD dữ liệu của mình + dữ liệu của staff có `parent_id` trỏ về mình

---

## 🐛 Troubleshooting

### Lỗi "Only owners can create staff accounts"
- Kiểm tra profile của bạn có `role = 'owner'` không
- Chạy SQL: `SELECT * FROM profiles WHERE id = '<your-user-id>'`

### Lỗi "Username already exists"
- Tên đăng nhập đã được sử dụng
- Chọn tên khác

### Edge Function không hoạt động
- Kiểm tra đã deploy function chưa: `supabase functions list`
- Kiểm tra secrets: `supabase secrets list`
- Xem logs: `supabase functions logs create-staff-account`

### Staff không thấy trong danh sách
- Kiểm tra RLS policy cho bảng profiles
- Đảm bảo `parent_id` được set đúng

---

## 📝 Ghi chú kỹ thuật

1. **Email ảo**: Staff sử dụng email dạng `username@qswings.app` để đăng nhập. Email này không tồn tại thực tế.

2. **Skip email verification**: Edge Function sử dụng `email_confirm: true` để staff đăng nhập được ngay.

3. **Không logout Owner**: Việc tạo staff sử dụng Admin API thông qua Edge Function, không ảnh hưởng đến session của Owner.

4. **Demo mode**: Trong demo mode, tất cả user được coi là owner.
