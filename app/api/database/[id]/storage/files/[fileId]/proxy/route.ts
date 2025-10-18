import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getFileUrl } from '@/lib/storage';

/**
 * GET /api/database/[id]/storage/files/[fileId]/proxy
 * Proxy download endpoint that forces file download with proper headers
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

    // Get file info
    const { data: file, error: fileError } = await supabase
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

    // Get the file URL
    const fileUrl = await getFileUrl(params.fileId);

    // Fetch the file from Supabase
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new Error('Failed to fetch file from storage');
    }

    const fileBlob = await fileResponse.blob();

    // Return the file with proper download headers
    return new NextResponse(fileBlob, {
      headers: {
        'Content-Type': file.mime_type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${file.original_name}"`,
        'Content-Length': fileBlob.size.toString(),
      },
    });
  } catch (error: any) {
    console.error('Download proxy error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to download file' },
      { status: 500 }
    );
  }
}