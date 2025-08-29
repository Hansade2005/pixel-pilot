import { NextRequest, NextResponse } from 'next/server';
import { storageManager } from '@/lib/storage-manager';

export async function POST(request: NextRequest) {
  try {
    const { repoName, repoOwner, token, workspaceId } = await request.json();

    if (!repoName || !repoOwner || !token || !workspaceId) {
      return NextResponse.json({
        error: 'Repository name, owner, token, and workspace ID are required'
      }, { status: 400 });
    }

    // Initialize storage manager
    await storageManager.init();

    // Get all files from the workspace
    const files = await storageManager.getFiles(workspaceId);

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files found in workspace' }, { status: 400 });
    }

    // Get the latest commit SHA from the repository
    const commitsResponse = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/commits`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!commitsResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch repository commits' }, { status: 400 });
    }

    const commits = await commitsResponse.json();
    const latestCommitSha = commits[0]?.sha;

    if (!latestCommitSha) {
      return NextResponse.json({ error: 'No commits found in repository' }, { status: 400 });
    }

    // Get the tree SHA for the latest commit
    const commitResponse = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/commits/${latestCommitSha}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    const commitData = await commitResponse.json();
    const treeSha = commitData.commit.tree.sha;

    // Create blobs for each file
    const blobs = [];
    for (const file of files) {
      if (file.isDirectory) continue; // Skip directories

      const content = file.content || '';
      const blobResponse = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/git/blobs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: Buffer.from(content).toString('base64'),
          encoding: 'base64',
        }),
      });

      if (!blobResponse.ok) {
        console.error(`Failed to create blob for ${file.path}`);
        continue;
      }

      const blobData = await blobResponse.json();
      blobs.push({
        path: file.path,
        mode: '100644',
        type: 'blob',
        sha: blobData.sha,
      });
    }

    // Create a new tree
    const treeResponse = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/git/trees`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        base_tree: treeSha,
        tree: blobs,
      }),
    });

    if (!treeResponse.ok) {
      const errorData = await treeResponse.json();
      return NextResponse.json({ error: 'Failed to create tree: ' + errorData.message }, { status: 400 });
    }

    const treeData = await treeResponse.json();

    // Create a new commit
    const newCommitResponse = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/git/commits`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `Deploy project files - ${new Date().toISOString()}`,
        tree: treeData.sha,
        parents: [latestCommitSha],
      }),
    });

    if (!newCommitResponse.ok) {
      const errorData = await newCommitResponse.json();
      return NextResponse.json({ error: 'Failed to create commit: ' + errorData.message }, { status: 400 });
    }
    // Update the branch reference
    const refResponse = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/git/refs/heads/main`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sha: commitData.sha,
      }),
    });

    if (!refResponse.ok) {
      const errorData = await refResponse.json();
      return NextResponse.json({ error: 'Failed to update branch: ' + errorData.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      commitSha: commitData.sha,
      commitMessage: commitData.message,
      filesUploaded: blobs.length,
    });

  } catch (error) {
    console.error('GitHub deployment error:', error);
    return NextResponse.json({ error: 'Failed to deploy to GitHub' }, { status: 500 });
  }
}
