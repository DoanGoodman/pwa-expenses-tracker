-- ============================================
-- FIX: Add SELECT policies for profiles table
-- Allows:
-- 1. Users to read their own profile
-- 2. Owners to read their staff's profiles
-- 3. Staff to read their parent owner's profile (for is_active check)
-- ============================================

-- Drop old policies if exist
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Owner can read staff profiles" ON public.profiles;
DROP POLICY IF EXISTS "Staff can read parent profile" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can read profiles" ON public.profiles;

-- 1. Users can read their OWN profile
CREATE POLICY "Users can read own profile"
ON public.profiles FOR SELECT
USING (id = auth.uid());

-- 2. Owners can read their staff's profiles (for Staff Management modal)
CREATE POLICY "Owner can read staff profiles"
ON public.profiles FOR SELECT
USING (parent_id = auth.uid());

-- 3. Staff can read their parent's profile (for is_active check)
CREATE POLICY "Staff can read parent profile"
ON public.profiles FOR SELECT
USING (
    id IN (
        SELECT parent_id 
        FROM public.profiles 
        WHERE id = auth.uid()
    )
);

-- Verify policies
-- SELECT * FROM pg_policies WHERE tablename = 'profiles';
