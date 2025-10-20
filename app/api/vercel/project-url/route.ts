import { NextRequest, NextResponse } from 'next/server';

/**
 * Get Latest Deployment URL from Vercel Project
 *
 * This endpoint fetches the most recent successful deployment URL for a Vercel project.
 * Used to update placeholder URLs with actual deployment URLs after build completion.
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const token = searchParams.get('token');

    if (!projectId || !token) {
      return NextResponse.json({
        error: 'Project ID and Vercel token are required'
      }, { status: 400 });
    }

    // Get project deployments (most recent first)
    const deploymentsResponse = await fetch(
      `https://api.vercel.com/v10/projects/${projectId}/deployments?limit=10`,
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
        error: 'Failed to fetch project deployments',
        details: errorData
      }, { status: deploymentsResponse.status });
    }

    const deploymentsData = await deploymentsResponse.json();
    const deployments = deploymentsData.deployments || [];

    // Find the most recent READY deployment
    const latestReadyDeployment = deployments.find((deployment: any) =>
      deployment.readyState === 'READY' &&
      deployment.target === 'production'
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
      `https://api.vercel.com/v13/deployments/${latestReadyDeployment.uid}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (deploymentResponse.ok) {
      const deploymentDetails = await deploymentResponse.json();

      return NextResponse.json({
        url: deploymentDetails.url ? `https://${deploymentDetails.url}` : null,
        status: deploymentDetails.readyState,
        deploymentId: deploymentDetails.uid,
        createdAt: deploymentDetails.createdAt,
        buildTime: deploymentDetails.buildingAt ? Date.now() - new Date(deploymentDetails.buildingAt).getTime() : null,
      });
    }

    // Fallback to basic deployment info
    return NextResponse.json({
      url: latestReadyDeployment.url ? `https://${latestReadyDeployment.url}` : null,
      status: latestReadyDeployment.readyState,
      deploymentId: latestReadyDeployment.uid,
      createdAt: latestReadyDeployment.createdAt,
    });

  } catch (error) {
    console.error('Error fetching latest deployment URL:', error);
    return NextResponse.json({
      error: 'Failed to fetch deployment URL'
    }, { status: 500 });
  }
}

/**
 * Update Project Deployment URL
 *
 * This endpoint can be used to manually update a project's deployment URL
 * when the automatic polling detects a new URL.
 */
export async function POST(request: NextRequest) {
  try {
    const { projectId, workspaceId, newUrl, token } = await request.json();

    if (!projectId || !workspaceId || !newUrl || !token) {
      return NextResponse.json({
        error: 'Project ID, workspace ID, new URL, and token are required'
      }, { status: 400 });
    }

    // Verify the URL is actually from this Vercel project
    const projectResponse = await fetch(
      `https://api.vercel.com/v10/projects/${projectId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!projectResponse.ok) {
      return NextResponse.json({
        error: 'Failed to verify project ownership'
      }, { status: 403 });
    }

    const projectData = await projectResponse.json();
    const expectedDomain = `${projectData.name}.vercel.app`;

    // Basic validation that the URL matches the project
    if (!newUrl.includes(expectedDomain) && !newUrl.includes('vercel-preview.app')) {
      return NextResponse.json({
        error: 'URL does not match the expected Vercel project domain'
      }, { status: 400 });
    }

    // Here you would typically update your database/storage with the new URL
    // For now, just return success - the client will handle the storage update

    return NextResponse.json({
      success: true,
      message: 'URL validation successful',
      projectName: projectData.name,
      expectedDomain
    });

  } catch (error) {
    console.error('Error updating deployment URL:', error);
    return NextResponse.json({
      error: 'Failed to update deployment URL'
    }, { status: 500 });
  }
}