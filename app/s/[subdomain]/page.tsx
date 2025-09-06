import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { domainConfig, redis, SubdomainData } from '@/lib/redis';

// Type for subdomain tracking with optional emoji
type SubdomainTracking = {
  id: string;
  subdomain: string;
  user_id: string;
  workspace_id: string;
  deployment_url: string;
  storage_path: string;
  is_active: boolean;
  emoji?: string;
}

export default async function SubdomainPage({
  params
}: {
  params: { subdomain: string };
}) {
  console.log(`[Subdomain Debug] Attempting to serve subdomain: ${params.subdomain}`);

  try {
    // Fetch subdomain metadata from Redis (faster than Supabase)
    const subdomainDataStr = await redis.get(`subdomain:${params.subdomain}`);

    console.log('[Subdomain Debug] Redis Subdomain Query:', {
      subdomain: params.subdomain,
      redisData: subdomainDataStr,
      dataExists: !!subdomainDataStr
    });

    // Handle no data found
    if (!subdomainDataStr) {
      console.warn(`[Subdomain Warning] No subdomain found in Redis: ${params.subdomain}`);
      notFound();
    }

    // Parse Redis data
    let subdomainData: SubdomainData;
    try {
      subdomainData = JSON.parse(subdomainDataStr as string);
    } catch (parseError) {
      console.error(`[Subdomain Error] Failed to parse Redis data for subdomain: ${params.subdomain}`, parseError);
      notFound();
    }

    // Convert Redis format to SubdomainTracking format for compatibility
    const trackingData: SubdomainTracking = {
      id: `${subdomainData.userId}-${params.subdomain}`,
      subdomain: subdomainData.name,
      user_id: subdomainData.userId || '',
      workspace_id: subdomainData.userId || '',
      deployment_url: subdomainData.deploymentUrl || `https://${params.subdomain}.${domainConfig.rootDomain}`,
      storage_path: `projects/${params.subdomain}`,
      is_active: true
    };

    // Attempt to fetch index.html
    const indexPaths = [
      `projects/${params.subdomain}/dist/index.html`,
      `projects/${params.subdomain}/index.html`
    ];

    let indexHtml = '';
    let contentType = 'text/html; charset=utf-8';

    // List all files in the projects directory for debugging
    // Note: We still need Supabase client for file operations
    const supabase = await createClient();

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
        listError,
        files: fileList?.map(file => file.name),
        fileCount: fileList?.length || 0
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
          distListError,
          files: distFileList?.map(file => file.name),
          fileCount: distFileList?.length || 0
        });
      }
    } catch (listError) {
      console.error('[Subdomain Debug] Error listing project files:', listError);
    }

    // Attempt to download index.html
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

    // If no index.html found, return a detailed fallback
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
              Storage Path: {trackingData.storage_path}
              Deployment URL: {trackingData.deployment_url}
              User ID: {trackingData.user_id}
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
        'X-Tenant-Deployment': trackingData.deployment_url || ''
      }
    });
  } catch (error) {
    console.error('[Subdomain Critical Error]:', error);

    // Fallback error handling
    return new Response(`
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
