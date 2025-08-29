import { NextRequest, NextResponse } from 'next/server';
import { storageManager } from '@/lib/storage-manager';

export async function POST(request: NextRequest) {
  try {
    const { siteName, buildCommand, publishDir, token, workspaceId, githubRepo, files } = await request.json();

    if (!siteName || !token || !workspaceId) {
      return NextResponse.json({
        error: 'Site name, token, and workspace ID are required'
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

    // Use provided files or fall back to storage manager
    let projectFiles = files;
    if (!projectFiles || !Array.isArray(projectFiles) || projectFiles.length === 0) {
      // Initialize storage manager and get files from workspace
      await storageManager.init();
      projectFiles = await storageManager.getFiles(workspaceId);

      if (projectFiles.length === 0) {
        return NextResponse.json({ error: 'No files found in workspace' }, { status: 400 });
      }
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

    // If no GitHub repo provided, deploy files directly
    if (!githubRepo) {
      // Prepare files for deployment
      const deployFiles: Record<string, { content: string; encoding: string }> = {};
      for (const file of projectFiles) {
        if (!file.isDirectory && file.content) {
          deployFiles[file.path] = {
            content: Buffer.from(file.content).toString('base64'),
            encoding: 'base64',
          };
        }
      }

      // Create deployment
      const deployResponse = await fetch(`https://api.netlify.com/api/v1/sites/${siteData.id}/deploys`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files: deployFiles,
          async: false,
        }),
      });

      if (!deployResponse.ok) {
        const errorData = await deployResponse.json();
        console.error('Netlify deployment error:', errorData);
        return NextResponse.json({
          error: errorData.message || 'Failed to deploy to Netlify'
        }, { status: deployResponse.status });
      }

      const deployData = await deployResponse.json();

      return NextResponse.json({
        url: deployData.url,
        siteId: siteData.id,
        deploymentId: deployData.id,
        commitSha: deployData.commit_sha || `netlify_${Date.now()}`,
        status: 'ready',
        buildCommand: buildCommand || 'npm run build',
        publishDir: publishDir || 'dist',
      });
    }

    // If GitHub repo provided, just return site info
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
