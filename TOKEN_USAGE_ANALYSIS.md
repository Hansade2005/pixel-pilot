# Token Usage Analysis

## Problem
High token usage (46K-50K+ input tokens) despite only sending 3 core files in project context.

## Root Cause Analysis

### ✅ What's Working Correctly
1. **Project Context** - Only includes full content for:
   - `package.json`
   - `src/App.tsx` or `App.tsx`
   - `index.html`
   
2. **File Syncing** - All 66 files are synced to server storage (this is necessary for AI tools)

### ❌ What's Causing High Token Usage

#### 1. **AI Tool Execution**
```
toolCallsCount: 19, outputTokens: 7836, inputTokens: 33515
```
- AI is making 19 tool calls in a single request
- Each tool call includes the full context + previous tool results
- AI tools read all files and include them in responses

#### 2. **Conversation Memory Accumulation**
- Previous conversation context is included in each request
- File contents from previous tool calls accumulate in memory
- Memory processing functions are being called frequently

#### 3. **Tool Result Accumulation**
- Each tool call result is added to the conversation context
- Large file contents from `read_file` calls accumulate
- Context grows with each step in multi-step operations

## Token Usage Breakdown

### Initial Context (~5-8K tokens)
- System prompt: ~3K tokens
- Project context (3 core files): ~2-3K tokens  
- User message: ~100 tokens
- **Total: ~5-8K tokens** ✅ This is correct

### Tool Execution Context Growth
- Step 1: 10K tokens (initial + first tool results)
- Step 2: 15K tokens (+ more tool results)
- Step 3: 24K tokens (+ more tool results)
- Step 19: 50K+ tokens (accumulated context)

## Solutions

### 1. **Limit Tool Context Accumulation**
- Truncate tool results after certain size
- Only keep essential tool results in context
- Clear conversation context periodically

### 2. **Optimize AI Tools**
```typescript
// Current: Returns full enhanced context (6307 characters)
const enhancedContext = await buildEnhancedProjectContext(projectId, storageManager)

// Better: Return summary only
const projectSummary = await buildProjectSummary(projectId, storageManager)
```

### 3. **Limit Conversation Memory**
- Only include last 5-10 messages in context
- Summarize older conversation history
- Remove file contents from memory after processing

### 4. **Optimize Multi-Step Operations**
- Batch related operations
- Clear intermediate results
- Use streaming for large responses

### 5. **Tool Result Filtering**
```typescript
// Instead of including full file contents in tool results
// Include only summaries or references
{
  "action": "read_file",
  "file": "src/components/Header.tsx",
  "summary": "React component with navigation menu",
  "size": "2.3KB"
  // Don't include full content in tool result
}
```

## Immediate Fix Needed

AI tools are likely the main culprit:
```
[DEBUG] AI tools: Built enhanced context with 6307 characters
[DEBUG] AI tools: Available files count: 66
```

These tools are reading all 66 files and including their analysis in the response, which then gets passed to subsequent tool calls.

## Recommendation

1. **Modify AI tools** to return only essential summary
2. **Implement context truncation** after each tool call
3. **Add conversation memory limits**
4. **Monitor token usage** per tool call
