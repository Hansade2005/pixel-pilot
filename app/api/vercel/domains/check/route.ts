import { NextRequest, NextResponse } from 'next/server';

/**
 * Check domain availability and pricing
 * 
 * This endpoint checks if domains are available for purchase and returns
 * pricing information from Vercel's domain marketplace.
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

    if (domains.length > 10) {
      return NextResponse.json({
        error: 'Maximum 10 domains can be checked at once'
      }, { status: 400 });
    }

    if (!vercelToken) {
      return NextResponse.json({
        error: 'Vercel token is required'
      }, { status: 400 });
    }

    // Build query parameters
    const queryParams = new URLSearchParams();
    queryParams.set('names', domains.join(','));
    if (teamId) {
      queryParams.set('teamId', teamId);
    }

    // Check domain availability
    const apiUrl = `https://api.vercel.com/v5/domains/check?${queryParams.toString()}`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
      },
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

    // Format response
    const formattedDomains = data.domains?.map((domain: any) => ({
      name: domain.name,
      available: domain.available,
      price: domain.price,
      currency: domain.currency || 'USD',
      period: domain.period || 1, // years
      serviceType: domain.serviceType,
      verified: domain.verified,
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
