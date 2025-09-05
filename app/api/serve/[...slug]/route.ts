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
    // Get the subdomain from the request
    const host = req.headers.get('host') || ''
    const subdomain = getSubdomainFromHost(host)

    if (!subdomain) {
      return new NextResponse('Invalid subdomain', { status: 400 })
    }

    // Get the requested file path
    const slug = params.slug || []
    const filePath = slug.length > 0 ? slug.join('/') : 'index.html'

    console.log(`Serving ${filePath} for subdomain ${subdomain}`)

    // Check if the subdomain exists in our Supabase tracking
    const supabase = await createClient()
    const { data: subdomainInfo, error } = await supabase
      .rpc('get_subdomain_info', { subdomain_param: subdomain })

    if (error || !subdomainInfo || subdomainInfo.length === 0) {
      return new NextResponse('Subdomain not found', { status: 404 })
    }

    const deployment = subdomainInfo[0]

    // Construct the file path in Supabase Storage
    const storagePath = `projects/${subdomain}/${filePath}`

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
      console.error(`File not found: ${storagePath}`, fileError)

      // If it's not the index file, try to serve index.html for SPA routing
      if (filePath !== 'index.html' && !filePath.includes('.')) {
        try {
          const indexPath = `projects/${subdomain}/index.html`
          const indexBuffer = await supabaseStorage.downloadFile('projects', indexPath)

          return new NextResponse(indexBuffer, {
            headers: {
              'Content-Type': 'text/html',
              'Cache-Control': 'public, max-age=31536000',
              'Access-Control-Allow-Origin': '*',
            },
          })
        } catch (indexError) {
          // Index file also not found
        }
      }

      return new NextResponse('File not found', { status: 404 })
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
