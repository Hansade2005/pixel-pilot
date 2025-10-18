# 🚀 AI SDK V5 Real-Time Streaming Implementation Plan

## 📋 Overview
Implementing Vercel Labs' real-time streaming pattern with multi-step tooling using AI SDK v5.
**OPTION A - Safe Parallel Implementation**: Create new components alongside existing ones.

---

## 🎯 Core Requirements

### Features to Preserve from Original Chat Panel
- ✅ File attachments via @ command  
- ✅ Image attachments with descriptions
- ✅ URL attachments with content extraction
- ✅ Uploaded file handling
- ✅ Speech-to-text integration
- ✅ Workflow system
- ✅ XML tool execution
- ✅ Auto-backup functionality
- ✅ Chat session management
- ✅ Checkpoint system
- ✅ Message edit/revert functionality

### Critical Event System to Maintain
```typescript
// Event Dispatchers (must preserve)
window.dispatchEvent(new CustomEvent('json-tool-executed', {
  detail: { 
    toolCall: {...}, 
    result: {...},
    projectId: projectId
  }
}))

window.dispatchEvent(new CustomEvent('files-changed', {
  detail: {
    projectId: projectId,
    action: toolAction,
    path: filePath,
    source: 'json-tool-immediate'
  }
}))

// Event Listeners (must preserve)
window.addEventListener('chat-cleared', handleChatCleared)
```

### Tools to Implement (AI SDK Native)
Current JSON tools to convert to AI SDK `tool()`:
- **write_file** - Create/update files
- **edit_file** - Modify existing files  
- **delete_file** - Remove files
- **add_package** - Add npm packages
- **remove_package** - Remove npm packages

---

## 🏗️ Implementation Architecture

### 1. MessageWithTools Component
**File**: `components/workspace/message-with-tools.tsx`

**Purpose**: Render messages with AI SDK toolInvocations

**Integration Points**:
- Use existing `<Task />` component for tool calls
- Use existing `<Reasoning />` for reasoning display
- Use existing `<ChainOfThought />` for multi-step reasoning
- Use existing `<Response />` for markdown rendering

**Tool Invocation States**:
```typescript
// AI SDK provides toolInvocations array in messages
toolInvocation.state === 'call'    // Tool is being called (loading)
toolInvocation.state === 'result'  // Tool completed (show result)
```

---

### 2. Chat API V2 Route
**File**: `app/api/chat-v2/route.ts`

**Key Changes**:
```typescript
import { streamText, tool, stepCountIs } from 'ai'
import { z } from 'zod'

// Replace custom streaming loop with:
const stream = await streamText({
  model: openai('gpt-4o'),
  messages,
  tools: {
    write_file: tool({
      description: 'Create or update a file',
      parameters: z.object({
        path: z.string(),
        content: z.string()
      }),
      execute: async ({ path, content }) => {
        // File operation logic
        return { success: true, path }
      }
    }),
    // ... other tools
  },
  stopWhen: stepCountIs(5), // Multi-step tooling
  maxSteps: 5
})

return stream.toDataStreamResponse()
```

**Benefits**:
- ✅ Instant streaming (no buffering)
- ✅ Native tool awareness on frontend
- ✅ Multi-step reasoning built-in
- ✅ Cleaner code (no manual streaming loops)

---

### 3. ChatPanel V2 Component  
**File**: `components/workspace/chat-panel-v2.tsx`

**Key Changes**:
```typescript
import { useChat } from '@ai-sdk/react'

// Replace custom useState with useChat hook
const {
  messages,      // Messages with toolInvocations
  input,
  setInput,
  handleSubmit,
  isLoading,
  error
} = useChat({
  api: '/api/chat-v2',
  body: {
    projectId: project.id,
    files: projectFiles,
    modelId: selectedModel
  }
})

// Preserve ALL existing features:
// - File attachments (keep existing state)
// - Speech-to-text (keep existing handlers)
// - Workflows (keep existing system)
// - Event dispatchers (trigger on tool results)
```

**Critical**: Keep all existing state for features not handled by useChat:
```typescript
const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])
const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([])
const [isRecording, setIsRecording] = useState(false)
// ... all other feature states
```

---

## 🔄 Event System Integration

### Dispatching Events from Tool Results
```typescript
// In MessageWithTools component, watch for tool completion
useEffect(() => {
  if (toolInvocation.state === 'result') {
    window.dispatchEvent(new CustomEvent('json-tool-executed', {
      detail: {
        toolCall: toolInvocation,
        result: toolInvocation.result,
        projectId: project.id
      }
    }))
    
    window.dispatchEvent(new CustomEvent('files-changed', {
      detail: {
        projectId: project.id,
        action: toolInvocation.toolName,
        path: toolInvocation.args.path
      }
    }))
  }
}, [toolInvocation.state])
```

---

## 📦 File Structure

```
components/workspace/
  ├── chat-panel.tsx              # Original (untouched)
  ├── chat-panel-v2.tsx           # New AI SDK version
  └── message-with-tools.tsx      # New tool rendering

app/api/
  ├── chat/
  │   └── route.ts                # Original (untouched)
  └── chat-v2/
      └── route.ts                # New AI SDK version
```

---

## ✅ Implementation Checklist

### Phase 1: MessageWithTools Component
- ☐ Create component structure
- ☐ Import existing Task, Reasoning, ChainOfThought, Response components
- ☐ Handle toolInvocation.state === 'call' (loading state)
- ☐ Handle toolInvocation.state === 'result' (completed state)
- ☐ Dispatch 'json-tool-executed' and 'files-changed' events
- ☐ Add proper TypeScript types
- ☐ Test with mock data

### Phase 2: Chat API V2 Route
- ☐ Create new route file
- ☐ Import AI SDK: streamText, tool, stepCountIs
- ☐ Define write_file tool with execute function
- ☐ Define delete_file tool with execute function
- ☐ Define add_package tool with execute function
- ☐ Define remove_package tool with execute function
- ☐ Add stopWhen: stepCountIs(5)
- ☐ Return stream.toDataStreamResponse()
- ☐ Test with curl/Postman
- ☐ Verify file operations work
- ☐ Check errors with get_errors tool

### Phase 3: ChatPanel V2 Component
- ☐ Create new component file
- ☐ Import useChat from '@ai-sdk/react'
- ☐ Set up useChat hook with proper config
- ☐ Preserve file attachment state and handlers
- ☐ Preserve image attachment functionality
- ☐ Preserve URL attachment functionality
- ☐ Preserve speech-to-text integration
- ☐ Preserve workflow system
- ☐ Preserve auto-backup triggers
- ☐ Preserve chat session management
- ☐ Preserve checkpoint system
- ☐ Add MessageWithTools for rendering
- ☐ Keep all event listeners
- ☐ Test all features individually
- ☐ Check errors with get_errors tool

### Phase 4: Integration & Testing
- ☐ Create toggle to switch between v1 and v2
- ☐ Test file attachments work in v2
- ☐ Test speech-to-text works in v2
- ☐ Test tool execution (write_file, delete_file, etc.)
- ☐ Test multi-step tooling (should see multiple tool calls)
- ☐ Verify event dispatchers fire correctly
- ☐ Verify file operations trigger UI updates
- ☐ Test with various prompts
- ☐ Performance testing
- ☐ Final error check on all files

---

## 🎨 System Prompt Integration

From `pixel_forge_system_prompt.ts`:
- ✅ Maintain design standards (Tailwind, modern UI)
- ✅ Keep TypeScript strict mode
- ✅ Use single quotes, no semicolons
- ✅ Proper JSX syntax validation
- ❌ Ignore JSON tool command format (using AI SDK tools instead)

---

## 🚀 Next Steps

1. **Start with MessageWithTools** - Isolated component, easy to test
2. **Build Chat API V2** - Core streaming logic with tools
3. **Create ChatPanel V2** - Full UI with all features
4. **Integration Testing** - Verify everything works together
5. **User Testing** - Let user try v2 alongside v1

---

## 🛡️ Safety Measures

- ✅ Original files remain untouched
- ✅ New components in separate files
- ✅ Can rollback instantly if issues
- ✅ Test each component independently
- ✅ Use get_errors tool frequently
- ✅ Preserve all existing functionality

---

**Ready to start implementation!** 🚀
