import { streamText, tool, stepCountIs } from 'ai'
import { createTelemetry_log, updateTelemetry_log } from '@/app/actions/telemetry'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getModel } from '@/lib/ai-providers'
import { DEFAULT_CHAT_MODEL, getModelById } from '@/lib/ai-models'
import { NextResponse } from 'next/server'
import { getWorkspaceDatabaseId, workspaceHasDatabase, setWorkspaceDatabase } from '@/lib/get-current-workspace'

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

// Add timeout utility function at the top level
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName: string
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // For fetch requests, we need to handle AbortController differently
    if (promise instanceof Promise && 'abort' in (promise as any)) {
      // This is likely a fetch request, pass the signal
      const result = await promise;
      clearTimeout(timeoutId);
      return result;
    } else {
      const result = await promise;
      clearTimeout(timeoutId);
      return result;
    }
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`${operationName} timed out after ${timeoutMs}ms`);
    }
    throw error;
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

// Database ID cache for projects (to avoid repeated lookups)
const projectDatabaseCache = new Map<string, { databaseId: number | null, timestamp: number }>()

/**
 * Fetch database ID directly from Supabase by project_id
 * This is a fallback when frontend fails to provide the database ID
 */
async function fetchDatabaseIdFromSupabase(projectId: string): Promise<number | null> {
  try {
    console.log(`[fetchDatabaseIdFromSupabase] 🔍 Querying Supabase for project: ${projectId}`)
    
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()
    
    const { data: database, error: dbError } = await supabase
      .from('databases')
      .select('id')
      .eq('project_id', projectId)
      .single()
    
    if (database?.id) {
      console.log(`[fetchDatabaseIdFromSupabase] ✅ Found database ID: ${database.id} for project: ${projectId}`)
      return database.id
    }
    
    console.warn(`[fetchDatabaseIdFromSupabase] ⚠️ No database found for project: ${projectId}`)
    if (dbError && dbError.code !== 'PGRST116') {
      console.error(`[fetchDatabaseIdFromSupabase] ❌ Database lookup error:`, dbError)
    }
    
    return null
  } catch (error) {
    console.error(`[fetchDatabaseIdFromSupabase] ❌ Failed to fetch database ID:`, error)
    return null
  }
}

// Helper function to get database ID for current project/workspace
async function getProjectDatabaseId(projectId: string): Promise<string | null> {
  try {
    // Check cache first (cache for 5 minutes)
    const cached = projectDatabaseCache.get(projectId)
    const now = Date.now()
    if (cached && (now - cached.timestamp) < 300000) { // 5 minutes
      return cached.databaseId?.toString() || null
    }

    // Get database ID from workspace
    const databaseId = await getWorkspaceDatabaseId(projectId)
    
    // Update cache
    projectDatabaseCache.set(projectId, { databaseId, timestamp: now })
    
    console.log(`[DATABASE] Project ${projectId} database ID: ${databaseId || 'none'}`)
    return databaseId?.toString() || null
  } catch (error) {
    console.error(`[DATABASE] Failed to get database ID for project ${projectId}:`, error)
    return null
  }
}

// Helper function to check if project has database
async function projectHasDatabase(projectId: string): Promise<boolean> {
  try {
    return await workspaceHasDatabase(projectId)
  } catch (error) {
    console.error(`[DATABASE] Failed to check database for project ${projectId}:`, error)
    return false
  }
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

// Filter function to remove reasoning/thinking patterns from model output
// This prevents models like Grok from exposing internal reasoning to users
function filterReasoningPatterns(text: string): string {
  if (!text) return text;

  // Patterns to remove (case-insensitive)
  const reasoningPatterns = [
    // Repetitive affirmations
    /^\s*Yes\.\s*$/gim,
    /^\s*Perfect\.\s*$/gim,
    /^\s*Great\.\s*$/gim,
    /^\s*Done\.\s*$/gim,
    /^\s*This is it\.\s*$/gim,
    /^\s*This is the (answer|solution|final|response)\.\s*$/gim,
    /^\s*The (answer|solution|response) is( ready| complete)?\.\s*$/gim,
    /^\s*The task is (complete|done)\.\s*$/gim,
    /^\s*The (end|final)\.\s*$/gim,
    /^\s*I think (this is|that's) (it|the answer|correct|good)\.\s*$/gim,

    // LaTeX/Math formatting (common in reasoning models)
    /\\boxed\{[^}]*\}/g,
    /Final Answer\s*:\s*/gi,
    /^\s*Final Answer\s*$/gim,

    // Internal monologue phrases
    /^\s*To (confirm|verify|check),/gim,
    /^\s*Let me (think|confirm|verify|check)/gim,
    /^\s*So,? the (answer|solution|response) is/gim,

    // Metacommentary about the response itself
    /^\s*The boxed (is|text|content|response)/gim,
    /^\s*The (response|answer|content) (is|will be)/gim,
  ];

  let filtered = text;

  // Apply all pattern filters
  for (const pattern of reasoningPatterns) {
    filtered = filtered.replace(pattern, '');
  }

  // Remove excessive newlines created by filtering
  filtered = filtered.replace(/\n{3,}/g, '\n\n');

  // If the entire text was reasoning noise, return empty string
  if (filtered.trim().length < 10 && /^(yes|no|perfect|great|done|ok)[\s.!]*$/i.test(filtered.trim())) {
    return '';
  }

  return filtered;
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

        // Check for large files and truncate if necessary to prevent response size issues
        const MAX_CONTENT_SIZE = 500000 // 500KB limit for content in response
        let wasTruncated = false
        if (content.length > MAX_CONTENT_SIZE) {
          content = content.substring(0, MAX_CONTENT_SIZE)
          wasTruncated = true
          console.log(`[CONSTRUCT_TOOL_RESULT] read_file: Content truncated to ${MAX_CONTENT_SIZE} chars for ${path}`)
        }

        console.log(`[CONSTRUCT_TOOL_RESULT] read_file: Successfully read ${path} (${content.length} chars${wasTruncated ? ' - TRUNCATED' : ''}, lines ${actualStartLine || 1}-${actualEndLine || 'end'})`)
        let response: any = {
          success: true,
          message: `✅ File ${path} read successfully${wasTruncated ? ` (content truncated to ${MAX_CONTENT_SIZE} characters)` : ''}.`,
          path,
          content,
          name: file.name,
          type: file.type,
          size: file.size,
          action: 'read',
          toolCallId
        }

        // Add truncation warning
        if (wasTruncated) {
          response.truncated = true
          response.maxContentSize = MAX_CONTENT_SIZE
          response.fullSize = fullContent.length
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
        const { filePath, searchReplaceBlock, useRegex = false, replaceAll = false } = input

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
        const originalLines = originalContent.split('\n')
        const originalLineCount = originalLines.length
        const { search, replace } = parsedBlock

        // Create backup for potential rollback
        const backupContent = originalContent

        let newContent = originalContent
        const appliedEdits = []
        const failedEdits = []
        let replacementCount = 0

        try {
          if (useRegex) {
            // Handle regex replacement
            const regexFlags = replaceAll ? 'g' : ''
            const regex = new RegExp(search, regexFlags)

            if (regex.test(originalContent)) {
              newContent = originalContent.replace(regex, replace)
              replacementCount = replaceAll ? (originalContent.match(regex) || []).length : 1

              appliedEdits.push({
                type: 'regex',
                pattern: search,
                replacement: replace,
                flags: regexFlags,
                occurrences: replacementCount,
                status: 'applied'
              })
            } else {
              failedEdits.push({
                type: 'regex',
                pattern: search,
                replacement: replace,
                status: 'failed',
                reason: 'Regex pattern not found in file content'
              })
            }
          } else {
            // Handle string replacement
            if (replaceAll) {
              // Replace all occurrences
              let occurrences = 0
              const allMatches = []
              let searchIndex = 0

              while ((searchIndex = newContent.indexOf(search, searchIndex)) !== -1) {
                allMatches.push(searchIndex)
                searchIndex += search.length
                occurrences++
              }

              if (occurrences > 0) {
                newContent = newContent.replaceAll(search, replace)
                replacementCount = occurrences

                appliedEdits.push({
                  type: 'string',
                  search: search,
                  replacement: replace,
                  occurrences: replacementCount,
                  positions: allMatches,
                  status: 'applied'
                })
              } else {
                failedEdits.push({
                  type: 'string',
                  search: search,
                  replacement: replace,
                  status: 'failed',
                  reason: 'Search text not found in file content'
                })
              }
            } else {
              // Replace first occurrence only
              if (newContent.includes(search)) {
                const searchIndex = newContent.indexOf(search)
                newContent = newContent.replace(search, replace)
                replacementCount = 1

                appliedEdits.push({
                  type: 'string',
                  search: search,
                  replacement: replace,
                  occurrences: 1,
                  position: searchIndex,
                  status: 'applied'
                })
              } else {
                failedEdits.push({
                  type: 'string',
                  search: search,
                  replacement: replace,
                  status: 'failed',
                  reason: 'Search text not found in file content'
                })
              }
            }
          }

          const newLines = newContent.split('\n')
          const newLineCount = newLines.length

          // Update the file in memory
          if (appliedEdits.length > 0) {
            file.content = newContent
            file.size = newContent.length

            return {
              success: true,
              message: `✅ File ${filePath} modified successfully (${replacementCount} replacement${replacementCount !== 1 ? 's' : ''}).`,
              path: filePath,
              originalContent,
              newContent,
              appliedEdits,
              failedEdits,
              stats: {
                originalSize: originalContent.length,
                newSize: newContent.length,
                originalLines: originalLineCount,
                newLines: newLineCount,
                replacements: replacementCount
              },
              backupAvailable: true,
              action: 'modified',
              toolCallId
            }
          } else {
            return {
              success: false,
              error: `Failed to apply edit: ${failedEdits[0]?.reason || 'Unknown error'}`,
              filePath,
              appliedEdits,
              failedEdits,
              toolCallId
            }
          }
        } catch (editError) {
          console.error(`[CONSTRUCT_TOOL_RESULT] Edit error:`, editError)
          return {
            success: false,
            error: `Edit failed: ${editError instanceof Error ? editError.message : 'Unknown error'}`,
            filePath,
            toolCallId
          }
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

      case 'create_database': {
        const { name = 'main' } = input

        // Validate inputs
        if (name && typeof name !== 'string') {
          console.log(`[CONSTRUCT_TOOL_RESULT] create_database failed: Invalid database name - ${name}`)
          return {
            success: false,
            error: `Invalid database name provided`,
            name,
            toolCallId
          }
        }

        // Always return success - simple response without IDs or save attempts
        console.log(`[CONSTRUCT_TOOL_RESULT] create_database: Database "${name}" created for project ${projectId}`)

        // Users table schema (matching create route)
        const usersTableSchema = {
          columns: [
            { 
              name: 'id', 
              type: 'uuid', 
              primary_key: true, 
              required: true,
              default: 'gen_random_uuid()',
              description: 'Unique identifier for each user'
            },
            { 
              name: 'email', 
              type: 'text', 
              unique: true, 
              required: true,
              description: 'User email address (unique)'
            },
            { 
              name: 'password_hash', 
              type: 'text', 
              required: true,
              description: 'Hashed password for authentication'
            },
            { 
              name: 'full_name', 
              type: 'text', 
              required: false,
              description: 'User full name (optional)'
            },
            { 
              name: 'avatar_url', 
              type: 'text', 
              required: false,
              description: 'URL to user avatar image (optional)'
            },
            { 
              name: 'created_at', 
              type: 'timestamp', 
              required: true,
              default: 'NOW()',
              description: 'Timestamp when user was created'
            },
            { 
              name: 'updated_at', 
              type: 'timestamp', 
              required: true,
              default: 'NOW()',
              description: 'Timestamp when user was last updated'
            }
          ]
        }
        
        return {
          success: true,
          message: `✅ Database "${name}" created successfully with auto-generated users table`,
          name,
          action: 'created',
          schema: {
            users: usersTableSchema
          },
          tableCount: 1,
          details: {
            databaseName: name,
            tablesCreated: ['users'],
            usersTableColumns: usersTableSchema.columns.length,
            primaryKey: 'id (uuid)',
            authentication: 'email + password_hash',
            timestamps: 'created_at, updated_at',
            optional_fields: ['full_name', 'avatar_url']
          },
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
  
  // Add overall request timeout to stay under Vercel's 300s limit
  const REQUEST_TIMEOUT_MS = 290000; // 290 seconds (5s buffer under 300s limit)
  const STREAM_CONTINUE_THRESHOLD_MS = 260000; // 260 seconds - trigger continuation earlier for smoother UX
  const WARNING_TIME_MS = 220000; // Warn at 220 seconds (70 seconds remaining)
  const controller = new AbortController();
  const requestTimeoutId = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  // Track tool execution times
  const toolExecutionTimes: Record<string, number> = {};

  // Helper function to check remaining time and create timeout warnings
  const getTimeStatus = () => {
    const elapsed = Date.now() - startTime;
    const remaining = REQUEST_TIMEOUT_MS - elapsed;
    const shouldContinue = elapsed >= STREAM_CONTINUE_THRESHOLD_MS;
    const isApproachingTimeout = elapsed >= WARNING_TIME_MS;

    return {
      elapsed,
      remaining,
      shouldContinue,
      isApproachingTimeout,
      warningMessage: isApproachingTimeout
        ? `⚠️ TIME WARNING: ${Math.round(remaining / 1000)} seconds remaining. Please provide final summary and avoid additional tool calls.`
        : null
    };
  };

  try {
    const body = await req.json()
    let {
      messages = [], // Default to empty array if not provided
      projectId,
      project,
      databaseId, // Database ID from request payload
      files = [], // Default to empty array
      fileTree, // Client-built file tree
      modelId,
      aiMode,
      continuationState, // New field for stream continuation
      // toolResult // New field for client-side tool results - DISABLED
    } = body

    // Handle client-side tool results - DISABLED
    /*
    if (toolResult) {
      console.log('[Chat-V2] Processing client-side tool result:', toolResult.toolName);

       // Create a tool result message to continue the conversation
      const toolResultMessage = {
        role: 'user',
        content: JSON.stringify(toolResult.result),
        name: toolResult.toolName,
        tool_call_id: `client-tool-${Date.now()}` // Generate a unique tool call ID
      };

      // Add the tool result to messages
      messages = [...messages, toolResultMessage];

      // Continue with normal processing but with the tool result included
    }
    */
      
    // 🔥 CRITICAL FALLBACK: If frontend didn't provide databaseId, fetch it from Supabase
    // This ensures all server-side database tools have access to the database ID
    if (!databaseId && projectId) {
      console.log(`[Chat-V2] 🔍 No databaseId provided by frontend, attempting fallback fetch for project: ${projectId}`)
      
      try {
        // Fetch directly from Supabase
        const fetchedDatabaseId = await fetchDatabaseIdFromSupabase(projectId)
        
        if (fetchedDatabaseId) {
          databaseId = fetchedDatabaseId
          console.log(`[Chat-V2] ✅ Fallback successful: Using database ID ${databaseId} for project: ${projectId}`)
          
          // Cache it for future requests (5 minute cache)
          projectDatabaseCache.set(projectId, { databaseId, timestamp: Date.now() })
          
          // Also update IndexedDB cache via the workspace helper
          try {
            await setWorkspaceDatabase(projectId, databaseId)
            console.log(`[Chat-V2] 💾 Cached database ID in IndexedDB for future requests`)
          } catch (cacheError) {
            console.warn(`[Chat-V2] ⚠️ Failed to cache database ID in IndexedDB:`, cacheError)
          }
        } else {
          console.warn(`[Chat-V2] ⚠️ Fallback failed: No database found for project: ${projectId}`)
        }
      } catch (fallbackError) {
        console.error(`[Chat-V2] ❌ Fallback error while fetching database ID:`, fallbackError)
      }
    } else if (databaseId) {
      console.log(`[Chat-V2] ✅ Database ID provided by frontend: ${databaseId}`)
    } else {
      console.warn(`[Chat-V2] ⚠️ No projectId available, cannot fetch database ID`)
    }

    // Handle stream continuation
    let isContinuation = false
    let previousMessages: any[] = []
    let previousToolResults: any[] = []
    let processedMessages: any[] = []

    if (continuationState) {
      isContinuation = true
      console.log('[Chat-V2] Processing stream continuation:', continuationState.continuationToken)

      // Restore previous state
      previousMessages = continuationState.messages || []
      previousToolResults = continuationState.toolResults || []

      // Override session data with continuation state
      if (continuationState.sessionData) {
        projectId = continuationState.sessionData.projectId || projectId
        modelId = continuationState.sessionData.modelId || modelId
        aiMode = continuationState.sessionData.aiMode || aiMode
        fileTree = continuationState.sessionData.fileTree || fileTree
        files = continuationState.sessionData.files || files
      }

      // Merge previous messages with current messages
      const combinedMessages = [...previousMessages]
      messages.forEach((msg: any) => {
        // Avoid duplicates
        if (!combinedMessages.some(existing => existing.timestamp === msg.timestamp)) {
          combinedMessages.push(msg)
        }
      })

      // Update processedMessages to include continuation context
      processedMessages = combinedMessages
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
        // Keep more history for continuations (last 10 pairs = 20 messages max)
        .slice(-20)

      console.log(`[Chat-V2] Continuation: Restored ${previousMessages.length} messages, ${previousToolResults.length} tool results`)
    }

    // Validate messages is an array
    if (!Array.isArray(messages)) {
      console.error('[Chat-V2] Invalid messages format:', typeof messages)
      return NextResponse.json({
        error: 'Invalid messages format - must be an array'
      }, { status: 400 })
    }

    // Process messages for non-continuation requests
    if (!isContinuation) {
      processedMessages = messages
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
    }

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
    let clientFiles = files || []
    let clientFileTree = fileTree || []
    console.log(`[DEBUG] Initializing in-memory storage with ${clientFiles.length} files and ${clientFileTree.length} tree entries for session ${projectId}`)

    // Create in-memory storage for this session
    const sessionFiles = new Map<string, any>()

    // Restore session storage from continuation state if available
    if (isContinuation && continuationState.sessionStorage) {
      console.log('[Chat-V2] Restoring session storage from continuation state')

      // Restore file tree
      if (continuationState.sessionStorage.fileTree) {
        clientFileTree = continuationState.sessionStorage.fileTree
      }

      // Restore files
      if (continuationState.sessionStorage.files) {
        continuationState.sessionStorage.files.forEach((fileEntry: any) => {
          const fileData = {
            workspaceId: fileEntry.data.workspaceId,
            name: fileEntry.data.name,
            path: fileEntry.path,
            content: fileEntry.data.content,
            fileType: fileEntry.data.fileType,
            type: fileEntry.data.type,
            size: fileEntry.data.size,
            isDirectory: fileEntry.data.isDirectory
          }
          sessionFiles.set(fileEntry.path, fileData)
          console.log(`[DEBUG] Restored file from continuation: ${fileEntry.path}`)
        })
      }

      console.log(`[DEBUG] Restored ${sessionFiles.size} files from continuation state`)
    } else {
      // Normal initialization
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
    let systemPrompt = `
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
- **Client-Side (IndexedDB)**: \`read_file\` (with line numbers), \`write_file\`, \`edit_file\`, \`delete_file\`, \`add_package\`, \`remove_package\`, \`create_database\`
- **Server-Side**: \`web_search\`, \`web_extract\`, \`semantic_code_navigator\` (with line numbers),\`grep_search\`, \`check_dev_errors\`, \`list_files\` (client sync), \`read_file\` (client sync)
- **Database Tools**: \`create_table\`, \`list_tables\`, \`read_table\`, \`delete_table\`, \`query_database\`, \`manipulate_table_data\`, \`manage_api_keys\`

## PiPilot DB Integration
For **authentication, database, or file storage**:
- 📚 Review \`USER_AUTHENTICATION_README.md\` for authentication patterns
- 📚 Review \`STORAGE_SYSTEM_IMPLEMENTATION.md\` for file storage
- 📚 Reference \`EXTERNAL_APP_INTEGRATION_GUIDE.md\` for API integration
- 🛠️ Strictly use documented patterns and endpoints

### 🗄️ Database Automation Tools
**Complete database workflow in 7 simple steps:**
1. **\`create_database\`** - Creates database with auto-generated users table (client-side)
2. **\`create_table\`** - AI-powered schema generation from natural language descriptions
3. **\`list_tables\`** - Discover all tables in a database with optional schema and record counts
4. **\`read_table\`** - Get detailed table info, schema, structure, and statistics
5. **\`delete_table\`** - Delete a table and all its records (destructive, requires confirmation)
6. **\`query_database\`** - Advanced MySQL-like querying with auto-detection, filtering, sorting, pagination
7. **\`manipulate_table_data\`** - Full CRUD operations (insert, update, delete) with bulk support
8. **\`manage_api_keys\`** - Generate secure API keys for external database access

**Features:**
- 🤖 **AI Schema Generation**: Describe your table needs, get optimized database schema
- 🔍 **Auto-Detection**: Tools automatically find your project's database
- 📋 **Table Discovery**: List all tables with schemas and record counts before operations
- 📖 **Table Inspection**: Read detailed table structure and metadata
- 🗑️ **Safe Deletion**: Delete tables with confirmation safeguards
- 🚀 **MySQL-Like Syntax**: Familiar WHERE, ORDER BY, JOIN operations  
- 📊 **Advanced Queries**: JSONB field querying, complex filtering, pagination
- 🔐 **Secure Access**: API key management for external integrations
- ⚡ **Bulk Operations**: Insert/update multiple records efficiently

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
- ⛔ NEVER output internal reasoning, thinking, or step-by-step thought processes
- ⛔ NEVER use phrases like "Yes.", "Perfect.", "This is it.", "The answer is", "Final Answer", or similar internal monologue
- ⛔ NEVER use LaTeX math formatting like \boxed{} or similar academic response patterns
- ✅ Always respond directly and professionally without exposing your thinking process
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

    // Add continuation instructions if this is a continuation request
    if (isContinuation) {
      systemPrompt += `

## 🔄 STREAM CONTINUATION MODE
**IMPORTANT**: This is a continuation of a previous conversation that was interrupted due to time constraints. You must continue exactly where you left off without repeating previous content or restarting your response.

**Continuation Context:**
- Previous response was interrupted after ${Math.round((continuationState.elapsedTimeMs || 0) / 1000)} seconds
- ${previousToolResults.length} tool operations were completed
- Continue your response seamlessly as if the interruption never happened
- Do not repeat any content you already provided
- Pick up exactly where your previous response ended

**Instructions:**
✅ Continue your response naturally
✅ Reference any completed tool results
✅ Maintain the same tone and style
❌ Do not repeat previous content
❌ Do not apologize for the interruption
❌ Do not mention being a "continuation"`
    }

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
          description: 'Read the contents of a file with optional line number information or specific line ranges. Large files (>500KB) will be truncated to prevent response size issues. This tool executes on the server-side to ensure the AI sees the most current file content.',
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
          description: 'Edit an existing file using search/replace blocks with advanced options. Supports regex patterns, multiple replacements, and detailed diff reporting. This tool executes on the client-side IndexedDB.',
          inputSchema: z.object({
            filePath: z.string().describe('The file path relative to project root'),
            searchReplaceBlock: z.string().describe(`Search/replace block in format:
<<<<<<< SEARCH
[exact code to find]
=======
[new code to replace with]
>>>>>>> REPLACE`),
            useRegex: z.boolean().optional().describe('Whether to treat search as regex pattern (default: false)'),
            replaceAll: z.boolean().optional().describe('Whether to replace all occurrences (default: false, replaces first occurrence only)')
          }),
          execute: async ({ filePath, searchReplaceBlock, useRegex = false, replaceAll = false }, { toolCallId }) => {
            // Use the powerful constructor to get actual results
            return await constructToolResult('edit_file', { filePath, searchReplaceBlock, useRegex, replaceAll }, projectId, toolCallId)
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
            const toolStartTime = Date.now();
            const timeStatus = getTimeStatus();

            if (abortSignal?.aborted) {
              throw new Error('Operation cancelled')
            }

            // Check if we're approaching timeout
            if (timeStatus.isApproachingTimeout) {
              return {
                success: false,
                error: `Web search cancelled due to timeout warning: ${timeStatus.warningMessage}`,
                query,
                toolCallId,
                executionTimeMs: Date.now() - toolStartTime,
                timeWarning: timeStatus.warningMessage
              }
            }
            
            try {
              // Add strict 20-second timeout to prevent hanging
              const searchResults = await withTimeout(
                searchWeb(query),
                20000, // Reduced from 30000 (30s) to 20000 (20s) - stricter timeout
                'Web search'
              )

              const executionTime = Date.now() - toolStartTime;
              toolExecutionTimes['web_search'] = (toolExecutionTimes['web_search'] || 0) + executionTime;
              
              // More generous truncation for 256k context models (50k total limit)
              const MAX_SEARCH_CHARS = 50000;
              let cleanResults = searchResults.cleanedResults;
              let wasTruncated = false;
              
              if (cleanResults.length > MAX_SEARCH_CHARS) {
                cleanResults = cleanResults.substring(0, MAX_SEARCH_CHARS);
                wasTruncated = true;
              }
              
              return {
                success: true,
                message: `Web search completed successfully for query: "${query}"${wasTruncated ? ` (truncated to ${MAX_SEARCH_CHARS} chars)` : ''}`,
                // Send clean, structured text instead of raw JSON
                cleanResults,
                // Keep minimal metadata for reference
                metadata: {
                  query: searchResults.query,
                  resultCount: searchResults.resultCount,
                  originalLength: searchResults.cleanedResults.length,
                  finalLength: cleanResults.length,
                  wasTruncated,
                  maxChars: MAX_SEARCH_CHARS
                },
                query,
                toolCallId,
                executionTimeMs: executionTime,
                timeWarning: timeStatus.warningMessage
              }
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error'
              console.error('[ERROR] web_search failed:', error)
              
              return { 
                success: false, 
                error: `Web search failed: ${errorMessage}`,
                query,
                toolCallId,
                executionTimeMs: Date.now() - toolStartTime,
                timeWarning: timeStatus.warningMessage
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
            const toolStartTime = Date.now();
            const timeStatus = getTimeStatus();

            if (abortSignal?.aborted) {
              throw new Error('Operation cancelled')
            }

            // Check if we're approaching timeout
            if (timeStatus.isApproachingTimeout) {
              return {
                success: false,
                error: `Web extraction cancelled due to timeout warning: ${timeStatus.warningMessage}`,
                urls: Array.isArray(urls) ? urls : [urls],
                toolCallId,
                executionTimeMs: Date.now() - toolStartTime,
                timeWarning: timeStatus.warningMessage
              }
            }
            
            // Ensure urls is always an array
            const urlArray = Array.isArray(urls) ? urls : [urls];
            
            try {
              // Import the web scraper
              const { webScraper } = await import('@/lib/web-scraper');
              
              // Process URLs sequentially to manage API key usage, but with strict 30s total timeout
              const extractPromise = Promise.all(
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

              // Add strict 30-second timeout but return partial results if available
              let extractionResults: any[];
              try {
                extractionResults = await withTimeout(
                  extractPromise,
                  30000, // Reduced from 45000 (45s) to 30000 (30s) - stricter timeout
                  'Web content extraction'
                );
              } catch (timeoutError) {
                // If we timeout, try to get partial results from any completed extractions
                console.warn('[WEB_EXTRACT] Timeout occurred, attempting to return partial results');
                try {
                  // Race the original promise against a very short timeout to get any completed results
                  extractionResults = await Promise.race([
                    extractPromise,
                    new Promise<any[]>((_, reject) => setTimeout(() => reject(new Error('Partial timeout')), 1000))
                  ]);
                } catch (partialError) {
                  // If even partial results aren't available quickly, return empty results
                  extractionResults = urlArray.map(url => ({
                    success: false,
                    url,
                    error: 'Extraction timed out - no partial results available',
                    cleanResults: ''
                  }));
                }
              }

              const executionTime = Date.now() - toolStartTime;
              toolExecutionTimes['web_extract'] = (toolExecutionTimes['web_extract'] || 0) + executionTime;
              
              // Separate successful and failed extractions
              const successfulResults = extractionResults.filter(result => result.success);
              const failedResults = extractionResults.filter(result => !result.success);
              
              // More generous truncation for 256k context models (15k per URL, 75k total)
              const MAX_CHARS_PER_URL = 15000;
              const MAX_TOTAL_CHARS = 75000;
              
              let totalCharsUsed = 0;
              const truncatedResults = successfulResults.map(result => {
                const originalLength = result.cleanResults.length;
                let truncatedContent = result.cleanResults;
                let wasTruncated = false;
                let truncationReason = '';
                
                // Check per-URL limit
                if (originalLength > MAX_CHARS_PER_URL) {
                  truncatedContent = result.cleanResults.substring(0, MAX_CHARS_PER_URL);
                  wasTruncated = true;
                  truncationReason = `per-URL limit (${MAX_CHARS_PER_URL} chars)`;
                }
                
                // Check total limit (but don't truncate if we're the first result)
                if (totalCharsUsed + truncatedContent.length > MAX_TOTAL_CHARS && successfulResults.indexOf(result) > 0) {
                  const remainingChars = MAX_TOTAL_CHARS - totalCharsUsed;
                  if (remainingChars > 1000) { // Only include if we can fit meaningful content
                    truncatedContent = truncatedContent.substring(0, remainingChars);
                    wasTruncated = true;
                    truncationReason = `total limit (${MAX_TOTAL_CHARS} chars)`;
                  } else {
                    truncatedContent = ''; // Skip this result entirely
                    wasTruncated = true;
                    truncationReason = 'total limit exceeded';
                  }
                }
                
                totalCharsUsed += truncatedContent.length;
                
                return {
                  ...result,
                  cleanResults: truncatedContent,
                  wasTruncated,
                  originalLength,
                  truncationReason: wasTruncated ? truncationReason : undefined
                };
              });
              
              // Debug logging for final result
              console.log('[DEBUG] Web extract final result:', {
                totalUrls: urlArray.length,
                successfulCount: successfulResults.length,
                failedCount: failedResults.length,
                totalCharsUsed,
                maxTotalChars: MAX_TOTAL_CHARS,
                maxPerUrlChars: MAX_CHARS_PER_URL,
                cleanResultsLength: truncatedResults.map(r => r.cleanResults?.length || 0),
                truncatedCount: truncatedResults.filter(r => r.wasTruncated).length,
                sampleCleanResults: truncatedResults[0]?.cleanResults?.substring(0, 200) || 'none'
              });
              
              return {
                success: successfulResults.length > 0,
                message: successfulResults.length > 0 
                  ? `Successfully extracted content from ${successfulResults.length} URL(s)${truncatedResults.some(r => r.wasTruncated) ? ` (truncated to fit ${MAX_TOTAL_CHARS} char limit)` : ''}` 
                  : 'Failed to extract content from any URLs',
                cleanResults: truncatedResults.map(result => result.cleanResults).join('\n\n'),
                metadata: {
                  successCount: successfulResults.length,
                  failedCount: failedResults.length,
                  urls: urlArray,
                  totalCharsUsed,
                  maxTotalChars: MAX_TOTAL_CHARS,
                  maxPerUrlChars: MAX_CHARS_PER_URL,
                  truncationInfo: truncatedResults.map(r => ({
                    url: r.url,
                    originalLength: r.originalLength,
                    finalLength: r.cleanResults.length,
                    wasTruncated: r.wasTruncated,
                    truncationReason: r.truncationReason
                  }))
                },
                toolCallId,
                executionTimeMs: executionTime,
                timeWarning: timeStatus.warningMessage
              };
            } catch (error) {
              const executionTime = Date.now() - toolStartTime;
              toolExecutionTimes['web_extract'] = (toolExecutionTimes['web_extract'] || 0) + executionTime;
              
              console.error('[ERROR] Web extract failed:', error);
              
              return { 
                success: false, 
                error: `Web extract failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                cleanResults: '',
                metadata: {
                  urls: urlArray
                },
                toolCallId,
                executionTimeMs: executionTime,
                timeWarning: timeStatus.warningMessage
              };
            }
          }
        }),

        semantic_code_navigator: tool({
          description: 'Advanced semantic code search and analysis tool with cross-reference tracking and result grouping. Finds code patterns, structures, and relationships with high accuracy. Supports natural language queries, framework-specific patterns, and detailed code analysis.',
          inputSchema: z.object({
            query: z.string().describe('Natural language description of what to search for (e.g., "find React components with useState", "show API endpoints", "locate error handling", "find database models")'),
            filePath: z.string().optional().describe('Optional: Specific file path to search within. If omitted, searches the entire workspace'),
            fileType: z.string().optional().describe('Optional: Filter by file type (e.g., "tsx", "ts", "js", "py", "md")'),
            maxResults: z.number().optional().describe('Maximum number of results to return (default: 20)'),
            analysisDepth: z.enum(['basic', 'detailed', 'comprehensive']).optional().describe('Analysis depth: basic (fast), detailed (balanced), comprehensive (thorough but slower)'),
            includeDependencies: z.boolean().optional().describe('Include related code dependencies and relationships (default: false)'),
            enableCrossReferences: z.boolean().optional().describe('Enable cross-reference tracking to find all usages of functions/variables (default: false)'),
            groupByFunctionality: z.boolean().optional().describe('Group results by functionality (components, APIs, utilities, etc.) (default: false)')
          }),
          execute: async ({ query, filePath, fileType, maxResults = 20, analysisDepth = 'detailed', includeDependencies = false, enableCrossReferences = false, groupByFunctionality = false }, { abortSignal, toolCallId }) => {
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

              // Perform cross-reference tracking if requested
              let crossReferences: any[] = []
              if (enableCrossReferences && uniqueResults.length > 0) {
                // Find all function/variable/class definitions from the results
                const definitions = uniqueResults.filter(result =>
                  ['function', 'async_function', 'react_component', 'hook_definition', 'class', 'typescript_interface', 'typescript_type'].includes(result.type)
                )

                // Extract identifiers from definitions
                const identifiers = definitions.map(def => {
                  // Extract the identifier name from the match
                  const match = def.match
                  if (def.type === 'react_component') {
                    const componentMatch = match.match(/(?:const|function)\s+(\w+)/)
                    return componentMatch ? componentMatch[1] : null
                  } else if (def.type === 'typescript_interface' || def.type === 'typescript_type') {
                    const typeMatch = match.match(/(?:interface|type)\s+(\w+)/)
                    return typeMatch ? typeMatch[1] : null
                  } else if (def.type === 'hook_definition') {
                    const hookMatch = match.match(/function\s+(use\w+)/)
                    return hookMatch ? hookMatch[1] : null
                  } else if (def.type === 'function' || def.type === 'async_function') {
                    const funcMatch = match.match(/(?:function|const|let|var)\s+(\w+)/)
                    return funcMatch ? funcMatch[1] : null
                  } else if (def.type === 'class') {
                    const classMatch = match.match(/(?:class|interface|type)\s+(\w+)/)
                    return classMatch ? classMatch[1] : null
                  }
                  return null
                }).filter(Boolean)

                // Search for usages of these identifiers across all files
                const usageResults: any[] = []
                for (const file of filesToSearch) {
                  if (!file.content || file.isDirectory) continue

                  const content = file.content
                  const fileLines = content.split('\n')

                  identifiers.forEach(identifier => {
                    // Create regex to find usages (word boundaries, property access, function calls)
                    const usageRegex = new RegExp(`\\b${identifier}\\b`, 'g')
                    let match: RegExpExecArray | null
                    while ((match = usageRegex.exec(content)) !== null) {
                      // Ensure match is not null (TypeScript guard)
                      if (!match) continue

                      const matchIndex = match.index

                      // Skip the definition itself
                      const isDefinition = definitions.some(def =>
                        def.file === file.path &&
                        Math.abs(def.lineNumber - (content.substring(0, matchIndex).split('\n').length)) <= 2
                      )
                      if (isDefinition) continue
                      let lineNumber = 1
                      let charCount = 0
                      for (let i = 0; i < fileLines.length; i++) {
                        charCount += fileLines[i].length + 1
                        if (charCount > matchIndex) {
                          lineNumber = i + 1
                          break
                        }
                      }

                      // Extract context
                      const startLine = Math.max(1, lineNumber - 1)
                      const endLine = Math.min(fileLines.length, lineNumber + 1)
                      const contextLines = fileLines.slice(startLine - 1, endLine)
                      const contextWithNumbers = contextLines.map((line: string, idx: number) =>
                        `${String(startLine + idx).padStart(4, ' ')}: ${line}`
                      ).join('\n')

                      usageResults.push({
                        identifier,
                        file: file.path,
                        lineNumber,
                        context: contextWithNumbers,
                        usage: match[0]
                      })
                    }
                  })
                }

                crossReferences = usageResults
              }

              // Group results by functionality if requested
              let groupedResults: any = null
              if (groupByFunctionality && uniqueResults.length > 0) {
                const groups: { [key: string]: any[] } = {
                  components: [],
                  apis: [],
                  utilities: [],
                  types: [],
                  configuration: [],
                  tests: [],
                  styling: [],
                  other: []
                }

                uniqueResults.forEach(result => {
                  switch (result.type) {
                    case 'react_component':
                      groups.components.push(result)
                      break
                    case 'api_route':
                    case 'async_function':
                      groups.apis.push(result)
                      break
                    case 'hook_definition':
                    case 'function':
                      groups.utilities.push(result)
                      break
                    case 'typescript_interface':
                    case 'typescript_type':
                      groups.types.push(result)
                      break
                    case 'configuration':
                      groups.configuration.push(result)
                      break
                    case 'test_case':
                      groups.tests.push(result)
                      break
                    case 'styling':
                      groups.styling.push(result)
                      break
                    default:
                      groups.other.push(result)
                  }
                })

                // Remove empty groups
                Object.keys(groups).forEach(key => {
                  if (groups[key].length === 0) {
                    delete groups[key]
                  }
                })

                groupedResults = groups
              }

              return {
                success: true,
                message: `Found ${uniqueResults.length} code sections matching "${query}" (sorted by relevance)`,
                query,
                results: uniqueResults,
                totalResults: uniqueResults.length,
                dependencyAnalysis,
                crossReferences: crossReferences.length > 0 ? crossReferences : undefined,
                groupedResults,
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

        grep_search: tool({
          description: 'Elite multi-strategy search tool combining literal text, regex, and semantic pattern matching. Features intelligent fallbacks, relevance scoring, code pattern detection, and comprehensive diagnostics. Rivals semantic_code_navigator with additional precision control.',
          inputSchema: z.object({
            query: z.string().describe('Search query - supports literal text, regex patterns, or natural language descriptions (e.g., "useState", "function.*async", "find React components")'),
            includePattern: z.string().optional().describe('Glob pattern to filter files (e.g., "**/*.ts,**/*.tsx" for TypeScript, "src/**" for src folder)'),
            excludePattern: z.string().optional().describe('Glob pattern to exclude files (e.g., "**/*.test.ts,**/node_modules/**")'),
            isRegexp: z.boolean().optional().describe('Whether query is a regex pattern (default: false). Auto-detected if query contains regex syntax.'),
            maxResults: z.number().optional().describe('Maximum results to return (default: 100, max: 500)'),
            caseSensitive: z.boolean().optional().describe('Case-sensitive search (default: false)'),
            searchMode: z.enum(['literal', 'regex', 'semantic', 'hybrid']).optional().describe('Search strategy: literal (exact text), regex (pattern), semantic (code patterns), hybrid (all strategies, default)'),
            enableSmartPatterns: z.boolean().optional().describe('Enable intelligent code pattern detection like semantic_code_navigator (default: true in hybrid mode)'),
            sortByRelevance: z.boolean().optional().describe('Sort results by relevance score instead of file path (default: true)'),
            includeContext: z.boolean().optional().describe('Include surrounding code context (default: true)'),
            contextLines: z.number().optional().describe('Number of context lines before/after match (default: 3, max: 10)')
          }),
          execute: async ({ 
            query, 
            includePattern, 
            excludePattern,
            isRegexp = false, 
            maxResults = 100, 
            caseSensitive = false,
            searchMode = 'hybrid',
            enableSmartPatterns = true,
            sortByRelevance = true,
            includeContext = true,
            contextLines = 3
          }, { toolCallId }) => {
            try {
              // Clamp and validate inputs
              maxResults = Math.min(Math.max(maxResults, 1), 500)
              const actualContextLines = Math.min(Math.max(contextLines, 0), 10)
              
              console.log(`[grep_search] ⚡ ELITE SEARCH MODE: "${searchMode}" | Query: "${query}"`)
              console.log(`[grep_search] Settings: regexp=${isRegexp}, case=${caseSensitive}, patterns=${enableSmartPatterns}, relevance=${sortByRelevance}`)
              
              // 🚀 STRATEGY 1: Try Session Storage First
              let sessionData = sessionProjectStorage.get(projectId)
              let filesSource = 'session'
              
              // 🚀 STRATEGY 2: Fallback to IndexedDB if session empty
              if (!sessionData || !sessionData.files || sessionData.files.size === 0) {
                console.log(`[grep_search] 🔄 Session storage empty, attempting IndexedDB fallback...`)
                
                try {
                  const storage = await getStorageManager()
                  const workspaceFiles = await storage.getFiles(projectId)
                  
                  if (workspaceFiles && workspaceFiles.length > 0) {
                    console.log(`[grep_search] ✅ IndexedDB fallback successful! Loaded ${workspaceFiles.length} files`)
                    
                    // Build session-like structure from IndexedDB
                    const filesMap = new Map()
                    for (const file of workspaceFiles) {
                      if (file.path && file.content) {
                        filesMap.set(file.path, {
                          workspaceId: projectId,
                          name: file.name || file.path.split('/').pop(),
                          path: file.path,
                          content: file.content,
                          fileType: file.type || file.fileType || 'text',
                          type: file.type || file.fileType || 'text',
                          size: file.size || file.content.length,
                          isDirectory: false
                        })
                      }
                    }
                    
                    sessionData = {
                      fileTree: workspaceFiles.map((f: any) => f.path),
                      files: filesMap
                    }
                    
                    // Cache it for future use
                    sessionProjectStorage.set(projectId, sessionData)
                    filesSource = 'indexeddb'
                  }
                } catch (indexedDBError) {
                  console.error(`[grep_search] IndexedDB fallback failed:`, indexedDBError)
                }
              }
              
              // Final validation
              if (!sessionData || !sessionData.files || sessionData.files.size === 0) {
                console.error(`[grep_search] ❌ No file source available (tried session + IndexedDB)`)
                return {
                  success: false,
                  error: `No files available for search. Session storage and IndexedDB are both empty. Please load files first using list_files tool.`,
                  query,
                  diagnostics: {
                    sessionStorageAvailable: false,
                    indexedDBAttempted: true,
                    totalSessionProjects: sessionProjectStorage.size,
                    filesSource: 'none'
                  },
                  toolCallId
                }
              }

              const { files: sessionFiles } = sessionData
              console.log(`[grep_search] ✅ Files loaded from ${filesSource}: ${sessionFiles.size} total files`)

              // Convert session files to array
              let filesToSearch = Array.from(sessionFiles.values())
              console.log(`[grep_search] 📂 Initial files array: ${filesToSearch.length} files`)

              // Log first few file paths for debugging
              const samplePaths = filesToSearch.slice(0, 5).map((f: any) => f.path)
              console.log(`[grep_search] 📝 Sample file paths:`, samplePaths)

              // 🎯 Advanced Glob Pattern Filtering
              if (includePattern) {
                const beforeFilter = filesToSearch.length
                const patterns = includePattern.split(',').map((p: string) => p.trim())
                console.log(`[grep_search] 🔍 Applying INCLUDE patterns:`, patterns)
                
                filesToSearch = filesToSearch.filter((file: any) => {
                  const filePath = file.path.toLowerCase()
                  return patterns.some((pattern: string) => {
                    const lowerPattern = pattern.toLowerCase()
                    if (lowerPattern.includes('*')) {
                      const regexPattern = lowerPattern
                        .replace(/\*\*/g, '__DOUBLE_STAR__')
                        .replace(/\*/g, '[^/]*')
                        .replace(/__DOUBLE_STAR__/g, '.*')
                        .replace(/\?/g, '[^/]')
                      try {
                        return new RegExp(regexPattern).test(filePath)
                      } catch (e) {
                        console.warn(`[grep_search] ⚠️  Invalid glob pattern: ${pattern}`, e)
                        return false
                      }
                    }
                    return filePath.includes(lowerPattern) || filePath.endsWith(lowerPattern)
                  })
                })
                console.log(`[grep_search] ✅ After INCLUDE filter: ${beforeFilter} -> ${filesToSearch.length} files`)
              }

              // 🚫 Exclude Pattern Filtering
              if (excludePattern) {
                const beforeFilter = filesToSearch.length
                const patterns = excludePattern.split(',').map((p: string) => p.trim())
                console.log(`[grep_search] 🚫 Applying EXCLUDE patterns:`, patterns)
                
                filesToSearch = filesToSearch.filter((file: any) => {
                  const filePath = file.path.toLowerCase()
                  return !patterns.some((pattern: string) => {
                    const lowerPattern = pattern.toLowerCase()
                    if (lowerPattern.includes('*')) {
                      const regexPattern = lowerPattern
                        .replace(/\*\*/g, '__DOUBLE_STAR__')
                        .replace(/\*/g, '[^/]*')
                        .replace(/__DOUBLE_STAR__/g, '.*')
                        .replace(/\?/g, '[^/]')
                      try {
                        return new RegExp(regexPattern).test(filePath)
                      } catch (e) {
                        return false
                      }
                    }
                    return filePath.includes(lowerPattern) || filePath.endsWith(lowerPattern)
                  })
                })
                console.log(`[grep_search] ✅ After EXCLUDE filter: ${beforeFilter} -> ${filesToSearch.length} files`)
              }

              // Filter out directories and files without content
              const beforeContentFilter = filesToSearch.length
              filesToSearch = filesToSearch.filter((file: any) => {
                const hasContent = !file.isDirectory && file.content && file.content.length > 0
                if (!hasContent) {
                  console.log(`[grep_search] Skipping file without content: ${file.path} (isDirectory: ${file.isDirectory}, contentLength: ${file.content?.length || 0})`)
                }
                return hasContent
              })
              console.log(`[grep_search] After content filter: ${beforeContentFilter} -> ${filesToSearch.length} files with content`)

              if (filesToSearch.length === 0) {
                console.warn(`[grep_search] No files to search after filtering`)
                return {
                  success: true,
                  message: `No files found to search. This could mean files are not loaded or the pattern doesn't match any files.`,
                  query,
                  isRegexp,
                  caseSensitive,
                  includePattern,
                  results: [],
                  totalMatches: 0,
                  filesSearched: 0,
                  diagnostics: {
                    totalSessionFiles: sessionFiles.size,
                    filesAfterPatternFilter: beforeContentFilter,
                    filesWithContent: filesToSearch.length,
                    suggestion: includePattern 
                      ? "Try adjusting your includePattern or ensure it matches your project structure"
                      : "Files may not have content loaded. Try calling list_files first or check file loading."
                  },
                  maxResults,
                  toolCallId
                }
              }

              const results: any[] = []
              let totalMatches = 0
              let filesSearchedCount = 0
              const searchStrategies: string[] = []

              // 🧠 Auto-detect regex patterns
              const hasRegexSyntax = /[.*+?^${}()|[\]\\]/.test(query)
              const autoDetectedRegex = !isRegexp && hasRegexSyntax
              if (autoDetectedRegex) {
                console.log(`[grep_search] 🤖 Auto-detected regex syntax in query`)
                isRegexp = true
              }

              // 📋 Define Smart Code Patterns (like semantic_code_navigator)
              const smartPatterns = enableSmartPatterns && (searchMode === 'semantic' || searchMode === 'hybrid') ? [
                { type: 'react_component', regex: /^\s*(export\s+)?(const|function)\s+(\w+)\s*[=:]\s*(React\.)?(memo\()?(\([^)]*\)\s*=>|function)/gm, score: 10, description: 'React component' },
                { type: 'typescript_interface', regex: /^\s*(export\s+)?interface\s+(\w+)/gm, score: 8, description: 'TypeScript interface' },
                { type: 'typescript_type', regex: /^\s*(export\s+)?type\s+(\w+)\s*=/gm, score: 8, description: 'TypeScript type' },
                { type: 'api_route', regex: /^\s*export\s+(async\s+)?function\s+(GET|POST|PUT|DELETE|PATCH)/gm, score: 10, description: 'API route handler' },
                { type: 'async_function', regex: /^\s*(export\s+)?async\s+(function|const)\s+(\w+)/gm, score: 9, description: 'Async function' },
                { type: 'hook_definition', regex: /^\s*(export\s+)?function\s+use\w+/gm, score: 9, description: 'React hook' },
                { type: 'class_definition', regex: /^\s*(export\s+)?class\s+(\w+)/gm, score: 8, description: 'Class definition' },
                { type: 'error_handling', regex: /\b(try\s*\{|catch\s*\(|throw\s+new|\.catch\()/gi, score: 7, description: 'Error handling' },
                { type: 'database_query', regex: /\b(SELECT|INSERT|UPDATE|DELETE)\b.*\bFROM\b|\bCREATE\s+TABLE\b/gi, score: 7, description: 'Database query' },
                { type: 'test_case', regex: /^\s*(it|test|describe)\s*\(/gm, score: 6, description: 'Test case' },
              ] : []

              // 🎯 Prepare Primary Search Strategy
              let primarySearchRegex: RegExp
              try {
                if (searchMode === 'regex' || isRegexp) {
                  primarySearchRegex = new RegExp(query, caseSensitive ? 'gm' : 'gim')
                  searchStrategies.push('regex')
                } else if (searchMode === 'literal') {
                  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                  primarySearchRegex = new RegExp(escapedQuery, caseSensitive ? 'gm' : 'gim')
                  searchStrategies.push('literal')
                } else if (searchMode === 'semantic') {
                  // For semantic, we'll use smart patterns only
                  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                  primarySearchRegex = new RegExp(escapedQuery, 'gim') // Always case-insensitive for semantic
                  searchStrategies.push('semantic-patterns')
                } else {
                  // Hybrid mode: literal + smart patterns
                  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                  primarySearchRegex = new RegExp(escapedQuery, caseSensitive ? 'gm' : 'gim')
                  searchStrategies.push('hybrid-literal', 'hybrid-patterns')
                }
                console.log(`[grep_search] 🎯 Search strategies: [${searchStrategies.join(', ')}]`)
                console.log(`[grep_search] 📐 Primary regex: /${primarySearchRegex.source}/${primarySearchRegex.flags}`)
              } catch (regexError) {
                console.error(`[grep_search] ❌ Invalid regex:`, regexError)
                return {
                  success: false,
                  error: `Invalid regex pattern: ${regexError instanceof Error ? regexError.message : 'Unknown error'}`,
                  query,
                  toolCallId
                }
              }

              // 🚀 MULTI-STRATEGY SEARCH ENGINE
              console.log(`[grep_search] 🔍 Starting multi-strategy search across ${filesToSearch.length} files...`)
              
              for (const file of filesToSearch) {
                if (results.length >= maxResults) {
                  console.log(`[grep_search] 🛑 Reached maxResults limit (${maxResults})`)
                  break
                }

                filesSearchedCount++
                const content = file.content || ''
                
                if (!content) {
                  console.log(`[grep_search] ⚠️  Empty content: ${file.path}`)
                  continue
                }

                const lines = content.split('\n')
                let fileMatchCount = 0
                const fileExtension = file.path.split('.').pop()?.toLowerCase()

                // 🎯 STRATEGY 1: Primary Search (Literal/Regex)
                if (searchMode !== 'semantic') {
                  for (let i = 0; i < lines.length; i++) {
                    if (results.length >= maxResults) break
                    
                    const lineNumber = i + 1
                    const line = lines[i]
                    const lineMatches: any[] = []
                    let match
                    primarySearchRegex.lastIndex = 0

                    while ((match = primarySearchRegex.exec(line)) !== null) {
                      // Calculate relevance score
                      let relevanceScore = 5 // Base score
                      
                      // Boost for exact matches
                      if (match[0].toLowerCase() === query.toLowerCase()) {
                        relevanceScore += 5
                      }
                      
                      // Boost for word boundaries
                      if (new RegExp(`\\b${query}\\b`, 'i').test(match[0])) {
                        relevanceScore += 3
                      }
                      
                      // Boost based on file type
                      const codeExtensions = ['ts', 'tsx', 'js', 'jsx', 'py', 'java', 'cpp', 'rs', 'go']
                      if (codeExtensions.includes(fileExtension || '')) {
                        relevanceScore += 2
                      }

                      lineMatches.push({
                        match: match[0],
                        index: match.index,
                        lineNumber,
                        line: line,
                        relevanceScore,
                        matchType: 'primary'
                      })

                      if (!primarySearchRegex.global) break
                    }

                    // Process matches
                    for (const lineMatch of lineMatches) {
                      if (results.length >= maxResults) break

                      const startLine = Math.max(1, lineNumber - actualContextLines)
                      const endLine = Math.min(lines.length, lineNumber + actualContextLines)
                      const contextLines = lines.slice(startLine - 1, endLine)

                      const contextWithNumbers = includeContext ? contextLines.map((ctxLine: string, idx: number) => {
                        const ctxLineNumber = startLine + idx
                        const marker = ctxLineNumber === lineNumber ? '>' : ' '
                        return `${marker}${String(ctxLineNumber).padStart(4, ' ')}: ${ctxLine}`
                      }).join('\n') : ''

                      results.push({
                        file: file.path,
                        lineNumber: lineMatch.lineNumber,
                        column: lineMatch.index + 1,
                        match: lineMatch.match,
                        line: lineMatch.line.trim(),
                        context: contextWithNumbers,
                        relevanceScore: lineMatch.relevanceScore,
                        matchType: lineMatch.matchType,
                        fileType: fileExtension
                      })

                      fileMatchCount++
                      totalMatches++
                    }
                  }
                }

                // 🧠 STRATEGY 2: Smart Pattern Matching (Semantic)
                if ((searchMode === 'semantic' || searchMode === 'hybrid') && smartPatterns.length > 0) {
                  for (const pattern of smartPatterns) {
                    if (results.length >= maxResults) break

                    let match
                    while ((match = pattern.regex.exec(content)) !== null) {
                      if (results.length >= maxResults) break

                      // Calculate line number
                      const matchIndex = match.index
                      let lineNumber = 1
                      let charCount = 0

                      for (let i = 0; i < lines.length; i++) {
                        charCount += lines[i].length + 1
                        if (charCount > matchIndex) {
                          lineNumber = i + 1
                          break
                        }
                      }

                      // Check if this line contains our query (for relevance)
                      const matchLine = lines[lineNumber - 1]
                      const queryLower = query.toLowerCase()
                      const matchLower = match[0].toLowerCase()
                      const lineLower = matchLine.toLowerCase()
                      
                      // Only include if relevant to query in semantic/hybrid mode
                      if (!lineLower.includes(queryLower) && !matchLower.includes(queryLower)) {
                        continue
                      }

                      const startLine = Math.max(1, lineNumber - actualContextLines)
                      const endLine = Math.min(lines.length, lineNumber + actualContextLines)
                      const contextLines = lines.slice(startLine - 1, endLine)
                      
                      const contextWithNumbers = includeContext ? contextLines.map((line: string, idx: number) => {
                        const ctxLineNumber = startLine + idx
                        const marker = ctxLineNumber === lineNumber ? '>' : ' '
                        return `${marker}${String(ctxLineNumber).padStart(4, ' ')}: ${line}`
                      }).join('\n') : ''

                      // Calculate relevance with pattern score
                      let relevanceScore = pattern.score
                      if (matchLower.includes(queryLower)) relevanceScore += 5
                      if (lineLower === queryLower) relevanceScore += 10

                      results.push({
                        file: file.path,
                        lineNumber,
                        match: match[0].trim(),
                        line: matchLine.trim(),
                        context: contextWithNumbers,
                        relevanceScore,
                        matchType: pattern.type,
                        description: pattern.description,
                        fileType: fileExtension
                      })

                      fileMatchCount++
                      totalMatches++

                      if (!pattern.regex.global) break
                    }
                  }
                }

                if (fileMatchCount > 0) {
                  console.log(`[grep_search] ✅ Found ${fileMatchCount} matches in ${file.path}`)
                }
              }

              console.log(`[grep_search] 🎉 Search complete: ${totalMatches} matches across ${filesSearchedCount} files`)

              // 📊 Deduplicate results (same file, line, and match)
              const uniqueResults = results.filter((result, index, arr) =>
                index === 0 || !(
                  arr[index - 1].file === result.file &&
                  arr[index - 1].lineNumber === result.lineNumber &&
                  arr[index - 1].match === result.match
                )
              )

              console.log(`[grep_search] 🔄 Deduplication: ${results.length} -> ${uniqueResults.length} unique results`)

              // 🎯 Sort results
              if (sortByRelevance && uniqueResults.some(r => r.relevanceScore !== undefined)) {
                uniqueResults.sort((a, b) => {
                  const scoreCompare = (b.relevanceScore || 0) - (a.relevanceScore || 0)
                  if (scoreCompare !== 0) return scoreCompare
                  const fileCompare = a.file.localeCompare(b.file)
                  if (fileCompare !== 0) return fileCompare
                  return a.lineNumber - b.lineNumber
                })
                console.log(`[grep_search] 📊 Sorted by relevance score`)
              } else {
                uniqueResults.sort((a, b) => {
                  const fileCompare = a.file.localeCompare(b.file)
                  if (fileCompare !== 0) return fileCompare
                  return a.lineNumber - b.lineNumber
                })
                console.log(`[grep_search] 📊 Sorted by file path and line number`)
              }

              // 📈 Calculate statistics
              const fileMatches = new Map<string, number>()
              const matchTypeStats = new Map<string, number>()
              
              uniqueResults.forEach(result => {
                fileMatches.set(result.file, (fileMatches.get(result.file) || 0) + 1)
                if (result.matchType) {
                  matchTypeStats.set(result.matchType, (matchTypeStats.get(result.matchType) || 0) + 1)
                }
              })

              const topFiles = Array.from(fileMatches.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([file, count]) => ({ file, matches: count }))

              return {
                success: true,
                message: totalMatches > 0 
                  ? `🎯 Found ${totalMatches} matches (${uniqueResults.length} unique) for "${query}" using [${searchStrategies.join(', ')}] strategies`
                  : `🔍 No matches found for "${query}" in ${filesSearchedCount} files. Try broader search terms or check spelling.`,
                query,
                searchMode,
                strategies: searchStrategies,
                results: uniqueResults,
                totalMatches,
                uniqueMatches: uniqueResults.length,
                filesSearched: filesSearchedCount,
                topFiles,
                matchTypeBreakdown: Array.from(matchTypeStats.entries()).map(([type, count]) => ({ type, count })),
                diagnostics: {
                  filesSource,
                  totalSessionFiles: sessionFiles.size,
                  filesWithContent: filesToSearch.length,
                  filesActuallySearched: filesSearchedCount,
                  primaryRegexPattern: primarySearchRegex.source,
                  primaryRegexFlags: primarySearchRegex.flags,
                  smartPatternsEnabled: enableSmartPatterns && smartPatterns.length > 0,
                  smartPatternsCount: smartPatterns.length,
                  autoDetectedRegex,
                  sortedByRelevance: sortByRelevance,
                  contextLinesUsed: actualContextLines,
                  searchStrategies,
                  includePattern: includePattern || 'none',
                  excludePattern: excludePattern || 'none'
                },
                settings: {
                  maxResults,
                  caseSensitive,
                  isRegexp,
                  searchMode,
                  enableSmartPatterns,
                  sortByRelevance,
                  includeContext,
                  contextLines: actualContextLines
                },
                toolCallId
              }

            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error'
              const errorStack = error instanceof Error ? error.stack : undefined
              console.error(`[ERROR] grep_search failed for query "${query}":`, error)

              return {
                success: false,
                error: `Failed to search code: ${errorMessage}`,
                query,
                errorStack,
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
            const toolStartTime = Date.now();
            const timeStatus = getTimeStatus();

            if (abortSignal?.aborted) {
              throw new Error('Operation cancelled')
            }

            // Check if we're approaching timeout
            if (timeStatus.isApproachingTimeout) {
              return {
                success: false,
                error: `Dev/build check cancelled due to timeout warning: ${timeStatus.warningMessage}`,
                mode,
                toolCallId,
                executionTimeMs: Date.now() - toolStartTime,
                timeWarning: timeStatus.warningMessage
              }
            }

            try {
              const e2bApiKey = process.env.E2B_API_KEY
              if (!e2bApiKey) {
                const executionTime = Date.now() - toolStartTime;
                toolExecutionTimes['check_dev_errors'] = (toolExecutionTimes['check_dev_errors'] || 0) + executionTime;
                
                return {
                  success: false,
                  error: 'E2B API key not configured',
                  mode,
                  toolCallId,
                  executionTimeMs: executionTime,
                  timeWarning: timeStatus.warningMessage
                }
              }

              // Get all files from in-memory session store (latest state)
              const sessionData = sessionProjectStorage.get(projectId)
              if (!sessionData) {
                const executionTime = Date.now() - toolStartTime;
                toolExecutionTimes['check_dev_errors'] = (toolExecutionTimes['check_dev_errors'] || 0) + executionTime;
                
                return {
                  success: false,
                  error: `Session storage not found for project ${projectId}`,
                  mode,
                  toolCallId,
                  executionTimeMs: executionTime,
                  timeWarning: timeStatus.warningMessage
                }
              }

              const { files: sessionFiles } = sessionData
              const allFiles = Array.from(sessionFiles.values())

              if (!allFiles || allFiles.length === 0) {
                const executionTime = Date.now() - toolStartTime;
                toolExecutionTimes['check_dev_errors'] = (toolExecutionTimes['check_dev_errors'] || 0) + executionTime;
                
                return {
                  success: false,
                  error: 'No files found in project session',
                  mode,
                  toolCallId,
                  executionTimeMs: executionTime,
                  timeWarning: timeStatus.warningMessage
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

              // Create sandbox with reasonable timeout for error detection
              const sandbox = await createEnhancedSandbox({
                template: "pipilot",
                timeoutMs: mode === 'dev' ? 120000 : 90000, // 120s for dev, 90s for build (increased for proper error checking)
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

              // Install dependencies with reasonable timeout for error detection
              const installResult = await sandbox.installDependenciesRobust("/project", {
                timeoutMs: 90000, // Increased from 60000 (1min) to 90000 (1.5min) for proper error checking
                envVars: {},
                onStdout: (data) => logs.push(`[INSTALL] ${data.trim()}`),
                onStderr: (data) => {
                  errors.push(`[INSTALL ERROR] ${data.trim()}`)
                  logs.push(`[INSTALL ERROR] ${data.trim()}`)
                },
              })

              if (installResult.exitCode !== 0) {
                const executionTime = Date.now() - toolStartTime;
                toolExecutionTimes['check_dev_errors'] = (toolExecutionTimes['check_dev_errors'] || 0) + executionTime;
                
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
                  toolCallId,
                  executionTimeMs: executionTime,
                  timeWarning: timeStatus.warningMessage
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
                  const executionTime = Date.now() - toolStartTime;
                  toolExecutionTimes['check_dev_errors'] = (toolExecutionTimes['check_dev_errors'] || 0) + executionTime;
                  
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
                    toolCallId,
                    executionTimeMs: executionTime,
                    timeWarning: timeStatus.warningMessage
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
                  toolCallId,
                  executionTimeMs: Date.now() - toolStartTime,
                  timeWarning: timeStatus.warningMessage
                }

              } else if (mode === 'build') {
                // Run build process with reasonable timeout for error detection
                const buildResult = await sandbox.executeCommand("npm run build", {
                  workingDirectory: "/project",
                  timeoutMs: 90000, // Increased from 60000 (1min) to 90000 (1.5min) for proper error checking
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
                  const executionTime = Date.now() - toolStartTime;
                  toolExecutionTimes['check_dev_errors'] = (toolExecutionTimes['check_dev_errors'] || 0) + executionTime;
                  
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
                    toolCallId,
                    executionTimeMs: executionTime,
                    timeWarning: timeStatus.warningMessage
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
                  toolCallId,
                  executionTimeMs: Date.now() - toolStartTime,
                  timeWarning: timeStatus.warningMessage
                }
              }

            } catch (error) {
              const executionTime = Date.now() - toolStartTime;
              toolExecutionTimes['check_dev_errors'] = (toolExecutionTimes['check_dev_errors'] || 0) + executionTime;
              
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
                toolCallId,
                executionTimeMs: executionTime,
                timeWarning: timeStatus.warningMessage
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
        }),

        // DATABASE MANAGEMENT TOOLS (CLIENT-SIDE)
        create_database: tool({
          description: 'Create a new database for the current project. Automatically creates a database with a default users table for authentication. This tool runs client-side with IndexedDB access and eliminates the need for manual database setup.',
          inputSchema: z.object({
            name: z.string().optional().describe('Database name (defaults to "main")')
          }),
          execute: async ({ name = 'main' }, { toolCallId }) => {
            // This is a client-side tool - execution will be handled by client
            // The actual implementation will be in the client-side code with IndexedDB access
            return await constructToolResult('create_database', { name }, projectId, toolCallId);
          }
        }),

        create_table: tool({
          description: 'Create a new table in the database. Can either use AI to generate optimal schema from description, or create table with predefined schema. Supports complex relationships, constraints, and indexes.',
          inputSchema: z.object({
            name: z.string().describe('Table name (should be singular, snake_case)'),
            // Either provide a description for AI schema generation, or a predefined schema
            description: z.string().optional().describe('Natural language description for AI schema generation (e.g., "e-commerce product with name, price, category, inventory")'),
            schema: z.object({
              columns: z.array(z.object({
                name: z.string(),
                type: z.enum(['text', 'number', 'boolean', 'date', 'datetime', 'timestamp', 'uuid', 'json', 'email', 'url']),
                required: z.boolean().optional(),
                defaultValue: z.string().optional(),
                unique: z.boolean().optional(),
                description: z.string().optional(),
                references: z.object({
                  table: z.string(),
                  column: z.string()
                }).optional()
              })),
              indexes: z.array(z.string()).optional().describe('Column names to create indexes on')
            }).optional().describe('Predefined schema with columns and constraints (optional if using description)'),
            refinementPrompt: z.string().optional().describe('Additional refinement instructions for AI schema generation')
          }),
          execute: async ({ name, description, schema, refinementPrompt }, { abortSignal, toolCallId }) => {
            const toolStartTime = Date.now();
            const timeStatus = getTimeStatus();

            if (abortSignal?.aborted) {
              throw new Error('Operation cancelled')
            }

            // Check if we're approaching timeout
            if (timeStatus.isApproachingTimeout) {
              return {
                success: false,
                error: `Table creation cancelled due to timeout warning: ${timeStatus.warningMessage}`,
                name,
                toolCallId,
                executionTimeMs: Date.now() - toolStartTime,
                timeWarning: timeStatus.warningMessage
              }
            }

            // Use database ID from request payload
            const dbId = databaseId;
            if (!dbId) {
              return {
                success: false,
                error: 'No database ID provided in request.',
                name,
                toolCallId,
                executionTimeMs: Date.now() - toolStartTime,
                timeWarning: timeStatus.warningMessage
              }
            }

            try {
              let finalSchema = schema;
              let aiGenerated = false;

              // If no predefined schema but description provided, generate schema using AI
              if (!schema && description) {
                console.log('[INFO] Generating AI schema for table:', name);
                
                // Call the AI schema generation API (no auth required for internal calls)
                const schemaResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/database/${dbId}/ai-schema`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    description,
                    refinementPrompt,
                    existingTables: [] // Will be populated by the API
                  })
                });

                const schemaResult = await schemaResponse.json();

                if (!schemaResponse.ok) {
                  console.error('[ERROR] AI schema generation failed:', schemaResult);
                  return {
                    success: false,
                    error: `Failed to generate AI schema: ${schemaResult.error || 'Unknown error'}`,
                    name,
                    description,
                    toolCallId,
                    executionTimeMs: Date.now() - toolStartTime,
                    timeWarning: timeStatus.warningMessage
                  };
                }

                // Use the AI-generated schema
                finalSchema = {
                  columns: schemaResult.columns,
                  indexes: schemaResult.indexes || []
                };
                aiGenerated = true;
                console.log('[SUCCESS] AI schema generated:', schemaResult);
              }

              // Validate that we have a schema
              if (!finalSchema) {
                return {
                  success: false,
                  error: 'Either description (for AI schema generation) or predefined schema must be provided',
                  name,
                  toolCallId,
                  executionTimeMs: Date.now() - toolStartTime,
                  timeWarning: timeStatus.warningMessage
                };
              }

              // Create the table with the final schema (no auth required for internal calls)
              const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/database/${dbId}/tables/create`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  name,
                  schema_json: finalSchema
                })
              });

              const result = await response.json();
              const executionTime = Date.now() - toolStartTime;
              toolExecutionTimes['create_table'] = (toolExecutionTimes['create_table'] || 0) + executionTime;

              if (!response.ok) {
                console.error('[ERROR] Table creation failed:', result);
                return {
                  success: false,
                  error: `Failed to create table: ${result.error || 'Unknown error'}`,
                  name,
                  toolCallId,
                  executionTimeMs: executionTime,
                  timeWarning: timeStatus.warningMessage
                };
              }

              console.log('[SUCCESS] Table created:', result);
              return {
                success: true,
                message: `✅ Table "${name}" created successfully${aiGenerated ? ' with AI-generated schema' : ''} in database`,
                table: result.table,
                tableId: result.table.id,
                name,
                schema: finalSchema,
                aiGenerated,
                description: aiGenerated ? description : undefined,
                toolCallId,
                executionTimeMs: executionTime,
                timeWarning: timeStatus.warningMessage
              };

            } catch (error) {
              const executionTime = Date.now() - toolStartTime;
              toolExecutionTimes['create_table'] = (toolExecutionTimes['create_table'] || 0) + executionTime;
              
              console.error('[ERROR] Table creation failed:', error);
              return {
                success: false,
                error: `Table creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                databaseId,
                name,
                toolCallId,
                executionTimeMs: executionTime,
                timeWarning: timeStatus.warningMessage
              };
            }
          }
        }),

        query_database: tool({
          description: 'Advanced database querying tool with MySQL-like capabilities. Supports table data retrieval with sorting, filtering, pagination, column selection, and JSONB field querying.',
          inputSchema: z.object({
            tableId: z.string().describe('The table ID to query records from'),
            // MySQL-like query options
            select: z.array(z.string()).optional().describe('Columns to select (default: all columns). Use "*" for all or specify column names'),
            where: z.object({
              field: z.string(),
              operator: z.enum(['=', '!=', '>', '<', '>=', '<=', 'LIKE', 'ILIKE', 'IN', 'NOT IN', 'IS NULL', 'IS NOT NULL', 'CONTAINS']),
              value: z.any().optional().describe('Value to compare (not needed for IS NULL/IS NOT NULL)')
            }).optional().describe('WHERE clause for filtering records'),
            whereConditions: z.array(z.object({
              field: z.string(),
              operator: z.enum(['=', '!=', '>', '<', '>=', '<=', 'LIKE', 'ILIKE', 'IN', 'NOT IN', 'IS NULL', 'IS NOT NULL', 'CONTAINS']),
              value: z.any().optional(),
              logic: z.enum(['AND', 'OR']).optional().describe('Logic operator to combine with next condition (default: AND)')
            })).optional().describe('Multiple WHERE conditions for complex filtering'),
            orderBy: z.object({
              field: z.string().describe('Field to sort by'),
              direction: z.enum(['ASC', 'DESC']).optional().describe('Sort direction (default: ASC)')
            }).optional().describe('ORDER BY clause for sorting'),
            limit: z.number().optional().describe('Maximum number of records to return (default: 100, max: 1000)'),
            offset: z.number().optional().describe('Number of records to skip for pagination (default: 0)'),
            // Advanced options
            search: z.string().optional().describe('Full-text search across all text fields'),
            groupBy: z.array(z.string()).optional().describe('Fields to group by'),
            having: z.object({
              field: z.string(),
              operator: z.enum(['=', '!=', '>', '<', '>=', '<=', 'LIKE', 'ILIKE']),
              value: z.any()
            }).optional().describe('HAVING clause for grouped results'),
            includeCount: z.boolean().optional().describe('Include total count of records (default: true)')
          }),
          execute: async ({ tableId, select, where, whereConditions, orderBy, limit = 100, offset = 0, search, groupBy, having, includeCount = true }, { abortSignal, toolCallId }) => {
            const toolStartTime = Date.now();
            const timeStatus = getTimeStatus();

            if (abortSignal?.aborted) {
              throw new Error('Operation cancelled')
            }

            // Check if we're approaching timeout
            if (timeStatus.isApproachingTimeout) {
              return {
                success: false,
                error: `Database query cancelled due to timeout warning: ${timeStatus.warningMessage}`,
                tableId,
                toolCallId,
                executionTimeMs: Date.now() - toolStartTime,
                timeWarning: timeStatus.warningMessage
              }
            }

            // Auth check - same as main route
            const supabase = await createClient()
            const { data: { session }, error: sessionError } = await supabase.auth.getSession()
            
            if (sessionError || !session) {
              return {
                success: false,
                error: 'Authentication required. Please log in.',
                tableId,
                toolCallId,
                executionTimeMs: Date.now() - toolStartTime,
                timeWarning: timeStatus.warningMessage
              }
            }

            // Use database ID from request payload
            const dbId = databaseId;
            if (!dbId) {
              return {
                success: false,
                error: 'No database ID provided in request.',
                tableId,
                toolCallId,
                executionTimeMs: Date.now() - toolStartTime,
                timeWarning: timeStatus.warningMessage
              }
            }

            // Check if we're approaching timeout
            if (timeStatus.isApproachingTimeout) {
              return {
                success: false,
                error: `Database query cancelled due to timeout warning: ${timeStatus.warningMessage}`,
                databaseId: dbId,
                toolCallId,
                executionTimeMs: Date.now() - toolStartTime,
                timeWarning: timeStatus.warningMessage
              }
            }

            try {
              // Validate and clamp limit
              const actualLimit = Math.min(Math.max(limit, 1), 1000);
              const actualOffset = Math.max(offset, 0);

              // Build query URL with enhanced query endpoint
              const baseUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/database/${dbId}/tables/${tableId}/query`;
              const queryParams = new URLSearchParams({
                limit: actualLimit.toString(),
                offset: actualOffset.toString()
              });

              // Add search parameter if provided
              if (search) {
                queryParams.append('search', search);
              }

              // Add orderBy parameter if provided
              if (orderBy) {
                queryParams.append('orderBy', orderBy.field);
                queryParams.append('orderDirection', orderBy.direction || 'ASC');
              }

              // Add select fields if provided
              if (select && select.length > 0 && !select.includes('*')) {
                queryParams.append('select', select.join(','));
              }

              // Build WHERE conditions
              const conditions: any[] = [];
              
              // Single where condition
              if (where) {
                conditions.push(where);
              }
              
              // Multiple where conditions
              if (whereConditions && whereConditions.length > 0) {
                conditions.push(...whereConditions);
              }

              // Add conditions as query parameters
              if (conditions.length > 0) {
                queryParams.append('conditions', JSON.stringify(conditions));
              }

              // Add groupBy if provided
              if (groupBy && groupBy.length > 0) {
                queryParams.append('groupBy', groupBy.join(','));
              }

              // Add having clause if provided
              if (having) {
                queryParams.append('having', JSON.stringify(having));
              }

              // Add includeCount parameter
              queryParams.append('includeCount', includeCount.toString());

              // Make the API call
              const response = await fetch(`${baseUrl}?${queryParams.toString()}`, {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                }
              });

              const result = await response.json();
              const executionTime = Date.now() - toolStartTime;
              toolExecutionTimes['query_database'] = (toolExecutionTimes['query_database'] || 0) + executionTime;

              if (!response.ok) {
                console.error('[ERROR] Enhanced database query failed:', result);
                return {
                  success: false,
                  error: `Failed to execute enhanced query: ${result.error || 'Unknown error'}`,
                  databaseId,
                  tableId,
                  queryDetails: {
                    select,
                    where,
                    whereConditions,
                    orderBy,
                    limit: actualLimit,
                    offset: actualOffset,
                    search,
                    groupBy,
                    having
                  },
                  toolCallId,
                  executionTimeMs: executionTime,
                  timeWarning: timeStatus.warningMessage
                };
              }

              // Build query summary for logging
              const queryParts = [];
              if (select && !select.includes('*')) queryParts.push(`SELECT ${select.join(', ')}`);
              else queryParts.push('SELECT *');
              queryParts.push(`FROM table_${tableId}`);
              if (conditions.length > 0) queryParts.push(`WHERE ${conditions.length} condition(s)`);
              if (orderBy) queryParts.push(`ORDER BY ${orderBy.field} ${orderBy.direction || 'ASC'}`);
              if (groupBy) queryParts.push(`GROUP BY ${groupBy.join(', ')}`);
              if (having) queryParts.push(`HAVING ${having.field} ${having.operator} ${having.value}`);
              queryParts.push(`LIMIT ${actualLimit} OFFSET ${actualOffset}`);
              
              const queryDescription = queryParts.join(' ');

              console.log('[SUCCESS] Enhanced query executed:', { 
                queryDescription, 
                rowCount: result.records?.length || 0, 
                totalCount: result.total || 0 
              });

              return {
                success: true,
                message: `✅ Enhanced database query executed successfully`,
                query: queryDescription,
                data: result.records || [],
                rowCount: result.records?.length || 0,
                totalCount: result.total || 0,
                pagination: {
                  limit: actualLimit,
                  offset: actualOffset,
                  hasMore: (result.total || 0) > (actualOffset + actualLimit)
                },
                queryDetails: {
                  select: select || ['*'],
                  conditions: conditions,
                  orderBy,
                  search,
                  groupBy,
                  having,
                  appliedFilters: conditions.length,
                  isFiltered: conditions.length > 0 || search,
                  isSorted: !!orderBy,
                  isGrouped: !!(groupBy && groupBy.length > 0)
                },
                databaseId,
                tableId,
                toolCallId,
                executionTimeMs: executionTime,
                timeWarning: timeStatus.warningMessage
              };

            } catch (error) {
              const executionTime = Date.now() - toolStartTime;
              toolExecutionTimes['query_database'] = (toolExecutionTimes['query_database'] || 0) + executionTime;
              
              console.error('[ERROR] Enhanced database query failed:', error);
              return {
                success: false,
                error: `Enhanced database query failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                databaseId,
                tableId,
                toolCallId,
                executionTimeMs: executionTime,
                timeWarning: timeStatus.warningMessage
              };
            }
          }
        }),

        manipulate_table_data: tool({
          description: 'Insert, update, or delete records in database tables. Provides full CRUD operations for table data management.',
          inputSchema: z.object({
            tableId: z.string().describe('The table ID to manipulate data in'),
            operation: z.enum(['insert', 'update', 'delete']).describe('CRUD operation to perform'),
            data: z.record(z.any()).optional().describe('Data object for insert/update operations (key-value pairs matching table schema). Example: { "email": "user@example.com", "full_name": "John Doe", "age": 25 }'),
            recordId: z.string().optional().describe('Record ID for update/delete operations'),
            whereConditions: z.array(z.object({
              field: z.string(),
              operator: z.enum(['=', '!=', '>', '<', '>=', '<=', 'LIKE', 'ILIKE', 'IN', 'NOT IN', 'IS NULL', 'IS NOT NULL']),
              value: z.any().optional()
            })).optional().describe('WHERE conditions for bulk update/delete operations (alternative to recordId)')
          }),
          execute: async ({ tableId, operation, data, recordId, whereConditions }, { abortSignal, toolCallId }) => {
            const toolStartTime = Date.now();
            const timeStatus = getTimeStatus();

            if (abortSignal?.aborted) {
              throw new Error('Operation cancelled')
            }

            if (timeStatus.isApproachingTimeout) {
              return {
                success: false,
                error: `Data manipulation cancelled due to timeout warning: ${timeStatus.warningMessage}`,
                tableId,
                operation,
                toolCallId,
                executionTimeMs: Date.now() - toolStartTime,
                timeWarning: timeStatus.warningMessage
              }
            }

            // Skip authentication for internal tool calls - database ID provides security
            // Auth check - same as main route
            // const supabase = await createClient()
            // const { data: { session }, error: sessionError } = await supabase.auth.getSession()
            
            // if (sessionError || !session) {
            //   return {
            //     success: false,
            //     error: 'Authentication required. Please log in.',
            //     tableId,
            //     operation,
            //     toolCallId,
            //     executionTimeMs: Date.now() - toolStartTime,
            //     timeWarning: timeStatus.warningMessage
            //   }
            // }

            // Use database ID from request payload
            const dbId = databaseId;
            if (!dbId) {
              return {
                success: false,
                error: 'No database ID provided in request.',
                tableId,
                operation,
                toolCallId,
                executionTimeMs: Date.now() - toolStartTime,
                timeWarning: timeStatus.warningMessage
              }
            }

            try {
              const baseUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/database/${dbId}/tables/${tableId}/records`;
              let response;

              switch (operation) {
                case 'insert':
                  if (!data) {
                    return {
                      success: false,
                      error: 'Data object is required for insert operation',
                      databaseId,
                      tableId,
                      operation,
                      toolCallId,
                      executionTimeMs: Date.now() - toolStartTime,
                      timeWarning: timeStatus.warningMessage
                    };
                  }

                  response = await fetch(baseUrl, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      data_json: data
                    })
                  });
                  break;

                case 'update':
                  if (!recordId) {
                    return {
                      success: false,
                      error: 'Record ID is required for update operation',
                      databaseId,
                      tableId,
                      operation,
                      toolCallId,
                      executionTimeMs: Date.now() - toolStartTime,
                      timeWarning: timeStatus.warningMessage
                    };
                  }

                  if (!data) {
                    return {
                      success: false,
                      error: 'Data object is required for update operation',
                      databaseId,
                      tableId,
                      operation,
                      toolCallId,
                      executionTimeMs: Date.now() - toolStartTime,
                      timeWarning: timeStatus.warningMessage
                    };
                  }

                  response = await fetch(`${baseUrl}?recordId=${recordId}`, {
                    method: 'PUT',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      data_json: data
                    })
                  });
                  break;

                case 'delete':
                  if (!recordId) {
                    return {
                      success: false,
                      error: 'Record ID is required for delete operation',
                      databaseId,
                      tableId,
                      operation,
                      toolCallId,
                      executionTimeMs: Date.now() - toolStartTime,
                      timeWarning: timeStatus.warningMessage
                    };
                  }

                  response = await fetch(`${baseUrl}?recordId=${recordId}`, {
                    method: 'DELETE',
                    headers: {
                      'Content-Type': 'application/json',
                    }
                  });
                  break;
              }

              const result = await response.json();
              const executionTime = Date.now() - toolStartTime;
              toolExecutionTimes['manipulate_table_data'] = (toolExecutionTimes['manipulate_table_data'] || 0) + executionTime;

              if (!response.ok) {
                console.error('[ERROR] Data manipulation failed:', result);
                return {
                  success: false,
                  error: `Failed to ${operation} record: ${result.error || 'Unknown error'}`,
                  databaseId,
                  tableId,
                  operation,
                  data,
                  recordId,
                  toolCallId,
                  executionTimeMs: executionTime,
                  timeWarning: timeStatus.warningMessage
                };
              }

              console.log(`[SUCCESS] Data ${operation} completed:`, { operation, recordId, dataFields: data ? Object.keys(data).length : 0 });
              return {
                success: true,
                message: `✅ Record ${operation} completed successfully`,
                operation,
                result: result.record || result,
                recordId: result.record?.id || recordId,
                databaseId,
                tableId,
                data,
                toolCallId,
                executionTimeMs: executionTime,
                timeWarning: timeStatus.warningMessage
              };

            } catch (error) {
              const executionTime = Date.now() - toolStartTime;
              toolExecutionTimes['manipulate_table_data'] = (toolExecutionTimes['manipulate_table_data'] || 0) + executionTime;
              
              console.error('[ERROR] Data manipulation failed:', error);
              return {
                success: false,
                error: `Data manipulation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                databaseId,
                tableId,
                operation,
                toolCallId,
                executionTimeMs: executionTime,
                timeWarning: timeStatus.warningMessage
              };
            }
          }
        }),

        manage_api_keys: tool({
          description: 'Create and manage API keys for external database access. Enables secure access to database from external applications.',
          inputSchema: z.object({
            action: z.enum(['create', 'list', 'delete']).describe('Action to perform on API keys'),
            keyName: z.string().optional().describe('Name for the API key (required for create action)'),
            keyId: z.string().optional().describe('API key ID (required for delete action)')
          }),
          execute: async ({ action, keyName, keyId }, { abortSignal, toolCallId }) => {
            const toolStartTime = Date.now();
            const timeStatus = getTimeStatus();

            if (abortSignal?.aborted) {
              throw new Error('Operation cancelled')
            }

            // Check if we're approaching timeout
            if (timeStatus.isApproachingTimeout) {
              return {
                success: false,
                error: `API key management cancelled due to timeout warning: ${timeStatus.warningMessage}`,
                action,
                toolCallId,
                executionTimeMs: Date.now() - toolStartTime,
                timeWarning: timeStatus.warningMessage
              }
            }

            // Skip authentication for internal tool calls - database ID provides security
            // Auth check - same as main route
            // const supabase = await createClient()
            // const { data: { session }, error: sessionError } = await supabase.auth.getSession()
            
            // if (sessionError || !session) {
            //   return {
            //     success: false,
            //     error: 'Authentication required. Please log in.',
            //     action,
            //     toolCallId,
            //     executionTimeMs: Date.now() - toolStartTime,
            //     timeWarning: timeStatus.warningMessage
            //   }
            // }

            // Use database ID from request payload
            const dbId = databaseId;
            if (!dbId) {
              return {
                success: false,
                error: 'No database ID provided in request.',
                action,
                toolCallId,
                executionTimeMs: Date.now() - toolStartTime,
                timeWarning: timeStatus.warningMessage
              }
            }

            try {
              let response;
              const baseUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/database/${dbId}/api-keys`;

              switch (action) {
                case 'create':
                  if (!keyName) {
                    return {
                      success: false,
                      error: 'Key name is required for create action',
                      databaseId: dbId,
                      action,
                      toolCallId,
                      executionTimeMs: Date.now() - toolStartTime
                    };
                  }

                  response = await fetch(baseUrl, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ name: keyName })
                  });
                  break;

                case 'list':
                  response = await fetch(baseUrl, {
                    method: 'GET',
                    headers: {
                      'Content-Type': 'application/json',
                    }
                  });
                  break;

                case 'delete':
                  if (!keyId) {
                    return {
                      success: false,
                      error: 'Key ID is required for delete action',
                      databaseId,
                      action,
                      toolCallId,
                      executionTimeMs: Date.now() - toolStartTime
                    };
                  }

                  response = await fetch(`${baseUrl}/${keyId}`, {
                    method: 'DELETE',
                    headers: {
                      'Content-Type': 'application/json',
                    }
                  });
                  break;
              }

              const result = await response.json();
              const executionTime = Date.now() - toolStartTime;
              toolExecutionTimes['manage_api_keys'] = (toolExecutionTimes['manage_api_keys'] || 0) + executionTime;

              if (!response.ok) {
                console.error('[ERROR] API key management failed:', result);
                return {
                  success: false,
                  error: `Failed to ${action} API key: ${result.error || 'Unknown error'}`,
                  databaseId: dbId,
                  action,
                  toolCallId,
                  executionTimeMs: executionTime,
                  timeWarning: timeStatus.warningMessage
                };
              }

              let message = '';
              switch (action) {
                case 'create':
                  message = `✅ API key "${keyName}" created successfully`;
                  break;
                case 'list':
                  message = `✅ Retrieved ${result.apiKeys?.length || 0} API keys`;
                  break;
                case 'delete':
                  message = `✅ API key deleted successfully`;
                  break;
              }

              console.log('[SUCCESS] API key management:', { action, result });
              return {
                success: true,
                message,
                data: result,
                databaseId: dbId,
                action,
                keyName,
                keyId,
                toolCallId,
                executionTimeMs: executionTime,
                timeWarning: timeStatus.warningMessage
              };

            } catch (error) {
              const executionTime = Date.now() - toolStartTime;
              toolExecutionTimes['manage_api_keys'] = (toolExecutionTimes['manage_api_keys'] || 0) + executionTime;
              
              console.error('[ERROR] API key management failed:', error);
              return {
                success: false,
                error: `API key management failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                databaseId,
                action,
                toolCallId,
                executionTimeMs: executionTime,
                timeWarning: timeStatus.warningMessage
              };
            }
          }
        }),

        list_tables: tool({
          description: 'List all tables in the database with their schemas, IDs, and metadata. Essential for discovering available tables before querying or manipulating data. Returns table IDs needed for other database operations.',
          inputSchema: z.object({
            includeSchema: z.boolean().optional().describe('Include detailed schema information for each table (default: true)'),
            includeRecordCount: z.boolean().optional().describe('Include record count for each table (default: true)')
          }),
          execute: async ({ includeSchema = true, includeRecordCount = true }, { abortSignal, toolCallId }) => {
            const toolStartTime = Date.now();
            const timeStatus = getTimeStatus();

            if (abortSignal?.aborted) {
              throw new Error('Operation cancelled')
            }

            // Check if we're approaching timeout
            if (timeStatus.isApproachingTimeout) {
              return {
                success: false,
                error: `List tables cancelled due to timeout warning: ${timeStatus.warningMessage}`,
                toolCallId,
                executionTimeMs: Date.now() - toolStartTime,
                timeWarning: timeStatus.warningMessage
              }
            }

            // Use database ID from request payload
            const dbId = databaseId;
            if (!dbId) {
              return {
                success: false,
                error: 'No database ID provided in request.',
                toolCallId,
                executionTimeMs: Date.now() - toolStartTime,
                timeWarning: timeStatus.warningMessage
              }
            }

            try {
              // Call the database API endpoint to get database with tables (no auth required for internal calls)
              const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/database/${dbId}`, {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                }
              });

              const result = await response.json();
              const executionTime = Date.now() - toolStartTime;
              toolExecutionTimes['list_tables'] = (toolExecutionTimes['list_tables'] || 0) + executionTime;

              if (!response.ok || !result.success) {
                console.error('[ERROR] List tables failed:', result);
                return {
                  success: false,
                  error: `Failed to list tables: ${result.error || 'Unknown error'}`,
                  databaseId: dbId,
                  toolCallId,
                  executionTimeMs: executionTime,
                  timeWarning: timeStatus.warningMessage
                };
              }

              const tables = result.tables || [];

              // Format table information
              const formattedTables = tables.map((table: any) => {
                const tableInfo: any = {
                  id: table.id,
                  name: table.name,
                  createdAt: table.created_at,
                  updatedAt: table.updated_at
                };

                // Add record count if requested and available
                if (includeRecordCount && table.record_count !== undefined) {
                  tableInfo.recordCount = table.record_count;
                }

                // Add schema if requested
                if (includeSchema && table.schema_json) {
                  const schema = table.schema_json;
                  tableInfo.schema = {
                    columnCount: schema.columns?.length || 0,
                    columns: schema.columns?.map((col: any) => ({
                      name: col.name,
                      type: col.type,
                      required: col.required || false,
                      unique: col.unique || false,
                      defaultValue: col.defaultValue,
                      description: col.description,
                      references: col.references
                    })) || [],
                    indexes: schema.indexes || []
                  };
                }

                return tableInfo;
              });

              // Generate summary
              const totalTables = formattedTables.length;
              const totalRecords = includeRecordCount 
                ? formattedTables.reduce((sum: number, t: any) => sum + (t.recordCount || 0), 0)
                : undefined;

              const summary = totalTables === 0
                ? 'No tables found in database. Create tables using the create_table tool.'
                : `Found ${totalTables} table(s)${totalRecords !== undefined ? ` with ${totalRecords} total record(s)` : ''}`;

              console.log('[SUCCESS] Tables listed:', { totalTables, totalRecords });
              return {
                success: true,
                message: `✅ ${summary}`,
                tables: formattedTables,
                totalTables,
                totalRecords,
                databaseId: dbId,
                toolCallId,
                executionTimeMs: executionTime,
                timeWarning: timeStatus.warningMessage
              };

            } catch (error) {
              const executionTime = Date.now() - toolStartTime;
              toolExecutionTimes['list_tables'] = (toolExecutionTimes['list_tables'] || 0) + executionTime;
              
              console.error('[ERROR] List tables failed:', error);
              return {
                success: false,
                error: `Failed to list tables: ${error instanceof Error ? error.message : 'Unknown error'}`,
                databaseId: dbId,
                toolCallId,
                executionTimeMs: executionTime,
                timeWarning: timeStatus.warningMessage
              };
            }
          }
        }),

        read_table: tool({
          description: 'Get detailed information about a specific table including its schema, structure, metadata, and statistics. Use this to inspect table definition before modifying or querying data.',
          inputSchema: z.object({
            tableId: z.number().describe('The unique ID of the table to read (get from list_tables tool)'),
            includeRecordCount: z.boolean().optional().describe('Include total record count in the response (default: true)')
          }),
          execute: async ({ tableId, includeRecordCount = true }, { abortSignal, toolCallId }) => {
            const toolStartTime = Date.now();
            const timeStatus = getTimeStatus();

            // Check time budget
            if (!timeStatus.shouldContinue) {
              return {
                success: false,
                error: `⏱️ Time budget exceeded (${timeStatus.elapsed}ms). ${timeStatus.warningMessage}`,
                toolCallId,
                executionTimeMs: Date.now() - toolStartTime,
                timeWarning: timeStatus.warningMessage
              }
            }

            try {
              // Get database ID
              const dbId = databaseId;
              if (!dbId) {
                return {
                  success: false,
                  error: 'No database found for this project. Create a database first using the database panel.',
                  toolCallId,
                  executionTimeMs: Date.now() - toolStartTime,
                  timeWarning: timeStatus.warningMessage
                };
              }

              // Call the read table API endpoint
              const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/database/${dbId}/tables/${tableId}`, {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                }
              });

              const result = await response.json();
              const executionTime = Date.now() - toolStartTime;
              toolExecutionTimes['read_table'] = (toolExecutionTimes['read_table'] || 0) + executionTime;

              if (!response.ok || !result.table) {
                console.error('[ERROR] Read table failed:', result);
                return {
                  success: false,
                  error: `Failed to read table: ${result.error || 'Table not found'}`,
                  databaseId: dbId,
                  tableId,
                  toolCallId,
                  executionTimeMs: executionTime,
                  timeWarning: timeStatus.warningMessage
                };
              }

              const table = result.table;

              // Optionally get record count
              let recordCount = undefined;
              if (includeRecordCount) {
                try {
                  const countResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/database/${dbId}/tables/${tableId}/records`, {
                    method: 'GET',
                    headers: {
                      'Content-Type': 'application/json',
                    }
                  });
                  const countData = await countResponse.json();
                  recordCount = countData.total || 0;
                } catch (err) {
                  console.warn('[WARN] Failed to get record count:', err);
                }
              }

              // Format table information
              const schema = table.schema_json || {};
              const tableInfo = {
                id: table.id,
                name: table.name,
                databaseId: table.database_id,
                createdAt: table.created_at,
                updatedAt: table.updated_at,
                recordCount,
                schema: {
                  columnCount: schema.columns?.length || 0,
                  columns: schema.columns?.map((col: any) => ({
                    name: col.name,
                    type: col.type,
                    required: col.required || false,
                    unique: col.unique || false,
                    defaultValue: col.defaultValue,
                    description: col.description,
                    references: col.references
                  })) || [],
                  indexes: schema.indexes || [],
                  constraints: schema.constraints || []
                }
              };

              console.log('[SUCCESS] Table read:', { tableId, name: table.name, columns: tableInfo.schema.columnCount });
              return {
                success: true,
                message: `✅ Successfully read table "${table.name}" with ${tableInfo.schema.columnCount} column(s)${recordCount !== undefined ? ` and ${recordCount} record(s)` : ''}`,
                table: tableInfo,
                databaseId: dbId,
                toolCallId,
                executionTimeMs: executionTime,
                timeWarning: timeStatus.warningMessage
              };

            } catch (error) {
              const executionTime = Date.now() - toolStartTime;
              toolExecutionTimes['read_table'] = (toolExecutionTimes['read_table'] || 0) + executionTime;
              
              console.error('[ERROR] Read table failed:', error);
              return {
                success: false,
                error: `Failed to read table: ${error instanceof Error ? error.message : 'Unknown error'}`,
                tableId,
                toolCallId,
                executionTimeMs: executionTime,
                timeWarning: timeStatus.warningMessage
              };
            }
          }
        }),

        delete_table: tool({
          description: 'Delete a table and all its records from the database. THIS IS DESTRUCTIVE and cannot be undone.',
          inputSchema: z.object({
            tableId: z.number().describe('The unique ID of the table to delete (get from list_tables tool)')
          }),
          execute: async ({ tableId }, { abortSignal, toolCallId }) => {
            const toolStartTime = Date.now();
            const timeStatus = getTimeStatus();

            // Check time budget
            if (!timeStatus.shouldContinue) {
              return {
                success: false,
                error: `⏱️ Time budget exceeded (${timeStatus.elapsed}ms). ${timeStatus.warningMessage}`,
                toolCallId,
                executionTimeMs: Date.now() - toolStartTime,
                timeWarning: timeStatus.warningMessage
              }
            }

            try {
              // Get database ID
              const dbId = databaseId;
              if (!dbId) {
                return {
                  success: false,
                  error: 'No database found for this project.',
                  toolCallId,
                  executionTimeMs: Date.now() - toolStartTime,
                  timeWarning: timeStatus.warningMessage
                };
              }

              // First, get table info for confirmation message
              const readResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/database/${dbId}/tables/${tableId}`, {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                }
              });

              if (!readResponse.ok) {
                return {
                  success: false,
                  error: 'Table not found or already deleted',
                  databaseId: dbId,
                  tableId,
                  toolCallId,
                  executionTimeMs: Date.now() - toolStartTime,
                  timeWarning: timeStatus.warningMessage
                };
              }

              const tableData = await readResponse.json();
              const tableName = tableData.table?.name || 'Unknown';

              // Call the delete table API endpoint
              const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/database/${dbId}/tables/${tableId}`, {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json',
                }
              });

              const result = await response.json();
              const executionTime = Date.now() - toolStartTime;
              toolExecutionTimes['delete_table'] = (toolExecutionTimes['delete_table'] || 0) + executionTime;

              if (!response.ok) {
                console.error('[ERROR] Delete table failed:', result);
                return {
                  success: false,
                  error: `Failed to delete table: ${result.error || 'Unknown error'}`,
                  databaseId: dbId,
                  tableId,
                  tableName,
                  toolCallId,
                  executionTimeMs: executionTime,
                  timeWarning: timeStatus.warningMessage
                };
              }

              const deletedRecords = result.deletedRecords || 0;

              console.log('[SUCCESS] Table deleted:', { tableId, tableName, deletedRecords });
              return {
                success: true,
                message: `✅ Successfully deleted table "${tableName}" and ${deletedRecords} record(s)`,
                tableId,
                tableName,
                deletedRecords,
                databaseId: dbId,
                toolCallId,
                executionTimeMs: executionTime,
                timeWarning: timeStatus.warningMessage
              };

            } catch (error) {
              const executionTime = Date.now() - toolStartTime;
              toolExecutionTimes['delete_table'] = (toolExecutionTimes['delete_table'] || 0) + executionTime;
              
              console.error('[ERROR] Delete table failed:', error);
              return {
                success: false,
                error: `Failed to delete table: ${error instanceof Error ? error.message : 'Unknown error'}`,
                tableId,
                toolCallId,
                executionTimeMs: executionTime,
                timeWarning: timeStatus.warningMessage
              };
            }
          }
        })

      },
      stopWhen: stepCountIs(60),
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

    // Helper function to capture streaming state for continuation
    const captureStreamingState = (currentMessages: any[], toolResults: any[] = []) => {
      const timeStatus = getTimeStatus();

      // Capture current session storage state
      const currentSessionData = sessionProjectStorage.get(projectId);

      return {
        continuationToken: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        elapsedTimeMs: timeStatus.elapsed,
        messages: currentMessages,
        toolResults,
        sessionData: {
          projectId,
          modelId,
          aiMode,
          fileTree: clientFileTree,
          files: clientFiles
        },
        sessionStorage: currentSessionData ? {
          fileTree: currentSessionData.fileTree,
          files: Array.from(currentSessionData.files.entries()).map(([path, fileData]) => ({
            path,
            data: {
              workspaceId: fileData.workspaceId,
              name: fileData.name,
              content: fileData.content,
              fileType: fileData.fileType,
              type: fileData.type,
              size: fileData.size,
              isDirectory: fileData.isDirectory
            }
          }))
        } : null,
        systemPrompt,
        conversationSummaryContext
      };
    };

    // Stream the response using newline-delimited JSON format (not SSE)
    // This matches the format used in stream.ts and expected by chatparse.tsx
    return new Response(
      new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder()
          let currentMessages = [...processedMessages]
          let toolResults: any[] = []
          let shouldContinue = false
          let accumulatedContent = ''
          let accumulatedReasoning = ''

          try {
            // Stream the text and tool calls with continuation monitoring
            for await (const part of result.fullStream) {
              // Check if we should trigger continuation
              const timeStatus = getTimeStatus();
              if (timeStatus.shouldContinue && !shouldContinue) {
                shouldContinue = true;
                console.log('[Chat-V2] Triggering stream continuation due to timeout approach');

                // Update currentMessages with accumulated content before capturing state
                if (currentMessages.length > 0 && currentMessages[currentMessages.length - 1].role === 'assistant') {
                  currentMessages[currentMessages.length - 1] = {
                    ...currentMessages[currentMessages.length - 1],
                    content: accumulatedContent,
                    reasoning: accumulatedReasoning
                  }
                }

                // Send continuation signal to frontend
                const continuationState = captureStreamingState(currentMessages, toolResults);
                controller.enqueue(encoder.encode(JSON.stringify({
                  type: 'continuation_signal',
                  continuationState,
                  message: 'Stream will continue in new request'
                }) + '\n'));

                // Don't send more content after continuation signal
                break;
              }

              // Update current state for continuation tracking
              if (part.type === 'text-delta') {
                if (part.text) {
                  // Filter reasoning patterns from text before accumulating
                  const filteredText = filterReasoningPatterns(part.text)
                  if (filteredText) {
                    accumulatedContent += filteredText
                    // Update part with filtered text
                    part.text = filteredText
                  } else {
                    // Skip this part entirely if it was pure reasoning noise
                    continue
                  }
                }
              } else if (part.type === 'reasoning-delta') {
                if (part.text) {
                  accumulatedReasoning += part.text
                }
              } else if (part.type === 'tool-call') {
                toolResults.push(part);
              } else if (part.type === 'tool-result') {
                toolResults.push(part);
              }

              // Send each part as newline-delimited JSON (no SSE "data:" prefix)
              controller.enqueue(encoder.encode(JSON.stringify(part) + '\n'))
            }
          } catch (error) {
            console.error('[Chat-V2] Stream error:', error)

            // If we error out near timeout, still try to send continuation signal
            const timeStatus = getTimeStatus();
            if (timeStatus.elapsed > STREAM_CONTINUE_THRESHOLD_MS - 10000) { // Within 10s of threshold
              try {
                // Update currentMessages with accumulated content before capturing state
                if (currentMessages.length > 0 && currentMessages[currentMessages.length - 1].role === 'assistant') {
                  currentMessages[currentMessages.length - 1] = {
                    ...currentMessages[currentMessages.length - 1],
                    content: accumulatedContent,
                    reasoning: accumulatedReasoning
                  }
                }

                const continuationState = captureStreamingState(currentMessages, toolResults);
                controller.enqueue(encoder.encode(JSON.stringify({
                  type: 'continuation_signal',
                  continuationState,
                  message: 'Stream interrupted, continuing in new request',
                  error: error instanceof Error ? error.message : 'Unknown streaming error'
                }) + '\n'));
              } catch (continuationError) {
                console.error('[Chat-V2] Failed to send continuation signal:', continuationError);
              }
            }
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
    // Clean up request timeout
    clearTimeout(requestTimeoutId);
    
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

  // Don't trim empty lines to preserve exact whitespace for matching
  // Only check if we have any content at all
  const hasSearchContent = searchLines.some(line => line.trim() !== '');
  const hasReplaceContent = replaceLines.some(line => line.trim() !== '');

  if (!hasSearchContent && !hasReplaceContent) {
    return null; // Completely empty block
  }

  return {
    search: searchLines.join('\n'),
    replace: replaceLines.join('\n')
  };
}