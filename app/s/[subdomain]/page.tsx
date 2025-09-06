import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { redis } from '@/lib/redis';

// Type for subdomain tracking
type SubdomainTracking = {
  name: string;
  userId: string;
  createdAt: number;
  lastActive?: number;
  deploymentUrl?: string;
  storagePath?: string;
  isActive?: boolean;
}

// Supabase client for file serving
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest, { params }: { params: { subdomain: string } }) {
  try {
    const subdomain = params.subdomain;

    // Check if subdomain exists in Redis
    const subdomainData = await redis.get(`subdomain:${subdomain}`);
    if (!subdomainData) {
      return new NextResponse('Subdomain not found', { status: 404 });
    }

    // Get the file path from the URL
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    // Remove the subdomain from the path segments
    const filePath = pathSegments.slice(1).join('/') || 'index.html';

    console.log(`[Subdomain Debug] Serving ${subdomain}/${filePath}`);

    // Try to download the file from Supabase
    const storagePath = `projects/${subdomain}/${filePath}`;
    const { data, error } = await supabase.storage.from('projects').download(storagePath);

    // If file not found and looks like SPA route, fallback to index.html
    if (error) {
      console.log(`[Subdomain Debug] File not found: ${storagePath}, trying fallback`);
      const fallback = await supabase.storage.from('projects').download(`projects/${subdomain}/index.html`);
      if (!fallback.error) {
        const indexBuffer = await fallback.data.arrayBuffer();
        return new NextResponse(Buffer.from(indexBuffer), {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'X-Subdomain': subdomain
          },
        });
      }
      return new NextResponse('Not found', { status: 404 });
    }

    const arrayBuffer = await data.arrayBuffer();
    const contentType = detectContentType(filePath);
    return new NextResponse(Buffer.from(arrayBuffer), {
      headers: {
        'Content-Type': contentType,
        'X-Subdomain': subdomain
      },
    });
  } catch (error: any) {
    console.error('[Subdomain Debug] Error:', error);
    return new NextResponse(`Error: ${error.message || 'Unknown error'}`, { status: 500 });
  }
}

function detectContentType(path: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith('.html')) return 'text/html; charset=utf-8';
  if (lower.endsWith('.css')) return 'text/css; charset=utf-8';
  if (lower.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (lower.endsWith('.json')) return 'application/json; charset=utf-8';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.woff')) return 'font/woff';
  if (lower.endsWith('.woff2')) return 'font/woff2';
  return 'application/octet-stream';
}
