/**
 * Agent Cloud API
 *
 * API endpoint for running Claude Code in E2B sandboxes.
 * Configured with Vercel AI Gateway for unified AI routing.
 *
 * Features:
 * - Sandbox reuse with Sandbox.connect() for persistent sessions
 * - Conversation memory persistence across messages
 * - Real-time streaming with Server-Sent Events
 * - GitHub repo cloning and git operations
 * - Internet access enabled for sandboxes
 * - MCP support (DuckDuckGo, Arxiv) for web search capabilities
 * - Public repo cloning (no token required)
 *
 * POST /api/agent-cloud
 * - action: 'create' - Create or connect to existing sandbox
 * - action: 'run' - Run a Claude Code prompt (with memory)
 * - action: 'playwright' - Run a Playwright script
 * - action: 'commit' - Commit changes in the sandbox
 * - action: 'push' - Push changes to remote
 * - action: 'diff' - Get git diff stats
 * - action: 'terminate' - Terminate a sandbox
 * - action: 'status' - Get sandbox status
 * - action: 'list' - List all sandboxes for user
 *
 * Environment Variables Required:
 * - VERCEL_AI_GATEWAY_API_KEY: Your Vercel AI Gateway API key
 * - E2B_API_KEY: Your E2B API key (for sandbox creation)
 */

import { NextRequest, NextResponse } from 'next/server'
import { Sandbox } from 'e2b'
import { createClient } from '@/lib/supabase/server'
import { getDeploymentTokens } from '@/lib/cloud-sync'

// Vercel AI Gateway configuration
const AI_GATEWAY_BASE_URL = 'https://ai-gateway.vercel.sh'

// Available models through Vercel AI Gateway
const AVAILABLE_MODELS = {
  sonnet: 'xai/grok-code-fast-1',      // Fast code generation
  opus: 'zai/glm-4.7',                  // High quality
  haiku: 'mistral/devstral-small-2',   // Quick tasks
} as const

// Store active sandboxes with user association
// Key: `${userId}-${repoFullName}` or `${userId}-default`
const activeSandboxes = new Map<string, {
  sandboxId: string
  sandbox: Sandbox
  createdAt: Date
  lastActivity: Date
  model?: string
  userId: string
  repo?: {
    full_name: string
    branch: string
    cloned: boolean
  }
  // Conversation history for memory persistence
  conversationHistory: Array<{
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
  }>
}>()

// Cleanup inactive sandboxes after 30 minutes (increased from 10)
const SANDBOX_TIMEOUT = 30 * 60 * 1000

// Working directory for cloned repos
const PROJECT_DIR = '/home/user/project'

// Conversation history file path in sandbox
const HISTORY_FILE = '/home/user/.claude_history.json'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, sandboxId, prompt, script, config, message } = body

    switch (action) {
      case 'create':
        return handleCreate(request, config)

      case 'run':
        return handleRun(sandboxId, prompt, body.options)

      case 'playwright':
        return handlePlaywright(sandboxId, script)

      case 'commit':
        return handleCommit(sandboxId, message)

      case 'push':
        return handlePush(request, sandboxId)

      case 'diff':
        return handleDiff(sandboxId)

      case 'terminate':
        return handleTerminate(sandboxId)

      case 'status':
        return handleStatus(sandboxId)

      case 'list':
        return handleList(request)

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: create, run, playwright, commit, push, diff, terminate, status, list' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('[Agent Cloud API] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint for streaming output
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const sandboxId = searchParams.get('sandboxId')
  const prompt = searchParams.get('prompt')

  if (!sandboxId || !prompt) {
    return NextResponse.json(
      { error: 'sandboxId and prompt are required for streaming' },
      { status: 400 }
    )
  }

  // Find sandbox entry by sandboxId
  let sandboxEntry: typeof activeSandboxes extends Map<string, infer V> ? V : never | undefined
  let entryKey: string | undefined

  for (const [key, entry] of activeSandboxes.entries()) {
    if (entry.sandboxId === sandboxId) {
      sandboxEntry = entry
      entryKey = key
      break
    }
  }

  if (!sandboxEntry) {
    // Try to reconnect to the sandbox
    try {
      console.log(`[Agent Cloud] Attempting to reconnect to sandbox: ${sandboxId}`)
      const sandbox = await Sandbox.connect(sandboxId)

      // Create a temporary entry for this reconnected sandbox
      sandboxEntry = {
        sandboxId,
        sandbox,
        createdAt: new Date(),
        lastActivity: new Date(),
        userId: 'reconnected',
        conversationHistory: []
      }
    } catch (error) {
      console.error(`[Agent Cloud] Failed to reconnect to sandbox ${sandboxId}:`, error)
      return NextResponse.json(
        { error: 'Sandbox not found or expired. Create a new session.' },
        { status: 404 }
      )
    }
  }

  // Determine working directory based on repo
  const workDir = sandboxEntry.repo?.cloned ? PROJECT_DIR : '/home/user'

  // Add user message to conversation history
  sandboxEntry.conversationHistory.push({
    role: 'user',
    content: prompt,
    timestamp: new Date()
  })

  // Create a streaming response
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const { sandbox } = sandboxEntry!
        sandboxEntry!.lastActivity = new Date()

        // Send start event
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'start', sandboxId })}\n\n`))

        // Build conversation context for Claude
        const conversationContext = sandboxEntry!.conversationHistory
          .slice(-10) // Last 10 messages for context
          .map(msg => `${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`)
          .join('\n\n')

        // Create prompt with conversation history
        const fullPrompt = conversationContext
          ? `Previous conversation:\n${conversationContext}\n\nCurrent request: ${prompt}`
          : prompt

        const escapedPrompt = fullPrompt.replace(/'/g, "'\\''")
        const command = `cd ${workDir} && echo '${escapedPrompt}' | claude -p --dangerously-skip-permissions`

        let fullOutput = ''

        const result = await sandbox.commands.run(command, {
          timeoutMs: 0,
          onStdout: (data) => {
            fullOutput += data
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'stdout', data })}\n\n`))
          },
          onStderr: (data) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'stderr', data })}\n\n`))
          }
        })

        // Add assistant response to conversation history
        sandboxEntry!.conversationHistory.push({
          role: 'assistant',
          content: fullOutput,
          timestamp: new Date()
        })

        // Save conversation history to sandbox for persistence
        try {
          await sandbox.files.write(
            HISTORY_FILE,
            JSON.stringify(sandboxEntry!.conversationHistory, null, 2)
          )
        } catch (e) {
          console.warn('[Agent Cloud] Failed to save conversation history:', e)
        }

        // Get git diff stats if repo is cloned
        let diffStats = { additions: 0, deletions: 0 }
        if (sandboxEntry!.repo?.cloned) {
          try {
            const diffResult = await sandbox.commands.run(
              `cd ${PROJECT_DIR} && git diff --shortstat`,
              { timeoutMs: 5000 }
            )
            const match = diffResult.stdout?.match(/(\d+) insertion.*?(\d+) deletion/)
            if (match) {
              diffStats = { additions: parseInt(match[1]), deletions: parseInt(match[2]) }
            }
          } catch (e) {
            // Ignore diff errors
          }
        }

        // Send completion event
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'complete',
          exitCode: result.exitCode,
          output: fullOutput,
          diffStats,
          messageCount: sandboxEntry!.conversationHistory.length
        })}\n\n`))

        controller.close()
      } catch (error) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'error',
          message: error instanceof Error ? error.message : 'Unknown error'
        })}\n\n`))
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  })
}

/**
 * Create or reconnect to a sandbox session
 * If user already has a sandbox for this repo, reconnect to it
 */
async function handleCreate(
  request: NextRequest,
  config?: {
    model?: 'sonnet' | 'opus' | 'haiku'
    template?: string
    repo?: {
      full_name: string
      branch: string
    }
  }
) {
  // Cleanup old sandboxes first
  cleanupInactiveSandboxes()

  // Get current user
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }

  const userId = user.id

  // Get Vercel AI Gateway API key
  const aiGatewayKey = process.env.VERCEL_AI_GATEWAY_API_KEY
  if (!aiGatewayKey) {
    return NextResponse.json(
      { error: 'VERCEL_AI_GATEWAY_API_KEY not configured. Add it to your environment variables.' },
      { status: 500 }
    )
  }

  // Create sandbox key for this user/repo combination
  const sandboxKey = config?.repo
    ? `${userId}-${config.repo.full_name}`
    : `${userId}-default`

  // Check if we already have an active sandbox for this user/repo
  const existingEntry = activeSandboxes.get(sandboxKey)
  if (existingEntry) {
    try {
      // Try to reconnect to verify it's still alive
      console.log(`[Agent Cloud] Reconnecting to existing sandbox: ${existingEntry.sandboxId}`)
      const sandbox = await Sandbox.connect(existingEntry.sandboxId)

      // Update the entry
      existingEntry.sandbox = sandbox
      existingEntry.lastActivity = new Date()

      console.log(`[Agent Cloud] Reconnected to sandbox: ${existingEntry.sandboxId}`)

      return NextResponse.json({
        success: true,
        sandboxId: existingEntry.sandboxId,
        model: AVAILABLE_MODELS[existingEntry.model as keyof typeof AVAILABLE_MODELS || 'sonnet'],
        gateway: AI_GATEWAY_BASE_URL,
        repoCloned: existingEntry.repo?.cloned || false,
        projectDir: existingEntry.repo?.cloned ? PROJECT_DIR : '/home/user',
        reconnected: true,
        messageCount: existingEntry.conversationHistory.length,
        message: 'Reconnected to existing sandbox',
      })
    } catch (error) {
      console.log(`[Agent Cloud] Existing sandbox expired, creating new one`)
      activeSandboxes.delete(sandboxKey)
    }
  }

  // Also check E2B for any running sandboxes with matching metadata
  try {
    const paginator = Sandbox.list({
      query: {
        state: ['running'],
        metadata: { userId, repo: config?.repo?.full_name || 'default' }
      }
    })
    const runningSandboxes = await paginator.nextItems()

    if (runningSandboxes.length > 0) {
      const existingSandbox = runningSandboxes[0]
      console.log(`[Agent Cloud] Found running sandbox in E2B: ${existingSandbox.sandboxId}`)

      try {
        const sandbox = await Sandbox.connect(existingSandbox.sandboxId)

        // Load conversation history from sandbox if exists
        let conversationHistory: any[] = []
        try {
          const historyContent = await sandbox.files.read(HISTORY_FILE)
          conversationHistory = JSON.parse(historyContent)
        } catch (e) {
          // No history file yet
        }

        const entry = {
          sandboxId: existingSandbox.sandboxId,
          sandbox,
          createdAt: existingSandbox.startedAt,
          lastActivity: new Date(),
          model: config?.model || 'sonnet',
          userId,
          repo: config?.repo ? {
            full_name: config.repo.full_name,
            branch: config.repo.branch,
            cloned: true // Assume cloned if sandbox exists
          } : undefined,
          conversationHistory
        }

        activeSandboxes.set(sandboxKey, entry)

        return NextResponse.json({
          success: true,
          sandboxId: existingSandbox.sandboxId,
          model: AVAILABLE_MODELS[config?.model || 'sonnet'],
          gateway: AI_GATEWAY_BASE_URL,
          repoCloned: true,
          projectDir: PROJECT_DIR,
          reconnected: true,
          messageCount: conversationHistory.length,
          message: 'Reconnected to running sandbox from E2B',
        })
      } catch (error) {
        console.warn(`[Agent Cloud] Failed to reconnect to E2B sandbox:`, error)
      }
    }
  } catch (error) {
    console.warn(`[Agent Cloud] Failed to list E2B sandboxes:`, error)
  }

  // Get GitHub token if repo is specified
  let githubToken: string | undefined
  if (config?.repo) {
    try {
      const tokens = await getDeploymentTokens(userId)
      githubToken = tokens?.github
      console.log(`[Agent Cloud] GitHub token available: ${!!githubToken}`)
    } catch (e) {
      console.warn('[Agent Cloud] Failed to get GitHub token:', e)
    }
  }

  // Configure environment variables for Claude Code with Vercel AI Gateway
  const envs: Record<string, string> = {
    // Vercel AI Gateway configuration
    ANTHROPIC_BASE_URL: AI_GATEWAY_BASE_URL,
    ANTHROPIC_AUTH_TOKEN: aiGatewayKey,
    ANTHROPIC_API_KEY: '', // Must be empty - Claude Code checks this first

    // Model overrides via AI Gateway
    ANTHROPIC_DEFAULT_SONNET_MODEL: AVAILABLE_MODELS.sonnet,
    ANTHROPIC_DEFAULT_OPUS_MODEL: AVAILABLE_MODELS.opus,
    ANTHROPIC_DEFAULT_HAIKU_MODEL: AVAILABLE_MODELS.haiku,

    // Playwright configuration
    PLAYWRIGHT_BROWSERS_PATH: '0',
  }

  // Add GitHub token if available
  if (githubToken) {
    envs.GITHUB_TOKEN = githubToken
  }

  // Use our custom template or fall back to base
  const template = config?.template || 'base'
  const selectedModel = config?.model || 'sonnet'

  console.log(`[Agent Cloud] Creating new sandbox with template: ${template}`)
  console.log(`[Agent Cloud] Using Vercel AI Gateway: ${AI_GATEWAY_BASE_URL}`)
  console.log(`[Agent Cloud] Default model: ${AVAILABLE_MODELS[selectedModel]}`)

  const sandbox = await Sandbox.create(template, {
    timeoutMs: 30 * 60 * 1000, // 30 minutes timeout
    envs,
    metadata: {
      userId,
      repo: config?.repo?.full_name || 'default',
      model: selectedModel
    }
  })

  const sandboxId = sandbox.sandboxId
  let repoCloned = false

  // Install Claude Code CLI in the sandbox
  console.log(`[Agent Cloud] Installing Claude Code CLI...`)
  try {
    const installResult = await sandbox.commands.run(
      'npm install -g @anthropic-ai/claude-code',
      { timeoutMs: 120000 }
    )
    if (installResult.exitCode !== 0) {
      console.warn(`[Agent Cloud] Claude Code install warning:`, installResult.stderr)
    } else {
      console.log(`[Agent Cloud] Claude Code CLI installed successfully`)
    }
  } catch (e) {
    console.warn(`[Agent Cloud] Failed to install Claude Code CLI:`, e)
  }

  // Setup MCP configuration for web search (DuckDuckGo, Arxiv)
  console.log(`[Agent Cloud] Setting up MCP tools (DuckDuckGo, Arxiv)...`)
  try {
    // Create .claude directory for MCP config
    await sandbox.commands.run('mkdir -p /home/user/.claude', { timeoutMs: 5000 })

    // MCP configuration for DuckDuckGo and Arxiv search
    const mcpConfig = JSON.stringify({
      mcpServers: {
        duckduckgo: {
          command: "npx",
          args: ["-y", "@anthropic/mcp-server-duckduckgo"]
        },
        arxiv: {
          command: "npx",
          args: ["-y", "@anthropic/mcp-server-arxiv"],
          env: {
            STORAGE_PATH: "/home/user/.arxiv"
          }
        },
        filesystem: {
          command: "npx",
          args: ["-y", "@anthropic/mcp-server-filesystem", PROJECT_DIR]
        }
      }
    }, null, 2)

    await sandbox.files.write('/home/user/.claude/mcp.json', mcpConfig)
    console.log(`[Agent Cloud] MCP tools configured successfully`)
  } catch (e) {
    console.warn(`[Agent Cloud] Failed to setup MCP tools:`, e)
  }

  // Clone repo if specified (supports both public and private repos)
  if (config?.repo) {
    try {
      console.log(`[Agent Cloud] Cloning repo: ${config.repo.full_name} (${config.repo.branch})`)

      // Use authenticated URL for private repos, public URL for public repos
      const cloneUrl = githubToken
        ? `https://${githubToken}@github.com/${config.repo.full_name}.git`
        : `https://github.com/${config.repo.full_name}.git`

      console.log(`[Agent Cloud] Cloning with ${githubToken ? 'authenticated' : 'public'} URL`)

      const cloneResult = await sandbox.commands.run(
        `git clone --branch ${config.repo.branch} --single-branch --depth 50 ${cloneUrl} ${PROJECT_DIR}`,
        { timeoutMs: 180000 } // 3 minutes timeout for large repos
      )

      if (cloneResult.exitCode === 0) {
        repoCloned = true
        console.log(`[Agent Cloud] Repo cloned successfully`)

        // Configure git user
        await sandbox.commands.run(
          `cd ${PROJECT_DIR} && git config user.email "agent@pipilot.dev" && git config user.name "PiPilot Agent"`,
          { timeoutMs: 5000 }
        )

        // Create a new working branch for Claude's changes
        const workingBranch = `claude-agent-${Date.now()}`
        const branchResult = await sandbox.commands.run(
          `cd ${PROJECT_DIR} && git checkout -b ${workingBranch}`,
          { timeoutMs: 10000 }
        )

        if (branchResult.exitCode === 0) {
          console.log(`[Agent Cloud] Created working branch: ${workingBranch}`)
        } else {
          console.warn(`[Agent Cloud] Failed to create working branch:`, branchResult.stderr)
        }

        // Install project dependencies if package.json exists
        console.log(`[Agent Cloud] Checking for project dependencies...`)
        try {
          const depsResult = await sandbox.commands.run(
            `cd ${PROJECT_DIR} && [ -f package.json ] && npm install || echo "No package.json"`,
            { timeoutMs: 180000 }
          )
          if (depsResult.stdout?.includes('No package.json')) {
            console.log(`[Agent Cloud] No package.json found, skipping npm install`)
          } else {
            console.log(`[Agent Cloud] Dependencies installed`)
          }
        } catch (e) {
          console.warn(`[Agent Cloud] Dependency installation warning:`, e)
        }
      } else {
        console.error(`[Agent Cloud] Clone failed:`, cloneResult.stderr)

        // Try public clone if private failed
        if (githubToken && cloneResult.stderr?.includes('Authentication')) {
          console.log(`[Agent Cloud] Retrying with public URL...`)
          const publicCloneResult = await sandbox.commands.run(
            `git clone --branch ${config.repo.branch} --single-branch --depth 50 https://github.com/${config.repo.full_name}.git ${PROJECT_DIR}`,
            { timeoutMs: 180000 }
          )
          if (publicCloneResult.exitCode === 0) {
            repoCloned = true
            console.log(`[Agent Cloud] Repo cloned successfully with public URL`)

            // Configure git and create branch
            await sandbox.commands.run(
              `cd ${PROJECT_DIR} && git config user.email "agent@pipilot.dev" && git config user.name "PiPilot Agent"`,
              { timeoutMs: 5000 }
            )
            await sandbox.commands.run(
              `cd ${PROJECT_DIR} && git checkout -b claude-agent-${Date.now()}`,
              { timeoutMs: 10000 }
            )
          }
        }
      }
    } catch (error) {
      console.error(`[Agent Cloud] Failed to clone repo:`, error)
    }
  }

  // Store sandbox entry
  activeSandboxes.set(sandboxKey, {
    sandboxId,
    sandbox,
    createdAt: new Date(),
    lastActivity: new Date(),
    model: selectedModel,
    userId,
    repo: config?.repo ? {
      full_name: config.repo.full_name,
      branch: config.repo.branch,
      cloned: repoCloned,
    } : undefined,
    conversationHistory: []
  })

  console.log(`[Agent Cloud] Sandbox created: ${sandboxId}`)

  return NextResponse.json({
    success: true,
    sandboxId,
    model: AVAILABLE_MODELS[selectedModel],
    gateway: AI_GATEWAY_BASE_URL,
    repoCloned,
    projectDir: repoCloned ? PROJECT_DIR : '/home/user',
    reconnected: false,
    messageCount: 0,
    mcpEnabled: true,
    mcpTools: ['duckduckgo', 'arxiv', 'filesystem'],
    message: repoCloned
      ? `Sandbox created with ${config?.repo?.full_name} cloned (MCP enabled)`
      : 'Sandbox created with Vercel AI Gateway (MCP enabled)',
  })
}

/**
 * Run a Claude Code prompt
 */
async function handleRun(
  sandboxId: string,
  prompt: string,
  options?: {
    workingDirectory?: string
    timeoutMs?: number
  }
) {
  if (!sandboxId || !prompt) {
    return NextResponse.json(
      { error: 'sandboxId and prompt are required' },
      { status: 400 }
    )
  }

  // Find sandbox entry
  let sandboxEntry: typeof activeSandboxes extends Map<string, infer V> ? V : never | undefined

  for (const [key, entry] of activeSandboxes.entries()) {
    if (entry.sandboxId === sandboxId) {
      sandboxEntry = entry
      break
    }
  }

  if (!sandboxEntry) {
    // Try to reconnect
    try {
      const sandbox = await Sandbox.connect(sandboxId)
      sandboxEntry = {
        sandboxId,
        sandbox,
        createdAt: new Date(),
        lastActivity: new Date(),
        userId: 'reconnected',
        conversationHistory: []
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Sandbox not found or expired. Create a new session.' },
        { status: 404 }
      )
    }
  }

  const { sandbox } = sandboxEntry
  sandboxEntry.lastActivity = new Date()

  // Use project dir if repo is cloned, otherwise use specified or default
  const workDir = options?.workingDirectory ||
    (sandboxEntry.repo?.cloned ? PROJECT_DIR : '/home/user')

  // Add to conversation history
  sandboxEntry.conversationHistory.push({
    role: 'user',
    content: prompt,
    timestamp: new Date()
  })

  const escapedPrompt = prompt.replace(/'/g, "'\\''")
  const command = `cd ${workDir} && echo '${escapedPrompt}' | claude -p --dangerously-skip-permissions`

  console.log(`[Agent Cloud] Running Claude Code in sandbox ${sandboxId}`)

  let stdout = ''
  let stderr = ''

  const result = await sandbox.commands.run(command, {
    timeoutMs: options?.timeoutMs || 0,
    onStdout: (data) => {
      stdout += data
    },
    onStderr: (data) => {
      stderr += data
    }
  })

  // Add assistant response to history
  sandboxEntry.conversationHistory.push({
    role: 'assistant',
    content: stdout,
    timestamp: new Date()
  })

  // Get recently modified files
  const filesResult = await sandbox.commands.run(
    `find ${workDir} -type f -mmin -5 2>/dev/null | head -50`,
    { timeoutMs: 10000 }
  )
  const files = filesResult.stdout?.split('\n').filter(Boolean) || []

  return NextResponse.json({
    success: true,
    stdout: stdout || result.stdout || '',
    stderr: stderr || result.stderr || '',
    exitCode: result.exitCode || 0,
    files,
    messageCount: sandboxEntry.conversationHistory.length
  })
}

/**
 * Run a Playwright script
 */
async function handlePlaywright(sandboxId: string, script: string) {
  if (!sandboxId || !script) {
    return NextResponse.json(
      { error: 'sandboxId and script are required' },
      { status: 400 }
    )
  }

  // Find sandbox entry
  let sandboxEntry: typeof activeSandboxes extends Map<string, infer V> ? V : never | undefined

  for (const [key, entry] of activeSandboxes.entries()) {
    if (entry.sandboxId === sandboxId) {
      sandboxEntry = entry
      break
    }
  }

  if (!sandboxEntry) {
    return NextResponse.json(
      { error: 'Sandbox not found' },
      { status: 404 }
    )
  }

  const { sandbox } = sandboxEntry
  sandboxEntry.lastActivity = new Date()

  // Write script to sandbox
  const scriptPath = '/app/agent-script.mjs'
  await sandbox.files.write(scriptPath, script)

  console.log(`[Agent Cloud] Running Playwright script in sandbox ${sandboxId}`)

  let stdout = ''
  let stderr = ''

  const result = await sandbox.commands.run(
    `PLAYWRIGHT_BROWSERS_PATH=0 node ${scriptPath}`,
    {
      cwd: '/app',
      onStdout: (data) => {
        stdout += data
      },
      onStderr: (data) => {
        stderr += data
      }
    }
  )

  // Find screenshots
  const screenshotsResult = await sandbox.commands.run(
    'find /home/user -name "*.png" -mmin -5 2>/dev/null',
    { timeoutMs: 5000 }
  )
  const screenshots = screenshotsResult.stdout?.split('\n').filter(Boolean) || []

  return NextResponse.json({
    success: true,
    stdout: stdout || result.stdout || '',
    stderr: stderr || result.stderr || '',
    exitCode: result.exitCode || 0,
    screenshots,
  })
}

/**
 * Commit changes in the sandbox
 */
async function handleCommit(sandboxId: string, message?: string) {
  if (!sandboxId) {
    return NextResponse.json(
      { error: 'sandboxId is required' },
      { status: 400 }
    )
  }

  // Find sandbox entry
  let sandboxEntry: typeof activeSandboxes extends Map<string, infer V> ? V : never | undefined

  for (const [key, entry] of activeSandboxes.entries()) {
    if (entry.sandboxId === sandboxId) {
      sandboxEntry = entry
      break
    }
  }

  if (!sandboxEntry) {
    return NextResponse.json(
      { error: 'Sandbox not found' },
      { status: 404 }
    )
  }

  if (!sandboxEntry.repo?.cloned) {
    return NextResponse.json(
      { error: 'No repo cloned in this sandbox' },
      { status: 400 }
    )
  }

  const { sandbox } = sandboxEntry
  sandboxEntry.lastActivity = new Date()

  const commitMessage = message || 'Changes by PiPilot Agent'

  // Add all changes and commit
  const result = await sandbox.commands.run(
    `cd ${PROJECT_DIR} && git add -A && git commit -m "${commitMessage.replace(/"/g, '\\"')}"`,
    { timeoutMs: 30000 }
  )

  return NextResponse.json({
    success: result.exitCode === 0,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    exitCode: result.exitCode || 0,
    message: result.exitCode === 0 ? 'Changes committed' : 'Commit failed',
  })
}

/**
 * Push changes to remote
 */
async function handlePush(request: NextRequest, sandboxId: string) {
  if (!sandboxId) {
    return NextResponse.json(
      { error: 'sandboxId is required' },
      { status: 400 }
    )
  }

  // Find sandbox entry
  let sandboxEntry: typeof activeSandboxes extends Map<string, infer V> ? V : never | undefined

  for (const [key, entry] of activeSandboxes.entries()) {
    if (entry.sandboxId === sandboxId) {
      sandboxEntry = entry
      break
    }
  }

  if (!sandboxEntry) {
    return NextResponse.json(
      { error: 'Sandbox not found' },
      { status: 404 }
    )
  }

  if (!sandboxEntry.repo?.cloned) {
    return NextResponse.json(
      { error: 'No repo cloned in this sandbox' },
      { status: 400 }
    )
  }

  const { sandbox, repo } = sandboxEntry
  sandboxEntry.lastActivity = new Date()

  // Push to the same branch
  const result = await sandbox.commands.run(
    `cd ${PROJECT_DIR} && git push origin ${repo.branch}`,
    { timeoutMs: 60000 }
  )

  return NextResponse.json({
    success: result.exitCode === 0,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    exitCode: result.exitCode || 0,
    message: result.exitCode === 0 ? 'Changes pushed to remote' : 'Push failed',
  })
}

/**
 * Get git diff stats
 */
async function handleDiff(sandboxId: string) {
  if (!sandboxId) {
    return NextResponse.json(
      { error: 'sandboxId is required' },
      { status: 400 }
    )
  }

  // Find sandbox entry
  let sandboxEntry: typeof activeSandboxes extends Map<string, infer V> ? V : never | undefined

  for (const [key, entry] of activeSandboxes.entries()) {
    if (entry.sandboxId === sandboxId) {
      sandboxEntry = entry
      break
    }
  }

  if (!sandboxEntry) {
    return NextResponse.json(
      { error: 'Sandbox not found' },
      { status: 404 }
    )
  }

  if (!sandboxEntry.repo?.cloned) {
    return NextResponse.json({
      success: true,
      additions: 0,
      deletions: 0,
      changedFiles: 0,
      files: [],
    })
  }

  const { sandbox } = sandboxEntry
  sandboxEntry.lastActivity = new Date()

  // Get diff stats
  const statsResult = await sandbox.commands.run(
    `cd ${PROJECT_DIR} && git diff --shortstat`,
    { timeoutMs: 5000 }
  )

  // Get changed files
  const filesResult = await sandbox.commands.run(
    `cd ${PROJECT_DIR} && git diff --name-only`,
    { timeoutMs: 5000 }
  )

  let additions = 0
  let deletions = 0
  let changedFiles = 0

  const statsMatch = statsResult.stdout?.match(/(\d+) files? changed(?:, (\d+) insertions?\(\+\))?(?:, (\d+) deletions?\(-\))?/)
  if (statsMatch) {
    changedFiles = parseInt(statsMatch[1]) || 0
    additions = parseInt(statsMatch[2]) || 0
    deletions = parseInt(statsMatch[3]) || 0
  }

  const files = filesResult.stdout?.split('\n').filter(Boolean) || []

  return NextResponse.json({
    success: true,
    additions,
    deletions,
    changedFiles,
    files,
  })
}

/**
 * Terminate a sandbox
 */
async function handleTerminate(sandboxId: string) {
  if (!sandboxId) {
    return NextResponse.json(
      { error: 'sandboxId is required' },
      { status: 400 }
    )
  }

  // Find and remove sandbox entry
  let entryKey: string | undefined

  for (const [key, entry] of activeSandboxes.entries()) {
    if (entry.sandboxId === sandboxId) {
      entryKey = key
      break
    }
  }

  if (!entryKey) {
    // Try to kill it directly in E2B
    try {
      const sandbox = await Sandbox.connect(sandboxId)
      await sandbox.kill()
      console.log(`[Agent Cloud] Sandbox terminated via E2B: ${sandboxId}`)
      return NextResponse.json({
        success: true,
        message: 'Sandbox terminated successfully',
      })
    } catch (error) {
      return NextResponse.json(
        { error: 'Sandbox not found' },
        { status: 404 }
      )
    }
  }

  const entry = activeSandboxes.get(entryKey)!

  try {
    await entry.sandbox.kill()
    activeSandboxes.delete(entryKey)
    console.log(`[Agent Cloud] Sandbox terminated: ${sandboxId}`)

    return NextResponse.json({
      success: true,
      message: 'Sandbox terminated successfully',
    })
  } catch (error) {
    activeSandboxes.delete(entryKey)
    return NextResponse.json(
      { error: `Failed to terminate sandbox: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}

/**
 * Get sandbox status
 */
async function handleStatus(sandboxId: string) {
  if (!sandboxId) {
    // Return all active sandboxes
    const sandboxes = Array.from(activeSandboxes.entries()).map(([id, entry]) => ({
      key: id,
      sandboxId: entry.sandboxId,
      createdAt: entry.createdAt.toISOString(),
      lastActivity: entry.lastActivity.toISOString(),
      age: Date.now() - entry.createdAt.getTime(),
      repo: entry.repo,
      messageCount: entry.conversationHistory.length,
      userId: entry.userId
    }))

    return NextResponse.json({
      success: true,
      count: sandboxes.length,
      sandboxes,
    })
  }

  // Find sandbox entry
  let sandboxEntry: typeof activeSandboxes extends Map<string, infer V> ? V : never | undefined

  for (const [key, entry] of activeSandboxes.entries()) {
    if (entry.sandboxId === sandboxId) {
      sandboxEntry = entry
      break
    }
  }

  if (!sandboxEntry) {
    return NextResponse.json(
      { error: 'Sandbox not found' },
      { status: 404 }
    )
  }

  return NextResponse.json({
    success: true,
    sandboxId,
    createdAt: sandboxEntry.createdAt.toISOString(),
    lastActivity: sandboxEntry.lastActivity.toISOString(),
    age: Date.now() - sandboxEntry.createdAt.getTime(),
    repo: sandboxEntry.repo,
    messageCount: sandboxEntry.conversationHistory.length,
  })
}

/**
 * List all sandboxes for current user (from E2B)
 */
async function handleList(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }

  try {
    const paginator = Sandbox.list({
      query: {
        state: ['running'],
        metadata: { userId: user.id }
      }
    })
    const sandboxes = await paginator.nextItems()

    return NextResponse.json({
      success: true,
      count: sandboxes.length,
      sandboxes: sandboxes.map(s => ({
        sandboxId: s.sandboxId,
        startedAt: s.startedAt,
        metadata: s.metadata
      }))
    })
  } catch (error) {
    console.error('[Agent Cloud] Failed to list sandboxes:', error)
    return NextResponse.json({
      success: true,
      count: 0,
      sandboxes: []
    })
  }
}

/**
 * Cleanup inactive sandboxes
 */
function cleanupInactiveSandboxes() {
  const now = Date.now()
  for (const [key, entry] of activeSandboxes.entries()) {
    if (now - entry.lastActivity.getTime() > SANDBOX_TIMEOUT) {
      console.log(`[Agent Cloud] Cleaning up inactive sandbox: ${entry.sandboxId}`)
      entry.sandbox.kill().catch(console.error)
      activeSandboxes.delete(key)
    }
  }
}

// Cleanup on module unload
if (typeof process !== 'undefined') {
  process.on('beforeExit', () => {
    for (const [key, entry] of activeSandboxes.entries()) {
      console.log(`[Agent Cloud] Cleaning up sandbox on exit: ${entry.sandboxId}`)
      entry.sandbox.kill().catch(console.error)
    }
  })
}
