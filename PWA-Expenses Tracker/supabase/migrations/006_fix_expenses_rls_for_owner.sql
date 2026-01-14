-- ============================================
-- FIX: Owners cannot see expenses created by Staff
-- ============================================

-- 1. Drop old select policy if exists to avoid conflict
DROP POLICY IF EXISTS "Users can view own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Owner can view all project expenses" ON public.expenses;

-- 2. Create optimized policy for Owners and Staff
-- Policy: Users can view expenses if:
-- a) They created it (Owner or Staff)
-- b) OR the expense belongs to a project owned by them (Owner viewing Staff's input)
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
);

-- Note: Policy INSERT/UPDATE/DELETE có thể giữ nguyên theo logic cũ hoặc cập nhật nếu cần
-- Đảm bảo Owner được quyền xóa/sửa data của Staff
DROP POLICY IF EXISTS "Users can update own expenses" ON public.expenses;
CREATE POLICY "Owner and Creator can update expenses"
ON public.expenses FOR UPDATE
USING (
    user_id = auth.uid() 
    OR 
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can delete own expenses" ON public.expenses;
CREATE POLICY "Owner and Creator can delete expenses"
ON public.expenses FOR DELETE
USING (
    user_id = auth.uid() 
    OR 
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
);
