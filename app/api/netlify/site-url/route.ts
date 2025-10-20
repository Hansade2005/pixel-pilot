import { NextRequest, NextResponse } from 'next/server';

/**
 * Get Latest Deployment URL from Netlify Site
 *
 * This endpoint fetches the most recent successful deployment URL for a Netlify site.
 * Used to update placeholder URLs with actual deployment URLs after build completion.
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId');
    const token = searchParams.get('token');

    if (!siteId || !token) {
      return NextResponse.json({
        error: 'Site ID and Netlify token are required'
      }, { status: 400 });
    }

    // Get site deployments (most recent first)
    const deploymentsResponse = await fetch(
      `https://api.netlify.com/api/v1/sites/${siteId}/deploys?per_page=10`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!deploymentsResponse.ok) {
      const errorData = await deploymentsResponse.json();
      console.error('Failed to fetch deployments:', errorData);
      return NextResponse.json({
        error: 'Failed to fetch site deployments',
        details: errorData
      }, { status: deploymentsResponse.status });
    }

    const deployments = await deploymentsResponse.json();

    // Find the most recent ready deployment
    const latestReadyDeployment = deployments.find((deployment: any) =>
      deployment.state === 'ready' &&
      deployment.context === 'production'
    );

    if (!latestReadyDeployment) {
      return NextResponse.json({
        url: null,
        status: 'building',
        message: 'No ready production deployment found yet'
      });
    }

    // Get detailed deployment info to ensure we have the correct URL
    const deploymentResponse = await fetch(
      `https://api.netlify.com/api/v1/deploys/${latestReadyDeployment.id}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (deploymentResponse.ok) {
      const deploymentDetails = await deploymentResponse.json();

      return NextResponse.json({
        url: deploymentDetails.ssl_url || deploymentDetails.url,
        status: deploymentDetails.state,
        deploymentId: deploymentDetails.id,
        createdAt: deploymentDetails.created_at,
        publishedAt: deploymentDetails.published_at,
        buildTime: deploymentDetails.published_at ?
          new Date(deploymentDetails.published_at).getTime() - new Date(deploymentDetails.created_at).getTime() : null,
      });
    }

    // Fallback to basic deployment info
    return NextResponse.json({
      url: latestReadyDeployment.ssl_url || latestReadyDeployment.url,
      status: latestReadyDeployment.state,
      deploymentId: latestReadyDeployment.id,
      createdAt: latestReadyDeployment.created_at,
      publishedAt: latestReadyDeployment.published_at,
    });

  } catch (error) {
    console.error('Error fetching latest deployment URL:', error);
    return NextResponse.json({
      error: 'Failed to fetch deployment URL'
    }, { status: 500 });
  }
}

/**
 * Update Site Deployment URL
 *
 * This endpoint can be used to manually update a site's deployment URL
 * when the automatic polling detects a new URL.
 */
export async function POST(request: NextRequest) {
  try {
    const { siteId, workspaceId, newUrl, token } = await request.json();

    if (!siteId || !workspaceId || !newUrl || !token) {
      return NextResponse.json({
        error: 'Site ID, workspace ID, new URL, and token are required'
      }, { status: 400 });
    }

    // Verify the URL is actually from this Netlify site
    const siteResponse = await fetch(
      `https://api.netlify.com/api/v1/sites/${siteId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!siteResponse.ok) {
      return NextResponse.json({
        error: 'Failed to verify site ownership'
      }, { status: 403 });
    }

    const siteData = await siteResponse.json();
    const expectedDomain = `${siteData.name}.netlify.app`;

    // Basic validation that the URL matches the site
    if (!newUrl.includes(expectedDomain) && !newUrl.includes('netlify.app')) {
      return NextResponse.json({
        error: 'URL does not match the expected Netlify site domain'
      }, { status: 400 });
    }

    // Here you would typically update your database/storage with the new URL
    // For now, just return success - the client will handle the storage update

    return NextResponse.json({
      success: true,
      message: 'URL validation successful',
      siteName: siteData.name,
      expectedDomain
    });

  } catch (error) {
    console.error('Error updating deployment URL:', error);
    return NextResponse.json({
      error: 'Failed to update deployment URL'
    }, { status: 500 });
  }
}