import { NextRequest, NextResponse } from 'next/server';

/**
 * Get project details and configuration
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
    let apiUrl = `https://api.vercel.com/v9/projects/${params.projectId}`;
    if (teamId) {
      apiUrl += `?teamId=${teamId}`;
    }

    // Fetch project details
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
        error: errorData.error?.message || 'Failed to fetch project details',
        code: 'PROJECT_FETCH_FAILED'
      }, { status: response.status });
    }

    const project = await response.json();

    // Format response
    return NextResponse.json({
      id: project.id,
      name: project.name,
      accountId: project.accountId,
      framework: project.framework,
      
      // Git integration
      link: project.link ? {
        type: project.link.type,
        repo: project.link.repo,
        repoId: project.link.repoId,
        gitCredentialId: project.link.gitCredentialId,
        sourceless: project.link.sourceless,
        createdAt: project.link.createdAt,
        updatedAt: project.link.updatedAt,
      } : null,
      
      // Production deployment
      productionDeployment: project.latestDeployments?.[0] ? {
        id: project.latestDeployments[0].uid,
        url: `https://${project.latestDeployments[0].url}`,
        createdAt: project.latestDeployments[0].createdAt,
        ready: project.latestDeployments[0].ready,
      } : null,
      
      // Targets and domains
      targets: project.targets,
      
      // Build settings
      buildCommand: project.buildCommand,
      devCommand: project.devCommand,
      installCommand: project.installCommand,
      outputDirectory: project.outputDirectory,
      publicSource: project.publicSource,
      rootDirectory: project.rootDirectory,
      
      // Other settings
      nodeVersion: project.nodeVersion,
      commandForIgnoringBuildStep: project.commandForIgnoringBuildStep,
      sourceFilesOutsideRootDirectory: project.sourceFilesOutsideRootDirectory,
      
      // Auto assign custom domains
      autoAssignCustomDomains: project.autoAssignCustomDomains,
      
      // Timestamps
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      
      // Environment variables count (not values for security)
      environmentVariablesCount: project.env?.length || 0,
    });

  } catch (error) {
    console.error('Project fetch error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch project details',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}

/**
 * Update project settings
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { vercelToken, teamId, settings } = await request.json();

    if (!vercelToken || !settings) {
      return NextResponse.json({
        error: 'Vercel token and settings are required'
      }, { status: 400 });
    }

    // Build API URL
    let apiUrl = `https://api.vercel.com/v9/projects/${params.projectId}`;
    if (teamId) {
      apiUrl += `?teamId=${teamId}`;
    }

    // Update project
    const response = await fetch(apiUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json({
        error: errorData.error?.message || 'Failed to update project',
        code: 'PROJECT_UPDATE_FAILED'
      }, { status: response.status });
    }

    const project = await response.json();

    return NextResponse.json({
      success: true,
      project: {
        id: project.id,
        name: project.name,
        framework: project.framework,
        buildCommand: project.buildCommand,
        devCommand: project.devCommand,
        installCommand: project.installCommand,
        outputDirectory: project.outputDirectory,
        rootDirectory: project.rootDirectory,
        nodeVersion: project.nodeVersion,
        updatedAt: project.updatedAt,
      },
    });

  } catch (error) {
    console.error('Project update error:', error);
    return NextResponse.json({ 
      error: 'Failed to update project',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}
