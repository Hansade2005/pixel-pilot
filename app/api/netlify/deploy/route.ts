import { NextRequest, NextResponse } from 'next/server';
import { storageManager } from '@/lib/storage-manager';

export async function POST(request: NextRequest) {
  try {
    const { siteName, buildCommand, publishDir, token, workspaceId, githubRepo } = await request.json();

    if (!siteName || !token || !workspaceId) {
      return NextResponse.json({
        error: 'Site name, token, and workspace ID are required'
      }, { status: 400 });
    }

    // Initialize storage manager
    await storageManager.init();

    // Get workspace files for deployment
    const files = await storageManager.getFiles(workspaceId);

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files found in workspace' }, { status: 400 });
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
      return NextResponse.json({
        error: errorData.message || 'Failed to create Netlify site'
      }, { status: createSiteResponse.status });
    }

    const siteData = await createSiteResponse.json();

    // If no GitHub repo provided, deploy files directly
    if (!githubRepo) {
      // Prepare files for deployment
      const deployFiles: Record<string, { content: string; encoding: string }> = {};
      for (const file of files) {
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
