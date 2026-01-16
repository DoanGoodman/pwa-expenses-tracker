-- ============================================
-- OPTIMIZE RLS POLICIES WITH INDEXES
-- Improve query performance for RLS checks
-- ============================================

-- 1. Add indexes for frequently used columns in RLS policies
-- These indexes will speed up subqueries in USING clauses

-- Index for projects.user_id (used in almost all RLS policies)
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);

-- Index for expenses.user_id (used in RLS SELECT/UPDATE/DELETE)
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses(user_id);

-- Index for expenses.project_id (used in subquery joins)
CREATE INDEX IF NOT EXISTS idx_expenses_project_id ON public.expenses(project_id);

-- Composite index for common expense queries (project + date range)
CREATE INDEX IF NOT EXISTS idx_expenses_project_date ON public.expenses(project_id, expense_date DESC);

-- Composite index for user + deleted filter (soft delete pattern)
CREATE INDEX IF NOT EXISTS idx_expenses_user_deleted ON public.expenses(user_id, deleted_at);

-- Index for profiles.user_id (used in role checks)
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

-- Index for profiles.parent_id (used in staff hierarchy)
CREATE INDEX IF NOT EXISTS idx_profiles_parent_id ON public.profiles(parent_id);

-- 2. Analyze tables to update statistics for query planner
ANALYZE public.projects;
ANALYZE public.expenses;
ANALYZE public.profiles;
ANALYZE public.categories;

-- 3. Create helper function for faster project ownership check
-- This avoids repeated subquery in RLS policies
CREATE OR REPLACE FUNCTION public.user_owns_project(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.projects 
        WHERE id = p_project_id 
        AND user_id = auth.uid()
    );
$$;

-- 4. Create function to get user's owned project IDs (cached per query)
CREATE OR REPLACE FUNCTION public.get_user_project_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT id FROM public.projects WHERE user_id = auth.uid();
$$;

-- 5. OPTIONAL: Update expenses RLS to use helper function (faster)
-- Uncomment if you want to use the optimized version

-- DROP POLICY IF EXISTS "Users can view related expenses" ON public.expenses;
-- CREATE POLICY "Users can view related expenses"
-- ON public.expenses FOR SELECT
-- USING (
--     user_id = auth.uid()
--     OR
--     public.user_owns_project(project_id)
-- );

COMMENT ON FUNCTION public.user_owns_project IS 'Helper function for RLS - checks if current user owns a project';
COMMENT ON FUNCTION public.get_user_project_ids IS 'Returns all project IDs owned by current user - for RLS optimization';
