"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Terminal,
  Send,
  Loader2,
  Play,
  Square,
  Trash2,
  GitBranch,
  ChevronDown,
  FileCode,
  Copy,
  Check,
  Zap,
  Bot,
  ExternalLink,
  Image as ImageIcon,
  MoreVertical,
  Plus,
  Settings,
  Github,
  FolderGit2,
} from "lucide-react"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

// Storage key for session persistence
const STORAGE_KEY = 'pipilot_agent_cloud'

interface TerminalLine {
  type: 'input' | 'output' | 'error' | 'system' | 'file' | 'diff'
  content: string
  timestamp: Date
}

interface Session {
  id: string
  sandboxId: string
  createdAt: Date
  status: 'active' | 'terminated'
  lines: TerminalLine[]
  model?: string
  gateway?: string
  repo?: {
    name: string
    full_name: string
    branch: string
  }
  stats?: {
    additions: number
    deletions: number
  }
}

interface Repository {
  id: number
  name: string
  full_name: string
  private: boolean
  description: string | null
  language: string | null
  updated_at: string
}

// Available models through Vercel AI Gateway
const MODELS = [
  { id: 'sonnet', name: 'Grok Code Fast 1', provider: 'xAI', description: 'Fast code generation' },
  { id: 'opus', name: 'GLM 4.7', provider: 'ZAI', description: 'High quality responses' },
  { id: 'haiku', name: 'Devstral Small 2', provider: 'Mistral', description: 'Quick tasks' },
] as const

export default function AgentCloudPage() {
  // Sessions state
  const [sessions, setSessions] = useState<Session[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)

  // Current session derived state
  const activeSession = sessions.find(s => s.id === activeSessionId) || null

  // UI state
  const [prompt, setPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [copied, setCopied] = useState(false)

  // Settings
  const [selectedModel, setSelectedModel] = useState<'sonnet' | 'opus' | 'haiku'>('sonnet')

  // Repository selection
  const [repos, setRepos] = useState<Repository[]>([])
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null)
  const [branches, setBranches] = useState<string[]>([])
  const [selectedBranch, setSelectedBranch] = useState<string>('main')
  const [isLoadingRepos, setIsLoadingRepos] = useState(false)
  const [isLoadingBranches, setIsLoadingBranches] = useState(false)
  const [githubConnected, setGithubConnected] = useState(false)

  const terminalRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Load sessions from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed.sessions) {
          const loadedSessions = parsed.sessions.map((s: any) => ({
            ...s,
            createdAt: new Date(s.createdAt),
            lines: s.lines.map((line: any) => ({
              ...line,
              timestamp: new Date(line.timestamp)
            }))
          }))
          setSessions(loadedSessions)
          if (parsed.activeSessionId) {
            setActiveSessionId(parsed.activeSessionId)
          }
        }
        if (parsed.settings) {
          setSelectedModel(parsed.settings.selectedModel || 'sonnet')
        }
      }
    } catch (error) {
      console.error('Failed to load sessions:', error)
    }
  }, [])

  // Save sessions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        sessions,
        activeSessionId,
        settings: { selectedModel }
      }))
    } catch (error) {
      console.error('Failed to save sessions:', error)
    }
  }, [sessions, activeSessionId, selectedModel])

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [activeSession?.lines])

  // Focus input on session change
  useEffect(() => {
    if (activeSession && inputRef.current) {
      inputRef.current.focus()
    }
  }, [activeSessionId])

  // Load GitHub repos on mount
  useEffect(() => {
    loadRepos()
  }, [])

  const loadRepos = async () => {
    setIsLoadingRepos(true)
    try {
      const response = await fetch('/api/repo-agent/repos')
      const data = await response.json()

      if (data.connected && data.repos) {
        setGithubConnected(true)
        setRepos(data.repos)
      } else {
        setGithubConnected(false)
      }
    } catch (error) {
      console.error('Failed to load repos:', error)
      setGithubConnected(false)
    } finally {
      setIsLoadingRepos(false)
    }
  }

  const loadBranches = async (repoFullName: string) => {
    setIsLoadingBranches(true)
    try {
      const response = await fetch(`/api/repo-agent/branches?repo=${encodeURIComponent(repoFullName)}`)
      const data = await response.json()

      if (data.branches) {
        setBranches(data.branches)
        // Default to main or master
        if (data.branches.includes('main')) {
          setSelectedBranch('main')
        } else if (data.branches.includes('master')) {
          setSelectedBranch('master')
        } else if (data.branches.length > 0) {
          setSelectedBranch(data.branches[0])
        }
      }
    } catch (error) {
      console.error('Failed to load branches:', error)
    } finally {
      setIsLoadingBranches(false)
    }
  }

  const selectRepo = (repo: Repository) => {
    setSelectedRepo(repo)
    loadBranches(repo.full_name)
  }

  const addLine = useCallback((type: TerminalLine['type'], content: string) => {
    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          lines: [...s.lines, { type, content, timestamp: new Date() }]
        }
      }
      return s
    }))
  }, [activeSessionId])

  const createSession = async () => {
    if (!selectedRepo) {
      toast.error('Please select a repository first')
      return
    }

    setIsCreating(true)
    try {
      const response = await fetch('/api/agent-cloud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          config: {
            model: selectedModel,
            repo: {
              full_name: selectedRepo.full_name,
              branch: selectedBranch
            }
          }
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create sandbox')
      }

      const modelInfo = MODELS.find(m => m.id === selectedModel)
      const repoCloned = data.repoCloned === true
      const newSession: Session = {
        id: crypto.randomUUID(),
        sandboxId: data.sandboxId,
        createdAt: new Date(),
        status: 'active',
        model: data.model,
        gateway: data.gateway,
        repo: {
          name: selectedRepo.name,
          full_name: selectedRepo.full_name,
          branch: selectedBranch,
        },
        stats: { additions: 0, deletions: 0 },
        lines: repoCloned ? [
          { type: 'system', content: `Cloned ${selectedRepo.full_name} (${selectedBranch})`, timestamp: new Date() },
          { type: 'system', content: `Working directory: ${data.projectDir}`, timestamp: new Date() },
          { type: 'system', content: `Model: ${modelInfo?.name || data.model}`, timestamp: new Date() },
          { type: 'system', content: 'Ready. Ask Claude to write code...', timestamp: new Date() },
        ] : [
          { type: 'system', content: `Failed to clone ${selectedRepo.full_name}. Check GitHub permissions.`, timestamp: new Date() },
          { type: 'system', content: `Model: ${modelInfo?.name || data.model}`, timestamp: new Date() },
          { type: 'system', content: 'You can still run Claude Code, but changes won\'t be persisted.', timestamp: new Date() },
        ]
      }

      setSessions(prev => [newSession, ...prev])
      setActiveSessionId(newSession.id)
      toast.success(repoCloned ? `Cloned ${selectedRepo.name}` : 'Session created (clone failed)')
    } catch (error) {
      console.error('Failed to create session:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create session')
    } finally {
      setIsCreating(false)
    }
  }

  const terminateSession = async (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId)
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

      setSessions(prev => prev.map(s => {
        if (s.id === sessionId) {
          return { ...s, status: 'terminated' }
        }
        return s
      }))
      toast.success('Session terminated')
    } catch (error) {
      console.error('Failed to terminate session:', error)
      toast.error('Failed to terminate session')
    }
  }

  const deleteSession = (sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId))
    if (activeSessionId === sessionId) {
      const remaining = sessions.filter(s => s.id !== sessionId)
      setActiveSessionId(remaining.length > 0 ? remaining[0].id : null)
    }
  }

  const runPrompt = async () => {
    if (!activeSession || !prompt.trim() || isLoading) return

    const currentPrompt = prompt.trim()
    setPrompt('')
    setIsLoading(true)
    setIsStreaming(true)

    addLine('input', `> ${currentPrompt}`)

    try {
      const eventSource = new EventSource(
        `/api/agent-cloud?sandboxId=${encodeURIComponent(activeSession.sandboxId)}&prompt=${encodeURIComponent(currentPrompt)}`
      )

      let fullOutput = ''

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          switch (data.type) {
            case 'start':
              addLine('system', 'Running...')
              break
            case 'stdout':
              fullOutput += data.data
              setSessions(prev => prev.map(s => {
                if (s.id === activeSessionId) {
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
              addLine('error', data.data)
              break
            case 'complete':
              // Update stats with real diff data from API
              if (data.diffStats) {
                setSessions(prev => prev.map(s => {
                  if (s.id === activeSessionId) {
                    return {
                      ...s,
                      stats: {
                        additions: (s.stats?.additions || 0) + (data.diffStats.additions || 0),
                        deletions: (s.stats?.deletions || 0) + (data.diffStats.deletions || 0)
                      }
                    }
                  }
                  return s
                }))
              }
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
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()
  }

  return (
    <div className="h-screen flex bg-zinc-950 text-zinc-100">
      {/* Sidebar */}
      <div className="w-80 border-r border-zinc-800 flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold">Agent Cloud</span>
            <Badge variant="secondary" className="text-[10px] bg-zinc-800 text-zinc-400">Beta</Badge>
          </div>
        </div>

        {/* New Session Input */}
        <div className="p-4 border-b border-zinc-800">
          <div className="space-y-3">
            <textarea
              placeholder="Ask Claude to write code..."
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm resize-none h-16 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              disabled={!selectedRepo}
            />
            <div className="flex items-center gap-2 text-xs">
              <ImageIcon className="h-4 w-4 text-zinc-500" />
              <span className="text-zinc-500">...</span>
            </div>
          </div>
        </div>

        {/* Repository Selector */}
        <div className="p-4 border-b border-zinc-800 space-y-2">
          <div className="flex items-center gap-2">
            <Github className="h-4 w-4 text-zinc-500" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 text-sm hover:text-white transition-colors">
                  {selectedRepo ? selectedRepo.name : 'Select repository'}
                  <ChevronDown className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64 bg-zinc-900 border-zinc-700">
                {isLoadingRepos ? (
                  <div className="p-4 text-center text-zinc-500 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                    Loading repos...
                  </div>
                ) : !githubConnected ? (
                  <div className="p-4 text-center text-zinc-500 text-sm">
                    <Github className="h-6 w-6 mx-auto mb-2" />
                    <p>GitHub not connected</p>
                    <Button size="sm" className="mt-2" variant="outline">
                      Connect GitHub
                    </Button>
                  </div>
                ) : repos.length === 0 ? (
                  <div className="p-4 text-center text-zinc-500 text-sm">
                    No repositories found
                  </div>
                ) : (
                  repos.map(repo => (
                    <DropdownMenuItem
                      key={repo.id}
                      onClick={() => selectRepo(repo)}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <FolderGit2 className="h-4 w-4 text-zinc-500" />
                      <div className="flex-1 min-w-0">
                        <div className="truncate">{repo.name}</div>
                        {repo.description && (
                          <div className="text-xs text-zinc-500 truncate">{repo.description}</div>
                        )}
                      </div>
                      {repo.private && (
                        <Badge variant="outline" className="text-[10px]">Private</Badge>
                      )}
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <GitBranch className="h-3 w-3 text-zinc-500" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="text-sm text-zinc-400 hover:text-white transition-colors flex items-center gap-1">
                    {selectedBranch}
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-zinc-900 border-zinc-700">
                  {isLoadingBranches ? (
                    <div className="p-2 text-center text-zinc-500 text-sm">
                      <Loader2 className="h-3 w-3 animate-spin mx-auto" />
                    </div>
                  ) : branches.length === 0 ? (
                    <div className="p-2 text-center text-zinc-500 text-sm">
                      Select a repo first
                    </div>
                  ) : (
                    branches.map(branch => (
                      <DropdownMenuItem
                        key={branch}
                        onClick={() => setSelectedBranch(branch)}
                        className="cursor-pointer"
                      >
                        {branch}
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="text-sm text-zinc-400 hover:text-white transition-colors flex items-center gap-1">
                  {MODELS.find(m => m.id === selectedModel)?.name || 'Default'}
                  <ChevronDown className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-zinc-900 border-zinc-700">
                {MODELS.map(model => (
                  <DropdownMenuItem
                    key={model.id}
                    onClick={() => setSelectedModel(model.id)}
                    className="cursor-pointer"
                  >
                    <div>
                      <div className="font-medium">{model.name}</div>
                      <div className="text-xs text-zinc-500">{model.description}</div>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-2">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-xs text-zinc-500 uppercase tracking-wider">Sessions</span>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={createSession}
                disabled={isCreating || !selectedRepo}
              >
                {isCreating ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Plus className="h-3 w-3" />
                )}
              </Button>
            </div>

            {sessions.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 text-sm">
                <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No sessions yet</p>
                <p className="text-xs mt-1">Select a repo and start coding</p>
              </div>
            ) : (
              <div className="space-y-1 mt-2">
                {sessions.map(session => (
                  <button
                    key={session.id}
                    onClick={() => setActiveSessionId(session.id)}
                    className={`w-full text-left p-2 rounded-lg transition-colors group ${
                      activeSessionId === session.id
                        ? 'bg-zinc-800'
                        : 'hover:bg-zinc-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {session.repo?.name || 'Untitled'}
                        </div>
                        <div className="text-xs text-zinc-500 flex items-center gap-2">
                          <span>{formatTime(session.createdAt)}</span>
                          {session.stats && (
                            <span className="flex items-center gap-1">
                              <span className="text-green-500">+{session.stats.additions}</span>
                              <span className="text-red-500">-{session.stats.deletions}</span>
                            </span>
                          )}
                          {session.status === 'active' && (
                            <Badge className="h-4 text-[10px] bg-green-500/20 text-green-400">
                              Active
                            </Badge>
                          )}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            onClick={(e) => e.stopPropagation()}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-700 rounded transition-all"
                          >
                            <MoreVertical className="h-3 w-3" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-zinc-900 border-zinc-700">
                          {session.status === 'active' && (
                            <DropdownMenuItem
                              onClick={() => terminateSession(session.id)}
                              className="cursor-pointer text-yellow-500"
                            >
                              <Square className="h-3 w-3 mr-2" />
                              Stop
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => deleteSession(session.id)}
                            className="cursor-pointer text-red-500"
                          >
                            <Trash2 className="h-3 w-3 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Settings */}
        <div className="p-4 border-t border-zinc-800">
          <button className="flex items-center gap-2 text-sm text-zinc-500 hover:text-white transition-colors">
            <Settings className="h-4 w-4" />
            Settings
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {activeSession ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">{activeSession.repo?.name}</span>
                <Badge variant="outline" className="text-xs">
                  {activeSession.repo?.branch}
                </Badge>
                {activeSession.stats && (
                  <span className="text-xs flex items-center gap-1 text-zinc-500">
                    <span className="text-green-500">+{activeSession.stats.additions}</span>
                    <span className="text-red-500">-{activeSession.stats.deletions}</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="h-7 text-xs">
                  View PR
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs">
                  Open in CLI
                  <Terminal className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>

            {/* Terminal */}
            <div
              ref={terminalRef}
              className="flex-1 overflow-y-auto p-4 font-mono text-sm"
            >
              <div className="space-y-3">
                {activeSession.lines.map((line, index) => (
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
                      <div className="text-zinc-100 whitespace-pre-wrap relative bg-zinc-900/50 rounded-lg p-3">
                        {line.content}
                        <button
                          onClick={() => copyToClipboard(line.content)}
                          className="absolute top-2 right-2 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-800 rounded hover:bg-zinc-700"
                        >
                          {copied ? (
                            <Check className="h-3 w-3 text-emerald-400" />
                          ) : (
                            <Copy className="h-3 w-3 text-zinc-500" />
                          )}
                        </button>
                      </div>
                    )}
                    {line.type === 'error' && (
                      <div className="text-red-400 bg-red-500/10 rounded-lg p-3">{line.content}</div>
                    )}
                    {line.type === 'file' && (
                      <div className="text-blue-400 flex items-center gap-2">
                        <FileCode className="h-3 w-3" />
                        {line.content}
                      </div>
                    )}
                    {line.type === 'diff' && (
                      <div className="bg-zinc-900 rounded-lg p-3 border border-zinc-800">
                        <pre className="text-xs">{line.content}</pre>
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
            </div>

            {/* Input */}
            {activeSession.status === 'active' && (
              <div className="p-4 border-t border-zinc-800">
                <div className="flex gap-2">
                  <textarea
                    ref={inputRef}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask Claude to write code..."
                    className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-sm resize-none min-h-[48px] max-h-[200px] placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    disabled={isLoading}
                    rows={1}
                  />
                  <Button
                    onClick={runPrompt}
                    disabled={!prompt.trim() || isLoading}
                    className="self-end bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 mb-6">
              <Bot className="h-12 w-12 text-orange-500" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Welcome to Agent Cloud</h2>
            <p className="text-zinc-500 max-w-md mb-6">
              Select a repository from the sidebar and start a new session to begin coding with Claude.
            </p>
            {!githubConnected && (
              <Button className="bg-zinc-800 hover:bg-zinc-700">
                <Github className="h-4 w-4 mr-2" />
                Connect GitHub
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
