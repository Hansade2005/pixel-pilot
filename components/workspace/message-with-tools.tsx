'use client'

import React, { useEffect, useState } from 'react'
import { Task, TaskTrigger, TaskContent, TaskItem } from '@/components/ai-elements/task'
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
          window.dispatchEvent(new CustomEvent('files-changed', {
            detail: {
              projectId: projectId,
              action: toolInvocation.toolName,
              path: toolInvocation.result?.path || toolInvocation.args?.path || 'unknown',
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
      default: return 'Completed'
    }
  }

  const renderToolInvocation = (toolInvocation: any) => {
    const Icon = getToolIcon(toolInvocation.toolName)
    const isLoading = toolInvocation.state === 'call'
    const isCompleted = toolInvocation.state === 'result'
    const hasError = isCompleted && toolInvocation.result?.error

    // Get display text based on tool
    let displayText = ''
    let triggerTitle = ''
    if (['write_file', 'edit_file', 'delete_file', 'read_file'].includes(toolInvocation.toolName)) {
      // Use result path for completed operations, args path for loading
      const filePath = (isCompleted ? toolInvocation.result?.path : null) || toolInvocation.args?.path || 'file'
      displayText = filePath
      if (isLoading) {
        triggerTitle = getToolLabel(toolInvocation.toolName)
      } else {
        let operation = ''
        if (toolInvocation.toolName === 'write_file') {
          // Check if file was created or modified based on the action field
          const action = toolInvocation.result?.action
          operation = action === 'updated' ? 'Modified file' : 'Created file'
        } else if (toolInvocation.toolName === 'edit_file') {
          operation = 'Modified file'
        } else if (toolInvocation.toolName === 'delete_file') {
          operation = 'Deleted file'
        } else if (toolInvocation.toolName === 'read_file') {
          operation = 'Read file'
        }
        triggerTitle = `${operation}: ${filePath}`
      }
    } else if (['add_package', 'remove_package'].includes(toolInvocation.toolName)) {
      const packageNames = toolInvocation.result?.packages || toolInvocation.args?.name || []
      const packageList = Array.isArray(packageNames) ? packageNames : [packageNames]
      const packageString = packageList.join(', ')
      displayText = packageString

      if (isLoading) {
        triggerTitle = getToolLabel(toolInvocation.toolName)
      } else {
        const action = toolInvocation.toolName === 'add_package' ? 'Added packages' : 'Removed packages'
        triggerTitle = `${action}: ${packageString}`
      }
    } else if (toolInvocation.toolName === 'web_search') {
      const query = toolInvocation.result?.query || toolInvocation.args?.query || 'web search'
      const truncatedQuery = query.length > 12 ? `${query.substring(0, 12)}...` : query
      displayText = truncatedQuery

      if (isLoading) {
        triggerTitle = getToolLabel(toolInvocation.toolName)
      } else {
        triggerTitle = `Web search: "${query}"`
      }
    } else if (toolInvocation.toolName === 'web_extract') {
      const urls = toolInvocation.result?.metadata?.urls || toolInvocation.args?.urls || []
      const urlList = Array.isArray(urls) ? urls : [urls]
      const urlString = urlList.length > 1 ? `${urlList.length} URLs` : (urlList[0] || 'URL')
      const truncatedUrl = urlString.length > 20 ? `${urlString.substring(0, 20)}...` : urlString
      displayText = truncatedUrl

      if (isLoading) {
        triggerTitle = getToolLabel(toolInvocation.toolName)
      } else {
        triggerTitle = `Web extract: ${urlString}`
      }
    } else {
      triggerTitle = isLoading ? getToolLabel(toolInvocation.toolName) : getToolCompletedLabel(toolInvocation.toolName)
    }

    return (
      <Task key={toolInvocation.toolCallId} defaultOpen={isLoading}>
        <TaskTrigger 
          title={triggerTitle}
        >
          <div className="flex w-full cursor-pointer items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground">
            {/* For file operations, show rich title with action + filename */}
            {['write_file', 'edit_file', 'delete_file', 'read_file'].includes(toolInvocation.toolName) && !isLoading ? (
              <>
                <Icon className="size-4" />
                <span className="flex-1 truncate text-sm">
                  {(() => {
                    // Use result path for completed operations, args path for loading
                    const filePath = toolInvocation.result?.path || toolInvocation.args?.path || 'file';
                    const fileName = filePath.split('/').pop() || 'file';
                    const action = toolInvocation.toolName === 'write_file'
                      ? (toolInvocation.result?.action === 'updated' ? 'Modified' : 'Created')
                      : toolInvocation.toolName === 'edit_file' ? 'Modified'
                      : toolInvocation.toolName === 'delete_file' ? 'Deleted'
                      : 'Read';
                    return `${action} file: ${fileName}`;
                  })()}
                </span>
              </>
            ) : ['add_package', 'remove_package'].includes(toolInvocation.toolName) && !isLoading ? (
              /* For package operations, show package icon + package names + status */
              <>
                <PackageIcon className="size-4" />
                <span className="flex-1 truncate text-sm">
                  {(() => {
                    const packages = toolInvocation.result?.packages || toolInvocation.args?.name || [];
                    const packageList = Array.isArray(packages) ? packages : [packages];
                    const packageNames = packageList.join(', ');
                    const action = toolInvocation.toolName === 'add_package' ? 'Added' : 'Removed';
                    const depType = toolInvocation.result?.dependencyType || (toolInvocation.args?.isDev ? 'devDependencies' : 'dependencies');
                    return `${action} packages: ${packageNames}`;
                  })()}
                </span>
              </>
            ) : toolInvocation.toolName === 'web_search' && !isLoading ? (
              /* For web search, show search icon + query + status */
              <>
                <Globe className="size-4" />
                <span className="flex-1 truncate text-sm">
                  Web search: "{(() => {
                    const query = toolInvocation.result?.query || toolInvocation.args?.query || 'Unknown query';
                    return query.length > 12 ? `${query.substring(0, 12)}...` : query;
                  })()}"
                </span>
              </>
            ) : toolInvocation.toolName === 'web_extract' && !isLoading ? (
              /* For web extract, show globe icon + URLs + status */
              <>
                <Globe className="size-4" />
                <span className="flex-1 truncate text-sm">
                  Web extract: {(() => {
                    const urls = toolInvocation.result?.metadata?.urls || toolInvocation.args?.urls || [];
                    const urlList = Array.isArray(urls) ? urls : [urls];
                    if (urlList.length === 1) {
                      const url = urlList[0] || 'Unknown URL';
                      return url.length > 20 ? `${url.substring(0, 20)}...` : url;
                    } else {
                      return `${urlList.length} URLs`;
                    }
                  })()}
                </span>
              </>
            ) : (
              /* For other operations or loading state, show original layout */
              <>
                <Icon className="size-4" />
                <p className="text-sm flex-1">
                  {triggerTitle}
                </p>
              </>
            )}
            {isLoading && <Loader2 className="ml-auto size-4 animate-spin" />}
            {isCompleted && !hasError && <CheckCircle2 className="ml-auto size-4 text-green-500" />}
            {hasError && <XCircle className="ml-auto size-4 text-red-500" />}
          </div>
        </TaskTrigger>
        <TaskContent>
          <TaskItem>
            <span className="font-medium">{displayText}</span>
          </TaskItem>
          {isCompleted && toolInvocation.result && (
            <TaskItem>
              {hasError ? (
                <span className="text-red-500">Error: {toolInvocation.result.error}</span>
              ) : (
                <span className="text-green-600">
                  {toolInvocation.result.message || 'Operation completed successfully'}
                </span>
              )}
            </TaskItem>
          )}
          {/* Show file content with syntax highlighting for write_file and edit_file */}
          {isCompleted && !hasError && ['write_file', 'edit_file'].includes(toolInvocation.toolName) && toolInvocation.result?.content && (
            <TaskItem>
              <div className="mt-3">
                <div className="bg-gray-800 border border-gray-600 rounded-lg overflow-hidden">
                  <div className="px-3 py-2 bg-gray-700 border-b border-gray-600 text-xs font-medium text-white">
                    {toolInvocation.result?.path || toolInvocation.args?.path || 'file'} • {(toolInvocation.result?.path || toolInvocation.args?.path || 'file').split('.').pop() || 'text'}
                  </div>
                  <pre className="p-4 overflow-x-auto bg-[#1e1e1e] max-h-96">
                    <code className={`hljs language-${(toolInvocation.result?.path || toolInvocation.args?.path || 'file').split('.').pop() || 'text'} text-sm text-white`}>
                      {toolInvocation.result.content}
                    </code>
                  </pre>
                </div>
              </div>
            </TaskItem>
          )}
          {/* Show web search results with scrollable container */}
          {isCompleted && !hasError && toolInvocation.toolName === 'web_search' && toolInvocation.result && (
            <TaskItem>
              <div className="mt-3">
                <div className="bg-gray-800 border border-gray-600 rounded-lg overflow-hidden">
                  <div className="px-3 py-2 bg-gray-700 border-b border-gray-600 text-xs font-medium text-white">
                    Search Results
                  </div>
                  <div className="max-h-96 overflow-y-auto p-4 bg-[#1e1e1e]">
                    {/* Query Header */}
                    <div className="mb-4">
                      <h3 className="text-sm font-bold text-white mb-2">Search Query</h3>
                      <p className="text-gray-300 text-sm bg-gray-800 px-3 py-2 rounded border border-gray-600">
                        "{(() => {
                          const query = toolInvocation.result?.query || toolInvocation.args?.query || 'Unknown query';
                          return query.length > 12 ? `${query.substring(0, 12)}...` : query;
                        })()}"
                      </p>
                    </div>

                    {/* Results Content */}
                    {toolInvocation.result?.cleanResults || toolInvocation.result?.results ? (
                      <div className="prose prose-sm max-w-none">
                        <h4 className="text-sm font-bold text-white mb-3">Search Results</h4>
                        <div className="text-gray-300 text-sm leading-relaxed">
                          {toolInvocation.result.cleanResults || toolInvocation.result.results}
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-400 text-sm">
                        No search results available to display.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TaskItem>
          )}
        </TaskContent>
      </Task>
    )
  }

  return (
    <div className="space-y-3">
      {/* Render tools if present */}
      {hasTools && (
        <div className="space-y-2">
          {toolInvocations?.map((toolInvocation: any) => renderToolInvocation(toolInvocation))}
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
       <div className="flex items-center justify-start gap-1 text-muted-foreground text-sm !bg-transparent scale-90">
  <Loader2 className="size-3 animate-spin" />
  <span>Thinking...</span>
</div>

      )}
    </div>
  )
}
