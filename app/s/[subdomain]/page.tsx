import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { domainConfig, redis, SubdomainData } from '@/lib/redis';
import { cache } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

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

// Type for project assets cache
type ProjectAssets = {
  indexHtml: string;
  assets: {
    [path: string]: string | ArrayBuffer;
  };
}

// Cached function to fetch and serve project files using REST API
const serveProjectFile = cache(async (subdomain: string, path: string[] = []) => {
  const supabase = await createClient();
  
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

  // Base URL for public Supabase storage
  const baseUrl = 'https://lzuknbfbvpuscpammwzg.supabase.co/storage/v1/object/public/projects/';

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

// Cached function to fetch and store all project assets
const fetchProjectAssets = cache(async (subdomain: string): Promise<ProjectAssets> => {
  const supabase = await createClient();
  const assets: ProjectAssets = {
    indexHtml: '',
    assets: {}
  };

  // Base URL for public Supabase storage
  const baseUrl = 'https://lzuknbfbvpuscpammwzg.supabase.co/storage/v1/object/public/projects/';

  try {
    // Possible paths to check for project files
    const projectPaths = [
      `sample/dist`,     // Exact path from screenshot
      `${subdomain}/dist`,
      `${subdomain}`
    ];

    for (const projectPath of projectPaths) {
      try {
        // List files in the project directory using REST API
        const { data: fileList, error: listError } = await supabase.storage
          .from('projects')
          .list(projectPath, {
            limit: 1000,
            offset: 0,
            sortBy: { column: 'name', order: 'asc' }
          });

        if (listError) {
          console.error(`[Subdomain Asset Cache] Failed to list files in ${projectPath}:`, listError);
          continue;
        }

        // Attempt to download index.html
        const indexPaths = [
          `${projectPath}/index.html`,
          `${projectPath}/index.htm`
        ];

        for (const path of indexPaths) {
          const publicUrl = `${baseUrl}${path}`;
          
          try {
            const response = await fetch(publicUrl);
            
            if (response.ok) {
              assets.indexHtml = await response.text();
              console.log(`[Subdomain Asset Cache] Successfully downloaded index.html from ${path}`);
              break;
            }
          } catch (downloadError) {
            console.error(`[Subdomain Asset Cache] Error downloading ${path}:`, downloadError);
          }
        }

        // If index.html found, download other assets
        if (assets.indexHtml && fileList?.length) {
          const assetDownloadPromises = fileList
            .filter(file => 
              // Exclude directories and index.html files
              !file.name.endsWith('/') && 
              !file.name.includes('index.html')
            )
            .map(async (file) => {
              const fullPath = `${projectPath}/${file.name}`;
              
              try {
                const publicUrl = `${baseUrl}${fullPath}`;
                const response = await fetch(publicUrl);
                
                if (response.ok) {
                  // Convert to ArrayBuffer for caching
                  const buffer = await response.arrayBuffer();
                  assets.assets[file.name] = buffer;
                  console.log(`[Subdomain Asset Cache] Cached asset: ${file.name}`);
                }
              } catch (assetError) {
                console.error(`[Subdomain Asset Cache] Error downloading asset ${fullPath}:`, assetError);
              }
            });

          await Promise.allSettled(assetDownloadPromises);
          break;  // Stop searching after finding files in a path
        }
      } catch (pathError) {
        console.error(`[Subdomain Asset Cache] Error processing path ${projectPath}:`, pathError);
      }
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
        return new Response(Buffer.from(fileServeResult.data), {
          headers: { 'Content-Type': fileServeResult.contentType }
        });
      }
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
              Storage Path: {`projects/${params.subdomain}/dist`}
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
