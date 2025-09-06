import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { domainConfig, redis, SubdomainData } from '@/lib/redis';
import { cache } from 'react';
import { NextResponse } from 'next/server';

// Utility function to detect content type
function detectContentType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase()
  const typeMap: Record<string, string> = {
    'html': 'text/html; charset=utf-8',
    'css': 'text/css; charset=utf-8',
    'js': 'application/javascript; charset=utf-8',
    'json': 'application/json; charset=utf-8',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'svg': 'image/svg+xml',
    'webp': 'image/webp',
    'woff': 'font/woff',
    'woff2': 'font/woff2',
    'ttf': 'font/ttf'
  }
  return typeMap[ext || ''] || 'application/octet-stream'
}

// Cached function to fetch and serve project files using REST API
const serveProjectFile = cache(async (subdomain: string, path: string[] = []) => {
  // Base URL for public Supabase storage
  const BASE_URL = 'https://lzuknbfbvpuscpammwzg.supabase.co/storage/v1/object/public/projects/';

  // Construct the full storage path
  const filePath = path.length > 0 ? path.join('/') : 'index.html';
  
  // Possible storage paths to try
  const storagePaths = [
    `projects/projects/${subdomain}/dist/${filePath}`,  // Nested project path
    `projects/${subdomain}/dist/${filePath}`,           // Alternative nested path
    `projects/sample/dist/${filePath}`,                 // Nested sample project
    `${subdomain}/dist/${filePath}`,                    // Fallback non-nested paths
    `sample/dist/${filePath}`
  ];

  for (const storagePath of storagePaths) {
    try {
      const publicUrl = `${BASE_URL}${storagePath}`;
      
      console.log(`[Subdomain File Serve] Attempting to fetch: ${publicUrl}`);
      
      const response = await fetch(publicUrl, {
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });
      
      if (response.ok) {
        const contentType = detectContentType(storagePath);
        let data = await response.text();
        
        // Special handling for HTML files to ensure proper rendering
        if (contentType.includes('text/html')) {
          // Modify asset paths to work with subdomain
          const modifiedHtml = data.replace(
            /(?:href|src)=["'](?!https?:\/\/)(\/[^"']*)/gi, 
            (match, path) => `${match.split('=')[0]}="https://${subdomain}.pipilot.dev${path}"`
          ).replace(
            /<head>/i, 
            `<head>
              <base href="https://${subdomain}.pipilot.dev/" />
              <script>
                console.log('Subdomain script initialized for ${subdomain}');
                console.log('Loaded from path: ${storagePath}');
              </script>`
          );

          return {
            data: modifiedHtml,
            contentType: 'text/html; charset=utf-8',
            storagePath
          };
        }

        // For non-HTML files, return as-is
        return {
          data,
          contentType: detectContentType(storagePath),
          storagePath
        };
      }
    } catch (fetchError) {
      console.error(`[Subdomain File Serve] Error fetching ${storagePath}:`, fetchError);
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
        return new NextResponse(fileServeResult.data, {
          headers: { 
            'Content-Type': fileServeResult.contentType,
            'X-Subdomain-Path': fileServeResult.storagePath
          }
        });
      }
    }

    // Attempt to serve index.html
    const indexFileResult = await serveProjectFile(params.subdomain);

    if (indexFileResult) {
      return new NextResponse(indexFileResult.data, {
        headers: {
          'Content-Type': indexFileResult.contentType,
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
