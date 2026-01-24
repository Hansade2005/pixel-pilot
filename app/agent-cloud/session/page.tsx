"use client"

import { useState, useRef, useEffect, useCallback, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Loader2,
  Copy,
  Check,
  Bot,
  Sparkles,
  ArrowUp,
  Terminal,
  FileEdit,
  FileText,
  FolderSearch,
  Search,
  Globe,
  ChevronDown,
  ChevronRight,
  FileCode,
  Eye,
  Plus,
  Minus,
  Square,
  RotateCw,
  ImageIcon,
  Monitor,
  X,
} from "lucide-react"
import { useAgentCloud, type TerminalLine } from "../layout"
import { Response } from "@/components/ai-elements/response"
import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk"

// SSE message types - includes SDK messages plus streaming-specific event types
interface SSEMessage {
  type: 'start' | 'log' | 'heartbeat' | 'text' | 'stdout' | 'tool_use' | 'tool_result' | 'result' | 'stderr' | 'complete' | 'error' | 'user' | 'system' | 'assistant' | 'content_block_delta' | 'content_block_start'
  // SDK message fields
  message?: any
  session_id?: string
  parent_tool_use_id?: string | null
  total_cost_usd?: number
  usage?: any
  duration_ms?: number
  duration_api_ms?: number
  is_error?: boolean
  num_turns?: number
  // Streaming-specific fields
  data?: string
  name?: string
  input?: any
  result?: any
  subtype?: 'success' | 'error' | 'error_max_turns' | 'error_during_execution' | 'init'
  cost?: number
  timestamp?: number
  diffStats?: {
    additions: number
    deletions: number
  }
  messageCount?: number
  delta?: {
    text?: string
  }
  content_block?: {
    type?: string
    name?: string
  }
}

// Rotating thinking phrases - fun, entertaining sentences shown while AI streams
const SPINNER_PHRASES = [
  // Claude/AI specific
  'Teaching Claude a new trick',
  'Claude is in the zone right now',
  'Warming up the neural networks',
  'Untangling the attention layers',
  'Asking Claude politely for the answer',
  'Claude is reading the docs so you don\'t have to',
  'Consulting the transformer spirits',
  'Running through a few billion parameters',
  'Claude is thinking really hard about this',
  'Tokenizing your brilliance',
  'Feeding tokens to the model',
  'Claude is having a eureka moment',
  'Navigating the latent space',
  'Processing at the speed of thought',
  'Claude just said "hold my tokens"',
  // Coding/developer humor
  'Converting caffeine into code',
  'Debugging the universe, one line at a time',
  'Looking for that missing semicolon',
  'Compiling your dreams into reality',
  'Refactoring the space-time continuum',
  'Resolving dependencies... and existential crises',
  'git commit -m "making magic happen"',
  'npm install awesome-features',
  'Pushing pixels into place',
  'Writing code that writes code',
  'Turning your words into working software',
  'Deploying brilliance to production',
  'Squashing bugs before they hatch',
  'Crafting components with care',
  'Optimizing for maximum awesomeness',
  'Building something beautiful',
  'Spinning up the dev server in my mind',
  'Running prettier on the universe',
  'Linting reality for errors',
  'Hot-reloading your ideas',
  // PiPilot/app building themed
  'Your app is taking shape',
  'Vibe coding in progress',
  'Architecting your next big thing',
  'Turning conversation into creation',
  'From chat to code in seconds',
  'Building at the speed of imagination',
  'Making your app dreams come true',
  'Shipping features, not excuses',
  'Your personal dev team is on it',
  'Crafting pixel-perfect solutions',
  // Fun and witty
  'Brewing fresh bytes just for you',
  'Polishing the algorithms until they shine',
  'Summoning the cloud wizards',
  'Engaging the improbability drive',
  'Channeling the Force... of good code',
  'Calibrating the flux capacitor',
  'Loading wit.exe... please stand by',
  'Assembling the Avengers of code',
  'Performing digital sorcery',
  'Reticulating splines, as is tradition',
  'Hold tight, genius at work',
  'Cooking up something special',
  'Mixing the secret sauce',
  'Charging the creativity laser',
  'Aligning the stars for your project',
  'Making the hamsters run faster',
  'This is where the magic happens',
  'Working harder than a git merge on a Monday',
  'Almost there... probably',
  'Doing science, please wait',
  'Training the code monkeys',
  'Generating something you\'ll love',
  'Sprinkling some AI magic dust',
  'One moment, crafting perfection',
  'Good things come to those who wait',
  'The best code is worth waiting for',
  'Patience... greatness is loading',
  'Hang tight, this is gonna be good',
  'Thinking outside the sandbox',
  'Making bits and bytes dance',
  'Orchestrating a symphony of code',
  'Weaving logic into elegance',
  'Conjuring solutions from thin air',
  'Transmuting ideas into features',
  'Distilling your vision into code',
]

// Max lines before truncation
const MAX_LINES_COLLAPSED = 8

function SessionPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('id')

  const {
    sessions,
    setSessions,
    storedTokens,
    connectors,
  } = useAgentCloud()

  const [prompt, setPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [isRecreating, setIsRecreating] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [expandedTools, setExpandedTools] = useState<Set<number>>(new Set())
  const [expandedMessages, setExpandedMessages] = useState<Set<number>>(new Set())
  const [spinnerPhrase, setSpinnerPhrase] = useState(() => SPINNER_PHRASES[Math.floor(Math.random() * SPINNER_PHRASES.length)])
  const [attachedImages, setAttachedImages] = useState<Array<{ data: string; type: string; name: string }>>([])
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Rotate spinner phrase every 5 seconds while streaming
  useEffect(() => {
    if (!isStreaming || isRecreating) return
    const interval = setInterval(() => {
      setSpinnerPhrase(SPINNER_PHRASES[Math.floor(Math.random() * SPINNER_PHRASES.length)])
    }, 5000)
    return () => clearInterval(interval)
  }, [isStreaming, isRecreating])

  const toggleToolExpanded = (index: number) => {
    setExpandedTools(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const terminalRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Find the active session
  const activeSession = sessions.find(s => s.id === sessionId) || null

  // Redirect to new page if session was deleted (sessions loaded but ID not found)
  useEffect(() => {
    // Only check after sessions have been loaded (non-empty array means hydrated from localStorage)
    if (sessionId && sessions.length > 0 && !activeSession) {
      router.push('/agent-cloud/new')
    }
  }, [sessionId, sessions, activeSession, router])

  // Only Devstral model supports image input
  const supportsImages = activeSession?.model?.includes('devstral') ?? false

  // Recreate sandbox with conversation history
  const recreateSandbox = useCallback(async (pendingPrompt?: string) => {
    if (!activeSession) return null

    setIsRecreating(true)

    // Add system message about recreating
    setSessions(prev => prev.map(s =>
      s.id === sessionId
        ? { ...s, lines: [...s.lines, { type: 'system' as const, content: 'Session expired. Reconnecting...', timestamp: new Date() }] }
        : s
    ))

    try {
      // Create a new sandbox with same repo config
      const recreateHeaders: Record<string, string> = { 'Content-Type': 'application/json' }
      if (storedTokens.github) {
        recreateHeaders['X-GitHub-Token'] = storedTokens.github
      }

      const response = await fetch('/api/agent-cloud', {
        method: 'POST',
        headers: recreateHeaders,
        body: JSON.stringify({
          action: 'create',
          config: {
            model: activeSession.model || 'sonnet',
            ...(activeSession.isNewProject ? {
              newProject: { name: activeSession.newProjectName || 'project' },
            } : {
              repo: activeSession.repo ? {
                full_name: activeSession.repo.full_name,
                branch: activeSession.repo.branch
              } : undefined,
            }),
            initialPrompt: activeSession.title || activeSession.lines.find(l => l.type === 'input')?.content || 'resumed-session',
            connectors: connectors
              .filter(c => c.enabled && c.fields.every(f => f.value.trim()))
              .map(c => ({
                id: c.id,
                type: c.type,
                mcpUrl: c.mcpUrl,
                fields: Object.fromEntries(c.fields.map(f => [f.key, f.value]))
              })),
          }
        })
      })

      if (!response.ok) {
        throw new Error('Failed to recreate sandbox')
      }

      const data = await response.json()
      const newSandboxId = data.sandboxId

      // Convert frontend lines to conversation history format
      const conversationHistory = activeSession.lines
        .filter(l => l.type === 'input' || l.type === 'output')
        .map(l => ({
          role: l.type === 'input' ? 'user' as const : 'assistant' as const,
          content: l.content,
          timestamp: l.timestamp
        }))

      // Restore conversation history to the new sandbox
      if (conversationHistory.length > 0) {
        await fetch('/api/agent-cloud', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'restore',
            sandboxId: newSandboxId,
            conversationHistory
          })
        })
      }

      // Update session with new sandbox ID
      setSessions(prev => prev.map(s =>
        s.id === sessionId
          ? {
              ...s,
              sandboxId: newSandboxId,
              lines: [...s.lines, { type: 'system' as const, content: 'Reconnected successfully. You can continue your conversation.', timestamp: new Date() }]
            }
          : s
      ))

      setIsRecreating(false)
      return newSandboxId
    } catch (error) {
      console.error('Failed to recreate sandbox:', error)
      setSessions(prev => prev.map(s =>
        s.id === sessionId
          ? { ...s, lines: [...s.lines, { type: 'error' as const, content: 'Failed to reconnect. Please start a new session.', timestamp: new Date() }] }
          : s
      ))
      setIsRecreating(false)
      return null
    }
  }, [activeSession, sessionId, setSessions, storedTokens])

  // Redirect if session not found
  useEffect(() => {
    if (sessionId && sessions.length > 0 && !activeSession) {
      router.push('/agent-cloud/new')
    }
  }, [sessionId, sessions, activeSession, router])

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [activeSession?.lines])

  // Ref for tracking processed pending prompts (defined here, used in effect after runPrompt)
  const pendingPromptProcessedRef = useRef<Set<string>>(new Set())

  // Focus input
  useEffect(() => {
    if (activeSession && inputRef.current && !activeSession.pendingPrompt) {
      inputRef.current.focus()
    }
  }, [activeSession])

  // Auto-resize textarea (limited height)
  useEffect(() => {
    const textarea = inputRef.current
    if (!textarea) return

    textarea.style.height = 'auto'
    const newHeight = Math.min(Math.max(textarea.scrollHeight, 44), 120)
    textarea.style.height = `${newHeight}px`
  }, [prompt])

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  // Run prompt with GitHub token passed to AI
  const runPrompt = useCallback(async (overridePrompt?: string, overrideSandboxId?: string, overrideImages?: Array<{ data: string; type: string; name: string }>) => {
    if (!activeSession || isLoading || isRecreating) return

    const imagesToUse = overrideImages || attachedImages
    const currentPrompt = overridePrompt || prompt.trim()
    if (!currentPrompt && imagesToUse.length === 0) return

    const sandboxIdToUse = overrideSandboxId || activeSession.sandboxId

    if (!overridePrompt) {
      setPrompt('')
    }
    setIsLoading(true)
    setIsStreaming(true)

    // Create AbortController for this request
    const controller = new AbortController()
    abortControllerRef.current = controller

    // Update session title if first message
    if (!overridePrompt && activeSession.lines.filter(l => l.type === 'input').length === 0) {
      setSessions(prev => prev.map(s =>
        s.id === sessionId
          ? { ...s, title: currentPrompt.slice(0, 50) + (currentPrompt.length > 50 ? '...' : '') }
          : s
      ))
    }

    // Add input line with images (skip only if this is a retry after sandbox recreation)
    // overrideSandboxId is only provided during recreation retries
    if (!overrideSandboxId) {
      setSessions(prev => prev.map(s =>
        s.id === sessionId
          ? { ...s, lines: [...s.lines, {
              type: 'input' as const,
              content: currentPrompt,
              timestamp: new Date(),
              images: imagesToUse.length > 0 ? imagesToUse.map(img => ({ data: img.data, type: img.type })) : undefined,
            }] }
          : s
      ))
    }

    // Clear attached images after storing them in the message
    if (imagesToUse === attachedImages && attachedImages.length > 0) {
      setAttachedImages([])
    }

    try {
      // Build prompt with context for AI operations
      let enhancedPrompt = currentPrompt

      if (activeSession.isNewProject && storedTokens.github) {
        // New project mode: instruct AI to create repo and build from scratch
        enhancedPrompt = `[New Project - Build From Scratch]
You are building a brand new project from scratch. This is NOT an existing codebase.

IMPORTANT SETUP INSTRUCTIONS (do this FIRST before writing any code):
1. Use the GitHub MCP tool to create a new repository named "${activeSession.newProjectName}" on GitHub.
   - Use the create_repository function with name: "${activeSession.newProjectName}"
   - Make it a public repository unless the user specifies otherwise
2. After the repo is created, run these commands to set up the remote:
   git remote add origin https://x-access-token:${storedTokens.github}@github.com/USER/${activeSession.newProjectName}.git
   (Replace USER with the authenticated GitHub username - you can get this from the GitHub MCP whoami or get_me tool)
3. Build the project as requested by the user
4. When done building, commit all changes and push to the remote:
   git add -A && git commit -m "Initial commit: <brief description>" && git push -u origin main

GitHub Token: ${storedTokens.github}
Working Directory: /home/user/

User Request: ${currentPrompt}`
      } else if (storedTokens.github && activeSession.repo) {
        // Existing repo mode
        enhancedPrompt = `[GitHub Context - Use this for any GitHub operations if needed]
- Repository: ${activeSession.repo.full_name}
- Branch: ${activeSession.repo.branch}
- GitHub Token: ${storedTokens.github}
- Clone URL: https://${storedTokens.github}@github.com/${activeSession.repo.full_name}.git

User Request: ${currentPrompt}`
      }

      // Pass GitHub token via header as fallback for server-side clone auth
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      }
      if (storedTokens.github) {
        headers['X-GitHub-Token'] = storedTokens.github
      }

      // Stream via POST with images included in body (single-step, no separate upload)
      const response = await fetch('/api/agent-cloud', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            action: 'stream',
            sandboxId: sandboxIdToUse,
            prompt: enhancedPrompt,
            images: imagesToUse.length > 0 ? imagesToUse : undefined,
          }),
          signal: controller.signal,
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMsg = errorData.error || 'Failed to connect to agent'

        // Auto-recreate sandbox if expired/not found (404) - only if not already a retry
        if (!overrideSandboxId && response.status === 404 && (errorMsg.includes('not found') || errorMsg.includes('expired'))) {
          console.log('[Agent Cloud] Sandbox expired (404), auto-recreating...')
          const newSandboxId = await recreateSandbox()
          if (newSandboxId) {
            // Build prompt with conversation history context for continuity
            const historyLines = activeSession.lines
              .filter(l => l.type === 'input' || l.type === 'output')
              .slice(-12) // Last 6 pairs (12 messages) for context
            let contextPrompt = currentPrompt
            if (historyLines.length > 0) {
              const historyContext = historyLines
                .map(l => `${l.type === 'input' ? 'User' : 'Assistant'}: ${l.content.length > 800 ? l.content.substring(0, 800) + '...[truncated]' : l.content}`)
                .join('\n\n')
              contextPrompt = `[Conversation History - This is a resumed session after reconnection]\n${historyContext}\n\n[Current Request]\n${currentPrompt}`
            }
            setIsLoading(false)
            setIsStreaming(false)
            runPrompt(contextPrompt, newSandboxId)
            return
          }
        }

        throw new Error(errorMsg)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response stream available')
      }

      const decoder = new TextDecoder()
      let fullOutput = ''
      let hasReceivedData = false
      let sseBuffer = '' // Buffer for incomplete SSE messages

      // Direct update function - no throttling for real-time streaming
      const updateOutput = (newText: string) => {
        // Append new text to accumulated output
        fullOutput += newText
        
        // Update UI immediately
        setSessions(prev => prev.map(s => {
          if (s.id === sessionId) {
            const lines = [...s.lines]
            const lastLine = lines[lines.length - 1]
            if (lastLine && lastLine.type === 'output') {
              // Update existing output line
              lines[lines.length - 1] = { ...lastLine, content: fullOutput }
            } else {
              // Create new output line
              lines.push({ type: 'output', content: fullOutput, timestamp: new Date() })
            }
            return { ...s, lines }
          }
          return s
        }))
      }

      // Helper function to process SSE message
      const processMessage = async (data: SSEMessage): Promise<boolean> => {
        // Only log meaningful message types
        if (!['user', 'system', 'heartbeat'].includes(data.type)) {
          console.log('[Agent Cloud] Message received:', data.type, data.data?.substring?.(0, 50) || '')
        }
        
        switch (data.type) {
          case 'start':
            // Stream has started
            break

          case 'log':
            // Status message from server (e.g., "Claude is thinking...")
            console.log('[Agent Cloud]', data.message)
            break

          case 'heartbeat':
          case 'user':
          case 'system':
            // Keep-alive and context messages - ignore silently
            break

          case 'text':
            // Real-time text streaming from SDK - append new text
            if (data.data) {
              updateOutput(data.data)
            }
            break

          case 'stdout':
            // Fallback raw output streaming - append new text
            if (data.data) {
              updateOutput(data.data)
            }
            break

          case 'tool_use': {
            // Tool being used - show in UI with rich details
            console.log('[Agent Cloud] Tool used:', data.name, data.input)
            const toolName = data.name || 'Unknown'
            const input = data.input || {}
            const hasInput = Object.keys(input).length > 0

            let toolDescription = ''

            // Create user-friendly descriptions for common tools
            if (toolName === 'Bash') {
              toolDescription = input?.description || (input?.command ? `$ ${input.command.substring(0, 100)}` : 'Running command')
            } else if (toolName === 'Write' && input?.file_path) {
              toolDescription = `Creating ${input.file_path}`
            } else if (toolName === 'Edit' && input?.file_path) {
              toolDescription = `Editing ${input.file_path}`
            } else if (toolName === 'Read' && input?.file_path) {
              toolDescription = `Reading ${input.file_path}`
            } else if (toolName === 'Glob' && input?.pattern) {
              toolDescription = `Finding files: ${input.pattern}`
            } else if (toolName === 'Grep' && input?.pattern) {
              toolDescription = `Searching for: ${input.pattern}`
            } else if (toolName === 'WebSearch' && input?.query) {
              toolDescription = `Searching: ${input.query.substring(0, 80)}`
            } else if (toolName === 'WebFetch' && input?.url) {
              toolDescription = `Fetching: ${input.url.substring(0, 80)}`
            } else if (toolName === 'Task' && input?.description) {
              toolDescription = input.description
            } else if (toolName === 'TodoWrite') {
              toolDescription = 'Updating task list'
            } else {
              toolDescription = `Using ${toolName}`
            }

            const newMeta = {
              toolName,
              toolId: data.name + '_' + Date.now(),
              fileName: input?.file_path,
              description: input?.description,
              command: toolName === 'Bash' ? input?.command : undefined,
              input: input,
              oldString: toolName === 'Edit' ? input?.old_string : undefined,
              newString: toolName === 'Edit' ? input?.new_string : undefined,
              fileContent: toolName === 'Write' ? input?.content?.substring(0, 500) : undefined,
              pattern: (toolName === 'Glob' || toolName === 'Grep') ? input?.pattern : undefined,
              url: toolName === 'WebFetch' ? input?.url : undefined,
              query: toolName === 'WebSearch' ? input?.query : undefined,
              isComplete: false,
            }

            setSessions(prev => prev.map(s => {
              if (s.id !== sessionId) return s

              const lines = [...s.lines]

              // If this tool_use has input, check if there's a recent pending tool line
              // with the same name but no input (from content_block_start). Update it instead.
              if (hasInput) {
                for (let i = lines.length - 1; i >= Math.max(0, lines.length - 5); i--) {
                  if (
                    lines[i].type === 'tool' &&
                    lines[i].meta?.toolName === toolName &&
                    !lines[i].meta?.command &&
                    !lines[i].meta?.fileName &&
                    !lines[i].meta?.isComplete
                  ) {
                    // Update existing tool line with full input details
                    lines[i] = {
                      ...lines[i],
                      content: toolDescription,
                      meta: newMeta,
                    }
                    return { ...s, lines }
                  }
                }
              }

              // Otherwise, add a new tool line
              lines.push({
                type: 'tool' as const,
                content: toolDescription,
                timestamp: new Date(),
                meta: newMeta,
              })
              return { ...s, lines }
            }))
            break
          }

          case 'tool_result': {
            // Tool result - attach to the last tool line
            const resultContent = typeof data.result === 'string'
              ? data.result
              : JSON.stringify(data.result, null, 2)
            console.log('[Agent Cloud] Tool result:', resultContent?.substring?.(0, 100))

            // Find the last tool line and attach the result
            setSessions(prev => prev.map(s => {
              if (s.id === sessionId) {
                const lines = [...s.lines]
                // Find last tool line that hasn't received a result yet
                for (let i = lines.length - 1; i >= 0; i--) {
                  if (lines[i].type === 'tool' && lines[i].meta && !lines[i].meta?.isComplete) {
                    lines[i] = {
                      ...lines[i],
                      meta: {
                        ...lines[i].meta,
                        result: resultContent?.substring(0, 2000), // Cap at 2000 chars
                        isComplete: true,
                      }
                    }
                    break
                  }
                }
                return { ...s, lines }
              }
              return s
            }))
            break
          }

          case 'result':
            // Final SDK result - only log, don't duplicate output
            if (data.subtype === 'success') {
              console.log('[Agent Cloud] Generation complete, cost:', data.cost)
            }
            // Don't append data.result - it duplicates the already-streamed text
            break

          case 'stderr':
            setSessions(prev => prev.map(s =>
              s.id === sessionId
                ? { ...s, lines: [...s.lines, { type: 'error' as const, content: data.data || 'Error occurred', timestamp: new Date() }] }
                : s
            ))
            break

          case 'complete':
            // Ensure final output is rendered
            if (fullOutput) {
              setSessions(prev => prev.map(s => {
                if (s.id === sessionId) {
                  const lines = [...s.lines]
                  const lastLine = lines[lines.length - 1]
                  if (lastLine && lastLine.type === 'output') {
                    lines[lines.length - 1] = { ...lastLine, content: fullOutput }
                  }
                  return { ...s, lines }
                }
                return s
              }))
            }

            if (data.diffStats) {
              setSessions(prev => prev.map(s =>
                s.id === sessionId
                  ? {
                      ...s,
                      stats: {
                        additions: (s.stats?.additions || 0) + (data.diffStats?.additions || 0),
                        deletions: (s.stats?.deletions || 0) + (data.diffStats?.deletions || 0)
                      },
                      messageCount: data.messageCount
                    }
                  : s
              ))
            }
            setIsLoading(false)
            setIsStreaming(false)
            return true // Signal to break out of stream loop

          case 'error': {
            // Check if error is about sandbox expiration
            const errorMsg = data.message || ''
            if (!overrideSandboxId && (errorMsg.includes('not found') || errorMsg.includes('expired'))) {
              console.log('Sandbox expired during stream, recreating...')
              reader.cancel()
              const newSandboxId = await recreateSandbox()
              if (newSandboxId) {
                const historyLines = activeSession.lines
                  .filter(l => l.type === 'input' || l.type === 'output')
                  .slice(-12)
                let contextPrompt = currentPrompt
                if (historyLines.length > 0) {
                  const historyContext = historyLines
                    .map(l => `${l.type === 'input' ? 'User' : 'Assistant'}: ${l.content.length > 800 ? l.content.substring(0, 800) + '...[truncated]' : l.content}`)
                    .join('\n\n')
                  contextPrompt = `[Conversation History - This is a resumed session after reconnection]\n${historyContext}\n\n[Current Request]\n${currentPrompt}`
                }
                setIsLoading(false)
                setIsStreaming(false)
                runPrompt(contextPrompt, newSandboxId)
              } else {
                setIsLoading(false)
                setIsStreaming(false)
              }
              return true // Signal to break out of stream loop
            }

            setSessions(prev => prev.map(s =>
              s.id === sessionId
                ? { ...s, lines: [...s.lines, { type: 'error' as const, content: data.message || 'An error occurred', timestamp: new Date() }] }
                : s
            ))
            setIsLoading(false)
            setIsStreaming(false)
            return true // Signal to break out of stream loop
          }
        }
        return false // Continue processing
      }

      // Stream reading loop with proper SSE buffering
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            console.log('[Agent Cloud] Stream ended')
            break
          }

          hasReceivedData = true
          const chunk = decoder.decode(value, { stream: true })
          
          // Add chunk to buffer for proper SSE parsing
          sseBuffer += chunk

          // SSE messages are separated by double newlines
          const messages = sseBuffer.split('\n\n')
          // Keep the last potentially incomplete message in the buffer
          sseBuffer = messages.pop() || ''

          for (const message of messages) {
            if (!message.trim()) continue

            // Each message can have multiple lines (data:, event:, id:, etc.)
            const lines = message.split('\n')
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const jsonStr = line.slice(6) // Remove "data: " prefix
                if (jsonStr === '[DONE]') continue // Skip done marker

                try {
                  const data = JSON.parse(jsonStr)
                  const shouldBreak = await processMessage(data)
                  if (shouldBreak) {
                    // Stream completed normally - just exit the loop
                    // Don't call reader.cancel() since the stream is done
                    return
                  }
                } catch (e) {
                  console.warn('[Agent Cloud] Failed to parse SSE data:', jsonStr.substring(0, 100))
                }
              }
            }
          }
        }
      } catch (streamError) {
        console.error('[Agent Cloud] Streaming error:', streamError)
        
        // If we haven't received any data, this might be a connection issue - try recreating
        if (!hasReceivedData && !overrideSandboxId) {
          console.log('Connection failed without data, attempting to recreate sandbox...')
          const newSandboxId = await recreateSandbox()
          if (newSandboxId) {
            const historyLines = activeSession.lines
              .filter(l => l.type === 'input' || l.type === 'output')
              .slice(-12)
            let contextPrompt = currentPrompt
            if (historyLines.length > 0) {
              const historyContext = historyLines
                .map(l => `${l.type === 'input' ? 'User' : 'Assistant'}: ${l.content.length > 800 ? l.content.substring(0, 800) + '...[truncated]' : l.content}`)
                .join('\n\n')
              contextPrompt = `[Conversation History - This is a resumed session after reconnection]\n${historyContext}\n\n[Current Request]\n${currentPrompt}`
            }
            setIsLoading(false)
            setIsStreaming(false)
            runPrompt(contextPrompt, newSandboxId)
            return
          }
        }

        setSessions(prev => prev.map(s =>
          s.id === sessionId
            ? { ...s, lines: [...s.lines, { type: 'error' as const, content: 'Connection lost. Please try again.', timestamp: new Date() }] }
            : s
        ))
      } finally {
        try { reader.releaseLock() } catch {}
        setIsLoading(false)
        setIsStreaming(false)
        abortControllerRef.current = null
      }
    } catch (error) {
      // Handle user-initiated abort gracefully
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.log('[Agent Cloud] Request aborted by user')
        setSessions(prev => prev.map(s =>
          s.id === sessionId
            ? { ...s, lines: [...s.lines, { type: 'system' as const, content: 'Agent stopped by user', timestamp: new Date() }] }
            : s
        ))
        setIsLoading(false)
        setIsStreaming(false)
        abortControllerRef.current = null
        return
      }

      console.error('Failed to run prompt:', error)
      const errMsg = error instanceof Error ? error.message : 'Failed to run prompt'

      // Auto-recreate if sandbox expired (catch-all safety net) - only if not already a retry
      if (!overrideSandboxId && (errMsg.includes('not found') || errMsg.includes('expired') || errMsg.includes('Sandbox'))) {
        console.log('[Agent Cloud] Sandbox error detected, attempting auto-recreation...')
        const newSandboxId = await recreateSandbox()
        if (newSandboxId) {
          const historyLines = activeSession.lines
            .filter(l => l.type === 'input' || l.type === 'output')
            .slice(-12)
          let contextPrompt = currentPrompt
          if (historyLines.length > 0) {
            const historyContext = historyLines
              .map(l => `${l.type === 'input' ? 'User' : 'Assistant'}: ${l.content.length > 800 ? l.content.substring(0, 800) + '...[truncated]' : l.content}`)
              .join('\n\n')
            contextPrompt = `[Conversation History - This is a resumed session after reconnection]\n${historyContext}\n\n[Current Request]\n${currentPrompt}`
          }
          setIsLoading(false)
          setIsStreaming(false)
          abortControllerRef.current = null
          runPrompt(contextPrompt, newSandboxId)
          return
        }
      }

      setSessions(prev => prev.map(s =>
        s.id === sessionId
          ? { ...s, lines: [...s.lines, { type: 'error' as const, content: errMsg, timestamp: new Date() }] }
          : s
      ))
      setIsLoading(false)
      setIsStreaming(false)
      abortControllerRef.current = null
    }
  }, [activeSession, prompt, isLoading, isRecreating, sessionId, setSessions, storedTokens, recreateSandbox])

  // Stop the running agent
  const stopAgent = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }, [])

  // Auto-run pending prompt when session loads (must be after runPrompt is defined)
  useEffect(() => {
    if (
      activeSession?.pendingPrompt &&
      activeSession?.id &&
      !isLoading &&
      !isRecreating &&
      !pendingPromptProcessedRef.current.has(activeSession.id)
    ) {
      // Mark this session's pending prompt as processed
      pendingPromptProcessedRef.current.add(activeSession.id)

      // Store the pending prompt and images before clearing
      const promptToRun = activeSession.pendingPrompt
      const imagesToRun = activeSession.pendingImages

      // Clear the pending prompt and images from the session
      setSessions(prev => prev.map(s =>
        s.id === sessionId
          ? { ...s, pendingPrompt: undefined, pendingImages: undefined }
          : s
      ))

      // Run the prompt after a short delay to let the page render
      setTimeout(() => {
        runPrompt(promptToRun, undefined, imagesToRun)
      }, 150)
    }
  }, [activeSession?.pendingPrompt, activeSession?.id, isLoading, isRecreating, sessionId, setSessions, runPrompt])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      runPrompt()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    if (!supportsImages) return
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (!file) continue
        const reader = new FileReader()
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1]
          setAttachedImages(prev => [...prev, { data: base64, type: file.type, name: `pasted-${Date.now()}.${file.type.split('/')[1]}` }])
        }
        reader.readAsDataURL(file)
      }
    }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1]
        setAttachedImages(prev => [...prev, { data: base64, type: file.type, name: file.name }])
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  const removeImage = (index: number) => {
    setAttachedImages(prev => prev.filter((_, i) => i !== index))
  }

  // Drag-and-drop handlers (only for models that support images)
  const handleDragOver = (e: React.DragEvent) => {
    if (!supportsImages) return
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (!supportsImages) return
    const files = e.dataTransfer?.files
    if (!files) return
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1]
        setAttachedImages(prev => [...prev, { data: base64, type: file.type, name: file.name }])
      }
      reader.readAsDataURL(file)
    }
  }

  // Screen recording
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const mediaStreamRef = useRef<MediaStream | null>(null)

  const handleScreenToggle = async () => {
    if (isScreenSharing) {
      // Stop screen sharing
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop())
        mediaStreamRef.current = null
      }
      setIsScreenSharing(false)
      return
    }

    try {
      setIsCapturing(true)
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true })
      mediaStreamRef.current = stream

      // Capture a screenshot immediately
      const video = document.createElement('video')
      video.srcObject = stream
      await video.play()
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      canvas.getContext('2d')?.drawImage(video, 0, 0)
      const base64 = canvas.toDataURL('image/png').split(',')[1]
      setAttachedImages(prev => [...prev, { data: base64, type: 'image/png', name: `screenshot-${Date.now()}.png` }])

      setIsScreenSharing(true)

      // Listen for stream end (user clicks "Stop sharing" in browser)
      stream.getVideoTracks()[0].onended = () => {
        mediaStreamRef.current = null
        setIsScreenSharing(false)
      }
    } catch {
      // User cancelled screen selection
    } finally {
      setIsCapturing(false)
    }
  }

  // Render message line
  const renderLine = (line: TerminalLine, index: number) => {
    switch (line.type) {
      case 'system':
        return (
          <div key={index} className="flex items-start gap-2 text-zinc-500 text-sm py-1 font-mono">
            <Sparkles className="h-4 w-4 mt-0.5 text-orange-500 shrink-0" />
            <span>{line.content}</span>
          </div>
        )

      case 'input': {
        const inputLines = line.content.split('\n')
        const isLong = inputLines.length > MAX_LINES_COLLAPSED
        const isExpanded = expandedMessages.has(index)
        const displayContent = isLong && !isExpanded
          ? inputLines.slice(0, MAX_LINES_COLLAPSED).join('\n')
          : line.content
        return (
          <div key={index} className="flex items-start gap-3 py-4 group">
            <div className="h-7 w-7 rounded-full bg-zinc-700 flex items-center justify-center shrink-0">
              <span className="text-xs font-semibold">U</span>
            </div>
            <div className="flex-1 pt-0.5">
              {/* Display attached images */}
              {line.images && line.images.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {line.images.map((img, imgIdx) => (
                    <img
                      key={imgIdx}
                      src={`data:${img.type};base64,${img.data}`}
                      alt="Attached"
                      className="max-w-[200px] max-h-[150px] rounded-lg object-cover cursor-pointer hover:opacity-80 transition-opacity border border-zinc-700"
                      onClick={() => setPreviewImage(`data:${img.type};base64,${img.data}`)}
                    />
                  ))}
                </div>
              )}
              {line.content && (
                <p className="text-zinc-100 text-sm leading-relaxed whitespace-pre-wrap">{displayContent}</p>
              )}
              {isLong && (
                <button
                  onClick={() => setExpandedMessages(prev => {
                    const next = new Set(prev)
                    if (next.has(index)) { next.delete(index) } else { next.add(index) }
                    return next
                  })}
                  className="text-xs text-orange-400 hover:text-orange-300 mt-1 font-mono"
                >
                  {isExpanded ? 'Show less' : 'Show more'}
                </button>
              )}
            </div>
            <button
              onClick={() => !isLoading && runPrompt(line.content)}
              disabled={isLoading}
              className="p-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-800 rounded-md hover:bg-zinc-700 disabled:opacity-30 shrink-0 mt-0.5"
              title="Retry this prompt"
            >
              <RotateCw className="h-3.5 w-3.5 text-zinc-400" />
            </button>
          </div>
        )
      }

      case 'output':
        return (
          <div key={index} className="flex items-start gap-3 py-4 group">
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="relative">
                <div className="prose prose-invert prose-sm max-w-none">
                  <Response className="text-zinc-300">
                    {line.content}
                  </Response>
                </div>
                <button
                  onClick={() => copyToClipboard(line.content, `output-${index}`)}
                  className="absolute top-0 right-0 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-800 rounded-md hover:bg-zinc-700"
                >
                  {copied === `output-${index}` ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 text-zinc-500" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )

      case 'error':
        return (
          <div key={index} className="flex items-start gap-3 py-2">
            <div className="h-7 w-7 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
              <span className="text-xs text-red-400 font-bold">!</span>
            </div>
            <div className="flex-1 text-red-400 text-sm bg-red-500/10 rounded-lg px-3 py-2 font-mono">
              {line.content}
            </div>
          </div>
        )

      case 'tool': {
        const meta = line.meta || {}
        const toolName = meta.toolName || 'Tool'
        const isExpanded = expandedTools.has(index)
        const isComplete = meta.isComplete !== false

        // Tool icon mapping
        const getToolIcon = () => {
          switch (toolName) {
            case 'Bash': return <Terminal className="h-3 w-3" />
            case 'Edit': return <FileEdit className="h-3 w-3" />
            case 'Write': return <FileCode className="h-3 w-3" />
            case 'Read': return <Eye className="h-3 w-3" />
            case 'Glob': return <FolderSearch className="h-3 w-3" />
            case 'Grep': return <Search className="h-3 w-3" />
            case 'WebSearch': return <Globe className="h-3 w-3" />
            case 'WebFetch': return <Globe className="h-3 w-3" />
            case 'Task': return <Bot className="h-3 w-3" />
            case 'TodoWrite': return <FileText className="h-3 w-3" />
            default: return <Sparkles className="h-3 w-3" />
          }
        }

        // Tool badge color
        const getToolColor = () => {
          switch (toolName) {
            case 'Bash': return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
            case 'Edit': return 'bg-amber-500/15 text-amber-400 border-amber-500/30'
            case 'Write': return 'bg-blue-500/15 text-blue-400 border-blue-500/30'
            case 'Read': return 'bg-purple-500/15 text-purple-400 border-purple-500/30'
            case 'Glob': return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
            case 'Grep': return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
            case 'WebSearch': return 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
            case 'WebFetch': return 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
            case 'Task': return 'bg-orange-500/15 text-orange-400 border-orange-500/30'
            default: return 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30'
          }
        }

        // Check if this tool has expandable content
        const hasExpandableContent = !!(meta.command || meta.result || meta.oldString || meta.newString || meta.fileContent)

        return (
          <div key={index} className="py-1.5 ml-10">
            <div
              className={`rounded-lg border border-zinc-800/80 bg-zinc-900/50 overflow-hidden ${hasExpandableContent ? '' : ''}`}
            >
              {/* Tool header */}
              <div
                className={`flex items-center gap-2 px-3 py-2 ${hasExpandableContent ? 'cursor-pointer hover:bg-zinc-800/30' : ''}`}
                onClick={() => hasExpandableContent && toggleToolExpanded(index)}
              >
                {/* Expand/collapse icon */}
                {hasExpandableContent ? (
                  isExpanded ? (
                    <ChevronDown className="h-3 w-3 text-zinc-500 shrink-0" />
                  ) : (
                    <ChevronRight className="h-3 w-3 text-zinc-500 shrink-0" />
                  )
                ) : (
                  <div className={`w-2 h-2 rounded-full shrink-0 ${isComplete ? 'bg-blue-500' : 'bg-blue-500 animate-pulse'}`} />
                )}

                {/* Tool badge */}
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${getToolColor()}`}>
                  {getToolIcon()}
                  {toolName}
                </span>

                {/* Description */}
                <span className="text-xs text-zinc-400 truncate flex-1 font-mono">
                  {meta.fileName || meta.description || line.content}
                </span>

                {/* Status indicator */}
                {!isComplete && (
                  <Loader2 className="h-3 w-3 animate-spin text-blue-400 shrink-0" />
                )}
              </div>

              {/* Expanded content */}
              {isExpanded && hasExpandableContent && (
                <div className="border-t border-zinc-800/80">
                  {/* Bash: Show command and output */}
                  {toolName === 'Bash' && (
                    <div className="text-xs font-mono">
                      {meta.command && (
                        <div className="px-3 py-2 bg-zinc-950/50 border-b border-zinc-800/50">
                          <div className="flex items-center gap-1.5 text-emerald-400/80 mb-1">
                            <span className="text-zinc-500">$</span>
                            <span className="break-all whitespace-pre-wrap">{meta.command}</span>
                          </div>
                        </div>
                      )}
                      {meta.result && (
                        <div className="px-3 py-2 text-zinc-400 max-h-60 overflow-y-auto">
                          <pre className="whitespace-pre-wrap break-all text-[11px] leading-4">{meta.result}</pre>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Edit: Show diff */}
                  {toolName === 'Edit' && (meta.oldString || meta.newString) && (
                    <div className="text-xs font-mono">
                      {meta.oldString && (
                        <div className="px-3 py-2 bg-red-500/5 border-b border-zinc-800/50">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Minus className="h-3 w-3 text-red-400" />
                            <span className="text-red-400/70 text-[10px]">old</span>
                          </div>
                          <pre className="whitespace-pre-wrap break-all text-red-300/70 text-[11px] leading-4 pl-4 max-h-40 overflow-y-auto">{meta.oldString}</pre>
                        </div>
                      )}
                      {meta.newString && (
                        <div className="px-3 py-2 bg-emerald-500/5">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Plus className="h-3 w-3 text-emerald-400" />
                            <span className="text-emerald-400/70 text-[10px]">new</span>
                          </div>
                          <pre className="whitespace-pre-wrap break-all text-emerald-300/70 text-[11px] leading-4 pl-4 max-h-40 overflow-y-auto">{meta.newString}</pre>
                        </div>
                      )}
                      {meta.result && (
                        <div className="px-3 py-1.5 text-zinc-500 text-[10px] border-t border-zinc-800/50">
                          {meta.result.includes('successfully') ? '✓ Applied' : meta.result.substring(0, 100)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Write: Show file content preview */}
                  {toolName === 'Write' && meta.fileContent && (
                    <div className="text-xs font-mono px-3 py-2 bg-zinc-950/50 max-h-60 overflow-y-auto">
                      <pre className="whitespace-pre-wrap break-all text-zinc-400 text-[11px] leading-4">{meta.fileContent}{meta.fileContent.length >= 500 ? '\n...' : ''}</pre>
                    </div>
                  )}

                  {/* Read: Show result */}
                  {toolName === 'Read' && meta.result && (
                    <div className="text-xs font-mono px-3 py-2 bg-zinc-950/50 max-h-60 overflow-y-auto">
                      <pre className="whitespace-pre-wrap break-all text-zinc-400 text-[11px] leading-4">{meta.result}</pre>
                    </div>
                  )}

                  {/* Glob/Grep: Show results */}
                  {(toolName === 'Glob' || toolName === 'Grep') && meta.result && (
                    <div className="text-xs font-mono px-3 py-2 bg-zinc-950/50 max-h-48 overflow-y-auto">
                      <pre className="whitespace-pre-wrap break-all text-zinc-400 text-[11px] leading-4">{meta.result}</pre>
                    </div>
                  )}

                  {/* WebSearch/WebFetch: Show results */}
                  {(toolName === 'WebSearch' || toolName === 'WebFetch') && meta.result && (
                    <div className="text-xs font-mono px-3 py-2 bg-zinc-950/50 max-h-48 overflow-y-auto">
                      <pre className="whitespace-pre-wrap break-all text-zinc-400 text-[11px] leading-4">{meta.result}</pre>
                    </div>
                  )}

                  {/* Generic: Show result for any other tool with a result */}
                  {!['Bash', 'Edit', 'Write', 'Read', 'Glob', 'Grep', 'WebSearch', 'WebFetch'].includes(toolName) && meta.result && (
                    <div className="text-xs font-mono px-3 py-2 bg-zinc-950/50 max-h-48 overflow-y-auto">
                      <pre className="whitespace-pre-wrap break-all text-zinc-400 text-[11px] leading-4">{meta.result}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      }

      default:
        return null
    }
  }

  if (!activeSession) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    )
  }

  return (
    <>
      {/* Chat area */}
      <div
        ref={terminalRef}
        className="flex-1 overflow-y-auto px-4 py-6"
      >
        <div className="max-w-3xl mx-auto space-y-2">
          {activeSession.lines.map((line, index) => renderLine(line, index))}
          {isRecreating && (
            <div className="flex items-center gap-2 py-3 text-amber-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm font-mono">Reconnecting to session...</span>
            </div>
          )}
          {isStreaming && !isRecreating && (
            <div className="flex items-center gap-2 py-3 text-orange-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm font-mono">{spinnerPhrase}...</span>
            </div>
          )}
        </div>
      </div>

      {/* Input area */}
      {activeSession.status === 'active' && (
        <div className="border-t border-zinc-800/50 p-4">
          <div className="max-w-3xl mx-auto">
            <div
              className={`relative bg-zinc-900/50 border rounded-xl overflow-hidden focus-within:border-zinc-700 focus-within:ring-1 focus-within:ring-zinc-700/50 transition-all ${
                isDragging ? 'border-orange-500 bg-orange-500/5' : 'border-zinc-800'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {/* Drag overlay */}
              {isDragging && (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80 z-10 pointer-events-none">
                  <div className="text-orange-400 text-sm font-medium">Drop images here</div>
                </div>
              )}
              {/* Image previews */}
              {attachedImages.length > 0 && (
                <div className="flex gap-2 px-3 pt-3 flex-wrap">
                  {attachedImages.map((img, i) => (
                    <div key={i} className="relative group/img">
                      <img
                        src={`data:${img.type};base64,${img.data}`}
                        alt={img.name}
                        className="h-16 w-16 object-cover rounded-lg border border-zinc-700 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setPreviewImage(`data:${img.type};base64,${img.data}`)}
                      />
                      <button
                        onClick={() => removeImage(i)}
                        className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-zinc-700 hover:bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity"
                      >
                        <X className="h-2.5 w-2.5 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <textarea
                ref={inputRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder={isRecreating ? "Reconnecting..." : "Reply to Claude..."}
                disabled={isLoading || isRecreating}
                className="w-full bg-transparent resize-none outline-none text-sm text-zinc-100 placeholder:text-zinc-500 px-4 pt-3 pb-12 min-h-[44px] max-h-[120px] leading-6 overflow-y-auto"
                rows={1}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="hidden"
              />
              <div className="absolute bottom-2 left-2 flex items-center gap-1">
                {supportsImages && (
                  <>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isLoading || isRecreating}
                      className="p-1.5 text-zinc-500 hover:text-zinc-300 disabled:opacity-40 transition-colors"
                      title="Attach image"
                    >
                      <ImageIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={handleScreenToggle}
                      disabled={isCapturing || isLoading || isRecreating}
                      className={`p-1.5 transition-colors disabled:opacity-40 ${
                        isScreenSharing ? 'text-red-400 hover:text-red-300' : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                      title={isScreenSharing ? "Stop screen sharing" : "Capture screen"}
                    >
                      {isCapturing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Monitor className="h-4 w-4" />
                      )}
                    </button>
                  </>
                )}
              </div>
              <div className="absolute bottom-2 right-2">
                {isLoading || isRecreating ? (
                  <Button
                    onClick={stopAgent}
                    size="icon"
                    className="h-8 w-8 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white relative"
                    title="Stop agent"
                  >
                    <Loader2 className="h-5 w-5 animate-spin text-zinc-400 absolute" />
                    <Square className="h-2.5 w-2.5 fill-red-500 text-red-500 relative z-10" />
                  </Button>
                ) : (
                  <Button
                    onClick={() => runPrompt()}
                    disabled={!prompt.trim() && attachedImages.length === 0}
                    size="icon"
                    className="h-8 w-8 rounded-lg bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-40 disabled:bg-zinc-700"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image preview dialog */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setPreviewImage(null)}
        >
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 p-2 bg-zinc-800 hover:bg-zinc-700 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-white" />
          </button>
          <img
            src={previewImage}
            alt="Preview"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}

// Wrapper with Suspense for useSearchParams
export default function SessionPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    }>
      <SessionPageInner />
    </Suspense>
  )
}
