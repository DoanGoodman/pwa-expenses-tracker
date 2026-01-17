-- ============================================
-- FIX: Staff cannot see expenses from assigned projects
-- ============================================
-- Problem: Staff accounts timeout when loading expenses because
-- current RLS policies don't allow Staff to view expenses from
-- projects they are assigned to.
--
-- Current policies:
-- 1. expenses_select_policy: Owner views Staff's expenses
-- 2. Users can view related expenses: View own or project owner's expenses
--
-- Neither allows: Staff viewing expenses from assigned projects
-- ============================================

-- Drop và recreate policy "Users can view related expenses" 
-- để bao gồm cả Staff xem expenses từ dự án được gán
DROP POLICY IF EXISTS "Users can view related expenses" ON public.expenses;

CREATE POLICY "Users can view related expenses"
ON public.expenses FOR SELECT
USING (
    -- 1. Chính chủ tạo (Staff hoặc Owner tự tạo)
    user_id = auth.uid()
    OR
    -- 2. Thuộc dự án do mình sở hữu (Owner xem data của Staff nhập vào dự án của mình)
    project_id IN (
        SELECT id 
        FROM public.projects 
        WHERE user_id = auth.uid()
    )
    OR
    -- 3. NEW: Staff xem expenses từ dự án được gán
    project_id IN (
        SELECT project_id 
        FROM public.project_assignments 
        WHERE staff_id = auth.uid()
    )
);

-- Cũng cần update UPDATE policy để Staff có thể sửa expenses từ dự án được gán
DROP POLICY IF EXISTS "Owner and Creator can update expenses" ON public.expenses;

CREATE POLICY "Owner and Creator can update expenses"
ON public.expenses FOR UPDATE
USING (
    user_id = auth.uid() 
    OR 
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    OR
    -- Staff có thể sửa expenses từ dự án được gán
    project_id IN (SELECT project_id FROM project_assignments WHERE staff_id = auth.uid())
);

-- Và DELETE policy
DROP POLICY IF EXISTS "Owner and Creator can delete expenses" ON public.expenses;

CREATE POLICY "Owner and Creator can delete expenses"
ON public.expenses FOR DELETE
USING (
    user_id = auth.uid() 
    OR 
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    OR
    -- Staff có thể xóa expenses từ dự án được gán
    project_id IN (SELECT project_id FROM project_assignments WHERE staff_id = auth.uid())
);

-- ============================================
-- CREATE INDEXES for better RLS performance
-- ============================================
-- Index on project_assignments for faster staff lookups
CREATE INDEX IF NOT EXISTS idx_project_assignments_staff_project 
ON public.project_assignments(staff_id, project_id);

-- Index on expenses for project_id lookups
CREATE INDEX IF NOT EXISTS idx_expenses_project_id 
ON public.expenses(project_id);
