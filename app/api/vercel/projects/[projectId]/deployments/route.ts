import { NextRequest, NextResponse } from 'next/server';

/**
 * List all deployments for a project
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const vercelToken = searchParams.get('token');
    const teamId = searchParams.get('teamId');
    const limit = parseInt(searchParams.get('limit') || '20');
    const target = searchParams.get('target'); // 'production' or 'preview'
    const since = searchParams.get('since');
    const until = searchParams.get('until');

    if (!vercelToken) {
      return NextResponse.json({
        error: 'Vercel token is required'
      }, { status: 400 });
    }

    // Build query parameters
    const queryParams = new URLSearchParams();
    if (teamId) queryParams.set('teamId', teamId);
    if (limit) queryParams.set('limit', limit.toString());
    if (target) queryParams.set('target', target);
    if (since) queryParams.set('since', since);
    if (until) queryParams.set('until', until);

    // Build API URL
    const apiUrl = `https://api.vercel.com/v6/deployments?projectId=${params.projectId}&${queryParams.toString()}`;

    // Fetch deployments
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      if (response.status === 404) {
        return NextResponse.json({
          error: 'Project not found',
          code: 'PROJECT_NOT_FOUND'
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

      return NextResponse.json({
        error: errorData.error?.message || 'Failed to fetch deployments',
        code: 'DEPLOYMENTS_FETCH_FAILED'
      }, { status: response.status });
    }

    const data = await response.json();

    // Format deployments
    const deployments = data.deployments?.map((d: any) => ({
      id: d.uid,
      url: `https://${d.url}`,
      name: d.name,
      status: d.readyState,
      state: d.state,
      type: d.type,
      target: d.target,
      createdAt: d.createdAt,
      buildingAt: d.buildingAt,
      readyAt: d.ready,
      commit: d.meta?.githubCommitSha ? {
        sha: d.meta.githubCommitSha,
        message: d.meta.githubCommitMessage,
        author: d.meta.githubCommitAuthorName,
      } : undefined,
      creator: d.creator ? {
        uid: d.creator.uid,
        username: d.creator.username,
      } : undefined,
      inspectorUrl: d.inspectorUrl,
    })) || [];

    return NextResponse.json({
      deployments: deployments,
      pagination: {
        total: deployments.length,
        limit: limit,
      },
      projectId: params.projectId,
    });

  } catch (error) {
    console.error('Deployments fetch error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch deployments',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}
