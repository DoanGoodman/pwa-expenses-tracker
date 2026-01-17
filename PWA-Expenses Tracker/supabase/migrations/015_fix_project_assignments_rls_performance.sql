-- ============================================
-- FIX: project_assignments RLS performance issue
-- Replace subquery-based policies with SECURITY DEFINER functions
-- to bypass RLS and prevent infinite recursion
-- ============================================

-- 1. Drop ALL existing policies (including duplicates)
DROP POLICY IF EXISTS "Owner can manage assignments" ON public.project_assignments;
DROP POLICY IF EXISTS "Staff can view own assignments" ON public.project_assignments;
DROP POLICY IF EXISTS "Owner can manage project assignments" ON public.project_assignments;
DROP POLICY IF EXISTS "Owners manage all assignments" ON public.project_assignments;
DROP POLICY IF EXISTS "Staff view own assignments" ON public.project_assignments;

-- 2. Create helper function: Check if current user is owner (bypass RLS)
CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT COALESCE(
        (SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1) = 'owner',
        false
    );
$$;

COMMENT ON FUNCTION public.is_owner IS 'Check if current user has owner role. Uses SECURITY DEFINER to bypass RLS.';

GRANT EXECUTE ON FUNCTION public.is_owner TO authenticated;

-- 3. Create helper function: Check if current user owns a staff (bypass RLS)
CREATE OR REPLACE FUNCTION public.owns_staff(staff_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT COALESCE(
        (SELECT parent_id FROM public.profiles WHERE id = staff_user_id LIMIT 1) = auth.uid(),
        false
    );
$$;

COMMENT ON FUNCTION public.owns_staff IS 'Check if current user is the parent/owner of given staff. Uses SECURITY DEFINER to bypass RLS.';

GRANT EXECUTE ON FUNCTION public.owns_staff TO authenticated;

-- 4. Create SIMPLE policies using helper functions (no subqueries!)

-- Owner policy: Owners can manage ALL assignments
-- This is simple and fast - just calls a function
CREATE POLICY "Owners manage all assignments" ON public.project_assignments
FOR ALL
TO authenticated
USING (public.is_owner())
WITH CHECK (public.is_owner());

-- Staff policy: Staff can view their own assignments
-- This is also simple - direct column check
CREATE POLICY "Staff view own assignments" ON public.project_assignments
FOR SELECT
TO authenticated
USING (staff_id = auth.uid());

-- 5. Create indexes to optimize the helper functions
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role) WHERE role = 'owner';
CREATE INDEX IF NOT EXISTS idx_profiles_parent_staff ON public.profiles(parent_id, id);
