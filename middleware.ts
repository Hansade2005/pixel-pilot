import { updateSession } from "@/lib/supabase/middleware"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') || ''
  const url = request.nextUrl

  // Handle wildcard subdomains for pipilot.dev
  if (host.endsWith('.pipilot.dev') && host !== 'pipilot.dev' && host !== 'www.pipilot.dev') {
    // Rewrite to our serving API
    if (!url.pathname.startsWith('/api/')) {
      const rewriteUrl = new URL(`/api/serve${url.pathname}`, request.url)
      rewriteUrl.search = url.search

      // Create rewrite response
      const response = NextResponse.rewrite(rewriteUrl)

      // Add caching headers for static files
      if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/)) {
        response.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
      }

      return response
    }
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api/).*)",
    // Also match all paths for wildcard subdomains
    "/(.*)"
  ],
}
