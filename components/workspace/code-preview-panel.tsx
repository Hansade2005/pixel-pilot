"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Code, Eye, FileText, Download, ExternalLink, RotateCcw, Play, Square, Terminal } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { Workspace as Project } from "@/lib/storage-manager"
import { useIsMobile } from "@/hooks/use-mobile"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

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
}

export function CodePreviewPanel({ project, activeTab, onTabChange }: CodePreviewPanelProps) {
  const { toast } = useToast()
  const isMobile = useIsMobile()
  const [preview, setPreview] = useState<PreviewState>({
    sandboxId: null,
    url: null,
    isLoading: false,
    processId: null,
  })
  const [customUrl, setCustomUrl] = useState("")
  const [currentLog, setCurrentLog] = useState("Initializing preview...")
  const [isExporting, setIsExporting] = useState(false)
  const [consoleOutput, setConsoleOutput] = useState<string[]>([])
  const [isConsoleOpen, setIsConsoleOpen] = useState(false)
  const [streamReader, setStreamReader] = useState<ReadableStreamDefaultReader<Uint8Array> | null>(null)
  const consoleRef = useRef<HTMLDivElement>(null)
  const [activeConsoleTab, setActiveConsoleTab] = useState<'terminal' | 'browser'>('terminal')
  const [browserLogs, setBrowserLogs] = useState<string[]>([])
  const browserLogsRef = useRef<HTMLDivElement>(null)

  // Helper function to add timestamped console output
  const addConsoleOutput = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setConsoleOutput(prev => [...prev, `[${timestamp}] ${message}`])
  }

  // Helper function to add timestamped browser logs
  const addBrowserLog = (message: string, type: 'log' | 'error' | 'warn' | 'info' = 'log') => {
    const timestamp = new Date().toLocaleTimeString()
    const typeIcon = {
      log: '📝',
      error: '❌',
      warn: '⚠️',
      info: 'ℹ️'
    }[type]
    setBrowserLogs(prev => [...prev, `[${timestamp}] ${typeIcon} ${message}`])
  }

  useEffect(() => {
    if (preview.url) {
      setCustomUrl(preview.url)
    }
  }, [preview.url])

  // Auto-scroll console to bottom when new output arrives
  useEffect(() => {
    if (consoleRef.current && isConsoleOpen && activeConsoleTab === 'terminal') {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight
    }
  }, [consoleOutput, isConsoleOpen, activeConsoleTab])

  // Auto-scroll browser logs to bottom when new output arrives
  useEffect(() => {
    if (browserLogsRef.current && isConsoleOpen && activeConsoleTab === 'browser') {
      browserLogsRef.current.scrollTop = browserLogsRef.current.scrollHeight
    }
  }, [browserLogs, isConsoleOpen, activeConsoleTab])

  // Set up iframe message listener for browser logs
  useEffect(() => {
    const handleIframeMessage = (event: MessageEvent) => {
      // Only accept messages from our preview iframe
      const iframe = document.querySelector('#preview-iframe') as HTMLIFrameElement
      if (iframe && event.source === iframe.contentWindow) {
        if (event.data.type === 'console') {
          addBrowserLog(event.data.message, event.data.level)
        }
      }
    }

    window.addEventListener('message', handleIframeMessage)
    return () => window.removeEventListener('message', handleIframeMessage)
  }, [])

  // Set up keyboard shortcuts for console tabs
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && isConsoleOpen) {
        if (event.key === '1') {
          event.preventDefault()
          setActiveConsoleTab('terminal')
        } else if (event.key === '2') {
          event.preventDefault()
          setActiveConsoleTab('browser')
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isConsoleOpen])

  // Inject console interceptor script into iframe when it loads
  const injectConsoleInterceptor = (iframe: HTMLIFrameElement) => {
    iframe.addEventListener('load', () => {
      try {
        const script = `
          (function() {
            const originalConsole = {
              log: console.log,
              error: console.error,
              warn: console.warn,
              info: console.info
            };

            // Intercept console methods
            console.log = function(...args) {
              originalConsole.log.apply(console, args);
              window.parent.postMessage({
                type: 'console',
                level: 'log',
                message: args.map(arg => 
                  typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
                ).join(' ')
              }, '*');
            };

            console.error = function(...args) {
              originalConsole.error.apply(console, args);
              window.parent.postMessage({
                type: 'console',
                level: 'error',
                message: args.map(arg => 
                  typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
                ).join(' ')
              }, '*');
            };

            console.warn = function(...args) {
              originalConsole.warn.apply(console, args);
              window.parent.postMessage({
                type: 'console',
                level: 'warn',
                message: args.map(arg => 
                  typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
                ).join(' ')
              }, '*');
            };

            console.info = function(...args) {
              originalConsole.info.apply(console, args);
              window.parent.postMessage({
                type: 'console',
                level: 'info',
                message: args.map(arg => 
                  typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
                ).join(' ')
              }, '*');
            };

            // Intercept unhandled errors
            window.addEventListener('error', function(event) {
              window.parent.postMessage({
                type: 'console',
                level: 'error',
                message: 'Unhandled Error: ' + event.message + ' at ' + event.filename + ':' + event.lineno
              }, '*');
            });

            // Intercept unhandled promise rejections
            window.addEventListener('unhandledrejection', function(event) {
              window.parent.postMessage({
                type: 'console',
                level: 'error',
                message: 'Unhandled Promise Rejection: ' + event.reason
              }, '*');
            });

            // Send initial message to confirm interceptor is loaded
            window.parent.postMessage({
              type: 'console',
              level: 'info',
              message: 'Console interceptor loaded'
            }, '*');
          })();
        `;
        
        // Use a safer method to inject the script
        const scriptElement = iframe.contentDocument?.createElement('script')
        if (scriptElement) {
          scriptElement.textContent = script
          iframe.contentDocument?.head?.appendChild(scriptElement)
        }
      } catch (error) {
        console.warn('Failed to inject console interceptor:', error);
      }
    });
  };

  // Cleanup sandbox and stream on unmount
  useEffect(() => {
    return () => {
      if (preview.sandboxId) {
        cleanupSandbox()
      }
      // Close stream reader if it exists
      if (streamReader) {
        streamReader.cancel()
      }
    }
  }, [preview.sandboxId, streamReader])

  const createPreview = async () => {
    if (!project) return

    setPreview(prev => ({ ...prev, isLoading: true }))
    setCurrentLog("Booting VM...")
    setConsoleOutput([]) // Clear previous console output
    setBrowserLogs([]) // Clear previous browser logs
    
    // Close any existing stream
    if (streamReader) {
      streamReader.cancel()
      setStreamReader(null)
    }
    
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
        })
        setCurrentLog("Preview ready!")
        return
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      if (reader) {
        setStreamReader(reader)
        const decoder = new TextDecoder()

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
                      // Add to console output for the accordion with timestamp
                      addConsoleOutput(data.log)
                    }
                    if (data.error) {
                      console.error('Preview error:', data.error)
                      setCurrentLog(`Error: ${data.error}`)
                      addConsoleOutput(`ERROR: ${data.error}`)
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
                      })
                      setCurrentLog("Server ready")
                      addConsoleOutput("✅ Server ready")
                      // Auto-open console when server is ready
                      setIsConsoleOpen(true)
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
          addConsoleOutput("❌ Streaming error occurred")
          setPreview(prev => ({ ...prev, isLoading: false }))
        } finally {
          reader.releaseLock()
          setStreamReader(null)
        }
      }

    } catch (error) {
      console.error('Error creating preview:', error)
      const errorMessage = error instanceof Error ? error.message : "Could not create preview environment"
      setCurrentLog(`Error: ${errorMessage}`)
      addConsoleOutput(`❌ Error: ${errorMessage}`)
      setPreview(prev => ({ ...prev, isLoading: false }))
      toast({
        title: "Preview Failed",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const cleanupSandbox = async () => {
    if (!preview.sandboxId) return

    // Close the stream reader if it exists
    if (streamReader) {
      streamReader.cancel()
      setStreamReader(null)
    }

    try {
      await fetch('/api/preview', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sandboxId: preview.sandboxId }),
      })
    } catch (error) {
      console.error('Error cleaning up sandbox:', error)
    }

    setPreview({
      sandboxId: null,
      url: null,
      isLoading: false,
      processId: null,
    })
    setCurrentLog("Preview stopped")
    addConsoleOutput("🛑 Preview stopped")
  }

  const refreshPreview = () => {
    if (preview.url) {
      // Force iframe reload
      const iframe = document.querySelector('#preview-iframe') as HTMLIFrameElement
      if (iframe) {
        iframe.src = iframe.src
      }
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

  const clearConsole = () => {
    setConsoleOutput([])
  }

  const clearBrowserLogs = () => {
    setBrowserLogs([])
  }

  const clearAllLogs = () => {
    setConsoleOutput([])
    setBrowserLogs([])
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
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              {!preview.sandboxId ? (
                <Button
                  size="sm"
                  onClick={createPreview}
                  disabled={!project || preview.isLoading}
                >
                  <Play className="h-4 w-4 mr-2" />
                  {preview.isLoading ? 'Starting...' : 'Start Preview'}
                </Button>
              ) : (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={cleanupSandbox}
                >
                  <Square className="h-4 w-4 mr-2" />
                  Stop
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
                  ref={(iframe) => {
                    if (iframe) {
                      injectConsoleInterceptor(iframe)
                    }
                  }}
                />
              ) : (
                <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Live Preview</h3>
                <p className="text-muted-foreground mb-4">Click "Start Preview" to see your app running</p>
                <Button 
                  onClick={createPreview} 
                  disabled={!project || preview.isLoading}
                  className="rounded-full px-6"
                >
                  <Play className="h-4 w-4 mr-2" />
                  {preview.isLoading ? 'Starting...' : 'Start Preview'}
                </Button>
              </div>
              </div>
              )}
            </div>

            {/* Console Output Accordion */}
            <div className="border-t border-border">
              <Accordion 
                type="single" 
                collapsible 
                value={isConsoleOpen ? "console" : undefined}
                onValueChange={(value) => setIsConsoleOpen(value === "console")}
              >
                <AccordionItem value="console" className="border-none">
                  <AccordionTrigger className="px-4 py-2 hover:no-underline">
                    <div className="flex items-center space-x-2">
                      <Terminal className="h-4 w-4" />
                      <span className="font-medium">Console</span>
                      {/* Total count badge */}
                      {(consoleOutput.length > 0 || browserLogs.length > 0) && (
                        <span className="ml-2 px-2 py-1 text-xs bg-primary text-primary-foreground rounded-full font-medium">
                          {consoleOutput.length + browserLogs.length}
                        </span>
                      )}
                      {/* Connection status indicator */}
                      {preview.sandboxId && (
                        <div className="flex items-center space-x-1">
                          <div className={`w-2 h-2 rounded-full ${streamReader ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                          <span className="text-xs text-muted-foreground">
                            {streamReader ? 'Live' : 'Connected'}
                          </span>
                        </div>
                      )}
                    </div>
                    {/* Show latest output when collapsed */}
                    {!isConsoleOpen && (consoleOutput.length > 0 || browserLogs.length > 0) && (
                      <div className="ml-auto text-xs text-muted-foreground max-w-48 truncate">
                        {activeConsoleTab === 'terminal' && consoleOutput.length > 0 
                          ? consoleOutput[consoleOutput.length - 1]
                          : activeConsoleTab === 'browser' && browserLogs.length > 0
                          ? browserLogs[browserLogs.length - 1]
                          : 'Console active'
                        }
                      </div>
                    )}
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    {/* Console Tabs */}
                    <div className="mb-3">
                      <div className="flex space-x-1 bg-muted rounded-lg p-1">
                        <button
                          onClick={() => setActiveConsoleTab('terminal')}
                          className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                            activeConsoleTab === 'terminal'
                              ? 'bg-background text-foreground shadow-sm'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                          title="Terminal output (Ctrl+1)"
                        >
                          <Terminal className="h-3 w-3 inline mr-1" />
                          Terminal
                          {consoleOutput.length > 0 && (
                            <span className="ml-1 px-1.5 py-0.5 text-xs bg-muted-foreground/20 rounded-full">
                              {consoleOutput.length}
                            </span>
                          )}
                        </button>
                        <button
                          onClick={() => setActiveConsoleTab('browser')}
                          className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                            activeConsoleTab === 'browser'
                              ? 'bg-background text-foreground shadow-sm'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                          title="Browser logs (Ctrl+2)"
                        >
                          <Code className="h-3 w-3 inline mr-1" />
                          Browser Logs
                          {browserLogs.length > 0 && (
                            <span className="ml-1 px-1.5 py-0.5 text-xs bg-muted-foreground/20 rounded-full">
                              {browserLogs.length}
                            </span>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Terminal Tab Content */}
                    {activeConsoleTab === 'terminal' && (
                      <div ref={consoleRef} className="bg-muted rounded-lg p-3 max-h-48 overflow-y-auto">
                        {consoleOutput.length === 0 ? (
                          <p className="text-muted-foreground text-sm">
                            Terminal output will appear here when the dev server starts...
                          </p>
                        ) : (
                          <div className="space-y-1">
                            {consoleOutput.map((output, index) => {
                              const isError = output.includes('ERROR:') || output.includes('❌')
                              const isSuccess = output.includes('✅') || output.includes('Server ready')
                              const isWarning = output.includes('Warning:')
                              
                              return (
                                <div 
                                  key={index} 
                                  className={`text-xs font-mono ${
                                    isError ? 'text-red-500' : 
                                    isSuccess ? 'text-green-500' : 
                                    isWarning ? 'text-yellow-500' : 
                                    'text-muted-foreground'
                                  }`}
                                >
                                  {output}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Browser Logs Tab Content */}
                    {activeConsoleTab === 'browser' && (
                      <div ref={browserLogsRef} className="bg-muted rounded-lg p-3 max-h-48 overflow-y-auto">
                        {browserLogs.length === 0 ? (
                          <div className="text-center py-4">
                            <Code className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                            <p className="text-muted-foreground text-sm mb-2">
                              Browser console logs will appear here
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Try adding console.log() statements in your app code
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {browserLogs.map((log, index) => {
                              const isError = log.includes('❌') || log.includes('Unhandled Error') || log.includes('Unhandled Promise')
                              const isWarning = log.includes('⚠️')
                              const isInfo = log.includes('ℹ️')
                              
                              return (
                                <div 
                                  key={index} 
                                  className={`text-xs font-mono ${
                                    isError ? 'text-red-500' : 
                                    isWarning ? 'text-yellow-500' : 
                                    isInfo ? 'text-blue-500' : 
                                    'text-muted-foreground'
                                  }`}
                                >
                                  {log}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    {(consoleOutput.length > 0 || browserLogs.length > 0) && (
                      <div className="flex justify-between items-center mt-2">
                        <div className="text-xs text-muted-foreground">
                          {activeConsoleTab === 'terminal' 
                            ? (streamReader ? 'Streaming live from dev server...' : 'Terminal output captured')
                            : 'Browser logs captured'
                          }
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={activeConsoleTab === 'terminal' ? clearConsole : clearBrowserLogs}
                            className="text-xs"
                          >
                            Clear {activeConsoleTab === 'terminal' ? 'Terminal' : 'Browser Logs'}
                          </Button>
                          {preview.sandboxId && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={clearAllLogs}
                              className="text-xs"
                            >
                              Clear All
                            </Button>
                          )}
                          {preview.sandboxId && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setIsConsoleOpen(false)}
                              className="text-xs"
                            >
                              Close Console
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}