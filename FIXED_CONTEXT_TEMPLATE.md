# ✅ Fixed Context Structure Template

## 🎯 Use This Instead of Your Current Format

---

## Template 1: Native OpenAI Function Calling

```typescript
interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, any>;
      required: string[];
    };
  };
}

const tools: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "write_file",
      description: "Create or overwrite a file with the specified content",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Absolute or relative path to the file"
          },
          content: {
            type: "string",
            description: "Content to write to the file"
          }
        },
        required: ["path", "content"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read contents of a file",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path" },
          start_line: { type: "number", description: "Optional start line" },
          end_line: { type: "number", description: "Optional end line" }
        },
        required: ["path"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_files",
      description: "List files in a directory",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Directory path to list"
          }
        },
        required: ["path"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "run_command",
      description: "Execute a shell command",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string", description: "Command to execute" },
          cwd: { type: "string", description: "Working directory" }
        },
        required: ["command"]
      }
    }
  }
];

// System prompt (500-800 tokens)
const systemPrompt = `You are Optima, an elite autonomous full-stack AI developer with deep reasoning capabilities.

## Your Mission
Explore, plan, and implement complete features autonomously across the entire codebase.

## Current Project
**Name**: {PROJECT_NAME}
**Type**: {PROJECT_TYPE} (e.g., React + Vite + TypeScript)
**Description**: {PROJECT_DESCRIPTION}

## File Structure (Top-Level)
\`\`\`
{KEY_DIRECTORIES}
\`\`\`

## Tech Stack
- Frontend: React 18+, TypeScript (strict), TailwindCSS
- Build: Vite
- UI: shadcn/ui components
- State: React hooks, context
- Routing: React Router v6

## Available Tools
You have access to these tools:
- **write_file(path, content)**: Create or update files
- **read_file(path, start_line?, end_line?)**: Read file contents
- **list_files(path)**: List directory contents  
- **run_command(command, cwd?)**: Execute shell commands

## Workflow
1. **Explore**: Use list_files and read_file to understand the codebase
2. **Plan**: Outline which files to create/modify
3. **Execute**: Use write_file to implement changes
4. **Verify**: Use run_command to lint/test/build

## Quality Standards
- ✅ Type-safe (no 'any' types)
- ✅ Error handling on all operations
- ✅ Clean, modular, DRY code
- ✅ Descriptive naming (no abbreviations)
- ✅ Follow existing patterns in codebase
- ✅ Add comments only for complex logic

## Behavior
- Make rational assumptions when uncertain
- Create reusable components
- Anticipate dependencies
- Refactor adjacent code when editing
- Be proactive and autonomous`;

// Build messages array
const buildMessages = (
  conversationHistory: Message[],
  userRequest: string
): Message[] => {
  return [
    {
      role: "system",
      content: systemPrompt
        .replace("{PROJECT_NAME}", projectContext.name)
        .replace("{PROJECT_TYPE}", projectContext.type)
        .replace("{PROJECT_DESCRIPTION}", projectContext.description)
        .replace("{KEY_DIRECTORIES}", formatDirectories(projectContext.structure))
    },
    ...conversationHistory.slice(-6), // Last 3 turns (6 messages)
    {
      role: "user",
      content: userRequest
    }
  ];
};

// API call
const response = await openai.chat.completions.create({
  model: "gpt-4-turbo",
  messages: buildMessages(history, userRequest),
  tools: tools,
  tool_choice: "auto",
  temperature: 0.3
});

// Handle tool calls
if (response.choices[0].message.tool_calls) {
  const toolResults = [];
  
  for (const toolCall of response.choices[0].message.tool_calls) {
    const args = JSON.parse(toolCall.function.arguments);
    const result = await executeFunction(toolCall.function.name, args);
    
    toolResults.push({
      role: "tool",
      tool_call_id: toolCall.id,
      content: JSON.stringify(result)
    });
  }
  
  // Continue conversation with tool results
  history.push(response.choices[0].message);
  history.push(...toolResults);
  
  // Get next response
  const nextResponse = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    messages: buildMessages(history, ""),
    temperature: 0.3
  });
  
  return nextResponse.choices[0].message.content;
}
```

---

## Template 2: Custom JSON Format (Lovable/Bolt Style)

```typescript
// System prompt
const systemPrompt = `You are Optima, an autonomous full-stack AI developer.

## Current Project
- **Name**: ArtVista 3D
- **Type**: React + Vite + TypeScript
- **Structure**: src/components, src/pages, src/lib

## Response Format
When you need to perform actions, respond with this JSON structure:

\`\`\`json
{
  "thinking": "Brief explanation of what you're doing and why",
  "actions": [
    {
      "tool": "write_file",
      "path": "src/components/Gallery.tsx",
      "content": "import React..."
    },
    {
      "tool": "run_command",
      "command": "npm run lint"
    }
  ],
  "summary": "Created Gallery component and ran linter"
}
\`\`\`

## Available Tools
- write_file(path, content)
- read_file(path, start_line?, end_line?)
- list_files(path)
- run_command(command)

## Guidelines
- Write clean, type-safe TypeScript code
- Follow existing code patterns
- Be autonomous and proactive`;

// Message builder
const buildContextMessage = (
  userRequest: string,
  recentHistory: {role: string, content: string}[]
): string => {
  let context = "";
  
  // Add recent history (last 2-3 turns)
  if (recentHistory.length > 0) {
    context += "## Recent Conversation\n\n";
    for (const msg of recentHistory.slice(-6)) {
      context += `**${msg.role}**: ${msg.content.slice(0, 200)}...\n\n`;
    }
  }
  
  // Add current request
  context += `## Current Request\n\n${userRequest}`;
  
  return context;
};

// API call
const response = await openai.chat.completions.create({
  model: "gpt-4-turbo",
  messages: [
    { role: "system", content: systemPrompt },
    { role: "user", content: buildContextMessage(userRequest, history) }
  ],
  temperature: 0.3
});

// Parse JSON response
const content = response.choices[0].message.content;
const jsonMatch = content.match(/```json\n([\s\S]+?)\n```/);

if (jsonMatch) {
  const parsed = JSON.parse(jsonMatch[1]);
  
  // Execute actions
  const results = [];
  for (const action of parsed.actions) {
    const result = await executeTool(action.tool, action);
    results.push({ tool: action.tool, result });
  }
  
  // Store in history
  history.push({
    role: "assistant",
    content: content
  });
  
  // Optionally feed results back
  if (results.length > 0) {
    const resultsMessage = `## Tool Results\n\n${formatResults(results)}`;
    history.push({
      role: "user",
      content: resultsMessage
    });
  }
}
```

---

## Context Window Management

```typescript
interface Message {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tokens?: number;
}

class ContextManager {
  private maxTokens = 8000; // Reserve space for response
  
  pruneHistory(messages: Message[]): Message[] {
    // Always keep system message
    const system = messages.find(m => m.role === "system");
    let history = messages.filter(m => m.role !== "system");
    
    // Estimate tokens (rough: 1 token ≈ 4 chars)
    const estimateTokens = (text: string) => Math.ceil(text.length / 4);
    
    let totalTokens = estimateTokens(system?.content || "");
    const pruned: Message[] = [];
    
    // Keep most recent messages until we hit limit
    for (let i = history.length - 1; i >= 0; i--) {
      const tokens = estimateTokens(history[i].content);
      if (totalTokens + tokens > this.maxTokens) break;
      
      pruned.unshift(history[i]);
      totalTokens += tokens;
    }
    
    return [system!, ...pruned];
  }
  
  summarizeOldContext(messages: Message[]): string {
    // Summarize older messages to preserve key info
    const oldMessages = messages.slice(0, -6);
    
    if (oldMessages.length === 0) return "";
    
    return `## Previous Actions Summary
You previously:
${oldMessages
  .filter(m => m.role === "assistant")
  .map(m => {
    const toolMatch = m.content.match(/Created: ([^\n]+)/);
    return toolMatch ? `- ${toolMatch[1]}` : "";
  })
  .filter(Boolean)
  .join("\n")}
`;
  }
}
```

---

## Minimal Context Example

### ❌ Your Current Format (23,258 tokens)
```
user
Preprocessing Results
To understand the context and determine...

Available Information
list_files: { "type": "tool-result", "toolCallId": "call_...", ... } 

Now respond to the user's request. If you need to create, edit, or delete files, use JSON tool commands in code blocks:

{
  "tool": "write_file",
  "path": "file/path.ext", 
  "content": "file content here"
}

[1,500 lines of previous assistant response]

user
keep going create three new files

Project Context
Current project: ArtVista 3D
...
```

### ✅ Fixed Format (3,500 tokens)
```typescript
{
  "messages": [
    {
      "role": "system",
      "content": "You are Optima, an autonomous developer.\n\nProject: ArtVista 3D (React + Vite)\nStructure: src/components, src/pages\n\nTools: write_file, read_file, list_files, run_command"
    },
    {
      "role": "user",
      "content": "Create an art gallery app with 3D viewing"
    },
    {
      "role": "assistant",
      "content": "I'll create the gallery structure...",
      "tool_calls": [
        {
          "id": "call_1",
          "type": "function",
          "function": {
            "name": "write_file",
            "arguments": "{\"path\":\"src/components/Gallery.tsx\",\"content\":\"...\"}"
          }
        }
      ]
    },
    {
      "role": "tool",
      "tool_call_id": "call_1",
      "content": "{\"success\": true}"
    },
    {
      "role": "user",
      "content": "keep going create three new files"
    }
  ]
}
```

---

## Helper Functions

```typescript
// Format tool results concisely
function formatToolResult(tool: string, result: any): string {
  switch (tool) {
    case "list_files":
      return `Found ${result.files.length} files: ${result.files.slice(0, 5).join(", ")}${result.files.length > 5 ? "..." : ""}`;
    
    case "read_file":
      return `Read ${result.path} (${result.lines} lines)`;
    
    case "write_file":
      return `Created ${result.path}`;
    
    case "run_command":
      return `Ran: ${result.command}\n${result.stdout.slice(0, 200)}`;
    
    default:
      return JSON.stringify(result);
  }
}

// Summarize project structure
function summarizeStructure(fileTree: any): string {
  const dirs = Object.keys(fileTree).filter(k => fileTree[k].isDirectory);
  const files = Object.keys(fileTree).filter(k => !fileTree[k].isDirectory);
  
  return `
Directories: ${dirs.slice(0, 10).join(", ")}
Key Files: ${files.slice(0, 15).join(", ")}
Total: ${dirs.length} dirs, ${files.length} files
`.trim();
}

// Clean assistant response
function extractRelevantContent(response: string): string {
  // Remove verbose explanations, keep only key info
  const lines = response.split("\n");
  const important = lines.filter(line => 
    line.startsWith("##") || // Headers
    line.startsWith("- ") || // Lists
    line.includes("```") // Code blocks
  );
  
  return important.join("\n");
}
```

---

## Testing Your Fix

### Before/After Comparison

```typescript
// Test with your current format
const before = await testWithCurrentFormat();
console.log("Token count:", before.tokens); // ~23,000
console.log("Accuracy:", before.accuracy); // ~60-70%

// Test with fixed format
const after = await testWithFixedFormat();
console.log("Token count:", after.tokens); // ~3,500 ✅
console.log("Accuracy:", after.accuracy); // ~90-95% ✅

// Measure improvement
console.log("Token reduction:", ((before.tokens - after.tokens) / before.tokens * 100).toFixed(1) + "%");
console.log("Accuracy improvement:", (after.accuracy - before.accuracy).toFixed(1) + "%");
```

---

## Migration Steps

1. **Backup current implementation**
   ```bash
   git commit -am "Backup before context refactor"
   ```

2. **Choose template** (Option 1 or 2)

3. **Update API calls**
   - Replace current message building
   - Add tool definitions
   - Implement tool execution loop

4. **Test with sample requests**
   - "Create a new component"
   - "Refactor this file"
   - "Add a new feature"

5. **Monitor improvements**
   - Track token usage
   - Measure accuracy
   - Log response quality

6. **Iterate and optimize**
   - Adjust context size
   - Refine system prompt
   - Improve tool result formatting

---

## Pro Tips

### 🎯 Context Efficiency
- Use `list_files` results to build file tree, don't include full contents
- Summarize previous actions instead of embedding responses
- Prune old messages beyond 3-5 turns
- Use token counters to stay under budget

### 🧠 Memory Management
- Store conversation in database with timestamps
- Implement sliding window (keep last N messages)
- Add summarization for old context
- Use embeddings for semantic search of past actions

### ⚡ Performance
- Cache file contents that don't change often
- Batch tool calls when possible
- Use streaming responses for better UX
- Implement rate limiting and retries

### 🔒 Safety
- Validate tool arguments before execution
- Sandbox command execution
- Limit file access to project directory
- Add confirmation for destructive operations

---

**Use this template to fix your Vibe app!** 🚀
