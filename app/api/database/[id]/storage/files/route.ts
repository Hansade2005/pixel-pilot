import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getDatabaseBucket, listFiles } from '@/lib/storage';

/**
 * GET /api/database/[id]/storage/files
 * List all files in storage
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
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

    // Get bucket
    const bucket = await getDatabaseBucket(parseInt(params.id));
    
    if (!bucket) {
      return NextResponse.json(
        { error: 'Storage bucket not found' },
        { status: 404 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search') || undefined;
    const mimeType = searchParams.get('mime_type') || undefined;

    // Get files
    const { files, total } = await listFiles(bucket.id, {
      limit,
      offset,
      search,
      mimeType,
    });

    return NextResponse.json({
      files,
      total,
      limit,
      offset,
      has_more: offset + limit < total,
    });
  } catch (error: any) {
    console.error('List files error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list files' },
      { status: 500 }
    );
  }
}
