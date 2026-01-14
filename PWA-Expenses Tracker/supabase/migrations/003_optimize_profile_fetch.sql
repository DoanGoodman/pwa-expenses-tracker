-- ============================================
-- MIGRATION: Tối ưu fetch profile
-- ============================================

-- Function lấy profile nhanh với SECURITY DEFINER (bypass RLS)
-- Chỉ cho phép user lấy profile của chính mình
CREATE OR REPLACE FUNCTION public.get_my_profile(user_id UUID)
RETURNS TABLE (
    id UUID,
    username TEXT,
    email TEXT,
    role TEXT,
    parent_id UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- Chỉ cho phép lấy profile của chính user đó
    -- auth.uid() có thể chưa sẵn sàng, nên check cả 2 điều kiện
    IF user_id IS NULL THEN
        RAISE EXCEPTION 'User ID is required';
    END IF;
    
    RETURN QUERY
    SELECT 
        p.id,
        p.username,
        p.email,
        p.role,
        p.parent_id,
        p.created_at,
        p.updated_at
    FROM public.profiles p
    WHERE p.id = user_id;
END;
$$;

-- Grant execute permission cho authenticated users
GRANT EXECUTE ON FUNCTION public.get_my_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_profile(UUID) TO anon;

-- ============================================
-- RLS POLICY CHO FEATURE_PERMISSIONS
-- Cho phép staff đọc quyền của parent
-- ============================================

-- Kiểm tra và thêm policy nếu chưa có
DO $$
BEGIN
    -- Policy cho phép user đọc quyền của chính mình và parent
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'feature_permissions' 
        AND policyname = 'Users can view own and parent permissions'
    ) THEN
        CREATE POLICY "Users can view own and parent permissions"
        ON public.feature_permissions FOR SELECT
        USING (
            user_id = auth.uid()
            OR user_id IN (
                SELECT parent_id FROM public.profiles WHERE id = auth.uid()
            )
        );
    END IF;
END $$;
