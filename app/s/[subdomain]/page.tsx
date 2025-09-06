import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { domainConfig, redis, SubdomainData } from '@/lib/redis';
import { cache } from 'react';
import { NextResponse } from 'next/server';

// Utility function to detect content type
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
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.ico')) return 'image/x-icon';
  return 'application/octet-stream';
}

// Cached function to fetch and serve project files using REST API
const serveProjectFile = cache(async (subdomain: string, path: string[] = []) => {
  // Base URL for public Supabase storage
  const baseUrl = 'https://lzuknbfbvpuscpammwzg.supabase.co/storage/v1/object/public/projects/';

  // Construct the full storage path
  const joinedPath = path.length > 0 ? path.join('/') : 'index.html';
  const possiblePaths = [
    `sample/dist/${joinedPath}`,       // Exact path from screenshot
    `${subdomain}/dist/${joinedPath}`, // Fallback to subdomain-specific path
    `${subdomain}/${joinedPath}`,      // Root directory fallback
    `sample/dist/index.html`,          // Hardcoded index.html fallback
    `${subdomain}/dist/index.html`,    // Subdomain-specific index.html fallback
    `${subdomain}/index.html`          // Final root index.html fallback
  ];

  for (const storagePath of possiblePaths) {
    try {
      console.log(`[Subdomain File Serve] Attempting to download: ${storagePath}`);
      
      // Construct the full public URL for the file
      const publicUrl = `${baseUrl}${storagePath}`;
      
      // Fetch the file using the public URL
      const response = await fetch(publicUrl);
      
      if (!response.ok) {
        console.warn(`[Subdomain File Serve] Failed to fetch ${storagePath}:`, {
          status: response.status,
          statusText: response.statusText
        });
        continue;
      }

      // Convert response to ArrayBuffer
      const data = await response.arrayBuffer();
      
      console.log(`[Subdomain File Serve] Successfully downloaded: ${storagePath}`);
      return {
        data,
        contentType: detectContentType(storagePath)
      };
    } catch (error) {
      console.error(`[Subdomain File Serve] Unexpected error downloading ${storagePath}:`, error);
    }
  }

  console.error(`[Subdomain File Serve] No file found for subdomain: ${subdomain}`);
  return null;
});

export default async function SubdomainPage({
  params
}: {
  params: { subdomain: string, slug?: string[] };
}) {
  console.log(`[Subdomain Debug] Attempting to serve subdomain: ${params.subdomain}`);

  try {
    // Fetch subdomain metadata from Redis
    const subdomainData = await redis.get(`subdomain:${params.subdomain}`) as SubdomainData;

    console.log('[Subdomain Debug] Redis Subdomain Query:', {
      subdomain: params.subdomain,
      redisData: subdomainData,
      dataExists: !!subdomainData
    });

    // Handle no data found
    if (!subdomainData) {
      console.warn(`[Subdomain Warning] No subdomain found in Redis: ${params.subdomain}`);
      notFound();
    }

    // If slug is provided, attempt to serve specific file
    if (params.slug) {
      const fileServeResult = await serveProjectFile(params.subdomain, params.slug);
      
      if (fileServeResult) {
        return new NextResponse(Buffer.from(fileServeResult.data), {
          headers: { 'Content-Type': fileServeResult.contentType }
        });
      }
    }

    // Attempt to serve index.html
    const indexFileResult = await serveProjectFile(params.subdomain);

    if (indexFileResult) {
      // Modify HTML to work with subdomain
      let indexHtml = Buffer.from(indexFileResult.data).toString('utf-8');
      const modifiedHtml = indexHtml.replace(
        /<head>/i, 
        `<head>
          <base href="https://${params.subdomain}.${domainConfig.rootDomain}/" />
          <script>
            // Asset caching mechanism
            (function() {
              console.log('Subdomain script initialized for ${params.subdomain}');
            })();
          </script>`
      );

      return new NextResponse(modifiedHtml, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'X-Subdomain': params.subdomain,
          'X-Tenant-Deployment': subdomainData.deploymentUrl || ''
        }
      });
    }

    // If no index.html found, return a detailed fallback
    console.error(`[Subdomain Debug] No index.html found for subdomain: ${params.subdomain}`);
    return new NextResponse(`
      <html>
        <body>
          <h1>Subdomain Not Found</h1>
          <p>The requested subdomain could not be located.</p>
          <pre>
            Subdomain: ${params.subdomain}
            Storage Path: projects/${params.subdomain}
            Deployment URL: ${subdomainData.deploymentUrl || 'N/A'}
          </pre>
        </body>
      </html>
    `, {
      status: 404,
      headers: { 'Content-Type': 'text/html' }
    });

  } catch (error) {
    console.error('[Subdomain Critical Error]:', error);

    // Fallback error handling
    return new NextResponse(`
      <html>
        <body>
          <h1>Subdomain Error</h1>
          <p>An unexpected error occurred while serving the subdomain.</p>
          <pre>${error instanceof Error ? error.message : 'Unknown error'}</pre>
        </body>
      </html>
    `, {
      status: 500,
      headers: { 'Content-Type': 'text/html' }
    });
  }
}
