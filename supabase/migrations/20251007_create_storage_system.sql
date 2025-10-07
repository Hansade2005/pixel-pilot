-- =====================================================
-- Storage System Migration for PiPilot
-- =====================================================
-- Adds file storage capabilities similar to Supabase Storage
-- Each database gets one bucket with 500MB limit
-- =====================================================

-- =====================================================
-- 1. STORAGE_BUCKETS TABLE
-- One bucket per database (500MB limit)
-- =====================================================
CREATE TABLE IF NOT EXISTS storage_buckets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  database_id INT NOT NULL REFERENCES databases(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  size_limit_bytes BIGINT DEFAULT 524288000, -- 500MB in bytes
  current_usage_bytes BIGINT DEFAULT 0,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_database_bucket UNIQUE(database_id)
);

-- Indexes for storage_buckets
CREATE INDEX IF NOT EXISTS idx_storage_buckets_database_id ON storage_buckets(database_id);
CREATE INDEX IF NOT EXISTS idx_storage_buckets_name ON storage_buckets(name);

-- =====================================================
-- 2. STORAGE_FILES TABLE
-- Tracks all uploaded files
-- =====================================================
CREATE TABLE IF NOT EXISTS storage_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id UUID NOT NULL REFERENCES storage_buckets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  path TEXT NOT NULL, -- Path in Supabase Storage
  size_bytes BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  is_public BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for storage_files
CREATE INDEX IF NOT EXISTS idx_storage_files_bucket_id ON storage_files(bucket_id);
CREATE INDEX IF NOT EXISTS idx_storage_files_name ON storage_files(name);
CREATE INDEX IF NOT EXISTS idx_storage_files_mime_type ON storage_files(mime_type);
CREATE INDEX IF NOT EXISTS idx_storage_files_created_at ON storage_files(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_storage_files_metadata ON storage_files USING GIN(metadata);

-- =====================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE storage_buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_files ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can manage their storage buckets" ON storage_buckets;
DROP POLICY IF EXISTS "Users can manage their storage files" ON storage_files;

-- Policy: Users can only access their own buckets
CREATE POLICY "Users can manage their storage buckets"
  ON storage_buckets
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

-- Policy: Users can only access files in their buckets
CREATE POLICY "Users can manage their storage files"
  ON storage_files
  FOR ALL
  USING (
    bucket_id IN (
      SELECT sb.id FROM storage_buckets sb
      INNER JOIN databases d ON sb.database_id = d.id
      WHERE d.user_id = auth.uid()::text
    )
  )
  WITH CHECK (
    bucket_id IN (
      SELECT sb.id FROM storage_buckets sb
      INNER JOIN databases d ON sb.database_id = d.id
      WHERE d.user_id = auth.uid()::text
    )
  );

-- =====================================================
-- 4. HELPER FUNCTIONS
-- =====================================================

-- Function to update bucket usage after file upload
CREATE OR REPLACE FUNCTION update_bucket_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Add file size to bucket usage
    UPDATE storage_buckets
    SET current_usage_bytes = current_usage_bytes + NEW.size_bytes,
        updated_at = NOW()
    WHERE id = NEW.bucket_id;
  ELSIF TG_OP = 'DELETE' THEN
    -- Subtract file size from bucket usage
    UPDATE storage_buckets
    SET current_usage_bytes = GREATEST(current_usage_bytes - OLD.size_bytes, 0),
        updated_at = NOW()
    WHERE id = OLD.bucket_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle file size changes
    UPDATE storage_buckets
    SET current_usage_bytes = current_usage_bytes - OLD.size_bytes + NEW.size_bytes,
        updated_at = NOW()
    WHERE id = NEW.bucket_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update bucket usage
DROP TRIGGER IF EXISTS update_bucket_usage_trigger ON storage_files;
CREATE TRIGGER update_bucket_usage_trigger
  AFTER INSERT OR UPDATE OR DELETE ON storage_files
  FOR EACH ROW
  EXECUTE FUNCTION update_bucket_usage();

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_storage_buckets_updated_at ON storage_buckets;
CREATE TRIGGER update_storage_buckets_updated_at
  BEFORE UPDATE ON storage_buckets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_storage_files_updated_at ON storage_files;
CREATE TRIGGER update_storage_files_updated_at
  BEFORE UPDATE ON storage_files
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 5. HELPER VIEWS
-- =====================================================

-- View to get storage stats per database
CREATE OR REPLACE VIEW storage_stats AS
SELECT 
  d.id as database_id,
  d.name as database_name,
  d.user_id,
  sb.id as bucket_id,
  sb.name as bucket_name,
  sb.size_limit_bytes,
  sb.current_usage_bytes,
  ROUND((sb.current_usage_bytes::NUMERIC / sb.size_limit_bytes::NUMERIC * 100)::NUMERIC, 2) as usage_percentage,
  COUNT(sf.id) as file_count,
  sb.created_at as bucket_created_at
FROM databases d
LEFT JOIN storage_buckets sb ON d.id = sb.database_id
LEFT JOIN storage_files sf ON sb.id = sf.bucket_id
GROUP BY d.id, d.name, d.user_id, sb.id, sb.name, sb.size_limit_bytes, sb.current_usage_bytes, sb.created_at;

-- =====================================================
-- 6. GRANT PERMISSIONS
-- =====================================================
GRANT ALL ON storage_buckets TO authenticated;
GRANT ALL ON storage_files TO authenticated;
GRANT SELECT ON storage_stats TO authenticated;

-- =====================================================
-- 7. EXAMPLE METADATA JSON STRUCTURE
-- =====================================================
-- {
--   "width": 1920,
--   "height": 1080,
--   "format": "jpeg",
--   "uploaded_by": "user@example.com",
--   "ip_address": "192.168.1.1",
--   "user_agent": "Mozilla/5.0...",
--   "tags": ["profile", "avatar"],
--   "description": "User profile image"
-- }

-- =====================================================
-- STORAGE SYSTEM SETUP COMPLETE
-- =====================================================
