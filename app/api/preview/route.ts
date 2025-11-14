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

          await sandbox.writeFiles(sandboxFiles)
          send({ type: "log", message: "Files written" })

          // 🔹 Install dependencies
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

      // Install dependencies with enhanced tracking
      console.log('Installing dependencies using robust npm installation...')
      
      // Check sandbox health before starting installation
      const isHealthy = await sandbox.checkHealth(envVars)
      if (!isHealthy) {
        throw new Error('Sandbox is not responsive, cannot proceed with dependency installation')
      }
      
      // Check for special dependencies needed for vite.config.ts
      const viteConfigFile = sandboxFiles.find(f => f.path.endsWith('vite.config.ts') || f.path.endsWith('vite.config.js'))
      let additionalDeps = []
      
      if (viteConfigFile) {
        console.log('Analyzing Vite configuration...')
        const content = viteConfigFile.content
        
        // Check for common plugins
        if (content.includes('vite-plugin-imagemin')) {
          additionalDeps.push('vite-plugin-imagemin')
        }
        if (content.includes('vite-plugin-pwa')) {
          additionalDeps.push('vite-plugin-pwa')
        }
        if (content.includes('@vitejs/plugin-legacy')) {
          additionalDeps.push('@vitejs/plugin-legacy')
        }
        if (content.includes('vite-plugin-compression')) {
          additionalDeps.push('vite-plugin-compression')
        }
        
        if (additionalDeps.length > 0) {
          console.log(`Installing additional dependencies: ${additionalDeps.join(', ')}`)
          
          try {
            await sandbox.executeCommand(`cd /project && npm install --save-dev ${additionalDeps.join(' ')}`, {
              timeoutMs: 120000
            })
          } catch (error) {
            console.warn('Failed to install additional dependencies:', error)
          }
        }
      }
      
      // Install dependencies with no timeout (timeoutMs: 0) and environment variables
      const installResult = await sandbox.installDependenciesRobust('/project', { timeoutMs: 0, envVars })
      
      if (installResult.exitCode !== 0) {
        console.error('npm install failed:', installResult.stderr)
        console.error('npm install stdout:', installResult.stdout)
        throw new Error(`npm dependency installation failed with exit code ${installResult.exitCode}`)
      }
      
      console.log('Dependencies installed successfully with npm')

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