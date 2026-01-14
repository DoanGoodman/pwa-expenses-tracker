-- ============================================
-- MIGRATION: Share Projects with Staff
-- ============================================

-- 1. Enable RLS on projects table
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to ensure clean state
DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can insert own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can manage own projects" ON public.projects;
DROP POLICY IF EXISTS "Staff can view parent projects" ON public.projects;

-- 3. Policy: Owner can do everything with their own projects
-- (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Users can manage own projects"
ON public.projects
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 4. Policy: Staff can VIEW projects of their parent AND their own
CREATE POLICY "Staff can view parent projects"
ON public.projects FOR SELECT
USING (
    user_id = auth.uid()
    OR
    user_id IN (
        SELECT parent_id FROM public.profiles WHERE id = auth.uid()
    )
);
