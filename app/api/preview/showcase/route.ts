import { createClient } from '@/lib/supabase/server'
import { TemplateManager } from '@/lib/template-manager'
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
    return handleStreamingShowcasePreview(req)
  }

  // Otherwise, use the regular showcase preview creation
  return handleRegularShowcasePreview(req)
}

async function handleStreamingShowcasePreview(req: Request) {
  try {
    const e2bApiKey = process.env.E2B_API_KEY
    if (!e2bApiKey) {
      return new Response("E2B API key missing", { status: 500 })
    }

    const { projectId, templateId } = await req.json()

    if (!projectId || !templateId) {
      return new Response("Project ID and Template ID are required", { status: 400 })
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
          send({ type: "log", message: "Loading showcase project..." })

          // Get the template
          const template = TemplateManager.getTemplateById(templateId)
          if (!template) {
            send({ type: "error", message: "Template not found" })
            throw new Error("Template not found")
          }

          send({ type: "log", message: `Loaded template: ${template.title}` })

          // Parse environment variables from template files
          let envVars: Record<string, string> = {}
          const envLocalFile = template.files.find((f: { path: string; content: string }) => f.path === '.env.local')
          if (envLocalFile) {
            envVars = parseEnvFile(envLocalFile.content)
          }
          const envFile = template.files.find((f: { path: string; content: string }) => f.path === '.env')
          if (envFile) {
            envVars = { ...envVars, ...parseEnvFile(envFile.content) }
          }

          // 🔹 Create sandbox
          const sandbox = await createEnhancedSandbox({
            template: "base",
            timeoutMs: 900000,
            env: envVars
          })
          send({ type: "log", message: "Sandbox created" })

          // 🔹 Write template files
          send({ type: "log", message: "Writing template files..." })
          const sandboxFiles: SandboxFile[] = template.files.map((f: { path: string; content: string }) => ({
            path: `/project/${f.path}`,
            content: f.content || "",
          }))

          await sandbox.writeFiles(sandboxFiles)
          send({ type: "log", message: "Template files written" })

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
            timeoutMs: 60000, // Increase timeout to 60 seconds
            envVars,
            onStdout: (data) => {
              send({ type: "log", message: data.trim() })
              // Debug: Log server readiness indicators
              if (data.includes('ready') || data.includes('Local:') || data.includes('3000')) {
                console.log(`[${sandbox.id}] Server readiness indicator: ${data.trim()}`)
              }
            },
            onStderr: (data) => {
              send({ type: "error", message: data.trim() })
              console.error(`[${sandbox.id}] Dev server error: ${data.trim()}`)
            },
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

async function handleRegularShowcasePreview(req: Request) {
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

    const { projectId, templateId } = await req.json()

    if (!projectId || !templateId) {
      return Response.json({ error: 'Project ID and Template ID are required' }, { status: 400 })
    }

    // Get user from Supabase
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return new Response('Unauthorized', { status: 401 })
    }

    console.log(`Creating showcase preview for project ${projectId} with template ${templateId}`)

    try {
      // Get the template
      const template = TemplateManager.getTemplateById(templateId)
      if (!template) {
        return Response.json({ error: 'Template not found' }, { status: 404 })
      }

      console.log(`Loaded template: ${template.title} with ${template.files.length} files`)

      // Parse environment variables from template files
      let envVars: Record<string, string> = {}
      const envLocalFile = template.files.find((f: { path: string; content: string }) => f.path === '.env.local')
      if (envLocalFile) {
        envVars = parseEnvFile(envLocalFile.content)
      }

      const envFile = template.files.find((f: { path: string; content: string }) => f.path === '.env')
      if (envFile) {
        envVars = { ...envVars, ...parseEnvFile(envFile.content) }
      }

      // Create enhanced E2B sandbox with environment variables
      const sandbox = await createEnhancedSandbox({
        template: 'base',
        timeoutMs: 900000,
        env: envVars
      })

      try {
        // Prepare template files for batch operation
        const sandboxFiles: SandboxFile[] = template.files.map((file: { path: string; content: string }) => ({
          path: `/project/${file.path}`,
          content: file.content || ''
        }))

        // Create package.json if it doesn't exist
        const hasPackageJson = template.files.some((f: { path: string; content: string }) => f.path === 'package.json')
        if (!hasPackageJson) {
          const packageJson = {
            name: 'showcase-preview-app',
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
        const hasNpmrc = template.files.some((f: { path: string; content: string }) => f.path === '.npmrc')
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

        // Write all template files in batch operation
        console.log(`Writing ${sandboxFiles.length} template files to sandbox...`)
        const fileResult = await sandbox.writeFiles(sandboxFiles)

        if (!fileResult.success) {
          console.error('File write errors:', fileResult.results.filter(r => !r.success))
          const errorFiles = fileResult.results.filter(r => !r.success)
          if (errorFiles.length > 0) {
            console.error('Failed files:', errorFiles.map(f => ({ path: f.path, error: f.error })))
          }
        } else {
          console.log(`Successfully wrote ${fileResult.successCount} template files to sandbox`)
        }

        // Install dependencies with enhanced tracking
        console.log('Installing dependencies using robust npm installation...')

        // Check sandbox health before starting installation
        const isHealthy = await sandbox.checkHealth(envVars)
        if (!isHealthy) {
          throw new Error('Sandbox is not responsive, cannot proceed with dependency installation')
        }

        // Install dependencies with no timeout and environment variables
        const installResult = await sandbox.installDependenciesRobust('/project', { timeoutMs: 0, envVars })

        if (installResult.exitCode !== 0) {
          console.error('npm install failed:', installResult.stderr)
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
          envVars
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
          templateTitle: template.title,
          templateId: templateId
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
      console.error('Showcase Preview API Error:', error)

      // Enhanced error handling
      if (error instanceof SandboxError) {
        return Response.json({
          error: error.message,
          type: error.type,
          sandboxId: error.sandboxId
        }, { status: 500 })
      }

      return Response.json({ error: 'Failed to create showcase preview' }, { status: 500 })
    }
  } catch (error) {
    console.error('Unexpected error in handleRegularShowcasePreview:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
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
    console.error('Error closing showcase sandbox:', error)

    if (error instanceof SandboxError) {
      return Response.json({
        error: error.message,
        type: error.type
      }, { status: 500 })
    }

    return Response.json({ error: 'Failed to close showcase sandbox' }, { status: 500 })
  }
}