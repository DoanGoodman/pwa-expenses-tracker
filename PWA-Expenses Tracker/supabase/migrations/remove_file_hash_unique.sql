-- Remove UNIQUE constraint on file_hash to allow multiple expense rows from same receipt
-- A single receipt image can have multiple line items, all sharing the same file_hash
-- Duplicate detection is handled at application level BEFORE upload

ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_file_hash_key;

-- Create a non-unique index for faster duplicate lookups
CREATE INDEX IF NOT EXISTS idx_expenses_file_hash ON expenses(file_hash);
