// ==========================================================
// E2B SANDBOX TOOL — MULTI-DOCUMENT + PNG + PDF SUPPORT
// ==========================================================
// Purpose: Execute Python code in a secure sandbox, upload generated files
// to Supabase storage, and return public download URLs
// ==========================================================

import { Sandbox } from "@e2b/code-interpreter";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

// Supabase configuration for documents storage
const SUPABASE_CONFIG = {
  URL: "https://dlunpilhklsgvkegnnlp.supabase.co",
  ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsdW5waWxoa2xzZ3ZrZWdubmxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNTA0MTksImV4cCI6MjA3MDYyNjQxOX0.rhLN_bhvH9IWPkyHiohrOQbY9D34RSeSLzURhAyZPds",
  SERVICE_ROLE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsdW5waWxoa2xzZ3ZrZWdubmxwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTA1MDQxOSwiZXhwIjoyMDcwNjI2NDE5fQ.k-2OJ4p3hr9feR4ks54OQM2HhOhaVJ3pUK-20tGJwpo",
};

const supabase = createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.ANON_KEY);
const supabaseAdmin = createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.SERVICE_ROLE_KEY);

const sandboxTimeout = 5 * 60 * 1000; // 5 minutes
export const maxDuration = 60;

// Helper function to determine MIME type from file extension
function getMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'gif':
      return 'image/gif';
    case 'svg':
      return 'image/svg+xml';
    case 'pdf':
      return 'application/pdf';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'doc':
      return 'application/msword';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'xls':
      return 'application/vnd.ms-excel';
    case 'csv':
      return 'text/csv';
    case 'json':
      return 'application/json';
    case 'txt':
      return 'text/plain';
    case 'html':
      return 'text/html';
    case 'css':
      return 'text/css';
    case 'js':
      return 'application/javascript';
    case 'zip':
      return 'application/zip';
    default:
      return 'application/octet-stream';
  }
}

export async function POST(req: NextRequest) {
  try {
    // --------------------------
    // EXTRACT PYTHON CODE
    // --------------------------
    const formData = await req.formData();
    const code = formData.get("code") as string;

    if (!code) {
      return NextResponse.json(
        { error: "No Python code provided" },
        { status: 400 }
      );
    }

    // --------------------------
    // VALIDATE E2B API KEY
    // --------------------------
    if (!process.env.E2B_API_KEY) {
      return NextResponse.json(
        { error: "E2B_API_KEY environment variable not configured" },
        { status: 500 }
      );
    }

    // --------------------------
    // CREATE SANDBOX SESSION
    // --------------------------
    const sandbox = await Sandbox.create({
      apiKey: process.env.E2B_API_KEY,
      timeoutMs: sandboxTimeout,
    });

    // --------------------------
    // RUN PYTHON CODE
    // --------------------------
    // Prepend code to create pipilot directory and ensure files are saved there
    const enhancedCode = `
import os
os.makedirs('/pipilot', exist_ok=True)
os.chdir('/pipilot')
${code}
`;

    const result = await sandbox.runCode(enhancedCode);

    // --------------------------
    // LIST GENERATED FILES FROM PIPILOT DIRECTORY ONLY
    // --------------------------
    const files = await sandbox.files.list("/pipilot");

    // Filter out any system files (safety check)
    const userFiles = files.filter(file =>
      file.type === "file" &&
      !file.name.startsWith('.') &&
      !file.name.endsWith('.e2b') &&
      file.name !== 'requirements.txt' &&
      file.name !== 'Pipfile'
    );

    // --------------------------
    // UPLOAD FILES TO SUPABASE & GENERATE DOWNLOAD URLS
    // --------------------------
    const downloads: Record<string, string> = {};
    const uploadResults: Array<{fileName: string, success: boolean, url?: string, error?: string}> = [];

    for (const file of userFiles) {
      if (file.type === "file") {
        try {
          // Read file content from sandbox
          const content = await sandbox.files.read(file.path);

          // Generate unique file path for Supabase storage
          const timestamp = Date.now();
          const randomId = Math.random().toString(36).substring(2, 15);
          const fileName = `${timestamp}_${randomId}_${file.name}`;

          // Upload to Supabase documents bucket
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('documents')
            .upload(fileName, content, {
              cacheControl: '3600',
              upsert: false,
              contentType: getMimeType(file.name)
            });

          if (uploadError) {
            console.error(`Failed to upload ${file.name}:`, uploadError);
            uploadResults.push({
              fileName: file.name,
              success: false,
              error: uploadError.message
            });
            continue;
          }

          // Generate public download URL
          const { data: urlData } = supabase.storage
            .from('documents')
            .getPublicUrl(fileName);

          const publicUrl = urlData.publicUrl;

          // Record file metadata in database for cleanup tracking
          const fileMetadata = {
            file_name: fileName,
            original_name: file.name,
            bucket_name: 'documents',
            file_size: content.length,
            mime_type: getMimeType(file.name),
            public_url: publicUrl,
            uploaded_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes from now
            created_by: 'generate_report_api'
          };

          const { error: dbError } = await supabaseAdmin
            .from('temp_file_uploads')
            .insert(fileMetadata);

          if (dbError) {
            console.error(`Failed to record file metadata for ${file.name}:`, dbError);
            // Continue anyway - file is uploaded, just won't be auto-cleaned
          }

          downloads[file.name] = publicUrl;
          uploadResults.push({
            fileName: file.name,
            success: true,
            url: publicUrl
          });

          console.log(`✅ Uploaded ${file.name} to Supabase: ${publicUrl}`);

        } catch (error) {
          console.error(`Failed to process file ${file.name}:`, error);
          uploadResults.push({
            fileName: file.name,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    }

    // --------------------------
    // PROCESS MATPLOTLIB RESULTS (FALLBACK FOR plt.show())
    // --------------------------
    if (result.results && result.results.length > 0) {
      console.log(`📊 Processing ${result.results.length} Matplotlib results...`);

      for (let i = 0; i < result.results.length; i++) {
        const executionResult = result.results[i];

        if (executionResult.png) {
          try {
            // Convert base64 to buffer
            const imageBuffer = Buffer.from(executionResult.png, 'base64');

            // Generate unique filename for the chart
            const timestamp = Date.now();
            const randomId = Math.random().toString(36).substring(2, 15);
            const fileName = `${timestamp}_${randomId}_chart_${i + 1}.png`;

            // Upload to Supabase documents bucket
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('documents')
              .upload(fileName, imageBuffer, {
                cacheControl: '3600',
                upsert: false,
                contentType: 'image/png'
              });

            if (uploadError) {
              console.error(`Failed to upload Matplotlib chart ${i + 1}:`, uploadError);
              uploadResults.push({
                fileName: `chart_${i + 1}.png`,
                success: false,
                error: uploadError.message
              });
              continue;
            }

            // Generate public download URL
            const { data: urlData } = supabase.storage
              .from('documents')
              .getPublicUrl(fileName);

            const publicUrl = urlData.publicUrl;

            // Record file metadata in database for cleanup tracking
            const fileMetadata = {
              file_name: fileName,
              original_name: `chart_${i + 1}.png`,
              bucket_name: 'documents',
              file_size: imageBuffer.length,
              mime_type: 'image/png',
              public_url: publicUrl,
              uploaded_at: new Date().toISOString(),
              expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes from now
              created_by: 'generate_report_api'
            };

            const { error: dbError } = await supabaseAdmin
              .from('temp_file_uploads')
              .insert(fileMetadata);

            if (dbError) {
              console.error(`Failed to record Matplotlib chart metadata:`, dbError);
            }

            downloads[`chart_${i + 1}.png`] = publicUrl;
            uploadResults.push({
              fileName: `chart_${i + 1}.png`,
              success: true,
              url: publicUrl
            });

            console.log(`✅ Uploaded Matplotlib chart ${i + 1} to Supabase: ${publicUrl}`);

          } catch (error) {
            console.error(`Failed to process Matplotlib result ${i + 1}:`, error);
            uploadResults.push({
              fileName: `chart_${i + 1}.png`,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      }
    }

    // --------------------------
    // SCHEDULE FILE CLEANUP VIA EDGE FUNCTION
    // --------------------------
    if (Object.keys(downloads).length > 0) {
      try {
        console.log(`📅 Scheduling cleanup for ${Object.keys(downloads).length} uploaded files...`);

        // Call the edge function to schedule cleanup
        const edgeFunctionResponse = await fetch('https://dlunpilhklsgvkegnnlp.supabase.co/functions/v1/hyper-worker', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_CONFIG.SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            action: 'schedule_cleanup',
            delay_minutes: 5,
            bucket_name: 'documents'
          })
        });

        if (!edgeFunctionResponse.ok) {
          const errorText = await edgeFunctionResponse.text();
          console.error('Failed to schedule cleanup via edge function:', errorText);
        } else {
          const cleanupResult = await edgeFunctionResponse.json();
          console.log('✅ Cleanup scheduled successfully:', cleanupResult);
        }
      } catch (error) {
        console.error('Error calling cleanup edge function:', error);
        // Don't fail the entire request if cleanup scheduling fails
      }
    }

    // --------------------------
    return NextResponse.json({
      success: true,
      text: result.text,
      logs: result.logs,
      error: result.error,
      results: result.results,
      downloads, // public URLs from Supabase storage
      uploadResults, // detailed upload status for each file
    });
  } catch (error) {
    console.error("E2B Sandbox Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
