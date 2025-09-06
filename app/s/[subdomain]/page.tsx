import { notFound } from 'next/navigation';
import { getSubdomainData } from '@/lib/redis';
import { domainConfig } from '@/lib/redis';
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

// Type for file serve result
type FileServeResult = {
  data: string;
  contentType: string;
  storagePath: string;
}

// Function to fetch and serve project files using REST API
async function serveProjectFile(subdomain: string, path: string[] = []): Promise<FileServeResult | null> {
  // Base URL for public Supabase storage
  const BASE_URL = 'https://lzuknbfbvpuscpammwzg.supabase.co/storage/v1/object/public/projects/';

  // Construct the full storage path
  const filePath = path.length > 0 ? path.join('/') : 'index.html';
  
  // Possible storage paths to try
  const storagePaths = [
    `projects/${subdomain}/dist/${filePath}`
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
          const modifiedHtml = data.replace(
            /(?:href|src)=["'](?!https?:\/\/)(\/[^"']*)/gi,
            (match, path) => `${match.split('=')[0]}="https://${subdomain}.pipilot.dev${path}`
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
}

export default async function SubdomainPage({
  params
}: {
  params: { subdomain: string, slug?: string[] };
}) {
  // Fetch subdomain metadata from Redis
  const subdomainData = await getSubdomainData(params.subdomain);

  // Handle no data found
  if (!subdomainData) {
    console.warn(`[Subdomain Warning] No subdomain found: ${params.subdomain}`);
    notFound();
  }

  // Ensure subdomain data is a plain object
  const plainSubdomainData = JSON.parse(JSON.stringify(subdomainData));

  // If slug is provided, attempt to serve specific file
  if (params.slug) {
    const fileServeResult = await serveProjectFile(params.subdomain, params.slug);
    
    if (fileServeResult) {
      // Ensure file serve result is a plain object
      const plainFileServeResult = JSON.parse(JSON.stringify(fileServeResult));
      
      return new NextResponse(plainFileServeResult.data, {
        headers: { 
          'Content-Type': plainFileServeResult.contentType,
          'X-Subdomain-Path': plainFileServeResult.storagePath
        }
      });
    }
  }

  // Attempt to serve index.html
  const indexFileResult = await serveProjectFile(params.subdomain);

  if (indexFileResult) {
    // Ensure index file result is a plain object
    const plainIndexFileResult = JSON.parse(JSON.stringify(indexFileResult));
    
    return new NextResponse(plainIndexFileResult.data, {
      headers: {
        'Content-Type': plainIndexFileResult.contentType,
        'X-Subdomain': params.subdomain,
        'X-Tenant-Deployment': `https://${params.subdomain}.${domainConfig.rootDomain}`
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
          Deployment URL: https://${params.subdomain}.${domainConfig.rootDomain}
        </pre>
      </body>
    </html>
  `, {
    status: 404,
    headers: { 'Content-Type': 'text/html' }
  });
}
