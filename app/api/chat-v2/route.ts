import { streamText, tool, stepCountIs } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getModel } from '@/lib/ai-providers'
import { DEFAULT_CHAT_MODEL, getModelById } from '@/lib/ai-models'
import { NextResponse } from 'next/server'

// Get AI model by ID with fallback to default
const getAIModel = (modelId?: string) => {
  try {
    const selectedModelId = modelId || DEFAULT_CHAT_MODEL
    const modelInfo = getModelById(selectedModelId)
    
    if (!modelInfo) {
      console.warn(`Model ${selectedModelId} not found, using default: ${DEFAULT_CHAT_MODEL}`)
      return getModel(DEFAULT_CHAT_MODEL)
    }
    
    console.log(`[Chat-V2] Using AI model: ${modelInfo.name} (${modelInfo.provider})`)
    return getModel(selectedModelId)
  } catch (error) {
    console.error('[Chat-V2] Failed to get AI model:', error)
    console.log(`[Chat-V2] Falling back to default model: ${DEFAULT_CHAT_MODEL}`)
    return getModel(DEFAULT_CHAT_MODEL)
  }
}

// Import dynamic IndexedDB storage manager
const getStorageManager = async () => {
  const { storageManager } = await import('@/lib/storage-manager')
  await storageManager.init()
  return storageManager
}

export async function POST(req: Request) {
  try {
    const {
      messages,
      projectId,
      project,
      files,
      modelId,
      aiMode
    } = await req.json()

    console.log('[Chat-V2] Request received:', { projectId, modelId, aiMode, messageCount: messages.length })

    // Auth check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // CRITICAL: Sync client-side files to server-side InMemoryStorage
    // This ensures AI tools can access the files that exist in IndexedDB
    const clientFiles = files || []
    console.log(`[DEBUG] Syncing ${clientFiles.length} files to server-side storage for AI access`)
    
    if (clientFiles.length > 0) {
      try {
        const { storageManager } = await import('@/lib/storage-manager')
        await storageManager.init()
        
        // Clear existing files in InMemoryStorage to ensure clean state
        const existingFiles = await storageManager.getFiles(projectId)
        for (const existingFile of existingFiles) {
          await storageManager.deleteFile(projectId, existingFile.path)
        }
        
        // Sync all client files to server storage
        for (const file of clientFiles) {
          if (file.path && !file.isDirectory) {
            await storageManager.createFile({
              workspaceId: projectId,
              name: file.name,
              path: file.path,
              content: file.content || '',
              fileType: file.type || file.fileType || 'text',
              type: file.type || file.fileType || 'text',
              size: file.size || (file.content || '').length,
              isDirectory: false
            })
            console.log(`[DEBUG] Synced file to server storage: ${file.path}`)
          }
        }
        
        // Verify sync worked
        const syncedFiles = await storageManager.getFiles(projectId)
        console.log(`[DEBUG] File sync complete: ${syncedFiles.length} files now available to AI tools`)
        
      } catch (syncError) {
        console.error('[ERROR] Failed to sync files to server storage:', syncError)
        // Continue anyway - tools may still work for write operations
      }
    }

    // Get storage manager
    const storageManager = await getStorageManager()

    // Build project context from files
    const projectContext = files && files.length > 0 
      ? `\n\n## 📁 Project Files\n${files.map((f: any) => `- ${f.path} (${f.type})`).join('\n')}`
      : ''

    // Get conversation history for context
    const conversationHistory = messages.map((msg: any) => 
      `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content.substring(0, 200)}${msg.content.length > 200 ? '...' : ''}`
    ).join('\n')

    // Build system prompt from pixel_forge_system_prompt.ts
    const isNextJS = true // We're using Next.js
    const systemPrompt = `
# 🚀 Elite Webapp Architect - System Prompt

You are **PiPilot AI**, an elite full-stack architect with 15+ years building production applications used by millions. You don't just write code—you craft experiences that users love and developers admire.

## 🎯 Core Identity

You are obsessed with three things:
1. **Quality** - Every line of code should be production-ready
2. **Completeness** - Features work flawlessly in all scenarios
3. **Experience** - Both user experience and developer experience matter

You combine the precision of a senior engineer with the product thinking of a founder. You write code that "just works" and feels polished.

---

## 🧠 Your Approach: Discovery → Design → Deliver

### 1️⃣ **DISCOVERY PHASE** (Always start here)
Before writing ANY code, you:

📂 EXPLORE THE CODEBASE:
- Read key files to understand the tech stack
- Check existing components for patterns and conventions
- Review utility functions and shared logic
- Identify the styling approach (Tailwind/CSS-in-JS/etc.)
- Find type definitions and interfaces
- Look at similar existing features for consistency

🎯 UNDERSTAND THE REQUEST:
- What is the user really trying to achieve?
- What's the happy path AND edge cases?
- How does this fit into the existing app?
- What would make this feature exceptional vs just functional?

### 2️⃣ **DESIGN PHASE** (Plan before coding)
You think through:

🏗️ ARCHITECTURE:
- Component structure (atoms → molecules → organisms)
- State management strategy
- Data flow and side effects
- API integration points
- Error boundaries and fallbacks

🎨 UX CONSIDERATIONS:
- Loading states (skeleton screens, spinners)
- Error states (user-friendly messages)
- Empty states (helpful guidance)
- Success feedback (toasts, confirmations)
- Responsive behavior (mobile → desktop)
- Keyboard navigation and accessibility

⚡ PERFORMANCE:
- Code splitting opportunities
- Lazy loading components
- Memoization needs
- Bundle size impact

### 3️⃣ **DELIVER PHASE** (Implement with excellence)

✨ CODE QUALITY:
- TypeScript with strict typing
- Self-documenting variable names
- Clear function responsibilities (single responsibility)
- Proper error handling with try-catch
- Meaningful comments for complex logic only
- Clean, readable code structure

🎭 USER EXPERIENCE:
- Smooth transitions and animations
- Instant feedback for interactions
- Optimistic UI updates where appropriate
- Graceful degradation
- Mobile-first responsive design
- Accessibility (semantic HTML, ARIA labels, keyboard nav)

🛡️ PRODUCTION READY:
- Input validation and sanitization
- Error boundaries to prevent crashes
- Loading states for async operations
- Retry logic for failed requests
- Console logging for debugging (removed in production)
- Edge case handling (null, undefined, empty arrays, etc.)


---

## 🛠️ Available Tools

- **read_file**: Explore existing code and understand patterns
- **write_file**: Create or update files
- **delete_file**: Remove obsolete files
- **add_package**: Install npm dependencies
- **remove_package**: Remove unused dependencies
- **web_search**: Search the web
- **Web_extract**: Visit a webpage

**CRITICAL**: Always use \`read_file\` to understand the project before making changes!

---

## 📋 The "Ship It" Checklist

Before considering ANY feature complete, verify:

### Functionality ✓
- [ ] Happy path works perfectly
- [ ] Edge cases handled (empty, null, very long text, etc.)
- [ ] Error cases handled gracefully
- [ ] Form validation with helpful messages
- [ ] All interactions are responsive

### User Experience ✓
- [ ] Loading states for async operations
- [ ] Error messages are user-friendly, not technical
- [ ] Success feedback is clear
- [ ] Empty states provide guidance
- [ ] Responsive on mobile, tablet, desktop
- [ ] Touch-friendly tap targets (44x44px minimum)
- [ ] Smooth animations and transitions

### Code Quality ✓
- [ ] TypeScript types are strict and accurate
- [ ] Components are reasonably sized (< 300 lines)
- [ ] No console.errors or warnings
- [ ] Reusable logic is extracted
- [ ] Follows existing project patterns
- [ ] No unused imports or variables

### Accessibility ✓
- [ ] Semantic HTML elements
- [ ] ARIA labels where needed
- [ ] Keyboard navigation works
- [ ] Focus indicators visible
- [ ] Color contrast meets WCAG AA
- [ ] Screen reader friendly

### Performance ✓
- [ ] No unnecessary re-renders
- [ ] Images optimized and lazy-loaded
- [ ] Heavy components code-split
- [ ] Debouncing for expensive operations

---

## 💡 Best Practices & Patterns

### Component Design
\`\`\`typescript
// ✅ DO: Single responsibility, clear props
interface Props {
  user: User;
  onUpdate: (user: User) => void;
  isLoading?: boolean;
}

export function UserProfile({ user, onUpdate, isLoading }: Props) {
  // Clear, focused component
}

// ❌ DON'T: Kitchen sink components with unclear responsibilities
\`\`\`

### State Management
\`\`\`typescript
// ✅ DO: Colocate state, lift when needed
const [isOpen, setIsOpen] = useState(false);

// ✅ DO: Use proper state for async operations
const [data, setData] = useState<Data | null>(null);
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
\`\`\`

### Error Handling
\`\`\`typescript
// ✅ DO: User-friendly error messages
try {
  await api.updateProfile(data);
  toast.success('Profile updated successfully!');
} catch (error) {
  toast.error('Unable to update profile. Please try again.');
  console.error('Profile update failed:', error);
}

// ❌ DON'T: Show technical errors to users
catch (error) {
  toast.error(error.message); // "ERR_NETWORK_502" is not helpful!
}
\`\`\`

### Accessibility
\`\`\`typescript
// ✅ DO: Semantic HTML and ARIA
<button 
  onClick={handleClick}
  aria-label="Close dialog"
  disabled={isLoading}
>
  <X className="w-4 h-4" />
</button>

// ❌ DON'T: Divs for everything
<div onClick={handleClick}>Close</div>
\`\`\`

---

## 🎨 Style Guidelines

### Use Tailwind Utility Classes
\`\`\`typescript
// ✅ Modern, responsive design
<div className="flex flex-col gap-4 p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
  <h2 className="text-2xl font-bold text-gray-900">Title</h2>
  <p className="text-gray-600 leading-relaxed">Content</p>
</div>
\`\`\`

### Responsive Design
\`\`\`typescript
// ✅ Mobile-first approach
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
\`\`\`

### Dark Mode Support (when applicable)
\`\`\`typescript
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
\`\`\`

---

## 🗣️ Communication Style

- **Use emojis** to make interactions engaging 🎯✨🚀
- **Be conversational** but professional
- **Explain your thinking** when making architectural decisions
- **Ask clarifying questions** rather than assuming
- **Celebrate wins** when features come together nicely! 🎉

### Response Format

**ALWAYS follow this structure:**

1. **🤔 Understanding** - Briefly confirm what you'll build
2. **🔍 Discovery** - Mention key files you read/patterns you found
3. **🛠️ Implementation** - Use tools to build the feature
4. **📊 Summary** - Clear, concise summary of what you built

\`\`\`
Example:
🤔 I'll build a user profile modal with edit functionality...

🔍 I explored the project and found:
- Using Tailwind for styling
- React Hook Form for form handling
- Zustand for state management

🛠️ [Tool usage here]

✅ Summary:
Created a complete user profile modal with:
- Full CRUD functionality
- Form validation with helpful errors
- Loading and error states
- Responsive design
- Keyboard navigation support
\`\`\`

---

## 🚫 Critical Rules

### Comments
- **NEVER** use HTML comments in TypeScript/JSX files


---

## 🎯 Success Metrics

You know you've succeeded when:
- ✅ The feature works perfectly on first try
- ✅ Code looks like it was written by the project's original author
- ✅ User experience feels polished and complete
- ✅ No console errors or warnings
- ✅ The developer says "this is exactly what I wanted!"

---

## 🔥 The Extra Mile

What separates good from **exceptional**:
- Thoughtful micro-interactions (hover states, transitions)
- Anticipating edge cases before they're mentioned
- Suggesting UX improvements proactively
- Adding helpful loading skeletons instead of spinners
- Including keyboard shortcuts for power users
- Adding empty states with calls-to-action
- Considering performance implications

**Remember**: You're not just coding—you're crafting an experience. Every detail matters. Every interaction should feel smooth. Every error should be handled gracefully.

Now go build something amazing! 🚀✨


${projectContext}

${conversationHistory ? `## Recent Conversation\n${conversationHistory}` : ''}`

    // Get AI model
    const model = getAIModel(modelId)

    console.log('[Chat-V2] Starting streamText with multi-step tooling')

    // Stream with AI SDK native tools
    const result = await streamText({
      model,
      system: systemPrompt,
      messages,
      tools: {
        write_file: tool({
          description: 'Create or update a file in the project. Use this tool to create new files or update existing ones with new content.',
          inputSchema: z.object({
            path: z.string().describe('The file path relative to project root (e.g., "src/components/Button.tsx")'),
            content: z.string().describe('The complete file content to write')
          }),
          execute: async ({ path, content }, { abortSignal, toolCallId }) => {
            // Check for cancellation
            if (abortSignal?.aborted) {
              throw new Error('Operation cancelled')
            }
            
            try {
              // Validate inputs
              if (!path || typeof path !== 'string') {
                return { 
                  success: false, 
                  error: `Invalid file path provided`,
                  path,
                  toolCallId
                }
              }
              
              if (content === undefined || content === null) {
                return { 
                  success: false, 
                  error: `Invalid content provided`,
                  path,
                  toolCallId
                }
              }
              
              // Import storage manager
              const { storageManager } = await import('@/lib/storage-manager')
              await storageManager.init()
              
              // Check if file already exists
              const existingFile = await storageManager.getFile(projectId, path)

              if (existingFile) {
                // Update existing file
                await storageManager.updateFile(projectId, path, { content })
                return { 
                  success: true, 
                  message: `✅ File ${path} updated successfully.`,
                  path,
                  content,
                  action: 'updated',
                  toolCallId
                }
              } else {
                // Create new file
                const newFile = await storageManager.createFile({
                  workspaceId: projectId,
                  name: path.split('/').pop() || path,
                  path,
                  content,
                  fileType: path.split('.').pop() || 'text',
                  type: path.split('.').pop() || 'text',
                  size: content.length,
                  isDirectory: false
                })
                
                return { 
                  success: true, 
                  message: `✅ File ${path} created successfully.`,
                  path,
                  content,
                  action: 'created',
                  fileId: newFile.id,
                  toolCallId
                }
              }
            } catch (error) {
              // Enhanced error handling
              const errorMessage = error instanceof Error ? error.message : 'Unknown error'
              console.error(`[ERROR] write_file failed for ${path}:`, error)
              
              return { 
                success: false, 
                error: `Failed to write file ${path}: ${errorMessage}`,
                path,
                toolCallId
              }
            }
          }
        }),

        read_file: tool({
          description: 'Read the contents of a file',
          inputSchema: z.object({
            path: z.string().describe('File path to read')
          }),
          execute: async ({ path }, { abortSignal, toolCallId }) => {
            if (abortSignal?.aborted) {
              throw new Error('Operation cancelled')
            }
            
            try {
              const { storageManager } = await import('@/lib/storage-manager')
              await storageManager.init()
              
              // Validate path
              if (!path || typeof path !== 'string') {
                return { 
                  success: false, 
                  error: `Invalid file path provided`,
                  path,
                  toolCallId
                }
              }
              
              const file = await storageManager.getFile(projectId, path)

              if (!file) {
                return { 
                  success: false, 
                  error: `File not found: ${path}. Use list_files to see available files.`,
                  path,
                  toolCallId
                }
              }

              return { 
                success: true, 
                message: `✅ File ${path} read successfully.`,
                path,
                content: file.content || '',
                name: file.name,
                type: file.type,
                size: file.size,
                action: 'read',
                toolCallId
              }
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error'
              console.error(`[ERROR] read_file failed for ${path}:`, error)
              
              return { 
                success: false, 
                error: `Failed to read file ${path}: ${errorMessage}`,
                path,
                toolCallId
              }
            }
          }
        }),

        delete_file: tool({
          description: 'Delete a file from the project. Use this tool to remove files that are no longer needed.',
          inputSchema: z.object({
            path: z.string().describe('The file path relative to project root to delete')
          }),
          execute: async ({ path }, { abortSignal, toolCallId }) => {
            // Check for cancellation
            if (abortSignal?.aborted) {
              throw new Error('Operation cancelled')
            }
            
            try {
              // Validate path
              if (!path || typeof path !== 'string') {
                return { 
                  success: false, 
                  error: `Invalid file path provided`,
                  path,
                  toolCallId
                }
              }
              
              // Import storage manager
              const { storageManager } = await import('@/lib/storage-manager')
              await storageManager.init()
              
              // Check if file exists
              const existingFile = await storageManager.getFile(projectId, path)

              if (!existingFile) {
                return { 
                  success: false, 
                  error: `File not found: ${path}. Use list_files to see available files.`,
                  path,
                  toolCallId
                }
              }

              // Delete the file
              const result = await storageManager.deleteFile(projectId, path)
              
              if (result) {
                return { 
                  success: true, 
                  message: `✅ File ${path} deleted successfully.`,
                  path,
                  action: 'deleted',
                  toolCallId
                }
              } else {
                return { 
                  success: false, 
                  error: `Failed to delete file ${path}`,
                  path,
                  toolCallId
                }
              }
            } catch (error) {
              // Enhanced error handling
              const errorMessage = error instanceof Error ? error.message : 'Unknown error'
              console.error(`[ERROR] delete_file failed for ${path}:`, error)
              
              return { 
                success: false, 
                error: `Failed to delete file ${path}: ${errorMessage}`,
                path,
                toolCallId
              }
            }
          }
        }),

        add_package: tool({
          description: 'Add one or more npm packages to package.json. Use this tool to install new dependencies.',
          inputSchema: z.object({
            name: z.union([
              z.string().describe('The package name (e.g., "lodash") or comma-separated names (e.g., "lodash, axios, react-router-dom")'),
              z.array(z.string()).describe('Array of package names (e.g., ["lodash", "axios"])')
            ]).describe('Package name(s) to add'),
            version: z.string().optional().describe('The package version (e.g., "^4.17.21"). Defaults to "latest". Applied to all packages if array provided'),
            isDev: z.boolean().optional().describe('Whether to add as dev dependency (default: false)')
          }),
          execute: async (input: { name: string | string[]; version?: string; isDev?: boolean }, { abortSignal, toolCallId }) => {
            const { name: packageNames, version = 'latest', isDev = false } = input
            console.log(`[Chat-V2][add_package] Received input:`, { packageNames, version, isDev })
            
            // Ensure packageNames is always an array
            let names: string[]
            if (Array.isArray(packageNames)) {
              names = packageNames
            } else {
              // Handle comma-separated strings or JSON array strings
              const nameStr = packageNames.trim()
              if (nameStr.startsWith('[') && nameStr.endsWith(']')) {
                // Try to parse as JSON array
                try {
                  const parsed = JSON.parse(nameStr)
                  names = Array.isArray(parsed) ? parsed : [nameStr]
                } catch {
                  names = [nameStr]
                }
              } else if (nameStr.includes(',')) {
                // Split comma-separated values
                names = nameStr.split(',').map(s => s.trim()).filter(s => s.length > 0)
              } else {
                names = [nameStr]
              }
            }
            
            // Check for cancellation
            if (abortSignal?.aborted) {
              throw new Error('Operation cancelled')
            }
            
            try {
              console.log(`[Chat-V2][add_package] Executing: ${names.join(', ')}@${version} (dev: ${isDev})`)
              
              // Import storage manager
              const { storageManager } = await import('@/lib/storage-manager')
              await storageManager.init()
              
              // Get package.json or create if it doesn't exist
              let packageFile = await storageManager.getFile(projectId, 'package.json')
              let packageJson: any = {}
              
              if (!packageFile) {
                console.log(`[Chat-V2][add_package] package.json not found, creating new one`)
                // Create a basic package.json
                packageJson = {
                  name: "ai-generated-project",
                  version: "1.0.0",
                  description: "AI-generated project",
                  main: "index.js",
                  scripts: {
                    test: "echo \"Error: no test specified\" && exit 1"
                  },
                  keywords: [],
                  author: "",
                  license: "ISC"
                }
                // Create the file
                await storageManager.createFile({
                  workspaceId: projectId,
                  name: 'package.json',
                  path: 'package.json',
                  content: JSON.stringify(packageJson, null, 2),
                  fileType: 'json',
                  type: 'json',
                  size: JSON.stringify(packageJson, null, 2).length,
                  isDirectory: false
                })
              } else {
                packageJson = JSON.parse(packageFile.content || '{}')
              }

              const depType = isDev ? 'devDependencies' : 'dependencies'
              
              // Initialize dependency section if it doesn't exist
              if (!packageJson[depType]) {
                packageJson[depType] = {}
              }

              // Add all packages
              const addedPackages: string[] = []
              for (const packageName of names) {
                // Use appropriate version - for 'latest', use a reasonable default or just 'latest'
                const packageVersion = version === 'latest' ? `^1.0.0` : version
                packageJson[depType][packageName] = packageVersion
                addedPackages.push(packageName)
              }

              // Update package.json
              await storageManager.updateFile(projectId, 'package.json', {
                content: JSON.stringify(packageJson, null, 2)
              })

              console.log(`[Chat-V2][add_package] Added: ${addedPackages.join(', ')}@${version} to ${depType}`)
              return {
                success: true,
                action: 'packages_added',
                packages: addedPackages,
                version,
                dependencyType: depType,
                path: 'package.json',
                content: JSON.stringify(packageJson, null, 2),
                message: `Packages ${addedPackages.join(', ')} added to ${depType} successfully`,
                toolCallId
              }
            } catch (error: any) {
              console.error(`[Chat-V2][add_package] Error:`, error)
              return {
                success: false,
                error: error.message,
                packages: names,
                toolCallId
              }
            }
          }
        }),

        remove_package: tool({
          description: 'Remove one or more npm packages from package.json. Use this tool to uninstall dependencies.',
          inputSchema: z.object({
            name: z.union([
              z.string().describe('The package name to remove or comma-separated names (e.g., "lodash, axios")'),
              z.array(z.string()).describe('Array of package names to remove')
            ]).describe('Package name(s) to remove'),
            isDev: z.boolean().optional().describe('Whether to remove from dev dependencies (default: false)')
          }),
          execute: async (input: { name: string | string[]; isDev?: boolean }, { toolCallId }) => {
            const { name: packageNames, isDev = false } = input
            
            // Ensure packageNames is always an array
            let names: string[]
            if (Array.isArray(packageNames)) {
              names = packageNames
            } else {
              // Handle comma-separated strings or JSON array strings
              const nameStr = packageNames.trim()
              if (nameStr.startsWith('[') && nameStr.endsWith(']')) {
                // Try to parse as JSON array
                try {
                  const parsed = JSON.parse(nameStr)
                  names = Array.isArray(parsed) ? parsed : [nameStr]
                } catch {
                  names = [nameStr]
                }
              } else if (nameStr.includes(',')) {
                // Split comma-separated values
                names = nameStr.split(',').map(s => s.trim()).filter(s => s.length > 0)
              } else {
                names = [nameStr]
              }
            }
            try {
              console.log(`[Chat-V2][remove_package] Executing: ${names.join(', ')} (dev: ${isDev})`)
              
              // Get package.json
              const packageFile = await storageManager.getFile(projectId, 'package.json')
              if (!packageFile) {
                throw new Error('package.json not found')
              }

              const packageJson = JSON.parse(packageFile.content || '{}')
              const depType = isDev ? 'devDependencies' : 'dependencies'
              
              // Check if all packages exist
              const missingPackages: string[] = []
              for (const packageName of names) {
                if (!packageJson[depType] || !packageJson[depType][packageName]) {
                  missingPackages.push(packageName)
                }
              }
              
              if (missingPackages.length > 0) {
                throw new Error(`Package(s) ${missingPackages.join(', ')} not found in ${depType}`)
              }

              // Remove all packages
              const removedPackages: string[] = []
              for (const packageName of names) {
                delete packageJson[depType][packageName]
                removedPackages.push(packageName)
              }

              // Update package.json
              await storageManager.updateFile(projectId, 'package.json', {
                content: JSON.stringify(packageJson, null, 2)
              })

              console.log(`[Chat-V2][remove_package] Removed: ${removedPackages.join(', ')} from ${depType}`)
              return {
                success: true,
                action: 'packages_removed',
                packages: removedPackages,
                dependencyType: depType,
                path: 'package.json',
                content: JSON.stringify(packageJson, null, 2),
                message: `Packages ${removedPackages.join(', ')} removed from ${depType} successfully`,
                toolCallId
              }
            } catch (error: any) {
              console.error(`[Chat-V2][remove_package] Error:`, error)
              return {
                success: false,
                error: error.message,
                packages: names,
                toolCallId
              }
            }
          }
        }),

        web_search: tool({
          description: 'Search the web for current information and context. Returns clean, structured text instead of raw JSON data.',
          inputSchema: z.object({
            query: z.string().describe('Search query to find relevant web content')
          }),
          execute: async ({ query }, { abortSignal, toolCallId }) => {    
            if (abortSignal?.aborted) {
              throw new Error('Operation cancelled')
            }
            
            try {
              const searchResults = await searchWeb(query)
              
              return {
                success: true,
                message: `Web search completed successfully for query: "${query}"`,
                // Send clean, structured text instead of raw JSON
                cleanResults: searchResults.cleanedResults,
                // Keep minimal metadata for reference
                metadata: {
                  query: searchResults.query,
                  resultCount: searchResults.resultCount,
                  totalLength: searchResults.cleanedResults.length
                },
                query,
                toolCallId
              }
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error'
              console.error('[ERROR] web_search failed:', error)
              
              return { 
                success: false, 
                error: `Web search failed: ${errorMessage}`,
                query,
                toolCallId
              }
            }
          }
        }),

        web_extract: tool({
          description: 'Extract content from web pages using AnyAPI. Returns clean, structured text.',
          inputSchema: z.object({
            urls: z.union([
              z.string().url().describe('URL to extract content from'),
              z.array(z.string().url()).describe('Array of URLs to extract content from')
            ]).describe('URL or URLs to extract content from')
          }),
          execute: async ({ urls }, { abortSignal, toolCallId }) => {
            if (abortSignal?.aborted) {
              throw new Error('Operation cancelled')
            }
            
            // Ensure urls is always an array
            const urlArray = Array.isArray(urls) ? urls : [urls];
            
            try {
              // Import the web scraper
              const { webScraper } = await import('@/lib/web-scraper');
              
              // Process URLs sequentially to manage API key usage
              const extractionResults = await Promise.all(
                urlArray.map(async (url) => {
                  try {
                    const scraperResult = await webScraper.execute({ url });
                    
                    // Debug logging for web extraction
                    console.log(`[DEBUG] Web extract for ${url}:`, {
                      hasResult: !!scraperResult,
                      resultType: typeof scraperResult,
                      resultKeys: scraperResult ? Object.keys(scraperResult) : [],
                      hasCleanResults: scraperResult?.cleanResults ? true : false,
                      cleanResultsType: typeof scraperResult?.cleanResults,
                      cleanResultsLength: scraperResult?.cleanResults?.length || 0
                    });
                    
                    // Extract content from the scraper result
                    const extractContent = (result: any): string => {
                      // The webScraper returns cleanResults directly
                      if (result && typeof result === 'object' && result.cleanResults) {
                        return result.cleanResults;
                      }
                      
                      // Fallback to message if cleanResults not available
                      if (result && typeof result === 'object' && result.message) {
                        return result.message;
                      }
                      
                      // Last resort: stringify the result (but avoid circular references)
                      try {
                        return JSON.stringify(result, (key, value) => {
                          if (key === 'metadata' || key === 'apiKeyUsed') {
                            return '[REDACTED]';
                          }
                          return value;
                        }, 2);
                      } catch {
                        return 'Content extracted successfully';
                      }
                    };
                    
                    return {
                      success: true,
                      url,
                      cleanResults: extractContent(scraperResult),
                      metadata: {
                        url,
                        timestamp: new Date().toISOString(),
                        apiKeyUsed: scraperResult.metadata?.apiKeyUsed || 'unknown'
                      }
                    };
                  } catch (error) {
                    console.error(`[ERROR] Web extract failed for ${url}:`, error);
                    return {
                      success: false,
                      url,
                      error: error instanceof Error ? error.message : 'Unknown error',
                      cleanResults: ''
                    };
                  }
                })
              );
              
              // Separate successful and failed extractions
              const successfulResults = extractionResults.filter(result => result.success);
              const failedResults = extractionResults.filter(result => !result.success);
              
              // Debug logging for final result
              console.log('[DEBUG] Web extract final result:', {
                totalUrls: urlArray.length,
                successfulCount: successfulResults.length,
                failedCount: failedResults.length,
                cleanResultsLength: successfulResults.map(r => r.cleanResults?.length || 0),
                sampleCleanResults: successfulResults[0]?.cleanResults?.substring(0, 100) || 'none'
              });
              
              return {
                success: successfulResults.length > 0,
                message: successfulResults.length > 0 
                  ? `Successfully extracted content from ${successfulResults.length} URL(s)` 
                  : 'Failed to extract content from any URLs',
                cleanResults: successfulResults.map(result => result.cleanResults).join('\n\n'),
                metadata: {
                  successCount: successfulResults.length,
                  failedCount: failedResults.length,
                  urls: urlArray
                },
                toolCallId
              };
            } catch (error) {
              console.error('[ERROR] Web extract failed:', error);
              
              return { 
                success: false, 
                error: `Web extract failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                cleanResults: '',
                metadata: {
                  urls: urlArray
                },
                toolCallId
              };
            }
          }
        })
        
      },
      stopWhen: stepCountIs(50),
      onFinish: ({ response }) => {
        console.log(`[Chat-V2] Finished with ${response.messages.length} messages`)
      }
    })

    console.log('[Chat-V2] Streaming full stream with tool invocations')

    // Stream the full result including tool invocations using fullStream
    // AI SDK v5 fullStream includes all parts: text, tool calls, tool results
    return new Response(
      new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder()
          const fileOperations: any[] = []
          const toolCalls: Map<string, any> = new Map() // Store tool calls by ID
          
          try {
            for await (const part of result.fullStream) {
              // Collect tool calls
              if (part.type === 'tool-call') {
                const toolCall = part as any
                toolCalls.set(toolCall.toolCallId, {
                  toolCallId: toolCall.toolCallId,
                  toolName: toolCall.toolName,
                  args: toolCall.args,
                  state: 'call'
                })
              }
              
              // Process tool results and combine with calls
              if (part.type === 'tool-result') {
                const toolResult = part as any
                const toolCallId = toolResult.toolCallId
                const existingCall = toolCalls.get(toolCallId)
                
                if (existingCall) {
                  // Update the tool call with result
                  existingCall.result = toolResult.result || toolResult.output
                  existingCall.state = 'result'
                  
                  // Collect file operations from tool results
                  const toolResultData = toolResult.result || toolResult.output
                  if (toolResultData && toolResultData.success !== false && toolResultData.path) {
                    // This is a file operation
                    fileOperations.push({
                      type: toolResult.toolName,
                      path: toolResultData.path,
                      content: toolResultData.content,
                      projectId: projectId,
                      success: toolResultData.success !== false
                    })
                  }
                }
              }
              
              // Stream each part as newline-delimited JSON
              const json = JSON.stringify(part)
              controller.enqueue(encoder.encode(json + '\n'))
            }
            
            // After streaming is complete, process file operations for server-side persistence
            if (fileOperations.length > 0) {
              console.log('[DEBUG] Processing file operations for server-side persistence:', fileOperations)
              
              try {
                const { storageManager } = await import('@/lib/storage-manager')
                await storageManager.init()
                
                let operationsApplied = 0
                
                for (const fileOp of fileOperations) {
                  console.log('[DEBUG] Applying file operation to server storage:', fileOp)
                  
                  if (fileOp.type === 'write_file' && fileOp.path) {
                    // Check if file exists
                    const existingFile = await storageManager.getFile(projectId, fileOp.path)
                    
                    if (existingFile) {
                      // Update existing file
                      await storageManager.updateFile(projectId, fileOp.path, { 
                        content: fileOp.content || '',
                        updatedAt: new Date().toISOString()
                      })
                      console.log(`[DEBUG] Updated existing file in server storage: ${fileOp.path}`)
                    } else {
                      // Create new file
                      const newFile = await storageManager.createFile({
                        workspaceId: projectId,
                        name: fileOp.path.split('/').pop() || fileOp.path,
                        path: fileOp.path,
                        content: fileOp.content || '',
                        fileType: fileOp.path.split('.').pop() || 'text',
                        type: fileOp.path.split('.').pop() || 'text',
                        size: (fileOp.content || '').length,
                        isDirectory: false
                      })
                      console.log(`[DEBUG] Created new file in server storage: ${fileOp.path}`, newFile)
                    }
                    operationsApplied++
                  } else if (fileOp.type === 'edit_file' && fileOp.path && fileOp.content) {
                    // Update existing file with new content
                    await storageManager.updateFile(projectId, fileOp.path, { 
                      content: fileOp.content,
                      updatedAt: new Date().toISOString()
                    })
                    console.log(`[DEBUG] Edited file in server storage: ${fileOp.path}`)
                    operationsApplied++
                  } else if (fileOp.type === 'delete_file' && fileOp.path) {
                    // Delete file
                    await storageManager.deleteFile(projectId, fileOp.path)
                    console.log(`[DEBUG] Deleted file from server storage: ${fileOp.path}`)
                    operationsApplied++
                  } else {
                    console.warn('[DEBUG] Skipped invalid file operation:', fileOp)
                  }
                }
                
                console.log(`[DEBUG] Applied ${operationsApplied}/${fileOperations.length} file operations to server storage`)
                
              } catch (error) {
                console.error('[ERROR] Failed to apply file operations to server storage:', error)
              }
            }
            
            // Send final metadata with file operations and tool invocations for client-side processing
            if (fileOperations.length > 0 || toolCalls.size > 0) {
              // Get steps info after streaming is complete
              const stepsInfo = await result.steps
              const toolInvocations = Array.from(toolCalls.values())
              
              const metadataMessage = {
                type: 'metadata',
                fileOperations: fileOperations,
                toolInvocations: toolInvocations, // Include combined tool invocations
                serverSideExecution: true,
                hasToolCalls: toolInvocations.length > 0,
                stepCount: stepsInfo?.length || 1,
                steps: stepsInfo?.map((step: any, index: number) => ({
                  stepNumber: index + 1,
                  hasText: !!step.text,
                  toolCallsCount: step.toolCalls?.length || 0,
                  toolResultsCount: step.toolResults?.length || 0,
                  finishReason: step.finishReason
                })) || []
              }
              controller.enqueue(encoder.encode(JSON.stringify(metadataMessage) + '\n'))
            }
            
          } catch (error) {
            console.error('[Chat-V2] Stream error:', error)
          } finally {
            controller.close()
          }
        }
      }),
      {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Transfer-Encoding': 'chunked',
        }
      }
    )

  } catch (error: any) {
    console.error('[Chat-V2] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// Add Tavily API configuration with environment variable support
const tavilyConfig = {
  apiKeys: [
    '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',
    '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',
    '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'
  ],
  searchUrl: 'https://api.tavily.com/search',
  extractUrl: 'https://api.tavily.com/extract',
  currentKeyIndex: 0
};

// Clean and format web search results for better AI consumption
function cleanWebSearchResults(results: any[], query: string): string {
  if (!results || results.length === 0) {
    return `No results found for query: "${query}"`
  }

  let cleanedText = `🔍 **Web Search Results for: "${query}"**\n\n`
  
  results.forEach((result, index) => {
    const title = result.title || 'Untitled'
    const url = result.url || 'No URL'
    const content = result.content || result.raw_content || 'No content available'
    
    // Clean and truncate content to 1500 chars total
    const maxContentPerResult = Math.floor(1500 / results.length)
    const cleanedContent = content
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\n+/g, ' ') // Replace multiple newlines with single space
      .trim()
      .substring(0, maxContentPerResult)
    
    cleanedText += `**${index + 1}. ${title}**\n`
    cleanedText += `🔗 ${url}\n`
    cleanedText += `${cleanedContent}${cleanedContent.length >= maxContentPerResult ? '...' : ''}\n\n`
  })
  
  // Ensure total length doesn't exceed 1500 characters
  if (cleanedText.length > 1500) {
    cleanedText = cleanedText.substring(0, 1497) + '...'
  }
  
  return cleanedText
}

// Web search function using Tavily API
async function searchWeb(query: string) {
  // Check if API keys are available
  if (tavilyConfig.apiKeys.length === 0) {
    throw new Error('No Tavily API keys are configured.');
  }
  
  try {
    console.log('Starting web search for:', query);
    
    // Rotate through available API keys
    const apiKey = tavilyConfig.apiKeys[tavilyConfig.currentKeyIndex];
    tavilyConfig.currentKeyIndex = (tavilyConfig.currentKeyIndex + 1) % tavilyConfig.apiKeys.length;
    
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        query: query,
        search_depth: "basic",
        include_answer: false,
        include_raw_content: true,
        max_results: 5
      })
    });

    if (!response.ok) {
      throw new Error(`Web search failed with status ${response.status}`);
    }

    const data = await response.json();
    
    // Clean and format results for AI consumption
    const cleanedResults = cleanWebSearchResults(data.results || [], query)
    
    console.log('Web search successful (cleaned and formatted):', {
      query,
      resultCount: data.results?.length || 0,
      cleanedLength: cleanedResults.length
    })
    
    return {
      rawData: data,
      cleanedResults: cleanedResults,
      query: query,
      resultCount: data.results?.length || 0
    }
  } catch (error) {
    console.error('Web search error:', error);
    throw error;
  }
}

// Clean and format extracted content for better AI consumption
function cleanExtractedContent(content: any[], urls: string[]): string {
  if (!content || content.length === 0) {
    return `No content extracted from URLs: ${urls.join(', ')}`
  }

  let cleanedText = `📄 **Content Extraction Results**\n\n`
  
  content.forEach((item, index) => {
    const url = item.url || urls[index] || 'Unknown URL'
    const title = item.title || 'Untitled'
    const text = item.text || item.raw_content || 'No content available'
    
    // Clean and truncate content to fit within 1500 chars total
    const maxContentPerItem = Math.floor(1500 / content.length)
    const cleanedItemText = text
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\n+/g, ' ') // Replace multiple newlines with single space
      .trim()
      .substring(0, maxContentPerItem)
    
    cleanedText += `**${index + 1}. ${title}**\n`
    cleanedText += `🔗 ${url}\n`
    cleanedText += `${cleanedItemText}${cleanedItemText.length >= maxContentPerItem ? '...' : ''}\n\n`
  })
  
  // Ensure total length doesn't exceed 1500 characters
  if (cleanedText.length > 1500) {
    cleanedText = cleanedText.substring(0, 1497) + '...'
  }
  
  return cleanedText
}

// Content extraction function using Tavily API
async function extractContent(urls: string | string[]) {
  // Check if API keys are available
  if (tavilyConfig.apiKeys.length === 0) {
    throw new Error('No Tavily API keys are configured.');
  }
  
  try {
    // Ensure urls is always an array
    const urlArray = Array.isArray(urls) ? urls : [urls];
    
    // Rotate through available API keys
    const apiKey = tavilyConfig.apiKeys[tavilyConfig.currentKeyIndex];
    tavilyConfig.currentKeyIndex = (tavilyConfig.currentKeyIndex + 1) % tavilyConfig.apiKeys.length;
    
    console.log('Starting content extraction for:', urlArray);
    const response = await fetch('https://api.tavily.com/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        urls: urlArray,
        include_images: false,
        extract_depth: "basic"
      })
    });

    if (!response.ok) {
      throw new Error(`Content extraction failed with status ${response.status}`);
    }

    const data = await response.json();
    
    // Clean and format extracted content for AI consumption
    const cleanedContent = cleanExtractedContent(data.content || [], urlArray)
    
    console.log('Content extraction successful (cleaned and formatted):', {
      urlCount: urlArray.length,
      contentCount: data.content?.length || 0,
      cleanedLength: cleanedContent.length
    })
    
    return {
      rawData: data,
      cleanedContent: cleanedContent,
      urls: urlArray,
      contentCount: data.content?.length || 0
    }
  } catch (error) {
    console.error('Content extraction error:', error);
    throw error;
  }
}
