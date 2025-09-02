"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Input } from "@/components/ui/input"
import { Code, Eye, FileText, Download, ExternalLink, RotateCcw, Play, Square, Zap, Server, Terminal, ChevronDown, ChevronUp, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { Workspace as Project } from "@/lib/storage-manager"
import { useIsMobile } from "@/hooks/use-mobile"

interface CodePreviewPanelProps {
  project: Project | null
  activeTab: "code" | "preview"
  onTabChange: (tab: "code" | "preview") => void
}

interface PreviewState {
  sandboxId: string | null
  url: string | null
  isLoading: boolean
  processId: string | null
  previewType: 'e2b' | 'webcontainer' | null
}

export function CodePreviewPanel({ project, activeTab, onTabChange }: CodePreviewPanelProps) {
  const { toast } = useToast()
  const isMobile = useIsMobile()
  const [preview, setPreview] = useState<PreviewState>({
    sandboxId: null,
    url: null,
    isLoading: false,
    processId: null,
    previewType: null,
  })
  const [customUrl, setCustomUrl] = useState("")
  const [currentLog, setCurrentLog] = useState("Initializing preview...")
  const [isExporting, setIsExporting] = useState(false)
  const [consoleLogs, setConsoleLogs] = useState<Array<{id: string, timestamp: Date, type: 'info' | 'error' | 'warn', message: string}>>([])
  const [isConsoleOpen, setIsConsoleOpen] = useState(false)
  const [webContainerInstance, setWebContainerInstance] = useState<any>(null)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false)
  const [isWebContainerSupported, setIsWebContainerSupported] = useState(false)

  useEffect(() => {
    if (preview.url) {
      setCustomUrl(preview.url)
    }
  }, [preview.url])

  // Check WebContainer support on mount
  useEffect(() => {
    const checkSupport = async () => {
      try {
        const { isWebContainerSupported } = await import('@/lib/webcontainer-enhanced')
        setIsWebContainerSupported(isWebContainerSupported())
      } catch (error) {
        console.warn('Failed to check WebContainer support:', error)
        setIsWebContainerSupported(false)
      }
    }
    checkSupport()
  }, [])

  // Auto-scroll console to bottom when new logs are added
  useEffect(() => {
    if (isConsoleOpen && consoleLogs.length > 0) {
      const consoleContainer = document.querySelector('#console-scroll-area')
      if (consoleContainer) {
        consoleContainer.scrollTop = consoleContainer.scrollHeight
      }
    }
  }, [consoleLogs, isConsoleOpen])

  // Auto-sync files periodically when WebContainer is running (optional)
  useEffect(() => {
    if (!autoSyncEnabled || !webContainerInstance || !project) return

    const interval = setInterval(async () => {
      try {
        // Check if files have been modified since last sync
        const { storageManager } = await import('@/lib/storage-manager')
        await storageManager.init()
        const files = await storageManager.getFiles(project.id)
        
        if (files && files.length > 0) {
          // Simple check: if we haven't synced yet or files might have changed
          const shouldSync = !lastSyncTime || (Date.now() - lastSyncTime.getTime() > 30000) // 30 seconds
          
          if (shouldSync) {
            addConsoleLog('info', '🔄 Auto-syncing files...')
            await refreshWebContainer()
          }
        }
      } catch (error) {
        console.error('Auto-sync failed:', error)
      }
    }, 30000) // Check every 30 seconds

    return () => clearInterval(interval)
  }, [autoSyncEnabled, webContainerInstance, project, lastSyncTime])

  // Cleanup sandbox on unmount
  useEffect(() => {
    return () => {
      if (preview.sandboxId) {
        cleanupSandbox()
      }
    }
  }, [preview.sandboxId])

  const addConsoleLog = (type: 'info' | 'error' | 'warn', message: string) => {
    const logEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type,
      message: message.trim()
    }
    
    setConsoleLogs(prev => {
      const newLogs = [...prev, logEntry]
      // Keep only last 100 logs to prevent memory issues
      return newLogs.slice(-100)
    })
  }

  const clearConsoleLogs = () => {
    setConsoleLogs([])
  }

  const createE2BPreview = async () => {
    if (!project) return

    setPreview(prev => ({ ...prev, isLoading: true }))
    setCurrentLog("Booting VM...")
    clearConsoleLogs() // Clear previous logs
    addConsoleLog('info', '🚀 Starting E2B preview...')
    
    try {
      // Fetch files from IndexedDB client-side
      const { storageManager } = await import('@/lib/storage-manager')
      await storageManager.init()
      const files = await storageManager.getFiles(project.id)
      
      if (!files || files.length === 0) {
        throw new Error('No files found in project')
      }

      // Create a streaming request
      const response = await fetch('/api/preview', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          projectId: project.id,
          files: files 
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to create preview')
      }

      // If we get an immediate JSON response, handle it normally
      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json()
        setPreview({
          sandboxId: data.sandboxId,
          url: data.url,
          isLoading: false,
          processId: data.processId,
          previewType: 'e2b',
        })
        setCurrentLog("Preview ready!")
        return
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value, { stream: true })
            
            // Handle Server-Sent Events format
            if (chunk.includes('data: ')) {
              const lines = chunk.split('\n')
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const data = JSON.parse(line.slice(6))
                    if (data.log) {
                      setCurrentLog(data.log)
                    }
                    if (data.error) {
                      console.error('Preview error:', data.error)
                      setCurrentLog(`Error: ${data.error}`)
                      setPreview(prev => ({ ...prev, isLoading: false }))
                      break
                    }
                    if (data.sandboxId && data.url) {
                      // Preview is ready
                      setPreview({
                        sandboxId: data.sandboxId,
                        url: data.url,
                        isLoading: false,
                        processId: data.processId,
                        previewType: 'e2b',
                      })
                      setCurrentLog("Server ready")
                    }
                  } catch (e) {
                    // Ignore parsing errors for non-JSON lines
                  }
                }
              }
            }
          }
        } catch (streamError) {
          console.error('Streaming error:', streamError)
          setCurrentLog("Streaming error occurred")
          setPreview(prev => ({ ...prev, isLoading: false }))
        } finally {
          reader.releaseLock()
        }
      }

    } catch (error) {
      console.error('Error creating preview:', error)
      setCurrentLog(`Error: ${error instanceof Error ? error.message : "Could not create preview environment"}`)
      setPreview(prev => ({ ...prev, isLoading: false }))
      toast({
        title: "Preview Failed",
        description: error instanceof Error ? error.message : "Could not create preview environment",
        variant: "destructive",
      })
    }
  }

  const createWebContainerPreview = async () => {
    if (!project) return

    setPreview(prev => ({ ...prev, isLoading: true, previewType: 'webcontainer' }))
    setCurrentLog("Initializing WebContainer...")
    clearConsoleLogs() // Clear previous logs
    addConsoleLog('info', '🚀 Starting WebContainer preview...')
    
    try {
      // Import WebContainer service
      const { createWebContainer } = await import('@/lib/webcontainer-enhanced')
      
      // Fetch files from IndexedDB client-side
      const { storageManager } = await import('@/lib/storage-manager')
      await storageManager.init()
      const files = await storageManager.getFiles(project.id)
      
      if (!files || files.length === 0) {
        throw new Error('No files found in project')
      }

      // Validate files with the API first
      setCurrentLog("Validating project files...")
      const validationResponse = await fetch('/api/preview/webcontainer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          projectId: project.id,
          files: files 
        }),
      })

      if (!validationResponse.ok) {
        const errorData = await validationResponse.json().catch(() => ({}))
        throw new Error(errorData.error || 'Files validation failed')
      }

      const validationData = await validationResponse.json()
      
      // Show warnings if any
      if (validationData.compatibility?.warnings?.length > 0) {
        console.warn('WebContainer warnings:', validationData.compatibility.warnings)
        toast({
          title: "WebContainer Warnings",
          description: validationData.compatibility.warnings[0],
          variant: "default",
        })
      }

      // Create WebContainer instance
      setCurrentLog("Creating WebContainer...")
      addConsoleLog('info', '📦 Creating WebContainer instance...')
      const webContainer = await createWebContainer()
      setWebContainerInstance(webContainer) // Store instance for cleanup
      
      // Mount files
      setCurrentLog("Mounting project files...")
      addConsoleLog('info', `📁 Mounting ${files.length} project files...`)
      await webContainer.mountFiles(files.map(f => ({
        path: f.path,
        content: f.content
      })))

      // Install dependencies
      setCurrentLog("Installing dependencies...")
      addConsoleLog('info', '📥 Installing dependencies with npm...')
      await webContainer.installDependencies({
        onOutput: (data) => {
          addConsoleLog('info', `[npm] ${data}`)
          if (data.includes('added') || data.includes('packages')) {
            setCurrentLog("Installing dependencies... " + data.split('\n')[0])
          }
        }
      })

      // Start dev server
      setCurrentLog("Starting development server...")
      addConsoleLog('info', '🚀 Starting development server...')
      const { url, port } = await webContainer.startDevServer({
        onOutput: (data) => {
          // Determine log type based on content
          const logType = data.includes('error') || data.includes('Error') || data.includes('ERROR') 
            ? 'error' 
            : data.includes('warn') || data.includes('Warning') || data.includes('WARN')
            ? 'warn'
            : 'info'
          
          addConsoleLog(logType, `[dev] ${data}`)
          
          if (data.includes('ready') || data.includes('Local:') || data.includes('localhost')) {
            setCurrentLog("Development server is ready!")
            addConsoleLog('info', `✅ Development server ready at ${url}:${port}`)
          }
        }
      })

      // Update preview state
      setPreview({
        sandboxId: webContainer.id,
        url: url,
        isLoading: false,
        processId: 'webcontainer-dev-server',
        previewType: 'webcontainer',
      })
      
      setCurrentLog("WebContainer preview ready!")
      setLastSyncTime(new Date()) // Set initial sync time
      
      toast({
        title: "WebContainer Ready",
        description: "Your app is now running in WebContainer",
      })

    } catch (error) {
      console.error('WebContainer preview error:', error)
      const errorMessage = error instanceof Error ? error.message : "Could not create WebContainer preview"
      setCurrentLog(`Error: ${errorMessage}`)
      addConsoleLog('error', `❌ WebContainer Error: ${errorMessage}`)
      setPreview(prev => ({ ...prev, isLoading: false }))
      toast({
        title: "WebContainer Failed",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const cleanupSandbox = async () => {
    if (!preview.sandboxId) return

    try {
      if (preview.previewType === 'e2b') {
        // Cleanup E2B sandbox
      await fetch('/api/preview', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sandboxId: preview.sandboxId }),
      })
      } else if (preview.previewType === 'webcontainer') {
        // Cleanup WebContainer (client-side only)
        console.log('Cleaning up WebContainer:', preview.sandboxId)
        if (webContainerInstance) {
          await webContainerInstance.terminate()
          setWebContainerInstance(null)
        }
      }
    } catch (error) {
      console.error('Error cleaning up sandbox:', error)
    }

    setPreview({
      sandboxId: null,
      url: null,
      isLoading: false,
      processId: null,
      previewType: null,
    })
    setCurrentLog("Preview stopped")
    addConsoleLog('info', '🛑 Preview stopped')
  }

  const refreshPreview = async () => {
    if (!preview.url) return

    if (preview.previewType === 'webcontainer' && webContainerInstance) {
      // Smart refresh for WebContainer - sync files and trigger HMR
      await refreshWebContainer()
    } else {
      // Standard iframe refresh for E2B
      const iframe = document.querySelector('#preview-iframe') as HTMLIFrameElement
      if (iframe) {
        iframe.src = iframe.src
        addConsoleLog('info', '🔄 Preview refreshed')
      }
    }
  }

  const refreshWebContainer = async () => {
    if (!project || !webContainerInstance) return

    try {
      addConsoleLog('info', '🔄 Syncing latest project files...')
      
      // Fetch latest files from IndexedDB
      const { storageManager } = await import('@/lib/storage-manager')
      await storageManager.init()
      const latestFiles = await storageManager.getFiles(project.id)
      
      if (!latestFiles || latestFiles.length === 0) {
        addConsoleLog('warn', '⚠️ No files found to sync')
        return
      }

      // Sync files to WebContainer
      const syncResult = await webContainerInstance.syncFiles(latestFiles.map((f: any) => ({
        path: f.path,
        content: f.content
      })))

      if (syncResult.success) {
        addConsoleLog('info', `✅ Synced ${syncResult.successCount} files successfully`)
        setLastSyncTime(new Date()) // Track sync time
        
        // Trigger hot reload
        await webContainerInstance.triggerHotReload()
        addConsoleLog('info', '🔥 Hot reload triggered - changes should appear automatically')
        
        toast({
          title: "Files Synced",
          description: `Updated ${syncResult.successCount} files in WebContainer`,
        })
      } else {
        addConsoleLog('warn', `⚠️ Some files failed to sync: ${syncResult.errorCount} errors`)
        toast({
          title: "Partial Sync",
          description: `${syncResult.successCount} files synced, ${syncResult.errorCount} failed`,
          variant: "default",
        })
      }
    } catch (error) {
      console.error('WebContainer refresh error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to sync files'
      addConsoleLog('error', `❌ Sync failed: ${errorMessage}`)
      toast({
        title: "Sync Failed",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const exportProject = async () => {
    if (!project) return

    setIsExporting(true)
    
    try {
      // Fetch files from IndexedDB client-side
      const { storageManager } = await import('@/lib/storage-manager')
      await storageManager.init()
      const files = await storageManager.getFiles(project.id)
      
      if (!files || files.length === 0) {
        throw new Error('No files found in project')
      }

      // Dynamically load JSZip from CDN
      const loadJSZip = (): Promise<any> => {
        return new Promise((resolve, reject) => {
          // Check if JSZip is already loaded
          if (typeof window !== 'undefined' && (window as any).JSZip) {
            resolve((window as any).JSZip)
            return
          }

          // Create script element
          const script = document.createElement('script')
          script.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js'
          script.onload = () => {
            resolve((window as any).JSZip)
          }
          script.onerror = () => {
            reject(new Error('Failed to load JSZip library'))
          }
          
          document.head.appendChild(script)
        })
      }

      const JSZip = await loadJSZip()
      const zip = new JSZip()
      
      // Add files to zip
      files.forEach(file => {
        // Remove the leading slash from file path if present
        const filePath = file.path.startsWith('/') ? file.path.substring(1) : file.path
        zip.file(filePath, file.content)
      })

      // Generate the zip file
      const blob = await zip.generateAsync({ type: 'blob' })
      
      // Create download link
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${project.name || 'project'}.zip`
      document.body.appendChild(a)
      a.click()
      
      // Clean up
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast({
        title: "Export Successful",
        description: "Project files have been downloaded as a ZIP archive",
      })
    } catch (error) {
      console.error('Export error:', error)
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Could not export project files",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  const sampleCode = `import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function TodoApp() {
  const [todos, setTodos] = useState([])
  const [inputValue, setInputValue] = useState('')

  const addTodo = () => {
    if (inputValue.trim()) {
      setTodos([...todos, {
        id: Date.now(),
        text: inputValue,
        completed: false
      }])
      setInputValue('')
    }
  }

  const toggleTodo = (id) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ))
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Todo App</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex space-x-2">
          <Input
            placeholder="Add a new todo..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addTodo()}
          />
          <Button onClick={addTodo}>Add</Button>
        </div>
        <div className="space-y-2">
          {todos.map(todo => (
            <div
              key={todo.id}
              className={\`flex items-center space-x-2 p-2 rounded border \${
                todo.completed ? 'bg-muted' : ''
              }\`}
            >
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => toggleTodo(todo.id)}
              />
              <span className={todo.completed ? 'line-through' : ''}>
                {todo.text}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}`

  // Helper function to truncate messages
  const truncateMessage = (message: string, maxLength: number) => {
    if (message.length <= maxLength) return message
    return message.substring(0, maxLength) + '...'
  }

  if (!project) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/20">
        <div className="text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Project Selected</h3>
          <p className="text-muted-foreground">Select a project from the sidebar to start building</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="border-b border-border bg-card">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex space-x-1">
            {isMobile && (
              <Button
                variant={activeTab === "preview" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => onTabChange("preview")}
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
            )}
          </div>
          {isMobile && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={exportProject}
              disabled={isExporting}
            >
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? 'Exporting...' : 'Export'}
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {activeTab === "code" ? (
          <ScrollArea className="h-full">
            <div className="p-4">
              <div className="bg-muted rounded-lg p-4 font-mono text-sm">
                <pre className="whitespace-pre-wrap text-muted-foreground">
                  <code>{sampleCode}</code>
                </pre>
              </div>
            </div>
          </ScrollArea>
        ) : (
          <div className="h-full bg-background flex flex-col">
            {/* Preview Top Bar */}
            <div className="flex items-center space-x-2 p-4 border-b border-border">
              <Input
                placeholder="Preview URL..."
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                className="flex-1"
                disabled={preview.isLoading}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(customUrl, '_blank')}
                disabled={!customUrl}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={refreshPreview}
                disabled={!preview.url}
                title={preview.previewType === 'webcontainer' 
                  ? 'Sync latest files and trigger hot reload' 
                  : 'Refresh preview'
                }
              >
                <RotateCcw className="h-4 w-4" />
                {preview.previewType === 'webcontainer' && (
                  <span className="ml-1 text-xs">Sync</span>
                )}
              </Button>
              {!preview.sandboxId ? (
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    onClick={createE2BPreview}
                    disabled={!project || preview.isLoading}
                    variant="outline"
                  >
                    <Server className="h-4 w-4 mr-2" />
                    {preview.isLoading && preview.previewType === 'e2b' ? 'Starting...' : 'Start E2B'}
                  </Button>
                                  <Button
                    size="sm"
                    onClick={createWebContainerPreview}
                    disabled={!project || preview.isLoading || !isWebContainerSupported}
                    title={!isWebContainerSupported 
                      ? 'WebContainer requires Cross-Origin Isolation. Please restart your dev server after the config update.' 
                      : 'Start WebContainer preview'
                    }
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    {preview.isLoading && preview.previewType === 'webcontainer' ? 'Starting...' : 'Start WebContainer'}
                    {!isWebContainerSupported && (
                      <span className="ml-1 text-xs opacity-50">(Needs restart)</span>
                    )}
                  </Button>
                </div>
              ) : (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={cleanupSandbox}
                >
                  <Square className="h-4 w-4 mr-2" />
                  Stop {preview.previewType === 'webcontainer' ? 'WebContainer' : 'E2B'}
                </Button>
              )}
            </div>

            {/* Preview Content */}
            <div className="flex-1 min-h-0">
              {preview.isLoading ? (
                <div className="text-center">
                    {/* Interactive Preview Loader */}
                    <div className="relative w-24 h-24 mx-auto mb-6">
                      {/* Outer ring */}
                      <div className="absolute inset-0 rounded-full border-4 border-muted animate-ping"></div>
                      {/* Middle ring */}
                      <div className="absolute inset-2 rounded-full border-4 border-primary animate-pulse"></div>
                      {/* Inner ring with rotation */}
                      <div className="absolute inset-4 rounded-full border-t-4 border-accent animate-spin"></div>
                      {/* Center dot */}
                      <div className="absolute inset-8 rounded-full bg-accent animate-pulse"></div>
                    </div>
                    
                    <h3 className="text-lg font-semibold mb-2">
                      {truncateMessage(currentLog, 40)}
                    </h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      This may take a few moments
                    </p>
                  </div>
              ) : preview.url ? (
                <iframe
                  id="preview-iframe"
                  src={preview.url}
                  className="w-full h-full border-none"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-downloads allow-popups"
                />
              ) : (
                <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Live Preview</h3>
                <p className="text-muted-foreground mb-4">Choose your preview environment</p>
                <div className="flex space-x-3 justify-center">
                  <Button 
                    onClick={createE2BPreview} 
                    disabled={!project || preview.isLoading}
                    className="rounded-full px-6"
                    variant="outline"
                  >
                    <Server className="h-4 w-4 mr-2" />
                    {preview.isLoading && preview.previewType === 'e2b' ? 'Starting...' : 'Start E2B'}
                  </Button>
                                  <Button 
                    onClick={createWebContainerPreview} 
                    disabled={!project || preview.isLoading || !isWebContainerSupported}
                    className="rounded-full px-6"
                    title={!isWebContainerSupported 
                      ? 'WebContainer requires Cross-Origin Isolation. Please restart your dev server after the config update.' 
                      : 'Start WebContainer preview'
                    }
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    {preview.isLoading && preview.previewType === 'webcontainer' ? 'Starting...' : 'Start WebContainer'}
                    {!isWebContainerSupported && (
                      <span className="ml-1 text-xs opacity-50">(Needs restart)</span>
                    )}
                  </Button>
                </div>
              </div>
              </div>
              )}
            </div>

            {/* Console Accordion - Show for both preview types when active */}
            {preview.previewType && (
              <div className="border-t border-border">
                <Accordion type="single" collapsible value={isConsoleOpen ? "console" : ""} onValueChange={(value) => setIsConsoleOpen(value === "console")}>
                  <AccordionItem value="console" className="border-b-0">
                    <AccordionTrigger className="px-4 py-2 hover:no-underline hover:bg-muted/50">
                      <div className="flex items-center space-x-2">
                        <Terminal className="h-4 w-4" />
                        <span className="text-sm font-medium">Console</span>
                        {consoleLogs.length > 0 && (
                          <span className="text-xs bg-muted px-2 py-1 rounded-full">
                            {consoleLogs.length}
                          </span>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-0 pb-0">
                      <div className="h-48 bg-black text-green-400 font-mono text-xs">
                        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-400">
                              {preview.previewType === 'webcontainer' ? 'WebContainer Console' : 'E2B Console'}
                            </span>
                            {lastSyncTime && (
                              <span className="text-xs text-gray-500">
                                Last sync: {lastSyncTime.toLocaleTimeString()}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            {preview.previewType === 'webcontainer' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setAutoSyncEnabled(!autoSyncEnabled)}
                                className={`h-6 px-2 text-xs ${
                                  autoSyncEnabled 
                                    ? 'text-green-400 hover:text-green-300' 
                                    : 'text-gray-400 hover:text-white'
                                }`}
                                title={autoSyncEnabled ? 'Disable auto-sync' : 'Enable auto-sync'}
                              >
                                <RefreshCw className={`h-3 w-3 mr-1 ${autoSyncEnabled ? 'animate-spin' : ''}`} />
                                Auto
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={clearConsoleLogs}
                              className="h-6 px-2 text-gray-400 hover:text-white"
                            >
                              Clear
                            </Button>
                          </div>
                        </div>
                        <ScrollArea className="h-40" id="console-scroll-area">
                          <div className="p-4 space-y-1">
                            {consoleLogs.length === 0 ? (
                              <div className="text-gray-500">No logs yet...</div>
                            ) : (
                              consoleLogs.map((log) => (
                                <div key={log.id} className="flex items-start space-x-2">
                                  <span className="text-gray-500 text-xs shrink-0">
                                    {log.timestamp.toLocaleTimeString()}
                                  </span>
                                  <span className={`text-xs ${
                                    log.type === 'error' ? 'text-red-400' :
                                    log.type === 'warn' ? 'text-yellow-400' :
                                    'text-green-400'
                                  }`}>
                                    {log.message}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        </ScrollArea>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}