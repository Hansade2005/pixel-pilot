'use client'

import React, { useEffect, useState } from 'react'
import { Reasoning, ReasoningTrigger, ReasoningContent } from '@/components/ai-elements/reasoning'
import { Response } from '@/components/ai-elements/response'
import { FileText, Edit3, X, Package, PackageMinus, Loader2, CheckCircle2, XCircle, BrainIcon, FileCode, FileImage, FileJson, FileType, Settings, Package as PackageIcon, File, Globe, Eye } from 'lucide-react'
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

  const getToolIcon = (toolName: string) => {
    switch (toolName) {
      case 'write_file': return FileText
      case 'edit_file': return Edit3
      case 'delete_file': return X
      case 'read_file': return Eye
      case 'add_package': return Package
      case 'remove_package': return PackageMinus
      case 'web_search': return Globe
      case 'web_extract': return Globe
      case 'semantic_code_navigator': return BrainIcon
      case 'check_dev_errors': return Settings
      default: return FileText
    }
  }

  const getToolLabel = (toolName: string) => {
    switch (toolName) {
      case 'write_file': return 'Creating file'
      case 'edit_file': return 'Editing file'
      case 'delete_file': return 'Deleting file'
      case 'read_file': return 'Reading file'
      case 'add_package': return 'Adding package'
      case 'remove_package': return 'Removing package'
      case 'web_search': return 'Searching web'
      case 'web_extract': return 'Extracting web content'
      case 'semantic_code_navigator': return 'Searching code'
      case 'check_dev_errors': return 'Checking errors'
      default: return toolName
    }
  }

  const getToolCompletedLabel = (toolName: string) => {
    switch (toolName) {
      case 'write_file': return 'Created'
      case 'edit_file': return 'Modified'
      case 'delete_file': return 'Deleted'
      case 'read_file': return 'Read'
      case 'add_package': return 'Added'
      case 'remove_package': return 'Removed'
      case 'web_search': return 'Searched'
      case 'web_extract': return 'Extracted'
      case 'semantic_code_navigator': return 'Found'
      case 'check_dev_errors': return 'Checked'
      default: return 'Completed'
    }
  }

  const renderToolPill = (toolInvocation: any) => {
    const Icon = getToolIcon(toolInvocation.toolName)
    const isLoading = toolInvocation.state === 'call'
    const isCompleted = toolInvocation.state === 'result'
    const hasError = isCompleted && toolInvocation.result?.error

    // Get display text based on tool
    let displayText = ''
    let pillText = ''

    if (['write_file', 'edit_file', 'delete_file', 'read_file'].includes(toolInvocation.toolName)) {
      // Use result path for completed operations, args path for loading
      let filePath = 'file';

      if (toolInvocation.toolName === 'edit_file') {
        // For edit_file, the path is in args.filePath
        filePath = (isCompleted ? toolInvocation.result?.path : null) || toolInvocation.args?.filePath || 'file';
      } else {
        // For other file operations, path is in args.path
        filePath = (isCompleted ? toolInvocation.result?.path : null) || toolInvocation.args?.path || 'file';
      }

      const fileName = filePath.split('/').pop() || 'file';
      displayText = fileName;

      if (isLoading) {
        pillText = `${getToolLabel(toolInvocation.toolName)}: ${fileName}`
      } else {
        const action = toolInvocation.toolName === 'write_file'
          ? (toolInvocation.result?.action === 'updated' ? 'Modified' : 'Created')
          : toolInvocation.toolName === 'edit_file' ? 'Modified'
          : toolInvocation.toolName === 'delete_file' ? 'Deleted'
          : 'Read';
        pillText = `${action} ${fileName}`;
      }
    } else if (['add_package', 'remove_package'].includes(toolInvocation.toolName)) {
      const packageNames = toolInvocation.result?.packages || toolInvocation.args?.name || []
      const packageList = Array.isArray(packageNames) ? packageNames : [packageNames]
      const packageString = packageList.join(', ')
      displayText = packageString

      if (isLoading) {
        pillText = getToolLabel(toolInvocation.toolName)
      } else {
        const action = toolInvocation.toolName === 'add_package' ? 'Added' : 'Removed'
        pillText = `${action} packages`
      }
    } else if (toolInvocation.toolName === 'web_search') {
      const query = toolInvocation.result?.query || toolInvocation.args?.query || 'web search'
      const truncatedQuery = query.length > 20 ? `${query.substring(0, 20)}...` : query
      displayText = truncatedQuery

      if (isLoading) {
        pillText = getToolLabel(toolInvocation.toolName)
      } else {
        pillText = `Web search completed`
      }
    } else if (toolInvocation.toolName === 'web_extract') {
      const urls = toolInvocation.result?.metadata?.urls || toolInvocation.args?.urls || []
      const urlList = Array.isArray(urls) ? urls : [urls]
      displayText = urlList.length > 1 ? `${urlList.length} URLs` : (urlList[0] || 'URL')

      if (isLoading) {
        pillText = getToolLabel(toolInvocation.toolName)
      } else {
        pillText = `Web extract completed`
      }
    } else if (toolInvocation.toolName === 'semantic_code_navigator') {
      const query = toolInvocation.result?.query || toolInvocation.args?.query || 'code search'
      const truncatedQuery = query.length > 20 ? `${query.substring(0, 20)}...` : query
      displayText = truncatedQuery

      if (isLoading) {
        pillText = getToolLabel(toolInvocation.toolName)
      } else {
        const resultsCount = toolInvocation.result?.totalResults || 0
        pillText = `Found ${resultsCount} code matches`
      }
    } else if (toolInvocation.toolName === 'check_dev_errors') {
      const mode = toolInvocation.result?.mode || toolInvocation.args?.mode || 'dev'
      displayText = `${mode} check`

      if (isLoading) {
        pillText = getToolLabel(toolInvocation.toolName)
      } else {
        const hasErrors = toolInvocation.result?.errorCount > 0
        pillText = hasErrors ? 'Errors found' : 'No errors'
      }
    } else {
      pillText = isLoading ? getToolLabel(toolInvocation.toolName) : getToolCompletedLabel(toolInvocation.toolName)
    }

    return (
      <div
        key={toolInvocation.toolCallId}
        className={cn(
          "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border",
          isLoading
            ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300"
            : isCompleted && !hasError
            ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-950 dark:border-green-800 dark:text-green-300"
            : hasError
            ? "bg-red-50 border-red-200 text-red-700 dark:bg-red-950 dark:border-red-800 dark:text-red-300"
            : "bg-gray-50 border-gray-200 text-gray-700 dark:bg-gray-950 dark:border-gray-800 dark:text-gray-300"
        )}
      >
        <Icon className="size-3" />
        <span className="truncate max-w-48">{pillText}</span>
        {isLoading && <Loader2 className="size-3 animate-spin" />}
        {isCompleted && !hasError && <CheckCircle2 className="size-3" />}
        {hasError && <XCircle className="size-3" />}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Render tool pills if present */}
      {hasTools && (
        <div className="flex flex-wrap gap-2">
          {toolInvocations?.map((toolInvocation: any) => renderToolPill(toolInvocation))}
        </div>
      )}

      {/* Render reasoning if present */}
      {hasReasoning && (
        <Reasoning isStreaming={isStreaming && !hasResponse}>
          <ReasoningTrigger />
          <ReasoningContent>
            {reasoningContent}
          </ReasoningContent>
        </Reasoning>
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
