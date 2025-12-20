import { Octokit } from '@octokit/rest'
import { createClient } from '@/lib/supabase/server'
import JSZip from 'jszip'
import lz4 from 'lz4js'

// Extract project files from compressed data (LZ4 + Zip)
async function extractProjectFromCompressedData(compressedData: ArrayBuffer): Promise<{
  projectId: string
  githubToken: string
  repoName: string
  repoDescription?: string
  files: any[]
  mode: string
  existingRepo?: string
  commitMessage: string
}> {
  // Step 1: LZ4 decompress
  const decompressedData = lz4.decompress(Buffer.from(compressedData))
  console.log(`[GitHub Deploy] LZ4 decompressed to ${decompressedData.length} bytes`)

  // Step 2: Unzip the data
  const zip = new JSZip()
  await zip.loadAsync(decompressedData)

  // Extract files from zip
  const extractedFiles: any[] = []
  for (const [path, zipEntry] of Object.entries(zip.files)) {
    if (!zipEntry.dir && path !== '__metadata__.json') {
      const content = await zipEntry.async('text')
      extractedFiles.push({
        path,
        content,
        name: path.split('/').pop() || path,
        type: path.split('.').pop() || 'text',
        size: content.length
      })
    }
  }

  console.log(`[GitHub Deploy] Extracted ${extractedFiles.length} files from zip`)

  // Parse metadata to get deployment info
  let projectId = `deploy-${Date.now()}`
  let githubToken = ''
  let repoName = ''
  let repoDescription = ''
  let mode = 'create'
  let existingRepo: string | undefined
  let commitMessage = 'Update project files'

  const metadataEntry = zip.file('__metadata__.json')
  if (metadataEntry) {
    const metadataContent = await metadataEntry.async('text')
    const metadata = JSON.parse(metadataContent)
    projectId = metadata.projectId || projectId
    githubToken = metadata.githubToken || githubToken
    repoName = metadata.repoName || repoName
    repoDescription = metadata.repoDescription || repoDescription
    mode = metadata.mode || mode
    existingRepo = metadata.existingRepo
    commitMessage = metadata.commitMessage || commitMessage
    console.log(`[GitHub Deploy] Loaded metadata, projectId: ${projectId}, mode: ${mode}`)
  }

  return {
    projectId,
    githubToken,
    repoName,
    repoDescription,
    files: extractedFiles,
    mode,
    existingRepo,
    commitMessage
  }
}

// List of file patterns to exclude from GitHub deployment (sensitive files)
const EXCLUDED_FILE_PATTERNS = [
  /^\.env$/i,
  /^\.env\.local$/i,
  /^\.env\.development$/i,
  /^\.env\.production$/i,
  /^\.env\.test$/i,
  /^\.env\..*\.local$/i,
  /^\.env\..*$/i,
  /^.*\/\.env$/i,
  /^.*\/\.env\.local$/i,
  /^.*\/\.env\..*$/i,
]

// Function to check if a file should be excluded
function shouldExcludeFile(filePath: string): boolean {
  const normalizedPath = filePath.startsWith('/') ? filePath.slice(1) : filePath
  const fileName = normalizedPath.split('/').pop() || ''
  
  return EXCLUDED_FILE_PATTERNS.some(pattern =>
    pattern.test(normalizedPath) || pattern.test(fileName)
  )
}

export async function POST(req: Request) {
  try {
    // Check content type to determine data format
    const contentType = req.headers.get('content-type') || ''
    let projectId: string
    let githubToken: string
    let repoName: string
    let repoDescription: string | undefined
    let files: any[]
    let mode: string
    let existingRepo: string | undefined
    let commitMessage: string

    if (contentType.includes('application/octet-stream')) {
      // Handle compressed data (LZ4 + Zip)
      console.log('[GitHub Deploy] 📦 Received compressed binary data')
      const compressedData = await req.arrayBuffer()
      const extractedData = await extractProjectFromCompressedData(compressedData)
      projectId = extractedData.projectId
      githubToken = extractedData.githubToken
      repoName = extractedData.repoName
      repoDescription = extractedData.repoDescription
      files = extractedData.files
      mode = extractedData.mode
      existingRepo = extractedData.existingRepo
      commitMessage = extractedData.commitMessage
    } else {
      // Handle JSON format (backward compatibility)
      console.log('[GitHub Deploy] 📄 Received JSON data')
      const jsonData = await req.json()
      projectId = jsonData.projectId
      githubToken = jsonData.githubToken
      repoName = jsonData.repoName
      repoDescription = jsonData.repoDescription
      files = jsonData.files
      mode = jsonData.mode
      existingRepo = jsonData.existingRepo
      commitMessage = jsonData.commitMessage
    }
    
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

        // Filter out sensitive files and empty files
        const excludedFiles: string[] = []
        const filteredFiles = files.filter(file => {
          if (!file.content || file.content.trim().length === 0) {
            return false // Skip empty files
          }
          if (shouldExcludeFile(file.path)) {
            excludedFiles.push(file.path)
            return false // Skip sensitive files
          }
          return true
        })
        
        if (excludedFiles.length > 0) {
          console.log(`[GitHub Deploy] Excluded ${excludedFiles.length} sensitive file(s) from deployment:`, excludedFiles)
        }
        
        // Create tree with filtered files for new repo
        const tree = await Promise.all(
          filteredFiles.map(async (file) => ({
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
            email: 'hello@pipilot.dev'
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

        // Filter out sensitive files
        const excludedFiles: string[] = []
        const filteredFiles = files.filter(file => {
          if (shouldExcludeFile(file.path)) {
            excludedFiles.push(file.path)
            return false
          }
          return true
        })
        
        if (excludedFiles.length > 0) {
          console.log(`[GitHub Deploy] Excluded ${excludedFiles.length} sensitive file(s) from deployment:`, excludedFiles)
        }
        
        // Create new tree with filtered files
        const tree = await Promise.all(
          filteredFiles.map(async (file) => ({
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
            email: 'hello@pipilot.dev'
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
    // Log error with detailed information
    if (error && typeof error === 'object') {
      const octokitError = error as any
      console.error('GitHub deploy error:', {
        message: octokitError.message || (error instanceof Error ? error.message : 'Unknown error'),
        status: octokitError.status,
        name: octokitError.name,
        request: octokitError.request ? {
          method: octokitError.request.method,
          url: octokitError.request.url,
          headers: octokitError.request.headers
        } : undefined,
        response: octokitError.response ? {
          status: octokitError.response.status,
          statusText: octokitError.response.statusText,
          data: octokitError.response.data,
          headers: octokitError.response.headers
        } : undefined,
        stack: error instanceof Error ? error.stack : undefined
      })
    } else {
      console.error('GitHub deploy error:', error)
    }
    
    // Extract detailed error information from Octokit errors
    let errorMessage = 'Failed to deploy to GitHub'
    let errorDetails: string | undefined
    let statusCode = 500
    
    if (error && typeof error === 'object') {
      // Check for Octokit HttpError with status and response
      const octokitError = error as any
      
      if (octokitError.status) {
        statusCode = octokitError.status
      }
      
      // Get error message
      if (octokitError.message) {
        errorMessage = octokitError.message
      } else if (error instanceof Error) {
        errorMessage = error.message
      }
      
      // Extract additional details from response
      if (octokitError.response?.data) {
        const responseData = octokitError.response.data
        const detailsParts: string[] = []
        
        // GitHub API error response structure
        if (responseData.message) {
          detailsParts.push(responseData.message)
        }
        
        // Include specific error details with enhanced formatting
        if (responseData.errors && Array.isArray(responseData.errors)) {
          const errorsList = responseData.errors.map((e: any, index: number) => {
            const parts: string[] = []
            
            // Error message
            if (e.message) {
              parts.push(`Error ${index + 1}: ${e.message}`)
            }
            
            // Error code (e.g., secret_scanning_push_protection)
            if (e.code) {
              parts.push(`  Code: ${e.code}`)
            }
            
            // File path where secret was detected
            if (e.path) {
              parts.push(`  File: ${e.path}`)
            }
            
            // Secret type if provided
            if (e.secret_type) {
              parts.push(`  Secret Type: ${e.secret_type}`)
            }
            
            // Location information
            if (e.locations && Array.isArray(e.locations)) {
              e.locations.forEach((loc: any, locIndex: number) => {
                if (loc.path) {
                  parts.push(`  Location ${locIndex + 1}: ${loc.path}`)
                  if (loc.start_line) {
                    parts.push(`    Line: ${loc.start_line}${loc.end_line && loc.end_line !== loc.start_line ? `-${loc.end_line}` : ''}`)
                  }
                }
              })
            }
            
            // Bypass URL if provided
            if (e.bypass_url) {
              parts.push(`  Bypass URL: ${e.bypass_url}`)
            }
            
            // Any additional properties
            if (e.resource) {
              parts.push(`  Resource: ${e.resource}`)
            }
            if (e.field) {
              parts.push(`  Field: ${e.field}`)
            }
            
            return parts.length > 0 ? parts.join('\n') : JSON.stringify(e)
          }).join('\n\n')
          
          if (errorsList) {
            detailsParts.push(`\nDetails:\n${errorsList}`)
          }
        }
        
        // Include documentation URL if available
        if (responseData.documentation_url) {
          detailsParts.push(`\nDocumentation: ${responseData.documentation_url}`)
        }
        
        // Include push protection bypass information if available
        if (responseData.push_protection_bypassed_by) {
          detailsParts.push(`\nPush protection bypassed by: ${responseData.push_protection_bypassed_by}`)
        }
        if (responseData.push_protection_bypass_url) {
          detailsParts.push(`\nBypass URL: ${responseData.push_protection_bypass_url}`)
        }
        
        errorDetails = detailsParts.join('\n')
      }
      
      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes('already exists')) {
          errorMessage = 'Repository name already exists'
          statusCode = 409
        } else if (error.message.includes('Bad credentials')) {
          errorMessage = 'Invalid GitHub token'
          statusCode = 401
        } else if (error.message.includes('Secret detected') || error.message.includes('rule violations')) {
          errorMessage = 'Repository rule violations found'
          errorDetails = errorDetails || 'GitHub detected sensitive content (secrets, tokens, or credentials) in your code. Please remove them and try again.'
          statusCode = 422
        }
      }
    }
    
    return Response.json({
      error: errorMessage,
      details: errorDetails,
      status: statusCode
    }, { status: statusCode })
  }
}
