"use client";

import { cn } from "@/lib/utils";
import { type ComponentProps, memo } from "react";
import { Streamdown } from "streamdown";

type ResponseProps = ComponentProps<typeof Streamdown> & {
  toolInvocations?: any[];
};

// ToolPill component for displaying inline tool execution status
const ToolPill = ({ toolCall, status = 'completed' }: { toolCall: any, status?: 'executing' | 'completed' | 'failed' }) => {
  const getToolIcon = (toolName: string) => {
    switch (toolName) {
      case 'write_file':
      case 'edit_file':
      case 'read_file':
      case 'list_files':
      case 'delete_file':
        return '📄'
      case 'add_package':
      case 'remove_package':
        return '📦'
      case 'grep_search':
      case 'semantic_code_navigator':
        return '🔍'
      case 'web_search':
      case 'web_extract':
      case 'vscode-websearchforcopilot_webSearch':
        return '🌐'
      case 'check_dev_errors':
        return '⚠️'
      default:
        return '⚡'
    }
  }

  const getToolDisplayText = (toolName: string, toolCall: any) => {
    // For file operation tools: show tool name, file name, and status
    if (['write_file', 'edit_file', 'read_file', 'list_files', 'delete_file'].includes(toolName)) {
      const fileName = toolCall.result?.path?.split('/').pop() || toolCall.args?.path?.split('/').pop() || toolCall.args?.filePath?.split('/').pop() || 'file'
      const action = toolName === 'write_file' ? 'Create' :
                    toolName === 'edit_file' ? 'Edit' :
                    toolName === 'read_file' ? 'Read' :
                    toolName === 'list_files' ? 'List' : 'Delete'
      return `${action} ${fileName}`
    }

    // For package management tools
    if (toolName === 'add_package') {
      const packageName = toolCall.args?.name || toolCall.result?.packageName || 'package'
      return `Add package ${packageName}`
    }

    if (toolName === 'remove_package') {
      const packageName = toolCall.args?.name || toolCall.result?.packageName || 'package'
      return `Remove package ${packageName}`
    }

    // For search tools: show statements like "Search Codebase for 'query'"
    if (toolName === 'grep_search') {
      const query = toolCall.args?.query || toolCall.result?.query || 'query'
      return `Grep codebase for "${query.length > 20 ? query.substring(0, 20) + '...' : query}"`
    }

    if (toolName === 'semantic_code_navigator') {
      const query = toolCall.args?.query || toolCall.result?.query || 'query'
      return `Search codebase for "${query.length > 20 ? query.substring(0, 20) + '...' : query}"`
    }

    if (toolName === 'web_search' || toolName === 'vscode-websearchforcopilot_webSearch') {
      const query = toolCall.args?.query || toolCall.result?.query || 'query'
      return `Search web for "${query.length > 20 ? query.substring(0, 20) + '...' : query}"`
    }

    if (toolName === 'web_extract') {
      const urls = toolCall.args?.urls || toolCall.result?.urls || []
      const urlCount = Array.isArray(urls) ? urls.length : 1
      return `Extract content from ${urlCount} URL${urlCount > 1 ? 's' : ''}`
    }

    if (toolName === 'check_dev_errors') {
      const mode = toolCall.args?.mode || 'dev'
      return `Check ${mode} errors`
    }

    // Default: just show the tool name
    return toolName.replace(/_/g, ' ')
  }

  const isSuccess = toolCall.result && toolCall.result.success !== false
  const IconComponent = getToolIcon(toolCall.toolName)
  const displayText = getToolDisplayText(toolCall.toolName, toolCall)

  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-muted/50 border rounded-full text-xs text-muted-foreground mx-1">
      <span>{IconComponent}</span>
      <span className="truncate max-w-32">{displayText}</span>
      {status === 'executing' && <span className="animate-pulse">⏳</span>}
      {status === 'completed' && isSuccess && <span className="text-green-500">✅</span>}
      {status === 'failed' && <span className="text-red-500">❌</span>}
    </span>
  )
}

export const Response = memo(
  ({ className, toolInvocations = [], children, ...props }: ResponseProps) => {
    // Parse children to identify tool call positions and create segmented content
    const renderContentWithInlinePills = () => {
      if (!children || typeof children !== 'string') {
        return (
          <Streamdown
            className={cn(
              "size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 break-words overflow-wrap-anywhere",
              "leading-relaxed",
              "[&>p]:mb-4 [&>p]:last:mb-0",
              "[&>ul]:mb-4 [&>ul]:last:mb-0",
              "[&>ol]:mb-4 [&>ol]:last:mb-0",
              "[&>li]:mb-2",
              "[&>blockquote]:mb-4 [&>blockquote]:border-l-4 [&>blockquote]:border-gray-300 [&>blockquote]:pl-4 [&>blockquote]:italic",
              "[&>pre]:mb-4 [&>pre]:overflow-x-auto",
              "[&>h1]:mb-4 [&>h1]:text-2xl [&>h1]:font-bold",
              "[&>h2]:mb-3 [&>h2]:text-xl [&>h2]:font-semibold",
              "[&>h3]:mb-2 [&>h3]:text-lg [&>h3]:font-medium",
              "[&>h4]:mb-2 [&>h4]:text-base [&>h4]:font-medium",
              "[&>h5]:mb-2 [&>h5]:text-sm [&>h5]:font-medium",
              "[&>h6]:mb-2 [&>h6]:text-xs [&>h6]:font-medium",
              className
            )}
            {...props}
          >
            {children}
          </Streamdown>
        );
      }

      const content = children as string;
      const lines = content.split('\n');
      const elements: React.ReactElement[] = [];
      let toolIndex = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Check if this line contains tool call indicators
        const hasToolIndicator = line.includes('[pill here]') ||
                                line.includes('read ') ||
                                line.includes('search') ||
                                line.includes('check') ||
                                line.includes('create') ||
                                line.includes('edit') ||
                                line.includes('delete') ||
                                line.includes('add package') ||
                                line.includes('remove package');

        // If we have a tool indicator and tools available, insert pill before this line
        if (hasToolIndicator && toolIndex < toolInvocations.length) {
          const toolCall = toolInvocations[toolIndex];
          elements.push(
            <div key={`pill-${toolCall.toolCallId}-${toolIndex}`} className="inline-block mr-2 mb-1">
              <ToolPill
                toolCall={toolCall}
                status={toolCall.state === 'call' ? 'executing' :
                       toolCall.state === 'result' ? 'completed' : 'failed'}
              />
            </div>
          );
          toolIndex++;
        }

        // Render the text line with Streamdown
        if (line.trim()) {
          elements.push(
            <Streamdown
              key={`text-${i}`}
              className={cn(
                "inline [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 break-words overflow-wrap-anywhere",
                "leading-relaxed",
                "[&>p]:mb-4 [&>p]:last:mb-0 [&>p]:inline",
                "[&>ul]:mb-4 [&>ul]:last:mb-0 [&>ul]:inline",
                "[&>ol]:mb-4 [&>ol]:last:mb-0 [&>ol]:inline",
                "[&>li]:mb-2 [&>li]:inline",
                "[&>blockquote]:mb-4 [&>blockquote]:border-l-4 [&>blockquote]:border-gray-300 [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:inline",
                "[&>pre]:mb-4 [&>pre]:overflow-x-auto [&>pre]:inline",
                "[&>h1]:mb-4 [&>h1]:text-2xl [&>h1]:font-bold [&>h1]:inline",
                "[&>h2]:mb-3 [&>h2]:text-xl [&>h2]:font-semibold [&>h2]:inline",
                "[&>h3]:mb-2 [&>h3]:text-lg [&>h3]:font-medium [&>h3]:inline",
                "[&>h4]:mb-2 [&>h4]:text-base [&>h4]:font-medium [&>h4]:inline",
                "[&>h5]:mb-2 [&>h5]:text-sm [&>h5]:font-medium [&>h5]:inline",
                "[&>h6]:mb-2 [&>h6]:text-xs [&>h6]:font-medium [&>h6]:inline",
                className
              )}
              {...props}
            >
              {line}
            </Streamdown>
          );
        }

        // Add line break
        if (i < lines.length - 1) {
          elements.push(<br key={`br-${i}`} />);
        }
      }

      return <div className="inline">{elements}</div>;
    };

    return renderContentWithInlinePills();
  },
  (prevProps, nextProps) => prevProps.children === nextProps.children
);

Response.displayName = "Response";
