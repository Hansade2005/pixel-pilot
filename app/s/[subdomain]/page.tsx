import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { domainConfig, redis, SubdomainData } from '@/lib/redis';
import { cache } from 'react';

// Type for project assets cache
type ProjectAssets = {
  indexHtml: string;
  assets: {
    [path: string]: string | ArrayBuffer;
  };
}

// Cached function to fetch and store all project assets
const fetchProjectAssets = cache(async (subdomain: string): Promise<ProjectAssets> => {
  const supabase = await createClient();
  const assets: ProjectAssets = {
    indexHtml: '',
    assets: {}
  };

  try {
    // Specific path for project files
    const projectPath = `${subdomain}/dist`;

    // List all files in the project dist directory
    const { data: fileList, error: listError } = await supabase.storage
      .from('projects')
      .list(projectPath, {
        limit: 1000,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' }
      });

    if (listError) {
      console.error('[Subdomain Asset Cache] Failed to list project files:', listError);
      return assets;
    }

    // Attempt to download index.html
    const indexPaths = [
      `${projectPath}/index.html`,
      `${projectPath}/index.htm`
    ];

    for (const path of indexPaths) {
      try {
        const { data, error } = await supabase.storage
          .from('projects')
          .download(path);

        if (!error && data) {
          assets.indexHtml = await data.text();
          console.log(`[Subdomain Asset Cache] Successfully downloaded index.html from ${path}`);
          break;
        }
      } catch (downloadError) {
        console.error(`[Subdomain Asset Cache] Error downloading ${path}:`, downloadError);
      }
    }

    // Download all other assets in the dist directory
    if (fileList?.length) {
      const assetDownloadPromises = fileList
        .filter(file => 
          // Exclude directories and index.html files
          !file.name.endsWith('/') && 
          !file.name.includes('index.html')
        )
        .map(async (file) => {
          const fullPath = `${projectPath}/${file.name}`;
          try {
            const { data, error } = await supabase.storage
              .from('projects')
              .download(fullPath);

            if (!error && data) {
              // Convert to ArrayBuffer for caching
              const buffer = await data.arrayBuffer();
              assets.assets[file.name] = buffer;
              console.log(`[Subdomain Asset Cache] Cached asset: ${file.name}`);
            }
          } catch (assetError) {
            console.error(`[Subdomain Asset Cache] Error downloading asset ${fullPath}:`, assetError);
          }
        });

      await Promise.allSettled(assetDownloadPromises);
    }

    // Log detailed asset information
    console.log('[Subdomain Asset Cache] Asset Summary:', {
      indexHtmlFound: !!assets.indexHtml,
      assetCount: Object.keys(assets.assets).length,
      assets: Object.keys(assets.assets)
    });

    return assets;
  } catch (error) {
    console.error('[Subdomain Asset Cache] Unexpected error:', error);
    return assets;
  }
});

export default async function SubdomainPage({
  params
}: {
  params: { subdomain: string };
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

    // Fetch and cache all project assets
    const projectAssets = await fetchProjectAssets(params.subdomain);

    // If no index.html found, return a detailed fallback
    if (!projectAssets.indexHtml) {
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
              Storage Path: {`projects/${params.subdomain}`}
              Deployment URL: {subdomainData.deploymentUrl || `https://${params.subdomain}.${domainConfig.rootDomain}`}
              User ID: {subdomainData.userId || 'N/A'}
            </pre>
          </div>
        </div>
      );
    }

    // Modify HTML to work with subdomain and inject asset loading script
    const modifiedHtml = projectAssets.indexHtml.replace(
      /<head>/i, 
      `<head>
        <base href="https://${params.subdomain}.${domainConfig.rootDomain}/" />
        <script>
          // Asset caching mechanism
          (function() {
            const cachedAssets = ${JSON.stringify(Object.keys(projectAssets.assets))};
            const cachedAssetsData = ${JSON.stringify(
              Object.fromEntries(
                Object.entries(projectAssets.assets).map(([key, value]) => 
                  [key, Array.from(new Uint8Array(value as ArrayBuffer))]
                )
              )
            )};
            
            function findMatchingAsset(url) {
              return cachedAssets.find(key => 
                url.toString().endsWith(key) || 
                url.toString().includes(key)
              );
            }

            // Override fetch to use cached assets when available
            const originalFetch = window.fetch;
            window.fetch = function(url, options) {
              const matchedAssetKey = findMatchingAsset(url);

              if (matchedAssetKey) {
                console.log('Serving cached asset:', matchedAssetKey);
                return Promise.resolve(new Response(
                  new Blob([new Uint8Array(cachedAssetsData[matchedAssetKey])], 
                  { type: 'application/octet-stream' })
                ));
              }

              // Fallback to original fetch for non-cached resources
              return originalFetch(url, options);
            };
          })();
        </script>`
    );

    // Return the modified HTML directly
    return new Response(modifiedHtml, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Subdomain': params.subdomain,
        'X-Tenant-Deployment': subdomainData.deploymentUrl || ''
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
