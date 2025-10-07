import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  extractApiKey,
  isValidApiKeyFormat,
  hashApiKey,
  checkRateLimit,
  logApiUsage,
  updateApiKeyLastUsed,
} from '@/lib/api-keys';
import { getDatabaseBucket, deleteFile } from '@/lib/storage';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Middleware to authenticate API key
 */
async function authenticateApiKey(request: Request, databaseId: string) {
  const startTime = Date.now();
  const authHeader = request.headers.get('authorization');
  const apiKey = extractApiKey(authHeader);

  if (!apiKey || !isValidApiKeyFormat(apiKey)) {
    return {
      error: NextResponse.json(
        { error: 'Invalid or missing API key' },
        { status: 401 }
      ),
    };
  }

  const keyHash = hashApiKey(apiKey);

  const { data: apiKeyRecord, error: keyError } = await supabaseAdmin
    .from('api_keys')
    .select('*')
    .eq('key_hash', keyHash)
    .eq('database_id', databaseId)
    .eq('is_active', true)
    .single();

  if (keyError || !apiKeyRecord) {
    return {
      error: NextResponse.json(
        { error: 'Invalid API key or access denied' },
        { status: 401 }
      ),
    };
  }

  const rateLimitResult = await checkRateLimit(
    apiKeyRecord.id,
    apiKeyRecord.rate_limit,
    supabaseAdmin
  );

  if (rateLimitResult.exceeded) {
    return {
      error: NextResponse.json(
        {
          error: 'Rate limit exceeded',
          limit: rateLimitResult.limit,
          usage: rateLimitResult.usage,
        },
        { status: 429 }
      ),
    };
  }

  updateApiKeyLastUsed(apiKeyRecord.id, supabaseAdmin);

  return {
    apiKeyRecord,
    startTime,
  };
}

/**
 * GET /api/v1/databases/[id]/storage/files/[fileId]
 * Public API: Get file metadata
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string; fileId: string } }
) {
  const auth = await authenticateApiKey(request, params.id);
  if (auth.error) return auth.error;

  try {
    const bucket = await getDatabaseBucket(parseInt(params.id));
    
    if (!bucket) {
      return NextResponse.json(
        { error: 'Storage not initialized for this database' },
        { status: 404 }
      );
    }

    // Get file from database
    const { data: file, error: fileError } = await supabaseAdmin
      .from('storage_files')
      .select('*')
      .eq('id', params.fileId)
      .eq('database_id', parseInt(params.id))
      .single();

    if (fileError || !file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Use proxy URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pipilot.dev';

    // Log API usage
    const responseTime = Date.now() - auth.startTime!;
    logApiUsage(
      auth.apiKeyRecord!.id,
      `/api/v1/databases/${params.id}/storage/files/${params.fileId}`,
      'GET',
      200,
      responseTime,
      supabaseAdmin
    );

    return NextResponse.json({
      success: true,
      file: {
        id: file.id,
        name: file.name,
        original_name: file.original_name,
        size_bytes: file.size_bytes,
        mime_type: file.mime_type,
        url: `${appUrl}/api/v1/databases/${params.id}/storage/files/${file.id}/proxy`,
        is_public: file.is_public,
        created_at: file.created_at,
        metadata: file.metadata,
      },
    });
  } catch (error: any) {
    console.error('Public get file error:', error);
    
    // Log failed API usage
    if (auth.startTime) {
      const responseTime = Date.now() - auth.startTime;
      logApiUsage(
        auth.apiKeyRecord!.id,
        `/api/v1/databases/${params.id}/storage/files/${params.fileId}`,
        'GET',
        500,
        responseTime,
        supabaseAdmin
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to get file' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/databases/[id]/storage/files/[fileId]
 * Public API: Delete file from storage
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; fileId: string } }
) {
  const auth = await authenticateApiKey(request, params.id);
  if (auth.error) return auth.error;

  try {
    const bucket = await getDatabaseBucket(parseInt(params.id));
    
    if (!bucket) {
      return NextResponse.json(
        { error: 'Storage not initialized for this database' },
        { status: 404 }
      );
    }

    // Delete file
    await deleteFile(params.fileId);

    // Log API usage
    const responseTime = Date.now() - auth.startTime!;
    logApiUsage(
      auth.apiKeyRecord!.id,
      `/api/v1/databases/${params.id}/storage/files/${params.fileId}`,
      'DELETE',
      200,
      responseTime,
      supabaseAdmin
    );

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error: any) {
    console.error('Public delete file error:', error);
    
    // Log failed API usage
    if (auth.startTime) {
      const responseTime = Date.now() - auth.startTime;
      logApiUsage(
        auth.apiKeyRecord!.id,
        `/api/v1/databases/${params.id}/storage/files/${params.fileId}`,
        'DELETE',
        500,
        responseTime,
        supabaseAdmin
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to delete file' },
      { status: 500 }
    );
  }
}
