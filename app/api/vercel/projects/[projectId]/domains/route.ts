import { NextRequest, NextResponse } from 'next/server';

/**
 * Attach a domain to a Vercel project
 * 
 * This endpoint adds a custom domain to a Vercel project and returns
 * verification instructions if needed.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { 
      domain, 
      vercelToken, 
      teamId,
      redirect,
      redirectStatusCode,
      gitBranch,
    } = await request.json();

    // Validate input
    if (!domain) {
      return NextResponse.json({
        error: 'Domain is required'
      }, { status: 400 });
    }

    if (!vercelToken) {
      return NextResponse.json({
        error: 'Vercel token is required'
      }, { status: 400 });
    }

    // Build API URL
    let apiUrl = `https://api.vercel.com/v10/projects/${params.projectId}/domains`;
    if (teamId) {
      apiUrl += `?teamId=${teamId}`;
    }

    // Prepare request body
    const requestBody: any = {
      name: domain,
    };

    if (redirect) {
      requestBody.redirect = redirect;
      requestBody.redirectStatusCode = redirectStatusCode || 308;
    }

    if (gitBranch) {
      requestBody.gitBranch = gitBranch;
    }

    // Add domain to project
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      if (response.status === 400) {
        return NextResponse.json({
          error: errorData.error?.message || 'Invalid domain configuration',
          code: 'INVALID_DOMAIN_CONFIG'
        }, { status: 400 });
      }
      
      if (response.status === 401) {
        return NextResponse.json({
          error: 'Invalid Vercel token',
          code: 'INVALID_TOKEN'
        }, { status: 401 });
      }
      
      if (response.status === 403) {
        return NextResponse.json({
          error: 'Insufficient permissions or domain already in use',
          code: 'INSUFFICIENT_PERMISSIONS'
        }, { status: 403 });
      }
      
      if (response.status === 409) {
        return NextResponse.json({
          error: 'Domain is already attached to this or another project',
          code: 'DOMAIN_CONFLICT'
        }, { status: 409 });
      }

      return NextResponse.json({
        error: errorData.error?.message || 'Failed to attach domain',
        code: 'DOMAIN_ATTACH_FAILED'
      }, { status: response.status });
    }

    const data = await response.json();

    // Format response
    return NextResponse.json({
      success: true,
      domain: data.name,
      verified: data.verified,
      apexName: data.apexName,
      projectId: params.projectId,
      createdAt: data.createdAt,
      verification: data.verification?.map((v: any) => ({
        type: v.type,
        domain: v.domain,
        value: v.value,
        reason: v.reason,
      })) || [],
      // DNS configuration instructions
      configuration: data.verified ? null : {
        message: 'Domain verification required',
        steps: [
          'Add the following DNS records to your domain:',
          ...( data.verification?.map((v: any) => 
            `${v.type} record: ${v.domain} → ${v.value}`
          ) || []),
        ],
      },
    });

  } catch (error) {
    console.error('Domain attach error:', error);
    return NextResponse.json({ 
      error: 'Failed to attach domain',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}

/**
 * List all domains for a project
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const vercelToken = searchParams.get('token');
    const teamId = searchParams.get('teamId');

    if (!vercelToken) {
      return NextResponse.json({
        error: 'Vercel token is required'
      }, { status: 400 });
    }

    // Build API URL
    let apiUrl = `https://api.vercel.com/v9/projects/${params.projectId}/domains`;
    if (teamId) {
      apiUrl += `?teamId=${teamId}`;
    }

    // Fetch domains
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json({
        error: errorData.error?.message || 'Failed to fetch domains',
        code: 'DOMAINS_FETCH_FAILED'
      }, { status: response.status });
    }

    const data = await response.json();

    // Format response
    const domains = data.domains?.map((d: any) => ({
      name: d.name,
      verified: d.verified,
      apexName: d.apexName,
      gitBranch: d.gitBranch,
      redirect: d.redirect,
      redirectStatusCode: d.redirectStatusCode,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    })) || [];

    return NextResponse.json({
      domains: domains,
      total: domains.length,
      projectId: params.projectId,
    });

  } catch (error) {
    console.error('Domains fetch error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch domains',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}
