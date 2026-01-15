-- ============================================
-- FIX: Allow Owner to UPDATE their Staff's profiles
-- ============================================

-- Drop old restrictive policies if exist
DROP POLICY IF EXISTS "Users can update own profiles" ON public.profiles;
DROP POLICY IF EXISTS "Owner can update staff profiles" ON public.profiles;

-- 1. Policy: Users can update their OWN profile
CREATE POLICY "Users can update own profiles"
ON public.profiles FOR UPDATE
USING (id = auth.uid());

-- 2. Policy: Owner can update their Staff's profile (parent_id = owner's id)
CREATE POLICY "Owner can update staff profiles"
ON public.profiles FOR UPDATE
USING (parent_id = auth.uid());

-- Verify: Check current policies
-- SELECT * FROM pg_policies WHERE tablename = 'profiles';
