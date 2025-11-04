"use client";

import { useControllableState } from "@radix-ui/react-use-controllable-state";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { BrainIcon, ChevronDownIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { createContext, memo, useContext, useEffect, useState } from "react";
import { Response } from "./response";

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

type ReasoningContextValue = {
  isStreaming: boolean;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  duration: number;
  toolInvocations?: any[];
};

const ReasoningContext = createContext<ReasoningContextValue | null>(null);

const useReasoning = () => {
  const context = useContext(ReasoningContext);
  if (!context) {
    throw new Error("Reasoning components must be used within Reasoning");
  }
  return context;
};

export type ReasoningProps = ComponentProps<typeof Collapsible> & {
  isStreaming?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  duration?: number;
  toolInvocations?: any[];
};

const AUTO_CLOSE_DELAY = 3000; // Increased from 1000 to 3000ms to show duration
const MS_IN_S = 1000;

export const Reasoning = memo(
  ({
    className,
    isStreaming = false,
    open,
    defaultOpen = true,
    onOpenChange,
    duration: durationProp,
    toolInvocations = [],
    children,
    ...props
  }: ReasoningProps) => {
    const [isOpen, setIsOpen] = useControllableState({
      prop: open,
      defaultProp: defaultOpen,
      onChange: onOpenChange,
    });
    const [duration, setDuration] = useControllableState({
      prop: durationProp,
      defaultProp: 0,
    });

    const [hasAutoClosed, setHasAutoClosed] = useState(false);
    const [startTime, setStartTime] = useState<number | null>(null);

    // Track duration when streaming starts and ends
    useEffect(() => {
      if (isStreaming) {
        if (startTime === null) {
          setStartTime(Date.now());
        }
      } else if (startTime !== null) {
        const calculatedDuration = Math.ceil((Date.now() - startTime) / MS_IN_S);
        setDuration(Math.max(1, calculatedDuration)); // Ensure minimum 1 second
        setStartTime(null);
      }
    }, [isStreaming, startTime, setDuration]);

    // Auto-open when streaming starts, auto-close when streaming ends (once only)
    useEffect(() => {
      if (defaultOpen && !isStreaming && isOpen && !hasAutoClosed) {
        // Add a small delay before closing to allow user to see the content
        const timer = setTimeout(() => {
          setIsOpen(false);
          setHasAutoClosed(true);
        }, AUTO_CLOSE_DELAY);

        return () => clearTimeout(timer);
      }
    }, [isStreaming, isOpen, defaultOpen, setIsOpen, hasAutoClosed]);

    const handleOpenChange = (newOpen: boolean) => {
      setIsOpen(newOpen);
    };

    return (
      <ReasoningContext.Provider
        value={{ isStreaming, isOpen, setIsOpen, duration, toolInvocations }}
      >
        <Collapsible
          className={cn("not-prose mb-4", className)}
          onOpenChange={handleOpenChange}
          open={isOpen}
          {...props}
        >
          {children}
        </Collapsible>
      </ReasoningContext.Provider>
    );
  }
);

export type ReasoningTriggerProps = ComponentProps<typeof CollapsibleTrigger>;

const getThinkingMessage = (isStreaming: boolean, duration?: number) => {
  if (isStreaming) {
    return <p>Thinking...</p>;
  }
  if (duration === undefined || duration === 0) {
    return <p>Thought for a moment</p>;
  }
  if (duration === 1) {
    return <p>Thought for 1 second</p>;
  }
  return <p>Thought for {duration} seconds</p>;
};

export const ReasoningTrigger = memo(
  ({ className, children, ...props }: ReasoningTriggerProps) => {
    const { isStreaming, isOpen, duration } = useReasoning();

    return (
      <CollapsibleTrigger
        className={cn(
          "flex w-full items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground",
          className
        )}
        {...props}
      >
        {children ?? (
          <>
            <BrainIcon className="size-4" />
            {getThinkingMessage(isStreaming, duration)}
            <ChevronDownIcon
              className={cn(
                "size-4 transition-transform",
                isOpen ? "rotate-180" : "rotate-0"
              )}
            />
          </>
        )}
      </CollapsibleTrigger>
    );
  }
);

export type ReasoningContentProps = ComponentProps<
  typeof CollapsibleContent
> & {
  children: string;
};

export const ReasoningContent = memo(
  ({ className, children, ...props }: ReasoningContentProps) => {
    const { toolInvocations = [] } = useReasoning();

    return (
      <CollapsibleContent
        className={cn(
          "w-full mt-4 text-sm",
          "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-muted-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in",
          className
        )}
        {...props}
      >
        <div className="p-4 break-words overflow-wrap-anywhere">
          {/* Inline Tool Pills */}
          {toolInvocations.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {toolInvocations.map((toolCall) => (
                <ToolPill
                  key={toolCall.toolCallId}
                  toolCall={toolCall}
                  status={toolCall.state === 'call' ? 'executing' :
                         toolCall.state === 'result' ? 'completed' : 'failed'}
                />
              ))}
            </div>
          )}

          <Response className="text-muted-foreground text-sm leading-[1.5] whitespace-pre-wrap text-left [&>*]:whitespace-pre-wrap [&_pre]:whitespace-pre-wrap [&_code]:whitespace-pre-wrap">
            {children}
          </Response>
        </div>
      </CollapsibleContent>
    );
  }
);

Reasoning.displayName = "Reasoning";
ReasoningTrigger.displayName = "ReasoningTrigger";
ReasoningContent.displayName = "ReasoningContent";
