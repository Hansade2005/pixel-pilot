import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { deleteFile, getFileUrl } from '@/lib/storage';
import { createClient as createAdminClient } from '@supabase/supabase-js';

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/database/[id]/storage/files/[fileId]
 * Get file details and download URL
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

    // Get download URL
    const url = await getFileUrl(params.fileId);

    return NextResponse.json({
      file: {
        id: file.id,
        name: file.name,
        original_name: file.original_name,
        size_bytes: file.size_bytes,
        mime_type: file.mime_type,
        is_public: file.is_public,
        metadata: file.metadata,
        created_at: file.created_at,
        url,
      },
    });
  } catch (error: any) {
    console.error('Get file error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get file' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/database/[id]/storage/files/[fileId]
 * Delete a file from storage
 */
export async function DELETE(
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

    // Get file info to verify ownership
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

    // Delete file
    await deleteFile(params.fileId);

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete file error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete file' },
      { status: 500 }
    );
  }
}
