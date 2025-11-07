import { NextRequest, NextResponse } from 'next/server';
import { storageManager } from '@/lib/storage-manager';

/**
 * Trigger a Git-based deployment for an existing Vercel project
 * 
 * This endpoint triggers a new deployment by calling Vercel's REST API
 * with the stored project configuration and Git repository information.
 */
export async function POST(request: NextRequest) {
  try {
    const { 
      projectId, 
      vercelToken, 
      workspaceId,
      branch = 'main',
      target = 'production',
      withLatestCommit = true,
      teamId 
    } = await request.json();

    // Validate required parameters
    if (!projectId || !vercelToken) {
      return NextResponse.json({
        error: 'Project ID and Vercel token are required'
      }, { status: 400 });
    }

    // Build Vercel API URL with optional team parameter
    let projectApiUrl = `https://api.vercel.com/v9/projects/${projectId}`;
    if (teamId) {
      projectApiUrl += `?teamId=${teamId}`;
    }

    // Fetch project details to get Git repository information
    const projectResponse = await fetch(projectApiUrl, {
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
      },
    });

    if (!projectResponse.ok) {
      const errorData = await projectResponse.json().catch(() => ({}));
      return NextResponse.json({
        error: errorData.error?.message || 'Failed to fetch project details',
        code: 'PROJECT_NOT_FOUND'
      }, { status: projectResponse.status });
    }

    const project = await projectResponse.json();
    
    // Verify project has Git integration
    if (!project.link?.repo) {
      return NextResponse.json({
        error: 'Project is not connected to a Git repository. Please connect a Git repository first.',
        code: 'NO_GIT_INTEGRATION'
      }, { status: 400 });
    }

    // Build deployment API URL
    let deployApiUrl = 'https://api.vercel.com/v13/deployments';
    if (teamId) {
      deployApiUrl += `?teamId=${teamId}`;
    }

    // Prepare deployment payload according to Vercel v13 API
    // Based on working deploy route and Vercel SDK documentation
    const deploymentPayload = {
      name: project.name, // Required: project name/slug
      gitSource: {
        type: project.link.type || 'github',
        repo: project.link.repo, // Required: full repo path (owner/repo)
        ref: branch,
        ...(project.link.repoId && { projectId: project.link.repoId }), // Optional: numeric repo ID
      },
      target: target,
      withLatestCommit: withLatestCommit,
      // Include project settings if available
      ...(project.framework && {
        projectSettings: {
          framework: project.framework
        }
      }),
    };

    console.log('Triggering deployment with payload:', JSON.stringify(deploymentPayload, null, 2));

    // Trigger the deployment
    const deployResponse = await fetch(deployApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(deploymentPayload),
    });

    if (!deployResponse.ok) {
      const errorData = await deployResponse.json().catch(() => ({}));
      console.error('Vercel deployment error:', errorData);
      
      // Handle specific error cases
      if (deployResponse.status === 400) {
        return NextResponse.json({
          error: errorData.error?.message || 'Invalid deployment configuration',
          code: 'INVALID_DEPLOYMENT_CONFIG'
        }, { status: 400 });
      }
      
      if (deployResponse.status === 401) {
        return NextResponse.json({
          error: 'Invalid Vercel token',
          code: 'INVALID_TOKEN'
        }, { status: 401 });
      }
      
      if (deployResponse.status === 403) {
        return NextResponse.json({
          error: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS'
        }, { status: 403 });
      }
      
      if (deployResponse.status === 429) {
        return NextResponse.json({
          error: 'Rate limit exceeded. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED'
        }, { status: 429 });
      }

      return NextResponse.json({
        error: errorData.error?.message || 'Failed to trigger deployment',
        code: errorData.error?.code || 'DEPLOYMENT_FAILED'
      }, { status: deployResponse.status });
    }

    const deployment = await deployResponse.json();

    // Update workspace metadata in storage
    if (workspaceId) {
      try {
        // Update workspace with latest deployment info
        await storageManager.updateWorkspace(workspaceId, {
          vercelDeploymentUrl: `https://${deployment.url}`,
          deploymentStatus: 'deployed',
          updatedAt: new Date().toISOString(),
        });
      } catch (storageError) {
        console.error('Failed to update project metadata:', storageError);
        // Continue even if storage fails
      }
    }

    // Return deployment information
    return NextResponse.json({
      success: true,
      deploymentId: deployment.uid,
      deploymentUrl: `https://${deployment.url}`,
      status: deployment.readyState || 'BUILDING',
      inspectorUrl: deployment.inspectorUrl || `https://vercel.com/${project.name}/${deployment.uid}`,
      target: target,
      branch: branch,
      createdAt: deployment.createdAt,
      projectId: projectId,
      projectName: project.name,
    });

  } catch (error) {
    console.error('Deployment trigger error:', error);
    return NextResponse.json({ 
      error: 'Failed to trigger deployment',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}
