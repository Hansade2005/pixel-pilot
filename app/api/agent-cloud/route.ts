/**
 * Agent Cloud API
 *
 * API endpoint for running Claude Code in E2B sandboxes.
 * Configured with Vercel AI Gateway for unified AI routing.
 *
 * POST /api/agent-cloud
 * - action: 'create' - Create a new sandbox session with repo
 * - action: 'run' - Run a Claude Code prompt
 * - action: 'playwright' - Run a Playwright script
 * - action: 'commit' - Commit changes in the sandbox
 * - action: 'push' - Push changes to remote
 * - action: 'diff' - Get git diff stats
 * - action: 'terminate' - Terminate a sandbox
 * - action: 'status' - Get sandbox status
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

// Store active sandboxes (in production, use Redis or database)
const activeSandboxes = new Map<string, {
  sandbox: Sandbox
  createdAt: Date
  lastActivity: Date
  model?: string
  repo?: {
    full_name: string
    branch: string
    cloned: boolean
  }
}>()

// Cleanup inactive sandboxes after 10 minutes
const SANDBOX_TIMEOUT = 10 * 60 * 1000

// Working directory for cloned repos
const PROJECT_DIR = '/home/user/project'

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

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: create, run, playwright, commit, push, diff, terminate, status' },
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

  // Get sandbox entry
  const sandboxEntry = activeSandboxes.get(sandboxId)
  if (!sandboxEntry) {
    return NextResponse.json(
      { error: 'Sandbox not found' },
      { status: 404 }
    )
  }

  // Determine working directory based on repo
  const workDir = sandboxEntry.repo?.cloned ? PROJECT_DIR : '/home/user'

  // Create a streaming response
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const { sandbox } = sandboxEntry
        sandboxEntry.lastActivity = new Date()

        // Send start event
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'start', sandboxId })}\n\n`))

        const escapedPrompt = prompt.replace(/'/g, "'\\''")
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

        // Get git diff stats if repo is cloned
        let diffStats = { additions: 0, deletions: 0 }
        if (sandboxEntry.repo?.cloned) {
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
          diffStats
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
 * Create a new sandbox session with Vercel AI Gateway
 * Optionally clone a GitHub repo into the sandbox
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

  // Get Vercel AI Gateway API key
  const aiGatewayKey = process.env.VERCEL_AI_GATEWAY_API_KEY
  if (!aiGatewayKey) {
    return NextResponse.json(
      { error: 'VERCEL_AI_GATEWAY_API_KEY not configured. Add it to your environment variables.' },
      { status: 500 }
    )
  }

  // Get GitHub token if repo is specified
  let githubToken: string | undefined
  if (config?.repo) {
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const tokens = await getDeploymentTokens(user.id)
        githubToken = tokens?.github
      }
    } catch (e) {
      console.warn('[Agent Cloud] Failed to get GitHub token:', e)
    }
  }

  // Configure environment variables for Claude Code with Vercel AI Gateway
  // IMPORTANT: ANTHROPIC_API_KEY must be empty string so Claude Code uses ANTHROPIC_AUTH_TOKEN
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

  // Use our custom template or fall back to anthropic-claude-code
  const template = config?.template || 'pipilot-agent'
  const selectedModel = config?.model || 'sonnet'

  console.log(`[Agent Cloud] Creating sandbox with template: ${template}`)
  console.log(`[Agent Cloud] Using Vercel AI Gateway: ${AI_GATEWAY_BASE_URL}`)
  console.log(`[Agent Cloud] Default model: ${AVAILABLE_MODELS[selectedModel]}`)

  const sandbox = await Sandbox.create(template, {
    timeoutMs: 5 * 60 * 1000, // 5 minutes
    envs,
  })

  const sandboxId = sandbox.sandboxId
  let repoCloned = false

  // Clone repo if specified
  if (config?.repo && githubToken) {
    try {
      console.log(`[Agent Cloud] Cloning repo: ${config.repo.full_name} (${config.repo.branch})`)

      // Clone the repo using the token for auth
      const cloneUrl = `https://${githubToken}@github.com/${config.repo.full_name}.git`
      const cloneResult = await sandbox.commands.run(
        `git clone --branch ${config.repo.branch} --single-branch ${cloneUrl} ${PROJECT_DIR}`,
        { timeoutMs: 60000 }
      )

      if (cloneResult.exitCode === 0) {
        repoCloned = true
        console.log(`[Agent Cloud] Repo cloned successfully`)

        // Configure git user (use generic info)
        await sandbox.commands.run(
          `cd ${PROJECT_DIR} && git config user.email "agent@pipilot.dev" && git config user.name "PiPilot Agent"`,
          { timeoutMs: 5000 }
        )
      } else {
        console.error(`[Agent Cloud] Clone failed:`, cloneResult.stderr)
      }
    } catch (error) {
      console.error(`[Agent Cloud] Failed to clone repo:`, error)
    }
  }

  activeSandboxes.set(sandboxId, {
    sandbox,
    createdAt: new Date(),
    lastActivity: new Date(),
    model: selectedModel,
    repo: config?.repo ? {
      full_name: config.repo.full_name,
      branch: config.repo.branch,
      cloned: repoCloned,
    } : undefined,
  })

  console.log(`[Agent Cloud] Sandbox created: ${sandboxId}`)

  return NextResponse.json({
    success: true,
    sandboxId,
    model: AVAILABLE_MODELS[selectedModel],
    gateway: AI_GATEWAY_BASE_URL,
    repoCloned,
    projectDir: repoCloned ? PROJECT_DIR : '/home/user',
    message: repoCloned
      ? `Sandbox created with ${config?.repo?.full_name} cloned`
      : 'Sandbox created with Vercel AI Gateway',
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

  const sandboxEntry = activeSandboxes.get(sandboxId)
  if (!sandboxEntry) {
    return NextResponse.json(
      { error: 'Sandbox not found. Create one first with action: create' },
      { status: 404 }
    )
  }

  const { sandbox } = sandboxEntry
  sandboxEntry.lastActivity = new Date()

  // Use project dir if repo is cloned, otherwise use specified or default
  const workDir = options?.workingDirectory ||
    (sandboxEntry.repo?.cloned ? PROJECT_DIR : '/home/user')

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

  const sandboxEntry = activeSandboxes.get(sandboxId)
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

  const sandboxEntry = activeSandboxes.get(sandboxId)
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

  const sandboxEntry = activeSandboxes.get(sandboxId)
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

  const sandboxEntry = activeSandboxes.get(sandboxId)
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

  const sandboxEntry = activeSandboxes.get(sandboxId)
  if (!sandboxEntry) {
    return NextResponse.json(
      { error: 'Sandbox not found' },
      { status: 404 }
    )
  }

  try {
    await sandboxEntry.sandbox.kill()
    activeSandboxes.delete(sandboxId)
    console.log(`[Agent Cloud] Sandbox terminated: ${sandboxId}`)

    return NextResponse.json({
      success: true,
      message: 'Sandbox terminated successfully',
    })
  } catch (error) {
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
      sandboxId: id,
      createdAt: entry.createdAt.toISOString(),
      lastActivity: entry.lastActivity.toISOString(),
      age: Date.now() - entry.createdAt.getTime(),
      repo: entry.repo,
    }))

    return NextResponse.json({
      success: true,
      count: sandboxes.length,
      sandboxes,
    })
  }

  const sandboxEntry = activeSandboxes.get(sandboxId)
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
  })
}

/**
 * Cleanup inactive sandboxes
 */
function cleanupInactiveSandboxes() {
  const now = Date.now()
  for (const [sandboxId, entry] of activeSandboxes.entries()) {
    if (now - entry.lastActivity.getTime() > SANDBOX_TIMEOUT) {
      console.log(`[Agent Cloud] Cleaning up inactive sandbox: ${sandboxId}`)
      entry.sandbox.kill().catch(console.error)
      activeSandboxes.delete(sandboxId)
    }
  }
}

// Cleanup on module unload
if (typeof process !== 'undefined') {
  process.on('beforeExit', () => {
    for (const [sandboxId, entry] of activeSandboxes.entries()) {
      console.log(`[Agent Cloud] Cleaning up sandbox on exit: ${sandboxId}`)
      entry.sandbox.kill().catch(console.error)
    }
  })
}
