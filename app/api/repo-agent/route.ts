import { streamText, tool, stepCountIs } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getModel } from '@/lib/ai-providers'
import { DEFAULT_CHAT_MODEL, getModelById } from '@/lib/ai-models'
import { NextResponse } from 'next/server'
import { authenticateUser, processRequestBilling } from '@/lib/billing/auth-middleware'
import { CREDITS_PER_MESSAGE } from '@/lib/billing/credit-manager'
import { Octokit } from '@octokit/rest'

// Disable Next.js body parser for binary data handling
export const config = {
  api: {
    bodyParser: false,
  },
}

// Get AI model by ID with fallback to default
const getAIModel = (modelId?: string) => {
  try {
    const selectedModelId = modelId || DEFAULT_CHAT_MODEL
    const modelInfo = getModelById(selectedModelId)

    if (!modelInfo) {
      console.warn(`Model ${selectedModelId} not found, using default: ${DEFAULT_CHAT_MODEL}`)
      return getModel(DEFAULT_CHAT_MODEL)
    }

    console.log(`[RepoAgent] Using AI model: ${modelInfo.name} (${modelInfo.provider})`)
    return getModel(selectedModelId)
  } catch (error) {
    console.error('[RepoAgent] Failed to get AI model:', error)
    console.log(`[RepoAgent] Falling back to default model: ${DEFAULT_CHAT_MODEL}`)
    return getModel(DEFAULT_CHAT_MODEL)
  }
}

// Get specialized system prompt for Repo Agent
const getRepoAgentSystemPrompt = (modelId: string): string => {
  return `You are PiPilot Repo Agent, an elite AI assistant specialized in remote GitHub repository operations. You have direct access to manipulate files, create branches, and manage repositories through the GitHub API.

═══════════════════════════════════════════════════════════════
CORE CAPABILITIES
═══════════════════════════════════════════════════════════════

## 🔧 AVAILABLE TOOLS
- **github_read_file** - Read any file from the connected repository
- **github_write_file** - Create or update files in the repository
- **github_delete_file** - Remove files from the repository
- **github_list_files** - Browse repository directory structure
- **github_list_repos** - Show user's accessible repositories
- **github_get_repo_info** - Get repository metadata and details
- **github_create_branch** - Create new branches for changes
- **github_search_code** - Search for code patterns across the repository
- **github_get_commits** - View commit history and changes
- **github_create_pull_request** - Create PRs for your changes

## 🎯 WORKFLOW PRINCIPLES
1. **Repository Context**: Always maintain awareness of the current repository and branch
2. **Safe Operations**: Never delete important files without confirmation
3. **Clear Communication**: Explain every action you're taking
4. **Version Control**: Create branches for significant changes
5. **Code Quality**: Follow repository conventions and patterns

## 📋 RESPONSE FORMAT
When performing operations:
1. **Acknowledge** the user's request
2. **Plan** your approach (which tools to use)
3. **Execute** operations step by step
4. **Report** results clearly
5. **Suggest** next steps if applicable

## 🚨 SAFETY PROTOCOLS
- Never modify .env files or sensitive configuration
- Always create branches for non-trivial changes
- Respect repository branch protection rules
- Ask for confirmation on destructive operations

═══════════════════════════════════════════════════════════════
REPO AGENT WORKFLOW
═══════════════════════════════════════════════════════════════

**Initial Setup:**
- Confirm repository connection
- Verify user permissions
- Set working branch context

**Task Execution:**
- Break down complex tasks into steps
- Use appropriate tools for each operation
- Provide progress updates
- Handle errors gracefully

**Completion:**
- Summarize changes made
- Suggest follow-up actions
- Offer to create pull requests for changes

Remember: You are working directly on live GitHub repositories. Every action you take is real and permanent. Exercise caution and clarity in all operations.`
}

// GitHub API utility functions
const createOctokitClient = (token: string) => {
  return new Octokit({
    auth: token,
  })
}

const parseRepoString = (repoString: string) => {
  const [owner, repo] = repoString.split('/')
  return { owner, repo }
}

export async function POST(req: Request) {
  let startTime = Date.now()
  let authContext: any = null

  // Declare variables at function scope for error handling access
  let modelId: string | undefined
  let messages: any[] | undefined
  let currentRepo: string | undefined
  let currentBranch: string = 'main'
  let githubToken: string | undefined

  try {
    // ============================================================================
    // BASIC AUTH CHECK - Supabase Authentication
    // ============================================================================
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ============================================================================
    // ABE CREDIT SYSTEM - Authenticate and check credits
    // ============================================================================
    const authResult = await authenticateUser(req)

    if (!authResult.success || !authResult.context) {
      console.error(`[RepoAgent] ❌ Authentication failed:`, authResult.error)
      return NextResponse.json(
        {
          error: {
            message: authResult.error?.message || 'Authentication failed',
            code: authResult.error?.code || 'UNAUTHORIZED',
            type: 'credit_error'
          }
        },
        { status: authResult.error?.statusCode || 401 }
      )
    }

    authContext = authResult.context
    console.log(
      `[RepoAgent] ✅ Authenticated: User ${authContext.userId}, Plan: ${authContext.currentPlan}, Balance: ${authContext.creditsBalance} credits (${Math.floor(authContext.creditsBalance / CREDITS_PER_MESSAGE)} messages remaining)`
    )

    // Parse request body
    const body = await req.json()
    ;({
      messages,
      modelId,
      repo: currentRepo,
      branch: currentBranch = 'main',
      githubToken
    } = body)

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 })
    }

    if (!currentRepo) {
      return NextResponse.json({ error: 'Repository is required' }, { status: 400 })
    }

    if (!githubToken) {
      return NextResponse.json({ error: 'GitHub token is required' }, { status: 400 })
    }

    // Initialize Octokit client
    const octokit = createOctokitClient(githubToken)

    // Verify repository access
    try {
      const { owner, repo } = parseRepoString(currentRepo)
      await octokit.rest.repos.get({ owner, repo })
    } catch (error) {
      console.error('[RepoAgent] Repository access verification failed:', error)
      return NextResponse.json({
        error: 'Cannot access the specified repository. Please check your permissions and repository name.'
      }, { status: 403 })
    }

    // Get AI model
    const model = getAIModel(modelId)
    const systemPrompt = getRepoAgentSystemPrompt(modelId || DEFAULT_CHAT_MODEL)

    // Define GitHub repository tools
    const tools = {
      // Repository Management
      github_list_repos: tool({
        description: 'List all repositories the user has access to',
        inputSchema: z.object({
          type: z.enum(['all', 'owner', 'public', 'private', 'member']).optional().describe('Filter repository type'),
          sort: z.enum(['created', 'updated', 'pushed', 'full_name']).optional().describe('Sort repositories by'),
          per_page: z.number().min(1).max(100).optional().describe('Number of results per page')
        }),
        execute: async ({ type = 'all', sort = 'updated', per_page = 30 }) => {
          try {
            const response = await octokit.rest.repos.listForAuthenticatedUser({
              type,
              sort,
              per_page
            })
            return {
              success: true,
              repositories: response.data.map(repo => ({
                name: repo.name,
                full_name: repo.full_name,
                description: repo.description,
                private: repo.private,
                html_url: repo.html_url,
                default_branch: repo.default_branch,
                updated_at: repo.updated_at
              }))
            }
          } catch (error) {
            return {
              success: false,
              error: `Failed to list repositories: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          }
        }
      }),

      github_get_repo_info: tool({
        description: 'Get detailed information about a specific repository',
        inputSchema: z.object({
          repo: z.string().describe('Repository in format "owner/repo"')
        }),
        execute: async ({ repo }) => {
          try {
            const { owner, repo: repoName } = parseRepoString(repo)
            const response = await octokit.rest.repos.get({ owner, repo: repoName })

            return {
              success: true,
              repository: {
                name: response.data.name,
                full_name: response.data.full_name,
                description: response.data.description,
                private: response.data.private,
                html_url: response.data.html_url,
                default_branch: response.data.default_branch,
                language: response.data.language,
                stars: response.data.stargazers_count,
                forks: response.data.forks_count,
                issues: response.data.open_issues_count,
                created_at: response.data.created_at,
                updated_at: response.data.updated_at
              }
            }
          } catch (error) {
            return {
              success: false,
              error: `Failed to get repository info: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          }
        }
      }),

      // File Operations
      github_read_file: tool({
        description: 'Read the contents of a file from the repository',
        inputSchema: z.object({
          repo: z.string().describe('Repository in format "owner/repo"'),
          path: z.string().describe('File path in repository'),
          branch: z.string().optional().describe('Branch name, defaults to repository default')
        }),
        execute: async ({ repo, path, branch }) => {
          try {
            const { owner, repo: repoName } = parseRepoString(repo)
            const response = await octokit.rest.repos.getContent({
              owner,
              repo: repoName,
              path,
              ref: branch
            })

            if (Array.isArray(response.data)) {
              // It's a directory
              return {
                success: true,
                type: 'directory',
                contents: response.data.map(item => ({
                  name: item.name,
                  path: item.path,
                  type: item.type,
                  size: item.size,
                  download_url: item.download_url
                }))
              }
            } else {
              // It's a file - type check before accessing properties
              const fileData = response.data as any
              if (fileData.type === 'file' && fileData.content && fileData.encoding) {
                const content = Buffer.from(fileData.content, 'base64').toString('utf-8')
                return {
                  success: true,
                  type: 'file',
                  path: fileData.path,
                  name: fileData.name,
                  content,
                  size: fileData.size,
                  encoding: fileData.encoding,
                  sha: fileData.sha
                }
              } else {
                return {
                  success: false,
                  error: 'Invalid file response from GitHub API'
                }
              }
            }
          } catch (error) {
            return {
              success: false,
              error: `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          }
        }
      }),

      github_write_file: tool({
        description: 'Create or update a file in the repository',
        inputSchema: z.object({
          repo: z.string().describe('Repository in format "owner/repo"'),
          path: z.string().describe('File path in repository'),
          content: z.string().describe('File content'),
          message: z.string().describe('Commit message'),
          branch: z.string().optional().describe('Branch name, defaults to repository default')
        }),
        execute: async ({ repo, path, content, message, branch }) => {
          try {
            const { owner, repo: repoName } = parseRepoString(repo)

            // Get current file SHA if it exists (for updates)
            let sha: string | undefined
            try {
              const existingFile = await octokit.rest.repos.getContent({
                owner,
                repo: repoName,
                path,
                ref: branch
              })
              if (!Array.isArray(existingFile.data)) {
                sha = existingFile.data.sha
              }
            } catch (error) {
              // File doesn't exist, which is fine for creation
            }

            const response = await octokit.rest.repos.createOrUpdateFileContents({
              owner,
              repo: repoName,
              path,
              message,
              content: Buffer.from(content).toString('base64'),
              sha,
              branch
            })

            return {
              success: true,
              commit: {
                sha: response.data.commit.sha,
                message: response.data.commit.message,
                author: response.data.commit.author,
                url: response.data.commit.html_url
              },
              file: {
                path: response.data.content?.path,
                sha: response.data.content?.sha
              }
            }
          } catch (error) {
            return {
              success: false,
              error: `Failed to write file: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          }
        }
      }),

      github_delete_file: tool({
        description: 'Delete a file from the repository',
        inputSchema: z.object({
          repo: z.string().describe('Repository in format "owner/repo"'),
          path: z.string().describe('File path in repository'),
          message: z.string().describe('Commit message'),
          branch: z.string().optional().describe('Branch name, defaults to repository default')
        }),
        execute: async ({ repo, path, message, branch }) => {
          try {
            const { owner, repo: repoName } = parseRepoString(repo)

            // Get current file SHA
            const existingFile = await octokit.rest.repos.getContent({
              owner,
              repo: repoName,
              path,
              ref: branch
            })

            if (Array.isArray(existingFile.data)) {
              return {
                success: false,
                error: 'Cannot delete a directory'
              }
            }

            const response = await octokit.rest.repos.deleteFile({
              owner,
              repo: repoName,
              path,
              message,
              sha: existingFile.data.sha,
              branch
            })

            return {
              success: true,
              commit: {
                sha: response.data.commit.sha,
                message: response.data.commit.message,
                url: response.data.commit.html_url
              }
            }
          } catch (error) {
            return {
              success: false,
              error: `Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          }
        }
      }),

      github_list_files: tool({
        description: 'List files and directories in a repository path',
        inputSchema: z.object({
          repo: z.string().describe('Repository in format "owner/repo"'),
          path: z.string().optional().describe('Directory path, empty for root'),
          branch: z.string().optional().describe('Branch name, defaults to repository default')
        }),
        execute: async ({ repo, path = '', branch }) => {
          try {
            const { owner, repo: repoName } = parseRepoString(repo)
            const response = await octokit.rest.repos.getContent({
              owner,
              repo: repoName,
              path,
              ref: branch
            })

            if (!Array.isArray(response.data)) {
              return {
                success: false,
                error: 'Path is not a directory'
              }
            }

            return {
              success: true,
              path,
              contents: response.data.map(item => ({
                name: item.name,
                path: item.path,
                type: item.type,
                size: item.size,
                download_url: item.download_url,
                sha: item.sha
              }))
            }
          } catch (error) {
            return {
              success: false,
              error: `Failed to list files: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          }
        }
      }),

      // Branch Management
      github_create_branch: tool({
        description: 'Create a new branch in the repository',
        inputSchema: z.object({
          repo: z.string().describe('Repository in format "owner/repo"'),
          branch: z.string().describe('New branch name'),
          source_branch: z.string().optional().describe('Source branch to branch from, defaults to default branch')
        }),
        execute: async ({ repo, branch, source_branch }) => {
          try {
            const { owner, repo: repoName } = parseRepoString(repo)

            // Get source branch SHA
            const sourceRef = await octokit.rest.git.getRef({
              owner,
              repo: repoName,
              ref: `heads/${source_branch || 'main'}`
            })

            // Create new branch
            const response = await octokit.rest.git.createRef({
              owner,
              repo: repoName,
              ref: `refs/heads/${branch}`,
              sha: sourceRef.data.object.sha
            })

            return {
              success: true,
              branch: {
                name: branch,
                sha: response.data.object.sha,
                ref: response.data.ref
              }
            }
          } catch (error) {
            return {
              success: false,
              error: `Failed to create branch: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          }
        }
      }),

      // Search and History
      github_search_code: tool({
        description: 'Search for code patterns in the repository',
        inputSchema: z.object({
          repo: z.string().describe('Repository in format "owner/repo"'),
          query: z.string().describe('Search query'),
          path: z.string().optional().describe('Limit search to specific path'),
          extension: z.string().optional().describe('File extension filter (e.g., "js", "py")')
        }),
        execute: async ({ repo, query, path, extension }) => {
          try {
            const searchQuery = `repo:${repo} ${query}${path ? ` path:${path}` : ''}${extension ? ` extension:${extension}` : ''}`

            const response = await octokit.rest.search.code({
              q: searchQuery,
              per_page: 30
            })

            return {
              success: true,
              total_count: response.data.total_count,
              items: response.data.items.map(item => ({
                name: item.name,
                path: item.path,
                sha: item.sha,
                html_url: item.html_url,
                repository: {
                  full_name: item.repository.full_name,
                  html_url: item.repository.html_url
                }
              }))
            }
          } catch (error) {
            return {
              success: false,
              error: `Failed to search code: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          }
        }
      }),

      github_get_commits: tool({
        description: 'Get commit history for a repository or specific path',
        inputSchema: z.object({
          repo: z.string().describe('Repository in format "owner/repo"'),
          path: z.string().optional().describe('Limit to commits affecting this path'),
          branch: z.string().optional().describe('Branch name'),
          per_page: z.number().min(1).max(100).optional().describe('Number of commits to return')
        }),
        execute: async ({ repo, path, branch, per_page = 30 }) => {
          try {
            const { owner, repo: repoName } = parseRepoString(repo)
            const response = await octokit.rest.repos.listCommits({
              owner,
              repo: repoName,
              path,
              sha: branch,
              per_page
            })

            return {
              success: true,
              commits: response.data.map(commit => ({
                sha: commit.sha,
                message: commit.commit.message,
                author: {
                  name: commit.commit.author?.name,
                  email: commit.commit.author?.email,
                  date: commit.commit.author?.date
                },
                committer: {
                  name: commit.commit.committer?.name,
                  email: commit.commit.committer?.email,
                  date: commit.commit.committer?.date
                },
                html_url: commit.html_url,
                parents: commit.parents.map(p => p.sha)
              }))
            }
          } catch (error) {
            return {
              success: false,
              error: `Failed to get commits: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          }
        }
      }),

      // Pull Requests
      github_create_pull_request: tool({
        description: 'Create a pull request between branches',
        inputSchema: z.object({
          repo: z.string().describe('Repository in format "owner/repo"'),
          title: z.string().describe('Pull request title'),
          head: z.string().describe('Head branch (source of changes)'),
          base: z.string().describe('Base branch (target for merge)'),
          body: z.string().optional().describe('Pull request description'),
          draft: z.boolean().optional().describe('Create as draft PR')
        }),
        execute: async ({ repo, title, head, base, body, draft = false }) => {
          try {
            const { owner, repo: repoName } = parseRepoString(repo)
            const response = await octokit.rest.pulls.create({
              owner,
              repo: repoName,
              title,
              head,
              base,
              body,
              draft
            })

            return {
              success: true,
              pull_request: {
                number: response.data.number,
                title: response.data.title,
                html_url: response.data.html_url,
                state: response.data.state,
                draft: response.data.draft,
                merged: response.data.merged,
                mergeable: response.data.mergeable
              }
            }
          } catch (error) {
            return {
              success: false,
              error: `Failed to create pull request: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          }
        }
      })
    }

    // Stream the response
    const result = await streamText({
      model,
      system: systemPrompt,
      messages,
      tools,
      stopWhen: stepCountIs(60),
      onFinish: async (result) => {
        console.log('[RepoAgent] Stream finished')

        // ============================================================================
        // ABE BILLING - Deduct credits for successful request
        // ============================================================================
        if (authContext) {
          const responseTime = Date.now() - startTime

          const billingResult = await processRequestBilling({
            userId: authContext.userId,
            model: modelId || DEFAULT_CHAT_MODEL,
            requestType: 'repo-agent',
            endpoint: '/api/repo-agent',
            responseTimeMs: responseTime,
            status: 'success'
          })

          if (billingResult.success) {
            console.log(
              `[RepoAgent] 💰 Deducted ${billingResult.creditsUsed} credits. New balance: ${billingResult.newBalance} credits (${Math.floor((billingResult.newBalance || 0) / CREDITS_PER_MESSAGE)} messages remaining)`
            )
          } else {
            console.error(`[RepoAgent] ⚠️ Failed to deduct credits:`, billingResult.error)
          }
        }
      }
    })

    return result.toTextStreamResponse()

  } catch (error: any) {
    console.error('[RepoAgent] Error:', error)

    // ============================================================================
    // ABE BILLING - Log failed request (no charge)
    // ============================================================================
    if (authContext) {
      const responseTime = Date.now() - startTime
      await processRequestBilling({
        userId: authContext.userId,
        model: modelId || DEFAULT_CHAT_MODEL,
        requestType: 'repo-agent',
        endpoint: '/api/repo-agent',
        responseTimeMs: responseTime,
        status: 'error',
        errorMessage: error.message
      })
      console.log(`[RepoAgent] ⚠️ Error logged (no credits charged)`)
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}