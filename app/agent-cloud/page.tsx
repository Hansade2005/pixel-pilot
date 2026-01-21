"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Terminal,
  Send,
  Loader2,
  Square,
  Trash2,
  GitBranch,
  ChevronDown,
  FileCode,
  Copy,
  Check,
  Bot,
  ExternalLink,
  Image as ImageIcon,
  MoreVertical,
  Plus,
  Github,
  FolderGit2,
  PanelLeft,
  Sparkles,
  File,
  ChevronRight,
  SlidersHorizontal,
  Menu,
  X,
  Circle,
} from "lucide-react"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRepoAgent } from "@/hooks/use-repo-agent"

// Storage key for session persistence
const STORAGE_KEY = 'pipilot_agent_cloud'

interface TerminalLine {
  type: 'input' | 'output' | 'error' | 'system' | 'file' | 'diff' | 'tool'
  content: string
  timestamp: Date
  meta?: {
    toolName?: string
    fileName?: string
    additions?: number
    deletions?: number
    diffLines?: string[]
  }
}

interface Session {
  id: string
  sandboxId: string
  createdAt: Date
  status: 'active' | 'terminated'
  lines: TerminalLine[]
  model?: string
  gateway?: string
  title?: string
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
  default_branch: string
}

// Available models through Vercel AI Gateway
const MODELS = [
  { id: 'sonnet', name: 'Default', provider: 'xAI', description: 'Grok Code Fast 1' },
  { id: 'opus', name: 'GLM 4.7', provider: 'ZAI', description: 'High quality responses' },
  { id: 'haiku', name: 'Devstral', provider: 'Mistral', description: 'Quick tasks' },
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
  const [copied, setCopied] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [expandedDiffs, setExpandedDiffs] = useState<Record<number, boolean>>({})

  // Settings
  const [selectedModel, setSelectedModel] = useState<'sonnet' | 'opus' | 'haiku'>('sonnet')

  // Repository selection
  const [repos, setRepos] = useState<Repository[]>([])
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null)
  const [branches, setBranches] = useState<string[]>([])
  const [selectedBranch, setSelectedBranch] = useState<string>('main')
  const [isLoadingBranches, setIsLoadingBranches] = useState(false)
  const [hasCheckedConnection, setHasCheckedConnection] = useState(false)

  // Use the repo agent hook for GitHub connection
  const {
    connectionStatus,
    isLoadingConnection,
    isConnected,
    checkConnection,
    fetchRepositories,
    fetchBranches: fetchRepoBranches,
    repositories,
    isLoadingRepos,
  } = useRepoAgent()

  // Derived state: still initializing if we haven't checked connection yet
  const isInitializing = !hasCheckedConnection && !isLoadingConnection

  const terminalRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const sidebarInputRef = useRef<HTMLTextAreaElement>(null)

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

  // Check GitHub connection and load repos on mount
  useEffect(() => {
    const init = async () => {
      try {
        const connected = await checkConnection()
        setHasCheckedConnection(true)
        if (connected) {
          const fetchedRepos = await fetchRepositories()
          if (fetchedRepos.length > 0) {
            setRepos(fetchedRepos as Repository[])
          }
        }
      } catch (error) {
        console.error('Failed to initialize GitHub connection:', error)
        setHasCheckedConnection(true)
      }
    }
    init()
  }, [])

  // Update repos when repositories from hook change
  useEffect(() => {
    if (repositories.length > 0) {
      setRepos(repositories as Repository[])
    }
  }, [repositories])

  // Close mobile menu on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const loadBranches = async (repoFullName: string) => {
    setIsLoadingBranches(true)
    try {
      const fetchedBranches = await fetchRepoBranches(repoFullName)
      setBranches(fetchedBranches)
      if (fetchedBranches.includes('main')) {
        setSelectedBranch('main')
      } else if (fetchedBranches.includes('master')) {
        setSelectedBranch('master')
      } else if (fetchedBranches.length > 0) {
        setSelectedBranch(fetchedBranches[0])
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

  const addLine = useCallback((type: TerminalLine['type'], content: string, meta?: TerminalLine['meta']) => {
    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          lines: [...s.lines, { type, content, timestamp: new Date(), meta }]
        }
      }
      return s
    }))
  }, [activeSessionId])

  const createSession = async (initialPrompt?: string) => {
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

      // Generate session title from prompt or repo name
      const sessionTitle = initialPrompt
        ? initialPrompt.slice(0, 50) + (initialPrompt.length > 50 ? '...' : '')
        : `Session in ${selectedRepo.name}`

      const newSession: Session = {
        id: crypto.randomUUID(),
        sandboxId: data.sandboxId,
        createdAt: new Date(),
        status: 'active',
        model: data.model,
        gateway: data.gateway,
        title: sessionTitle,
        repo: {
          name: selectedRepo.name,
          full_name: selectedRepo.full_name,
          branch: selectedBranch,
        },
        stats: { additions: 0, deletions: 0 },
        lines: repoCloned ? [
          { type: 'system', content: `Cloned ${selectedRepo.full_name} (${selectedBranch})`, timestamp: new Date() },
          { type: 'system', content: `Model: ${modelInfo?.name || data.model}`, timestamp: new Date() },
        ] : [
          { type: 'system', content: `Failed to clone ${selectedRepo.full_name}`, timestamp: new Date() },
        ]
      }

      setSessions(prev => [newSession, ...prev])
      setActiveSessionId(newSession.id)
      setMobileMenuOpen(false)
      toast.success(repoCloned ? `Cloned ${selectedRepo.name}` : 'Session created')

      // If there's an initial prompt, run it after session creation
      if (initialPrompt && repoCloned) {
        setTimeout(() => {
          setPrompt(initialPrompt)
        }, 100)
      }
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

    // Update session title if it's the first user message
    if (activeSession.lines.filter(l => l.type === 'input').length === 0) {
      setSessions(prev => prev.map(s => {
        if (s.id === activeSessionId) {
          return {
            ...s,
            title: currentPrompt.slice(0, 50) + (currentPrompt.length > 50 ? '...' : '')
          }
        }
        return s
      }))
    }

    addLine('input', currentPrompt)

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

  const handleSidebarSubmit = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && prompt.trim()) {
      e.preventDefault()
      createSession(prompt.trim())
      setPrompt('')
    }
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()
  }

  const toggleDiff = (index: number) => {
    setExpandedDiffs(prev => ({ ...prev, [index]: !prev[index] }))
  }

  // Render a single message line
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
              <p className="text-zinc-100 font-mono text-sm leading-relaxed">{line.content}</p>
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
                <pre className="whitespace-pre-wrap text-sm text-zinc-300 font-mono leading-relaxed">
                  {line.content}
                </pre>
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

      case 'diff':
        const diffMeta = line.meta || {}
        return (
          <div key={index} className="py-2">
            <button
              onClick={() => toggleDiff(index)}
              className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors font-mono"
            >
              <ChevronRight className={`h-4 w-4 transition-transform ${expandedDiffs[index] ? 'rotate-90' : ''}`} />
              <File className="h-4 w-4" />
              <span>{diffMeta.fileName || 'Changes'}</span>
              {diffMeta.additions !== undefined && (
                <span className="text-green-500">+{diffMeta.additions}</span>
              )}
              {diffMeta.deletions !== undefined && (
                <span className="text-red-500">-{diffMeta.deletions}</span>
              )}
            </button>
            {expandedDiffs[index] && diffMeta.diffLines && (
              <div className="mt-2 ml-6 bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
                <pre className="text-xs p-3 overflow-x-auto font-mono">
                  {diffMeta.diffLines.map((diffLine: string, i: number) => (
                    <div
                      key={i}
                      className={
                        diffLine.startsWith('+') ? 'text-green-400 bg-green-500/10' :
                        diffLine.startsWith('-') ? 'text-red-400 bg-red-500/10' :
                        'text-zinc-400'
                      }
                    >
                      {diffLine}
                    </div>
                  ))}
                </pre>
              </div>
            )}
          </div>
        )

      default:
        return null
    }
  }

  // Sidebar content component (reused for mobile and desktop)
  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Input area */}
      <div className="p-4 border-b border-zinc-800/50">
        <div className="relative">
          <textarea
            ref={sidebarInputRef}
            placeholder="Ask Claude to write code..."
            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm resize-none h-20 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/50 font-mono transition-all"
            value={!activeSession ? prompt : ''}
            onChange={(e) => !activeSession && setPrompt(e.target.value)}
            onKeyDown={handleSidebarSubmit}
            disabled={!selectedRepo || isCreating}
          />
        </div>
        <div className="flex items-center gap-3 mt-3 text-zinc-600">
          <ImageIcon className="h-4 w-4" />
          <span className="text-sm font-mono">...</span>
        </div>
      </div>

      {/* Repository and settings */}
      <div className="px-4 py-3 border-b border-zinc-800/50 space-y-3">
        {/* Repo selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-2 text-sm hover:text-white transition-colors text-left py-1">
              <Github className="h-4 w-4 text-zinc-500 shrink-0" />
              <span className="flex-1 truncate font-medium">
                {selectedRepo ? selectedRepo.name : 'Select repository'}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-72 bg-zinc-900 border-zinc-800 max-h-80 overflow-y-auto">
            {isInitializing || isLoadingConnection || isLoadingRepos ? (
              <div className="p-4 text-center text-zinc-500 text-sm">
                <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                <span className="font-mono">Loading...</span>
              </div>
            ) : !isConnected ? (
              <div className="p-4 text-center text-zinc-500 text-sm">
                <Github className="h-6 w-6 mx-auto mb-2 opacity-50" />
                <p className="mb-2">GitHub not connected</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.location.href = '/workspace/deployment'}
                  className="text-xs mt-2"
                >
                  Connect GitHub
                </Button>
              </div>
            ) : repos.length === 0 ? (
              <div className="p-4 text-center text-zinc-500 text-sm font-mono">
                No repositories found
              </div>
            ) : (
              repos.map(repo => (
                <DropdownMenuItem
                  key={repo.id}
                  onClick={() => selectRepo(repo)}
                  className="flex items-center gap-2 cursor-pointer py-2.5"
                >
                  <FolderGit2 className="h-4 w-4 text-zinc-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-medium">{repo.name}</div>
                    {repo.description && (
                      <div className="text-xs text-zinc-500 truncate">{repo.description}</div>
                    )}
                  </div>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Branch and model selectors */}
        <div className="flex items-center gap-2">
          {/* Branch */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors px-2 py-1 rounded-md hover:bg-zinc-800/50">
                <GitBranch className="h-3.5 w-3.5" />
                <span className="font-mono">{selectedBranch}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-zinc-900 border-zinc-800 max-h-60 overflow-y-auto">
              {isLoadingBranches ? (
                <div className="p-2 text-center">
                  <Loader2 className="h-3 w-3 animate-spin mx-auto" />
                </div>
              ) : branches.length === 0 ? (
                <div className="p-2 text-center text-zinc-500 text-sm font-mono">
                  Select repo first
                </div>
              ) : (
                branches.map(branch => (
                  <DropdownMenuItem
                    key={branch}
                    onClick={() => setSelectedBranch(branch)}
                    className="cursor-pointer font-mono text-sm"
                  >
                    {branch}
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Model */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors px-2 py-1 rounded-md hover:bg-zinc-800/50">
                <Circle className="h-3 w-3" />
                <span className="font-mono">{MODELS.find(m => m.id === selectedModel)?.name}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-zinc-900 border-zinc-800">
              {MODELS.map(model => (
                <DropdownMenuItem
                  key={model.id}
                  onClick={() => setSelectedModel(model.id)}
                  className="cursor-pointer"
                >
                  <div>
                    <div className="font-medium font-mono">{model.name}</div>
                    <div className="text-xs text-zinc-500">{model.description}</div>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Sessions list */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-zinc-500 font-medium tracking-wide">Sessions</span>
            <button className="p-1 hover:bg-zinc-800 rounded transition-colors">
              <SlidersHorizontal className="h-3.5 w-3.5 text-zinc-500" />
            </button>
          </div>

          {sessions.length === 0 ? (
            <div className="text-center py-12">
              <Bot className="h-10 w-10 mx-auto mb-3 text-zinc-800" />
              <p className="text-sm text-zinc-600 font-mono">No sessions yet</p>
              <p className="text-xs text-zinc-700 mt-1">Select a repo and start coding</p>
            </div>
          ) : (
            <div className="space-y-1">
              {sessions.map(session => (
                <button
                  key={session.id}
                  onClick={() => {
                    setActiveSessionId(session.id)
                    setMobileMenuOpen(false)
                  }}
                  className={`w-full text-left px-3 py-3 rounded-xl transition-all group ${
                    activeSessionId === session.id
                      ? 'bg-zinc-800/80'
                      : 'hover:bg-zinc-800/40'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                      session.status === 'active'
                        ? 'bg-gradient-to-br from-purple-500 to-violet-600'
                        : 'bg-zinc-700'
                    }`}>
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate leading-tight">
                        {session.title || session.repo?.name || 'Untitled'}
                      </div>
                      <div className="text-xs text-zinc-500 flex items-center gap-1.5 mt-1 font-mono">
                        <span>{session.repo?.name}</span>
                        <span className="text-zinc-700">·</span>
                        <span>{formatTime(session.createdAt)}</span>
                        {session.stats && (session.stats.additions > 0 || session.stats.deletions > 0) && (
                          <>
                            <span className="text-zinc-700">·</span>
                            <span className="text-green-500">+{session.stats.additions}</span>
                            <span className="text-red-500">-{session.stats.deletions}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-700 rounded-md transition-all"
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-zinc-900 border-zinc-800">
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

      {/* New session button */}
      {selectedRepo && (
        <div className="p-4 border-t border-zinc-800/50">
          <Button
            onClick={() => createSession()}
            disabled={isCreating}
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl h-10 font-medium"
          >
            {isCreating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            New Session
          </Button>
        </div>
      )}
    </div>
  )

  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/50 bg-zinc-950/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center gap-3">
          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors md:hidden"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5 text-zinc-400" />
            ) : (
              <Menu className="h-5 w-5 text-zinc-400" />
            )}
          </button>

          {/* Desktop sidebar toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors hidden md:block"
          >
            <PanelLeft className="h-5 w-5 text-zinc-400" />
          </button>

          <div className="flex items-center gap-2.5">
            <span className="font-semibold text-lg tracking-tight">Claude Code</span>
            <Badge className="text-[10px] bg-zinc-800 text-zinc-400 font-normal border-0 px-2">
              Research preview
            </Badge>
          </div>
        </div>

        {/* Center - Task dropdown (desktop only) */}
        {activeSession && (
          <div className="hidden md:block absolute left-1/2 -translate-x-1/2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-3 py-1.5 hover:bg-zinc-800 rounded-lg transition-colors">
                  <span className="text-sm font-medium max-w-[200px] truncate">
                    {activeSession.title || activeSession.repo?.name}
                  </span>
                  <ChevronDown className="h-4 w-4 text-zinc-500" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-zinc-900 border-zinc-800 w-64">
                {sessions.map(session => (
                  <DropdownMenuItem
                    key={session.id}
                    onClick={() => setActiveSessionId(session.id)}
                    className="cursor-pointer"
                  >
                    <span className="truncate">{session.title || session.repo?.name}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Right - Branch info */}
        {activeSession?.repo && (
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <GitBranch className="h-4 w-4" />
            <span className="font-mono hidden sm:inline">{activeSession.repo.branch}</span>
          </div>
        )}
      </header>

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile sidebar */}
        <div className={`
          fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-zinc-950 border-r border-zinc-800/50 z-50
          transform transition-transform duration-300 ease-out md:hidden
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          pt-16
        `}>
          <SidebarContent />
        </div>

        {/* Desktop sidebar */}
        {sidebarOpen && (
          <div className="w-80 border-r border-zinc-800/50 flex-col bg-zinc-950 hidden md:flex">
            <SidebarContent />
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {activeSession ? (
            <>
              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2 px-4 py-2 border-b border-zinc-800/50">
                <Button size="sm" variant="outline" className="h-8 text-xs bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800 rounded-lg">
                  View PR
                  <ExternalLink className="h-3 w-3 ml-1.5" />
                </Button>
                <Button size="sm" variant="outline" className="h-8 text-xs bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800 rounded-lg">
                  Open in CLI
                  <Terminal className="h-3 w-3 ml-1.5" />
                </Button>
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
                    <div className="relative flex items-end gap-3">
                      <textarea
                        ref={inputRef}
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Reply to Claude..."
                        className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm resize-none min-h-[52px] max-h-[200px] placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/50 font-mono transition-all"
                        disabled={isLoading}
                        rows={1}
                      />
                      <Button
                        onClick={runPrompt}
                        disabled={!prompt.trim() || isLoading}
                        size="icon"
                        className="h-[52px] w-[52px] rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white shrink-0 shadow-lg shadow-orange-500/20"
                      >
                        {isLoading ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Send className="h-5 w-5" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
              <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-600/20 mb-6">
                <Bot className="h-14 w-14 text-orange-500" />
              </div>
              <h2 className="text-2xl font-semibold mb-3 tracking-tight">Welcome to Claude Code</h2>
              <p className="text-zinc-500 max-w-md mb-8 leading-relaxed">
                Select a repository from the sidebar and create a new session to start coding with Claude.
              </p>
              {isInitializing || isLoadingConnection ? (
                <div className="flex items-center gap-3 text-zinc-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="font-mono">Checking GitHub connection...</span>
                </div>
              ) : !isConnected ? (
                <Button
                  onClick={() => window.location.href = '/workspace/deployment'}
                  className="bg-zinc-800 hover:bg-zinc-700 rounded-xl h-11 px-6"
                >
                  <Github className="h-4 w-4 mr-2" />
                  Connect GitHub
                </Button>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
