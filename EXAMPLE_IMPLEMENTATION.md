# 🎯 Practical Implementation Example

This document shows **exactly** what code to change in your project to implement the Vercel Labs streaming pattern.

## 📁 File Changes Required

### 1. API Route: `app/api/chat/route.ts`

#### Current Structure (Simplified)
```typescript
// Around line 6356
result = await streamText({
  model: model,
  messages: enhancedMessages,
  temperature: 0.3,
  abortSignal: abortController.signal,
});

// Manual streaming loop
for await (const chunk of result.textStream) {
  accumulatedResponse += chunk
  const readyToEmit = processServerStreamingDelta(serverBuffer, chunk)
  if (readyToEmit) {
    controller.enqueue(`data: ${JSON.stringify({...})}\n\n`)
  }
}
```

#### New Structure (Instant Streaming)
```typescript
// Around line 6356 - REPLACE THE ENTIRE STREAMING SECTION
export async function POST(request: Request) {
  try {
    const { messages, projectId, modelId, aiMode } = await request.json();
    
    // Your existing auth and setup code...
    const model = getAIModel(modelId);
    
    // Convert your tools to AI SDK format
    const stream = streamText({
      model: model,
      messages: enhancedMessages,
      temperature: 0.3,
      stopWhen: stepCountIs(5), // 🔥 Enable multi-step tooling (AI SDK v5)
      
      tools: {
        write_file: tool({
          description: "Write or create a new file in the project",
          parameters: z.object({
            path: z.string().describe("The file path relative to project root"),
            content: z.string().describe("The complete file content"),
          }),
          execute: async ({ path, content }) => {
            try {
              console.log(`[TOOL] write_file: ${path}`);
              
              // Your existing file write logic
              const { storageManager } = await import('@/lib/storage-manager');
              await storageManager.init();
              
              const success = await storageManager.writeFile(projectId, path, content);
              
              return {
                success,
                path,
                message: `File created: ${path}`,
                bytes: content.length,
              };
            } catch (error) {
              return {
                success: false,
                path,
                error: error.message,
              };
            }
          },
        }),
        
        edit_file: tool({
          description: "Edit an existing file using search and replace",
          parameters: z.object({
            path: z.string().describe("The file path to edit"),
            searchReplaceBlocks: z.array(
              z.object({
                oldCode: z.string().describe("Code to search for"),
                newCode: z.string().describe("Code to replace with"),
              })
            ),
          }),
          execute: async ({ path, searchReplaceBlocks }) => {
            try {
              console.log(`[TOOL] edit_file: ${path}`);
              
              const { storageManager } = await import('@/lib/storage-manager');
              await storageManager.init();
              
              // Your existing edit logic
              const currentContent = await storageManager.readFile(projectId, path);
              let newContent = currentContent;
              
              for (const block of searchReplaceBlocks) {
                newContent = newContent.replace(block.oldCode, block.newCode);
              }
              
              await storageManager.writeFile(projectId, path, newContent);
              
              return {
                success: true,
                path,
                changes: searchReplaceBlocks.length,
                message: `Applied ${searchReplaceBlocks.length} changes to ${path}`,
              };
            } catch (error) {
              return {
                success: false,
                path,
                error: error.message,
              };
            }
          },
        }),
        
        read_file: tool({
          description: "Read the contents of a file",
          parameters: z.object({
            path: z.string().describe("The file path to read"),
          }),
          execute: async ({ path }) => {
            try {
              const { storageManager } = await import('@/lib/storage-manager');
              await storageManager.init();
              
              const content = await storageManager.readFile(projectId, path);
              
              return {
                success: true,
                path,
                content,
                lines: content.split('\n').length,
              };
            } catch (error) {
              return {
                success: false,
                path,
                error: error.message,
              };
            }
          },
        }),
        
        list_files: tool({
          description: "List files in the project",
          parameters: z.object({
            directory: z.string().optional().describe("Directory to list (default: root)"),
          }),
          execute: async ({ directory = "/" }) => {
            try {
              const { storageManager } = await import('@/lib/storage-manager');
              await storageManager.init();
              
              const files = await storageManager.listFiles(projectId, directory);
              
              return {
                success: true,
                directory,
                files: files.map(f => f.path),
                count: files.length,
              };
            } catch (error) {
              return {
                success: false,
                error: error.message,
              };
            }
          },
        }),
        
        // 🧠 Reasoning tool for transparency
        thinking: tool({
          description: "Express your internal reasoning before taking action",
          parameters: z.object({
            thought: z.string().describe("Your current reasoning process"),
            plan: z.string().describe("What you plan to do next"),
            confidence: z.number().min(0).max(1).describe("Confidence level 0-1"),
          }),
          execute: async ({ thought, plan, confidence }) => {
            console.log(`[REASONING] ${thought}`);
            return {
              thought,
              plan,
              confidence,
              timestamp: new Date().toISOString(),
            };
          },
        }),
      },
      
      // Optional: Add smooth streaming for better UX
      experimental_transform: smoothStream({
        delayInMs: 15,
        chunking: 'word',
      }),
    });

    // 🔥 KEY CHANGE: Use built-in streaming response
    return stream.toDataStreamResponse();
    
  } catch (error) {
    console.error('Chat API Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
```

### 2. Chat Panel: `components/workspace/chat-panel.tsx`

#### Find the useChat Hook (around line 100-300)

```typescript
// BEFORE - If you have custom state management:
const [messages, setMessages] = useState<Message[]>([]);
const [isStreaming, setIsStreaming] = useState(false);
// ... lots of manual state management

// AFTER - Use AI SDK's useChat hook:
import { useChat } from "ai/react";

export function ChatPanel({ projectId, currentProject }: ChatPanelProps) {
  const { 
    messages, 
    input, 
    setInput, 
    handleSubmit,
    isLoading,
    error,
    reload,
    stop,
  } = useChat({
    api: "/api/chat",
    body: {
      projectId: currentProject?.id,
      modelId: selectedModel,
      aiMode: selectedAiMode,
    },
    onFinish: (message) => {
      console.log("Stream finished:", message);
      // Your existing onFinish logic
    },
    onError: (error) => {
      console.error("Chat error:", error);
      toast.error(error.message);
    },
  });

  return (
    <div className="chat-panel">
      <div className="messages">
        {messages.map((message) => (
          <MessageWithTools key={message.id} message={message} />
        ))}
      </div>
      
      <form onSubmit={handleSubmit}>
        <input 
          value={input} 
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? "Thinking..." : "Send"}
        </button>
      </form>
    </div>
  );
}
```

### 3. Message Component with Tools

Create a new file: `components/workspace/message-with-tools.tsx`

```typescript
"use client";

import React from "react";
import type { Message } from "ai/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion } from "framer-motion";

// Your existing AI components
import { Task, TaskTrigger, TaskContent, TaskItem, TaskItemFile } from "@/components/ai-elements/task";
import { ChainOfThought } from "@/components/ai-elements/chain-of-thought";
import { Reasoning } from "@/components/ai-elements/reasoning";
import { Response } from "@/components/ai-elements/response";

// Icons
import { User, Bot, FileText, Edit3, Trash2, FolderOpen, Brain, Check, Loader2 } from "lucide-react";

interface MessageWithToolsProps {
  message: Message;
}

export function MessageWithTools({ message }: MessageWithToolsProps) {
  const { role, content, toolInvocations } = message;
  
  const isUser = role === "user";
  const isAssistant = role === "assistant";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`message-row flex gap-4 px-4 py-6 ${isUser ? "bg-muted/30" : ""}`}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-4">
        {/* Text content */}
        {content && (
          <Response>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
          </Response>
        )}

        {/* Tool invocations */}
        {toolInvocations && toolInvocations.length > 0 && (
          <div className="space-y-3 mt-4">
            {toolInvocations.map((invocation) => {
              const { toolName, toolCallId, state, args } = invocation;

              // Loading state - tool is being called
              if (state === "call") {
                return (
                  <Task key={toolCallId} defaultOpen={true}>
                    <TaskTrigger title={getToolDisplayName(toolName)}>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Executing {getToolDisplayName(toolName)}...</span>
                      </div>
                    </TaskTrigger>
                    <TaskContent>
                      <TaskItem>
                        {args?.path && (
                          <div className="flex items-center gap-2">
                            <FileText className="w-3 h-3" />
                            <TaskItemFile>{args.path}</TaskItemFile>
                          </div>
                        )}
                      </TaskItem>
                    </TaskContent>
                  </Task>
                );
              }

              // Completed state - tool has returned result
              if (state === "result") {
                const { result } = invocation;

                return (
                  <Task key={toolCallId} defaultOpen={false}>
                    <TaskTrigger title={`✓ ${getToolDisplayName(toolName)}`}>
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <Check className="w-4 h-4" />
                        <span>{getToolDisplayName(toolName)}</span>
                      </div>
                    </TaskTrigger>
                    <TaskContent>
                      {renderToolResult(toolName, result, args)}
                    </TaskContent>
                  </Task>
                );
              }

              return null;
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Helper: Get friendly tool name
function getToolDisplayName(toolName: string): string {
  const displayNames: Record<string, string> = {
    write_file: "Create File",
    edit_file: "Edit File",
    read_file: "Read File",
    delete_file: "Delete File",
    list_files: "List Files",
    thinking: "Reasoning",
    chain_of_thought: "Analysis",
  };
  
  return displayNames[toolName] || toolName;
}

// Helper: Render tool result based on tool type
function renderToolResult(toolName: string, result: any, args: any) {
  switch (toolName) {
    case "write_file":
      return (
        <TaskItem>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span>Created:</span>
              <TaskItemFile>{result.path}</TaskItemFile>
            </div>
            {result.bytes && (
              <div className="text-xs text-muted-foreground">
                {result.bytes} bytes written
              </div>
            )}
            {result.message && (
              <div className="text-xs text-green-600">
                ✓ {result.message}
              </div>
            )}
          </div>
        </TaskItem>
      );

    case "edit_file":
      return (
        <TaskItem>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Edit3 className="w-4 h-4" />
              <span>Modified:</span>
              <TaskItemFile>{result.path}</TaskItemFile>
            </div>
            {result.changes && (
              <div className="text-xs text-muted-foreground">
                {result.changes} change{result.changes !== 1 ? "s" : ""} applied
              </div>
            )}
          </div>
        </TaskItem>
      );

    case "read_file":
      return (
        <TaskItem>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span>Read:</span>
              <TaskItemFile>{result.path}</TaskItemFile>
            </div>
            {result.lines && (
              <div className="text-xs text-muted-foreground">
                {result.lines} lines
              </div>
            )}
          </div>
        </TaskItem>
      );

    case "list_files":
      return (
        <TaskItem>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4" />
              <span>Found {result.count} files</span>
            </div>
            {result.files && result.files.length > 0 && (
              <div className="space-y-1 mt-2">
                {result.files.slice(0, 5).map((file: string, idx: number) => (
                  <TaskItemFile key={idx}>{file}</TaskItemFile>
                ))}
                {result.files.length > 5 && (
                  <div className="text-xs text-muted-foreground">
                    ... and {result.files.length - 5} more
                  </div>
                )}
              </div>
            )}
          </div>
        </TaskItem>
      );

    case "thinking":
      return (
        <Reasoning defaultOpen={true} isStreaming={false}>
          <div className="space-y-3">
            <div>
              <div className="font-medium text-sm mb-1">Thought:</div>
              <Response>{result.thought}</Response>
            </div>
            <div>
              <div className="font-medium text-sm mb-1">Plan:</div>
              <Response>{result.plan}</Response>
            </div>
            {result.confidence !== undefined && (
              <div className="text-xs text-muted-foreground">
                Confidence: {Math.round(result.confidence * 100)}%
              </div>
            )}
          </div>
        </Reasoning>
      );

    case "chain_of_thought":
      return (
        <ChainOfThought defaultOpen={true}>
          <div className="space-y-2">
            {result.steps?.map((step: any, idx: number) => (
              <div key={idx} className="border-l-2 border-primary/20 pl-3">
                <div className="font-medium text-sm">Step {idx + 1}</div>
                <div className="text-sm">{step.step}</div>
                <Reasoning defaultOpen={false}>
                  <Response>{step.reasoning}</Response>
                </Reasoning>
              </div>
            ))}
          </div>
        </ChainOfThought>
      );

    default:
      return (
        <TaskItem>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </TaskItem>
      );
  }
}
```

### 4. Update Chat Panel to Use New Component

```typescript
// In chat-panel.tsx, replace your message rendering:

// BEFORE:
{messages.map((msg) => (
  <div key={msg.id}>
    <ReactMarkdown>{msg.content}</ReactMarkdown>
  </div>
))}

// AFTER:
import { MessageWithTools } from "./message-with-tools";

{messages.map((message) => (
  <MessageWithTools key={message.id} message={message} />
))}
```

## 🎯 Testing the Implementation

### Test 1: Single Tool Call
```
User: "Create a new file called hello.ts with a simple hello world function"

Expected output:
- AI response streaming in real-time
- Task component showing "Create File" loading
- Task completes with green checkmark
- Shows file path and size
```

### Test 2: Multi-Step Tool Calling
```
User: "List all TypeScript files, then read the first one"

Expected output:
- Task 1: "List Files" → shows 5 files
- Task 2: "Read File" → shows content of first file
- AI summarizes what it found

Note: This works because stopWhen: stepCountIs(5) allows multiple tool calls in sequence
```

### Test 3: Reasoning + Action
```
User: "Should I use useState or useReducer for this component?"

Expected output:
- Task: "Reasoning" → AI's thought process
- Reasoning component shows the analysis
- Final recommendation in markdown
```

## 🐛 Troubleshooting

### Issue: Tools not executing
**Check:** Ensure `stopWhen: stepCountIs(n)` is set in streamText (AI SDK v5)
**Check:** Tool names match exactly in execute functions
**Check:** Zod schemas are valid

### Issue: Results not showing
**Check:** `state === "result"` condition
**Check:** `message.toolInvocations` is being passed correctly
**Check:** Console for errors in tool execution

### Issue: Streaming slow or choppy
**Add:** `experimental_transform: smoothStream({ delayInMs: 15 })`
**Check:** Network tab for streaming chunks

## 🎉 Success Criteria

✅ Text streams instantly as AI generates it  
✅ Tool invocations show loading state  
✅ Tool results appear in real-time  
✅ Multiple tools can chain automatically  
✅ Your existing UI components work with tool results  
✅ Error handling works for failed tools  

---

**Next:** Try this minimal implementation first, then gradually add more tools and complexity! 🚀
