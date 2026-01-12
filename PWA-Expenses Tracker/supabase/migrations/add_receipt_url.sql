-- Add receipt_url column to expenses table
ALTER TABLE expenses
ADD COLUMN receipt_url TEXT;

-- (Optional) Update RLS policies if needed, but usually insert/select works automatically
