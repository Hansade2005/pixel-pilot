/* 
 * ChatPanel V2 - AI SDK Real-Time Streaming Implementation
 * Uses @ai-sdk/react useChat hook with native tool support
 * Preserves all features from original chat-panel.tsx
 */

'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog"
import { useToast } from "@/components/ui/use-toast"
import { MessageWithTools } from './message-with-tools'
import {
  Send, Paperclip, Mic, MicOff, X, FileText, Image as ImageIcon,
  Link as LinkIcon, Loader2, ChevronDown, ChevronUp, StopCircle, Trash2, Plus,
  Copy, ArrowUp, Undo2, Redo2, Check, AlertTriangle, Zap
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Actions, Action } from '@/components/ai-elements/actions'
import { FileAttachmentDropdown } from "@/components/ui/file-attachment-dropdown"
import { FileAttachmentBadge } from "@/components/ui/file-attachment-badge"
import { FileSearchResult, FileLookupService } from "@/lib/file-lookup-service"
import { createCheckpoint } from '@/lib/checkpoint-utils'

// ExpandableUserMessage component for long user messages
const ExpandableUserMessage = ({
  content,
  messageId,
  onCopy,
  onDelete,
  onRetry,
  onRevert,
  showRestore = false,
  isExpanded: controlledExpanded,
  onExpandedChange
}: {
  content: string
  messageId: string
  onCopy: (messageId: string, content: string) => void
  onDelete: (messageId: string) => void
  onRetry: (messageId: string, content: string) => void
  onRevert: (messageId: string) => void
  showRestore?: boolean
  isExpanded?: boolean
  onExpandedChange?: (expanded: boolean) => void
}) => {
  const [isExpanded, setIsExpanded] = useState(controlledExpanded ?? false)
  const [shouldTruncate, setShouldTruncate] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const CHAR_LIMIT = 140 // Character limit before truncation

  useEffect(() => {
    // Check if content exceeds character limit
    setShouldTruncate(content.length > CHAR_LIMIT)
  }, [content])

  useEffect(() => {
    if (controlledExpanded !== undefined) {
      setIsExpanded(controlledExpanded)
    }
  }, [controlledExpanded])

  useEffect(() => {
    if (onExpandedChange) {
      onExpandedChange(isExpanded)
    }
  }, [isExpanded, onExpandedChange])

  const handleIconClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRetry(messageId, content);
  };

  const handleRevert = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRevert(messageId);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(messageId);
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCopy(messageId, content);
  };

  const renderCheckpointButton = () => {
    if (showRestore) {
      return (
        <Action tooltip="Restore to this version" onClick={handleRevert}>
          <Redo2 className="w-4 h-4" />
        </Action>
      );
    }
    
    return (
      <Action tooltip="Revert to this version" onClick={handleRevert}>
        <Undo2 className="w-4 h-4" />
      </Action>
    );
  };

  if (!shouldTruncate) {
    return (
      <div className="relative w-full">
        <div className="bg-card text-card-foreground border rounded-xl shadow-sm overflow-hidden w-full flex flex-col">
          <div className="p-4 break-words overflow-wrap-anywhere">
            <p className="text-card-foreground text-sm leading-[1.5] whitespace-pre-wrap text-left">
              {content}
            </p>
          </div>
          <div className="px-4 pb-2 flex justify-end">
            <Actions>
              <Action tooltip="Retry message" onClick={handleIconClick}>
                <ArrowUp className="w-4 h-4" />
              </Action>
              {renderCheckpointButton()}
              <Action tooltip="Copy message" onClick={handleCopy}>
                <Copy className="w-4 h-4" />
              </Action>
              <Action tooltip="Delete message" onClick={handleDelete}>
                <Trash2 className="w-4 h-4" />
              </Action>
            </Actions>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full">
      <div className="bg-card text-card-foreground border rounded-xl overflow-hidden relative shadow-sm w-full flex flex-col">
        <div className="p-4 break-words overflow-wrap-anywhere">
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
          <Actions>
            <Action tooltip="Retry message" onClick={handleIconClick}>
              <ArrowUp className="w-4 h-4" />
            </Action>
            {renderCheckpointButton()}
            <Action tooltip="Copy message" onClick={handleCopy}>
              <Copy className="w-4 h-4" />
            </Action>
            <Action tooltip="Delete message" onClick={handleDelete}>
              <Trash2 className="w-4 h-4" />
            </Action>
          </Actions>
        </div>
      </div>
    </div>
  )
}

// Types
interface AttachedFile {
  id: string
  name: string
  path: string
  content?: string
}

interface AttachedImage {
  id: string
  name: string
  base64: string
  description?: string
  isProcessing?: boolean
}

interface AttachedUrl {
  id: string
  url: string
  title?: string
  content?: string
  isProcessing?: boolean
}

interface AttachedUploadedFile {
  id: string
  name: string
  content: string
  size: number
}

interface ChatPanelV2Props {
  project: any
  isMobile?: boolean
  selectedModel?: string
  aiMode?: string
  onModeChange?: (mode: string) => void
  onClearChat?: () => void
  initialPrompt?: string
}

export function ChatPanelV2({
  project,
  isMobile = false,
  selectedModel = 'gpt-4o',
  aiMode = 'code',
  onModeChange,
  onClearChat,
  initialPrompt
}: ChatPanelV2Props) {
  const { toast } = useToast()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Debounce utility function
  const debounce = (func: Function, wait: number) => {
    let timeout: NodeJS.Timeout
    return (...args: any[]) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => func.apply(null, args), wait)
    }
  }

  // Debounced textarea height adjustment to prevent lag during typing
  const debouncedHeightAdjustment = useCallback(
    debounce((textarea: HTMLTextAreaElement) => {
      // Reset to baseline then expand up to the max (90px)
      textarea.style.height = '90px';
      const newHeight = Math.min(textarea.scrollHeight, 140)
      textarea.style.height = newHeight + 'px';
      // Only show a vertical scrollbar when content exceeds the max height
      textarea.style.overflowY = textarea.scrollHeight > 140 ? 'auto' : 'hidden'
    }, 50), // 50ms debounce for height adjustments
    []
  );

  // Removed debounced file dropdown handler in favor of a tiny, synchronous regex-based detection
  // The heavy-path debouncing created extra scheduling overhead and state churn on desktop.
  // We'll do a minimal regex check in the onChange handler and only update state when the
  // detected query or visibility actually changes.

  // File attachments state (preserve from original)
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])
  const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([])
  const [attachedUploadedFiles, setAttachedUploadedFiles] = useState<AttachedUploadedFile[]>([])
  const [attachedUrls, setAttachedUrls] = useState<AttachedUrl[]>([])
  
  // @ command file attachment dropdown state
  const [showFileDropdown, setShowFileDropdown] = useState(false)
  const [fileQuery, setFileQuery] = useState("")
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })
  const [atCommandStartIndex, setAtCommandStartIndex] = useState(-1)
  
  // Checkpoint/restore state
  const [restoreMessageId, setRestoreMessageId] = useState<string | null>(null)
  const [showRevertDialog, setShowRevertDialog] = useState(false)
  const [revertMessageId, setRevertMessageId] = useState<string | null>(null)
  const [isReverting, setIsReverting] = useState(false)
  
  // UI state
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false)
  const [showUrlDialog, setShowUrlDialog] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  
  // Speech-to-text state (Web Speech API real-time implementation)
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const recognitionRef = useRef<any>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const fileLookupServiceRef = useRef<FileLookupService | null>(null)

  // Load project files for context
  const [projectFiles, setProjectFiles] = useState<any[]>([])

  // Local state for input (not using useChat's input)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [continuingMessageId, setContinuingMessageId] = useState<string | null>(null)
  const [isContinuationInProgress, setIsContinuationInProgress] = useState(false)

  // Auto-adjust textarea height on input change
  useEffect(() => {
    if (textareaRef.current) {
      debouncedHeightAdjustment(textareaRef.current)
    }
  }, [input, debouncedHeightAdjustment])

  // Local state for messages (since we're not using useChat hook for complex attachment handling)
  const [messages, setMessages] = useState<any[]>([])
  const [error, setError] = useState<Error | null>(null)
  const [abortController, setAbortController] = useState<AbortController | null>(null)

  // Message actions state
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingMessageContent, setEditingMessageContent] = useState('')

  // Save message to IndexedDB for the current project
  const saveMessageToIndexedDB = async (message: any) => {
    if (!project) {
      console.warn('[ChatPanelV2] Cannot save message: no project selected')
      return
    }

    try {
      console.log(`[ChatPanelV2] Saving message to project ${project.id}:`, {
        id: message.id,
        role: message.role,
        contentLength: message.content.length,
        hasReasoning: !!message.reasoning,
        reasoningLength: message.reasoning?.length || 0,
        hasTools: message.toolInvocations?.length > 0,
        toolCount: message.toolInvocations?.length || 0,
        metadataKeys: Object.keys(message.metadata || {})
      })
      const { storageManager } = await import('@/lib/storage-manager')
      await storageManager.init()

      // Get or create chat session for this project
      let chatSessions = await storageManager.getChatSessions(project.userId)
      let chatSession = chatSessions.find((session: any) =>
        session.workspaceId === project.id && session.isActive
      )

      if (!chatSession) {
        console.log(`[ChatPanelV2] Creating new chat session for project ${project.id}`)
        const sessionTitle = project.name ? `${project.name} Chat` : `Project Chat Session`
        chatSession = await storageManager.createChatSession({
          workspaceId: project.id,
          userId: project.userId,
          title: sessionTitle,
          isActive: true,
          lastMessageAt: new Date().toISOString()
        })
        console.log(`[ChatPanelV2] Created chat session:`, chatSession.id)
      }

      // Check if message with this ID already exists and delete it (to prevent duplicates)
      const existingMessages = await storageManager.getMessages(chatSession.id)
      const existingMessage = existingMessages.find((m: any) => m.id === message.id)

      if (existingMessage) {
        console.log(`[ChatPanelV2] Deleting existing message with ID ${message.id} to prevent duplicates`)
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
      // Update session's last message time and message count
      const messageCount = existingMessages.length + 1
      await storageManager.updateChatSession(chatSession.id, {
        lastMessageAt: new Date().toISOString(),
        messageCount: messageCount
      })

      console.log(`[ChatPanelV2] Message saved successfully for project ${project.id}`)
    } catch (error) {
      console.error(`[ChatPanelV2] Error saving message for project ${project?.id}:`, error)
    }
  }

  // Save assistant message after streaming is complete
  const saveAssistantMessageAfterStreaming = async (
    assistantMessageId: string,
    accumulatedContent: string,
    accumulatedReasoning: string,
    accumulatedToolInvocations: any[]
  ) => {
    if (!project) {
      console.warn('[ChatPanelV2] Cannot save assistant message: no project selected')
      return
    }

    try {
      console.log(`[ChatPanelV2] Saving complete assistant message after streaming: ${assistantMessageId}`)

      const finalAssistantMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: accumulatedContent || (accumulatedToolInvocations.length > 0 ? 'Task completed successfully!.' : ''),
        createdAt: new Date().toISOString(),
        metadata: {
          toolInvocations: accumulatedToolInvocations,
          reasoning: accumulatedReasoning,
          hasToolCalls: accumulatedToolInvocations.length > 0
        }
      }

      await saveMessageToIndexedDB(finalAssistantMessage)
      console.log(`[ChatPanelV2] Complete assistant message saved to database: ${assistantMessageId}`)

      // Dispatch event to switch to preview tab and trigger auto-preview creation
      // This creates the illusion of "hot reload" after AI code generation
      if (typeof window !== 'undefined') {
        console.log('[ChatPanelV2] Dispatching auto-preview event after streaming completion')
        window.dispatchEvent(new CustomEvent('ai-stream-complete', {
          detail: {
            projectId: project.id,
            shouldSwitchToPreview: true,
            shouldCreatePreview: true
          }
        }))
      }
    } catch (error) {
      console.error(`[ChatPanelV2] Error saving complete assistant message ${assistantMessageId}:`, error)
    }
  }

  // Lightweight regex-based @ command detection
  // This uses a small RegExp to find an `@` that is at line start or preceded by whitespace
  // and captures the following token (up to whitespace). It's synchronous and cheap.
  const detectAtCommand = (text: string, cursorPosition: number) => {
    // Only search up to cursorPosition to avoid scanning the whole string repeatedly
    const snippet = text.substring(0, cursorPosition);
    // Regex: match last occurrence of '@' that is start-of-line or preceded by whitespace
    // and capture following non-whitespace token
    const re = /(?:^|\s)@([\S]*)$/;
    const match = snippet.match(re);
    if (!match) return null;

    const query = match[1] || '';
    const atIndex = snippet.lastIndexOf('@');
    return {
      startIndex: atIndex,
      endIndex: atIndex + 1 + query.length,
      query
    };
  };

  const calculateDropdownPosition = (textarea: HTMLTextAreaElement, atIndex: number) => {
    const rect = textarea.getBoundingClientRect();
    const dropdownHeight = 320;
    const viewportHeight = window.innerHeight;
    const spaceAbove = rect.top;
    const spaceBelow = viewportHeight - rect.bottom;
    
    let top: number;
    if (spaceAbove >= dropdownHeight + 16) {
      top = rect.top - dropdownHeight - 8;
    } else if (spaceBelow >= dropdownHeight + 16) {
      top = rect.bottom + 8;
    } else {
      top = Math.max(16, rect.top - dropdownHeight - 8);
    }
    
    const left = rect.left;
    return { top, left };
  };

  const handleFileSelect = (file: FileSearchResult) => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const cursorPos = textarea.selectionStart;
    const atCommand = detectAtCommand(input, cursorPos);
    
    if (atCommand) {
      const before = input.substring(0, atCommand.startIndex);
      const after = input.substring(atCommand.endIndex);
      const replacement = `@${file.name}`;
      
      setInput(before + replacement + after);
      setAttachedFiles(prev => [...prev, file]);
      
      setTimeout(() => {
        if (textareaRef.current) {
          const newCursorPos = before.length + replacement.length;
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    }
    
    closeFileDropdown();
  };

  const closeFileDropdown = () => {
    setShowFileDropdown(false);
    setFileQuery('');
    setAtCommandStartIndex(-1);
  };

  // Checkpoint handlers
  const handleRevertToCheckpoint = async (messageId: string) => {
    if (!project || isReverting) return
    
    if (restoreMessageId === messageId) {
      await handleRestoreForMessage(messageId);
      return;
    }
    
    setRevertMessageId(messageId)
    setShowRevertDialog(true)
  }

  const handleRestoreForMessage = async (messageId: string) => {
    if (!project) return
    
    try {
      const { isRestoreAvailableForMessage, restorePreRevertState } = await import('@/lib/checkpoint-utils')
      
      if (!isRestoreAvailableForMessage(project.id, messageId)) {
        toast({
          title: "Restore Unavailable",
          description: "The restore option is only available for 5 minutes after reverting.",
          variant: "destructive"
        })
        setRestoreMessageId(null)
        return
      }
      
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
      
      const success = await restorePreRevertState(project.id, activeSession.id, messageId)
      
      if (success) {
        await loadMessages()
        
        window.dispatchEvent(new CustomEvent('files-changed', { 
          detail: { projectId: project.id, forceRefresh: true } 
        }))
        
        setRestoreMessageId(null)
        
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

  // Message action handlers
  const handleCopyMessage = async (messageId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      toast({
        title: 'Copied',
        description: 'Message copied to clipboard'
      })
    } catch (err) {
      console.error('Copy failed', err)
      toast({
        title: 'Copy failed',
        description: 'Unable to copy message',
        variant: 'destructive'
      })
    }
  }

  const handleDeleteMessage = async (messageId: string) => {
    if (!project) return

    try {
      // Remove message from UI immediately for better UX
      setMessages(prev => prev.filter(msg => msg.id !== messageId))

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
        const success = await storageManager.deleteMessage(activeSession.id, messageId)
        if (success) {
          console.log(`[ChatPanelV2] Deleted message ${messageId} from database`)
        } else {
          console.warn(`[ChatPanelV2] Failed to delete message ${messageId} from database`)
        }
      }

      toast({
        title: "Message Deleted",
        description: "The message has been removed from the chat history."
      })
    } catch (error) {
      console.error('[ChatPanelV2] Error deleting message:', error)
      toast({
        title: "Delete Failed",
        description: "Failed to delete the message. Please try again.",
        variant: "destructive"
      })

      // Reload messages on error to maintain consistency
      if (project) {
        await loadProjectFiles()
      }
    }
  }

  const handleRetryMessage = async (messageId: string, content: string) => {
    if (!project || isLoading) return

    // Find the message being retried
    const messageToRetry = messages.find(msg => msg.id === messageId)
    if (!messageToRetry) return

    // Clear all messages that came after this message (including AI responses)
    const messageIndex = messages.findIndex(msg => msg.id === messageId)
    if (messageIndex !== -1) {
      setMessages(prev => prev.slice(0, messageIndex + 1))
    }

    // Set the content as input and submit fresh
    setInput(content)
    // Note: Don't set isLoading here - handleEnhancedSubmit will handle it

    // Small delay to ensure state is updated
    setTimeout(() => {
      // Create a synthetic form event to trigger handleEnhancedSubmit
      const syntheticEvent = {
        preventDefault: () => {},
      } as React.FormEvent

      handleEnhancedSubmit(syntheticEvent)
    }, 100)
  }

  const handleSaveEdit = async () => {
    if (!editingMessageId || !project) return

    try {
      // Update the message in local state
      setMessages(prev => prev.map(msg =>
        msg.id === editingMessageId
          ? { ...msg, content: editingMessageContent }
          : msg
      ))

      toast({
        title: "Message Updated",
        description: "The message has been updated successfully."
      })
    } catch (error) {
      console.error('[ChatPanelV2] Error updating message:', error)
      toast({
        title: "Update Failed",
        description: "Failed to update the message. Please try again.",
        variant: "destructive"
      })
    } finally {
      // Reset edit mode
      setEditingMessageId(null)
      setEditingMessageContent('')
      setInput('')
    }
  }

  const handleCancelEdit = () => {
    setEditingMessageId(null)
    setEditingMessageContent('')
    setInput('')
  }

  // Handle stream continuation - automatically create new request with continuation state
  const handleStreamContinuation = async (
    continuationState: any,
    originalAssistantMessageId: string,
    accumulatedContent: string,
    accumulatedReasoning: string
  ) => {
    if (!continuationState || !project) {
      console.error('[ChatPanelV2][Continuation] Invalid continuation state or no project')
      return
    }

    console.log('[ChatPanelV2][Continuation] 🚀 Starting automatic continuation request')

    // Set the message as continuing to show streaming indicator
    setContinuingMessageId(originalAssistantMessageId)

    // Set loading state to keep the spinner visible during continuation
    setIsLoading(true)
    setIsContinuationInProgress(true)

    try {
      // During continuation, the message will continue streaming seamlessly
      // No need to modify the message content - the existing streaming indicator will show

      // Continue appending to the original assistant message instead of creating new one
      // Remove the thinking indicator and continue with content
      setMessages(prev => prev.map(msg =>
        msg.id === originalAssistantMessageId
          ? {
              ...msg,
              content: accumulatedContent, // Remove thinking indicator
              reasoning: accumulatedReasoning
            }
          : msg
      ))

      // Create abort controller for continuation request
      const continuationController = new AbortController()
      setAbortController(continuationController)

      // Prepare continuation request payload
      const continuationPayload = {
        messages: [], // Don't send messages - full history is in continuationState
        projectId: project.id,
        project,
        files: projectFiles, // Use current project files
        fileTree: await buildProjectFileTree(), // Rebuild file tree
        modelId: selectedModel,
        aiMode,
        continuationState // Include the continuation state
      }

      console.log('[ChatPanelV2][Continuation] 📤 Sending continuation request with token:', continuationState.continuationToken)

      const response = await fetch('/api/chat-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(continuationPayload),
        signal: continuationController.signal
      })

      if (!response.ok) {
        throw new Error('Continuation request failed')
      }

      // Handle continuation streaming response
      const reader = response.body?.getReader()
      if (!reader) throw new Error('No continuation response body')

      const decoder = new TextDecoder()
      let continuationAccumulatedContent = ''
      let continuationAccumulatedReasoning = ''
      let lineBuffer = ''

      console.log('[ChatPanelV2][Continuation] 📥 Processing continuation stream')

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          console.log('[ChatPanelV2][Continuation] ✅ Continuation stream complete')
          break
        }

        const chunk = decoder.decode(value, { stream: true })
        lineBuffer += chunk
        const lines = lineBuffer.split('\n')
        lineBuffer = lines.pop() || ''

        const completeLines = lines.filter(line => line.trim())

        for (const line of completeLines) {
          try {
            const jsonString = line.startsWith('data: ') ? line.slice(6) : line
            if (!jsonString || jsonString.startsWith(':')) continue

            const parsed = JSON.parse(jsonString)

            // Skip server-internal chunks
            if (parsed.type === 'start-step' || parsed.type === 'reasoning-start') {
              continue
            }

            console.log('[ChatPanelV2][Continuation] Parsed continuation part:', parsed.type)

            // Handle continuation stream parts - append to original message
            if (parsed.type === 'text-delta') {
              if (parsed.text) {
                continuationAccumulatedContent += parsed.text
                setMessages(prev => prev.map(msg =>
                  msg.id === originalAssistantMessageId
                    ? { ...msg, content: accumulatedContent + continuationAccumulatedContent, reasoning: accumulatedReasoning + continuationAccumulatedReasoning }
                    : msg
                ))
              }
            } else if (parsed.type === 'reasoning-delta') {
              if (parsed.text) {
                continuationAccumulatedReasoning += parsed.text
                setMessages(prev => prev.map(msg =>
                  msg.id === originalAssistantMessageId
                    ? { ...msg, content: accumulatedContent + continuationAccumulatedContent, reasoning: accumulatedReasoning + continuationAccumulatedReasoning }
                    : msg
                ))
              }
            } else if (parsed.type === 'tool-call') {
              // Handle tool calls in continuation (same logic as main stream)
              const toolCall = {
                toolName: parsed.toolName,
                toolCallId: parsed.toolCallId,
                args: parsed.input,
                dynamic: false
              }

              console.log('[ChatPanelV2][Continuation][ClientTool] 🔧 Continuation tool call:', toolCall.toolName)

              const clientSideTools = ['write_file', 'edit_file', 'delete_file', 'add_package', 'remove_package']
              if (clientSideTools.includes(toolCall.toolName)) {
                const { handleClientFileOperation } = await import('@/lib/client-file-tools')

                const addToolResult = (result: any) => {
                  console.log('[ChatPanelV2][Continuation][ClientTool] ✅ Continuation tool completed:', result.tool)
                }

                handleClientFileOperation(toolCall, project.id, addToolResult)
                  .catch(error => {
                    console.error('[ChatPanelV2][Continuation][ClientTool] ❌ Tool execution error:', error)
                  })
              }
            } else if (parsed.type === 'tool-result') {
              console.log('[ChatPanelV2][Continuation][DataStream] Tool result received:', parsed.toolName)
            }
          } catch (e) {
            console.error('[ChatPanelV2][Continuation] ❌ Failed to parse continuation chunk:', e)
            continue
          }
        }
      }

      // Continuation complete - update the original message with combined content
      const finalContent = accumulatedContent + continuationAccumulatedContent
      const finalReasoning = accumulatedReasoning + continuationAccumulatedReasoning

      if (finalContent.trim()) {
        // Update the original message with the complete content
        setMessages(prev => prev.map(msg =>
          msg.id === originalAssistantMessageId
            ? { ...msg, content: finalContent, reasoning: finalReasoning }
            : msg
        ))

        // Save the updated message
        await saveAssistantMessageAfterStreaming(
          originalAssistantMessageId,
          finalContent,
          finalReasoning,
          []
        )
      }

      console.log('[ChatPanelV2][Continuation] 🎉 Continuation completed successfully')

    } catch (error: any) {
      console.error('[ChatPanelV2][Continuation] ❌ Continuation failed:', error)

      // Clear the continuing state on error
      setContinuingMessageId(null)

      // Remove the thinking indicator from the original message on error
      setMessages(prev => prev.map(msg =>
        msg.id === originalAssistantMessageId
          ? {
              ...msg,
              content: accumulatedContent, // Remove thinking indicator
              reasoning: accumulatedReasoning
            }
          : msg
      ))

      toast({
        title: "Continuation failed",
        description: "Failed to continue the conversation. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
      setAbortController(null)
      setContinuingMessageId(null) // Clear continuing state
      setIsContinuationInProgress(false) // Clear continuation flag
    }
  }

  // Initialize file lookup service
  useEffect(() => {
    if (!fileLookupServiceRef.current) {
      fileLookupServiceRef.current = new FileLookupService()
    }
  }, [])

  // Load project files on mount
  useEffect(() => {
    if (project?.id) {
      loadProjectFiles()
      loadMessages()
    }
  }, [project?.id])

  // Real-time file change listener for @ command and chat sync
  useEffect(() => {
    if (!project?.id || typeof window === 'undefined') return

    const handleFilesChanged = (e: CustomEvent) => {
      const detail = e.detail as { projectId: string; forceRefresh?: boolean }
      if (detail.projectId === project.id) {
        console.log('[ChatPanelV2] Detected real-time file changes, refreshing project files...')
        loadProjectFiles()
      }
    }

    window.addEventListener('files-changed', handleFilesChanged as EventListener)

    return () => {
      window.removeEventListener('files-changed', handleFilesChanged as EventListener)
    }
  }, [project?.id])

  const loadProjectFiles = async () => {
    try {
      if (!fileLookupServiceRef.current || !project?.id) return

      await fileLookupServiceRef.current.initialize(project.id)
      await fileLookupServiceRef.current.refreshFiles()
      
      // Get files from the lookup service
      const files = fileLookupServiceRef.current['files'] || []
      setProjectFiles(files)
      console.log(`[ChatPanelV2] Loaded ${files.length} project files via FileLookupService for real-time sync`)
    } catch (error) {
      console.error('[ChatPanelV2] Error loading files via FileLookupService:', error)
      // Fallback to direct storage manager
      try {
        const { storageManager } = await import('@/lib/storage-manager')
        await storageManager.init()
        const files = await storageManager.getFiles(project.id)
        setProjectFiles(files)
        console.log(`[ChatPanelV2] Fallback: Loaded ${files.length} project files via storageManager`)
      } catch (fallbackError) {
        console.error('[ChatPanelV2] Fallback also failed:', fallbackError)
      }
    }
  }

  // Build optimized project file tree for server
  const buildProjectFileTree = async () => {
    if (!project) {
      console.warn('[ChatPanelV2] Cannot build file tree: no project selected')
      return []
    }

    try {
      const { storageManager } = await import('@/lib/storage-manager')
      await storageManager.init()
      const allFiles = await storageManager.getFiles(project.id)

      // Filter out shadcn UI components and common excluded files
      const filteredFiles = allFiles.filter((file: any) => {
        const path = file.path.toLowerCase()
        // Exclude shadcn UI components (don't list individual files in components/ui/)
        if (path.includes('components/ui/') && !file.isDirectory) {
          return false
        }
        // Exclude node_modules, .git, build outputs
        if (path.includes('node_modules') ||
            path.includes('.git/') ||
            path.includes('dist/') ||
            path.includes('build/') ||
            path.includes('.next/')) {
          return false
        }
        return true
      })

      // Build file tree structure
      const fileTree: string[] = []
      const directories = new Set<string>()

      // Collect all directories
      filteredFiles.forEach((file: any) => {
        const pathParts = file.path.split('/')
        if (pathParts.length > 1) {
          // Add all parent directories
          for (let i = 1; i < pathParts.length; i++) {
            const dirPath = pathParts.slice(0, i).join('/')
            if (dirPath) {
              directories.add(dirPath)
            }
          }
        }
      })

      // Add root files first
      const rootFiles = filteredFiles.filter((file: any) => !file.path.includes('/'))
      rootFiles.forEach((file: any) => {
        fileTree.push(file.path)
      })

      // Add directories and their files
      const sortedDirectories = Array.from(directories).sort()
      sortedDirectories.forEach((dir: string) => {
        fileTree.push(`${dir}/`)

        // Add files in this directory
        const dirFiles = filteredFiles.filter((file: any) => {
          const filePath = file.path
          const fileDir = filePath.substring(0, filePath.lastIndexOf('/'))
          return fileDir === dir
        })

        dirFiles.forEach((file: any) => {
          fileTree.push(file.path)
        })
      })

      console.log(`[ChatPanelV2] Built file tree with ${fileTree.length} entries for server`)
      return fileTree
    } catch (error) {
      console.error('[ChatPanelV2] Error building file tree:', error)
      return []
    }
  }

  const loadMessages = async () => {
    if (!project?.id) return

    try {
      console.log(`[ChatPanelV2] Loading messages for project ${project.id}`)
      const { storageManager } = await import('@/lib/storage-manager')
      await storageManager.init()

      // Get chat sessions for this user
      const chatSessions = await storageManager.getChatSessions(project.userId)
      
      // Find the active chat session for this project
      const activeSession = chatSessions.find((session: any) =>
        session.workspaceId === project.id && session.isActive
      )

      if (activeSession) {
        console.log(`[ChatPanelV2] Found active chat session: ${activeSession.id}`)
        
        // Load messages for this session
        const storedMessages = await storageManager.getMessages(activeSession.id)
        
        // Convert stored messages to the format expected by the UI
        const uiMessages = storedMessages.map((msg: any) => {
          const uiMessage = {
            id: msg.id,
            role: msg.role,
            content: msg.content,
            createdAt: msg.createdAt,
            // Extract reasoning and toolInvocations from metadata for UI compatibility
            reasoning: msg.metadata?.reasoning || '',
            toolInvocations: msg.metadata?.toolInvocations || [],
            metadata: msg.metadata || {}
          }
          console.log(`[ChatPanelV2] Loaded message ${msg.id}:`, {
            role: msg.role,
            hasReasoning: !!uiMessage.reasoning,
            reasoningLength: uiMessage.reasoning.length,
            hasTools: uiMessage.toolInvocations.length > 0,
            toolCount: uiMessage.toolInvocations.length
          })
          return uiMessage
        })

        console.log(`[ChatPanelV2] Loaded ${uiMessages.length} messages from database`)
        setMessages(uiMessages)
      } else {
        console.log(`[ChatPanelV2] No active chat session found for project ${project.id}, starting fresh`)
        setMessages([])
      }
    } catch (error) {
      console.error(`[ChatPanelV2] Error loading messages for project ${project?.id}:`, error)
      // Don't show error toast for loading messages, just log it
    }
  }

  // Handle initial prompt
  useEffect(() => {
    if (initialPrompt && messages.length === 0) {
      setInput(initialPrompt)
    }
  }, [initialPrompt])

  // Handle loading state based on isLoading state
  useEffect(() => {
    // Loading is managed by isLoading state
  }, [isLoading])

  // Handle errors
  useEffect(() => {
    if (error) {
      console.error('[ChatPanelV2] Error:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to get AI response',
        variant: 'destructive'
      })
    }
  }, [error, toast])

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle client-side tool results by sending continuation request
  const handleClientToolResult = async (
    toolName: string,
    result: any,
    projectId: string | undefined,
    assistantMessageId: string
  ) => {
    if (!projectId) {
      console.error('[ChatPanelV2][ClientTool] Cannot send tool result: no project ID')
      return
    }

    console.log('[ChatPanelV2][ClientTool] Sending client tool result for continuation:', {
      toolName,
      hasOutput: !!result.output,
      hasError: !!result.errorText,
      projectId
    })

    try {
      // Create continuation request with tool result
      const continuationPayload = {
        messages: [], // Empty - we're continuing with tool result
        projectId,
        project: { id: projectId }, // Minimal project info
        files: projectFiles, // Current project files
        fileTree: await buildProjectFileTree(), // Current file tree
        modelId: selectedModel,
        aiMode,
        toolResult: {
          toolName,
          result: result.output || { error: result.errorText }
        }
      }

      console.log('[ChatPanelV2][ClientTool] 📤 Sending tool result continuation request')

      const response = await fetch('/api/chat-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(continuationPayload)
      })

      if (!response.ok) {
        throw new Error('Tool result continuation request failed')
      }

      // Handle the response stream just like a regular chat response
      const reader = response.body?.getReader()
      if (!reader) throw new Error('No continuation response body')

      const decoder = new TextDecoder()
      let accumulatedContent = ''
      let accumulatedReasoning = ''
      let lineBuffer = ''

      console.log('[ChatPanelV2][ClientTool] 📥 Processing tool result continuation stream')

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          console.log('[ChatPanelV2][ClientTool] ✅ Tool result continuation stream complete')
          break
        }

        const chunk = decoder.decode(value, { stream: true })
        lineBuffer += chunk
        const lines = lineBuffer.split('\n')
        lineBuffer = lines.pop() || ''

        const completeLines = lines.filter(line => line.trim())

        for (const line of completeLines) {
          try {
            const jsonString = line.startsWith('data: ') ? line.slice(6) : line
            if (!jsonString || jsonString.startsWith(':')) continue

            const parsed = JSON.parse(jsonString)

            // Skip server-internal chunks
            if (parsed.type === 'start-step' || parsed.type === 'reasoning-start') {
              continue
            }

            console.log('[ChatPanelV2][ClientTool] Parsed continuation part:', parsed.type)

            // Handle continuation stream parts - append to original message
            if (parsed.type === 'text-delta') {
              if (parsed.text) {
                accumulatedContent += parsed.text
                setMessages(prev => prev.map(msg =>
                  msg.id === assistantMessageId
                    ? { ...msg, content: accumulatedContent, reasoning: accumulatedReasoning }
                    : msg
                ))
              }
            } else if (parsed.type === 'reasoning-delta') {
              if (parsed.text) {
                accumulatedReasoning += parsed.text
                setMessages(prev => prev.map(msg =>
                  msg.id === assistantMessageId
                    ? { ...msg, content: accumulatedContent, reasoning: accumulatedReasoning }
                    : msg
                ))
              }
            } else if (parsed.type === 'tool-call') {
              // Handle additional tool calls in continuation
              const toolCall = {
                toolName: parsed.toolName,
                toolCallId: parsed.toolCallId,
                args: parsed.input,
                dynamic: false
              }

              console.log('[ChatPanelV2][ClientTool][Continuation] 🔧 Continuation tool call:', toolCall.toolName)

              const clientSideTools = [
                'write_file', 
                'edit_file', 
                'delete_file', 
                'add_package', 
                'remove_package',
                'read_file',
                'list_files',
                'grep_search',
                'semantic_code_navigator'
              ]
              
              if (clientSideTools.includes(toolCall.toolName)) {
                const { handleClientFileOperation } = await import('@/lib/client-file-tools')

                const addToolResult = (result: any) => {
                  console.log('[ChatPanelV2][ClientTool][Continuation] ✅ Continuation tool completed:', result.tool)
                  // Send this result back too
                  handleClientToolResult(toolCall.toolName, result, projectId, assistantMessageId)
                }

                handleClientFileOperation(toolCall, projectId, addToolResult)
                  .catch(error => {
                    console.error('[ChatPanelV2][ClientTool][Continuation] ❌ Tool execution error:', error)
                    const errorResult = {
                      tool: toolCall.toolName,
                      toolCallId: toolCall.toolCallId,
                      state: 'output-error',
                      errorText: error instanceof Error ? error.message : 'Unknown error'
                    }
                    handleClientToolResult(toolCall.toolName, errorResult, projectId, assistantMessageId)
                  })
              }
            } else if (parsed.type === 'tool-result') {
              console.log('[ChatPanelV2][ClientTool][Continuation] Tool result received:', parsed.toolName)
            }
          } catch (e) {
            console.error('[ChatPanelV2][ClientTool] ❌ Failed to parse continuation chunk:', e)
            continue
          }
        }
      }

      // Continuation complete - update the original message with combined content
      if (accumulatedContent.trim()) {
        setMessages(prev => prev.map(msg =>
          msg.id === assistantMessageId
            ? { ...msg, content: accumulatedContent, reasoning: accumulatedReasoning }
            : msg
        ))

        // Save the updated message
        await saveAssistantMessageAfterStreaming(
          assistantMessageId,
          accumulatedContent,
          accumulatedReasoning,
          []
        )
      }

      console.log('[ChatPanelV2][ClientTool] 🎉 Tool result continuation completed successfully')

    } catch (error: any) {
      console.error('[ChatPanelV2][ClientTool] ❌ Tool result continuation failed:', error)

      toast({
        title: "Tool continuation failed",
        description: "Failed to continue with tool result. Please try again.",
        variant: "destructive"
      })
    }
  }

  // Enhanced submit with attachments - AI SDK Pattern: Send last 5 messages
  const handleEnhancedSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!input.trim() && attachedFiles.length === 0 && attachedImages.length === 0) {
      return
    }

    // Check if images are still processing
    if (attachedImages.some((img: AttachedImage) => img.isProcessing)) {
      toast({
        title: 'Images processing',
        description: 'Please wait for images to finish processing',
        variant: 'destructive'
      })
      return
    }

    // Check if URLs are still processing
    if (attachedUrls.some((url: AttachedUrl) => url.isProcessing)) {
      toast({
        title: 'URLs processing',
        description: 'Please wait for URLs to finish processing',
        variant: 'destructive'
      })
      return
    }

    // Build enhanced message content with attachments
    let enhancedContent = input.trim()
    let displayContent = input.trim() // Content shown to user (without hidden contexts)

    // Add image descriptions (hidden from user display)
    if (attachedImages.length > 0) {
      const imageDescriptions = attachedImages
        .map((img: AttachedImage) => {
          const description = img.description || (img.isProcessing ? '[Image processing...]' : '[Image description not available]')
          return `\n\n--- Image: ${img.name} ---\n${description}\n--- End of Image ---`
        })
        .join('')

      if (imageDescriptions) {
        enhancedContent = `${enhancedContent}\n\n=== ATTACHED IMAGES CONTEXT ===${imageDescriptions}\n=== END ATTACHED IMAGES ===`
        // Note: displayContent remains unchanged - image context is hidden from users
      }
    }

    // Add URL contents (shown to user)
    if (attachedUrls.length > 0) {
      const urlContents = attachedUrls
        .filter((url: AttachedUrl) => url.content)
        .map((url: AttachedUrl) => `\n\n--- Website: ${url.title || url.url} ---\nURL: ${url.url}\n\nContent:\n${url.content}\n--- End of Website ---`)
        .join('')

      if (urlContents) {
        enhancedContent = `${enhancedContent}\n\n=== ATTACHED WEBSITES CONTEXT ===${urlContents}\n=== END ATTACHED WEBSITES ===`
        displayContent = `${displayContent}\n\n=== ATTACHED WEBSITES ===${urlContents}\n=== END ATTACHED WEBSITES ===`
      }
    }

    // Add uploaded file contents (shown to user)
    if (attachedUploadedFiles.length > 0) {
      const uploadedFileContexts = attachedUploadedFiles
        .map(file => `\n\n--- Uploaded File: ${file.name} ---\n${file.content}\n--- End of ${file.name} ---`)
        .join('')

      if (uploadedFileContexts) {
        enhancedContent = `${enhancedContent}\n\n=== UPLOADED FILES CONTEXT ===${uploadedFileContexts}\n=== END UPLOADED FILES ===`
        displayContent = `${displayContent}\n\n=== UPLOADED FILES ===${uploadedFileContexts}\n=== END UPLOADED FILES ===`
      }
    }

    // Add project files attached via @ command (shown to user)
    if (attachedFiles.length > 0) {
      const fileContexts: string[] = []

      try {
        const { storageManager } = await import('@/lib/storage-manager')
        await storageManager.init()

        for (const attachedFile of attachedFiles) {
          try {
            const fileData = await storageManager.getFile(project.id, attachedFile.path)
            if (fileData && fileData.content) {
              fileContexts.push(`\n\n--- Project File: ${attachedFile.path} ---\n${fileData.content}\n--- End of ${attachedFile.name} ---`)
            }
          } catch (error) {
            console.error(`Error loading attached file ${attachedFile.path}:`, error)
            fileContexts.push(`\n\n--- Project File: ${attachedFile.path} ---\n[Error loading file content]\n--- End of ${attachedFile.name} ---`)
          }
        }

        if (fileContexts.length > 0) {
          enhancedContent = `${enhancedContent}\n\n=== PROJECT FILES CONTEXT ===${fileContexts.join('')}\n=== END PROJECT FILES ===`
          displayContent = `${displayContent}\n\n=== PROJECT FILES ===${fileContexts.join('')}\n=== END PROJECT FILES ===`
        }
      } catch (error) {
        console.error('Error loading attached files:', error)
      }
    }

    // Clear attachments
    setAttachedFiles([])
    setAttachedImages([])
    setAttachedUploadedFiles([])
    setAttachedUrls([])
    setInput('')
    setIsLoading(true)

    // Clear any previous errors
    setError(null)

    // Create user message
    const userMessageId = Date.now().toString()
    const userMessage = {
      id: userMessageId,
      role: 'user',
      content: displayContent
    }

    // Add user message to local state immediately for better UX
    setMessages(prev => [...prev, userMessage])

    // Save user message to IndexedDB immediately
    await saveMessageToIndexedDB(userMessage)
    console.log(`[ChatPanelV2] User message saved to database: ${userMessageId}`)

    // Create checkpoint for this message
    if (project) {
      try {
        setTimeout(async () => {
          await createCheckpoint(project.id, userMessage.id)
          console.log(`[Checkpoint] Created checkpoint for message ${userMessage.id}`)
        }, 100)
      } catch (error) {
        console.error('[Checkpoint] Error creating checkpoint:', error)
      }
    }

    // Add placeholder assistant message
    const assistantMessageId = (Date.now() + 1).toString()
    const assistantMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '' // Start with empty content so spinner shows immediately
    }
    setMessages(prev => [...prev, assistantMessage])

    // Create abort controller for this request
    const controller = new AbortController()
    setAbortController(controller)

    // AI SDK Pattern: Send only last 5 messages + new message
    try {
      // Get last 5 messages from current conversation
      const recentMessages = messages.slice(-10) // Last 5 messages
      const messagesToSend = [
        ...recentMessages.map((m: any) => ({ role: m.role, content: m.content })),
        { role: 'user', content: enhancedContent }
      ]

      console.log(`[ChatPanelV2] Sending ${messagesToSend.length} messages to server (last 5 + new)`)

      // Always refresh project files to catch latest changes made by user
      console.log(`[ChatPanelV2] Refreshing project files for real-time sync...`)
      await loadProjectFiles()

      // Build project file tree on client-side with latest data
      const fileTree = await buildProjectFileTree()

      const response = await fetch('/api/chat-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messagesToSend, // Send last 5 + new message
          id: project?.id, // Chat session ID for server-side storage
          projectId: project?.id,
          project,
          fileTree, // Use client-built file tree instead of raw files
          files: projectFiles, // Keep raw files for tool operations (now refreshed)
          modelId: selectedModel,
          aiMode
        }),
        signal: controller.signal
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      // Handle streaming response with AI SDK v5 data stream protocol
      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let accumulatedContent = ''
      let accumulatedReasoning = ''
      let lineBuffer = '' // Buffer for incomplete lines across chunks

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          console.log('[ChatPanelV2][DataStream] 📊 Stream complete')
          break
        }

        const chunk = decoder.decode(value, { stream: true })
        
        // Add chunk to buffer and split by newlines
        // Important: Don't trim individual lines yet - metadata might span multiple chunks
        lineBuffer += chunk
        const lines = lineBuffer.split('\n')
        
        // Keep the last incomplete line in the buffer
        lineBuffer = lines.pop() || ''
        
        // Process complete lines
        const completeLines = lines.filter(line => line.trim())

        for (const line of completeLines) {
          try {
            // Remove SSE "data: " prefix if present
            const jsonString = line.startsWith('data: ') ? line.slice(6) : line
            
            // Skip empty lines or SSE comments
            if (!jsonString || jsonString.startsWith(':')) {
              continue
            }
            
            // Parse AI SDK v5 stream protocol
            // Format: {"type":"0","value":"text"} or {"type":"tool-call",...}
            const parsed = JSON.parse(jsonString)
            
            // Skip server-internal chunks that shouldn't be exposed to client
            if (parsed.type === 'start-step' || parsed.type === 'reasoning-start') {
              console.log('[ChatPanelV2][DataStream] Skipping server-internal chunk:', parsed.type)
              continue
            }
            
            console.log('[ChatPanelV2][DataStream] Parsed stream part:', parsed)

            // Handle different stream part types
            if (parsed.type === 'text-delta') {
              // Text delta - accumulate the text
              if (parsed.text) {
                accumulatedContent += parsed.text
                setMessages(prev => prev.map(msg =>
                  msg.id === assistantMessageId
                    ? { ...msg, content: accumulatedContent, reasoning: accumulatedReasoning }
                    : msg
                ))
              }
            } else if (parsed.type === 'reasoning-delta') {
              // Reasoning delta - accumulate reasoning separately
              if (parsed.text) {
                accumulatedReasoning += parsed.text
                setMessages(prev => prev.map(msg =>
                  msg.id === assistantMessageId
                    ? { ...msg, content: accumulatedContent, reasoning: accumulatedReasoning }
                    : msg
                ))
              }
            } else if (parsed.type === 'continuation_signal') {
              // STREAM CONTINUATION: Handle automatic continuation request
              console.log('[ChatPanelV2][Continuation] 🔄 Received continuation signal:', parsed.continuationState?.continuationToken)

              // Mark that continuation is in progress to keep loading active
              setIsContinuationInProgress(true)

              // Show continuation message to user
              toast({
                title: "Continuing conversation...",
                description: "Stream will continue seamlessly due to time constraints.",
                duration: 3000
              })

              // Automatically trigger continuation after a brief delay
              setTimeout(async () => {
                await handleStreamContinuation(parsed.continuationState, assistantMessageId, accumulatedContent, accumulatedReasoning)
              }, 1000)

              // Don't process any more chunks after continuation signal
              break
            } else if (parsed.type === 'tool-call') {
              // CLIENT-SIDE TOOL EXECUTION: Execute file operation tools on IndexedDB
              const toolCall = {
                toolName: parsed.toolName,
                toolCallId: parsed.toolCallId,
                args: parsed.input, // AI SDK sends 'input' not 'args'
                dynamic: false // We don't use dynamic tools
              }
              
              console.log('[ChatPanelV2][ClientTool] 🔧 Tool call received:', {
                toolName: toolCall.toolName,
                toolCallId: toolCall.toolCallId,
                args: toolCall.args
              })

              // Check if this is a client-side tool (both read and write operations)
              const clientSideTools = [
                'write_file', 
                'edit_file', 
                'delete_file', 
                'add_package', 
                'remove_package',
                'read_file',
                'list_files',
                'grep_search',
                'semantic_code_navigator'
              ]
              
              if (clientSideTools.includes(toolCall.toolName)) {
                console.log('[ChatPanelV2][ClientTool] ⚡ Executing client-side tool:', toolCall.toolName)
                
                // Execute the tool on client-side IndexedDB immediately
                const { handleClientFileOperation } = await import('@/lib/client-file-tools')
                
                // Define addToolResult function - this sends the result back to the AI
                const addToolResult = (result: any) => {
                  console.log('[ChatPanelV2][ClientTool] ✅ Client-side tool completed:', {
                    tool: result.tool,
                    toolCallId: result.toolCallId,
                    success: !result.errorText,
                    output: result.output
                  })
                  
                  // For client-side tools, we need to send the result back to continue the conversation
                  // Create a continuation request with the tool result
                  handleClientToolResult(toolCall.toolName, result, project?.id, assistantMessageId)
                }
                
                // Execute the tool asynchronously (don't await - per AI SDK docs)
                handleClientFileOperation(toolCall, project?.id, addToolResult)
                  .catch(error => {
                    console.error('[ChatPanelV2][ClientTool] ❌ Tool execution error:', error)
                    // Send error result back
                    const errorResult = {
                      tool: toolCall.toolName,
                      toolCallId: toolCall.toolCallId,
                      state: 'output-error',
                      errorText: error instanceof Error ? error.message : 'Unknown error'
                    }
                    handleClientToolResult(toolCall.toolName, errorResult, project?.id, assistantMessageId)
                  })
              } else {
                console.log('[ChatPanelV2][DataStream] Server-side tool call, server handles:', parsed.toolName)
              }
            } else if (parsed.type === 'tool-result') {
              // Tool result - these come from server-side tool executions
              console.log('[ChatPanelV2][DataStream] Tool result received:', {
                toolName: parsed.toolName,
                toolCallId: parsed.toolCallId
              })
            }
          } catch (e) {
            // Log error details to help debug parsing issues
            console.error('[ChatPanelV2][DataStream] ❌ Failed to parse chunk:', {
              error: e instanceof Error ? e.message : String(e),
              line: line.substring(0, 200), // Log first 200 chars of problematic line
              lineLength: line.length
            })
            continue
          }
        }
      }

      // Stream complete - client-side tools executed during streaming
      console.log('[ChatPanelV2][DataStream] 📊 Stream complete:', {
        contentLength: accumulatedContent.length,
        hasProject: !!project
      })
      
      // All file operations now execute client-side during streaming - no end-of-stream processing needed
       
      // Save assistant message to database after streaming completes
      if (accumulatedContent.trim()) {
        await saveAssistantMessageAfterStreaming(
          assistantMessageId,
          accumulatedContent,
          accumulatedReasoning,
          [] // No tool invocations tracking - tools execute during streaming
        )
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        // Request was aborted, remove the placeholder assistant message
        setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId))
      } else {
        setError(error)
        // Remove the placeholder assistant message on error
        setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId))
      }
    } finally {
      // Only turn off loading if continuation is not in progress
      if (!isContinuationInProgress) {
        setIsLoading(false)
      }
      setAbortController(null)
    }
  }

  // Web Speech API real-time speech-to-text implementation
  const startWebSpeechRecognition = () => {
    try {
      // @ts-ignore - Web Speech API types
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      const recognition = new SpeechRecognition()

      // Enhanced settings for real-time typing
      recognition.continuous = true
      recognition.interimResults = true // Enable instant real-time results
      recognition.lang = 'en-US'
      recognition.maxAlternatives = 1

      // Store the initial input value when starting
      const initialInput = input
      let lastFinalTranscript = ''
      let silenceTimer: NodeJS.Timeout | null = null

      recognition.onstart = () => {
        setIsRecording(true)
        lastFinalTranscript = ''
        toast({
          title: "🎤 Listening...",
          description: "Speak now. I'll stop automatically when you're done."
        })
      }

      recognition.onresult = (event: any) => {
        // Clear any existing silence timer
        if (silenceTimer) {
          clearTimeout(silenceTimer)
        }

        let interimTranscript = ''
        let finalTranscript = ''

        // Process all results for instant typing effect
        for (let i = 0; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript

          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' '
          } else {
            interimTranscript += transcript
          }
        }

        // Combine final and interim for instant real-time typing
        const combinedText = (finalTranscript || lastFinalTranscript) + interimTranscript

        // Update final transcript tracker
        if (finalTranscript) {
          lastFinalTranscript = finalTranscript
        }

        // Instantly update the input field with real-time text
        if (combinedText.trim()) {
          const updatedInput = initialInput
            ? `${initialInput} ${combinedText.trim()}`
            : combinedText.trim()
          setInput(updatedInput)
        }

        // Auto-stop detection: Set timer to stop after 2 seconds of silence
        silenceTimer = setTimeout(() => {
          if (recognition && recognitionRef.current) {
            recognition.stop()
            toast({
              title: "Recording stopped",
              description: "Stopped due to silence detected"
            })
          }
        }, 2000) // 2 seconds of silence triggers auto-stop
      }

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)

        // Clear silence timer on error
        if (silenceTimer) {
          clearTimeout(silenceTimer)
        }

        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          toast({
            title: "❌ Microphone access denied",
            description: "Please allow microphone access to use voice input",
            variant: "destructive"
          })
        } else if (event.error === 'no-speech') {
          toast({
            title: "⚠️ No speech detected",
            description: "Please try speaking louder or closer to the microphone",
            variant: "destructive"
          })
        } else if (event.error === 'aborted') {
          // User manually stopped, don't show error
          console.log('Recognition aborted by user')
        } else {
          toast({
            title: "Recognition error",
            description: `Error: ${event.error}. Please try again.`,
            variant: "destructive"
          })
        }
        setIsRecording(false)
      }

      recognition.onend = () => {
        // Clear any pending silence timer
        if (silenceTimer) {
          clearTimeout(silenceTimer)
        }

        // Only show success if we actually captured text
        if (lastFinalTranscript.trim()) {
          toast({
            title: "✅ Speech recognized successfully",
            description: "Your speech has been converted to text"
          })
        }

        setIsRecording(false)
        recognitionRef.current = null
      }

      recognitionRef.current = recognition
      recognition.start()
    } catch (error) {
      console.error('Error starting Web Speech Recognition:', error)
      toast({
        title: "Speech recognition not available",
        description: "Your browser doesn't support speech recognition",
        variant: "destructive"
      })
    }
  }

  const startDeepgramRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
        await transcribeWithDeepgram(audioBlob)

        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)

      toast({
        title: "Recording started",
        description: "Speak now... Click again to stop"
      })
    } catch (error) {
      console.error('Error starting recording:', error)
      toast({
        title: "Recording failed",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive"
      })
    }
  }

  const stopDeepgramRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setIsTranscribing(true)
    }
  }

  const transcribeWithDeepgram = async (audioBlob: Blob) => {
    try {
      // Convert blob to base64
      const reader = new FileReader()
      reader.readAsDataURL(audioBlob)

      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1]

        // Send to speech-to-text API
        const response = await fetch('/api/speech-to-text', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ audio: base64Audio }),
        })

        if (!response.ok) {
          throw new Error('Failed to transcribe audio')
        }

        const data = await response.json()

        if (data.success && data.text) {
          // Append transcribed text to input
          setInput(prev => prev ? `${prev} ${data.text}` : data.text)

          toast({
            title: "Transcription complete",
            description: "Your speech has been converted to text"
          })
        } else {
          throw new Error('No transcription received')
        }
      }

      reader.onerror = () => {
        throw new Error('Failed to read audio file')
      }
    } catch (error) {
      console.error('Error transcribing audio:', error)
      toast({
        title: "Transcription failed",
        description: "Could not convert speech to text",
        variant: "destructive"
      })
    } finally {
      setIsTranscribing(false)
    }
  }

  const handleMicrophoneClick = () => {
    if (isRecording) {
      // Stop current recording
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      } else if (mediaRecorderRef.current) {
        stopDeepgramRecording()
      }
    } else {
      // Check if Web Speech API is available, otherwise fallback to Deepgram
      if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
        startWebSpeechRecognition()
      } else {
        // Fallback to Deepgram for browsers without Web Speech API (like Firefox)
        console.log('Web Speech API not supported, using Deepgram fallback')
        toast({
          title: "Using Deepgram",
          description: "Your browser doesn't support Web Speech API"
        })
        startDeepgramRecording()
      }
    }
  }

  // File attachment handlers
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    // Close the attachment menu
    setShowAttachmentMenu(false)

    for (const file of Array.from(files)) {
      const reader = new FileReader()
      reader.onload = async (event) => {
        const base64 = event.target?.result as string
        const imageId = Date.now().toString() + Math.random()
        
        // Add image with processing flag
        setAttachedImages((prev: AttachedImage[]) => [...prev, {
          id: imageId,
          name: file.name,
          base64,
          isProcessing: true
        }])

        // Get description using vision API
        try {
          const response = await fetch('/api/describe-image', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              image: base64,
              prompt: "Describe this image in detail, including layout, colors, text, UI elements, and any other relevant information that would help recreate or understand this design."
            }),
          })

          const { description } = await response.json()
          
          // Update with description
          setAttachedImages((prev: AttachedImage[]) => prev.map((img: AttachedImage) => 
            img.id === imageId ? { ...img, description, isProcessing: false } : img
          ))
        } catch (error) {
          console.error('Error describing image:', error)
          setAttachedImages((prev: AttachedImage[]) => prev.map((img: AttachedImage) => 
            img.id === imageId ? { ...img, isProcessing: false } : img
          ))
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    // Close the attachment menu
    setShowAttachmentMenu(false)

    for (const file of Array.from(files)) {
      const reader = new FileReader()
      reader.onload = (event) => {
          const content = event.target?.result as string
          setAttachedUploadedFiles((prev: AttachedUploadedFile[]) => [...prev, {
          id: Date.now().toString() + Math.random(),
          name: file.name,
          content,
          size: file.size
        }])
      }
      reader.readAsText(file)
    }
  }

  const handleUrlAttachment = async () => {
    if (!urlInput.trim()) return

    // Close the attachment menu
    setShowAttachmentMenu(false)

    const urlId = Date.now().toString()
    setAttachedUrls((prev: AttachedUrl[]) => [...prev, {
      id: urlId,
      url: urlInput,
      isProcessing: true
    }])
    setUrlInput('')
    setShowUrlDialog(false)

    // Fetch URL content
    try {
      console.log('🌐 Fetching URL content:', urlInput);

      const response = await fetch('/api/redesign', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: urlInput }),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch URL content')
      }

      const data = await response.json()

      console.log('✅ URL content fetched:', {
        url: urlInput,
        contentLength: data.markdown?.length,
        hasContent: !!data.markdown
      })

      // Update URL with content (API returns markdown field)
      setAttachedUrls((prev: AttachedUrl[]) => prev.map((url: AttachedUrl) =>
        url.id === urlId ? { ...url, title: urlInput, content: data.markdown, isProcessing: false } : url
      ))
    } catch (error) {
      console.error('Error fetching URL:', error)
      setAttachedUrls((prev: AttachedUrl[]) => prev.map((url: AttachedUrl) => 
        url.id === urlId ? { ...url, isProcessing: false } : url
      ))
    }
  }

  return (
    <div className={`flex flex-col ${isMobile ? 'h-[calc(100vh-9.5rem)]' : 'h-full'}`}>
      {/* Messages Area - Scrollable container */}
      <div className={`flex-1 min-h-0 overflow-y-auto space-y-4 ${isMobile ? 'p-4 pb-20' : 'p-4'}`}>
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>Start a conversation with PiPilot...</p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'flex',
              message.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            {message.role === 'user' ? (
              <div className="w-full">
                <ExpandableUserMessage
                  content={message.content}
                  messageId={message.id}
                  onCopy={handleCopyMessage}
                  onDelete={handleDeleteMessage}
                  onRetry={handleRetryMessage}
                  onRevert={handleRevertToCheckpoint}
                  showRestore={restoreMessageId === message.id}
                />
              </div>
            ) : (
           <Card className={cn("w-full",
                message.reasoning || message.content || (message.toolInvocations && message.toolInvocations.length > 0)
                  ? "bg-muted"
                  : "bg-transparent border-0"
              )}>
                <div className="p-4 break-words overflow-wrap-anywhere">
                  <MessageWithTools
                    message={message}
                    projectId={project?.id}
                    isStreaming={(isLoading && message.id === messages[messages.length - 1]?.id) || message.id === continuingMessageId}
                  />
                </div>
                {/* AI Message Actions - Only show if message has content */}
                {message.content && message.content.trim().length > 0 && (
                  <div className="px-4 pb-2 flex justify-end">
                    <Actions>
                      <Action
                        tooltip="Copy message"
                        onClick={() => handleCopyMessage(message.id, message.content)}
                      >
                        <Copy className="w-4 h-4" />
                      </Action>
                      <Action
                        tooltip="Delete message"
                        onClick={() => handleDeleteMessage(message.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Action>
                    </Actions>
                  </div>
                )}
              </Card>
            )}
          </div>
        ))}

        {/* Don't show separate loading spinner - MessageWithTools handles it */}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Fixed at bottom */}
      <div className={`border-t bg-background p-4 ${isMobile
          ? 'fixed bottom-12 left-0 right-0 p-4 z-[60] border-b'
          : 'p-4'
      }`}>
        {/* Attachments Display */}
        {(attachedFiles.length > 0 || attachedImages.length > 0 || attachedUploadedFiles.length > 0 || attachedUrls.length > 0) && (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachedFiles.map((file: AttachedFile) => (
              <div key={file.id} className="flex items-center gap-1 bg-secondary px-2 py-1 rounded text-xs">
                <FileText className="size-3" />
                <span>{file.name}</span>
                <button onClick={() => setAttachedFiles((prev: AttachedFile[]) => prev.filter((f: AttachedFile) => f.id !== file.id))}>
                  <X className="size-3" />
                </button>
              </div>
            ))}
            {attachedImages.map((img: AttachedImage) => (
              <div key={img.id} className="flex items-center gap-1 bg-secondary px-2 py-1 rounded text-xs">
                <ImageIcon className="size-3" />
                <span>{img.name}</span>
                {img.isProcessing && <Loader2 className="size-3 animate-spin" />}
                <button onClick={() => setAttachedImages((prev: AttachedImage[]) => prev.filter((i: AttachedImage) => i.id !== img.id))}>
                  <X className="size-3" />
                </button>
              </div>
            ))}
            {attachedUploadedFiles.map((file: AttachedUploadedFile) => (
              <div key={file.id} className="flex items-center gap-1 bg-secondary px-2 py-1 rounded text-xs">
                <FileText className="size-3" />
                <span>{file.name}</span>
                <button onClick={() => setAttachedUploadedFiles((prev: AttachedUploadedFile[]) => prev.filter((f: AttachedUploadedFile) => f.id !== file.id))}>
                  <X className="size-3" />
                </button>
              </div>
            ))}
            {attachedUrls.map((url: AttachedUrl) => (
              <div key={url.id} className="flex items-center gap-1 bg-secondary px-2 py-1 rounded text-xs">
                <LinkIcon className="size-3" />
                <span>{url.title || url.url}</span>
                {url.isProcessing && <Loader2 className="size-3 animate-spin" />}
                <button onClick={() => setAttachedUrls((prev: AttachedUrl[]) => prev.filter((u: AttachedUrl) => u.id !== url.id))}>
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="relative">
          <form onSubmit={handleEnhancedSubmit}>
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                const newValue = e.target.value
                setInput(newValue)
                
                // Lightweight synchronous @ command detection (only if @ is present)
                if (textareaRef.current && project && newValue.includes('@')) {
                  const atCommand = detectAtCommand(newValue, e.target.selectionStart)
                  if (atCommand) {
                    // Update state only when query or visibility changes to avoid re-renders
                    if (!showFileDropdown || fileQuery !== atCommand.query || atCommandStartIndex !== atCommand.startIndex) {
                      setFileQuery(atCommand.query)
                      setAtCommandStartIndex(atCommand.startIndex)
                      const position = calculateDropdownPosition(textareaRef.current, atCommand.startIndex)
                      setDropdownPosition(position)
                      setShowFileDropdown(true)
                    }
                  } else if (showFileDropdown) {
                    closeFileDropdown()
                  }
                } else if (showFileDropdown) {
                  // Close dropdown if no @ in text
                  closeFileDropdown();
                }
                
                // Trigger height adjustment
                setTimeout(() => {
                  if (textareaRef.current) {
                    debouncedHeightAdjustment(textareaRef.current)
                  }
                }, 0)
              }}
              placeholder="Type, @ for files, paste images or URLs, or attach..."
              className="min-h-[48px] max-h-[140px] resize-none pr-12 pb-12"
              onKeyDown={(e: any) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleEnhancedSubmit(e)
                }
              }}
              onPaste={async (e) => {
                // Handle image pasting
                const items = e.clipboardData?.items
                if (!items) return

                // TEMPORARILY DISABLED: Check for URLs in pasted text first
                /*
                const pastedText = e.clipboardData?.getData('text')
                if (pastedText) {
                  // URL regex pattern
                  const urlRegex = /(https?:\/\/[^\s]+)/g
                  const urls = pastedText.match(urlRegex)
                  
                  if (urls && urls.length > 0) {
                    e.preventDefault()
                    
                    // Check total attachment limit
                    const totalAttachments = attachedImages.length + attachedUploadedFiles.length + attachedUrls.length
                    if (totalAttachments >= 2) {
                      toast({
                        title: "Maximum attachments reached",
                        description: "You can attach a maximum of 2 items (images, files, and/or URLs)",
                        variant: "destructive"
                      })
                      return
                    }
                    
                    // Process each URL
                    for (const url of urls.slice(0, 2 - totalAttachments)) { // Limit to remaining slots
                      const urlId = `pasted_url_${Date.now()}_${Math.random()}`
                      
                      // Add URL with processing flag
                      setAttachedUrls(prev => [...prev, {
                        id: urlId,
                        url: url,
                        isProcessing: true
                      }])
                      
                      // Fetch URL content
                      try {
                        console.log('🌐 Auto-attaching pasted URL:', url);
                        
                        const response = await fetch('/api/redesign', {
                          method: 'PUT',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({ url: url }),
                        })
                        
                        if (!response.ok) {
                          throw new Error('Failed to fetch URL content')
                        }
                        
                        const data = await response.json()
                        
                        console.log('✅ URL content fetched:', {
                          url: url,
                          contentLength: data.markdown?.length,
                          hasContent: !!data.markdown
                        })
                        
                        // Update URL with content
                        setAttachedUrls(prev => prev.map((attachedUrl: AttachedUrl) =>
                          attachedUrl.id === urlId 
                            ? { ...attachedUrl, title: url, content: data.markdown, isProcessing: false } 
                            : attachedUrl
                        ))
                        
                        toast({
                          title: "URL attached",
                          description: `Auto-attached ${url}`
                        })
                      } catch (error) {
                        console.error('Error fetching pasted URL:', error)
                        toast({
                          title: "URL attachment failed",
                          description: `Failed to attach ${url}`,
                          variant: "destructive"
                        })
                        setAttachedUrls(prev => prev.filter(attachedUrl => attachedUrl.id !== urlId))
                      }
                    }
                    
                    return // Don't process images if URLs were found
                  }
                }
                */

                // Handle image pasting (existing logic)
                for (let i = 0; i < items.length; i++) {
                  const item = items[i]
                  
                  if (item.type.indexOf('image') !== -1) {
                    e.preventDefault()
                    
                    // Check total attachment limit
                    const totalAttachments = attachedImages.length + attachedUploadedFiles.length + attachedUrls.length
                    if (totalAttachments >= 2) {
                      toast({
                        title: "Maximum attachments reached",
                        description: "You can attach a maximum of 2 items (images, files, and/or URLs)",
                        variant: "destructive"
                      })
                      return
                    }

                    const file = item.getAsFile()
                    if (!file) continue

                    // Validate file size (max 10MB)
                    if (file.size > 10 * 1024 * 1024) {
                      toast({
                        title: "File too large",
                        description: "Pasted image is too large. Maximum size is 10MB",
                        variant: "destructive"
                      })
                      continue
                    }

                    // Convert to base64
                    const reader = new FileReader()
                    reader.onload = async (event) => {
                      const base64 = event.target?.result as string
                      const imageId = `pasted_img_${Date.now()}_${i}`

                      // Add image with processing flag
                      setAttachedImages(prev => [...prev, {
                        id: imageId,
                        name: `Pasted Image ${attachedImages.length + 1}`,
                        base64: base64,
                        isProcessing: true
                      }])

                      // Send to Pixtral for description
                      try {
                        const response = await fetch('/api/describe-image', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            image: base64,
                            prompt: "Describe this image in detail, including layout, colors, text, UI elements, and any other relevant information."
                          })
                        })

                        if (!response.ok) throw new Error('Failed to describe image')

                        const data = await response.json()

                        // Update image with description
                        setAttachedImages(prev => prev.map(img => 
                          img.id === imageId 
                            ? { ...img, description: data.description, isProcessing: false }
                            : img
                        ))

                        toast({
                          title: "Image pasted and processed",
                          description: "Image attached successfully"
                        })
                      } catch (error) {
                        console.error('Error describing pasted image:', error)
                        toast({
                          title: "Processing failed",
                          description: "Failed to process pasted image",
                          variant: "destructive"
                        })
                        setAttachedImages(prev => prev.filter(img => img.id !== imageId))
                      }
                    }

                    reader.onerror = () => {
                      toast({
                        title: "Read error",
                        description: "Failed to read pasted image",
                        variant: "destructive"
                      })
                    }

                    reader.readAsDataURL(file)
                  }
                }
              }}
            />
          </form>

          {/* Bottom Left: Attachment and Voice Buttons */}
          <div className="absolute bottom-2 left-2 flex gap-2">
            {/* Attachment Popover */}
            <Popover open={showAttachmentMenu} onOpenChange={setShowAttachmentMenu}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                >
                  <Plus className="size-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2 z-[70]" side="top" align="start">
                <div className="flex flex-col gap-1">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  <label htmlFor="image-upload">
                    <Button type="button" variant="ghost" size="sm" className="w-full justify-start" asChild>
                      <span><ImageIcon className="size-4 mr-2" /> Images</span>
                    </Button>
                  </label>

                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload">
                    <Button type="button" variant="ghost" size="sm" className="w-full justify-start" asChild>
                      <span><FileText className="size-4 mr-2" /> Files</span>
                    </Button>
                  </label>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setShowUrlDialog(true)}
                  >
                    <LinkIcon className="size-4 mr-2" /> URL
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Voice Button */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleMicrophoneClick}
              disabled={isTranscribing}
            >
              {isRecording ? <MicOff className="size-4" /> : <Mic className="size-4" />}
            </Button>
          </div>

          {/* Bottom Right: Send/Stop Button */}
          <div className="absolute bottom-2 right-2">
            {isLoading ? (
              <Button
                type="button"
                variant="default"
                size="icon"
                className="h-8 w-8"
                onClick={stop}
              >
                <Loader2 className="size-4 animate-spin" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                className="h-8 w-8"
                disabled={!input.trim() && attachedFiles.length === 0}
                onClick={handleEnhancedSubmit}
              >
                <ArrowUp className="size-4" />
              </Button>
            )}
          </div>
        </div>



        {/* URL Attachment Dialog */}
        <AlertDialog open={showUrlDialog} onOpenChange={setShowUrlDialog}>
          <AlertDialogContent className="bg-gray-900 border-gray-700 z-[70]">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Attach Website URL</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400">
                Enter a website URL to fetch its content. The AI will analyze the website structure and content.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <input
                type="url"
                placeholder="https://example.com"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleUrlAttachment()
                  }
                }}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                autoFocus
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-gray-700 text-gray-300 hover:bg-gray-600">
                Cancel
              </AlertDialogCancel>
              <button
                onClick={handleUrlAttachment}
                disabled={!urlInput.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Attach URL
              </button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* File Attachment Dropdown (@ command) */}
        {showFileDropdown && project && (
          <FileAttachmentDropdown
            isVisible={showFileDropdown}
            onClose={closeFileDropdown}
            onFileSelect={handleFileSelect}
            projectId={project.id}
            query={fileQuery}
            position={dropdownPosition}
          />
        )}

        {/* Checkpoint Revert Confirmation Dialog */}
        <AlertDialog open={showRevertDialog} onOpenChange={setShowRevertDialog}>
          <AlertDialogContent className="bg-gray-900 border-gray-700 z-[70]">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Revert to Checkpoint?</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400">
                This will restore all files to their state at this message and remove all messages after it. You can restore within 5 minutes if needed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-gray-700 text-gray-300 hover:bg-gray-600">
                Cancel
              </AlertDialogCancel>
              <button
                onClick={async () => {
                  if (!project || !revertMessageId) return
                  
                  setIsReverting(true)
                  setShowRevertDialog(false)
                  
                  try {
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
                      return
                    }
                     
                    // Capture state before revert
                    const { capturePreRevertState, getCheckpoints, deleteMessagesAfter, restoreCheckpoint } = await import('@/lib/checkpoint-utils')
                    await capturePreRevertState(project.id, activeSession.id, revertMessageId)
                    
                    // Find checkpoint for this message
                    const checkpoints = await getCheckpoints(project.id)
                    const checkpoint = checkpoints.find(cp => cp.messageId === revertMessageId)
                    
                    if (!checkpoint) {
                      toast({
                        title: "Revert Failed",
                        description: "Could not find checkpoint for this message.",
                        variant: "destructive"
                      })
                      return
                    }
                    
                    // Delete messages after this point
                    const allMessages = await storageManager.getMessages(activeSession.id)
                    const targetMessage = allMessages.find(msg => msg.id === revertMessageId)
                    
                    if (targetMessage) {
                      // Clear all messages that came after this message (including AI responses)
                      const messageIndex = messages.findIndex(msg => msg.id === revertMessageId)
                      if (messageIndex !== -1) {
                        setMessages(prev => prev.slice(0, messageIndex + 1))
                      }
                      
                      // Set the reverted message content in input for editing
                      const revertedMessage = messages.find(msg => msg.id === revertMessageId)
                      if (revertedMessage) {
                        setInput(revertedMessage.content)
                      }
                      
                      await deleteMessagesAfter(activeSession.id, targetMessage.createdAt)
                    }
                    
                    // Restore files
                    const success = await restoreCheckpoint(checkpoint.id)
                    
                    if (success) {
                      await loadMessages()
                      
                      window.dispatchEvent(new CustomEvent('files-changed', { 
                        detail: { projectId: project.id, forceRefresh: true } 
                      }))
                      
                      setRestoreMessageId(revertMessageId)
                      
                      toast({
                        title: "Reverted Successfully",
                        description: "Files and messages have been restored. You can undo this action for 5 minutes."
                      })
                    }
                  } catch (error) {
                    console.error('[Checkpoint] Error reverting:', error)
                    toast({
                      title: "Revert Failed",
                      description: error instanceof Error ? error.message : "An unknown error occurred.",
                      variant: "destructive"
                    })
                  } finally {
                    setIsReverting(false)
                    setRevertMessageId(null)
                  }
                }}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-500 transition-colors"
              >
                Revert
              </button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}