import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const STORAGE_BUCKET = 'pipilot-storage';

/**
 * GET /api/public/files/[fileId]/proxy
 * Public proxy for file access - streams file content without exposing Supabase URLs
 * This route is PUBLIC and requires the file to be marked as public in the database
 * Perfect for embedding in external websites, apps, or sharing publicly
 */
export async function GET(
  request: Request,
  { params }: { params: { fileId: string } }
) {
  try {
    // Get file info from database
    const { data: file, error: fileError } = await supabaseAdmin
      .from('storage_files')
      .select('*')
      .eq('id', params.fileId)
      .single();

    if (fileError || !file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Verify file is marked as public
    if (!file.is_public) {
      return NextResponse.json(
        { error: 'File is private - use authenticated endpoint' },
        { status: 403 }
      );
    }

    // Get file from Supabase storage
    const { data: fileData, error: downloadError } = await supabaseAdmin
      .storage
      .from(STORAGE_BUCKET)
      .download(file.name);

    if (downloadError || !fileData) {
      console.error('Storage download error:', downloadError);
      return NextResponse.json(
        { error: 'Failed to retrieve file' },
        { status: 500 }
      );
    }

    // Convert blob to array buffer for streaming
    const arrayBuffer = await fileData.arrayBuffer();

    // Set appropriate headers
    const headers = new Headers();
    headers.set('Content-Type', file.mime_type || 'application/octet-stream');
    headers.set('Content-Length', file.size_bytes.toString());
    headers.set('Content-Disposition', `inline; filename="${file.original_name}"`);
    
    // Add aggressive caching for public files (1 year)
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('X-Content-Type-Options', 'nosniff');
    
    // Full CORS support for public API
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    headers.set('Access-Control-Allow-Headers', '*');
    headers.set('Access-Control-Expose-Headers', 'Content-Length, Content-Type, Content-Disposition');
    
    // Add referrer policy for better privacy
    headers.set('Referrer-Policy', 'no-referrer-when-downgrade');
    
    // Security headers
    headers.set('X-Frame-Options', 'SAMEORIGIN');
    headers.set('X-XSS-Protection', '1; mode=block');

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Public file proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * HEAD request for checking file existence and metadata without downloading
 */
export async function HEAD(
  request: Request,
  { params }: { params: { fileId: string } }
) {
  try {
    // Get file info from database
    const { data: file, error: fileError } = await supabaseAdmin
      .from('storage_files')
      .select('*')
      .eq('id', params.fileId)
      .single();

    if (fileError || !file || !file.is_public) {
      return new NextResponse(null, { status: 404 });
    }

    // Set headers without body
    const headers = new Headers();
    headers.set('Content-Type', file.mime_type || 'application/octet-stream');
    headers.set('Content-Length', file.size_bytes.toString());
    headers.set('Content-Disposition', `inline; filename="${file.original_name}"`);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('Access-Control-Allow-Origin', '*');

    return new NextResponse(null, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('HEAD request error:', error);
    return new NextResponse(null, { status: 500 });
  }
}

/**
 * OPTIONS handler for CORS preflight requests
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Max-Age': '86400',
    },
  });
}
