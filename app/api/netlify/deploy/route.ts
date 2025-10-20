import { NextRequest, NextResponse } from 'next/server';
import { storageManager } from '@/lib/storage-manager';
import { Octokit } from '@octokit/rest';

/**
 * Netlify Deployment API - Git-Only Deployment
 *
 * This endpoint creates Netlify sites with GitHub repository integration.
 * It does NOT support file-based deployments - only Git-based deployments are allowed.
 *
 * Required parameters:
 * - siteName: Name for the Netlify site
 * - buildCommand: Build command (e.g., "npm run build")
 * - publishDir: Publish directory (e.g., "dist")
 * - token: Netlify personal access token
 * - workspaceId: Project workspace ID
 * - githubRepo: GitHub repository in "owner/repo" format
 * - environmentVariables: Array of env vars to add to the site
 */

export async function POST(request: NextRequest) {
  try {
    const { siteName, buildCommand, publishDir, token, workspaceId, githubRepo, environmentVariables, githubToken } = await request.json();

    if (!siteName || !token || !workspaceId || !githubRepo || !githubToken) {
      return NextResponse.json({
        error: 'Site name, token, workspace ID, GitHub repository, and GitHub token are required'
      }, { status: 400 });
    }

    // Validate site name format
    if (!/^[a-z0-9-]+$/.test(siteName)) {
      return NextResponse.json({
        error: 'Site name contains invalid characters. Only lowercase letters, numbers, and hyphens are allowed.',
        code: 'INVALID_SITE_NAME'
      }, { status: 400 });
    }

    if (siteName.length > 63) {
      return NextResponse.json({
        error: 'Site name is too long. Maximum 63 characters allowed.',
        code: 'SITE_NAME_TOO_LONG'
      }, { status: 400 });
    }

    if (siteName.length < 3) {
      return NextResponse.json({
        error: 'Site name is too short. Minimum 3 characters required.',
        code: 'SITE_NAME_TOO_SHORT'
      }, { status: 400 });
    }

    // Validate GitHub repo format
    if (!/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/.test(githubRepo)) {
      return NextResponse.json({
        error: 'Invalid GitHub repository format. Use format: owner/repo',
        code: 'INVALID_GITHUB_REPO'
      }, { status: 400 });
    }

    // Detect framework and build configuration from GitHub repository
    let detectedFramework = 'vite'; // Default
    let detectedBuildCommand = buildCommand || 'npm run build';
    let detectedPublishDir = publishDir || 'dist';

    try {
      const octokit = new Octokit({
        auth: githubToken,
      });

      const [owner, repo] = githubRepo.split('/');

      // Check for common framework indicators and their build configurations
      const frameworkChecks = [
        // Next.js
        {
          files: ['next.config.js', 'next.config.mjs', 'next.config.ts'],
          framework: 'nextjs',
          buildCommand: 'npm run build',
          publishDir: '.next' // Note: Next.js usually needs SSR, but for static export
        },
        // Nuxt.js
        {
          files: ['nuxt.config.js', 'nuxt.config.ts'],
          framework: 'nuxtjs',
          buildCommand: 'npm run build',
          publishDir: 'dist'
        },
        // Vite
        {
          files: ['vite.config.js', 'vite.config.ts', 'vite.config.mjs'],
          framework: 'vite',
          buildCommand: 'npm run build',
          publishDir: 'dist'
        },
        // Create React App
        {
          files: ['src/index.js', 'src/App.js'],
          checkContent: true,
          framework: 'create-react-app',
          buildCommand: 'npm run build',
          publishDir: 'build'
        },
        // Angular
        {
          files: ['angular.json'],
          framework: 'angular',
          buildCommand: 'ng build',
          publishDir: 'dist'
        },
        // Vue
        {
          files: ['vue.config.js'],
          framework: 'vue',
          buildCommand: 'npm run build',
          publishDir: 'dist'
        },
        // Svelte
        {
          files: ['svelte.config.js'],
          framework: 'svelte',
          buildCommand: 'npm run build',
          publishDir: 'public'
        },
        // Gatsby
        {
          files: ['gatsby-config.js'],
          framework: 'gatsby',
          buildCommand: 'npm run build',
          publishDir: 'public'
        },
        // Astro
        {
          files: ['astro.config.mjs', 'astro.config.js'],
          framework: 'astro',
          buildCommand: 'npm run build',
          publishDir: 'dist'
        },
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
                  detectedBuildCommand = check.buildCommand;
                  detectedPublishDir = check.publishDir;
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
              detectedBuildCommand = check.buildCommand;
              detectedPublishDir = check.publishDir;
              break;
            }
          } catch (error) {
            // File doesn't exist, continue checking
            continue;
          }
        }
        if (detectedFramework !== 'vite') break; // Break if we found a specific framework
      }

      // Fallback: check package.json for dependencies and scripts
      if (detectedFramework === 'vite') {
        try {
          const { data: packageJson } = await octokit.rest.repos.getContent({
            owner,
            repo,
            path: 'package.json',
          });

          if (packageJson && typeof packageJson === 'object' && 'content' in packageJson) {
            const content = JSON.parse(Buffer.from(packageJson.content as string, 'base64').toString());

            // Check dependencies
            const allDeps = { ...content.dependencies, ...content.devDependencies };

            if (allDeps['next']) {
              detectedFramework = 'nextjs';
              detectedBuildCommand = 'npm run build';
              detectedPublishDir = '.next';
            } else if (allDeps['nuxt']) {
              detectedFramework = 'nuxtjs';
              detectedBuildCommand = 'npm run build';
              detectedPublishDir = 'dist';
            } else if (allDeps['vite']) {
              detectedFramework = 'vite';
              detectedBuildCommand = 'npm run build';
              detectedPublishDir = 'dist';
            } else if (allDeps['@angular/core']) {
              detectedFramework = 'angular';
              detectedBuildCommand = 'ng build';
              detectedPublishDir = 'dist';
            } else if (allDeps['vue']) {
              detectedFramework = 'vue';
              detectedBuildCommand = 'npm run build';
              detectedPublishDir = 'dist';
            } else if (allDeps['svelte']) {
              detectedFramework = 'svelte';
              detectedBuildCommand = 'npm run build';
              detectedPublishDir = 'public';
            } else if (allDeps['gatsby']) {
              detectedFramework = 'gatsby';
              detectedBuildCommand = 'npm run build';
              detectedPublishDir = 'public';
            } else if (allDeps['astro']) {
              detectedFramework = 'astro';
              detectedBuildCommand = 'npm run build';
              detectedPublishDir = 'dist';
            } else if (allDeps['react']) {
              // Default to CRA for React apps
              detectedFramework = 'create-react-app';
              detectedBuildCommand = 'npm run build';
              detectedPublishDir = 'build';
            }

            // Check if there are custom build scripts
            if (content.scripts && content.scripts.build) {
              detectedBuildCommand = content.scripts.build;
            }
          }
        } catch (error) {
          console.log('Could not read package.json for framework detection');
        }
      }

      console.log(`Detected framework: ${detectedFramework}, build command: ${detectedBuildCommand}, publish dir: ${detectedPublishDir} for repo: ${githubRepo}`);

    } catch (error) {
      console.error('Error detecting framework and build config:', error);
      // Use provided values or defaults
      detectedBuildCommand = buildCommand || 'npm run build';
      detectedPublishDir = publishDir || 'dist';
    }

    // Create Netlify site
    const createSiteResponse = await fetch('https://api.netlify.com/api/v1/sites', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: siteName,
        build_settings: {
          cmd: detectedBuildCommand,
          dir: detectedPublishDir,
        },
        repo: githubRepo ? {
          provider: 'github',
          repo_path: githubRepo,
          repo_branch: 'main',
          cmd: detectedBuildCommand,
          dir: detectedPublishDir,
        } : undefined,
      }),
    });

    if (!createSiteResponse.ok) {
      const errorData = await createSiteResponse.json();
      console.error('Netlify site creation error:', errorData);

      // Handle specific error cases
      if (createSiteResponse.status === 422) {
        if (errorData.errors?.subdomain?.includes('must be unique')) {
          return NextResponse.json({
            error: `Site name "${siteName}" is already taken. Please choose a different site name.`,
            suggestion: `Try using "${siteName}-${Date.now()}" or "${siteName}-app"`,
            code: 'DUPLICATE_SITE_NAME'
          }, { status: 422 });
        }
        if (errorData.errors?.name?.includes('already exists')) {
          return NextResponse.json({
            error: `Site name "${siteName}" already exists. Please choose a different name.`,
            suggestion: `Try using "${siteName}-${Date.now()}" or "${siteName}-app"`,
            code: 'DUPLICATE_SITE_NAME'
          }, { status: 422 });
        }
      }

      if (createSiteResponse.status === 401) {
        return NextResponse.json({
          error: 'Invalid Netlify token. Please check your personal access token.',
          code: 'INVALID_TOKEN'
        }, { status: 401 });
      }

      if (createSiteResponse.status === 403) {
        return NextResponse.json({
          error: 'Insufficient permissions. Your token may not have the required scopes.',
          code: 'INSUFFICIENT_PERMISSIONS'
        }, { status: 403 });
      }

      return NextResponse.json({
        error: errorData.message || 'Failed to create Netlify site',
        code: 'UNKNOWN_ERROR'
      }, { status: createSiteResponse.status });
    }

    const siteData = await createSiteResponse.json();

    // Add environment variables if provided
    if (environmentVariables && environmentVariables.length > 0) {
      for (const envVar of environmentVariables) {
        try {
          await fetch(`https://api.netlify.com/api/v1/sites/${siteData.id}/env/${envVar.key}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              value: envVar.value,
              scopes: ['builds', 'functions', 'runtime'],
            }),
          });
        } catch (envError) {
          console.error(`Failed to add environment variable ${envVar.key}:`, envError);
          // Continue with deployment even if env var fails
        }
      }
    }

    // Return site info with GitHub integration
    return NextResponse.json({
      url: `https://app.netlify.com/sites/${siteName}`, // Dashboard URL for immediate access
      siteUrl: siteData.url, // Live site URL (may not be ready yet)
      siteId: siteData.id,
      commitSha: `netlify_site_${Date.now()}`,
      status: 'building', // Mark as building since deployment is in progress
      buildCommand: detectedBuildCommand,
      publishDir: detectedPublishDir,
      needsUrlUpdate: true, // Still need to poll for the actual live URL
    });

  } catch (error) {
    console.error('Netlify deployment error:', error);
    return NextResponse.json({ error: 'Failed to deploy to Netlify' }, { status: 500 });
  }
}
