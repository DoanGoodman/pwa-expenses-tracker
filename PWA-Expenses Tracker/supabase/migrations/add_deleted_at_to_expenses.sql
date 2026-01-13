-- 1. Thêm cột 'deleted_at' vào bảng 'expenses'
-- Cột này sẽ chứa thời gian xóa. Nếu NULL nghĩa là chưa xóa.
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 2. Tạo INDEX cho cột 'deleted_at'
-- Giúp tăng tốc độ truy vấn khi chúng ta lọc các bản ghi chưa xóa (deleted_at IS NULL)
CREATE INDEX IF NOT EXISTS idx_expenses_deleted_at ON expenses(deleted_at);

-- 3. Tạo Function để dọn dẹp các bản ghi cũ
-- Function này sẽ xóa vĩnh viễn (HARD DELETE) các bản ghi đã xóa mềm (deleted_at khác NULL) 
-- và thời gian xóa đã qua 30 ngày.
CREATE OR REPLACE FUNCTION cleanup_old_expenses()
RETURNS void AS $$
BEGIN
  DELETE FROM expenses
  WHERE deleted_at IS NOT NULL 
  AND deleted_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- (Tùy chọn) 4. Lên lịch chạy tự động bằng pg_cron (nếu Supabase project của bạn đã bật extension này)
-- Bạn có thể chạy lệnh này trong SQL Editor:
-- select cron.schedule(
--   'cleanup-expenses-every-day', -- tên job
--   '0 0 * * *',                  -- chạy vào 00:00 hàng ngày
--   $$SELECT cleanup_old_expenses()$$
-- );
