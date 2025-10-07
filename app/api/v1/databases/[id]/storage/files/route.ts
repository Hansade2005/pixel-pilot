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
 * GET /api/v1/databases/[id]/storage/files
 * Public API: List files in storage
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
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

    // Get files from database
    const { data: files, error: filesError } = await supabaseAdmin
      .from('storage_files')
      .select('*')
      .eq('database_id', parseInt(params.id))
      .order('created_at', { ascending: false });

    if (filesError) throw filesError;

    // Transform files to use proxy URLs
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pipilot.dev';
    const transformedFiles = files.map((file) => ({
      id: file.id,
      name: file.name,
      original_name: file.original_name,
      size_bytes: file.size_bytes,
      mime_type: file.mime_type,
      url: `${appUrl}/api/v1/databases/${params.id}/storage/files/${file.id}/proxy`,
      is_public: file.is_public,
      created_at: file.created_at,
      metadata: file.metadata,
    }));

    // Log API usage
    const responseTime = Date.now() - auth.startTime!;
    logApiUsage(
      auth.apiKeyRecord!.id,
      `/api/v1/databases/${params.id}/storage/files`,
      'GET',
      200,
      responseTime,
      supabaseAdmin
    );

    return NextResponse.json({
      success: true,
      files: transformedFiles,
      count: transformedFiles.length,
    });
  } catch (error: any) {
    console.error('Public list files error:', error);
    
    // Log failed API usage
    if (auth.startTime) {
      const responseTime = Date.now() - auth.startTime;
      logApiUsage(
        auth.apiKeyRecord!.id,
        `/api/v1/databases/${params.id}/storage/files`,
        'GET',
        500,
        responseTime,
        supabaseAdmin
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to list files' },
      { status: 500 }
    );
  }
}
