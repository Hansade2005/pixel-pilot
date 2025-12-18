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

  // Use the repo agent hook for GitHub integration
  const {
    connectionStatus,
    repositories,
    branches,
    isLoadingConnection,
    isLoadingRepos,
    isLoadingBranches,
    isConnected,
    checkConnection,
    fetchRepositories,
    fetchBranches
  } = useRepoAgent()

  // Check connection and load repos on mount
  useEffect(() => {
    checkConnection()
  }, [checkConnection])

  // Fetch repositories when connection is established and we have a token
  useEffect(() => {
    if (isConnected && storedTokens.github && repositories.length === 0) {
      fetchRepositories()
    }
  }, [isConnected, storedTokens.github, repositories.length, fetchRepositories])

  // Fetch branches when repository is selected
  useEffect(() => {
    if (selectedRepo) {
      fetchBranches(selectedRepo)
    }
  }, [selectedRepo, fetchBranches])

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

  // Load tokens on mount
  useEffect(() => {
    loadStoredTokens()
  }, [])

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
          branch: selectedBranch
        })
      })

      if (!response.ok) {
        throw new Error('Failed to start repo agent session')
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response stream available')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)
              if (parsed.content) {
                // Add agent response
                const agentMessage: Message = {
                  id: (Date.now() + Math.random()).toString(),
                  content: parsed.content,
                  isUser: false,
                  timestamp: new Date()
                }
                setMessages(prev => [...prev, agentMessage])
              }

              // Handle tool calls and file changes
              if (parsed.toolCalls) {
                parsed.toolCalls.forEach((toolCall: any) => {
                  if (toolCall.toolName?.startsWith('github_')) {
                    // Add action log
                    const actionLog: ActionLog = {
                      id: Date.now().toString() + Math.random(),
                      type: toolCall.toolName.includes('file') ? 'file_operation' : 'api_call',
                      description: `${toolCall.toolName.replace('github_', '').replace('_', ' ')} operation`,
                      timestamp: new Date(),
                      success: toolCall.result?.success !== false
                    }
                    setActionLogs(prev => [actionLog, ...prev])

                    // Handle file changes
                    if (toolCall.toolName === 'github_write_file' && toolCall.result?.success) {
                      const fileChange: FileChange = {
                        path: toolCall.args?.path || 'unknown',
                        status: 'created',
                        additions: toolCall.result?.file?.size || 0
                      }
                      setFileChanges(prev => [fileChange, ...prev])
                    } else if (toolCall.toolName === 'github_edit_file' && toolCall.result?.success) {
                      const fileChange: FileChange = {
                        path: toolCall.args?.path || 'unknown',
                        status: 'modified',
                        additions: toolCall.result?.changes?.diff_length || 0,
                        diff: toolCall.result?.diff ? toolCall.result.diff.split('\n') : undefined
                      }
                      setFileChanges(prev => [fileChange, ...prev])
                    } else if (toolCall.toolName === 'github_delete_file' && toolCall.result?.success) {
                      const fileChange: FileChange = {
                        path: toolCall.args?.path || 'unknown',
                        status: 'deleted'
                      }
                      setFileChanges(prev => [fileChange, ...prev])
                    }
                  }
                })
              }
            } catch (parseError) {
              console.warn('Failed to parse streaming data:', parseError)
            }
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
          branch: selectedBranch
        })
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response stream available')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)
              if (parsed.content) {
                // Add agent response
                const agentMessage: Message = {
                  id: (Date.now() + Math.random()).toString(),
                  content: parsed.content,
                  isUser: false,
                  timestamp: new Date()
                }
                setMessages(prev => [...prev, agentMessage])
              }

              // Handle tool calls and file changes
              if (parsed.toolCalls) {
                parsed.toolCalls.forEach((toolCall: any) => {
                  if (toolCall.toolName?.startsWith('github_')) {
                    // Add action log
                    const actionLog: ActionLog = {
                      id: Date.now().toString() + Math.random(),
                      type: toolCall.toolName.includes('file') ? 'file_operation' : 'api_call',
                      description: `${toolCall.toolName.replace('github_', '').replace('_', ' ')} operation`,
                      timestamp: new Date(),
                      success: toolCall.result?.success !== false
                    }
                    setActionLogs(prev => [actionLog, ...prev])

                    // Handle file changes
                    if (toolCall.toolName === 'github_write_file' && toolCall.result?.success) {
                      const fileChange: FileChange = {
                        path: toolCall.args?.path || 'unknown',
                        status: 'created',
                        additions: toolCall.result?.file?.size || 0
                      }
                      setFileChanges(prev => [fileChange, ...prev])
                    } else if (toolCall.toolName === 'github_edit_file' && toolCall.result?.success) {
                      const fileChange: FileChange = {
                        path: toolCall.args?.path || 'unknown',
                        status: 'modified',
                        additions: toolCall.result?.changes?.diff_length || 0,
                        diff: toolCall.result?.diff ? toolCall.result.diff.split('\n') : undefined
                      }
                      setFileChanges(prev => [fileChange, ...prev])
                    } else if (toolCall.toolName === 'github_delete_file' && toolCall.result?.success) {
                      const fileChange: FileChange = {
                        path: toolCall.args?.path || 'unknown',
                        status: 'deleted'
                      }
                      setFileChanges(prev => [fileChange, ...prev])
                    }
                  }
                })
              }
            } catch (parseError) {
              console.warn('Failed to parse streaming data:', parseError)
            }
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
        <div className="min-h-screen bg-gray-900 text-white">
          <div className="container mx-auto px-6 py-8">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent mb-4">
                PiPilot Repo Agent
              </h1>
              <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                Connect to your GitHub repositories and let AI work directly on your code.
                Read, edit, create files, and manage your projects with intelligent automation.
              </p>
            </div>

            {/* GitHub Connection Status */}
            <Card className="mb-6 bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <div className="p-4 bg-gray-800 border border-gray-600 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Github className="h-5 w-5 text-gray-400" />
                      <span className="text-gray-300 font-medium">GitHub Connection</span>
                    </div>
                    {storedTokens.github ? (
                      <div className="flex items-center space-x-2 text-green-400">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-sm">Connected</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 text-yellow-400">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm">Not Connected</span>
                      </div>
                    )}
                  </div>
                  {!storedTokens.github && (
                    <div className="mt-2 text-sm text-gray-400">
                      <a href="/workspace/account" className="text-blue-400 hover:text-blue-300 underline">
                        Set up your GitHub token in Account Settings →
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Repository Selection */}
            {storedTokens.github && (
              <Card className="mb-6 bg-gray-800 border-gray-700">
                <CardContent className="p-6">
                  <div>
                    <Label htmlFor="existing-repo" className="flex items-center space-x-2 text-gray-300">
                      <span>Select Repository</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-4 w-4 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent className="bg-gray-700 border-gray-600 text-white">
                          <p>Choose a repository to work with</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <div className="flex space-x-2 mt-1">
                      <Select
                        value={selectedRepo}
                        onValueChange={setSelectedRepo}
                      >
                        <SelectTrigger className="flex-1 bg-gray-700 border-gray-600 text-white">
                          <SelectValue placeholder="Select a repository" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-700 border-gray-600">
                          {repositories.map((repo) => (
                            <SelectItem
                              key={repo.full_name}
                              value={repo.full_name}
                              className="text-white hover:bg-gray-600"
                            >
                              <div className="flex items-center space-x-2">
                                <span>{repo.full_name}</span>
                                {repo.private && (
                                  <Badge variant="secondary" className="text-xs">Private</Badge>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchRepositories()}
                        disabled={isLoadingRepos}
                        className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                      >
                        {isLoadingRepos ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">
                      Refresh to load your latest repositories
                    </p>
                  </div>

                  {/* Branch Selection */}
                  {selectedRepo && (
                    <div className="mt-4">
                      <Label htmlFor="branch-select" className="flex items-center space-x-2 text-gray-300">
                        <span>Select Branch</span>
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-4 w-4 text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent className="bg-gray-700 border-gray-600 text-white">
                            <p>Choose the branch to work with</p>
                          </TooltipContent>
                        </Tooltip>
                      </Label>
                      <div className="flex space-x-2 mt-1">
                        <Select
                          value={selectedBranch}
                          onValueChange={setSelectedBranch}
                        >
                          <SelectTrigger className="flex-1 bg-gray-700 border-gray-600 text-white">
                            <SelectValue placeholder="Select a branch" />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-700 border-gray-600">
                            {branches.map((branch) => (
                              <SelectItem
                                key={branch}
                                value={branch}
                                className="text-white hover:bg-gray-600"
                              >
                                {branch}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => selectedRepo && fetchBranches(selectedRepo)}
                          disabled={isLoadingBranches}
                          className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                        >
                          {isLoadingBranches ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Task Input */}
            {storedTokens.github && selectedRepo && (
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-6">
                  <div>
                    <Label htmlFor="task-input" className="flex items-center space-x-2 text-gray-300">
                      <span>Task Description</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-4 w-4 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent className="bg-gray-700 border-gray-600 text-white">
                          <p>Describe what you want the AI to do with your repository</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Textarea
                      id="task-input"
                      value={landingInput}
                      onChange={(e) => setLandingInput(e.target.value)}
                      placeholder="e.g., 'Fix the bug in the login component', 'Add a new feature to handle user authentication', 'Refactor the API routes for better performance'..."
                      rows={4}
                      className="mt-1 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                    />
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-gray-400">
                      Selected: <span className="font-medium text-gray-200">{selectedRepo}</span>
                      {selectedBranch && <span className="ml-2">({selectedBranch})</span>}
                    </div>
                    <Button
                      onClick={handleLandingSubmit}
                      disabled={!landingInput.trim() || isLandingLoading}
                      className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                    >
                      {isLandingLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Starting Task...
                        </>
                      ) : (
                        <>
                          <Zap className="h-4 w-4 mr-2" />
                          Start Repo Agent Task
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Features Overview */}
            <Card className="mt-8 bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold text-gray-200 mb-4 text-center">What Can PiPilot Repo Agent Do?</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="text-center space-y-2">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full w-fit mx-auto">
                      <Code className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h4 className="font-semibold text-gray-200">File Operations</h4>
                    <p className="text-sm text-gray-400">
                      Read, create, edit, and delete files directly in your repository
                    </p>
                  </div>

                  <div className="text-center space-y-2">
                    <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full w-fit mx-auto">
                      <GitBranch className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <h4 className="font-semibold text-gray-200">Branch Management</h4>
                    <p className="text-sm text-gray-400">
                      Create branches, switch contexts, and manage repository structure
                    </p>
                  </div>

                  <div className="text-center space-y-2">
                    <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-full w-fit mx-auto">
                      <Star className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h4 className="font-semibold text-gray-200">Code Analysis</h4>
                    <p className="text-sm text-gray-400">
                      Search code patterns, analyze dependencies, and review changes
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
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