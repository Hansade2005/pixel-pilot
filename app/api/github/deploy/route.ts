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

    // Get authenticated user info first
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!userResponse.ok) {
      return NextResponse.json({ error: 'Invalid GitHub token' }, { status: 401 });
    }

    const userData = await userResponse.json();
    const actualRepoOwner = userData.login;

    // Get the latest commit SHA from the repository
    const commitsResponse = await fetch(`https://api.github.com/repos/${actualRepoOwner}/${repoName}/commits`, {
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
    const commitResponse = await fetch(`https://api.github.com/repos/${actualRepoOwner}/${repoName}/commits/${latestCommitSha}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!commitResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch commit data' }, { status: 400 });
    }

    const commitData = await commitResponse.json();
    const treeSha = commitData.commit.tree.sha;

    // Create blobs for each file
    const blobs = [];
    for (const file of files) {
      if (file.isDirectory) continue; // Skip directories

      try {
        const content = file.content || '';
        console.log(`Processing file: ${file.path}, size: ${content.length} characters`);

        const blobResponse = await fetch(`https://api.github.com/repos/${actualRepoOwner}/${repoName}/git/blobs`, {
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
          const errorData = await blobResponse.json();
          console.error(`Failed to create blob for ${file.path}:`, errorData);
          continue; // Skip this file but continue with others
        }

        const blobData = await blobResponse.json();
        blobs.push({
          path: file.path,
          mode: '100644', // Regular file
          type: 'blob',
          sha: blobData.sha,
        });

        console.log(`Successfully created blob for ${file.path}`);
      } catch (error) {
        console.error(`Error processing file ${file.path}:`, error);
        continue; // Skip this file but continue with others
      }
    }

    console.log(`Created ${blobs.length} blobs out of ${files.filter(f => !f.isDirectory).length} files`);

    if (blobs.length === 0) {
      return NextResponse.json({ error: 'No valid files to upload' }, { status: 400 });
    }

    // Create a new tree
    console.log('Creating new Git tree...');
    const treeResponse = await fetch(`https://api.github.com/repos/${actualRepoOwner}/${repoName}/git/trees`, {
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
      console.error('Tree creation error:', errorData);
      return NextResponse.json({ error: 'Failed to create tree: ' + errorData.message }, { status: 400 });
    }

    const treeData = await treeResponse.json();
    console.log('Tree created successfully:', treeData.sha);

    // Create a new commit
    console.log('Creating new commit...');
    const commitMessage = `Deploy project files - ${new Date().toISOString()}`;
    const newCommitResponse = await fetch(`https://api.github.com/repos/${actualRepoOwner}/${repoName}/git/commits`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: commitMessage,
        tree: treeData.sha,
        parents: [latestCommitSha],
      }),
    });

    if (!newCommitResponse.ok) {
      const errorData = await newCommitResponse.json();
      console.error('Commit creation error:', errorData);
      return NextResponse.json({ error: 'Failed to create commit: ' + errorData.message }, { status: 400 });
    }

    const newCommitData = await newCommitResponse.json();
    console.log('Commit created successfully:', newCommitData.sha);

    // Update the branch reference
    console.log('Updating branch reference...');
    const refResponse = await fetch(`https://api.github.com/repos/${actualRepoOwner}/${repoName}/git/refs/heads/main`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sha: newCommitData.sha,
      }),
    });

    if (!refResponse.ok) {
      const errorData = await refResponse.json();
      console.error('Branch update error:', errorData);
      return NextResponse.json({ error: 'Failed to update branch: ' + errorData.message }, { status: 400 });
    }

    console.log('Branch updated successfully');
    console.log(`Deployment complete! ${blobs.length} files uploaded to ${actualRepoOwner}/${repoName}`);

    return NextResponse.json({
      success: true,
      commitSha: newCommitData.sha,
      commitMessage: commitMessage,
      filesUploaded: blobs.length,
    });

  } catch (error) {
    console.error('GitHub deployment error:', error);
    return NextResponse.json({ error: 'Failed to deploy to GitHub' }, { status: 500 });
  }
}
