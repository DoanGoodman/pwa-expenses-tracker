-- ============================================
-- FIX: Infinite Recursion in profiles RLS
-- Replace subquery policy with SECURITY DEFINER function
-- ============================================

-- 1. XÓA policy gây infinite recursion
DROP POLICY IF EXISTS "Staff can read parent profile" ON public.profiles;

-- 2. Tạo function SECURITY DEFINER để check parent is_active 
-- (bypass RLS, chỉ trả về is_active status)
CREATE OR REPLACE FUNCTION public.check_parent_is_active()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT COALESCE(
        (SELECT is_active 
         FROM public.profiles 
         WHERE id = (
             SELECT parent_id 
             FROM public.profiles 
             WHERE id = auth.uid()
         )),
        true  -- Default: active nếu không tìm thấy parent
    );
$$;

-- 3. Tạo function để lấy parent_id của current user (cho các mục đích khác)
CREATE OR REPLACE FUNCTION public.get_my_parent_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT parent_id FROM public.profiles WHERE id = auth.uid();
$$;

-- 4. Grant execute cho authenticated users
GRANT EXECUTE ON FUNCTION public.check_parent_is_active() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_parent_id() TO authenticated;

-- 5. Verify: Check current policies (should NOT have "Staff can read parent profile")
-- SELECT * FROM pg_policies WHERE tablename = 'profiles';

COMMENT ON FUNCTION public.check_parent_is_active IS 'Check if staff parent account is active - bypasses RLS to avoid recursion';
COMMENT ON FUNCTION public.get_my_parent_id IS 'Get parent_id of current user - bypasses RLS';
