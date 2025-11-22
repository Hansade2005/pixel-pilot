import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getDatabaseBucket,
  createDatabaseBucket,
  uploadFile,
  listFiles,
  getStorageStats,
} from '@/lib/storage';

/**
 * GET /api/database/[id]/storage
 * Get storage bucket info and stats
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params in Next.js 15
    const { id } = await params;

    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: sessionError } = await supabase.auth.getUser();

    if (sessionError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify database exists
    const { data: database, error: dbError } = await supabase
      .from('databases')
      .select('*')
      .eq('id', id)
      .single();

    if (dbError || !database) {
      return NextResponse.json(
        { error: 'Database not found' },
        { status: 404 }
      );
    }

    // Get or create bucket
    let bucket = await getDatabaseBucket(parseInt(id));

    if (!bucket) {
      bucket = await createDatabaseBucket(parseInt(id), database.name);
    }

    // Get storage stats
    const stats = await getStorageStats(parseInt(id));

    // Get files list (first page)
    const { files, total } = await listFiles(bucket.id, { limit: 20 });

    return NextResponse.json({
      bucket: {
        id: bucket.id,
        name: bucket.name,
        size_limit_bytes: bucket.size_limit_bytes,
        current_usage_bytes: bucket.current_usage_bytes,
        is_public: bucket.is_public,
        created_at: bucket.created_at,
      },
      stats: {
        file_count: stats.file_count || 0,
        usage_percentage: parseFloat(stats.usage_percentage || '0'),
        available_bytes: bucket.size_limit_bytes - bucket.current_usage_bytes,
        current_usage_bytes: bucket.current_usage_bytes,
        size_limit_bytes: bucket.size_limit_bytes,
      },
      files: files.slice(0, 10), // Return first 10 for overview
      total_files: total,
    });
  } catch (error: any) {
    console.error('Storage GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
