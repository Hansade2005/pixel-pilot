# 🔗 Non-Expiring File URLs Guide

## ✅ **Solution: You DON'T Need to Make Bucket Public!**

Your storage system is **already configured** to provide non-expiring URLs for files! Here's how:

---

## 🔒 **How It Works**

### **Three-Layer Security:**

1. **Bucket Level**: `pipilot-storage` is **PRIVATE** (secure ✓)
2. **File Level**: Each file can be `public` or `private`
3. **Policy Level**: Controls who can upload/delete (not who can view)

---

## 🎯 **For Non-Expiring URLs (Profile Pictures, Avatars, etc.)**

### **Step 1: Upload with "Public" Checked** ✓

When uploading:
- ✅ Check the **"Make file publicly accessible"** box
- ✅ Default is already set to PUBLIC

### **Step 2: Get the URL**

The system automatically generates a **permanent URL**:

```
https://lzuknbfbvpuscpammwzg.supabase.co/storage/v1/object/public/pipilot-storage/db_2_mydb/avatar.jpg
```

**This URL:**
- ✅ **NEVER expires**
- ✅ **Always accessible** (perfect for database storage)
- ✅ **Works in `<img>` tags**, avatars, anywhere!

---

## 🔐 **Security: Is This Safe?**

### **YES! Here's Why:**

❌ **Users CANNOT:**
- Upload files (requires service role key)
- Delete files (requires authentication)
- List files (protected by policies)
- Modify files (requires authentication)

✅ **Users CAN ONLY:**
- View files if they have the exact URL
- Just like any image on the internet

**Think of it like:** Posting an image on Twitter - anyone with the link can see it, but they can't delete it or upload new ones.

---

## 📋 **Required Supabase Policy**

Make sure this policy is added to your Supabase Storage:

```sql
CREATE POLICY "Public files are readable by anyone"
ON storage.objects
FOR SELECT
TO public, anon, authenticated
USING (
  bucket_id = 'pipilot-storage'
);
```

### **How to Add:**

1. Go to Supabase Dashboard
2. Click **Storage** → **Policies** → **pipilot-storage**
3. Click **New Policy** → **Create policy from scratch**
4. Paste the SQL above
5. Click **Save**

---

## 🎨 **Use Cases**

### ✅ **Use Public Files For:**

- 👤 **Profile pictures & avatars**
- 🖼️ **Product images & logos**
- 🎨 **Generated AI images**
- 📊 **Charts & visualizations**
- 🎬 **Video thumbnails**
- **Any URL you'll store in database records**

### 🔒 **Use Private Files For:**

- 📄 **Sensitive documents**
- 🔐 **User-specific data**
- ⏰ **Temporary files**
- 📝 **Private notes/reports**

---

## 🧪 **Testing**

### **Test Public URL:**

1. Upload a file with "Public" checked
2. Copy the URL
3. Open in **incognito browser** (no login)
4. ✅ Should load immediately

### **Test Private URL:**

1. Upload a file with "Public" unchecked
2. Copy the URL
3. ✅ Works for 7 days, then expires

---

## 💾 **Storing URLs in Database**

### **Example: User Profile**

```sql
-- Create users table with avatar
CREATE TABLE users (
  id UUID PRIMARY KEY,
  name TEXT,
  avatar_url TEXT,  -- ✅ Store public URL here
  created_at TIMESTAMPTZ
);

-- Insert user with avatar
INSERT INTO users (id, name, avatar_url)
VALUES (
  uuid_generate_v4(),
  'John Doe',
  'https://lzuknbfbvpuscpammwzg.supabase.co/storage/v1/object/public/pipilot-storage/db_2_mydb/john-avatar.jpg'
);
```

### **Example: Product Catalog**

```sql
-- Create products with images
CREATE TABLE products (
  id UUID PRIMARY KEY,
  name TEXT,
  image_url TEXT,  -- ✅ Public URL
  price DECIMAL
);
```

---

## 🚀 **API Usage**

### **Upload Public File:**

```typescript
const formData = new FormData();
formData.append('file', file);
formData.append('is_public', 'true');  // ← Important!

const response = await fetch(`/api/database/${databaseId}/storage/upload`, {
  method: 'POST',
  body: formData,
});

const data = await response.json();
console.log(data.file.url);  // ← This URL never expires!
```

### **Get File URL:**

```typescript
const response = await fetch(`/api/database/${databaseId}/storage/files/${fileId}`);
const data = await response.json();

// For public files: permanent URL
// For private files: signed URL (7 day expiration)
const url = data.file.url;
```

---

## ⚡ **Quick Reference**

| Feature | Public Files | Private Files |
|---------|-------------|---------------|
| **URL Expiration** | Never | 7 days |
| **Database Storage** | ✅ Safe | ❌ Not recommended |
| **Access** | Anyone with link | Only authenticated |
| **Use For** | Avatars, images, assets | Sensitive documents |
| **Security** | Read-only | Time-limited |

---

## 🐛 **Troubleshooting**

### **Problem: Public URL returns 403 Forbidden**

**Solution:** Add the public read policy (see above)

### **Problem: URL works but then stops**

**Cause:** File was uploaded as private
**Solution:** Re-upload with "Public" checked

### **Problem: Can users upload to my bucket?**

**No!** Only your server (with service role key) can upload.

---

## 📚 **Summary**

✅ Your bucket is PRIVATE (secure)
✅ But files can have PUBLIC urls (non-expiring)
✅ Perfect for avatars, images, and database storage
✅ Users can't upload/delete, only view with link
✅ Already implemented - just check "Public" when uploading!

---

## 🎉 **You're All Set!**

Your storage system now provides:
- 🔗 Permanent URLs for public files
- 🔐 Secure 7-day URLs for private files  
- 🛡️ Protected bucket (no unauthorized uploads)
- 💾 Database-safe URLs that never expire

Perfect for profile pictures, avatars, and any media you need to store permanently!
