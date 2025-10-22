import { streamText, tool, stepCountIs } from 'ai'
import { createTelemetry_log, updateTelemetry_log } from '@/app/actions/telemetry'
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

// In-memory project storage for AI tool sessions
// Key: projectId, Value: { fileTree: string[], files: Map<path, fileData> }
const sessionProjectStorage = new Map<string, {
  fileTree: string[]
  files: Map<string, any>
}>()

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

// Build optimized project context from session data
async function buildOptimizedProjectContext(projectId: string, sessionData: any, fileTree?: string[], userIntent?: any) {
  try {
    if (!sessionData) {
      console.error(`[buildOptimizedProjectContext] No session data for project ${projectId}`)
      return `# Project Context Error\nUnable to load project structure. Use list_files tool to explore the project.`
    }

    const { files: sessionFiles } = sessionData

    // Convert session files to array for filtering
    const files = Array.from(sessionFiles.values())

    // Get current time and working directory for context
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

    // Filter out shadcn UI components and common excluded files
    const filteredFiles = files.filter((file: any) => {
      const path = file.path.toLowerCase()
      // Exclude shadcn UI components
      if (path.includes('components/ui/') && (
        path.includes('button.tsx') ||
        path.includes('input.tsx') ||
        path.includes('dialog.tsx') ||
        path.includes('card.tsx') ||
        path.includes('badge.tsx') ||
        path.includes('alert.tsx') ||
        path.includes('accordion.tsx') ||
        path.includes('avatar.tsx') ||
        path.includes('checkbox.tsx') ||
        path.includes('dropdown-menu.tsx') ||
        path.includes('form.tsx') ||
        path.includes('label.tsx') ||
        path.includes('select.tsx') ||
        path.includes('sheet.tsx') ||
        path.includes('tabs.tsx') ||
        path.includes('textarea.tsx') ||
        path.includes('toast.tsx') ||
        path.includes('tooltip.tsx') ||
        path.includes('separator.tsx') ||
        path.includes('skeleton.tsx') ||
        path.includes('scroll-area.tsx') ||
        path.includes('progress.tsx') ||
        path.includes('popover.tsx') ||
        path.includes('navigation-menu.tsx') ||
        path.includes('menubar.tsx') ||
        path.includes('hover-card.tsx') ||
        path.includes('command.tsx') ||
        path.includes('calendar.tsx') ||
        path.includes('table.tsx') ||
        path.includes('switch.tsx') ||
        path.includes('slider.tsx') ||
        path.includes('radio-group.tsx')
      )) {
        return false
      }

      // Exclude node_modules, .git, build outputs
      if (path.includes('node_modules') ||
          path.includes('.git/') ||
          path.includes('dist/') ||
          path.includes('build/') ||
          path.includes('.next/')) {
        return false
      }

      return true
    })

    // Detect project type (Vite or Next.js)
    const hasNextConfig = files.some((f: any) => f.path === 'next.config.js' || f.path === 'next.config.mjs')
    const hasViteConfig = files.some((f: any) => f.path === 'vite.config.ts' || f.path === 'vite.config.js')
    const projectType = hasNextConfig ? 'nextjs' : hasViteConfig ? 'vite-react' : 'unknown'

    // Use provided file tree or build from files
    let finalFileTree: string[]
    if (fileTree && Array.isArray(fileTree) && fileTree.length > 0) {
      console.log(`[buildOptimizedProjectContext] Using client-provided file tree with ${fileTree.length} entries`)
      finalFileTree = fileTree
    } else {
      console.log(`[buildOptimizedProjectContext] Building file tree from ${filteredFiles.length} files`)
      // Build file tree structure
      const builtFileTree: string[] = []
      const directories = new Set<string>()

      // Sort files for better organization
      const sortedFiles = filteredFiles.sort((a: any, b: any) => {
        return a.path.localeCompare(b.path)
      })

      // Collect all directories
      sortedFiles.forEach((file: any) => {
        const pathParts = file.path.split('/')
        if (pathParts.length > 1) {
          // Add all parent directories
          for (let i = 1; i < pathParts.length; i++) {
            const dirPath = pathParts.slice(0, i).join('/')
            if (dirPath) {
              directories.add(dirPath)
            }
          }
        }
      })

      // Add root files first
      const rootFiles = sortedFiles.filter((file: any) => !file.path.includes('/'))
      rootFiles.forEach((file: any) => {
        builtFileTree.push(file.path)
      })

      // Add directories and their files
      const sortedDirectories = Array.from(directories).sort()
      sortedDirectories.forEach((dir: string) => {
        builtFileTree.push(`${dir}/`)

        // Add files in this directory
        const dirFiles = sortedFiles.filter((file: any) => {
          const filePath = file.path
          const fileDir = filePath.substring(0, filePath.lastIndexOf('/'))
          return fileDir === dir
        })

        dirFiles.forEach((file: any) => {
          builtFileTree.push(file.path)
        })
      })

      finalFileTree = builtFileTree
    }

    // Build the context
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
${finalFileTree.join('\n')}
---`

    console.log(`[CONTEXT] Built file tree with ${finalFileTree.length} files`) 
    return context

  } catch (error) {
    console.error('Error building project context:', error)
    return `# Current Time
${new Date().toLocaleString()}

# Project Context Error
Unable to load project structure. Use list_files tool to explore the project.`
  }
}

// Powerful function to construct proper tool result messages using in-memory storage
const constructToolResult = async (toolName: string, input: any, projectId: string, toolCallId: string) => {
  console.log(`[CONSTRUCT_TOOL_RESULT] Starting ${toolName} operation with input:`, JSON.stringify(input, null, 2).substring(0, 200) + '...')

  try {
    // Get session storage
    const sessionData = sessionProjectStorage.get(projectId)
    if (!sessionData) {
      console.error(`[CONSTRUCT_TOOL_RESULT] No session data found for project ${projectId}`)
      return {
        success: false,
        error: `Session storage not found for project ${projectId}`,
        toolCallId
      }
    }

    const { files: sessionFiles } = sessionData

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

        // Check if file already exists in memory
        const existingFile = sessionFiles.get(path)

        if (existingFile) {
          // Update existing file in memory
          existingFile.content = String(content)
          existingFile.size = content.length
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
          // Create new file in memory
          const newFile = {
            workspaceId: projectId,
            name: path.split('/').pop() || path,
            path,
            content: String(content),
            fileType: path.split('.').pop() || 'text',
            type: path.split('.').pop() || 'text',
            size: content.length,
            isDirectory: false,
            metadata: { createdBy: 'ai' }
          }
          sessionFiles.set(path, newFile)

          console.log(`[CONSTRUCT_TOOL_RESULT] write_file: Created new file ${path} (${content.length} chars)`)
          return {
            success: true,
            message: `✅ File ${path} created successfully.`,
            path,
            content,
            action: 'created',
            toolCallId
          }
        }
      }

      case 'read_file': {
        const { path, includeLineNumbers = false, startLine, endLine, lineRange } = input

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

        const file = sessionFiles.get(path)

        if (!file) {
          console.log(`[CONSTRUCT_TOOL_RESULT] read_file failed: File not found - ${path}`)
          return {
            success: false,
            error: `File not found: ${path}. Use list_files to see available files.`,
            path,
            toolCallId
          }
        }

        const fullContent = file.content || ''
        let content = fullContent
        let actualStartLine = startLine
        let actualEndLine = endLine

        // Parse line range if provided (e.g., "654-661")
        if (lineRange && typeof lineRange === 'string') {
          const rangeMatch = lineRange.match(/^(\d+)-(\d+)$/)
          if (rangeMatch) {
            actualStartLine = parseInt(rangeMatch[1], 10)
            actualEndLine = parseInt(rangeMatch[2], 10)
          } else {
            return {
              success: false,
              error: `Invalid line range format: ${lineRange}. Use format like "654-661"`,
              path,
              lineRange,
              toolCallId
            }
          }
        }

        // Extract specific line range if requested
        if (actualStartLine !== undefined && actualStartLine > 0) {
          const lines = fullContent.split('\n')
          const startIndex = actualStartLine - 1 // Convert to 0-indexed
          const endIndex = actualEndLine ? Math.min(actualEndLine - 1, lines.length - 1) : lines.length - 1

          if (startIndex >= lines.length) {
            return {
              success: false,
              error: `Start line ${actualStartLine} is beyond file length (${lines.length} lines)`,
              path,
              startLine: actualStartLine,
              totalLines: lines.length,
              toolCallId
            }
          }

          content = lines.slice(startIndex, endIndex + 1).join('\n')
        }

        console.log(`[CONSTRUCT_TOOL_RESULT] read_file: Successfully read ${path} (${content.length} chars, lines ${actualStartLine || 1}-${actualEndLine || 'end'})`)
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
          const linesWithNumbers = lines.map((line: string, index: number) => {
            const lineNumber = actualStartLine ? actualStartLine + index : index + 1
            return `${String(lineNumber).padStart(4, ' ')}: ${line}`
          }).join('\n')

          response.lineCount = lineCount
          response.contentWithLineNumbers = linesWithNumbers
          response.lines = lines // Array of individual lines for programmatic access
        }

        // Add range information if specific lines were requested
        if (actualStartLine !== undefined) {
          response.requestedRange = {
            startLine: actualStartLine,
            endLine: actualEndLine || 'end',
            totalLinesInFile: fullContent.split('\n').length
          }
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

        // Get the file from memory
        const file = sessionFiles.get(filePath)
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

        // Update the file in memory
        file.content = newContent
        file.size = newContent.length

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

        // Check if file exists in memory
        const existingFile = sessionFiles.get(path)
        if (!existingFile) {
          return {
            success: false,
            error: `File not found: ${path}. Use list_files to see available files.`,
            path,
            toolCallId
          }
        }

        // Delete the file from memory
        sessionFiles.delete(path)

        return {
          success: true,
          message: `✅ File ${path} deleted successfully.`,
          path,
          action: 'deleted',
          toolCallId
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

        // Get package.json from memory or create if it doesn't exist
        let packageFile = sessionFiles.get('package.json')
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
          // Create the file in memory
          packageFile = {
            workspaceId: projectId,
            name: 'package.json',
            path: 'package.json',
            content: JSON.stringify(packageJson, null, 2),
            fileType: 'json',
            type: 'json',
            size: JSON.stringify(packageJson, null, 2).length,
            isDirectory: false
          }
          sessionFiles.set('package.json', packageFile)
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
        const packageVersions: Record<string, string> = {}

        for (const packageName of names) {
          let packageVersion: string;

          if (version === 'latest') {
            // Keep 'latest' as-is for npm/yarn to resolve
            packageVersion = 'latest';
          } else if (version && typeof version === 'string') {
            // Use the exact version passed by AI (could be "1.2.3", "^1.2.3", "~1.2.3", etc.)
            packageVersion = version;
          } else {
            // Fallback to latest if version is invalid
            packageVersion = 'latest';
          }

          packageJson[depType][packageName] = packageVersion;
          addedPackages.push(packageName);
          packageVersions[packageName] = packageVersion;
        }

        // Update package.json in memory
        const updatedContent = JSON.stringify(packageJson, null, 2)
        packageFile.content = updatedContent
        packageFile.size = updatedContent.length

        return {
          success: true,
          action: 'packages_added',
          packages: addedPackages,
          packageVersions,
          requestedVersion: version,
          dependencyType: depType,
          path: 'package.json',
          content: updatedContent,
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

        // Get package.json from memory
        const packageFile = sessionFiles.get('package.json')
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

        // Update package.json in memory
        const updatedContent = JSON.stringify(packageJson, null, 2)
        packageFile.content = updatedContent
        packageFile.size = updatedContent.length

        return {
          success: true,
          action: 'packages_removed',
          packages: removedPackages,
          dependencyType: depType,
          path: 'package.json',
          content: updatedContent,
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
  const requestId = crypto.randomUUID()
  const startTime = Date.now()
  
  try {
    const body = await req.json()
    const {
      messages = [], // Default to empty array if not provided
      projectId,
      project,
      files = [], // Default to empty array
      fileTree, // Client-built file tree
      modelId,
      aiMode
    } = body

    // Validate messages is an array
    if (!Array.isArray(messages)) {
      console.error('[Chat-V2] Invalid messages format:', typeof messages)
      return NextResponse.json({ 
        error: 'Invalid messages format - must be an array' 
      }, { status: 400 })
    }

    // Process messages: truncate long user messages and limit conversation history
    const processedMessages = messages
      .map(msg => {
        // Truncate user messages to 1500 characters
        if (msg.role === 'user' && msg.content && typeof msg.content === 'string' && msg.content.length > 1500) {
          console.log(`[Chat-V2] Truncating user message from ${msg.content.length} to 1500 characters`)
          return {
            ...msg,
            content: msg.content.substring(0, 1500) + '...'
          }
        }
        return msg
      })
      // Keep only the last 3 pairs of messages (user + assistant exchanges = 6 messages max)
      .slice(-6)

    // Telemetry logging: log every input sent to the model API
    try {
      await createTelemetry_log({
        request_id: requestId,
        model_api_id: crypto.randomUUID(), // Placeholder - should reference actual model_api.id
        input_data: {
          messages: processedMessages, // Log processed messages
          projectId,
          project,
          files,
          fileTree,
          modelId,
          aiMode
        },
        metadata: {
          userAgent: req.headers.get('user-agent'),
          ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
          timestamp: new Date().toISOString()
        },
        status: 'pending'
      })
    } catch (telemetryError) {
      console.error('[Telemetry] Failed to log input:', telemetryError)
    }

    console.log('[Chat-V2] Request received:', { 
      projectId, 
      modelId, 
      aiMode, 
      originalMessageCount: messages?.length || 0,
      processedMessageCount: processedMessages.length,
      hasMessages: !!messages
    })

    // Auth check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Initialize in-memory project storage for this session
    const clientFiles = files || []
    const clientFileTree = fileTree || []
    console.log(`[DEBUG] Initializing in-memory storage with ${clientFiles.length} files and ${clientFileTree.length} tree entries for session ${projectId}`)

    // Create in-memory storage for this session
    const sessionFiles = new Map<string, any>()
    
    if (clientFiles.length > 0) {
      for (const file of clientFiles) {
        if (file.path && !file.isDirectory) {
          // Store file data in memory with exact content
          const fileData = {
            workspaceId: projectId,
            name: file.name,
            path: file.path,
            content: file.content !== undefined ? String(file.content) : '',
            fileType: file.type || file.fileType || 'text',
            type: file.type || file.fileType || 'text',
            size: file.size || String(file.content || '').length,
            isDirectory: false
          }
          sessionFiles.set(file.path, fileData)
          console.log(`[DEBUG] Stored file in memory: ${file.path} (${fileData.content.length} chars)`)
        }
      }
    }

    // Also store directory entries from fileTree
    if (clientFileTree.length > 0) {
      for (const treeItem of clientFileTree) {
        if (treeItem.endsWith('/')) {
          // This is a directory
          const dirPath = treeItem.slice(0, -1) // Remove trailing slash
          if (!sessionFiles.has(dirPath)) {
            const dirData = {
              workspaceId: projectId,
              name: dirPath.split('/').pop() || dirPath,
              path: dirPath,
              content: '',
              fileType: 'directory',
              type: 'directory',
              size: 0,
              isDirectory: true
            }
            sessionFiles.set(dirPath, dirData)
            console.log(`[DEBUG] Stored directory in memory: ${dirPath}`)
          }
        } else {
          // This is a file - make sure it's in sessionFiles
          if (!sessionFiles.has(treeItem)) {
            // Try to find it in clientFiles or create a placeholder
            const existingFile = clientFiles.find((f: any) => f.path === treeItem)
            if (existingFile) {
              const fileData = {
                workspaceId: projectId,
                name: existingFile.name,
                path: existingFile.path,
                content: existingFile.content !== undefined ? String(existingFile.content) : '',
                fileType: existingFile.type || existingFile.fileType || 'text',
                type: existingFile.type || existingFile.fileType || 'text',
                size: existingFile.size || String(existingFile.content || '').length,
                isDirectory: false
              }
              sessionFiles.set(treeItem, fileData)
              console.log(`[DEBUG] Stored missing file from fileTree: ${treeItem}`)
            }
          }
        }
      }
    }

    // Store session data
    sessionProjectStorage.set(projectId, {
      fileTree: clientFileTree,
      files: sessionFiles
    })

    console.log(`[DEBUG] In-memory storage initialized: ${sessionFiles.size} files ready for AI tools`)

    // Build project context from session data
    const sessionData = sessionProjectStorage.get(projectId)
    const projectContext = await buildOptimizedProjectContext(projectId, sessionData, fileTree)
    console.log(`[PROJECT_CONTEXT] Built project context (${projectContext.length} chars):`, projectContext.substring(0, 500) + (projectContext.length > 500 ? '...' : ''))

    // Get conversation history for context (last 5 message pairs) - Enhanced format for better AI context
    let conversationSummaryContext = ''
    try {
      // Ensure messages is an array before using slice
      const recentMessages = Array.isArray(processedMessages) ? processedMessages.slice(-10) : []

      if (recentMessages && recentMessages.length > 0) {
        // Filter out system messages and empty content
        const filteredMessages = recentMessages.filter((msg: any) =>
          msg.role !== 'system' && msg.content && msg.content.trim().length > 0
        )

        // Create enhanced history format with better structure and context preservation
        const fullHistory = filteredMessages
          .map((msg: any, index: number) => {
            const role = msg.role === 'user' ? '👤 User' : msg.role === 'assistant' ? '🤖 Assistant' : msg.role.toUpperCase()
            const timestamp = msg.timestamp ? ` [${new Date(msg.timestamp).toLocaleTimeString()}]` : ''
            const message = `${role}${timestamp}: ${msg.content.trim()}`

            // Add clear separators and interaction markers
            const isLastMessage = index === filteredMessages.length - 1
            const separator = msg.role === 'assistant' && !isLastMessage
              ? '\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n'
              : msg.role === 'user' && !isLastMessage
              ? '\n\n'
              : ''

            return message + separator
          })
          .join('')

        // Add metadata for better context
        const historyMetadata = `📊 History: ${filteredMessages.length} messages | Last updated: ${new Date().toLocaleString()}\n\n`

        conversationSummaryContext = `## 📜 CONVERSATION HISTORY\n${historyMetadata}${fullHistory.trim()}`

        console.log('[Chat-V2][HISTORY] Enhanced conversation history formatted for AI:', {
          totalMessages: recentMessages.length,
          filteredMessages: filteredMessages.length,
          historyLength: conversationSummaryContext.length,
          hasTimestamps: filteredMessages.some(m => m.timestamp)
        })
      } else {
        console.log('[Chat-V2][HISTORY] No conversation history available')
      }
    } catch (historyError) {
      console.error('[Chat-V2][HISTORY] Error preparing conversation history:', historyError)
      // Continue without history on error
    }

    // Build system prompt from pixel_forge_system_prompt.ts
    const isNextJS = true // We're using Next.js
    const systemPrompt = `
# 🚀 PiPilot AI: Elite Web Architect & Bug Hunter
## Role
You are the expert full-stack architect—a digital superhero with over 15 years of deep, professional experience. Your mission: deliver clean, innovative, market-dominating products with elite code quality, delightful UX, and thorough error handling.
### Quick Checklist
- Analyze requirements and project context
- Create unique UI/UX solutions
- Ensure full-stack product completeness
- Implement robust, maintainable TypeScript code
- Integrate authentication, storage, and external APIs per docs
- Test thoroughly (happy/edge/error/performance cases)
- Polish for production-readiness and virality
Begin with a concise checklist  use check box emojis filled and unfilled. 
## Core Directives
1. **Quality**: Ensure sparkling clean code ✨
2. **Innovation**: Innovate UI/UX that's uniquely creative 🏆
3. **Excellence**: Deliver fully complete, market-ready products

## Tools
- **Client-Side (IndexedDB)**: \`read_file\` (with line numbers), \`write_file\`, \`edit_file\`, \`delete_file\`, \`add_package\`, \`remove_package\`
- **Server-Side**: \`web_search\`, \`web_extract\`, \`semantic_code_navigator\` (with line numbers), \`check_dev_errors\`, \`list_files\` (client sync), \`read_file\` (client sync)

## PiPilot DB Integration
For **authentication, database, or file storage**:
- 📚 Review \`USER_AUTHENTICATION_README.md\` for authentication patterns
- 📚 Review \`STORAGE_SYSTEM_IMPLEMENTATION.md\` for file storage
- 📚 Reference \`EXTERNAL_APP_INTEGRATION_GUIDE.md\` for API integration
- 🛠️ Strictly use documented patterns and endpoints
### 🖼️ Image API
Image generation: \`https://api.a0.dev/assets/image?text={description}&aspect=1:1&seed={seed}\`
- \`text\`: Clear description
- \`seed\`: For stable output
- \`aspect\`: 1:1 or specify as needed
- **Usage**: Use URL in HTML \`<img src=...>\` tags
_Note_: Client-side file/package operations run on IndexedDB and are handled automatically. Use \`check_dev_errors\` up to 2 times per request in response to error logs. After fixing errors, tell the user to switch  run the app in Preview panel and  they should report any console logs error they see.
## ✅ Quality Checklist
- **Functionality**: Handle happy paths, edge cases, errors, and performance
- **UX Innovation**: Ensure mobile-first, seamless micro-interactions, and animations 🎨
- **Product Completeness**: Cover auth, payments, notifications, analytics, SEO 📦
- **Code Quality**: Use TypeScript, clean architecture, no unused imports 💻
- **Market Readiness**: Include Product Hunt polish, viral and monetization features 🏆
## 🐛 Bug Handling Protocol
1. **Listen Carefully** 🎧 – Fully understand the bug and steps to reproduce
2. **Investigate Thoroughly** 🔍 – Review relevant code
3. **Identify Root Cause** 🎯 – Pinpoint the origin
4. **Provide Creative Solution** 💡 – Fix with UX enhancements
5. **Verify Excellence** ✅ – Confirm the improvement
## 🎨 UI/UX Philosophy
- **Mobile-First** 📱: Optimize every pixel for mobile/tablet
- **Innovate** 🎭: Deliver delightful, unexpected experiences
- **Enhance Proactively** 🚀: Continuously improve
- **Product Hunt Ready** 🏆: Add viral features, gamification, sharing
- **Complete Ecosystem** 🌐: Build onboarding, retention, and full flows

Always use generous, relevant emojis! 🎉💥🔥 Make every interaction engaging and uplifting! 🌟
## 🚫 Critical Non-Negotiables
- ❌ No HTML comments in TypeScript/JSX files
- 📚 Always study existing code before making changes
- 🎯 Follow user instructions exactly; deviate creatively.
- 🐛 Be thorough and efficient with bug fixing—focus on actual solutions
## 🏅 Success Metrics
- ✨ Flawless operation across all devices
- 🎨 UI so beautiful, users share screenshots
- 😊 Indispensable features
- 🚫 Zero console errors, smooth performance
- 🐛 Bugs fixed with user experience improvements
- 👍 Featured on Product Hunt, viral traction
_Remember: You’re not just coding—you’re creating digital magic! Every feature, pixel, and product should set new benchmarks. Build legendary things! 🚀✨🎉_

${projectContext}

${conversationSummaryContext || ''}`

    // Get AI model
    const model = getAIModel(modelId)

    // Validate messages
    if (!processedMessages || processedMessages.length === 0) {
      console.error('[Chat-V2] No messages provided')
      return NextResponse.json({ 
        error: 'No messages provided' 
      }, { status: 400 })
    }

    console.log('[Chat-V2] Starting streamText with multi-step tooling')

    // Stream with AI SDK native tools
    // Pass messages directly without conversion (same as stream.ts)
    const result = await streamText({
      model,
      system: systemPrompt,
      temperature: 0.7,
      messages: processedMessages, // Use processed messages
      tools: {
        // CLIENT-SIDE TOOL: Executed on frontend IndexedDB
        write_file: tool({
          description: 'Create or update a file in the project. Use this tool to create new files or update existing ones with new content. This tool executes on the client-side IndexedDB.',
          inputSchema: z.object({
            path: z.string().describe('The file path relative to project root (e.g., "src/components/Button.tsx")'),
            content: z.string().describe('The complete file content to write')
          }),
          execute: async ({ path, content }, { toolCallId }) => {
            // Use the powerful constructor to get actual results
            return await constructToolResult('write_file', { path, content }, projectId, toolCallId)
          }
        }),

        // SERVER-SIDE TOOL: Read operations need server-side execution to return fresh data
        read_file: tool({
          description: 'Read the contents of a file with optional line number information or specific line ranges. This tool executes on the server-side to ensure the AI sees the most current file content.',
          inputSchema: z.object({
            path: z.string().describe('File path to read'),
            includeLineNumbers: z.boolean().optional().describe('Whether to include line numbers in the response (default: false)'),
            startLine: z.number().optional().describe('Starting line number (1-indexed) to read from'),
            endLine: z.number().optional().describe('Ending line number (1-indexed) to read to. If not provided, reads from startLine to end of file'),
            lineRange: z.string().optional().describe('Line range in format "start-end" (e.g., "654-661"). Overrides startLine and endLine if provided')
          }),
          execute: async ({ path, includeLineNumbers, startLine, endLine, lineRange }, { toolCallId }) => {
            // Use the powerful constructor to get actual results from in-memory store
            return await constructToolResult('read_file', { path, includeLineNumbers, startLine, endLine, lineRange }, projectId, toolCallId)
          }
        }),

        // CLIENT-SIDE TOOL: Executed on frontend IndexedDB
        delete_file: tool({
          description: 'Delete a file from the project. Use this tool to remove files that are no longer needed. This tool executes on the client-side IndexedDB.',
          inputSchema: z.object({
            path: z.string().describe('The file path relative to project root to delete')
          }),
          execute: async ({ path }, { toolCallId }) => {
            // Use the powerful constructor to get actual results
            return await constructToolResult('delete_file', { path }, projectId, toolCallId)
          }
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
          }),
          execute: async ({ filePath, searchReplaceBlock }, { toolCallId }) => {
            // Use the powerful constructor to get actual results
            return await constructToolResult('edit_file', { filePath, searchReplaceBlock }, projectId, toolCallId)
          }
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
          }),
          execute: async (input: { name: string | string[]; version?: string; isDev?: boolean }, { toolCallId }) => {
            // Use the powerful constructor to get actual results
            return await constructToolResult('add_package', input, projectId, toolCallId)
          }
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
          }),
          execute: async (input: { name: string | string[]; isDev?: boolean }, { toolCallId }) => {
            // Use the powerful constructor to get actual results
            return await constructToolResult('remove_package', input, projectId, toolCallId)
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

        semantic_code_navigator: tool({
          description: 'Advanced semantic code search and analysis tool. Finds code patterns, structures, and relationships with high accuracy. Supports natural language queries, framework-specific patterns, and detailed code analysis.',
          inputSchema: z.object({
            query: z.string().describe('Natural language description of what to search for (e.g., "find React components with useState", "show API endpoints", "locate error handling", "find database models")'),
            filePath: z.string().optional().describe('Optional: Specific file path to search within. If omitted, searches the entire workspace'),
            fileType: z.string().optional().describe('Optional: Filter by file type (e.g., "tsx", "ts", "js", "py", "md")'),
            maxResults: z.number().optional().describe('Maximum number of results to return (default: 20)'),
            analysisDepth: z.enum(['basic', 'detailed', 'comprehensive']).optional().describe('Analysis depth: basic (fast), detailed (balanced), comprehensive (thorough but slower)'),
            includeDependencies: z.boolean().optional().describe('Include related code dependencies and relationships (default: false)')
          }),
          execute: async ({ query, filePath, fileType, maxResults = 20, analysisDepth = 'detailed', includeDependencies = false }, { abortSignal, toolCallId }) => {
            if (abortSignal?.aborted) {
              throw new Error('Operation cancelled')
            }

            try {
              // Get session storage
              const sessionData = sessionProjectStorage.get(projectId)
              if (!sessionData) {
                return {
                  success: false,
                  error: `Session storage not found for project ${projectId}`,
                  query,
                  toolCallId
                }
              }

              const { files: sessionFiles } = sessionData

              // Convert to array and filter based on criteria
              let filesToSearch = Array.from(sessionFiles.values())

              // Filter by file path if specified
              if (filePath) {
                filesToSearch = filesToSearch.filter((file: any) => file.path === filePath)
                if (filesToSearch.length === 0) {
                  return {
                    success: false,
                    error: `File not found: ${filePath}`,
                    query,
                    toolCallId
                  }
                }
              }

              // Filter by file type if specified
              if (fileType) {
                const extensions = fileType.split(',').map(ext => ext.trim().toLowerCase())
                filesToSearch = filesToSearch.filter((file: any) => {
                  const fileExt = file.path.split('.').pop()?.toLowerCase()
                  return extensions.includes(fileExt || '')
                })
              }

              const results: any[] = []

              // Search through each file
              for (const file of filesToSearch) {
                if (!file.content || file.isDirectory) continue

                const content = file.content
                const lines = content.split('\n')
                const lowerQuery = query.toLowerCase()

                // Enhanced semantic code analysis with framework-specific patterns
                const searchPatterns = [
                  // React/TypeScript specific patterns
                  {
                    type: 'react_component',
                    regex: /^\s*(export\s+)?(const|function)\s+(\w+)\s*[=:]\s*(React\.)?(memo\()?(\([^)]*\)\s*=>|function)/gm,
                    description: 'React component definition'
                  },
                  {
                    type: 'typescript_interface',
                    regex: /^\s*(export\s+)?interface\s+(\w+)/gm,
                    description: 'TypeScript interface definition'
                  },
                  {
                    type: 'typescript_type',
                    regex: /^\s*(export\s+)?type\s+(\w+)\s*=/gm,
                    description: 'TypeScript type definition'
                  },
                  {
                    type: 'api_route',
                    regex: /^\s*export\s+(async\s+)?function\s+(GET|POST|PUT|DELETE|PATCH)/gm,
                    description: 'Next.js API route handler'
                  },
                  {
                    type: 'database_query',
                    regex: /\b(SELECT|INSERT|UPDATE|DELETE)\b.*\bFROM\b|\bCREATE\s+TABLE\b|\bALTER\s+TABLE\b/gi,
                    description: 'Database query or schema definition'
                  },
                  {
                    type: 'async_function',
                    regex: /^\s*(export\s+)?async\s+(function|const)\s+(\w+)/gm,
                    description: 'Async function definition'
                  },
                  {
                    type: 'hook_definition',
                    regex: /^\s*(export\s+)?function\s+use\w+/gm,
                    description: 'React hook definition'
                  },
                  {
                    type: 'error_handling',
                    regex: /\btry\s*\{|\bcatch\s*\(|\bthrow\s+new\b|\bError\s*\(/gi,
                    description: 'Error handling code'
                  },
                  {
                    type: 'validation_schema',
                    regex: /\b(z\.)?(object|array|string|number|boolean)\(\)|\.refine\(|schema\.parse\b/gi,
                    description: 'Zod validation schema'
                  },
                  {
                    type: 'test_case',
                    regex: /^\s*(it|test|describe)\s*\(/gm,
                    description: 'Test case definition'
                  },
                  {
                    type: 'configuration',
                    regex: /\b(process\.env|NEXT_PUBLIC_|REACT_APP_)\b|\bconfig\b.*=|\bsettings\b.*=/gi,
                    description: 'Configuration or environment variables'
                  },
                  {
                    type: 'styling',
                    regex: /\bclassName\s*=|\bstyle\s*=|\btailwind\b|\bcss\b|\bsass\b/gi,
                    description: 'Styling and CSS classes'
                  },
                  // Generic patterns for broader coverage
                  {
                    type: 'function',
                    regex: /^\s*(export\s+)?(function|const|let|var)\s+(\w+)\s*[=({]/gm,
                    description: 'Function or method definition'
                  },
                  {
                    type: 'class',
                    regex: /^\s*(export\s+)?(class|interface|type)\s+(\w+)/gm,
                    description: 'Class, interface, or type definition'
                  },
                  {
                    type: 'import',
                    regex: /^\s*import\s+.*from\s+['"`].*['"`]/gm,
                    description: 'Import statement'
                  },
                  {
                    type: 'export',
                    regex: /^\s*export\s+/gm,
                    description: 'Export statement'
                  },
                  // Semantic text search with context awareness
                  {
                    type: 'semantic_match',
                    regex: new RegExp(`\\b${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'),
                    description: 'Semantic code match'
                  }
                ]

                // Search for each pattern
                for (const pattern of searchPatterns) {
                  let match
                  while ((match = pattern.regex.exec(content)) !== null && results.length < maxResults) {
                    // Calculate line number (1-indexed)
                    const matchIndex = match.index
                    let lineNumber = 1
                    let charCount = 0

                    for (let i = 0; i < lines.length; i++) {
                      charCount += lines[i].length + 1 // +1 for newline
                      if (charCount > matchIndex) {
                        lineNumber = i + 1
                        break
                      }
                    }

                    // Calculate relevance score based on pattern type and context
                    let relevanceScore = 1
                    switch (pattern.type) {
                      case 'react_component':
                      case 'api_route':
                      case 'async_function':
                        relevanceScore = 10
                        break
                      case 'typescript_interface':
                      case 'typescript_type':
                      case 'hook_definition':
                        relevanceScore = 8
                        break
                      case 'database_query':
                      case 'validation_schema':
                      case 'error_handling':
                        relevanceScore = 7
                        break
                      case 'test_case':
                      case 'configuration':
                        relevanceScore = 6
                        break
                      case 'function':
                      case 'class':
                        relevanceScore = 5
                        break
                      case 'styling':
                      case 'import':
                      case 'export':
                        relevanceScore = 3
                        break
                      default:
                        relevanceScore = 2
                    }

                    // Boost score for exact matches and word boundaries
                    if (match[0].toLowerCase() === query.toLowerCase()) {
                      relevanceScore += 5
                    }
                    if (new RegExp(`\\b${query}\\b`, 'i').test(match[0])) {
                      relevanceScore += 3
                    }

                    // Extract context around the match
                    const startLine = Math.max(1, lineNumber - 2)
                    const endLine = Math.min(lines.length, lineNumber + 2)
                    const contextLines = lines.slice(startLine - 1, endLine)
                    const contextWithNumbers = contextLines.map((line: string, idx: number) =>
                      `${String(startLine + idx).padStart(4, ' ')}: ${line}`
                    ).join('\n')

                    // Highlight the match in context
                    const highlightedContext = contextWithNumbers.replace(
                      new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
                      '**$&**'
                    )

                    // Check for dependencies if requested
                    let dependencies: string[] = []
                    if (includeDependencies && pattern.type === 'import') {
                      const importMatch = match[0].match(/from\s+['"`]([^'"`]+)['"`]/)
                      if (importMatch) {
                        dependencies.push(importMatch[1])
                      }
                    }

                    results.push({
                      file: file.path,
                      type: pattern.type,
                      description: pattern.description,
                      lineNumber,
                      match: match[0].trim(),
                      context: highlightedContext,
                      fullMatch: match[0],
                      relevanceScore,
                      dependencies: dependencies.length > 0 ? dependencies : undefined
                    })

                    // Prevent infinite loops for global regex
                    if (!pattern.regex.global) break
                  }
                }

                if (results.length >= maxResults) break
              }

              // Sort results by relevance score and deduplicate
              const uniqueResults = results
                .sort((a, b) => b.relevanceScore - a.relevanceScore)
                .filter((result, index, arr) =>
                  index === 0 || !(arr[index - 1].file === result.file &&
                                   arr[index - 1].lineNumber === result.lineNumber &&
                                   arr[index - 1].match === result.match)
                )
                .slice(0, maxResults)

              // Perform dependency analysis if requested
              let dependencyAnalysis: any = null
              if (includeDependencies && uniqueResults.length > 0) {
                const allDependencies = new Set<string>()
                const dependencyMap = new Map<string, string[]>()

                // Collect all dependencies from results
                uniqueResults.forEach(result => {
                  if (result.dependencies) {
                    result.dependencies.forEach((dep: string) => allDependencies.add(dep))
                  }
                })

                // Analyze dependency relationships
                filesToSearch.forEach((file: any) => {
                  if (!file.content || file.isDirectory) return

                  const content = file.content
                  const imports = content.match(/^\s*import\s+.*from\s+['"`]([^'"`]+)['"`]/gm) || []

                  imports.forEach((importStmt: string) => {
                    const match = importStmt.match(/from\s+['"`]([^'"`]+)['"`]/)
                    if (match) {
                      const dep = match[1]
                      if (allDependencies.has(dep)) {
                        if (!dependencyMap.has(file.path)) {
                          dependencyMap.set(file.path, [])
                        }
                        dependencyMap.get(file.path)!.push(dep)
                      }
                    }
                  })
                })

                dependencyAnalysis = {
                  totalDependencies: allDependencies.size,
                  dependencyFiles: Array.from(dependencyMap.entries()).map(([file, deps]) => ({
                    file,
                    imports: deps
                  })),
                  uniqueDependencies: Array.from(allDependencies)
                }
              }

              return {
                success: true,
                message: `Found ${uniqueResults.length} code sections matching "${query}" (sorted by relevance)`,
                query,
                results: uniqueResults,
                totalResults: uniqueResults.length,
                dependencyAnalysis,
                toolCallId
              }

            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error'
              console.error(`[ERROR] semantic_code_navigator failed for query "${query}":`, error)

              return {
                success: false,
                error: `Failed to search code: ${errorMessage}`,
                query,
                toolCallId
              }
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

              // Get all files from in-memory session store (latest state)
              const sessionData = sessionProjectStorage.get(projectId)
              if (!sessionData) {
                return {
                  success: false,
                  error: `Session storage not found for project ${projectId}`,
                  mode,
                  toolCallId
                }
              }

              const { files: sessionFiles } = sessionData
              const allFiles = Array.from(sessionFiles.values())

              if (!allFiles || allFiles.length === 0) {
                return {
                  success: false,
                  error: 'No files found in project session',
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
        }),

        list_files: tool({
          description: 'List all files and directories in the project with their structure and metadata.',
          inputSchema: z.object({
            path: z.string().optional().describe('Optional: Specific directory path to list. If omitted, lists root directory')
          }),
          execute: async ({ path }, { toolCallId }) => {
            try {
              let allFiles: any[] = []

              // First try session storage (client-sent data)
              const sessionData = sessionProjectStorage.get(projectId)
              if (sessionData && sessionData.files && sessionData.files.size > 0) {
                console.log(`[list_files] Using session storage with ${sessionData.files.size} files`)
                allFiles = Array.from(sessionData.files.values())
              }

              // If session storage is empty or missing, fall back to direct storage manager query
              if (allFiles.length === 0) {
                console.log(`[list_files] Session storage empty, falling back to direct storage manager query`)
                const { storageManager } = await import('@/lib/storage-manager')
                await storageManager.init()
                allFiles = await storageManager.getFiles(projectId)
                console.log(`[list_files] Retrieved ${allFiles.length} files from storage manager`)
              }

              let filesToList: any[] = []
              if (path) {
                // List files in specific directory
                const pathPrefix = path.endsWith('/') ? path : `${path}/`
                for (const file of allFiles) {
                  if (file.path.startsWith(pathPrefix) &&
                      !file.path.substring(pathPrefix.length).includes('/')) {
                    filesToList.push({
                      name: file.name,
                      path: file.path,
                      type: file.type,
                      size: file.size,
                      isDirectory: file.isDirectory,
                      lastModified: file.updatedAt || file.createdAt || new Date().toISOString()
                    })
                  }
                }
              } else {
                // List root directory files
                for (const file of allFiles) {
                  if (!file.path.includes('/')) {
                    filesToList.push({
                      name: file.name,
                      path: file.path,
                      type: file.type,
                      size: file.size,
                      isDirectory: file.isDirectory,
                      lastModified: file.updatedAt || file.createdAt || new Date().toISOString()
                    })
                  }
                }
              }

              // Sort: directories first, then files alphabetically
              const sortedFiles = filesToList.sort((a: any, b: any) => {
                // Directories come first
                if (a.isDirectory && !b.isDirectory) return -1
                if (!a.isDirectory && b.isDirectory) return 1
                // Then alphabetical
                return a.path.localeCompare(b.path)
              })

              return {
                success: true,
                message: path
                  ? `✅ Listed ${sortedFiles.length} items in directory: ${path}`
                  : `✅ Listed ${sortedFiles.length} items in root directory`,
                files: sortedFiles,
                count: sortedFiles.length,
                directory: path || '/',
                action: 'list',
                toolCallId
              }
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error'
              console.error('[ERROR] list_files failed:', error)

              return {
                success: false,
                error: `Failed to list files: ${errorMessage}`,
                files: [],
                count: 0,
                action: 'list',
                toolCallId
              }
            }
          }
        })

      },
      stopWhen: stepCountIs(50),
      onFinish: ({ response }) => {
        console.log(`[Chat-V2] Finished with ${response.messages.length} messages`)
        
        // Update telemetry with success status
        updateTelemetry_log(requestId, {
          status: 'success',
          response_time_ms: Date.now() - startTime
        }).catch(telemetryError => {
          console.error('[Telemetry] Failed to update success status:', telemetryError)
        })
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
    
    // Update telemetry with error status
    try {
      const endTime = Date.now()
      await updateTelemetry_log(requestId, {
        status: 'error',
        error_message: error.message || 'Internal server error',
        response_time_ms: endTime - startTime
      })
    } catch (telemetryError) {
      console.error('[Telemetry] Failed to update error status:', telemetryError)
    }
    
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
