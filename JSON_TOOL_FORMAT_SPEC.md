# 📐 JSON Tool Block Format Specification

## 🎯 Official Format Reference for AI Models

This document shows the **exact format** that the AI should use for JSON tool commands, what the validator checks, and what the frontend parser expects.

---

## 📋 Format Requirements

### **Universal Rules (All Tools)**

1. **Must be wrapped in JSON code block:**
   ```
   ```json
   {
     ...
   }
   ```
   ```

2. **Must contain these fields:**
   - `"tool"`: String with tool type
   - `"path"`: String with file path

3. **JSON Syntax Rules:**
   - Use double quotes for strings (not single quotes)
   - Escape special characters: `\n`, `\t`, `\"`, `\\`
   - No trailing commas
   - Valid JSON syntax

---

## 🔧 Tool-Specific Formats

### **1. write_file - Create or Overwrite File**

**Purpose:** Create a new file or completely replace existing file content

**Required Fields:**
- ✅ `tool`: Must be `"write_file"`
- ✅ `path`: File path (string)
- ✅ `content`: File content (string, can be empty `""`)

**Format:**
```json
{
  "tool": "write_file",
  "path": "src/components/Button.tsx",
  "content": "import React from 'react'\n\nexport const Button = () => {\n  return <button>Click me</button>\n}"
}
```

**Examples:**

**Empty File:**
```json
{
  "tool": "write_file",
  "path": ".gitkeep",
  "content": ""
}
```

**Multi-line Content:**
```json
{
  "tool": "write_file",
  "path": "README.md",
  "content": "# My Project\n\nDescription here.\n\n## Features\n- Feature 1\n- Feature 2"
}
```

**Content with Special Characters:**
```json
{
  "tool": "write_file",
  "path": "config.json",
  "content": "{\n  \"name\": \"app\",\n  \"version\": \"1.0.0\"\n}"
}
```

---

### **2. delete_file - Remove File**

**Purpose:** Delete a file from the project

**Required Fields:**
- ✅ `tool`: Must be `"delete_file"`
- ✅ `path`: File path (string)

**Format:**
```json
{
  "tool": "delete_file",
  "path": "src/components/OldComponent.tsx"
}
```

**Examples:**

**Delete Component:**
```json
{
  "tool": "delete_file",
  "path": "src/components/Deprecated.tsx"
}
```

**Delete Config File:**
```json
{
  "tool": "delete_file",
  "path": ".eslintrc.old.js"
}
```

**Note:** Only requires `tool` and `path`. No additional fields needed.

---

### **3. edit_file - Modify Existing File**

**Purpose:** Replace specific content in an existing file

**Required Fields:**
- ✅ `tool`: Must be `"edit_file"`
- ✅ `path`: File path (string)
- ✅ `search_replace`: Object with:
  - `old_string`: Exact text to find (string)
  - `new_string`: Replacement text (string)

**Format:**
```json
{
  "tool": "edit_file",
  "path": "src/App.tsx",
  "search_replace": {
    "old_string": "const title = 'Hello'",
    "new_string": "const title = 'Hello World'"
  }
}
```

**Examples:**

**Simple Text Replace:**
```json
{
  "tool": "edit_file",
  "path": "src/config.ts",
  "search_replace": {
    "old_string": "const API_URL = 'http://localhost:3000'",
    "new_string": "const API_URL = 'https://api.production.com'"
  }
}
```

**Multi-line Replace:**
```json
{
  "tool": "edit_file",
  "path": "src/components/Header.tsx",
  "search_replace": {
    "old_string": "export const Header = () => {\n  return <header>Old Header</header>\n}",
    "new_string": "export const Header = () => {\n  return (\n    <header className=\"modern-header\">\n      <h1>New Header</h1>\n    </header>\n  )\n}"
  }
}
```

**Add Import:**
```json
{
  "tool": "edit_file",
  "path": "src/App.tsx",
  "search_replace": {
    "old_string": "import React from 'react'",
    "new_string": "import React from 'react'\nimport { useState } from 'react'"
  }
}
```

---

## ❌ Common Mistakes to Avoid

### **Mistake 1: Wrong Tool Name**
```json
// ❌ WRONG - "create_file" is not a valid tool
{
  "tool": "create_file",
  "path": "test.txt",
  "content": "hello"
}

// ✅ CORRECT - Use "write_file"
{
  "tool": "write_file",
  "path": "test.txt",
  "content": "hello"
}
```

---

### **Mistake 2: Missing Required Field**
```json
// ❌ WRONG - Missing "content" for write_file
{
  "tool": "write_file",
  "path": "test.txt"
}

// ✅ CORRECT - Include content (can be empty string)
{
  "tool": "write_file",
  "path": "test.txt",
  "content": ""
}
```

---

### **Mistake 3: Wrong Field Names for edit_file**
```json
// ❌ WRONG - Using "old" and "new" instead of "search_replace"
{
  "tool": "edit_file",
  "path": "App.tsx",
  "old": "hello",
  "new": "world"
}

// ✅ CORRECT - Use "search_replace" object
{
  "tool": "edit_file",
  "path": "App.tsx",
  "search_replace": {
    "old_string": "hello",
    "new_string": "world"
  }
}
```

---

### **Mistake 4: Unescaped Newlines**
```json
// ❌ WRONG - Raw newlines in JSON string
{
  "tool": "write_file",
  "path": "test.txt",
  "content": "Line 1
Line 2"
}

// ✅ CORRECT - Use \n escape sequence
{
  "tool": "write_file",
  "path": "test.txt",
  "content": "Line 1\nLine 2"
}
```

---

### **Mistake 5: Unescaped Quotes**
```json
// ❌ WRONG - Unescaped quotes break JSON
{
  "tool": "write_file",
  "path": "test.txt",
  "content": "He said "hello""
}

// ✅ CORRECT - Escape quotes with backslash
{
  "tool": "write_file",
  "path": "test.txt",
  "content": "He said \"hello\""
}
```

---

### **Mistake 6: Single Quotes**
```json
// ❌ WRONG - Single quotes are not valid JSON
{
  'tool': 'write_file',
  'path': 'test.txt',
  'content': 'hello'
}

// ✅ CORRECT - Use double quotes
{
  "tool": "write_file",
  "path": "test.txt",
  "content": "hello"
}
```

---

### **Mistake 7: Trailing Commas**
```json
// ❌ WRONG - Trailing comma after last property
{
  "tool": "write_file",
  "path": "test.txt",
  "content": "hello",
}

// ✅ CORRECT - No trailing comma
{
  "tool": "write_file",
  "path": "test.txt",
  "content": "hello"
}
```

---

## 🔍 Validation Rules Reference

### **Level 1: Structure Validation**
```javascript
// Checks performed:
1. Must have ```json code block wrapper
2. JSON must be parseable (valid syntax)
3. No syntax errors (trailing commas, unescaped chars, etc.)
```

### **Level 2: Required Fields**
```javascript
// All tools must have:
✓ "tool" field exists and is a string
✓ "tool" is one of: "write_file", "delete_file", "edit_file"
✓ "path" field exists and is a non-empty string
```

### **Level 3: Tool-Specific Validation**
```javascript
// write_file:
✓ "content" field exists (can be empty string)
✓ "content" is a string type

// delete_file:
✓ Only needs "tool" and "path"
✓ Additional fields are ignored

// edit_file:
✓ "search_replace" object exists
✓ "search_replace.old_string" exists and is string
✓ "search_replace.new_string" exists and is string
```

---

## 🎨 Visual Format Guide

### **write_file Structure:**
```
┌─────────────────────────────────────┐
│ ```json                             │
│ {                                   │
│   "tool": "write_file",    ← Required, must be this exact string
│   "path": "file/path.ext", ← Required, file location
│   "content": "..."         ← Required, file contents (can be "")
│ }                                   │
│ ```                                 │
└─────────────────────────────────────┘
```

### **delete_file Structure:**
```
┌─────────────────────────────────────┐
│ ```json                             │
│ {                                   │
│   "tool": "delete_file",   ← Required, must be this exact string
│   "path": "file/path.ext"  ← Required, file to delete
│ }                                   │
│ ```                                 │
└─────────────────────────────────────┘
```

### **edit_file Structure:**
```
┌─────────────────────────────────────┐
│ ```json                             │
│ {                                   │
│   "tool": "edit_file",     ← Required, must be this exact string
│   "path": "file/path.ext", ← Required, file to edit
│   "search_replace": {      ← Required, search/replace object
│     "old_string": "...",   ← Required, text to find
│     "new_string": "..."    ← Required, replacement text
│   }                                 │
│ }                                   │
│ ```                                 │
└─────────────────────────────────────┘
```

---

## 📊 Field Type Reference

| Field | Type | Required For | Can Be Empty | Notes |
|-------|------|--------------|--------------|-------|
| `tool` | `string` | All | No | Must be: write_file, delete_file, or edit_file |
| `path` | `string` | All | No | Valid file path with extension |
| `content` | `string` | write_file | Yes | File content, use `\n` for newlines |
| `search_replace` | `object` | edit_file | No | Contains old_string and new_string |
| `search_replace.old_string` | `string` | edit_file | No | Exact text to find |
| `search_replace.new_string` | `string` | edit_file | Yes | Replacement text |

---

## 🧪 Test Your Format

### **Quick Validation Checklist:**

Before generating a JSON tool block, verify:

- [ ] Wrapped in ` ```json ... ``` ` code block
- [ ] Uses double quotes (not single quotes)
- [ ] Has `"tool"` field with valid tool type
- [ ] Has `"path"` field with file path
- [ ] For write_file: Has `"content"` field
- [ ] For edit_file: Has `"search_replace"` object with `old_string` and `new_string`
- [ ] All newlines escaped as `\n`
- [ ] All quotes escaped as `\"`
- [ ] All backslashes escaped as `\\`
- [ ] No trailing commas
- [ ] Valid JSON syntax

---

## 🎯 What Parser Expects (Technical)

The frontend `JsonToolParser` expects this structure:

```typescript
// After parsing, creates:
interface JsonToolCall {
  id: string                    // Auto-generated
  tool: 'write_file' | 'delete_file' | 'edit_file'
  path: string
  content?: string              // For write_file
  search_replace?: {            // For edit_file
    old_string: string
    new_string: string
  }
  args: Record<string, any>     // All fields as key-value pairs
  status: 'detected' | 'processing' | 'executing' | 'completed' | 'failed'
  startTime: number
  endTime?: number
}
```

**Parser Methods:**
- `parseJsonTools(content: string)` - Extracts all JSON tool blocks
- `findJsonToolBlocks(content: string)` - Finds blocks in markdown
- `hasJsonTools(content: string)` - Checks if content has tools

**Supported Tool Names:**
```typescript
[
  'write_file',
  'edit_file', 
  'delete_file',
  'read_file',
  'list_files',
  'create_directory',
  'pilotwrite',
  'pilotedit',
  'pilotdelete'
]
```

---

## 🚀 Best Practices

### **1. Always Use Exact Tool Names**
```json
// ✅ Correct
"tool": "write_file"

// ❌ Wrong
"tool": "writeFile"
"tool": "write-file"
"tool": "create_file"
```

### **2. Escape Special Characters**
```json
// ✅ Correct
"content": "Line 1\nLine 2\n\tIndented"

// ❌ Wrong (will break JSON)
"content": "Line 1
Line 2
	Indented"
```

### **3. Use Empty String for Empty Files**
```json
// ✅ Correct
{
  "tool": "write_file",
  "path": ".gitkeep",
  "content": ""
}

// ❌ Wrong (missing content)
{
  "tool": "write_file",
  "path": ".gitkeep"
}
```

### **4. Be Specific with Paths**
```json
// ✅ Correct - Clear path with extension
"path": "src/components/Button.tsx"

// ⚠️ Less ideal - Ambiguous
"path": "Button"
"path": "components/Button"
```

---

## 📚 Summary

**The golden rules for JSON tool blocks:**

1. ✅ Use ```json code block wrapper
2. ✅ Valid tool types: write_file, delete_file, edit_file
3. ✅ Always include required fields
4. ✅ Escape special characters properly
5. ✅ Use double quotes, not single quotes
6. ✅ No trailing commas
7. ✅ Valid JSON syntax

**If you follow these rules, your JSON tool blocks will:**
- ✅ Pass validation on first try
- ✅ Execute correctly in the UI
- ✅ Provide great user experience
- ✅ Never need auto-correction

---

## 🔗 Related Documentation

- **Validation System**: `JSON_TOOL_VALIDATION_SYSTEM.md`
- **Visual Guide**: `JSON_VALIDATION_VISUAL_GUIDE.md`
- **Parser Code**: `components/workspace/json-tool-parser.ts`
- **Backend Validation**: `app/api/chat/route.ts` (lines 6164-6313)
