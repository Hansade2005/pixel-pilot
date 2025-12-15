import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Reserved subdomains that should NOT be treated as site subdomains
const RESERVED_SUBDOMAINS = ['www', 'app', 'api', 'admin', 'auth', 'dashboard']

// Extract subdomain from hostname for multi-tenant routing
function getSubdomain(hostname: string): string | null {
  // Remove port if present
  const host = hostname.split(':')[0];

  // For local development, treat localhost as no subdomain
  if (host === 'localhost' || host === '127.0.0.1') {
    return null;
  }

  // Only apply subdomain routing for pipilot.dev domains
  if (!host.endsWith('pipilot.dev')) {
    return null;
  }

  // Split by dots and check if we have a subdomain
  const parts = host.split('.');

  // If we have more than 2 parts, we have a subdomain
  // e.g., myproject.pipilot.dev -> ['myproject', 'pipilot', 'dev']
  if (parts.length > 2) {
    const subdomain = parts[0];
    
    // Skip reserved subdomains (main app routes)
    if (RESERVED_SUBDOMAINS.includes(subdomain)) {
      return null;
    }
    
    return subdomain; // Return the first part as subdomain
  }

  return null; // No subdomain
}

export async function middleware(request: NextRequest) {
  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  // Handle multi-tenant subdomain routing
  const hostname = request.headers.get('host') || '';
  const subdomain = getSubdomain(hostname);

  // If we have a subdomain, rewrite to the sites route
  if (subdomain) {
    const url = request.nextUrl.clone();

    // For root requests to subdomains, explicitly serve index.html
    const originalPath = request.nextUrl.pathname;
    const targetPath = originalPath === '/' ? `/sites/${subdomain}/index.html` : `/sites/${subdomain}${originalPath}`;

    url.pathname = targetPath;

    console.log(`[Multi-tenant] Rewriting ${hostname}${originalPath} → ${targetPath}`);

    const rewriteResponse = NextResponse.rewrite(url);
    rewriteResponse.headers.set('Access-Control-Allow-Origin', '*')
    rewriteResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    rewriteResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    return rewriteResponse;
  }

  // Skip Supabase auth for public API routes
  if (request.nextUrl.pathname.startsWith('/api/v1')) {
    const response = NextResponse.next();
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return response;
  }

  // Add CORS headers to all responses
  const response = NextResponse.next();
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  return response;
}

export const config = {
  matcher: [
    /*
     * Only run middleware on:
     * - Multi-tenant subdomain routes (for pipilot.dev)
     * - API v1 routes (for CORS)
     * Exclude all static assets and Next.js internal routes
     */
    '/((?!_next/static|_next/image|_next/webpack-hmr|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)$).*)',
  ],
}