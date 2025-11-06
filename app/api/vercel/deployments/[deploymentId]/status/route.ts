import { NextRequest, NextResponse } from 'next/server';

/**
 * Get deployment status and details
 * 
 * This endpoint fetches the current status and details of a specific deployment
 * from Vercel's API, including build status, URLs, and commit information.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { deploymentId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const vercelToken = searchParams.get('token');
    const teamId = searchParams.get('teamId');

    // Validate required parameters
    if (!vercelToken) {
      return NextResponse.json({
        error: 'Vercel token is required'
      }, { status: 400 });
    }

    // Build API URL with optional team parameter
    let apiUrl = `https://api.vercel.com/v13/deployments/${params.deploymentId}`;
    if (teamId) {
      apiUrl += `?teamId=${teamId}`;
    }

    // Fetch deployment details
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      if (response.status === 404) {
        return NextResponse.json({
          error: 'Deployment not found',
          code: 'DEPLOYMENT_NOT_FOUND'
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
        error: errorData.error?.message || 'Failed to fetch deployment status',
        code: 'FETCH_FAILED'
      }, { status: response.status });
    }

    const deployment = await response.json();

    // Parse and format deployment information
    const deploymentInfo = {
      id: deployment.uid,
      url: `https://${deployment.url}`,
      status: deployment.readyState,
      state: deployment.state,
      type: deployment.type,
      target: deployment.target,
      
      // Timing information
      createdAt: deployment.createdAt,
      buildingAt: deployment.buildingAt,
      readyAt: deployment.ready,
      
      // Error information (if any)
      errorMessage: deployment.errorMessage,
      errorCode: deployment.errorCode,
      errorLink: deployment.errorLink,
      
      // Build information
      source: deployment.source,
      buildCommand: deployment.buildCommand,
      
      // Commit information (from Git)
      commit: deployment.meta?.githubCommitSha ? {
        sha: deployment.meta.githubCommitSha,
        message: deployment.meta.githubCommitMessage,
        author: deployment.meta.githubCommitAuthorName,
        authorUsername: deployment.meta.githubCommitAuthorLogin,
        org: deployment.meta.githubOrg,
        repo: deployment.meta.githubRepo,
        ref: deployment.meta.githubCommitRef,
      } : undefined,
      
      // Project information
      projectId: deployment.projectId,
      name: deployment.name,
      
      // Vercel dashboard link
      inspectorUrl: deployment.inspectorUrl,
      
      // Region and compute information
      regions: deployment.regions,
      
      // Aliases (production domains)
      alias: deployment.alias,
      aliasAssigned: deployment.aliasAssigned,
      
      // Check results
      checksState: deployment.checksState,
      checksConclusion: deployment.checksConclusion,
    };

    return NextResponse.json(deploymentInfo);

  } catch (error) {
    console.error('Status fetch error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch deployment status',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}
