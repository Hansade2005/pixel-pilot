"use client"

import { useState, useRef, useEffect, useCallback, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Terminal,
  Loader2,
  GitBranch,
  Copy,
  Check,
  Bot,
  ExternalLink,
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
  const [copied, setCopied] = useState<string | null>(null)

  const terminalRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Find the active session
  const activeSession = sessions.find(s => s.id === sessionId) || null

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

  // Focus input
  useEffect(() => {
    if (activeSession && inputRef.current) {
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
  const runPrompt = useCallback(async () => {
    if (!activeSession || !prompt.trim() || isLoading) return

    const currentPrompt = prompt.trim()
    setPrompt('')
    setIsLoading(true)
    setIsStreaming(true)

    // Update session title if first message
    if (activeSession.lines.filter(l => l.type === 'input').length === 0) {
      setSessions(prev => prev.map(s =>
        s.id === sessionId
          ? { ...s, title: currentPrompt.slice(0, 50) + (currentPrompt.length > 50 ? '...' : '') }
          : s
      ))
    }

    // Add input line
    setSessions(prev => prev.map(s =>
      s.id === sessionId
        ? { ...s, lines: [...s.lines, { type: 'input' as const, content: currentPrompt, timestamp: new Date() }] }
        : s
    ))

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

      const eventSource = new EventSource(
        `/api/agent-cloud?sandboxId=${encodeURIComponent(activeSession.sandboxId)}&prompt=${encodeURIComponent(enhancedPrompt)}`
      )

      let fullOutput = ''

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          switch (data.type) {
            case 'start':
              break
            case 'stdout':
              fullOutput += data.data
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
              break
            case 'stderr':
              setSessions(prev => prev.map(s =>
                s.id === sessionId
                  ? { ...s, lines: [...s.lines, { type: 'error' as const, content: data.data, timestamp: new Date() }] }
                  : s
              ))
              break
            case 'complete':
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
              eventSource.close()
              setIsLoading(false)
              setIsStreaming(false)
              break
            case 'error':
              setSessions(prev => prev.map(s =>
                s.id === sessionId
                  ? { ...s, lines: [...s.lines, { type: 'error' as const, content: data.message, timestamp: new Date() }] }
                  : s
              ))
              eventSource.close()
              setIsLoading(false)
              setIsStreaming(false)
              break
          }
        } catch (e) {
          console.error('Failed to parse SSE data:', e)
        }
      }

      eventSource.onerror = () => {
        eventSource.close()
        setIsLoading(false)
        setIsStreaming(false)
        setSessions(prev => prev.map(s =>
          s.id === sessionId
            ? { ...s, lines: [...s.lines, { type: 'error' as const, content: 'Connection lost. Please try again.', timestamp: new Date() }] }
            : s
        ))
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
  }, [activeSession, prompt, isLoading, sessionId, setSessions, storedTokens])

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
      {/* Action buttons */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800/50">
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          {activeSession.repo && (
            <>
              <GitBranch className="h-4 w-4" />
              <span className="font-mono">{activeSession.repo.branch}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-8 text-xs bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800 rounded-lg">
            View PR
            <ExternalLink className="h-3 w-3 ml-1.5" />
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800 rounded-lg">
            Open in CLI
            <Terminal className="h-3 w-3 ml-1.5" />
          </Button>
        </div>
      </div>

      {/* Chat area */}
      <div
        ref={terminalRef}
        className="flex-1 overflow-y-auto px-4 py-6"
      >
        <div className="max-w-3xl mx-auto space-y-2">
          {activeSession.lines.map((line, index) => renderLine(line, index))}
          {isStreaming && (
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
                placeholder="Reply to Claude..."
                disabled={isLoading}
                className="w-full bg-transparent resize-none outline-none text-sm text-zinc-100 placeholder:text-zinc-500 px-4 pt-3 pb-12 min-h-[44px] max-h-[120px] leading-6 overflow-y-auto"
                rows={1}
              />
              <div className="absolute bottom-2 right-2">
                <Button
                  onClick={runPrompt}
                  disabled={!prompt.trim() || isLoading}
                  size="icon"
                  className="h-8 w-8 rounded-lg bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-40 disabled:bg-zinc-700"
                >
                  {isLoading ? (
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
