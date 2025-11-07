import { NextRequest, NextResponse } from 'next/server';

/**
 * Promote a deployment to production
 * 
 * This endpoint promotes an existing deployment to production without rebuilding.
 * All production domains for the project will point to the specified deployment.
 * 
 * Use cases:
 * - Instant rollback to a previous stable deployment
 * - Promote a preview deployment to production
 * - Quick production updates without CI/CD pipeline
 * 
 * API: POST /v10/projects/{projectId}/promote/{deploymentId}
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { 
      deploymentId,
      vercelToken, 
      teamId 
    } = await request.json();

    // Validate required fields
    if (!deploymentId) {
      return NextResponse.json({
        error: 'Deployment ID is required',
        code: 'MISSING_DEPLOYMENT_ID'
      }, { status: 400 });
    }

    if (!vercelToken) {
      return NextResponse.json({
        error: 'Vercel token is required',
        code: 'MISSING_TOKEN'
      }, { status: 400 });
    }

    // Build API URL
    let apiUrl = `https://api.vercel.com/v10/projects/${params.projectId}/promote/${deploymentId}`;
    if (teamId) {
      apiUrl += `?teamId=${teamId}`;
    }

    // Promote deployment to production
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}), // Empty body required by API
    });

    // Handle response
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      if (response.status === 400) {
        return NextResponse.json({
          error: errorData.error?.message || 'Invalid promotion request. Check if deployment exists and is in READY state.',
          code: 'INVALID_PROMOTION_REQUEST',
          details: {
            projectId: params.projectId,
            deploymentId: deploymentId,
            possibleCauses: [
              'Deployment is not in READY state',
              'Deployment does not belong to this project',
              'Invalid deployment ID format'
            ]
          }
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
          error: 'Insufficient permissions to promote deployments',
          code: 'INSUFFICIENT_PERMISSIONS',
          details: 'Ensure your Vercel token has project:write permissions'
        }, { status: 403 });
      }
      
      if (response.status === 404) {
        return NextResponse.json({
          error: 'Project or deployment not found',
          code: 'RESOURCE_NOT_FOUND',
          details: {
            projectId: params.projectId,
            deploymentId: deploymentId
          }
        }, { status: 404 });
      }
      
      if (response.status === 409) {
        return NextResponse.json({
          error: 'Conflict: Unable to promote deployment',
          code: 'PROMOTION_CONFLICT',
          details: 'This deployment may already be in production or another promotion is in progress'
        }, { status: 409 });
      }

      return NextResponse.json({
        error: errorData.error?.message || 'Failed to promote deployment',
        code: 'PROMOTION_FAILED'
      }, { status: response.status });
    }

    // Success response
    // Note: Vercel returns 201 (Created) or 202 (Accepted) with empty body
    const statusCode = response.status;
    const isAccepted = statusCode === 202;

    return NextResponse.json({
      success: true,
      message: isAccepted 
        ? 'Deployment promotion initiated. Production domains will update shortly.'
        : 'Deployment successfully promoted to production.',
      status: isAccepted ? 'processing' : 'completed',
      projectId: params.projectId,
      deploymentId: deploymentId,
      promotedAt: new Date().toISOString(),
      details: {
        action: 'promote',
        statusCode: statusCode,
        note: isAccepted 
          ? 'Promotion is being processed asynchronously. Check deployment status for updates.'
          : 'All production domains now point to this deployment.'
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Deployment promotion error:', error);
    return NextResponse.json({ 
      error: 'Failed to promote deployment',
      code: 'INTERNAL_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Get promotion history for a project
 * 
 * This endpoint retrieves the list of promotions (production deployments)
 * for the specified project.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const vercelToken = searchParams.get('token');
    const teamId = searchParams.get('teamId');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!vercelToken) {
      return NextResponse.json({
        error: 'Vercel token is required',
        code: 'MISSING_TOKEN'
      }, { status: 400 });
    }

    // Get production deployments (which are promoted deployments)
    let apiUrl = `https://api.vercel.com/v6/deployments?projectId=${params.projectId}&target=production&limit=${limit}`;
    if (teamId) {
      apiUrl += `&teamId=${teamId}`;
    }

    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json({
        error: errorData.error?.message || 'Failed to fetch promotion history',
        code: 'FETCH_FAILED'
      }, { status: response.status });
    }

    const data = await response.json();

    // Format promotion history
    const promotions = data.deployments?.map((deployment: any) => ({
      deploymentId: deployment.uid,
      url: deployment.url,
      state: deployment.state,
      createdAt: deployment.createdAt,
      creator: deployment.creator?.username,
      gitSource: deployment.meta?.githubCommitMessage 
        ? {
            message: deployment.meta.githubCommitMessage,
            sha: deployment.meta.githubCommitSha,
            author: deployment.meta.githubCommitAuthorName,
          }
        : null,
    })) || [];

    return NextResponse.json({
      success: true,
      projectId: params.projectId,
      promotions: promotions,
      count: promotions.length,
      note: 'These are all production deployments. The most recent one is currently active.'
    });

  } catch (error) {
    console.error('Fetch promotion history error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch promotion history',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}
