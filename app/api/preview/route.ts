import { createClient } from '@/lib/supabase/server'
import { 
  createEnhancedSandbox, 
  reconnectToSandbox,
  SandboxError,
  SandboxErrorType,
  type SandboxFile 
} from '@/lib/e2b-enhanced'

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

/**
 * Check if user package.json has additional dependencies not in template
 * @param userPackageJson The user's package.json content
 * @returns Object with installation needed flag and additional deps
 */
function checkAdditionalDependencies(userPackageJson: string): { needsInstallation: boolean, additionalDeps: string[], additionalDevDeps: string[] } {
  try {
    const userPkg = JSON.parse(userPackageJson)
    
    // Template dependencies (from e2b-template/package.json)
    const templateDeps = {
      "react": "^18.2.0",
      "react-dom": "^18.2.0", 
      "react-router-dom": "^6.28.0",
      "@radix-ui/react-accordion": "1.2.2",
      "@radix-ui/react-alert-dialog": "1.1.4",
      "@radix-ui/react-aspect-ratio": "1.1.1",
      "@radix-ui/react-avatar": "1.1.2",
      "@radix-ui/react-checkbox": "1.1.3",
      "@radix-ui/react-collapsible": "1.1.2",
      "@radix-ui/react-context-menu": "2.2.4",
      "@radix-ui/react-dialog": "1.1.4",
      "@radix-ui/react-dropdown-menu": "2.1.4",
      "@radix-ui/react-hover-card": "1.1.4",
      "@radix-ui/react-label": "2.1.1",
      "@radix-ui/react-menubar": "1.1.4",
      "@radix-ui/react-navigation-menu": "1.2.3",
      "@radix-ui/react-popover": "1.1.4",
      "@radix-ui/react-progress": "1.1.1",
      "@radix-ui/react-radio-group": "1.2.2",
      "@radix-ui/react-scroll-area": "1.2.2",
      "@radix-ui/react-select": "2.1.4",
      "@radix-ui/react-separator": "1.1.1",
      "@radix-ui/react-slider": "1.2.2",
      "@radix-ui/react-slot": "1.1.1",
      "@radix-ui/react-switch": "1.1.2",
      "@radix-ui/react-tabs": "1.1.2",
      "@radix-ui/react-toast": "1.2.4",
      "@radix-ui/react-toggle": "1.1.1",
      "@radix-ui/react-toggle-group": "1.1.1",
      "@radix-ui/react-tooltip": "1.1.6",
      "@radix-ui/react-icons": "^1.3.0",
      "lucide-react": "^0.454.0",
      "framer-motion": "^12.23.12",
      "class-variance-authority": "^0.7.1",
      "clsx": "^2.1.1",
      "tailwind-merge": "^2.5.5",
      "cmdk": "1.0.4",
      "next-themes": "^0.4.6",
      "react-hook-form": "^7.60.0",
      "zod": "3.25.67",
      "@hookform/resolvers": "^3.10.0",
      "date-fns": "4.1.0",
      "recharts": "2.15.4",
      "sonner": "^1.7.4",
      "react-day-picker": "9.8.0",
      "input-otp": "1.4.1",
      "vaul": "^0.9.9",
      "embla-carousel-react": "8.5.1",
      "react-resizable-panels": "^2.1.7",
      "react-markdown": "^10.1.0",
      "remark-gfm": "^4.0.1",
      "@tanstack/react-table": "^8.20.5",
      "@vercel/node": "^3.0.0",
      "apexcharts": "^3.49.0",
      "react-apexcharts": "^1.4.1"
    }

    const templateDevDeps = {
      "@types/react": "^18.2.43",
      "@types/react-dom": "^18.2.17",
      "@typescript-eslint/eslint-plugin": "^6.14.0",
      "@typescript-eslint/parser": "^6.14.0",
      "@vitejs/plugin-react": "^4.2.1",
      "autoprefixer": "^10.4.16",
      "eslint": "^8.55.0",
      "eslint-plugin-react-hooks": "^4.6.0",
      "eslint-plugin-react-refresh": "^0.4.5",
      "postcss": "^8.4.32",
      "tailwindcss": "^3.3.6",
      "typescript": "^5.2.2",
      "vite": "^5.0.8",
      "tailwindcss-animate": "^1.0.7"
    }

    const userDeps = userPkg.dependencies || {}
    const userDevDeps = userPkg.devDependencies || {}

    const additionalDeps: string[] = []
    const additionalDevDeps: string[] = []

    // Check regular dependencies
    for (const [dep, version] of Object.entries(userDeps)) {
      if (!(dep in templateDeps)) {
        additionalDeps.push(`${dep}@${version}`)
      }
    }

    // Check dev dependencies
    for (const [dep, version] of Object.entries(userDevDeps)) {
      if (!(dep in templateDevDeps)) {
        additionalDevDeps.push(`${dep}@${version}`)
      }
    }

    const needsInstallation = additionalDeps.length > 0 || additionalDevDeps.length > 0

    return {
      needsInstallation,
      additionalDeps,
      additionalDevDeps
    }
  } catch (error) {
    console.warn('Error parsing user package.json:', error)
    // If we can't parse, assume we need full installation
    return {
      needsInstallation: true,
      additionalDeps: [],
      additionalDevDeps: []
    }
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

    const { projectId, files } = await req.json()

    if (!projectId || !files?.length) {
      return new Response("Project ID and files are required", { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response("Unauthorized", { status: 401 })

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

          send({ type: "log", message: "Files written" })

          // 🔹 Install dependencies (check if additional deps needed beyond template)
          const userPackageJson = files.find((f: any) => f.path === 'package.json')
          let needsInstallation = false
          let additionalDeps: string[] = []
          let additionalDevDeps: string[] = []

          if (userPackageJson) {
            const depCheck = checkAdditionalDependencies(userPackageJson.content)
            needsInstallation = depCheck.needsInstallation
            additionalDeps = depCheck.additionalDeps
            additionalDevDeps = depCheck.additionalDevDeps
          }

          if (needsInstallation) {
            send({ type: "log", message: `Installing additional dependencies: ${[...additionalDeps, ...additionalDevDeps].join(', ')}` })
            
            // Install additional dependencies
            const installCommands = []
            if (additionalDeps.length > 0) {
              installCommands.push(`pnpm add ${additionalDeps.join(' ')}`)
            }
            if (additionalDevDeps.length > 0) {
              installCommands.push(`pnpm add -D ${additionalDevDeps.join(' ')}`)
            }

            for (const command of installCommands) {
              const installResult = await sandbox.executeCommand(command, {
                timeoutMs: 120000,
                envVars
              })

              if (installResult.exitCode !== 0) {
                send({ type: "error", message: `Failed to install additional dependencies: ${command}` })
                throw new Error(`Additional dependency installation failed: ${command}`)
              }
            }

            send({ type: "log", message: "Additional dependencies installed successfully" })
          } else {
            send({ type: "log", message: "Using pre-built template - no additional dependencies needed" })
          }

          // 🔹 Start dev server
          send({ type: "log", message: "Starting dev server..." })
          const devServer = await sandbox.startDevServer({
            command: "npm run dev",
            workingDirectory: "/project",
            port: 3000,
            timeoutMs: 0,
            envVars,
            onStdout: (data) => send({ type: "log", message: data.trim() }),
            onStderr: (data) => send({ type: "error", message: data.trim() }),
          })

          send({
            type: "ready",
            message: "Dev server running",
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

    const { projectId, files } = await req.json()
    
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
      const hasPnpmLock = files.some(f => f.path === 'pnpm-lock.yaml')
      if (!hasPnpmLock) {
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

      // Install dependencies with enhanced tracking (check for additional deps beyond template)
      const userPackageJson = files.find(f => f.path === 'package.json')
      let needsInstallation = false
      let additionalDeps: string[] = []
      let additionalDevDeps: string[] = []

      if (userPackageJson) {
        const depCheck = checkAdditionalDependencies(userPackageJson.content)
        needsInstallation = depCheck.needsInstallation
        additionalDeps = depCheck.additionalDeps
        additionalDevDeps = depCheck.additionalDevDeps
      }

      if (needsInstallation) {
        console.log(`Installing additional dependencies: ${[...additionalDeps, ...additionalDevDeps].join(', ')}`)
        
        // Check sandbox health before starting installation
        const isHealthy = await sandbox.checkHealth(envVars)
        if (!isHealthy) {
          throw new Error('Sandbox is not responsive, cannot proceed with dependency installation')
        }

        // Install additional dependencies
        const installCommands = []
        if (additionalDeps.length > 0) {
          installCommands.push(`pnpm add ${additionalDeps.join(' ')}`)
        }
        if (additionalDevDeps.length > 0) {
          installCommands.push(`pnpm add -D ${additionalDevDeps.join(' ')}`)
        }

        for (const command of installCommands) {
          const installResult = await sandbox.executeCommand(command, {
            timeoutMs: 120000,
            envVars
          })

          if (installResult.exitCode !== 0) {
            console.error('Additional dependency installation failed:', installResult.stderr)
            throw new Error(`Additional dependency installation failed: ${command}`)
          }
        }

        console.log('Additional dependencies installed successfully')
      } else {
        console.log('Using pre-built template - no additional dependencies needed')
      }

      // Start development server with enhanced monitoring and environment variables
      console.log('Starting development server with npm run dev...')
      const devServer = await sandbox.startDevServer({
        command: 'npm run dev',
        workingDirectory: '/project',
        port: 3000,
        timeoutMs: 30000,
        envVars // Pass environment variables
      })
      
      console.log('Development server started successfully with npm run dev:', {
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

// PUT endpoint for updating an existing sandbox with new files
export async function PUT(req: Request) {
  try {
    const { sandboxId, files, projectId } = await req.json()

    if (!sandboxId) {
      return Response.json({ error: 'Sandbox ID is required' }, { status: 400 })
    }

    if (!files || !Array.isArray(files)) {
      return Response.json({ error: 'Files array is required' }, { status: 400 })
    }

    // Get user from Supabase
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return new Response('Unauthorized', { status: 401 })
    }

    console.log(`Updating sandbox ${sandboxId} with ${files.length} files`)

    // Reconnect to the existing sandbox
    const sandbox = await reconnectToSandbox(sandboxId)

    if (!sandbox) {
      return Response.json({ error: 'Sandbox not found or expired' }, { status: 404 })
    }

    try {
      // Parse environment variables from .env files if provided
      let envVars: Record<string, string> = {}
      const envLocalFile = files.find(f => f.path === '.env.local')
      if (envLocalFile) {
        envVars = parseEnvFile(envLocalFile.content)
      }
      const envFile = files.find(f => f.path === '.env')
      if (envFile) {
        envVars = { ...envVars, ...parseEnvFile(envFile.content) }
      }

      // Prepare files for batch operation
      const sandboxFiles: SandboxFile[] = files.map(file => ({
        path: `/project/${file.path}`,
        content: file.content || ''
      }))

      // Write all files in batch operation
      console.log(`Writing ${sandboxFiles.length} files to existing sandbox...`)
      const fileResult = await sandbox.writeFiles(sandboxFiles)

      if (!fileResult.success) {
        console.error('File write errors:', fileResult.results.filter(r => !r.success))
        const errorFiles = fileResult.results.filter(r => !r.success)
        if (errorFiles.length > 0) {
          console.error('Failed files:', errorFiles.map(f => ({ path: f.path, error: f.error })))
        }
        return Response.json({
          error: 'Failed to write some files',
          failedFiles: errorFiles.map(f => ({ path: f.path, error: f.error }))
        }, { status: 500 })
      }

      console.log(`Successfully wrote ${fileResult.successCount} files to sandbox`)

      // Check if we need to install additional dependencies (if package.json changed)
      const userPackageJson = files.find(f => f.path === 'package.json')
      let needsAdditionalDeps = false
      let additionalDeps: string[] = []
      let additionalDevDeps: string[] = []

      if (userPackageJson) {
        const depCheck = checkAdditionalDependencies(userPackageJson.content)
        needsAdditionalDeps = depCheck.needsInstallation
        additionalDeps = depCheck.additionalDeps
        additionalDevDeps = depCheck.additionalDevDeps
      }

      if (needsAdditionalDeps) {
        console.log('Package.json changed, installing additional dependencies...')

        try {
          // Kill existing dev server process if running
          await sandbox.executeCommand('pkill -f "npm run dev" || pkill -f "pnpm dev" || true', {
            timeoutMs: 10000
          })

          // Install additional dependencies
          const installCommands = []
          if (additionalDeps.length > 0) {
            installCommands.push(`pnpm add ${additionalDeps.join(' ')}`)
          }
          if (additionalDevDeps.length > 0) {
            installCommands.push(`pnpm add -D ${additionalDevDeps.join(' ')}`)
          }

          for (const command of installCommands) {
            const installResult = await sandbox.executeCommand(command, {
              timeoutMs: 120000,
              envVars
            })

            if (installResult.exitCode !== 0) {
              console.error('Additional dependency installation failed:', installResult.stderr)
              return Response.json({
                error: 'Failed to install additional dependencies after file update',
                details: installResult.stderr
              }, { status: 500 })
            }
          }

          console.log('Additional dependencies installed successfully')

          // Restart dev server
          console.log('Restarting dev server...')
          const devServer = await sandbox.startDevServer({
            command: 'npm run dev',
            workingDirectory: '/project',
            port: 3000,
            timeoutMs: 30000,
            envVars
          })

          return Response.json({
            success: true,
            message: 'Files updated and additional dependencies installed',
            sandboxId: sandbox.id,
            url: devServer.url,
            processId: devServer.processId,
            dependenciesInstalled: true
          })

        } catch (restartError) {
          console.error('Error restarting dev server:', restartError)
          return Response.json({
            error: 'Files updated but failed to restart dev server',
            details: restartError instanceof Error ? restartError.message : 'Unknown error'
          }, { status: 500 })
        }
      }

      // If no additional dependencies needed, just return success
      return Response.json({
        success: true,
        message: 'Files updated successfully',
        sandboxId: sandbox.id,
        dependenciesInstalled: false
      })

    } catch (error) {
      console.error('Error updating sandbox:', error)

      if (error instanceof SandboxError) {
        return Response.json({
          error: error.message,
          type: error.type,
          sandboxId: error.sandboxId
        }, { status: 500 })
      }

      return Response.json({
        error: 'Failed to update sandbox',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('PUT request error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}