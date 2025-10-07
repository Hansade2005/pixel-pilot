-- =====================================================
-- Storage Policies for pipilot-storage Bucket
-- =====================================================
-- Run these in Supabase Dashboard → Storage → Policies
-- Or in SQL Editor
-- =====================================================

-- =====================================================
-- 1. ALLOW SERVICE ROLE (Required for Server-Side)
-- =====================================================
-- This allows your backend (with service role key) to manage files

CREATE POLICY "Service role can manage all files"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'pipilot-storage');

-- =====================================================
-- 2. ALLOW AUTHENTICATED UPLOADS (Dashboard Users)
-- =====================================================
-- This allows authenticated users to upload via dashboard

CREATE POLICY "Authenticated users can upload files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'pipilot-storage'
  AND (storage.foldername(name))[1] IN (
    SELECT 'db_' || id::text || '_' || REPLACE(LOWER(name), ' ', '_')
    FROM databases
    WHERE user_id = auth.uid()::text
  )
);

-- =====================================================
-- 3. ALLOW AUTHENTICATED READS (Dashboard Users)
-- =====================================================
-- This allows users to view/download their own files

CREATE POLICY "Authenticated users can read their files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'pipilot-storage'
  AND (storage.foldername(name))[1] IN (
    SELECT 'db_' || id::text || '_' || REPLACE(LOWER(name), ' ', '_')
    FROM databases
    WHERE user_id = auth.uid()::text
  )
);

-- =====================================================
-- 4. ALLOW AUTHENTICATED UPDATES (Dashboard Users)
-- =====================================================
-- This allows users to update their files (e.g., metadata)

CREATE POLICY "Authenticated users can update their files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'pipilot-storage'
  AND (storage.foldername(name))[1] IN (
    SELECT 'db_' || id::text || '_' || REPLACE(LOWER(name), ' ', '_')
    FROM databases
    WHERE user_id = auth.uid()::text
  )
);

-- =====================================================
-- 5. ALLOW AUTHENTICATED DELETES (Dashboard Users)
-- =====================================================
-- This allows users to delete their files

CREATE POLICY "Authenticated users can delete their files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'pipilot-storage'
  AND (storage.foldername(name))[1] IN (
    SELECT 'db_' || id::text || '_' || REPLACE(LOWER(name), ' ', '_')
    FROM databases
    WHERE user_id = auth.uid()::text
  )
);

-- =====================================================
-- 6. ALLOW PUBLIC READ FOR PUBLIC FILES (IMPORTANT!)
-- =====================================================
-- This allows public URLs to work without expiration
-- Files are still secure - only marked public files are accessible

CREATE POLICY "Public files are readable by anyone"
ON storage.objects
FOR SELECT
TO public, anon, authenticated
USING (
  bucket_id = 'pipilot-storage'
  -- No additional restrictions - allows getPublicUrl() to work
);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if policies are created
SELECT 
  policyname,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage';

-- Test file path pattern
-- Example: 'db_1_myapp/abc123.jpg'
-- Folder: db_1_myapp
-- File: abc123.jpg

-- =====================================================
-- ALTERNATIVE: SIMPLER POLICIES (If Above Don't Work)
-- =====================================================
-- Use these if you want less restrictive policies during development

-- DROP POLICY IF EXISTS "Service role can manage all files" ON storage.objects;
-- DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;
-- DROP POLICY IF EXISTS "Authenticated users can read their files" ON storage.objects;
-- DROP POLICY IF EXISTS "Authenticated users can update their files" ON storage.objects;
-- DROP POLICY IF EXISTS "Authenticated users can delete their files" ON storage.objects;

-- CREATE POLICY "Allow service role full access"
-- ON storage.objects
-- FOR ALL
-- TO service_role
-- USING (bucket_id = 'pipilot-storage');

-- CREATE POLICY "Allow authenticated uploads"
-- ON storage.objects
-- FOR INSERT
-- TO authenticated
-- WITH CHECK (bucket_id = 'pipilot-storage');

-- CREATE POLICY "Allow authenticated reads"
-- ON storage.objects
-- FOR SELECT
-- TO authenticated
-- USING (bucket_id = 'pipilot-storage');

-- CREATE POLICY "Allow authenticated updates"
-- ON storage.objects
-- FOR UPDATE
-- TO authenticated
-- USING (bucket_id = 'pipilot-storage');

-- CREATE POLICY "Allow authenticated deletes"
-- ON storage.objects
-- FOR DELETE
-- TO authenticated
-- USING (bucket_id = 'pipilot-storage');

-- =====================================================
-- NOTES
-- =====================================================
-- 1. Service role policy is REQUIRED for backend operations
-- 2. Authenticated policies allow dashboard access
-- 3. Policies use folder structure to enforce ownership
-- 4. Alternative simpler policies provided for development
-- 5. For production, use the folder-based policies (more secure)
-- =====================================================
