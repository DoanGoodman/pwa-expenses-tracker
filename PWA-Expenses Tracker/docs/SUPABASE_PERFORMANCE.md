# Supabase Performance Optimization Guide

## 1. Warm-up Ping (Đã implement trong code)

File: `src/lib/supabase.js`

- Tự động gọi `warmUpSupabase()` sau 100ms khi app load
- Giúp "đánh thức" Supabase connection trước khi data fetch
- Log: `[Supabase] Warm-up completed in Xms`

## 2. RLS Optimization (Cần chạy migration)

### Chạy migration trong Supabase Dashboard:

1. Vào **Supabase Dashboard** → **SQL Editor**
2. Paste nội dung của `supabase/migrations/011_optimize_rls_with_indexes.sql`
3. Click **Run**

### Migration tạo:
- **Indexes** cho các columns thường dùng trong RLS:
  - `idx_projects_user_id`
  - `idx_expenses_user_id`
  - `idx_expenses_project_id`
  - `idx_expenses_project_date` (composite)
  - `idx_expenses_user_deleted` (soft delete)
  - `idx_profiles_user_id`
  - `idx_profiles_parent_id`

- **Helper functions** để tăng tốc RLS checks:
  - `user_owns_project(project_id)` - Check ownership nhanh
  - `get_user_project_ids()` - Get list owned project IDs

## 3. Connection Pooling (Cấu hình trên Supabase Dashboard)

### Bước 1: Enable Connection Pooling

1. Vào **Supabase Dashboard** → **Settings** → **Database**
2. Tìm section **Connection Pooling**
3. Đảm bảo đã bật **Enable Pooling**
4. Connection mode khuyến nghị: **Transaction**

### Bước 2: Pool Size Settings

Supabase free tier có giới hạn connections. Recommended settings:

| Setting | Free Tier | Pro Tier |
|---------|-----------|----------|
| Pool Mode | Transaction | Transaction |
| Pool Size | 15 | 50+ |
| Max Client Connections | 200 | 500+ |

### Bước 3: Sử dụng Pooler URL (cho backend/serverless)

Nếu có serverless functions, dùng **Pooler URL** thay vì Direct URL:

```
# Direct URL (không pooling - KHÔNG dùng cho serverless)
postgresql://user:pass@db.xxx.supabase.co:5432/postgres

# Pooler URL (có pooling - DÙNG cho serverless)
postgresql://user:pass@db.xxx.supabase.co:6543/postgres
```

Lưu ý: Port `6543` là pooler, `5432` là direct.

### Bước 4: Supabase Client (đã optimize trong code)

File: `src/lib/supabase.js` đã có:
- `persistSession: true` - Giữ session giữa các page loads
- `autoRefreshToken: true` - Tự động refresh token
- Custom fetch với **10s timeout** - Tránh request hang vô hạn
- Realtime events throttled - Giảm connection overhead

## 4. Monitor Performance

### Trong Supabase Dashboard:

1. **Database** → **Performance** → Query Performance
2. Xem các slow queries
3. Check connection pool usage

### Trong App:

Xem console logs:
- `[Supabase] Warm-up completed in Xms` - Thời gian kết nối ban đầu
- `Safety timeout` warnings giảm = performance cải thiện

## 5. Additional Tips

### Giảm số lần query:

1. **Batch fetch** - Lấy nhiều data một lần thay vì nhiều request nhỏ
2. **Cache aggressively** - App đã dùng localStorage cache
3. **Limit results** - Thêm `.limit()` cho các queries

### Tối ưu queries:

```javascript
// ❌ Không tốt - lấy hết columns
const { data } = await supabase.from('expenses').select('*')

// ✅ Tốt hơn - chỉ lấy columns cần thiết
const { data } = await supabase.from('expenses').select('id, description, amount, expense_date')
```

### Tắt Realtime nếu không dùng:

Đã thực hiện trong `supabase.js`:
```javascript
realtime: {
    params: { eventsPerSecond: 1 }
}
```
