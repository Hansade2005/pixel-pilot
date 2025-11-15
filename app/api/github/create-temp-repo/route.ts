import { NextRequest, NextResponse } from 'next/server'

interface FileObject {
  path: string
  content: string
}

interface GitHubFileObject {
  path: string
  content: string
  encoding: string
}

export async function POST(req: NextRequest) {
  try {
    const {
      repoName,
      files,
      fileTree,
      metadata,
      githubToken,
      isPrivate = true
    } = await req.json()

    if (!repoName || !files || !githubToken) {
      return NextResponse.json(
        { error: 'Missing required fields: repoName, files, githubToken' },
        { status: 400 }
      )
    }

    console.log(`[GitHub API] 🚀 Creating temporary repo: ${repoName}`)

    // Step 1: Create GitHub repository
    const createRepoResponse = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: repoName,
        description: `Temporary repository for PixelPilot AI processing - Created ${new Date().toISOString()}`,
        private: isPrivate,
        auto_init: false // We'll push files manually
      })
    })

    if (!createRepoResponse.ok) {
      const errorData = await createRepoResponse.json()
      console.error('[GitHub API] ❌ Repo creation failed:', errorData)
      return NextResponse.json(
        { error: `GitHub repo creation failed: ${errorData.message}` },
        { status: createRepoResponse.status }
      )
    }

    const repoData = await createRepoResponse.json()
    console.log(`[GitHub API] ✅ Repository created: ${repoData.html_url}`)

    // Step 2: Get authenticated user info for repo owner
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    })

    if (!userResponse.ok) {
      throw new Error('Failed to get GitHub user info')
    }

    const userData = await userResponse.json()
    const owner = userData.login

    // Step 3: Prepare files for GitHub (convert to base64)
    const gitHubFiles: GitHubFileObject[] = files.map((file: FileObject) => ({
      path: file.path,
      content: Buffer.from(file.content || '').toString('base64'),
      encoding: 'base64'
    }))

    // Add metadata file
    gitHubFiles.push({
      path: '__pixelpilot_metadata.json',
      content: Buffer.from(JSON.stringify({
        fileTree,
        metadata,
        createdAt: new Date().toISOString(),
        fileCount: files.length
      }, null, 2)).toString('base64'),
      encoding: 'base64'
    })

    // Step 4: Create initial commit with all files
    // First, create a tree with all files
    const createTreeResponse = await fetch(`https://api.github.com/repos/${owner}/${repoName}/git/trees`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tree: gitHubFiles.map(file => ({
          path: file.path,
          mode: '100644',
          type: 'blob',
          content: Buffer.from(file.content, 'base64').toString('utf-8')
        }))
      })
    })

    if (!createTreeResponse.ok) {
      const errorData = await createTreeResponse.json()
      console.error('[GitHub API] ❌ Tree creation failed:', errorData)
      throw new Error(`Failed to create git tree: ${errorData.message}`)
    }

    const treeData = await createTreeResponse.json()

    // Step 5: Create initial commit
    const createCommitResponse = await fetch(`https://api.github.com/repos/${owner}/${repoName}/git/commits`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Initial commit: PixelPilot temporary workspace (${files.length} files)`,
        tree: treeData.sha,
        parents: [] // Initial commit has no parents
      })
    })

    if (!createCommitResponse.ok) {
      const errorData = await createCommitResponse.json()
      console.error('[GitHub API] ❌ Commit creation failed:', errorData)
      throw new Error(`Failed to create initial commit: ${errorData.message}`)
    }

    const commitData = await createCommitResponse.json()

    // Step 6: Update main branch to point to the new commit
    const updateRefResponse = await fetch(`https://api.github.com/repos/${owner}/${repoName}/git/refs/heads/main`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ref: 'refs/heads/main',
        sha: commitData.sha
      })
    })

    if (!updateRefResponse.ok) {
      const errorData = await updateRefResponse.json()
      console.error('[GitHub API] ❌ Ref update failed:', errorData)
      throw new Error(`Failed to update main branch: ${errorData.message}`)
    }

    console.log(`[GitHub API] 🎉 Successfully created and populated repository: ${repoData.html_url}`)

    return NextResponse.json({
      success: true,
      repoName: repoData.name,
      repoUrl: repoData.html_url,
      repoApiUrl: repoData.url,
      owner,
      commitSha: commitData.sha,
      filesUploaded: gitHubFiles.length
    })

  } catch (error) {
    console.error('[GitHub API] ❌ Error creating temporary repo:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    )
  }
}