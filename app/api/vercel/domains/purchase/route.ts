import { NextRequest, NextResponse } from 'next/server';

/**
 * Purchase a domain through Vercel
 * 
 * This endpoint initiates a domain purchase order through Vercel's domain marketplace.
 * Uses POST /v1/domains/buy for bulk domain purchases.
 * 
 * Official API: https://vercel.com/docs/rest-api/reference/endpoints/domains-registrar/buy-multiple-domains
 */
export async function POST(request: NextRequest) {
  try {
    const { 
      domains, // Array of domain objects: [{ domainName, autoRenew?, years?, expectedPrice? }]
      vercelToken, 
      teamId,
      // Contact information
      contactInformation,
    } = await request.json();

    // Validate required fields
    if (!domains || !Array.isArray(domains) || domains.length === 0) {
      return NextResponse.json({
        error: 'Domains array is required and must contain at least one domain'
      }, { status: 400 });
    }

    if (!vercelToken) {
      return NextResponse.json({
        error: 'Vercel token is required'
      }, { status: 400 });
    }

    // Validate contact information
    if (!contactInformation || !contactInformation.firstName || !contactInformation.lastName || 
        !contactInformation.email || !contactInformation.phone || !contactInformation.address1 || 
        !contactInformation.city || !contactInformation.state || !contactInformation.zip || 
        !contactInformation.country) {
      return NextResponse.json({
        error: 'Complete contact information is required for domain purchase',
        required: {
          firstName: 'string',
          lastName: 'string',
          email: 'string',
          phone: 'string',
          address1: 'string',
          city: 'string',
          state: 'string',
          zip: 'string',
          country: 'string (e.g., US, GB, DE)'
        },
        optional: {
          address2: 'string',
          companyName: 'string',
          fax: 'string'
        }
      }, { status: 400 });
    }

    // Validate team ID is required
    if (!teamId) {
      return NextResponse.json({
        error: 'Team ID is required for domain purchases',
        code: 'TEAM_ID_REQUIRED'
      }, { status: 400 });
    }

    // Build API URL with required team ID
    const apiUrl = `https://api.vercel.com/v1/domains/buy?teamId=${teamId}`;

    // Prepare purchase payload according to official API spec
    const purchasePayload = {
      domains: domains.map((d: any) => ({
        domainName: d.domainName,
        autoRenew: d.autoRenew !== undefined ? d.autoRenew : true,
        years: d.years || 1,
        ...(d.expectedPrice && { expectedPrice: d.expectedPrice })
      })),
      contactInformation: {
        firstName: contactInformation.firstName,
        lastName: contactInformation.lastName,
        email: contactInformation.email,
        phone: contactInformation.phone,
        address1: contactInformation.address1,
        ...(contactInformation.address2 && { address2: contactInformation.address2 }),
        city: contactInformation.city,
        state: contactInformation.state,
        zip: contactInformation.zip,
        country: contactInformation.country,
        ...(contactInformation.companyName && { companyName: contactInformation.companyName }),
        ...(contactInformation.fax && { fax: contactInformation.fax }),
      }
    };

    // Purchase domain(s) using the official API
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(purchasePayload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      if (response.status === 400) {
        // Specific error codes from official API
        const errorCode = errorData.code;
        let errorMessage = errorData.message || 'Invalid purchase request';
        
        if (errorCode === 'domain_too_short') {
          errorMessage = 'The domain name (excluding the TLD) is too short.';
        } else if (errorCode === 'order_too_expensive') {
          errorMessage = 'The total price of the order is too high.';
        } else if (errorCode === 'too_many_domains') {
          errorMessage = 'The number of domains in the order is too high.';
        }
        
        return NextResponse.json({
          error: errorMessage,
          code: errorCode || 'INVALID_PURCHASE_REQUEST',
          details: errorData.issues || []
        }, { status: 400 });
      }
      
      if (response.status === 401) {
        return NextResponse.json({
          error: 'Invalid Vercel token',
          code: 'INVALID_TOKEN'
        }, { status: 401 });
      }
      
      if (response.status === 402) {
        return NextResponse.json({
          error: 'Payment required or insufficient funds',
          code: 'PAYMENT_REQUIRED'
        }, { status: 402 });
      }
      
      if (response.status === 403) {
        return NextResponse.json({
          error: 'Insufficient permissions or domain not available',
          code: 'INSUFFICIENT_PERMISSIONS'
        }, { status: 403 });
      }
      
      if (response.status === 409) {
        return NextResponse.json({
          error: 'Domain already owned or purchase in progress',
          code: 'DOMAIN_CONFLICT'
        }, { status: 409 });
      }

      return NextResponse.json({
        error: errorData.message || 'Failed to purchase domain',
        code: errorData.code || 'PURCHASE_FAILED'
      }, { status: response.status });
    }

    const data = await response.json();

    // Return purchase order information
    return NextResponse.json({
      orderId: data.orderId,
      links: data._links,
      message: 'Domain purchase order created successfully',
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('Domain purchase error:', error);
    return NextResponse.json({ 
      error: 'Failed to process domain purchase',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}
