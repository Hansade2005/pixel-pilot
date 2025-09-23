"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import {
  MessageSquare,
  Trash2,
  Copy,
  ArrowUp,
  Settings,
  ChevronDown,
  ChevronUp,
  FileText,
  Edit3,
  Eye,
  FolderOpen,
  X,
  Wrench,
  Check,
  AlertTriangle,
  Zap,
  Undo2,
  Redo2,
  Globe,
  FileSearch,
  BookOpen,
  Database,
  User,
  Clock
} from "lucide-react"
import { FileAttachmentDropdown } from "@/components/ui/file-attachment-dropdown"
import { FileAttachmentBadge } from "@/components/ui/file-attachment-badge"
import { FileSearchResult } from "@/lib/file-lookup-service"
import { useToast } from "@/hooks/use-toast"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Workspace as Project } from "@/lib/storage-manager"
import { AuthModal } from "@/components/auth-modal"
import { ChatDiagnostics } from "./chat-diagnostics"
import { AiModeSelector, type AIMode } from "@/components/ui/ai-mode-selector"
import { DEFAULT_CHAT_MODEL } from "@/lib/ai-models"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import { createCheckpoint } from '@/lib/checkpoint-utils'
import { ThinkingIndicator } from "@/components/ui/thinking-indicator"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface Message {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  createdAt?: string
  metadata?: {
    // Server-side tool execution results
    toolCalls?: any[]
    toolResults?: any[]  // Match specs pattern - array of tool result objects
    success?: boolean
    hasToolCalls?: boolean
    hasToolErrors?: boolean
    stepCount?: number
    steps?: any[]
    serverSideExecution?: boolean
    fileOperations?: Array<{
      type: string
      path: string
      content?: string
      projectId: string
      success: boolean
    }>
    
    // XML command execution results
    xmlCommands?: Array<{
      id: string
      command: 'write' | 'edit' | 'delete'
      path: string
      status: 'pending' | 'executing' | 'completed' | 'failed'
      error?: string
      message?: string
    }>

    // XML placeholders for inline rendering
    xmlPlaceholders?: Array<{ token: string; tool: XMLToolCall }>

    // Workflow system properties
    workflowMode?: boolean
    workflowChunk?: any
    workflowEvents?: any[]
    sessionId?: string

    // Legacy properties (for backward compatibility)
    toolResult?: any
    timestamp?: string
    model?: string
  }
}

interface ChatPanelProps {
  project: Project | null
  isMobile?: boolean
  selectedModel?: string
  aiMode?: AIMode
  onModeChange?: (mode: AIMode) => void
  onClearChat?: () => void
}

// Workflow Message Component for sophisticated workflow rendering
const WorkflowMessageComponent = ({ workflowChunk, sessionId }: { workflowChunk: any, sessionId?: string }) => {
  const [progress, setProgress] = useState(workflowChunk?.data?.progress || 0)

  useEffect(() => {
    if (workflowChunk?.data?.progress) {
      setProgress(workflowChunk.data.progress)
    }
  }, [workflowChunk])

  const getWorkflowIcon = (type: string) => {
    switch (type) {
      case 'setup': return '🎯'
      case 'generation': return '🏗️'
      case 'validation': return '🔍'
      case 'cleanup': return '📋'
      default: return '🤖'
    }
  }

  const getProgressColor = (progress: number) => {
    if (progress < 30) return 'bg-blue-500'
    if (progress < 70) return 'bg-yellow-500'
    if (progress < 100) return 'bg-green-500'
    return 'bg-emerald-500'
  }

  return (
    <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-blue-900">
            {getWorkflowIcon(workflowChunk?.type || 'setup')} {workflowChunk?.data?.workflowStep || 1}/7 Steps
          </span>
          <span className="text-sm text-blue-700">{progress}%</span>
        </div>
        <div className="w-full bg-blue-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(progress)}`}
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Workflow Message */}
      <div className="text-blue-900">
        <div className="font-medium mb-2">AI Development Workflow</div>
        <div className="text-sm leading-relaxed">
          {workflowChunk?.data?.message || 'Processing your request...'}
        </div>

        {/* Workflow Details */}
        {workflowChunk?.data?.implementationPlan && (
          <div className="mt-3 p-3 bg-white/50 rounded-lg">
            <div className="text-xs font-medium text-blue-800 mb-2">📋 Implementation Plan:</div>
            <ul className="text-xs space-y-1">
              {workflowChunk.data.implementationPlan.steps?.map((step: string, index: number) => (
                <li key={index} className="text-blue-700">• {step}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Workflow Results */}
        {workflowChunk?.data?.creationResult && (
          <div className="mt-3 p-3 bg-white/50 rounded-lg">
            <div className="text-xs font-medium text-green-800 mb-2">✅ Created Files:</div>
            <ul className="text-xs space-y-1">
              {workflowChunk.data.creationResult.filesCreated?.map((file: string, index: number) => (
                <li key={index} className="text-green-700">📄 {file}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Workflow Summary */}
        {workflowChunk?.data?.summary && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <div className="text-sm font-medium text-emerald-900 mb-2">📋 Workflow Summary:</div>
            <div className="text-xs text-emerald-800 whitespace-pre-line">
              {workflowChunk.data.summary}
            </div>
          </div>
        )}

        {/* Session Info */}
        {sessionId && (
          <div className="mt-2 text-xs text-blue-600">
            Session: {sessionId.slice(-8)}
          </div>
        )}
      </div>
    </div>
  )

  // If no special case matches, return null (shouldn't happen with our current tool set)
  return null
}

// Format workflow content for real-time display
function formatWorkflowContent(eventData: any, currentContent: string): string {
  switch (eventData.type) {
    case 'workflow_step':
      return `## Step ${eventData.step}: ${eventData.message}

🔄 **Current Phase:** ${eventData.stepType || 'processing'}

${currentContent}`

    case 'ai_narration':
      return `${currentContent}

💭 **AI:** ${eventData.message}`

    case 'tool_execution':
      const statusEmoji = eventData.status === 'success' ? '✅' : eventData.status === 'error' ? '❌' : '⏳'
      const toolInfo = eventData.details?.path ? ` (${eventData.details.path})` : ''
      return `${currentContent}

${statusEmoji} **Tool:** ${eventData.tool}${toolInfo}`

    case 'verification':
      const verifyEmoji = eventData.success ? '✅' : '❌'
      return `${currentContent}

${verifyEmoji} **Verification:** ${eventData.message}`

    case 'workflow_completion':
      return `${currentContent}

---

## ✅ Workflow Completed

${eventData.summary}

**Tools Used:** ${eventData.toolCalls?.length || 0}
**Files Modified:** ${eventData.fileOperations?.length || 0}
**Total Steps:** ${eventData.totalSteps || 6}`

    case 'workflow_error':
      return `${currentContent}

---

## ❌ Workflow Error

An error occurred during execution: ${eventData.error}`

    default:
      return currentContent
  }
}

// Sanitize content to remove raw streaming data
function sanitizeStreamingContent(content: string): string {
  if (!content) return content

  console.log('[SANITIZER] Processing content length:', content.length)
  console.log('[SANITIZER] Content preview:', content.substring(0, 300))
  
  // Only sanitize if we detect actual raw SSE patterns that shouldn't be in final content
  // This should only catch content that is literally raw SSE data, not regular content
  
  // Check if the entire content is just raw SSE data (starts with data: and has streaming patterns)
  const isRawSSEData = content.trim().startsWith('data: {') && 
                      content.includes('"type":') && 
                      content.includes('"text-delta"')
  
  if (isRawSSEData) {
    console.warn('[SANITIZER] Detected raw SSE data, filtering out:', content.substring(0, 100))
    return ''
  }
  
  // For legitimate content, clean up any stray SSE fragments and XML tool tags
  let sanitized = content
    // Remove isolated data: {JSON} patterns that shouldn't be in final content
    .replace(/^data:\s*\{[^}]*\}$/gm, '')
    // Remove standalone [DONE] markers
    .replace(/^data:\s*\[DONE\]$/gm, '')
    // Remove XML tool tags completely to prevent highlight.js from processing them
    // First remove any code block wrappers around XML
    .replace(/```xml\s*([\s\S]*?)```/g, '$1')
    .replace(/```([\s\S]*?)```/g, (match, content) => {
      // Only remove code blocks that contain XML tags
      if (/<(pilotwrite|pilotedit|pilotdelete|write_file|edit_file|delete_file|read_file|list_files|search_files|grep_search|web_search|web_extract|analyze_code|check_syntax|run_tests|create_directory|delete_directory)/.test(content)) {
        console.log('[SANITIZER] Removing code block wrapper around XML content')
        return content
      }
      return match
    })
    .replace(/<(pilotwrite|pilotedit|pilotdelete|write_file|edit_file|delete_file|read_file|list_files|search_files|grep_search|web_search|web_extract|analyze_code|check_syntax|run_tests|create_directory|delete_directory)[^>]*>[\s\S]*?<\/\1>/gi, '')
    // Remove self-closing XML tool tags
    .replace(/<(pilotwrite|pilotedit|pilotdelete|write_file|edit_file|delete_file|read_file|list_files|search_files|grep_search|web_search|web_extract|analyze_code|check_syntax|run_tests|create_directory|delete_directory)[^>]*\/>/gi, '')
    // Clean up multiple newlines
    .replace(/\n\n\n+/g, '\n\n')
    // Remove leading/trailing whitespace
    .trim()
  
  console.log('[SANITIZER] Final sanitized content length:', sanitized.length)
  console.log('[SANITIZER] Final content preview:', sanitized.substring(0, 300))
  
  return sanitized
}

// ExpandableUserMessage component for long user messages
const ExpandableUserMessage = ({ content, messageId, onRevert, showRestore = false }: { content: string, messageId: string, onRevert: (messageId: string) => void, showRestore?: boolean }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [shouldTruncate, setShouldTruncate] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const CHAR_LIMIT = 140 // Character limit before truncation
  
  useEffect(() => {
    // Check if content exceeds character limit
    setShouldTruncate(content.length > CHAR_LIMIT)
  }, [content])
  
  const handleIconClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRevert(messageId);
  };
  
  const renderIconButton = () => {
    if (showRestore) {
      return (
        <button
          onClick={handleIconClick}
          className="bg-background border border-border rounded-full p-1.5 shadow-sm hover:bg-muted transition-colors"
          title="Restore to this version"
        >
          <Redo2 className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
        </button>
      );
    }
    
    return (
      <button
        onClick={handleIconClick}
        className="bg-background border border-border rounded-full p-1.5 shadow-sm hover:bg-muted transition-colors"
        title="Revert to this version"
      >
        <Undo2 className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
      </button>
    );
  };
  
  if (!shouldTruncate) {
    return (
      <div className="relative w-full">
        <div className="bg-card text-card-foreground border rounded-xl shadow-sm overflow-hidden w-full flex flex-col">
          <div className="p-4">
            <p className="text-card-foreground text-sm leading-[1.5] whitespace-pre-wrap text-left">
              {content}
            </p>
          </div>
          <div className="px-4 pb-2 flex justify-end">
            {renderIconButton()}
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="relative w-full">
      <div className="bg-card text-card-foreground border rounded-xl overflow-hidden relative shadow-sm w-full flex flex-col">
        <div className="p-4">
          {/* Show truncated content when collapsed */}
          {!isExpanded ? (
            <div>
              <p className="text-card-foreground text-sm leading-[1.5] whitespace-pre-wrap text-left">
                {content.substring(0, CHAR_LIMIT)}
                {content.length > CHAR_LIMIT && '...'}
              </p>
            </div>
          ) : (
            /* Show full content when expanded with scrollable area */
            <div
              ref={contentRef}
              className="max-h-[300px] overflow-y-auto"
              style={{
                scrollBehavior: 'smooth',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              <p className="text-card-foreground text-sm leading-[1.5] whitespace-pre-wrap text-left">
                {content}
              </p>
            </div>
          )}
        </div>
        
        {/* Expand/Collapse trigger */}
        <div
          className="flex items-center justify-center px-4 py-2 border-t hover:bg-muted transition-colors cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span className="text-xs text-muted-foreground mr-2">
            {isExpanded ? 'Show less' : 'Show more'}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-3 h-3 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          )}
        </div>
        
        <div className="px-4 pb-2 flex justify-end">
          {renderIconButton()}
        </div>
      </div>
    </div>
  )
}

// Enhanced client-side XML tool detection and execution system
interface XMLToolCall {
  id: string
  name: string
  args: Record<string, any>
  status: 'detected' | 'processing' | 'executing' | 'completed' | 'failed'
  result?: any
  error?: string
  startTime?: number
  endTime?: number
  // Additional properties for pill rendering
  command?: 'pilotwrite' | 'pilotedit' | 'pilotdelete'
  path?: string
  content?: string
}

// XML tool detection patterns - matching actual chat route implementation
const XML_TOOL_PATTERNS = {
  // File operations - matching server-side tool definitions
  pilotwrite: /<pilotwrite\s+path=(["'])([^"']+)\1[^>]*>([\s\S]*?)<\/pilotwrite>/gi,
  pilotedit: /<pilotedit\s+path=(["'])([^"']+)\1[^>]*>([\s\S]*?)<\/pilotedit>/gi,
  pilotdelete: /<pilotdelete\s+path=(["'])([^"']+)\1[^>]*\s*\/>/gi,
  
  // Additional tool patterns (if used elsewhere)
  write_file: /<write_file\s+path="([^"]+)"(?:\s+content="([^"]*)")?>/g,
  edit_file: /<edit_file\s+path="([^"]+)"(?:\s+content="([^"]*)")?>/g,
  delete_file: /<delete_file\s+path="([^"]+)"\s*\/>/g,
  read_file: /<read_file\s+path="([^"]+)"\s*\/>/g,
  list_files: /<list_files\s*(?:\s+path="([^"]+)")?\s*\/>/g,
  
  // Directory operations
  create_directory: /<create_directory\s+path="([^"]+)"\s*\/>/g,
  delete_directory: /<delete_directory\s+path="([^"]+)"\s*\/>/g,
  
  // Search operations
  search_files: /<search_files\s+query="([^"]+)"(?:\s+path="([^"]+)")?\s*\/>/g,
  grep_search: /<grep_search\s+pattern="([^"]+)"(?:\s+path="([^"]+)")?\s*\/>/g,
  
  // Web operations
  web_search: /<web_search\s+query="([^"]+)"(?:\s+count="([^"]+)")?\s*\/>/g,
  web_extract: /<web_extract\s+url="([^"]+)"(?:\s+selector="([^"]+)")?\s*\/>/g,
  
  // Analysis operations
  analyze_code: /<analyze_code\s+path="([^"]+)"\s*\/>/g,
  check_syntax: /<check_syntax\s+path="([^"]+)"\s*\/>/g,
  run_tests: /<run_tests\s*(?:\s+path="([^"]+)")?\s*\/>/g,
}

// XML tool closing patterns - matching actual chat route implementation
const XML_TOOL_CLOSING_PATTERNS = {
  // File operations (actual tags from chat route)
  pilotwrite: /<\/pilotwrite>/gi,
  pilotedit: /<\/pilotedit>/gi,
  pilotdelete: /<\/pilotdelete>/gi,
  
  // Additional tool patterns (if used elsewhere)
  write_file: /<\/write_file>/g,
  edit_file: /<\/edit_file>/g,
  delete_file: /<\/delete_file>/g,
  read_file: /<\/read_file>/g,
  list_files: /<\/list_files>/g,
  create_directory: /<\/create_directory>/g,
  delete_directory: /<\/delete_directory>/g,
  search_files: /<\/search_files>/g,
  grep_search: /<\/grep_search>/g,
  web_search: /<\/web_search>/g,
  web_extract: /<\/web_extract>/g,
  analyze_code: /<\/analyze_code>/g,
  check_syntax: /<\/check_syntax>/g,
  run_tests: /<\/run_tests>/g,
}

// XMLToolPill component for displaying XML tool tags as pills
const XMLToolPill = ({ toolCall, status = 'completed' }: { toolCall: XMLToolCall, status?: 'executing' | 'completed' | 'failed' }) => {
  // Validate the tool call before rendering to prevent corrupted pills
  if (!validateXMLToolCall(toolCall)) {
    console.warn('[XMLToolPill] Invalid tool call detected, skipping render:', toolCall)
    return null
  }

  const getToolIcon = (toolName: string | undefined) => {
    switch (toolName) {
      case 'pilotwrite': return FileText
      case 'pilotedit': return Edit3
      case 'pilotdelete': return X
      default: return Wrench
    }
  }

  const getToolAction = (toolName: string | undefined) => {
    switch (toolName) {
      case 'pilotwrite': return 'Created'
      case 'pilotedit': return 'Modified'
      case 'pilotdelete': return 'Deleted'
      default: return 'Executed'
    }
  }

  const getToolDisplayName = (toolName: string | undefined) => {
    switch (toolName) {
      case 'pilotwrite': return 'File Created'
      case 'pilotedit': return 'File Modified'
      case 'pilotdelete': return 'File Deleted'
      default: return 'Tool Executed'
    }
  }

  const isSuccess = status !== 'failed'
  const fileName = toolCall.path && toolCall.path !== 'Unknown' ? 
    (toolCall.path.split('/').pop() || toolCall.path) : 
    `${toolCall.name || 'tool'}.${toolCall.id.split('_').pop()}`
  const IconComponent = getToolIcon(toolCall.command || toolCall.name || 'unknown')

  // Special handling for pilotwrite and pilotedit with content
  if ((toolCall.command || toolCall.name) === 'pilotwrite' || (toolCall.command || toolCall.name) === 'pilotedit') {
    const [isExpanded, setIsExpanded] = useState(false)
    const fileExtension = toolCall.path && toolCall.path !== 'Unknown' ? 
      (toolCall.path.split('.').pop() || 'text') : 
      'tsx' // Default extension for unknown files
    
    // Don't show expansion for placeholders with no content
    const hasContent = toolCall.content && toolCall.content.trim().length > 0
    
    return (
      <div className="bg-background border rounded-lg shadow-sm mb-3 overflow-hidden">
        {/* Header - Clickable to toggle */}
        <div
          className={`px-4 py-3 border-b ${hasContent ? 'cursor-pointer hover:bg-muted/50' : ''} transition-colors ${
            isSuccess
              ? 'bg-muted border-l-4 border-l-primary'
              : 'bg-red-900/20 border-l-4 border-l-red-500'
          }`}
          onClick={hasContent ? () => setIsExpanded(!isExpanded) : undefined}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${
              isSuccess ? 'bg-gradient-to-r from-[#00c853] to-[#4caf50] text-white' : 'bg-red-500 text-white'
            }`}>
              <IconComponent className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">{getToolDisplayName(toolCall.command || toolCall.name || 'unknown')}</span>
                <span className="text-xs text-muted-foreground">({fileName})</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>{getToolAction(toolCall.command || toolCall.name || 'unknown')}</span>
                <span>•</span>
                <span>{status === 'executing' ? 'Processing...' : isSuccess ? 'Completed' : 'Failed'}</span>
              </div>
            </div>
            {/* Chevron indicator - only show if there's content to expand */}
            {hasContent && (
              <div className="ml-2">
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* File Content - Collapsible with Syntax Highlighting */}
        {hasContent && toolCall.content && isExpanded && (
          <div className="p-4 bg-background border-t">
            <div className="max-h-96 overflow-y-auto">
              <div className="bg-gray-800 border border-gray-600 rounded-lg overflow-hidden">
                <div className="px-3 py-2 bg-gray-700 border-b border-gray-600 text-xs font-medium text-white">
                  {toolCall.path && toolCall.path !== 'Unknown' ? toolCall.path : fileName} • {fileExtension}
                </div>
                <pre className="p-4 overflow-x-auto bg-[#1e1e1e]">
                  <code className={`hljs language-${fileExtension} text-sm text-white`}>
                    {toolCall.content}
                  </code>
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Simple pill for pilotdelete (no content to show)
  return (
    <div className="bg-background border rounded-lg shadow-sm mb-2 overflow-hidden">
      <div className={`px-3 py-2 flex items-center gap-3 ${
        isSuccess
          ? 'bg-muted border-l-4 border-l-primary'
          : 'bg-red-900/20 border-l-4 border-l-red-500'
      }`}>
        <div className={`p-2 rounded-full ${
          isSuccess ? 'bg-gradient-to-r from-red-500 to-red-600 text-white' : 'bg-red-500 text-white'
        }`}>
          <IconComponent className={`w-4 h-4`} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">{getToolDisplayName(toolCall.command || toolCall.name || 'unknown')}</span>
            <span className="text-xs text-muted-foreground">({fileName})</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>{getToolAction(toolCall.command || toolCall.name || 'unknown')}</span>
            <span>•</span>
            <span>{status === 'executing' ? 'Processing...' : isSuccess ? 'Completed' : 'Failed'}</span>
          </div>
        </div>
        <div className={`p-1 rounded-full ${isSuccess ? 'bg-green-500' : 'bg-red-500'}`}>
          {isSuccess ? (
            <Check className="w-4 h-4 text-white" />
          ) : (
            <X className="w-4 h-4 text-white" />
          )}
        </div>
      </div>
    </div>
  )
}

// Validate XML tool call data to prevent corrupted pills
function validateXMLToolCall(toolCall: XMLToolCall): boolean {
  // Basic validation checks
  if (!toolCall.id || !toolCall.name) {
    return false
  }
  
  // Ensure path is valid
  if (!toolCall.path || 
      toolCall.path === 'Unknown' || 
      toolCall.path.includes('<') || 
      toolCall.path.includes('>') ||
      toolCall.path.trim().length === 0) {
    return false
  }
  
  // Ensure command is valid
  const validCommands = ['pilotwrite', 'pilotedit', 'pilotdelete']
  if (toolCall.command && !validCommands.includes(toolCall.command)) {
    return false
  }
  
  // Check for suspicious IDs that might indicate corruption
  if (toolCall.id.includes('.') && toolCall.id.split('.').length > 2) {
    return false
  }
  
  return true
}

// Validate if content actually contains valid XML tool tags (not just keywords)
function hasValidXMLTools(content: string): boolean {
  if (!content || typeof content !== 'string') return false
  
  // More strict patterns that require proper XML syntax
  const strictXMLPatterns = [
    /<pilotwrite\s+[^>]*path=(["'])[^"']+\1[^>]*>[\s\S]*?<\/pilotwrite>/i,
    /<pilotedit\s+[^>]*path=(["'])[^"']+\1[^>]*>[\s\S]*?<\/pilotedit>/i,
    /<pilotdelete\s+[^>]*path=(["'])[^"']+\1[^>]*\s*\/?>/i
  ]
  
  return strictXMLPatterns.some(pattern => pattern.test(content))
}

// Direct XML tool rendering - converts XML tags directly to pills without placeholders
function renderXMLToolsDirectly(content: string): React.ReactNode[] {
  const components: React.ReactNode[] = []
  let remainingContent = content
  let elementKey = 0

  // First validate that content actually contains valid XML tools
  if (!hasValidXMLTools(content)) {
    return []
  }

  // Define all XML tool patterns with stricter validation
  const xmlPatterns = [
    {
      name: 'pilotwrite',
      pattern: /<pilotwrite\s+[^>]*path=(["'])([^"']+)\1[^>]*>([\s\S]*?)<\/pilotwrite>/gi
    },
    {
      name: 'pilotedit', 
      pattern: /<pilotedit\s+[^>]*path=(["'])([^"']+)\1[^>]*>([\s\S]*?)<\/pilotedit>/gi
    },
    {
      name: 'pilotdelete',
      // Handle both self-closing and regular closing patterns for pilotdelete
      pattern: /<pilotdelete\s+[^>]*path=(["'])([^"']+)\1[^>]*(?:\s*\/>|>([\s\S]*?)<\/pilotdelete>)/gi
    }
  ]

  // Find all XML tool matches with their positions
  const allMatches: Array<{
    match: RegExpMatchArray,
    toolName: string,
    startIndex: number,
    endIndex: number
  }> = []

  xmlPatterns.forEach(({ name, pattern }) => {
    // Reset regex lastIndex to prevent state issues
    pattern.lastIndex = 0
    const matches = [...remainingContent.matchAll(pattern)]
    matches.forEach(match => {
      if (match.index !== undefined && match[2]) { // Ensure we have a valid path
        // Additional validation: ensure the path looks valid
        const path = match[2].trim()
        if (path && path.length > 0 && !path.includes('<') && !path.includes('>')) {
          allMatches.push({
            match,
            toolName: name,
            startIndex: match.index,
            endIndex: match.index + match[0].length
          })
        }
      }
    })
  })

  // If no valid matches found, return empty array
  if (allMatches.length === 0) {
    return []
  }

  // Sort matches by position
  allMatches.sort((a, b) => a.startIndex - b.startIndex)

  let currentPosition = 0

  allMatches.forEach(({ match, toolName }) => {
    const [fullMatch, quote, path, xmlContent] = match
    const matchStart = match.index!
    const matchEnd = matchStart + fullMatch.length

    // Add content before this XML tool (if any)
    if (matchStart > currentPosition) {
      const beforeContent = remainingContent.slice(currentPosition, matchStart)
      if (beforeContent.trim()) {
        components.push(
          <div key={`content-${elementKey++}`} className="markdown-content">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {beforeContent}
            </ReactMarkdown>
          </div>
        )
      }
    }

    // Determine the appropriate status based on content
    // If the content looks like actual code (has imports, jsx, etc), it's likely AI-generated content
    // If it's empty or just a comment, it's likely a tool execution placeholder
    const hasCodeContent = xmlContent && (
      xmlContent.includes('import ') ||
      xmlContent.includes('export ') ||
      xmlContent.includes('function ') ||
      xmlContent.includes('const ') ||
      xmlContent.includes('class ') ||
      xmlContent.includes('interface ') ||
      xmlContent.includes('<') && xmlContent.includes('>') ||
      xmlContent.trim().length > 100 // Substantial content
    )

    // Create and add the XML tool pill
    const toolId = `${toolName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const validCommands = ['pilotwrite', 'pilotedit', 'pilotdelete'] as const
    const command = validCommands.includes(toolName as any) ? toolName as typeof validCommands[number] : undefined

    const xmlTool: XMLToolCall = {
      id: toolId,
      name: toolName,
      command: command,
      path: path,
      content: xmlContent,
      args: { path, content: xmlContent },
      status: hasCodeContent ? 'detected' : 'completed' // 'detected' shows as expandable, 'completed' shows as done
    }

    const pillStatus = hasCodeContent ? 'executing' : 'completed' // This controls the visual state

    components.push(
      <XMLToolPill key={`tool-${elementKey++}`} toolCall={xmlTool} status={pillStatus} />
    )

    currentPosition = matchEnd
  })

  // Add any remaining content after the last XML tool
  if (currentPosition < remainingContent.length) {
    const afterContent = remainingContent.slice(currentPosition)
    if (afterContent.trim()) {
      components.push(
        <div key={`content-${elementKey++}`} className="markdown-content">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {afterContent}
          </ReactMarkdown>
        </div>
      )
    }
  }

  return components
}

// Parse XML tags from content and convert them to XMLToolPill components
function parseXMLToolsToComponents(content: string): { content: string; xmlTools: XMLToolCall[] } {
  const xmlTools: XMLToolCall[] = []
  let processedContent = content
  
  // Validate input
  if (!content || typeof content !== 'string') {
    return { content: processedContent, xmlTools }
  }
  
  // First, parse existing XML tool placeholders that are already in the content
  const existingPlaceholders = [...content.matchAll(/<!-- XMLTOOL_(pilot\w+)_(\d+)_([a-z0-9]+) -->/gi)]
  existingPlaceholders.forEach(match => {
    const [fullMatch, toolType, timestamp, randomId] = match
    const toolId = `${toolType}_${timestamp}_${randomId}`
    
    // Type-safe command mapping
    const validCommands = ['pilotwrite', 'pilotedit', 'pilotdelete'] as const
    const command = validCommands.includes(toolType as any) ? toolType as typeof validCommands[number] : undefined
    
    // Only add if it's a valid command
    if (command) {
      const xmlTool: XMLToolCall = {
        id: toolId,
        name: toolType,
        command: command,
        path: 'Unknown', // We don't have the original path info from placeholders
        content: '',     // We don't have the original content from placeholders
        args: { path: 'Unknown', content: '' },
        status: 'completed' // Assume these are completed since they're already placeholders
      }
      
      xmlTools.push(xmlTool)
    }
  })
  
  // Process pilotwrite tags (with opening and closing tags) - with validation
  const pilotwriteMatches = [...content.matchAll(/<pilotwrite\s+[^>]*path=(["'])([^"']+)\1[^>]*>([\s\S]*?)<\/pilotwrite>/gi)]
  pilotwriteMatches.forEach(match => {
    const [fullMatch, quote, path, xmlContent] = match
    
    // Validate the path - ensure it's not empty and doesn't contain invalid characters
    if (!path || path.trim().length === 0 || path.includes('<') || path.includes('>')) {
      console.warn('[XML Parser] Invalid path detected in pilotwrite tag:', path)
      return
    }
    
    // Generate unique ID using crypto if available, fallback to timestamp + random
    const toolId = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? `pilotwrite_${crypto.randomUUID()}`
      : `pilotwrite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const xmlTool: XMLToolCall = {
      id: toolId,
      name: 'pilotwrite',
      command: 'pilotwrite',
      path: path.trim(),
      content: xmlContent || '',
      args: { path: path.trim(), content: xmlContent || '' },
      status: 'detected'
    }
    
    xmlTools.push(xmlTool)
    
    // Replace the XML tag with a placeholder
    processedContent = processedContent.replace(fullMatch, `<!-- XMLTOOL_${toolId} -->`)
  })
  
  // Process pilotedit tags (with opening and closing tags - unified pattern) - with validation
  const piloteditMatches = [...processedContent.matchAll(/<pilotedit\s+[^>]*path=(["'])([^"']+)\1[^>]*>([\s\S]*?)<\/pilotedit>/gi)]
  piloteditMatches.forEach(match => {
    const [fullMatch, quote, path, xmlContent] = match
    
    // Validate the path - ensure it's not empty and doesn't contain invalid characters
    if (!path || path.trim().length === 0 || path.includes('<') || path.includes('>')) {
      console.warn('[XML Parser] Invalid path detected in pilotedit tag:', path)
      return
    }
    
    // Generate unique ID using crypto if available
    const toolId = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? `pilotedit_${crypto.randomUUID()}`
      : `pilotedit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const xmlTool: XMLToolCall = {
      id: toolId,
      name: 'pilotedit',
      command: 'pilotedit',
      path: path.trim(),
      content: xmlContent || '',
      args: { path: path.trim(), content: xmlContent || '' },
      status: 'detected'
    }
    
    xmlTools.push(xmlTool)
    
    // Replace the XML tag with a placeholder
    processedContent = processedContent.replace(fullMatch, `<!-- XMLTOOL_${toolId} -->`)
  })
  
  // Process pilotdelete tags (with both self-closing and regular patterns) - with validation
  const pilotdeleteMatches = [
    ...processedContent.matchAll(/<pilotdelete\s+[^>]*path=(["'])([^"']+)\1[^>]*\s*\/?>/gi),
    ...processedContent.matchAll(/<pilotdelete\s+[^>]*path=(["'])([^"']+)\1[^>]*>([\s\S]*?)<\/pilotdelete>/gi)
  ]
  pilotdeleteMatches.forEach(match => {
    const [fullMatch, quote, path, xmlContent] = match
    
    // Validate the path - ensure it's not empty and doesn't contain invalid characters
    if (!path || path.trim().length === 0 || path.includes('<') || path.includes('>')) {
      console.warn('[XML Parser] Invalid path detected in pilotdelete tag:', path)
      return
    }
    
    // Generate unique ID using crypto if available
    const toolId = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? `pilotdelete_${crypto.randomUUID()}`
      : `pilotdelete_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const xmlTool: XMLToolCall = {
      id: toolId,
      name: 'pilotdelete',
      command: 'pilotdelete',
      path: path.trim(),
      content: xmlContent || '',
      args: { path: path.trim(), content: xmlContent || '' },
      status: 'detected'
    }
    
    xmlTools.push(xmlTool)
    
    // Replace the XML tag with a placeholder
    processedContent = processedContent.replace(fullMatch, `<!-- XMLTOOL_${toolId} -->`)
  })
  
  // Deduplicate tools - remove duplicates based on command + path + content
  const deduplicatedTools = xmlTools.filter((tool, index, arr) => {
    const key = `${tool.command}_${tool.path}_${(tool.content || '').substring(0, 50)}`
    return arr.findIndex(t => `${t.command}_${t.path}_${(t.content || '').substring(0, 50)}` === key) === index
  })
  
  return { content: processedContent, xmlTools: deduplicatedTools }
}

// Render message content with XML tool pills
function renderXMLToolsInContent(content: string, xmlTools: XMLToolCall[]): React.ReactNode[] {
  if (!xmlTools || xmlTools.length === 0) {
    return []
  }
  
  // Filter out invalid tools before rendering
  const validTools = xmlTools.filter(validateXMLToolCall)
  
  if (validTools.length === 0) {
    return []
  }
  
  const components: React.ReactNode[] = []
  let workingContent = content
  
  // Split content by XML tool placeholders
  validTools.forEach((tool, index) => {
    const placeholder = `<!-- XMLTOOL_${tool.id} -->`
    const parts = workingContent.split(placeholder)
    
    if (parts.length === 2) {
      // Add the content before the placeholder (if any)
      if (parts[0].trim()) {
        components.push(
          <div key={`content_before_${tool.id}`} className="markdown-content">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {parts[0]}
            </ReactMarkdown>
          </div>
        )
      }
      
      // Add the XML tool pill
      components.push(
        <XMLToolPill key={tool.id} toolCall={tool} status="completed" />
      )
      
      // Update working content to the remainder
      workingContent = parts[1]
    }
  })
  
  // Add any remaining content after the last tool
  if (workingContent.trim()) {
    components.push(
      <div key="content_after_tools" className="markdown-content">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {workingContent}
        </ReactMarkdown>
      </div>
    )
  }
  
  return components
}

// Client-side tool execution functions
async function executeClientSideTool(toolCall: XMLToolCall, projectId: string): Promise<any> {
  const { storageManager } = await import('@/lib/storage-manager')
  await storageManager.init()

  console.log('[CLIENT-TOOL] Executing tool:', toolCall.name, toolCall.args)

  try {
    switch (toolCall.name) {
      case 'pilotwrite':
        const { path: pilotWritePath, content: pilotWriteContent } = toolCall.args

        // Validate inputs
        if (!pilotWritePath || typeof pilotWritePath !== 'string') {
          return {
            success: false,
            error: `Invalid file path provided`,
            path: pilotWritePath,
            toolCallId: toolCall.id
          }
        }

        if (pilotWriteContent === undefined || pilotWriteContent === null) {
          return {
            success: false,
            error: `Invalid content provided`,
            path: pilotWritePath,
            toolCallId: toolCall.id
          }
        }

        // Check if file already exists
        const writeExistingFile = await storageManager.getFile(projectId, pilotWritePath)

        if (writeExistingFile) {
          // Update existing file
          await storageManager.updateFile(projectId, pilotWritePath, { content: pilotWriteContent })
          return {
            success: true,
            message: `✅ File ${pilotWritePath} updated successfully.`,
            path: pilotWritePath,
            action: 'updated',
            toolCallId: toolCall.id
          }
        } else {
          // Create new file
          const newFile = await storageManager.createFile({
            workspaceId: projectId,
            name: pilotWritePath.split('/').pop() || pilotWritePath,
            path: pilotWritePath,
            content: pilotWriteContent,
            fileType: pilotWritePath.split('.').pop() || 'text',
            type: pilotWritePath.split('.').pop() || 'text',
            size: pilotWriteContent.length,
            isDirectory: false
          })

          return {
            success: true,
            message: `✅ File ${pilotWritePath} created successfully.`,
            path: pilotWritePath,
            action: 'created',
            fileId: newFile.id,
            toolCallId: toolCall.id
          }
        }

      case 'pilotedit':
        const { path: pilotEditPath, searchReplaceBlocks } = toolCall.args

        // Validate inputs
        if (!pilotEditPath || typeof pilotEditPath !== 'string') {
          return {
            success: false,
            error: `Invalid file path provided`,
            path: pilotEditPath,
            toolCallId: toolCall.id
          }
        }

        if (!searchReplaceBlocks || !Array.isArray(searchReplaceBlocks) || searchReplaceBlocks.length === 0) {
          return {
            success: false,
            error: `No search/replace blocks provided`,
            path: pilotEditPath,
            toolCallId: toolCall.id
          }
        }

        // Check if file exists
        const editExistingFile = await storageManager.getFile(projectId, pilotEditPath)

        if (!editExistingFile) {
          return {
            success: false,
            error: `File not found: ${pilotEditPath}. Use list_files to see available files.`,
            path: pilotEditPath,
            toolCallId: toolCall.id
          }
        }

        // Helper functions (simplified version of server-side logic)
        function escapeRegExp(string: string) {
          return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }

        function findNthOccurrence(content: string, searchText: string, n: number): number {
          let index = -1;
          for (let i = 0; i < n; i++) {
            index = content.indexOf(searchText, index + 1);
            if (index === -1) return -1;
          }
          return index;
        }

        function replaceNthOccurrence(content: string, searchText: string, replaceText: string, n: number): string {
          const index = findNthOccurrence(content, searchText, n);
          if (index === -1) return content;
          return content.substring(0, index) + replaceText + content.substring(index + searchText.length);
        }

        // Store original content for rollback
        const originalContent = editExistingFile.content;
        let modifiedContent = originalContent;
        const contentSnapshots: string[] = [originalContent];

        // Phase 1: Validation (simplified)
        const validationResults: Array<{
          blockIndex: number;
          canApply: boolean;
          reason?: string;
          occurrencesFound: number;
        }> = [];

        let tempContent = originalContent;
        for (let i = 0; i < searchReplaceBlocks.length; i++) {
          const block = searchReplaceBlocks[i];
          const searchText = block.search;
          const replaceText = block.replace;
          const replaceAll = block.replaceAll || false;
          const occurrenceIndex = block.occurrenceIndex;

          // Count occurrences in current temp content
          const occurrences = (tempContent.match(new RegExp(escapeRegExp(searchText), 'g')) || []).length;

          let canApply = true;
          let reason = '';

          if (occurrences === 0) {
            canApply = false;
            reason = 'Search text not found in content';
          } else if (occurrenceIndex && occurrenceIndex > occurrences) {
            canApply = false;
            reason = `Requested occurrence ${occurrenceIndex} but only ${occurrences} occurrences found`;
          }

          validationResults.push({
            blockIndex: i,
            canApply,
            reason,
            occurrencesFound: occurrences
          });

          // If this block can be applied, simulate the change for next validation
          if (canApply) {
            if (occurrenceIndex) {
              tempContent = replaceNthOccurrence(tempContent, searchText, replaceText, occurrenceIndex);
            } else if (replaceAll) {
              tempContent = tempContent.replaceAll(searchText, replaceText);
            } else {
              tempContent = tempContent.replace(searchText, replaceText);
            }
          }
        }

        // Check if any validations failed
        const failedValidations = validationResults.filter(r => !r.canApply);

        if (failedValidations.length > 0) {
          return {
            success: false,
            error: `Operation failed: ${failedValidations[0].reason}. All changes rolled back.`,
            path: pilotEditPath,
            toolCallId: toolCall.id,
            rollbackPerformed: true
          };
        }

        // Phase 2: Apply changes
        for (let i = 0; i < searchReplaceBlocks.length; i++) {
          const block = searchReplaceBlocks[i];
          const searchText = block.search;
          const replaceText = block.replace;
          const replaceAll = block.replaceAll || false;
          const occurrenceIndex = block.occurrenceIndex;

          // Apply the replacement
          if (occurrenceIndex) {
            modifiedContent = replaceNthOccurrence(modifiedContent, searchText, replaceText, occurrenceIndex);
          } else if (replaceAll) {
            modifiedContent = modifiedContent.replaceAll(searchText, replaceText);
          } else {
            modifiedContent = modifiedContent.replace(searchText, replaceText);
          }
        }

        // Update the file
        await storageManager.updateFile(projectId, pilotEditPath, { content: modifiedContent })

        return {
          success: true,
          message: `✅ File ${pilotEditPath} edited successfully.`,
          path: pilotEditPath,
          action: 'edited',
          toolCallId: toolCall.id
        }
        
      case 'pilotdelete':
        const { path: pilotDeletePath } = toolCall.args

        // Validate path
        if (!pilotDeletePath || typeof pilotDeletePath !== 'string') {
          return {
            success: false,
            error: `Invalid file path provided`,
            path: pilotDeletePath,
            toolCallId: toolCall.id
          }
        }

        // Check if file exists
        const deleteExistingFile = await storageManager.getFile(projectId, pilotDeletePath)

        if (!deleteExistingFile) {
          return {
            success: false,
            error: `File not found: ${pilotDeletePath}. Use list_files to see available files.`,
            path: pilotDeletePath,
            toolCallId: toolCall.id
          }
        }

        // Delete the file
        const result = await storageManager.deleteFile(projectId, pilotDeletePath)

        if (result) {
          return {
            success: true,
            message: `✅ File ${pilotDeletePath} deleted successfully.`,
            path: pilotDeletePath,
            action: 'deleted',
            toolCallId: toolCall.id
          }
        } else {
          return {
            success: false,
            error: `Failed to delete file ${pilotDeletePath}`,
            path: pilotDeletePath,
            toolCallId: toolCall.id
          }
        }
        
      case 'write_file':
        const { path: writeFilePath, content: writeFileContent } = toolCall.args
        const writeFileExistingFile = await storageManager.getFile(projectId, writeFilePath)
        
        if (writeFileExistingFile) {
          await storageManager.updateFile(projectId, writeFilePath, {
            content: writeFileContent || '',
            updatedAt: new Date().toISOString()
          })
          return { success: true, action: 'updated', path: writeFilePath, message: `File updated: ${writeFilePath}` }
        } else {
          const newFile = await storageManager.createFile({
            workspaceId: projectId,
            name: writeFilePath.split('/').pop() || writeFilePath,
            path: writeFilePath,
            content: writeFileContent || '',
            fileType: writeFilePath.split('.').pop() || 'text',
            type: writeFilePath.split('.').pop() || 'text',
            size: (writeFileContent || '').length,
            isDirectory: false
          })
          return { success: true, action: 'created', path: writeFilePath, file: newFile, message: `File created: ${writeFilePath}` }
        }
        
      case 'edit_file':
        const { path: editFilePath, content: editFileContent } = toolCall.args
        const editFileToEdit = await storageManager.getFile(projectId, editFilePath)
        if (editFileToEdit) {
          await storageManager.updateFile(projectId, editFilePath, {
            content: editFileContent || '',
            updatedAt: new Date().toISOString()
          })
          return { success: true, action: 'edited', path: editFilePath, message: `File edited: ${editFilePath}` }
        } else {
          throw new Error(`File not found: ${editFilePath}`)
        }
        
      case 'delete_file':
        const { path: deleteFilePath } = toolCall.args
        const deleteFileToDelete = await storageManager.getFile(projectId, deleteFilePath)
        if (deleteFileToDelete) {
          await storageManager.deleteFile(projectId, deleteFilePath)
          return { success: true, action: 'deleted', path: deleteFilePath, message: `File deleted: ${deleteFilePath}` }
        } else {
          throw new Error(`File not found: ${deleteFilePath}`)
        }
        
      case 'read_file':
        const { path: readPath } = toolCall.args
        const fileToRead = await storageManager.getFile(projectId, readPath)
        if (fileToRead) {
          return { 
            success: true, 
            path: readPath, 
            content: fileToRead.content,
            size: fileToRead.size,
            type: fileToRead.type,
            message: `File read: ${readPath}` 
          }
        } else {
          throw new Error(`File not found: ${readPath}`)
        }
        
      case 'list_files':
        const { path: listPath } = toolCall.args
        const allFiles = await storageManager.getFiles(projectId)
        let filteredFiles = allFiles
        
        if (listPath && listPath !== '/') {
          filteredFiles = allFiles.filter(f => f.path.startsWith(listPath))
        }
        
        return {
          success: true,
          files: filteredFiles.map(f => ({
            path: f.path,
            name: f.name,
            type: f.type,
            size: f.size,
            isDirectory: f.isDirectory,
            createdAt: f.createdAt
          })),
          count: filteredFiles.length,
          message: `Found ${filteredFiles.length} files`
        }
        
      case 'search_files':
        const { query, path: searchPath } = toolCall.args
        const searchFiles = await storageManager.getFiles(projectId)
        const searchResults = searchFiles.filter(f => 
          f.name.toLowerCase().includes(query.toLowerCase()) ||
          f.path.toLowerCase().includes(query.toLowerCase())
        )
        
        return {
          success: true,
          results: searchResults.map(f => ({
            path: f.path,
            name: f.name,
            type: f.type,
            size: f.size
          })),
          count: searchResults.length,
          query,
          message: `Found ${searchResults.length} files matching "${query}"`
        }
        
      case 'grep_search':
        const { pattern, path: grepPath } = toolCall.args
        const grepFiles = await storageManager.getFiles(projectId)
        const grepResults = []
        
        for (const file of grepFiles) {
          if (file.content && file.content.includes(pattern)) {
            const lines = file.content.split('\n')
            const matchingLines = lines
              .map((line, index) => ({ line, lineNumber: index + 1 }))
              .filter(({ line }) => line.includes(pattern))
            
            if (matchingLines.length > 0) {
              grepResults.push({
                path: file.path,
                name: file.name,
                matches: matchingLines,
                count: matchingLines.length
              })
            }
          }
        }
        
        return {
          success: true,
          results: grepResults,
          count: grepResults.length,
          pattern,
          message: `Found ${grepResults.length} files containing "${pattern}"`
        }

      default:
        throw new Error(`Unsupported tool: ${toolCall.name}`)
    }
  } catch (error) {
    console.error('[CLIENT-TOOL] Tool execution failed:', error)
    throw error
  }
}

// Enhanced XML tool detection and parsing
function detectXMLTools(content: string): XMLToolCall[] {
  const detectedTools: XMLToolCall[] = []

  // Reset all regex lastIndex to 0
  Object.values(XML_TOOL_PATTERNS).forEach(regex => regex.lastIndex = 0)

  console.log('[DEBUG] detectXMLTools called with content length:', content.length)
  console.log('[DEBUG] Content preview:', content.substring(0, 200))

  // Also check for XML wrapped in code blocks
  const codeBlockPattern = /```(?:xml)?\s*([\s\S]*?)```/g
  let codeBlockMatch
  while ((codeBlockMatch = codeBlockPattern.exec(content)) !== null) {
    console.log('[DEBUG] Found code block with XML:', codeBlockMatch[1].substring(0, 100))
    // Process the content inside the code block (without recursion)
    const codeBlockContent = codeBlockMatch[1]
    for (const [toolName, pattern] of Object.entries(XML_TOOL_PATTERNS)) {
      pattern.lastIndex = 0 // Reset regex
      let match
      while ((match = pattern.exec(codeBlockContent)) !== null) {
        console.log('[DEBUG] Found match in code block for', toolName, ':', match[1])
        // Process the match as normal
        const toolId = `${toolName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        const args: Record<string, any> = {}

        // Extract arguments based on tool type
        switch (toolName) {
          case 'pilotwrite':
            args.path = match[2]
            args.content = match[3] || ''
            break
          case 'pilotedit':
            args.path = match[2]
            // Parse the content to extract searchReplaceBlocks
            const editContent = match[3] || ''
            // Parse as searchReplaceBlocks format
            args.searchReplaceBlocks = [{
              search: editContent,
              replace: '',
              replaceAll: false
            }]
            break
          case 'pilotdelete':
            args.path = match[2]
            break
          // Additional tool patterns (if used elsewhere)
          case 'write_file':
          case 'edit_file':
            args.path = match[2]
            args.content = match[3] || ''
            break
          case 'delete_file':
          case 'read_file':
            args.path = match[2]
            break
          case 'list_files':
            args.path = match[2] || '/'
            break
          case 'create_directory':
          case 'delete_directory':
            args.path = match[2]
            break
          case 'search_files':
            args.query = match[2]
            args.path = match[3] || '/'
            break
          case 'grep_search':
            args.pattern = match[2]
            args.path = match[3] || '/'
            break
          case 'web_search':
            args.query = match[2]
            args.count = match[3] || '5'
            break
          case 'web_extract':
            args.url = match[2]
            args.selector = match[3] || ''
            break
          case 'analyze_code':
          case 'check_syntax':
            args.path = match[2]
            break
          case 'run_tests':
            args.path = match[2] || '/'
            break
          default:
            if (match[1]) args.path = match[1]
            if (match[2]) args.content = match[2]
        }

        detectedTools.push({
          id: toolId,
          name: toolName,
          args,
          status: 'detected',
          startTime: Date.now()
        })
      }
    }
  }

  console.log('[DEBUG] Raw content for debugging:', JSON.stringify(content))
  
  // Check each tool pattern
  for (const [toolName, pattern] of Object.entries(XML_TOOL_PATTERNS)) {
    console.log('[DEBUG] Checking pattern for:', toolName)
    let match
    while ((match = pattern.exec(content)) !== null) {
      console.log('[DEBUG] Found match for', toolName, ':', match[1])
      const toolId = `${toolName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const args: Record<string, any> = {}
      
      // Extract arguments based on tool type
      switch (toolName) {
        // Actual XML tags from chat route
        case 'pilotwrite':
          args.path = match[1]
          args.content = match[2] || ''
          break
        case 'pilotedit':
          args.path = match[1]
          args.operation = match[2]
          args.search = match[3]
          args.replace = match[4]
          break
        case 'pilotdelete':
          args.path = match[1]
          break
          
        // Additional tool patterns (if used elsewhere)
        case 'write_file':
        case 'edit_file':
          args.path = match[1]
          args.content = match[2] || ''
          break
        case 'delete_file':
        case 'read_file':
          args.path = match[1]
          break
        case 'list_files':
          args.path = match[1] || '/'
          break
        case 'create_directory':
        case 'delete_directory':
          args.path = match[1]
          break
        case 'search_files':
          args.query = match[1]
          args.path = match[2] || '/'
          break
        case 'grep_search':
          args.pattern = match[1]
          args.path = match[2] || '/'
          break
        case 'web_search':
          args.query = match[1]
          args.count = match[2] || '5'
          break
        case 'web_extract':
          args.url = match[1]
          args.selector = match[2] || ''
          break
        case 'analyze_code':
        case 'check_syntax':
          args.path = match[1]
          break
        case 'run_tests':
          args.path = match[1] || '/'
          break
      }
      
      detectedTools.push({
        id: toolId,
        name: toolName,
        args,
        status: 'detected',
        startTime: Date.now()
      })
    }
  }
  
  return detectedTools
}

// Check if XML tool is complete (has closing tag)
function isXMLToolComplete(content: string, toolName: string): boolean {
  const closingPattern = XML_TOOL_CLOSING_PATTERNS[toolName as keyof typeof XML_TOOL_CLOSING_PATTERNS]
  if (!closingPattern) return false
  
  // Reset regex lastIndex
  closingPattern.lastIndex = 0
  return closingPattern.test(content)
}

// Extract content between XML tool tags
function extractXMLToolContent(content: string, toolName: string): string {
  const openingPattern = XML_TOOL_PATTERNS[toolName as keyof typeof XML_TOOL_PATTERNS]
  const closingPattern = XML_TOOL_CLOSING_PATTERNS[toolName as keyof typeof XML_TOOL_CLOSING_PATTERNS]
  
  if (!openingPattern || !closingPattern) return ''
  
  // Reset regex lastIndex
  openingPattern.lastIndex = 0
  closingPattern.lastIndex = 0
  
  const openingMatch = openingPattern.exec(content)
  const closingMatch = closingPattern.exec(content)
  
  if (openingMatch && closingMatch) {
    return content.slice(
      openingMatch.index + openingMatch[0].length,
      closingMatch.index
    ).trim()
  }
  
  return ''
}

// Generate unique placeholder token for XML blocks
function generateXMLPlaceholder(toolId: string): string {
  return `{{XML_TOOL_${toolId}}}`
}

// Extract XML blocks and replace with placeholders
function extractAndReplaceXMLBlocks(content: string, detectedTools: XMLToolCall[]): { content: string; placeholders: Array<{ token: string; tool: XMLToolCall }> } {
  let processedContent = content
  const placeholders: Array<{ token: string; tool: XMLToolCall }> = []

  // Reset all regex lastIndex to 0
  Object.values(XML_TOOL_PATTERNS).forEach(regex => regex.lastIndex = 0)

  // Process each tool pattern
  for (const [toolName, pattern] of Object.entries(XML_TOOL_PATTERNS)) {
    pattern.lastIndex = 0 // Reset regex
    let match: RegExpExecArray | null

    while ((match = pattern.exec(content)) !== null) {
      if (!match || !match[2]) continue
      // Type assertion to fix TypeScript null issues
      const safeMatch = match as RegExpExecArray & { [key: number]: string }

      const tool = detectedTools.find(t =>
        t.name === toolName &&
        t.args.path === safeMatch[2] &&
        (toolName !== 'pilotedit' || safeMatch[3] === undefined || (safeMatch[3] !== null && JSON.stringify(t.args.searchReplaceBlocks) === JSON.stringify(safeMatch[3])))
      ) as any

      if (tool && safeMatch && safeMatch[0] && safeMatch[2]) {
        const token = generateXMLPlaceholder(tool.id)
        processedContent = processedContent.replace(safeMatch[0], token)
        placeholders.push({ token, tool })
      }
    }
  }

  return { content: processedContent, placeholders }
}


// Render inline content with XML tool pills (simple text-based approach)
function renderInlineContent(content: string, placeholders: Array<{ token: string; tool: XMLToolCall }>): string {
  if (!placeholders || placeholders.length === 0) {
    return content
  }

  // Split content by placeholders and render pills inline
  const parts = content.split(/(\{\{XML_TOOL_[^}]+\}\})/g)
  const elements: string[] = []

  parts.forEach((part, index) => {
    const placeholder = placeholders.find(p => p.token === part)
    if (placeholder) {
      // Render the pill as a simple placeholder - will be replaced by actual pills later
      elements.push(`[XML_TOOL_${placeholder.tool.id}]`)
    } else {
      // Render regular text content
      if (part.trim()) {
        elements.push(part)
      }
    }
  })

  return elements.join('')
}

// Render message content with pills for ReactMarkdown
function renderMessageContentWithPills(content: string, placeholders: Array<{ token: string; tool: XMLToolCall }>): string {
  if (!placeholders || placeholders.length === 0) {
    return content
  }

  // Split content by placeholders and create markdown with pill markers
  const parts = content.split(/(\[XML_TOOL_[^]]+\])/g)
  const elements: string[] = []

  parts.forEach((part, index) => {
    const toolIdMatch = part.match(/\[XML_TOOL_([^]]+)\]/)
    if (toolIdMatch) {
      const toolId = toolIdMatch[1]
      const placeholder = placeholders.find(p => p.tool.id === toolId)
      if (placeholder) {
        // Create a markdown comment that will be replaced by the pill
        elements.push(`<!-- XML_TOOL_${toolId} -->`)
      }
    } else {
      // Keep regular text content
      if (part.trim()) {
        elements.push(part)
      }
    }
  })

  return elements.join('')
}

// Clean content by removing XML tool tags
function cleanXMLToolTags(content: string): string {
  let cleaned = content
  
  // Remove all XML tool opening and closing tags
  Object.values(XML_TOOL_PATTERNS).forEach(pattern => {
    // Reset regex lastIndex
    pattern.lastIndex = 0
    cleaned = cleaned.replace(pattern, '')
  })
  
  Object.values(XML_TOOL_CLOSING_PATTERNS).forEach(pattern => {
    // Reset regex lastIndex
    pattern.lastIndex = 0
    cleaned = cleaned.replace(pattern, '')
  })
  
  // Also remove any remaining XML tool tags that might have been missed
  const xmlTagRegex = /<(pilotwrite|pilotedit|pilotdelete|write_file|edit_file|delete_file|read_file|list_files|search_files|grep_search|web_search|web_extract|analyze_code|check_syntax|run_tests|create_directory|delete_directory)[^>]*>[\s\S]*?<\/\1>/g
  cleaned = cleaned.replace(xmlTagRegex, '')
  
  // Clean up extra whitespace and newlines
  cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n')
  
  return cleaned.trim()
}

// Legacy function for backward compatibility
async function executeXMLCommandClientSide(xmlCommand: any, projectId: string) {
  // Convert legacy format to new format
  const toolCall: XMLToolCall = {
    id: xmlCommand.id || `legacy-${Date.now()}`,
    name: xmlCommand.command,
    args: {
      path: xmlCommand.path,
      content: xmlCommand.content
    },
    status: 'executing',
    startTime: Date.now()
  }
  
  return executeClientSideTool(toolCall, projectId)
}

// ToolPill component for displaying server-side tool results
const ToolPill = ({ toolCall, status = 'completed' }: { toolCall: any, status?: 'executing' | 'completed' | 'failed' }) => {
  const getToolIcon = (toolName: string) => {
    switch (toolName) {
      case 'write_file': return FileText
      case 'edit_file': return Edit3
      case 'read_file': return Eye
      case 'list_files': return FolderOpen
      case 'delete_file': return X
      case 'web_search': return Globe
      case 'web_extract': return FileSearch
      case 'search_knowledge': return BookOpen
      case 'get_knowledge_item': return BookOpen
      case 'recall_context': return User
      case 'analyze_dependencies': return Zap
      case 'scan_code_imports': return AlertTriangle
      case 'learn_patterns': return Undo2
      default: return Wrench
    }
  }

  const getToolAction = (toolName: string) => {
    switch (toolName) {
      case 'write_file': return 'Created'
      case 'edit_file': return 'Modified'
      case 'read_file': return 'Read'
      case 'list_files': return 'Listed'
      case 'delete_file': return 'Deleted'
      case 'web_search': return 'Searched'
      case 'web_extract': return 'Extracted'
      case 'search_knowledge': return 'Knowledge Searched'
      case 'get_knowledge_item': return 'Knowledge Retrieved'
      case 'recall_context': return 'Context Recalled'
      case 'analyze_dependencies': return 'Dependencies Analyzed'
      case 'scan_code_imports': return 'Imports Scanned'
      case 'learn_patterns': return 'Patterns Learned'
      default: return 'Executed'
    }
  }

  const isSuccess = toolCall.result?.success !== false
  const fileName = toolCall.result?.path?.split('/').pop() || toolCall.result?.path || 'file'
  const fileCount = toolCall.result?.count || (toolCall.result?.files?.length)
  
  // Special handling for web search tools
  const searchQuery = toolCall.result?.query || 'web search'
  const urlCount = Array.isArray(toolCall.result?.urls) ? toolCall.result.urls.length : 
                   toolCall.result?.urls ? 1 : 0

  const IconComponent = getToolIcon(toolCall.name)

  
  // Special handling for web_search tool
  if (toolCall.name === 'web_search') {
    const [isExpanded, setIsExpanded] = useState(false)
    
    // Debug logging to see the actual structure
    console.log('[DEBUG] web_search tool result:', toolCall.result)
    
    const webResultCount = toolCall.result?.metadata?.resultCount || toolCall.result?.results?.length || 0
    const webCleanResults = toolCall.result?.cleanResults || toolCall.result?.results || []
    
    return (
      <div className="bg-background border rounded-lg shadow-sm mb-3 overflow-hidden">
        {/* Header - Clickable to toggle */}
        <div
          className={`px-4 py-3 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
          isSuccess
            ? 'bg-muted border-l-4 border-l-blue-500'
            : 'bg-red-900/20 border-l-4 border-l-red-500'
          }`}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${
            isSuccess ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white' : 'bg-red-500 text-white'
          }`}>
            <IconComponent className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">Web Search</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>{webResultCount} results found</span>
              <span>•</span>
                <span>{isSuccess ? 'Success' : 'Failed'}</span>
            </div>
          </div>
            {/* Chevron indicator */}
            <div className="ml-2">
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </div>
        </div>
        
        {/* Search Results Content - Collapsible */}
        {isSuccess && isExpanded && (
          <div className="p-4 bg-background border-t">
            <div className="max-h-96 overflow-y-auto">
              {/* Query Header */}
              <div className="mb-4">
                <h2 className="text-lg font-bold text-white mb-2">Search Query</h2>
                <p className="text-gray-300 text-sm bg-gray-800 px-3 py-2 rounded border border-gray-600">
                  "{searchQuery}"
                </p>
              </div>
              
              {/* Results Content */}
              {webCleanResults ? (
                <div className="prose prose-sm max-w-none">
                  <h3 className="text-base font-bold text-white mb-3">Search Results</h3>
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ children }) => (
                        <h1 className="text-lg font-bold mb-3 text-white">{children}</h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-base font-bold mb-2 text-white">{children}</h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-sm font-bold mb-2 text-white">{children}</h3>
                      ),
                      p: ({ children }) => (
                        <p className="text-white leading-[1.5] mb-2 font-medium">{children}</p>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-none space-y-1 text-white mb-3">{children}</ul>
                      ),
                      li: ({ children }) => (
                        <li className="text-white">{children}</li>
                      ),
                      code: ({ children }) => (
                        <code className="bg-gray-600 px-1 py-0.5 rounded text-xs font-mono text-white">{children}</code>
                      ),
                      hr: () => (
                        <hr className="my-4 border-gray-600" />
                      )
                    }}
                  >
                    {webCleanResults}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="text-muted-foreground text-sm">
                  No search results available to display.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }
  
  // Special handling for web_extract tool
  if (toolCall.name === 'web_extract') {
    const [isExpanded, setIsExpanded] = useState(false)
    
    // Debug logging to see the actual structure
    console.log('[DEBUG] web_extract tool result:', toolCall.result)
    
    const extractCleanResults = toolCall.result?.cleanResults || toolCall.result?.results || []
    const extractUrlCount = toolCall.result?.metadata?.urlCount || toolCall.result?.metadata?.contentCount || toolCall.result?.urls?.length || 0
    
    return (
      <div className="bg-background border rounded-lg shadow-sm mb-3 overflow-hidden">
        {/* Header - Clickable to toggle */}
        <div
          className={`px-4 py-3 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
          isSuccess
            ? 'bg-muted border-l-4 border-l-purple-500'
            : 'bg-red-900/20 border-l-4 border-l-red-500'
          }`}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${
            isSuccess ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white' : 'bg-red-500 text-white'
          }`}>
            <IconComponent className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">Content Extraction</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>{extractUrlCount} URL{extractUrlCount !== 1 ? 's' : ''} processed</span>
              <span>•</span>
                <span>{isSuccess ? 'Success' : 'Failed'}</span>
            </div>
          </div>
            {/* Chevron indicator */}
            <div className="ml-2">
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </div>
        </div>
        
        {/* Extracted Content - Collapsible */}
        {isSuccess && isExpanded && (
          <div className="p-4 bg-background border-t">
            <div className="max-h-96 overflow-y-auto">
              {/* URLs Header */}
              <div className="mb-4">
                <h2 className="text-lg font-bold text-white mb-2">Processed URLs</h2>
                <div className="space-y-2">
                  {(toolCall.result?.urls || []).map((url: string, index: number) => (
                    <div key={index} className="text-gray-300 text-sm bg-gray-800 px-3 py-2 rounded border border-gray-600">
                      {url}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Results Content */}
              {extractCleanResults ? (
                <div className="prose prose-sm max-w-none">
                  <h3 className="text-base font-bold text-white mb-3">Extracted Content</h3>
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ children }) => (
                        <h1 className="text-lg font-bold mb-3 text-white">{children}</h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-base font-bold mb-2 text-white">{children}</h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-sm font-bold mb-2 text-white">{children}</h3>
                      ),
                      p: ({ children }) => (
                        <p className="text-white leading-[1.5] mb-2 font-medium">{children}</p>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-none space-y-1 text-white mb-3">{children}</ul>
                      ),
                      li: ({ children }) => (
                        <li className="text-white">{children}</li>
                      ),
                      code: ({ children }) => (
                        <code className="bg-gray-600 px-1 py-0.5 rounded text-xs font-mono text-white">{children}</code>
                      ),
                      hr: () => (
                        <hr className="my-4 border-gray-600" />
                      )
                    }}
                  >
                    {extractCleanResults}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="text-muted-foreground text-sm">
                  No extracted content available to display.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Special handling for list_files tool
  if (toolCall.name === 'list_files') {
    const [isExpanded, setIsExpanded] = useState(false)
    const files = toolCall.result?.files || toolCall.result?.results || []

    return (
      <div className="bg-background border rounded-lg shadow-sm mb-3 overflow-hidden">
        {/* Header - Clickable to toggle */}
        <div
          className={`px-4 py-3 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
            isSuccess
              ? 'bg-muted border-l-4 border-l-primary'
              : 'bg-red-900/20 border-l-4 border-l-red-500'
          }`}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${
              isSuccess ? 'bg-gradient-to-r from-[#00c853] to-[#4caf50] text-white' : 'bg-red-500 text-white'
            }`}>
              <IconComponent className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">File Listing</span>
                {fileCount && (
                  <span className="text-xs text-muted-foreground">({fileCount} files)</span>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>{getToolAction(toolCall.name)}</span>
                <span>•</span>
                <span>{isSuccess ? 'Completed' : 'Failed'}</span>
              </div>
            </div>
            {/* Chevron indicator */}
            <div className="ml-2">
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </div>
        
        {/* Files Table - Collapsible */}
        {isSuccess && isExpanded && (
          <div className="p-4 bg-background border-t">
            <div className="max-h-96 overflow-y-auto">
              {files && files.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-600">
                        <th className="text-left py-2 px-3 text-white font-medium">Name</th>
                        <th className="text-left py-2 px-3 text-white font-medium">Path</th>
                        <th className="text-left py-2 px-3 text-white font-medium">Type</th>
                        <th className="text-left py-2 px-3 text-white font-medium">Size</th>
                        <th className="text-left py-2 px-3 text-white font-medium">Modified</th>
                      </tr>
                    </thead>
                    <tbody>
                      {files.map((file: any, index: number) => (
                        <tr key={index} className="border-b border-gray-700 hover:bg-gray-700/30">
                          <td className="py-2 px-3 text-white">
                            <div className="flex items-center gap-2">
                              {file.isDirectory ? (
                                <FolderOpen className="w-4 h-4 text-blue-400" />
                              ) : (
                                <FileText className="w-4 h-4 text-gray-400" />
                              )}
                              {file.name || file.path?.split('/').pop() || 'Unknown'}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-gray-300 text-xs font-mono">
                            {file.path || 'N/A'}
                          </td>
                          <td className="py-2 px-3 text-gray-300">
                            {file.isDirectory ? 'Directory' : (file.type || file.fileType || 'Unknown')}
                          </td>
                          <td className="py-2 px-3 text-gray-300">
                            {file.isDirectory ? '-' : (file.size ? `${file.size} chars` : 'N/A')}
                          </td>
                          <td className="py-2 px-3 text-gray-300 text-xs">
                            {file.updatedAt || file.createdAt ? 
                              new Date(file.updatedAt || file.createdAt).toLocaleDateString() : 
                              'N/A'
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-muted-foreground text-sm">
                  No files found to display.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Special handling for read_file tool
  if (toolCall.name === 'read_file') {
    const [isExpanded, setIsExpanded] = useState(false)
    const filePath = toolCall.result?.path || toolCall.args?.path || 'Unknown file'
    const fileContent = toolCall.result?.content || ''
    const fileExtension = filePath.split('.').pop() || 'text'
    
    return (
      <div className="bg-background border rounded-lg shadow-sm mb-3 overflow-hidden">
        {/* Header - Clickable to toggle */}
        <div
          className={`px-4 py-3 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
            isSuccess
              ? 'bg-muted border-l-4 border-l-primary'
              : 'bg-red-900/20 border-l-4 border-l-red-500'
          }`}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${
              isSuccess ? 'bg-gradient-to-r from-[#00c853] to-[#4caf50] text-white' : 'bg-red-500 text-white'
            }`}>
              <IconComponent className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">File Read</span>
                <span className="text-xs text-muted-foreground">({filePath})</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>{getToolAction(toolCall.name)}</span>
                <span>•</span>
                <span>{isSuccess ? 'Completed' : 'Failed'}</span>
              </div>
            </div>
            {/* Chevron indicator */}
            <div className="ml-2">
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </div>
        
        {/* File Content - Collapsible with Syntax Highlighting */}
        {isSuccess && isExpanded && (
          <div className="p-4 bg-background border-t">
            <div className="max-h-96 overflow-y-auto">
              {fileContent ? (
                <div className="bg-gray-800 border border-gray-600 rounded-lg overflow-hidden">
                  <div className="px-3 py-2 bg-gray-700 border-b border-gray-600 text-xs font-medium text-white">
                    {filePath} • {fileExtension}
                  </div>
                  <pre className="p-4 overflow-x-auto bg-[#1e1e1e]">
                    <code className={`hljs language-${fileExtension} text-sm text-white`}>
                      {fileContent}
                    </code>
                  </pre>
                </div>
              ) : (
                <div className="text-muted-foreground text-sm">
                  No file content available to display.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Special handling for recall_context tool
  if (toolCall.name === 'recall_context') {
    const [isExpanded, setIsExpanded] = useState(false)
    const context = toolCall.result || {}
    
    return (
      <div className="bg-background border rounded-lg shadow-sm mb-3 overflow-hidden">
        {/* Header - Clickable to toggle */}
        <div
          className={`px-4 py-3 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
            isSuccess
              ? 'bg-muted border-l-4 border-l-primary'
              : 'bg-red-900/20 border-l-4 border-l-red-500'
          }`}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${
              isSuccess ? 'bg-gradient-to-r from-[#00c853] to-[#4caf50] text-white' : 'bg-red-500 text-white'
            }`}>
              <IconComponent className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">Context Recall</span>
                <span className="text-xs text-muted-foreground">({context.count || 0} messages)</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>{getToolAction(toolCall.name)}</span>
                <span>•</span>
                <span>{isSuccess ? 'Completed' : 'Failed'}</span>
              </div>
            </div>
            {/* Chevron indicator */}
            <div className="ml-2">
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </div>
        
        {/* Context Content - Collapsible */}
        {isSuccess && isExpanded && (
          <div className="p-4 bg-background border-t">
            <div className="max-h-96 overflow-y-auto">
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => (
                      <h1 className="text-lg font-bold mb-3 text-white">{children}</h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-base font-bold mb-2 text-white">{children}</h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-sm font-bold mb-2 text-white">{children}</h3>
                    ),
                    p: ({ children }) => (
                      <p className="text-white leading-[1.5] mb-2 font-medium">{children}</p>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-none space-y-1 text-white mb-3">{children}</ul>
                    ),
                    li: ({ children }) => (
                      <li className="text-white">{children}</li>
                    ),
                    code: ({ children }) => (
                      <code className="bg-gray-600 px-1 py-0.5 rounded text-xs font-mono text-white">{children}</code>
                    ),
                    hr: () => (
                      <hr className="my-4 border-gray-600" />
                    )
                  }}
                >
                  {context.summary || 'Context recalled successfully.'}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Special handling for learn_patterns tool
  if (toolCall.name === 'learn_patterns') {
    const [isExpanded, setIsExpanded] = useState(false)
    const patterns = toolCall.result || {}
    
    return (
      <div className="bg-background border rounded-lg shadow-sm mb-3 overflow-hidden">
        {/* Header - Clickable to toggle */}
        <div
          className={`px-4 py-3 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
            isSuccess
              ? 'bg-muted border-l-4 border-l-primary'
              : 'bg-red-900/20 border-l-4 border-l-red-500'
          }`}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${
              isSuccess ? 'bg-gradient-to-r from-[#00c853] to-[#4caf50] text-white' : 'bg-red-500 text-white'
            }`}>
              <IconComponent className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">Pattern Learning</span>
                <span className="text-xs text-muted-foreground">({patterns.analysis?.type || 'all'})</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>{getToolAction(toolCall.name)}</span>
                <span>•</span>
                <span>{isSuccess ? 'Completed' : 'Failed'}</span>
              </div>
            </div>
            {/* Chevron indicator */}
            <div className="ml-2">
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </div>
        
        {/* Pattern Analysis - Collapsible */}
        {isSuccess && isExpanded && (
          <div className="p-4 bg-background border-t">
            <div className="max-h-96 overflow-y-auto">
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => (
                      <h1 className="text-lg font-bold mb-3 text-white">{children}</h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-base font-bold mb-2 text-white">{children}</h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-sm font-bold mb-2 text-white">{children}</h3>
                    ),
                    p: ({ children }) => (
                      <p className="text-white leading-[1.5] mb-2 font-medium">{children}</p>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-none space-y-1 text-white mb-3">{children}</ul>
                    ),
                    li: ({ children }) => (
                      <li className="text-white">{children}</li>
                    ),
                    code: ({ children }) => (
                      <code className="bg-gray-600 px-1 py-0.5 rounded text-xs font-mono text-white">{children}</code>
                    ),
                    hr: () => (
                      <hr className="my-4 border-gray-600" />
                    )
                  }}
                >
                  {patterns.analysis?.report || 'Pattern analysis completed successfully.'}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Special handling for analyze_dependencies tool
  if (toolCall.name === 'analyze_dependencies') {
    const [isExpanded, setIsExpanded] = useState(false)
    const analysis = toolCall.result?.analysis || {}
    const filePath = analysis.filePath || 'Unknown file'
    const missingDeps = analysis.missingDependencies || []
    const addedDeps = analysis.addedDependencies || []
    
    return (
      <div className="bg-background border rounded-lg shadow-sm mb-3 overflow-hidden">
        <div 
          className="px-3 py-2 flex items-center gap-3 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="p-1.5 rounded-md bg-yellow-100 dark:bg-yellow-900/30">
            <Zap className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">Dependencies Analyzed</span>
              <span className="text-xs text-muted-foreground">({filePath})</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {missingDeps.length > 0 ? (
                <span className="text-orange-600 dark:text-orange-400">
                  {addedDeps.length > 0 ? `Auto-added ${addedDeps.length} dependencies` : `Found ${missingDeps.length} missing dependencies`}
                </span>
              ) : (
                <span className="text-green-600 dark:text-green-400">All dependencies valid</span>
              )}
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </div>
        
        {isExpanded && (
          <div className="border-t bg-muted/30 p-3">
            <div className="space-y-2 text-sm">
              {addedDeps.length > 0 && (
                <div>
                  <div className="font-medium text-green-600 dark:text-green-400 mb-1">✅ Auto-Added Dependencies:</div>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                    {addedDeps.map((dep: string, index: number) => (
                      <li key={index}>{dep}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {missingDeps.length > 0 && addedDeps.length === 0 && (
                <div>
                  <div className="font-medium text-orange-600 dark:text-orange-400 mb-1">⚠️ Missing Dependencies:</div>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                    {missingDeps.map((dep: any, index: number) => (
                      <li key={index}>{dep.package}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {analysis.suggestions?.length > 0 && (
                <div>
                  <div className="font-medium text-blue-600 dark:text-blue-400 mb-1">🔧 Suggestions:</div>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                    {analysis.suggestions.map((suggestion: string, index: number) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Special handling for scan_code_imports tool
  if (toolCall.name === 'scan_code_imports') {
    const [isExpanded, setIsExpanded] = useState(false)
    const analysis = toolCall.result?.analysis || {}
    const filePath = analysis.filePath || 'Unknown file'
    const issues = analysis.issues || []
    const imports = analysis.imports || []
    
    return (
      <div className="bg-background border rounded-lg shadow-sm mb-3 overflow-hidden">
        <div 
          className="px-3 py-2 flex items-center gap-3 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="p-1.5 rounded-md bg-orange-100 dark:bg-orange-900/30">
            <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">Code Imports Scanned</span>
              <span className="text-xs text-muted-foreground">({filePath})</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {issues.length > 0 ? (
                <span className="text-red-600 dark:text-red-400">
                  Found {issues.length} import/export issues
                </span>
              ) : (
                <span className="text-green-600 dark:text-green-400">All imports/exports valid</span>
              )}
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </div>
        
        {isExpanded && (
          <div className="border-t bg-muted/30 p-3">
            <div className="space-y-2 text-sm">
              {issues.length > 0 ? (
                <div>
                  <div className="font-medium text-red-600 dark:text-red-400 mb-1">❌ Import/Export Issues:</div>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                    {issues.map((issue: any, index: number) => (
                      <li key={index}>
                        <span className="font-medium">{issue.type}:</span> {issue.message}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="text-green-600 dark:text-green-400">
                  ✅ All {imports.length} imports validated successfully
                </div>
              )}
              
              {analysis.summary && (
                <div className="text-muted-foreground text-xs mt-2">
                  {analysis.summary}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }


  // Special handling for write_file and edit_file tools
  if (toolCall.name === 'write_file' || toolCall.name === 'edit_file') {
    const [isExpanded, setIsExpanded] = useState(false)
    const filePath = toolCall.result?.path || toolCall.args?.path || 'Unknown file'
    const fileContent = toolCall.result?.content || toolCall.args?.content || ''
    const fileExtension = filePath.split('.').pop() || 'text'
    
    return (
      <div className="bg-background border rounded-lg shadow-sm mb-3 overflow-hidden">
        {/* Header - Clickable to toggle */}
        <div
          className={`px-4 py-3 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
            isSuccess
              ? 'bg-muted border-l-4 border-l-primary'
              : 'bg-red-900/20 border-l-4 border-l-red-500'
          }`}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${
              isSuccess ? 'bg-gradient-to-r from-[#00c853] to-[#4caf50] text-white' : 'bg-red-500 text-white'
            }`}>
              <IconComponent className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">
                  {toolCall.name === 'write_file' ? 'File Created' : 'File Modified'}
                </span>
                <span className="text-xs text-muted-foreground">({filePath})</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>{getToolAction(toolCall.name)}</span>
                <span>•</span>
                <span>{isSuccess ? 'Completed' : 'Failed'}</span>
              </div>
            </div>
            {/* Chevron indicator */}
            <div className="ml-2">
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </div>
        
        {/* File Content - Collapsible with Syntax Highlighting */}
        {isSuccess && isExpanded && (
          <div className="p-4 bg-background border-t">
            <div className="max-h-96 overflow-y-auto">
              {fileContent ? (
                <div className="bg-gray-800 border border-gray-600 rounded-lg overflow-hidden">
                  <div className="px-3 py-2 bg-gray-700 border-b border-gray-600 text-xs font-medium text-white">
                    {filePath} • {fileExtension}
                  </div>
                  <pre className="p-4 overflow-x-auto bg-[#1e1e1e]">
                    <code className={`hljs language-${fileExtension} text-sm text-white`}>
                      {fileContent}
                    </code>
                  </pre>
                </div>
              ) : (
                <div className="text-muted-foreground text-sm">
                  No file content available to display.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Regular tool pill for other tools
  return (
    <div className="bg-background border rounded-lg shadow-sm mb-2 overflow-hidden">
      <div className={`px-3 py-2 flex items-center gap-3 ${
        isSuccess
          ? 'bg-muted border-l-4 border-l-primary'
          : 'bg-red-900/20 border-l-4 border-l-red-500'
      }`}>
        <div className={`p-2 rounded-full ${
          isSuccess ? 'bg-gradient-to-r from-[#00c853] to-[#4caf50] text-white' : 'bg-red-500 text-white'
        }`}>
          <IconComponent className={`w-4 h-4`} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">{fileName}</span>
            {fileCount && (
              <span className="text-xs text-muted-foreground">({fileCount} files)</span>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>{getToolAction(toolCall.name)}</span>
            <span>•</span>
            <span>{isSuccess ? 'Applied' : 'Failed'}</span>
          </div>
        </div>
        <div className={`p-1 rounded-full ${isSuccess ? 'bg-green-500' : 'bg-red-500'}`}>
          {isSuccess ? (
            <Check className="w-4 h-4 text-white" />
          ) : (
            <X className="w-4 h-4 text-white" />
          )}
        </div>
      </div>
    </div>
  )
}

// XMLCommandPill component for displaying XML command status with real-time updates
const XMLCommandPill = ({ 
  command, 
  status = 'pending',
  filePath = '',
  error = null 
}: { 
  command: 'pilotwrite' | 'pilotedit' | 'pilotdelete'
  status?: 'pending' | 'executing' | 'completed' | 'failed'
  filePath?: string
  error?: string | null 
}) => {
  const [isExpanded, setIsExpanded] = useState(false)

  const getCommandIcon = (cmd: string) => {
    switch (cmd) {
      case 'pilotwrite': return FileText
      case 'pilotedit': return Edit3
      case 'pilotdelete': return Trash2
      default: return Wrench
    }
  }

  const getCommandLabel = (cmd: string) => {
    switch (cmd) {
      case 'pilotwrite': return 'Creating File'
      case 'pilotedit': return 'Editing File'
      case 'pilotdelete': return 'Deleting File'
      default: return 'Processing'
    }
  }

  const getStatusLabel = (cmd: string, status: string) => {
    if (status === 'failed') return 'Failed'
    if (status === 'completed') {
      switch (cmd) {
        case 'pilotwrite': return 'Created'
        case 'pilotedit': return 'Edited'
        case 'pilotdelete': return 'Deleted'
        default: return 'Completed'
      }
    }
    if (status === 'executing') {
      switch (cmd) {
        case 'pilotwrite': return 'Creating...'
        case 'pilotedit': return 'Editing...'
        case 'pilotdelete': return 'Deleting...'
        default: return 'Processing...'
      }
    }
    return 'Pending'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'border-l-green-500 bg-green-900/10'
      case 'failed': return 'border-l-red-500 bg-red-900/20'
      case 'executing': return 'border-l-blue-500 bg-blue-900/10'
      default: return 'border-l-yellow-500 bg-yellow-900/10'
    }
  }

  const getIconColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
      case 'failed': return 'bg-red-500 text-white'
      case 'executing': return 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
      default: return 'bg-gradient-to-r from-yellow-500 to-orange-600 text-white'
    }
  }

  const IconComponent = getCommandIcon(command)
  const fileName = filePath.split('/').pop() || filePath

  return (
    <div className="bg-background border rounded-lg shadow-sm mb-3 overflow-hidden">
      {/* Header - Clickable to toggle */}
      <div
        className={`px-4 py-3 border-b cursor-pointer hover:bg-muted/50 transition-colors border-l-4 ${getStatusColor(status)}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${getIconColor(status)} relative`}>
            <IconComponent className="w-4 h-4" />
            {status === 'executing' && (
              <div className="absolute inset-0 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            )}
            {status === 'pending' && (
              <Clock className="absolute -bottom-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full p-0.5 text-white" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">
                {getCommandLabel(command)}
              </span>
              {fileName && (
                <span className="text-xs text-muted-foreground">({fileName})</span>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>{getStatusLabel(command, status)}</span>
              {status !== 'pending' && (
                <>
                  <span>•</span>
                  <span className={
                    status === 'completed' ? 'text-green-400' :
                    status === 'failed' ? 'text-red-400' :
                    status === 'executing' ? 'text-blue-400' : 'text-yellow-400'
                  }>
                    {status === 'executing' ? 'In Progress' : 
                     status === 'completed' ? 'Success' :
                     status === 'failed' ? 'Error' : 'Queued'}
                  </span>
                </>
              )}
            </div>
          </div>
          {/* Chevron indicator */}
          <div className="ml-2">
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </div>
      
      {/* Content - Collapsible */}
      {isExpanded && (
        <div className="p-4 bg-background border-t">
          <div className="space-y-3">
            {/* File Path */}
            {filePath && (
              <div>
                <h4 className="text-sm font-medium text-foreground mb-1">File Path</h4>
                <code className="text-xs bg-muted px-2 py-1 rounded font-mono text-muted-foreground">
                  {filePath}
                </code>
              </div>
            )}
            
            {/* Status Details */}
            <div>
              <h4 className="text-sm font-medium text-foreground mb-1">Status</h4>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  status === 'completed' ? 'bg-green-500' :
                  status === 'failed' ? 'bg-red-500' :
                  status === 'executing' ? 'bg-blue-500' : 'bg-yellow-500'
                }`} />
                <span className="text-sm text-muted-foreground">
                  {getStatusLabel(command, status)}
                </span>
              </div>
            </div>
            
            {/* Error Details */}
            {error && status === 'failed' && (
              <div>
                <h4 className="text-sm font-medium text-red-400 mb-1">Error</h4>
                <div className="bg-red-900/20 border border-red-500/30 rounded p-2">
                  <code className="text-xs text-red-300 font-mono">{error}</code>
                </div>
              </div>
            )}
            
            {/* Command Type Info */}
            <div>
              <h4 className="text-sm font-medium text-foreground mb-1">Operation</h4>
              <span className="text-sm text-muted-foreground">
                {command === 'pilotwrite' ? 'File creation operation' :
                 command === 'pilotedit' ? 'File modification operation' :
                 command === 'pilotdelete' ? 'File deletion operation' : 'Unknown operation'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ExpandableAISummary component for long AI summary messages
const ExpandableAISummary = ({ content }: { content: string }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [shouldTruncate, setShouldTruncate] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const MAX_HEIGHT = 200 // Maximum height before truncation in pixels
  
  useEffect(() => {
    if (contentRef.current) {
      const element = contentRef.current
      // Create a temporary element to measure the full content height
      const tempDiv = document.createElement('div')
      tempDiv.style.cssText = getComputedStyle(element).cssText
      tempDiv.style.position = 'absolute'
      tempDiv.style.visibility = 'hidden'
      tempDiv.style.height = 'auto'
      tempDiv.style.maxHeight = 'none'
      tempDiv.style.width = element.offsetWidth + 'px'
      tempDiv.innerHTML = element.innerHTML
      document.body.appendChild(tempDiv)
      
      const fullHeight = tempDiv.scrollHeight
      document.body.removeChild(tempDiv)
      
      setShouldTruncate(fullHeight > MAX_HEIGHT)
    }
  }, [content])
  
  if (!shouldTruncate) {
    return (
      <div className="prose prose-sm max-w-none dark:prose-invert">
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => (
              <h1 className="text-lg font-bold mb-3 text-white">{children}</h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-base font-bold mb-2 text-white">{children}</h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-sm font-bold mb-2 text-white">{children}</h3>
            ),
            p: ({ children }) => (
              <p className="text-white leading-[1.5] mb-2 font-medium">{children}</p>
            ),
            ul: ({ children }) => (
              <ul className="list-none space-y-1 text-white mb-3">{children}</ul>
            ),
            li: ({ children }) => (
              <li className="text-white">{children}</li>
            ),
            code: ({ children }) => (
              <code className="bg-gray-600 px-1 py-0.5 rounded text-xs font-mono text-white">{children}</code>
            ),
            hr: () => (
              <hr className="my-4 border-gray-600" />
            )
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    )
  }
  
  return (
    <div className="relative">
      <div className="rounded-lg overflow-hidden relative">
        {/* Top gradient indicator when collapsed */}
        {!isExpanded && (
          <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-b from-gray-600 to-transparent pointer-events-none z-10" />
        )}
        
        <div 
          ref={contentRef}
          className={`transition-all duration-200 ${
            isExpanded ? 'max-h-[600px] overflow-y-auto' : 'max-h-[200px] overflow-hidden'
          }`}
        >
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => (
                  <h1 className="text-lg font-bold mb-3 text-white">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-base font-bold mb-2 text-white">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-sm font-bold mb-2 text-white">{children}</h3>
                ),
                p: ({ children }) => (
                  <p className="text-white leading-[1.5] mb-2 font-medium">{children}</p>
                ),
                ul: ({ children }) => (
                  <ul className="list-none space-y-1 text-white mb-3">{children}</ul>
                ),
                li: ({ children }) => (
                  <li className="text-white">{children}</li>
                ),
                code: ({ children }) => (
                  <code className="bg-gray-600 px-1 py-0.5 rounded text-xs font-mono text-white">{children}</code>
                ),
                hr: () => (
                  <hr className="my-4 border-gray-600" />
                )
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        </div>
        
        {/* Bottom gradient indicator when collapsed */}
        {!isExpanded && (
          <div className="absolute bottom-10 left-0 right-0 h-6 bg-gradient-to-t from-[#2e2e2e] via-[#2e2e2e]/80 to-transparent pointer-events-none z-10" />
        )}
        
        {/* Expand/Collapse trigger */}
        <div 
          className="flex items-center justify-center px-4 py-2 border-t border-gray-600 hover:bg-gray-600 transition-colors cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span className="text-xs text-gray-400 mr-2">
            {isExpanded ? 'Show less' : 'Show more'}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-3 h-3 text-gray-400" />
          ) : (
            <ChevronDown className="w-3 h-3 text-gray-400" />
          )}
        </div>
      </div>
    </div>
  )
}

// FloatingScrollToBottom component for smooth scrolling to latest message
const FloatingScrollToBottom = ({
  isVisible,
  onClick,
  isMobile = false
}: {
  isVisible: boolean
  onClick: () => void
  isMobile?: boolean
}) => {
  const [isHovered, setIsHovered] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [isPressed, setIsPressed] = useState(false)

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mediaQuery.matches)
    
    const handleChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handleChange)
    
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setIsPressed(true)
      onClick()
      // Reset pressed state after animation
      setTimeout(() => setIsPressed(false), 150)
    }
  }

  // Handle touch events for better mobile interaction
  const handleTouchStart = () => {
    setIsPressed(true)
  }

  const handleTouchEnd = () => {
    setTimeout(() => setIsPressed(false), 150)
  }

  if (!isVisible) return null

  // Responsive positioning based on screen size and mobile state
  const getPositionClasses = () => {
    if (isMobile) {
      // On mobile, position higher up to be visible above the input area
      return 'bottom-[140px] left-1/2 transform -translate-x-1/2'
    }
    // On desktop, position near the bottom of the messages container
    return 'bottom-[20px] left-1/2 transform -translate-x-1/2'
  }

  // Responsive sizing based on screen size
  const getSizeClasses = () => {
    if (isMobile) {
      return 'w-14 h-14 sm:w-12 sm:h-12'
    }
    return 'w-12 h-12 lg:w-14 lg:h-14'
  }

  return (
    <div
      className={`
        ${isMobile || (typeof window !== 'undefined' && window.innerWidth <= 768) ? 'fixed' : 'absolute'}
        transition-all duration-300 ease-out
        ${reducedMotion ? 'opacity-100' : 'animate-in fade-in slide-in-from-bottom-2'}
        ${getPositionClasses()}
        z-50
      `}
      style={{
        '--animate-duration': reducedMotion ? '0ms' : '300ms',
        '--scroll-button-bg': 'rgba(0, 0, 0, 0.7)',
        '--scroll-button-border': 'rgba(255, 255, 255, 0.2)',
        '--scroll-button-hover-bg': 'rgba(0, 0, 0, 0.8)',
        '--scroll-button-hover-border': 'rgba(255, 255, 255, 0.3)',
      } as React.CSSProperties}
    >
      <button
        onClick={onClick}
        onKeyDown={handleKeyDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        className={`
          group relative flex items-center justify-center
          ${getSizeClasses()} rounded-full
          backdrop-blur-sm border shadow-lg hover:shadow-xl
          text-white transition-all duration-200 ease-out
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-transparent
          active:scale-95 active:transition-none
          ${reducedMotion ? '' : 'hover:animate-pulse'}
          ${isMobile ? 'touch-manipulation' : ''}
          ${isPressed ? 'scale-90' : isHovered && !reducedMotion ? 'scale-105' : 'scale-100'}
        `}
        style={{
          minWidth: isMobile ? '56px' : '48px',
          minHeight: isMobile ? '56px' : '48px',
          WebkitTapHighlightColor: 'transparent',
          backgroundColor: 'var(--scroll-button-bg)',
          borderColor: 'var(--scroll-button-border)',
          transform: `scale(${isPressed ? 0.9 : isHovered && !reducedMotion ? 1.05 : 1}) translateZ(0)`,
          willChange: 'transform',
        }}
        aria-label="Scroll to latest message"
        aria-describedby={isMobile ? undefined : 'scroll-tooltip'}
        title={isMobile ? "Scroll to latest message" : undefined}
        role="button"
        tabIndex={0}
      >
        {/* Animated background pulse */}
        {!reducedMotion && (
          <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping opacity-75" />
        )}
        
        {/* Main chevron icon with responsive sizing */}
        <ChevronDown
          className={`
            ${isMobile ? 'w-7 h-7 sm:w-6 sm:h-6' : 'w-6 h-6 lg:w-7 lg:h-7'}
            transition-transform duration-200 ease-out
            ${reducedMotion ? '' : 'group-hover:animate-bounce'}
          `}
          style={{
            transform: `translateY(${isHovered && !reducedMotion ? '2px' : '0px'}) translateZ(0)`,
            willChange: 'transform',
          }}
        />
        
        {/* Subtle glow effect */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-t from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        
        {/* Focus indicator for accessibility */}
        <div className="absolute inset-0 rounded-full border-2 border-transparent group-focus:border-blue-400 transition-colors duration-200" />
      </button>
      
      {/* Tooltip for desktop - enhanced accessibility */}
      {!isMobile && (
        <div
          id="scroll-tooltip"
          className={`
            absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3
            px-3 py-2 text-xs text-white bg-black/90 rounded-md
            opacity-0 group-hover:opacity-100 group-focus:opacity-100
            transition-opacity duration-200 pointer-events-none whitespace-nowrap
            shadow-lg border border-white/10
          `}
          role="tooltip"
        >
          Scroll to latest message
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black/90" />
        </div>
      )}
    </div>
  )
}

// MultiStepSummary component for showing server-side multi-step execution results
const MultiStepSummary = ({ steps, hasErrors }: { steps: any[], hasErrors: boolean }) => {
  if (!steps || steps.length <= 1) return null

  const totalTools = steps.reduce((sum, step) => sum + (step.toolCallsCount || 0), 0)

  return (
    <div className="bg-background border rounded-lg shadow-sm mb-3 overflow-hidden">
      <div className={`px-4 py-3 ${
        hasErrors
          ? 'bg-amber-900/20 border-l-4 border-l-amber-500'
          : 'bg-blue-900/20 border-l-4 border-l-blue-500'
      }`}>
          <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-white">
              {hasErrors ? (
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              ) : (
                <Zap className="w-4 h-4 text-blue-400" />
              )}
            <span>Tools executions</span>
            </div>
            <span className={`text-xs font-medium ${
              hasErrors ? 'text-amber-400' : 'text-blue-400'
            }`}>
            {totalTools} tools
            </span>
        </div>
      </div>
    </div>
  )
}

// Loader for highlight.js and CSS, and auto-highlighting code blocks
const HighlightLoader = () => {
  const loadedRef = useRef(false)
  
  useEffect(() => {
    if (loadedRef.current) return
    loadedRef.current = true
    
    // Load highlight.js script
    if (!(window as any).hljs) {
      const script = document.createElement('script')
      script.src = '/highlight/highlight.min.js'
      script.async = true
      document.body.appendChild(script)
    }
    
    // Load highlight.js CSS (github style)
    if (!document.getElementById('hljs-css')) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.id = 'hljs-css'
      link.href = '/highlight/styles/github.min.css'
      document.head.appendChild(link)
    }
    
    // Add custom CSS to prevent XML tool tags from being wrapped in code blocks
    if (!document.getElementById('xml-tool-css')) {
      const style = document.createElement('style')
      style.id = 'xml-tool-css'
      style.textContent = `
        /* Prevent XML tool tags from being wrapped in code blocks */
        .chat-message-content pre code {
          white-space: pre-wrap;
        }
        
        /* Style XML tool tags differently */
        .chat-message-content :not(pre) > code {
          background: transparent;
          padding: 0;
          border: none;
          font-family: inherit;
        }
        
        /* Hide XML tool tags that got wrapped in code blocks */
        .chat-message-content pre code[data-xml-tool] {
          display: none !important;
        }
        
        .chat-message-content pre[data-contains-xml-tool] {
          display: none !important;
        }
        
        /* Alternative: Make XML tool tags transparent */
        .chat-message-content code[data-xml-tool] {
          background: transparent !important;
          color: inherit !important;
          padding: 0 !important;
          border: none !important;
          font-family: inherit !important;
          font-size: inherit !important;
        }
        
        .chat-message-content pre:has(code:contains("<web_extract")) {
          display: none;
        }
        
        .chat-message-content pre:has(code:contains("<analyze_code")) {
          display: none;
        }
        
        .chat-message-content pre:has(code:contains("<check_syntax")) {
          display: none;
        }
        
        .chat-message-content pre:has(code:contains("<run_tests")) {
          display: none;
        }
        
        .chat-message-content pre:has(code:contains("<create_directory")) {
          display: none;
        }
        
        .chat-message-content pre:has(code:contains("<delete_directory")) {
          display: none;
        }
      `
      document.head.appendChild(style)
    }
    
    // Highlight code blocks after each render, but exclude XML tool tags
    const highlight = () => {
      if ((window as any).hljs) {
        document.querySelectorAll('pre code').forEach(block => {
          // Check if this code block contains XML tool tags
          const content = block.textContent || ''
          const hasXMLTools = /<(pilotwrite|pilotedit|pilotdelete|write_file|edit_file|delete_file|read_file|list_files|search_files|grep_search|web_search|web_extract|analyze_code|check_syntax|run_tests|create_directory|delete_directory)/.test(content)
          
          if (!hasXMLTools) {
          (window as any).hljs.highlightElement(block)
          }
        })
      }
    }
    
    // Initial highlight
    setTimeout(highlight, 300)
    
    // Re-highlight on mutation
    const observer = new MutationObserver(() => setTimeout(highlight, 100))
    observer.observe(document.body, { childList: true, subtree: true })
    
    return () => observer.disconnect()
  }, [])
  
  return null
}

export function ChatPanel({
  project,
  isMobile = false,
  selectedModel = DEFAULT_CHAT_MODEL,
  aiMode = 'agent',
  onModeChange,
  onClearChat: externalOnClearChat
}: ChatPanelProps) {
  const { toast } = useToast()
  
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [showDiagnostics, setShowDiagnostics] = useState(false)
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)
  const [isEditingRevertedMessage, setIsEditingRevertedMessage] = useState(false) // New state for edit mode
  const [showScrollToBottom, setShowScrollToBottom] = useState(false) // State for floating chevron visibility
  const [xmlCommands, setXmlCommands] = useState<any[]>([]) // State for XML tool commands
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null) // Ref for messages container

  // File attachment state
  const [attachedFiles, setAttachedFiles] = useState<FileSearchResult[]>([])
  const [showFileDropdown, setShowFileDropdown] = useState(false)
  const [fileQuery, setFileQuery] = useState("")
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })
  const [atCommandStartIndex, setAtCommandStartIndex] = useState(-1)

  // Auth modal state
  const [showAuthModal, setShowAuthModal] = useState(false)

  // Handle project changes - load chat history when project changes
  React.useEffect(() => {
    const handleProjectChange = async () => {
      if (!project) {
        setMessages([])
        setCurrentProjectId(null)
        // Clear restore state when project changes
        setRestoreMessageId(null)
        return
      }

      // If this is a different project, clear messages and load new chat history
      if (project.id !== currentProjectId) {
        console.log(`[ChatPanel] Project changed from ${currentProjectId} to ${project.id}, loading chat history...`)
        setMessages([])
        setCurrentProjectId(project.id)
        // Clear restore state when project changes
        setRestoreMessageId(null)
        await loadChatHistory(project)
      }
    }

    handleProjectChange()
  }, [project, currentProjectId])

  // Listen for chat-cleared events from mobile header
  React.useEffect(() => {
    const handleChatCleared = (event: CustomEvent) => {
      if (project && event.detail?.projectId === project.id) {
        console.log(`[ChatPanel] Chat cleared event received for project ${project.id}`)
        setMessages([])
      }
    }
    
    window.addEventListener('chat-cleared', handleChatCleared as EventListener)
    return () => window.removeEventListener('chat-cleared', handleChatCleared as EventListener)
  }, [project?.id])

  // Load chat history from IndexedDB for a specific project
  const loadChatHistory = async (projectToLoad: Project | null = null) => {
    const targetProject = projectToLoad || project
    if (!targetProject) return
    
    try {
      console.log(`[ChatPanel] Loading chat history for project: ${targetProject.name} (${targetProject.id})`)
      const { storageManager } = await import('@/lib/storage-manager')
      await storageManager.init()
      
      // Get chat sessions for this specific project/user
      const chatSessions = await storageManager.getChatSessions(targetProject.userId)
      const activeSession = chatSessions.find((session: any) => 
        session.workspaceId === targetProject.id && session.isActive
      )
      
      if (activeSession) {
        console.log(`[ChatPanel] Found active session for project ${targetProject.id}:`, activeSession.id)
        // Get messages for this session
        const sessionMessages = await storageManager.getMessages(activeSession.id)
        
        // Convert to our Message format
        const formattedMessages: Message[] = sessionMessages.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          createdAt: msg.createdAt,
          metadata: msg.metadata
        }))
        
        // Clean up any potential partial or duplicate assistant messages
        // Keep only the last assistant message if there are multiple consecutive ones with similar timestamps
        const cleanedMessages = formattedMessages.filter((msg, index) => {
          if (msg.role !== 'assistant') return true
          
          // Check if this is a partial message (very short content or "Thinking...")
          const isPartialMessage = msg.content.length < 10 || 
                                 msg.content === "Thinking..." || 
                                 msg.content.startsWith("data:")
          
          if (isPartialMessage) {
            // Check if there's a complete assistant message after this one
            const nextAssistantIndex = formattedMessages.findIndex((nextMsg, nextIndex) => 
              nextIndex > index && 
              nextMsg.role === 'assistant' && 
              nextMsg.content.length > 10 &&
              !nextMsg.content.startsWith("data:")
            )
            
            // If there's a complete message after this partial one, filter out the partial
            if (nextAssistantIndex !== -1) {
              console.log(`[ChatPanel] Filtering out partial assistant message: "${msg.content.substring(0, 50)}..."`)
              return false
            }
          }
          
          return true
        })
        
        console.log(`[ChatPanel] Loaded ${cleanedMessages.length} messages (filtered ${formattedMessages.length - cleanedMessages.length} partial messages) for project ${targetProject.id}`)
        setMessages(cleanedMessages)
        // Don't clear restoreMessageId here as it should persist across reloads
      } else {
        console.log(`[ChatPanel] No active session found for project ${targetProject.id}, starting fresh`)
        setMessages([])
        // Clear restore state when there's no active session
        setRestoreMessageId(null)
      }
    } catch (error) {
      console.error(`[ChatPanel] Error loading chat history for project ${targetProject?.id}:`, error)
      setMessages([])
      // Clear restore state on error
      setRestoreMessageId(null)
    }
  }

  // Save message to IndexedDB for the current project
  const saveMessageToIndexedDB = async (message: Message) => {
    if (!project) {
      console.warn('[ChatPanel] Cannot save message: no project selected')
      return
    }
    
    try {
      console.log(`[ChatPanel] Saving message to project ${project.id}:`, message.role, message.content.substring(0, 50) + '...')
      const { storageManager } = await import('@/lib/storage-manager')
      await storageManager.init()
      
      // Get or create chat session for this specific project
      let chatSessions = await storageManager.getChatSessions(project.userId)
      let chatSession = chatSessions.find((session: any) => 
        session.workspaceId === project.id && session.isActive
      )
      
      if (!chatSession) {
        console.log(`[ChatPanel] Creating new chat session for project ${project.id}`)
        chatSession = await storageManager.createChatSession({
          workspaceId: project.id,
          userId: project.userId,
          title: `${project.name} - AI Chat Session`,
          isActive: true,
          lastMessageAt: new Date().toISOString()
        })
        console.log(`[ChatPanel] Created chat session:`, chatSession.id)
      } else {
        console.log(`[ChatPanel] Using existing chat session:`, chatSession.id)
      }
      
      // Check if message with this ID already exists and delete it (to prevent duplicates)
      const existingMessages = await storageManager.getMessages(chatSession.id)
      const existingMessage = existingMessages.find((m: any) => m.id === message.id)
      
      if (existingMessage) {
        console.log(`[ChatPanel] Deleting existing message with ID ${message.id} to prevent duplicates`)
        await storageManager.deleteMessage(chatSession.id, message.id)
      }
      
      // Create the message (fresh or replacement)
      await storageManager.createMessage({
        chatSessionId: chatSession.id,
        role: message.role,
        content: message.content,
        metadata: message.metadata || {},
        tokensUsed: 0
      })
      
      // Update session's last message time
      await storageManager.updateChatSession(chatSession.id, {
        lastMessageAt: new Date().toISOString()
      })
      
      console.log(`[ChatPanel] Message saved successfully for project ${project.id}`)
    } catch (error) {
      console.error(`[ChatPanel] Error saving message for project ${project?.id}:`, error)
    }
  }

  // Clear chat function - clears current project's chat session
  const handleClearChat = async () => {
    // If external handler provided (mobile), use it
    if (externalOnClearChat) {
      externalOnClearChat()
      return
    }
    
    // Otherwise use internal logic (desktop)
    if (!project) return
    
    try {
      console.log(`[ChatPanel] Clearing chat for project ${project.id}`)
      const { storageManager } = await import('@/lib/storage-manager')
      await storageManager.init()
      
      // Find and deactivate current session for this project
      const chatSessions = await storageManager.getChatSessions(project.userId)
      const activeSession = chatSessions.find((session: any) => 
        session.workspaceId === project.id && session.isActive
      )
      
      if (activeSession) {
        // Deactivate the current session instead of deleting (preserves history)
        await storageManager.updateChatSession(activeSession.id, {
          isActive: false,
          endedAt: new Date().toISOString()
        })
        console.log(`[ChatPanel] Deactivated session ${activeSession.id} for project ${project.id}`)
      }
      
      // Clear local messages
      setMessages([])
      
      toast({
        title: "Chat Cleared",
        description: `Chat history cleared for ${project.name}. Start a new conversation!`,
      })
    } catch (error) {
      console.error(`[ChatPanel] Error clearing chat for project ${project?.id}:`, error)
      // Fallback to just clearing local messages
      setMessages([])
      toast({
        title: "Chat Cleared",
        description: "Chat history has been cleared. Start a new conversation!",
      })
    }
  }

  // Stop AI generation function
  const handleStopGeneration = () => {
    if (abortController) {
      abortController.abort()
      setAbortController(null)
      setIsLoading(false)
      setIsStreaming(false)
      
      toast({
        title: "Generation Stopped",
        description: "AI response generation has been cancelled.",
      })
    }
  }

  // File attachment handlers
  const detectAtCommand = (text: string, cursorPosition: number) => {
    const beforeCursor = text.substring(0, cursorPosition);
    const atIndex = beforeCursor.lastIndexOf('@');
    
    if (atIndex === -1) return null;
    
    // Check if @ is at start of line or preceded by whitespace
    const charBeforeAt = atIndex > 0 ? beforeCursor[atIndex - 1] : ' ';
    if (charBeforeAt !== ' ' && charBeforeAt !== '\n' && atIndex !== 0) {
      return null;
    }
    
    // Find the end of the command (space, newline, or end of string)
    const afterAt = text.substring(atIndex + 1);
    const spaceIndex = afterAt.search(/[\s\n]/);
    const endIndex = spaceIndex === -1 ? text.length : atIndex + 1 + spaceIndex;
    
    return {
      startIndex: atIndex,
      endIndex,
      query: text.substring(atIndex + 1, endIndex)
    };
  };

  const calculateDropdownPosition = (textarea: HTMLTextAreaElement, atIndex: number) => {
    // Create a temporary div to measure text dimensions
    const div = document.createElement('div');
    div.style.cssText = window.getComputedStyle(textarea).cssText;
    div.style.position = 'absolute';
    div.style.visibility = 'hidden';
    div.style.height = 'auto';
    div.style.width = textarea.clientWidth + 'px';
    div.style.whiteSpace = 'pre-wrap';
    div.style.wordWrap = 'break-word';
    
    document.body.appendChild(div);
    
    // Get text up to the @ symbol
    const textBeforeAt = textarea.value.substring(0, atIndex);
    div.textContent = textBeforeAt;
    
    const rect = textarea.getBoundingClientRect();
    const lines = Math.floor(div.scrollHeight / parseFloat(window.getComputedStyle(div).lineHeight));
    
    document.body.removeChild(div);
    
    // Calculate position - Position ABOVE the textarea
    const dropdownHeight = 320; // Approximate dropdown height
    const viewportHeight = window.innerHeight;
    const spaceAbove = rect.top;
    const spaceBelow = viewportHeight - rect.bottom;
    
    // Prefer positioning above, but fall back to below if not enough space
    let top: number;
    if (spaceAbove >= dropdownHeight + 16) {
      // Enough space above - position above the textarea
      top = rect.top - dropdownHeight - 8;
    } else if (spaceBelow >= dropdownHeight + 16) {
      // Not enough space above but enough below - position below
      top = rect.bottom + 8;
    } else {
      // Not enough space either way - position above anyway and let it scroll
      top = Math.max(16, rect.top - dropdownHeight - 8);
    }
    
    const left = rect.left;
    
    return { top, left };
  };

  const handleFileSelect = (file: FileSearchResult) => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const cursorPos = textarea.selectionStart;
    const atCommand = detectAtCommand(inputMessage, cursorPos);
    
    if (atCommand) {
      // Replace the @query with @filename
      const before = inputMessage.substring(0, atCommand.startIndex);
      const after = inputMessage.substring(atCommand.endIndex);
      const replacement = `@${file.name}`;
      
      const newMessage = before + replacement + after;
      setInputMessage(newMessage);
      
      // Add to attached files if not already present
      if (!attachedFiles.some(f => f.id === file.id)) {
        setAttachedFiles(prev => [...prev, file]);
      }
      
      // Position cursor after the replacement
      setTimeout(() => {
        const newCursorPos = atCommand.startIndex + replacement.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        textarea.focus();
      }, 0);
    }
    
    setShowFileDropdown(false);
    setFileQuery("");
    setAtCommandStartIndex(-1);
  };

  const handleRemoveAttachedFile = (fileId: string) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== fileId));
    
    // Also remove the @filename from the input message
    const fileToRemove = attachedFiles.find(f => f.id === fileId);
    if (fileToRemove) {
      const pattern = new RegExp(`@${fileToRemove.name}\\b`, 'g');
      setInputMessage(prev => prev.replace(pattern, '').replace(/\s+/g, ' ').trim());
    }
  };

  const closeFileDropdown = () => {
    setShowFileDropdown(false);
    setFileQuery("");
    setAtCommandStartIndex(-1);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputMessage.trim() || isLoading) return

    // If no project is selected, show auth modal
    if (!project) {
      setShowAuthModal(true)
      return
    }

    // Check if we're editing a reverted message
    if (isEditingRevertedMessage && revertMessageId) {
      // Find the message being edited
      const messageToEdit = messages.find(msg => msg.id === revertMessageId);
      
      if (messageToEdit) {
        // Update the existing message
        const updatedMessage: Message = {
          ...messageToEdit,
          content: inputMessage.trim(),
          createdAt: new Date().toISOString(),
        }

        // Update the messages state
        setMessages(prev => prev.map(msg => msg.id === revertMessageId ? updatedMessage : msg))
        
        // Save updated message to IndexedDB
        await saveMessageToIndexedDB(updatedMessage)
        
        // Reset edit mode
        setIsEditingRevertedMessage(false)
        setRevertMessageId(null)
        
        // Create a new checkpoint for the updated message
        try {
          await new Promise(resolve => setTimeout(resolve, 50))
          await createCheckpoint(project.id, updatedMessage.id)
          console.log(`[Checkpoint] Created checkpoint for updated message ${updatedMessage.id}`)
        } catch (error) {
          console.error('[Checkpoint] Error creating checkpoint for updated message:', error)
        }
        
        // Clear input
        setInputMessage("")
        return
      }
    }

    // Prepare message content with attached files
    let messageContent = inputMessage.trim();
    
    // If there are attached files, append their content to the message
    if (attachedFiles.length > 0) {
      const fileContexts: string[] = [];
      
      try {
        const { storageManager } = await import('@/lib/storage-manager');
        await storageManager.init();
        
        for (const attachedFile of attachedFiles) {
          try {
            const fileData = await storageManager.getFile(project.id, attachedFile.path);
            if (fileData && fileData.content) {
              fileContexts.push(`\n\n--- File: ${attachedFile.path} ---\n${fileData.content}\n--- End of ${attachedFile.name} ---`);
            }
          } catch (error) {
            console.error(`Error loading attached file ${attachedFile.path}:`, error);
            fileContexts.push(`\n\n--- File: ${attachedFile.path} ---\n[Error loading file content]\n--- End of ${attachedFile.name} ---`);
          }
        }
        
        if (fileContexts.length > 0) {
          messageContent = `${messageContent}\n\n=== ATTACHED FILES CONTEXT ===${fileContexts.join('')}\n=== END ATTACHED FILES ===`;
        }
      } catch (error) {
        console.error('Error loading attached files:', error);
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageContent,
      createdAt: new Date().toISOString(),
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage("")
    setAttachedFiles([]) // Clear attached files after sending
    setIsLoading(true)

    // Reset textarea height to default during loading
    if (textareaRef.current) {
      textareaRef.current.style.height = '64px'
      textareaRef.current.style.overflowY = 'hidden'
    }

    // Create abort controller for this request
    const controller = new AbortController()
    setAbortController(controller)

    // Save user message to IndexedDB
    await saveMessageToIndexedDB(userMessage)
    
    // Create checkpoint for this message
    if (project) {
      try {
        // Small delay to ensure message is saved before creating checkpoint
        await new Promise(resolve => setTimeout(resolve, 50))
        await createCheckpoint(project.id, userMessage.id)
        console.log(`[Checkpoint] Created checkpoint for message ${userMessage.id}`)
      } catch (error) {
        console.error('[Checkpoint] Error creating checkpoint:', error)
      }
    }

    try {
      // Fetch project files and chat history from IndexedDB
      const { storageManager } = await import('@/lib/storage-manager')
      await storageManager.init()
      const files = await storageManager.getFiles(project.id)

      const endpoint = '/api/chat'
      const body = {
        messages: [...messages, userMessage].map(({ id, createdAt, ...msg }) => msg),
        projectId: project.id,
        useTools: true,
        project,
        files,
        modelId: selectedModel,
        aiMode: aiMode,
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error('Failed to get AI response')
      }

      // Check if this is a JSON response (tools mode) or streaming response
      const contentType = response.headers.get('content-type')
      
      if (contentType && contentType.includes('application/json')) {
        // Enhanced server-side tools response
        const jsonResponse = await response.json()
        
        // Debug: Log the complete response
        console.log('[DEBUG] Complete API response:', jsonResponse)
        
        if (jsonResponse.error) {
          throw new Error(jsonResponse.error)
        }
        
        // Check if there's a tool_results_summary that should be displayed as assistant message
        let finalMessageContent = jsonResponse.message || ''

        if (jsonResponse.toolCalls && jsonResponse.toolCalls.length > 0) {
          const summaryTool = jsonResponse.toolCalls.find((tc: any) =>
            tc.name === 'tool_results_summary' &&
            tc.result &&
            tc.result.displayType === 'assistant_bubble' &&
            tc.result.summary
          )

          if (summaryTool) {
            // Use the summary as the main message content
            finalMessageContent = summaryTool.result.summary
            console.log('[DEBUG] Using tool_results_summary as assistant message:', finalMessageContent.substring(0, 100) + '...')
          }
        }

        // CRITICAL: Prevent empty assistant messages from being rendered
        // Only create and display the message if there's actual content
        if (finalMessageContent && finalMessageContent.trim()) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
            content: finalMessageContent,
          createdAt: new Date().toISOString(),
          metadata: {
            toolCalls: jsonResponse.toolCalls || [],
            success: jsonResponse.success,
            hasToolCalls: jsonResponse.hasToolCalls,
            hasToolErrors: jsonResponse.hasToolErrors,
            stepCount: jsonResponse.stepCount,
            steps: jsonResponse.steps,
            serverSideExecution: true,
            fileOperations: jsonResponse.fileOperations || [],
            // Workflow mode properties
            workflowMode: jsonResponse.workflowMode || false,
            workflowChunk: jsonResponse.workflowChunk,
            sessionId: jsonResponse.sessionId
          }
        }
        
        setMessages(prev => [...prev, assistantMessage])
        await saveMessageToIndexedDB(assistantMessage)
          
          console.log('[DEBUG] Added assistant message with content:', finalMessageContent.substring(0, 100) + '...')
        } else {
          console.log('[DEBUG] Skipped empty assistant message, content was empty or whitespace only')
        }
        
        // Apply file operations to client-side IndexedDB for persistence
        if (jsonResponse.fileOperations && jsonResponse.fileOperations.length > 0) {
          console.log('[DEBUG] Processing file operations:', jsonResponse.fileOperations)
          
          try {
            const { storageManager } = await import('@/lib/storage-manager')
            await storageManager.init()
            
            let operationsApplied = 0
            
            for (const fileOp of jsonResponse.fileOperations) {
              console.log('[DEBUG] Applying file operation:', fileOp)
              
              if (fileOp.type === 'write_file' && fileOp.path) {
                // Check if file exists
                const existingFile = await storageManager.getFile(project.id, fileOp.path)
                
                if (existingFile) {
                  // Update existing file
                  await storageManager.updateFile(project.id, fileOp.path, { 
                    content: fileOp.content || '',
                    updatedAt: new Date().toISOString()
                  })
                  console.log(`[DEBUG] Updated existing file: ${fileOp.path}`)
                } else {
                  // Create new file
                  const newFile = await storageManager.createFile({
                    workspaceId: project.id,
                    name: fileOp.path.split('/').pop() || fileOp.path,
                    path: fileOp.path,
                    content: fileOp.content || '',
                    fileType: fileOp.path.split('.').pop() || 'text',
                    type: fileOp.path.split('.').pop() || 'text',
                    size: (fileOp.content || '').length,
                    isDirectory: false
                  })
                  console.log(`[DEBUG] Created new file: ${fileOp.path}`, newFile)
                }
                operationsApplied++
              } else if (fileOp.type === 'edit_file' && fileOp.path && fileOp.content) {
                // Update existing file with new content
                await storageManager.updateFile(project.id, fileOp.path, { 
                  content: fileOp.content,
                  updatedAt: new Date().toISOString()
                })
                console.log(`[DEBUG] Edited file: ${fileOp.path}`)
                operationsApplied++
              } else if (fileOp.type === 'delete_file' && fileOp.path) {
                // Delete file
                await storageManager.deleteFile(project.id, fileOp.path)
                console.log(`[DEBUG] Deleted file: ${fileOp.path}`)
                operationsApplied++
              } else {
                console.warn('[DEBUG] Skipped invalid file operation:', fileOp)
              }
            }
            
            console.log(`[DEBUG] Applied ${operationsApplied}/${jsonResponse.fileOperations.length} file operations to IndexedDB`)
            
            if (operationsApplied > 0) {
              // Force refresh the file explorer
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('files-changed', { 
                  detail: { projectId: project.id, forceRefresh: true } 
                }))
              }, 100)
            }
          } catch (error) {
            console.error('[ERROR] Failed to apply file operations to IndexedDB:', error)
            toast({
              title: "Storage Warning",
              description: `File operations completed but may not persist: ${error instanceof Error ? error.message : 'Unknown error'}`,
              variant: "destructive"
            })
          }
        } else {
          console.log('[DEBUG] No file operations to process')
        }
        
        // Refresh file explorer after any file operations
        if (jsonResponse.hasToolCalls && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('files-changed', { detail: { projectId: project.id } }))
        }
        
        // Show success toast for completed operations
        if (jsonResponse.success && jsonResponse.hasToolCalls) {
          const toolCount = jsonResponse.toolCalls?.length || 0
          const stepCount = jsonResponse.stepCount || 1
          
          toast({
            title: "Operations Completed",
            description: `Successfully executed ${toolCount} tool(s) in ${stepCount} step(s).`,
          })
        }
        
        // Show warning toast if there were errors
        if (jsonResponse.hasToolErrors) {
          toast({
            title: "Some Operations Failed",
            description: "Some file operations encountered errors. Check the chat for details.",
            variant: "destructive"
          })
        }
        
        } else {
        // Streaming response - handle AI SDK streaming format
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()
        let assistantContent = ""
        let assistantMessageId = (Date.now() + 1).toString()
        
        // Track tool calls during streaming
        let toolCalls: any[] = []
        let hasToolCalls = false
        let hasToolErrors = false
        
        // Reset XML commands for new message
        setXmlCommands([])

        // Create assistant message with loading indicator - DON'T save to DB yet
        const assistantMessage: Message = {
          id: assistantMessageId,
          role: "assistant",
          content: "Thinking...",
          createdAt: new Date().toISOString(),
        }

        setMessages(prev => [...prev, assistantMessage])

        // Track if we've received any content
        let hasReceivedContent = false

        if (reader) {
          try {
            let buffer = ""
            
            while (true) {
              const { done, value } = await reader.read()
              if (done) break

              const chunk = decoder.decode(value, { stream: true })
              buffer += chunk
              
              // Process complete SSE events from buffer
              // Handle concatenated events like: data: {...}data: {...}
              let remainingBuffer = buffer
              
              while (remainingBuffer.length > 0) {
                // Look for 'data: ' pattern
                const dataIndex = remainingBuffer.indexOf('data: ')
                if (dataIndex === -1) break
                
                // Extract the data part after 'data: '
                const dataStart = dataIndex + 6
                let dataEnd = remainingBuffer.indexOf('data: ', dataStart)
                
                // If no next 'data: ' found, check for newline or end of buffer
                if (dataEnd === -1) {
                  const newlineIndex = remainingBuffer.indexOf('\n', dataStart)
                  dataEnd = newlineIndex !== -1 ? newlineIndex : remainingBuffer.length
                }
                
                const dataStr = remainingBuffer.slice(dataStart, dataEnd).trim()
                
                // Process this SSE event
                if (dataStr) {
                  // Handle [DONE] marker
                  if (dataStr === '[DONE]') {
                    console.log('[STREAM] Received [DONE] marker')
                    setIsStreaming(false)
                    break
                  }
                  
                  try {
                    const data = JSON.parse(dataStr)
                    console.log('[STREAM] Received event type:', data.type, 'Full data:', data)
                    
                    // Handle text-delta events for actual content
                    if (data.type === 'text-delta' && data.delta) {
                      assistantContent += data.delta
                      hasReceivedContent = true
                      
                      // Set streaming state when content starts flowing
                      if (!isStreaming) {
                        setIsStreaming(true)
                      }
                      
                      console.log('[STREAM] Adding delta:', data.delta)
                      console.log('[DEBUG] Full assistant content length:', assistantContent.length)
                      console.log('[DEBUG] Assistant content preview:', assistantContent.substring(0, 500))

                      // Enhanced XML tool detection and processing with inline replacement
                      const detectedTools = detectXMLTools(assistantContent)
                      console.log('[DEBUG] Detected tools:', detectedTools.length, 'from content length:', assistantContent.length)
                      if (detectedTools.length > 0) {
                        console.log('[DEBUG] Detected tool details:', detectedTools)
                      }

                      // Replace XML blocks with placeholders for inline display
                      const { content: processedContent, placeholders } = extractAndReplaceXMLBlocks(assistantContent, detectedTools)
                      console.log('[DEBUG] Processed content with placeholders:', processedContent.substring(0, 500))
                      
                      // Process newly detected tools
                      let updatedXmlCommands = [...xmlCommands]
                      let hasNewTools = false
                      
                      for (const detectedTool of detectedTools) {
                        // Check if this tool is already being tracked
                        const existingTool = updatedXmlCommands.find(cmd => 
                          cmd.name === detectedTool.name && 
                          cmd.args.path === detectedTool.args.path && 
                          (cmd.status === 'detected' || cmd.status === 'processing' || cmd.status === 'executing')
                        )
                        
                        if (!existingTool) {
                          console.log('[CLIENT-TOOL] Detected new tool:', detectedTool.name, detectedTool.args)
                          
                          // Add to tracking
                          updatedXmlCommands.push({
                            id: detectedTool.id,
                            command: detectedTool.name, // Legacy compatibility
                            name: detectedTool.name,
                            args: detectedTool.args,
                            path: detectedTool.args.path || '',
                            content: detectedTool.args.content || '',
                            status: 'detected',
                            startTime: detectedTool.startTime
                          })
                          hasNewTools = true
                        }
                      }
                      
                      // Update state and UI if new tools were detected
                      if (hasNewTools) {
                        setXmlCommands(updatedXmlCommands)
                        setMessages(prev => prev.map(msg =>
                          msg.id === assistantMessageId
                            ? { 
                                ...msg, 
                                metadata: {
                                  ...msg.metadata,
                                  xmlCommands: updatedXmlCommands
                                }
                              }
                            : msg
                        ))
                      }
                      
                      // Check for completed tools (have closing tags)
                      let hasCompletedTools = false
                      for (let i = 0; i < updatedXmlCommands.length; i++) {
                        const tool = updatedXmlCommands[i]
                        
                        if (tool.status === 'detected' && isXMLToolComplete(assistantContent, tool.name)) {
                          console.log('[CLIENT-TOOL] Tool completed, extracting content:', tool.name)
                          console.log('[DEBUG] Tool details:', tool)

                          // Extract content between tags
                          const extractedContent = extractXMLToolContent(assistantContent, tool.name)
                          console.log('[DEBUG] Extracted content length:', extractedContent.length)
                          
                          // Update tool with extracted content
                          updatedXmlCommands[i] = {
                            ...tool,
                            content: extractedContent,
                            args: {
                              ...tool.args,
                              content: extractedContent
                            },
                            status: 'processing'
                          }
                          hasCompletedTools = true
                        }
                      }
                      
                      // Update state and UI if tools were completed
                      if (hasCompletedTools) {
                        setXmlCommands(updatedXmlCommands)
                        setMessages(prev => prev.map(msg =>
                          msg.id === assistantMessageId
                            ? { 
                                ...msg, 
                                metadata: {
                                  ...msg.metadata,
                                  xmlCommands: updatedXmlCommands
                                }
                              }
                            : msg
                        ))
                        
                        // Execute completed tools
                        for (const tool of updatedXmlCommands) {
                          if (tool.status === 'processing') {
                            const toolCall: XMLToolCall = {
                              id: tool.id,
                              name: tool.name,
                              args: tool.args,
                              status: 'executing',
                              startTime: tool.startTime
                            }
                            
                            executeClientSideTool(toolCall, project.id)
                              .then((result) => {
                                console.log('[CLIENT-TOOL] Tool executed successfully:', result)
                                
                                // Update the tool with result
                                setXmlCommands(prev => prev.map(cmd => 
                                  cmd.id === tool.id 
                                    ? { ...cmd, status: 'completed', result }
                                    : cmd
                                ))
                                
                                setMessages(prev => prev.map(msg =>
                                  msg.id === assistantMessageId
                                    ? { 
                                        ...msg, 
                                        metadata: {
                                          ...msg.metadata,
                                          xmlCommands: updatedXmlCommands.map(cmd => 
                                            cmd.id === tool.id 
                                              ? { ...cmd, status: 'completed', result }
                                              : cmd
                                          )
                                        }
                                      }
                                    : msg
                                ))
                              })
                              .catch((error) => {
                                console.error('[CLIENT-TOOL] Tool execution failed:', error)
                                
                                // Update the tool with error
                                setXmlCommands(prev => prev.map(cmd => 
                                  cmd.id === tool.id 
                                    ? { ...cmd, status: 'failed', error: error.message }
                                    : cmd
                                ))
                                
                                setMessages(prev => prev.map(msg =>
                                  msg.id === assistantMessageId
                                    ? { 
                                        ...msg, 
                                        metadata: {
                                          ...msg.metadata,
                                          xmlCommands: updatedXmlCommands.map(cmd => 
                                            cmd.id === tool.id 
                                              ? { ...cmd, status: 'failed', error: error.message }
                                              : cmd
                                          )
                                        }
                                      }
                                    : msg
                                ))
                              })
                          }
                        }
                      }
                      
                      // Update the message content incrementally with processed content and placeholders
                      setMessages(prev => prev.map(msg =>
                        msg.id === assistantMessageId
                          ? { 
                              ...msg, 
                              content: processedContent,
                              metadata: {
                                ...msg.metadata,
                                xmlCommands: updatedXmlCommands,
                                xmlPlaceholders: placeholders // Store placeholders for inline rendering
                              }
                            }
                          : msg
                      ))
                      
                      // Note: Don't save incrementally to avoid multiple partial messages in DB
                      // The final complete message will be saved after streaming is done
                    }
                    // Handle tool call events
                    else if (data.type === 'tool-call') {
                      console.log('[STREAM] Tool call:', data)
                      
                      const toolCall = {
                        name: data.toolName,
                        input: data.input || {},
                        id: data.toolCallId || data.id,
                        status: 'pending',
                        result: null
                      }
                      
                      toolCalls.push(toolCall)
                      hasToolCalls = true
                      
                      // Update message with tool call
                      setMessages(prev => prev.map(msg =>
                        msg.id === assistantMessageId
                          ? { 
                              ...msg,
                              metadata: {
                                ...msg.metadata,
                                toolCalls,
                                hasToolCalls,
                                hasToolErrors
                              }
                            }
                          : msg
                      ))
                    }
                    // Handle tool result events
                    else if (data.type === 'tool-result') {
                      console.log('[STREAM] Tool result:', data)
                      
                      // Find and update the corresponding tool call
                      const toolCallIndex = toolCalls.findIndex(tc => tc.id === (data.toolCallId || data.id))
                      if (toolCallIndex !== -1) {
                        toolCalls[toolCallIndex].result = data.output || data.result
                        toolCalls[toolCallIndex].status = 'completed'
                      }
                      
                      // Update message with tool result
                      setMessages(prev => prev.map(msg =>
                        msg.id === assistantMessageId
                          ? { 
                              ...msg,
                              metadata: {
                                ...msg.metadata,
                                toolCalls: [...toolCalls],
                                hasToolCalls,
                                hasToolErrors
                              }
                            }
                          : msg
                      ))
                    }
                    // Handle tool error events
                    else if (data.type === 'tool-error') {
                      console.log('[STREAM] Tool error:', data)
                      
                      // Find and update the corresponding tool call
                      const toolCallIndex = toolCalls.findIndex(tc => tc.id === (data.toolCallId || data.id))
                      if (toolCallIndex !== -1) {
                        toolCalls[toolCallIndex].status = 'error'
                        toolCalls[toolCallIndex].error = data.errorText || data.error
                      }
                      
                      hasToolErrors = true
                      
                      // Update message with tool error
                      setMessages(prev => prev.map(msg =>
                        msg.id === assistantMessageId
                          ? { 
                              ...msg,
                              metadata: {
                                ...msg.metadata,
                                toolCalls: [...toolCalls],
                                hasToolCalls,
                                hasToolErrors
                              }
                            }
                          : msg
                      ))
                    }
                    // Handle XML command detection events
                    else if (data.type === 'xml-command-detected') {
                      console.log('[STREAM] XML command detected:', data)
                      
                      // Add XML command to tracking
                      if (!xmlCommands) {
                        setXmlCommands([])
                      }
                      
                      setXmlCommands(prev => [...prev, {
                        id: `xml-${Date.now()}-${Math.random()}`,
                        command: data.command,
                        path: data.path,
                        status: data.status || 'executing'
                      }])
                      
                      // Update message with XML command
                      setMessages(prev => prev.map(msg =>
                        msg.id === assistantMessageId
                          ? { 
                              ...msg,
                              metadata: {
                                ...msg.metadata,
                                toolCalls,
                                hasToolCalls,
                                hasToolErrors,
                                xmlCommands: [...xmlCommands]
                              }
                            }
                          : msg
                      ))
                    }
                    // Handle XML command result events
                    else if (data.type === 'xml-command-result') {
                      console.log('[STREAM] XML command result:', data)
                      
                      // Find and update the corresponding XML command
                      setXmlCommands(prev => {
                        const commandIndex = prev.findIndex(cmd => 
                          cmd.command === data.command && cmd.path === data.path && cmd.status === 'executing'
                        )
                        if (commandIndex !== -1) {
                          const updated = [...prev]
                          updated[commandIndex] = {
                            ...updated[commandIndex],
                            status: data.status || (data.success ? 'completed' : 'failed'),
                            error: data.error,
                            message: data.message
                          }
                          return updated
                        }
                        return prev
                      })
                      
                      // Update message with XML command result
                      setMessages(prev => prev.map(msg =>
                        msg.id === assistantMessageId
                          ? { 
                              ...msg,
                              metadata: {
                                ...msg.metadata,
                                toolCalls,
                                hasToolCalls,
                                hasToolErrors,
                                xmlCommands: xmlCommands ? [...xmlCommands] : []
                              }
                            }
                          : msg
                      ))
                    }
                    // Handle tool-results event (from hybrid approach)
                    else if (data.type === 'tool-results' && data.toolCalls) {
                      console.log('[STREAM] Tool results batch received:', data.toolCalls)
                      console.log('[STREAM] Current toolCalls array before update:', toolCalls)
                      
                      // Process all tool results from the batch
                      data.toolCalls.forEach((toolCall: any) => {
                        console.log('[STREAM] Processing individual tool call:', toolCall)
                        const processedToolCall = {
                          name: toolCall.name,
                          args: toolCall.args || {},
                          id: toolCall.id,
                          result: toolCall.result
                        }
                        
                        toolCalls.push(processedToolCall)
                        hasToolCalls = true
                        
                        if (toolCall.result?.success === false) {
                          hasToolErrors = true
                        }
                      })
                      
                      console.log('[STREAM] Updated toolCalls array:', toolCalls)
                      
                      // Check for failed tools that need client-side execution
                      const failedTools = data.toolCalls.filter((tc: any) => tc.result?.success === false)
                      if (failedTools.length > 0) {
                        console.log('[STREAM] Found failed tools, attempting client-side execution:', failedTools)
                        
                        // Execute failed tools client-side
                        for (const failedTool of failedTools) {
                          try {
                            console.log('[CLIENT-SIDE] Executing tool:', failedTool.name, failedTool.args)
                            
                            if (failedTool.name === 'read_file' && failedTool.args?.path) {
                              const { storageManager } = await import('@/lib/storage-manager')
                              await storageManager.init()
                              
                              const file = await storageManager.getFile(project.id, failedTool.args.path)
                              if (file) {
                                // Update the tool call with successful result
                                const toolIndex = toolCalls.findIndex(tc => tc.id === failedTool.id)
                                if (toolIndex !== -1) {
                                  toolCalls[toolIndex] = {
                                    ...toolCalls[toolIndex],
                                    result: {
                                      success: true,
                                      message: `📖 File read successfully: ${failedTool.args.path}`,
                                      path: failedTool.args.path,
                                      content: file.content,
                                      size: file.size,
                                      type: file.type
                                    }
                                  }
                                  console.log('[CLIENT-SIDE] Successfully executed read_file for:', failedTool.args.path)
                                  
                                  // Update hasToolErrors if all errors are now resolved
                                  hasToolErrors = toolCalls.some(tc => tc.result?.success === false)
                                }
                              }
                            } else if (failedTool.name === 'list_files') {
                              const { storageManager } = await import('@/lib/storage-manager')
                              await storageManager.init()
                              
                              const files = await storageManager.getFiles(project.id)
                              const toolIndex = toolCalls.findIndex(tc => tc.id === failedTool.id)
                              if (toolIndex !== -1) {
                                toolCalls[toolIndex] = {
                                  ...toolCalls[toolIndex],
                                  result: {
                                    success: true,
                                    message: `📁 Found ${files.length} files in project`,
                                    files: files.map(f => ({
                                      path: f.path,
                                      name: f.name,
                                      type: f.type,
                                      size: f.size,
                                      isDirectory: f.isDirectory,
                                      createdAt: f.createdAt
                                    })),
                                    count: files.length
                                  }
                                }
                                console.log('[CLIENT-SIDE] Successfully executed list_files, found:', files.length, 'files')
                                hasToolErrors = toolCalls.some(tc => tc.result?.success === false)
                              }
                            } else if (failedTool.name === 'write_file' && failedTool.args?.path && failedTool.args?.content !== undefined) {
                              const { storageManager } = await import('@/lib/storage-manager')
                              await storageManager.init()
                              
                              try {
                                // Check if file exists
                                const existingFile = await storageManager.getFile(project.id, failedTool.args.path)
                                
                                if (existingFile) {
                                  // Update existing file
                                  await storageManager.updateFile(project.id, failedTool.args.path, { 
                                    content: failedTool.args.content,
                                    updatedAt: new Date().toISOString()
                                  })
                                } else {
                                  // Create new file
                                  await storageManager.createFile({
                                    workspaceId: project.id,
                                    name: failedTool.args.path.split('/').pop() || failedTool.args.path,
                                    path: failedTool.args.path,
                                    content: failedTool.args.content,
                                    fileType: failedTool.args.path.split('.').pop() || 'text',
                                    type: failedTool.args.path.split('.').pop() || 'text',
                                    size: failedTool.args.content.length,
                                    isDirectory: false
                                  })
                                }
                                
                                const toolIndex = toolCalls.findIndex(tc => tc.id === failedTool.id)
                                if (toolIndex !== -1) {
                                  toolCalls[toolIndex] = {
                                    ...toolCalls[toolIndex],
                                    result: {
                                      success: true,
                                      message: `📝 File ${existingFile ? 'updated' : 'created'} successfully: ${failedTool.args.path}`,
                                      path: failedTool.args.path,
                                      content: failedTool.args.content
                                    }
                                  }
                                  console.log('[CLIENT-SIDE] Successfully executed write_file for:', failedTool.args.path)
                                  hasToolErrors = toolCalls.some(tc => tc.result?.success === false)
                                  
                                  // Trigger file refresh
                                  setTimeout(() => {
                                    window.dispatchEvent(new CustomEvent('files-changed', { 
                                      detail: { projectId: project.id, forceRefresh: true } 
                                    }))
                                  }, 100)
                                }
                              } catch (writeError) {
                                console.error('[CLIENT-SIDE] Failed to execute write_file:', writeError)
                              }
                            }
                          } catch (clientError) {
                            console.error('[CLIENT-SIDE] Failed to execute tool client-side:', failedTool.name, clientError)
                          }
                        }
                      }
                      
                      // Also store server-side execution metadata
                      const serverMetadata = {
                        toolCalls: [...toolCalls],
                        hasToolCalls,
                        hasToolErrors,
                        serverSideExecution: data.serverSideExecution || true,
                        fileOperations: data.fileOperations || []
                      }
                      
                      console.log('[STREAM] Final server metadata:', serverMetadata)
                      
                      // Apply file operations to client-side IndexedDB for persistence (same as specs)
                      if (data.fileOperations && data.fileOperations.length > 0) {
                        console.log('[DEBUG] Processing streaming file operations:', data.fileOperations)
                        
                        try {
                          const { storageManager } = await import('@/lib/storage-manager')
                          await storageManager.init()
                          
                          let operationsApplied = 0
                          
                          for (const fileOp of data.fileOperations) {
                            console.log('[DEBUG] Applying streaming file operation:', fileOp)
                            
                            if (fileOp.type === 'write_file' && fileOp.path) {
                              // Check if file exists
                              const existingFile = await storageManager.getFile(project.id, fileOp.path)
                              
                              if (existingFile) {
                                // Update existing file
                                await storageManager.updateFile(project.id, fileOp.path, { 
                                  content: fileOp.content || '',
                                  updatedAt: new Date().toISOString()
                                })
                                console.log(`[DEBUG] Updated existing file: ${fileOp.path}`)
                              } else {
                                // Create new file
                                const newFile = await storageManager.createFile({
                                  workspaceId: project.id,
                                  name: fileOp.path.split('/').pop() || fileOp.path,
                                  path: fileOp.path,
                                  content: fileOp.content || '',
                                  fileType: fileOp.path.split('.').pop() || 'text',
                                  type: fileOp.path.split('.').pop() || 'text',
                                  size: (fileOp.content || '').length,
                                  isDirectory: false
                                })
                                console.log(`[DEBUG] Created new file: ${fileOp.path}`, newFile)
                              }
                              operationsApplied++
                            } else if (fileOp.type === 'edit_file' && fileOp.path && fileOp.content) {
                              // Update existing file with new content
                              await storageManager.updateFile(project.id, fileOp.path, { 
                                content: fileOp.content,
                                updatedAt: new Date().toISOString()
                              })
                              console.log(`[DEBUG] Edited file: ${fileOp.path}`)
                              operationsApplied++
                            } else if (fileOp.type === 'delete_file' && fileOp.path) {
                              // Delete file
                              await storageManager.deleteFile(project.id, fileOp.path)
                              console.log(`[DEBUG] Deleted file: ${fileOp.path}`)
                              operationsApplied++
                            } else {
                              console.warn('[DEBUG] Skipped invalid streaming file operation:', fileOp)
                            }
                          }
                          
                          console.log(`[DEBUG] Applied ${operationsApplied}/${data.fileOperations.length} streaming file operations to IndexedDB`)
                          
                          if (operationsApplied > 0) {
                            // Force refresh the file explorer
                            setTimeout(() => {
                              window.dispatchEvent(new CustomEvent('files-changed', { 
                                detail: { projectId: project.id, forceRefresh: true } 
                              }))
                            }, 100)
                          }
                        } catch (error) {
                          console.error('[ERROR] Failed to apply streaming file operations to IndexedDB:', error)
                          toast({
                            title: "Storage Warning",
                            description: `File operations completed but may not persist: ${error instanceof Error ? error.message : 'Unknown error'}`,
                            variant: "destructive"
                          })
                        }
                      } else {
                        console.log('[DEBUG] No streaming file operations to process')
                      }
                      
                      // Update message with all tool results
                      setMessages(prev => prev.map(msg =>
                        msg.id === assistantMessageId
                          ? { 
                              ...msg,
                              metadata: {
                                ...msg.metadata,
                                ...serverMetadata
                              }
                            }
                          : msg
                      ))
                    }
                    // Handle tool input start/delta events
                    else if (data.type === 'tool-input-start' || data.type === 'tool-input-delta') {
                      console.log('[STREAM] Tool input event:', data.type, data)
                      // These events can be used for showing tool input streaming progress
                      // For now, we'll just log them
                    }
                    // Log other events but don't process them
                    else {
                      console.log('[STREAM] Ignoring event type:', data.type)
                    }
                    
                  } catch (parseError) {
                    console.warn('[STREAM] JSON parse error:', parseError, 'for data:', dataStr.substring(0, 100))
                  }
                }
                
                // Move to next event
                remainingBuffer = remainingBuffer.slice(dataEnd)
              }
              
              // Keep any remaining incomplete data in buffer
              const lastDataIndex = remainingBuffer.lastIndexOf('data: ')
              if (lastDataIndex !== -1) {
                buffer = remainingBuffer.slice(lastDataIndex)
              } else {
                buffer = ""
              }
            }
          } catch (streamError) {
            console.error('Streaming error:', streamError)
            // Update message with error content
            setMessages(prev => prev.map(msg => 
              msg.id === assistantMessageId 
                ? { ...msg, content: "Sorry, there was an error during streaming. Please try again." }
                : msg
            ))
          } finally {
            // Ensure we have some content, even if streaming failed
            if (!hasReceivedContent || !assistantContent.trim()) {
              setMessages(prev => prev.map(msg => 
                msg.id === assistantMessageId 
                  ? { ...msg, content: "I'm sorry, I couldn't generate a response. Please try again." }
                : msg
              ))
            }
          }
        }

        // Save assistant message to database after streaming completes - match specs pattern
        if (project && (assistantContent.trim() || hasToolCalls)) {
          const finalAssistantMessage: Message = {
            id: assistantMessageId,
            role: "assistant",
            content: assistantContent || (hasToolCalls ? "Tool execution completed." : ""),
            createdAt: new Date().toISOString(),
            metadata: {
              toolCalls,
              toolResults: toolCalls?.map(tc => tc.result) || [],  // Match specs pattern
              hasToolCalls,
              hasToolErrors,
              serverSideExecution: true,  // This came from server-side via streaming
              fileOperations: []  // Will be populated if there were any file operations
            }
          }

          await saveMessageToIndexedDB(finalAssistantMessage)
        }
        }

    } catch (error) {
      console.error('Error sending message:', error)
      
      // Handle abort error specifically
      if (error instanceof Error && error.name === 'AbortError') {
        // Message was aborted, don't show error toast
        return
      }
      
      toast({
        title: "Error",
        description: `Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setIsStreaming(false)
      setAbortController(null)
    }
  }

  const handleCopyMessage = async (msgId: string, fallback?: string) => {
    try {
      const el = document.getElementById(`msg-${msgId}`)
      const text = el?.innerText || fallback || ''
      if (!text) throw new Error('No text to copy')
      await navigator.clipboard.writeText(text)
      toast({ title: 'Copied', description: 'Message copied to clipboard' })
    } catch (err) {
      console.error('Copy failed', err)
      toast({ title: 'Copy failed', description: 'Unable to copy message', variant: 'destructive' })
    }
  }

  // Add delete message function
  const handleDeleteMessage = async (msgId: string, role: "user" | "assistant" | "system") => {
    if (!project) return
    
    try {
      // Remove message from UI immediately for better UX
      setMessages(prev => prev.filter(msg => msg.id !== msgId))
      
      // Delete message from IndexedDB
      const { storageManager } = await import('@/lib/storage-manager')
      await storageManager.init()
      
      // Get chat session for this project
      const chatSessions = await storageManager.getChatSessions(project.userId)
      const activeSession = chatSessions.find((session: any) => 
        session.workspaceId === project.id && session.isActive
      )
      
      if (activeSession) {
        // Delete the message from the database
        const success = await storageManager.deleteMessage(activeSession.id, msgId)
        if (success) {
          console.log(`[ChatPanel] Deleted message ${msgId} from database`)
        } else {
          console.warn(`[ChatPanel] Failed to delete message ${msgId} from database`)
        }
      }
      
      toast({
        title: "Message Deleted",
        description: "The message has been removed from the chat history."
      })
    } catch (error) {
      console.error('[ChatPanel] Error deleting message:', error)
      toast({
        title: "Delete Failed",
        description: "Failed to delete the message. Please try again.",
        variant: "destructive"
      })
      
      // Reload messages on error to maintain consistency
      if (project) {
        await loadChatHistory(project)
      }
    }
  }

  // Add revert state and message ID
  const [isReverting, setIsReverting] = useState(false)
  const [revertMessageId, setRevertMessageId] = useState<string | null>(null)
  const [showRevertDialog, setShowRevertDialog] = useState(false)
  const [isRestoreAvailable, setIsRestoreAvailable] = useState(false)
  const [restoreMessageId, setRestoreMessageId] = useState<string | null>(null) // Track which message to show restore icon for
  
  // Check for restore availability on component mount and periodically
  useEffect(() => {
    const checkRestoreAvailability = async () => {
      try {
        if (project) {
          // Load pre-revert states from storage
          const { loadPreRevertStatesFromStorage, isRestoreAvailableForMessage } = await import('@/lib/checkpoint-utils')
          loadPreRevertStatesFromStorage(project.id)
          
          // Check if any message has a restore available
          let hasRestore = false
          for (const msg of messages) {
            if (msg.role === 'user' && isRestoreAvailableForMessage(project.id, msg.id)) {
              hasRestore = true
              // Set the first available restore message
              if (!restoreMessageId) {
                setRestoreMessageId(msg.id)
              }
              break
            }
          }
          setIsRestoreAvailable(hasRestore)
        }
      } catch (error) {
        console.error('[Checkpoint] Error checking restore availability:', error)
      }
    }
    
    checkRestoreAvailability()
    
    // Check every 30 seconds
    const interval = setInterval(checkRestoreAvailability, 30000)
    
    return () => clearInterval(interval)
  }, [project, messages, restoreMessageId])
  
  // Revert to checkpoint function
  const handleRevertToCheckpoint = async (messageId: string) => {
    if (!project || isReverting) return
    
    // If this message is showing the restore icon, perform restore instead
    if (restoreMessageId === messageId) {
      // Perform restore operation for this specific message
      await handleRestoreForMessage(messageId);
      return;
    }
    
    // Show confirmation dialog for revert
    setRevertMessageId(messageId)
    setShowRevertDialog(true)
  }

  // New function to handle restore for a specific message
  const handleRestoreForMessage = async (messageId: string) => {
    if (!project) return
    
    try {
      // Check if restore is available for this specific message
      const { isRestoreAvailableForMessage, restorePreRevertState } = await import('@/lib/checkpoint-utils')
      
      if (!isRestoreAvailableForMessage(project.id, messageId)) {
        toast({
          title: "Restore Unavailable",
          description: "The restore option is only available for 5 minutes after reverting or no revert has been performed for this message.",
          variant: "destructive"
        })
        // Clear the restore icon for this message
        setRestoreMessageId(null)
        return
      }
      
      // Get the chat session for this project
      const { storageManager } = await import('@/lib/storage-manager')
      await storageManager.init()
      
      const chatSessions = await storageManager.getChatSessions(project.userId)
      const activeSession = chatSessions.find((session: any) => 
        session.workspaceId === project.id && session.isActive
      )
      
      if (!activeSession) {
        toast({
          title: "Restore Failed",
          description: "Could not find chat session for this project.",
          variant: "destructive"
        })
        return
      }
      
      // Restore the pre-revert state for this specific message
      const success = await restorePreRevertState(project.id, activeSession.id, messageId)
      
      if (success) {
        // Reload the chat history to reflect restored messages
        await loadChatHistory(project)
        
        // Force refresh the file explorer
        window.dispatchEvent(new CustomEvent('files-changed', { 
          detail: { projectId: project.id, forceRefresh: true } 
        }))
        
        // Clear the restore message ID
        setRestoreMessageId(null)
        setIsRestoreAvailable(false)
        
        toast({
          title: "Restored Successfully",
          description: "Files and messages have been restored to their previous state."
        })
      }
    } catch (error) {
      console.error('[Checkpoint] Error restoring for message:', error)
      toast({
          title: "Restore Failed",
          description: error instanceof Error ? error.message : "An unknown error occurred.",
          variant: "destructive"
      })
    }
  }
  
  // Restore last reverted checkpoint
  const handleRestoreLastCheckpoint = async () => {
    if (!project) return
    
    try {
      // Check if restore is available (using the old global method for backward compatibility)
      // We'll need to implement a new approach for the global restore
      const { clearAllPreRevertStates } = await import('@/lib/checkpoint-utils')
      
      // For now, we'll just show a message that this feature needs to be reimplemented
      toast({
        title: "Restore Update",
        description: "The global restore feature has been updated. Please use the restore icon on the specific message you want to restore.",
        variant: "default"
      })
      
      // Clear the global restore state
      clearAllPreRevertStates(project.id)
      setIsRestoreAvailable(false)
      setRestoreMessageId(null)
    } catch (error) {
      console.error('[Checkpoint] Error in global restore:', error)
      toast({
        title: "Restore Info",
        description: "The global restore feature has been updated. Please use the restore icon on the specific message you want to restore.",
        variant: "default"
      })
    }
  }

  // Confirm revert function
  const confirmRevert = async () => {
    if (!project || !revertMessageId) return
    
    setIsReverting(true)
    setShowRevertDialog(false)
    
    try {
      // Get the chat session for this project
      const { storageManager } = await import('@/lib/storage-manager')
      await storageManager.init()
      
      const chatSessions = await storageManager.getChatSessions(project.userId)
      const activeSession = chatSessions.find((session: any) => 
        session.workspaceId === project.id && session.isActive
      )
      
      if (!activeSession) {
        toast({
          title: "Revert Failed",
          description: "Could not find chat session for this project.",
          variant: "destructive"
        })
        setIsReverting(false)
        setRevertMessageId(null)
        return
      }
      
      // Capture the current state before revert for potential restore
      const { capturePreRevertState } = await import('@/lib/checkpoint-utils')
      await capturePreRevertState(project.id, activeSession.id, revertMessageId)
      
      // Update restore availability state
      setIsRestoreAvailable(true)
      
      // Get all checkpoints for this workspace
      const { getCheckpoints } = await import('@/lib/checkpoint-utils')
      const checkpoints = await getCheckpoints(project.id)
      
      // Find the checkpoint associated with this message
      let checkpoint = checkpoints.find(cp => cp.messageId === revertMessageId) || undefined
      
      if (!checkpoint) {
        // Try to find checkpoint by timestamp if message ID doesn't match
        // This handles cases where message ID might not match due to timing issues
        const allMessages = await storageManager.getMessages(activeSession.id)
        const targetMessage = allMessages.find(msg => msg.id === revertMessageId)
        
        if (targetMessage) {
          // Find checkpoint closest to message creation time
          const targetTime = new Date(targetMessage.createdAt).getTime()
          const foundCheckpoint = checkpoints.find(cp => {
            const checkpointTime = new Date(cp.createdAt).getTime()
            const timeDiff = Math.abs(checkpointTime - targetTime)
            return timeDiff <= 2000 // 2 seconds tolerance
          });
          
          if (foundCheckpoint) {
            checkpoint = foundCheckpoint;
          }
        }
        
        if (!checkpoint) {
          toast({
            title: "Revert Failed",
            description: "Could not find checkpoint for this message. This might happen if the message is too recent or if there was a timing issue.",
            variant: "destructive"
          })
          setIsReverting(false)
          setRevertMessageId(null)
          return
        }
      }
      
      // Get all messages in the session
      const allMessages = await storageManager.getMessages(activeSession.id)
      
      // Try to find the message by ID first
      let revertMessageIndex = allMessages.findIndex(msg => msg.id === revertMessageId)
      let revertTimestamp = ''
      let revertMessage = null
      
      if (revertMessageIndex !== -1) {
        // Found the message by ID
        revertMessage = allMessages[revertMessageIndex]
        revertTimestamp = revertMessage.createdAt
        console.log(`[Checkpoint] Found message by ID: ${revertMessageId}`)
      } else {
        // Log detailed information for debugging
        console.log(`[Checkpoint] Message not found by ID: ${revertMessageId}`)
        console.log(`[Checkpoint] Available messages:`, allMessages.map(msg => ({
          id: msg.id,
          content: msg.content.substring(0, 50) + '...',
          createdAt: msg.createdAt
        })))
        
        // If we can't find by ID, try to find by checkpoint creation time
        // This handles cases where the message hasn't been saved to DB yet or there's a timing issue
        const checkpointTime = new Date(checkpoint.createdAt).getTime()
        console.log(`[Checkpoint] Looking for message near checkpoint time: ${checkpoint.createdAt} (${checkpointTime})`)
        
        // Find the message closest to the checkpoint creation time
        revertMessageIndex = allMessages.findIndex(msg => {
          const msgTime = new Date(msg.createdAt).getTime()
          // Allow for a small time difference (2 seconds) to account for timing issues
          const timeDiff = Math.abs(msgTime - checkpointTime)
          console.log(`[Checkpoint] Message ${msg.id} time diff: ${timeDiff}ms`)
          return timeDiff <= 2000
        })
        
        if (revertMessageIndex !== -1) {
          // Found a message close to checkpoint time
          revertMessage = allMessages[revertMessageIndex]
          revertTimestamp = revertMessage.createdAt
          console.log(`[Checkpoint] Found message by timestamp: ${revertMessage.id}`)
        } else {
          // Last resort: use the checkpoint creation time as the timestamp
          revertTimestamp = checkpoint.createdAt
          console.log(`[Checkpoint] Using checkpoint timestamp as fallback: ${revertTimestamp}`)
        }
      }
      
      if (!revertTimestamp) {
        toast({
          title: "Revert Failed",
          description: "Could not determine the timestamp for the selected message.",
          variant: "destructive"
        })
        setIsReverting(false)
        setRevertMessageId(null)
        return
      }
      
      // Delete messages that came after this timestamp
      const { deleteMessagesAfter } = await import('@/lib/checkpoint-utils')
      const deletedCount = await deleteMessagesAfter(activeSession.id, revertTimestamp)
      console.log(`[Checkpoint] Deleted ${deletedCount} messages after timestamp ${revertTimestamp}`)
      
      // Update the messages state to remove messages after the revert point
      // First, we'll update the UI immediately for better UX
      setMessages(prevMessages => {
        // If we found the message by ID, slice up to and including that message
        const index = prevMessages.findIndex(msg => msg.id === revertMessageId)
        if (index !== -1) {
          return prevMessages.slice(0, index + 1)
        }
        // If we couldn't find by ID, we'll reload after the restore completes
        return prevMessages
      })
      
      // Restore the checkpoint
      const { restoreCheckpoint } = await import('@/lib/checkpoint-utils')
      const success = await restoreCheckpoint(checkpoint.id)
      
      if (success) {
        // Force refresh the file explorer
        window.dispatchEvent(new CustomEvent('files-changed', { 
          detail: { projectId: project.id, forceRefresh: true } 
        }))
        
        // Small delay to ensure UI updates properly
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // Reload messages to ensure consistency between UI and database
        // This also helps avoid "Node cannot be found" errors
        await loadChatHistory(project)
        
        // Set this message to show restore icon
        setRestoreMessageId(revertMessageId)
        
        // Populate the input area with the reverted message content for editing
        if (revertMessage) {
          setInputMessage(revertMessage.content);
          setIsEditingRevertedMessage(true); // Set edit mode
        }
        
        toast({
          title: "Reverted Successfully",
          description: `Files and messages have been restored to this version. The message is now in edit mode.`
        })
      } else {
        // Reload messages if file restoration failed
        await loadChatHistory(project)
        toast({
          title: "Revert Failed",
          description: "Failed to restore files to this version.",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('[Checkpoint] Error reverting to checkpoint:', error)
      // Reload messages on error
      if (project) {
        await loadChatHistory(project)
      }
      toast({
        title: "Revert Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred.",
        variant: "destructive"
      })
    } finally {
      setIsReverting(false)
      setRevertMessageId(null)
    }
  }
  
  const cancelRevert = () => {
    setShowRevertDialog(false)
    setRevertMessageId(null)
  }

  // Scroll detection logic
  const checkScrollPosition = useCallback(() => {
    if (!messagesContainerRef.current) return

    const container = messagesContainerRef.current
    const { scrollTop, scrollHeight, clientHeight } = container
    
    // Show button when user is not near the bottom (within 100px)
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
    const shouldShow = !isNearBottom && messages.length > 0
    
    // For mobile - more aggressive showing logic
    const isMobileDevice = isMobile || window.innerWidth <= 768
    const forceShowMobile = isMobileDevice && messages.length > 2 && scrollHeight > clientHeight * 1.2
    
    setShowScrollToBottom(shouldShow || forceShowMobile)
  }, [messages.length, isMobile])

  // Smooth scroll to bottom function
  const scrollToBottom = useCallback(() => {
    if (!messagesContainerRef.current) return

    const container = messagesContainerRef.current
    const scrollOptions: ScrollIntoViewOptions = {
      behavior: 'smooth',
      block: 'end',
      inline: 'nearest'
    }

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      scrollOptions.behavior = 'auto'
    }

    // Scroll to the last message or bottom of container
    const lastMessage = container.lastElementChild
    if (lastMessage) {
      lastMessage.scrollIntoView(scrollOptions)
    } else {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: scrollOptions.behavior
      })
    }

    // Hide the scroll button after scrolling
    setShowScrollToBottom(false)
  }, [])

  // Set up scroll event listener
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    // Throttle scroll events for performance
    let ticking = false
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          checkScrollPosition()
          ticking = false
        })
        ticking = true
      }
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    
    // Initial check
    checkScrollPosition()

    return () => {
      container.removeEventListener('scroll', handleScroll)
    }
  }, [checkScrollPosition])

  // Auto-scroll to bottom when new messages arrive (but only if user was already at bottom)
  useEffect(() => {
    if (!messagesContainerRef.current || messages.length === 0) return

    const container = messagesContainerRef.current
    const { scrollTop, scrollHeight, clientHeight } = container
    const wasNearBottom = scrollHeight - scrollTop - clientHeight < 100

    // Auto-scroll if user was near bottom or if this is the first message
    if (wasNearBottom || messages.length === 1) {
      // Small delay to ensure DOM has updated
      setTimeout(() => {
        scrollToBottom()
      }, 50)
    } else {
      // Check scroll position to potentially show the button
      checkScrollPosition()
    }
  }, [messages.length, scrollToBottom, checkScrollPosition])
  
  return (
    <div className="flex flex-col h-full">
      
      {/* Revert Confirmation Dialog */}
      <AlertDialog open={showRevertDialog} onOpenChange={setShowRevertDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revert to Previous Version?</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore all files in your project to the state they were in when this message was sent. 
              All changes made since then will be permanently lost.
              <br /><br />
              <strong className="text-foreground">This will also clear all messages that came after this point.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelRevert}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmRevert}
              className="bg-destructive hover:bg-destructive/90"
            >
              Revert Files and Messages
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Diagnostics Panel */}
      {showDiagnostics && !isMobile && (
        <div className="border-b border-border">
          <ChatDiagnostics project={project} />
        </div>
      )}
      
      {/* Messages Container - Fixed height, scrollable */}
      <div className={`flex-1 min-h-0 overflow-hidden bg-background relative ${
        isMobile ? 'pb-52' : ''
      }`}>
        <div
          ref={messagesContainerRef}
          className="h-full overflow-y-auto overflow-x-hidden p-4"
          style={{
            scrollBehavior: 'smooth',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          <HighlightLoader />
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="mb-6 p-6 rounded-full bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30">
                <MessageSquare className="w-12 h-12 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Welcome to {project?.name}</h3>
              <p className="text-gray-600 dark:text-gray-400 max-w-md mb-8 leading-relaxed">
                Start chatting to build, edit, and manage your project files. 
                I can help you create components, fix code, and understand your project structure.
              </p>
             
            </div>
          ) : (
            <div className="space-y-3">
              {messages.filter(msg => msg.role !== 'system').map((msg, index) => (
                <div key={index} className="flex">
                  <div className="max-w-full w-full">
                    {/* User message */}
                    {msg.role === 'user' && (
                      <div className="mb-3">
                        <div className="flex items-start">
                          <div className="flex-1 min-w-0">
                            <ExpandableUserMessage
                              content={msg.content}
                              messageId={msg.id}
                              onRevert={handleRevertToCheckpoint}
                              showRestore={restoreMessageId === msg.id}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Assistant message */}
                    {msg.role === 'assistant' && (
                      <div className="mb-3">
                        <div className="flex items-start">
                          <div className="flex-1 min-w-0">
                            {/* Workflow mode rendering */}
                            {msg.metadata?.workflowMode && msg.metadata?.workflowChunk && (
                              <WorkflowMessageComponent
                                workflowChunk={msg.metadata.workflowChunk}
                                sessionId={msg.metadata.sessionId}
                              />
                            )}

                            {/* Multi-step execution summary */}
                            {msg.metadata?.steps && (msg.metadata?.stepCount || 0) > 1 && (
                              <MultiStepSummary
                                steps={msg.metadata.steps}
                                hasErrors={msg.metadata.hasToolErrors || false}
                              />
                            )}
                            
                            {/* Tool execution results - exclude tool_results_summary as it displays in assistant bubble */}
                            {msg.metadata?.toolCalls && msg.metadata.toolCalls.length > 0 && (
                              <div className="space-y-2 mb-4">
                                {msg.metadata.toolCalls
                                  .filter((tc: any) => tc.name !== 'tool_results_summary')
                                  .map((toolCall: any, toolIndex: number) => (
                                    <ToolPill key={toolIndex} toolCall={toolCall} />
                                  ))
                                }
                              </div>
                            )}
                            
                            {/* XML Tool execution results */}
                            {msg.metadata?.xmlCommands && msg.metadata.xmlCommands.length > 0 && (
                              <div className="space-y-2 mb-4">
                                {(msg.metadata.xmlCommands as any[]).map((xmlCommand: any, xmlIndex: number) => {
                                  // Convert legacy format to new format if needed
                                  const toolCall: XMLToolCall = {
                                    id: xmlCommand.id || `legacy-${xmlIndex}`,
                                    name: xmlCommand.name || xmlCommand.command,
                                    args: xmlCommand.args || {
                                      path: xmlCommand.path,
                                      content: xmlCommand.content
                                    },
                                    status: xmlCommand.status || 'detected',
                                    result: xmlCommand.result,
                                    error: xmlCommand.error,
                                    startTime: xmlCommand.startTime,
                                    endTime: xmlCommand.endTime
                                  }
                                  
                                  return (
                                    <XMLToolPill 
                                      key={toolCall.id}
                                      toolCall={toolCall}
                                    />
                                  )
                                })}
                              </div>
                            )}
                            
                            {/* Message content */}
                            <div className="bg-card text-card-foreground border rounded-xl shadow-sm overflow-hidden w-full">
                              <div className="p-4">
                                {(() => {
                                  // Check if content has valid XML tools (not just keywords)
                                  const hasXMLTools = hasValidXMLTools(msg.content)
                                  const hasExistingPlaceholders = /<!-- XMLTOOL_pilot\w+_\d+_[a-z0-9]+ -->/.test(msg.content)
                                  
                                  if (hasXMLTools) {
                                    // Direct rendering of XML tools - only for valid XML syntax
                                    const renderedComponents = renderXMLToolsDirectly(msg.content)
                                    if (renderedComponents.length > 0) {
                                      return (
                                        <div className="space-y-3">
                                          {renderedComponents.map((component, idx) => (
                                            <div key={idx}>{component}</div>
                                          ))}
                                        </div>
                                      )
                                    }
                                    // If no valid components were rendered, fall through to normal content
                                  } else if (hasExistingPlaceholders) {
                                    // Handle existing placeholders (legacy support)
                                    const { content: processedContent, xmlTools } = parseXMLToolsToComponents(msg.content)
                                    const renderedComponents = renderXMLToolsInContent(processedContent, xmlTools)
                                    if (renderedComponents.length > 0) {
                                      return (
                                        <div className="space-y-3">
                                          {renderedComponents.map((component, idx) => (
                                            <div key={idx}>{component}</div>
                                          ))}
                                        </div>
                                      )
                                    }
                                    // If no valid components were rendered, fall through to normal content
                                  }
                                  
                                  // Otherwise, render normal markdown content
                                  return (
                                    <div className="chat-message-content prose prose-sm max-w-none">
                                      <ReactMarkdown 
                                        remarkPlugins={[remarkGfm]}
                                        components={{
                                          code: ({node, className, children, ...props}: any) => {
                                            const match = /language-(\w+)/.exec(className || '')
                                            const language = match ? match[1] : ''
                                            const isInline = !className
                                            
                                            return isInline ? (
                                                <code className="bg-gray-600 px-1.5 py-0.5 rounded text-sm font-mono border border-gray-500 text-white" {...props}>
                                                {children}
                                              </code>
                                            ) : (
                                              <div className="my-4">
                                                  <div className="bg-gray-600 border border-gray-500 rounded-lg overflow-hidden">
                                                    <div className="px-3 py-2 bg-gray-500 border-b border-gray-500 text-xs font-medium text-white">
                                                    {language || 'code'}
                                                  </div>
                                                  <pre className="p-4 overflow-x-auto bg-[#2e2e2e]">
                                                      <code className={`hljs ${language ? `language-${language}` : ''} text-sm text-white`}>
                                                      {children}
                                                    </code>
                                                  </pre>
                                                </div>
                                              </div>
                                            );
                                          },
                                          p: ({ children }) => (
                                              <p className="text-white leading-[1.5]  text-sm mb-3 last:mb-0 font-medium">{children}</p>
                                          ),
                                          ul: ({ children }) => (
                                              <ul className="list-disc list-inside space-y-1 text-white mb-3">{children}</ul>
                                          ),
                                          ol: ({ children }) => (
                                              <ol className="list-decimal list-inside space-y-1 text-white mb-3">{children}</ol>
                                          ),
                                          h1: ({ children }) => (
                                              <h1 className="text-lg font-bold mb-3 text-white">{children}</h1>
                                          ),
                                          h2: ({ children }) => (
                                              <h2 className="text-base font-bold mb-2 text-white">{children}</h2>
                                          ),
                                          h3: ({ children }) => (
                                              <h3 className="text-sm font-bold mb-2 text-white">{children}</h3>
                                          ),
                                        }}
                                      >
                                        {msg.content}
                                      </ReactMarkdown>
                                    </div>
                                  )
                                })()}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Action buttons */}
                    <div className="flex items-start mt-2">
                      <button
                        className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                        title="Retry message"
                        onClick={async () => {
                          // Retry the message by sending it again
                          if (!project || isLoading) return;
                          
                          const messageContent = msg.content;
                          
                          const userMessage: Message = {
                            id: Date.now().toString(),
                            role: "user",
                            content: messageContent,
                            createdAt: new Date().toISOString(),
                          }

                          setMessages(prev => [...prev, userMessage])
                          setIsLoading(true)

                          // Create abort controller for this request
                          const controller = new AbortController()
                          setAbortController(controller)

                          // Save user message to IndexedDB
                          await saveMessageToIndexedDB(userMessage)
                          
                          // Create checkpoint for this message
                          if (project) {
                            try {
                              await new Promise(resolve => setTimeout(resolve, 50))
                              await createCheckpoint(project.id, userMessage.id)
                              console.log(`[Checkpoint] Created checkpoint for retry message ${userMessage.id}`)
                            } catch (error) {
                              console.error('[Checkpoint] Error creating checkpoint for retry:', error)
                            }
                          }

                          try {
                            // Fetch project files and chat history from IndexedDB
                            const { storageManager } = await import('@/lib/storage-manager')
                            await storageManager.init()
                            const files = await storageManager.getFiles(project.id)

                            const endpoint = '/api/chat'
                            const body = {
                              messages: [...messages, userMessage].map(({ id, createdAt, ...msg }) => msg),
                              projectId: project.id,
                              useTools: true,
                              selectedModel,
                              aiMode,
                              files: files || []
                            }

                            const response = await fetch(endpoint, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(body),
                              signal: controller.signal
                            })

                            if (!response.ok) {
                              throw new Error(`HTTP error! status: ${response.status}`)
                            }

                            const reader = response.body?.getReader()
                            if (!reader) {
                              throw new Error('No response body')
                            }

                            let assistantMessage: Message = {
                              id: (Date.now() + 1).toString(),
                              role: "assistant",
                              content: "",
                              createdAt: new Date().toISOString(),
                            }

                            setMessages(prev => [...prev, assistantMessage])

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
                                  try {
                                    const data = JSON.parse(line.slice(6))
                                    
                                    if (data.type === 'content') {
                                      assistantMessage.content += data.content
                                      setMessages(prev => prev.map(msg => 
                                        msg.id === assistantMessage.id ? { ...assistantMessage } : msg
                                      ))
                                    }
                                  } catch (e) {
                                    // Ignore parsing errors
                                  }
                                }
                              }
                            }

                            // Save final assistant message to IndexedDB
                            await saveMessageToIndexedDB(assistantMessage)

                          } catch (error) {
                            console.error('Error retrying message:', error)
                            
                            if (error instanceof Error && error.name === 'AbortError') {
                              console.log('Retry request was aborted')
                              return
                            }
                            
                            toast({
                              title: "Error",
                              description: `Failed to retry message: ${error instanceof Error ? error.message : 'Unknown error'}`,
                              variant: "destructive",
                            })
                          } finally {
                            setIsLoading(false)
                            setIsStreaming(false)
                            setAbortController(null)
                          }
                        }}
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 rounded transition-colors ml-1"
                        title="Copy message"
                        onClick={() => handleCopyMessage(msg.id, msg.content)}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-gray-700 rounded transition-colors ml-1"
                        title="Delete message"
                        onClick={() => handleDeleteMessage(msg.id, msg.role)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Show interactive thinking indicator when loading */}
              {isLoading && (
                <div className="mb-6">
                  <div className="p-4">
                    <ThinkingIndicator isStreaming={isStreaming} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Floating Scroll to Bottom Button */}
        <FloatingScrollToBottom
          isVisible={showScrollToBottom}
          onClick={scrollToBottom}
          isMobile={isMobile}
        />
      </div>
      
      {/* Footer - Fixed on mobile, normal on desktop */}
      <footer className={`border-t border-border flex-shrink-0 bg-background ${
        isMobile 
          ? 'fixed bottom-12 left-0 right-0 p-4 z-30 border-b' 
          : 'p-4'
      }`}>
        
        <form onSubmit={handleSendMessage} className="space-y-3">
          {/* Attached Files Display */}
          {attachedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 px-2">
              {attachedFiles.map((file) => (
                <FileAttachmentBadge
                  key={file.id}
                  file={file}
                  onRemove={() => handleRemoveAttachedFile(file.id)}
                />
              ))}
            </div>
          )}

          <div className="relative flex items-center bg-[#2b2b2b] border border-gray-600 rounded-[24px] px-4 py-3">
            {/* Main input row: textarea + mode selector */}
            <div className="flex items-center w-full relative">
              {/* Mode selector at bottom left inside input */}
            <AiModeSelector
  selectedMode={aiMode}
  onModeChange={onModeChange ?? (() => {})}
  compact
  className="absolute left-0 bottom-0 z-10 mt-12"
/>

              <textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setInputMessage(newValue);
                  const textarea = e.target as HTMLTextAreaElement;
                  
                  // Handle @ command detection
                  const cursorPos = textarea.selectionStart;
                  const atCommand = detectAtCommand(newValue, cursorPos);
                  
                  if (atCommand) {
                    setFileQuery(atCommand.query);
                    setAtCommandStartIndex(atCommand.startIndex);
                    
                    if (!showFileDropdown) {
                      const position = calculateDropdownPosition(textarea, atCommand.startIndex);
                      setDropdownPosition(position);
                      setShowFileDropdown(true);
                    }
                  } else {
                    if (showFileDropdown) {
                      closeFileDropdown();
                    }
                  }
                  
                  // Reset to baseline then expand up to the max (90px)
                  textarea.style.height = '64px';
                  const newHeight = Math.min(textarea.scrollHeight, 140)
                  textarea.style.height = newHeight + 'px';
                  // Only show a vertical scrollbar when content exceeds the max height
                  textarea.style.overflowY = textarea.scrollHeight > 140 ? 'auto' : 'hidden'
                  if (isEditingRevertedMessage) {
                    const revertedMessage = messages.find(m => m.id === revertMessageId)?.content || '';
                    if (e.target.value !== revertedMessage) {
                      setIsEditingRevertedMessage(false);
                    }
                  }
                }}
                onInput={(e) => {
                  const textarea = e.target as HTMLTextAreaElement;
                  textarea.style.height = '54px';
                  const newHeight = Math.min(textarea.scrollHeight, 140)
                  textarea.style.height = newHeight + 'px';
                  textarea.style.overflowY = textarea.scrollHeight > 140 ? 'auto' : 'hidden'
                }}
                onClick={(e) => {
                  // Handle cursor position changes for @ command detection
                  const textarea = e.target as HTMLTextAreaElement;
                  const cursorPos = textarea.selectionStart;
                  const atCommand = detectAtCommand(inputMessage, cursorPos);
                  
                  if (atCommand && !showFileDropdown) {
                    setFileQuery(atCommand.query);
                    setAtCommandStartIndex(atCommand.startIndex);
                    const position = calculateDropdownPosition(textarea, atCommand.startIndex);
                    setDropdownPosition(position);
                    setShowFileDropdown(true);
                  } else if (!atCommand && showFileDropdown) {
                    closeFileDropdown();
                  }
                }}
                onKeyDown={(e) => {
                  // Handle dropdown navigation
                  if (showFileDropdown) {
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      closeFileDropdown();
                      return;
                    }
                    // Let the dropdown handle other keys (Arrow keys, Enter)
                    if (['ArrowDown', 'ArrowUp', 'Enter'].includes(e.key)) {
                      return; // Let the dropdown component handle these
                    }
                  }
                  
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage(e)
                  }
                }}
                placeholder={isEditingRevertedMessage ? "Editing reverted message... Make changes and press Enter to send" : "Plan, build and ship faster. Type @ to attach files."}
                className={`flex-1 bg-transparent border-none outline-none text-white placeholder-gray-400 text-[15px] resize-none rounded-md px-2 py-2 leading-[1.5] min-h-[48px] max-h-[140px] ${
                  isEditingRevertedMessage ? 'border-yellow-500 ring-yellow-500 ring-2' : ''
                }`}
                disabled={isLoading}
                rows={1}
                style={{
                  height: '77px',
                  minHeight: '48px',
                  maxHeight: '140px',
                  overflowY: 'hidden', // hide scrollbar until content exceeds maxHeight
                  resize: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <button
                type={isLoading ? "button" : "submit"}
                disabled={!inputMessage.trim() && !isLoading}
                onClick={isLoading ? handleStopGeneration : undefined}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 w-10 h-10 rounded-full bg-gradient-to-r from-[#00c853] to-[#4caf50] text-white hover:from-[#00a844] hover:to-[#45a049] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center shadow-lg"
              >
                {isLoading ? (
                  <div className="relative w-4 h-4 flex items-center justify-center">
                    <div className="absolute inset-0 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <div className="w-2 h-2 bg-red-500 hover:bg-red-600 cursor-pointer transition-colors" style={{ borderRadius: '2px' }} />
                  </div>
                ) : (
                  <ArrowUp className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
          {/* Model selector and loading indicator */}
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
            {/* Show edit mode indicator */}
            {isEditingRevertedMessage && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                <span className="text-yellow-600 dark:text-yellow-400">Editing reverted message</span>
              </div>
            )}
          </div>
        </form>
      </footer>

      {/* File Attachment Dropdown */}
      <FileAttachmentDropdown
        isVisible={showFileDropdown}
        query={fileQuery}
        onFileSelect={handleFileSelect}
        onClose={closeFileDropdown}
        position={dropdownPosition}
        projectId={project?.id || null}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          setShowAuthModal(false)
          // Auth modal handles navigation internally
        }}
      />
      
    </div>
  )
}
