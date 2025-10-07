# File Proxy API System - Complete Documentation

## Overview

The File Proxy API system masks Supabase Storage URLs, ensuring users only see your domain URLs. This provides better branding, security, and control over file access while maintaining seamless functionality.

## 🎯 Benefits

### 1. **Hidden Infrastructure**
- Users never see Supabase URLs
- Your domain is the only visible URL
- Professional branding across all file operations

### 2. **Enhanced Security**
- Centralized access control
- Rate limiting capabilities
- Request logging and analytics
- Protection against URL manipulation

### 3. **Better Performance**
- Aggressive caching with immutable headers
- CDN-friendly architecture
- Optimized content delivery

### 4. **Flexibility**
- Easy to migrate storage providers
- Can add watermarking, compression, or transformations
- Custom headers and metadata

## 🏗️ Architecture

```
User Request → Your API → Supabase Storage → Stream to User
     ↓
Your Domain URL Only
(pipilot.dev/api/...)
```

### URL Structure

#### Authenticated Files (Private)
```
https://pipilot.dev/api/database/{databaseId}/storage/files/{fileId}/proxy
```

#### Public Files (No Auth Required)
```
https://pipilot.dev/api/public/files/{fileId}/proxy
```

## 📁 File Structure

```
app/
├── api/
│   ├── database/
│   │   └── [id]/
│   │       └── storage/
│   │           └── files/
│   │               └── [fileId]/
│   │                   ├── route.ts          # File metadata API
│   │                   └── proxy/
│   │                       └── route.ts      # Authenticated proxy
│   └── public/
│       └── files/
│           └── [fileId]/
│               └── proxy/
│                   └── route.ts              # Public proxy
└── lib/
    └── storage.ts                             # Storage utilities
```

## 🔐 API Routes

### 1. Authenticated File Proxy

**Endpoint:** `GET /api/database/[id]/storage/files/[fileId]/proxy`

**Authentication:** Required (Supabase session)

**Authorization:**
- Verifies user owns the database
- Checks file belongs to user's database
- Validates file permissions

**Response Headers:**
```http
Content-Type: [file mime type]
Content-Length: [file size]
Content-Disposition: inline; filename="[original filename]"
Cache-Control: public, max-age=31536000, immutable
Access-Control-Allow-Origin: *
X-Content-Type-Options: nosniff
```

**Usage Example:**
```javascript
// In your app
const imageUrl = `/api/database/${databaseId}/storage/files/${fileId}/proxy`;

// Use in img tag
<img src={imageUrl} alt="User uploaded image" />

// Use in background
<div style={{ backgroundImage: `url(${imageUrl})` }} />
```

---

### 2. Public File Proxy

**Endpoint:** `GET /api/public/files/[fileId]/proxy`

**Authentication:** Not required

**Authorization:**
- File must be marked as `is_public: true` in database
- Private files return 403 error

**Response Headers:**
```http
Content-Type: [file mime type]
Content-Length: [file size]
Content-Disposition: inline; filename="[original filename]"
Cache-Control: public, max-age=31536000, immutable
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: *
Referrer-Policy: no-referrer-when-downgrade
X-Frame-Options: SAMEORIGIN
X-XSS-Protection: 1; mode=block
```

**Usage Example:**
```javascript
// In public API response
{
  "profilePicture": "https://pipilot.dev/api/public/files/abc123/proxy",
  "username": "john_doe"
}

// In external website
<img src="https://pipilot.dev/api/public/files/abc123/proxy" />

// In email template
<img src="https://pipilot.dev/api/public/files/abc123/proxy" 
     alt="Profile picture" 
     style="border-radius: 50%;" />
```

---

### 3. HEAD Request Support

**Endpoint:** `HEAD /api/public/files/[fileId]/proxy`

**Purpose:** Check file existence and metadata without downloading

**Response:** Headers only (no body)

**Usage Example:**
```javascript
// Check if file exists
const response = await fetch(fileUrl, { method: 'HEAD' });
if (response.ok) {
  const contentType = response.headers.get('Content-Type');
  const contentLength = response.headers.get('Content-Length');
  console.log(`File exists: ${contentType}, ${contentLength} bytes`);
}
```

---

## 🔧 Storage Library Functions

### getFileUrl()

Returns proxy URL instead of direct Supabase URL.

```typescript
async function getFileUrl(
  fileId: string, 
  expiresIn: number = 604800,  // 7 days
  useProxy: boolean = true      // Enable proxy (default)
): Promise<string>
```

**Parameters:**
- `fileId`: The file's UUID
- `expiresIn`: Expiration time (only used for legacy direct URLs)
- `useProxy`: Enable proxy URLs (default: true)

**Returns:**
- Public files: `https://pipilot.dev/api/public/files/{fileId}/proxy`
- Private files: `https://pipilot.dev/api/database/{dbId}/storage/files/{fileId}/proxy`

**Example:**
```typescript
// Get proxy URL (default)
const proxyUrl = await getFileUrl('abc-123-def-456');
// Returns: https://pipilot.dev/api/public/files/abc-123-def-456/proxy

// Get direct Supabase URL (legacy mode)
const directUrl = await getFileUrl('abc-123-def-456', 604800, false);
// Returns: https://supabase.co/storage/v1/object/sign/...
```

---

### uploadFile()

Automatically returns proxy URL after upload.

```typescript
async function uploadFile(
  bucketId: string,
  databaseId: number,
  file: File,
  options?: {
    isPublic?: boolean;
    metadata?: Record<string, any>;
  }
): Promise<FileRecord>
```

**Returns:**
```typescript
{
  id: string,
  name: string,
  original_name: string,
  size_bytes: number,
  mime_type: string,
  is_public: boolean,
  url: string,  // Proxy URL (your domain)
  created_at: string,
  ...
}
```

**Example:**
```typescript
const uploadedFile = await uploadFile(bucketId, databaseId, file, {
  isPublic: true,
  metadata: { uploadedBy: userId }
});

console.log(uploadedFile.url);
// Output: https://pipilot.dev/api/public/files/abc123/proxy

// Safe to store in database!
await supabase
  .from('users')
  .update({ profile_picture: uploadedFile.url })
  .eq('id', userId);
```

---

## 🔄 Migration Guide

### Before (Direct Supabase URLs)
```typescript
// Old implementation
const { data } = supabase.storage
  .from('bucket')
  .getPublicUrl(path);

const supabaseUrl = data.publicUrl;
// https://supabase.co/storage/v1/object/public/pipilot-storage/...
```

### After (Proxy URLs)
```typescript
// New implementation (automatic)
const proxyUrl = await getFileUrl(fileId);
// https://pipilot.dev/api/public/files/abc123/proxy

// No Supabase URLs exposed!
```

### Updating Existing Records

If you have existing records with Supabase URLs:

```typescript
// Migration script
async function migrateToProxyUrls() {
  // Get all files with old URLs
  const { data: files } = await supabase
    .from('storage_files')
    .select('*');

  for (const file of files) {
    // Generate new proxy URL
    const proxyUrl = await getFileUrl(file.id);
    
    // Update any tables that stored the old URL
    await supabase
      .from('users')
      .update({ profile_picture: proxyUrl })
      .eq('profile_picture', file.metadata.public_url);
  }
}
```

---

## 🎨 Frontend Integration

### React Component Example

```tsx
import { useState, useEffect } from 'react';

function FilePreview({ fileId, isPublic }) {
  const [fileUrl, setFileUrl] = useState('');

  useEffect(() => {
    // Fetch file URL from API
    const fetchUrl = async () => {
      if (isPublic) {
        // Public file - direct proxy URL
        setFileUrl(`/api/public/files/${fileId}/proxy`);
      } else {
        // Private file - get URL from authenticated endpoint
        const response = await fetch(`/api/database/${dbId}/storage/files/${fileId}`);
        const data = await response.json();
        setFileUrl(data.file.url);
      }
    };

    fetchUrl();
  }, [fileId, isPublic]);

  return (
    <img 
      src={fileUrl} 
      alt="File preview"
      className="rounded-lg shadow-lg"
    />
  );
}
```

### Next.js Image Optimization

```tsx
import Image from 'next/image';

function OptimizedImage({ fileId, alt }) {
  const proxyUrl = `/api/public/files/${fileId}/proxy`;

  return (
    <Image
      src={proxyUrl}
      alt={alt}
      width={800}
      height={600}
      className="object-cover"
    />
  );
}
```

---

## 📊 Use Cases

### 1. Profile Pictures
```typescript
// Upload profile picture
const file = await uploadFile(bucketId, databaseId, imageFile, {
  isPublic: true  // Public for easy sharing
});

// Store proxy URL in database
await supabase
  .from('users')
  .update({ 
    profile_picture: file.url  // Proxy URL, never expires!
  })
  .eq('id', userId);

// Use in app
<img src={user.profile_picture} alt={user.name} />
```

### 2. Private Documents
```typescript
// Upload private document
const file = await uploadFile(bucketId, databaseId, pdfFile, {
  isPublic: false  // Private, requires authentication
});

// Share with authenticated users only
<a href={file.url} target="_blank">
  View Document (Authenticated)
</a>
```

### 3. Public API Integration
```typescript
// API endpoint that returns file URLs
export async function GET(request: Request) {
  const files = await listFiles(bucketId);
  
  return Response.json({
    files: files.map(f => ({
      id: f.id,
      name: f.original_name,
      url: f.url  // Proxy URL - external apps never see Supabase
    }))
  });
}
```

### 4. Email Templates
```html
<!-- Email HTML with proxy URL -->
<table>
  <tr>
    <td>
      <img src="https://pipilot.dev/api/public/files/abc123/proxy" 
           alt="Welcome banner"
           style="max-width: 600px;" />
    </td>
  </tr>
</table>
```

---

## 🔒 Security Considerations

### Access Control

**Authenticated Proxy:**
- ✅ Verifies user session
- ✅ Checks database ownership
- ✅ Validates file permissions
- ✅ Logs all access attempts

**Public Proxy:**
- ✅ Only serves files marked as public
- ✅ Returns 403 for private files
- ✅ Full CORS support
- ✅ Security headers included

### Rate Limiting (Recommended)

Add rate limiting to prevent abuse:

```typescript
// middleware.ts or proxy route
import { Ratelimit } from '@upstash/ratelimit';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 m'),  // 100 requests per minute
});

// In proxy route
const { success } = await ratelimit.limit(ip);
if (!success) {
  return new Response('Too Many Requests', { status: 429 });
}
```

### Analytics & Monitoring

Track file access:

```typescript
// In proxy route
await supabase
  .from('file_access_logs')
  .insert({
    file_id: fileId,
    user_id: userId,
    ip_address: request.headers.get('x-forwarded-for'),
    user_agent: request.headers.get('user-agent'),
    accessed_at: new Date().toISOString(),
  });
```

---

## 🚀 Performance Optimization

### Caching Strategy

**Headers Set:**
```http
Cache-Control: public, max-age=31536000, immutable
```

**Benefits:**
- Browser caches for 1 year
- CDN caches aggressively
- Reduces server load
- Faster load times

### CDN Integration

Proxy URLs work perfectly with CDNs:

```typescript
// Cloudflare, Vercel Edge, etc.
// Automatically cache proxy responses
```

### Image Optimization (Future Enhancement)

Add image transformations:

```typescript
// GET /api/public/files/[fileId]/proxy?w=800&h=600&q=80

// In proxy route
const params = new URL(request.url).searchParams;
const width = params.get('w');
const height = params.get('h');
const quality = params.get('q');

// Use sharp or similar library for on-the-fly optimization
```

---

## 🛠️ Environment Configuration

Add to your `.env.local`:

```bash
# Application URL (required for proxy URLs)
NEXT_PUBLIC_APP_URL=https://pipilot.dev

# In development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

## 🧪 Testing

### Test Authenticated Proxy

```bash
# With authentication
curl -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
     https://pipilot.dev/api/database/123/storage/files/abc-123/proxy \
     -o downloaded_file.pdf
```

### Test Public Proxy

```bash
# No authentication required
curl https://pipilot.dev/api/public/files/abc-123/proxy \
     -o public_file.jpg

# Check file metadata
curl -I https://pipilot.dev/api/public/files/abc-123/proxy
```

### Test File Upload

```typescript
const testUpload = async () => {
  const file = new File(['test content'], 'test.txt', { 
    type: 'text/plain' 
  });

  const result = await uploadFile(bucketId, databaseId, file, {
    isPublic: true
  });

  console.log('Proxy URL:', result.url);
  // Should output: https://pipilot.dev/api/public/files/.../proxy
  
  // Verify URL works
  const response = await fetch(result.url);
  const text = await response.text();
  console.log('Content:', text);  // Should output: "test content"
};
```

---

## 📈 Monitoring & Analytics

### Track File Access

```typescript
// Create analytics table
create table file_analytics (
  id uuid primary key default uuid_generate_v4(),
  file_id uuid references storage_files(id),
  accessed_at timestamp with time zone default now(),
  ip_address text,
  user_agent text,
  referrer text,
  country text,
  bandwidth_bytes bigint
);

// In proxy route
await supabaseAdmin
  .from('file_analytics')
  .insert({
    file_id: fileId,
    ip_address: request.headers.get('x-forwarded-for'),
    user_agent: request.headers.get('user-agent'),
    referrer: request.headers.get('referer'),
    bandwidth_bytes: file.size_bytes,
  });
```

### Generate Reports

```typescript
// Get most accessed files
const { data } = await supabase
  .from('file_analytics')
  .select('file_id, count')
  .gte('accessed_at', '2024-01-01')
  .group('file_id')
  .order('count', { ascending: false })
  .limit(10);
```

---

## 🔄 Backward Compatibility

Both proxy URLs and direct Supabase URLs are supported:

```typescript
// Force direct Supabase URL (legacy mode)
const directUrl = await getFileUrl(fileId, 604800, false);

// Use proxy URL (default, recommended)
const proxyUrl = await getFileUrl(fileId);
```

This allows gradual migration without breaking existing functionality.

---

## 🎯 Best Practices

### 1. **Always Use Proxy URLs for Database Storage**
```typescript
// ✅ GOOD - Store proxy URL
await supabase
  .from('users')
  .update({ avatar: proxyUrl })
  .eq('id', userId);

// ❌ BAD - Store direct Supabase URL
await supabase
  .from('users')
  .update({ avatar: supabaseUrl })
  .eq('id', userId);
```

### 2. **Public Files for User-Facing Content**
```typescript
// Profile pictures, logos, banners
const file = await uploadFile(bucketId, dbId, image, {
  isPublic: true  // Never expires!
});
```

### 3. **Private Files for Sensitive Data**
```typescript
// Contracts, invoices, private documents
const file = await uploadFile(bucketId, dbId, document, {
  isPublic: false  // Requires authentication
});
```

### 4. **Use HEAD Requests to Check File Existence**
```typescript
const exists = await fetch(fileUrl, { method: 'HEAD' });
if (exists.ok) {
  // File exists, proceed
}
```

---

## 🎉 Summary

**What You Get:**
- ✅ Your domain URLs only (no Supabase exposure)
- ✅ Authenticated and public access patterns
- ✅ Aggressive caching for performance
- ✅ Full CORS support for external integrations
- ✅ Backward compatibility with direct URLs
- ✅ Easy to add analytics, rate limiting, transformations

**URLs Your Users See:**
```
https://pipilot.dev/api/public/files/abc123/proxy
https://pipilot.dev/api/database/456/storage/files/def789/proxy
```

**URLs Your Users Never See:**
```
https://supabase.co/storage/v1/object/sign/pipilot-storage/...
```

Perfect for professional applications where infrastructure should remain invisible! 🚀
