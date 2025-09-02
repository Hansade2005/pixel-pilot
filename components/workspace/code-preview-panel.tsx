"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Code, Eye, FileText, Download, ExternalLink, RotateCcw, Play, Square } from "lucide-react"
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

  useEffect(() => {
    if (preview.url) {
      setCustomUrl(preview.url)
      console.log('[E2B] Preview URL updated:', preview.url)
    }
  }, [preview.url])

  // Cleanup sandbox on unmount
  useEffect(() => {
    return () => {
      if (preview.sandboxId) {
        cleanupSandbox()
      }
    }
  }, [preview.sandboxId])

  const createPreview = async () => {
    if (!project) return

    setPreview(prev => ({ ...prev, isLoading: true }))
    setCurrentLog("Booting VM...")
    
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
        console.log('[E2B] Received immediate JSON response:', data)
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
                      console.log('[E2B] Received sandbox data:', { sandboxId: data.sandboxId, url: data.url, processId: data.processId })
                      setPreview({
                        sandboxId: data.sandboxId,
                        url: data.url,
                        isLoading: false,
                        processId: data.processId,
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

  const cleanupSandbox = async () => {
    if (!preview.sandboxId) return

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
                  onLoad={() => console.log('[E2B] Iframe loaded successfully with URL:', preview.url)}
                  onError={(e) => console.error('[E2B] Iframe failed to load:', e, 'URL:', preview.url)}
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
          </div>
        )}
      </div>
    </div>
  )
}