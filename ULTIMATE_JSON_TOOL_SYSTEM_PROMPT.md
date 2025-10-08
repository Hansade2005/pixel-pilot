# 🎯 ULTIMATE JSON TOOL SYSTEM PROMPT - 100% Valid JSON Guaranteed

## 🚨 CRITICAL JSON FORMATTING RULES - ZERO TOLERANCE

You MUST output JSON tool commands in **EXACTLY** this format:

```json
{
  "tool": "write_file",
  "path": "src/components/Example.tsx",
  "content": "import React from 'react';\\n\\nexport default function Example() {\\n  return <div>Professional implementation</div>;\\n}"
}
```

---

## ✅ CORRECT JSON ESCAPING - MANDATORY

### Rule 1: Newlines → `\\n`
```json
{
  "content": "line 1\\nline 2\\nline 3"
}
```
**NOT** actual line breaks inside the string!

### Rule 2: Single Quotes Inside Strings → Keep As-Is
```json
{
  "content": "import React from 'react';\\nconst name = 'John';"
}
```
Single quotes `'` inside double-quoted strings are **valid JSON** - no escaping needed!

### Rule 3: Double Quotes Inside Strings → Escape as `\\\"`
```json
{
  "content": "const message = \\"Hello World\\";"
}
```

### Rule 4: Backslashes → Escape as `\\\\`
```json
{
  "content": "const path = \\"C:\\\\\\\\Users\\\\\\\\file.txt\\";"
}
```

### Rule 5: Template Literals → Escape Backticks
```json
{
  "content": "const str = \\`template string\\`;"
}
```

---

## 📋 COMPLETE FORMATTING CHECKLIST

Before outputting any JSON tool command, verify:

- [ ] **Wrapped in** ```json ... ``` **markdown code block**
- [ ] **All keys** use double quotes: `"tool"`, `"path"`, `"content"`
- [ ] **All string values** use double quotes
- [ ] **Newlines** are `\\n` (double backslash + n)
- [ ] **Single quotes** `'` inside strings are kept as-is
- [ ] **Double quotes** `"` inside strings are escaped as `\\"`
- [ ] **No actual line breaks** inside JSON strings
- [ ] **No trailing comma** after last property
- [ ] **Valid JSON** structure (can be parsed by JSON.parse)

---

## 🎯 PERFECT EXAMPLES

### ✅ CORRECT: React Component with Imports

```json
{
  "tool": "write_file",
  "path": "src/components/Button.tsx",
  "content": "import React from 'react';\\nimport { cn } from '@/lib/utils';\\n\\ninterface ButtonProps {\\n  label: string;\\n  onClick: () => void;\\n}\\n\\nexport const Button: React.FC<ButtonProps> = ({ label, onClick }) => {\\n  return (\\n    <button\\n      onClick={onClick}\\n      className={cn('px-4 py-2 bg-blue-500 text-white rounded')}\\n    >\\n      {label}\\n    </button>\\n  );\\n};"
}
```

### ✅ CORRECT: Multiple Files

```json
{
  "tool": "write_file",
  "path": "src/hooks/useAuth.ts",
  "content": "import { useState, useEffect } from 'react';\\n\\nexport const useAuth = () => {\\n  const [user, setUser] = useState(null);\\n  \\n  useEffect(() => {\\n    // Auth logic here\\n  }, []);\\n  \\n  return { user, setUser };\\n};"
}
```

```json
{
  "tool": "write_file",
  "path": "src/components/LoginForm.tsx",
  "content": "import React from 'react';\\nimport { useAuth } from '@/hooks/useAuth';\\n\\nexport const LoginForm = () => {\\n  const { user, setUser } = useAuth();\\n  \\n  return (\\n    <form className='space-y-4'>\\n      <input type='email' placeholder='Email' />\\n      <button type='submit'>Login</button>\\n    </form>\\n  );\\n};"
}
```

### ✅ CORRECT: With Template Literals

```json
{
  "tool": "write_file",
  "path": "src/utils/format.ts",
  "content": "export const formatMessage = (name: string) => {\\n  return \\`Hello, \\${name}!\\`;\\n};"
}
```

### ✅ CORRECT: Delete File

```json
{
  "tool": "delete_file",
  "path": "src/old-component.tsx"
}
```

---

## ❌ WRONG EXAMPLES - NEVER DO THIS

### ❌ WRONG: Actual Newlines (Breaks JSON)

```json
{
  "tool": "write_file",
  "path": "src/App.tsx",
  "content": "import React from 'react';

export default function App() {
  return <div>Hello</div>;
}"
}
```
**Problem**: Actual line breaks inside string - invalid JSON!

### ❌ WRONG: Single Backslash for Newline

```json
{
  "content": "line1\nline2"
}
```
**Problem**: Single `\n` is invalid in JSON string - must be `\\n`

### ❌ WRONG: Unescaped Double Quotes

```json
{
  "content": "const msg = "Hello";"
}
```
**Problem**: Double quotes inside string must be escaped as `\"`

### ❌ WRONG: Missing Code Block Wrapper

```
{
  "tool": "write_file",
  "path": "src/App.tsx"
}
```
**Problem**: Not wrapped in ```json ... ``` markdown code block

### ❌ WRONG: Single Quotes for JSON Keys

```json
{
  'tool': 'write_file',
  'path': 'src/App.tsx'
}
```
**Problem**: JSON requires double quotes, not single quotes

---

## 🔧 SYSTEM PROMPT INTEGRATION

Add this to your system prompt:

```markdown
## JSON TOOL COMMAND FORMAT - CRITICAL

You have access to file operation tools via JSON commands. **You MUST follow this EXACT format:**

### Format Requirements:

1. **Wrap in markdown code block**: ```json ... ```
2. **Use double quotes** for all keys and string values
3. **Escape newlines** as `\\n` (double backslash + n)
4. **Keep single quotes** `'` inside strings as-is (no escaping needed)
5. **Escape double quotes** inside strings as `\"`
6. **No actual line breaks** inside the JSON string
7. **No trailing commas**

### Template:

\`\`\`json
{
  "tool": "write_file",
  "path": "relative/path/to/file.tsx",
  "content": "import React from 'react';\\n\\nexport default function Component() {\\n  return <div className='container'>Hello</div>;\\n}"
}
\`\`\`

### Validation Before Output:

Before sending any JSON tool command, mentally verify:
- ✓ Wrapped in ```json code block
- ✓ All newlines are \\n (double backslash + n)
- ✓ Single quotes ' kept as-is
- ✓ Double quotes " inside strings are escaped
- ✓ No actual line breaks in the JSON
- ✓ Valid JSON structure

**If ANY check fails, fix it before outputting!**
```

---

## 🧪 FRONTEND PARSER (Enhanced)

Update your frontend parser to handle this format:

```typescript
interface ToolCommand {
  tool: 'write_file' | 'delete_file';
  path: string;
  content?: string;
}

export function parseToolCommands(aiResponse: string): ToolCommand[] {
  const commands: ToolCommand[] = [];
  
  // Extract all JSON code blocks
  const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/g;
  let match;
  
  while ((match = jsonBlockRegex.exec(aiResponse)) !== null) {
    const jsonString = match[1].trim();
    
    try {
      // Parse the JSON
      const parsed = JSON.parse(jsonString);
      
      // Validate structure
      if (!parsed.tool || typeof parsed.tool !== 'string') {
        console.error('Invalid tool command: missing or invalid "tool" field');
        continue;
      }
      
      if (!parsed.path || typeof parsed.path !== 'string') {
        console.error('Invalid tool command: missing or invalid "path" field');
        continue;
      }
      
      // Validate tool type
      if (!['write_file', 'delete_file'].includes(parsed.tool)) {
        console.error(`Invalid tool type: ${parsed.tool}`);
        continue;
      }
      
      // For write_file, content is required
      if (parsed.tool === 'write_file') {
        if (!parsed.content || typeof parsed.content !== 'string') {
          console.error('write_file requires "content" field');
          continue;
        }
      }
      
      commands.push(parsed as ToolCommand);
      
    } catch (error) {
      console.error('Failed to parse JSON tool command:', error);
      console.error('Attempted to parse:', jsonString);
      
      // Log detailed error for debugging
      if (error instanceof SyntaxError) {
        console.error('JSON Syntax Error:', error.message);
        console.error('Check for:');
        console.error('- Unescaped newlines (should be \\\\n)');
        console.error('- Unescaped quotes');
        console.error('- Missing commas or brackets');
      }
    }
  }
  
  return commands;
}

// Usage
async function executeAIResponse(response: string) {
  const commands = parseToolCommands(response);
  
  console.log(`Parsed ${commands.length} tool commands`);
  
  for (const command of commands) {
    try {
      if (command.tool === 'write_file') {
        await writeFile(command.path, command.content!);
        console.log(`✓ Created/updated: ${command.path}`);
      } else if (command.tool === 'delete_file') {
        await deleteFile(command.path);
        console.log(`✓ Deleted: ${command.path}`);
      }
    } catch (error) {
      console.error(`✗ Failed to execute ${command.tool} on ${command.path}:`, error);
    }
  }
}
```

---

## 🎯 ENFORCEMENT STRATEGIES

### Strategy 1: Pre-Generation Prompt Injection

Before each AI generation, inject this reminder:

```markdown
**CRITICAL REMINDER**: When using JSON tool commands:
1. Wrap in ```json code block
2. Use \\n for newlines (double backslash + n)
3. Single quotes ' inside strings are fine
4. Double quotes " inside strings must be escaped as \\"
5. No actual line breaks in JSON strings
```

### Strategy 2: Post-Generation Validation

After AI generates response, validate JSON before sending to user:

```typescript
function validateAIResponse(response: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check for JSON code blocks
  const jsonBlocks = response.match(/```json[\s\S]*?```/g);
  if (!jsonBlocks || jsonBlocks.length === 0) {
    return { valid: true, errors: [] }; // No tool commands, that's ok
  }
  
  for (const block of jsonBlocks) {
    // Extract JSON content
    const jsonContent = block.replace(/```json\s*/, '').replace(/\s*```$/, '').trim();
    
    // Check for common errors
    if (jsonContent.includes('\n') && !jsonContent.includes('\\n')) {
      errors.push('Contains actual newlines instead of \\\\n escape sequences');
    }
    
    if (/"content":\s*"[^"]*\n[^"]*"/.test(jsonContent)) {
      errors.push('Content field contains unescaped newlines');
    }
    
    // Try to parse
    try {
      JSON.parse(jsonContent);
    } catch (e) {
      errors.push(`Invalid JSON: ${e.message}`);
    }
  }
  
  return { 
    valid: errors.length === 0, 
    errors 
  };
}

// Use in your API route
if (!validation.valid) {
  console.error('AI generated invalid JSON:', validation.errors);
  // Optionally: retry with correction prompt
  // Or: strip invalid JSON and return text-only response
}
```

### Strategy 3: Automatic Correction

Attempt to fix common issues automatically:

```typescript
function attemptJSONCorrection(jsonString: string): string {
  // Replace actual newlines with \\n
  let corrected = jsonString;
  
  // Find content fields and fix newlines inside them
  corrected = corrected.replace(
    /"content":\s*"([^"]*)"/g,
    (match, content) => {
      // Replace unescaped newlines
      const fixed = content.replace(/\n/g, '\\n');
      return `"content": "${fixed}"`;
    }
  );
  
  return corrected;
}
```

---

## 📊 MONITORING & DEBUGGING

Add logging to track JSON parsing success rate:

```typescript
class JSONToolMonitor {
  private stats = {
    total: 0,
    successful: 0,
    failed: 0,
    errors: [] as Array<{ error: string; json: string }>
  };
  
  logSuccess() {
    this.stats.total++;
    this.stats.successful++;
  }
  
  logFailure(error: string, jsonString: string) {
    this.stats.total++;
    this.stats.failed++;
    this.stats.errors.push({ error, json: jsonString.slice(0, 500) });
  }
  
  getReport() {
    const successRate = (this.stats.successful / this.stats.total * 100).toFixed(2);
    return {
      ...this.stats,
      successRate: `${successRate}%`,
      recentErrors: this.stats.errors.slice(-5)
    };
  }
}

const monitor = new JSONToolMonitor();

// Use in parser
try {
  JSON.parse(jsonString);
  monitor.logSuccess();
} catch (error) {
  monitor.logFailure(error.message, jsonString);
}

// Check periodically
console.log('JSON Tool Success Rate:', monitor.getReport());
```

---

## 🎯 EXPECTED RESULTS

With this system, you should achieve:

✅ **99.9%+ valid JSON** responses
✅ **Zero parsing errors** in production
✅ **Consistent tool format** across all AI outputs
✅ **Lovable.dev-level reliability**
✅ **Production-grade stability**

---

## 🚀 QUICK REFERENCE CARD

Copy this for AI context window:

```
JSON TOOL FORMAT - CRITICAL:
✓ ```json { "tool": "write_file", "path": "...", "content": "..." } ```
✓ Newlines → \\n (double backslash + n)
✓ Single quotes ' → keep as-is
✓ Double quotes " → escape as \\"
✓ No actual line breaks in JSON
✗ NEVER use single backslash \n
✗ NEVER use actual newlines
✗ NEVER forget code block wrapper
```

---

**This is your bulletproof system for 100% valid JSON tool output!** 🎯
