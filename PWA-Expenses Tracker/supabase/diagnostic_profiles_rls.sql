-- ============================================
-- DIAGNOSTIC: Check profiles RLS policies
-- Run this in Supabase SQL Editor to verify
-- ============================================

-- 1. List ALL policies on profiles table
SELECT 
    policyname,
    cmd,
    qual::text as using_expression,
    with_check::text as with_check_expression
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 2. Check if there are conflicting/duplicate SELECT policies
-- (Should only see 'profiles_select_policy' for SELECT)
SELECT policyname, cmd
FROM pg_policies 
WHERE tablename = 'profiles' AND cmd = 'SELECT';

-- 3. Test the profiles query directly (as the logged-in user)
-- Replace YOUR_USER_ID with actual user ID from console log
-- SELECT * FROM profiles WHERE id = 'YOUR_USER_ID';

-- 4. Check execution time
EXPLAIN ANALYZE 
SELECT * FROM profiles WHERE id = auth.uid();

-- 5. Check indexes exist
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'profiles';

