import { createClient } from '@/lib/supabase/server'
import {
  createEnhancedSandbox,
  SandboxError,
  SandboxErrorType,
  type SandboxFile,
  type EnhancedE2BSandbox
} from '@/lib/e2b-enhanced'
import { storageManager } from '@/lib/storage-manager'
import { NextRequest, NextResponse } from 'next/server'
import JSZip from 'jszip'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { supabaseStorage } from '@/lib/supabase-storage'
import FormData from 'form-data'

/**
 * Parse environment variables from .env file content
 */
function parseEnvFile(content: string): Record<string, string> {
  const envVars: Record<string, string> = {}

  if (!content) return envVars

  const lines = content.split('\n')

  for (const line of lines) {
    const trimmedLine = line.trim()
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue
    }

    const eqIndex = trimmedLine.indexOf('=')
    if (eqIndex > 0) {
      const key = trimmedLine.substring(0, eqIndex).trim()
      let value = trimmedLine.substring(eqIndex + 1).trim()

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
 * Deploy build to Cloudflare Pages
 */
async function deployToCloudflarePages(projectName: string, zipContent: Buffer): Promise<string> {
  const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID
  const CF_API_TOKEN = process.env.CF_API_TOKEN
  const PROJECT_NAME = projectName

  if (!CF_ACCOUNT_ID || !CF_API_TOKEN) {
    throw new Error('Cloudflare credentials not configured. Please set CF_ACCOUNT_ID and CF_API_TOKEN environment variables.')
  }

  console.log(`Setting up Cloudflare Pages project: ${projectName}...`)

  try {
    const fetch = (await import('node-fetch')).default
    const FormData = (await import('form-data')).default

    // Step 1: Check if project already exists
    const checkProjectUrl = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/pages/projects/${PROJECT_NAME}`
    const checkResponse = await fetch(checkProjectUrl, {
      method: 'GET',
      headers: { Authorization: `Bearer ${CF_API_TOKEN}` },
    })

    let projectExists = false
    if (checkResponse.ok) {
      const checkData = await checkResponse.json() as { success: boolean; result?: { name: string }; errors?: unknown[] }
      if (checkData.success && checkData.result) {
        projectExists = true
        console.log('✅ Cloudflare Pages project already exists:', checkData.result.name)
      }
    } else if (checkResponse.status === 401) {
      throw new Error('Cloudflare API authentication failed. Please check your CF_API_TOKEN.')
    } else if (checkResponse.status === 403) {
      throw new Error('Cloudflare API access denied. Please check your account permissions.')
    } else if (checkResponse.status !== 404) {
      // 404 is expected when project doesn't exist, other errors are problematic
      const errorText = await checkResponse.text()
      console.error('Error checking project existence:', errorText)
      throw new Error(`Failed to check Cloudflare project: ${errorText}`)
    }

    // Step 2: Create the Cloudflare Pages project if it doesn't exist
    if (!projectExists) {
      console.log(`Creating new Cloudflare Pages project: ${projectName}...`)
      const createProjectUrl = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/pages/projects`
      const createResponse = await fetch(createProjectUrl, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${CF_API_TOKEN}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ 
          name: PROJECT_NAME, 
          production_branch: 'main'
        }),
      })

      if (!createResponse.ok) {
        const errorText = await createResponse.text()
        console.error('Failed to create Cloudflare Pages project:', errorText)
        
        // Provide specific error messages
        if (createResponse.status === 401) {
          throw new Error('Cloudflare API authentication failed. Please check your CF_API_TOKEN.')
        } else if (createResponse.status === 403) {
          throw new Error('Cloudflare API access denied. Please check your account permissions.')
        } else if (createResponse.status === 409) {
          throw new Error('Cloudflare project name already exists. Please try a different name.')
        }
        
        throw new Error(`Failed to create Cloudflare Pages project: ${errorText}`)
      } else {
        const createData = await createResponse.json() as { success: boolean; result?: { name: string }; errors?: unknown[] }
        console.log('✅ Cloudflare Pages project created successfully:', createData.result?.name)
      }
    }

    // Step 3: Deploy to the project
    console.log(`Deploying ${projectName} to Cloudflare Pages...`)
    const form = new FormData()
    
    // Ensure the zip is correctly added to the form
    form.append('file', zipContent, { 
      filename: 'dist.zip', 
      contentType: 'application/zip' 
    })

    // Add manifest for routing
    const manifest = {
      "version": 1,
      "routes": [
        {
          "source": "/*",
          "destination": "/index.html"
        }
      ]
    }
    form.append('manifest', JSON.stringify(manifest))

    const deployUrl = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/pages/projects/${PROJECT_NAME}/deployments`
    const deployResponse = await fetch(deployUrl, {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${CF_API_TOKEN}`, 
        ...form.getHeaders() 
      },
      body: form,
    })

    if (!deployResponse.ok) {
      const errorText = await deployResponse.text()
      console.error('Deployment error:', errorText)
      
      // Provide more specific error messages based on status code
      if (deployResponse.status === 401) {
        throw new Error('Cloudflare API authentication failed. Please check your CF_API_TOKEN.')
      } else if (deployResponse.status === 403) {
        throw new Error('Cloudflare API access denied. Please check your account permissions.')
      } else if (deployResponse.status === 404) {
        throw new Error('Cloudflare project not found. Please check your CF_ACCOUNT_ID.')
      }
      
      throw new Error(`Cloudflare API error! status: ${deployResponse.status}, message: ${errorText}`)
    }

    const data = await deployResponse.json() as { 
      success: boolean; 
      result?: { 
        url: string, 
        deployment_id: string 
      }; 
      errors?: unknown[] 
    }

    if (data.success && data.result) {
      const deploymentUrl = data.result.url
      console.log(`✅ Cloudflare Pages deployment successful! URL: ${deploymentUrl}`)
      return deploymentUrl
    } else {
      console.error('❌ Cloudflare Pages deployment failed:', data.errors)
      throw new Error(`Cloudflare deployment failed: ${JSON.stringify(data.errors || 'Unknown error')}`)
    }
  } catch (error) {
    console.error('Cloudflare Pages deployment error:', error)
    throw error
  }
}

/**
 * Upload build files to Supabase Storage
 */
async function uploadBuildToSupabase(
  subdomain: string,
  files: Buffer[],
  filePaths: string[]
): Promise<string> {
  const storageFiles = files.map((content, index) => ({
    path: filePaths[index],
    content,
    contentType: getContentType(filePaths[index])
  }))

  const basePath = `projects/${subdomain}`

  // Upload files using our storage utility
  await supabaseStorage.uploadFiles('projects', basePath, storageFiles)

  return `https://${subdomain}.pipilot.dev`
}

/**
 * Get content type based on file extension
 */
function getContentType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase()

  const contentTypes: Record<string, string> = {
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'json': 'application/json',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon',
    'woff': 'font/woff',
    'woff2': 'font/woff2',
    'ttf': 'font/ttf',
    'eot': 'application/vnd.ms-fontobject'
  }

  return contentTypes[ext || ''] || 'application/octet-stream'
}

/**
 * Extract files from ZIP buffer
 */
async function extractArchive(archiveBuffer: Buffer, archiveName: string): Promise<{ files: Buffer[], paths: string[] }> {
  if (archiveName.endsWith('.zip')) {
    // Handle ZIP files
    const zip = new JSZip()
    const zipContent = await zip.loadAsync(archiveBuffer)

    const files: Buffer[] = []
    const paths: string[] = []

    for (const [path, file] of Object.entries(zipContent.files)) {
      if (!file.dir) {
        const content = await file.async('nodebuffer')
        files.push(content)
        paths.push(path)
      }
    }

    return { files, paths }
  } else if (archiveName.endsWith('.tar.gz')) {
    // For tar.gz, we'll extract it using the tar command in the sandbox
    // This is a fallback - we'll handle this differently
    throw new Error('TAR.GZ extraction not implemented yet')
  } else {
    throw new Error(`Unsupported archive format: ${archiveName}`)
  }
}

export async function POST(req: Request) {
  try {
    const e2bApiKey = process.env.E2B_API_KEY
    if (!e2bApiKey) {
      return NextResponse.json({ error: 'E2B API key missing' }, { status: 500 })
    }

    const { workspaceId, files, projectName, isRedeploy } = await req.json()

    if (!workspaceId || !files?.length) {
      return NextResponse.json({
        error: 'Workspace ID and files are required'
      }, { status: 400 })
    }

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Initialize storage manager and get files from workspace
    await storageManager.init()
    let projectFiles = files

    if (!projectFiles || !Array.isArray(projectFiles) || projectFiles.length === 0) {
      projectFiles = await storageManager.getFiles(workspaceId)
      if (projectFiles.length === 0) {
        return NextResponse.json({ error: 'No files found in workspace' }, { status: 400 })
      }
    }

    console.log(`Starting Cloudflare Pages deployment for ${projectName || 'unnamed project'} with ${projectFiles.length} files`)

    // Create E2B sandbox for build process
    const sandbox = await createEnhancedSandbox({
      template: "base",
      timeoutMs: 900000,
      env: {}
    })

    try {
      // Write project files to sandbox
      const sandboxFiles: SandboxFile[] = projectFiles.map((file: any) => ({
        path: `/project/${file.path}`,
        content: file.content || "",
      }))

      // Add package.json if missing
      const hasPackageJson = projectFiles.some((f: any) => f.path === 'package.json')
      if (!hasPackageJson) {
        const packageJson = {
          name: 'pipilot-project',
          version: '0.1.0',
          private: true,
          packageManager: 'pnpm@8.15.0',
          scripts: {
            dev: 'vite',
            build: 'vite build',
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
      console.log('Files written to sandbox')

      // Install dependencies
      console.log('Installing dependencies...')
      const installResult = await sandbox.executeCommand('npm install', {
        workingDirectory: '/project',
        onStdout: (data) => console.log(`[npm Install] ${data}`),
        onStderr: (data) => console.warn(`[npm Install Error] ${data}`),
      })

      if (installResult.exitCode !== 0) {
        console.error('Dependency installation failed:', installResult.stderr)
        throw new Error(`Dependency installation failed with exit code ${installResult.exitCode}`)
      }
      console.log('Dependencies installed successfully')

      // Build the project
      console.log('Building project with npm run build...')
      const buildResult = await sandbox.executeCommand('npm run build', {
        workingDirectory: '/project'
      })

      if (buildResult.exitCode !== 0) {
        console.error('Build failed:', buildResult.stderr)
        console.error('Build stdout:', buildResult.stdout)
        throw new Error(`Build failed with exit code ${buildResult.exitCode}: ${buildResult.stderr}`)
      }
      console.log('Project built successfully')

      // Ensure zip utility is available
      console.log('Ensuring zip utility is available...')
      try {
        const checkZipResult = await sandbox.executeCommand('which zip', {
          workingDirectory: '/project'
        })
        if (checkZipResult.exitCode !== 0) {
          console.log('Zip not found, trying to install...')
          // Try with sudo if available
          await sandbox.executeCommand('sudo apt-get update && sudo apt-get install -y zip', {
            workingDirectory: '/project'
          })
        } else {
          console.log('Zip utility already available')
        }
      } catch (error) {
        console.warn('Failed to install zip utility:', error)
        // Continue without zip - we'll use tar instead
        console.log('Will use tar for compression instead')
      }

      // Validate and log dist folder contents
      const validateDistFolder = async (sandbox: EnhancedE2BSandbox) => {
        const listResult = await sandbox.executeCommand('cd /project && find dist -type f', {
          workingDirectory: '/project'
        })

        if (listResult.exitCode !== 0) {
          throw new Error('Failed to list dist folder contents')
        }

        const files = listResult.stdout.trim().split('\n')
        const requiredFiles = ['dist/index.html']
        const missingFiles = requiredFiles.filter(file => 
          !files.some((f: string) => f.endsWith(file.replace('dist/', '')))
        )

        if (missingFiles.length > 0) {
          console.warn('Missing required files:', missingFiles)
          throw new Error(`Missing critical deployment files: ${missingFiles.join(', ')}`)
        }

        // Log file sizes
        const sizeResults = await Promise.all(
          files.map(async (file: string) => {
            const sizeResult = await sandbox.executeCommand(`du -h "${file}"`, {
              workingDirectory: '/project'
            })
            return `${file}: ${sizeResult.stdout.trim()}`
          })
        )
        console.log('Deployment file sizes:', sizeResults)

        console.log('Dist folder validation successful')
        console.log('Files found:', files)

        return files
      }

      // Validate and log dist folder contents
      const distFiles = await validateDistFolder(sandbox)

      // Compress dist folder for Cloudflare Pages deployment
      console.log('Compressing dist folder...')
      let archiveName = 'dist.zip'

      try {
        // Advanced Python ZIP creation with file filtering
        const pythonZipResult = await sandbox.executeCommand(
          `python3 -c '
import zipfile, os, sys
try:
    os.chdir("/project")
    excluded_dirs = ["node_modules", ".git", ".next", "__pycache__"]
    excluded_files = [".DS_Store", ".env", "*.log"]
    with zipfile.ZipFile("dist.zip", "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk("dist"):
            # Filter out excluded directories
            dirs[:] = [d for d in dirs if d not in excluded_dirs]
            
            for file in files:
                # Skip excluded files
                if not any(file.endswith(ext) for ext in excluded_files):
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, ".")
                    zipf.write(file_path, arcname)

    # Get file size and print
    file_size = os.path.getsize("dist.zip")
    print("Created dist.zip " + str(file_size) + " bytes")
    sys.exit(0)
except Exception as e:
    print("Compression error: " + str(e), file=sys.stderr)
    sys.exit(1)
'`,
          { workingDirectory: '/project' }
        )

        if (pythonZipResult.exitCode !== 0) {
          console.error('Python ZIP compression failed:', pythonZipResult.stderr)
          
          // Fallback to tar compression
          try {
            const tarResult = await sandbox.executeCommand(
              'cd /project && tar -czf dist.tar.gz dist/',
              { workingDirectory: '/project' }
            )

            if (tarResult.exitCode === 0) {
              console.log('Dist folder compressed with tar successfully')
              archiveName = 'dist.tar.gz'
            } else {
              throw new Error(`TAR compression failed: ${tarResult.stderr}`)
            }
          } catch (tarError) {
            console.error('TAR compression failed:', tarError)
            
            // Last resort: manual file compression
            try {
              const filesResult = await sandbox.executeCommand(
                'cd /project && mkdir -p dist_zip && cp -r dist/* dist_zip/ && cd dist_zip && python3 -m zipfile -c ../dist.zip .',
                { workingDirectory: '/project' }
              )

              if (filesResult.exitCode !== 0) {
                throw new Error(`Manual ZIP compression failed: ${filesResult.stderr}`)
              }

              console.log('Dist folder compressed using Python zipfile module')
            } catch (manualZipError) {
              console.error('All compression methods failed:', manualZipError)
              throw new Error('Failed to compress dist folder for Cloudflare Pages deployment')
            }
          }
        } else {
          console.log('Dist folder compressed successfully with Python ZIP')
        }
      } catch (zipError) {
        console.error('Compression error:', zipError)
        throw new Error('Failed to compress dist folder for Cloudflare Pages deployment')
      }

      // Download the archive file
      console.log(`Downloading ${archiveName} from sandbox...`)
      const archiveContent = await sandbox.downloadFile(`/project/${archiveName}`)
      console.log(`Downloaded archive file: ${archiveContent.length} bytes`)

      // Deploy ZIP archive directly to Cloudflare Pages
      const deploymentUrl = await deployToCloudflarePages(
        isRedeploy && projectName 
          ? projectName 
          : `pipilot-${workspaceId.slice(0, 8)}-${Date.now()}`, 
        archiveContent
      )

      // Record deployment in storage manager
      const deploymentRecord = await storageManager.createDeployment({
        workspaceId,
        url: deploymentUrl,
        status: 'ready',
        provider: 'pipilot',
        environment: 'production',
        externalId: projectName || `pipilot-${workspaceId.slice(0, 8)}-${Date.now()}`
      })

      return NextResponse.json({ 
        url: deploymentUrl, 
        projectName: projectName || deploymentRecord.externalId, 
        status: 'ready',
        deploymentId: deploymentRecord.id 
      }, { status: 200 })
    } catch (error: unknown) {
      console.error('Deployment error:', error)
      
      // Safely handle different error types
      const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === 'string' 
          ? error 
          : 'Unknown deployment error'

      return NextResponse.json({ 
        error: errorMessage 
      }, { status: 500 })
    } finally {
      // Safely terminate the sandbox
      try {
        await sandbox.terminate()
      } catch (cleanupError) {
        console.warn('Sandbox termination error:', cleanupError)
      }
    }
  } catch (error: unknown) {
    console.error('Outer deployment error:', error)
    
    // Safely handle different error types
    const errorMessage = error instanceof Error 
      ? error.message 
      : typeof error === 'string' 
        ? error 
        : 'Unknown deployment error'

    return NextResponse.json({ 
      error: errorMessage 
    }, { status: 500 })
  }
}