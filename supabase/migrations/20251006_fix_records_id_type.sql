-- Migration: Change records.id from serial (integer) to uuid
-- This fixes the "invalid input syntax for type integer" error when using UUID strings

-- IMPORTANT: This will recreate the table and LOSE ALL EXISTING DATA
-- Make sure to backup your data first if needed!

-- Step 1: Drop existing table (THIS DELETES ALL DATA!)
DROP TABLE IF EXISTS records CASCADE;

-- Step 2: Create new records table with UUID primary key
CREATE TABLE records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id integer NOT NULL,
  data_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT records_table_id_fkey FOREIGN KEY (table_id) 
    REFERENCES tables (id) ON DELETE CASCADE
);

-- Step 3: Create indexes for performance
CREATE INDEX idx_records_table_id ON records(table_id);

-- Step 4: Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_records_updated_at
  BEFORE UPDATE ON records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Step 5: Enable Row Level Security (RLS)
ALTER TABLE records ENABLE ROW LEVEL SECURITY;

-- Step 6: Add RLS policies (if needed)
-- Note: Adjust these policies based on your security requirements
CREATE POLICY "Users can view their own records"
  ON records FOR SELECT
  USING (
    table_id IN (
      SELECT t.id FROM tables t
      INNER JOIN databases d ON t.database_id = d.id
      WHERE d.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can insert their own records"
  ON records FOR INSERT
  WITH CHECK (
    table_id IN (
      SELECT t.id FROM tables t
      INNER JOIN databases d ON t.database_id = d.id
      WHERE d.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can update their own records"
  ON records FOR UPDATE
  USING (
    table_id IN (
      SELECT t.id FROM tables t
      INNER JOIN databases d ON t.database_id = d.id
      WHERE d.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can delete their own records"
  ON records FOR DELETE
  USING (
    table_id IN (
      SELECT t.id FROM tables t
      INNER JOIN databases d ON t.database_id = d.id
      WHERE d.user_id = auth.uid()::text
    )
  );

-- Step 7: Verify the change
-- Run this to confirm:
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns 
-- WHERE table_name = 'records' AND column_name = 'id';
-- Should show: id | uuid | gen_random_uuid()

COMMENT ON TABLE records IS 'Stores dynamic record data for user-defined tables';
COMMENT ON COLUMN records.id IS 'UUID primary key for records';
COMMENT ON COLUMN records.table_id IS 'Foreign key reference to tables';
COMMENT ON COLUMN records.data_json IS 'Dynamic JSONB data for the record';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'records.id is now UUID type with default gen_random_uuid()';
END $$;
