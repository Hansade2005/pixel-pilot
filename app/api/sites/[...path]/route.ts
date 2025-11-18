import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase configuration for sites storage
const SUPABASE_CONFIG = {
  URL: "https://dlunpilhklsgvkegnnlp.supabase.co",
  SERVICE_ROLE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsdW5waWxoa2xzZ3ZrZWdubmxwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTA1MDQxOSwiZXhwIjoyMDcwNjI2NDE5fQ.k-2OJ4p3hr9feR4ks54OQM2HhOhaVJ3pUK-20tGJwpo",
};

// Extract subdomain from hostname for multi-tenant routing
function getSubdomain(hostname: string): string | null {
  // Remove port if present
  const host = hostname.split(':')[0];

  // For local development, treat localhost as no subdomain
  if (host === 'localhost' || host === '127.0.0.1') {
    return null;
  }

  // Split by dots and check if we have a subdomain
  const parts = host.split('.');

  // If we have more than 2 parts and it's not an IP, we have a subdomain
  // e.g., subscontrol.pipilot.dev -> ['subscontrol', 'pipilot', 'dev']
  if (parts.length > 2 && !/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    return parts[0]; // Return the first part as subdomain
  }

  return null; // No subdomain
}

function detectContentType(path: string) {
  const lower = path.toLowerCase();
  if (lower.endsWith('.html')) return 'text/html; charset=utf-8';
  if (lower.endsWith('.css')) return 'text/css; charset=utf-8';
  if (lower.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (lower.endsWith('.json')) return 'application/json; charset=utf-8';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  if (lower.endsWith('.ico')) return 'image/x-icon';
  return 'application/octet-stream';
}

// Handle multi-tenant subdomain routing for root requests
export async function GET(request: NextRequest) {
  try {
    const hostname = request.headers.get('host') || '';
    const url = new URL(request.url);
    const path = url.pathname.slice(1); // Remove leading slash

    // Extract subdomain for multi-tenant routing
    const subdomain = getSubdomain(hostname);

    if (!subdomain) {
      // No subdomain - serve main app or redirect to sites
      return NextResponse.redirect(new URL('/sites', request.url));
    }

    // Multi-tenant mode: subdomain.pipilot.dev/path -> serve from sites/subdomain/path
    const siteId = subdomain;
    const filePath = path || 'index.html';

    console.log(`[Multi-tenant] Serving ${siteId}/${filePath} for ${hostname}`);

    const supabase = createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.SERVICE_ROLE_KEY);
    const storagePath = `sites/${siteId}/${filePath}`;

    const { data, error } = await supabase.storage.from('documents').download(storagePath);

    if (error) {
      // Try index.html for SPA routing
      if (filePath !== 'index.html') {
        const fallback = await supabase.storage.from('documents').download(`sites/${siteId}/index.html`);
        if (!fallback.error) {
          const indexBuffer = await fallback.data.arrayBuffer();
          return new NextResponse(Buffer.from(indexBuffer), {
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          });
        }
      }
      return new NextResponse(`Site not found: ${siteId}`, { status: 404 });
    }

    const arrayBuffer = await data.arrayBuffer();
    const contentType = detectContentType(filePath);
    return new NextResponse(Buffer.from(arrayBuffer), {
      headers: { 'Content-Type': contentType },
    });
  } catch (e) {
    return new NextResponse(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`, { status: 500 });
  }
}