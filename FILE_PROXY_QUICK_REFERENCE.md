# File Proxy System - Quick Reference

## 🎯 What Changed?

**Before:** Users saw Supabase URLs
```
https://supabase.co/storage/v1/object/sign/pipilot-storage/db_123/file.jpg?token=...
```

**After:** Users only see your domain
```
https://pipilot.dev/api/public/files/abc-123-def-456/proxy
```

---

## 🚀 Quick Start

### 1. Upload a File

```typescript
import { uploadFile } from '@/lib/storage';

const result = await uploadFile(bucketId, databaseId, file, {
  isPublic: true  // For profile pics, logos, etc.
});

console.log(result.url);
// Output: https://pipilot.dev/api/public/files/abc123/proxy
```

### 2. Display in Your App

```tsx
// Public file - direct URL
<img src={`/api/public/files/${fileId}/proxy`} alt="Image" />

// Private file - fetch from API first
const { data } = await fetch(`/api/database/${dbId}/storage/files/${fileId}`);
<img src={data.file.url} alt="Image" />
```

### 3. Store in Database

```typescript
// ✅ Safe to store - never expires!
await supabase
  .from('users')
  .update({ 
    profile_picture: '/api/public/files/abc123/proxy' 
  })
  .eq('id', userId);
```

---

## 🔑 API Endpoints

### Authenticated Proxy
```
GET /api/database/{databaseId}/storage/files/{fileId}/proxy
```
- Requires authentication
- Verifies database ownership
- Works with public and private files

### Public Proxy
```
GET /api/public/files/{fileId}/proxy
```
- No authentication required
- Only serves files marked as `is_public: true`
- Perfect for external sharing

---

## 🎨 Common Use Cases

### Profile Pictures
```typescript
// Upload
const file = await uploadFile(bucketId, dbId, image, { isPublic: true });

// Store
await db.users.update({ avatar: file.url });

// Display
<img src={user.avatar} className="rounded-full" />
```

### Private Documents
```typescript
// Upload
const file = await uploadFile(bucketId, dbId, pdf, { isPublic: false });

// Get URL (requires auth)
const response = await fetch(`/api/database/${dbId}/storage/files/${file.id}`);
const data = await response.json();

// Display
<a href={data.file.url} target="_blank">View Document</a>
```

### Public API
```typescript
// Return proxy URLs in API responses
export async function GET() {
  const files = await listFiles(bucketId);
  
  return Response.json({
    files: files.map(f => ({
      id: f.id,
      name: f.original_name,
      url: f.url  // Proxy URL - hides Supabase
    }))
  });
}
```

---

## ✅ Benefits

1. **Hidden Infrastructure** - Users never see Supabase URLs
2. **Professional Branding** - Only your domain visible
3. **Better Security** - Centralized access control
4. **Performance** - Aggressive caching (1 year)
5. **Flexibility** - Easy to migrate providers
6. **Analytics Ready** - Track all file access

---

## 📚 Full Documentation

See `FILE_PROXY_API_DOCUMENTATION.md` for:
- Complete API reference
- Security considerations
- Performance optimization
- Migration guide
- Testing examples
- Monitoring setup

---

## 🎉 Result

**What users see:**
- ✅ `pipilot.dev/api/public/files/...`
- ✅ `pipilot.dev/api/database/.../files/.../proxy`

**What users DON'T see:**
- ❌ `supabase.co/storage/...`
- ❌ Any infrastructure details

Professional, secure, and fully branded! 🚀
