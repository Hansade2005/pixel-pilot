"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import {
  Terminal,
  Send,
  Loader2,
  Play,
  Square,
  Trash2,
  RefreshCw,
  Settings,
  ChevronDown,
  ChevronUp,
  Folder,
  FileCode,
  Globe,
  Camera,
  Copy,
  Check,
  Zap,
  Bot,
  ExternalLink,
} from "lucide-react"
import { toast } from "sonner"

// Storage key for session persistence
const STORAGE_KEY = 'pipilot_agent_cloud'

interface TerminalLine {
  type: 'input' | 'output' | 'error' | 'system' | 'file'
  content: string
  timestamp: Date
}

interface Session {
  sandboxId: string
  createdAt: Date
  status: 'active' | 'terminated'
  lines: TerminalLine[]
}

export default function AgentCloudPage() {
  const [session, setSession] = useState<Session | null>(null)
  const [prompt, setPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [copied, setCopied] = useState(false)

  // Settings
  const [useAIGateway, setUseAIGateway] = useState(false)
  const [aiGatewayUrl, setAiGatewayUrl] = useState('')

  const terminalRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Load session from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed.session) {
          setSession({
            ...parsed.session,
            createdAt: new Date(parsed.session.createdAt),
            lines: parsed.session.lines.map((line: any) => ({
              ...line,
              timestamp: new Date(line.timestamp)
            }))
          })
        }
        if (parsed.settings) {
          setUseAIGateway(parsed.settings.useAIGateway || false)
          setAiGatewayUrl(parsed.settings.aiGatewayUrl || '')
        }
      }
    } catch (error) {
      console.error('Failed to load session:', error)
    }
  }, [])

  // Save session to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        session,
        settings: { useAIGateway, aiGatewayUrl }
      }))
    } catch (error) {
      console.error('Failed to save session:', error)
    }
  }, [session, useAIGateway, aiGatewayUrl])

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [session?.lines])

  const addLine = useCallback((type: TerminalLine['type'], content: string) => {
    setSession(prev => {
      if (!prev) return prev
      return {
        ...prev,
        lines: [...prev.lines, { type, content, timestamp: new Date() }]
      }
    })
  }, [])

  const createSession = async () => {
    setIsCreating(true)
    try {
      const config: Record<string, string> = {}
      if (useAIGateway && aiGatewayUrl) {
        config.anthropicBaseUrl = aiGatewayUrl
      }

      const response = await fetch('/api/agent-cloud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          config
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create sandbox')
      }

      const newSession: Session = {
        sandboxId: data.sandboxId,
        createdAt: new Date(),
        status: 'active',
        lines: [
          { type: 'system', content: 'Agent Cloud sandbox created', timestamp: new Date() },
          { type: 'system', content: `Sandbox ID: ${data.sandboxId}`, timestamp: new Date() },
          { type: 'system', content: 'Claude Code is ready. Type a prompt and press Enter to start.', timestamp: new Date() },
        ]
      }

      setSession(newSession)
      toast.success('Sandbox created successfully')
    } catch (error) {
      console.error('Failed to create session:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create sandbox')
    } finally {
      setIsCreating(false)
    }
  }

  const terminateSession = async () => {
    if (!session) return

    try {
      await fetch('/api/agent-cloud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'terminate',
          sandboxId: session.sandboxId
        })
      })

      setSession(prev => prev ? { ...prev, status: 'terminated' } : null)
      addLine('system', 'Sandbox terminated')
      toast.success('Sandbox terminated')
    } catch (error) {
      console.error('Failed to terminate session:', error)
      toast.error('Failed to terminate sandbox')
    }
  }

  const clearSession = () => {
    setSession(null)
    localStorage.removeItem(STORAGE_KEY)
  }

  const runPrompt = async () => {
    if (!session || !prompt.trim() || isLoading) return

    const currentPrompt = prompt.trim()
    setPrompt('')
    setIsLoading(true)
    setIsStreaming(true)

    addLine('input', `> ${currentPrompt}`)

    try {
      // Use Server-Sent Events for streaming
      const eventSource = new EventSource(
        `/api/agent-cloud?sandboxId=${encodeURIComponent(session.sandboxId)}&prompt=${encodeURIComponent(currentPrompt)}`
      )

      let fullOutput = ''

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          switch (data.type) {
            case 'start':
              addLine('system', 'Running Claude Code...')
              break
            case 'stdout':
              fullOutput += data.data
              // Update the last output line or add new one
              setSession(prev => {
                if (!prev) return prev
                const lines = [...prev.lines]
                const lastLine = lines[lines.length - 1]
                if (lastLine && lastLine.type === 'output') {
                  lines[lines.length - 1] = {
                    ...lastLine,
                    content: fullOutput
                  }
                } else {
                  lines.push({ type: 'output', content: fullOutput, timestamp: new Date() })
                }
                return { ...prev, lines }
              })
              break
            case 'stderr':
              addLine('error', data.data)
              break
            case 'complete':
              addLine('system', `Exit code: ${data.exitCode}`)
              eventSource.close()
              setIsLoading(false)
              setIsStreaming(false)
              break
            case 'error':
              addLine('error', data.message)
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
        addLine('error', 'Connection lost. Please try again.')
      }

    } catch (error) {
      console.error('Failed to run prompt:', error)
      addLine('error', error instanceof Error ? error.message : 'Failed to run prompt')
      setIsLoading(false)
      setIsStreaming(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      runPrompt()
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Copied to clipboard')
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background via-background to-muted/20">
      <Navigation />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold">Agent Cloud</h1>
            <Badge variant="secondary" className="text-xs">Beta</Badge>
          </div>
          <p className="text-muted-foreground">
            Run Claude Code in a secure cloud sandbox. Build, test, and iterate with an autonomous coding agent.
          </p>
        </div>

        {/* Settings Panel */}
        <Card className="mb-6">
          <CardHeader
            className="cursor-pointer flex flex-row items-center justify-between py-3"
            onClick={() => setShowSettings(!showSettings)}
          >
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <CardTitle className="text-sm font-medium">Configuration</CardTitle>
            </div>
            {showSettings ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </CardHeader>
          {showSettings && (
            <CardContent className="pt-0 space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="ai-gateway"
                  checked={useAIGateway}
                  onChange={(e) => setUseAIGateway(e.target.checked)}
                  className="h-4 w-4 rounded"
                />
                <label htmlFor="ai-gateway" className="text-sm">
                  Use Vercel AI Gateway
                </label>
              </div>
              {useAIGateway && (
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">
                    AI Gateway URL
                  </label>
                  <input
                    type="text"
                    value={aiGatewayUrl}
                    onChange={(e) => setAiGatewayUrl(e.target.value)}
                    placeholder="https://api.vercel.ai/v1"
                    className="w-full px-3 py-2 text-sm rounded-md border bg-background"
                  />
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Vercel AI Gateway provides caching, rate limiting, and analytics for AI API calls.
              </p>
            </CardContent>
          )}
        </Card>

        {/* Main Terminal Area */}
        <Card className="border-2">
          {/* Terminal Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4" />
              <span className="text-sm font-medium">
                {session ? `Sandbox: ${session.sandboxId.slice(0, 8)}...` : 'No active sandbox'}
              </span>
              {session && (
                <Badge
                  variant={session.status === 'active' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {session.status}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {session && session.status === 'active' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={terminateSession}
                  className="h-7 text-xs"
                >
                  <Square className="h-3 w-3 mr-1" />
                  Stop
                </Button>
              )}
              {session && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSession}
                  className="h-7 text-xs text-destructive"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Terminal Content */}
          <div
            ref={terminalRef}
            className="h-[400px] overflow-y-auto p-4 font-mono text-sm bg-zinc-950 text-zinc-100"
          >
            {!session ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Bot className="h-12 w-12 mb-4 text-orange-500" />
                <h3 className="text-lg font-medium mb-2">Welcome to Agent Cloud</h3>
                <p className="text-muted-foreground mb-6 max-w-md">
                  Create a sandbox to start running Claude Code. The agent can write code, modify files, and build applications autonomously.
                </p>
                <Button
                  onClick={createSession}
                  disabled={isCreating}
                  className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating Sandbox...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Create Sandbox
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {session.lines.map((line, index) => (
                  <div key={index} className="group">
                    {line.type === 'system' && (
                      <div className="text-zinc-500 flex items-center gap-2">
                        <span className="text-orange-500">*</span>
                        {line.content}
                      </div>
                    )}
                    {line.type === 'input' && (
                      <div className="text-emerald-400">{line.content}</div>
                    )}
                    {line.type === 'output' && (
                      <div className="text-zinc-100 whitespace-pre-wrap relative">
                        {line.content}
                        <button
                          onClick={() => copyToClipboard(line.content)}
                          className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          {copied ? (
                            <Check className="h-3 w-3 text-emerald-400" />
                          ) : (
                            <Copy className="h-3 w-3 text-zinc-500 hover:text-zinc-300" />
                          )}
                        </button>
                      </div>
                    )}
                    {line.type === 'error' && (
                      <div className="text-red-400">{line.content}</div>
                    )}
                    {line.type === 'file' && (
                      <div className="text-blue-400 flex items-center gap-2">
                        <FileCode className="h-3 w-3" />
                        {line.content}
                      </div>
                    )}
                  </div>
                ))}
                {isStreaming && (
                  <div className="flex items-center gap-2 text-orange-400">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Claude is working...</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Input Area */}
          {session && session.status === 'active' && (
            <div className="p-4 border-t bg-zinc-900">
              <div className="flex gap-2">
                <Textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter a prompt for Claude Code..."
                  className="flex-1 min-h-[60px] max-h-[200px] resize-none bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
                  disabled={isLoading}
                />
                <Button
                  onClick={runPrompt}
                  disabled={!prompt.trim() || isLoading}
                  className="self-end bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-zinc-500 mt-2">
                Press Enter to send, Shift+Enter for new line
              </p>
            </div>
          )}
        </Card>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Bot className="h-5 w-5 text-orange-500" />
              <h3 className="font-medium">Claude Code CLI</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Anthropic's official coding agent that can write, edit, and understand code autonomously.
            </p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="h-5 w-5 text-orange-500" />
              <h3 className="font-medium">Browser Automation</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Playwright pre-installed for testing UIs, capturing screenshots, and automating flows.
            </p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-5 w-5 text-orange-500" />
              <h3 className="font-medium">Vercel AI Gateway</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Optional integration for caching, rate limiting, and analytics on AI API calls.
            </p>
          </Card>
        </div>

        {/* Documentation Link */}
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Agent Cloud is powered by E2B secure sandboxes.
          </p>
          <div className="flex items-center justify-center gap-4">
            <a
              href="https://e2b.dev/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-orange-500 hover:underline flex items-center gap-1"
            >
              E2B Documentation
              <ExternalLink className="h-3 w-3" />
            </a>
            <a
              href="https://github.com/anthropics/claude-code"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-orange-500 hover:underline flex items-center gap-1"
            >
              Claude Code
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
