# 🔐 Storage Policies - Quick Setup

## Apply These Policies in Supabase

### **Method 1: Via Storage Dashboard** (Recommended)

1. Go to **Supabase Dashboard**
2. Navigate to **Storage** → **Policies**
3. Click **New Policy** for each policy below

---

### **Policy 1: Service Role (CRITICAL - Required)**

**Name**: `Service role can manage all files`

**Target Roles**: `service_role`

**Policy Command**: `ALL`

**USING expression**:
```sql
bucket_id = 'pipilot-storage'
```

**WITH CHECK expression**:
```sql
bucket_id = 'pipilot-storage'
```

✅ **Click Create**

---

### **Policy 2: Authenticated Uploads**

**Name**: `Authenticated users can upload files`

**Target Roles**: `authenticated`

**Policy Command**: `INSERT`

**WITH CHECK expression**:
```sql
bucket_id = 'pipilot-storage'
```

✅ **Click Create**

---

### **Policy 3: Authenticated Reads**

**Name**: `Authenticated users can read files`

**Target Roles**: `authenticated`

**Policy Command**: `SELECT`

**USING expression**:
```sql
bucket_id = 'pipilot-storage'
```

✅ **Click Create**

---

### **Policy 4: Authenticated Updates**

**Name**: `Authenticated users can update files`

**Target Roles**: `authenticated`

**Policy Command**: `UPDATE`

**USING expression**:
```sql
bucket_id = 'pipilot-storage'
```

**WITH CHECK expression**:
```sql
bucket_id = 'pipilot-storage'
```

✅ **Click Create**

---

### **Policy 5: Authenticated Deletes**

**Name**: `Authenticated users can delete files`

**Target Roles**: `authenticated`

**Policy Command**: `DELETE`

**USING expression**:
```sql
bucket_id = 'pipilot-storage'
```

✅ **Click Create**

---

## **Method 2: Via SQL Editor** (Faster)

1. Go to **Supabase Dashboard**
2. Navigate to **SQL Editor**
3. Copy and paste this:

```sql
-- Policy 1: Service Role (REQUIRED)
CREATE POLICY "Service role can manage all files"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'pipilot-storage');

-- Policy 2: Authenticated Uploads
CREATE POLICY "Authenticated users can upload files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'pipilot-storage');

-- Policy 3: Authenticated Reads
CREATE POLICY "Authenticated users can read files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'pipilot-storage');

-- Policy 4: Authenticated Updates
CREATE POLICY "Authenticated users can update files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'pipilot-storage');

-- Policy 5: Authenticated Deletes
CREATE POLICY "Authenticated users can delete files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'pipilot-storage');
```

4. Click **Run**
5. Verify: You should see "Success. No rows returned"

---

## **Verify Policies Are Applied**

Run this in SQL Editor:

```sql
SELECT 
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
  AND policyname LIKE '%pipilot%'
ORDER BY policyname;
```

**Expected Output**: You should see 5 policies listed.

---

## **Test Your Setup**

### **Test 1: Upload via API**

```bash
curl -X POST http://localhost:3000/api/database/1/storage/upload \
  -H "Cookie: YOUR_SESSION_COOKIE" \
  -F "file=@test.jpg" \
  -F "is_public=true"
```

**Expected**: File uploads successfully

### **Test 2: Check Supabase Storage**

1. Go to **Storage** → **pipilot-storage**
2. You should see folders like `db_1_myapp/`
3. Inside, your uploaded files

---

## **Troubleshooting**

### **"new row violates row-level security policy"**

❌ **Problem**: Policies not applied correctly

✅ **Solution**: 
1. Check policies exist (run verification query)
2. Ensure `bucket_id = 'pipilot-storage'` exactly matches your bucket name
3. Make sure you ran the service role policy (Policy 1)

### **"permission denied for table objects"**

❌ **Problem**: Service role policy missing

✅ **Solution**: 
Run Policy 1 again (service role policy is CRITICAL)

### **Files upload but can't download**

❌ **Problem**: Read policy not configured

✅ **Solution**: 
Apply Policy 3 (Authenticated Reads)

---

## **Security Notes**

### **Current Setup** (Development-Friendly)
- ✅ All authenticated users can upload to bucket
- ✅ All authenticated users can read from bucket
- ⚠️ Not isolated by user/database

### **For Production** (More Secure)
Replace policies with folder-based isolation:

```sql
-- Example: Only allow users to access their own database folders
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
```

See `supabase/storage-policies.sql` for complete production policies.

---

## **Quick Checklist**

- [ ] Created `pipilot-storage` bucket (private, 10MB limit)
- [ ] Applied 5 storage policies
- [ ] Verified policies with SQL query
- [ ] Tested file upload
- [ ] Files appear in Supabase Storage dashboard

---

## **What's Next?**

1. ✅ Storage policies configured
2. ✅ Ready to upload files
3. 🎨 Build UI components (optional)
4. 🚀 Deploy to production

---

**Status**: ✅ **Ready to use!**
