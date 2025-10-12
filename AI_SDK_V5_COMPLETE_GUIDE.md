# 🚀 AI SDK v5 - Complete Implementation Guide

## 📦 Required Packages

Based on the Vercel Labs implementation, here are the key packages:

```bash
npm install ai @ai-sdk/openai @ai-sdk/react framer-motion react-markdown remark-gfm zod
```

### Package Breakdown:
- `ai` - Core AI SDK (v5)
- `@ai-sdk/openai` - OpenAI provider
- `@ai-sdk/react` - React hooks (useChat)
- `framer-motion` - Animations
- `react-markdown` - Markdown rendering
- `remark-gfm` - GitHub Flavored Markdown
- `zod` - Schema validation for tools

## 🔑 Key v5 API Differences

### ❌ What Changed from v4
```typescript
// v4 (Vercel Labs repo)
maxSteps: 5

// v5 (Your version)
stopWhen: stepCountIs(5)
```

### ✅ Correct v5 Imports
```typescript
// Backend
import { streamText, tool, stepCountIs, hasToolCall } from 'ai';
import { openai } from '@ai-sdk/openai';

// Frontend
import { useChat } from '@ai-sdk/react'; // NOT 'ai/react'
import { type Message } from '@ai-sdk/react';

// Optional utilities
import { smoothStream, extractReasoningMiddleware } from 'ai';
```

## 🎯 Backend Implementation (AI SDK v5)

### Complete API Route Example

```typescript
// app/api/chat/route.ts
import { streamText, tool, stepCountIs } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

export async function POST(request: Request) {
  const { messages, projectId } = await request.json();

  const stream = streamText({
    model: openai('gpt-4o'),
    
    system: `You are a helpful coding assistant.`,
    
    messages,
    
    // 🔥 v5 Syntax: Use stopWhen instead of maxSteps
    stopWhen: stepCountIs(5),
    
    // Optional: Combine multiple stop conditions
    // stopWhen: [
    //   stepCountIs(10),
    //   hasToolCall('finalAnswer')
    // ],
    
    tools: {
      // Tool definitions with execute functions
      write_file: tool({
        description: "Write or create a new file",
        parameters: z.object({
          path: z.string().describe("File path"),
          content: z.string().describe("File content"),
        }),
        execute: async ({ path, content }) => {
          // Your file writing logic
          console.log(`Writing ${path}`);
          
          // Simulate file write
          await new Promise(resolve => setTimeout(resolve, 500));
          
          return {
            success: true,
            path,
            bytes: content.length,
          };
        },
      }),
      
      edit_file: tool({
        description: "Edit an existing file",
        parameters: z.object({
          path: z.string(),
          searchReplaceBlocks: z.array(
            z.object({
              oldCode: z.string(),
              newCode: z.string(),
            })
          ),
        }),
        execute: async ({ path, searchReplaceBlocks }) => {
          console.log(`Editing ${path}`);
          
          return {
            success: true,
            path,
            changes: searchReplaceBlocks.length,
          };
        },
      }),
      
      read_file: tool({
        description: "Read a file's contents",
        parameters: z.object({
          path: z.string(),
        }),
        execute: async ({ path }) => {
          console.log(`Reading ${path}`);
          
          return {
            success: true,
            path,
            content: "// File contents here",
            lines: 42,
          };
        },
      }),
      
      // 🧠 Reasoning tool for transparency
      thinking: tool({
        description: "Express your reasoning process",
        parameters: z.object({
          thought: z.string(),
          confidence: z.number().min(0).max(1),
        }),
        execute: async ({ thought, confidence }) => {
          return { thought, confidence };
        },
      }),
    },
    
    // Optional: Add smooth streaming
    experimental_transform: smoothStream({
      delayInMs: 15,
      chunking: 'word',
    }),
  });

  // 🔥 Return instant streaming response
  return stream.toDataStreamResponse();
}
```

## 🎨 Frontend Implementation (AI SDK v5)

### Message Component with Tool Rendering

```typescript
// components/message-with-tools.tsx
"use client";
import { ToolInvocation } from "ai";
import { motion } from "framer-motion";
import type { Message } from "@ai-sdk/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Your existing components
import { Task, TaskTrigger, TaskContent, TaskItem, TaskItemFile } from "@/components/ai-elements/task";
import { Reasoning } from "@/components/ai-elements/reasoning";
import { ChainOfThought } from "@/components/ai-elements/chain-of-thought";
import { Response } from "@/components/ai-elements/response";

// Icons
import { User, Bot, FileText, Edit3, Check, Loader2, Brain } from "lucide-react";

interface MessageWithToolsProps {
  message: Message;
}

export function MessageWithTools({ message }: MessageWithToolsProps) {
  const { role, content, toolInvocations } = message;
  const isUser = role === "user";

  return (
    <motion.div
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="flex gap-4 px-4 py-6"
    >
      {/* Avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
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
          <div className="space-y-3">
            {toolInvocations.map((invocation) => {
              const { toolName, toolCallId, state, args } = invocation;

              // Loading state
              if (state === "call") {
                return (
                  <Task key={toolCallId} defaultOpen={true}>
                    <TaskTrigger title={`Executing ${toolName}...`}>
                      <div className="flex items-center gap-2 text-sm">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{toolName}</span>
                      </div>
                    </TaskTrigger>
                    <TaskContent>
                      {args?.path && (
                        <TaskItem>
                          <TaskItemFile>{args.path}</TaskItemFile>
                        </TaskItem>
                      )}
                    </TaskContent>
                  </Task>
                );
              }

              // Completed state
              if (state === "result") {
                const { result } = invocation;

                return (
                  <Task key={toolCallId} defaultOpen={false}>
                    <TaskTrigger title={`✓ ${toolName}`}>
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <Check className="w-4 h-4" />
                        <span>{toolName}</span>
                      </div>
                    </TaskTrigger>
                    <TaskContent>
                      {/* Render based on tool type */}
                      {toolName === "write_file" && (
                        <TaskItem>
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            <span>Created:</span>
                            <TaskItemFile>{result.path}</TaskItemFile>
                          </div>
                          {result.bytes && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {result.bytes} bytes
                            </div>
                          )}
                        </TaskItem>
                      )}

                      {toolName === "edit_file" && (
                        <TaskItem>
                          <div className="flex items-center gap-2">
                            <Edit3 className="w-4 h-4" />
                            <span>Modified:</span>
                            <TaskItemFile>{result.path}</TaskItemFile>
                          </div>
                          {result.changes && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {result.changes} changes
                            </div>
                          )}
                        </TaskItem>
                      )}

                      {toolName === "thinking" && (
                        <Reasoning defaultOpen={true}>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium">
                              <Brain className="w-4 h-4" />
                              <span>Reasoning:</span>
                            </div>
                            <Response>{result.thought}</Response>
                            {result.confidence !== undefined && (
                              <div className="text-xs text-muted-foreground">
                                Confidence: {Math.round(result.confidence * 100)}%
                              </div>
                            )}
                          </div>
                        </Reasoning>
                      )}
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
```

### Chat Panel with useChat Hook

```typescript
// components/chat-panel.tsx
"use client";

import { useRef } from "react";
import { useChat } from "@ai-sdk/react"; // v5 import
import { MessageWithTools } from "./message-with-tools";
import { motion } from "framer-motion";
import { ArrowUp } from "lucide-react";

interface ChatPanelProps {
  projectId: string;
}

export function ChatPanel({ projectId }: ChatPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  
  // 🔥 v5 useChat hook
  const {
    messages,
    input,
    setInput,
    handleSubmit,
    isLoading,
    error,
    stop,
    reload,
  } = useChat({
    api: "/api/chat",
    body: {
      projectId,
    },
    onFinish: (message) => {
      console.log("Stream finished:", message);
    },
    onError: (error) => {
      console.error("Chat error:", error);
    },
  });

  const suggestedActions = [
    {
      title: "Create a file",
      action: "Create a simple hello.ts file",
    },
    {
      title: "List files",
      action: "Show me all files in the project",
    },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 && (
          <div className="h-full flex items-center justify-center">
            <div className="max-w-md space-y-4">
              <h2 className="text-2xl font-bold">How can I help?</h2>
              <div className="grid gap-2">
                {suggestedActions.map((action, idx) => (
                  <motion.button
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    onClick={() => setInput(action.action)}
                    className="text-left p-3 rounded-lg border hover:bg-muted transition-colors"
                  >
                    <div className="font-medium">{action.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {action.action}
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <MessageWithTools key={message.id} message={message} />
        ))}
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Send a message..."
            disabled={isLoading}
            className="flex-1 px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg disabled:opacity-50"
          >
            {isLoading ? (
              <span>Stop</span>
            ) : (
              <ArrowUp className="w-5 h-5" />
            )}
          </button>
        </form>

        {error && (
          <div className="mt-2 text-sm text-red-600">
            Error: {error.message}
          </div>
        )}
      </div>
    </div>
  );
}
```

## 🎯 Key v5 Concepts

### 1. Message Structure
```typescript
interface Message {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  parts: UIMessagePart[]; // v5 uses parts for better control
  toolInvocations?: ToolInvocation[];
  metadata?: unknown;
}
```

### 2. Tool Invocation States
```typescript
// state: "call" - Tool is being executed
if (invocation.state === "call") {
  // Show loading state
}

// state: "result" - Tool completed successfully
if (invocation.state === "result") {
  // Show result
  const { result } = invocation;
}

// state: "partial-call" - Tool call streaming (rare)
```

### 3. Stop Conditions (v5)
```typescript
import { stepCountIs, hasToolCall } from 'ai';

// Single condition
stopWhen: stepCountIs(5)

// Multiple conditions (OR logic)
stopWhen: [
  stepCountIs(10),           // Stop after 10 steps
  hasToolCall('finalAnswer') // OR when this tool is called
]

// Custom condition
stopWhen: ({ stepCount, toolCalls }) => {
  return stepCount > 5 && toolCalls.some(t => t.toolName === 'done');
}
```

### 4. Smooth Streaming (v5)
```typescript
import { smoothStream } from 'ai';

experimental_transform: smoothStream({
  delayInMs: 15,        // Delay between chunks
  chunking: 'word',     // or 'line' or custom regex
})
```

### 5. Reasoning Extraction (v5)
```typescript
import { extractReasoningMiddleware } from 'ai';

experimental_transform: extractReasoningMiddleware({
  tagName: 'reasoning',
  separator: '\n',
})

// AI can now output:
// <reasoning>My thought process...</reasoning>
// Final answer here

// The reasoning is extracted and available separately
```

## 🔧 Migration Checklist

### Backend Changes:
- [ ] Replace `maxSteps: 5` with `stopWhen: stepCountIs(5)`
- [ ] Import `tool` helper from 'ai'
- [ ] Convert tool definitions to use `tool()` wrapper
- [ ] Add `execute` async functions to tools
- [ ] Return `stream.toDataStreamResponse()`

### Frontend Changes:
- [ ] Change import to `import { useChat } from '@ai-sdk/react'`
- [ ] Use `input` and `setInput` from useChat (not managed internally)
- [ ] Render `message.toolInvocations` array
- [ ] Check `invocation.state` for loading/result
- [ ] Use your Task/Reasoning components for results

## 🎨 Integration with Your Components

### Your Existing Components → Tool Results

```typescript
// task.tsx → Tool execution tracking
<Task defaultOpen={state === "call"}>
  <TaskTrigger title={`${state === "call" ? "⏳" : "✓"} ${toolName}`} />
  <TaskContent>{/* tool details */}</TaskContent>
</Task>

// reasoning.tsx → AI thought process
<Reasoning defaultOpen={true} isStreaming={state === "call"}>
  <Response>{result.thought}</Response>
</Reasoning>

// chain-of-thought.tsx → Multi-step reasoning
<ChainOfThought>
  {result.steps?.map(step => (
    <div key={step.id}>
      <strong>Step {step.num}:</strong>
      <Response>{step.reasoning}</Response>
    </div>
  ))}
</ChainOfThought>

// response.tsx → Final text output
<Response>
  <ReactMarkdown>{content}</ReactMarkdown>
</Response>
```

## 🚀 Testing the Implementation

### Test 1: Basic Tool Call
```
User: "Create a file called test.ts"

Expected:
1. Task shows "⏳ write_file" (loading)
2. File path appears
3. Task updates to "✓ write_file" (complete)
4. Shows success message
```

### Test 2: Multi-Step (with stopWhen)
```
User: "Read package.json and tell me the dependencies"

Expected:
1. Task: "⏳ read_file" → "✓ read_file"
2. AI analyzes content
3. Final response with dependencies list

Note: Works because stopWhen: stepCountIs(5) allows chaining
```

### Test 3: Reasoning Tool
```
User: "Should I use React or Vue?"

Expected:
1. Task: "⏳ thinking" with reasoning
2. Reasoning component shows thought process
3. Final recommendation
```

## 📚 Additional Resources

- [AI SDK v5 Documentation](https://sdk.vercel.ai/docs)
- [stepCountIs API](https://sdk.vercel.ai/docs/ai-sdk-core/tools-and-tool-calling#step-count)
- [useChat v5 Guide](https://sdk.vercel.ai/docs/ai-sdk-ui/chatbot)
- [Migration Guide v4 → v5](https://sdk.vercel.ai/docs/migration-guide)

---

## 🎉 Summary

**You have everything you need:**
- ✅ AI SDK v5 with correct syntax
- ✅ `stopWhen: stepCountIs()` for multi-step
- ✅ `useChat` from '@ai-sdk/react'
- ✅ Tool awareness with `toolInvocations`
- ✅ Your existing components ready to use

**Start with:**
1. Update API route with `stopWhen` and `toDataStreamResponse()`
2. Create MessageWithTools component
3. Integrate your Task/Reasoning/ChainOfThought components
4. Test and iterate!

**Total implementation time: ~3-4 hours** 🚀
