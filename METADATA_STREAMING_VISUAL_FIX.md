# Metadata Streaming - Before vs After

## The Problem Visualized

### Scenario: 113KB Metadata Message

```
Backend sends:
{"type":"metadata","fileOperations":[...10,000 chars...],"toolInvocations":[...105,000 chars...]}\n
```

### Before Fix ❌

```
TCP Chunks → Frontend Processing → Result
┌──────────────────────────────────────────────────┐
│ Chunk 1 (64KB):                                   │
│ {"type":"metadata","fileOper...                   │
│                                                   │
│ Frontend tries: JSON.parse(chunk)                │
│ Result: SyntaxError - Unexpected end of JSON     │
│ Action: console.warn("Skipping malformed chunk") │
│ LOST: Metadata never processed ❌                │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│ Chunk 2 (49KB):                                   │
│ ...ations":[...],"toolInvoca...                   │
│                                                   │
│ Frontend tries: JSON.parse(chunk)                │
│ Result: SyntaxError - Unexpected token           │
│ Action: console.warn("Skipping malformed chunk") │
│ LOST: Metadata never processed ❌                │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│ Chunk 3 (remaining):                              │
│ ...tions":[]]}\n                                  │
│                                                   │
│ Frontend tries: JSON.parse(chunk)                │
│ Result: SyntaxError - Unexpected token           │
│ Action: console.warn("Skipping malformed chunk") │
│ LOST: Metadata never processed ❌                │
└──────────────────────────────────────────────────┘

OUTCOME: No file operations applied ❌
```

### After Fix ✅

```
TCP Chunks → Line Buffer → Frontend Processing → Result
┌──────────────────────────────────────────────────┐
│ Chunk 1 (64KB):                                   │
│ {"type":"metadata","fileOper...                   │
│                                                   │
│ Buffer: {"type":"metadata","fileOper...           │
│ Action: Store in buffer, wait for more data      │
│ Result: Waiting... ⏳                             │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│ Chunk 2 (49KB):                                   │
│ ...ations":[...],"toolInvoca...                   │
│                                                   │
│ Buffer: {"type":"metadata","fileOper...ations...  │
│ Action: Append to buffer, wait for more data     │
│ Result: Waiting... ⏳                             │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│ Chunk 3 (remaining):                              │
│ ...tions":[]]}\n                                  │
│                                                   │
│ Buffer: {"type":"metadata",...tions":[]]}\n       │
│ Action: Complete line detected! Parse now.       │
│ Result: JSON.parse(buffer) ✅                    │
│                                                   │
│ Parsed Metadata:                                  │
│ {                                                 │
│   type: "metadata",                               │
│   fileOperations: [13 operations],                │
│   toolInvocations: [16 tool calls]                │
│ }                                                 │
│                                                   │
│ ✅ Store finalFileOperations                     │
│ ✅ Store finalToolInvocations                    │
│ ✅ Apply to IndexedDB                            │
│ ✅ Show toast notification                       │
│ ✅ Refresh file explorer                         │
└──────────────────────────────────────────────────┘

OUTCOME: All file operations applied successfully ✅
```

## Code Flow Comparison

### Before (Immediate Parse)
```typescript
while (true) {
  const { done, value } = await reader.read()
  if (done) break
  
  const chunk = decoder.decode(value)
  const lines = chunk.split('\n')
  
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line) // ❌ Fails on partial JSON
      // Process parsed data
    } catch (e) {
      console.warn('Skipping malformed chunk') // Silent failure
    }
  }
}
```

### After (Buffered Parse)
```typescript
let lineBuffer = '' // Persistent across reads

while (true) {
  const { done, value } = await reader.read()
  
  if (done) {
    if (lineBuffer.trim()) {
      const parsed = JSON.parse(lineBuffer) // ✅ Complete JSON
      // Process final buffered data
    }
    break
  }
  
  const chunk = decoder.decode(value)
  lineBuffer += chunk           // Accumulate
  const lines = lineBuffer.split('\n')
  lineBuffer = lines.pop() || '' // Save incomplete line
  
  for (const line of lines.filter(l => l.trim())) {
    try {
      const parsed = JSON.parse(line) // ✅ Only complete lines
      // Process parsed data
    } catch (e) {
      console.error('Parse error:', e, line.substring(0, 200))
    }
  }
}
```

## Why This Matters

### Network Reality
- TCP/IP splits large messages into MTU-sized packets (typically 1500 bytes)
- Browser APIs (`ReadableStream`) expose chunk boundaries
- **Chunks ≠ Messages** - One logical message can span multiple chunks

### JSON Streaming Requirement
- Newline-delimited JSON (NDJSON) requires **complete lines** to parse
- Partial JSON throws `SyntaxError`
- Must buffer incomplete lines until complete

### Production Impact
- **Small messages (<1KB)**: Usually fit in one chunk - worked before
- **Large messages (>64KB)**: Always split - **broken before, fixed now**
- **Metadata with 10+ file ops**: Consistently fails without buffering

## Real-World Example

### AI Response with 13 File Operations
```json
{
  "type": "metadata",
  "fileOperations": [
    {"type": "write_file", "path": "src/lib/a0llm.ts", "content": "...2000 chars..."},
    {"type": "write_file", "path": "src/hooks/useSpeechToText.ts", "content": "...3000 chars..."},
    {"type": "write_file", "path": "src/hooks/useTextToSpeech.ts", "content": "...1500 chars..."},
    {"type": "write_file", "path": "src/types/index.ts", "content": "...800 chars..."},
    {"type": "write_file", "path": "src/hooks/useMoodData.ts", "content": "...4000 chars..."},
    {"type": "write_file", "path": "src/components/MoodTracker.tsx", "content": "...5000 chars..."},
    {"type": "write_file", "path": "src/components/AIInsights.tsx", "content": "...4500 chars..."},
    {"type": "write_file", "path": "src/components/MoodChart.tsx", "content": "...6000 chars..."},
    {"type": "edit_file", "path": "src/app/page.tsx", "content": "...7000 chars..."},
    {"type": "edit_file", "path": "src/app/layout.tsx", "content": "...1200 chars..."},
    {"type": "read_file", "path": "package.json", "content": "...3000 chars..."},
    {"type": "read_file", "path": "src/app/page.tsx", "content": "...7000 chars..."},
    {"type": "read_file", "path": "src/app/layout.tsx", "content": "...1000 chars..."}
  ],
  "toolInvocations": [
    {"toolCallId": "call_1", "toolName": "write_file", "args": {...}, "result": {...}},
    // ... 15 more tool invocations with full args and results
  ]
}
```

**Total size**: ~113KB  
**TCP chunks**: 2-3 chunks (depending on network conditions)  
**Without buffering**: ❌ Never parsed  
**With buffering**: ✅ Parsed successfully

---

**Key Takeaway**: Always buffer when parsing streamed newline-delimited data!
