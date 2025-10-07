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
import { getDatabaseBucket } from '@/lib/storage';

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
 * GET /api/v1/databases/[id]/storage/files/[fileId]/proxy
 * Public API: Proxy file access (masks Supabase storage URLs)
 * 
 * This endpoint streams files from Supabase storage through your domain,
 * hiding the actual storage location from users.
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

    // Get file metadata from database
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

    // Get actual file from Supabase storage
    const { data: fileData, error: downloadError } = await supabaseAdmin
      .storage
      .from(bucket.name)
      .download(file.storage_path);

    if (downloadError || !fileData) {
      console.error('Storage download error:', downloadError);
      return NextResponse.json(
        { error: 'Failed to download file from storage' },
        { status: 500 }
      );
    }

    // Convert blob to buffer for streaming
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Log API usage
    const responseTime = Date.now() - auth.startTime!;
    logApiUsage(
      auth.apiKeyRecord!.id,
      `/api/v1/databases/${params.id}/storage/files/${params.fileId}/proxy`,
      'GET',
      200,
      responseTime,
      supabaseAdmin
    );

    // Return file with proper headers
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': file.mime_type || 'application/octet-stream',
        'Content-Length': buffer.length.toString(),
        'Content-Disposition': `inline; filename="${file.original_name}"`,
        'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year
        'X-File-ID': file.id,
        'X-File-Name': file.original_name,
      },
    });
  } catch (error: any) {
    console.error('Public proxy error:', error);
    
    // Log failed API usage
    if (auth.startTime) {
      const responseTime = Date.now() - auth.startTime;
      logApiUsage(
        auth.apiKeyRecord!.id,
        `/api/v1/databases/${params.id}/storage/files/${params.fileId}/proxy`,
        'GET',
        500,
        responseTime,
        supabaseAdmin
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to proxy file' },
      { status: 500 }
    );
  }
}
