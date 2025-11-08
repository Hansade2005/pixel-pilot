import { NextRequest, NextResponse } from 'next/server';

/**
 * Purchase a domain through Vercel
 * 
 * This endpoint initiates a domain purchase through Vercel's domain registrar.
 * Uses POST /v1/registrar/domains/{domain}/buy for single domain purchases.
 * 
 * Official API: https://vercel.com/docs/rest-api/reference/endpoints/domains-registrar/buy-a-domain
 */
export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json();
    console.log('Domain purchase request received:', {
      ...requestBody,
      vercelToken: requestBody.vercelToken ? '***hidden***' : undefined
    });

    const { 
      domain, // Single domain name string
      autoRenew,
      years,
      expectedPrice,
      vercelToken, 
      teamId,
      // Contact information
      contactInformation,
    } = requestBody;

    // Validate required fields
    if (!domain || typeof domain !== 'string') {
      return NextResponse.json({
        error: 'Domain name is required'
      }, { status: 400 });
    }

    if (!autoRenew || typeof autoRenew !== 'boolean') {
      return NextResponse.json({
        error: 'autoRenew is required and must be a boolean'
      }, { status: 400 });
    }

    if (!years || typeof years !== 'number' || years < 1) {
      return NextResponse.json({
        error: 'years is required and must be a number >= 1'
      }, { status: 400 });
    }

    if (!expectedPrice || typeof expectedPrice !== 'number' || expectedPrice < 0.01) {
      return NextResponse.json({
        error: 'expectedPrice is required and must be >= 0.01'
      }, { status: 400 });
    }

    if (!vercelToken) {
      return NextResponse.json({
        error: 'Vercel token is required'
      }, { status: 400 });
    }

    // Validate contact information
    if (!contactInformation) {
      return NextResponse.json({
        error: 'contactInformation is required'
      }, { status: 400 });
    }

    const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'address1', 'city', 'state', 'zip', 'country'];
    const missingFields = requiredFields.filter(field => !contactInformation[field] || contactInformation[field].trim() === '');
    
    if (missingFields.length > 0) {
      return NextResponse.json({
        error: `Missing required contact information fields: ${missingFields.join(', ')}`,
        missingFields,
        received: Object.keys(contactInformation),
        details: 'All contact fields must be non-empty strings. Country must be ISO 3166-1 alpha-2 code (e.g., US, GB, DE). Phone must be E.164 format.'
      }, { status: 400 });
    }

    // Validate phone number format (E.164)
    if (!contactInformation.phone.match(/^\+[1-9]\d{1,14}$/)) {
      return NextResponse.json({
        error: 'Phone number must be in valid E.164 format (e.g., +14155552671)',
        received: contactInformation.phone
      }, { status: 400 });
    }

    // Validate country code (ISO 3166-1 alpha-2)
    if (contactInformation.country.length !== 2 || !/^[A-Z]{2}$/.test(contactInformation.country)) {
      return NextResponse.json({
        error: 'Country must be a valid ISO 3166-1 alpha-2 country code (e.g., US, GB, DE)',
        received: contactInformation.country
      }, { status: 400 });
    }

    // Build API URL for single domain purchase
    let apiUrl = `https://api.vercel.com/v1/registrar/domains/${encodeURIComponent(domain)}/buy`;
    if (teamId) {
      apiUrl += `?teamId=${teamId}`;
    }

    // Prepare purchase payload according to official API spec
    const purchasePayload = {
      autoRenew,
      years,
      expectedPrice,
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

    console.log('Making request to Vercel API:', {
      url: apiUrl,
      payload: {
        ...purchasePayload,
        contactInformation: {
          ...purchasePayload.contactInformation,
          email: '***hidden***' // Hide email in logs for privacy
        }
      }
    });

    // Purchase domain using the official API
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(purchasePayload),
    });

    console.log('Vercel API response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      if (response.status === 400) {
        // Specific error codes from official API
        const errorCode = errorData.code;
        let errorMessage = errorData.message || 'Invalid purchase request';
        
        if (errorCode === 'domain_too_short') {
          errorMessage = 'The domain name (excluding the TLD) is too short.';
        } else if (errorCode === 'price_mismatch') {
          const actualPrice = errorData.price || 'unknown';
          errorMessage = `Price mismatch. Expected: $${expectedPrice}, Actual: $${actualPrice}. Please check domain availability again.`;
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
          error: 'Payment required: Please ensure you have a valid payment method configured in your Vercel account and sufficient funds available.',
          code: 'PAYMENT_REQUIRED',
          details: {
            message: 'This error typically occurs when:',
            causes: [
              'No payment method is configured in your Vercel account',
              'Your credit card has expired or been declined',
              'Insufficient funds or credit limit reached',
              'Your Vercel account billing is suspended'
            ],
            solution: 'Visit https://vercel.com/account/billing to update your payment method'
          }
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

    // Return purchase information (single domain response)
    return NextResponse.json({
      id: data.id,
      name: data.name,
      createdAt: data.createdAt,
      expiresAt: data.expiresAt,
      autoRenew: data.autoRenew,
      message: 'Domain purchased successfully and added to your Vercel account',
      timestamp: Date.now(),
      purchaseInfo: {
        status: 'completed',
        paymentStatus: 'charged',
        note: 'Domain purchase is immediate with Vercel. No separate payment step required.'
      }
    });

  } catch (error) {
    console.error('Domain purchase error:', error);
    return NextResponse.json({ 
      error: 'Failed to process domain purchase',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}
