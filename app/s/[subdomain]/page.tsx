import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { domainConfig } from '@/lib/redis';

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

  // Initialize Supabase client (server-side)
  const supabase = await createClient();

  try {
    // Fetch subdomain metadata from Supabase with more robust query
    const { data: subdomainData, error: subdomainError } = await supabase
      .from('subdomain_tracking')
      .select('*')
      .eq('subdomain', params.subdomain)
      .eq('is_active', true)
      .single<SubdomainTracking>();

    console.log('[Subdomain Debug] Subdomain Tracking Query:', {
      subdomain: params.subdomain,
      queryError: subdomainError,
      queryData: subdomainData,
      queryDetails: {
        count: subdomainData ? 1 : 0,
        isActive: subdomainData?.is_active
      }
    });

    // Comprehensive error handling (following cloud sync pattern)
    if (subdomainError && subdomainError.code !== 'PGRST116') {
      console.error(`[Subdomain Error] Query failed for subdomain: ${params.subdomain}`, {
        errorCode: subdomainError.code,
        errorDetails: subdomainError.details,
        errorMessage: subdomainError.message
      });
      throw new Error(`Subdomain query failed: ${subdomainError.message}`);
    }

    // Handle no data found (PGRST116 or null data)
    if (subdomainError?.code === 'PGRST116' || !subdomainData) {
      console.warn(`[Subdomain Warning] No active subdomain found: ${params.subdomain}`);
      notFound();
    }

    // Attempt to fetch index.html
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
              Storage Path: {subdomainData.storage_path}
              Deployment URL: {subdomainData.deployment_url}
              User ID: {subdomainData.user_id}
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
        'X-Tenant-Deployment': subdomainData.deployment_url || ''
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
