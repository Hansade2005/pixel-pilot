import { NextRequest, NextResponse } from 'next/server';

/**
 * Purchase a domain through Vercel
 * 
 * This endpoint initiates a domain purchase order through Vercel's domain marketplace.
 * Requires payment information and domain contact details.
 */
export async function POST(request: NextRequest) {
  try {
    const { 
      domain, 
      vercelToken, 
      teamId,
      // Contact information
      country,
      firstName,
      lastName,
      email,
      phone,
      address,
      city,
      state,
      postalCode,
      // Optional
      autoRenew = true,
      years = 1,
    } = await request.json();

    // Validate required fields
    if (!domain || !vercelToken) {
      return NextResponse.json({
        error: 'Domain and Vercel token are required'
      }, { status: 400 });
    }

    // Validate contact information
    if (!country || !firstName || !lastName || !email || !phone || !address || !city || !postalCode) {
      return NextResponse.json({
        error: 'Complete contact information is required for domain purchase',
        required: ['country', 'firstName', 'lastName', 'email', 'phone', 'address', 'city', 'postalCode']
      }, { status: 400 });
    }

    // Build API URL
    let apiUrl = 'https://api.vercel.com/v5/domains/buy';
    if (teamId) {
      apiUrl += `?teamId=${teamId}`;
    }

    // Prepare purchase payload
    const purchasePayload = {
      name: domain,
      expectedPrice: undefined, // Will be filled from check endpoint
      renew: autoRenew,
      country,
      orgName: undefined, // For organizations
      firstName,
      lastName,
      address1: address,
      address2: undefined,
      city,
      state,
      postalCode,
      phone,
      email,
    };

    // First, check domain availability and get price
    const checkUrl = `https://api.vercel.com/v5/domains/check?names=${domain}${teamId ? `&teamId=${teamId}` : ''}`;
    const checkResponse = await fetch(checkUrl, {
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
      },
    });

    if (!checkResponse.ok) {
      return NextResponse.json({
        error: 'Failed to check domain availability',
        code: 'DOMAIN_CHECK_FAILED'
      }, { status: checkResponse.status });
    }

    const checkData = await checkResponse.json();
    const domainInfo = checkData.domains?.[0];

    if (!domainInfo?.available) {
      return NextResponse.json({
        error: 'Domain is not available for purchase',
        code: 'DOMAIN_NOT_AVAILABLE'
      }, { status: 400 });
    }

    // Set expected price
    purchasePayload.expectedPrice = domainInfo.price;

    // Purchase domain
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
        return NextResponse.json({
          error: errorData.error?.message || 'Invalid purchase request',
          code: 'INVALID_PURCHASE_REQUEST'
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
        error: errorData.error?.message || 'Failed to purchase domain',
        code: 'PURCHASE_FAILED'
      }, { status: response.status });
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      domain: domain,
      orderId: data.uid,
      price: domainInfo.price,
      currency: domainInfo.currency || 'USD',
      status: 'pending',
      autoRenew: autoRenew,
      expiresAt: data.expiresAt,
      message: 'Domain purchase initiated successfully',
    });

  } catch (error) {
    console.error('Domain purchase error:', error);
    return NextResponse.json({ 
      error: 'Failed to purchase domain',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}
