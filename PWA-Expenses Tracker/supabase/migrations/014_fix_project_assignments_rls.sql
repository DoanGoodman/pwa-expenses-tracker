-- ============================================
-- FIX: Add RLS policies for project_assignments table
-- ============================================

-- 1. Enable RLS
ALTER TABLE IF EXISTS public.project_assignments ENABLE ROW LEVEL SECURITY;

-- 2. Drop old policies if exist
DROP POLICY IF EXISTS "Owner can manage assignments" ON public.project_assignments;
DROP POLICY IF EXISTS "Staff can view own assignments" ON public.project_assignments;
DROP POLICY IF EXISTS "Users can manage assignments" ON public.project_assignments;

-- 3. Create policies

-- Policy: Owner có thể quản lý (SELECT, INSERT, UPDATE, DELETE) các assignments
-- Điều kiện: 
-- 1. Assigned bởi chính họ (assigned_by = auth.uid())
-- 2. HOẶC Staff được assign là nhân viên của họ (profiles.parent_id = auth.uid())
CREATE POLICY "Owner can manage assignments" ON public.project_assignments
FOR ALL
USING (
    assigned_by = auth.uid()
    OR
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = public.project_assignments.staff_id 
        AND parent_id = auth.uid()
    )
)
WITH CHECK (
    assigned_by = auth.uid()
    OR
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = public.project_assignments.staff_id 
        AND parent_id = auth.uid()
    )
);

-- Policy: Staff có thể xem assigned projects của mình
CREATE POLICY "Staff can view own assignments" ON public.project_assignments
FOR SELECT
USING (staff_id = auth.uid());

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_assignments_staff_id ON public.project_assignments(staff_id);
CREATE INDEX IF NOT EXISTS idx_project_assignments_project_id ON public.project_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_assignments_assigned_by ON public.project_assignments(assigned_by);
