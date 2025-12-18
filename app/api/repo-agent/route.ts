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
- **github_semantic_search** - Advanced semantic code search and analysis
- **github_replace_string** - Powerful string replacement with regex support
- **github_grep_search** - Elite multi-strategy search engine
- **github_edit_file** - Precise file editing with Git diff-style search/replace blocks

## 🎯 WORKFLOW PRINCIPLES
1. **Repository Context**: Always maintain awareness of the current repository and branch
2. **Safe Operations**: Never delete important files without confirmation
3. **Clear Communication**: Explain every action you're taking
4. **Version Control**: Create branches for significant changes
5. **Code Quality**: Follow repository conventions and patterns

## 📋 EDITING TOOLS GUIDE
- **github_write_file**: For creating new files or completely replacing existing ones
- **github_edit_file**: For precise edits using Git diff-style search/replace blocks (recommended for most edits)
- **github_replace_string**: For simple string replacements with regex support
- **github_delete_file**: For removing files entirely

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

// Advanced tool helper functions
const buildSemanticSearchTerms = (query: string): string => {
  const lowerQuery = query.toLowerCase()

  // Map natural language to code patterns
  const semanticMappings: Record<string, string[]> = {
    'react component': ['function.*Component', 'const.*=.*\\(', 'export.*function', 'export.*const'],
    'api endpoint': ['router\\.', 'app\\.', 'Route', '@app\\.route', 'def.*api', 'func.*handler'],
    'error handling': ['try.*catch', 'except', 'rescue', 'catch.*Error', 'throw', 'raise'],
    'database model': ['class.*Model', 'interface.*Model', 'type.*Model', 'Schema', 'model\\('],
    'test file': ['describe\\(', 'it\\(', 'test\\(', 'spec', '\\.test\\.', '\\.spec\\.'],
    'configuration': ['config', 'settings', 'env', 'Config', 'Settings'],
    'utility function': ['export.*function', 'export.*const', 'util', 'helper', 'Utils'],
    'hook': ['use[A-Z]', 'useState', 'useEffect', 'useCallback', 'useMemo'],
    'middleware': ['middleware', 'Middleware', 'next\\(', 'req.*res'],
    'validation': ['validate', 'schema', 'zod', 'yup', 'joi', 'Validate']
  }

  const terms = []
  for (const [key, patterns] of Object.entries(semanticMappings)) {
    if (lowerQuery.includes(key)) {
      terms.push(...patterns)
    }
  }

  // Add the original query if no semantic matches
  if (terms.length === 0) {
    terms.push(query)
  }

  return terms.join(' OR ')
}

const detectLanguage = (filePath: string, content: string): string => {
  const ext = filePath.split('.').pop()?.toLowerCase()

  const languageMap: Record<string, string> = {
    'js': 'JavaScript',
    'jsx': 'JavaScript React',
    'ts': 'TypeScript',
    'tsx': 'TypeScript React',
    'py': 'Python',
    'java': 'Java',
    'cpp': 'C++',
    'c': 'C',
    'cs': 'C#',
    'php': 'PHP',
    'rb': 'Ruby',
    'go': 'Go',
    'rs': 'Rust',
    'swift': 'Swift',
    'kt': 'Kotlin',
    'scala': 'Scala',
    'html': 'HTML',
    'css': 'CSS',
    'scss': 'SCSS',
    'sass': 'Sass',
    'less': 'Less',
    'json': 'JSON',
    'xml': 'XML',
    'yaml': 'YAML',
    'yml': 'YAML',
    'md': 'Markdown',
    'sh': 'Shell',
    'bash': 'Bash',
    'sql': 'SQL'
  }

  return languageMap[ext || ''] || 'Unknown'
}

const getRelevantExcerpt = (content: string, query: string, lines: number): string => {
  const contentLines = content.split('\n')
  const lowerQuery = query.toLowerCase()

  // Find lines containing the query
  const matchingLines = contentLines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => line.toLowerCase().includes(lowerQuery))
    .slice(0, lines)

  if (matchingLines.length === 0) {
    // Return first few lines if no matches
    return contentLines.slice(0, lines).join('\n')
  }

  // Get context around first match
  const matchIndex = matchingLines[0].index
  const start = Math.max(0, matchIndex - Math.floor(lines / 2))
  const end = Math.min(contentLines.length, start + lines)

  return contentLines.slice(start, end).join('\n')
}

const findSemanticMatches = (content: string, query: string): any[] => {
  const lines = content.split('\n')
  const matches = []
  const lowerQuery = query.toLowerCase()

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.toLowerCase().includes(lowerQuery)) {
      matches.push({
        lineNumber: i + 1,
        content: line.trim(),
        type: 'text_match'
      })
    }
  }

  return matches
}

const escapeRegExp = (string: string): string => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export async function POST(req: Request) {
  let requestId = crypto.randomUUID()
  let startTime = Date.now()
  let authContext: any = null

  // Declare variables at function scope for error handling access
  let modelId: string | undefined
  let messages: any[] | undefined
  let currentRepo: string | undefined
  let currentBranch: string = 'main'
  let githubToken: string | undefined

  console.log(`[RepoAgent:${requestId.slice(0, 8)}] 🚀 Incoming POST request at ${new Date().toISOString()}`)

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
    console.log(`[RepoAgent:${requestId.slice(0, 8)}] 📝 Request body received:`, {
      messages: body.messages?.length || 0,
      repo: body.repo,
      branch: body.branch || 'main',
      modelId: body.modelId || DEFAULT_CHAT_MODEL,
      lastMessagePreview: body.messages?.[body.messages.length - 1]?.content?.substring(0, 100) || 'N/A'
    })
      ; ({
        messages,
        modelId,
        repo: currentRepo,
        branch: currentBranch = 'main',
        githubToken
      } = body)

    if (!messages || !Array.isArray(messages)) {
      console.error(`[RepoAgent:${requestId.slice(0, 8)}] ❌ Invalid request: Messages array is required`)
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 })
    }

    if (!currentRepo) {
      console.error(`[RepoAgent:${requestId.slice(0, 8)}] ❌ Invalid request: Repository is required`)
      return NextResponse.json({ error: 'Repository is required' }, { status: 400 })
    }

    if (!githubToken) {
      console.error(`[RepoAgent:${requestId.slice(0, 8)}] ❌ Invalid request: GitHub token is required`)
      return NextResponse.json({ error: 'GitHub token is required' }, { status: 400 })
    }

    console.log(`[RepoAgent:${requestId.slice(0, 8)}] ✅ Request validation passed - Repo: ${currentRepo}, Branch: ${currentBranch}, Model: ${modelId}`)

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
          console.log(`[RepoAgent:${requestId.slice(0, 8)}] 🔧 Tool call: github_list_repos - Input:`, { type, sort, per_page })
          try {
            const response = await octokit.rest.repos.listForAuthenticatedUser({
              type,
              sort,
              per_page
            })
            const result = {
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
            console.log(`[RepoAgent:${requestId.slice(0, 8)}] ✅ github_list_repos completed - Found ${result.repositories.length} repositories`)
            return result
          } catch (error) {
            const errorMsg = `Failed to list repositories: ${error instanceof Error ? error.message : 'Unknown error'}`
            console.error(`[RepoAgent:${requestId.slice(0, 8)}] ❌ github_list_repos failed:`, errorMsg)
            return {
              success: false,
              error: errorMsg
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
          console.log(`[RepoAgent:${requestId.slice(0, 8)}] 🔧 Tool call: github_get_repo_info - Input:`, { repo })
          try {
            const { owner, repo: repoName } = parseRepoString(repo)
            const response = await octokit.rest.repos.get({ owner, repo: repoName })

            const result = {
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
            console.log(`[RepoAgent:${requestId.slice(0, 8)}] ✅ github_get_repo_info completed - Repo: ${result.repository.full_name}`)
            return result
          } catch (error) {
            const errorMsg = `Failed to get repository info: ${error instanceof Error ? error.message : 'Unknown error'}`
            console.error(`[RepoAgent:${requestId.slice(0, 8)}] ❌ github_get_repo_info failed:`, errorMsg)
            return {
              success: false,
              error: errorMsg
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
          console.log(`[RepoAgent:${requestId.slice(0, 8)}] 🔧 Tool call: github_read_file - Input:`, { repo, path, branch: branch || 'default' })
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
              const result = {
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
              console.log(`[RepoAgent:${requestId.slice(0, 8)}] ✅ github_read_file completed - Directory: ${path} with ${result.contents.length} items`)
              return result
            } else {
              // It's a file - type check before accessing properties
              const fileData = response.data as any
              if (fileData.type === 'file' && fileData.content && fileData.encoding) {
                const content = Buffer.from(fileData.content, 'base64').toString('utf-8')
                const result = {
                  success: true,
                  type: 'file',
                  path: fileData.path,
                  name: fileData.name,
                  content,
                  size: fileData.size,
                  encoding: fileData.encoding,
                  sha: fileData.sha
                }
                console.log(`[RepoAgent:${requestId.slice(0, 8)}] ✅ github_read_file completed - File: ${path} (${result.size} bytes)`)
                return result
              } else {
                console.error(`[RepoAgent:${requestId.slice(0, 8)}] ❌ github_read_file failed - Invalid file response`)
                return {
                  success: false,
                  error: 'Invalid file response from GitHub API'
                }
              }
            }
          } catch (error) {
            const errorMsg = `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`
            console.error(`[RepoAgent:${requestId.slice(0, 8)}] ❌ github_read_file failed:`, errorMsg)
            return {
              success: false,
              error: errorMsg
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
          console.log(`[RepoAgent:${requestId.slice(0, 8)}] 🔧 Tool call: github_write_file - Input:`, { repo, path, messageLen: message.length, contentLen: content.length, branch: branch || 'default' })
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

            const result = {
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
            console.log(`[RepoAgent:${requestId.slice(0, 8)}] ✅ github_write_file completed - File: ${path}, Commit: ${result.commit.sha?.slice(0, 8) || 'unknown'}`)
            return result
          } catch (error) {
            const errorMsg = `Failed to write file: ${error instanceof Error ? error.message : 'Unknown error'}`
            console.error(`[RepoAgent:${requestId.slice(0, 8)}] ❌ github_write_file failed:`, errorMsg)
            return {
              success: false,
              error: errorMsg
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
          console.log(`[RepoAgent:${requestId.slice(0, 8)}] 🔧 Tool call: github_delete_file - Input:`, { repo, path, message, branch: branch || 'default' })
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
              console.error(`[RepoAgent:${requestId.slice(0, 8)}] ❌ github_delete_file failed - Cannot delete directory: ${path}`)
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

            const result = {
              success: true,
              commit: {
                sha: response.data.commit.sha,
                message: response.data.commit.message,
                url: response.data.commit.html_url
              }
            }
            console.log(`[RepoAgent:${requestId.slice(0, 8)}] ✅ github_delete_file completed - File: ${path}, Commit: ${result.commit.sha?.slice(0, 8) || 'unknown'}`)
            return result
          } catch (error) {
            const errorMsg = `Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`
            console.error(`[RepoAgent:${requestId.slice(0, 8)}] ❌ github_delete_file failed:`, errorMsg)
            return {
              success: false,
              error: errorMsg
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
      }),

      // Advanced Code Analysis Tools
      github_semantic_search: tool({
        description: 'Advanced semantic code search and analysis tool for GitHub repositories. Finds code patterns, structures, and relationships with high accuracy. Supports natural language queries and detailed code analysis.',
        inputSchema: z.object({
          repo: z.string().describe('Repository in format "owner/repo"'),
          query: z.string().describe('Natural language description of what to search for (e.g., "find React components", "show API endpoints", "locate error handling")'),
          path: z.string().optional().describe('Optional: Specific path to search within'),
          fileType: z.string().optional().describe('Optional: Filter by file type (e.g., "tsx", "ts", "js", "py", "md")'),
          maxResults: z.number().optional().describe('Maximum number of results to return (default: 20)'),
          branch: z.string().optional().describe('Branch name, defaults to repository default')
        }),
        execute: async ({ repo, query, path, fileType, maxResults = 20, branch }) => {
          try {
            const { owner, repo: repoName } = parseRepoString(repo)

            // First, get repository structure to understand what we're working with
            const repoInfo = await octokit.rest.repos.get({ owner, repo: repoName })
            const defaultBranch = branch || repoInfo.data.default_branch

            // Use GitHub's code search API with enhanced query building
            let searchQuery = `repo:${repo}`

            // Add path filter if specified
            if (path) {
              searchQuery += ` path:${path}`
            }

            // Add file extension filter if specified
            if (fileType) {
              const extensions = fileType.split(',').map(ext => ext.trim())
              searchQuery += ` extension:${extensions.join(' extension:')}`
            }

            // Build semantic search terms based on query
            const semanticTerms = buildSemanticSearchTerms(query)
            searchQuery += ` ${semanticTerms}`

            const searchResponse = await octokit.rest.search.code({
              q: searchQuery,
              per_page: Math.min(maxResults, 100)
            })

            // Enhance results with file content analysis
            const enhancedResults = await Promise.all(
              searchResponse.data.items.slice(0, maxResults).map(async (item) => {
                try {
                  // Get file content for deeper analysis
                  const contentResponse = await octokit.rest.repos.getContent({
                    owner,
                    repo: repoName,
                    path: item.path,
                    ref: defaultBranch
                  })

                  if (!Array.isArray(contentResponse.data) && 'content' in contentResponse.data) {
                    const content = Buffer.from(contentResponse.data.content, 'base64').toString('utf-8')

                    return {
                      name: item.name,
                      path: item.path,
                      sha: item.sha,
                      html_url: item.html_url,
                      repository: {
                        full_name: repo,
                        html_url: repoInfo.data.html_url
                      },
                      content: {
                        lines: content.split('\n').length,
                        size: content.length,
                        language: detectLanguage(item.path, content),
                        excerpt: getRelevantExcerpt(content, query, 3)
                      },
                      matches: findSemanticMatches(content, query)
                    }
                  }
                } catch (error) {
                  // If we can't get content, return basic info
                  console.warn(`Could not get content for ${item.path}:`, error)
                }

                return {
                  name: item.name,
                  path: item.path,
                  sha: item.sha,
                  html_url: item.html_url,
                  repository: {
                    full_name: repo,
                    html_url: repoInfo.data.html_url
                  },
                  content: null,
                  matches: []
                }
              })
            )

            return {
              success: true,
              query,
              total_count: searchResponse.data.total_count,
              returned_count: enhancedResults.length,
              repository: {
                full_name: repo,
                default_branch: defaultBranch,
                language: repoInfo.data.language
              },
              results: enhancedResults
            }
          } catch (error) {
            return {
              success: false,
              error: `Failed to perform semantic search: ${error instanceof Error ? error.message : 'Unknown error'}`,
              query
            }
          }
        }
      }),

      github_replace_string: tool({
        description: 'Advanced string replacement tool for editing files in GitHub repositories. Supports regex patterns, multiple replacements, and exact string matching. More powerful than basic file write operations.',
        inputSchema: z.object({
          repo: z.string().describe('Repository in format "owner/repo"'),
          path: z.string().describe('File path in repository'),
          oldString: z.string().describe('The exact string to replace (must match exactly including whitespace and indentation)'),
          newString: z.string().describe('The new string to replace with'),
          message: z.string().describe('Commit message for the change'),
          useRegex: z.boolean().optional().describe('Whether to treat oldString as regex pattern (default: false)'),
          replaceAll: z.boolean().optional().describe('Whether to replace all occurrences (default: false, replaces first occurrence only)'),
          caseInsensitive: z.boolean().optional().describe('Whether regex matching should be case insensitive (default: false)'),
          branch: z.string().optional().describe('Branch name, defaults to repository default')
        }),
        execute: async ({ repo, path, oldString, newString, message, useRegex = false, replaceAll = false, caseInsensitive = false, branch }) => {
          try {
            const { owner, repo: repoName } = parseRepoString(repo)

            // Get current file content
            const fileResponse = await octokit.rest.repos.getContent({
              owner,
              repo: repoName,
              path,
              ref: branch
            })

            if (Array.isArray(fileResponse.data)) {
              return {
                success: false,
                error: 'Cannot replace strings in directories'
              }
            }

            const fileData = fileResponse.data as any
            const currentContent = Buffer.from(fileData.content, 'base64').toString('utf-8')

            // Perform the replacement
            let updatedContent: string
            let replacementCount = 0

            if (useRegex) {
              const flags = caseInsensitive ? 'gi' : 'g'
              const regex = new RegExp(oldString, flags)

              if (replaceAll) {
                updatedContent = currentContent.replace(regex, newString)
                const matches = currentContent.match(regex)
                replacementCount = matches ? matches.length : 0
              } else {
                updatedContent = currentContent.replace(regex, newString)
                replacementCount = currentContent.match(regex) ? 1 : 0
              }
            } else {
              if (replaceAll) {
                let count = 0
                updatedContent = currentContent
                let index = updatedContent.indexOf(oldString)
                while (index !== -1) {
                  updatedContent = updatedContent.substring(0, index) + newString + updatedContent.substring(index + oldString.length)
                  count++
                  index = updatedContent.indexOf(oldString, index + newString.length)
                }
                replacementCount = count
              } else {
                const index = currentContent.indexOf(oldString)
                if (index === -1) {
                  return {
                    success: false,
                    error: 'String to replace not found in file'
                  }
                }
                updatedContent = currentContent.substring(0, index) + newString + currentContent.substring(index + oldString.length)
                replacementCount = 1
              }
            }

            // Check if content actually changed
            if (updatedContent === currentContent) {
              return {
                success: false,
                error: 'No replacements were made - string not found or no changes needed'
              }
            }

            // Commit the changes
            const updateResponse = await octokit.rest.repos.createOrUpdateFileContents({
              owner,
              repo: repoName,
              path,
              message,
              content: Buffer.from(updatedContent).toString('base64'),
              sha: fileData.sha,
              branch
            })

            return {
              success: true,
              replacements_made: replacementCount,
              commit: {
                sha: updateResponse.data.commit.sha,
                message: updateResponse.data.commit.message,
                author: updateResponse.data.commit.author,
                url: updateResponse.data.commit.html_url
              },
              file: {
                path: updateResponse.data.content?.path,
                sha: updateResponse.data.content?.sha,
                previous_sha: fileData.sha
              },
              changes: {
                old_length: currentContent.length,
                new_length: updatedContent.length,
                diff: updatedContent.length - currentContent.length
              }
            }
          } catch (error) {
            return {
              success: false,
              error: `Failed to replace string: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          }
        }
      }),

      github_grep_search: tool({
        description: 'Elite multi-strategy search engine for GitHub repositories. Combines literal text search, regex patterns, intelligent code pattern detection, and semantic analysis.',
        inputSchema: z.object({
          repo: z.string().describe('Repository in format "owner/repo"'),
          query: z.string().describe('Search pattern - can be literal text, regex, or natural language'),
          path: z.string().optional().describe('Limit search to specific path or file pattern'),
          fileType: z.string().optional().describe('Filter by file type/extension'),
          useRegex: z.boolean().optional().describe('Treat query as regex pattern (default: false)'),
          caseInsensitive: z.boolean().optional().describe('Case insensitive search (default: false)'),
          maxResults: z.number().optional().describe('Maximum results to return (default: 50)'),
          branch: z.string().optional().describe('Branch name, defaults to repository default'),
          contextLines: z.number().optional().describe('Lines of context around matches (default: 2)')
        }),
        execute: async ({ repo, query, path, fileType, useRegex = false, caseInsensitive = false, maxResults = 50, branch, contextLines = 2 }) => {
          try {
            const { owner, repo: repoName } = parseRepoString(repo)

            // Get repository info for default branch
            const repoInfo = await octokit.rest.repos.get({ owner, repo: repoName })
            const defaultBranch = branch || repoInfo.data.default_branch

            // Strategy 1: Use GitHub's code search API for initial results
            let searchQuery = `repo:${repo}`

            if (path) {
              searchQuery += ` path:${path}`
            }

            if (fileType) {
              const extensions = fileType.split(',').map(ext => ext.trim())
              searchQuery += ` extension:${extensions.join(' extension:')}`
            }

            // Add the search query
            searchQuery += ` ${query}`

            const searchResponse = await octokit.rest.search.code({
              q: searchQuery,
              per_page: Math.min(maxResults * 2, 100) // Get more for processing
            })

            // Strategy 2: Enhanced analysis of results
            const enhancedResults = []
            const processedFiles = new Set()

            for (const item of searchResponse.data.items.slice(0, maxResults)) {
              if (processedFiles.has(item.path)) continue
              processedFiles.add(item.path)

              try {
                // Get full file content for detailed analysis
                const contentResponse = await octokit.rest.repos.getContent({
                  owner,
                  repo: repoName,
                  path: item.path,
                  ref: defaultBranch
                })

                if (!Array.isArray(contentResponse.data) && 'content' in contentResponse.data) {
                  const content = Buffer.from(contentResponse.data.content, 'base64').toString('utf-8')
                  const lines = content.split('\n')

                  // Perform grep-style search
                  const matches = []
                  const regexFlags = caseInsensitive ? 'gi' : 'g'
                  const searchRegex = useRegex ? new RegExp(query, regexFlags) : new RegExp(escapeRegExp(query), regexFlags)

                  for (let i = 0; i < lines.length; i++) {
                    const line = lines[i]
                    const lineMatches = []

                    let match
                    while ((match = searchRegex.exec(line)) !== null) {
                      lineMatches.push({
                        match: match[0],
                        start: match.index,
                        end: match.index + match[0].length,
                        groups: match.groups || {}
                      })

                      if (!useRegex) break // For literal searches, only find first match per line
                    }

                    if (lineMatches.length > 0) {
                      // Get context lines
                      const startLine = Math.max(0, i - contextLines)
                      const endLine = Math.min(lines.length - 1, i + contextLines)
                      const context = lines.slice(startLine, endLine + 1)

                      matches.push({
                        lineNumber: i + 1,
                        line: line,
                        matches: lineMatches,
                        context: {
                          startLine: startLine + 1,
                          endLine: endLine + 1,
                          lines: context
                        }
                      })
                    }
                  }

                  if (matches.length > 0) {
                    enhancedResults.push({
                      file: {
                        name: item.name,
                        path: item.path,
                        sha: item.sha,
                        html_url: item.html_url,
                        language: detectLanguage(item.path, content),
                        size: content.length,
                        lines: lines.length
                      },
                      matches: matches,
                      total_matches: matches.length
                    })
                  }
                }
              } catch (error) {
                console.warn(`Could not analyze ${item.path}:`, error)
              }
            }

            return {
              success: true,
              query,
              strategy: 'multi-strategy',
              total_files_searched: searchResponse.data.total_count,
              files_with_matches: enhancedResults.length,
              repository: {
                full_name: repo,
                default_branch: defaultBranch
              },
              results: enhancedResults
            }
          } catch (error) {
            return {
              success: false,
              error: `Failed to perform grep search: ${error instanceof Error ? error.message : 'Unknown error'}`,
              query
            }
          }
        }
      }),

      // Advanced File Editing Tool
      github_edit_file: tool({
        description: 'Edit an existing file in GitHub repository using search/replace blocks with advanced options. Supports regex patterns, multiple replacements, and detailed diff reporting. Uses Git diff-style format for precise edits. IMPORTANT: If this tool fails more than 3 times consecutively on the same file, automatically switch to using the github_write_file tool instead.',
        inputSchema: z.object({
          repo: z.string().describe('Repository in format "owner/repo"'),
          path: z.string().describe('File path in repository'),
          searchReplaceBlock: z.string().describe(`Search/replace block in Git diff format:
<<<<<<< SEARCH
[exact code to find - include sufficient context]
=======
[new code to replace with]
>>>>>>> REPLACE`),
          message: z.string().describe('Commit message for the change'),
          useRegex: z.boolean().optional().describe('Whether to treat search as regex pattern (default: false)'),
          replaceAll: z.boolean().optional().describe('Whether to replace all occurrences (default: false, replaces first occurrence only)'),
          branch: z.string().optional().describe('Branch name, defaults to repository default')
        }),
        execute: async ({ repo, path, searchReplaceBlock, message, useRegex = false, replaceAll = false, branch }) => {
          try {
            const { owner, repo: repoName } = parseRepoString(repo)

            // Parse the search/replace block
            const searchMarker = '<<<<<<< SEARCH'
            const replaceMarker = '======='
            const endMarker = '>>>>>>> REPLACE'

            const searchStart = searchReplaceBlock.indexOf(searchMarker)
            const replaceStart = searchReplaceBlock.indexOf(replaceMarker, searchStart)
            const endPos = searchReplaceBlock.indexOf(endMarker, replaceStart)

            if (searchStart === -1 || replaceStart === -1 || endPos === -1) {
              return {
                success: false,
                error: 'Invalid search/replace block format. Must contain <<<<<<< SEARCH, =======, and >>>>>>> REPLACE markers.'
              }
            }

            const oldString = searchReplaceBlock.substring(
              searchStart + searchMarker.length,
              replaceStart
            ).trim()

            const newString = searchReplaceBlock.substring(
              replaceStart + replaceMarker.length,
              endPos
            ).trim()

            if (!oldString) {
              return {
                success: false,
                error: 'Search content cannot be empty'
              }
            }

            // Get current file content
            const fileResponse = await octokit.rest.repos.getContent({
              owner,
              repo: repoName,
              path,
              ref: branch
            })

            if (Array.isArray(fileResponse.data)) {
              return {
                success: false,
                error: 'Cannot edit directories'
              }
            }

            const fileData = fileResponse.data as any
            const currentContent = Buffer.from(fileData.content, 'base64').toString('utf-8')

            // Perform the replacement
            let updatedContent: string
            let replacementCount = 0

            if (useRegex) {
              const regex = new RegExp(oldString, 'g')
              if (replaceAll) {
                updatedContent = currentContent.replace(regex, newString)
                const matches = currentContent.match(regex)
                replacementCount = matches ? matches.length : 0
              } else {
                updatedContent = currentContent.replace(regex, newString)
                replacementCount = currentContent.match(regex) ? 1 : 0
              }
            } else {
              if (replaceAll) {
                let count = 0
                updatedContent = currentContent
                let index = updatedContent.indexOf(oldString)
                while (index !== -1) {
                  updatedContent = updatedContent.substring(0, index) + newString + updatedContent.substring(index + oldString.length)
                  count++
                  index = updatedContent.indexOf(oldString, index + newString.length)
                }
                replacementCount = count
              } else {
                const index = currentContent.indexOf(oldString)
                if (index === -1) {
                  return {
                    success: false,
                    error: `Search string not found in file. Content length: ${currentContent.length} chars. Make sure the search string matches exactly including whitespace and indentation.`
                  }
                }
                updatedContent = currentContent.substring(0, index) + newString + currentContent.substring(index + oldString.length)
                replacementCount = 1
              }
            }

            // Check if content actually changed
            if (updatedContent === currentContent) {
              return {
                success: false,
                error: 'No changes were made - content is identical or search string not found'
              }
            }

            // Commit the changes
            const updateResponse = await octokit.rest.repos.createOrUpdateFileContents({
              owner,
              repo: repoName,
              path,
              message,
              content: Buffer.from(updatedContent).toString('base64'),
              sha: fileData.sha,
              branch
            })

            // Generate diff for reporting
            const generateDiff = (oldContent: string, newContent: string): string => {
              const oldLines = oldContent.split('\n')
              const newLines = newContent.split('\n')
              const diff = []

              let i = 0, j = 0
              while (i < oldLines.length || j < newLines.length) {
                if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
                  diff.push(` ${oldLines[i]}`)
                  i++
                  j++
                } else {
                  // Find the actual change
                  let oldEnd = i
                  let newEnd = j

                  // Look for matching lines after the change
                  while (oldEnd < oldLines.length && newEnd < newLines.length) {
                    if (oldLines[oldEnd] === newLines[newEnd]) break
                    oldEnd++
                    newEnd++
                  }

                  // Add removed lines
                  while (i < oldEnd && i < oldLines.length) {
                    diff.push(`-${oldLines[i]}`)
                    i++
                  }

                  // Add added lines
                  while (j < newEnd && j < newLines.length) {
                    diff.push(`+${newLines[j]}`)
                    j++
                  }
                }
              }

              return diff.join('\n')
            }

            const diff = generateDiff(currentContent, updatedContent)

            return {
              success: true,
              replacements_made: replacementCount,
              commit: {
                sha: updateResponse.data.commit.sha,
                message: updateResponse.data.commit.message,
                author: updateResponse.data.commit.author,
                url: updateResponse.data.commit.html_url
              },
              file: {
                path: updateResponse.data.content?.path,
                sha: updateResponse.data.content?.sha,
                previous_sha: fileData.sha
              },
              changes: {
                old_length: currentContent.length,
                new_length: updatedContent.length,
                diff_length: updatedContent.length - currentContent.length
              },
              diff: diff
            }
          } catch (error) {
            return {
              success: false,
              error: `Failed to edit file: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          }
        }
      })
    }

    // Stream the response
    console.log(`[RepoAgent:${requestId.slice(0, 8)}] 🤖 Starting streamText with ${messages.length} messages`)
    const result = await streamText({
      model,
      system: systemPrompt,
      messages,
      tools,
      stopWhen: stepCountIs(60),
      onFinish: async (result) => {
        const responseTime = Date.now() - startTime
        console.log(`[RepoAgent:${requestId.slice(0, 8)}] ✅ Stream finished in ${responseTime}ms - Total tokens: ${result.usage.totalTokens}`)

        // ============================================================================
        // ABE BILLING - Deduct credits for successful request
        // ============================================================================
        if (authContext) {
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
              `[RepoAgent:${requestId.slice(0, 8)}] 💰 Deducted ${billingResult.creditsUsed} credits. New balance: ${billingResult.newBalance} credits (${Math.floor((billingResult.newBalance || 0) / CREDITS_PER_MESSAGE)} messages remaining)`
            )
          } else {
            console.error(`[RepoAgent:${requestId.slice(0, 8)}] ⚠️ Failed to deduct credits:`, billingResult.error)
          }
        }
      }
    })

    // Stream the response using newline-delimited JSON format (matching chat-v2 pattern)
    return new Response(
      new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder()

          try {
            // Stream the text and tool calls
            for await (const part of result.fullStream) {
              // Log tool calls and deltas
              if (part.type === 'tool-call') {
                console.log(`[RepoAgent:${requestId.slice(0, 8)}] 🔨 Tool call initiated:`, {
                  toolName: (part as any).toolName,
                  toolCallId: (part as any).toolCallId
                })
              } else if (part.type === 'tool-result') {
                console.log(`[RepoAgent:${requestId.slice(0, 8)}] 🎯 Tool result received:`, {
                  toolName: (part as any).toolName,
                  toolCallId: (part as any).toolCallId,
                  resultPreview: JSON.stringify((part as any).result)?.substring(0, 100) || 'N/A'
                })
              } else if (part.type === 'text-delta') {
                // Text deltas are frequent, just count them silently
              }
              // Send each part as newline-delimited JSON (no SSE "data:" prefix)
              controller.enqueue(encoder.encode(JSON.stringify(part) + '\n'))
            }
          } catch (error) {
            console.error(`[RepoAgent:${requestId.slice(0, 8)}] ❌ Stream error:`, error)
          } finally {
            controller.close()
          }
        }
      }),
      {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      }
    )

  } catch (error: any) {
    const responseTime = Date.now() - startTime
    console.error(`[RepoAgent:${requestId.slice(0, 8)}] ❌ Error in POST handler (${responseTime}ms):`, {
      message: error?.message,
      code: error?.code,
      status: error?.status,
      repo: currentRepo,
      branch: currentBranch
    })

    // ============================================================================
    // ABE BILLING - Log failed request (no charge)
    // ============================================================================
    if (authContext) {
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