-- ============================================
-- FIX: Create a function to disable staff (bypass RLS)
-- ============================================

-- Function để Owner vô hiệu hóa Staff của mình
-- Sử dụng SECURITY DEFINER để bypass RLS
CREATE OR REPLACE FUNCTION disable_staff(p_staff_id UUID, p_owner_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_parent_id UUID;
BEGIN
    -- Kiểm tra staff này có thuộc owner không
    SELECT parent_id INTO v_parent_id
    FROM public.profiles
    WHERE id = p_staff_id AND role = 'staff';
    
    -- Nếu không tìm thấy hoặc không phải staff của owner này
    IF v_parent_id IS NULL OR v_parent_id != p_owner_id THEN
        RETURN FALSE;
    END IF;
    
    -- Vô hiệu hóa staff (bypass RLS với SECURITY DEFINER)
    UPDATE public.profiles
    SET parent_id = NULL, is_active = FALSE
    WHERE id = p_staff_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION disable_staff TO authenticated;
