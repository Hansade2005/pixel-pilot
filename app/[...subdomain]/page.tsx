import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { subdomain: string[] } }
) {
  try {
    const hostname = request.headers.get('host') || ''
    const pathname = request.nextUrl.pathname
    
    // Extract subdomain from hostname
    const subdomain = hostname.split('.')[0]
    
    // Skip if it's the main domain or www
    if (subdomain === 'pipilot' || subdomain === 'www' || subdomain === 'localhost') {
      return NextResponse.next()
    }

    // Get the file path (remove leading slash)
    const filePath = pathname === '/' ? 'index.html' : pathname.slice(1)
    const storagePath = `${subdomain}/${filePath}`

    console.log(`Serving file: ${storagePath} for subdomain: ${subdomain}`)

    // Get file from Supabase Storage
    const supabase = await createClient()
    
    const { data, error } = await supabase.storage
      .from('projects')
      .download(storagePath)

    if (error) {
      console.error(`Error downloading ${storagePath}:`, error)
      
      // If it's a 404, try serving index.html
      if (error.message.includes('Object not found') && filePath !== 'index.html') {
        const { data: indexData, error: indexError } = await supabase.storage
          .from('projects')
          .download(`${subdomain}/index.html`)
        
        if (indexError) {
          return new NextResponse('Site not found', { status: 404 })
        }
        
        return new NextResponse(await indexData.text(), {
          headers: {
            'Content-Type': 'text/html',
            'Cache-Control': 'public, max-age=3600'
          }
        })
      }
      
      return new NextResponse('File not found', { status: 404 })
    }

    // Get content type
    const contentType = getContentType(filePath)
    
    // Convert blob to text or buffer based on content type
    let content: string | ArrayBuffer
    if (contentType.startsWith('text/') || contentType === 'application/json' || contentType === 'application/javascript') {
      content = await data.text()
    } else {
      content = await data.arrayBuffer()
    }

    return new NextResponse(content, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    })

  } catch (error) {
    console.error('Subdomain routing error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function HEAD(
  request: NextRequest,
  { params }: { params: { subdomain: string[] } }
) {
  // Handle HEAD requests the same as GET but without body
  const response = await GET(request, { params })
  return new NextResponse(null, {
    status: response.status,
    headers: response.headers
  })
}

export async function OPTIONS(
  request: NextRequest,
  { params }: { params: { subdomain: string[] } }
) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  })
}

function getContentType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase()
  const contentTypes: { [key: string]: string } = {
    'html': 'text/html',
    'htm': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'mjs': 'application/javascript',
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
    'map': 'application/json'
  }
  return contentTypes[ext || ''] || 'text/plain'
}
