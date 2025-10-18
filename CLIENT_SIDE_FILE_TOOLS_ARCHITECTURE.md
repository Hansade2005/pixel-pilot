# Client-Side File Tools Architecture

## Overview

This document explains the **client-side file operations architecture** implemented using AI SDK patterns. File operations (`write_file`, `read_file`, `edit_file`, `delete_file`) now execute directly on the browser's IndexedDB during AI streaming, rather than on the server.

---

## 🎯 Goals

1. **Client-Side Execution**: File operations execute in the browser using IndexedDB
2. **Real-Time Updates**: Files are created/modified immediately during AI streaming
3. **No Server Storage**: The server doesn't handle file persistence - only the client does
4. **AI SDK Compliance**: Follows AI SDK's client-side tool handling patterns

---

## 🏗️ Architecture

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         User sends message                       │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Frontend (chat-panel-v2.tsx)                    │
│  - Builds message with attachments                               │
│  - Sends to /api/chat-v2                                         │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Server (chat-v2/route.ts)                      │
│  - Receives message                                              │
│  - Calls AI with streamText()                                    │
│  - Defines file tools with "forwarding" execute functions        │
│  - Streams response back to client                               │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AI Model (e.g., GPT-4)                        │
│  - Processes user request                                        │
│  - Decides to call file tools                                    │
│  - Emits tool-call events in stream                              │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│              Frontend Stream Processing                          │
│  - Receives tool-call event from stream                          │
│  - Identifies client-side tools                                  │
│  - Calls handleClientFileOperation()                             │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│         Client File Tools (client-file-tools.ts)                 │
│  - Executes file operation on IndexedDB                          │
│  - Updates/creates/deletes files immediately                     │
│  - Emits 'files-changed' event                                   │
│  - Calls addToolResult() for AI context                          │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     IndexedDB (Browser)                          │
│  - File persisted locally                                        │
│  - Available immediately in file explorer                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 Key Files

### 1. `/lib/client-file-tools.ts`
**Purpose**: Client-side file operation execution logic

```typescript
export async function handleClientFileOperation(
  toolCall: any,
  projectId: string,
  addToolResult: (result: any) => void
) {
  // Step 1: Check if dynamic (skip if true)
  if (toolCall.dynamic) return;

  // Step 2: Match tool name
  switch (toolCall.toolName) {
    case 'write_file':
      // Execute on IndexedDB
      // Call addToolResult() immediately (no await)
      break;
    // ... other tools
  }
}
```

**Key Features**:
- Checks `toolCall.dynamic` first (per AI SDK docs)
- Uses `storageManager` to interact with IndexedDB
- Calls `addToolResult()` synchronously (never awaited)
- Emits `files-changed` events for UI updates

---

### 2. `/app/api/chat-v2/route.ts`
**Purpose**: Server-side API that defines tools and streams AI responses

```typescript
const result = await streamText({
  model,
  system: systemPrompt,
  messages: convertToModelMessages(messages),
  tools: {
    // CLIENT-SIDE TOOLS (forwarding execute functions)
    write_file: tool({
      description: '...',
      inputSchema: z.object({...}),
      execute: async ({ path, content }, { toolCallId }) => {
        // Return marker - actual execution happens on client
        return {
          _clientSideTool: true,
          toolName: 'write_file',
          path,
          message: `File operation forwarded to client: ${path}`
        }
      }
    }),
    // ... other client-side tools

    // SERVER-SIDE TOOLS (full execute functions)
    add_package: tool({
      description: '...',
      inputSchema: z.object({...}),
      execute: async (input) => {
        // Full server-side logic
        // Actually modifies package.json
      }
    })
  }
})
```

**Key Features**:
- Client-side tools have "forwarding" execute functions
- They return markers but don't do actual file operations
- Server-side tools (add_package, remove_package) have full logic
- Streams tool-call events to the client

---

### 3. `/components/workspace/chat-panel-v2.tsx`
**Purpose**: Frontend chat panel that handles streaming and tool execution

```typescript
// Inside stream processing loop
if (parsed.type === 'tool-call') {
  const toolCall = {
    toolName: parsed.toolName,
    toolCallId: parsed.toolCallId,
    args: parsed.args,
    dynamic: false
  }
  
  const clientSideTools = ['write_file', 'read_file', 'edit_file', 'delete_file']
  if (clientSideTools.includes(toolCall.toolName)) {
    // Import and execute client-side tool
    const { handleClientFileOperation } = await import('@/lib/client-file-tools')
    
    const addToolResult = (result: any) => {
      console.log('Tool completed:', result)
      // Result is for logging - file operation already applied
    }
    
    // Execute asynchronously (don't await per AI SDK docs)
    handleClientFileOperation(toolCall, project?.id, addToolResult)
  }
}
```

**Key Features**:
- Detects `tool-call` events in the stream
- Identifies client-side vs server-side tools
- Executes client-side tools immediately
- Doesn't block the stream

---

## 🔄 Tool Execution Flow

### Client-Side Tools (write_file, read_file, edit_file, delete_file)

1. **AI decides to call tool**
   - Example: `write_file({ path: "src/app.tsx", content: "..." })`

2. **Server forwards tool call**
   - Execute function returns marker
   - Tool-call event added to stream

3. **Client receives tool-call event**
   - Stream parser detects `type: 'tool-call'`
   - Extracts toolName, toolCallId, args

4. **Client executes tool**
   - `handleClientFileOperation()` called
   - File operation applied to IndexedDB
   - `files-changed` event emitted

5. **UI updates automatically**
   - File explorer refreshes
   - Code editor reloads if file is open

6. **Tool result logged**
   - `addToolResult()` called for tracking
   - Not sent back to server (operation already complete)

### Server-Side Tools (add_package, remove_package)

1. **AI decides to call tool**
2. **Server executes tool**
   - Full logic runs on server
   - Modifies package.json
3. **File operation sent in metadata**
4. **Client applies at end of stream**

---

## 🎯 Benefits

### 1. **Immediate Updates**
Files appear in the UI as soon as the AI calls the tool, not at the end of streaming.

### 2. **No Server Storage**
The server doesn't need to manage file persistence. All storage is client-side in IndexedDB.

### 3. **Scalability**
Server doesn't store project files, reducing memory and storage requirements.

### 4. **Offline Capable**
Files are stored in browser IndexedDB, enabling offline editing capabilities.

### 5. **Real-Time UX**
Users see files being created/modified in real-time during AI responses.

---

## ⚠️ Important Notes

### 1. **Never Await addToolResult()**
```typescript
// ❌ WRONG - Causes deadlocks
await addToolResult(result)

// ✅ CORRECT - Call synchronously
addToolResult(result)
```

### 2. **Check toolCall.dynamic First**
```typescript
// Always check this first
if (toolCall.dynamic) return;
```

### 3. **Client-Side Tools Must Have Execute Functions**
Even though execution happens on client, the server needs execute functions that return markers. Without them, AI SDK throws errors.

### 4. **File Operations Are Async to Stream**
The file operation completes independently of the AI stream. This is intentional and follows AI SDK patterns.

---

## 🧪 Testing

### Test Client-Side Tool Execution

1. **Send a message**: "Create a file src/test.tsx with Hello World"
2. **Watch console logs**:
   - `[Chat-V2][write_file] Forwarding to client: src/test.tsx`
   - `[ChatPanelV2][ClientTool] 🔧 Tool call received`
   - `[ClientFileTool] write_file: src/test.tsx`
   - `[ClientFileTool] Created file: src/test.tsx`
3. **Check file explorer**: File should appear immediately
4. **Check IndexedDB**: File should be stored in browser database

### Verify No Duplicate Operations

1. Enable verbose console logging
2. Trigger file operation
3. Check logs at end of stream:
   - Should show: "⏭️ Skipping client-side operation (already applied during stream)"
   - Should NOT apply file twice

---

## 🔧 Troubleshooting

### Tool Execution Fails
- Check browser console for errors
- Verify IndexedDB is available
- Check storageManager initialization

### Files Not Appearing
- Check `files-changed` event is emitted
- Verify file explorer is listening for events
- Check IndexedDB using browser DevTools

### Duplicate File Operations
- Ensure end-of-stream logic skips client-side tools
- Check for proper tool type detection

---

## 📚 References

- **AI SDK Documentation**: Client-side tool handling patterns
- **IndexedDB API**: Browser storage API
- **Event-Driven Architecture**: For UI updates

---

## 🚀 Future Enhancements

1. **Optimistic UI Updates**: Show file changes before IndexedDB write completes
2. **Conflict Resolution**: Handle concurrent edits gracefully
3. **Undo/Redo**: Track file operation history
4. **Sync to Cloud**: Optional cloud backup of IndexedDB files

---

## Summary

The client-side file tools architecture enables:
- ✅ Real-time file operations during AI streaming
- ✅ Browser-based storage with IndexedDB
- ✅ No server-side file persistence needed
- ✅ Immediate UI updates
- ✅ AI SDK compliant implementation

All file operations execute on the client, providing a fast, responsive, and scalable user experience.
