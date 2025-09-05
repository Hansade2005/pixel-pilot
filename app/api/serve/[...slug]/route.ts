import { NextRequest, NextResponse } from 'next/server'
import { supabaseStorage } from '@/lib/supabase-storage'
import { createClient } from '@/lib/supabase/server'

/**
 * Handle wildcard subdomain requests and serve files from Supabase Storage
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string[] } }
) {
  try {
    // Handle test requests for debugging
    if (params.slug && params.slug[0] === 'test') {
      const host = req.headers.get('host') || ''
      const subdomain = getSubdomainFromHost(host)

      return new NextResponse(JSON.stringify({
        message: 'Wildcard routing test',
        host,
        subdomain,
        params,
        timestamp: new Date().toISOString()
      }), {
        headers: {
          'Content-Type': 'application/json',
        },
      })
    }

    // Get the subdomain from the request
    const host = req.headers.get('host') || ''
    const subdomain = getSubdomainFromHost(host)

    if (!subdomain) {
      return new NextResponse('Invalid subdomain', { status: 400 })
    }

    // Get the requested file path
    const slug = params.slug || []
    
    // Handle circular reference case where slug is ['api', 'serve']
    let filePath = 'index.html'
    if (slug.length > 0) {
      if (slug[0] === 'api' && slug[1] === 'serve') {
        // This is a circular reference, treat as root request
        filePath = 'index.html'
      } else {
        filePath = slug.join('/')
      }
    }

    console.log(`Serving ${filePath} for subdomain ${subdomain}`)
    console.log(`Slug array:`, slug)
    console.log(`Request URL:`, req.url)

    // Check if the subdomain exists in our Supabase tracking
    const supabase = await createClient()
    const { data: subdomainInfo, error } = await supabase
      .rpc('get_subdomain_info', { subdomain_param: subdomain })

    console.log(`Subdomain lookup result:`, { error, dataLength: subdomainInfo?.length, subdomainInfo })

    if (error) {
      console.error('Database error:', error)
      return new NextResponse(`Database error: ${error.message}`, { status: 500 })
    }

    if (!subdomainInfo || subdomainInfo.length === 0) {
      console.log(`Subdomain ${subdomain} not found in tracking`)
      return new NextResponse(`Subdomain ${subdomain} not found. Please redeploy to create tracking record.`, { status: 404 })
    }

    const deployment = subdomainInfo[0]

    // Construct the file path in Supabase Storage
    // Vite builds create a dist/ folder, so we need to check both locations
    let storagePath = `projects/${subdomain}/${filePath}`
    
    // If filePath is index.html and we're looking for the root, try dist/ folder first
    if (filePath === 'index.html') {
      storagePath = `projects/${subdomain}/dist/${filePath}`
    }

    // Try to get the file from Supabase Storage
    try {
      const fileBuffer = await supabaseStorage.downloadFile('projects', storagePath)

      // Get content type based on file extension
      const contentType = getContentType(filePath)

      // Return the file with appropriate headers
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
          'Access-Control-Allow-Origin': '*',
        },
      })

    } catch (fileError) {
      // If file not found in dist/, try root level
      if (storagePath.includes('/dist/')) {
        try {
          const rootPath = storagePath.replace('/dist/', '/')
          console.log(`Trying root path: ${rootPath}`)
          const fileBuffer = await supabaseStorage.downloadFile('projects', rootPath)
          
          const contentType = getContentType(filePath)
          return new NextResponse(fileBuffer, {
            headers: {
              'Content-Type': contentType,
              'Cache-Control': 'public, max-age=31536000',
              'Access-Control-Allow-Origin': '*',
            },
          })
        } catch (rootError) {
          console.log(`File not found in root either: ${storagePath.replace('/dist/', '/')}`)
        }
      }
      console.error(`File not found: ${storagePath}`, fileError)

      // Try to find an index file with different common names
      const possibleIndexFiles = ['index.html', 'index.htm', 'app.html', 'main.html']
      const possiblePaths = ['dist/', ''] // Try dist/ folder first, then root
      
      for (const pathPrefix of possiblePaths) {
        for (const indexFile of possibleIndexFiles) {
          const indexPath = `projects/${subdomain}/${pathPrefix}${indexFile}`
          try {
            console.log(`Trying fallback file: ${indexPath}`)
            const indexBuffer = await supabaseStorage.downloadFile('projects', indexPath)

            return new NextResponse(indexBuffer, {
              headers: {
                'Content-Type': 'text/html',
                'Cache-Control': 'public, max-age=31536000',
                'Access-Control-Allow-Origin': '*',
              },
            })
          } catch (indexError) {
            console.log(`Fallback file ${indexPath} not found`)
            // Continue to next possible file
          }
        }
      }

      // If no index file found, create a basic HTML page as final fallback
      console.log(`No index file found. Creating basic HTML fallback for subdomain: ${subdomain}`)
      
      const fallbackHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subdomain} - PiPilot</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0; padding: 40px; background: #f8fafc; color: #334155;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            min-height: 100vh; text-align: center;
        }
        .container { max-width: 600px; }
        h1 { color: #1e293b; margin-bottom: 16px; }
        p { color: #64748b; line-height: 1.6; margin-bottom: 24px; }
        .status { 
            background: #fef3c7; border: 1px solid #f59e0b; color: #92400e;
            padding: 12px 24px; border-radius: 8px; margin: 20px 0;
        }
        .logo { font-weight: bold; color: #8b5cf6; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Welcome to <span class="logo">${subdomain}.pipilot.dev</span></h1>
        <div class="status">
            <strong>Deployment Status:</strong> Files are being processed. Please check back in a few moments.
        </div>
        <p>This subdomain is managed by <strong>PiPilot</strong> - your AI-powered development platform.</p>
        <p>If you're the owner of this subdomain, please ensure your deployment completed successfully.</p>
    </div>
</body>
</html>`

      return new NextResponse(fallbackHtml, {
        headers: {
          'Content-Type': 'text/html',
          'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

  } catch (error) {
    console.error('Error serving wildcard subdomain:', error)
    return new NextResponse('Internal server error', { status: 500 })
  }
}

/**
 * Extract subdomain from host header
 */
function getSubdomainFromHost(host: string): string | null {
  // Remove port if present
  const hostname = host.split(':')[0]

  // Check if it's a pipilot.dev subdomain
  if (hostname.endsWith('.pipilot.dev')) {
    const subdomain = hostname.replace('.pipilot.dev', '')

    // Skip www and empty subdomains
    if (subdomain === 'www' || subdomain === '' || subdomain === 'pipilot') {
      return null
    }

    return subdomain
  }

  return null
}

/**
 * Get content type based on file extension
 */
function getContentType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase()

  const contentTypes: Record<string, string> = {
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'jsx': 'application/javascript',
    'ts': 'application/typescript',
    'tsx': 'application/typescript',
    'json': 'application/json',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon',
    'woff': 'font/woff',
    'woff2': 'font/woff2',
    'ttf': 'font/ttf',
    'eot': 'application/vnd.ms-fontobject',
    'pdf': 'application/pdf',
    'txt': 'text/plain',
    'md': 'text/markdown',
    'xml': 'application/xml',
    'webp': 'image/webp'
  }

  return contentTypes[ext || ''] || 'application/octet-stream'
}

/**
 * Handle CORS preflight requests
 */
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}


