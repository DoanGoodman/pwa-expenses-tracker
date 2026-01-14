-- ============================================
-- MIGRATION: Project Assignments (Phân quyền dự án)
-- ============================================

-- 1. Tạo bảng assign quyền
-- Lưu ý: project_id dùng BIGINT để khớp với bảng projects
CREATE TABLE IF NOT EXISTS public.project_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    staff_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    project_id BIGINT REFERENCES public.projects(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_by UUID REFERENCES auth.users(id),
    UNIQUE(staff_id, project_id) -- Mỗi staff chỉ được assign 1 dự án 1 lần
);

-- 2. Enable RLS
ALTER TABLE public.project_assignments ENABLE ROW LEVEL SECURITY;

-- 3. Policies cho project_assignments
-- Owner được xem, thêm, xóa tất cả
CREATE POLICY "Owner can manage project assignments"
ON public.project_assignments
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'owner'
    )
    OR
    assigned_by = auth.uid()
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'owner'
    )
);

-- Staff được xem mình được assign cái gì (để UI biết)
CREATE POLICY "Staff can view own assignments"
ON public.project_assignments FOR SELECT
USING (staff_id = auth.uid());

-- 4. CẬP NHẬT RLS CHO BẢNG PROJECTS (QUAN TRỌNG)
-- Xóa policy cũ (Staff xem tất cả của parent)
DROP POLICY IF EXISTS "Staff can view parent projects" ON public.projects;
DROP POLICY IF EXISTS "Staff can view assigned projects" ON public.projects;

-- Tạo policy mới: Staff CHỈ xem được dự án mình được assign HOẶC dự án do chính mình tạo (nếu có logic đó)
CREATE POLICY "Staff can view assigned projects"
ON public.projects FOR SELECT
USING (
    -- 1. Là Owner của dự án (giữ nguyên hoặc staff tự tạo)
    user_id = auth.uid()
    OR
    -- 2. Được phân quyền thông qua bảng project_assignments
    id IN (
        SELECT project_id 
        FROM public.project_assignments 
        WHERE staff_id = auth.uid()
    )
);
