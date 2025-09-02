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
  User
} from "lucide-react"
import { FileAttachmentDropdown } from "@/components/ui/file-attachment-dropdown"
import { FileAttachmentBadge } from "@/components/ui/file-attachment-badge"
import { FileSearchResult } from "@/lib/file-lookup-service"
import { useToast } from "@/hooks/use-toast"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Workspace as Project } from "@/lib/storage-manager"
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

// ToolPill component for displaying server-side tool results
const ToolPill = ({ toolCall, status = 'completed' }: { toolCall: any, status?: 'executing' | 'completed' | 'failed' }) => {
  const getToolIcon = (toolName: string) => {
    switch (toolName) {
      case 'write_file': return FileText
      case 'edit_file': return Edit3
      case 'read_file': return Eye
      case 'list_files': return FolderOpen
      case 'delete_file': return X
      case 'tool_results_summary': return Check
      case 'web_search': return Globe
      case 'web_extract': return FileSearch
      case 'search_knowledge': return BookOpen
      case 'get_knowledge_item': return BookOpen
      case 'get_project_summary': return Database
      case 'recall_context': return User
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
      case 'tool_results_summary': return 'Summary Generated'
      case 'web_search': return 'Searched'
      case 'web_extract': return 'Extracted'
      case 'search_knowledge': return 'Knowledge Searched'
      case 'get_knowledge_item': return 'Knowledge Retrieved'
      case 'get_project_summary': return 'Project Summarized'
      case 'recall_context': return 'Context Recalled'
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

  // Special handling for tool_results_summary
  if (toolCall.name === 'tool_results_summary') {
    const isIntroduction = toolCall.result?.phase === 'introduction'
    const phaseIcon = isIntroduction ? '🚀' : '📊'
    const phaseTitle = isIntroduction ? 'Development Plan' : 'Session Summary'
    const [isExpanded, setIsExpanded] = useState(false)
    
    return (
      <div className="bg-background border rounded-lg shadow-sm mb-3 overflow-hidden">
          {/* Header - Clickable to toggle */}
          <div
            className={`px-4 py-3 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
              isSuccess
              ? `bg-muted border-border`
              : 'bg-red-900/30 border-red-700'
            }`}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${
                isSuccess
                ? `bg-gradient-to-r from-[#00c853] to-[#4caf50] text-white`
                  : 'bg-red-500'
              }`}>
                <IconComponent className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-foreground">{phaseIcon} {phaseTitle}</span>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    isSuccess
                    ? `bg-primary text-primary-foreground`
                      : 'bg-red-900/50 text-red-300'
                  }`}>
                    {isSuccess ? (isIntroduction ? 'Planned' : 'Generated') : ' Failed'}
                  </span>
                </div>
              <div className="text-xs text-muted-foreground mt-1">
                  {toolCall.result?.session_title && (
                    <span className="font-medium">{toolCall.result.session_title} • </span>
                  )}
                  {toolCall.result?.changes_count || 0} changes • {toolCall.result?.suggestions_count || 0} {isIntroduction ? 'questions' : 'suggestions'} • {toolCall.result?.completeness || 0}% complete
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
          
          {/* Summary Content - Collapsible */}
          {isSuccess && toolCall.result?.summary && isExpanded && (
          <div className="p-4 bg-background border-t">
              <ExpandableAISummary content={toolCall.result.summary} />
            </div>
          )}
      </div>
    )
  }
  
  // Special handling for web_search tool
  if (toolCall.name === 'web_search') {
    const [isExpanded, setIsExpanded] = useState(false)
    
    // Debug logging to see the actual structure
    console.log('[DEBUG] web_search tool result:', toolCall.result)
    
    const resultCount = toolCall.result?.metadata?.resultCount || toolCall.result?.results?.length || 0
    const cleanResults = toolCall.result?.cleanResults || toolCall.result?.results || []
    
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
              <span>{resultCount} results found</span>
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
              {cleanResults ? (
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
                    {cleanResults}
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
    
    const cleanResults = toolCall.result?.cleanResults || toolCall.result?.results || []
    const urlCount = toolCall.result?.metadata?.urlCount || toolCall.result?.metadata?.contentCount || toolCall.result?.urls?.length || 0
    
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
                <span>{urlCount} URL{urlCount !== 1 ? 's' : ''} processed</span>
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
              {cleanResults ? (
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
                    {cleanResults}
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

  // Special handling for analyze_project tool
  if (toolCall.name === 'analyze_project') {
    const [isExpanded, setIsExpanded] = useState(false)
    const analysis = toolCall.result || {}
    
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
                <span className="font-medium text-foreground">Project Analysis</span>
                <span className="text-xs text-muted-foreground">({analysis.totalFiles || 0} files)</span>
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
        
        {/* Project Analysis - Collapsible */}
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
                  {toolCall.result?.message || 'Project analysis completed successfully.'}
                </ReactMarkdown>
              </div>
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
    
    // Highlight code blocks after each render
    const highlight = () => {
      if ((window as any).hljs) {
        document.querySelectorAll('pre code').forEach(block => {
          (window as any).hljs.highlightElement(block)
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
  const [showDiagnostics, setShowDiagnostics] = useState(false)
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)
  const [isEditingRevertedMessage, setIsEditingRevertedMessage] = useState(false) // New state for edit mode
  const [showScrollToBottom, setShowScrollToBottom] = useState(false) // State for floating chevron visibility
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null) // Ref for messages container

  // File attachment state
  const [attachedFiles, setAttachedFiles] = useState<FileSearchResult[]>([])
  const [showFileDropdown, setShowFileDropdown] = useState(false)
  const [fileQuery, setFileQuery] = useState("")
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })
  const [atCommandStartIndex, setAtCommandStartIndex] = useState(-1)

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
        
        console.log(`[ChatPanel] Loaded ${formattedMessages.length} messages for project ${targetProject.id}`)
        setMessages(formattedMessages)
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
      
      // Save message to the session
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
    if (!inputMessage.trim() || !project || isLoading) return

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
        
        // CRITICAL: Prevent empty assistant messages from being rendered
        // Only create and display the message if there's actual content
        if (jsonResponse.message && jsonResponse.message.trim()) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
            content: jsonResponse.message,
          createdAt: new Date().toISOString(),
          metadata: {
            toolCalls: jsonResponse.toolCalls || [],
            success: jsonResponse.success,
            hasToolCalls: jsonResponse.hasToolCalls,
            hasToolErrors: jsonResponse.hasToolErrors,
            stepCount: jsonResponse.stepCount,
            steps: jsonResponse.steps,
            serverSideExecution: true,
            fileOperations: jsonResponse.fileOperations || []
          }
        }
        
        setMessages(prev => [...prev, assistantMessage])
        await saveMessageToIndexedDB(assistantMessage)
          
          console.log('[DEBUG] Added assistant message with content:', jsonResponse.message.substring(0, 100) + '...')
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

        // Create assistant message with loading indicator
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
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

              const chunk = decoder.decode(value, { stream: true })
              
              // Handle different streaming formats
              if (chunk.includes('data: ')) {
                // Server-Sent Events format
            const lines = chunk.split('\n')
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6))
                  if (data.choices?.[0]?.delta?.content) {
                    assistantContent += data.choices[0].delta.content
                        hasReceivedContent = true
                    setMessages(prev => prev.map(msg => 
                          msg.id === assistantMessageId 
                        ? { ...msg, content: assistantContent }
                        : msg
                    ))
                  }
                } catch (e) {
                  // Ignore parsing errors for non-JSON lines
            }
          }
        }
      } else {
                // Direct text streaming (AI SDK format)
                if (chunk.trim()) {
                  assistantContent += chunk
                  hasReceivedContent = true
          setMessages(prev => prev.map(msg => 
                    msg.id === assistantMessageId 
              ? { ...msg, content: assistantContent }
              : msg
          ))
        }
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

        // Save assistant message to database after streaming completes
        if (project && assistantContent.trim()) {
          const finalAssistantMessage: Message = {
            id: assistantMessageId,
            role: "assistant",
            content: assistantContent,
            createdAt: new Date().toISOString(),
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
                            {/* Multi-step execution summary */}
                            {msg.metadata?.steps && (msg.metadata?.stepCount || 0) > 1 && (
                              <MultiStepSummary 
                                steps={msg.metadata.steps} 
                                hasErrors={msg.metadata.hasToolErrors || false} 
                              />
                            )}
                            
                            {/* Tool execution results */}
                            {msg.metadata?.toolCalls && msg.metadata.toolCalls.length > 0 && (
                              <div className="space-y-2 mb-4">
                                {msg.metadata.toolCalls.map((toolCall, toolIndex) => (
                                  <ToolPill key={toolIndex} toolCall={toolCall} />
                                ))}
                              </div>
                            )}
                            
                            {/* Message content */}
                            <div className="bg-card text-card-foreground border rounded-xl shadow-sm overflow-hidden w-full">
                              <div className="p-4">
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
                        onClick={() => {
                          // Set the message content as the input and enable edit mode
                          setInputMessage(msg.content);
                          setIsEditingRevertedMessage(true);
                          setRevertMessageId(msg.id);
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
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden">
                    <ThinkingIndicator />
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
      
    </div>
  )
}