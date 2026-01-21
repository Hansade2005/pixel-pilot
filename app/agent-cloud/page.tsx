"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Terminal,
  Loader2,
  Square,
  Trash2,
  GitBranch,
  ChevronDown,
  Copy,
  Check,
  Bot,
  ExternalLink,
  MoreVertical,
  Plus,
  Github,
  FolderGit2,
  PanelLeft,
  Sparkles,
  Menu,
  X,
  Circle,
  Search,
  Globe,
} from "lucide-react"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { createClient } from "@/lib/supabase/client"
import { getDeploymentTokens } from "@/lib/cloud-sync"
import { PremiumChatInput } from "@/components/agent-cloud/premium-chat-input"
import { Response } from "@/components/ai-elements/response"

// Storage key for session persistence
const STORAGE_KEY = 'pipilot_agent_cloud_v2'

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
  messageCount?: number
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
  const [sidebarPrompt, setSidebarPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [repoSearchQuery, setRepoSearchQuery] = useState('')

  // Settings
  const [selectedModel, setSelectedModel] = useState<'sonnet' | 'opus' | 'haiku'>('sonnet')

  // Repository selection
  const [repos, setRepos] = useState<Repository[]>([])
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null)
  const [branches, setBranches] = useState<string[]>([])
  const [selectedBranch, setSelectedBranch] = useState<string>('main')
  const [isLoadingBranches, setIsLoadingBranches] = useState(false)

  // GitHub connection state
  const [storedTokens, setStoredTokens] = useState<{
    github?: string
    vercel?: string
    netlify?: string
  }>({})
  const [isLoadingTokens, setIsLoadingTokens] = useState(true)
  const [isLoadingRepos, setIsLoadingRepos] = useState(false)

  // Derived state
  const isConnected = !!storedTokens.github
  const isInitializing = isLoadingTokens

  const terminalRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const sidebarInputRef = useRef<HTMLTextAreaElement>(null)

  // Filter repos by search query
  const filteredRepos = repoSearchQuery
    ? repos.filter(repo =>
        repo.name.toLowerCase().includes(repoSearchQuery.toLowerCase()) ||
        repo.full_name.toLowerCase().includes(repoSearchQuery.toLowerCase())
      )
    : repos

  // Load sessions from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed.sessions) {
          const loadedSessions = parsed.sessions.map((s: Session) => ({
            ...s,
            createdAt: new Date(s.createdAt),
            lines: s.lines.map((line: TerminalLine) => ({
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

  // Load stored deployment tokens from database
  const loadStoredTokens = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setIsLoadingTokens(false)
        return
      }

      const tokens = await getDeploymentTokens(user.id)

      if (tokens) {
        const newTokens = {
          github: tokens.github || undefined,
          vercel: tokens.vercel || undefined,
          netlify: tokens.netlify || undefined
        }
        setStoredTokens(newTokens)

        if (newTokens.github) {
          await fetchUserRepos(newTokens.github)
        }
      } else {
        setStoredTokens({})
      }
    } catch (error) {
      console.error('loadStoredTokens: Error:', error)
    } finally {
      setIsLoadingTokens(false)
    }
  }

  // Fetch user's GitHub repositories
  const fetchUserRepos = async (githubToken: string) => {
    setIsLoadingRepos(true)
    try {
      const response = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated&type=all', {
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'PiPilot-Agent-Cloud'
        }
      })

      if (!response.ok) {
        console.error('fetchUserRepos: GitHub API error:', response.status)
        return
      }

      const data = await response.json()
      const formattedRepos: Repository[] = data.map((repo: Repository) => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        private: repo.private,
        description: repo.description,
        language: repo.language,
        updated_at: repo.updated_at,
        default_branch: repo.default_branch
      }))

      setRepos(formattedRepos)
    } catch (error) {
      console.error('fetchUserRepos: Error:', error)
    } finally {
      setIsLoadingRepos(false)
    }
  }

  // Fetch branches for a repository
  const fetchBranches = async (repoFullName: string): Promise<string[]> => {
    if (!storedTokens.github) return []

    try {
      const response = await fetch(`https://api.github.com/repos/${repoFullName}/branches?per_page=100`, {
        headers: {
          'Authorization': `Bearer ${storedTokens.github}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'PiPilot-Agent-Cloud'
        }
      })

      if (!response.ok) {
        console.error('fetchBranches: GitHub API error:', response.status)
        return []
      }

      const data = await response.json()
      return data.map((branch: { name: string }) => branch.name)
    } catch (error) {
      console.error('fetchBranches: Error:', error)
      return []
    }
  }

  // Initialize on mount
  useEffect(() => {
    loadStoredTokens()
  }, [])

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
      const fetchedBranches = await fetchBranches(repoFullName)
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
    setRepoSearchQuery('')
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
      const reconnected = data.reconnected === true

      // Generate session title
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
        messageCount: data.messageCount || 0,
        lines: reconnected ? [
          { type: 'system', content: `Reconnected to existing sandbox`, timestamp: new Date() },
          { type: 'system', content: `Repository: ${selectedRepo.full_name} (${selectedBranch})`, timestamp: new Date() },
          { type: 'system', content: `Model: ${modelInfo?.name || data.model}`, timestamp: new Date() },
          { type: 'system', content: `MCP Tools: DuckDuckGo Search, Arxiv`, timestamp: new Date() },
        ] : repoCloned ? [
          { type: 'system', content: `Cloned ${selectedRepo.full_name} (${selectedBranch})`, timestamp: new Date() },
          { type: 'system', content: `Model: ${modelInfo?.name || data.model}`, timestamp: new Date() },
          { type: 'system', content: `MCP Tools: DuckDuckGo Search, Arxiv`, timestamp: new Date() },
        ] : [
          { type: 'system', content: `Failed to clone ${selectedRepo.full_name}`, timestamp: new Date() },
        ]
      }

      setSessions(prev => [newSession, ...prev])
      setActiveSessionId(newSession.id)
      setMobileMenuOpen(false)
      setSidebarPrompt('')

      toast.success(
        reconnected
          ? `Reconnected to ${selectedRepo.name}`
          : repoCloned
            ? `Cloned ${selectedRepo.name}`
            : 'Session created'
      )

      // If there's an initial prompt, run it after session creation
      if (initialPrompt && repoCloned) {
        // Use the new session ID to run the prompt
        setTimeout(() => {
          setPrompt(initialPrompt)
          runPromptForSession(newSession.id, newSession.sandboxId, initialPrompt)
        }, 500)
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

  const runPromptForSession = async (sessionId: string, sandboxId: string, promptText: string) => {
    setIsLoading(true)
    setIsStreaming(true)

    // Add input line
    setSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        return {
          ...s,
          lines: [...s.lines, { type: 'input' as const, content: promptText, timestamp: new Date() }]
        }
      }
      return s
    }))

    try {
      const eventSource = new EventSource(
        `/api/agent-cloud?sandboxId=${encodeURIComponent(sandboxId)}&prompt=${encodeURIComponent(promptText)}`
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
              setSessions(prev => prev.map(s => {
                if (s.id === sessionId) {
                  return {
                    ...s,
                    lines: [...s.lines, { type: 'error' as const, content: data.data, timestamp: new Date() }]
                  }
                }
                return s
              }))
              break
            case 'complete':
              if (data.diffStats) {
                setSessions(prev => prev.map(s => {
                  if (s.id === sessionId) {
                    return {
                      ...s,
                      stats: {
                        additions: (s.stats?.additions || 0) + (data.diffStats.additions || 0),
                        deletions: (s.stats?.deletions || 0) + (data.diffStats.deletions || 0)
                      },
                      messageCount: data.messageCount
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
              setSessions(prev => prev.map(s => {
                if (s.id === sessionId) {
                  return {
                    ...s,
                    lines: [...s.lines, { type: 'error' as const, content: data.message, timestamp: new Date() }]
                  }
                }
                return s
              }))
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
        setSessions(prev => prev.map(s => {
          if (s.id === sessionId) {
            return {
              ...s,
              lines: [...s.lines, { type: 'error' as const, content: 'Connection lost. Please try again.', timestamp: new Date() }]
            }
          }
          return s
        }))
      }

    } catch (error) {
      console.error('Failed to run prompt:', error)
      setSessions(prev => prev.map(s => {
        if (s.id === sessionId) {
          return {
            ...s,
            lines: [...s.lines, {
              type: 'error' as const,
              content: error instanceof Error ? error.message : 'Failed to run prompt',
              timestamp: new Date()
            }]
          }
        }
        return s
      }))
      setIsLoading(false)
      setIsStreaming(false)
    }
  }

  const runPrompt = async () => {
    if (!activeSession || !prompt.trim() || isLoading) return

    const currentPrompt = prompt.trim()
    setPrompt('')

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

    await runPromptForSession(activeSession.id, activeSession.sandboxId, currentPrompt)
  }

  const handleSidebarSubmit = () => {
    if (sidebarPrompt.trim()) {
      createSession(sidebarPrompt.trim())
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
              <p className="text-zinc-100 font-sans text-sm leading-relaxed">{line.content}</p>
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
                {/* Use Streamdown Response component for Markdown rendering */}
                <div className="prose prose-invert prose-sm max-w-none">
                  <Response className="text-zinc-300 font-sans">
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

  // Sidebar content component
  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Sidebar chat input */}
      <div className="p-4 border-b border-zinc-800/50">
        <PremiumChatInput
          ref={sidebarInputRef}
          value={sidebarPrompt}
          onChange={setSidebarPrompt}
          onSubmit={handleSidebarSubmit}
          placeholder="Ask Claude to write code..."
          disabled={!selectedRepo || isCreating}
          isLoading={isCreating}
          variant="sidebar"
          repo={selectedRepo}
          branch={selectedBranch}
          model={MODELS.find(m => m.id === selectedModel)?.name}
        />
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
          <DropdownMenuContent className="w-72 bg-zinc-900 border-zinc-800 max-h-80 overflow-hidden">
            {isInitializing || isLoadingTokens || isLoadingRepos ? (
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
              <>
                {/* Search input */}
                <div className="p-2 border-b border-zinc-800">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                    <input
                      type="text"
                      placeholder="Search repositories..."
                      value={repoSearchQuery}
                      onChange={(e) => setRepoSearchQuery(e.target.value)}
                      className="w-full bg-zinc-800/50 border border-zinc-700 rounded-md pl-8 pr-3 py-1.5 text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                    />
                  </div>
                </div>
                <div className="overflow-y-auto max-h-60">
                  {filteredRepos.map(repo => (
                    <DropdownMenuItem
                      key={repo.id}
                      onClick={() => selectRepo(repo)}
                      className="flex items-center gap-2 cursor-pointer py-2.5"
                    >
                      <FolderGit2 className="h-4 w-4 text-zinc-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium">{repo.name}</span>
                          {repo.private && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0">
                              private
                            </Badge>
                          )}
                        </div>
                        {repo.description && (
                          <div className="text-xs text-zinc-500 truncate">{repo.description}</div>
                        )}
                      </div>
                    </DropdownMenuItem>
                  ))}
                </div>
              </>
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

        {/* Right - Branch info and MCP indicator */}
        <div className="flex items-center gap-3">
          {activeSession?.repo && (
            <>
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <Globe className="h-3.5 w-3.5 text-emerald-500" />
                <span className="hidden sm:inline">MCP</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <GitBranch className="h-4 w-4" />
                <span className="font-mono hidden sm:inline">{activeSession.repo.branch}</span>
              </div>
            </>
          )}
        </div>
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

              {/* Main chat input */}
              {activeSession.status === 'active' && (
                <div className="border-t border-zinc-800/50 p-4">
                  <div className="max-w-3xl mx-auto">
                    <PremiumChatInput
                      ref={inputRef}
                      value={prompt}
                      onChange={setPrompt}
                      onSubmit={runPrompt}
                      placeholder="Reply to Claude..."
                      disabled={isLoading}
                      isLoading={isLoading}
                      autoFocus
                      variant="main"
                      repo={activeSession.repo}
                    />
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
              <p className="text-zinc-500 max-w-md mb-4 leading-relaxed">
                Select a repository from the sidebar and create a new session to start coding with Claude.
              </p>
              <div className="flex items-center gap-2 text-xs text-zinc-600 mb-8">
                <Globe className="h-3.5 w-3.5 text-emerald-500" />
                <span>Web search enabled via MCP (DuckDuckGo, Arxiv)</span>
              </div>
              {isInitializing || isLoadingTokens ? (
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
