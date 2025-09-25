import { NextRequest, NextResponse } from 'next/server';
import { storageManager } from '@/lib/storage-manager';
import { Octokit } from '@octokit/rest';

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
 * - githubToken: GitHub personal access token
 * - environmentVariables: Array of env vars to add to the project
 */

export async function POST(request: NextRequest) {
  try {
    const { projectName, framework, token, workspaceId, githubRepo, githubToken, environmentVariables, mode, existingProjectId } = await request.json();

    if (!token || !workspaceId || !githubRepo || !githubToken) {
      return NextResponse.json({
        error: 'Token, workspace ID, GitHub repository, and GitHub token are required'
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

    let projectData;
    let deploymentData;

    if (mode === 'redeploy' && existingProjectId) {
      // Redeploy to existing project
      console.log(`Redeploying to existing Vercel project: ${existingProjectId}`);

      // Trigger new deployment from main branch
      const deployResponse = await fetch('https://api.vercel.com/v13/deployments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: existingProjectId, // Use project ID for redeployment
          gitSource: {
            type: 'github',
            repo: githubRepo,
            ref: 'main',
          },
          projectSettings: {
            framework: framework || 'vite',
          },
        }),
      });

      if (!deployResponse.ok) {
        const errorData = await deployResponse.json();
        console.error('Vercel redeployment error:', errorData);
        return NextResponse.json({
          error: errorData.error?.message || 'Failed to trigger redeployment',
          code: 'REDEPLOYMENT_FAILED'
        }, { status: deployResponse.status });
      }

      deploymentData = await deployResponse.json();

      // Get project info
      const projectResponse = await fetch(`https://api.vercel.com/v10/projects/${existingProjectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (projectResponse.ok) {
        projectData = await projectResponse.json();
      } else {
        // Fallback if we can't get project data
        projectData = { id: existingProjectId, name: existingProjectId };
      }
    } else {
      // Create new project
      if (!projectName) {
        return NextResponse.json({
          error: 'Project name is required for new deployments'
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

      // Create Vercel project
      const createProjectResponse = await fetch('https://api.vercel.com/v10/projects', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: projectName,
          framework: framework || 'vite',
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

      projectData = await createProjectResponse.json();
    }

    // Add environment variables if provided (only for new projects)
    if (environmentVariables && environmentVariables.length > 0 && mode !== 'redeploy') {
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

    // For redeployment, we already have deploymentData from the trigger above
    if (mode !== 'redeploy') {
      // Trigger deployment by pushing a dummy commit to GitHub (only for new projects)
      try {
        const octokit = new Octokit({
          auth: githubToken,
        });

        const [owner, repo] = githubRepo.split('/');

        // Get the latest commit on main branch
        const { data: ref } = await octokit.rest.git.getRef({
          owner,
          repo,
          ref: 'heads/main',
        });

        // Create a dummy commit by updating a file or creating an empty commit
        // We'll create/update a .vercel-trigger file to trigger the webhook
        const triggerFilePath = '.vercel-deployment-trigger';
        const triggerContent = `Triggered at ${new Date().toISOString()}\n`;

        // Check if file exists
        let sha;
        try {
          const { data: existingFile } = await octokit.rest.repos.getContent({
            owner,
            repo,
            path: triggerFilePath,
          });
          sha = (existingFile as any).sha;
        } catch (error) {
          // File doesn't exist, sha will be undefined
        }

        // Create or update the trigger file
        const { data: updatedFile } = await octokit.rest.repos.createOrUpdateFileContents({
          owner,
          repo,
          path: triggerFilePath,
          message: 'Trigger Vercel deployment',
          content: Buffer.from(triggerContent).toString('base64'),
          sha,
          branch: 'main',
        });

        console.log('Successfully triggered deployment by updating file:', updatedFile.commit.sha);

      } catch (triggerError) {
        console.error('Failed to trigger deployment:', triggerError);
        // Don't fail the entire deployment if trigger fails
      }
    }

    // For redeployment, wait for deployment to complete and get final URL
    let finalDeploymentUrl = null;
    if (mode === 'redeploy' && deploymentData) {
      // Wait for deployment to complete (with timeout)
      const maxWaitTime = 300000; // 5 minutes
      const checkInterval = 10000; // 10 seconds
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitTime) {
        try {
          const statusResponse = await fetch(`https://api.vercel.com/v13/deployments/${deploymentData.uid}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            if (statusData.readyState === 'READY') {
              finalDeploymentUrl = `https://${statusData.url}`;
              break;
            } else if (statusData.readyState === 'ERROR') {
              console.error('Deployment failed:', statusData);
              break;
            }
          }
        } catch (error) {
          console.error('Error checking deployment status:', error);
        }

        await new Promise(resolve => setTimeout(resolve, checkInterval));
      }
    }

    // Return project info with GitHub integration
    return NextResponse.json({
      url: finalDeploymentUrl || `https://${projectData.name}.vercel.app`,
      projectId: projectData.id,
      deploymentId: deploymentData?.uid,
      commitSha: deploymentData?.meta?.githubCommitSha || `vercel_project_${Date.now()}`,
      status: mode === 'redeploy' ? 'ready' : 'ready',
    });

  } catch (error) {
    console.error('Vercel deployment error:', error);
    return NextResponse.json({ error: 'Failed to deploy to Vercel' }, { status: 500 });
  }
}
