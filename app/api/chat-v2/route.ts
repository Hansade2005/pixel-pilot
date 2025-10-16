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
    const body = await req.json()
    const {
      messages = [], // Default to empty array if not provided
      projectId,
      project,
      files = [], // Default to empty array
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

    console.log('[Chat-V2] Request received:', { 
      projectId, 
      modelId, 
      aiMode, 
      messageCount: messages?.length || 0,
      hasMessages: !!messages
    })

    // Auth check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // NOTE: File operations are now client-side only
    // No server-side file sync needed - client handles file operations directly on IndexedDB
    console.log(`[Chat-V2] Client-side file operations enabled - all file operations execute on IndexedDB`)
    const clientFiles = files || []
    console.log(`[Chat-V2] Project has ${clientFiles.length} files available in IndexedDB`)

    // Get storage manager
    const storageManager = await getStorageManager()

    // Build project context from files
    const projectContext = files && files.length > 0 
      ? `\n\n## 📁 Project Files\n${files.map((f: any) => `- ${f.path} (${f.type})`).join('\n')}`
      : ''

    // Get conversation history for context (last 10 messages) - Same format as /api/chat/route.ts
    let conversationSummaryContext = ''
    try {
      // Ensure messages is an array before using slice
      const recentMessages = Array.isArray(messages) ? messages.slice(-20) : []
      
      if (recentMessages && recentMessages.length > 0) {
        // Filter out system messages and empty content
        const filteredMessages = recentMessages.filter((msg: any) => 
          msg.role !== 'system' && msg.content && msg.content.trim().length > 0
        )

        // Create full history from filtered messages in AI-readable format
        // Exact same format as /api/chat/route.ts
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
        console.log('[Chat-V2][HISTORY] Formatted conversation history for AI:', {
          totalMessages: recentMessages.length,
          filteredMessages: filteredMessages.length,
          historyLength: conversationSummaryContext.length
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
- **CLIENT-SIDE TOOLS** (Execute on IndexedDB): read_file (with line numbers), write_file, edit_file, delete_file, add_package, remove_package
- **SERVER-SIDE TOOLS**: web_search, web_extract, semantic_code_navigator (with line numbers), check_dev_errors, list_files

Note: File and package operation tools (read_file, write_file, edit_file, delete_file, add_package, remove_package) execute on the client-side IndexedDB directly. You call them and the client handles the actual operations automatically.

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

${conversationSummaryContext || ''}`

    // Get AI model
    const model = getAIModel(modelId)

    // Validate messages
    if (!messages || messages.length === 0) {
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
      messages,
      tools: {
        // CLIENT-SIDE TOOL: Executed on frontend IndexedDB
        // The execute function forwards the call to the client
        write_file: tool({
          description: 'Create or update a file in the project. Use this tool to create new files or update existing ones with new content. This tool executes on the client-side IndexedDB.',
          inputSchema: z.object({
            path: z.string().describe('The file path relative to project root (e.g., "src/components/Button.tsx")'),
            content: z.string().describe('The complete file content to write')
          }),
          execute: async ({ path, content }, { toolCallId }) => {
            // Return a marker indicating this tool is handled by the client
            // The client will intercept the tool-call event and execute it on IndexedDB
            console.log(`[Chat-V2][write_file] Forwarding to client: ${path}`)
            return {
              _clientSideTool: true,
              toolName: 'write_file',
              path,
              message: `File operation forwarded to client: ${path}`,
              toolCallId
            }
          }
        }),

        // CLIENT-SIDE TOOL: Executed on frontend IndexedDB
        read_file: tool({
          description: 'Read the contents of a file with optional line number information. This tool executes on the client-side IndexedDB.',
          inputSchema: z.object({
            path: z.string().describe('File path to read'),
            includeLineNumbers: z.boolean().optional().describe('Whether to include line numbers in the response (default: false)')
          }),
          execute: async ({ path, includeLineNumbers }, { toolCallId }) => {
            console.log(`[Chat-V2][read_file] Forwarding to client: ${path}`)
            return {
              _clientSideTool: true,
              toolName: 'read_file',
              path,
              message: `File operation forwarded to client: ${path}`,
              toolCallId
            }
          }
        }),

        // CLIENT-SIDE TOOL: Executed on frontend IndexedDB
        delete_file: tool({
          description: 'Delete a file from the project. Use this tool to remove files that are no longer needed. This tool executes on the client-side IndexedDB.',
          inputSchema: z.object({
            path: z.string().describe('The file path relative to project root to delete')
          }),
          execute: async ({ path }, { toolCallId }) => {
            console.log(`[Chat-V2][delete_file] Forwarding to client: ${path}`)
            return {
              _clientSideTool: true,
              toolName: 'delete_file',
              path,
              message: `File operation forwarded to client: ${path}`,
              toolCallId
            }
          }
        }),

        // CLIENT-SIDE TOOL: Executed on frontend IndexedDB
        edit_file: tool({
          description: 'Edit an existing file using search/replace blocks. Use this tool to make precise modifications to file content. This tool executes on the client-side IndexedDB.',
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
            console.log(`[Chat-V2][edit_file] Forwarding to client: ${filePath}`)
            return {
              _clientSideTool: true,
              toolName: 'edit_file',
              path: filePath,
              message: `File operation forwarded to client: ${filePath}`,
              toolCallId
            }
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
            const { name: packageNames, version = 'latest', isDev = false } = input
            console.log(`[Chat-V2][add_package] Forwarding to client:`, { packageNames, version, isDev })
            return {
              _clientSideTool: true,
              toolName: 'add_package',
              message: `Package operation forwarded to client: ${Array.isArray(packageNames) ? packageNames.join(', ') : packageNames}`,
              toolCallId
            }
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
            const { name: packageNames, isDev = false } = input
            console.log(`[Chat-V2][remove_package] Forwarding to client:`, { packageNames, isDev })
            return {
              _clientSideTool: true,
              toolName: 'remove_package',
              message: `Package operation forwarded to client: ${Array.isArray(packageNames) ? packageNames.join(', ') : packageNames}`,
              toolCallId
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
        }),

        semantic_code_navigator: tool({
          description: 'Search and discover code sections, patterns, or structures in files using natural language queries. Returns results with accurate line numbers matching Monaco editor display.',
          inputSchema: z.object({
            query: z.string().describe('Natural language description of what to search for (e.g., "find all React components", "show database models", "locate error handlers")'),
            filePath: z.string().optional().describe('Optional: Specific file path to search within. If omitted, searches the entire workspace'),
            maxResults: z.number().optional().describe('Maximum number of results to return (default: 10)')
          }),
          execute: async ({ query, filePath, maxResults = 10 }, { abortSignal, toolCallId }) => {
            if (abortSignal?.aborted) {
              throw new Error('Operation cancelled')
            }

            try {
              const { storageManager } = await import('@/lib/storage-manager')
              await storageManager.init()

              // Get all files in the project
              const allFiles = await storageManager.getFiles(projectId)

              // Filter files based on filePath if provided
              let filesToSearch = allFiles
              if (filePath) {
                filesToSearch = allFiles.filter((file: any) => file.path === filePath)
                if (filesToSearch.length === 0) {
                  return {
                    success: false,
                    error: `File not found: ${filePath}`,
                    query,
                    toolCallId
                  }
                }
              }

              const results: any[] = []

              // Search through each file
              for (const file of filesToSearch) {
                if (!file.content || file.isDirectory) continue

                const content = file.content
                const lines = content.split('\n')
                const lowerQuery = query.toLowerCase()

                // Search for different types of code patterns
                const searchPatterns = [
                  // Function/class definitions
                  {
                    type: 'function',
                    regex: /^\s*(export\s+)?(async\s+)?(function|const|let|var)\s+(\w+)\s*[=({]/gm,
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
                  // Generic text search for other queries
                  {
                    type: 'text_match',
                    regex: new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
                    description: 'Text match'
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

                    results.push({
                      file: file.path,
                      type: pattern.type,
                      description: pattern.description,
                      lineNumber,
                      match: match[0].trim(),
                      context: highlightedContext,
                      fullMatch: match[0]
                    })

                    // Prevent infinite loops for global regex
                    if (!pattern.regex.global) break
                  }
                }

                if (results.length >= maxResults) break
              }

              return {
                success: true,
                message: `Found ${results.length} code sections matching "${query}"`,
                query,
                results,
                totalResults: results.length,
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
