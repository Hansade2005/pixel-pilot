import { NextRequest, NextResponse } from 'next/server'

// Base URL for public Supabase storage
const BASE_URL = 'https://lzuknbfbvpuscpammwzg.supabase.co/storage/v1/object/public/projects/';

// Content type detection
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

// Fallback HTML generator
function createFallbackHTML(subdomain: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>${subdomain} - PiPilot</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex; 
            justify-content: center; 
            align-items: center; 
            height: 100vh; 
            margin: 0; 
            background-color: #f0f4f8;
            color: #2d3748;
        }
        .container {
            text-align: center;
            padding: 2rem;
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        h1 { color: #4a5568; }
        p { color: #718096; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Welcome to ${subdomain}.pipilot.dev</h1>
        <p>This site is being set up. Please check back soon.</p>
        <p>Debug: No files found in storage.</p>
    </div>
</body>
</html>`
}

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string[] } }
) {
  try {
    // Extract subdomain from host
    const host = req.headers.get('host') || ''
    const subdomain = getSubdomainFromHost(host)

    if (!subdomain) {
      return new NextResponse('Invalid subdomain', { status: 400 })
    }

    // Construct file path
    const slug = params.slug || []
    const filePath = slug.length > 0 ? slug.join('/') : 'index.html'

    // Possible storage paths to try
    const storagePaths = [
      `${subdomain}/dist/${filePath}`,    // Subdomain-specific dist path
      `sample/dist/${filePath}`,          // Fallback to sample project
      `${subdomain}/${filePath}`,         // Subdomain root path
      `sample/${filePath}`                // Sample project root path
    ]

    // Try each storage path
    for (const storagePath of storagePaths) {
      try {
        const publicUrl = `${BASE_URL}${storagePath}`
        
        console.log(`[Subdomain Serve API] Attempting to fetch: ${publicUrl}`)
        
        const response = await fetch(publicUrl)
        
        if (response.ok) {
          const contentType = detectContentType(storagePath)
          const data = await response.arrayBuffer()
          
          return new NextResponse(Buffer.from(data), {
            headers: { 
              'Content-Type': contentType,
              'Cache-Control': 'public, max-age=31536000',
              'X-Subdomain-Path': storagePath
            }
          })
        }
      } catch (fetchError) {
        console.error(`[Subdomain Serve API] Error fetching ${storagePath}:`, fetchError)
      }
    }

    // Fallback HTML if no file found
    console.warn(`[Subdomain Serve API] No files found for subdomain: ${subdomain}`)
    return new NextResponse(createFallbackHTML(subdomain), {
      status: 404,
      headers: { 
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error) {
    console.error('Subdomain serving error:', error)
    return new NextResponse('Internal server error', { status: 500 })
  }
}

// Utility function to extract subdomain
function getSubdomainFromHost(host: string): string | null {
  const hostParts = host.split('.')
  const subdomain = hostParts.length > 2 ? hostParts[0] : null
  const validSubdomains = ['www', '', 'pipilot']
  
  return (
    host.endsWith('.pipilot.dev') && 
    subdomain && 
    !validSubdomains.includes(subdomain)
  ) ? subdomain : null
}

// CORS support
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}


