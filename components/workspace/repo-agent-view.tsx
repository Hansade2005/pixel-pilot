"use client"

import React, { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from '@/lib/supabase/client'
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
  Zap
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
  const [availableBranches, setAvailableBranches] = useState<string[]>(['main', 'master', 'develop'])
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

  const { toast } = useToast()
  const supabase = createClient()

  // Use the repo agent hook for GitHub integration
  const {
    connectionStatus,
    repositories,
    isLoadingConnection,
    isLoadingRepos,
    isConnected,
    checkConnection,
    fetchRepositories
  } = useRepoAgent()

  // Check connection and load repos on mount
  useEffect(() => {
    checkConnection()
  }, [checkConnection])

  // Fetch repositories when connection is established
  useEffect(() => {
    if (isConnected && repositories.length === 0) {
      fetchRepositories()
    }
  }, [isConnected, repositories.length, fetchRepositories])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px'
    }
  }, [currentInput, landingInput])

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

    if (!isConnected) {
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
                  const actionLog: ActionLog = {
                    id: Date.now().toString() + Math.random(),
                    type: toolCall.toolName?.includes('file') ? 'file_operation' : 'api_call',
                    description: `Executing ${toolCall.toolName}`,
                    timestamp: new Date(),
                    success: true
                  }
                  setActionLogs(prev => [...prev, actionLog])
                })
              }
            } catch (e) {
              // Ignore parsing errors for now
            }
          }
        }
      }

    } catch (error) {
      console.error('Error starting repo agent:', error)
      toast({
        title: "Error",
        description: "Failed to start repo agent session. Please try again.",
        variant: "destructive"
      })
      setCurrentView('landing')
      setMessages([])
    } finally {
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
      // Get GitHub token
      const { data: userSettings } = await supabase
        .from('user_settings')
        .select('github_token')
        .eq('user_id', userId)
        .single()

      if (!userSettings?.github_token) {
        toast({
          title: "GitHub Token Required",
          description: "Please connect your GitHub account in settings to use Repo Agent.",
          variant: "destructive"
        })
        setIsLoading(false)
        return
      }

      // Call the repo agent API with full conversation history
      const response = await fetch('/api/repo-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messages.concat(userMessage).map(msg => ({
            role: msg.isUser ? 'user' : 'assistant',
            content: msg.content
          })),
          repo: selectedRepo,
          branch: selectedBranch,
          githubToken: userSettings.github_token
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
      let agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: '',
        isUser: false,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, agentMessage])

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

              // Handle text content
              if (parsed.content) {
                agentMessage.content += parsed.content
                setMessages(prev => {
                  const newMessages = [...prev]
                  const lastMessage = newMessages[newMessages.length - 1]
                  if (lastMessage.id === agentMessage.id) {
                    lastMessage.content = agentMessage.content
                  }
                  return newMessages
                })
              }

              // Handle tool call events
              if (parsed.type === 'tool-call') {
                const actionLog: ActionLog = {
                  id: Date.now().toString() + Math.random(),
                  type: 'api_call',
                  description: `Calling ${parsed.toolName}...`,
                  timestamp: new Date(),
                  success: true
                }
                setActionLogs(prev => [...prev, actionLog])
              }

              // Handle tool result events
              if (parsed.type === 'tool-result') {
                // Update the corresponding action log
                setActionLogs(prev => prev.map(log => {
                  if (log.description.startsWith(`Calling ${parsed.toolName}...`)) {
                    return {
                      ...log,
                      description: `${parsed.toolName}: ${parsed.result.success ? 'Success' : 'Failed'}`,
                      success: parsed.result.success
                    }
                  }
                  return log
                }))

                // Handle file operations
                if (parsed.toolName === 'github_write_file' && parsed.result.success) {
                  const fileChange: FileChange = {
                    path: parsed.result.path || 'unknown',
                    status: 'modified',
                    additions: parsed.result.content?.split('\n').length || 0,
                    deletions: 0
                  }
                  setFileChanges(prev => {
                    const existing = prev.find(f => f.path === fileChange.path)
                    if (existing) {
                      return prev.map(f => f.path === fileChange.path ? fileChange : f)
                    }
                    return [...prev, fileChange]
                  })
                }

                if (parsed.toolName === 'github_delete_file' && parsed.result.success) {
                  const fileChange: FileChange = {
                    path: parsed.result.path || 'unknown',
                    status: 'deleted',
                    additions: 0,
                    deletions: 1
                  }
                  setFileChanges(prev => [...prev, fileChange])
                }
              }

            } catch (e) {
              // Ignore parsing errors
            }
          }
        }
      }

    } catch (error) {
      console.error('Error sending message:', error)
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      })
    } finally {
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

    if (newWidth >= 30 && newWidth <= 70) {
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-6">
        {/* Logo */}
        <div className="mb-12">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
            Repo Agent
          </h1>
          <p className="text-slate-400 text-lg mt-4 text-center max-w-md">
            Describe your coding task or ask a question about your repository
          </p>
        </div>

        {/* Input Container */}
        <Card className="w-full max-w-4xl bg-slate-800/60 border-slate-700/50 backdrop-blur-xl shadow-2xl">
          <div className="p-6">
            {/* Repo & Branch Selector */}
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-700/30">
              <div className="flex items-center gap-3">
                <Github className="w-5 h-5 text-slate-400" />
                <Select value={selectedRepo} onValueChange={setSelectedRepo}>
                  <SelectTrigger className="w-64 bg-slate-700/50 border-slate-600/50 text-slate-200">
                    <SelectValue placeholder="Select repository" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {repositories.map(repo => (
                      <SelectItem key={repo.full_name} value={repo.full_name}>
                        {repo.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-3">
                <GitBranch className="w-4 h-4 text-slate-400" />
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger className="w-32 bg-slate-700/50 border-slate-600/50 text-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {availableBranches.map(branch => (
                      <SelectItem key={branch} value={branch}>
                        {branch}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Input Area */}
            <div className="flex items-start gap-3 mb-6">
              <span className="text-slate-400 text-lg mt-3 select-none">$</span>
              <div className="flex-1">
                <Textarea
                  ref={textareaRef}
                  value={landingInput}
                  onChange={(e) => setLandingInput(e.target.value)}
                  placeholder="Describe your coding task..."
                  className="min-h-[80px] bg-transparent border-none text-slate-200 placeholder:text-slate-500 resize-none focus:ring-0 focus:ring-offset-0 text-base leading-relaxed font-mono"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault()
                      handleLandingSubmit()
                    }
                  }}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-700/30">
              <div className="text-sm text-slate-400 flex items-center gap-4">
                <span>Press <kbd className="px-2 py-1 bg-slate-700 rounded text-xs">⌘↵</kbd> to send</span>
              </div>

              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-200">
                  <Paperclip className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-200">
                  <FileText className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-200">
                  <Settings className="w-4 h-4" />
                </Button>
                <Button
                  onClick={handleLandingSubmit}
                  disabled={!landingInput.trim() || !selectedRepo || isLandingLoading}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg"
                >
                  {isLandingLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="repo-agent-container h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex overflow-hidden">
      {/* Chat Panel */}
      <div
        className="flex flex-col bg-gradient-to-b from-slate-900 to-slate-800 border-r border-slate-700/50 shadow-2xl"
        style={{ width: `${chatWidth}%` }}
      >
        {/* Chat Header */}
        <div className="p-6 border-b border-slate-700/50 bg-gradient-to-r from-slate-800/80 to-slate-900/80 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToLanding}
                className="text-slate-400 hover:text-slate-200"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>

              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>

              <h2 className="text-xl font-semibold text-slate-200">Repo Agent</h2>
            </div>

            <div className="flex items-center gap-3">
              <Select value={selectedRepo} onValueChange={setSelectedRepo}>
                <SelectTrigger className="w-48 bg-slate-700/50 border-slate-600/50 text-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {repositories.map(repo => (
                    <SelectItem key={repo.full_name} value={repo.full_name}>
                      {repo.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="w-24 bg-slate-700/50 border-slate-600/50 text-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {availableBranches.map(branch => (
                    <SelectItem key={branch} value={branch}>
                      {branch}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={chatBodyRef}
          className="flex-1 overflow-y-auto p-6 space-y-6"
          style={{
            background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'
          }}
        >
          {messages.map(message => (
            <div
              key={message.id}
              className={`flex ${message.isUser ? 'justify-end' : 'justify-start'} max-w-[80%]`}
            >
              <div
                className={`px-6 py-4 rounded-2xl shadow-lg ${
                  message.isUser
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white ml-auto'
                    : 'bg-slate-800/60 text-slate-200 border border-slate-700/50'
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}
        </div>

        {/* Input Area */}
        <div className="p-6 bg-gradient-to-t from-slate-900/95 to-slate-800/95 backdrop-blur-xl border-t border-slate-700/50">
          <div className="flex items-end gap-3">
            <div className="flex-1 bg-slate-800/60 border border-slate-700/50 rounded-2xl overflow-hidden">
              <Textarea
                ref={textareaRef}
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                placeholder="Describe what you want to build..."
                className="min-h-[44px] bg-transparent border-none text-slate-200 placeholder:text-slate-500 resize-none focus:ring-0 focus:ring-offset-0 p-4"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
                    e.preventDefault()
                    sendMessage(currentInput)
                  }
                }}
              />
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-200">
                <Paperclip className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-200">
                <FileText className="w-5 h-5" />
              </Button>
              <Button
                onClick={() => sendMessage(currentInput)}
                disabled={!currentInput.trim() || isLoading}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between mt-3 text-sm text-slate-400">
            <span>Press <kbd className="px-2 py-1 bg-slate-700 rounded text-xs">↵</kbd> to send, <kbd className="px-2 py-1 bg-slate-700 rounded text-xs">⇧↵</kbd> for new line</span>
          </div>
        </div>
      </div>

      {/* Resizer */}
      <div
        className="w-1 bg-gradient-to-r from-slate-700/50 to-transparent cursor-col-resize hover:bg-gradient-to-r hover:from-blue-500/50 hover:to-transparent transition-all duration-200 relative"
        onMouseDown={handleMouseDown}
      >
        <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-0.5 bg-slate-600/50 opacity-0 hover:opacity-100 transition-opacity"></div>
      </div>

      {/* Sidebar */}
      <div className="flex-1 flex flex-col bg-gradient-to-b from-slate-900 to-slate-800 overflow-hidden">
        {/* Sidebar Tabs */}
        <div className="bg-gradient-to-r from-slate-800/80 to-slate-900/80 backdrop-blur-xl border-b border-slate-700/50 p-6">
          <div className="flex gap-2 bg-slate-700/30 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('changes')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'changes'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              File Changes
            </button>
            <button
              onClick={() => setActiveTab('diffs')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'diffs'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Code Diffs
            </button>
            <button
              onClick={() => setActiveTab('actions')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'actions'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Actions
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'changes' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-200 mb-6 flex items-center gap-3">
                <File className="w-5 h-5 text-blue-400" />
                Files Modified
              </h3>

              {fileChanges.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <File className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No file changes yet</p>
                </div>
              ) : (
                fileChanges.map((change, index) => (
                  <Card key={index} className="bg-slate-800/40 border-slate-700/50 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {change.status === 'created' && <Plus className="w-4 h-4 text-green-400" />}
                        {change.status === 'modified' && <File className="w-4 h-4 text-blue-400" />}
                        {change.status === 'deleted' && <Minus className="w-4 h-4 text-red-400" />}
                        <span className="text-slate-200 font-medium">{change.path}</span>
                      </div>
                      <div className="flex gap-2 text-sm">
                        {change.additions !== undefined && (
                          <Badge variant="secondary" className="bg-green-500/20 text-green-400">
                            +{change.additions}
                          </Badge>
                        )}
                        {change.deletions !== undefined && change.deletions > 0 && (
                          <Badge variant="secondary" className="bg-red-500/20 text-red-400">
                            -{change.deletions}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}

          {activeTab === 'diffs' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-200 mb-6 flex items-center gap-3">
                <Code className="w-5 h-5 text-blue-400" />
                Review Changes
              </h3>

              {fileChanges.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Code className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No diffs to review</p>
                </div>
              ) : (
                fileChanges.map((change, index) => (
                  <Card key={index} className="bg-slate-800/40 border-slate-700/50 overflow-hidden">
                    <button
                      onClick={() => toggleDiff(change.path)}
                      className="w-full p-4 bg-gradient-to-r from-slate-700/50 to-slate-800/50 hover:from-slate-600/50 hover:to-slate-700/50 transition-all flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <File className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-200 font-medium">{change.path}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1 text-xs">
                          {change.additions !== undefined && (
                            <span className="text-green-400">+{change.additions}</span>
                          )}
                          {change.deletions !== undefined && (
                            <span className="text-red-400">-{change.deletions}</span>
                          )}
                        </div>
                        {showDiffs[change.path] ? (
                          <EyeOff className="w-4 h-4 text-slate-400" />
                        ) : (
                          <Eye className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </button>

                    {showDiffs[change.path] && (
                      <div className="p-4 bg-slate-900/50 border-t border-slate-700/30">
                        <div className="font-mono text-sm space-y-1">
                          <div className="text-green-400 bg-green-500/10 p-2 rounded">
                            + def hello_world():
                          </div>
                          <div className="text-green-400 bg-green-500/10 p-2 rounded">
                            +     print("Hello, World!")
                          </div>
                          <div className="text-green-400 bg-green-500/10 p-2 rounded">
                            +     return True
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>
                ))
              )}
            </div>
          )}

          {activeTab === 'actions' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-200 mb-6 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-400" />
                Actions Performed
              </h3>

              {actionLogs.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No actions performed yet</p>
                </div>
              ) : (
                actionLogs.map((action) => (
                  <Card key={action.id} className="bg-slate-800/40 border-slate-700/50 p-4">
                    <div className="flex items-start gap-3">
                      {action.success ? (
                        <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-400 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="text-slate-200 font-medium">{action.description}</p>
                        <p className="text-slate-400 text-sm mt-1">
                          {action.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}