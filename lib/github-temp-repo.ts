/**
 * GitHub Temporary Repository Creator
 * 
 * Client-side library for creating temporary private GitHub repositories
 * to store large codebases for AI processing. Bypasses Vercel API route
 * limitations by directly calling GitHub API from the browser.
 * 
 * Features:
 * - Direct GitHub API calls from browser (no server relay)
 * - Handles unlimited file sizes (no Vercel timeout)
 * - Automatic repo cleanup tracking
 * - Progress callbacks for UI updates
 */

import { Octokit } from '@octokit/rest'

interface FileObject {
  path: string
  content: string
}

interface GitHubRepoResult {
  repoName: string
  repoUrl: string
  repoApiUrl: string
  owner: string
  commitSha: string
  createdAt: string
}

interface ProgressCallback {
  (stage: string, progress: number, message: string): void
}

/**
 * Create a temporary GitHub repository with all project files
 * @param files - Array of file objects with path and content
 * @param fileTree - Array of file paths for tree structure
 * @param metadata - Additional metadata to store
 * @param githubToken - GitHub OAuth token for API access
 * @param onProgress - Optional callback for progress updates
 * @returns Repository information including URL and commit SHA
 */
export async function createTemporaryGitHubRepo(
  files: FileObject[],
  fileTree: string[],
  metadata: any,
  githubToken: string,
  onProgress?: ProgressCallback
): Promise<GitHubRepoResult> {
  const reportProgress = (stage: string, progress: number, message: string) => {
    console.log(`[GitHubTempRepo] ${stage} (${progress}%): ${message}`)
    onProgress?.(stage, progress, message)
  }

  try {
    reportProgress('init', 0, 'Initializing GitHub repository creation...')

    // Initialize Octokit with user's token
    const octokit = new Octokit({
      auth: githubToken,
    })

    // Step 1: Generate unique repository name
    const uniqueId = crypto.randomUUID().slice(0, 8)
    const repoName = `pixelpilot-temp-${uniqueId}`
    reportProgress('create-repo', 10, `Creating repository: ${repoName}`)

    // Step 2: Create GitHub repository with auto_init
    const { data: repoData } = await octokit.rest.repos.createForAuthenticatedUser({
      name: repoName,
      description: `🤖 PixelPilot Temporary Workspace - Created ${new Date().toISOString()}`,
      private: true, // Always create private repos for security
      auto_init: true, // Initialize with README to get initial commit
      has_issues: false,
      has_projects: false,
      has_wiki: false
    })
      
    reportProgress('create-repo', 20, `✅ Repository created: ${repoData.html_url}`)

    // Step 3: Get authenticated user info
    reportProgress('fetch-user', 25, 'Fetching user information...')
    const { data: userData } = await octokit.rest.users.getAuthenticated()
    const owner = userData.login
    reportProgress('fetch-user', 30, `✅ User: ${owner}`)

    // Step 4: Get the initial commit from auto_init
    reportProgress('prepare-files', 35, 'Preparing for file upload...')
    const { data: ref } = await octokit.rest.git.getRef({
      owner,
      repo: repoName,
      ref: 'heads/main',
    })

    const { data: latestCommit } = await octokit.rest.git.getCommit({
      owner,
      repo: repoName,
      commit_sha: ref.object.sha,
    })

    // Step 5: Prepare all files including metadata
    reportProgress('prepare-files', 40, `Preparing ${files.length} files for upload...`)
    
    const allFiles = [
      ...files,
      {
        path: '__pixelpilot_metadata.json',
        content: JSON.stringify({
          fileTree,
          metadata,
          createdAt: new Date().toISOString(),
          fileCount: files.length,
          totalSize: files.reduce((sum, f) => sum + f.content.length, 0)
        }, null, 2)
      }
    ]

    // Step 6: Create tree with all files (using content, not blobs)
    reportProgress('create-tree', 50, `Creating Git tree with ${allFiles.length} files...`)
    
    const tree = allFiles.map(file => ({
      path: file.path.startsWith('/') ? file.path.slice(1) : file.path,
      mode: '100644' as const,
      type: 'blob' as const,
      content: file.content
    }))

    const { data: createdTree } = await octokit.rest.git.createTree({
      owner,
      repo: repoName,
      tree,
      base_tree: latestCommit.tree.sha, // Use the existing tree as base
    })

    reportProgress('create-tree', 70, `✅ Git tree created with ${allFiles.length} files`)

    // Step 7: Create commit
    reportProgress('create-commit', 80, 'Creating initial commit...')
    const { data: commit } = await octokit.rest.git.createCommit({
      owner,
      repo: repoName,
      message: `🚀 Initial commit: PixelPilot temporary workspace\n\n- ${files.length} project files\n- Created: ${new Date().toISOString()}\n- Auto-generated for AI processing`,
      tree: createdTree.sha,
      parents: [ref.object.sha], // Reference the existing commit
      author: {
        name: 'PixelPilot Bot',
        email: 'bot@pixelpilot.dev'
      }
    })

    reportProgress('create-commit', 90, '✅ Commit created')

    // Step 8: Update main branch reference
    reportProgress('update-ref', 95, 'Updating main branch...')
    await octokit.rest.git.updateRef({
      owner,
      repo: repoName,
      ref: 'heads/main',
      sha: commit.sha,
    })

    reportProgress('complete', 100, '✅ Repository ready!')

    const result: GitHubRepoResult = {
      repoName: repoData.name,
      repoUrl: repoData.html_url,
      repoApiUrl: repoData.url,
      owner,
      commitSha: commit.sha,
      createdAt: new Date().toISOString()
    }

    // Store repo info for cleanup tracking
    storeRepoForCleanup(result)

    return result

  } catch (error) {
    reportProgress('error', 0, `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    throw error
  }
}

/**
 * Delete a temporary GitHub repository
 * @param repoName - Name of the repository to delete
 * @param owner - GitHub username/organization
 * @param githubToken - GitHub OAuth token
 */
export async function deleteTemporaryGitHubRepo(
  repoName: string,
  owner: string,
  githubToken: string
): Promise<void> {
  console.log(`[GitHubTempRepo] 🗑️ Deleting repository: ${owner}/${repoName}`)

  const octokit = new Octokit({
    auth: githubToken,
  })

  try {
    await octokit.rest.repos.delete({
      owner,
      repo: repoName,
    })

    console.log(`[GitHubTempRepo] ✅ Repository deleted: ${owner}/${repoName}`)
    removeRepoFromCleanup(repoName)
  } catch (error: any) {
    if (error.status === 404) {
      console.log(`[GitHubTempRepo] ℹ️ Repository already deleted: ${owner}/${repoName}`)
      removeRepoFromCleanup(repoName)
    } else {
      throw new Error(`Failed to delete repository: ${error.message}`)
    }
  }
}

/**
 * Fetch files from a GitHub repository
 * @param repoUrl - Full GitHub repository URL
 * @param githubToken - GitHub OAuth token
 * @param branch - Branch to fetch from (default: 'main')
 * @returns Array of files with path and content
 */
export async function fetchFilesFromGitHubRepo(
  repoUrl: string,
  githubToken: string,
  branch: string = 'main'
): Promise<{ files: FileObject[], metadata: any }> {
  console.log(`[GitHubTempRepo] 📥 Fetching files from: ${repoUrl}`)

  // Extract owner and repo from URL
  const urlMatch = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/)
  if (!urlMatch) {
    throw new Error('Invalid GitHub repository URL')
  }

  const [, owner, repo] = urlMatch

  // Recursive function to fetch all files
  const fetchDirectory = async (path: string = ''): Promise<FileObject[]> => {
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`
    
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch contents: ${response.statusText}`)
    }

    const contents = await response.json()
    const files: FileObject[] = []

    for (const item of contents) {
      if (item.type === 'file') {
        // Fetch file content
        const fileResponse = await fetch(item.download_url, {
          headers: {
            'Authorization': `Bearer ${githubToken}`
          }
        })
        
        if (fileResponse.ok) {
          const content = await fileResponse.text()
          files.push({
            path: item.path,
            content
          })
        }
      } else if (item.type === 'dir') {
        // Recursively fetch directory contents
        const dirFiles = await fetchDirectory(item.path)
        files.push(...dirFiles)
      }
    }

    return files
  }

  const allFiles = await fetchDirectory()
  
  // Extract metadata if present
  const metadataFile = allFiles.find(f => f.path === '__pixelpilot_metadata.json')
  let metadata = {}
  
  if (metadataFile) {
    try {
      metadata = JSON.parse(metadataFile.content)
      // Remove metadata file from the files array
      const fileIndex = allFiles.indexOf(metadataFile)
      allFiles.splice(fileIndex, 1)
    } catch (error) {
      console.warn('[GitHubTempRepo] Failed to parse metadata:', error)
    }
  }

  console.log(`[GitHubTempRepo] ✅ Fetched ${allFiles.length} files from repository`)

  return { files: allFiles, metadata }
}

/**
 * Store repository info in localStorage for cleanup tracking
 */
function storeRepoForCleanup(repoInfo: GitHubRepoResult): void {
  try {
    const key = 'pixelpilot_temp_repos'
    const existing = JSON.parse(localStorage.getItem(key) || '[]')
    existing.push({
      ...repoInfo,
      createdAt: new Date().toISOString()
    })
    localStorage.setItem(key, JSON.stringify(existing))
  } catch (error) {
    console.warn('[GitHubTempRepo] Failed to store repo for cleanup:', error)
  }
}

/**
 * Remove repository from cleanup tracking
 */
function removeRepoFromCleanup(repoName: string): void {
  try {
    const key = 'pixelpilot_temp_repos'
    const existing = JSON.parse(localStorage.getItem(key) || '[]')
    const filtered = existing.filter((r: any) => r.repoName !== repoName)
    localStorage.setItem(key, JSON.stringify(filtered))
  } catch (error) {
    console.warn('[GitHubTempRepo] Failed to remove repo from cleanup:', error)
  }
}

/**
 * Get all temporary repositories that need cleanup
 * @returns Array of repository information
 */
export function getPendingCleanupRepos(): GitHubRepoResult[] {
  try {
    const key = 'pixelpilot_temp_repos'
    return JSON.parse(localStorage.getItem(key) || '[]')
  } catch (error) {
    console.warn('[GitHubTempRepo] Failed to get cleanup repos:', error)
    return []
  }
}

/**
 * Clean up old temporary repositories (older than 24 hours)
 * @param githubToken - GitHub OAuth token
 * @param maxAgeHours - Maximum age in hours before cleanup (default: 24)
 */
export async function cleanupOldRepos(
  githubToken: string,
  maxAgeHours: number = 24
): Promise<{ deleted: number, failed: number }> {
  const repos = getPendingCleanupRepos()
  let deleted = 0
  let failed = 0

  const cutoffTime = Date.now() - (maxAgeHours * 60 * 60 * 1000)

  for (const repo of repos) {
    try {
      const repoAge = new Date(repo.createdAt).getTime()
      
      if (repoAge < cutoffTime) {
        await deleteTemporaryGitHubRepo(repo.repoName, repo.owner, githubToken)
        deleted++
      }
    } catch (error) {
      console.error(`[GitHubTempRepo] Failed to cleanup ${repo.repoName}:`, error)
      failed++
    }
  }

  console.log(`[GitHubTempRepo] Cleanup complete: ${deleted} deleted, ${failed} failed`)
  return { deleted, failed }
}
