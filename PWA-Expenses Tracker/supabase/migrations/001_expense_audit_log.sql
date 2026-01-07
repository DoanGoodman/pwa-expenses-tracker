-- =============================================
-- EXPENSE AUDIT LOG SYSTEM
-- Run this SQL on Supabase SQL Editor
-- =============================================

-- 1. Create the audit log table (if not exists)
CREATE TABLE IF NOT EXISTS expense_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    expense_id BIGINT,
    action VARCHAR(10) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    old_data JSONB,
    new_data JSONB,
    change_reason TEXT,
    changed_by UUID,
    changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_audit_expense_id ON expense_audit_logs(expense_id);
CREATE INDEX IF NOT EXISTS idx_audit_changed_at ON expense_audit_logs(changed_at);
CREATE INDEX IF NOT EXISTS idx_audit_changed_by ON expense_audit_logs(changed_by);

-- 3. Create or Replace the trigger function with SECURITY DEFINER
-- SECURITY DEFINER allows this function to bypass RLS and write to audit table
CREATE OR REPLACE FUNCTION log_expense_changes()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER -- Bypass RLS for automated logging
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO expense_audit_logs (
            expense_id,
            action,
            old_data,
            new_data,
            change_reason,
            changed_by,
            changed_at
        ) VALUES (
            NEW.id,
            'INSERT',
            NULL,
            to_jsonb(NEW),
            NEW.last_change_reason,
            auth.uid(),
            NOW()
        );
        RETURN NEW;
        
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO expense_audit_logs (
            expense_id,
            action,
            old_data,
            new_data,
            change_reason,
            changed_by,
            changed_at
        ) VALUES (
            NEW.id,
            'UPDATE',
            to_jsonb(OLD),
            to_jsonb(NEW),
            NEW.last_change_reason,
            auth.uid(),
            NOW()
        );
        RETURN NEW;
        
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO expense_audit_logs (
            expense_id,
            action,
            old_data,
            new_data,
            change_reason,
            changed_by,
            changed_at
        ) VALUES (
            OLD.id,
            'DELETE',
            to_jsonb(OLD),
            NULL,
            OLD.last_change_reason, -- Reason was updated before delete
            auth.uid(),
            NOW()
        );
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$;

-- 4. Drop existing trigger if exists (to avoid duplicates)
DROP TRIGGER IF EXISTS expense_audit_trigger ON expenses;

-- 5. Create the trigger on expenses table
CREATE TRIGGER expense_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON expenses
FOR EACH ROW
EXECUTE FUNCTION log_expense_changes();

-- 6. Grant necessary permissions
-- The function runs as definer (superuser), so it can insert into audit table
-- But we should still set up proper access for reading logs

-- Allow authenticated users to read their own audit logs
ALTER TABLE expense_audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read audit logs for expenses they changed
CREATE POLICY "Users can read their own audit logs" ON expense_audit_logs
FOR SELECT
USING (changed_by = auth.uid());

-- 7. Add last_change_reason column to expenses if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'expenses' AND column_name = 'last_change_reason'
    ) THEN
        ALTER TABLE expenses ADD COLUMN last_change_reason TEXT;
    END IF;
END $$;

-- =============================================
-- VERIFICATION: Check if everything is set up
-- =============================================
-- Run this to verify:
-- SELECT * FROM expense_audit_logs ORDER BY changed_at DESC LIMIT 10;
