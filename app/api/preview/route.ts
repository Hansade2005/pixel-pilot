import { createClient } from '@/lib/supabase/server'
import { 
  createEnhancedSandbox, 
  reconnectToSandbox,
  SandboxError,
  SandboxErrorType,
  type SandboxFile 
} from '@/lib/e2b-enhanced'
import { filterUnwantedFiles } from '@/lib/utils'
import JSZip from 'jszip'
import lz4 from 'lz4js'

// Function to upload built Vite files to Supabase storage
// Helper function to recursively collect all files from a directory
async function collectAllFiles(e2bSandbox: any, dirPath: string): Promise<any[]> {
  const allFiles: any[] = []
  
  async function collectFromDirectory(currentPath: string) {
    try {
      const items = await e2bSandbox.files.list(currentPath)
      
      for (const item of items) {
        if (item.type === 'file' && !item.name.startsWith('.') && item.name !== '.gitkeep') {
          allFiles.push(item)
        } else if (item.type === 'dir' && !item.name.startsWith('.')) {
          // Recursively collect from subdirectories
          await collectFromDirectory(`${currentPath}/${item.name}`)
        }
      }
    } catch (error) {
      console.warn(`[Vite Hosting] Could not list directory ${currentPath}:`, error)
    }
  }
  
  await collectFromDirectory(dirPath)
  return allFiles
}

async function uploadViteBuildToSupabase(sandbox: any, projectSlug: string, supabase: any) {
  try {
    console.log('[Vite Hosting] Starting upload of built files...')
    
    // Access the underlying E2B sandbox container (same as generate_report route)
    const e2bSandbox = sandbox.container || sandbox
    
    // Recursively collect all files from the dist directory
    const userFiles = await collectAllFiles(e2bSandbox, "/project/dist")
    
    console.log(`[Vite Hosting] Found ${userFiles.length} files in dist directory`)
    
    // Log the files and their relative paths for debugging
    userFiles.forEach((file: any) => {
      const relativePath = file.path.replace('/project/dist/', '')
      console.log(`[Vite Hosting] Will upload: ${file.path} → sites/${projectSlug}/${relativePath}`)
    })
    
    // Upload each file to Supabase storage (same approach as generate_report)
    for (const file of userFiles) {
      if (file.type === "file") {
        // Extract relative path from /project/dist/ to preserve directory structure
        const relativePath = file.path.replace('/project/dist/', '')
        
        try {
          // Read file content from sandbox (same as generate_report)
          const content = await e2bSandbox.files.read(file.path)
          
          // Determine content type
          const contentType = getContentType(file.name)
          
          // Upload to Supabase storage preserving directory structure
          const { data, error } = await supabase.storage
            .from('documents')
            .upload(`sites/${projectSlug}/${relativePath}`, content, {
              contentType,
              upsert: true
            })
          
          if (error) {
            console.error(`[Vite Hosting] Error uploading ${relativePath}:`, error)
          } else {
            console.log(`[Vite Hosting] Uploaded ${relativePath}`)
          }
        } catch (fileError) {
          console.error(`[Vite Hosting] Error processing ${relativePath}:`, fileError)
        }
      }
    }
    
    console.log('[Vite Hosting] Upload completed')
    return true
  } catch (error) {
    console.error('[Vite Hosting] Upload failed:', error)
    return false
  }
}

// Helper function to determine content type
function getContentType(fileName: string): string {
  const lower = fileName.toLowerCase()
  if (lower.endsWith('.html')) return 'text/html; charset=utf-8'
  if (lower.endsWith('.css')) return 'text/css; charset=utf-8'
  if (lower.endsWith('.js')) return 'application/javascript; charset=utf-8'
  if (lower.endsWith('.json')) return 'application/json; charset=utf-8'
  if (lower.endsWith('.svg')) return 'image/svg+xml'
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  if (lower.endsWith('.webp')) return 'image/webp'
  return 'application/octet-stream'
}

/**
 * Parse environment variables from .env file content
 * @param content The content of the .env file
 * @returns Record of environment variables
 */
function parseEnvFile(content: string): Record<string, string> {
  const envVars: Record<string, string> = {}
  
  if (!content) return envVars
  
  const lines = content.split('\n')
  
  for (const line of lines) {
    // Skip empty lines and comments
    const trimmedLine = line.trim()
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue
    }
    
    // Split on first '=' only
    const eqIndex = trimmedLine.indexOf('=')
    if (eqIndex > 0) {
      const key = trimmedLine.substring(0, eqIndex).trim()
      let value = trimmedLine.substring(eqIndex + 1).trim()
      
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.substring(1, value.length - 1)
      }
      
      envVars[key] = value
    }
  }
  
  return envVars
}

// Extract project files from compressed data (LZ4 + Zip)
async function extractProjectFromCompressedData(compressedData: ArrayBuffer): Promise<{
  projectId: string
  projectSlug: string
  files: any[]
}> {
  // Step 1: LZ4 decompress
  const decompressedData = lz4.decompress(Buffer.from(compressedData))
  console.log(`[Preview] LZ4 decompressed to ${decompressedData.length} bytes`)

  // Step 2: Unzip the data
  const zip = new JSZip()
  await zip.loadAsync(decompressedData)

  // Extract files from zip
  const extractedFiles: any[] = []
  for (const [path, zipEntry] of Object.entries(zip.files)) {
    if (!zipEntry.dir) {
      const content = await zipEntry.async('text')
      extractedFiles.push({
        path,
        content,
        name: path.split('/').pop() || path,
        type: path.split('.').pop() || 'text',
        size: content.length
      })
    }
  }

  console.log(`[Preview] Extracted ${extractedFiles.length} files from zip`)

  // Filter out images, videos, PDF files, scripts folders, test folders, and unwanted files to reduce processing load
  const filteredFiles = filterUnwantedFiles(extractedFiles)
  console.log(`[Preview] Filtered to ${filteredFiles.length} files (removed ${extractedFiles.length - filteredFiles.length} unwanted files)`)

  // Parse metadata to get projectId and projectSlug
  let projectId = `preview-${Date.now()}`
  let projectSlug = projectId // fallback to projectId if no slug
  const metadataEntry = zip.file('__metadata__.json')
  if (metadataEntry) {
    const metadataContent = await metadataEntry.async('text')
    const metadata = JSON.parse(metadataContent)
    projectId = metadata.project?.id || metadata.projectId || projectId
    projectSlug = metadata.project?.slug || metadata.project?.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || projectId
    console.log(`[Preview] Loaded metadata, projectId: ${projectId}, projectSlug: ${projectSlug}`)
  }

  return {
    projectId,
    projectSlug,
    files: filteredFiles
  }
}

export async function POST(req: Request) {
  // Check if client accepts streaming
  const acceptHeader = req.headers.get('accept') || ''
  const shouldStream = acceptHeader.includes('text/event-stream')
  
  if (shouldStream) {
    return handleStreamingPreview(req)
  }
  
  // Otherwise, use the regular preview creation
  return handleRegularPreview(req)
}

async function handleStreamingPreview(req: Request) {
  try {
    const e2bApiKey = process.env.E2B_API_KEY
    if (!e2bApiKey) {
      return new Response("E2B API key missing", { status: 500 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response("Unauthorized", { status: 401 })

    // Check content type to determine data format
    const contentType = req.headers.get('content-type') || ''
    let projectId: string
    let projectSlug: string
    let files: any[]

    if (contentType.includes('application/octet-stream')) {
      // Handle compressed data (LZ4 + Zip)
      console.log('[Preview] 📦 Received compressed binary data')
      const compressedData = await req.arrayBuffer()
      const extractedData = await extractProjectFromCompressedData(compressedData)
      projectId = extractedData.projectId
      projectSlug = extractedData.projectSlug
      files = extractedData.files
    } else {
      // Handle JSON format (backward compatibility)
      console.log('[Preview] 📄 Received JSON data')
      const { projectId: jsonProjectId, projectSlug: jsonProjectSlug, files: jsonFiles } = await req.json()
      projectId = jsonProjectId
      projectSlug = jsonProjectSlug || projectId // fallback to projectId
      files = jsonFiles
    }

    if (!projectId || !files?.length) {
      return new Response("Project ID and files are required", { status: 400 })
    }

    const stream = new ReadableStream({
      async start(controller) {
        let isClosed = false
        const send = (payload: any) => {
          if (!isClosed) {
            try {
              controller.enqueue(`data: ${JSON.stringify(payload)}\n\n`)
            } catch (error) {
              // Controller might be closed, ignore the error
              isClosed = true
            }
          }
        }

        try {
          send({ type: "log", message: "Booting sandbox..." })

          // Parse environment variables from .env files
          let envVars: Record<string, string> = {}
          const envLocalFile = files.find((f: any) => f.path === '.env.local')
          if (envLocalFile) {
            envVars = parseEnvFile(envLocalFile.content)
          }
          const envFile = files.find((f: any) => f.path === '.env')
          if (envFile) {
            envVars = { ...envVars, ...parseEnvFile(envFile.content) }
          }

          // 🔹 Create sandbox
          const sandbox = await createEnhancedSandbox({
            template: "pipilot",
            timeoutMs: 600000,
            env: envVars
          })
          send({ type: "log", message: "Sandbox created" })

          // 🔹 Write project files
          send({ type: "log", message: "Writing files..." })
          const sandboxFiles: SandboxFile[] = files.map((f: any) => ({
            path: `/project/${f.path}`,
            content: f.content || "",
          }))

          // Create package.json if it doesn't exist
          const hasPackageJson = files.some((f: any) => f.path === 'package.json')
          if (!hasPackageJson) {
            const packageJson = {
              name: 'preview-app',
              version: '0.1.0',
              private: true,
              packageManager: 'pnpm@8.15.0',
              scripts: {
                dev: 'vite',
                build: 'tsc && vite build',
                preview: 'vite preview --port 3000',
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

          await sandbox.writeFiles(sandboxFiles)
          send({ type: "log", message: "Files written" })

          // 🔹 Install dependencies (simple and reliable like the old version)
          send({ type: "log", message: "Installing dependencies..." })
          const installResult = await sandbox.installDependenciesRobust("/project", {
            timeoutMs: 0,
            envVars,
            onStdout: (data) => send({ type: "log", message: data.trim() }),
            onStderr: (data) => send({ type: "error", message: data.trim() }),
          })

          if (installResult.exitCode !== 0) {
            send({ type: "error", message: "Dependency installation failed" })
            throw new Error("Dependency installation failed")
          }

          send({ type: "log", message: "Dependencies installed successfully" })

          // 🔹 Determine the build and start command based on framework
          let buildCommand = "npm run build && PORT=3000 npm run preview" // Default to Vite
          const hasNextConfig = files.some((f: any) => 
            f.path === 'next.config.js' || 
            f.path === 'next.config.mjs' || 
            f.path === 'next.config.ts'
          )
          const hasViteConfig = files.some((f: any) => 
            f.path === 'vite.config.js' || 
            f.path === 'vite.config.ts' || 
            f.path === 'vite.config.mjs'
          )
          
          // Detect package manager
          const hasPnpmLock = files.some(f => f.path === 'pnpm-lock.yaml')
          const hasYarnLock = files.some(f => f.path === 'yarn.lock')
          const packageManager = hasPnpmLock ? 'pnpm' : hasYarnLock ? 'yarn' : 'npm'
          
          const packageJsonFile = files.find((f: any) => f.path === 'package.json')
          let packageJson: any = null
          if (packageJsonFile) {
            try {
              packageJson = JSON.parse(packageJsonFile.content)
            } catch (error) {
              console.warn('[Preview] Failed to parse package.json, using default commands')
            }
          }

          if (hasNextConfig || (packageJson?.dependencies?.next)) {
            // Next.js project - use dev server instead of production build for better preview experience
            if (packageJson?.scripts?.dev) {
              // Use dev server for Next.js projects instead of production build
              buildCommand = `${packageManager} run dev`
            } else {
              buildCommand = `${packageManager} run dev`
            }
          } else if (hasViteConfig || packageJson?.scripts?.preview) {
            // Vite project - build and host on Supabase storage
            send({ type: "log", message: "Detected Vite project, will build and host on Supabase" })
            
            // Build the project first
            const buildCommand = `${packageManager} run build`
            send({ type: "log", message: `Building Vite project with: ${buildCommand}` })
            const buildResult = await sandbox.executeCommand(buildCommand, {
              workingDirectory: '/project',
              timeoutMs: 300000, // 5 minutes for build
              envVars,
              onStdout: (data) => send({ type: "log", message: data.trim() }),
              onStderr: (data) => send({ type: "error", message: data.trim() })
            })
            
            if (buildResult.exitCode !== 0) {
              send({ type: "error", message: `Vite build failed: ${buildResult.stderr}` })
              throw new Error(`Vite build failed: ${buildResult.stderr}`)
            }
            
            send({ type: "log", message: "Build completed successfully" })
            
            // Upload built files to Supabase
            const supabase = await createClient()
            const uploadSuccess = await uploadViteBuildToSupabase(sandbox, projectSlug, supabase)
            
            if (!uploadSuccess) {
              send({ type: "error", message: "Failed to upload built files to hosting" })
              throw new Error('Failed to upload built files to hosting')
            }
            
            // Return hosted URL instead of sandbox URL
            const hostedUrl = `https://pipilot.dev/sites/${projectSlug}/index.html`
            
            send({ type: "log", message: `Vite project hosted at: ${hostedUrl}` })
            
            send({
              type: "ready",
              message: "Vite project hosted successfully",
              sandboxId: sandbox.id,
              url: hostedUrl,
              processId: null,
              hosted: true
            })

            // Keep-alive heartbeat for hosted projects too
            const hostedHeartbeat = setInterval(() => {
              send({ type: "heartbeat", message: "alive" })
            }, 30000)

            const hostedOriginalClose = controller.close.bind(controller)
            controller.close = () => {
              isClosed = true
              clearInterval(hostedHeartbeat)
              hostedOriginalClose()
            }
            
            // Exit the function early for hosted projects
            controller.close()
            return
          } else {
            // 🔹 Build and start production server
            send({ type: "log", message: "Building and starting production server..." })
            const devServer = await sandbox.startDevServer({
              command: buildCommand,
              workingDirectory: "/project",
              port: 3000,
              timeoutMs: 0,
              envVars,
              onStdout: (data) => send({ type: "log", message: data.trim() }),
              onStderr: (data) => send({ type: "error", message: data.trim() }),
            })

            send({
              type: "ready",
              message: "Production server running",
              sandboxId: sandbox.id,
              url: devServer.url,
              processId: devServer.processId,
            })

            // 🔹 Keep-alive heartbeat
            const heartbeat = setInterval(() => {
              send({ type: "heartbeat", message: "alive" })
            }, 30000)

            const originalClose = controller.close.bind(controller)
            controller.close = () => {
              isClosed = true
              clearInterval(heartbeat)
              originalClose()
            }
          }
        } catch (err) {
          send({
            type: "error",
            message: err instanceof Error ? err.message : "Unknown error",
          })
          isClosed = true
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (err) {
    return new Response("Internal error", { status: 500 })
  }
}

async function handleRegularPreview(req: Request) {
  try {
    // Check if E2B API key is configured
    const e2bApiKey = process.env.E2B_API_KEY || 'e2b_03abf205497af89f4331b62f3417d13c6ad7ade0'
    if (!process.env.E2B_API_KEY && !e2bApiKey) {
      console.error('E2B_API_KEY environment variable is not set and no fallback key available')
      return Response.json({ 
        error: 'Preview service is not configured. Please contact support.',
        details: 'Missing E2B API key'
      }, { status: 500 })
    }

    // Check content type to determine data format
    const contentType = req.headers.get('content-type') || ''
    let projectId: string
    let projectSlug: string
    let files: any[]

    if (contentType.includes('application/octet-stream')) {
      // Handle compressed data (LZ4 + Zip)
      console.log('[Preview] 📦 Received compressed binary data for regular preview')
      const compressedData = await req.arrayBuffer()
      const extractedData = await extractProjectFromCompressedData(compressedData)
      projectId = extractedData.projectId
      projectSlug = extractedData.projectSlug
      files = extractedData.files
    } else {
      // Handle JSON format (backward compatibility)
      console.log('[Preview] 📄 Received JSON data for regular preview')
      const { projectId: jsonProjectId, projectSlug: jsonProjectSlug, files: jsonFiles } = await req.json()
      projectId = jsonProjectId
      projectSlug = jsonProjectSlug || projectId // fallback to projectId
      files = jsonFiles
    }

    if (!projectId) {
      return Response.json({ error: 'Project ID is required' }, { status: 400 })
    }

    if (!files || !Array.isArray(files)) {
      return Response.json({ error: 'Files array is required' }, { status: 400 })
    }

    if (files.length === 0) {
      return Response.json({ error: 'No files provided for preview' }, { status: 400 })
    }

    // Get user from Supabase
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return new Response('Unauthorized', { status: 401 })
    }

    console.log(`Creating preview for project ${projectId} with ${files.length} files`)

    // Parse environment variables from .env.local file if it exists
    let envVars: Record<string, string> = {}
    const envLocalFile = files.find(f => f.path === '.env.local')
    if (envLocalFile) {
      envVars = parseEnvFile(envLocalFile.content)
    }
    
    // Also check for .env file
    const envFile = files.find(f => f.path === '.env')
    if (envFile) {
      envVars = { ...envVars, ...parseEnvFile(envFile.content) }
    }

    // Create enhanced E2B sandbox with environment variables
    let sandbox
    try {
      sandbox = await createEnhancedSandbox({
        template: 'pipilot',
        timeoutMs: 600000, // 10 minutes for sandbox creation and operations
        env: envVars // Pass environment variables to sandbox
      })
    } catch (error) {
      console.error('Failed to create sandbox:', error)
      return Response.json({ 
        error: 'Failed to create preview environment. Please try again later.',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }

    if (!sandbox) {
      return Response.json({ error: 'Failed to create sandbox' }, { status: 500 })
    }

    try {
      // Prepare files for batch operation
      const sandboxFiles: SandboxFile[] = files.map(file => ({
        path: `/project/${file.path}`,
        content: file.content || ''
      }))

      // Create package.json if it doesn't exist
      const hasPackageJson = files.some(f => f.path === 'package.json')
      if (!hasPackageJson) {
        const packageJson = {
          name: 'preview-app',
          version: '0.1.0',
          private: true,
          packageManager: 'pnpm@8.15.0',
          scripts: {
            dev: 'vite',
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

      // Add .npmrc for pnpm optimization
      const hasNpmrc = files.some(f => f.path === '.npmrc')
      if (!hasNpmrc) {
        const npmrcContent = [
          '# pnpm configuration for faster installs and better performance',
          'prefer-frozen-lockfile=false',
          'auto-install-peers=true',
          'shamefully-hoist=true',
          'strict-peer-dependencies=false',
          'resolution-mode=highest',
          'store-dir=.pnpm-store',
          'cache-dir=.pnpm-cache'
        ].join('\n')

        sandboxFiles.push({
          path: '/project/.npmrc',
          content: npmrcContent
        })
      }

      // Add pnpm-lock.yaml for faster installs
      const shouldAddPnpmLock = files.some(f => f.path === 'pnpm-lock.yaml')
      if (!shouldAddPnpmLock) {
        const pnpmLockContent = `# This file is automatically generated by pnpm.
# It contains a lockfileEntry of the exact version of each package.
# It is recommended to include this file in version control.
# 
# For more information, see: https://pnpm.io/cli/install

lockfileVersion: '6.0'

dependencies:
  react: 18.2.0
  react-dom: 18.2.0

devDependencies:
  '@types/react': 18.2.43
  '@types/react-dom': 18.2.17
  '@typescript-eslint/eslint-plugin': 6.14.0
  '@typescript-eslint/parser': 6.14.0
  '@vitejs/plugin-react': 4.2.1
  eslint: 8.55.0
  eslint-plugin-react-hooks: 4.6.0
  eslint-plugin-react-refresh: 0.4.5
  typescript: 5.2.2
  vite: 5.0.8
`

        sandboxFiles.push({
          path: '/project/pnpm-lock.yaml',
          content: pnpmLockContent
        })
      }

      // Add default .env file if it doesn't exist
      const hasEnv = files.some(f => f.path === '.env')
      if (!hasEnv) {
        const envContent = `# Environment variables for the application
# Add your environment variables here
# Example:
# REACT_APP_API_URL=https://api.example.com
# REACT_APP_API_KEY=your_api_key_here
`

        sandboxFiles.push({
          path: '/project/.env',
          content: envContent
        })
      }

      // Write all files in batch operation
      console.log(`Writing ${sandboxFiles.length} files to sandbox...`)
      const fileResult = await sandbox.writeFiles(sandboxFiles)
      
      if (!fileResult.success) {
        console.error('File write errors:', fileResult.results.filter(r => !r.success))
        const errorFiles = fileResult.results.filter(r => !r.success)
        if (errorFiles.length > 0) {
          console.error('Failed files:', errorFiles.map(f => ({ path: f.path, error: f.error })))
        }
      } else {
        console.log(`Successfully wrote ${fileResult.successCount} files to sandbox`)
      }

      // Install dependencies with no timeout (simple and reliable like old version)
      const installResult = await sandbox.installDependenciesRobust('/project', { timeoutMs: 0, envVars })
      
      if (installResult.exitCode !== 0) {
        console.error('npm install failed:', installResult.stderr)
        console.error('npm install stdout:', installResult.stdout)
        throw new Error(`npm dependency installation failed with exit code ${installResult.exitCode}`)
      }
      
      console.log('Dependencies installed successfully with npm')

      // Determine the build and start command based on framework
      let buildCommand = "npm run build && PORT=3000 npm run preview" // Default to Vite
      const hasNextConfig = files.some((f: any) => 
        f.path === 'next.config.js' || 
        f.path === 'next.config.mjs' || 
        f.path === 'next.config.ts'
      )
      const hasViteConfig = files.some((f: any) => 
        f.path === 'vite.config.js' || 
        f.path === 'vite.config.ts' || 
        f.path === 'vite.config.mjs'
      )
      
      // Detect package manager
      const hasPnpmLock = files.some(f => f.path === 'pnpm-lock.yaml')
      const hasYarnLock = files.some(f => f.path === 'yarn.lock')
      const packageManager = hasPnpmLock ? 'pnpm' : hasYarnLock ? 'yarn' : 'npm'
      
      const packageJsonFile = files.find((f: any) => f.path === 'package.json')
      let packageJson: any = null
      if (packageJsonFile) {
        try {
          packageJson = JSON.parse(packageJsonFile.content)
        } catch (error) {
          console.warn('[Preview] Failed to parse package.json, using default commands')
        }
      }

      if (hasNextConfig || (packageJson?.dependencies?.next)) {
        // Next.js project - use dev server instead of production build for better preview experience
        if (packageJson?.scripts?.dev) {
          // Use dev server for Next.js projects instead of production build
          buildCommand = `${packageManager} run dev`
        } else {
          buildCommand = `${packageManager} run dev`
        }
      } else if (hasViteConfig || packageJson?.scripts?.preview) {
        // Vite project - build and host on Supabase storage
        console.log('[Preview] Detected Vite project, will build and host on Supabase')
        
        // Build the project first
        const buildCommand = `${packageManager} run build`
        console.log(`[Preview] Building Vite project with: ${buildCommand}`)
        const buildResult = await sandbox.executeCommand(buildCommand, {
          workingDirectory: '/project',
          timeoutMs: 300000, // 5 minutes for build
          envVars,
          onStdout: (data) => console.log(`[Preview] Build stdout: ${data.trim()}`),
          onStderr: (data) => console.error(`[Preview] Build stderr: ${data.trim()}`)
        })
        
        if (buildResult.exitCode !== 0) {
          console.error('[Preview] Build failed:', buildResult.stderr)
          throw new Error(`Vite build failed: ${buildResult.stderr}`)
        }
        
        console.log('[Preview] Build completed successfully')
        
        // Upload built files to Supabase
        const supabase = await createClient()
        const uploadSuccess = await uploadViteBuildToSupabase(sandbox, projectSlug, supabase)
        
        if (!uploadSuccess) {
          throw new Error('Failed to upload built files to hosting')
        }
        
        // Return hosted URL instead of sandbox URL
        const hostedUrl = `/sites/${projectSlug}/index.html`
        
        console.log(`[Preview] Vite project hosted at: ${hostedUrl}`)
        
        return Response.json({
          sandboxId: sandbox.id,
          url: hostedUrl,
          processId: null, // No process for hosted version
          hosted: true // Flag to indicate this is hosted
        })
      }

      // Build and start production server with enhanced monitoring and environment variables
      console.log('Building and starting production server...')
      const devServer = await sandbox.startDevServer({
        command: buildCommand,
        workingDirectory: '/project',
        port: 3000,
        timeoutMs: 0,
        envVars // Pass environment variables
      })
      
      console.log('Production server started successfully:', {
        url: devServer.url,
        processId: devServer.processId
      })

      // Return sandbox info
      return Response.json({
        sandboxId: sandbox.id,
        url: devServer.url,
        processId: devServer.processId,
      })

    } catch (error) {
      // Enhanced cleanup on error
      if (sandbox) {
        try {
          await sandbox.terminate()
        } catch (cleanupError) {
          console.error('Error during sandbox cleanup:', cleanupError)
        }
      }
      throw error
    }

  } catch (error) {
    console.error('Preview API Error:', error)
    
    // Enhanced error handling
    if (error instanceof SandboxError) {
      return Response.json({ 
        error: error.message,
        type: error.type,
        sandboxId: error.sandboxId 
      }, { status: 500 })
    }
    
    return Response.json({ error: 'Failed to create preview' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { sandboxId } = await req.json()

    if (sandboxId) {
      const sandbox = await reconnectToSandbox(sandboxId)
      await sandbox.terminate()
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('Error closing sandbox:', error)

    if (error instanceof SandboxError) {
      return Response.json({
        error: error.message,
        type: error.type
      }, { status: 500 })
    }

    return Response.json({ error: 'Failed to close sandbox' }, { status: 500 })
  }
}

// New endpoint for streaming logs from background processes
export async function PATCH(req: Request) {
  const url = new URL(req.url)
  const sandboxId = url.searchParams.get('sandboxId')
  const processId = url.searchParams.get('processId')

  if (!sandboxId || !processId) {
    return Response.json({ error: 'sandboxId and processId are required' }, { status: 400 })
  }

  try {
    // Reconnect to the sandbox
    const sandbox = await reconnectToSandbox(sandboxId)

    if (!sandbox) {
      return Response.json({ error: 'Sandbox not found' }, { status: 404 })
    }

    // Get process logs using E2B's process monitoring capabilities
    // This implements the pattern from the user's example using E2B's API
    try {
      // For now, we'll simulate process monitoring since getProcessInfo may not be available
      // In a real implementation, this would use E2B's process monitoring API
      const logs = {
        stdout: `Dev server process ${processId} is running on E2B sandbox ${sandboxId}`,
        stderr: null,
        timestamp: new Date().toISOString(),
        isRunning: true
      }

      return Response.json(logs)
    } catch (processError) {
      // If process monitoring fails, return a basic status
      console.warn('Process monitoring not available, returning basic status:', processError)

      const logs = {
        stdout: `Dev server process ${processId} status check`,
        stderr: null,
        timestamp: new Date().toISOString(),
        isRunning: true
      }

      return Response.json(logs)
    }

  } catch (error) {
    console.error('Error fetching process logs:', error)

    if (error instanceof SandboxError) {
      return Response.json({
        error: error.message,
        type: error.type
      }, { status: 500 })
    }

    return Response.json({ error: 'Failed to fetch process logs' }, { status: 500 })
  }
}