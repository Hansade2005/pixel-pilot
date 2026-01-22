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
} from "lucide-react"
import { useAgentCloud, type TerminalLine } from "../layout"
import { Response } from "@/components/ai-elements/response"

function SessionPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('id')

  const {
    sessions,
    setSessions,
    storedTokens,
  } = useAgentCloud()

  const [prompt, setPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [isRecreating, setIsRecreating] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const terminalRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Find the active session
  const activeSession = sessions.find(s => s.id === sessionId) || null

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
      const response = await fetch('/api/agent-cloud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          config: {
            model: activeSession.model || 'sonnet',
            repo: activeSession.repo ? {
              full_name: activeSession.repo.full_name,
              branch: activeSession.repo.branch
            } : undefined
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
  }, [activeSession, sessionId, setSessions])

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
  const runPrompt = useCallback(async (overridePrompt?: string, overrideSandboxId?: string) => {
    if (!activeSession || isLoading || isRecreating) return

    const currentPrompt = overridePrompt || prompt.trim()
    if (!currentPrompt) return

    const sandboxIdToUse = overrideSandboxId || activeSession.sandboxId

    if (!overridePrompt) {
      setPrompt('')
    }
    setIsLoading(true)
    setIsStreaming(true)

    // Update session title if first message
    if (!overridePrompt && activeSession.lines.filter(l => l.type === 'input').length === 0) {
      setSessions(prev => prev.map(s =>
        s.id === sessionId
          ? { ...s, title: currentPrompt.slice(0, 50) + (currentPrompt.length > 50 ? '...' : '') }
          : s
      ))
    }

    // Add input line (skip only if this is a retry after sandbox recreation)
    // overrideSandboxId is only provided during recreation retries
    if (!overrideSandboxId) {
      setSessions(prev => prev.map(s =>
        s.id === sessionId
          ? { ...s, lines: [...s.lines, { type: 'input' as const, content: currentPrompt, timestamp: new Date() }] }
          : s
      ))
    }

    try {
      // Build prompt with GitHub context if token available
      let enhancedPrompt = currentPrompt

      // Pass GitHub token and repo info for auth cases
      if (storedTokens.github && activeSession.repo) {
        const githubContext = `
[GitHub Context - Use this for any GitHub operations if needed]
- Repository: ${activeSession.repo.full_name}
- Branch: ${activeSession.repo.branch}
- GitHub Token: ${storedTokens.github}
- Clone URL: https://${storedTokens.github}@github.com/${activeSession.repo.full_name}.git

User Request: ${currentPrompt}`
        enhancedPrompt = githubContext
      }

      // Connect to the streaming endpoint using fetch with ReadableStreamDefaultReader
      // This matches the preview panel pattern exactly for consistent streaming behavior
      const response = await fetch(
        `/api/agent-cloud?sandboxId=${encodeURIComponent(sandboxIdToUse)}&prompt=${encodeURIComponent(enhancedPrompt)}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'text/event-stream',
          },
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to connect to agent')
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response stream available')
      }

      const decoder = new TextDecoder()
      let fullOutput = ''
      let hasReceivedData = false
      let pendingUpdate = false
      let lastUpdateTime = 0

      // Throttled update function for smooth real-time rendering
      const updateOutput = (newOutput: string) => {
        fullOutput = newOutput
        const now = Date.now()

        // Throttle updates to every 16ms (60fps) for smooth rendering
        if (!pendingUpdate && now - lastUpdateTime > 16) {
          pendingUpdate = true
          requestAnimationFrame(() => {
            setSessions(prev => prev.map(s => {
              if (s.id === sessionId) {
                const lines = [...s.lines]
                const lastLine = lines[lines.length - 1]
                if (lastLine && lastLine.type === 'output') {
                  lines[lines.length - 1] = { ...lastLine, content: fullOutput }
                } else {
                  lines.push({ type: 'output', content: fullOutput, timestamp: new Date() })
                }
                return { ...s, lines }
              }
              return s
            }))
            pendingUpdate = false
            lastUpdateTime = Date.now()
          })
        }
      }

      // Helper function to process SSE message (async for sandbox recreation)
      const processMessage = async (data: any): Promise<boolean> => {
        switch (data.type) {
          case 'start':
            // Stream has started
            break

          case 'log':
            // Status message from server (e.g., "Claude is thinking...")
            console.log('[Agent Cloud]', data.message)
            break

          case 'heartbeat':
            // Keep-alive message, just acknowledge
            break

          case 'text':
            // Real-time text streaming from SDK
            updateOutput(fullOutput + (data.data || ''))
            break

          case 'stdout':
            // Fallback raw output streaming
            updateOutput(fullOutput + (data.data || ''))
            break

          case 'tool_use':
            // Tool being used - show in UI with details
            console.log('[Agent Cloud] Tool used:', data.name, data.input)
            const toolName = data.name
            const input = data.input
            let toolDescription = `Using ${toolName}`

            // Create user-friendly descriptions for common tools
            if (toolName === 'Write' && input?.file_path) {
              toolDescription = `Creating ${input.file_path.split('/').pop()}`
            } else if (toolName === 'Edit' && input?.file_path) {
              toolDescription = `Editing ${input.file_path.split('/').pop()}`
            } else if (toolName === 'Read' && input?.file_path) {
              toolDescription = `Reading ${input.file_path.split('/').pop()}`
            } else if (toolName === 'Bash' && input?.command) {
              toolDescription = `Running: ${input.command.substring(0, 60)}${input.command.length > 60 ? '...' : ''}`
            } else if (toolName === 'Glob' && input?.pattern) {
              toolDescription = `Searching: ${input.pattern}`
            } else if (toolName === 'Grep' && input?.pattern) {
              toolDescription = `Grep: ${input.pattern}`
            }

            setSessions(prev => prev.map(s =>
              s.id === sessionId
                ? { ...s, lines: [...s.lines, {
                    type: 'tool' as const,
                    content: toolDescription,
                    timestamp: new Date(),
                    meta: { toolName, fileName: input?.file_path }
                  }] }
                : s
            ))
            break

          case 'tool_result':
            // Tool result - log for debugging
            console.log('[Agent Cloud] Tool result:', data.result?.substring?.(0, 100) || data.result)
            break

          case 'result':
            // Final SDK result
            if (data.subtype === 'success') {
              console.log('[Agent Cloud] Generation complete, cost:', data.cost)
            }
            if (data.result) {
              updateOutput(fullOutput + '\n' + data.result)
            }
            break

          case 'stderr':
            setSessions(prev => prev.map(s =>
              s.id === sessionId
                ? { ...s, lines: [...s.lines, { type: 'error' as const, content: data.data, timestamp: new Date() }] }
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
                        additions: (s.stats?.additions || 0) + (data.diffStats.additions || 0),
                        deletions: (s.stats?.deletions || 0) + (data.diffStats.deletions || 0)
                      },
                      messageCount: data.messageCount
                    }
                  : s
              ))
            }
            setIsLoading(false)
            setIsStreaming(false)
            return true // Signal to break out of stream loop

          case 'error':
            // Check if error is about sandbox expiration
            const errorMsg = data.message || ''
            if (errorMsg.includes('not found') || errorMsg.includes('expired')) {
              console.log('Sandbox expired during stream, recreating...')
              reader.cancel()
              const newSandboxId = await recreateSandbox()
              if (newSandboxId) {
                setIsLoading(false)
                setIsStreaming(false)
                runPrompt(currentPrompt, newSandboxId)
              } else {
                setIsLoading(false)
                setIsStreaming(false)
              }
              return true // Signal to break out of stream loop
            }

            setSessions(prev => prev.map(s =>
              s.id === sessionId
                ? { ...s, lines: [...s.lines, { type: 'error' as const, content: data.message, timestamp: new Date() }] }
                : s
            ))
            setIsLoading(false)
            setIsStreaming(false)
            return true // Signal to break out of stream loop
        }
        return false // Continue processing
      }

      // Stream reading loop (matches preview panel pattern exactly)
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            console.log('[Agent Cloud] Stream ended')
            break
          }

          hasReceivedData = true
          const chunk = decoder.decode(value, { stream: true })

          // Parse SSE format: "data: {...}\n\n"
          if (chunk.includes('data: ')) {
            const lines = chunk.split('\n')
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6)) // Remove "data: " prefix
                  const shouldBreak = await processMessage(data)
                  if (shouldBreak) {
                    reader.cancel()
                    return
                  }
                } catch (e) {
                  // Ignore parsing errors for non-JSON lines
                }
              }
            }
          }
        }
      } catch (streamError) {
        console.error('[Agent Cloud] Streaming error:', streamError)
        
        // If we haven't received any data, this might be a connection issue - try recreating
        if (!hasReceivedData) {
          console.log('Connection failed without data, attempting to recreate sandbox...')
          const newSandboxId = await recreateSandbox()
          if (newSandboxId) {
            setIsLoading(false)
            setIsStreaming(false)
            runPrompt(currentPrompt, newSandboxId)
            return
          }
        }

        setSessions(prev => prev.map(s =>
          s.id === sessionId
            ? { ...s, lines: [...s.lines, { type: 'error' as const, content: 'Connection lost. Please try again.', timestamp: new Date() }] }
            : s
        ))
      } finally {
        reader.releaseLock()
        setIsLoading(false)
        setIsStreaming(false)
      }
    } catch (error) {
      console.error('Failed to run prompt:', error)
      setSessions(prev => prev.map(s =>
        s.id === sessionId
          ? { ...s, lines: [...s.lines, { type: 'error' as const, content: error instanceof Error ? error.message : 'Failed to run prompt', timestamp: new Date() }] }
          : s
      ))
      setIsLoading(false)
      setIsStreaming(false)
    }
  }, [activeSession, prompt, isLoading, isRecreating, sessionId, setSessions, storedTokens, recreateSandbox])

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

      // Store the pending prompt before clearing
      const promptToRun = activeSession.pendingPrompt

      // Clear the pending prompt from the session
      setSessions(prev => prev.map(s =>
        s.id === sessionId
          ? { ...s, pendingPrompt: undefined }
          : s
      ))

      // Run the prompt after a short delay to let the page render
      setTimeout(() => {
        runPrompt(promptToRun)
      }, 150)
    }
  }, [activeSession?.pendingPrompt, activeSession?.id, isLoading, isRecreating, sessionId, setSessions, runPrompt])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      runPrompt()
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

      case 'input':
        return (
          <div key={index} className="flex items-start gap-3 py-4">
            <div className="h-7 w-7 rounded-full bg-zinc-700 flex items-center justify-center shrink-0">
              <span className="text-xs font-semibold">U</span>
            </div>
            <div className="flex-1 pt-0.5">
              <p className="text-zinc-100 text-sm leading-relaxed">{line.content}</p>
            </div>
          </div>
        )

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

      case 'tool':
        return (
          <div key={index} className="flex items-center gap-2 text-sm text-zinc-500 py-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span className="font-mono text-xs">
              {line.content}
            </span>
          </div>
        )

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
              <span className="text-sm font-mono">Claude is working...</span>
            </div>
          )}
        </div>
      </div>

      {/* Input area */}
      {activeSession.status === 'active' && (
        <div className="border-t border-zinc-800/50 p-4">
          <div className="max-w-3xl mx-auto">
            <div className="relative bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden focus-within:border-zinc-700 focus-within:ring-1 focus-within:ring-zinc-700/50 transition-all">
              <textarea
                ref={inputRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isRecreating ? "Reconnecting..." : "Reply to Claude..."}
                disabled={isLoading || isRecreating}
                className="w-full bg-transparent resize-none outline-none text-sm text-zinc-100 placeholder:text-zinc-500 px-4 pt-3 pb-12 min-h-[44px] max-h-[120px] leading-6 overflow-y-auto"
                rows={1}
              />
              <div className="absolute bottom-2 right-2">
                <Button
                  onClick={() => runPrompt()}
                  disabled={!prompt.trim() || isLoading || isRecreating}
                  size="icon"
                  className="h-8 w-8 rounded-lg bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-40 disabled:bg-zinc-700"
                >
                  {isLoading || isRecreating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowUp className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
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
