# Real-Time Streaming + Multi-Step Tooling Implementation Guide

## 🎯 Overview
After analyzing the [vercel-labs/ai-sdk-preview-roundtrips](https://github.com/vercel-labs/ai-sdk-preview-roundtrips) repository, I've identified the key patterns for implementing **instant real-time streaming with multi-step tool calling** using AI SDK v5.

## 🔑 Key Findings from Vercel Labs Implementation

### 1. Backend Pattern (API Route)
```typescript
// app/(preview)/api/chat/route.ts
import { streamText } from "ai";
import { z } from "zod";
import { openai } from "@ai-sdk/openai";

export async function POST(request: Request) {
  const { messages } = await request.json();

  const stream = streamText({
    model: openai("gpt-4o"),
    system: `Your system prompt...`,
    messages,
    stopWhen: stepCountIs(5), // 🔥 KEY: Enables multi-step tool calling (AI SDK v5)
    tools: {
      // Define your tools with execute functions
      listOrders: {
        description: "list all orders",
        parameters: z.object({}),
        execute: async function ({}) {
          const orders = getOrders();
          return orders;
        },
      },
      viewTrackingInformation: {
        description: "view tracking information for a specific order",
        parameters: z.object({ orderId: z.string() }),
        execute: async function ({ orderId }) {
          const info = getTrackingInformation({ orderId });
          return info;
        },
      },
    },
  });

  return stream.toDataStreamResponse(); // 🔥 KEY: Instant streaming response
}
```

### 2. Frontend Pattern (useChat Hook)
```typescript
// app/(preview)/page.tsx
"use client";
import { useChat } from "ai/react";

export default function ChatPage() {
  const { messages, handleSubmit, input, setInput } = useChat();

  return (
    <div>
      {messages.map((message) => (
        <Message
          key={message.id}
          role={message.role}
          content={message.content}
          toolInvocations={message.toolInvocations} // 🔥 KEY: Tool awareness
        />
      ))}
      
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={(e) => setInput(e.target.value)} />
      </form>
    </div>
  );
}
```

### 3. Message Component Pattern with Tool Rendering
```typescript
// components/message.tsx
export const Message = ({
  role,
  content,
  toolInvocations,
}: {
  role: string;
  content: string | ReactNode;
  toolInvocations: Array<ToolInvocation> | undefined;
}) => {
  return (
    <div className="message">
      {/* Render regular content */}
      {content && <Markdown>{content as string}</Markdown>}

      {/* Render tool invocations */}
      {toolInvocations && (
        <div className="tool-results">
          {toolInvocations.map((toolInvocation) => {
            const { toolName, toolCallId, state } = toolInvocation;

            // 🔥 KEY: Check for completed tool invocations
            if (state === "result") {
              const { result } = toolInvocation;

              return (
                <div key={toolCallId}>
                  {toolName === "listOrders" ? (
                    <Orders orders={result} />
                  ) : toolName === "viewTrackingInformation" ? (
                    <Tracker trackingInformation={result} />
                  ) : null}
                </div>
              );
            }
          })}
        </div>
      )}
    </div>
  );
};
```

## 📋 Implementation Steps for Your Project

### Step 1: Update API Route (`app/api/chat/route.ts`)

**Current Issue:** You're using custom streaming logic with manual buffering. This prevents the built-in tool awareness.

**Solution:** Use `toDataStreamResponse()` for instant streaming:

```typescript
// Find this section around line 6356
// BEFORE (Custom streaming):
for await (const chunk of result.textStream) {
  accumulatedResponse += chunk
  // ... manual buffering logic ...
  controller.enqueue(`data: ${JSON.stringify({...})}\n\n`)
}

// AFTER (Built-in streaming with tool awareness):
export async function POST(request: Request) {
  const { messages, projectId, aiMode } = await request.json();
  
  const stream = streamText({
    model: getAIModel(selectedModelId),
    messages: enhancedMessages,
    temperature: 0.3,
    maxSteps: 5, // Enable multi-step tool calling
    tools: {
      write_file: {
        description: "Write or create a file in the project",
        parameters: z.object({
          path: z.string().describe("File path"),
          content: z.string().describe("File content"),
        }),
        execute: async ({ path, content }) => {
          // Your existing write_file logic
          return { success: true, path };
        },
      },
      edit_file: {
        description: "Edit an existing file",
        parameters: z.object({
          path: z.string(),
          searchReplaceBlocks: z.array(z.object({
            oldCode: z.string(),
            newCode: z.string(),
          })),
        }),
        execute: async ({ path, searchReplaceBlocks }) => {
          // Your existing edit_file logic
          return { success: true, path, changes: searchReplaceBlocks.length };
        },
      },
      // Add more tools...
    },
  });

  // 🔥 Return instant streaming response
  return stream.toDataStreamResponse();
}
```

### Step 2: Update Chat Panel (`components/workspace/chat-panel.tsx`)

**Current Issue:** You may be using custom state management for messages.

**Solution:** Ensure you're using `useChat` hook properly:

```typescript
// Around the top of your ChatPanel component
import { useChat } from "ai/react";

export function ChatPanel() {
  const { 
    messages, 
    input, 
    setInput, 
    handleSubmit, 
    isLoading,
    error 
  } = useChat({
    api: "/api/chat",
    body: {
      projectId: currentProject?.id,
      aiMode: selectedAiMode,
    },
    onFinish: (message) => {
      console.log("Stream finished:", message);
    },
  });

  return (
    <div>
      {messages.map((message) => (
        <MessageComponent 
          key={message.id} 
          message={message} 
        />
      ))}
    </div>
  );
}
```

### Step 3: Create Tool-Aware Message Component

Create a new component to handle tool invocations with your existing UI components:

```typescript
// components/workspace/message-with-tools.tsx
"use client";

import { Task, TaskTrigger, TaskContent, TaskItem } from "@/components/ai-elements/task";
import { ChainOfThought } from "@/components/ai-elements/chain-of-thought";
import { Reasoning } from "@/components/ai-elements/reasoning";
import { Response } from "@/components/ai-elements/response";
import type { Message } from "ai/react";
import ReactMarkdown from "react-markdown";

export function MessageWithTools({ message }: { message: Message }) {
  const { role, content, toolInvocations } = message;

  return (
    <div className="message-container">
      {/* Render text content */}
      {content && (
        <Response>
          <ReactMarkdown>{content}</ReactMarkdown>
        </Response>
      )}

      {/* Render tool invocations */}
      {toolInvocations && toolInvocations.length > 0 && (
        <div className="tool-invocations">
          {toolInvocations.map((invocation) => {
            const { toolName, toolCallId, state, args } = invocation;

            // Show loading state for pending tools
            if (state === "call") {
              return (
                <Task key={toolCallId} defaultOpen={true}>
                  <TaskTrigger title={`Executing ${toolName}...`} />
                  <TaskContent>
                    <TaskItem>Processing {args?.path || "..."}</TaskItem>
                  </TaskContent>
                </Task>
              );
            }

            // Show results for completed tools
            if (state === "result") {
              const { result } = invocation;

              return (
                <Task key={toolCallId} defaultOpen={false}>
                  <TaskTrigger title={`✓ ${toolName}`} />
                  <TaskContent>
                    {toolName === "write_file" && (
                      <TaskItem>
                        Created: <TaskItemFile>{result.path}</TaskItemFile>
                      </TaskItem>
                    )}
                    {toolName === "edit_file" && (
                      <TaskItem>
                        Modified: <TaskItemFile>{result.path}</TaskItemFile>
                        <div className="text-xs mt-1">
                          {result.changes} changes applied
                        </div>
                      </TaskItem>
                    )}
                    {toolName === "thinking" && (
                      <ChainOfThought defaultOpen={false}>
                        <Response>{result.thought}</Response>
                      </ChainOfThought>
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
  );
}
```

### Step 4: Add Reasoning & Chain-of-Thought Tools

Leverage your existing components for enhanced AI reasoning:

```typescript
// In your API route tools definition:
tools: {
  // ... existing tools ...
  
  thinking: {
    description: "Express internal reasoning before taking action",
    parameters: z.object({
      thought: z.string().describe("Your reasoning process"),
      nextAction: z.string().describe("What you plan to do next"),
    }),
    execute: async ({ thought, nextAction }) => {
      console.log("[REASONING]", thought);
      return { thought, nextAction };
    },
  },
  
  chain_of_thought: {
    description: "Break down complex problems into steps",
    parameters: z.object({
      steps: z.array(z.object({
        step: z.string(),
        reasoning: z.string(),
      })),
    }),
    execute: async ({ steps }) => {
      return { steps };
    },
  },
}
```

Then render with your components:

```typescript
{toolName === "chain_of_thought" && (
  <ChainOfThought defaultOpen={true}>
    {result.steps.map((step, idx) => (
      <div key={idx}>
        <strong>Step {idx + 1}:</strong> {step.step}
        <Reasoning>
          <Response>{step.reasoning}</Response>
        </Reasoning>
      </div>
    ))}
  </ChainOfThought>
)}
```

## 🚀 Key Benefits of This Approach

### 1. **Instant Streaming**
- No manual buffering required
- Text appears immediately as the AI generates it
- Tool results stream in real-time

### 2. **Built-in Tool Awareness**
- `useChat` hook automatically tracks tool invocations
- No need to parse JSON from text responses
- State management handled by AI SDK

### 3. **Multi-Step Automation**
- `stopWhen: stepCountIs(5)` allows AI to chain multiple tools (AI SDK v5)
- AI can call `listOrders` → `viewTracking` → `thinking` → `response`
- All happens in one request/response cycle

### 4. **Better UX**
- Users see tools executing in real-time
- Clear visual feedback with your existing components
- Collapsible tool results with Task component

## 🎨 Visual Flow Example

```
User: "Where is my watch?"
  ↓
AI Response (streaming):
  "Let me check your orders..."
  
  [Task] ✓ listOrders
    → Found 3 orders
    
  [Task] Executing viewTrackingInformation...
    → Order #412093
    
  [Task] ✓ viewTrackingInformation
    → Status: Shipped
    → ETA: Today 5:45 PM
    
  [Response]
  "Your Apple Watch Ultra 2 (Order #412093) has shipped 
   and should arrive today at 5:45 PM!"
```

## 📊 Comparison: Before vs After

| Feature | Before (Your Current) | After (Vercel Pattern) |
|---------|----------------------|------------------------|
| Streaming | Manual buffering | Built-in `toDataStreamResponse()` |
| Tool calls | Parsed from JSON in text | Native `toolInvocations` array |
| Multi-step | Manual coordination | Automatic with `stopWhen: stepCountIs()` |
| Frontend state | Custom management | `useChat` hook handles it |
| Loading states | Manual tracking | Automatic `state: "call"` |
| Tool results | Parse from response | `state: "result"` with data |

## 🔧 Migration Checklist

- [ ] **Step 1:** Update API route to use `stopWhen: stepCountIs()` and `toDataStreamResponse()`
- [ ] **Step 2:** Convert tools to AI SDK tool format with `execute` functions
- [ ] **Step 3:** Update frontend to use `useChat` hook properly
- [ ] **Step 4:** Create `MessageWithTools` component
- [ ] **Step 5:** Integrate your existing AI components (Task, Reasoning, ChainOfThought, Response)
- [ ] **Step 6:** Add thinking/reasoning tools for better AI transparency
- [ ] **Step 7:** Test multi-step tool calling (e.g., search → analyze → write)
- [ ] **Step 8:** Add error handling for tool execution failures
- [ ] **Step 9:** Implement loading states for tool calls
- [ ] **Step 10:** Polish UI with your existing component library

## 🎯 Next Steps for You

1. **Start with a minimal test route** - Create a new API route to test the pattern
2. **Test with 2-3 simple tools** - Don't migrate all at once
3. **Verify streaming works** - Check that text and tool results stream instantly
4. **Integrate your UI components** - Use Task, Reasoning, etc. for tool results
5. **Migrate incrementally** - Move one feature at a time

## 📚 Additional Resources

- [AI SDK Core - stepCountIs](https://sdk.vercel.ai/docs/ai-sdk-core/tools-and-tool-calling#multi-step-calls)
- [AI SDK UI - useChat](https://sdk.vercel.ai/docs/ai-sdk-ui/chatbot)
- [extractReasoningMiddleware](https://sdk.vercel.ai/docs/ai-sdk-core/middleware#reasoning-middleware)
- [smoothStream](https://sdk.vercel.ai/docs/ai-sdk-core/streaming#smooth-streaming)

## 💡 Pro Tips

1. **Use `smoothStream()` for better UX:**
   ```typescript
   experimental_transform: smoothStream({ delayInMs: 20 })
   ```

2. **Combine stop conditions:**
   ```typescript
   stopWhen: [stepCountIs(10), hasToolCall('finalAnswer')]
   ```

3. **Add reasoning middleware:**
   ```typescript
   experimental_transform: extractReasoningMiddleware({ tagName: 'reasoning' })
   ```

4. **Use your existing components creatively:**
   - Task → Tool execution tracking
   - Reasoning → AI's thought process
   - ChainOfThought → Multi-step reasoning
   - Response → Final markdown output

---

**Ready to implement?** Start with the API route changes and test the streaming behavior. Once that works, the frontend integration will be straightforward! 🚀
