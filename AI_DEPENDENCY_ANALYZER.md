# AI Dependency Analyzer Tool

## 🎯 **Purpose**
Automatically validate that all imports in newly created or modified files have corresponding dependencies in `package.json`, preventing runtime errors from missing packages.

## ✅ **Implementation Complete**

### **Tool: `analyze_dependencies`**
```typescript
tools.analyze_dependencies = tool({
  description: 'Analyze file imports and validate against package.json to prevent missing dependency errors',
  inputSchema: z.object({
    filePath: z.string().describe('Path of the file to analyze'),
    fileContent: z.string().describe('Content of the file to analyze'),
    autoFix: z.boolean().optional().describe('Automatically suggest package.json updates (default: true)')
  }),
  // ... implementation
})
```

## 🔍 **How It Works**

### **1. Import Detection**
The AI analyzes file content to find all import statements:
```typescript
// Detects all these import patterns:
import React from 'react'
import { useState } from 'react'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import './styles.css'
```

### **2. Package.json Validation**
Checks if imported packages exist in dependencies:
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0"
  }
}
```

### **3. Missing Dependency Detection**
Identifies packages that are imported but not in package.json:
```typescript
// Example result:
{
  "imports": [
    {"package": "react", "statement": "import React from 'react'", "exists": true},
    {"package": "axios", "statement": "import axios from 'axios'", "exists": false}
  ],
  "missingDeps": [
    {"package": "axios", "suggested": "npm install axios"}
  ],
  "valid": false,
  "summary": "Found 1 missing dependency: axios"
}
```

### **4. Auto-Fix Suggestions**
Provides specific npm install commands for missing dependencies.

## 🚀 **Integration with File Operations**

### **Automatic Validation Workflow:**
```
User: "Create a component that uses axios"
AI Workflow:
1. write_file → Creates component with axios import
2. analyze_dependencies → Detects axios is missing from package.json
3. AI Response: "⚠️ Missing dependency detected: axios. Run: npm install axios"
```

### **System Instructions Added:**
```
✅ **MANDATORY APPROACH:**
- ALWAYS use analyze_dependencies AFTER creating or modifying files with imports to validate dependencies
```

## 📋 **Tool Response Format**

```json
{
  "success": true,
  "message": "Dependency analysis completed for src/components/ProductCard.tsx",
  "analysis": {
    "filePath": "src/components/ProductCard.tsx",
    "imports": [
      {"package": "react", "statement": "import React from 'react'", "exists": true},
      {"package": "axios", "statement": "import axios from 'axios'", "exists": false}
    ],
    "missingDependencies": [
      {"package": "axios", "suggested": "npm install axios"}
    ],
    "isValid": false,
    "summary": "Found 1 missing dependency",
    "suggestions": ["npm install axios"]
  }
}
```

## 🎯 **Benefits**

### **1. Prevents Runtime Errors**
- Catches missing dependencies before they cause crashes
- Validates all import statements automatically
- Works with any JavaScript/TypeScript file

### **2. Developer Experience**
- Clear error messages with exact missing packages
- Specific npm install commands provided
- Automatic validation after file operations

### **3. Project Integrity**
- Ensures package.json stays in sync with code
- Prevents deployment issues from missing deps
- Maintains clean dependency management

### **4. AI Intelligence**
- Uses Mistral Pixtral for accurate import parsing
- Handles complex import patterns and aliases
- Provides contextual suggestions

## 🔧 **Usage Examples**

### **Manual Usage:**
```
AI: analyze_dependencies({
  filePath: "src/components/Chart.tsx",
  fileContent: "import { LineChart } from 'recharts'...",
  autoFix: true
})
```

### **Automatic Usage:**
The AI will automatically call this tool after:
- Creating new files with imports
- Modifying files that add new imports
- Any file operation that introduces external dependencies

## 🚨 **Error Prevention**

### **Common Issues Caught:**
- Missing React packages (`react`, `react-dom`)
- Missing UI libraries (`@mui/material`, `antd`)
- Missing utilities (`lodash`, `moment`, `axios`)
- Missing dev dependencies (`@types/*`)
- Missing build tools or plugins

### **Example Warnings:**
```
⚠️ Missing dependency detected in src/components/Chart.tsx:
- Package: recharts
- Import: import { LineChart } from 'recharts'
- Fix: npm install recharts

⚠️ Missing dev dependency:
- Package: @types/lodash  
- Fix: npm install -D @types/lodash
```

## 🎯 **Result**

Every file created or modified by the AI will now be automatically validated for dependency completeness, ensuring:

- ✅ **No runtime import errors**
- ✅ **Clean package.json management** 
- ✅ **Proactive dependency detection**
- ✅ **Clear fix instructions**
- ✅ **Seamless development workflow**

The AI will now catch dependency issues immediately and provide exact commands to fix them! 🚀
