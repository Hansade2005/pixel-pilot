import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Configuration for allowed subdomains and tenant settings
const TENANT_CONFIG = {
  allowedSubdomainPattern: /^[a-z0-9][a-z0-9-]*[a-z0-9]$/,
  blockedSubdomains: ['www', '', 'pipilot', 'admin', 'staging'],
  domainWhitelist: ['pipilot.dev']
}

// Logging utility (can be replaced with proper logging in production)
function logSubdomainAccess(subdomain: string | null, req: NextRequest) {
  console.log(`[Subdomain Access] ${new Date().toISOString()}`, {
    subdomain,
    path: req.nextUrl.pathname,
    method: req.method,
    headers: {
      host: req.headers.get('host'),
      userAgent: req.headers.get('user-agent')
    }
  })
}

// Validate and sanitize subdomain
function validateSubdomain(subdomain: string | null): string | null {
  if (!subdomain) return null

  // Check against blocked subdomains
  if (TENANT_CONFIG.blockedSubdomains.includes(subdomain)) {
    return null
  }

  // Validate against allowed pattern
  if (!TENANT_CONFIG.allowedSubdomainPattern.test(subdomain)) {
    return null
  }

  return subdomain
}

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone()
  const host = req.headers.get('host') || ''
  
  // Extract subdomain
  const hostParts = host.split('.')
  const rawSubdomain = hostParts.length > 2 ? hostParts[0] : null
  
  // Validate domain
  const isAllowedDomain = TENANT_CONFIG.domainWhitelist.some(domain => 
    host.endsWith(domain)
  )

  if (!isAllowedDomain) {
    return NextResponse.redirect(new URL('https://pipilot.dev'))
  }

  // Validate and sanitize subdomain
  const subdomain = validateSubdomain(rawSubdomain)

  // Log access attempt
  logSubdomainAccess(subdomain, req)

  // If valid subdomain, rewrite request
  if (subdomain) {
    // Modify URL to include subdomain
    url.pathname = `/api/serve/${subdomain}${url.pathname === '/' ? '/index.html' : url.pathname}`
    
    // Create response with tenant-specific headers
    const response = NextResponse.rewrite(url)
    
    // Add security and tracking headers
    response.headers.set('X-Tenant-Subdomain', subdomain)
    response.headers.set('X-Robots-Tag', 'noindex, nofollow')
    
    // Optional: Add rate limiting headers (placeholder for more advanced implementation)
    response.headers.set('X-RateLimit-Limit', '100')
    response.headers.set('X-RateLimit-Remaining', '99')

    return response
  }

  // Default fallback
  return NextResponse.next()
}

export const config = {
  // Matcher to apply middleware selectively
  matcher: [
    // Apply to all routes except static files and API routes
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
}
