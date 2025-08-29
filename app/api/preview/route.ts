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
    // Check if E2B API key is configured
    if (!process.env.E2B_API_KEY) {
      console.error('E2B_API_KEY environment variable is not set')
      
      // Create a ReadableStream that immediately sends the error
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(`data: ${JSON.stringify({ 
            error: 'Preview service is not configured. Please contact support.',
            details: 'Missing E2B API key'
          })}\n\n`)
          controller.close()
        }
      })
      
      return new Response(stream, {
        status: 500,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        }
      })
    }

    const { projectId, files } = await req.json()
    
    if (!projectId) {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(`data: ${JSON.stringify({ error: 'Project ID is required' })}\n\n`)
          controller.close()
        }
      })
      
      return new Response(stream, {
        status: 400,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        }
      })
    }

    if (!files || !Array.isArray(files)) {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(`data: ${JSON.stringify({ error: 'Files array is required' })}\n\n`)
          controller.close()
        }
      })
      
      return new Response(stream, {
        status: 400,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        }
      })
    }

    if (files.length === 0) {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(`data: ${JSON.stringify({ error: 'No files provided for preview' })}\n\n`)
          controller.close()
        }
      })
      
      return new Response(stream, {
        status: 400,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        }
      })
    }

    // Get user from Supabase
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(`data: ${JSON.stringify({ error: 'Unauthorized' })}\n\n`)
          controller.close()
        }
      })
      
      return new Response(stream, {
        status: 401,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        }
      })
    }

    // Create a ReadableStream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(`data: ${JSON.stringify({ log: 'Booting VM...' })}\n\n`)
          
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
            controller.enqueue(`data: ${JSON.stringify({ log: 'Creating Sandbox...' })}\n\n`)
            sandbox = await createEnhancedSandbox({
              template: 'base',
              timeoutMs: 900000, // 15 minutes for sandbox creation and operations
              env: envVars // Pass environment variables to sandbox
            })
            controller.enqueue(`data: ${JSON.stringify({ log: 'Sandbox Created successfully' })}\n\n`)
          } catch (error) {
            controller.enqueue(`data: ${JSON.stringify({ 
              error: 'Failed to create preview environment. Please try again later.',
              details: error instanceof Error ? error.message : 'Unknown error'
            })}\n\n`)
            controller.close()
            return
          }

          if (!sandbox) {
            controller.enqueue(`data: ${JSON.stringify({ error: 'Failed to create sandbox' })}\n\n`)
            controller.close()
            return
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
            controller.enqueue(`data: ${JSON.stringify({ log: 'Writing files to sandbox...' })}\n\n`)
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
            controller.enqueue(`data: ${JSON.stringify({ log: 'Installing dependencies...' })}\n\n`)
            console.log('Installing dependencies using robust npm installation...')
            
            // Check sandbox health before starting installation
            const isHealthy = await sandbox.checkHealth(envVars)
            if (!isHealthy) {
              controller.enqueue(`data: ${JSON.stringify({ error: 'Sandbox is not responsive, cannot proceed with dependency installation' })}\n\n`)
              throw new Error('Sandbox is not responsive, cannot proceed with dependency installation')
            }
            
            // Check for special dependencies needed for vite.config.ts
            const viteConfigFile = sandboxFiles.find(f => f.path.endsWith('vite.config.ts') || f.path.endsWith('vite.config.js'))
            let additionalDeps = []
            
            if (viteConfigFile) {
              controller.enqueue(`data: ${JSON.stringify({ log: 'Analyzing Vite configuration...' })}\n\n`)
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
                controller.enqueue(`data: ${JSON.stringify({ log: `Installing additional dependencies: ${additionalDeps.join(', ')}` })}\n\n`)
                
                try {
                  await sandbox.executeCommand(`cd /project && npm install --save-dev ${additionalDeps.join(' ')}`, {
                    timeoutMs: 120000,
                    onStdout: (data: string) => {
                      controller.enqueue(`data: ${JSON.stringify({ log: data.trim() })}\n\n`)
                    },
                    onStderr: (data: string) => {
                      controller.enqueue(`data: ${JSON.stringify({ log: data.trim() })}\n\n`)
                    }
                  })
                } catch (error) {
                  console.warn('Failed to install additional dependencies:', error)
                  controller.enqueue(`data: ${JSON.stringify({ log: 'Warning: Failed to install some additional dependencies' })}\n\n`)
                }
              }
            }
            
            // Install dependencies with no timeout (timeoutMs: 0) and environment variables
            const installResult = await sandbox.installDependenciesRobust('/project', { 
              timeoutMs: 0, 
              envVars,
              onStdout: (data: string) => {
                controller.enqueue(`data: ${JSON.stringify({ log: data.trim() })}\n\n`)
              },
              onStderr: (data: string) => {
                controller.enqueue(`data: ${JSON.stringify({ log: data.trim() })}\n\n`)
              }
            })
            
            if (installResult.exitCode !== 0) {
              console.error('npm install failed:', installResult.stderr)
              console.error('npm install stdout:', installResult.stdout)
              controller.enqueue(`data: ${JSON.stringify({ error: `npm dependency installation failed with exit code ${installResult.exitCode}` })}\n\n`)
              throw new Error(`npm dependency installation failed with exit code ${installResult.exitCode}`)
            }
            
            controller.enqueue(`data: ${JSON.stringify({ log: 'Dependencies installed successfully' })}\n\n`)
            console.log('Dependencies installed successfully with npm')

            // Start development server with enhanced monitoring and environment variables
            controller.enqueue(`data: ${JSON.stringify({ log: 'Starting Dev server...' })}\n\n`)
            console.log('Starting development server with npm run dev...')
            const devServer = await sandbox.startDevServer({
              command: 'npm run dev',
              workingDirectory: '/project',
              port: 3000,
              timeoutMs: 30000,
              envVars, // Pass environment variables
              onStdout: (data: string) => {
                controller.enqueue(`data: ${JSON.stringify({ log: data.trim() })}\n\n`)
              },
              onStderr: (data: string) => {
                controller.enqueue(`data: ${JSON.stringify({ log: data.trim() })}\n\n`)
              }
            })
            
            console.log('Development server started successfully with npm run dev:', {
              url: devServer.url,
              processId: devServer.processId
            })
            
            // Send final success message with sandbox info
            controller.enqueue(`data: ${JSON.stringify({ 
              log: 'Server ready', 
              sandboxId: sandbox.id, 
              url: devServer.url, 
              processId: devServer.processId 
            })}\n\n`)

            // Close the stream after a short delay to ensure the final message is sent
            setTimeout(() => {
              controller.close()
            }, 500)
          } catch (error) {
            // Enhanced cleanup on error
            if (sandbox) {
              try {
                await sandbox.terminate()
              } catch (cleanupError) {
                console.error('Error during sandbox cleanup:', cleanupError)
              }
            }
            
            controller.enqueue(`data: ${JSON.stringify({ 
              error: error instanceof Error ? error.message : 'Unknown error occurred'
            })}\n\n`)
            controller.close()
          }
        } catch (error) {
          controller.enqueue(`data: ${JSON.stringify({ 
            error: error instanceof Error ? error.message : 'Unknown error occurred'
          })}\n\n`)
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    })
  } catch (error) {
    console.error('Streaming Preview API Error:', error)
    
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(`data: ${JSON.stringify({ 
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        })}\n\n`)
        controller.close()
      }
    })
    
    return new Response(stream, {
      status: 500,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    })
  }
}

async function handleRegularPreview(req: Request) {
  try {
    // Check if E2B API key is configured
    if (!process.env.E2B_API_KEY) {
      console.error('E2B_API_KEY environment variable is not set')
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
        template: 'base',
        timeoutMs: 900000, // 15 minutes for sandbox creation and operations
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