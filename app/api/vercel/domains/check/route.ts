import { NextRequest, NextResponse } from 'next/server';

/**
 * Check domain availability and pricing
 * 
 * This endpoint checks if domains are available for purchase and returns
 * pricing information from Vercel's domain marketplace.
 * 
 * Uses:
 * - POST /v1/registrar/domains/availability for bulk availability checks
 * - GET /v1/registrar/domains/{domain}/price for individual domain pricing
 * 
 * Official API docs:
 * - Availability: https://vercel.com/docs/rest-api/reference/endpoints/domains-registrar/get-availability-for-multiple-domains
 * - Pricing: https://vercel.com/docs/rest-api/reference/endpoints/domains-registrar/get-price-data-for-a-domain
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

    // Format response and fetch pricing for available domains
    const formattedDomains = [];
    
    if (data.results) {
      for (const result of data.results) {
        let domainData = {
          name: result.domain,
          available: result.available,
          price: null as number | null,
          currency: 'USD',
          years: 1
        };

        // If domain is available, fetch pricing information using the correct registrar API
        if (result.available) {
          try {
            // Use the official registrar pricing endpoint
            let priceApiUrl = `https://api.vercel.com/v1/registrar/domains/${encodeURIComponent(result.domain)}/price?years=1`;
            if (teamId) {
              priceApiUrl += `&teamId=${teamId}`;
            }

            console.log(`Fetching price for ${result.domain} from:`, priceApiUrl);

            const priceResponse = await fetch(priceApiUrl, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${vercelToken}`,
                'Content-Type': 'application/json',
              },
            });

            if (priceResponse.ok) {
              const priceData = await priceResponse.json();
              console.log(`Price data for ${result.domain}:`, priceData);
              
              // Use purchasePrice from the registrar API response
              if (priceData.purchasePrice !== null && priceData.purchasePrice > 0) {
                domainData.price = priceData.purchasePrice;
                domainData.currency = 'USD'; // Vercel prices are in USD
                domainData.years = priceData.years || 1;
              } else {
                console.warn(`Domain ${result.domain} is not available for purchase (null price)`);
                domainData.available = false; // Mark as unavailable if price is null
                domainData.price = null;
              }
            } else {
              console.warn(`Price API error for ${result.domain}:`, priceResponse.status, await priceResponse.text());
            }
          } catch (priceError) {
            console.warn(`Failed to fetch price for ${result.domain}:`, priceError);
            // Don't set a default price - let the frontend handle missing pricing
            domainData.price = null;
          }
        }

        formattedDomains.push(domainData);
      }
    }

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
