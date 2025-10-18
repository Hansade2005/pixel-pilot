# 🚀 Storage System Setup Guide

## Quick Setup (5 minutes)

### **Step 1: Run Database Migration**

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the migration from:
   ```
   supabase/migrations/20251007_create_storage_system.sql
   ```
4. Click **Run**
5. Verify success: Tables `storage_buckets` and `storage_files` should appear

---

### **Step 2: Create Supabase Storage Bucket**

1. In Supabase Dashboard, go to **Storage**
2. Click **New bucket**
3. Name: `pipilot-storage`
4. **Public bucket**: No (keep private)
5. **File size limit**: 10 MB
6. **Allowed MIME types**: Leave as default or add:
   ```
   image/*,application/pdf,application/msword,
   application/vnd.openxmlformats-officedocument.wordprocessingml.document,
   text/*,video/*,audio/*
   ```
7. Click **Create bucket**

---

### **Step 3: Set Storage Policies** (REQUIRED)

⚠️ **This step is critical - storage will not work without policies!**

**Option A: Quick Setup (Copy-Paste SQL)**

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Copy and paste this:

```sql
-- Service Role Policy (REQUIRED for backend)
CREATE POLICY "Service role can manage all files"
ON storage.objects FOR ALL TO service_role
USING (bucket_id = 'pipilot-storage');

-- Authenticated User Policies
CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'pipilot-storage');

CREATE POLICY "Authenticated users can read files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'pipilot-storage');

CREATE POLICY "Authenticated users can update files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'pipilot-storage');

CREATE POLICY "Authenticated users can delete files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'pipilot-storage');
```

3. Click **Run**

**Option B: Detailed Step-by-Step Guide**

See complete guide with screenshots: **[STORAGE_POLICIES_SETUP.md](./STORAGE_POLICIES_SETUP.md)**

**Option C: Advanced (Production-Ready Policies)**

For folder-based isolation, see: **[supabase/storage-policies.sql](./supabase/storage-policies.sql)**

---

### **Step 4: Install Required Package**

```bash
npm install uuid
# or
pnpm add uuid
# or
yarn add uuid
```

---

### **Step 5: Test the System**

#### **Option A: Using curl**

```bash
# 1. Create a test database (if you don't have one)
# Go to your dashboard and create a database

# 2. Get storage info
curl https://pipilot.dev/api/database/YOUR_DB_ID/storage \
  -H "Cookie: YOUR_SESSION_COOKIE"

# 3. Upload a test file
curl -X POST https://pipilot.dev/api/database/YOUR_DB_ID/storage/upload \
  -H "Cookie: YOUR_SESSION_COOKIE" \
  -F "file=@test-image.jpg" \
  -F "is_public=true"
```

#### **Option B: Using your dashboard**

1. Navigate to a database
2. Go to **Storage** tab (will be added in UI phase)
3. Click **Upload File**
4. Select a file
5. View uploaded files

---

### **Step 6: Test Public API**

```bash
# 1. Generate an API key from your dashboard

# 2. Upload via API key
curl -X POST https://pipilot.dev/api/v1/databases/YOUR_DB_ID/storage/upload \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -F "file=@test-image.jpg" \
  -F "is_public=true" \
  -F 'metadata={"tags":["test"]}'
```

---

## Verification Checklist

- [ ] Database tables created (`storage_buckets`, `storage_files`)
- [ ] Supabase bucket `pipilot-storage` created
- [ ] Storage policies configured
- [ ] UUID package installed
- [ ] Can view storage info via API
- [ ] Can upload files via dashboard
- [ ] Can upload files via public API
- [ ] Files appear in Supabase Storage dashboard
- [ ] Storage usage tracked correctly

---

## Troubleshooting

### **"Master bucket not found"**
→ Create `pipilot-storage` bucket in Supabase Dashboard → Storage

### **"Failed to upload file"**
→ Check storage policies are configured
→ Verify file size < 10MB
→ Check file type is allowed

### **"Storage not initialized"**
→ The bucket record is created automatically on first access
→ If still failing, manually create via: 
```sql
INSERT INTO storage_buckets (database_id, name, size_limit_bytes)
VALUES (YOUR_DB_ID, 'db_YOUR_DB_ID_name', 524288000);
```

### **"RLS policy violation"**
→ Ensure you're authenticated
→ Check database ownership
→ Verify RLS policies are enabled

---

## Manual Bucket Creation (If needed)

If automatic bucket creation fails:

```typescript
// In your code or admin panel
import { createDatabaseBucket } from '@/lib/storage';

const bucket = await createDatabaseBucket(databaseId, 'my_database');
console.log('Bucket created:', bucket);
```

---

## Configuration

### **Adjust Storage Limits**

In `lib/storage.ts`, modify:

```typescript
export const STORAGE_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // Change file size limit
  MAX_BUCKET_SIZE: 500 * 1024 * 1024, // Change bucket limit
  // Add more file types
  ALLOWED_FILE_TYPES: [
    // ... existing types
    'application/zip', // Add ZIP files
    'application/x-rar', // Add RAR files
  ],
};
```

### **Change Bucket Size for Specific Database**

```sql
UPDATE storage_buckets
SET size_limit_bytes = 1073741824 -- 1GB
WHERE database_id = YOUR_DB_ID;
```

---

## Next Steps

1. ✅ **System is ready** - Storage system is functional
2. 🎨 **Add UI components** - Build file uploader, gallery view
3. 📖 **Update user docs** - Add storage section to user guide
4. 🧪 **Load testing** - Test with multiple large files
5. 📊 **Add analytics** - Track storage patterns

---

## Support

If you encounter issues:

1. Check Supabase logs (Dashboard → Logs)
2. Verify environment variables are set
3. Test API endpoints with curl
4. Check browser console for errors
5. Review migration was applied correctly

---

**Setup Time**: ~5 minutes  
**Difficulty**: Easy  
**Status**: ✅ Ready to use
