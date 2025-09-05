import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const pathname = request.nextUrl.pathname
  
  // Extract subdomain
  const subdomain = hostname.split('.')[0]
  
  // Skip if it's the main domain, www, or localhost
  if (subdomain === 'pipilot' || subdomain === 'www' || subdomain === 'localhost' || hostname.includes('vercel.app')) {
    return NextResponse.next()
  }

  // Check if it's a subdomain of pipilot.dev
  if (hostname.endsWith('.pipilot.dev') || hostname.endsWith('.localhost:3000')) {
    // Rewrite to our subdomain handler
    const url = request.nextUrl.clone()
    url.pathname = `/${subdomain}${pathname}`
    return NextResponse.rewrite(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
