import { NextRequest, NextResponse } from 'next/server';
import { storageManager } from '@/lib/storage-manager';

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
    const { siteName, buildCommand, publishDir, token, workspaceId, githubRepo, environmentVariables } = await request.json();

    if (!siteName || !token || !workspaceId || !githubRepo) {
      return NextResponse.json({
        error: 'Site name, token, workspace ID, and GitHub repository are required'
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
          cmd: buildCommand || 'npm run build',
          dir: publishDir || 'dist',
        },
        repo: githubRepo ? {
          provider: 'github',
          repo_path: githubRepo,
          repo_branch: 'main',
          cmd: buildCommand || 'npm run build',
          dir: publishDir || 'dist',
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
      url: siteData.url,
      siteId: siteData.id,
      commitSha: `netlify_site_${Date.now()}`,
      status: 'ready',
      buildCommand: buildCommand || 'npm run build',
      publishDir: publishDir || 'dist',
    });

  } catch (error) {
    console.error('Netlify deployment error:', error);
    return NextResponse.json({ error: 'Failed to deploy to Netlify' }, { status: 500 });
  }
}
