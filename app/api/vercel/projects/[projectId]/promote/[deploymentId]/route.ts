import { NextRequest, NextResponse } from 'next/server';

/**
 * Promote a deployment to production
 * 
 * This endpoint promotes an existing deployment to production without rebuilding,
 * directing all production domains to the specified deployment.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string; deploymentId: string } }
) {
  try {
    const { vercelToken, teamId } = await request.json();

    if (!vercelToken) {
      return NextResponse.json({
        error: 'Vercel token is required'
      }, { status: 400 });
    }

    // Build API URL
    let apiUrl = `https://api.vercel.com/v10/projects/${params.projectId}/promote/${params.deploymentId}`;
    if (teamId) {
      apiUrl += `?teamId=${teamId}`;
    }

    // Promote deployment
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      if (response.status === 404) {
        return NextResponse.json({
          error: 'Deployment or project not found',
          code: 'NOT_FOUND'
        }, { status: 404 });
      }
      
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
      
      if (response.status === 409) {
        return NextResponse.json({
          error: 'Project is being transferred or deployment cannot be promoted',
          code: 'CONFLICT'
        }, { status: 409 });
      }

      return NextResponse.json({
        error: errorData.error?.message || 'Failed to promote deployment',
        code: 'PROMOTE_FAILED'
      }, { status: response.status });
    }

    // Get project details to return production URL
    const projectResponse = await fetch(
      `https://api.vercel.com/v9/projects/${params.projectId}${teamId ? `?teamId=${teamId}` : ''}`,
      {
        headers: {
          'Authorization': `Bearer ${vercelToken}`,
        },
      }
    );

    let productionUrl = null;
    if (projectResponse.ok) {
      const project = await projectResponse.json();
      productionUrl = `https://${project.name}.vercel.app`;
    }

    return NextResponse.json({
      success: true,
      message: 'Deployment promoted to production successfully',
      deploymentId: params.deploymentId,
      projectId: params.projectId,
      productionUrl: productionUrl,
    });

  } catch (error) {
    console.error('Promote error:', error);
    return NextResponse.json({ 
      error: 'Failed to promote deployment',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}
