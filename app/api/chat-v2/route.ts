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

// Helper function to get file extension for syntax highlighting
const getFileExtension = (filePath: string): string => {
  const ext = filePath.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'ts': return 'typescript'
    case 'tsx': return 'typescript'
    case 'js': return 'javascript'
    case 'jsx': return 'javascript'
    case 'json': return 'json'
    case 'css': return 'css'
    case 'scss': return 'scss'
    case 'sass': return 'sass'
    case 'html': return 'html'
    case 'xml': return 'xml'
    case 'md': return 'markdown'
    case 'py': return 'python'
    case 'java': return 'java'
    case 'cpp': return 'cpp'
    case 'c': return 'c'
    case 'php': return 'php'
    case 'rb': return 'ruby'
    case 'go': return 'go'
    case 'rs': return 'rust'
    case 'sh': return 'bash'
    case 'sql': return 'sql'
    case 'yaml': return 'yaml'
    case 'yml': return 'yaml'
    default: return 'text'
  }
}

// Build optimized project context from client-sent file tree
async function buildOptimizedProjectContext(projectId: string, fileTree: string[], storageManager: any, userIntent?: any) {
  try {
    // Get current time for context
    const currentTime = new Date().toLocaleString('en-US', {
      timeZone: 'Africa/Douala',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'long'
    })

    // Detect project type from file tree
    const hasNextConfig = fileTree.some((path: string) => path === 'next.config.js' || path === 'next.config.mjs')
    const hasViteConfig = fileTree.some((path: string) => path === 'vite.config.ts' || path === 'vite.config.js')
    const projectType = hasNextConfig ? 'nextjs' : hasViteConfig ? 'vite-react' : 'unknown'

    // Build the context using client-sent file tree
    let context = `# Current Time
${currentTime}

# Project Type
${projectType === 'nextjs' ? '**Next.js** - Full-stack React framework with App Router' : projectType === 'vite-react' ? '**Vite + React** - Fast build tool with React' : 'Unknown'}

${projectType === 'nextjs' ? `## Next.js Project Structure
- **src/app/** - App Router pages and layouts
- **src/components/** - React components
- **src/lib/** - Utilities and helpers
- **public/** - Static assets
- **API Routes:** Create in src/app/api/[name]/route.ts` :
`## Vite Project Structure
- **src/** - Source code directory
- **src/components/** - React components
- **src/lib/** - Utilities and helpers
- **public/** - Static assets
- **api/** - Serverless functions (Vercel)`}

# Current Project Structure
${fileTree.join('\n')}
# Important Files Content
---`

    console.log(`[CONTEXT] Using client-sent file tree with ${fileTree.length} entries`)
    return context

  } catch (error) {
    console.error('Error building project context:', error)
    return `# Current Time
${new Date().toLocaleString()}

# Project Context Error
Unable to load project structure. Use list_files tool to explore the project.`
  }
}

// Powerful function to construct proper tool result messages
const constructToolResult = async (toolName: string, input: any, projectId: string, toolCallId: string, clientFiles?: any[]) => {
  console.log(`[CONSTRUCT_TOOL_RESULT] Starting ${toolName} operation with input:`, JSON.stringify(input, null, 2).substring(0, 200) + '...')

  try {
    const storageManager = await getStorageManager()

    // CRITICAL: For read_file operations, ALWAYS ensure we have the latest client-side files
    // This guarantees the AI reads the exact current content from IndexedDB
    if (toolName === 'read_file') {
      if (!clientFiles || clientFiles.length === 0) {
        console.log(`[CONSTRUCT_TOOL_RESULT] WARNING: read_file called without clientFiles - cannot guarantee latest content`)
      } else {
        console.log(`[CONSTRUCT_TOOL_RESULT] CRITICAL: Ensuring latest client content for read_file operation (${clientFiles.length} files)`)
      }
    }

    // CRITICAL: Sync client-side files to server-side InMemoryStorage
    // This ensures AI tools can access the files that exist in IndexedDB
    const clientFilesToSync = clientFiles || []
    console.log(`[CONSTRUCT_TOOL_RESULT] Syncing ${clientFilesToSync.length} files to server-side storage for ${toolName} operation`)

    if (clientFilesToSync.length > 0) {
      try {
        // Clear existing files in InMemoryStorage to ensure clean state
        const existingFiles = await storageManager.getFiles(projectId)
        console.log(`[CONSTRUCT_TOOL_RESULT] Clearing ${existingFiles.length} existing files for fresh sync`)
        for (const existingFile of existingFiles) {
          await storageManager.deleteFile(projectId, existingFile.path)
        }

        // Sync ALL client files to server storage with EXACT content
        let syncedCount = 0
        for (const file of clientFilesToSync) {
          if (file.path && !file.isDirectory) {
            // Ensure content is exactly as provided (no trimming/modification)
            const exactContent = file.content !== undefined ? String(file.content) : ''
            
            await storageManager.createFile({
              workspaceId: projectId,
              name: file.name,
              path: file.path,
              content: exactContent,
              fileType: file.type || file.fileType || 'text',
              type: file.type || file.fileType || 'text',
              size: file.size || exactContent.length,
              isDirectory: false
            })
            
            console.log(`[CONSTRUCT_TOOL_RESULT] Synced file with exact content: ${file.path} (${exactContent.length} chars)`)
            syncedCount++
          }
        }

        // CRITICAL VERIFICATION: Ensure sync worked and content matches exactly
        const syncedFiles = await storageManager.getFiles(projectId)
        console.log(`[CONSTRUCT_TOOL_RESULT] File sync complete: ${syncedFiles.length} files now available to AI tools for ${toolName}`)
        
        // Verify content integrity for read_file operations
        if (toolName === 'read_file') {
          const totalClientFiles = clientFilesToSync.filter(f => f.path && !f.isDirectory).length
          if (syncedFiles.length !== totalClientFiles) {
            console.error(`[CONSTRUCT_TOOL_RESULT] CRITICAL: Sync mismatch! Expected ${totalClientFiles} files, got ${syncedFiles.length}`)
          } else {
            console.log(`[CONSTRUCT_TOOL_RESULT] ✅ Content integrity verified: ${syncedFiles.length} files synced successfully`)
          }
        }

      } catch (syncError) {
        console.error('[ERROR] Failed to sync files in constructToolResult:', syncError)
        // For read_file operations, this is critical - log the failure prominently
        if (toolName === 'read_file') {
          console.error('[CRITICAL] Read operation may use outdated content due to sync failure')
        }
        // Continue anyway - tools may still work for write operations
      }
    } else if (toolName === 'read_file') {
      console.log(`[CONSTRUCT_TOOL_RESULT] WARNING: No client files provided for read_file - using existing server-side files (may be outdated)`)
    }

    switch (toolName) {
      case 'write_file': {
        const { path, content } = input

        // Validate inputs
        if (!path || typeof path !== 'string') {
          console.log(`[CONSTRUCT_TOOL_RESULT] write_file failed: Invalid file path provided - ${path}`)
          return {
            success: false,
            error: `Invalid file path provided`,
            path,
            toolCallId
          }
        }

        if (content === undefined || content === null) {
          console.log(`[CONSTRUCT_TOOL_RESULT] write_file failed: Invalid content provided for ${path}`)
          return {
            success: false,
            error: `Invalid content provided`,
            path,
            toolCallId
          }
        }

        // Check if file already exists
        const existingFile = await storageManager.getFile(projectId, path)

        if (existingFile) {
          // Update existing file
          await storageManager.updateFile(projectId, path, { content })
          console.log(`[CONSTRUCT_TOOL_RESULT] write_file: Updated existing file ${path} (${content.length} chars)`)
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
            isDirectory: false,
            metadata: { createdBy: 'ai' }
          })

          console.log(`[CONSTRUCT_TOOL_RESULT] write_file: Created new file ${path} (${content.length} chars)`)
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
      }

      case 'read_file': {
        const { path, includeLineNumbers = false } = input

        // Validate path
        if (!path || typeof path !== 'string') {
          console.log(`[CONSTRUCT_TOOL_RESULT] read_file failed: Invalid file path provided - ${path}`)
          return {
            success: false,
            error: `Invalid file path provided`,
            path,
            toolCallId
          }
        }

        const file = await storageManager.getFile(projectId, path)

        if (!file) {
          console.log(`[CONSTRUCT_TOOL_RESULT] read_file failed: File not found - ${path}`)
          return {
            success: false,
            error: `File not found: ${path}. Use list_files to see available files.`,
            path,
            toolCallId
          }
        }

        const content = file.content || ''
        
        // CRITICAL: Verify content matches client-side version for read_file operations
        if (clientFiles && clientFiles.length > 0) {
          const clientFile = clientFiles.find(f => f.path === path)
          if (clientFile) {
            const clientContent = String(clientFile.content || '')
            if (content !== clientContent) {
              console.error(`[CONSTRUCT_TOOL_RESULT] CRITICAL: Content mismatch for ${path}!`)
              console.error(`[CONSTRUCT_TOOL_RESULT] Server content length: ${content.length}, Client content length: ${clientContent.length}`)
              // Use client content as the source of truth
              console.log(`[CONSTRUCT_TOOL_RESULT] Using client content as source of truth for ${path}`)
              // Note: We don't update here as the sync should have made them match
            } else {
              console.log(`[CONSTRUCT_TOOL_RESULT] ✅ Content verification passed for ${path} (${content.length} chars)`)
            }
          }
        }
        
        console.log(`[CONSTRUCT_TOOL_RESULT] read_file: Successfully read ${path} (${content.length} chars)`)
        let response: any = {
          success: true,
          message: `✅ File ${path} read successfully.`,
          path,
          content,
          name: file.name,
          type: file.type,
          size: file.size,
          action: 'read',
          toolCallId
        }

        // Add line number information if requested
        if (includeLineNumbers) {
          const lines = content.split('\n')
          const lineCount = lines.length
          const linesWithNumbers = lines.map((line, index) =>
            `${String(index + 1).padStart(4, ' ')}: ${line}`
          ).join('\n')

          response.lineCount = lineCount
          response.contentWithLineNumbers = linesWithNumbers
          response.lines = lines // Array of individual lines for programmatic access
        }

        return response
      }

      case 'edit_file': {
        const { filePath, searchReplaceBlock } = input

        // Validate inputs
        if (!filePath || typeof filePath !== 'string') {
          return {
            success: false,
            error: `Invalid file path provided`,
            filePath,
            toolCallId
          }
        }

        if (!searchReplaceBlock || typeof searchReplaceBlock !== 'string') {
          return {
            success: false,
            error: `Invalid search/replace block provided`,
            filePath,
            toolCallId
          }
        }

        // Parse the search/replace block
        const parsedBlock = parseSearchReplaceBlock(searchReplaceBlock)
        if (!parsedBlock) {
          return {
            success: false,
            error: `Invalid search/replace block format`,
            filePath,
            searchReplaceBlock,
            toolCallId
          }
        }

        // Get the file
        const file = await storageManager.getFile(projectId, filePath)
        if (!file) {
          return {
            success: false,
            error: `File not found: ${filePath}`,
            filePath,
            toolCallId
          }
        }

        const originalContent = file.content || ''
        const { search, replace } = parsedBlock

        // Check if search text exists in file
        if (!originalContent.includes(search)) {
          return {
            success: false,
            error: `Search text not found in file: ${filePath}`,
            filePath,
            searchText: search,
            toolCallId
          }
        }

        // Perform the replacement
        const newContent = originalContent.replace(search, replace)

        // Update the file
        await storageManager.updateFile(projectId, filePath, { content: newContent })

        return {
          success: true,
          message: `✅ File ${filePath} modified successfully.`,
          path: filePath,
          originalContent,
          newContent,
          searchText: search,
          replaceText: replace,
          action: 'modified',
          toolCallId
        }
      }

      case 'delete_file': {
        const { path } = input

        // Validate path
        if (!path || typeof path !== 'string') {
          return {
            success: false,
            error: `Invalid file path provided`,
            path,
            toolCallId
          }
        }

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
      }

      case 'add_package': {
        const { name: packageNames, version = 'latest', isDev = false } = input

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
            names = nameStr.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0)
          } else {
            names = [nameStr]
          }
        }

        // Get package.json or create if it doesn't exist
        let packageFile = await storageManager.getFile(projectId, 'package.json')
        let packageJson: any = {}

        if (!packageFile) {
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
          // Use appropriate version - for 'latest', use a reasonable default
          const packageVersion = version === 'latest' ? `^1.0.0` : version
          packageJson[depType][packageName] = packageVersion
          addedPackages.push(packageName)
        }

        // Update package.json
        await storageManager.updateFile(projectId, 'package.json', {
          content: JSON.stringify(packageJson, null, 2)
        })

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
      }

      case 'remove_package': {
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
            names = nameStr.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0)
          } else {
            names = [nameStr]
          }
        }

        // Get package.json
        const packageFile = await storageManager.getFile(projectId, 'package.json')
        if (!packageFile) {
          return {
            success: false,
            error: `package.json not found`,
            toolCallId
          }
        }

        const packageJson = JSON.parse(packageFile.content || '{}')
        const depType = isDev ? 'devDependencies' : 'dependencies'

        // Check if dependency section exists
        if (!packageJson[depType]) {
          return {
            success: false,
            error: `No ${depType} found in package.json`,
            toolCallId
          }
        }

        // Remove packages
        const removedPackages: string[] = []
        const notFoundPackages: string[] = []

        for (const packageName of names) {
          if (packageJson[depType][packageName]) {
            delete packageJson[depType][packageName]
            removedPackages.push(packageName)
          } else {
            notFoundPackages.push(packageName)
          }
        }

        if (removedPackages.length === 0) {
          return {
            success: false,
            error: `Packages not found in ${depType}: ${notFoundPackages.join(', ')}`,
            toolCallId
          }
        }

        // Update package.json
        await storageManager.updateFile(projectId, 'package.json', {
          content: JSON.stringify(packageJson, null, 2)
        })

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
      }

      default:
        console.log(`[CONSTRUCT_TOOL_RESULT] Unknown tool requested: ${toolName}`)
        return {
          success: false,
          error: `Unknown tool: ${toolName}`,
          toolCallId
        }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[CONSTRUCT_TOOL_RESULT] ${toolName} failed:`, error)
    console.log(`[CONSTRUCT_TOOL_RESULT] ${toolName} operation failed with error: ${errorMessage}`)

    return {
      success: false,
      error: `Failed to execute ${toolName}: ${errorMessage}`,
      toolCallId
    }
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      userMessage, // Current user message to include in system prompt
      projectId,
      project,
      fileTree = [], // Client-sent file tree structure
      files = [], // Fallback for backward compatibility
      modelId,
      aiMode
    } = body

    // Validate userMessage is provided
    if (!userMessage || typeof userMessage !== 'string') {
      console.error('[Chat-V2] No user message provided:', { userMessage })
      return NextResponse.json({ 
        error: 'No user message provided' 
      }, { status: 400 })
    }

    console.log('[Chat-V2] Request received:', { 
      projectId, 
      modelId, 
      aiMode,
      userMessageLength: userMessage?.length || 0,
      hasUserMessage: !!userMessage
    })

    // Auth check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // CRITICAL: Sync client-side files to server-side InMemoryStorage
    // This ensures server-side AI tools can access the files that exist in IndexedDB
    const clientFiles = files || [] // For backward compatibility and server-side tools
    console.log(`[DEBUG] Syncing ${clientFiles.length} files to server-side storage for AI access`)

    if (clientFiles.length > 0) {
      try {
        const { storageManager } = await import('@/lib/storage-manager')
        await storageManager.init()

        // Clear existing files in InMemoryStorage to ensure clean state
        const existingFiles = await storageManager.getFiles(projectId)
        console.log(`[DEBUG] Clearing ${existingFiles.length} existing files for fresh sync`)
        for (const existingFile of existingFiles) {
          await storageManager.deleteFile(projectId, existingFile.path)
        }

        // Sync ALL client files to server storage with EXACT content
        let syncedCount = 0
        for (const file of clientFiles) {
          if (file.path && !file.isDirectory) {
            // Ensure content is exactly as provided (no trimming/modification)
            const exactContent = file.content !== undefined ? String(file.content) : ''
            
            await storageManager.createFile({
              workspaceId: projectId,
              name: file.name,
              path: file.path,
              content: exactContent,
              fileType: file.type || file.fileType || 'text',
              type: file.type || file.fileType || 'text',
              size: file.size || exactContent.length,
              isDirectory: false
            })
            
            console.log(`[DEBUG] Synced file with exact content: ${file.path} (${exactContent.length} chars)`)
            syncedCount++
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

    // Build project context from client-sent file tree
    const projectContext = await buildOptimizedProjectContext(projectId, fileTree, storageManager)
    console.log(`[PROJECT_CONTEXT] Built project context (${projectContext.length} chars):`, projectContext.substring(0, 500) + (projectContext.length > 500 ? '...' : ''))

    // Get conversation history from storage manager
    let conversationSummaryContext = ''
    try {
      // Load messages from storage manager for this project
      const chatSessions = await storageManager.getChatSessions(user.id)
      const activeSession = chatSessions.find((session: any) =>
        session.workspaceId === projectId && session.isActive
      )

      let recentMessages: any[] = []
      if (activeSession) {
        const storedMessages = await storageManager.getMessages(activeSession.id)
        // Convert to the format expected and take last 20 messages
        recentMessages = storedMessages
          .slice(-20)
          .map((msg: any) => ({
            role: msg.role,
            content: msg.content || '',
            createdAt: msg.createdAt
          }))
      }

      if (recentMessages && recentMessages.length > 0) {
        // Filter out system messages and empty content
        const filteredMessages = recentMessages.filter((msg: any) =>
          msg.role !== 'system' && msg.content && msg.content.trim().length > 0
        )

        // Create full history from filtered messages in AI-readable format
        const fullHistory = filteredMessages
          .map((msg: any, index: number) => {
            const role = msg.role === 'user' ? 'User' : msg.role === 'assistant' ? 'You' : msg.role.toUpperCase()
            const message = `${role}: ${msg.content}`
            // Add separator after assistant messages to separate interaction pairs
            const separator = msg.role === 'assistant' ? '\n\n---\n\n' : '\n\n'
            return message + separator
          })
          .join('')

        conversationSummaryContext = `## 📜 CONVERSATION HISTORY\n\n${fullHistory.trim()}`
        console.log('[Chat-V2][HISTORY] Loaded conversation history from storage:', {
          totalMessages: recentMessages.length,
          filteredMessages: filteredMessages.length,
          historyLength: conversationSummaryContext.length
        })
      } else {
        console.log('[Chat-V2][HISTORY] No conversation history available')
      }
    } catch (historyError) {
      console.error('[Chat-V2][HISTORY] Error loading conversation history:', historyError)
      // Continue without history on error
    }

    // Build system prompt from pixel_forge_system_prompt.ts
    const isNextJS = true // We're using Next.js
    const systemPrompt = `

# 🚀 PiPilot AI - Elite Web Architect & Bug Hunter Extraordinaire 🐛

You're not just an expert full-stack architect - you're a digital superhero with 15+ years of battle-tested experience! You're obsessed with three things:
1. **Quality** - Code so clean it sparkles ✨
2. **Completeness** - Features that work in EVERY scenario 🛡️
3. **User Experience** - Interfaces that make users smile 😊

## 🎯 Core Approach: Discovery → Design → Deliver
- **DISCOVERY**: 🔍 Explore codebase like a detective, understand patterns, identify tech stack
- **DESIGN**: 📐 Plan architecture with the precision of a master architect
- **DELIVER**: 🚀 Implement with production-ready code that impresses

## 🛠️ Tools in Your Utility Belt
- **CLIENT-SIDE TOOLS** (Execute on IndexedDB): read_file (with line numbers), write_file, edit_file, delete_file, add_package, remove_package, semantic_code_navigator (with line numbers), list_files
- **SERVER-SIDE TOOLS**: web_search, web_extract, check_dev_errors

Note: File and package operation tools (read_file, write_file, edit_file, delete_file, add_package, remove_package, semantic_code_navigator, list_files) execute on the client-side IndexedDB directly. You call them and the client handles the actual operations automatically.

Note: You may call the 'check error' tool at most 2 times during a single request  if the tool returns an error log, fix it then ask the user to switch to the preview  tab and run the app then rport any logs they see in the console tab below

## ✅ Essential Checklist
- **Functionality**: ✅ Happy path, edge cases, error handling
- **UX**: 🎨 Loading states, error messages, responsive design
- **Code Quality**: 💻 TypeScript, clean structure, no unused imports
- **Accessibility**: ♿ Semantic HTML, ARIA labels, keyboard navigation
- **Performance**: ⚡ Optimize renders, lazy loading, debouncing

## 🐛 Bug Handling Protocol
When users report bugs, become a digital detective:
1. **Listen Carefully** 🎧: Understand the exact issue, steps to reproduce, and expected behavior
2. **Investigate Thoroughly** 🔍: Read relevant code files to understand the implementation
3. **Identify Root Cause** 🎯: Pinpoint the exact source of the issue
4. **Provide Clear Solution** 💡: Explain the fix in simple terms and implement it
5. **Verify Resolution** ✅: Ensure the bug is completely squashed and won't reappear

## 🎨 Style Guidelines
- Use Tailwind utility classes 🎨
- Mobile-first responsive design 📱
- Dark mode support when applicable 🌙

## 🗣️ Communication Style
1. **🤔 Understanding** - Confirm what you'll build 🎯
2. **🔍 Discovery** - Mention key files/patterns found 📂
3. **🛠️ Implementation** - Use tools to build 🔧
4. **📊 Summary** - Concise summary of what was built ✨

Always use emojis generously! 🎉💫🔥 Make every response engaging and fun! 🌟

## 🚫 Critical Rules (Follow These Without Exception!)
- ❌ No HTML comments in TypeScript/JSX files
- 📖 Always read existing code before making changes
- 🎯 Follow user instructions PRECISELY - no creative deviations unless explicitly asked
- 🐛 When handling bugs, be thorough but efficient - users want solutions, not just analysis

## 🎯 Success Metrics
You know you've succeeded when:
- ✨ Feature works perfectly on first try
- 🎨 Code matches project's style
- 😊 Polished user experience
- 🚫 No console errors
- 🐛 Bugs are completely eliminated
- 👍 User says "Exactly what I needed!"

Remember: You're not just coding - you're crafting digital magic! Every detail matters, every interaction should feel smooth, and every bug should be hunted down with precision. Now go build something amazing! 🚀✨🎉


${projectContext}

${conversationSummaryContext || ''}

## 💬 CURRENT USER MESSAGE
${userMessage || 'No message provided'}`

    // Get AI model
    const model = getAIModel(modelId)

    console.log('[Chat-V2] Starting streamText with multi-step tooling')

    // Stream with AI SDK native tools - using prompt instead of messages array
    const result = await streamText({
      model,
      prompt: systemPrompt,
      tools: {
        // CLIENT-SIDE TOOL: Executed on frontend IndexedDB
        write_file: tool({
          description: 'Create or update a file in the project. Use this tool to create new files or update existing ones with new content. This tool executes on the client-side IndexedDB.',
          inputSchema: z.object({
            path: z.string().describe('The file path relative to project root (e.g., "src/components/Button.tsx")'),
            content: z.string().describe('The complete file content to write')
          })
        }),

        // CLIENT-SIDE TOOL: Executed on frontend IndexedDB
        read_file: tool({
          description: 'Read the contents of a file with optional line number information. This tool executes on the client-side IndexedDB.',
          inputSchema: z.object({
            path: z.string().describe('File path to read'),
            includeLineNumbers: z.boolean().optional().describe('Whether to include line numbers in the response (default: false)')
          })
        }),

        // CLIENT-SIDE TOOL: Executed on frontend IndexedDB
        delete_file: tool({
          description: 'Delete a file from the project. Use this tool to remove files that are no longer needed. This tool executes on the client-side IndexedDB.',
          inputSchema: z.object({
            path: z.string().describe('The file path relative to project root to delete')
          })
        }),

        // CLIENT-SIDE TOOL: Executed on frontend IndexedDB
        edit_file: tool({
          description: 'Edit an existing file using search/replace blocks. This tool cannot handle very large replacements. Use it only for small changes, small additions, or modifications in files. For large changes, prioritize the write_file tool instead. This tool executes on the client-side IndexedDB.',
          inputSchema: z.object({
            filePath: z.string().describe('The file path relative to project root'),
            searchReplaceBlock: z.string().describe(`Search/replace block in format:
<<<<<<< SEARCH
[exact code to find]
=======
[new code to replace with]
>>>>>>> REPLACE`)
          })
        }),

        // CLIENT-SIDE TOOL: Executed on frontend IndexedDB
        add_package: tool({
          description: 'Add one or more npm packages to package.json. Use this tool to install new dependencies. This tool executes on the client-side IndexedDB.',
          inputSchema: z.object({
            name: z.union([
              z.string().describe('The package name (e.g., "lodash") or comma-separated names (e.g., "lodash, axios, react-router-dom")'),
              z.array(z.string()).describe('Array of package names (e.g., ["lodash", "axios"])')
            ]).describe('Package name(s) to add'),
            version: z.string().optional().describe('The package version (e.g., "^4.17.21"). Defaults to "latest". Applied to all packages if array provided'),
            isDev: z.boolean().optional().describe('Whether to add as dev dependency (default: false)')
          })
        }),

        // CLIENT-SIDE TOOL: Executed on frontend IndexedDB
        remove_package: tool({
          description: 'Remove one or more npm packages from package.json. Use this tool to uninstall dependencies. This tool executes on the client-side IndexedDB.',
          inputSchema: z.object({
            name: z.union([
              z.string().describe('The package name to remove or comma-separated names (e.g., "lodash, axios")'),
              z.array(z.string()).describe('Array of package names to remove')
            ]).describe('Package name(s) to remove'),
            isDev: z.boolean().optional().describe('Whether to remove from dev dependencies (default: false)')
          })
        }),

        // CLIENT-SIDE TOOL: Executed on frontend IndexedDB
        semantic_code_navigator: tool({
          description: 'Search and discover code sections, patterns, or structures in files using natural language queries. Returns results with accurate line numbers matching Monaco editor display. This tool executes on the client-side IndexedDB.',
          inputSchema: z.object({
            query: z.string().describe('Natural language description of what to search for (e.g., "find all React components", "show database models", "locate error handlers")'),
            filePath: z.string().optional().describe('Optional: Specific file path to search within. If omitted, searches the entire workspace'),
            maxResults: z.number().optional().describe('Maximum number of results to return (default: 10)')
          })
        }),

        // CLIENT-SIDE TOOL: Executed on frontend IndexedDB
        list_files: tool({
          description: 'List all files and directories in the project workspace. Returns a hierarchical view of the project structure. This tool executes on the client-side IndexedDB.',
          inputSchema: z.object({
            path: z.string().optional().describe('Optional: Specific directory path to list. If omitted, lists the root directory'),
            recursive: z.boolean().optional().describe('Whether to list files recursively (default: false)')
          })
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
              
              // Truncate content per URL (2000 chars limit)
              const truncatedResults = successfulResults.map(result => {
                const originalLength = result.cleanResults.length;
                let truncatedContent = result.cleanResults;
                let wasTruncated = false;
                
                if (originalLength > 2000) {
                  truncatedContent = result.cleanResults.substring(0, 2000);
                  wasTruncated = true;
                }
                
                return {
                  ...result,
                  cleanResults: truncatedContent,
                  wasTruncated,
                  originalLength
                };
              });
              
              // Debug logging for final result
              console.log('[DEBUG] Web extract final result:', {
                totalUrls: urlArray.length,
                successfulCount: successfulResults.length,
                failedCount: failedResults.length,
                cleanResultsLength: truncatedResults.map(r => r.cleanResults?.length || 0),
                truncatedCount: truncatedResults.filter(r => r.wasTruncated).length,
                sampleCleanResults: truncatedResults[0]?.cleanResults?.substring(0, 100) || 'none'
              });
              
              return {
                success: successfulResults.length > 0,
                message: successfulResults.length > 0 
                  ? `Successfully extracted content from ${successfulResults.length} URL(s)${truncatedResults.some(r => r.wasTruncated) ? ' (some content truncated to 2000 chars per URL)' : ''}` 
                  : 'Failed to extract content from any URLs',
                cleanResults: truncatedResults.map(result => result.cleanResults).join('\n\n'),
                metadata: {
                  successCount: successfulResults.length,
                  failedCount: failedResults.length,
                  urls: urlArray,
                  truncationInfo: truncatedResults.map(r => ({
                    url: r.url,
                    originalLength: r.originalLength,
                    wasTruncated: r.wasTruncated
                  }))
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
        }),

        check_dev_errors: tool({
          description: 'Run development server or build process and check for runtime/build errors. Monitors console logs to detect any errors and reports success/failure status.',
          inputSchema: z.object({
            mode: z.enum(['dev', 'build']).describe('Whether to run dev server or build process'),
            timeoutSeconds: z.number().optional().describe('How long to monitor for errors after startup (default: 5 seconds for dev, 0 for build)')
          }),
          execute: async ({ mode, timeoutSeconds = mode === 'dev' ? 5 : 0 }, { abortSignal, toolCallId }) => {
            if (abortSignal?.aborted) {
              throw new Error('Operation cancelled')
            }

            try {
              const e2bApiKey = process.env.E2B_API_KEY
              if (!e2bApiKey) {
                return {
                  success: false,
                  error: 'E2B API key not configured',
                  mode,
                  toolCallId
                }
              }

              // Get all files in the project
              const { storageManager } = await import('@/lib/storage-manager')
              await storageManager.init()
              const allFiles = await storageManager.getFiles(projectId)

              if (!allFiles || allFiles.length === 0) {
                return {
                  success: false,
                  error: 'No files found in project',
                  mode,
                  toolCallId
                }
              }

              // Import E2B functions
              const {
                createEnhancedSandbox,
                SandboxError
              } = await import('@/lib/e2b-enhanced')

              const logs: string[] = []
              const errors: string[] = []
              let serverStarted = false
              let buildCompleted = false

              // Create sandbox
              const sandbox = await createEnhancedSandbox({
                template: "pipilot",
                timeoutMs: 300000, // 5 minutes timeout
                env: {}
              })

              logs.push('Sandbox created successfully')

              // Prepare files for sandbox
              const sandboxFiles: any[] = allFiles
                .filter(file => file.content && !file.isDirectory)
                .map(file => ({
                  path: `/project/${file.path}`,
                  content: file.content,
                }))

              // Ensure package.json exists
              const hasPackageJson = allFiles.some(f => f.path === 'package.json')
              if (!hasPackageJson) {
                const packageJson = {
                  name: 'error-check-app',
                  version: '0.1.0',
                  private: true,
                  packageManager: 'pnpm@8.15.0',
                  scripts: {
                    dev: 'vite --host 0.0.0.0',
                    build: 'tsc && vite build',
                    preview: 'vite preview',
                    lint: 'eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0'
                  },
                  dependencies: {
                    'react': '^18.2.0',
                    'react-dom': '^18.2.0'
                  },
                  devDependencies: {
                    '@types/react': '^18.2.43',
                    '@types/react-dom': '^18.2.17',
                    '@typescript-eslint/eslint-plugin': '^6.14.0',
                    '@typescript-eslint/parser': '^6.14.0',
                    '@vitejs/plugin-react': '^4.2.1',
                    'eslint': '^8.55.0',
                    'eslint-plugin-react-hooks': '^4.6.0',
                    'eslint-plugin-react-refresh': '^0.4.5',
                    'typescript': '^5.2.2',
                    'vite': '^5.0.8'
                  }
                }
                sandboxFiles.push({
                  path: '/project/package.json',
                  content: JSON.stringify(packageJson, null, 2)
                })
              }

              // Write files to sandbox
              await sandbox.writeFiles(sandboxFiles)
              logs.push('Project files written to sandbox')

              // Install dependencies
              logs.push('Installing dependencies...')
              const installResult = await sandbox.installDependenciesRobust("/project", {
                timeoutMs: 120000, // 2 minutes
                envVars: {},
                onStdout: (data) => logs.push(`[INSTALL] ${data.trim()}`),
                onStderr: (data) => {
                  errors.push(`[INSTALL ERROR] ${data.trim()}`)
                  logs.push(`[INSTALL ERROR] ${data.trim()}`)
                },
              })

              if (installResult.exitCode !== 0) {
                return {
                  success: false,
                  error: 'Dependency installation failed',
                  mode,
                  logs,
                  errors,
                  exitCode: installResult.exitCode,
                  stdout: installResult.stdout || '',
                  stderr: installResult.stderr || '',
                  fullErrorDetails: {
                    errorMessage: (installResult as any).error || 'Installation failed',
                    exitCode: installResult.exitCode,
                    stdout: installResult.stdout || '',
                    stderr: installResult.stderr || ''
                  },
                  toolCallId
                }
              }

              logs.push('Dependencies installed successfully')

              if (mode === 'dev') {
                // Start dev server and monitor for errors
                logs.push('Starting development server...')
                
                // Create a promise that resolves when server is ready
                let serverReadyResolve: () => void
                const serverReadyPromise = new Promise<void>((resolve) => {
                  serverReadyResolve = resolve
                })
                
                const devServer = await sandbox.startDevServer({
                  command: "npm run dev",
                  workingDirectory: "/project",
                  port: 3000,
                  timeoutMs: 30000, // 30 seconds to start
                  envVars: {},
                  onStdout: (data) => {
                    const message = data.trim()
                    logs.push(`[DEV] ${message}`)
                    if ((message.includes('ready') || message.includes('listening') || message.includes('Local:')) && !serverStarted) {
                      serverStarted = true
                      serverReadyResolve()
                    }
                  },
                  onStderr: (data) => {
                    const message = data.trim()
                    errors.push(`[DEV ERROR] ${message}`)
                    logs.push(`[DEV ERROR] ${message}`)
                  },
                })

                // Wait for server to be ready or timeout
                const timeoutPromise = new Promise<void>((resolve) => {
                  setTimeout(() => resolve(), 15000) // 15 second timeout
                })
                
                await Promise.race([serverReadyPromise, timeoutPromise])

                if (!serverStarted) {
                  return {
                    success: false,
                    error: 'Dev server failed to start within timeout',
                    mode,
                    logs,
                    errors,
                    fullErrorDetails: {
                      errorMessage: 'Dev server failed to start within 15 seconds',
                      exitCode: null,
                      stdout: '',
                      stderr: ''
                    },
                    toolCallId
                  }
                }

                logs.push(`Dev server started successfully at ${devServer.url}`)

                // Wait for the specified timeout to monitor for runtime errors
                logs.push(`Monitoring for runtime errors for ${timeoutSeconds} seconds...`)
                await new Promise(resolve => setTimeout(resolve, timeoutSeconds * 1000))

                // Check if any errors occurred during monitoring
                const runtimeErrors = errors.filter(error =>
                  error.includes('[DEV ERROR]') &&
                  !error.includes('ExperimentalWarning') &&
                  !error.includes('DeprecationWarning') &&
                  !error.includes('⚠') && // Exclude warnings
                  !error.includes('detected:') && // Exclude config detection warnings
                  !error.includes('Warning') // Exclude general warnings
                )

                return {
                  success: runtimeErrors.length === 0,
                  message: runtimeErrors.length === 0
                    ? 'Dev server started successfully with no runtime errors'
                    : `Dev server started but ${runtimeErrors.length} runtime errors detected`,
                  mode,
                  serverUrl: devServer.url,
                  logs,
                  errors: runtimeErrors,
                  errorCount: runtimeErrors.length,
                  toolCallId
                }

              } else if (mode === 'build') {
                // Run build process
                logs.push('Starting build process...')
                const buildResult = await sandbox.executeCommand("npm run build", {
                  workingDirectory: "/project",
                  timeoutMs: 120000, // 2 minutes
                  envVars: {},
                  onStdout: (data: string) => logs.push(`[BUILD] ${data.trim()}`),
                  onStderr: (data: string) => {
                    const message = data.trim()
                    errors.push(`[BUILD ERROR] ${message}`)
                    logs.push(`[BUILD ERROR] ${message}`)
                  },
                })

                buildCompleted = buildResult.exitCode === 0

                if (!buildCompleted) {
                  return {
                    success: false,
                    error: 'Build failed',
                    mode,
                    logs,
                    errors,
                    exitCode: buildResult.exitCode,
                    stdout: buildResult.stdout || '',
                    stderr: buildResult.stderr || '',
                    fullErrorDetails: {
                      errorMessage: (buildResult as any).error || 'Build failed',
                      exitCode: buildResult.exitCode,
                      stdout: buildResult.stdout || '',
                      stderr: buildResult.stderr || ''
                    },
                    toolCallId
                  }
                }

                // Filter out warnings and keep only actual errors
                const buildErrors = errors.filter(error =>
                  error.includes('[BUILD ERROR]') &&
                  !error.includes('warning') &&
                  !error.includes('Warning')
                )

                return {
                  success: buildErrors.length === 0,
                  message: buildErrors.length === 0
                    ? 'Build completed successfully with no errors'
                    : `Build completed but ${buildErrors.length} errors detected`,
                  mode,
                  logs,
                  errors: buildErrors,
                  errorCount: buildErrors.length,
                  toolCallId
                }
              }

            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error'
              console.error(`[ERROR] check_dev_errors failed for mode ${mode}:`, error)

              // Extract detailed error information from SandboxError
              let detailedError = errorMessage
              let stdout = ''
              let stderr = ''
              let exitCode = null

              if (error && typeof error === 'object') {
                // Check if it's a SandboxError with result details
                const sandboxError = error as any
                if (sandboxError.result) {
                  const result = sandboxError.result
                  exitCode = result.exitCode || null
                  stdout = result.stdout || ''
                  stderr = result.stderr || ''

                  // Build detailed error message with full logs
                  detailedError = `Command execution failed: exit status ${exitCode || 'unknown'}\n\nSTDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`
                } else if (sandboxError.originalError && sandboxError.originalError.result) {
                  // Handle nested error structure
                  const result = sandboxError.originalError.result
                  exitCode = result.exitCode || null
                  stdout = result.stdout || ''
                  stderr = result.stderr || ''

                  detailedError = `Command execution failed: exit status ${exitCode || 'unknown'}\n\nSTDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`
                }
              }

              return {
                success: false,
                error: `Failed to check ${mode} errors: ${detailedError}`,
                mode,
                exitCode,
                stdout,
                stderr,
                fullErrorDetails: {
                  errorMessage,
                  exitCode,
                  stdout,
                  stderr
                },
                toolCallId
              }
            }
          }
        })

      },
      stopWhen: stepCountIs(50),
      onFinish: ({ response }) => {
        console.log(`[Chat-V2] Finished with ${response.messages.length} messages`)
      }
    })

    console.log('[Chat-V2] Streaming with newline-delimited JSON (same as stream.ts)')

    // Stream the response using newline-delimited JSON format (not SSE)
    // This matches the format used in stream.ts and expected by chatparse.tsx
    return new Response(
      new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder()
          
          try {
            // Stream the text and tool calls
            for await (const part of result.fullStream) {
              // Send each part as newline-delimited JSON (no SSE "data:" prefix)
              controller.enqueue(encoder.encode(JSON.stringify(part) + '\n'))
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

// Parse a single search/replace block
function parseSearchReplaceBlock(blockText: string) {
  const SEARCH_START = "<<<<<<< SEARCH";
  const DIVIDER = "=======";
  const REPLACE_END = ">>>>>>> REPLACE";

  const lines = blockText.split('\n');
  let searchLines = [];
  let replaceLines = [];
  let mode = 'none'; // 'search' | 'replace'

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim() === SEARCH_START) {
      mode = 'search';
    } else if (line.trim() === DIVIDER && mode === 'search') {
      mode = 'replace';
    } else if (line.trim() === REPLACE_END && mode === 'replace') {
      break; // End of block
    } else if (mode === 'search') {
      searchLines.push(line);
    } else if (mode === 'replace') {
      replaceLines.push(line);
    }
  }

  // Remove empty lines from start and end
  while (searchLines.length > 0 && searchLines[0].trim() === '') searchLines.shift();
  while (searchLines.length > 0 && searchLines[searchLines.length - 1].trim() === '') searchLines.pop();
  while (replaceLines.length > 0 && replaceLines[0].trim() === '') replaceLines.shift();
  while (replaceLines.length > 0 && replaceLines[replaceLines.length - 1].trim() === '') replaceLines.pop();

  if (searchLines.length === 0) {
    return null; // Invalid block
  }

  return {
    search: searchLines.join('\n'),
    replace: replaceLines.join('\n')
  };
}
