import { createClient } from '@/lib/supabase/server'
import {
  createEnhancedSandbox,
  SandboxError,
  SandboxErrorType,
  type SandboxFile
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
  const CF_ACCOUNT_ID = 'db96886b79e13678a20c96c5c71aeff3'
  const CF_API_TOKEN = '_5lrwCirmktMcKoWYUOzPJznqFbC5hTHDHlLRiA_'
  const PROJECT_NAME = projectName // Use project name as Cloudflare Pages project name

  console.log(`Setting up Cloudflare Pages project: ${projectName}...`)

  try {
    const fetch = (await import('node-fetch')).default

    // Step 1: Check if project already exists
    const checkProjectUrl = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/pages/projects/${PROJECT_NAME}`

    const checkResponse = await fetch(checkProjectUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${CF_API_TOKEN}`,
      },
    })

    let projectExists = false
    if (checkResponse.ok) {
      const checkData = await checkResponse.json() as {
        success: boolean
        result?: { name: string }
        errors?: unknown[]
      }
      if (checkData.success && checkData.result) {
        projectExists = true
        console.log('✅ Cloudflare Pages project already exists:', checkData.result.name)
      }
    }

    // Step 2: Create the Cloudflare Pages project if it doesn't exist
    if (!projectExists) {
      console.log(`Creating new Cloudflare Pages project: ${projectName}...`)
      const createProjectUrl = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/pages/projects`

      const createResponse = await fetch(createProjectUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${CF_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: PROJECT_NAME,
          production_branch: 'main'
        }),
      })

      if (!createResponse.ok) {
        const errorText = await createResponse.text()
        console.error('Failed to create Cloudflare Pages project:', errorText)
        throw new Error(`Failed to create Cloudflare Pages project: ${errorText}`)
      } else {
        const createData = await createResponse.json() as {
          success: boolean
          result?: { name: string }
          errors?: unknown[]
        }
        console.log('✅ Cloudflare Pages project created successfully:', createData.result?.name)
      }
    }

    // Step 3: Deploy to the project
    console.log(`Deploying ${projectName} to Cloudflare Pages...`)

    // Create form data with the ZIP file
    const form = new FormData()
    form.append('file', zipContent, {
      filename: 'dist.zip',
      contentType: 'application/zip'
    })

    const deployUrl = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/pages/projects/${PROJECT_NAME}/deployments`

    const deployResponse = await fetch(deployUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${CF_API_TOKEN}`,
        ...form.getHeaders(),
      },
      body: form,
    })

    if (!deployResponse.ok) {
      const errorText = await deployResponse.text()
      throw new Error(`Cloudflare API error! status: ${deployResponse.status}, message: ${errorText}`)
    }

    const data = await deployResponse.json() as {
      success: boolean
      result?: { url: string }
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
      console.log('Files written to sandbox')

      // Install dependencies
      console.log('Installing dependencies...')
      const installResult = await sandbox.installDependenciesRobust("/project", {
        timeoutMs: 0,
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

      // Check if dist folder exists
      console.log('Checking if dist folder exists...')
      const checkDistResult = await sandbox.executeCommand(
        'cd /project && ls -la dist/',
        { workingDirectory: '/project' }
      )

      if (checkDistResult.exitCode !== 0) {
        console.error('Dist folder not found:', checkDistResult.stderr)
        throw new Error('Build did not create dist folder. Please check your build configuration.')
      }

      // Compress dist folder (prefer tar over zip for better compatibility)
      console.log('Compressing dist folder...')
      let compressionSuccess = false
      let archiveName = 'dist.tar.gz'

      try {
        // Try tar first (usually available without installation)
        const tarResult = await sandbox.executeCommand(
          'cd /project && tar -czf dist.tar.gz dist/',
          { workingDirectory: '/project' }
        )

        if (tarResult.exitCode === 0) {
          console.log('Dist folder compressed with tar successfully')
          compressionSuccess = true
        } else {
          throw new Error(`TAR failed: ${tarResult.stderr}`)
        }
      } catch (tarError) {
        console.warn('TAR compression failed, trying zip:', tarError)

        // Fallback to zip
        try {
          const zipResult = await sandbox.executeCommand(
            'cd /project && zip -r dist.zip dist/',
            { workingDirectory: '/project' }
          )

          if (zipResult.exitCode === 0) {
            console.log('Dist folder compressed with zip successfully')
            archiveName = 'dist.zip'
            compressionSuccess = true
          } else {
            throw new Error(`ZIP failed: ${zipResult.stderr}`)
          }
        } catch (zipError) {
          console.error('Both TAR and ZIP compression failed:', zipError)
          throw new Error('Failed to compress dist folder with both tar and zip')
        }
      }

      if (!compressionSuccess) {
        throw new Error('Compression failed')
      }

      // Download the archive file
      console.log(`Downloading ${archiveName} from sandbox...`)
      const archiveContent = await sandbox.downloadFile(`/project/${archiveName}`)
      console.log(`Downloaded archive file: ${archiveContent.length} bytes`)

      // Extract files from archive
      console.log(`Extracting files from ${archiveName}...`)
      let extractedFiles: Buffer[] = []
      let filePaths: string[] = []

      // Skip file extraction - deploy ZIP archive directly to Cloudflare Pages

      console.log(`Archive downloaded successfully: ${archiveContent.length} bytes`)

      // Deploy to Cloudflare Pages
      console.log('Deploying to Cloudflare Pages...')

      // Handle project naming and redeployment
      let finalProjectName: string

      if (isRedeploy && projectName) {
        // For redeployment, use the existing project name
        finalProjectName = projectName
        console.log(`Redeploying to existing Cloudflare Pages project: ${finalProjectName}`)
      } else {
        // For new deployment, generate a unique project name
        finalProjectName = projectName
          ? `${projectName}-${Date.now()}`
          : `pipilot-${workspaceId.slice(0, 8)}-${Date.now()}`
        console.log(`Creating new Cloudflare Pages project: ${finalProjectName}`)
      }

      const deploymentUrl = await deployToCloudflarePages(finalProjectName, archiveContent)
      console.log(`Cloudflare Pages deployment successful: ${deploymentUrl}`)

      // Update or create Cloudflare Pages project metadata
      if (isRedeploy) {
        // Update existing project metadata
        const existingProjects = await storageManager.getCloudflarePagesProjects(workspaceId)
        const existingProject = existingProjects.find(p => p.name === projectName)
        if (existingProject) {
          await storageManager.updateCloudflarePagesProject(existingProject.id, {
            lastDeployment: new Date().toISOString(),
            url: deploymentUrl
          })
        }
      } else {
        // Create new project metadata
        await storageManager.createCloudflarePagesProject({
          name: finalProjectName,
          workspaceId,
          userId: user.id,
          lastDeployment: new Date().toISOString(),
          url: deploymentUrl
        })
      }

      // Record deployment in IndexedDB (storage-manager)
      const deploymentRecord = await storageManager.createDeployment({
        workspaceId,
        url: deploymentUrl,
        status: 'ready',
        provider: 'pipilot',
        environment: 'production',
        externalId: finalProjectName
      })

      // No subdomain tracking needed - using real Cloudflare Pages URLs

      console.log(`Deployment completed successfully: ${deploymentUrl}`)

      return NextResponse.json({
        url: deploymentUrl,
        projectName: finalProjectName,
        status: 'ready',
        deploymentId: deploymentRecord.id
      })

    } finally {
      await sandbox.terminate()
    }

  } catch (error) {
    console.error('Wildcard deployment error:', error)

    if (error instanceof SandboxError) {
      return NextResponse.json({
        error: error.message,
        type: error.type,
        sandboxId: error.sandboxId
      }, { status: 500 })
    }

    return NextResponse.json({ error: 'Failed to deploy to wildcard domain' }, { status: 500 })
  }
}
