import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import { domainConfig, redis } from '@/lib/redis';

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

export default async function SubdomainPage({
  params
}: {
  params: { subdomain: string };
}) {
  console.log(`[Subdomain Debug] Attempting to serve subdomain: ${params.subdomain}`);

  // Fetch subdomain metadata from Redis
  let subdomainData: SubdomainTracking | null = null;
  try {
    const redisData = await redis.get(`subdomain:${params.subdomain}`);
    console.log('[Redis Debug] Raw Redis data:', redisData, typeof redisData);

    if (redisData) {
      // Handle different data formats from Redis
      if (typeof redisData === 'string') {
        // Check if it's the string representation of an object
        if (redisData === '[object Object]') {
          console.log('[Redis Debug] Data is [object Object] - clearing corrupted data');
          // Clear the corrupted data
          await redis.del(`subdomain:${params.subdomain}`);
          subdomainData = null;
        } else {
          try {
            subdomainData = JSON.parse(redisData);
          } catch (parseError) {
            console.error('[Redis Debug] JSON parse error:', parseError);
            // Clear corrupted data
            await redis.del(`subdomain:${params.subdomain}`);
            subdomainData = null;
          }
        }
      } else if (typeof redisData === 'object' && redisData !== null) {
        // Redis returned the object directly - ensure it's a plain object
        const data = redisData as any;
        subdomainData = {
          name: data.name,
          userId: data.userId,
          createdAt: data.createdAt,
          lastActive: data.lastActive,
          deploymentUrl: data.deploymentUrl,
          storagePath: data.storagePath,
          isActive: data.isActive
        };
      }
    }
  } catch (error) {
    console.error('[Subdomain Debug] Redis fetch error:', error);
  }

  console.log('[Subdomain Debug] Subdomain Tracking Query:', {
    subdomain: params.subdomain,
    error: subdomainData ? null : 'Subdomain not found',
    data: subdomainData
  });

  // Handle non-existent subdomain
  if (!subdomainData) {
    console.error(`[Subdomain Debug] Subdomain not found: ${params.subdomain}`);
    notFound();
  }

  // Attempt to fetch index.html
  // Supabase bucket URL structure:
  // https://lzuknbfbvpuscpammwzg.supabase.co/storage/v1/object/public/projects/projects/{subdomain}/dist/index.html
  // https://lzuknbfbvpuscpammwzg.supabase.co/storage/v1/object/public/projects/projects/{subdomain}/index.html
  const indexPaths = [
    `projects/${params.subdomain}/dist/index.html`,
    `projects/${params.subdomain}/index.html`
  ];

  let indexHtml = '';
  let contentType = 'text/html; charset=utf-8';

  // List all files in the projects directory for debugging
  try {
    const { data: fileList, error: listError } = await supabase.storage
      .from('projects')
      .list(`${params.subdomain}`, { 
        limit: 100, 
        offset: 0, 
        sortBy: { column: 'name', order: 'asc' } 
      });

    console.log('[Subdomain Debug] Files in project storage:', {
      subdomain: params.subdomain,
      error: listError,
      files: fileList?.map(file => file.name)
    });

    // If dist directory exists, list its contents
    const hasDist = fileList?.some(file => file.name === 'dist');
    if (hasDist) {
      const { data: distFileList, error: distListError } = await supabase.storage
        .from('projects')
        .list(`${params.subdomain}/dist`, { 
          limit: 100, 
          offset: 0, 
          sortBy: { column: 'name', order: 'asc' } 
        });

      console.log('[Subdomain Debug] Files in dist directory:', {
        subdomain: params.subdomain,
        error: distListError,
        files: distFileList?.map(file => file.name)
      });
    }
  } catch (listError) {
    console.error('[Subdomain Debug] Error listing project files:', listError);
  }

  for (const path of indexPaths) {
    try {
      console.log(`[Subdomain Debug] Attempting to download: ${path}`);
      const { data, error } = await supabase.storage
        .from('projects')
        .download(path);

      console.log(`[Subdomain Debug] Download result for ${path}:`, {
        error,
        dataAvailable: !!data
      });

      if (!error && data) {
        indexHtml = await data.text();
        contentType = 'text/html; charset=utf-8';
        console.log(`[Subdomain Debug] Successfully downloaded index.html from ${path}`);
        break;
      }
    } catch (downloadError) {
      console.error(`[Subdomain Debug] Error downloading ${path}:`, downloadError);
    }
  }

  // If no index.html found, return a fallback HTML page
  if (!indexHtml) {
    console.error(`[Subdomain Debug] No index.html found for subdomain: ${params.subdomain}`);
    const fallbackHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${params.subdomain}.${domainConfig.rootDomain}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(to bottom, #eff6ff, #ffffff);
        }
        .container {
            text-align: center;
            padding: 2rem;
        }
        h1 {
            font-size: 2.25rem;
            font-weight: bold;
            color: #111827;
            margin-bottom: 0.75rem;
        }
        p {
            font-size: 1.125rem;
            color: #6b7280;
            margin-bottom: 1rem;
        }
        pre {
            background: #fee2e2;
            color: #dc2626;
            padding: 1rem;
            border-radius: 0.375rem;
            font-size: 0.875rem;
            text-align: left;
            max-width: 400px;
            margin: 0 auto;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>${params.subdomain}.${domainConfig.rootDomain}</h1>
        <p>No application files found</p>
        <pre>
Debug Info:
Subdomain: ${params.subdomain}
Storage Path: ${subdomainData.storagePath || `projects/${params.subdomain}`}
        </pre>
    </div>
</body>
</html>`;

    return new Response(fallbackHtml, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Subdomain': params.subdomain,
        'X-Tenant-Deployment': subdomainData.deploymentUrl || ''
      }
    });
  }

  // Modify HTML to work with subdomain
  const modifiedHtml = indexHtml.replace(
    /<head>/i, 
    `<head>
      <base href="https://${params.subdomain}.${domainConfig.rootDomain}/" />
      <script>
        // Ensure all relative paths are resolved correctly
        (function() {
          const originalFetch = window.fetch;
          window.fetch = function(url, options) {
            if (typeof url === 'string' && !url.startsWith('http')) {
              url = new URL(url, window.location.href).href;
            }
            return originalFetch(url, options);
          };
        })();
      </script>`
  );

  // Return the modified HTML directly
  return new Response(modifiedHtml, {
    headers: {
      'Content-Type': contentType,
      'X-Subdomain': params.subdomain,
      'X-Tenant-Deployment': subdomainData.deploymentUrl || ''
    }
  });
}
