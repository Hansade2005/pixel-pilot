"use client";

import { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import type { File as StorageFile } from '@/lib/storage-manager';
import {
  Code,
  Eye,
  Zap,
  FileText,
  Download,
  ExternalLink,
  RotateCcw,
  Play,
  Square,
  Terminal,
  Package,
  Trash2,
  Copy,
  Database,
  Edit3,
  Wand2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Workspace as Project } from "@/lib/storage-manager";
import { useIsMobile } from "@/hooks/use-mobile";
import { filterUnwantedFiles } from "@/lib/utils";
import { compress } from 'lz4js'
import { zipSync, strToU8 } from 'fflate'
import { createClient } from "@/lib/supabase/client";
import {
  WebPreview,
  WebPreviewNavigation,
  WebPreviewNavigationButton,
  WebPreviewUrl,
  WebPreviewBody,
  WebPreviewConsole,
  WebPreviewDeviceSelector,
  DEVICE_PRESETS
} from "@/components/ai-elements/web-preview";
import { DatabaseTab } from "./database-tab";
import { 
  VisualEditorWrapper,
  VisualEditorToggle,
} from "./visual-editor-wrapper";
import type { StyleChange, Theme } from "@/lib/visual-editor";

// Compress project files using LZ4 + Zip for efficient transfer
async function compressProjectFiles(
  projectFiles: any[],
  fileTree: string[],
  messagesToSend: any[],
  metadata: any
): Promise<ArrayBuffer> {
  console.log(`[Compression] Starting compression of ${projectFiles.length} files`)

  // Filter out images, videos, PDF files, scripts folders, test folders, and unwanted files to reduce payload size
  const filteredFiles = filterUnwantedFiles(projectFiles)
  console.log(`[Compression] Filtered to ${filteredFiles.length} files (removed ${projectFiles.length - filteredFiles.length} unwanted files)`)

  // Create zip file data
  const zipData: Record<string, Uint8Array> = {}

  // Add files to zip
  for (const file of filteredFiles) {
    if (file.path && file.content !== undefined) {
      zipData[file.path] = strToU8(String(file.content))
    }
  }

  // Add metadata file with file tree, messages, and other data
  const fullMetadata = {
    fileTree,
    messages: messagesToSend,
    ...metadata,
    compressedAt: new Date().toISOString(),
    fileCount: filteredFiles.length,
    originalFileCount: projectFiles.length,
    compressionType: 'lz4-zip'
  }
  zipData['__metadata__.json'] = strToU8(JSON.stringify(fullMetadata))

  // Create zip file
  const zippedData = zipSync(zipData)
  console.log(`[Compression] Created zip file: ${zippedData.length} bytes`)

  // Compress with LZ4
  const compressedData = await compress(zippedData)
  console.log(`[Compression] LZ4 compressed to: ${compressedData.length} bytes`)

  // Convert Uint8Array to ArrayBuffer
  const arrayBuffer = new ArrayBuffer(compressedData.length)
  new Uint8Array(arrayBuffer).set(compressedData)
  return arrayBuffer
}

interface CodePreviewPanelProps {
  project: Project | null;
  activeTab: "code" | "preview" | "database";
  onTabChange: (tab: "code" | "preview" | "database") => void;
  previewViewMode?: "desktop" | "mobile";
  syncedUrl?: string;
  onUrlChange?: (url: string) => void;
  onVisualEditorSave?: (changes: { elementId: string; changes: StyleChange[]; sourceFile?: string }) => Promise<boolean>;
  onApplyTheme?: (theme: Theme, cssContent: string) => Promise<boolean>;
  onTagToChat?: (component: { id: string; tagName: string; sourceFile?: string; sourceLine?: number; className: string; textContent?: string }) => void;
  onPublish?: () => void;
}

export interface CodePreviewPanelRef {
  createPreview: () => void;
  cleanupSandbox: () => void;
  openStackBlitz: () => void;
  refreshPreview: () => void;
  preview: PreviewState;
  isStackBlitzLoading: boolean;
  toggleVisualEditor: (enabled: boolean) => void;
  isVisualEditorEnabled: boolean;
}

interface PreviewState {
  sandboxId: string | null;
  url: string | null;
  isLoading: boolean;
  processId: string | null;
}

export const CodePreviewPanel = forwardRef<CodePreviewPanelRef, CodePreviewPanelProps>(
  ({ project, activeTab, onTabChange, previewViewMode = "desktop", syncedUrl, onUrlChange, onVisualEditorSave, onApplyTheme, onTagToChat, onPublish }, ref) => {
    const { toast } = useToast();
    const isMobile = useIsMobile();
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
  const [activeConsoleTab, setActiveConsoleTab] = useState<'console'>('console')
  const [consoleHeight, setConsoleHeight] = useState(300) // Default height in pixels
  const [isResizing, setIsResizing] = useState(false)
  const resizeRef = useRef<HTMLDivElement>(null)
  const [browserLogs, setBrowserLogs] = useState<string[]>([])
  const [isExpoProject, setIsExpoProject] = useState(false)
  const browserLogsRef = useRef<HTMLDivElement>(null)
  const [isStackBlitzOpen, setIsStackBlitzOpen] = useState(false)
  const [backgroundProcess, setBackgroundProcess] = useState<{
    pid: number | null
    command: string | null
    isRunning: boolean
    logInterval?: NodeJS.Timeout
  }>({ pid: null, command: null, isRunning: false })
  const [processLogs, setProcessLogs] = useState<string[]>([])
  const processLogsRef = useRef<HTMLDivElement>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  
  // Visual Editor state
  const [isVisualEditorEnabled, setIsVisualEditorEnabled] = useState(false)
  const previewIframeRef = useRef<HTMLIFrameElement | null>(null)

  // Dispatch preview state changes to parent component
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('preview-state-changed', { 
        detail: { preview } 
      }))
    }
  }, [preview])

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    createPreview,
    cleanupSandbox,
    openStackBlitz,
    refreshPreview,
    preview,
    isStackBlitzLoading: isStackBlitzOpen,
    toggleVisualEditor: setIsVisualEditorEnabled,
    isVisualEditorEnabled,
  }), [preview, isStackBlitzOpen, isVisualEditorEnabled])

  // Unified console logging function - combines all log types
  const addConsoleLog = (message: string, type: 'terminal' | 'browser' | 'process' | 'server' = 'terminal') => {
    const timestamp = new Date().toLocaleTimeString()
    const typeIcon = {
      terminal: '💻',
      browser: '🌐',
      process: '⚙️',
      server: '🚀'
    }[type]
    const typeLabel = {
      terminal: 'TERMINAL',
      browser: 'BROWSER',
      process: 'PROCESS',
      server: 'SERVER'
    }[type]

    setConsoleOutput(prev => [...prev, `[${timestamp}] ${typeIcon} [${typeLabel}] ${message}`])

    // Update currentLog with server messages when preview is loading or recently ready
    if (type === 'server' && (preview.isLoading || (preview.url && !preview.isLoading))) {
      setCurrentLog(message)
    }
  }

  // Detect if project is Expo
  useEffect(() => {
    if (!project) {
      setIsExpoProject(false)
      return
    }

    const checkExpoProject = async () => {
      try {
        const { storageManager } = await import('@/lib/storage-manager')
        const files = await storageManager.getFiles(project.id)
        // Check for app.json or app.config.js
        const hasExpoConfig = files.some((f: StorageFile) => f.path === 'app.json' || f.path === 'app.config.js')
        if (hasExpoConfig) {
          setIsExpoProject(true)
          return
        }
        // Check package.json for expo dependency
        const packageJsonFile = files.find((f: StorageFile) => f.path === 'package.json')
        if (packageJsonFile) {
          const packageJson = JSON.parse(packageJsonFile.content)
          setIsExpoProject(!!(packageJson.dependencies?.expo || packageJson.devDependencies?.expo))
        } else {
          setIsExpoProject(false)
        }
      } catch (error) {
        console.error('Error checking for Expo project:', error)
        setIsExpoProject(false)
      }
    }

    checkExpoProject()
  }, [project])

  useEffect(() => {
    if (preview.url) {
      setCustomUrl(preview.url)
      // Dispatch URL change event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('preview-url-changed', { 
          detail: { url: preview.url } 
        }))
      }
    }
  }, [preview.url])

  // Auto-scroll console to bottom when new output arrives
  useEffect(() => {
    if (consoleRef.current && isConsoleOpen) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight
    }
  }, [consoleOutput, browserLogs, processLogs, isConsoleOpen])

  // Set up iframe message listener for browser logs
  useEffect(() => {
    const handleIframeMessage = (event: MessageEvent) => {
      // Only accept messages from our preview iframe
      const iframe = document.querySelector('#preview-iframe') as HTMLIFrameElement
      if (iframe && event.source === iframe.contentWindow) {
        if (event.data.type === 'console') {
          addConsoleLog(event.data.message, 'browser')
        }
      }
    }

    window.addEventListener('message', handleIframeMessage)
    return () => window.removeEventListener('message', handleIframeMessage)
  }, [])

  // Add a listener for console interceptor injection requests
  useEffect(() => {
    const handleInterceptorRequest = (event: MessageEvent) => {
      const iframe = document.querySelector('#preview-iframe') as HTMLIFrameElement
      if (iframe && event.source === iframe.contentWindow && event.data.type === 'inject-console-interceptor') {
        try {
          // The iframe is requesting the console interceptor script
          iframe.contentWindow?.postMessage({
            type: 'console-interceptor-script',
            script: `
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
            `
          }, '*')
        } catch (error) {
          console.warn('Failed to send console interceptor script:', error)
        }
      }
    }

    window.addEventListener('message', handleInterceptorRequest)
    return () => window.removeEventListener('message', handleInterceptorRequest)
  }, [])

  // Set up keyboard shortcuts for console
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && isConsoleOpen && event.key === '1') {
        event.preventDefault()
        // Console is already the only tab, no need to change
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isConsoleOpen])

  // Inject console interceptor script into iframe when it loads
  const injectConsoleInterceptor = (iframe: HTMLIFrameElement) => {
    iframe.addEventListener('load', () => {
      try {
        // Wait a bit for the iframe to fully load
        setTimeout(() => {
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
            
            // Try multiple methods to inject the script
            try {
              // Method 1: Direct script injection
              const scriptElement = iframe.contentDocument?.createElement('script')
              if (scriptElement && iframe.contentDocument?.head) {
                scriptElement.textContent = script
                iframe.contentDocument.head.appendChild(scriptElement)
                console.log('Console interceptor injected via script element')
              } else {
                throw new Error('Cannot access iframe contentDocument')
              }
            } catch (scriptError) {
              console.warn('Script element injection failed, trying eval method:', scriptError)
              
              // Method 2: Try eval (may be blocked by sandbox)
              try {
                (iframe.contentWindow as any)?.eval(script)
                console.log('Console interceptor injected via eval')
              } catch (evalError) {
                console.warn('Eval injection failed, trying postMessage method:', evalError)
                
                // Method 3: PostMessage to iframe (requires iframe to listen)
                iframe.contentWindow?.postMessage({
                  type: 'inject-console-interceptor',
                  script: script
                }, '*')
                console.log('Console interceptor sent via postMessage')
              }
            }
          } catch (error) {
            console.warn('Failed to inject console interceptor:', error);
          }
        }, 1000) // Wait 1 second for iframe to fully load
      } catch (error) {
        console.warn('Failed to set up console interceptor:', error);
      }
    });
  };

  // Cleanup sandbox, stream, background process, log interval, and EventSource on unmount only
  useEffect(() => {
    return () => {
      if (preview.sandboxId) {
        cleanupSandbox()
      }
      // Close stream reader if it exists
      if (streamReader) {
        streamReader.cancel()
      }
      // Close EventSource if it exists
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      // Stop background process if running
      if (backgroundProcess.isRunning && backgroundProcess.pid) {
        stopBackgroundProcess()
      }
      // Clear log interval if it exists
      if (backgroundProcess.logInterval) {
        clearInterval(backgroundProcess.logInterval)
      }
    }
  }, []) // Empty dependency array - only run on unmount

  const createPreview = async () => {
    if (!project) return

    const loadingPreview = { ...preview, isLoading: true }
    setPreview(loadingPreview)
    setCurrentLog("Booting VM...")
    setConsoleOutput([]) // Clear previous console output
    
    // Dispatch preview starting event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('preview-starting', { 
        detail: { preview: loadingPreview } 
      }))
    }
    
    // Close any existing stream
    if (streamReader) {
      streamReader.cancel()
      setStreamReader(null)
    }

    try {
      // Get current user for auth information
      const supabase = createClient()
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error('Authentication required. Please sign in to create previews.')
      }

      const authUserId = user.id
      const authUsername = user.user_metadata?.full_name || user.email?.split('@')[0] || 'anonymous'
      // Fetch files from IndexedDB client-side
      const { storageManager } = await import('@/lib/storage-manager')
      await storageManager.init()
      const files = await storageManager.getFiles(project.id)
      
      if (!files || files.length === 0) {
        throw new Error('No files found in project')
      }

      // Filter out images, videos, PDF files, scripts folders, test folders, and unwanted files to reduce payload size
      const filteredFiles = filterUnwantedFiles(files)
      console.log(`[CodePreviewPanel] Filtered files for preview: ${filteredFiles.length} of ${files.length} (removed ${files.length - filteredFiles.length} unwanted files)`)

      // Compress the project files for efficient transfer
      const compressedData = await compressProjectFiles(filteredFiles, [], [], { 
        project,
        authUserId,
        authUsername,
        isProduction: false // This is a preview site, should show badge
      })

      // Create a streaming request with EventSource-like handling
      const response = await fetch('/api/preview', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/octet-stream',
          'Accept': 'text/event-stream', // Request streaming response
          'X-Compressed': 'true'
        },
        body: compressedData,
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

      // Handle streaming response with EventSource-like message handling
      const reader = response.body?.getReader()
      if (reader) {
        setStreamReader(reader)
        const decoder = new TextDecoder()

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) {
              console.log('Stream ended')
              break
            }

            const chunk = decoder.decode(value, { stream: true })
            
            // Handle Server-Sent Events format - EventSource-like parsing
            if (chunk.includes('data: ')) {
              const lines = chunk.split('\n')
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const msg = JSON.parse(line.slice(6))
                    
                    // EventSource-like message handling (exactly like the example)
                    if (msg.type === "log") {
                      setCurrentLog(msg.message)
                      addConsoleLog(msg.message, 'server')
                    }

                    if (msg.type === "error") {
                      console.error('Preview error:', msg.message)
                      setCurrentLog(`Error: ${msg.message}`)
                      addConsoleLog(`❌ ${msg.message}`, 'server')
                      // Don't break the stream - continue receiving logs
                      // Only stop loading if it's a fatal error (contains specific keywords)
                      if (msg.message.includes('failed') || msg.message.includes('ERR!') || msg.message.includes('ENOENT')) {
                        setPreview(prev => ({ ...prev, isLoading: false }))
                      }
                      // Continue processing other messages
                    }

                    if (msg.type === "ready") {
                      // Server is ready, but we'll wait for "Production server running" message
                      // before actually loading the URL in the iframe
                      addConsoleLog("✅ Server ready", 'server')
                      
                      // Store the preview data but keep loading state
                      setPreview(prev => ({
                        ...prev,
                        sandboxId: msg.sandboxId,
                        url: msg.url,
                        processId: msg.processId,
                        isLoading: true, // Keep loading until build completes
                      }))

                      // Set custom loading message for the build phase
                      setCurrentLog("🏗️ Building production bundle...")

                      // Start E2B log streaming for runtime logs
                      startE2BLogStreaming(msg.sandboxId, msg.processId)

                      // Auto-open console when server is ready
                      setIsConsoleOpen(true)

                      // For hosted previews (subdomain URLs), mark as ready immediately since no localhost server logs will appear
                      if (msg.url && !msg.url.includes('localhost')) {
                        setCurrentLog("✅ Preview ready!")
                        setPreview(prev => ({ ...prev, isLoading: false }))
                        
                        // Dispatch preview ready event for hosted URLs
                        if (typeof window !== 'undefined' && preview.sandboxId && preview.url) {
                          window.dispatchEvent(new CustomEvent('preview-ready', { 
                            detail: { preview: { 
                              sandboxId: preview.sandboxId,
                              url: preview.url,
                              processId: preview.processId,
                              isLoading: false
                            } } 
                          }))
                        }
                      }
                      // DON'T break here - keep the stream open for continuous logs
                    }

                    // Check for build completion and actual server start
                    if (msg.type === "log") {
                      // Update current log for specific build stages
                      if (msg.message.includes("vite build") || msg.message.includes("next build")) {
                        setCurrentLog("🏗️ Building production bundle...")
                      } else if (msg.message.includes("transforming")) {
                        setCurrentLog("⚙️ Transforming modules...")
                      } else if (msg.message.includes("rendering chunks") || msg.message.includes("Generating static pages")) {
                        setCurrentLog("📦 Rendering chunks...")
                      } else if (msg.message.includes("computing gzip size") || msg.message.includes("Finalizing page optimization")) {
                        setCurrentLog("🗜️ Optimizing bundle size...")
                      } else if (msg.message.includes("preview") || msg.message.includes("start")) {
                        setCurrentLog("🚀 Starting production server...")
                      } else if (msg.message.includes("next dev") || msg.message.includes("pnpm dev") || msg.message.includes("npm run dev")) {
                        setCurrentLog("🚀 Starting Next.js development server...")
                      } else if (msg.message.includes("compiled successfully") || msg.message.includes("ready")) {
                        setCurrentLog("✅ Next.js dev server ready...")
                      }
                      
                      // Vite detection - very specific
                      const isViteReady = msg.message.includes("➜ Local: http://localhost:")
                      
                      // Next.js detection - must have the dash prefix which appears when server actually starts
                      const isNextReady = (
                        msg.message.includes("- Local:") && msg.message.includes("http://localhost:") ||
                        msg.message.includes("- Network:") && msg.message.includes("http://")
                      )
                      
                      // Generic detection for custom servers
                      const isGenericReady = msg.message.includes("Production server running")
                      
                      if (isViteReady || isNextReady || isGenericReady) {
                        // Now the server is actually ready to serve content
                        setCurrentLog("✅ Preview ready!")
                        setPreview(prev => ({ ...prev, isLoading: false }))
                        
                        // Dispatch preview ready event NOW
                        if (typeof window !== 'undefined' && preview.sandboxId && preview.url) {
                          window.dispatchEvent(new CustomEvent('preview-ready', { 
                            detail: { preview: { 
                              sandboxId: preview.sandboxId,
                              url: preview.url,
                              processId: preview.processId,
                              isLoading: false
                            } } 
                          }))
                        }
                      }
                    }

                    if (msg.type === "heartbeat") {
                      // Just keep the connection alive, no need to log heartbeats
                      continue
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
          addConsoleLog("❌ Streaming error occurred", 'server')
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
      addConsoleLog(`❌ Error: ${errorMessage}`, 'server')
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

    const stoppedPreview = {
      sandboxId: null,
      url: null,
      isLoading: false,
      processId: null,
    }
    setPreview(stoppedPreview)
    setCurrentLog("Preview stopped")
    addConsoleLog("🛑 Preview stopped", 'server')
    
    // Dispatch preview stopped event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('preview-stopped', { 
        detail: { preview: stoppedPreview } 
      }))
    }
  }

  const refreshPreview = () => {
    if (preview.url && previewIframeRef.current) {
      // Force iframe reload by updating src with cache-busting param
      const iframe = previewIframeRef.current;
      const currentSrc = iframe.src;
      // Add or update timestamp to force reload
      const url = new URL(currentSrc);
      url.searchParams.set('_refresh', Date.now().toString());
      iframe.src = url.toString();
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
      
      // Filter out images, videos, PDF files, scripts folders, test folders, and unwanted files to reduce export size
      const filteredFiles = filterUnwantedFiles(files)
      console.log(`[CodePreviewPanel] Filtered files for export: ${filteredFiles.length} of ${files.length} (removed ${files.length - filteredFiles.length} unwanted files)`)
      
      // Add files to zip
      filteredFiles.forEach(file => {
        // Remove the leading slash from file path if present
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
  }

  const copyConsoleOutput = async () => {
    try {
      const consoleText = consoleOutput.join('\n')
      await navigator.clipboard.writeText(consoleText)
      toast({
        title: "Console output copied!",
        description: "The console logs have been copied to your clipboard.",
      })
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy console output to clipboard.",
        variant: "destructive",
      })
    }
  }

  // Console resize handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing) return
    
    const newHeight = window.innerHeight - e.clientY
    const minHeight = 150
    const maxHeight = window.innerHeight * 0.8
    
    if (newHeight >= minHeight && newHeight <= maxHeight) {
      setConsoleHeight(newHeight)
    }
  }

  const handleMouseUp = () => {
    setIsResizing(false)
  }

  // Add global mouse event listeners for resizing
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'ns-resize'
      document.body.style.userSelect = 'none'
    } else {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing])

  // Simple EventSource connection function - implements the example pattern
  const startEventSourceConnection = (projectId: string, files: any[]) => {
    try {
      // For now, we'll use the existing fetch-based approach but with EventSource-like handling
      // The backend already streams properly, we just need to handle it like EventSource
      addConsoleLog("Starting preview process...", 'server')
      
      // The actual streaming is handled in the createPreview function
      // This function is called after the POST request initiates the streaming
      
    } catch (error) {
      console.error('Error starting EventSource connection:', error)
      addConsoleLog(`Failed to start streaming: ${error instanceof Error ? error.message : 'Unknown error'}`, 'server')
    }
  }

  // E2B streaming function - logs are already streaming through the main SSE connection
  const startE2BLogStreaming = async (sandboxId: string, processId: string | number) => {
    try {
      addConsoleLog(`E2B sandbox ${sandboxId} is ready for log streaming`, 'server')

      // Store process info for cleanup (no polling needed - logs stream via SSE)
      setBackgroundProcess(prev => ({
        ...prev,
        pid: Number(processId),
        command: 'npm run dev',
        isRunning: true,
        // No logInterval needed - logs stream through main connection
      }))

    } catch (error) {
      console.error('Error setting up E2B log streaming:', error)
      addConsoleLog(`Failed to setup log streaming: ${error instanceof Error ? error.message : 'Unknown error'}`, 'server')
    }
  }

  // Background process management functions
  const startBackgroundProcess = async (command: string) => {
    if (backgroundProcess.isRunning) {
      addConsoleLog('A process is already running. Stop it first.', 'process')
      return
    }

    try {
      addConsoleLog(`Starting background process: ${command}`, 'process')

      // In a real implementation, this would connect to your sandbox API
      // For now, we'll simulate the process starting
      const response = await fetch('/api/background-process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, background: true }),
      })

      if (!response.ok) {
        throw new Error('Failed to start background process')
      }

      const data = await response.json()
      const pid = data.pid

      setBackgroundProcess({
        pid,
        command,
        isRunning: true
      })

      addConsoleLog(`Background process started with PID: ${pid}`, 'process')

      // Connect to the process stream
      await connectToProcess(pid)

    } catch (error) {
      console.error('Error starting background process:', error)
      addConsoleLog(`Failed to start process: ${error instanceof Error ? error.message : 'Unknown error'}`, 'process')
    }
  }

  const connectToProcess = async (pid: number) => {
    try {
      addConsoleLog(`Connecting to process stream for PID: ${pid}`, 'process')

      // Simulate connecting to process stream
      // In a real implementation, this would establish a WebSocket or SSE connection
      const response = await fetch(`/api/process-stream/${pid}`)

      if (!response.ok) {
        throw new Error('Failed to connect to process stream')
      }

      const reader = response.body?.getReader()
      if (reader) {
        const decoder = new TextDecoder()

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) {
              addConsoleLog('Process stream ended', 'process')
              break
            }

            const chunk = decoder.decode(value, { stream: true })

            // Parse the chunk as JSON (assuming server sends JSON-formatted logs)
            try {
              const logData = JSON.parse(chunk)
              if (logData.stdout) {
                addConsoleLog(logData.stdout, 'process')
              }
              if (logData.stderr) {
                addConsoleLog(logData.stderr, 'process')
              }
            } catch (parseError) {
              // If not JSON, treat as raw output
              addConsoleLog(chunk, 'process')
            }
          }
        } catch (streamError) {
          console.error('Streaming error:', streamError)
          addConsoleLog('Streaming error occurred', 'process')
        } finally {
          reader.releaseLock()
        }
      }
    } catch (error) {
      console.error('Error connecting to process:', error)
      addConsoleLog(`Failed to connect to process: ${error instanceof Error ? error.message : 'Unknown error'}`, 'process')
    }
  }

  const stopBackgroundProcess = async () => {
    if (!backgroundProcess.pid || !backgroundProcess.isRunning) {
      addConsoleLog('No process is currently running', 'server')
      return
    }

    try {
      addConsoleLog(`Stopping process with PID: ${backgroundProcess.pid}`, 'server')

      // Clear the log polling interval
      if (backgroundProcess.logInterval) {
        clearInterval(backgroundProcess.logInterval)
      }

      const response = await fetch(`/api/background-process/${backgroundProcess.pid}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to stop background process')
      }

      setBackgroundProcess({
        pid: null,
        command: null,
        isRunning: false
      })

      addConsoleLog('Background process stopped successfully', 'server')

    } catch (error) {
      console.error('Error stopping background process:', error)
      addConsoleLog(`Failed to stop process: ${error instanceof Error ? error.message : 'Unknown error'}`, 'server')
    }
  }

  const clearProcessLogs = () => {
    setProcessLogs([])
  }


  const openStackBlitz = async () => {
    if (!project) return
    if (isStackBlitzOpen) {
      console.log('StackBlitz is already being opened, ignoring duplicate request')
      return
    }

    setIsStackBlitzOpen(true)
    
    try {
      // Fetch files from IndexedDB client-side
      const { storageManager } = await import('@/lib/storage-manager')
      await storageManager.init()
      const files = await storageManager.getFiles(project.id)
      
      if (!files || files.length === 0) {
        throw new Error('No files found in project')
      }

      // Convert files to StackBlitz format
      const stackBlitzFiles: Record<string, string> = {}
      
      files.forEach(file => {
        // Remove leading slash and normalize path
        const normalizedPath = file.path.startsWith('/') ? file.path.substring(1) : file.path
        
        // Skip certain files that shouldn't be in StackBlitz
        if (normalizedPath.includes('node_modules') || 
            normalizedPath.includes('.git') ||
            normalizedPath.includes('package-lock.json') ||
            normalizedPath.includes('yarn.lock') ||
            normalizedPath.includes('pnpm-lock.yaml') ||
            normalizedPath.includes('.next') ||
            normalizedPath.includes('dist') ||
            normalizedPath.includes('build')) {
          return
        }
        
        stackBlitzFiles[normalizedPath] = file.content
      })

      // Ensure we have the required files for node template (Vite + TypeScript)
      if (!stackBlitzFiles['index.html']) {
        stackBlitzFiles['index.html'] = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${project.name || 'Vite + React + TS'}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`
      }

      if (!stackBlitzFiles['src/main.tsx']) {
        stackBlitzFiles['src/main.tsx'] = `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`
      }

      if (!stackBlitzFiles['src/App.tsx']) {
        stackBlitzFiles['src/App.tsx'] = `import React from 'react'
import './App.css'

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>🚗 ${project.name || 'Your Project'}</h1>
        <p>App generated by <strong>Pixel Builder</strong></p>
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          padding: '2rem',
          borderRadius: '10px',
          margin: '2rem 0'
        }}>
          <h2>✅ StackBlitz Preview Working!</h2>
          <p>Your Vite + TypeScript project is now running in StackBlitz</p>
          <p><strong>${Object.keys(stackBlitzFiles).length} files</strong> loaded successfully</p>
          <p>Using <strong>pnpm</strong> for fast package management</p>
          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            background: 'rgba(0,255,0,0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(0,255,0,0.3)'
          }}>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>
              🎨 <strong>Pixel Builder</strong> - AI-powered app development platform
            </p>
          </div>
        </div>
      </header>
    </div>
  )
}

export default App`
      }

      // Ensure package.json has the right structure for Vite with pnpm
      if (!stackBlitzFiles['package.json']) {
        stackBlitzFiles['package.json'] = JSON.stringify({
          name: project.name || 'vite-react-ts',
          private: true,
          version: '0.0.0',
          type: 'module',
          packageManager: 'pnpm@8.0.0',
          scripts: {
            dev: 'vite',
            build: 'tsc && vite build',
            preview: 'vite preview'
          },
          dependencies: {
            react: '^18.2.0',
            'react-dom': '^18.2.0'
          },
          devDependencies: {
            '@types/react': '^18.2.0',
            '@types/react-dom': '^18.2.0',
            '@vitejs/plugin-react': '^4.0.0',
            typescript: '^5.0.0',
            vite: '^5.0.0'
          }
        }, null, 2)
      } else {
        // Update existing package.json to use pnpm
        try {
          const existingPackage = JSON.parse(stackBlitzFiles['package.json'])
          existingPackage.packageManager = 'pnpm@8.0.0'
          stackBlitzFiles['package.json'] = JSON.stringify(existingPackage, null, 2)
        } catch (e) {
          console.warn('Could not update existing package.json for pnpm:', e)
        }
      }

      // Ensure vite.config.ts exists
      if (!stackBlitzFiles['vite.config.ts']) {
        stackBlitzFiles['vite.config.ts'] = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
})`
      }

      // Add basic CSS if missing
      if (!stackBlitzFiles['src/App.css']) {
        stackBlitzFiles['src/App.css'] = `#root {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}

.App-header {
  background-color: #282c34;
  padding: 20px;
  color: white;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: calc(10px + 2vmin);
}`
      }

      if (!stackBlitzFiles['src/index.css']) {
        stackBlitzFiles['src/index.css'] = `:root {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;
  color-scheme: light dark;
  color: rgba(255, 255, 255, 0.87);
  background-color: #242424;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  margin: 0;
  display: flex;
  place-items: center;
  min-width: 320px;
  min-height: 100vh;
}`
      }

      // Load StackBlitz SDK dynamically
      const loadStackBlitzSDK = (): Promise<any> => {
        return new Promise((resolve, reject) => {
          if (typeof window !== 'undefined' && (window as any).StackBlitzSDK) {
            console.log('StackBlitz SDK already loaded')
            resolve((window as any).StackBlitzSDK)
            return
          }

          console.log('Loading StackBlitz SDK...')
           const script = document.createElement('script')
          script.src = 'https://unpkg.com/@stackblitz/sdk@1/bundles/sdk.umd.js'
          script.onload = () => {
            console.log('StackBlitz SDK loaded successfully')
            // Give it a moment to initialize
            setTimeout(() => {
              if ((window as any).StackBlitzSDK) {
                resolve((window as any).StackBlitzSDK)
              } else {
                reject(new Error('StackBlitz SDK not found after loading'))
              }
            }, 100)
          }
          script.onerror = () => {
            console.error('Failed to load StackBlitz SDK script')
            reject(new Error('Failed to load StackBlitz SDK'))
          }
          
          document.head.appendChild(script)
        })
      }

      console.log('Starting StackBlitz project creation...')
      const StackBlitzSDK = await loadStackBlitzSDK()
      
      // Validate SDK and its methods
      if (!StackBlitzSDK) {
        throw new Error('StackBlitz SDK is not available')
      }
      
      if (typeof StackBlitzSDK.openProject !== 'function') {
        throw new Error('StackBlitz SDK openProject method is not available')
      }

      console.log('Opening StackBlitz project with', Object.keys(stackBlitzFiles).length, 'files')

      // Open StackBlitz project with node template (WebContainers)
      await StackBlitzSDK.openProject({
        title: `${project.name || 'App'} - Generated by Pixel Builder`,
        description: `AI-generated ${project.name || 'application'} built with Pixel Builder. Features ${Object.keys(stackBlitzFiles).length} files including Vite + React + TypeScript setup.`,
        template: 'node',
        files: stackBlitzFiles
      }, {
        newWindow: true,
        view: 'preview',
        theme: 'dark',
        hideDevTools: false,
        hideExplorer: false,
        terminalHeight: 20
      })
      
      toast({
        title: "StackBlitz Opened",
        description: `Opened ${Object.keys(stackBlitzFiles).length} files in StackBlitz`,
      })
    } catch (error) {
      console.error('Error opening StackBlitz:', error)
      toast({
        title: "StackBlitz Error",
        description: error instanceof Error ? error.message : "Could not open StackBlitz preview",
        variant: "destructive",
      })
    } finally {
      setIsStackBlitzOpen(false)
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
      {/* Tabs - Hidden on mobile and when in preview tab on desktop */}
      {!isMobile && activeTab !== "preview" && (
        <div className="border-b border-border bg-card">
          <div className="flex items-center justify-between px-4 py-2">
            <div className="flex space-x-1">
              {/* Desktop tabs would go here if needed */}
            </div>
          </div>
        </div>
      )}

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
        ) : activeTab === "preview" ? (
          <VisualEditorWrapper
            iframeRef={previewIframeRef}
            isEnabled={isVisualEditorEnabled}
            onToggle={setIsVisualEditorEnabled}
            onSaveChanges={onVisualEditorSave}
            projectType="nextjs"
            onApplyTheme={onApplyTheme}
            onTagToChat={onTagToChat}
            onPublish={onPublish}
            className="h-full"
          >
          <WebPreview
            className="h-full"
            defaultUrl={syncedUrl || preview.url || ""}
            defaultDevice={previewViewMode === 'mobile' ? DEVICE_PRESETS.find(d => d.name === 'iPhone 12/13') || null : null}
            onUrlChange={(url) => {
              setCustomUrl(url)
              onUrlChange?.(url)
              // Update preview state if needed
              setPreview(prev => ({ ...prev, url }))
            }}
          >
            <WebPreviewNavigation className={isExpoProject ? "fixed top-0 left-0 right-0 z-50 bg-card border-b border-border" : ""}>
              {/* Tab switching buttons - only shown in preview tab */}
              <WebPreviewNavigationButton
                onClick={() => onTabChange("code")}
                tooltip="Switch to Code View"
              >
                <Code className="h-4 w-4" />
              </WebPreviewNavigationButton>
              <WebPreviewNavigationButton
                onClick={() => onTabChange("preview")}
                disabled={true}
                tooltip="Current: Preview View"
              >
                <Eye className="h-4 w-4" />
              </WebPreviewNavigationButton>
              <WebPreviewNavigationButton
                onClick={() => onTabChange("database")}
                tooltip="Switch to Database View"
              >
                <Database className="h-4 w-4" />
              </WebPreviewNavigationButton>

              <div className="flex-1" />
              
              {/* Visual Editor Toggle */}
              <VisualEditorToggle
                isEnabled={isVisualEditorEnabled}
                onToggle={setIsVisualEditorEnabled}
              />
              
              <WebPreviewDeviceSelector />
              <WebPreviewUrl
                onRefresh={refreshPreview}
                onOpenExternal={() => {
                  if (preview.url) {
                    window.open(preview.url, '_blank')
                  }
                }}
                refreshDisabled={!preview.url}
                externalDisabled={!preview.url}
              />
              <WebPreviewNavigationButton
                onClick={createPreview}
                disabled={!project || preview.isLoading}
                tooltip="Start Preview"
              >
                <Play className="h-4 w-4" />
              </WebPreviewNavigationButton>
              {preview.sandboxId && (
                <WebPreviewNavigationButton
                  onClick={cleanupSandbox}
                  disabled={!preview.sandboxId}
                  tooltip="Stop Preview"
                >
                  <Square className="h-4 w-4" />
                </WebPreviewNavigationButton>
              )}
            </WebPreviewNavigation>

            <div className={isExpoProject ? "flex-1 min-h-0 pt-16" : "flex-1 min-h-0"}>
              {preview.isLoading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center p-8">
                    <div className="relative w-24 h-24 mx-auto mb-6">
                      <div className="absolute inset-0 rounded-full border-4 border-muted animate-ping"></div>
                      <div className="absolute inset-2 rounded-full border-4 border-primary animate-pulse"></div>
                      <div className="absolute inset-4 rounded-full border-t-4 border-accent animate-spin"></div>
                      <div className="absolute inset-8 rounded-full bg-accent animate-pulse"></div>
                    </div>
                    <h3 className="text-lg font-semibold mb-2">
                      {truncateMessage(currentLog, 40)}
                    </h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      This may take a few moments
                    </p>
                  </div>
                </div>
              ) : preview.url ? (
                isExpoProject ? (
                  <div className="h-full w-full flex items-center justify-center p-4">
                    <div className="flex items-center justify-center" style={{
                      display: 'flex',
                      zIndex: 2000,
                      marginTop: '0px',
                      marginLeft: '0px',
                      height: '100%',
                      width: '330px',
                      maxWidth: '280px',
                      minHeight: 'unset',
                      marginBottom: '0px',
                      position: 'relative',
                      padding: '0px 15px 0px 15px',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      columnGap: '0px',
                      rowGap: '0px',
                      backgroundImage: 'url(https://assets-v2.codedesign.ai/storage/v1/object/public/codedesign-templates-assets/template-asset-015194df)',
                      backgroundPosition: '50% 50%',
                      backgroundSize: 'cover',
                      backgroundRepeat: 'no-repeat',
                      backgroundAttachment: 'scroll',
                      backgroundClip: 'border-box',
                      backgroundOrigin: 'padding-box',
                      borderRadius: '30px 30px 30px 30px'
                    }}>
                      {/* Phone Screen */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        width: '100%',
                        height: '500px',
                        margin: '0px',
                        position: 'relative',
                        maxWidth: '600px',
                        maxHeight: 'none',
                        minHeight: '550px'
                      }}>
                        <WebPreviewBody
                          className="rounded-[25px]"
                          src={preview.url}
                          ref={previewIframeRef}
                          onIframeRef={(iframe) => {
                            if (iframe) {
                              injectConsoleInterceptor(iframe)
                            }
                          }}
                          style={{
                            width: '95%',
                            height: '93%',
                            borderRadius: '25px 25px 25px 25px',
                            border: 'none'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <WebPreviewBody
                    className="h-full"
                    src={preview.url}
                    ref={previewIframeRef}
                    onIframeRef={(iframe) => {
                      if (iframe) {
                        injectConsoleInterceptor(iframe)
                      }
                    }}
                  />
                )
              ) : (
                <div className="h-full flex items-center justify-center p-8">
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
                      Start Preview
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <WebPreviewConsole
              logs={consoleOutput.map((output, index) => {
                const timestamp = new Date()
                let level: "log" | "warn" | "error" = "log"
                if (output.includes('ERROR:') || output.includes('❌') || (output.includes('[SERVER]') && output.includes('stderr'))) {
                  level = "error"
                } else if (output.includes('Warning:') || output.includes('⚠️')) {
                  level = "warn"
                }
                return {
                  level,
                  message: output.replace(/^\[\d{1,2}:\d{2}:\d{2} (?:AM|PM)\] [^\s]+ \[[A-Z]+\] /, ''),
                  timestamp
                }
              })}
            />
          </WebPreview>
        </VisualEditorWrapper>
        ) : activeTab === "database" ? (
          <DatabaseTab workspaceId={project?.id || ""} />
        ) : null}
      </div>

    </div>
  )
})

CodePreviewPanel.displayName = "CodePreviewPanel"