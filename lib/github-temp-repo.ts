/**
 * GitHub Temporary Repository Creator (Public Repo Version)
 *
 * Client-side library for creating temporary PUBLIC GitHub repositories
 * to store large codebases for AI processing. This avoids Vercel API
 * route timeouts by directly calling GitHub's REST API from the browser.
 *
 * ✔ No server load
 * ✔ Uses user's GitHub rate limits (5000 req/hr)
 * ✔ Public repos require ONLY `public_repo` scope
 * ✔ Temporary repos auto-delete after session or cleanup script
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

export async function createTemporaryGitHubRepo(
  files: FileObject[],
  fileTree: string[],
  metadata: any,
  githubToken?: string,
  onProgress?: ProgressCallback
): Promise<GitHubRepoResult> {
  const reportProgress = (stage: string, progress: number, message: string) => {
    console.log(`[GitHubTempRepo] ${stage} (${progress}%): ${message}`)
    onProgress?.(stage, progress, message)
  }

  try {
    reportProgress('init', 0, 'Initializing GitHub repository creation...')

    // Fetch token if not provided
    let actualGithubToken = githubToken
    if (!actualGithubToken || actualGithubToken === 'stored') {
      reportProgress('auth', 5, 'Fetching GitHub token...')
      
      const { createClient } = await import('@/lib/supabase/client')
      const { getDeploymentTokens } = await import('@/lib/cloud-sync')

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) throw new Error('User not authenticated.')

      const tokens = await getDeploymentTokens(user.id)
      if (!tokens?.github) throw new Error('GitHub token missing.')

      actualGithubToken = tokens.github
    }

    const octokit = new Octokit({ auth: actualGithubToken })

    // Validate GitHub token
    reportProgress('verify-auth', 5, 'Verifying GitHub authentication...')
    await octokit.rest.users.getAuthenticated()

    // Generate unique repo name
    const uniqueId = crypto.randomUUID().slice(0, 8)
    const repoName = `pixelpilot-temp-${uniqueId}`
    reportProgress('create-repo', 10, `Creating repository: ${repoName}`)

    // Create PUBLIC repo (important!)
    const { data: repoData } = await octokit.rest.repos.createForAuthenticatedUser({
      name: repoName,
      description: `🤖 PixelPilot Temporary Workspace (Public) – ${new Date().toISOString()}`,
      private: false, // PUBLIC REPO, allows use of `public_repo` scope
      auto_init: true,
      has_issues: false,
      has_projects: false,
      has_wiki: false
    })

    reportProgress('create-repo', 20, `Repository created: ${repoData.html_url}`)

    const owner = repoData.owner.login

    // Get initial commit
    const { data: ref } = await octokit.rest.git.getRef({
      owner,
      repo: repoName,
      ref: 'heads/main'
    })

    const { data: latestCommit } = await octokit.rest.git.getCommit({
      owner,
      repo: repoName,
      commit_sha: ref.object.sha,
    })

    // Prepare files + metadata
    reportProgress('prepare-files', 35, 'Preparing files...')

    const allFiles = [
      ...files,
      {
        path: '__pixelpilot_metadata.json',
        content: JSON.stringify({
          fileTree,
          metadata,
          createdAt: new Date().toISOString(),
          fileCount: files.length,
          totalSize: files.reduce((s, f) => s + f.content.length, 0)
        }, null, 2)
      }
    ]

    // Create tree
    reportProgress('create-tree', 50, `Creating Git tree with ${allFiles.length} files...`)

    const tree = allFiles.map(f => ({
      path: f.path.startsWith('/') ? f.path.slice(1) : f.path,
      mode: '100644' as const,
      type: 'blob' as const,
      content: f.content
    }))

    const { data: createdTree } = await octokit.rest.git.createTree({
      owner,
      repo: repoName,
      tree,
      base_tree: latestCommit.tree.sha
    })

    reportProgress('create-tree', 70, 'Tree created.')

    // Create commit
    reportProgress('create-commit', 80, 'Creating commit...')
    const { data: commit } = await octokit.rest.git.createCommit({
      owner,
      repo: repoName,
      message: `🚀 PixelPilot Temporary Workspace Upload\nFiles: ${files.length}`,
      tree: createdTree.sha,
      parents: [ref.object.sha],
      author: { name: 'PixelPilot Bot', email: 'bot@pixelpilot.dev' }
    })

    // Update ref
    await octokit.rest.git.updateRef({
      owner,
      repo: repoName,
      ref: 'heads/main',
      sha: commit.sha,
      force: true
    })

    reportProgress('complete', 100, 'Repository ready!')

    const result: GitHubRepoResult = {
      repoName,
      repoUrl: repoData.html_url,
      repoApiUrl: repoData.url,
      owner,
      commitSha: commit.sha,
      createdAt: new Date().toISOString()
    }

    storeRepoForCleanup(result)
    return result

  } catch (error: any) {
    reportProgress('error', 0, error.message || 'Unknown error')
    throw error
  }
}

/**
 * Delete a temporary GitHub repository
 */
export async function deleteTemporaryGitHubRepo(
  repoName: string,
  owner: string,
  githubToken: string
): Promise<void> {
  const octokit = new Octokit({ auth: githubToken })

  try {
    await octokit.rest.repos.delete({ owner, repo: repoName })
    removeRepoFromCleanup(repoName)
  } catch (error: any) {
    if (error.status === 404) {
      removeRepoFromCleanup(repoName)
      return
    }
    throw new Error(`Failed to delete repo: ${error.message}`)
  }
}

/**
 * Fetch all files from a GitHub repo
 */
export async function fetchFilesFromGitHubRepo(
  repoUrl: string,
  githubToken: string,
  branch: string = 'main'
): Promise<{ files: FileObject[], metadata: any }> {

  const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/)
  if (!match) throw new Error('Invalid GitHub repo URL')

  const [, owner, repo] = match

  const fetchDir = async (path = ''): Promise<FileObject[]> => {
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`

    const r = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: 'application/vnd.github+json'
      }
    })

    const contents = await r.json()
    const files: FileObject[] = []

    for (const item of contents) {
      if (item.type === 'file') {
        const fr = await fetch(item.download_url)
        files.push({ path: item.path, content: await fr.text() })
      } else if (item.type === 'dir') {
        files.push(...await fetchDir(item.path))
      }
    }

    return files
  }

  const allFiles = await fetchDir()

  // Extract metadata
  let metadata = {}
  const metaFile = allFiles.find(f => f.path === '__pixelpilot_metadata.json')

  if (metaFile) {
    metadata = JSON.parse(metaFile.content)
    allFiles.splice(allFiles.indexOf(metaFile), 1)
  }

  return { files: allFiles, metadata }
}

/**
 * Store temporary repo for cleanup
 */
function storeRepoForCleanup(repo: GitHubRepoResult) {
  const key = 'pixelpilot_temp_repos'
  const list = JSON.parse(localStorage.getItem(key) || '[]')
  list.push(repo)
  localStorage.setItem(key, JSON.stringify(list))
}

/**
 * Remove repo from cleanup tracking
 */
function removeRepoFromCleanup(repoName: string) {
  const key = 'pixelpilot_temp_repos'
  const list = JSON.parse(localStorage.getItem(key) || '[]')
  localStorage.setItem(key, JSON.stringify(list.filter((r: any) => r.repoName !== repoName)))
}

/**
 * Get temporary repositories pending cleanup
 */
export function getPendingCleanupRepos(): GitHubRepoResult[] {
  return JSON.parse(localStorage.getItem('pixelpilot_temp_repos') || '[]')
}

/**
 * Automatically cleanup expired repos
 */
export async function cleanupOldRepos(
  githubToken: string,
  maxAgeHours: number = 24
) {
  const repos = getPendingCleanupRepos()
  let deleted = 0
  let failed = 0

  for (const repo of repos) {
    if (Date.now() - new Date(repo.createdAt).getTime() > maxAgeHours * 3600000) {
      try {
        await deleteTemporaryGitHubRepo(repo.repoName, repo.owner, githubToken)
        deleted++
      } catch {
        failed++
      }
    }
  }

  return { deleted, failed }
}
