import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getDatabaseBucket, uploadFile } from '@/lib/storage';

/**
 * POST /api/database/[id]/storage/upload
 * Upload a file to storage
 */
export async function POST(
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
        { error: 'Storage bucket not found. Please initialize storage first.' },
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
          uploaded_by: user.email,
          database_id: params.id,
        },
      }
    );

    return NextResponse.json({
      success: true,
      file: uploadedFile,
      message: 'File uploaded successfully',
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload file' },
      { status: 500 }
    );
  }
}

// Increase max file size for Next.js
export const config = {
  api: {
    bodyParser: false, // Let Next.js handle the file upload
    responseLimit: false,
  },
};
