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
import { uploadFile, getDatabaseBucket } from '@/lib/storage';

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
          reset_in: rateLimitResult.resetIn,
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
 * POST /api/v1/databases/[id]/storage/upload
 * Public API: Upload file to storage
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateApiKey(request, params.id);
  if (auth.error) return auth.error;

  try {
    // Get bucket
    const bucket = await getDatabaseBucket(parseInt(params.id));
    
    if (!bucket) {
      return NextResponse.json(
        { error: 'Storage not initialized for this database' },
        { status: 404 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const isPublic = formData.get('is_public') === 'true';
    const metadataStr = formData.get('metadata') as string;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Parse metadata
    let metadata = {};
    if (metadataStr) {
      try {
        metadata = JSON.parse(metadataStr);
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid metadata JSON' },
          { status: 400 }
        );
      }
    }

    // Upload file
    const uploadedFile = await uploadFile(
      bucket.id,
      parseInt(params.id),
      file,
      {
        isPublic,
        metadata: {
          ...metadata,
          via_api: true,
          api_key_id: auth.apiKeyRecord!.id,
        },
      }
    );

    // Log API usage
    const responseTime = Date.now() - auth.startTime!;
    logApiUsage(
      auth.apiKeyRecord!.id,
      `/api/v1/databases/${params.id}/storage/upload`,
      'POST',
      200,
      responseTime,
      supabaseAdmin
    );

    return NextResponse.json({
      success: true,
      file: {
        id: uploadedFile.id,
        name: uploadedFile.name,
        original_name: uploadedFile.original_name,
        size_bytes: uploadedFile.size_bytes,
        mime_type: uploadedFile.mime_type,
        url: uploadedFile.public_url || uploadedFile.url,
        is_public: uploadedFile.is_public,
        created_at: uploadedFile.created_at,
      },
      message: 'File uploaded successfully',
    });
  } catch (error: any) {
    console.error('Public upload error:', error);
    
    // Log failed API usage
    if (auth.startTime) {
      const responseTime = Date.now() - auth.startTime;
      logApiUsage(
        auth.apiKeyRecord!.id,
        `/api/v1/databases/${params.id}/storage/upload`,
        'POST',
        500,
        responseTime,
        supabaseAdmin
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to upload file' },
      { status: 500 }
    );
  }
}

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};
