-- ============================================
-- Add is_active column to profiles for account disabling
-- ============================================

-- 1. Thêm cột is_active (mặc định là true)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. Cập nhật tất cả profiles hiện có thành active
UPDATE public.profiles 
SET is_active = true 
WHERE is_active IS NULL;

-- 3. Comment giải thích
COMMENT ON COLUMN public.profiles.is_active IS 'Đánh dấu tài khoản có hoạt động hay không. false = bị vô hiệu hóa bởi owner';
