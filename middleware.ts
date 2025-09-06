import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { redis, domainConfig, SubdomainData } from '@/lib/redis'

// Configuration for allowed subdomains and tenant settings
const TENANT_CONFIG = {
  allowedSubdomainPattern: /^[a-z0-9][a-z0-9-]*[a-z0-9]$/,
  blockedSubdomains: ['www', '', 'pipilot', 'admin', 'staging'],
  domainWhitelist: ['pipilot.dev', 'localhost:3000']
}

// Advanced subdomain extraction
async function extractSubdomain(request: NextRequest): Promise<string | null> {
  const url = request.url
  const host = request.headers.get('host') || ''
  const hostname = host.split(':')[0]

  console.log('[Middleware Debug] Subdomain Extraction:', {
    url,
    host,
    hostname,
    rootDomain: domainConfig.rootDomain
  });

  // Local development environment
  if (url.includes('localhost') || url.includes('127.0.0.1')) {
    // Try to extract subdomain from the full URL
    const fullUrlMatch = url.match(/http:\/\/([^.]+)\.localhost/);
    if (fullUrlMatch && fullUrlMatch[1]) {
      return fullUrlMatch[1];
    }

    // Fallback to host header approach
    if (hostname.includes('.localhost')) {
      return hostname.split('.')[0];
    }

    return null;
  }

  // Production environment
  const rootDomainFormatted = domainConfig.rootDomain.split(':')[0];

  // Handle preview deployment URLs (tenant---branch-name.vercel.app)
  if (hostname.includes('---') && hostname.endsWith('.vercel.app')) {
    const parts = hostname.split('---');
    return parts.length > 0 ? parts[0] : null;
  }

  // Regular subdomain detection
  const isSubdomain =
    hostname !== rootDomainFormatted &&
    hostname !== `www.${rootDomainFormatted}` &&
    hostname.endsWith(`.${rootDomainFormatted}`);

  const extractedSubdomain = isSubdomain 
    ? hostname.replace(`.${rootDomainFormatted}`, '') 
    : null;

  console.log('[Middleware Debug] Extracted Subdomain:', {
    isSubdomain,
    extractedSubdomain
  });

  // Validate subdomain against Redis metadata
  if (extractedSubdomain) {
    const subdomainDataStr = await redis.get(`subdomain:${extractedSubdomain}`);
    
    console.log('[Middleware Debug] Redis Subdomain Check:', {
      subdomain: extractedSubdomain,
      redisData: subdomainDataStr
    });

    // Parse the JSON string and validate
    if (subdomainDataStr) {
      try {
        const subdomainData: SubdomainData = JSON.parse(subdomainDataStr as string);
        return extractedSubdomain;
      } catch {
        // Invalid JSON, treat as non-existent subdomain
        console.log(`[Middleware Debug] Invalid JSON for subdomain: ${extractedSubdomain}`);
        return null;
      }
    }
    
    return null;
  }

  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const subdomain = await extractSubdomain(request);

  console.log('[Middleware Debug] Middleware Processing:', {
    pathname,
    subdomain
  });

  // Validate domain
  const isAllowedDomain = TENANT_CONFIG.domainWhitelist.some(domain => 
    request.headers.get('host')?.endsWith(domain)
  );

  if (!isAllowedDomain) {
    console.log('[Middleware Debug] Domain not allowed, redirecting to pipilot.dev');
    return NextResponse.redirect(new URL('https://pipilot.dev'));
  }

  // Subdomain-specific routing
  if (subdomain) {
    // Block access to admin page from subdomains
    if (pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    // Rewrite root path on subdomain to specific subdomain page
    if (pathname === '/') {
      console.log(`[Middleware Debug] Rewriting root path to /s/${subdomain}`);
      return NextResponse.rewrite(new URL(`/s/${subdomain}`, request.url));
    }

    // Add tenant-specific headers
    const response = NextResponse.next();
    response.headers.set('X-Tenant-Subdomain', subdomain);
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');

    return response;
  }

  // Default fallback
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Apply to all routes except static files and API routes
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
}
