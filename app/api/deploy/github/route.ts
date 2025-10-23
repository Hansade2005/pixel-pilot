import { Octokit } from '@octokit/rest'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const { projectId, githubToken, repoName, repoDescription, files, mode, existingRepo, commitMessage } = await req.json()
    
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

    let repo;
    let isNewRepo = false;

    if ((mode === 'push' || mode === 'existing') && existingRepo) {
      // Push to existing repository
      const [owner, repo_name] = existingRepo.split('/');
      repo = { full_name: existingRepo, name: repo_name, owner: { login: owner }, html_url: `https://github.com/${existingRepo}` };
      console.log(`Pushing ${files.length} files to existing repository: ${existingRepo} (mode: ${mode})`)
    } else if (mode === 'create') {
      // Create new repository
      isNewRepo = true;
      console.log(`Creating GitHub repository with ${files.length} files`)

      // Create GitHub repository
      const { data: createdRepo } = await octokit.rest.repos.createForAuthenticatedUser({
        name: repoName,
        description: repoDescription || 'Created with PiPilot',
        private: false,
        auto_init: true, // Initialize with README to avoid empty repo issues
      })
      repo = createdRepo;
      console.log(`Repository created successfully: ${repo.full_name}`)
    } else {
      return Response.json({
        error: 'Invalid deployment mode or missing repository information',
        details: `Mode: ${mode}, existingRepo: ${existingRepo}`
      }, { status: 400 })
    }

    try {
      if (isNewRepo) {
        // For new repositories initialized with auto_init: true, we need to get the existing commit
        const { data: ref } = await octokit.rest.git.getRef({
          owner: githubUser.login,
          repo: repo.name,
          ref: 'heads/main',
        });

        const { data: latestCommit } = await octokit.rest.git.getCommit({
          owner: githubUser.login,
          repo: repo.name,
          commit_sha: ref.object.sha,
        });

        // Create tree with all files for new repo
        const tree = await Promise.all(
          files
            .filter(file => file.content && file.content.trim().length > 0) // Filter out empty files
            .map(async (file) => ({
              path: file.path.startsWith('/') ? file.path.slice(1) : file.path,
              mode: '100644' as const,
              type: 'blob' as const,
              content: file.content || '',
            }))
        )

        // Ensure we have at least one file
        if (tree.length === 0) {
          tree.push({
            path: 'README.md',
            mode: '100644' as const,
            type: 'blob' as const,
            content: `# ${repoName}\n\nCreated with PiPilot`,
          })
        }

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

        // Create tree based on the existing commit
        const { data: createdTree } = await octokit.rest.git.createTree({
          owner: githubUser.login,
          repo: repo.name,
          tree,
          base_tree: latestCommit.tree.sha, // Use the existing tree as base
        })

        // Create commit
        const { data: commit } = await octokit.rest.git.createCommit({
          owner: githubUser.login,
          repo: repo.name,
          message: commitMessage || 'Initial commit from PiPilot',
          tree: createdTree.sha,
          parents: [ref.object.sha], // Reference the existing commit
          author: {
            name: 'PiPilot Bot',
            email: 'bot@pipilot.dev'
          }
        })

        // Update main branch to point to our new commit
        await octokit.rest.git.updateRef({
          owner: githubUser.login,
          repo: repo.name,
          ref: 'heads/main',
          sha: commit.sha,
        })
      } else {
        // Push to existing repository
        const [owner, repoName] = repo.full_name.split('/');

        // Get the latest commit on main branch
        const { data: ref } = await octokit.rest.git.getRef({
          owner,
          repo: repoName,
          ref: 'heads/main',
        });

        // Get the commit data
        const { data: commitData } = await octokit.rest.git.getCommit({
          owner,
          repo: repoName,
          commit_sha: ref.object.sha,
        });

        // Create new tree with updated files
        const tree = await Promise.all(
          files.map(async (file) => ({
            path: file.path.startsWith('/') ? file.path.slice(1) : file.path,
            mode: '100644' as const,
            type: 'blob' as const,
            content: file.content || '',
          }))
        );

        // Create tree
        const { data: createdTree } = await octokit.rest.git.createTree({
          owner,
          repo: repoName,
          tree,
          base_tree: commitData.tree.sha,
        });

        // Create commit
        const { data: commit } = await octokit.rest.git.createCommit({
          owner,
          repo: repoName,
          message: commitMessage || 'Update from PiPilot',
          tree: createdTree.sha,
          parents: [ref.object.sha],
          author: {
            name: 'PiPilot Bot',
            email: 'bot@pipilot.dev'
          }
        });

        // Update main branch
        await octokit.rest.git.updateRef({
          owner,
          repo: repoName,
          ref: 'heads/main',
          sha: commit.sha,
        });
      }

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
