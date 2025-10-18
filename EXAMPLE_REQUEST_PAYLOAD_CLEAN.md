# Example Request Payload - Clean Messages Architecture

## Full Example (What Actually Gets Sent to AI)

This shows the complete structure after our refactoring:

```json
{
  "model": "gpt-4",
  "messages": [
    {
      "role": "system",
      "content": "<role>\n# PIPILOT - Ultimate System Prompt\n\nYou are PIPILOT — the world's most advanced AI developer...\n\n## 🏗️ PROJECT CONTEXT\n\nProject: my-ecommerce-app\nFramework: Next.js 14\nFiles: 23 files\nStructure:\n- src/app/page.tsx (home page)\n- src/components/Header.tsx\n- src/lib/utils.ts\n...\n\n</role>"
    },
    {
      "role": "user",
      "content": "Create a navigation bar"
    },
    {
      "role": "assistant",
      "content": "Creating navigation bar\n\n```json\n{\"tool\":\"write_file\",\"path\":\"src/components/Navbar.tsx\",\"content\":\"...\"}\n```\n\n✅ Navigation bar created"
    },
    {
      "role": "user",
      "content": "Add a search feature to it"
    },
    {
      "role": "assistant",
      "content": "Adding search feature\n\n```json\n{\"tool\":\"edit_file\",\"path\":\"src/components/Navbar.tsx\",\"content\":\"...\"}\n```\n\n✅ Search feature added"
    },
    {
      "role": "user",
      "content": "Make it responsive on mobile"
    }
  ],
  "temperature": 0.3
}
```

---

## Truncated Example (Simplified for Readability)

This is what the messages array looks like in a more readable format:

```javascript
messages: [
  // ============================================
  // MESSAGE 0: System Prompt (AI's Instructions)
  // ============================================
  {
    role: "system",
    content: `
      <role>
      # PIPILOT - Ultimate System Prompt
      
      You are PIPILOT — the world's most advanced AI developer...
      
      ## JSON TOOL RULES
      - write_file, edit_file, delete_file
      - Must use proper JSON escaping
      - Content must be valid JSON
      
      ## 🏗️ PROJECT CONTEXT
      Project: my-ecommerce-app
      Framework: Next.js 14
      Files: 23 files
      Structure:
        - src/app/page.tsx (home page)
        - src/components/Header.tsx
        - src/lib/utils.ts
        - ... (truncated)
      
      </role>
    `
  },
  
  // ============================================
  // MESSAGE 1-4: Conversation History
  // ============================================
  {
    role: "user",
    content: "Create a navigation bar"
  },
  {
    role: "assistant",
    content: `Creating navigation bar

\`\`\`json
{"tool":"write_file","path":"src/components/Navbar.tsx","content":"..."}
\`\`\`

✅ Navigation bar created`
  },
  {
    role: "user",
    content: "Add a search feature to it"
  },
  {
    role: "assistant",
    content: `Adding search feature

\`\`\`json
{"tool":"edit_file","path":"src/components/Navbar.tsx","content":"..."}
\`\`\`

✅ Search feature added`
  },
  
  // ============================================
  // MESSAGE 5: Current User Request
  // ============================================
  {
    role: "user",
    content: "Make it responsive on mobile"  // ← CLEAN! No context mixed in
  }
]
```

---

## Key Points About The Clean Structure

### 1. **System Message (Position 0)**
- Contains the full PIPILOT prompt (~15-20k tokens)
- Includes project context (file structure, framework info)
- This is where all "system-level" information lives

### 2. **Conversation History (Positions 1-4)**
- Alternating user/assistant messages
- Shows what was discussed before
- Provides context for current request

### 3. **Current User Message (Position 5)**
- **CLEAN and direct** - no extra context added
- Just the user's actual request
- Project context is NOT duplicated here

---

## Comparison: Before vs After Refactoring

### ❌ BEFORE (Old Approach)
```javascript
messages: [
  {
    role: "user",
    content: "Create a navigation bar"
  },
  {
    role: "assistant",
    content: "Creating navigation bar..."
  },
  {
    role: "user",
    content: `Make it responsive on mobile

## Project Context

Project: my-ecommerce-app
Framework: Next.js 14
Files: 23 files
Structure:
  - src/app/page.tsx
  - src/components/Header.tsx
  ...

---

Please respond to the user's request above...`  // ← MESSY! Context duplicated
  }
]
```

**Problems:**
- Project context duplicated in EVERY user message
- Token waste (context repeated 5+ times per conversation)
- Hard to parse what's user input vs system context
- Difficult to manage token budgets

### ✅ AFTER (Clean Approach)
```javascript
messages: [
  {
    role: "system",
    content: "PIPILOT prompt + project context (ONCE)"  // ← Context here ONCE
  },
  {
    role: "user",
    content: "Create a navigation bar"
  },
  {
    role: "assistant",
    content: "Creating navigation bar..."
  },
  {
    role: "user",
    content: "Make it responsive on mobile"  // ← CLEAN! Just the request
  }
]
```

**Benefits:**
- Project context appears ONCE (in system message)
- Clean user messages (easier to read and debug)
- Better token efficiency (~5-10k tokens saved per request)
- Follows AI SDK best practices
- Easier to implement sliding windows for long conversations

---

## Token Count Breakdown

### Old Approach (Per Request)
```
System prompt (merged in user msg):  0 tokens
User messages with context:         ~15k tokens × N messages
Conversation history:               ~5k tokens
Current user + context:             ~15k tokens
----------------------------------------
TOTAL:                              ~35k+ tokens (grows with history)
```

### New Approach (Per Request)
```
System prompt with context:         ~15k tokens (ONCE)
Conversation history:               ~5k tokens
Current user message (clean):       ~50-200 tokens
----------------------------------------
TOTAL:                              ~20k tokens (stable)
```

**Savings: ~15k tokens per request** (40%+ reduction!)

---

## With Smart Context Added

When smart context is enabled (file content injection), the structure becomes:

```javascript
messages: [
  {
    role: "system",
    content: `## Smart Context - Relevant Project Files
    
    ### src/components/Navbar.tsx
    \`\`\`
    // Current navbar code here...
    \`\`\`
    
    Use this context to provide accurate responses.`
  },
  {
    role: "system",
    content: "PIPILOT prompt + project context"
  },
  ...conversationHistory,
  {
    role: "user",
    content: "Make it responsive on mobile"
  }
]
```

**Note:** Smart context is prepended as a separate system message, keeping everything modular and clean.

---

## Real-World Example with Actual Content

### Scenario: User building an e-commerce app

```javascript
{
  "messages": [
    // System message with FULL context
    {
      "role": "system",
      "content": "<role>\n# PIPILOT\n\nYou are PIPILOT...\n\n## 🏗️ PROJECT CONTEXT\n\nProject: shopify-clone\nFramework: Next.js 14\nDependencies: shadcn/ui, Tailwind, Supabase\nFiles:\n- src/app/page.tsx\n- src/app/products/page.tsx\n- src/components/ProductCard.tsx\n- src/lib/supabase.ts\n- ... (20 more files)\n\n</role>"
    },
    
    // Conversation history
    {
      "role": "user",
      "content": "Create a product card component"
    },
    {
      "role": "assistant",
      "content": "Creating product card component\n\n```json\n{\"tool\":\"write_file\",\"path\":\"src/components/ProductCard.tsx\",\"content\":\"import React from 'react'\\nimport { Card } from '@/components/ui/card'\\n\\ninterface ProductCardProps {\\n  name: string\\n  price: number\\n  image: string\\n}\\n\\nexport const ProductCard = ({ name, price, image }: ProductCardProps) => {\\n  return (\\n    <Card className=\\\"p-4\\\">\\n      <img src={image} alt={name} className=\\\"w-full h-48 object-cover\\\" />\\n      <h3 className=\\\"mt-2 font-bold\\\">{name}</h3>\\n      <p className=\\\"text-gray-600\\\">${price}</p>\\n    </Card>\\n  )\\n}\"}\n```\n\n✅ Product card component created"
    },
    {
      "role": "user",
      "content": "Add hover effects to it"
    },
    {
      "role": "assistant",
      "content": "Adding hover effects\n\n```json\n{\"tool\":\"edit_file\",\"path\":\"src/components/ProductCard.tsx\",\"searchReplace\":{\"search\":\"<Card className=\\\"p-4\\\">\",\"replace\":\"<Card className=\\\"p-4 hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer\\\">\"}}\n```\n\n✅ Hover effects added"
    },
    
    // Current request (CLEAN!)
    {
      "role": "user",
      "content": "Make it show a badge when product is on sale"
    }
  ],
  "temperature": 0.3,
  "model": "gpt-4"
}
```

---

## Summary

The clean messages architecture provides:

1. ✅ **Single system prompt** with all context (once)
2. ✅ **Clean conversation history** (no duplicated context)
3. ✅ **Pure user messages** (just the actual request)
4. ✅ **40%+ token savings** per request
5. ✅ **Better maintainability** and debugging
6. ✅ **Follows AI SDK best practices**

This structure is **scalable**, **efficient**, and **professional**. 🚀
