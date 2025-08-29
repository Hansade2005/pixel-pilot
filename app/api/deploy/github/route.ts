import { Octokit } from '@octokit/rest'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const { projectId, githubToken, repoName, repoDescription, files } = await req.json()
    
    // Get user from Supabase
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return new Response('Unauthorized', { status: 401 })
    }

    // IndexedDB is only available in browser context, not server-side
  // Client-side code now pulls tokens from IndexedDB and passes them explicitly with each request
  // This solves the issue of server not being able to access IndexedDB
  let actualGitHubToken = githubToken
    
    if (!actualGitHubToken || actualGitHubToken === 'stored') {
      return Response.json({ 
        error: 'Missing GitHub token',
        details: 'Please provide your GitHub token with the request. Server cannot access client-side IndexedDB.'
      }, { status: 400 })
    }

    if (!actualGitHubToken) {
      return Response.json({ error: 'GitHub token is required' }, { status: 400 })
    }

    // Validate files array
    if (!files || !Array.isArray(files) || files.length === 0) {
      return Response.json({ error: 'Files array is required' }, { status: 400 })
    }

    // Initialize Octokit with user's token
    const octokit = new Octokit({
      auth: actualGitHubToken,
    })

    // Get user's GitHub info
    const { data: githubUser } = await octokit.rest.users.getAuthenticated()

    console.log(`Creating GitHub repository with ${files.length} files`)

    // Create GitHub repository
    const { data: repo } = await octokit.rest.repos.createForAuthenticatedUser({
      name: repoName,
      description: repoDescription || 'Created with AI App Builder',
      private: false,
      auto_init: false,
    })

    try {
      // Create initial commit with all files
      const tree = await Promise.all(
        files.map(async (file) => ({
          path: file.path.startsWith('/') ? file.path.slice(1) : file.path,
          mode: '100644' as const,
          type: 'blob' as const,
          content: file.content || '',
        }))
      )

      // Add essential config files if not present
      const hasPackageJson = files.some(f => f.path === '/package.json' || f.path === 'package.json')
      if (!hasPackageJson) {
        tree.push({
          path: 'package.json',
          mode: '100644',
          type: 'blob',
          content: JSON.stringify({
            name: repoName,
            version: '0.1.0',
            private: true,
            scripts: {
              dev: 'next dev',
              build: 'next build',
              start: 'next start',
              lint: 'next lint'
            },
            dependencies: {
              'next': '^14.0.0',
              'react': '^18.0.0',
              'react-dom': '^18.0.0',
              '@types/node': '^20.0.0',
              '@types/react': '^18.0.0',
              '@types/react-dom': '^18.0.0',
              'typescript': '^5.0.0',
              'tailwindcss': '^3.3.0',
              'autoprefixer': '^10.4.0',
              'postcss': '^8.4.0'
            }
          }, null, 2),
        })
      }

      const hasNextConfig = files.some(f => f.path.includes('next.config'))
      if (!hasNextConfig) {
        tree.push({
          path: 'next.config.js',
          mode: '100644',
          type: 'blob',
          content: `/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
}

module.exports = nextConfig`,
        })
      }

      // Create tree
      const { data: createdTree } = await octokit.rest.git.createTree({
        owner: githubUser.login,
        repo: repo.name,
        tree,
      })

      // Create commit
      const { data: commit } = await octokit.rest.git.createCommit({
        owner: githubUser.login,
        repo: repo.name,
        message: 'Initial commit from AI App Builder',
        tree: createdTree.sha,
      })

      // Update main branch
      await octokit.rest.git.createRef({
        owner: githubUser.login,
        repo: repo.name,
        ref: 'refs/heads/main',
        sha: commit.sha,
      })

      // Token storage is now handled client-side in IndexedDB
      // No need to store the token in Supabase anymore

      // Note: Workspace metadata updates should be handled client-side
      // The client should update IndexedDB with repository info after successful deployment

      return Response.json({
        repoUrl: repo.html_url,
        repoName: repo.full_name,
        cloneUrl: repo.clone_url,
      })

    } catch (error) {
      // If there's an error after repo creation, try to delete the repo
      try {
        await octokit.rest.repos.delete({
          owner: githubUser.login,
          repo: repo.name,
        })
      } catch (deleteError) {
        console.error('Failed to cleanup repo after error:', deleteError)
      }
      throw error
    }

  } catch (error) {
    console.error('GitHub deploy error:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        return Response.json({ error: 'Repository name already exists' }, { status: 409 })
      }
      if (error.message.includes('Bad credentials')) {
        return Response.json({ error: 'Invalid GitHub token' }, { status: 401 })
      }
    }
    
    return Response.json({ error: 'Failed to deploy to GitHub' }, { status: 500 })
  }
}
