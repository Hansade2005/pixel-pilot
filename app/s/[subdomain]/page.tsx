import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { domainConfig, redis, subdomainUtils } from '@/lib/redis';
import { redirect } from 'next/navigation';

export default async function SubdomainPage({
  params
}: {
  params: { subdomain: string };
}) {
  console.log(`[Subdomain Page] Redirecting subdomain: ${params.subdomain}`);

  try {
    // Fetch subdomain metadata from Redis using the utility method
    // This ensures we get a properly parsed plain object
    const subdomainData = await subdomainUtils.get(params.subdomain);

    console.log('[Subdomain Page] Redis Subdomain Query:', {
      subdomain: params.subdomain,
      redisData: subdomainData,
      dataExists: !!subdomainData
    });

    // Handle no data found
    if (!subdomainData) {
      console.warn(`[Subdomain Page] No subdomain found in Redis: ${params.subdomain}`);
      notFound();
    }

    // Redirect to the API route which will handle file serving
    redirect(`/api/subdomain`);
  } catch (error) {
    console.error('[Subdomain Page Error]:', error);
    notFound();
  }
}

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
}
