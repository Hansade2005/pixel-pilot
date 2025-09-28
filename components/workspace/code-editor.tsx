"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Editor } from "@monaco-editor/react"
import { Button } from "@/components/ui/button"
import { FileText, Save, Settings, Maximize2, Sparkles, Send, X } from "lucide-react"
import { useTheme } from "next-themes"
import type { File } from "@/lib/storage-manager"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { chatModels, DEFAULT_CHAT_MODEL } from "@/lib/ai-models"


// Inline Chat Component
interface InlineChatProps {
  position: { top: number; left: number }
  error: string | null
  lineNumber: number | null
  onClose: () => void
  onSubmit: (message: string) => void
  onApplyFix?: (fix: string) => void
  onStartStreaming?: (message: string, startLine: number, endLine: number) => void
  isLoading: boolean
  fileContent: string
  fileName: string
  streamingResponse?: string
  selectedModel?: string
  onModelChange?: (model: string) => void
  mode?: 'inline' | 'modal' // New prop to control positioning
  conversationHistory?: Array<{
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
  }>
}

function InlineChat({ 
  position, 
  error, 
  lineNumber, 
  onClose, 
  onSubmit, 
  onApplyFix,
  onStartStreaming,
  isLoading,
  fileContent,
  fileName,
  streamingResponse,
  selectedModel = 'auto',
  onModelChange,
  mode = 'inline', // Default to inline mode
  conversationHistory = []
}: InlineChatProps) {
  const [input, setInput] = useState("")
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (inputRef.current && !streamingResponse) {
      inputRef.current.focus()
    }
  }, [streamingResponse])

  const handleSubmit = () => {
    if (input.trim()) {
      onSubmit(input.trim())
      setInput("")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  const handleApplyFix = () => {
    if (streamingResponse && onApplyFix) {
      onApplyFix(streamingResponse)
    }
  }

  return (
    <div 
      className={`fixed z-50 bg-popover border border-border rounded-lg shadow-lg ${
        mode === 'modal' ? 'w-[700px] max-w-[95vw] h-[600px] max-h-[85vh]' : 'w-96 max-w-[90vw]'
      }`}
      style={{ 
        top: position.top, 
        left: position.left,
        transform: mode === 'modal' ? 'translate(-50%, -50%)' : 'translate(-50%, -100%)'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center space-x-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">
            {mode === 'modal' ? 'AI Assistant' : 'AI Fix'}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          {onModelChange && (
            <Select value={selectedModel} onValueChange={onModelChange}>
              <SelectTrigger className="w-32 h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {chatModels.map((model) => (
                  <SelectItem key={model.id} value={model.id} className="text-xs">
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Modal Conversation Area */}
      {mode === 'modal' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Conversation History - Fixed height with scrolling */}
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-4">
              {conversationHistory.map((message, index) => (
                <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'user' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted'
                  }`}>
                    <div className="text-xs opacity-70 mb-1">
                      {message.role === 'user' ? 'You' : 'AI Assistant'}
                    </div>
                    <div className="text-sm whitespace-pre-wrap">
                      {message.content}
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Loading indicator - only show when not streaming */}
              {isLoading && !streamingResponse && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-lg p-3 bg-muted">
                    <div className="text-xs opacity-70 mb-1">AI Assistant</div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-current rounded-full animate-pulse"></div>
                      <span className="text-sm">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input Area - Fixed at bottom */}
          <div className="border-t border-border p-3 bg-background flex-shrink-0">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me to refactor this file, add features, fix issues, or rewrite entire sections..."
              className="resize-none border-none shadow-none focus-visible:ring-0 p-0 min-h-[80px]"
              disabled={isLoading}
            />
            
            <div className="flex items-center justify-between mt-3">
              <div className="text-xs text-muted-foreground">
                Press Enter to send, Shift+Enter for new line
              </div>
              <Button 
                size="sm" 
                onClick={handleSubmit}
                disabled={!input.trim() || isLoading}
                className="h-7 px-3"
              >
                <Send className="h-3 w-3 mr-1" />
                Send
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Inline Mode - Original Layout */}
      {mode === 'inline' && (
        <>
          {/* Error Context */}
          <div className="p-3 border-b border-border bg-destructive/10">
            <div className="text-xs text-muted-foreground mb-1">
              Line {lineNumber} • {fileName}
            </div>
            <div className="text-sm text-destructive font-medium">
              {error}
            </div>
          </div>

          {/* Streaming Response */}
          {streamingResponse && (
            <div className="p-3 border-b border-border">
              <div className="text-xs text-muted-foreground mb-2">AI Response:</div>
              <ScrollArea className="max-h-32">
                <pre className="text-sm font-mono bg-muted p-2 rounded whitespace-pre-wrap">
                  {streamingResponse}
                </pre>
              </ScrollArea>
              <div className="flex gap-2 mt-2">
                <Button size="sm" onClick={handleApplyFix} className="h-7 px-3">
                  Apply Fix
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => {
                    if (onStartStreaming && lineNumber) {
                      onClose()
                      const startLine = lineNumber
                      const endLine = startLine + 20 // Default range
                      onStartStreaming(streamingResponse || "Please improve this code", startLine, endLine)
                    }
                  }} 
                  className="h-7 px-3"
                >
                  Stream Inline
                </Button>
                <Button size="sm" variant="outline" onClick={() => setInput("")} className="h-7 px-3">
                  Ask Again
                </Button>
              </div>
            </div>
          )}

          {/* Input Area */}
          {!streamingResponse && (
            <div className="p-3">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe how to fix this error..."
                className="resize-none border-none shadow-none focus-visible:ring-0 p-0 min-h-[80px]"
                disabled={isLoading}
              />
              
              <div className="flex items-center justify-between mt-3">
                <div className="text-xs text-muted-foreground">
                  Press Enter to send, Esc to cancel
                </div>
                <Button 
                  size="sm" 
                  onClick={handleSubmit}
                  disabled={!input.trim() || isLoading}
                  className="h-7 px-3"
                >
                  {isLoading ? (
                    <div className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
                  ) : (
                    <Send className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

interface CodeEditorProps {
  file: File | null
  onSave?: (file: File, content: string) => void
  projectFiles?: File[] // Add project files for import resolution
}

export function CodeEditor({ file, onSave, projectFiles = [] }: CodeEditorProps) {
  const { theme } = useTheme()
  const editorRef = useRef<any>(null)
  const [content, setContent] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [showMinimap, setShowMinimap] = useState(true)
  const [fontSize, setFontSize] = useState(14)
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Inline chat state
  const [showInlineChat, setShowInlineChat] = useState(false)
  const [inlineChatPosition, setInlineChatPosition] = useState({ top: 0, left: 0 })
  const [inlineChatError, setInlineChatError] = useState<string | null>(null)
  const [inlineChatLine, setInlineChatLine] = useState<number | null>(null)
  const [inlineChatInput, setInlineChatInput] = useState("")
  const [isInlineChatLoading, setIsInlineChatLoading] = useState(false)
  // Conversation history for modal mode
  const [conversationHistory, setConversationHistory] = useState<Array<{
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
  }>>([])
  // AI Model selection state
  const [selectedModel, setSelectedModel] = useState(DEFAULT_CHAT_MODEL)
  
  // Inline streaming state
  const [isInlineStreaming, setIsInlineStreaming] = useState(false)
  const [streamingRange, setStreamingRange] = useState<{ startLine: number; endLine: number } | null>(null)
  const [streamingDecorations, setStreamingDecorations] = useState<string[]>([])
  const [streamingContent, setStreamingContent] = useState("")
  const [streamingEditMode, setStreamingEditMode] = useState<'search_replace' | 'full_file' | 'raw_code' | null>(null)
  const streamingAbortController = useRef<AbortController | null>(null)

  // Inline streaming functions
  const startInlineStreaming = (startLine: number, endLine: number) => {
    if (!editorRef.current) return

    setIsInlineStreaming(true)
    setStreamingRange({ startLine, endLine })
    setStreamingContent("")

    const editor = editorRef.current
    const monaco = (window as any).monaco

    // Create decorations for the streaming area
    const decorations = editor.deltaDecorations([], [
      {
        range: new monaco.Range(startLine, 1, endLine, 1),
        options: {
          className: 'inline-streaming-area',
          isWholeLine: true,
          linesDecorationsClassName: 'inline-streaming-line-decoration'
        }
      },
      {
        range: new monaco.Range(startLine, 1, startLine, 1),
        options: {
          className: 'inline-streaming-cursor',
          isWholeLine: false,
          inlineClassName: 'inline-streaming-cursor-line'
        }
      }
    ])

    setStreamingDecorations(decorations)
  }

  const updateInlineStreaming = (newContent: string, currentLine: number) => {
    if (!editorRef.current || !streamingRange) return

    const editor = editorRef.current
    const monaco = (window as any).monaco

    setStreamingContent(newContent)

    // Update the content in the editor
    const range = {
      startLineNumber: streamingRange.startLine,
      startColumn: 1,
      endLineNumber: streamingRange.endLine,
      endColumn: editor.getModel().getLineLength(streamingRange.endLine) + 1
    }

    editor.executeEdits('inline-streaming', [{
      range,
      text: newContent,
      forceMoveMarkers: true
    }])

    // Update cursor decoration
    const updatedDecorations = editor.deltaDecorations(streamingDecorations, [
      {
        range: new monaco.Range(streamingRange.startLine, 1, streamingRange.endLine, 1),
        options: {
          className: 'inline-streaming-area',
          isWholeLine: true,
          linesDecorationsClassName: 'inline-streaming-line-decoration'
        }
      },
      {
        range: new monaco.Range(currentLine, 1, currentLine, 1),
        options: {
          className: 'inline-streaming-cursor',
          isWholeLine: false,
          inlineClassName: 'inline-streaming-cursor-line'
        }
      }
    ])

    setStreamingDecorations(updatedDecorations)
  }

  const stopInlineStreaming = (accept: boolean = true) => {
    if (!editorRef.current) return

    const editor = editorRef.current

    // Clear decorations
    editor.deltaDecorations(streamingDecorations, [])
    setStreamingDecorations([])

    if (!accept && streamingRange) {
      // Revert changes if not accepted
      const originalContent = content
      const range = {
        startLineNumber: streamingRange.startLine,
        startColumn: 1,
        endLineNumber: streamingRange.endLine,
        endColumn: editor.getModel().getLineLength(streamingRange.endLine) + 1
      }

      editor.executeEdits('revert-streaming', [{
        range,
        text: originalContent.split('\n').slice(streamingRange.startLine - 1, streamingRange.endLine).join('\n'),
        forceMoveMarkers: true
      }])
    }

    setIsInlineStreaming(false)
    setStreamingRange(null)
    setStreamingContent("")
    setStreamingEditMode(null)

    if (streamingAbortController.current) {
      streamingAbortController.current.abort()
      streamingAbortController.current = null
    }
  }

  useEffect(() => {
    if (file) {
      setContent(file.content || "")
      setHasChanges(false)
    }
  }, [file])

  // Auto-save functionality
  useEffect(() => {
    if (hasChanges && content && file) {
      // Clear existing timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
      
      // Set new timeout for auto-save (2 seconds after last change)
      autoSaveTimeoutRef.current = setTimeout(() => {
        handleSave()
      }, 2000)
    }

    // Cleanup timeout on unmount
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [content, hasChanges, file])

  const handleContentChange = (newContent: string | undefined) => {
    if (newContent !== undefined) {
      setContent(newContent)
      setHasChanges(newContent !== (file?.content || ""))
    }
  }

  const getLanguage = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase()
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'css': 'css',
      'scss': 'scss',
      'html': 'html',
      'json': 'json',
      'md': 'markdown',
      'py': 'python',
      'yml': 'yaml',
      'yaml': 'yaml',
      'sql': 'sql',
      'cjs': 'javascript',
      'env': 'plaintext',
    }
    return languageMap[ext || ''] || 'plaintext'
  }

  const handleSave = async () => {
    if (!file || !hasChanges) return

    setIsSaving(true)
    try {
      // Import and initialize storage manager
      const { storageManager } = await import('@/lib/storage-manager')
      await storageManager.init()
      
      // Update file directly in IndexedDB
      await storageManager.updateFile(file.workspaceId, file.path, {
        content: content,
        size: content.length,
        updatedAt: new Date().toISOString()
      })
      
      console.log('File saved successfully to IndexedDB:', file.path)
      setHasChanges(false)
      
      if (onSave) {
        onSave(file, content)
      }
      
      // Show success feedback
      console.log('File content persisted to IndexedDB storage')
    } catch (error) {
      console.error("Error saving file to IndexedDB:", error)
      // Could add toast notification here for user feedback
    } finally {
      setIsSaving(false)
    }
  }

  // Inline chat functions
  const openInlineChat = (error: string, lineNumber: number, mode: 'inline' | 'modal' = 'inline') => {
    if (!editorRef.current || !file) return

    const editor = editorRef.current
    const position = editor.getPosition()
    
    // Get the editor's DOM element to calculate position
    const editorDomNode = editor.getDomNode()
    if (!editorDomNode) return

    const editorRect = editorDomNode.getBoundingClientRect()
    
    let top: number, left: number
    
    if (mode === 'modal') {
      // Center the modal in the editor
      top = editorRect.top + editorRect.height / 2
      left = editorRect.left + editorRect.width / 2
    } else {
      // Position above the current line (for inline fixes)
      const lineHeight = editor.getOption(61) // EditorOption.lineHeight = 61
      top = editorRect.top + (lineNumber - 1) * lineHeight
      left = editorRect.left + editorRect.width / 2
    }

    setInlineChatPosition({ top, left })
    setInlineChatError(error)
    setInlineChatLine(mode === 'inline' ? lineNumber : null)
    setShowInlineChat(true)
    setInlineChatInput("")
    setIsInlineChatLoading(false)
  }

  const closeInlineChat = () => {
    setShowInlineChat(false)
    setInlineChatError(null)
    setInlineChatLine(null)
    setInlineChatInput("")
    setIsInlineChatLoading(false)
    // Clear conversation history when closing modal
    setConversationHistory([])
  }

  const handleApplyFix = (fix: string) => {
    if (!editorRef.current || !inlineChatLine) return

    const editor = editorRef.current
    const model = editor.getModel()
    if (model) {
      // Try to intelligently apply the fix
      // For now, replace the current line or insert at cursor
      const position = editor.getPosition()
      const lineNumber = position?.lineNumber || inlineChatLine
      
      const range = {
        startLineNumber: lineNumber,
        startColumn: 1,
        endLineNumber: lineNumber,
        endColumn: model.getLineLength(lineNumber) + 1
      }
      
      editor.executeEdits('ai-fix', [{
        range,
        text: fix.trim(),
        forceMoveMarkers: true
      }])

      // Close the inline chat after applying
      closeInlineChat()
    }
  }

  const handleInlineStreaming = async (message: string, startLine: number, endLine: number) => {
    if (!file || !editorRef.current) return

    // Start streaming mode
    startInlineStreaming(startLine, endLine)

    // Create abort controller
    streamingAbortController.current = new AbortController()

    try {
      // Prepare context for AI
      const context = {
        error: null,
        lineNumber: startLine,
        fileName: file.name,
        fileContent: content,
        userMessage: message,
        projectFiles: projectFiles?.map(f => ({ name: f.name, path: f.path })) || []
      }

      // Call AI service with streaming
      const response = await fetch('/api/ai-fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...context,
          modelId: selectedModel,
          mode: 'streaming' // Enable streaming mode for pure code output
        }),
        signal: streamingAbortController.current.signal
      })

      if (!response.ok) {
        throw new Error('Failed to get AI fix')
      }

      // Handle streaming response with intelligent parsing
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let accumulatedResponse = ''
      let editMode: 'search_replace' | 'full_file' | 'raw_code' | null = null
      let searchText = ''
      let replaceText = ''
      let fullFileContent = ''
      let rawCodeContent = ''
      let parsingComplete = false

      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value, { stream: true })
            accumulatedResponse += chunk

            // Determine edit mode from accumulated response
            if (!editMode) {
              if (accumulatedResponse.includes('SEARCH_REPLACE')) {
                editMode = 'search_replace'
                setStreamingEditMode('search_replace')
              } else if (accumulatedResponse.includes('FULL_FILE')) {
                editMode = 'full_file'
                setStreamingEditMode('full_file')
              } else if (accumulatedResponse.length > 50) {
                // Fallback to raw code mode if no specific format detected
                editMode = 'raw_code'
                setStreamingEditMode('raw_code')
              }
            }

            // Process based on detected mode
            if (editMode === 'search_replace' && !parsingComplete) {
              // Parse SEARCH_REPLACE format with more robust regex
              const searchReplacePattern = /SEARCH_REPLACE\s+SEARCH:\s*([\s\S]*?)\s*REPLACE:\s*([\s\S]*?)\s*END_SEARCH_REPLACE/
              const match = accumulatedResponse.match(searchReplacePattern)

              if (match) {
                searchText = match[1].trim()
                replaceText = match[2].trim()
                parsingComplete = true

                // Apply search-replace
                const editor = editorRef.current
                const model = editor.getModel()
                const fullText = model.getValue()

                // Try exact match first, then fuzzy match
                let success = false
                if (fullText.includes(searchText)) {
                  const newText = fullText.replace(searchText, replaceText)
                  const range = model.getFullModelRange()

                  editor.executeEdits('ai-search-replace', [{
                    range,
                    text: newText,
                    forceMoveMarkers: true
                  }])
                  success = true
                }

                if (success) {
                  stopInlineStreaming(true)
                  return
                }
              }
            } else if (editMode === 'full_file' && !parsingComplete) {
              // Parse FULL_FILE format
              const fullFilePattern = /FULL_FILE\s+([\s\S]*?)\s*END_FULL_FILE/
              const match = accumulatedResponse.match(fullFilePattern)

              if (match) {
                fullFileContent = match[1].trim()
                parsingComplete = true

                // Apply full file replacement
                const editor = editorRef.current
                const model = editor.getModel()
                const range = model.getFullModelRange()

                editor.executeEdits('ai-full-file', [{
                  range,
                  text: fullFileContent,
                  forceMoveMarkers: true
                }])

                stopInlineStreaming(true)
                return
              }
            } else if (editMode === 'raw_code') {
              // Fallback: treat as raw code replacement
              rawCodeContent = accumulatedResponse.trim()

              // For raw code, replace the selected range or current line area
              const editor = editorRef.current
              const model = editor.getModel()
              const range = {
                startLineNumber: startLine,
                startColumn: 1,
                endLineNumber: endLine,
                endColumn: model.getLineLength(endLine) + 1
              }

              editor.executeEdits('ai-raw-code', [{
                range,
                text: rawCodeContent,
                forceMoveMarkers: true
              }])

              stopInlineStreaming(true)
              return
            }

            // Update visual progress
            const lines = accumulatedResponse.split('\n')
            const currentLine = startLine + Math.max(0, lines.length - 1)
            updateInlineStreaming(accumulatedResponse, Math.min(currentLine, endLine))
          }
        } finally {
          reader.releaseLock()
        }
      }

      // If we get here without completing, apply whatever we have
      if (accumulatedResponse.trim() && !parsingComplete) {
        const editor = editorRef.current
        const model = editor.getModel()
        const range = {
          startLineNumber: startLine,
          startColumn: 1,
          endLineNumber: endLine,
          endColumn: model.getLineLength(endLine) + 1
        }

        editor.executeEdits('ai-fallback', [{
          range,
          text: accumulatedResponse.trim(),
          forceMoveMarkers: true
        }])
      }

      stopInlineStreaming(true)

      // Streaming complete - keep the changes
      stopInlineStreaming(true)

    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Error during inline streaming:', error)
        stopInlineStreaming(false) // Revert changes on error
      }
    }
  }

  const handleInlineChatSubmit = async (message: string) => {
    if (!file || !editorRef.current) return

    setIsInlineChatLoading(true)
    setInlineChatInput("")

    // Add user message to conversation history if in modal mode
    const isModalMode = !inlineChatLine
    if (isModalMode) {
      setConversationHistory(prev => [...prev, {
        role: 'user',
        content: message,
        timestamp: new Date()
      }])
    }

    // Check if user wants full file rewrite
    const isFullFileRewrite = message.toLowerCase().includes('rewrite') || 
                             message.toLowerCase().includes('refactor entire') ||
                             message.toLowerCase().includes('rewrite the whole') ||
                             message.toLowerCase().includes('complete rewrite')

    if (isFullFileRewrite) {
      // Trigger full file streaming
      const editor = editorRef.current
      const model = editor.getModel()
      const totalLines = model.getLineCount()
      
      await handleInlineStreaming(message, 1, totalLines)
      setIsInlineChatLoading(false)
      return
    }

    try {
      // Prepare context for AI
      const context = {
        error: inlineChatError,
        lineNumber: inlineChatLine,
        fileName: file.name,
        fileContent: content,
        userMessage: message,
        projectFiles: projectFiles?.map(f => ({ name: f.name, path: f.path })) || []
      }

      // Call AI service with streaming
      const response = await fetch('/api/ai-fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...context,
          modelId: selectedModel,
          mode: 'chat' // Chat mode for structured responses with explanations
        })
      })

      if (!response.ok) {
        throw new Error('Failed to get AI fix')
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let accumulatedResponse = ''

      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value, { stream: true })
            accumulatedResponse += chunk

            // Update the inline chat with streaming content
            setInlineChatInput(accumulatedResponse)
          }
        } finally {
          reader.releaseLock()
        }
      }

      // After streaming is complete, provide options to apply the fix
      if (accumulatedResponse.trim()) {
        // Store the fix for potential application
        setInlineChatInput(accumulatedResponse)

        // Add AI response to conversation history if in modal mode
        if (isModalMode) {
          setConversationHistory(prev => [...prev, {
            role: 'assistant',
            content: accumulatedResponse.trim(),
            timestamp: new Date()
          }])
          // Clear the streaming response to avoid duplication
          setInlineChatInput("")
        }

        // Optionally auto-apply simple fixes or show apply button
        // For now, we'll show the suggestion and let user decide
      }

    } catch (error) {
      console.error('Error getting AI fix:', error)
      const errorMessage = `Error: ${error instanceof Error ? error.message : 'Failed to get AI suggestion'}`
      setInlineChatInput(errorMessage)
      
      // Add error message to conversation history if in modal mode
      if (isModalMode) {
        setConversationHistory(prev => [...prev, {
          role: 'assistant',
          content: errorMessage,
          timestamp: new Date()
        }])
        // Clear the streaming response to avoid duplication
        setInlineChatInput("")
      }
    } finally {
      setIsInlineChatLoading(false)
    }
  }

  if (!file) {
    return (
      <div className="h-full flex items-center justify-center bg-muted/20">
        <div className="text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No File Selected</h3>
          <p className="text-muted-foreground">Select a file from the explorer to start editing</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Inline Streaming Styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .inline-streaming-area {
            background-color: rgba(59, 130, 246, 0.1) !important;
            border-left: 3px solid #3b82f6 !important;
          }
          
          .inline-streaming-line-decoration {
            background: linear-gradient(90deg, 
              rgba(59, 130, 246, 0.2) 0%, 
              rgba(59, 130, 246, 0.1) 50%, 
              transparent 100%
            ) !important;
          }
          
          .inline-streaming-cursor {
            position: relative !important;
          }
          
          .inline-streaming-cursor-line {
            background: linear-gradient(90deg, 
              #3b82f6 0%, 
              #60a5fa 50%, 
              #93c5fd 100%
            ) !important;
            animation: streaming-pulse 1.5s ease-in-out infinite !important;
            border-radius: 2px !important;
            opacity: 0.8 !important;
          }
          
          @keyframes streaming-pulse {
            0%, 100% {
              opacity: 0.6;
              transform: scaleY(1);
            }
            50% {
              opacity: 1;
              transform: scaleY(1.2);
            }
          }
          
          .inline-streaming-cursor::before {
            content: '';
            position: absolute;
            left: -2px;
            top: 0;
            bottom: 0;
            width: 2px;
            background: #3b82f6;
            animation: streaming-cursor 1s ease-in-out infinite;
            z-index: 10;
          }
          
          @keyframes streaming-cursor {
            0%, 100% {
              opacity: 0;
            }
            50% {
              opacity: 1;
            }
          }
        `
      }} />
      {/* Editor Header */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center space-x-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{file.name}</span>
          {hasChanges && <div className="w-2 h-2 bg-accent rounded-full" />}
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowMinimap(!showMinimap)}
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setFontSize(fontSize === 14 ? 16 : 14)}
          >
            {fontSize}px
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              openInlineChat("AI Code Assistant - Ask me anything about this file or request changes", 1, 'modal')
            }}
            title="AI Assistant (Ctrl+Shift+I)"
          >
            <Sparkles className="h-4 w-4" />
          </Button>
          {isInlineStreaming && (
            <div className="flex items-center space-x-2 px-2 py-1 bg-blue-100 dark:bg-blue-900 rounded-md">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-blue-700 dark:text-blue-300">
                AI Streaming
                {streamingEditMode === 'search_replace' && ' (Targeted Edit)'}
                {streamingEditMode === 'full_file' && ' (Full File)'}
                {streamingEditMode === 'raw_code' && ' (Code Replacement)'}
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => stopInlineStreaming(true)}
                className="h-5 w-5 p-0 text-green-600 hover:text-green-700"
                title="Accept (Ctrl+Shift+S)"
              >
                ✓
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => stopInlineStreaming(false)}
                className="h-5 w-5 p-0 text-red-600 hover:text-red-700"
                title="Reject (Escape)"
              >
                ✕
              </Button>
            </div>
          )}
          <Button size="sm" onClick={handleSave} disabled={!hasChanges || isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Monaco Editor Container with Fixed Height */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <Editor
          height="100%"
          language={getLanguage(file.name)}
          value={content}
          onChange={handleContentChange}
          theme="vs-dark"
          onMount={(editor, monaco) => {
            editorRef.current = editor
            
            // Configure Monaco to work with our project structure
            monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
              noSemanticValidation: false, // Enable semantic validation for local files
              noSyntaxValidation: false,
              noSuggestionDiagnostics: false,
            })
            
            monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
              noSemanticValidation: false, // Enable semantic validation for local files
              noSyntaxValidation: false,
              noSuggestionDiagnostics: false,
            })
            
            // Set compiler options to match our tsconfig.json and enable local file resolution
            const compilerOptions = {
              target: monaco.languages.typescript.ScriptTarget.ES2020,
              module: monaco.languages.typescript.ModuleKind.ESNext,
              moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
              allowJs: true,
              checkJs: false,
              strict: true,
              esModuleInterop: true,
              skipLibCheck: true,
              forceConsistentCasingInFileNames: true,
              resolveJsonModule: true,
              isolatedModules: true,
              noEmit: true,
              jsx: monaco.languages.typescript.JsxEmit.Preserve,
              // Path mapping to match our tsconfig.json
              baseUrl: '.',
              paths: {
                '@/*': ['./*']
              },
              // Enable import resolution for local files
              allowNonTsExtensions: false,
              noResolve: false,
              // Improve error reporting
              noImplicitAny: false,
              noImplicitReturns: false,
              noImplicitThis: false,
              noUnusedLocals: false,
              noUnusedParameters: false,
              // Enable better import suggestions
              includeCompletionsForImportStatements: true,
              includeCompletionsWithInsertText: true,
            }
            
            monaco.languages.typescript.typescriptDefaults.setCompilerOptions(compilerOptions)
            monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
              ...compilerOptions,
              checkJs: false,
            })
            
            // Function to extract exports from a file
            const extractExports = (content: string, filePath: string): string[] => {
              const exports: string[] = []
              
              // Match export statements
              const exportPatterns = [
                // export const/let/var/function
                /export\s+(?:const|let|var|function|class|interface|type|enum)\s+(\w+)/g,
                // export { ... }
                /export\s*{\s*([^}]+)\s*}/g,
                // export default
                /export\s+default\s+(?:\w+\s+)?(\w+)/g,
                // export * from
                /export\s+\*\s+from\s+['"]([^'"]+)['"]/g,
              ]
              
              exportPatterns.forEach(pattern => {
                let match
                while ((match = pattern.exec(content)) !== null) {
                  if (pattern.source.includes('export {')) {
                    // Handle named exports
                    const namedExports = match[1].split(',').map(exp => exp.trim().split(' as ')[0].trim())
                    exports.push(...namedExports)
                  } else if (pattern.source.includes('export default')) {
                    exports.push('default')
                  } else if (pattern.source.includes('export * from')) {
                    // For re-exports, we could potentially resolve them, but for now skip
                  } else {
                    // Regular exports
                    exports.push(match[1])
                  }
                }
              })
              
              return [...new Set(exports)] // Remove duplicates
            }
            
            // Add keyboard shortcuts for AI features
            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyI, () => {
              const position = editor.getPosition()
              if (position) {
                openInlineChat("AI Code Assistant", position.lineNumber)
              }
            })

            // Add keyboard shortcut for inline streaming (Ctrl+Shift+S)
            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyS, () => {
              const position = editor.getPosition()
              if (position && !isInlineStreaming) {
                const selection = editor.getSelection()
                const startLine = selection?.startLineNumber || position.lineNumber
                const endLine = selection?.endLineNumber || position.lineNumber + 10 // Default range
                handleInlineStreaming("Please improve this code", startLine, endLine)
              } else if (isInlineStreaming) {
                stopInlineStreaming(true) // Accept changes
              }
            })

            // Add keyboard shortcut to reject streaming (Escape during streaming)
            editor.addCommand(monaco.KeyCode.Escape, () => {
              if (isInlineStreaming) {
                stopInlineStreaming(false) // Reject changes
              } else if (showInlineChat) {
                closeInlineChat()
              }
            })
            
            // Set up workspace configuration for better import resolution
            // Add project files as extra libraries for Monaco to understand exports
            const extraLibs: { content: string; filePath: string }[] = []

            projectFiles.forEach(file => {
              if (file.path.endsWith('.ts') || file.path.endsWith('.tsx') || file.path.endsWith('.js') || file.path.endsWith('.jsx') || file.path.endsWith('.d.ts')) {
                const normalizedPath = file.path.startsWith('/') ? file.path.slice(1) : file.path
                extraLibs.push({
                  content: file.content,
                  filePath: normalizedPath
                })
              }
            })

            monaco.languages.typescript.typescriptDefaults.setExtraLibs(extraLibs)
            monaco.languages.typescript.javascriptDefaults.setExtraLibs(extraLibs)
            const filterMarkers = (markers: any[]) => {
              return markers.filter(marker => {
                const message = marker.message.toLowerCase()
                
                // Keep syntax errors
                const syntaxErrorPatterns = [
                  'unexpected token',
                  'expected',
                  'missing',
                  'unterminated',
                  'unexpected end of input',
                  'invalid character',
                  'malformed',
                  'cannot find name', // Keep for undefined variables
                  'property does not exist', // Keep for property access issues
                ]
                
                // Remove npm/module resolution errors
                const moduleErrorPatterns = [
                  'cannot find module',
                  'unable to resolve module',
                  'module not found',
                  'cannot resolve module',
                ]
                
                // Keep syntax errors
                if (syntaxErrorPatterns.some(pattern => message.includes(pattern))) {
                  return true
                }
                
                // Remove module resolution errors
                if (moduleErrorPatterns.some(pattern => message.includes(pattern))) {
                  return false
                }
                
                // Keep other errors that aren't module-related
                return !message.includes('import') || message.includes('from')
              })
            }
            
            // Apply marker filtering
            const applyFilteredMarkers = () => {
              const model = editor.getModel()
              if (model) {
                const allMarkers = monaco.editor.getModelMarkers({ resource: model.uri })
                const filteredMarkers = filterMarkers(allMarkers)
                
                monaco.editor.setModelMarkers(model, 'typescript', filteredMarkers.filter(m => m.source === 'ts'))
                monaco.editor.setModelMarkers(model, 'javascript', filteredMarkers.filter(m => m.source === 'js'))
              }
            }
            
            // Apply filtering immediately and on content changes
            applyFilteredMarkers()
            
            editor.onDidChangeModelContent(() => {
              setTimeout(applyFilteredMarkers, 300) // Allow time for TypeScript to analyze
            })
            
            // Set up better IntelliSense for imports
            monaco.languages.registerCompletionItemProvider('typescript', {
              provideCompletionItems: (model, position) => {
                const word = model.getWordUntilPosition(position)
                const range = {
                  startLineNumber: position.lineNumber,
                  endLineNumber: position.lineNumber,
                  startColumn: word.startColumn,
                  endColumn: word.endColumn,
                }
                
                // Check if we're in an import statement
                const lineContent = model.getLineContent(position.lineNumber)
                const isInImport = lineContent.includes('import') && 
                  (lineContent.includes('from') || lineContent.includes('{'))
                
                if (isInImport) {
                  // Provide export-based completions
                  const suggestions = projectFiles
                    .filter(file => file.path.endsWith('.ts') || file.path.endsWith('.tsx') || file.path.endsWith('.js') || file.path.endsWith('.jsx') || file.path.endsWith('.d.ts'))
                    .flatMap(file => {
                      const relativePath = file.path.startsWith('/') ? file.path.slice(1) : file.path
                      const importPath = relativePath.replace(/\.(ts|tsx|js|jsx)$/, '')
                      const exports = extractExports(file.content, file.path)
                      
                      return exports.map(exportName => ({
                        label: exportName,
                        kind: exportName === 'default' 
                          ? monaco.languages.CompletionItemKind.Function
                          : monaco.languages.CompletionItemKind.Variable,
                        insertText: exportName,
                        range: range,
                        detail: `from ${importPath}`,
                        documentation: `Import ${exportName} from ${file.path}`,
                      }))
                    })
                  
                  return { suggestions }
                } else {
                  // Provide file path completions for general import statements
                  const suggestions = projectFiles
                    .filter(file => file.path.endsWith('.ts') || file.path.endsWith('.tsx') || file.path.endsWith('.js') || file.path.endsWith('.jsx'))
                    .map(file => {
                      const relativePath = file.path.startsWith('/') ? file.path.slice(1) : file.path
                      const importPath = relativePath.replace(/\.(ts|tsx|js|jsx)$/, '')
                      
                      return {
                        label: importPath,
                        kind: monaco.languages.CompletionItemKind.File,
                        insertText: `'${importPath}'`,
                        range: range,
                        detail: `Import from ${file.path}`,
                      }
                    })
                  
                  return { suggestions }
                }
              },
            })
            
            // Set up completion provider for JavaScript files
            monaco.languages.registerCompletionItemProvider('javascript', {
              provideCompletionItems: (model, position) => {
                const word = model.getWordUntilPosition(position)
                const range = {
                  startLineNumber: position.lineNumber,
                  endLineNumber: position.lineNumber,
                  startColumn: word.startColumn,
                  endColumn: word.endColumn,
                }
                
                // Check if we're in an import statement
                const lineContent = model.getLineContent(position.lineNumber)
                const isInImport = lineContent.includes('import') && 
                  (lineContent.includes('from') || lineContent.includes('{'))
                
                if (isInImport) {
                  // Provide export-based completions
                  const suggestions = projectFiles
                    .filter(file => file.path.endsWith('.ts') || file.path.endsWith('.tsx') || file.path.endsWith('.js') || file.path.endsWith('.jsx') || file.path.endsWith('.d.ts'))
                    .flatMap(file => {
                      const relativePath = file.path.startsWith('/') ? file.path.slice(1) : file.path
                      const importPath = relativePath.replace(/\.(ts|tsx|js|jsx)$/, '')
                      const exports = extractExports(file.content, file.path)
                      
                      return exports.map(exportName => ({
                        label: exportName,
                        kind: exportName === 'default' 
                          ? monaco.languages.CompletionItemKind.Function
                          : monaco.languages.CompletionItemKind.Variable,
                        insertText: exportName,
                        range: range,
                        detail: `from ${importPath}`,
                        documentation: `Import ${exportName} from ${file.path}`,
                      }))
                    })
                  
                  return { suggestions }
                } else {
                  // Provide file path completions for general import statements
                  const suggestions = projectFiles
                    .filter(file => file.path.endsWith('.ts') || file.path.endsWith('.tsx') || file.path.endsWith('.js') || file.path.endsWith('.jsx'))
                    .map(file => {
                      const relativePath = file.path.startsWith('/') ? file.path.slice(1) : file.path
                      const importPath = relativePath.replace(/\.(ts|tsx|js|jsx)$/, '')
                      
                      return {
                        label: importPath,
                        kind: monaco.languages.CompletionItemKind.File,
                        insertText: `'${importPath}'`,
                        range: range,
                        detail: `Import from ${file.path}`,
                      }
                    })
                  
                  return { suggestions }
                }
              },
            })
            
            // Register code actions provider for AI-powered quick fixes
            monaco.languages.registerCodeActionProvider('typescript', {
              provideCodeActions: (model, range, context) => {
                const actions: any[] = []
                
                // Check if there are any diagnostics (errors/warnings) in the current range
                const diagnostics = context.markers.filter((marker: any) => 
                  marker.severity === 8 || // Error
                  marker.severity === 4    // Warning
                )
                
                if (diagnostics.length > 0) {
                  // Add AI Fix action for each diagnostic
                  diagnostics.forEach((diagnostic, index) => {
                    actions.push({
                      title: '🤖 AI Fix',
                      kind: 'quickfix',
                      diagnostics: [diagnostic],
                      edit: {
                        edits: [] // We'll handle this via the command
                      },
                      command: {
                        id: 'ai-quick-fix',
                        title: 'AI Quick Fix',
                        arguments: [diagnostic.message, diagnostic.startLineNumber]
                      },
                      isPreferred: true
                    })
                  })
                }
                
                return {
                  actions,
                  dispose: () => {}
                }
              }
            })
            
            // Register code actions provider for JavaScript
            monaco.languages.registerCodeActionProvider('javascript', {
              provideCodeActions: (model, range, context) => {
                const actions: any[] = []
                
                // Check if there are any diagnostics (errors/warnings) in the current range
                const diagnostics = context.markers.filter((marker: any) => 
                  marker.severity === 8 || // Error
                  marker.severity === 4    // Warning
                )
                
                if (diagnostics.length > 0) {
                  // Add AI Fix action for each diagnostic
                  diagnostics.forEach((diagnostic, index) => {
                    actions.push({
                      title: '🤖 AI Fix',
                      kind: 'quickfix',
                      diagnostics: [diagnostic],
                      edit: {
                        edits: [] // We'll handle this via the command
                      },
                      command: {
                        id: 'ai-quick-fix',
                        title: 'AI Quick Fix',
                        arguments: [diagnostic.message, diagnostic.startLineNumber]
                      },
                      isPreferred: true
                    })
                  })
                }
                
                return {
                  actions,
                  dispose: () => {}
                }
              }
            })
            
            // Register the AI quick fix action
            editor.addAction({
              id: 'ai-quick-fix',
              label: 'AI Quick Fix',
              contextMenuGroupId: 'navigation',
              run: (editor, ...args) => {
                const errorMessage = args[0] as string
                const lineNumber = args[1] as number
                openInlineChat(errorMessage, lineNumber, 'inline')
              }
            })

            // Add keyboard shortcut for AI Assistant (Ctrl+Shift+I)
            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyI, () => {
              openInlineChat("AI Code Assistant - Ask me anything about this file or request changes", 1, 'modal')
            })
            
            // Enable quick suggestions
            editor.updateOptions({
              quickSuggestions: {
                other: true,
                comments: false,
                strings: true,
              },
              suggestOnTriggerCharacters: true,
              acceptSuggestionOnEnter: 'on',
              tabCompletion: 'on',
              wordBasedSuggestions: 'currentDocument',
            })
            
            // Cleanup on disposal
            editor.onDidDispose(() => {
              // No cleanup needed
            })
            
            // Add save keybinding
            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
              handleSave()
            })
          }}
          options={{
            minimap: { enabled: showMinimap },
            fontSize,
            fontFamily: 'JetBrains Mono, Fira Code, monospace',
            lineNumbers: 'on',
            rulers: [80, 120],
            wordWrap: 'on',
            automaticLayout: true,
            scrollBeyondLastLine: false,
            scrollbar: {
              vertical: 'visible',
              horizontal: 'visible',
              alwaysConsumeMouseWheel: false,
            },
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            renderWhitespace: 'selection',
            bracketPairColorization: { enabled: true },
            guides: {
              bracketPairs: true,
              indentation: true,
            },
            // Ensure proper layout within container
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            overviewRulerBorder: false,
            // Enable semantic highlighting for better code understanding
            'semanticHighlighting.enabled': 'configuredByTheme',
            quickSuggestions: false,
            parameterHints: { enabled: true },
            suggestOnTriggerCharacters: false,
            acceptSuggestionOnEnter: 'off',
            tabCompletion: 'off',
            wordBasedSuggestions: 'off',
            // Enable hover information for VS Code-like tooltips
            hover: { enabled: true },
            // Disable code lens
            codeLens: false,
            // Enable validation decorations for better error display
            renderValidationDecorations: 'on',
            showUnused: false,
            showDeprecated: true,
            occurrencesHighlight: 'singleFile',
            selectionHighlight: true,
            links: true,
            colorDecorators: false,
            quickSuggestionsDelay: 0,
            suggest: {
              showMethods: true,
              showFunctions: true,
              showConstructors: true,
              showFields: true,
              showVariables: true,
              showClasses: true,
              showStructs: true,
              showInterfaces: true,
              showModules: true,
              showProperties: true,
              showEvents: false,
              showOperators: false,
              showUnits: false,
              showValues: false,
              showConstants: false,
              showEnums: false,
              showEnumMembers: false,
              showKeywords: false,
              showWords: false,
              showColors: false,
              showFiles: false,
              showReferences: false,
              showFolders: false,
              showTypeParameters: false,
              showSnippets: false,
            },
          }}
        />
      </div>

      {/* Status Bar */}
      <div className="px-4 py-2 border-t border-border bg-muted/50 text-xs text-muted-foreground flex-shrink-0">
        <div className="flex items-center justify-between">
          <span>{file.path}</span>
          <span>
            {content.split("\n").length} lines • {content.length} characters
          </span>
        </div>
      </div>

      {/* Inline Chat */}
      {showInlineChat && file && (
        <InlineChat
          position={inlineChatPosition}
          error={inlineChatError}
          lineNumber={inlineChatLine}
          onClose={closeInlineChat}
          onSubmit={handleInlineChatSubmit}
          onApplyFix={handleApplyFix}
          onStartStreaming={handleInlineStreaming}
          isLoading={isInlineChatLoading}
          fileContent={content}
          fileName={file.name}
          streamingResponse={inlineChatInput}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          mode={inlineChatLine ? 'inline' : 'modal'}
          conversationHistory={conversationHistory}
        />
      )}
    </div>
  )
}
