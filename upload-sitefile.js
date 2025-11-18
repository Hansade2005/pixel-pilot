import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const SUPABASE_URL = 'https://dlunpilhklsgvkegnnlp.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsdW5waWxoa2xzZ3ZrZWdubmxwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTA1MDQxOSwiZXhwIjoyMDcwNjI2NDE5fQ.k-2OJ4p3hr9feR4ks54OQM2HhOhaVJ3pUK-20tGJwpo';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
Deno.serve(async (req)=>{
  console.log(`[${new Date().toISOString()}] Edge Function: Starting cleanup of expired temporary files`);
  try {
    // Get expired files that haven't been deleted yet
    const { data: expiredFiles, error: fetchError } = await supabase.from('temp_file_uploads').select('id, file_name, bucket_name, cleanup_attempts').eq('is_deleted', false).lt('expires_at', new Date().toISOString()).lt('cleanup_attempts', 3) // Max 3 attempts
    ;
    if (fetchError) {
      console.error('Edge Function: Error fetching expired files:', fetchError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to fetch expired files',
        details: fetchError.message
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    if (!expiredFiles || expiredFiles.length === 0) {
      console.log('Edge Function: No expired files to clean up');
      return new Response(JSON.stringify({
        success: true,
        message: 'No expired files to clean up',
        cleanedCount: 0
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    console.log(`Edge Function: Found ${expiredFiles.length} expired files to clean up`);
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    // Process each expired file
    for (const file of expiredFiles){
      try {
        console.log(`Edge Function: Deleting file: ${file.file_name} from bucket: ${file.bucket_name}`);
        // Delete from Supabase storage
        const { error: deleteError } = await supabase.storage.from(file.bucket_name).remove([
          file.file_name
        ]);
        if (deleteError) {
          console.error(`Edge Function: Failed to delete ${file.file_name}:`, deleteError);
          errors.push({
            fileName: file.file_name,
            error: deleteError.message
          });
          // Increment cleanup attempts
          await supabase.from('temp_file_uploads').update({
            cleanup_attempts: file.cleanup_attempts + 1
          }).eq('id', file.id);
          errorCount++;
          continue;
        }
        // Mark as deleted in database
        const { error: updateError } = await supabase.from('temp_file_uploads').update({
          is_deleted: true,
          deleted_at: new Date().toISOString()
        }).eq('id', file.id);
        if (updateError) {
          console.error(`Edge Function: Failed to mark ${file.file_name} as deleted:`, updateError);
        } else {
          console.log(`Edge Function: Successfully cleaned up: ${file.file_name}`);
          successCount++;
        }
      } catch (error) {
        console.error(`Edge Function: Unexpected error processing ${file.file_name}:`, error);
        errors.push({
          fileName: file.file_name,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        errorCount++;
      }
    }
    const result = {
      success: true,
      cleanedCount: successCount,
      errorCount,
      errors: errors.length > 0 ? errors : undefined
    };
    console.log(`Edge Function: Completed. Success: ${successCount}, Errors: ${errorCount}`);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Edge Function: Unexpected error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Cleanup process failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
});
