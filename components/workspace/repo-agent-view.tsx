"use client"

import React, { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { createClient } from '@/lib/supabase/client'
import { getDeploymentTokens } from '@/lib/cloud-sync'
import { useToast } from '@/hooks/use-toast'
import { useRepoAgent } from "@/hooks/use-repo-agent"
import {
  Send,
  Paperclip,
  FileText,
  Settings,
  ChevronLeft,
  Github,
  GitBranch,
  Loader2,
  CheckCircle2,
  XCircle,
  File,
  Plus,
  Minus,
  Code,
  Eye,
  EyeOff,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Lock,
  Globe,
  Star,
  GitFork,
  Calendar,
  User,
  MessageSquare,
  Zap,
  HelpCircle
} from 'lucide-react'

interface RepoAgentViewProps {
  userId?: string
}

interface RepoInfo {
  id: number
  name: string
  full_name: string
  owner: string
  private: boolean
  html_url: string
  description: string | null
  language: string | null
  updated_at: string
  default_branch: string
  permissions: {
    admin: boolean
    push: boolean
    pull: boolean
  }
  archived: boolean
  disabled: boolean
}

interface Message {
  id: string
  content: string
  isUser: boolean
  timestamp: Date
}

interface FileChange {
  path: string
  status: 'created' | 'modified' | 'deleted'
  additions?: number
  deletions?: number
  diff?: string[]
}

interface ActionLog {
  id: string
  type: 'file_operation' | 'api_call' | 'commit' | 'error'
  description: string
  timestamp: Date
  success: boolean
}

export function RepoAgentView({ userId }: RepoAgentViewProps) {
  // Landing page state
  const [currentView, setCurrentView] = useState<'landing' | 'workspace'>('landing')
  const [selectedRepo, setSelectedRepo] = useState('')
  const [selectedBranch, setSelectedBranch] = useState('main')
  const [landingInput, setLandingInput] = useState('')
  const [isLandingLoading, setIsLandingLoading] = useState(false)

  // Workspace state
  const [messages, setMessages] = useState<Message[]>([])
  const [currentInput, setCurrentInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Sidebar state
  const [activeTab, setActiveTab] = useState<'changes' | 'diffs' | 'actions'>('changes')
  const [fileChanges, setFileChanges] = useState<FileChange[]>([])
  const [actionLogs, setActionLogs] = useState<ActionLog[]>([])
  const [showDiffs, setShowDiffs] = useState<Record<string, boolean>>({})

  // UI state
  const [chatWidth, setChatWidth] = useState(50)
  const [isResizing, setIsResizing] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const chatBodyRef = useRef<HTMLDivElement>(null)

  // GitHub tokens state (following deployment client pattern)
  const [storedTokens, setStoredTokens] = useState<{
    github: string | undefined
    vercel: string | undefined
    netlify: string | undefined
  }>({
    github: undefined,
    vercel: undefined,
    netlify: undefined
  })

  const { toast } = useToast()
  const supabase = createClient()

  // State for loading and repos/branches
  const [repositories, setRepositories] = useState<RepoInfo[]>([])
  const [branches, setBranches] = useState<string[]>([])
  const [isLoadingRepos, setIsLoadingRepos] = useState(false)
  const [isLoadingBranches, setIsLoadingBranches] = useState(false)

  // Use the repo agent hook for GitHub connection check only
  const {
    connectionStatus,
    isLoadingConnection,
    isConnected,
    checkConnection
  } = useRepoAgent()

  // Check connection on mount
  useEffect(() => {
    checkConnection()
  }, [checkConnection])

  // Fetch repositories when we have a stored GitHub token
  useEffect(() => {
    if (storedTokens.github && repositories.length === 0 && currentView === 'landing') {
      fetchUserGitHubRepos()
    }
  }, [storedTokens.github, currentView])

  // Fetch branches when repository is selected
  useEffect(() => {
    if (selectedRepo && storedTokens.github) {
      fetchRepoGitHubBranches(selectedRepo)
    }
  }, [selectedRepo, storedTokens.github])

  // Set default branch when branches are loaded
  useEffect(() => {
    if (branches.length > 0 && selectedBranch === 'main' && !branches.includes('main')) {
      setSelectedBranch(branches[0])
    } else if (branches.length > 0 && !selectedBranch) {
      setSelectedBranch(branches[0])
    }
  }, [branches, selectedBranch])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px'
    }
  }, [currentInput, landingInput])

  // Load stored tokens on mount (following deployment client pattern)
  const loadStoredTokens = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        console.log('loadStoredTokens: No user found')
        return
      }

      console.log('loadStoredTokens: Loading tokens for user:', user.id)
      const tokens = await getDeploymentTokens(user.id)
      console.log('loadStoredTokens: Retrieved tokens:', tokens)

      if (tokens) {
        const newTokens = {
          github: tokens.github || undefined,
          vercel: tokens.vercel || undefined,
          netlify: tokens.netlify || undefined
        }
        console.log('loadStoredTokens: Setting stored tokens:', newTokens)
        setStoredTokens(newTokens)
      } else {
        console.log('loadStoredTokens: No tokens found, clearing stored tokens')
        setStoredTokens({
          github: undefined,
          vercel: undefined,
          netlify: undefined
        })
      }
    } catch (error) {
      console.error('loadStoredTokens: Error loading tokens:', error)
      setStoredTokens({
        github: undefined,
        vercel: undefined,
        netlify: undefined
      })
    }
  }

  // Fetch user's GitHub repositories (following deployment-client pattern)
  const fetchUserGitHubRepos = async () => {
    if (!storedTokens.github) {
      toast({
        title: "GitHub Not Connected",
        description: "Please connect your GitHub account in Account Settings first.",
        variant: "destructive"
      })
      return
    }

    setIsLoadingRepos(true)
    try {
      const response = await fetch(`https://api.github.com/user/repos?sort=updated&per_page=100`, {
        headers: {
          'Authorization': `Bearer ${storedTokens.github}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch repositories')
      }

      const repos = await response.json()
      const formattedRepos: RepoInfo[] = repos.map((repo: any) => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        owner: repo.owner.login,
        private: repo.private,
        html_url: repo.html_url,
        description: repo.description,
        language: repo.language,
        updated_at: repo.updated_at,
        default_branch: repo.default_branch,
        permissions: {
          admin: repo.permissions?.admin || false,
          push: repo.permissions?.push || false,
          pull: repo.permissions?.pull || false
        },
        archived: repo.archived,
        disabled: repo.disabled
      }))

      setRepositories(formattedRepos)
    } catch (error) {
      console.error('Error fetching GitHub repositories:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch repositories. Please check your connection.',
        variant: 'destructive'
      })
    } finally {
      setIsLoadingRepos(false)
    }
  }

  // Fetch branches for a repository (following deployment-client pattern)
  const fetchRepoGitHubBranches = async (repoFullName: string) => {
    if (!storedTokens.github) return

    setIsLoadingBranches(true)
    try {
      const response = await fetch(`https://api.github.com/repos/${repoFullName}/branches?per_page=100`, {
        headers: {
          'Authorization': `Bearer ${storedTokens.github}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch branches')
      }

      const branchesData = await response.json()
      const branchNames = branchesData.map((branch: any) => branch.name)
      setBranches(branchNames)
      
      // Set default branch if not set
      if (branchNames.length > 0 && !selectedBranch) {
        setSelectedBranch(branchNames[0])
      }
    } catch (error) {
      console.error('Error fetching branches:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch branches.',
        variant: 'destructive'
      })
    } finally {
      setIsLoadingBranches(false)
    }
  }

  // Load tokens on mount
  useEffect(() => {
    loadStoredTokens()
  }, [])

  // Auto-scroll to bottom of chat

  // Scroll to bottom when messages change
  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight
    }
  }, [messages])

  const handleLandingSubmit = async () => {
    if (!landingInput.trim() || !selectedRepo) {
      toast({
        title: "Missing Information",
        description: "Please select a repository and enter a prompt.",
        variant: "destructive"
      })
      return
    }

    if (!storedTokens.github) {
      toast({
        title: "GitHub Not Connected",
        description: "Please connect your GitHub account first.",
        variant: "destructive"
      })
      return
    }

    setIsLandingLoading(true)

    try {
      // Add initial message
      const initialMessage: Message = {
        id: Date.now().toString(),
        content: landingInput,
        isUser: true,
        timestamp: new Date()
      }

      setMessages([initialMessage])
      setCurrentView('workspace')

      // Call the repo agent API
      const response = await fetch('/api/repo-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: landingInput
          }],
          repo: selectedRepo,
          branch: selectedBranch,
          githubToken: storedTokens.github
        })
      })

      if (!response.ok) {
        throw new Error('Failed to start repo agent session')
      }

      // Handle streaming response (following chat-panel-v2 pattern)
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response stream available')
      }

      const decoder = new TextDecoder()
      let lineBuffer = ''
      let accumulatedContent = ''
      const agentMessageId = (Date.now() + 1).toString()
      
      // Create placeholder assistant message
      const assistantMessage: Message = {
        id: agentMessageId,
        content: '',
        isUser: false,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, assistantMessage])

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          console.log('[RepoAgent] Stream complete')
          break
        }

        const chunk = decoder.decode(value, { stream: true })
        lineBuffer += chunk
        const lines = lineBuffer.split('\n')
        lineBuffer = lines.pop() || ''

        const completeLines = lines.filter(line => line.trim())

        for (const line of completeLines) {
          try {
            const jsonString = line.startsWith('data: ') ? line.slice(6) : line
            if (!jsonString || jsonString.startsWith(':')) continue

            const parsed = JSON.parse(jsonString)
            console.log('[RepoAgent] Parsed:', parsed)

            // Handle text deltas (following chat-panel-v2 pattern)
            if (parsed.type === 'text-delta' && parsed.text) {
              accumulatedContent += parsed.text
              setMessages(prev => prev.map(msg =>
                msg.id === agentMessageId
                  ? { ...msg, content: accumulatedContent }
                  : msg
              ))
            }
            // Handle tool calls
            else if (parsed.type === 'tool-call') {
              const actionLog: ActionLog = {
                id: Date.now().toString() + Math.random(),
                type: parsed.toolName?.includes('file') ? 'file_operation' : 'api_call',
                description: `${parsed.toolName}`,
                timestamp: new Date(),
                success: false
              }
              setActionLogs(prev => [...prev, actionLog])
            }
            // Handle tool results
            else if (parsed.type === 'tool-result') {
              // Update action log status
              setActionLogs(prev => prev.map(log => {
                if (log.description.includes(parsed.toolName)) {
                  return { ...log, success: true }
                }
                return log
              }))

              // Track file changes
              if (parsed.toolName === 'github_write_file' && parsed.result?.success) {
                const fileChange: FileChange = {
                  path: parsed.args?.path || 'unknown',
                  status: parsed.result?.created ? 'created' : 'modified'
                }
                setFileChanges(prev => [fileChange, ...prev])
              } else if (parsed.toolName === 'github_delete_file' && parsed.result?.success) {
                const fileChange: FileChange = {
                  path: parsed.args?.path || 'unknown',
                  status: 'deleted'
                }
                setFileChanges(prev => [fileChange, ...prev])
              }
            }
          } catch (parseError) {
            console.warn('[RepoAgent] Parse error:', parseError)
          }
        }
      }

      setIsLandingLoading(false)
    } catch (error) {
      console.error('Error starting repo agent:', error)
      toast({
        title: "Error",
        description: "Failed to start repo agent session. Please try again.",
        variant: "destructive"
      })
      setCurrentView('landing')
      setMessages([])
      setIsLandingLoading(false)
    }
  }

  const sendMessage = async (content: string) => {
    if (!content.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      isUser: true,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setCurrentInput('')
    setIsLoading(true)

    try {
      // Create placeholder assistant message
      const assistantMessageId = (Date.now() + 1).toString()
      const assistantMessage: Message = {
        id: assistantMessageId,
        content: '',
        isUser: false,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, assistantMessage])

      // Continue the conversation with the repo agent
      const conversationHistory = messages.concat(userMessage).map(msg => ({
        role: msg.isUser ? 'user' : 'assistant',
        content: msg.content
      }))

      const response = await fetch('/api/repo-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: conversationHistory,
          repo: selectedRepo,
          branch: selectedBranch,
          githubToken: storedTokens.github
        })
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      // Handle streaming response (following chat-panel-v2 pattern)
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response stream available')
      }

      const decoder = new TextDecoder()
      let lineBuffer = ''
      let accumulatedContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          console.log('[RepoAgent] Stream complete')
          break
        }

        const chunk = decoder.decode(value, { stream: true })
        lineBuffer += chunk
        const lines = lineBuffer.split('\n')
        lineBuffer = lines.pop() || ''

        const completeLines = lines.filter(line => line.trim())

        for (const line of completeLines) {
          try {
            const jsonString = line.startsWith('data: ') ? line.slice(6) : line
            if (!jsonString || jsonString.startsWith(':')) continue

            const parsed = JSON.parse(jsonString)

            if (parsed.type === 'text-delta' && parsed.text) {
              accumulatedContent += parsed.text
              setMessages(prev => prev.map(msg =>
                msg.id === assistantMessageId
                  ? { ...msg, content: accumulatedContent }
                  : msg
              ))
            }
            else if (parsed.type === 'tool-call') {
              const actionLog: ActionLog = {
                id: Date.now().toString() + Math.random(),
                type: parsed.toolName?.includes('file') ? 'file_operation' : 'api_call',
                description: `${parsed.toolName}`,
                timestamp: new Date(),
                success: false
              }
              setActionLogs(prev => [...prev, actionLog])
            }
            else if (parsed.type === 'tool-result') {
              setActionLogs(prev => prev.map(log => {
                if (log.description.includes(parsed.toolName)) {
                  return { ...log, success: true }
                }
                return log
              }))

              if (parsed.toolName === 'github_write_file' && parsed.result?.success) {
                const fileChange: FileChange = {
                  path: parsed.args?.path || 'unknown',
                  status: parsed.result?.created ? 'created' : 'modified'
                }
                setFileChanges(prev => [fileChange, ...prev])
              } else if (parsed.toolName === 'github_delete_file' && parsed.result?.success) {
                const fileChange: FileChange = {
                  path: parsed.args?.path || 'unknown',
                  status: 'deleted'
                }
                setFileChanges(prev => [fileChange, ...prev])
              }
            }
          } catch (parseError) {
            console.warn('[RepoAgent] Parse error:', parseError)
          }
        }
      }

      setIsLoading(false)
    } catch (error) {
      console.error('Error sending message:', error)
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      })
      setIsLoading(false)
    }
  }

  const handleBackToLanding = () => {
    setCurrentView('landing')
    setMessages([])
    setFileChanges([])
    setActionLogs([])
    setLandingInput('')
  }

  const toggleDiff = (filePath: string) => {
    setShowDiffs(prev => ({
      ...prev,
      [filePath]: !prev[filePath]
    }))
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true)
    e.preventDefault()
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing) return

    const container = document.querySelector('.repo-agent-container') as HTMLElement
    if (!container) return

    const rect = container.getBoundingClientRect()
    const newWidth = ((e.clientX - rect.left) / rect.width) * 100

    if (newWidth >= 20 && newWidth <= 70) {
      setChatWidth(newWidth)
    }
  }

  const handleMouseUp = () => {
    setIsResizing(false)
  }

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
    } else {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'default'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing])

  if (currentView === 'landing') {
    return (
      <TooltipProvider>
        <div className="flex flex-col h-screen bg-gray-900 text-white overflow-hidden">
          <div className="flex-1 flex flex-col items-center justify-center px-6">
            {/* Hero Section */}
            <div className="text-center mb-12 max-w-3xl">
              <h1 className="text-5xl sm:text-6xl font-bold mb-4">
                <span className="bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                  PiPilot Repo Agent
                </span>
              </h1>
              <p className="text-xl text-gray-400">
                AI-powered GitHub repository management
              </p>
            </div>

            {/* Integrated Input Box */}
            <div className="w-full max-w-4xl">
              <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 shadow-2xl p-2">
                {/* Top Bar with Selectors */}
                <div className="flex flex-wrap gap-2 items-center mb-3 pb-3 border-b border-gray-700/50">
                  {/* GitHub Connection Indicator */}
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-700/50">
                    <Github className="h-4 w-4 text-gray-400" />
                    {storedTokens.github ? (
                      <span className="text-xs text-green-400 flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                        Connected
                      </span>
                    ) : (
                      <a href="/workspace/account" className="text-xs text-yellow-400 hover:text-yellow-300">
                        Connect GitHub
                      </a>
                    )}
                  </div>

                  {/* Repository Selector */}
                  <Select
                    value={selectedRepo}
                    onValueChange={setSelectedRepo}
                    disabled={!storedTokens.github || isLoadingRepos}
                  >
                    <SelectTrigger className="h-9 bg-gray-700/50 border-gray-600/50 text-white text-sm w-[280px]">
                      <SelectValue placeholder="Select repository" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      {repositories.map((repo) => (
                        <SelectItem
                          key={repo.full_name}
                          value={repo.full_name}
                          className="text-white hover:bg-gray-700"
                        >
                          <div className="flex items-center gap-2">
                            <span className="truncate">{repo.full_name}</span>
                            {repo.private && <Lock className="h-3 w-3 text-gray-400" />}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Branch Selector */}
                  {selectedRepo && (
                    <Select
                      value={selectedBranch}
                      onValueChange={setSelectedBranch}
                      disabled={!selectedRepo || isLoadingBranches || !storedTokens.github}
                    >
                      <SelectTrigger className="h-9 bg-gray-700/50 border-gray-600/50 text-white text-sm w-[160px]">
                        <div className="flex items-center gap-2">
                          <GitBranch className="h-3.5 w-3.5" />
                          <SelectValue placeholder="Branch" />
                        </div>
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        {branches.map((branch) => (
                          <SelectItem key={branch} value={branch} className="text-white hover:bg-gray-700">
                            {branch}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {/* Refresh Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchUserGitHubRepos}
                    disabled={isLoadingRepos || !storedTokens.github}
                    className="h-9 px-2 text-gray-400 hover:text-white hover:bg-gray-700/50"
                  >
                    {isLoadingRepos ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {/* Main Input Area */}
                <div className="relative">
                  <Textarea
                    ref={textareaRef}
                    value={landingInput}
                    onChange={(e) => setLandingInput(e.target.value)}
                    placeholder="Describe your task... e.g., 'Fix the authentication bug' or 'Add a new API endpoint'"
                    className="min-h-[120px] bg-gray-900/50 border-0 text-white placeholder-gray-500 resize-none pr-14 focus-visible:ring-0 focus-visible:ring-offset-0"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault()
                        handleLandingSubmit()
                      }
                    }}
                  />
                  
                  {/* Send Button */}
                  <Button
                    onClick={handleLandingSubmit}
                    disabled={!landingInput.trim() || !selectedRepo || isLandingLoading || !storedTokens.github}
                    className="absolute bottom-3 right-3 h-10 w-10 p-0 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLandingLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </Button>
                </div>

                {/* Hint */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-700/50">
                  <span className="text-xs text-gray-500">
                    Press <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-xs">⌘</kbd> + <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-xs">↵</kbd> to send
                  </span>
                  {selectedRepo && (
                    <span className="text-xs text-gray-500">
                      {selectedRepo} · {selectedBranch}
                    </span>
                  )}
                </div>
              </div>
            </div>
        </div>
      </TooltipProvider>
    )
  }

  return (
    <div className="repo-agent-container h-screen flex overflow-hidden" style={{
      background: 'var(--bg, #0a0e14)',
      color: 'var(--text, #e5e7eb)'
    }}>
      {/* Chat Panel */}
      <div
        className="chat-panel flex flex-col"
        style={{
          flex: `0 0 ${chatWidth}%`,
          background: 'linear-gradient(180deg, #0a0e14 0%, #0d1117 100%)',
          borderRight: '1px solid rgba(59, 130, 246, 0.1)',
          boxShadow: '4px 0 40px rgba(0, 0, 0, 0.5)',
          position: 'relative',
          minWidth: '320px',
          overflow: 'hidden'
        }}
      >
        {/* Chat Header */}
        <div className="chat-header p-5 flex items-center justify-between gap-3" style={{
          borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
          fontWeight: '600',
          fontSize: '1.1em',
          background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.8), rgba(31, 41, 55, 0.6))',
          backdropFilter: 'blur(20px)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div className="header-left flex items-center gap-3">
            <button
              onClick={handleBackToLanding}
              className="back-icon w-6 h-6 cursor-pointer text-gray-400 transition-all hover:text-gray-200 hover:translate-x-[-2px]"
            >
              <ChevronLeft className="w-full h-full" />
            </button>
            <div className="status-dot w-2 h-2 bg-green-500 rounded-full" style={{
              animation: 'pulse 2s infinite',
              boxShadow: '0 0 12px #10b981'
            }}></div>
            <span className="header-title">Repo Agent</span>
          </div>
          <div className="repo-selector flex items-center gap-2">
            <select 
              value={selectedRepo}
              onChange={(e) => setSelectedRepo(e.target.value)}
              className="selector bg-gray-800/60 border border-blue-500/30 rounded-lg px-3.5 py-2 text-gray-200 text-sm cursor-pointer outline-none transition-all hover:border-blue-500"
              style={{
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%239ca3af' d='M6 8.5l-4-4h8l-4 4z'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 10px center',
                paddingRight: '30px'
              }}
            >
              <option value="">Select repository</option>
              {repositories.map(repo => (
                <option key={repo.full_name} value={repo.full_name}>
                  {repo.full_name}
                </option>
              ))}
            </select>
            <select 
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="selector bg-gray-800/60 border border-blue-500/30 rounded-lg px-3.5 py-2 text-gray-200 text-sm cursor-pointer outline-none transition-all hover:border-blue-500"
              style={{
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%239ca3af' d='M6 8.5l-4-4h8l-4 4z'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 10px center',
                paddingRight: '30px'
              }}
              disabled={isLoadingBranches}
            >
              {branches.map(branch => (
                <option key={branch} value={branch}>
                  {branch}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={chatBodyRef}
          className="chat-body flex-1 overflow-y-auto p-8 flex flex-col gap-5"
          style={{
            background: 'linear-gradient(180deg, #0a0e14 0%, #0d1117 50%, #0a0e14 100%)',
            position: 'relative',
            paddingBottom: '160px'
          }}
        >
          {messages.map(message => (
            <div
              key={message.id}
              className={`message max-w-[80%] p-4 rounded-2xl leading-relaxed whitespace-pre-wrap text-sm transition-all relative`}
              style={{
                alignSelf: message.isUser ? 'flex-end' : 'flex-start',
                background: message.isUser 
                  ? 'linear-gradient(135deg, #3b82f6, #2563eb)' 
                  : 'transparent',
                color: 'white',
                borderBottomRightRadius: message.isUser ? '4px' : '16px',
                borderBottomLeftRadius: message.isUser ? '16px' : '4px',
                boxShadow: message.isUser ? '0 4px 20px rgba(59, 130, 246, 0.3)' : 'none',
                animation: 'messageSlide 0.4s ease-out'
              }}
            >
              {message.content}
            </div>
          ))}
        </div>

        {/* Input Area */}
        <div className="input-area p-5 absolute bottom-0 left-0 right-0 z-10" style={{
          background: 'linear-gradient(180deg, rgba(17, 24, 39, 0.95), rgba(10, 14, 20, 0.98))',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(59, 130, 246, 0.2)',
          boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.6)'
        }}>
          <div className="input-wrapper flex items-end gap-3 relative">
            <div className="input-container flex-1 relative overflow-hidden rounded-2xl flex items-center gap-2 p-1" style={{
              background: 'rgba(17, 24, 39, 0.8)',
              border: '2px solid rgba(59, 130, 246, 0.3)',
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.05)',
              transition: 'all 0.3s ease'
            }}>
              <div className="textarea-wrapper flex-1">
                <Textarea
                  ref={textareaRef}
                  value={currentInput}
                  onChange={(e) => setCurrentInput(e.target.value)}
                  placeholder="Describe what you want to build..."
                  className="w-full bg-transparent border-none text-gray-200 placeholder-gray-500 resize-none outline-none p-3 leading-relaxed"
                  style={{
                    maxHeight: '200px',
                    minHeight: '44px'
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
                      e.preventDefault()
                      sendMessage(currentInput)
                    }
                  }}
                />
              </div>
              <div className="input-actions flex items-center gap-2 p-1">
                <button className="action-icon w-9 h-9 flex items-center justify-center rounded-full text-gray-400 cursor-pointer transition-all hover:bg-blue-900/30 hover:text-blue-400 bg-transparent border-none">
                  <Paperclip className="w-4.5 h-4.5" />
                </button>
                <button className="action-icon w-9 h-9 flex items-center justify-center rounded-full text-gray-400 cursor-pointer transition-all hover:bg-blue-900/30 hover:text-blue-400 bg-transparent border-none">
                  <Plus className="w-4.5 h-4.5" />
                </button>
              </div>
              <button
                onClick={() => sendMessage(currentInput)}
                disabled={!currentInput.trim() || isLoading}
                className="send-button w-9 h-9 flex items-center justify-center border-none rounded-full text-white cursor-pointer transition-all flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  boxShadow: '0 2px 12px rgba(59, 130, 246, 0.4)'
                }}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
          <div className="input-hint text-xs text-gray-400 p-2 pt-3 flex items-center gap-2">
            Press <kbd className="px-2 py-1 bg-gray-800 rounded text-xs border border-gray-700">↵</kbd> to send, <kbd className="px-2 py-1 bg-gray-800 rounded text-xs border border-gray-700">⇧ ↵</kbd> for new line
          </div>
        </div>
      </div>

      {/* Resizer */}
      <div
        className="resizer cursor-col-resize transition-all relative"
        style={{
          width: '8px',
          background: 'linear-gradient(to right, rgba(59, 130, 246, 0.1), transparent)'
        }}
        onMouseDown={handleMouseDown}
      >
        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-0.5 h-10 bg-blue-500/30 rounded-sm opacity-0 transition-opacity hover:opacity-100"></div>
      </div>

      {/* Sidebar */}
      <div className="sidebar flex-1 flex flex-col overflow-hidden" style={{
        background: 'linear-gradient(180deg, #0a0e14 0%, #0d1117 100%)',
        borderLeft: '1px solid rgba(59, 130, 246, 0.1)',
        boxShadow: '-4px 0 40px rgba(0, 0, 0, 0.5)'
      }}>
        {/* Sidebar Tabs */}
        <div className="sidebar-tabs p-5 flex items-center" style={{
          background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.8), rgba(31, 41, 55, 0.6))',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
          position: 'relative'
        }}>
          <div className="tab-buttons flex gap-2 p-1.5 rounded-xl" style={{
            background: 'rgba(31, 41, 55, 0.6)',
            border: '1px solid rgba(59, 130, 246, 0.1)'
          }}>
            <button
              onClick={() => setActiveTab('changes')}
              className={`tab-btn px-5 py-2.5 text-sm font-medium rounded-lg cursor-pointer transition-all relative ${
                activeTab === 'changes'
                  ? 'text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
              style={{
                background: activeTab === 'changes' 
                  ? 'linear-gradient(135deg, #1e40af, #1d4ed8)' 
                  : 'transparent',
                boxShadow: activeTab === 'changes' 
                  ? '0 4px 16px rgba(30, 64, 175, 0.5), 0 0 30px rgba(30, 64, 175, 0.2)' 
                  : 'none'
              }}
            >
              File Changes
            </button>
            <button
              onClick={() => setActiveTab('diffs')}
              className={`tab-btn px-5 py-2.5 text-sm font-medium rounded-lg cursor-pointer transition-all relative ${
                activeTab === 'diffs'
                  ? 'text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
              style={{
                background: activeTab === 'diffs' 
                  ? 'linear-gradient(135deg, #1e40af, #1d4ed8)' 
                  : 'transparent',
                boxShadow: activeTab === 'diffs' 
                  ? '0 4px 16px rgba(30, 64, 175, 0.5), 0 0 30px rgba(30, 64, 175, 0.2)' 
                  : 'none'
              }}
            >
              Code Diffs
            </button>
            <button
              onClick={() => setActiveTab('actions')}
              className={`tab-btn px-5 py-2.5 text-sm font-medium rounded-lg cursor-pointer transition-all relative ${
                activeTab === 'actions'
                  ? 'text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
              style={{
                background: activeTab === 'actions' 
                  ? 'linear-gradient(135deg, #1e40af, #1d4ed8)' 
                  : 'transparent',
                boxShadow: activeTab === 'actions' 
                  ? '0 4px 16px rgba(30, 64, 175, 0.5), 0 0 30px rgba(30, 64, 175, 0.2)' 
                  : 'none'
              }}
            >
              Actions
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="tab-content-wrapper flex-1 overflow-y-auto p-6" style={{
          background: '#0a0e14'
        }}>
          {activeTab === 'changes' && (
            <div className="tab-content">
              <h3 className="section-title text-xl font-semibold mb-6 text-white flex items-center gap-3" style={{
                position: 'relative'
              }}>
                <span style={{
                  content: '""',
                  width: '4px',
                  height: '24px',
                  background: 'linear-gradient(180deg, #3b82f6, #2563eb)',
                  borderRadius: '2px',
                  boxShadow: '0 0 12px rgba(59, 130, 246, 0.5)',
                  display: 'inline-block',
                  marginRight: '8px'
                }}></span>
                Files Modified
              </h3>

              {fileChanges.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <File className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No file changes yet</p>
                </div>
              ) : (
                fileChanges.map((change, index) => (
                  <div
                    key={index}
                    className="file-item flex items-center justify-between p-4.5 mb-3 rounded-xl cursor-pointer transition-all"
                    style={{
                      background: 'rgba(31, 41, 55, 0.4)',
                      border: '1px solid rgba(59, 130, 246, 0.2)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateX(4px)'
                      e.currentTarget.style.background = 'rgba(31, 41, 55, 0.6)'
                      e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.4)'
                      e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateX(0)'
                      e.currentTarget.style.background = 'rgba(31, 41, 55, 0.4)'
                      e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.2)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    <div className="flex items-center">
                      <div className="file-icon mr-3">
                        {change.status === 'created' && (
                          <Plus className="w-5 h-5 text-green-400" />
                        )}
                        {change.status === 'modified' && (
                          <File className="w-5 h-5 text-blue-400" />
                        )}
                        {change.status === 'deleted' && (
                          <Minus className="w-5 h-5 text-red-400" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-white">{change.path}</div>
                        <div className="text-green-400 text-sm mt-1">
                          {change.status === 'created' && 'created'}
                          {change.status === 'modified' && 'modified'}
                          {change.status === 'deleted' && 'deleted'}
                          {change.additions !== undefined && ` • +${change.additions} lines`}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'diffs' && (
            <div className="tab-content">
              <h3 className="section-title text-xl font-semibold mb-6 text-white flex items-center gap-3" style={{
                position: 'relative'
              }}>
                <span style={{
                  content: '""',
                  width: '4px',
                  height: '24px',
                  background: 'linear-gradient(180deg, #3b82f6, #2563eb)',
                  borderRadius: '2px',
                  boxShadow: '0 0 12px rgba(59, 130, 246, 0.5)',
                  display: 'inline-block',
                  marginRight: '8px'
                }}></span>
                Review Changes
              </h3>

              {fileChanges.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Code className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No diffs to review</p>
                </div>
              ) : (
                fileChanges.map((change, index) => (
                  <div
                    key={index}
                    className="accordion overflow-hidden mb-5 rounded-xl"
                    style={{
                      background: 'rgba(31, 41, 55, 0.4)',
                      border: '1px solid rgba(59, 130, 246, 0.2)',
                      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
                    }}
                  >
                    <button
                      onClick={() => toggleDiff(change.path)}
                      className="accordion-header w-full p-4 font-medium text-white flex items-center justify-between gap-2.5 cursor-pointer transition-all"
                      style={{
                        background: 'linear-gradient(135deg, #1e40af, #1d4ed8)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, #2563eb, #1d4ed8)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, #1e40af, #1d4ed8)'
                      }}
                    >
                      <div className="file-info flex items-center gap-2.5">
                        <File className="w-4 h-4" />
                        {change.path}
                      </div>
                      <div className="diff-stats text-sm flex gap-3">
                        {change.additions !== undefined && (
                          <span className="added-stat text-green-400">+{change.additions}</span>
                        )}
                        {change.deletions !== undefined && (
                          <span className="removed-stat text-red-400">-{change.deletions}</span>
                        )}
                      </div>
                    </button>
                    <div
                      className={`accordion-content overflow-hidden transition-all ${
                        showDiffs[change.path] ? 'active' : ''
                      }`}
                      style={{
                        maxHeight: showDiffs[change.path] ? '1000px' : '0'
                      }}
                    >
                      {change.diff && change.diff.map((line, lineIndex) => (
                        <div
                          key={lineIndex}
                          className="diff-line p-4 text-sm font-mono whitespace-pre-wrap break-all transition-all"
                          style={{
                            borderLeft: '3px solid transparent',
                            background: line.startsWith('+') ? 'rgba(16, 185, 129, 0.1)' : undefined,
                            borderLeftColor: line.startsWith('+') ? '#10b981' : undefined
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(59, 130, 246, 0.05)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = line.startsWith('+') ? 'rgba(16, 185, 129, 0.1)' : ''
                          }}
                        >
                          {line}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'actions' && (
            <div className="tab-content">
              <h3 className="section-title text-xl font-semibold mb-6 text-white flex items-center gap-3" style={{
                position: 'relative'
              }}>
                <span style={{
                  content: '""',
                  width: '4px',
                  height: '24px',
                  background: 'linear-gradient(180deg, #3b82f6, #2563eb)',
                  borderRadius: '2px',
                  boxShadow: '0 0 12px rgba(59, 130, 246, 0.5)',
                  display: 'inline-block',
                  marginRight: '8px'
                }}></span>
                Actions Performed
              </h3>

              {actionLogs.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No actions performed yet</p>
                </div>
              ) : (
                actionLogs.map((action) => (
                  <div
                    key={action.id}
                    className="action-item flex items-center gap-4 p-4.5 mb-3 rounded-xl transition-all"
                    style={{
                      background: 'rgba(31, 41, 55, 0.4)',
                      border: '1px solid rgba(59, 130, 246, 0.2)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateX(4px)'
                      e.currentTarget.style.background = 'rgba(31, 41, 55, 0.6)'
                      e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.4)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateX(0)'
                      e.currentTarget.style.background = 'rgba(31, 41, 55, 0.4)'
                      e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.2)'
                    }}
                  >
                    <div className="text-green-400">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-medium text-white">{action.description}</div>
                      <div className="text-gray-400 text-sm mt-1">
                        {action.type === 'file_operation' && 'File operation'}
                        {action.type === 'api_call' && 'API call'}
                        {action.type === 'commit' && 'Git commit'}
                        {action.type === 'error' && 'Error'}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.3); }
        }
        @keyframes messageSlide {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}