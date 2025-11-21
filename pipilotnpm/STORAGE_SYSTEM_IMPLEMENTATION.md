# 📦 File Storage System - Complete Implementation

## 🎯 Overview

Implemented a complete file storage system similar to Supabase Storage, allowing users to store and manage files (images, documents, videos, etc.) in their databases.

---

## ✨ Key Features

### **Storage Capabilities**
- ✅ **500MB per database** - Each database gets 500MB of storage
- ✅ **10MB max file size** - Individual files up to 10MB
- ✅ **Multiple file types** - Images, PDFs, documents, videos, audio
- ✅ **Public & private files** - Control file access
- ✅ **Signed URLs** - Secure temporary access to private files
- ✅ **CDN delivery** - Fast file delivery via Supabase CDN
- ✅ **Automatic usage tracking** - Real-time storage usage monitoring

### **Security Features**
- ✅ **Row Level Security (RLS)** - Users can only access their files
- ✅ **File type validation** - Only allowed types can be uploaded
- ✅ **Size limits enforced** - Prevents storage abuse
- ✅ **API key authentication** - Secure external access
- ✅ **Rate limiting** - Prevents API abuse

---

## 🏗️ Architecture

### **Database Schema**

```
storage_buckets
├── id (UUID)
├── database_id (FK → databases.id)
├── name (TEXT)
├── size_limit_bytes (500MB)
├── current_usage_bytes
├── is_public (BOOLEAN)
└── timestamps

storage_files
├── id (UUID)
├── bucket_id (FK → storage_buckets.id)
├── name (generated unique name)
├── original_name (user's filename)
├── path (Supabase Storage path)
├── size_bytes
├── mime_type
├── is_public
├── metadata (JSONB)
└── timestamps
```

### **Supabase Storage Structure**

```
pipilot-storage (Master Bucket)
├── db_1_myapp/
│   ├── abc123.jpg
│   ├── def456.pdf
│   └── ghi789.mp4
├── db_2_webapp/
│   ├── xyz123.png
│   └── mno456.docx
└── ...
```

---

## 📡 API Endpoints

### **Dashboard API (Authenticated Users)**

#### **1. Get Storage Info**
```
GET /api/database/{databaseId}/storage
```

Returns bucket info, usage stats, and recent files.

**Response:**
```json
{
  "bucket": {
    "id": "uuid",
    "name": "db_1_myapp",
    "size_limit_bytes": 524288000,
    "current_usage_bytes": 104857600,
    "is_public": false
  },
  "stats": {
    "file_count": 25,
    "usage_percentage": 20,
    "available_bytes": 419430400
  },
  "files": [...],
  "total_files": 25
}
```

#### **2. Upload File**
```
POST /api/database/{databaseId}/storage/upload
Content-Type: multipart/form-data
```

**Form Data:**
- `file` - The file to upload
- `is_public` - "true" or "false"
- `metadata` - JSON string (optional)

**Response:**
```json
{
  "success": true,
  "file": {
    "id": "uuid",
    "name": "abc123.jpg",
    "original_name": "photo.jpg",
    "size_bytes": 1048576,
    "mime_type": "image/jpeg",
    "url": "https://...",
    "is_public": true,
    "created_at": "2025-10-07T..."
  }
}
```

#### **3. List Files**
```
GET /api/database/{databaseId}/storage/files
  ?limit=50
  &offset=0
  &search=photo
  &mime_type=image/jpeg
```

**Response:**
```json
{
  "files": [...],
  "total": 25,
  "limit": 50,
  "offset": 0,
  "has_more": false
}
```

#### **4. Get File Details**
```
GET /api/database/{databaseId}/storage/files/{fileId}
```

**Response:**
```json
{
  "file": {
    "id": "uuid",
    "name": "abc123.jpg",
    "original_name": "photo.jpg",
    "size_bytes": 1048576,
    "mime_type": "image/jpeg",
    "is_public": true,
    "metadata": {},
    "created_at": "2025-10-07T...",
    "url": "https://..." // Download URL
  }
}
```

#### **5. Delete File**
```
DELETE /api/database/{databaseId}/storage/files/{fileId}
```

**Response:**
```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

---

### **Public API (API Key Required)**

#### **Upload File (External Apps)**
```
POST /api/v1/databases/{databaseId}/storage/upload
Authorization: Bearer YOUR_API_KEY
Content-Type: multipart/form-data
```

**Form Data:**
- `file` - The file to upload
- `is_public` - "true" or "false"
- `metadata` - JSON string (optional)

**Response:**
```json
{
  "success": true,
  "file": {
    "id": "uuid",
    "name": "abc123.jpg",
    "original_name": "photo.jpg",
    "size_bytes": 1048576,
    "mime_type": "image/jpeg",
    "url": "https://...",
    "is_public": true,
    "created_at": "2025-10-07T..."
  },
  "message": "File uploaded successfully"
}
```

---

## 💻 Usage Examples

### **JavaScript/TypeScript (External App)**

```typescript
// Upload file
async function uploadFile(file: File, isPublic: boolean = true) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('is_public', isPublic.toString());
  formData.append('metadata', JSON.stringify({
    uploaded_from: 'my-app',
    tags: ['profile', 'avatar']
  }));

  const response = await fetch(
    'https://pipilot.dev/api/v1/databases/YOUR_DB_ID/storage/upload',
    {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer YOUR_API_KEY',
      },
      body: formData,
    }
  );

  const data = await response.json();
  
  if (data.success) {
    console.log('File URL:', data.file.url);
    return data.file;
  } else {
    throw new Error(data.error);
  }
}

// Usage in React
function FileUploader() {
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const uploadedFile = await uploadFile(file, true);
      console.log('Uploaded:', uploadedFile);
      // Use uploadedFile.url to display the image
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  return (
    <input 
      type="file" 
      onChange={handleUpload}
      accept="image/*"
    />
  );
}
```

### **Next.js API Route (Server-Side)**

```typescript
// app/api/upload/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file');

  // Forward to pipilot.dev
  const uploadFormData = new FormData();
  uploadFormData.append('file', file);
  uploadFormData.append('is_public', 'true');

  const response = await fetch(
    `https://pipilot.dev/api/v1/databases/${process.env.PIPILOT_DB_ID}/storage/upload`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PIPILOT_API_KEY}`,
      },
      body: uploadFormData,
    }
  );

  const data = await response.json();
  return NextResponse.json(data);
}
```

### **React Native**

```typescript
import * as ImagePicker from 'expo-image-picker';

async function uploadImage() {
  // Pick image
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
  });

  if (result.canceled) return;

  // Create form data
  const formData = new FormData();
  formData.append('file', {
    uri: result.assets[0].uri,
    type: 'image/jpeg',
    name: 'photo.jpg',
  } as any);
  formData.append('is_public', 'true');

  // Upload
  const response = await fetch(
    'https://pipilot.dev/api/v1/databases/YOUR_DB_ID/storage/upload',
    {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer YOUR_API_KEY',
      },
      body: formData,
    }
  );

  const data = await response.json();
  return data.file.url;
}
```

---

## 🎨 Allowed File Types

### **Images**
- JPEG/JPG
- PNG
- GIF
- WebP
- SVG

### **Documents**
- PDF
- Microsoft Word (.doc, .docx)
- Microsoft Excel (.xls, .xlsx)
- Text files (.txt)
- CSV

### **Media**
- Videos (.mp4, .mpeg, .mov)
- Audio (.mp3, .wav, .ogg)

### **Other**
- JSON files

---


### **File Type Validation**
Only allowed MIME types can be uploaded. Server validates before storing.

### **Size Limits**
- **Per file**: 10MB maximum
- **Per bucket**: 500MB total
- Enforced before upload

### **Public vs Private Files**
- **Public**: Accessible via CDN URL (no authentication)
- **Private**: Requires signed URL (expires after 1 hour)

---

## 📊 Storage Tracking

### **Automatic Usage Updates**
```sql
-- Trigger automatically updates bucket usage
CREATE TRIGGER update_bucket_usage_trigger
  AFTER INSERT OR UPDATE OR DELETE ON storage_files
  FOR EACH ROW
  EXECUTE FUNCTION update_bucket_usage();
```

### **Usage Stats View**
```sql
CREATE VIEW storage_stats AS
SELECT 
  d.id as database_id,
  sb.current_usage_bytes,
  sb.size_limit_bytes,
  COUNT(sf.id) as file_count,
  ROUND((sb.current_usage_bytes / sb.size_limit_bytes * 100), 2) as usage_percentage
FROM databases d
LEFT JOIN storage_buckets sb ON d.id = sb.database_id
LEFT JOIN storage_files sf ON sb.id = sf.bucket_id
GROUP BY d.id, sb.id;
```

---

## 🚨 Error Handling

### **Common Errors**

| Error | Status | Meaning |
|-------|--------|---------|
| "File too large" | 400 | File exceeds 10MB limit |
| "Storage limit exceeded" | 400 | Bucket would exceed 500MB |
| "File type not allowed" | 400 | MIME type not in allowed list |
| "Storage not initialized" | 404 | Bucket not created yet |
| "Invalid API key" | 401 | Missing or invalid API key |
| "Rate limit exceeded" | 429 | Too many requests |

### **Error Response Format**
```json
{
  "error": "Storage limit exceeded. Available: 50MB"
}
```

---

## 🔧 Database Migration

Run this SQL in your Supabase SQL Editor:

```sql
-- See: supabase/migrations/20251007_create_storage_system.sql
```

This creates:
- `storage_buckets` table
- `storage_files` table
- RLS policies
- Automatic triggers
- Helper views

---

## 📝 Next Steps

### **Phase 2 Enhancements** (Future)

1. **Image Transformations**
   - Automatic thumbnail generation
   - Image resizing on-the-fly
   - Format conversion (JPEG → WebP)

2. **Advanced Features**
   - Folder organization
   - File versioning
   - Batch operations
   - Direct browser upload (presigned URLs)

3. **UI Components**
   - Drag-and-drop file uploader
   - Image gallery view
   - File browser with preview
   - Storage usage charts

4. **Analytics**
   - Most accessed files
   - Upload patterns
   - Storage growth tracking

---

## 🎯 Summary

### **What Was Built**

✅ **Database Schema** - Tables, triggers, RLS policies  
✅ **Storage Library** - Reusable functions for file operations  
✅ **Dashboard API** - 5 endpoints for file management  
✅ **Public API** - External app integration  
✅ **Security** - RLS, validation, rate limiting  
✅ **Documentation** - Complete usage guide  

### **What Users Get**

- **500MB storage** per database
- **Secure file uploads** from their apps
- **Public & private files** support
- **CDN delivery** for fast access
- **Automatic tracking** of usage
- **Simple API** similar to Supabase Storage

---

## 📞 Support

For issues or questions:
- Check error messages
- Review API documentation
- Test with curl/Postman
- Check Supabase Storage dashboard

---

**Implemented by**: PiPilot Team  alias Hans Ade
**Date**: October 7, 2025  
**Status**: ✅ Complete & Ready for Testing
