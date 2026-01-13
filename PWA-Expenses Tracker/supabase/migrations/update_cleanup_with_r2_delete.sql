-- Migration: Update cleanup function to delete R2 images before removing records
-- Requires: pg_net extension enabled in Supabase

-- 1. Enable pg_net extension (for making HTTP requests from PostgreSQL)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Update cleanup function to call Cloudflare Worker DELETE endpoint
CREATE OR REPLACE FUNCTION cleanup_old_expenses()
RETURNS void AS $$
DECLARE
    expense_record RECORD;
    worker_url TEXT := 'https://r2-signer.aiqswings87.workers.dev';
BEGIN
    -- Loop through records that need to be deleted (soft-deleted more than 30 days ago)
    FOR expense_record IN 
        SELECT id, image_url FROM expenses
        WHERE deleted_at IS NOT NULL 
        AND deleted_at < NOW() - INTERVAL '30 days'
        AND image_url IS NOT NULL
    LOOP
        -- Call Cloudflare Worker to delete image from R2
        -- Using pg_net for async HTTP requests
        PERFORM net.http_post(
            url := worker_url || '?url=' || urlencode(expense_record.image_url),
            method := 'DELETE',
            headers := '{"Content-Type": "application/json"}'::jsonb
        );
        
        RAISE NOTICE 'Requested deletion of R2 file: %', expense_record.image_url;
    END LOOP;
    
    -- Delete all old records from database
    DELETE FROM expenses
    WHERE deleted_at IS NOT NULL 
    AND deleted_at < NOW() - INTERVAL '30 days';
    
    RAISE NOTICE 'Cleanup completed';
END;
$$ LANGUAGE plpgsql;

-- 3. Helper function for URL encoding (if not exists)
CREATE OR REPLACE FUNCTION urlencode(text)
RETURNS text AS $$
    SELECT string_agg(
        CASE
            WHEN octet_length(c) = 1 AND c ~ '[0-9a-zA-Z_.~-]' THEN c
            ELSE '%' || upper(encode(convert_to(c, 'UTF8'), 'hex'))
        END,
        ''
    )
    FROM regexp_split_to_table($1, '') AS c;
$$ LANGUAGE sql IMMUTABLE;

-- Note: After running this migration, make sure to:
-- 1. Deploy the updated Cloudflare Worker with DELETE endpoint
-- 2. Verify pg_net extension is enabled in Supabase Dashboard > Database > Extensions
-- 3. Test by manually calling: SELECT cleanup_old_expenses();
