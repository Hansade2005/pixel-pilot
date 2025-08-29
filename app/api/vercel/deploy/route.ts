import { NextRequest, NextResponse } from 'next/server';
import { storageManager } from '@/lib/storage-manager';

export async function POST(request: NextRequest) {
  try {
    const { projectName, framework, token, workspaceId, githubRepo, files } = await request.json();

    if (!projectName || !token || !workspaceId) {
      return NextResponse.json({
        error: 'Project name, token, and workspace ID are required'
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
      return NextResponse.json({
        error: errorData.error?.message || 'Failed to create Vercel project'
      }, { status: createProjectResponse.status });
    }

    const projectData = await createProjectResponse.json();

    // If no GitHub repo provided, deploy files directly
    if (!githubRepo) {
      // Create deployment with files
      const formData = new FormData();

      // Add project files
      for (const file of projectFiles) {
        if (!file.isDirectory && file.content) {
          const blob = new Blob([file.content], { type: 'text/plain' });
          formData.append(`files[${file.path}]`, blob);
        }
      }

      // Add deployment configuration
      formData.append('name', projectName);
      formData.append('project', projectData.id);
      formData.append('target', 'production');

      const deployResponse = await fetch('https://api.vercel.com/v13/deployments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!deployResponse.ok) {
        const errorData = await deployResponse.json();
        console.error('Vercel deployment error:', errorData);
        return NextResponse.json({
          error: errorData.error?.message || 'Failed to deploy to Vercel'
        }, { status: deployResponse.status });
      }

      const deployData = await deployResponse.json();

      return NextResponse.json({
        url: deployData.url,
        projectId: projectData.id,
        deploymentId: deployData.id,
        commitSha: deployData.meta?.githubCommitSha || `vercel_${Date.now()}`,
        status: 'ready',
      });
    }

    // If GitHub repo provided, just return project info
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
