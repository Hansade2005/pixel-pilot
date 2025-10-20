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

    if ((mode === 'existing' || mode === 'push') && existingRepo) {
      // Push to existing repository
      const [owner, repo_name] = existingRepo.split('/');
      repo = { full_name: existingRepo, name: repo_name, owner: { login: owner }, html_url: `https://github.com/${existingRepo}` };
      console.log(`Pushing ${files.length} files to existing repository: ${existingRepo}`)
    } else if (mode === 'new') {
      // Check if repository already exists - if so, switch to push mode
      try {
        const existingRepoData = await octokit.rest.repos.get({
          owner: githubUser.login,
          repo: repoName,
        })

        // Repository exists - switch to push mode
        console.log(`Repository "${repoName}" already exists, switching to push mode`)
        repo = existingRepoData.data;
        isNewRepo = false; // Treat as existing repo

      } catch (checkError: any) {
        // If error is 404, repository doesn't exist, which is good for new repo creation
        if (checkError.status !== 404) {
          console.error('Error checking repository existence:', checkError)
          return Response.json({ error: 'Failed to verify repository availability' }, { status: 500 })
        }

        // Repository doesn't exist, proceed with creation
        isNewRepo = true;
        console.log(`Creating GitHub repository with ${files.length} files`)

        try {
          // Create GitHub repository
          const { data: createdRepo } = await octokit.rest.repos.createForAuthenticatedUser({
            name: repoName,
            description: repoDescription || 'Created with PiPilot',
            private: false,
            auto_init: false,
          })
          repo = createdRepo;
        } catch (error: any) {
          console.error('GitHub repository creation error:', error)

          // Handle specific GitHub errors
          if (error.status === 422) {
            return Response.json({
              error: 'Repository creation failed: Repository name already exists on this account. Please choose a different name.'
            }, { status: 422 })
          }

          if (error.status === 401) {
            return Response.json({ error: 'Invalid GitHub token' }, { status: 401 })
          }

          if (error.status === 403) {
            return Response.json({ error: 'Insufficient permissions to create repository' }, { status: 403 })
          }

          return Response.json({ error: error.message || 'Failed to create repository' }, { status: error.status || 500 })
        }
      }
    } else {
      return Response.json({ error: 'Invalid deployment mode or missing repository information' }, { status: 400 })
    }

    try {
      if (isNewRepo) {
        // Create initial commit with all files for new repo
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
          message: commitMessage || 'Initial commit from PiPilot',
          tree: createdTree.sha,
        })

        // Update main branch
        await octokit.rest.git.createRef({
          owner: githubUser.login,
          repo: repo.name,
          ref: 'refs/heads/main',
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
      // If there's an error after repo creation, try to delete the repo (only for newly created repos)
      if (isNewRepo && repo) {
        try {
          await octokit.rest.repos.delete({
            owner: githubUser.login,
            repo: repo.name,
          })
        } catch (deleteError) {
          console.error('Failed to cleanup repo after error:', deleteError)
        }
      }
      throw error
    }

  } catch (error: any) {
    console.error('GitHub deploy error:', error)
    
    // Handle Octokit-specific errors
    if (error.status) {
      switch (error.status) {
        case 401:
          return Response.json({ 
            error: 'Invalid GitHub token. Please check your token and try again.' 
          }, { status: 401 })
        
        case 403:
          // Check for specific 403 reasons
          if (error.message?.includes('repository rules') || error.message?.includes('branch protection')) {
            return Response.json({ 
              error: 'Repository rules violation: This repository has branch protection rules that prevent direct pushes. Please disable branch protection temporarily or use a different repository.' 
            }, { status: 403 })
          }
          return Response.json({ 
            error: 'Access forbidden: You don\'t have permission to push to this repository.' 
          }, { status: 403 })
        
        case 404:
          return Response.json({ 
            error: 'Repository not found. Please check the repository name and your access permissions.' 
          }, { status: 404 })
        
        case 409:
          return Response.json({ 
            error: 'Repository conflict: The repository may have conflicting changes. Please try again.' 
          }, { status: 409 })
        
        case 422:
          // Handle validation errors
          if (error.errors && Array.isArray(error.errors)) {
            const errorMessages = error.errors.map((err: any) => err.message || err.code).join(', ')
            return Response.json({ 
              error: `Validation failed: ${errorMessages}` 
            }, { status: 422 })
          }
          return Response.json({ 
            error: 'Repository validation failed. Please check your repository settings.' 
          }, { status: 422 })
        
        case 429:
          return Response.json({ 
            error: 'GitHub rate limit exceeded. Please wait a few minutes and try again.' 
          }, { status: 429 })
      }
    }
    
    // Handle error message patterns
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase()
      
      // Handle repository already exists (shouldn't happen with our pre-check, but just in case)
      if (errorMessage.includes('already exists') || errorMessage.includes('name already exists')) {
        return Response.json({ 
          error: 'Repository name already exists. Please choose a different name.' 
        }, { status: 409 })
      }
      
      // Handle authentication errors
      if (errorMessage.includes('bad credentials') || errorMessage.includes('unauthorized')) {
        return Response.json({ 
          error: 'Invalid GitHub token. Please check your token and try again.' 
        }, { status: 401 })
      }
      
      // Handle repository rules violations
      if (errorMessage.includes('repository rules') || errorMessage.includes('branch protection') || errorMessage.includes('required status checks')) {
        return Response.json({ 
          error: 'Repository rules violation: This repository has branch protection rules that prevent direct pushes. Please disable branch protection temporarily or use a different repository.' 
        }, { status: 403 })
      }
      
      // Handle required reviews
      if (errorMessage.includes('required reviews') || errorMessage.includes('pull request required')) {
        return Response.json({ 
          error: 'Repository rules violation: This repository requires pull requests for changes. Please disable this rule temporarily or use a different repository.' 
        }, { status: 403 })
      }
      
      // Handle commit restrictions
      if (errorMessage.includes('commit restrictions') || errorMessage.includes('linear history') || errorMessage.includes('merge commits')) {
        return Response.json({ 
          error: 'Repository rules violation: This repository has commit restrictions that prevent direct pushes. Please adjust the repository rules or use a different repository.' 
        }, { status: 403 })
      }
      
      // Handle secret scanning alerts
      if (errorMessage.includes('secret scanning') || errorMessage.includes('potential security vulnerability')) {
        return Response.json({ 
          error: 'Security alert: Your code contains potential secrets or security vulnerabilities. Please review and remove any sensitive information before deploying.' 
        }, { status: 400 })
      }
      
      // Handle file path restrictions
      if (errorMessage.includes('file path restrictions') || errorMessage.includes('restricted files')) {
        return Response.json({ 
          error: 'Repository rules violation: Some files in your project are restricted by repository rules. Please check your repository settings.' 
        }, { status: 403 })
      }
      
      // Handle repository permissions
      if (errorMessage.includes('insufficient permissions') || errorMessage.includes('not authorized') || errorMessage.includes('access denied')) {
        return Response.json({ 
          error: 'Insufficient permissions: You don\'t have permission to push to this repository. Please check your access rights.' 
        }, { status: 403 })
      }
      
      // Handle empty repository or branch issues
      if (errorMessage.includes('no commits') || errorMessage.includes('empty repository')) {
        return Response.json({ 
          error: 'Repository is empty or has no commits. Please initialize the repository first.' 
        }, { status: 400 })
      }
      
      // Handle large file issues
      if (errorMessage.includes('file too large') || errorMessage.includes('too big')) {
        return Response.json({ 
          error: 'Some files are too large for GitHub. Please reduce file sizes or use Git LFS for large files.' 
        }, { status: 400 })
      }
      
      // Handle rate limiting
      if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
        return Response.json({ 
          error: 'GitHub rate limit exceeded. Please wait a few minutes and try again.' 
        }, { status: 429 })
      }
      
      // Generic GitHub API errors
      if (errorMessage.includes('validation failed') || errorMessage.includes('invalid')) {
        return Response.json({ 
          error: 'GitHub validation failed. Please check your repository settings and try again.' 
        }, { status: 400 })
      }
    }
    
    // Fallback error
    return Response.json({ 
      error: 'Failed to deploy to GitHub. Please check the server logs for more details.' 
    }, { status: 500 })
  }
}
