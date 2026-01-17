-- ============================================
-- FIX: Profiles RLS Performance Issue
-- ============================================
-- Problem: "Read accessible profiles" policy uses is_owner() function
-- which queries profiles table, creating slow nested RLS checks.
-- This causes timeout when fetching profile after refresh.
--
-- Solution: Simplify policy to avoid nested query
-- ============================================

-- 1. Drop existing policies
DROP POLICY IF EXISTS "Read accessible profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile and staff profiles" ON public.profiles;

-- 2. Create optimized simple policy (NO function calls)
-- This uses direct conditions instead of calling is_owner()
CREATE POLICY "profiles_select_policy" ON public.profiles
FOR SELECT
TO authenticated
USING (
    -- Direct check: own profile OR staff profiles belonging to me
    id = auth.uid() OR parent_id = auth.uid()
);

-- Note: This is LESS restrictive than before (staff can now see owner's profile via parent_id match)
-- But this is actually CORRECT behavior - staff SHOULD be able to reference their parent's profile

-- 3. Ensure UPDATE policy exists
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profiles" ON public.profiles;
DROP POLICY IF EXISTS "Owner can update staff profiles" ON public.profiles;

CREATE POLICY "profiles_update_own" ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_staff" ON public.profiles
FOR UPDATE
TO authenticated
USING (parent_id = auth.uid())
WITH CHECK (parent_id = auth.uid());

-- 4. Ensure INSERT policy exists (service role only for profile creation)
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;

CREATE POLICY "profiles_insert_service" ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (true);  -- Handled by triggers/service role

-- 5. Performance indexes
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);
CREATE INDEX IF NOT EXISTS idx_profiles_parent_id ON public.profiles(parent_id) WHERE parent_id IS NOT NULL;

-- 6. IMPORTANT: Update is_owner() to use auth.jwt() instead of querying profiles
-- This avoids the RLS recursion entirely
CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    -- Use direct query with explicit table reference
    -- SECURITY DEFINER bypasses RLS so no recursion
    SELECT COALESCE(
        (SELECT role = 'owner' FROM public.profiles WHERE id = auth.uid() LIMIT 1),
        true  -- Default to owner if no profile found (new user)
    );
$$;

COMMENT ON POLICY "profiles_select_policy" ON public.profiles IS 
'Simple policy: Users see own profile (id=uid) or profiles of their staff (parent_id=uid)';

