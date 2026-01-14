-- ============================================
-- MIGRATION: Quản lý tài khoản nhân viên (Cha-Con)
-- ============================================

-- 1. Tạo bảng profiles để lưu thông tin user và role
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    email TEXT,
    role TEXT DEFAULT 'owner' CHECK (role IN ('owner', 'staff')),
    parent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Bật RLS cho bảng profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Owner có thể xem profile của mình và tất cả staff con
CREATE POLICY "Users can view own profile and staff profiles"
ON public.profiles FOR SELECT
USING (
    auth.uid() = id 
    OR parent_id = auth.uid()
);

-- 4. Policy: Chỉ có thể update profile của chính mình
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- 5. Policy: Cho phép insert từ service role (Edge Function)
CREATE POLICY "Service role can insert profiles"
ON public.profiles FOR INSERT
WITH CHECK (true);

-- 6. Trigger tự động tạo profile khi user mới đăng ký
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, email, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'role', 'owner')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger nếu đã tồn tại
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Tạo trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- RLS POLICIES CHO BẢNG EXPENSES
-- ============================================

-- Xóa policies cũ nếu có
DROP POLICY IF EXISTS "Staff can only see own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Owner can see own and staff expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can insert own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can update own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can delete own expenses" ON public.expenses;

-- Policy SELECT: Staff chỉ thấy của mình, Owner thấy của mình + staff
CREATE POLICY "expenses_select_policy"
ON public.expenses FOR SELECT
USING (
    user_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = expenses.user_id 
        AND profiles.parent_id = auth.uid()
    )
);

-- Policy INSERT: Chỉ có thể thêm expense cho chính mình
CREATE POLICY "expenses_insert_policy"
ON public.expenses FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Policy UPDATE: Staff chỉ sửa của mình, Owner sửa của mình + staff
CREATE POLICY "expenses_update_policy"
ON public.expenses FOR UPDATE
USING (
    user_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = expenses.user_id 
        AND profiles.parent_id = auth.uid()
    )
);

-- Policy DELETE: Staff chỉ xóa của mình, Owner xóa của mình + staff
CREATE POLICY "expenses_delete_policy"
ON public.expenses FOR DELETE
USING (
    user_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = expenses.user_id 
        AND profiles.parent_id = auth.uid()
    )
);

-- ============================================
-- TẠO PROFILE CHO USER HIỆN TẠI (nếu chưa có)
-- ============================================
-- Chạy một lần để tạo profile cho các user đã tồn tại
INSERT INTO public.profiles (id, username, email, role)
SELECT 
    id,
    COALESCE(raw_user_meta_data->>'username', split_part(email, '@', 1)),
    email,
    'owner'
FROM auth.users
ON CONFLICT (id) DO NOTHING;
