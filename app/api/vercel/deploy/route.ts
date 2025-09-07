import { NextRequest, NextResponse } from 'next/server';
import { storageManager } from '@/lib/storage-manager';

/**
 * Vercel Deployment API - Git-Only Deployment
 *
 * This endpoint creates Vercel projects with GitHub repository integration.
 * It does NOT support file-based deployments - only Git-based deployments are allowed.
 *
 * Required parameters:
 * - projectName: Name for the Vercel project
 * - token: Vercel personal access token
 * - workspaceId: Project workspace ID
 * - githubRepo: GitHub repository in "owner/repo" format
 * - environmentVariables: Array of env vars to add to the project
 */

export async function POST(request: NextRequest) {
  try {
    const { projectName, framework, token, workspaceId, githubRepo, environmentVariables } = await request.json();

    if (!projectName || !token || !workspaceId || !githubRepo) {
      return NextResponse.json({
        error: 'Project name, token, workspace ID, and GitHub repository are required'
      }, { status: 400 });
    }

    // Validate project name format
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(projectName)) {
      return NextResponse.json({
        error: 'Project name contains invalid characters. Only lowercase letters, numbers, and hyphens are allowed. Cannot start or end with a hyphen.',
        code: 'INVALID_PROJECT_NAME'
      }, { status: 400 });
    }

    if (projectName.length > 52) {
      return NextResponse.json({
        error: 'Project name is too long. Maximum 52 characters allowed.',
        code: 'PROJECT_NAME_TOO_LONG'
      }, { status: 400 });
    }

    if (projectName.length < 1) {
      return NextResponse.json({
        error: 'Project name is required.',
        code: 'PROJECT_NAME_TOO_SHORT'
      }, { status: 400 });
    }

    // Validate GitHub repo format
    if (!/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/.test(githubRepo)) {
      return NextResponse.json({
        error: 'Invalid GitHub repository format. Use format: owner/repo',
        code: 'INVALID_GITHUB_REPO'
      }, { status: 400 });
    }

    // Create Vercel project
    const createProjectResponse = await fetch('https://api.vercel.com/v10/projects', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: projectName,
        framework: framework || 'nextjs',
        gitRepository: githubRepo ? {
          type: 'github',
          repo: githubRepo,
        } : undefined,
      }),
    });

    if (!createProjectResponse.ok) {
      const errorData = await createProjectResponse.json();
      console.error('Vercel project creation error:', errorData);

      // Handle specific error cases
      if (createProjectResponse.status === 400) {
        if (errorData.error?.message?.includes('already exists')) {
          return NextResponse.json({
            error: `Project name "${projectName}" already exists. Please choose a different name.`,
            suggestion: `Try using "${projectName}-app" or "${projectName}-${Date.now().toString().slice(-4)}"`,
            code: 'DUPLICATE_PROJECT_NAME'
          }, { status: 400 });
        }
        if (errorData.error?.message?.includes('invalid name')) {
          return NextResponse.json({
            error: 'Project name format is invalid. Use only lowercase letters, numbers, and hyphens.',
            code: 'INVALID_PROJECT_NAME'
          }, { status: 400 });
        }
      }

      if (createProjectResponse.status === 401) {
        return NextResponse.json({
          error: 'Invalid Vercel token. Please check your personal access token.',
          code: 'INVALID_TOKEN'
        }, { status: 401 });
      }

      if (createProjectResponse.status === 403) {
        return NextResponse.json({
          error: 'Insufficient permissions. Your token may not have the required scopes.',
          code: 'INSUFFICIENT_PERMISSIONS'
        }, { status: 403 });
      }

      if (createProjectResponse.status === 429) {
        return NextResponse.json({
          error: 'Rate limit exceeded. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED'
        }, { status: 429 });
      }

      return NextResponse.json({
        error: errorData.error?.message || 'Failed to create Vercel project',
        code: 'UNKNOWN_ERROR'
      }, { status: createProjectResponse.status });
    }

    const projectData = await createProjectResponse.json();

    // Add environment variables if provided
    if (environmentVariables && environmentVariables.length > 0) {
      for (const envVar of environmentVariables) {
        try {
          await fetch(`https://api.vercel.com/v10/projects/${projectData.id}/env`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              key: envVar.key,
              value: envVar.value,
              type: 'plain',
              target: ['production'],
            }),
          });
        } catch (envError) {
          console.error(`Failed to add environment variable ${envVar.key}:`, envError);
          // Continue with deployment even if env var fails
        }
      }
    }

    // Return project info with GitHub integration
    return NextResponse.json({
      url: `https://${projectData.name}.vercel.app`,
      projectId: projectData.id,
      commitSha: `vercel_project_${Date.now()}`,
      status: 'ready',
    });

  } catch (error) {
    console.error('Vercel deployment error:', error);
    return NextResponse.json({ error: 'Failed to deploy to Vercel' }, { status: 500 });
  }
}
