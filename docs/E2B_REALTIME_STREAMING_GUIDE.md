# E2B Realtime Command Output Streaming Guide

## Overview

This document explains how PiPilot implements realtime streaming of E2B sandbox command outputs to the Console tab in the UI. This guide is intended for implementing the same streaming logic in the Agent Cloud system.

---

## Architecture Summary

The streaming architecture consists of three main layers:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                                 │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  code-preview-panel.tsx                                          │   │
│  │  - Initiates streaming request with Accept: text/event-stream   │   │
│  │  - Uses ReadableStream reader to consume SSE data               │   │
│  │  - Parses "data: {...}" format and updates Console UI           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ HTTP POST with streaming response
┌─────────────────────────────────────────────────────────────────────────┐
│                         BACKEND (Next.js API)                            │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  /api/preview/route.ts                                           │   │
│  │  - Creates ReadableStream with SSE format                        │   │
│  │  - Passes onStdout/onStderr callbacks to E2B sandbox            │   │
│  │  - Streams logs as "data: {type, message}\n\n" format           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ E2B SDK with callbacks
┌─────────────────────────────────────────────────────────────────────────┐
│                         E2B SANDBOX (lib/e2b-enhanced.ts)               │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  EnhancedE2BSandbox class                                        │   │
│  │  - executeCommand() with onStdout/onStderr callbacks            │   │
│  │  - startDevServer() with realtime output streaming              │   │
│  │  - installDependenciesRobust() with streaming feedback          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Step 1: Backend API Route - Creating the Streaming Response

### Key File: `app/api/preview/route.ts`

The backend creates a `ReadableStream` that acts as a Server-Sent Events (SSE) stream:

```typescript
async function handleStreamingPreview(req: Request) {
  // Create the SSE stream
  const stream = new ReadableStream({
    async start(controller) {
      let isClosed = false
      
      // Helper function to send SSE-formatted messages
      const send = (payload: any) => {
        if (!isClosed) {
          try {
            // SSE format: "data: {json}\n\n"
            controller.enqueue(`data: ${JSON.stringify(payload)}\n\n`)
          } catch (error) {
            isClosed = true
          }
        }
      }

      try {
        // Send initial status
        send({ type: "log", message: "Booting sandbox..." })

        // Create E2B sandbox
        const sandbox = await createEnhancedSandbox({
          template: "your-template",
          timeoutMs: 600000,
          env: envVars
        })
        
        send({ type: "log", message: "Sandbox created" })

        // Install dependencies with streaming output
        send({ type: "log", message: "Installing dependencies..." })
        const installResult = await sandbox.installDependenciesRobust("/project", {
          timeoutMs: 0,
          envVars,
          packageManager: 'pnpm',
          // CRITICAL: These callbacks stream output in realtime
          onStdout: (data) => send({ type: "log", message: data.trim() }),
          onStderr: (data) => {
            const msg = data.trim()
            if (msg.includes('ERR!') || msg.includes('ENOENT')) {
              send({ type: "error", message: msg })
            } else {
              send({ type: "log", message: msg })
            }
          },
        })

        // Start dev server with streaming output
        const devServer = await sandbox.startDevServer({
          command: 'pnpm run dev',
          workingDirectory: "/project",
          port: 3000,
          timeoutMs: 300000,
          envVars,
          // CRITICAL: Stream dev server output in realtime
          onStdout: (data) => send({ type: "log", message: data.trim() }),
          onStderr: (data) => send({ type: "error", message: data.trim() }),
        })

        // Send ready signal with sandbox info
        send({
          type: "ready",
          message: "Dev server running",
          sandboxId: sandbox.id,
          url: devServer.url,
          processId: devServer.processId,
        })

        // Keep connection alive with heartbeats
        const heartbeat = setInterval(() => {
          send({ type: "heartbeat", message: "alive" })
        }, 30000)

        // Clean up on close
        const originalClose = controller.close.bind(controller)
        controller.close = () => {
          isClosed = true
          clearInterval(heartbeat)
          originalClose()
        }

      } catch (err) {
        send({
          type: "error",
          message: err instanceof Error ? err.message : "Unknown error",
        })
        controller.close()
      }
    },
  })

  // Return the stream with SSE headers
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  })
}
```

### Message Types

The streaming protocol uses these message types:

| Type | Purpose | Example |
|------|---------|---------|
| `log` | Normal output (stdout) | `{ type: "log", message: "Installing lodash..." }` |
| `error` | Error output (stderr) | `{ type: "error", message: "npm ERR! not found" }` |
| `ready` | Server/process ready | `{ type: "ready", sandboxId: "abc123", url: "https://..." }` |
| `heartbeat` | Keep connection alive | `{ type: "heartbeat", message: "alive" }` |

---

## Step 2: E2B Sandbox Wrapper - Streaming Callbacks

### Key File: `lib/e2b-enhanced.ts`

The `EnhancedE2BSandbox` class wraps E2B SDK calls with streaming callbacks:

```typescript
export class EnhancedE2BSandbox {
  constructor(
    public readonly id: string,
    private container: any  // E2B Sandbox instance
  ) {}

  /**
   * Execute a command with realtime output streaming
   */
  async executeCommand(
    command: string, 
    options?: { 
      workingDirectory?: string,
      timeoutMs?: number,
      onStdout?: (data: string) => void,  // Realtime stdout callback
      onStderr?: (data: string) => void,  // Realtime stderr callback
      envVars?: Record<string, string>
    }
  ): Promise<CommandResult> {
    const fullCommand = options?.workingDirectory 
      ? `cd ${options.workingDirectory} && ${command}` 
      : command
    
    // Execute with E2B SDK - callbacks are triggered as output arrives
    const result = await this.container.commands.run(fullCommand, {
      onStdout: options?.onStdout || ((data: string) => console.log(data)),
      onStderr: options?.onStderr || ((data: string) => console.error(data)),
      timeoutMs: options?.timeoutMs || 300000,
      envs: options?.envVars
    })
    
    return {
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      exitCode: result.exitCode || 0
    }
  }

  /**
   * Start dev server with continuous output streaming
   */
  async startDevServer(options?: {
    command?: string
    workingDirectory?: string
    port?: number
    timeoutMs?: number
    envVars?: Record<string, string>
    onStdout?: (data: string) => void
    onStderr?: (data: string) => void
  }): Promise<{ processId: string; url: string }> {
    const command = options?.command || 'npm run dev'
    const workingDir = options?.workingDirectory || '/project'
    
    const fullCommand = `cd ${workingDir} && ${command}`
    
    // Start as background process with streaming callbacks
    const process = await this.container.commands.run(fullCommand, {
      background: true,  // Run in background (non-blocking)
      onStdout: (data: string) => {
        options?.onStdout?.(data)
        // Detect when server is ready
        if (data.includes('ready') || data.includes('localhost')) {
          console.log('Server is ready')
        }
      },
      onStderr: (data: string) => {
        options?.onStderr?.(data)
      },
      envs: {
        ...options?.envVars,
        PORT: String(options?.port || 3000)
      }
    })

    // Wait for server to be ready
    await this.waitForServerReady(options?.port || 3000, options?.timeoutMs || 30000)

    return {
      processId: process.pid || 'unknown',
      url: `https://${this.id}.e2b.dev`
    }
  }

  /**
   * Install dependencies with streaming feedback
   */
  async installDependenciesRobust(
    workingDirectory: string = '/project', 
    options?: { 
      timeoutMs?: number, 
      envVars?: Record<string, string>,
      onStdout?: (data: string) => void,
      onStderr?: (data: string) => void,
      packageManager?: string
    }
  ): Promise<CommandResult> {
    const packageManager = options?.packageManager || 'pnpm'
    
    // Execute install with streaming callbacks
    const result = await this.executeCommand(`${packageManager} install`, {
      workingDirectory,
      timeoutMs: options?.timeoutMs || 0,  // No timeout for installs
      onStdout: options?.onStdout,
      onStderr: options?.onStderr,
      envVars: options?.envVars
    })
    
    return result
  }
}
```

---

## Step 3: Frontend - Consuming the Stream

### Key File: `components/workspace/code-preview-panel.tsx`

The frontend initiates the request and consumes the SSE stream:

```typescript
const createPreview = async () => {
  // State management
  const [consoleOutput, setConsoleOutput] = useState<string[]>([])
  const [currentLog, setCurrentLog] = useState("Initializing...")
  const [streamReader, setStreamReader] = useState<ReadableStreamDefaultReader | null>(null)

  // Helper to add console logs with type indicators
  const addConsoleLog = (message: string, type: 'terminal' | 'server' | 'error' = 'terminal') => {
    const timestamp = new Date().toLocaleTimeString()
    const icon = { terminal: '💻', server: '🚀', error: '❌' }[type]
    setConsoleOutput(prev => [...prev, `[${timestamp}] ${icon} ${message}`])
  }

  try {
    // Make streaming request
    const response = await fetch('/api/preview', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',  // Request SSE format
      },
      body: JSON.stringify({ projectId, files }),
    })

    // Get the response stream reader
    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response stream')
    
    setStreamReader(reader)
    const decoder = new TextDecoder()

    // Consume the stream
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      
      // Parse SSE format: "data: {...}\n\n"
      if (chunk.includes('data: ')) {
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const msg = JSON.parse(line.slice(6))  // Remove "data: " prefix
              
              // Handle different message types
              if (msg.type === "log") {
                setCurrentLog(msg.message)
                addConsoleLog(msg.message, 'server')
              }

              if (msg.type === "error") {
                addConsoleLog(`❌ ${msg.message}`, 'error')
              }

              if (msg.type === "ready") {
                addConsoleLog("✅ Server ready", 'server')
                setPreview({
                  sandboxId: msg.sandboxId,
                  url: msg.url,
                  processId: msg.processId,
                  isLoading: false,
                })
                // Don't break - keep listening for ongoing logs
              }

              if (msg.type === "heartbeat") {
                // Just keep connection alive
                continue
              }
            } catch (e) {
              // Ignore parsing errors for non-JSON lines
            }
          }
        }
      }
    }
  } catch (error) {
    addConsoleLog(`Error: ${error.message}`, 'error')
  } finally {
    reader?.releaseLock()
    setStreamReader(null)
  }
}
```

### Console UI Component

The console output is displayed in a scrollable area:

```tsx
// Auto-scroll to bottom when new output arrives
useEffect(() => {
  if (consoleRef.current && isConsoleOpen) {
    consoleRef.current.scrollTop = consoleRef.current.scrollHeight
  }
}, [consoleOutput, isConsoleOpen])

// Render console
<div 
  ref={consoleRef}
  className="h-full overflow-y-auto p-4 font-mono text-sm bg-black text-green-400"
>
  {consoleOutput.map((line, index) => (
    <div key={index} className="whitespace-pre-wrap">{line}</div>
  ))}
</div>
```

---

## Implementation Checklist for Agent Cloud

### 1. Backend API Route

- [ ] Create a new API route (e.g., `/api/agent-cloud/stream`)
- [ ] Use `ReadableStream` for SSE streaming
- [ ] Implement the `send()` helper function for SSE format
- [ ] Return response with proper headers:
  ```typescript
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  })
  ```

### 2. E2B Sandbox Integration

- [ ] Import/use `EnhancedE2BSandbox` class or similar wrapper
- [ ] Pass `onStdout` and `onStderr` callbacks to all command executions:
  ```typescript
  await sandbox.executeCommand(command, {
    onStdout: (data) => send({ type: "log", message: data.trim() }),
    onStderr: (data) => send({ type: "error", message: data.trim() }),
  })
  ```

### 3. Frontend Stream Consumer

- [ ] Create state for console output: `useState<string[]>([])`
- [ ] Make fetch request with `Accept: text/event-stream` header
- [ ] Get `ReadableStream` reader from response body
- [ ] Implement stream reading loop with `TextDecoder`
- [ ] Parse SSE format (`data: {...}\n\n`)
- [ ] Handle message types: `log`, `error`, `ready`, `heartbeat`
- [ ] Implement cleanup (cancel reader on unmount)

### 4. Console UI

- [ ] Create scrollable console area
- [ ] Add auto-scroll to bottom on new messages
- [ ] Add timestamp and type indicators to messages
- [ ] Add clear console button
- [ ] Add copy console output functionality

---

## Message Protocol Reference

```typescript
// Log message (normal output)
{ type: "log", message: string }

// Error message
{ type: "error", message: string }

// Ready signal (sandbox/server ready)
{ 
  type: "ready", 
  message: string,
  sandboxId: string,
  url: string,
  processId: string | number
}

// Heartbeat (keep-alive)
{ type: "heartbeat", message: "alive" }
```

---

## Key E2B SDK Methods with Streaming Support

```typescript
// From @e2b/code-interpreter SDK

// Execute command with streaming callbacks
await container.commands.run(command, {
  onStdout: (data: string) => { /* handle stdout */ },
  onStderr: (data: string) => { /* handle stderr */ },
  timeoutMs: 300000,
  envs: { KEY: 'value' },
  background: false  // Set to true for dev servers
})

// For background processes (dev servers)
await container.commands.run(command, {
  background: true,  // Non-blocking, process continues running
  onStdout: (data: string) => { /* stream stdout */ },
  onStderr: (data: string) => { /* stream stderr */ },
})
```

---

## Error Handling Best Practices

1. **Graceful Stream Closure**: Always check `isClosed` before enqueueing
2. **Heartbeats**: Send heartbeats every 30 seconds to keep connection alive
3. **Cleanup**: Clear intervals and release stream reader on close
4. **Error Recovery**: Continue streaming even after non-fatal errors
5. **Timeout Handling**: Use `timeoutMs: 0` for long-running operations

---

## Example: Complete Agent Cloud Integration

```typescript
// api/agent-cloud/execute/route.ts
export async function POST(req: Request) {
  const { projectId, command, files } = await req.json()
  
  const stream = new ReadableStream({
    async start(controller) {
      let isClosed = false
      const send = (payload: any) => {
        if (!isClosed) {
          controller.enqueue(`data: ${JSON.stringify(payload)}\n\n`)
        }
      }

      try {
        send({ type: "log", message: "Creating Agent Cloud sandbox..." })
        
        const sandbox = await createAgentCloudSandbox()
        send({ type: "log", message: "Sandbox ready" })

        send({ type: "log", message: `Executing: ${command}` })
        await sandbox.executeCommand(command, {
          onStdout: (data) => send({ type: "log", message: data.trim() }),
          onStderr: (data) => send({ type: "error", message: data.trim() }),
        })

        send({ type: "ready", message: "Execution complete", sandboxId: sandbox.id })
        
      } catch (err) {
        send({ type: "error", message: err.message })
      } finally {
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    }
  })
}
```

---

## Related Files

| File | Purpose |
|------|---------|
| [code-preview-panel.tsx](../components/workspace/code-preview-panel.tsx) | Frontend stream consumer & console UI |
| [preview/route.ts](../app/api/preview/route.ts) | Backend streaming API route |
| [e2b-enhanced.ts](../lib/e2b-enhanced.ts) | E2B sandbox wrapper with streaming callbacks |
| [web-preview.tsx](../components/ai-elements/web-preview.tsx) | Preview UI components |

---

## Summary

The streaming implementation follows this flow:

1. **Frontend** requests with `Accept: text/event-stream`
2. **Backend** creates `ReadableStream` and sends SSE-formatted messages
3. **E2B SDK** calls include `onStdout`/`onStderr` callbacks that pipe to `send()`
4. **Frontend** reads stream with `reader.read()` loop and parses SSE data
5. **UI** updates in realtime as messages arrive

This architecture ensures command outputs appear in the console immediately as they're generated by the E2B sandbox, providing real-time feedback to users.
