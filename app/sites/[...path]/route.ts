import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase configuration for sites storage
const SUPABASE_CONFIG = {
  URL: "https://dlunpilhklsgvkegnnlp.supabase.co",
  SERVICE_ROLE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsdW5waWxoa2xzZ3ZrZWdubmxwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTA1MDQxOSwiZXhwIjoyMDcwNjI2NDE5fQ.k-2OJ4p3hr9feR4ks54OQM2HhOhaVJ3pUK-20tGJwpo",
};

// Serves files from Supabase Storage bucket "sites" with SPA fallback
export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    const path = params.path || [];
    if (path.length === 0) {
      return new NextResponse('Site ID required', { status: 400 });
    }

    const siteId = path[0];
    const filePath = path.slice(1);
    const joinedPath = filePath.length > 0 ? filePath.join('/') : 'index.html';

    const supabase = createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.SERVICE_ROLE_KEY);

    const storagePath = `sites/${siteId}/${joinedPath}`;
    const { data, error } = await supabase.storage.from('documents').download(storagePath);

    // If file not found and looks like SPA route, fallback to index.html
    if (error) {
      const fallback = await supabase.storage.from('documents').download(`sites/${siteId}/index.html`);
      if (!fallback.error) {
        const indexBuffer = await fallback.data.arrayBuffer();
        return new NextResponse(Buffer.from(indexBuffer), {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }
      return new NextResponse('Not found', { status: 404 });
    }

    const arrayBuffer = await data.arrayBuffer();
    const contentType = detectContentType(joinedPath);
    return new NextResponse(Buffer.from(arrayBuffer), {
      headers: { 'Content-Type': contentType },
    });
  } catch (e) {
    return new NextResponse(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`, { status: 500 });
  }
}

function detectContentType(path: string) {
  const lower = path.toLowerCase();
  if (lower.endsWith('.html')) return 'text/html; charset=utf-8';
  if (lower.endsWith('.css')) return 'text/css; charset=utf-8';
  if (lower.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (lower.endsWith('.json')) return 'application/json; charset=utf-8';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'application/octet-stream';
}