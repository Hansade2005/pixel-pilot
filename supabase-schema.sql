-- =====================================================
-- Database System Schema for PiPilot
-- =====================================================
-- This schema creates a multi-tenant database system
-- where each project can have one database with multiple
-- tables and records stored as JSONB.
-- =====================================================

-- 1. DATABASES TABLE
-- Stores logical databases per project (one per project)
-- =====================================================
CREATE TABLE IF NOT EXISTS databases (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT 'main',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_project_database UNIQUE(project_id)
);

-- Indexes for databases table
CREATE INDEX IF NOT EXISTS idx_databases_user_id ON databases(user_id);
CREATE INDEX IF NOT EXISTS idx_databases_project_id ON databases(project_id);

-- =====================================================
-- 2. TABLES TABLE
-- Stores table definitions with schema as JSONB
-- =====================================================
CREATE TABLE IF NOT EXISTS tables (
  id SERIAL PRIMARY KEY,
  database_id INT NOT NULL REFERENCES databases(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  schema_json JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_table_name UNIQUE(database_id, name)
);

-- Indexes for tables table
CREATE INDEX IF NOT EXISTS idx_tables_database_id ON tables(database_id);
CREATE INDEX IF NOT EXISTS idx_tables_name ON tables(name);

-- =====================================================
-- 3. RECORDS TABLE
-- Stores actual data as JSONB
-- =====================================================
CREATE TABLE IF NOT EXISTS records (
  id SERIAL PRIMARY KEY,
  table_id INT NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  data_json JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for records table
CREATE INDEX IF NOT EXISTS idx_records_table_id ON records(table_id);
CREATE INDEX IF NOT EXISTS idx_records_data_json ON records USING GIN(data_json);
CREATE INDEX IF NOT EXISTS idx_records_created_at ON records(created_at DESC);

-- =====================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- Ensures users can only access their own data
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE databases ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE records ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (for re-running script)
DROP POLICY IF EXISTS "Users can manage their own databases" ON databases;
DROP POLICY IF EXISTS "Users can manage tables in their databases" ON tables;
DROP POLICY IF EXISTS "Users can manage records in their tables" ON records;

-- Policy: Users can only access databases they own
CREATE POLICY "Users can manage their own databases"
  ON databases
  FOR ALL
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- Policy: Users can only access tables in their databases
CREATE POLICY "Users can manage tables in their databases"
  ON tables
  FOR ALL
  USING (
    database_id IN (
      SELECT id FROM databases WHERE user_id = auth.uid()::text
    )
  )
  WITH CHECK (
    database_id IN (
      SELECT id FROM databases WHERE user_id = auth.uid()::text
    )
  );

-- Policy: Users can only access records in their tables
CREATE POLICY "Users can manage records in their tables"
  ON records
  FOR ALL
  USING (
    table_id IN (
      SELECT t.id FROM tables t
      INNER JOIN databases d ON t.database_id = d.id
      WHERE d.user_id = auth.uid()::text
    )
  )
  WITH CHECK (
    table_id IN (
      SELECT t.id FROM tables t
      INNER JOIN databases d ON t.database_id = d.id
      WHERE d.user_id = auth.uid()::text
    )
  );

-- =====================================================
-- 5. HELPER FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update updated_at
DROP TRIGGER IF EXISTS update_databases_updated_at ON databases;
CREATE TRIGGER update_databases_updated_at
  BEFORE UPDATE ON databases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tables_updated_at ON tables;
CREATE TRIGGER update_tables_updated_at
  BEFORE UPDATE ON tables
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_records_updated_at ON records;
CREATE TRIGGER update_records_updated_at
  BEFORE UPDATE ON records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. EXAMPLE SCHEMA_JSON STRUCTURE
-- =====================================================
-- This is how a table schema should be stored:
-- {
--   "columns": [
--     {
--       "name": "id",
--       "type": "uuid",
--       "primary_key": true,
--       "required": true
--     },
--     {
--       "name": "title",
--       "type": "text",
--       "required": true,
--       "unique": false
--     },
--     {
--       "name": "published",
--       "type": "boolean",
--       "required": false,
--       "default": false
--     },
--     {
--       "name": "created_at",
--       "type": "timestamp",
--       "required": true,
--       "default": "NOW()"
--     }
--   ]
-- }

-- =====================================================
-- 7. EXAMPLE DATA_JSON STRUCTURE
-- =====================================================
-- This is how record data should be stored:
-- {
--   "id": "550e8400-e29b-41d4-a716-446655440000",
--   "title": "My First Post",
--   "published": true,
--   "created_at": "2025-10-06T12:00:00Z"
-- }

-- =====================================================
-- 8. GRANT PERMISSIONS
-- =====================================================
-- Grant necessary permissions for authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON databases TO authenticated;
GRANT ALL ON tables TO authenticated;
GRANT ALL ON records TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- SCHEMA SETUP COMPLETE
-- =====================================================
-- Run this script in your Supabase SQL Editor
-- to create all tables, indexes, and RLS policies
-- =====================================================
