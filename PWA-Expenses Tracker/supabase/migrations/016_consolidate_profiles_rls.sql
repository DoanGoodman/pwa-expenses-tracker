-- ============================================
-- FIX: Consolidate profiles RLS policies
-- Resolve staff management empty list issue
-- ============================================

-- 1. Drop ALL existing policies (clean slate)
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Owner can read staff profiles" ON public.profiles;
DROP POLICY IF EXISTS "Staff can read parent profile" ON public.profiles;
DROP POLICY IF EXISTS "Read own or staff profiles" ON public.profiles;
DROP POLICY IF EXISTS "enable_read_access_for_all_users" ON public.profiles;
DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Owners read their staff" ON public.profiles;

-- 2. Create single, simple, fast policy
-- This policy allows:
-- - Users to read their OWN profile (id = auth.uid())
-- - Owners to read their STAFF profiles (parent_id = auth.uid() AND user is owner)
CREATE POLICY "Read accessible profiles" ON public.profiles
FOR SELECT
TO authenticated
USING (
    id = auth.uid()  
    OR
    (parent_id = auth.uid() AND public.is_owner())
);

-- 3. Ensure required indexes exist for performance
CREATE INDEX IF NOT EXISTS idx_profiles_parent_id ON public.profiles(parent_id);
CREATE INDEX IF NOT EXISTS idx_profiles_id_role ON public.profiles(id, role);

-- 4. Verify is_owner() function exists (should be created by migration 015)
-- If not, create it here
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'is_owner' 
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) THEN
        -- Create the function if it doesn't exist
        CREATE FUNCTION public.is_owner()
        RETURNS BOOLEAN
        LANGUAGE sql
        SECURITY DEFINER
        STABLE
        AS $func$
            SELECT COALESCE(
                (SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1) = 'owner',
                false
            );
        $func$;
        
        GRANT EXECUTE ON FUNCTION public.is_owner TO authenticated;
    END IF;
END
$$;

COMMENT ON POLICY "Read accessible profiles" ON public.profiles IS 
'Users can read their own profile or staff profiles if they are an owner. Uses is_owner() SECURITY DEFINER function to bypass RLS for role check.';
