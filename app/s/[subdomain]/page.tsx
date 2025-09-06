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
    if (redisData) {
      subdomainData = JSON.parse(redisData as string);
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

  // If no index.html found, return a fallback
  if (!indexHtml) {
    console.error(`[Subdomain Debug] No index.html found for subdomain: ${params.subdomain}`);
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white p-4">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">
            {params.subdomain}.{domainConfig.rootDomain}
          </h1>
          <p className="mt-3 text-lg text-gray-600">
            No application files found
          </p>
          <pre className="mt-4 text-sm text-red-600">
            Debug Info:
            Subdomain: {params.subdomain}
            Storage Path: {subdomainData.storagePath || `projects/${params.subdomain}`}
          </pre>
        </div>
      </div>
    );
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
