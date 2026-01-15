-- ============================================
-- Daily Upload Limit Tracking (30 images/day per owner)
-- ============================================

-- 1. Tạo bảng để track số lượng upload mỗi ngày
CREATE TABLE IF NOT EXISTS public.daily_upload_counts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    upload_date DATE NOT NULL DEFAULT CURRENT_DATE,
    count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(owner_id, upload_date)
);

-- 2. Enable RLS
ALTER TABLE public.daily_upload_counts ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Owner can view and update their own counts
CREATE POLICY "Users can view own upload counts"
ON public.daily_upload_counts FOR SELECT
USING (owner_id = auth.uid());

CREATE POLICY "Users can insert own upload counts"
ON public.daily_upload_counts FOR INSERT
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own upload counts"
ON public.daily_upload_counts FOR UPDATE
USING (owner_id = auth.uid());

-- 4. Function để increment upload count và check limit
CREATE OR REPLACE FUNCTION increment_upload_count(p_owner_id UUID, p_limit INTEGER DEFAULT 30)
RETURNS TABLE (allowed BOOLEAN, current_count INTEGER, remaining INTEGER) AS $$
DECLARE
    v_current_count INTEGER;
BEGIN
    -- Upsert: Insert nếu chưa có, update nếu đã có
    INSERT INTO public.daily_upload_counts (owner_id, upload_date, count)
    VALUES (p_owner_id, CURRENT_DATE, 1)
    ON CONFLICT (owner_id, upload_date) 
    DO UPDATE SET 
        count = daily_upload_counts.count + 1,
        updated_at = NOW()
    RETURNING count INTO v_current_count;
    
    -- Check limit
    IF v_current_count > p_limit THEN
        -- Rollback the increment
        UPDATE public.daily_upload_counts 
        SET count = count - 1 
        WHERE owner_id = p_owner_id AND upload_date = CURRENT_DATE;
        
        RETURN QUERY SELECT false, v_current_count - 1, 0;
    ELSE
        RETURN QUERY SELECT true, v_current_count, p_limit - v_current_count;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Function để lấy số lượng upload hiện tại
CREATE OR REPLACE FUNCTION get_today_upload_count(p_owner_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT count INTO v_count
    FROM public.daily_upload_counts
    WHERE owner_id = p_owner_id AND upload_date = CURRENT_DATE;
    
    RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Comment
COMMENT ON TABLE public.daily_upload_counts IS 'Track số lượng ảnh upload mỗi ngày của mỗi owner (limit 30/ngày)';
