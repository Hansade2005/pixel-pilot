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

    // Detect framework from GitHub repository if not provided
    let detectedFramework = framework;
    if (!detectedFramework) {
      try {
        const octokit = new Octokit({
          auth: githubToken,
        });

        const [owner, repo] = githubRepo.split('/');

        // Check for common framework indicators
        const frameworkChecks = [
          // Next.js
          { files: ['next.config.js', 'next.config.mjs', 'next.config.ts'], framework: 'nextjs' },
          // Nuxt.js
          { files: ['nuxt.config.js', 'nuxt.config.ts'], framework: 'nuxtjs' },
          // Vite (check for vite.config files)
          { files: ['vite.config.js', 'vite.config.ts', 'vite.config.mjs'], framework: 'vite' },
          // Create React App
          { files: ['src/index.js', 'src/App.js'], checkContent: true, framework: 'create-react-app' },
          // Angular
          { files: ['angular.json'], framework: 'angular' },
          // Vue
          { files: ['vue.config.js'], framework: 'vue' },
          // Svelte
          { files: ['svelte.config.js'], framework: 'svelte' },
          // Gatsby
          { files: ['gatsby-config.js'], framework: 'gatsby' },
          // Astro
          { files: ['astro.config.mjs', 'astro.config.js'], framework: 'astro' },
        ];

        for (const check of frameworkChecks) {
          for (const file of check.files) {
            try {
              if (check.checkContent) {
                // For files that need content checking (like CRA)
                const { data: fileData } = await octokit.rest.repos.getContent({
                  owner,
                  repo,
                  path: file,
                });
                if (fileData && typeof fileData === 'object' && 'content' in fileData) {
                  const content = Buffer.from(fileData.content as string, 'base64').toString();
                  if (content.includes('ReactDOM.render') || content.includes('createRoot')) {
                    detectedFramework = check.framework;
                    break;
                  }
                }
              } else {
                // Simple file existence check
                await octokit.rest.repos.getContent({
                  owner,
                  repo,
                  path: file,
                });
                detectedFramework = check.framework;
                break;
              }
            } catch (error) {
              // File doesn't exist, continue checking
              continue;
            }
          }
          if (detectedFramework) break;
        }

        // Fallback: check package.json for dependencies
        if (!detectedFramework) {
          try {
            const { data: packageJson } = await octokit.rest.repos.getContent({
              owner,
              repo,
              path: 'package.json',
            });

            if (packageJson && typeof packageJson === 'object' && 'content' in packageJson) {
              const content = JSON.parse(Buffer.from(packageJson.content as string, 'base64').toString());

              // Check dependencies and devDependencies
              const allDeps = { ...content.dependencies, ...content.devDependencies };

              if (allDeps['next']) detectedFramework = 'nextjs';
              else if (allDeps['nuxt']) detectedFramework = 'nuxtjs';
              else if (allDeps['vite']) detectedFramework = 'vite';
              else if (allDeps['@angular/core']) detectedFramework = 'angular';
              else if (allDeps['vue']) detectedFramework = 'vue';
              else if (allDeps['svelte']) detectedFramework = 'svelte';
              else if (allDeps['gatsby']) detectedFramework = 'gatsby';
              else if (allDeps['astro']) detectedFramework = 'astro';
              else if (allDeps['react']) detectedFramework = 'create-react-app'; // Default to CRA for React apps
            }
          } catch (error) {
            console.log('Could not read package.json for framework detection');
          }
        }

        // Final fallback
        if (!detectedFramework) {
          detectedFramework = 'vite'; // Default fallback
        }

        console.log(`Detected framework: ${detectedFramework} for repo: ${githubRepo}`);

      } catch (error) {
        console.error('Error detecting framework:', error);
        detectedFramework = framework || 'vite'; // Use provided framework or fallback to vite
      }
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
            framework: detectedFramework,
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
          framework: detectedFramework,
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
      // Trigger deployment directly via Vercel API (instead of relying on GitHub webhooks)
      console.log(`Triggering deployment for new project: ${projectData.name}`);

      const deployResponse = await fetch('https://api.vercel.com/v13/deployments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: projectData.name, // Use project name for new deployments
          gitSource: {
            type: 'github',
            repo: githubRepo,
            ref: 'main',
          },
          projectSettings: {
            framework: detectedFramework,
          },
        }),
      });

      if (!deployResponse.ok) {
        const errorData = await deployResponse.json();
        console.error('Vercel deployment trigger error:', errorData);
        // Don't fail the entire process if deployment trigger fails
        // The project is created successfully, user can manually trigger deployment
      } else {
        deploymentData = await deployResponse.json();
        console.log('Successfully triggered deployment:', deploymentData.uid);
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
    // For new deployments, don't set URL initially - it will be fetched later
    return NextResponse.json({
      url: mode === 'redeploy' ? finalDeploymentUrl : null,
      projectId: projectData.id,
      deploymentId: deploymentData?.uid,
      commitSha: deploymentData?.meta?.githubCommitSha || `vercel_project_${Date.now()}`,
      status: mode === 'redeploy' ? 'ready' : 'building', // Mark as building for new deployments
      needsUrlUpdate: mode !== 'redeploy', // Flag to indicate URL needs to be fetched
    });

  } catch (error) {
    console.error('Vercel deployment error:', error);
    return NextResponse.json({ error: 'Failed to deploy to Vercel' }, { status: 500 });
  }
}
