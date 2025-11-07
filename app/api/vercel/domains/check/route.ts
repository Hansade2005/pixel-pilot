import { NextRequest, NextResponse } from 'next/server';

/**
 * Check domain availability and pricing
 * 
 * This endpoint checks if domains are available for purchase and returns
 * pricing information from Vercel's domain marketplace.
 * 
 * Uses POST /v1/registrar/domains/availability for bulk domain checks
 * Official API: https://vercel.com/docs/rest-api/reference/endpoints/domains-registrar/get-availability-for-multiple-domains
 */
export async function POST(request: NextRequest) {
  try {
    const { domains, vercelToken, teamId } = await request.json();

    // Validate input
    if (!domains || !Array.isArray(domains) || domains.length === 0) {
      return NextResponse.json({
        error: 'Domains array is required and must not be empty'
      }, { status: 400 });
    }

    if (domains.length > 50) {
      return NextResponse.json({
        error: 'Maximum 50 domains can be checked at once'
      }, { status: 400 });
    }

    if (!vercelToken) {
      return NextResponse.json({
        error: 'Vercel token is required'
      }, { status: 400 });
    }

    // Build API URL with optional team parameter
    let apiUrl = 'https://api.vercel.com/v1/registrar/domains/availability';
    if (teamId) {
      apiUrl += `?teamId=${teamId}`;
    }

    // Check domain availability using the official registrar API
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        domains: domains
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      if (response.status === 401) {
        return NextResponse.json({
          error: 'Invalid Vercel token',
          code: 'INVALID_TOKEN'
        }, { status: 401 });
      }
      
      if (response.status === 403) {
        return NextResponse.json({
          error: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS'
        }, { status: 403 });
      }
      
      if (response.status === 429) {
        return NextResponse.json({
          error: 'Rate limit exceeded. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED'
        }, { status: 429 });
      }

      return NextResponse.json({
        error: errorData.error?.message || 'Failed to check domain availability',
        code: 'DOMAIN_CHECK_FAILED'
      }, { status: response.status });
    }

    const data = await response.json();

    // Format response according to the official API format
    // Response has { results: [{ domain: string, available: boolean }] }
    const formattedDomains = data.results?.map((result: any) => ({
      name: result.domain,
      available: result.available,
      // Note: The v1/registrar/domains/availability endpoint doesn't include price
      // To get price, we need to call GET /v1/domains/available for each domain
    })) || [];

    return NextResponse.json({
      domains: formattedDomains,
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('Domain check error:', error);
    return NextResponse.json({ 
      error: 'Failed to check domain availability',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}
