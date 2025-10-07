import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const STORAGE_BUCKET = 'pipilot-storage';

/**
 * GET /api/database/[id]/storage/files/[fileId]/proxy
 * Proxy file from Supabase storage - streams the file content without exposing Supabase URLs
 * This route authenticates users and ensures they own the database
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string; fileId: string } }
) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: sessionError } = await supabase.auth.getUser();
    
    if (sessionError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify database ownership
    const { data: database, error: dbError } = await supabase
      .from('databases')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (dbError || !database) {
      return NextResponse.json(
        { error: 'Database not found or access denied' },
        { status: 404 }
      );
    }

    // Get file info from database
    const { data: file, error: fileError } = await supabaseAdmin
      .from('storage_files')
      .select('*, storage_buckets!inner(database_id)')
      .eq('id', params.fileId)
      .single();

    if (fileError || !file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Verify file belongs to user's database
    if (file.storage_buckets.database_id !== parseInt(params.id)) {
      return NextResponse.json(
        { error: 'Access denied' },
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
    
    // Add caching headers for better performance
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('X-Content-Type-Options', 'nosniff');
    
    // Add CORS headers for public API compatibility
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('File proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
