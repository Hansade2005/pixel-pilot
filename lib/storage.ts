import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Initialize Supabase client for storage operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Storage configuration
export const STORAGE_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB per file
  MAX_BUCKET_SIZE: 500 * 1024 * 1024, // 500MB per bucket
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  ALLOWED_FILE_TYPES: [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'application/pdf',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'text/csv',
    'application/json',
    'video/mp4', 'video/mpeg', 'video/quicktime',
    'audio/mpeg', 'audio/wav', 'audio/ogg'
  ],
  MASTER_BUCKET_NAME: 'pipilot-storage', // Single Supabase bucket for all users
};

/**
 * Create or get the master Supabase storage bucket
 */
export async function ensureMasterBucket() {
  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      throw new Error('Failed to list storage buckets');
    }

    const bucketExists = buckets.some(b => b.name === STORAGE_CONFIG.MASTER_BUCKET_NAME);

    if (!bucketExists) {
      // Create the master bucket
      const { data, error } = await supabaseAdmin.storage.createBucket(
        STORAGE_CONFIG.MASTER_BUCKET_NAME,
        {
          public: false,
          fileSizeLimit: STORAGE_CONFIG.MAX_FILE_SIZE,
          allowedMimeTypes: STORAGE_CONFIG.ALLOWED_FILE_TYPES,
        }
      );

      if (error) {
        console.error('Error creating bucket:', error);
        throw new Error('Failed to create storage bucket');
      }

      console.log('Master storage bucket created successfully');
    }

    return STORAGE_CONFIG.MASTER_BUCKET_NAME;
  } catch (error) {
    console.error('Error ensuring master bucket:', error);
    throw error;
  }
}

/**
 * Create a storage bucket for a database
 */
export async function createDatabaseBucket(databaseId: number, databaseName: string) {
  try {
    // Ensure master bucket exists
    await ensureMasterBucket();

    // Create bucket record in database
    const bucketName = `db_${databaseId}_${databaseName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

    const { data, error } = await supabaseAdmin
      .from('storage_buckets')
      .insert({
        database_id: databaseId,
        name: bucketName,
        size_limit_bytes: STORAGE_CONFIG.MAX_BUCKET_SIZE,
        current_usage_bytes: 0,
        is_public: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating bucket record:', error);
      throw new Error('Failed to create bucket record');
    }

    return data;
  } catch (error) {
    console.error('Error creating database bucket:', error);
    throw error;
  }
}

/**
 * Get bucket for a database
 */
export async function getDatabaseBucket(databaseId: number) {
  const { data, error } = await supabaseAdmin
    .from('storage_buckets')
    .select('*')
    .eq('database_id', databaseId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = not found
    console.error('Error getting bucket:', error);
    throw new Error('Failed to get bucket');
  }

  return data;
}

/**
 * Upload file to storage
 */
export async function uploadFile(
  bucketId: string,
  databaseId: number,
  file: File,
  options: {
    isPublic?: boolean;
    metadata?: Record<string, any>;
  } = {}
) {
  try {
    // Get bucket info
    const bucket = await getDatabaseBucket(databaseId);
    
    if (!bucket) {
      throw new Error('Bucket not found');
    }

    // Check bucket size limit
    if (bucket.current_usage_bytes + file.size > bucket.size_limit_bytes) {
      throw new Error(`Storage limit exceeded. Available: ${formatBytes(bucket.size_limit_bytes - bucket.current_usage_bytes)}`);
    }

    // Check file size
    if (file.size > STORAGE_CONFIG.MAX_FILE_SIZE) {
      throw new Error(`File too large. Maximum size: ${formatBytes(STORAGE_CONFIG.MAX_FILE_SIZE)}`);
    }

    // Check file type
    if (!STORAGE_CONFIG.ALLOWED_FILE_TYPES.includes(file.type)) {
      throw new Error('File type not allowed');
    }

    // Generate unique filename
    const fileExtension = file.name.split('.').pop();
    const uniqueName = `${uuidv4()}.${fileExtension}`;
    const filePath = `${bucket.name}/${uniqueName}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(STORAGE_CONFIG.MASTER_BUCKET_NAME)
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      throw new Error('Failed to upload file');
    }

    // Get public URL if public
    let publicUrl = null;
    if (options.isPublic) {
      const { data: urlData } = supabaseAdmin.storage
        .from(STORAGE_CONFIG.MASTER_BUCKET_NAME)
        .getPublicUrl(filePath);
      publicUrl = urlData.publicUrl;
    }

    // Create file record in database
    const { data: fileRecord, error: dbError } = await supabaseAdmin
      .from('storage_files')
      .insert({
        bucket_id: bucketId,
        name: uniqueName,
        original_name: file.name,
        path: filePath,
        size_bytes: file.size,
        mime_type: file.type,
        is_public: options.isPublic || false,
        metadata: {
          ...options.metadata,
          public_url: publicUrl,
          uploaded_at: new Date().toISOString(),
        },
      })
      .select()
      .single();

    if (dbError) {
      // Rollback: delete uploaded file
      await supabaseAdmin.storage
        .from(STORAGE_CONFIG.MASTER_BUCKET_NAME)
        .remove([filePath]);
      
      console.error('Error creating file record:', dbError);
      throw new Error('Failed to create file record');
    }

    return {
      ...fileRecord,
      public_url: publicUrl,
    };
  } catch (error) {
    console.error('Error in uploadFile:', error);
    throw error;
  }
}

/**
 * Get file download URL (signed URL for private files)
 * @param fileId - The file ID
 * @param expiresIn - Expiration time in seconds (default: 7 days for database storage)
 */
export async function getFileUrl(fileId: string, expiresIn: number = 604800) { // 7 days default (604800 seconds)
  const { data: file, error } = await supabaseAdmin
    .from('storage_files')
    .select('*')
    .eq('id', fileId)
    .single();

  if (error) {
    throw new Error('File not found');
  }

  if (file.is_public) {
    // Public files: permanent URL that never expires
    const { data } = supabaseAdmin.storage
      .from(STORAGE_CONFIG.MASTER_BUCKET_NAME)
      .getPublicUrl(file.path);
    return data.publicUrl;
  } else {
    // Private files: signed URL with 7-day expiration (suitable for storing in database)
    const { data, error: signError } = await supabaseAdmin.storage
      .from(STORAGE_CONFIG.MASTER_BUCKET_NAME)
      .createSignedUrl(file.path, expiresIn);

    if (signError) {
      throw new Error('Failed to generate signed URL');
    }

    return data.signedUrl;
  }
}

/**
 * Delete file from storage
 */
export async function deleteFile(fileId: string) {
  try {
    // Get file info
    const { data: file, error: getError } = await supabaseAdmin
      .from('storage_files')
      .select('*')
      .eq('id', fileId)
      .single();

    if (getError) {
      throw new Error('File not found');
    }

    // Delete from Supabase Storage
    const { error: storageError } = await supabaseAdmin.storage
      .from(STORAGE_CONFIG.MASTER_BUCKET_NAME)
      .remove([file.path]);

    if (storageError) {
      console.error('Error deleting from storage:', storageError);
      throw new Error('Failed to delete file from storage');
    }

    // Delete record from database (trigger will update bucket usage)
    const { error: dbError } = await supabaseAdmin
      .from('storage_files')
      .delete()
      .eq('id', fileId);

    if (dbError) {
      console.error('Error deleting file record:', dbError);
      throw new Error('Failed to delete file record');
    }

    return true;
  } catch (error) {
    console.error('Error in deleteFile:', error);
    throw error;
  }
}

/**
 * List files in a bucket
 */
export async function listFiles(bucketId: string, options: {
  limit?: number;
  offset?: number;
  search?: string;
  mimeType?: string;
} = {}) {
  let query = supabaseAdmin
    .from('storage_files')
    .select('*', { count: 'exact' })
    .eq('bucket_id', bucketId)
    .order('created_at', { ascending: false });

  if (options.search) {
    query = query.or(`name.ilike.%${options.search}%,original_name.ilike.%${options.search}%`);
  }

  if (options.mimeType) {
    query = query.eq('mime_type', options.mimeType);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error('Failed to list files');
  }

  // Add signed URLs for private files
  const filesWithUrls = await Promise.all(
    (data || []).map(async (file) => {
      try {
        const url = await getFileUrl(file.id);
        return { ...file, url };
      } catch (error) {
        console.error(`Error getting URL for file ${file.id}:`, error);
        return { ...file, url: null };
      }
    })
  );

  return {
    files: filesWithUrls,
    total: count || 0,
  };
}

/**
 * Get storage stats for a database
 */
export async function getStorageStats(databaseId: number) {
  const { data, error } = await supabaseAdmin
    .from('storage_stats')
    .select('*')
    .eq('database_id', databaseId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error('Failed to get storage stats');
  }

  return data || {
    database_id: databaseId,
    bucket_id: null,
    file_count: 0,
    current_usage_bytes: 0,
    size_limit_bytes: STORAGE_CONFIG.MAX_BUCKET_SIZE,
    usage_percentage: 0,
  };
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Check if file is an image
 */
export function isImage(mimeType: string): boolean {
  return STORAGE_CONFIG.ALLOWED_IMAGE_TYPES.includes(mimeType);
}

/**
 * Get file icon based on mime type
 */
export function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType.startsWith('video/')) return '🎥';
  if (mimeType.startsWith('audio/')) return '🎵';
  if (mimeType === 'application/pdf') return '📄';
  if (mimeType.includes('word')) return '📝';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
  if (mimeType === 'text/plain') return '📃';
  if (mimeType === 'application/json') return '{}';
  return '📎';
}
