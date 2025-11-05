'use client'

import React, { useEffect, useState } from 'react'
import { Task, TaskTrigger, TaskContent, TaskItem } from '@/components/ai-elements/task'
import { ChainOfThought, ChainOfThoughtHeader, ChainOfThoughtContent, ChainOfThoughtStep } from '@/components/ai-elements/chain-of-thought'
import { Response } from '@/components/ai-elements/response'
import { FileText, Edit3, X, Package, PackageMinus, Loader2, CheckCircle2, XCircle, BrainIcon, FileCode,FolderOpen,Search, FileImage, FileJson, FileType, Settings, Package as PackageIcon, File, Globe, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'

// Message type compatible with AI SDK v5
interface MessageWithToolsProps {
  message: any // Using any because AI SDK v5 types are complex
  projectId?: string
  isStreaming?: boolean
}

// Component for Simple Icon with fallback
const SimpleIconWithFallback = ({ iconName, fallbackIcon, color }: { iconName: string, fallbackIcon: React.ReactNode, color: string }) => {
  const [imageError, setImageError] = useState(false)

  if (imageError) {
    return <>{fallbackIcon}</>
  }

  return (
    <img
      src={`https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/${iconName}.svg`}
      alt={iconName}
      className="h-4 w-4"
      style={{ filter: getColorFilter(color) }}
      onError={() => setImageError(true)}
    />
  )
}

// Color filter function for Simple Icons
const getColorFilter = (color: string) => {
  const colorMap: { [key: string]: string } = {
    'blue': 'invert(39%) sepia(93%) saturate(1473%) hue-rotate(211deg) brightness(101%) contrast(101%)',
    'yellow': 'invert(77%) sepia(88%) saturate(1053%) hue-rotate(2deg) brightness(107%) contrast(105%)',
    'pink': 'invert(67%) sepia(89%) saturate(749%) hue-rotate(296deg) brightness(101%) contrast(101%)',
    'orange': 'invert(73%) sepia(65%) saturate(530%) hue-rotate(1deg) brightness(102%) contrast(101%)',
    'green': 'invert(48%) sepia(79%) saturate(247%) hue-rotate(86deg) brightness(97%) contrast(101%)',
    'purple': 'invert(19%) sepia(86%) saturate(3090%) hue-rotate(258deg) brightness(101%) contrast(105%)',
    'red': 'invert(16%) sepia(95%) saturate(7153%) hue-rotate(0deg) brightness(104%) contrast(104%)',
    'cyan': 'invert(72%) sepia(26%) saturate(987%) hue-rotate(169deg) brightness(94%) contrast(93%)',
    'gray': 'invert(27%) sepia(51%) saturate(2878%) hue-rotate(346deg) brightness(104%) contrast(97%)'
  }
  return colorMap[color] || colorMap['gray']
}

// Get file icon based on file extension
const getFileIcon = (fileName: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase()

  // Map file extensions to Simple Icons
  const getSimpleIcon = (iconName: string, fallbackIcon: React.ReactNode, color: string) => {
    return <SimpleIconWithFallback iconName={iconName} fallbackIcon={fallbackIcon} color={color} />
  }

  switch (extension) {
    case 'tsx':
    case 'jsx':
      return getSimpleIcon('react', <FileCode className="h-4 w-4 text-blue-500" />, 'blue')
    case 'ts':
      return getSimpleIcon('typescript', <FileType className="h-4 w-4 text-blue-500" />, 'blue')
    case 'js':
      return getSimpleIcon('javascript', <FileType className="h-4 w-4 text-yellow-500" />, 'yellow')
    case 'css':
      return getSimpleIcon('css3', <File className="h-4 w-4 text-blue-500" />, 'blue')
    case 'scss':
    case 'sass':
      return getSimpleIcon('sass', <File className="h-4 w-4 text-pink-500" />, 'pink')
    case 'html':
      return getSimpleIcon('html5', <FileText className="h-4 w-4 text-orange-600" />, 'orange')
    case 'json':
      return getSimpleIcon('json', <FileJson className="h-4 w-4 text-green-500" />, 'green')
    case 'md':
      return getSimpleIcon('markdown', <FileText className="h-4 w-4 text-purple-500" />, 'purple')
    case 'py':
      return getSimpleIcon('python', <FileCode className="h-4 w-4 text-blue-600" />, 'blue')
    case 'java':
      return getSimpleIcon('java', <FileCode className="h-4 w-4 text-red-600" />, 'red')
    case 'cpp':
    case 'c':
      return getSimpleIcon('cplusplus', <FileCode className="h-4 w-4 text-blue-700" />, 'blue')
    case 'php':
      return getSimpleIcon('php', <FileCode className="h-4 w-4 text-purple-600" />, 'purple')
    case 'rb':
      return getSimpleIcon('ruby', <FileCode className="h-4 w-4 text-red-500" />, 'red')
    case 'go':
      return getSimpleIcon('go', <FileCode className="h-4 w-4 text-cyan-600" />, 'cyan')
    case 'rs':
      return getSimpleIcon('rust', <FileCode className="h-4 w-4 text-orange-700" />, 'orange')
    case 'sh':
    case 'bat':
    case 'ps1':
      return getSimpleIcon('bash', <FileCode className="h-4 w-4 text-green-700" />, 'green')
    case 'sql':
      return getSimpleIcon('mysql', <FileText className="h-4 w-4 text-blue-800" />, 'blue')
    case 'txt':
    case 'log':
      return <FileText className="h-4 w-4 text-gray-500" />
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
      return <FileImage className="h-4 w-4 text-orange-500" />
    case 'svg':
      return getSimpleIcon('svg', <FileImage className="h-4 w-4 text-orange-500" />, 'orange')
    default:
      if (fileName === 'package.json') {
        return getSimpleIcon('npm', <PackageIcon className="h-4 w-4 text-red-500" />, 'red')
      }
      if (fileName === 'yarn.lock') {
        return getSimpleIcon('yarn', <PackageIcon className="h-4 w-4 text-blue-500" />, 'blue')
      }
      if (fileName === 'pnpm-lock.yaml') {
        return getSimpleIcon('pnpm', <PackageIcon className="h-4 w-4 text-orange-500" />, 'orange')
      }
      if (fileName === 'Dockerfile') {
        return getSimpleIcon('docker', <FileCode className="h-4 w-4 text-blue-500" />, 'blue')
      }
      return <FileText className="h-4 w-4 text-gray-500" />
  }
}

export function MessageWithTools({ message, projectId, isStreaming = false }: MessageWithToolsProps) {
  // In AI SDK v5, messages have different structure
  // Check for both possible tool structures
  const toolInvocations = (message as any).toolInvocations || []
  const hasTools = toolInvocations && toolInvocations.length > 0

  // Get reasoning and response content
  const reasoningContent = (message as any).reasoning || ''
  const responseContent = (message as any).content || ''
  
  const hasReasoning = reasoningContent.trim().length > 0
  const hasResponse = responseContent.trim().length > 0

  // Debug logging
  console.log(`[MessageWithTools] Message ${message.id}:`, {
    role: message.role,
    hasReasoning,
    reasoningLength: reasoningContent.length,
    hasTools,
    toolCount: toolInvocations.length,
    hasResponse,
    responseLength: responseContent.length,
    isStreaming
  })

  // Dispatch events when tools complete
  useEffect(() => {
    if (!hasTools || !projectId) return

    toolInvocations?.forEach((toolInvocation: any) => {
      if (toolInvocation.state === 'result') {
        // Dispatch json-tool-executed event (maintains compatibility with existing system)
        window.dispatchEvent(new CustomEvent('json-tool-executed', {
          detail: {
            toolCall: {
              id: toolInvocation.toolCallId,
              tool: toolInvocation.toolName,
              args: toolInvocation.args,
              status: 'completed'
            },
            result: toolInvocation.result,
            immediate: true,
            projectId: projectId
          }
        }))

        // Dispatch files-changed event for file operations
        if (['write_file', 'edit_file', 'delete_file'].includes(toolInvocation.toolName)) {
          let filePath = 'unknown';
          
          if (toolInvocation.toolName === 'edit_file') {
            // For edit_file, the path is in args.filePath
            filePath = toolInvocation.result?.path || toolInvocation.args?.filePath || 'unknown';
          } else {
            // For other file operations, path is in args.path
            filePath = toolInvocation.result?.path || toolInvocation.args?.path || 'unknown';
          }
          
          window.dispatchEvent(new CustomEvent('files-changed', {
            detail: {
              projectId: projectId,
              action: toolInvocation.toolName,
              path: filePath,
              source: 'ai-sdk-tool',
              toolCallId: toolInvocation.toolCallId
            }
          }))
        }

        // Dispatch files-changed event for package operations
        if (['add_package', 'remove_package'].includes(toolInvocation.toolName)) {
          window.dispatchEvent(new CustomEvent('files-changed', {
            detail: {
              projectId: projectId,
              action: toolInvocation.toolName,
              path: 'package.json',
              source: 'ai-sdk-tool',
              toolCallId: toolInvocation.toolCallId
            }
          }))
        }
      }
    })
  }, [toolInvocations, projectId, hasTools])

  // Helper functions for ChainOfThought tool steps
  const getToolIcon = (toolName: string) => {
    switch (toolName) {
      case 'write_file': return FileText
      case 'edit_file': return Edit3
      case 'delete_file': return X
      case 'read_file': return Eye
      case 'list_files': return FolderOpen
      case 'add_package': return Package
      case 'remove_package': return PackageMinus
      case 'grep_search':
      case 'semantic_code_navigator': return Search
      case 'web_search':
      case 'web_extract':
      case 'vscode-websearchforcopilot_webSearch': return Globe
      case 'check_dev_errors': return Settings
      default: return FileText
    }
  }

  const getToolLabel = (toolName: string, args?: any) => {
    switch (toolName) {
      case 'write_file':
        return `Creating ${args?.path ? args.path.split('/').pop() : 'file'}`
      case 'edit_file':
        return `Editing ${args?.filePath ? args.filePath.split('/').pop() : 'file'}`
      case 'delete_file':
        return `Deleting ${args?.path ? args.path.split('/').pop() : 'file'}`
      case 'read_file':
        return `Reading ${args?.path ? args.path.split('/').pop() : 'file'}`
      case 'list_files':
        return 'Listing files'
      case 'add_package':
        return `Adding ${args?.packageName || 'package'}`
      case 'remove_package':
        return `Removing ${args?.packageName || 'package'}`
      case 'grep_search':
        return `Grep codebase for "${args?.query || 'pattern'}"`
      case 'semantic_code_navigator':
        return `Search codebase for "${args?.query || 'query'}"`
      case 'web_search':
      case 'vscode-websearchforcopilot_webSearch':
        return `Search web for "${args?.query || 'query'}"`
      case 'web_extract':
        return 'Extracting web content'
      case 'check_dev_errors':
        return 'Checking for errors'
      default:
        return toolName
    }
  }

  const getToolStatus = (toolInvocation: any): 'complete' | 'active' | 'pending' => {
    if (toolInvocation.state === 'result') {
      return toolInvocation.result?.error ? 'complete' : 'complete'
    }
    return isStreaming ? 'active' : 'complete'
  }

  // OLD renderToolInvocation function removed - now using ChainOfThought steps
  

  return (
    <div className="space-y-3">
      {/* OLD PILL SYSTEM - DISABLED IN FAVOR OF NEW INLINE PILL SYSTEM IN CHAT-PANEL-V2 */}
      {/* {hasTools && (
        <div className="space-y-2">
          {toolInvocations?.map((toolInvocation: any) => renderToolInvocation(toolInvocation))}
        </div>
      )} */}

      {/* Render reasoning and tools if present */}
      {(hasReasoning || hasTools) && (
        <ChainOfThought defaultOpen={false}>
          <ChainOfThoughtHeader>PiPilot is working</ChainOfThoughtHeader>
          <ChainOfThoughtContent>
            {/* Reasoning step */}
            {hasReasoning && (
              <ChainOfThoughtStep
                icon={BrainIcon}
                label="Thinking Process"
                status={isStreaming && !hasResponse ? "active" : "complete"}
              >
                <div className="text-sm text-muted-foreground whitespace-pre-wrap mt-2">
                  {reasoningContent}
                </div>
              </ChainOfThoughtStep>
            )}
            
            {/* Tool execution steps */}
            {hasTools && toolInvocations?.map((tool: any) => {
              const ToolIcon = getToolIcon(tool.toolName)
              return (
                <ChainOfThoughtStep
                  key={tool.toolCallId}
                  icon={ToolIcon}
                  label={getToolLabel(tool.toolName, tool.args)}
                  status={getToolStatus(tool)}
                >
                  {/* Show error message if tool failed */}
                  {tool.state === 'result' && tool.result?.error && (
                    <div className="text-sm text-red-500 mt-2">
                      Error: {tool.result.error}
                    </div>
                  )}
                  {/* Show success message if available */}
                  {tool.state === 'result' && !tool.result?.error && tool.result?.message && (
                    <div className="text-sm text-green-600 mt-2">
                      {tool.result.message}
                    </div>
                  )}
                </ChainOfThoughtStep>
              )
            })}
          </ChainOfThoughtContent>
        </ChainOfThought>
      )}

      {/* Render text content if present */}
      {hasResponse && (
        <div className={cn(
          'prose prose-sm dark:prose-invert max-w-none',
          'prose-pre:bg-muted prose-pre:text-foreground',
          'prose-code:text-foreground prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded'
        )}>
          <Response>
            {responseContent}
          </Response>
        </div>
      )}

      {/* Show loading indicator if streaming and no content yet */}
      {isStreaming && !hasReasoning && !hasResponse && !hasTools && (
        <div className="flex items-center justify-start gap-2 text-muted-foreground text-sm bg-transparent h-fit">
          <Loader2 className="size-4 animate-spin" />
          <span>Thinking...</span>
        </div>
      )}
    </div>
  )
}
