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

    // Get user from Supabase auth first
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { workspaceId, subdomain, files } = await req.json()

    if (!subdomain || !files?.length) {
      return NextResponse.json({
        error: 'Subdomain and files are required'
      }, { status: 400 })
    }

    // Validate subdomain format
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(subdomain)) {
      return NextResponse.json({
        error: 'Subdomain contains invalid characters. Only lowercase letters, numbers, and hyphens are allowed. Cannot start or end with a hyphen.',
        code: 'INVALID_SUBDOMAIN'
      }, { status: 400 })
    }

    if (subdomain.length > 63) {
      return NextResponse.json({
        error: 'Subdomain is too long. Maximum 63 characters allowed.',
        code: 'SUBDOMAIN_TOO_LONG'
      }, { status: 400 })
    }

    // Check if subdomain is already taken
    const { data: existingDeployment } = await supabase
      .from('subdomain_tracking')
      .select('subdomain')
      .eq('subdomain', subdomain)
      .eq('is_active', true)
      .single()

    if (existingDeployment) {
      return NextResponse.json({
        error: 'Subdomain is already taken',
        code: 'SUBDOMAIN_TAKEN'
      }, { status: 409 })
    }

    // Initialize storage manager and get files from workspace
    await storageManager.init()
    let projectFiles = files

    if (!projectFiles || !Array.isArray(projectFiles) || projectFiles.length === 0) {
      // If no files provided, try to get files from workspaceId if provided
      if (workspaceId) {
        projectFiles = await storageManager.getFiles(workspaceId)
      }
      if (!projectFiles || projectFiles.length === 0) {
        return NextResponse.json({ error: 'No files found in workspace' }, { status: 400 })
      }
    }

    console.log(`Starting wildcard deployment for ${subdomain}.pipilot.dev with ${projectFiles.length} files`)

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

      if (archiveName.endsWith('.tar.gz')) {
        // Extract tar.gz in sandbox and download individual files
        console.log('Extracting tar.gz in sandbox...')
        const extractResult = await sandbox.executeCommand(
          'cd /project && mkdir -p extracted && tar -xzf dist.tar.gz -C extracted/',
          { workingDirectory: '/project' }
        )

        if (extractResult.exitCode !== 0) {
          throw new Error(`TAR extraction failed: ${extractResult.stderr}`)
        }

        // List all files in the extracted directory
        const listResult = await sandbox.executeCommand(
          'cd /project/extracted && find . -type f',
          { workingDirectory: '/project' }
        )

        if (listResult.exitCode === 0) {
          const filesList = listResult.stdout.trim().split('\n').filter(f => f.length > 0)

          for (const filePath of filesList) {
            try {
              const cleanPath = filePath.startsWith('./') ? filePath.substring(2) : filePath
              const fileContent = await sandbox.downloadFile(`/project/extracted/${cleanPath}`)
              extractedFiles.push(fileContent)
              filePaths.push(cleanPath)
            } catch (error) {
              console.warn(`Failed to download file ${filePath}:`, error)
            }
          }
        }
      } else {
        // Handle ZIP files
        const result = await extractArchive(Buffer.from(archiveContent), archiveName)
        extractedFiles = result.files
        filePaths = result.paths
      }

      console.log(`Extracted ${extractedFiles.length} files from archive`)
      console.log(`File paths:`, filePaths)

      // Upload to Supabase Storage
      console.log('Uploading files to Supabase Storage...')
      const deploymentUrl = await uploadBuildToSupabase(subdomain, extractedFiles, filePaths)
      const storagePath = `projects/${subdomain}`
      console.log(`Files uploaded successfully to ${storagePath}`)

      // Record deployment in IndexedDB (storage-manager)
      // Use user ID as workspaceId since we're creating a deployment for the user
      const deploymentRecord = await storageManager.createDeployment({
        workspaceId: user.id,
        url: deploymentUrl,
        status: 'ready',
        provider: 'pipilot',
        environment: 'production',
        externalId: subdomain
      })

      // Record subdomain tracking in Supabase
      // Use user ID as workspace_id since this is a user-specific deployment
      const { error: trackingError } = await supabase
        .from('subdomain_tracking')
        .insert({
          subdomain,
          user_id: user.id,
          workspace_id: user.id, // Use user ID as workspace_id for user-specific deployments
          deployment_url: deploymentUrl,
          storage_path: storagePath,
          is_active: true
        })

      if (trackingError) {
        console.error('Failed to create subdomain tracking:', trackingError)
        // Don't fail the deployment, but log the error
      }

      console.log(`Deployment completed successfully: ${deploymentUrl}`)

      return NextResponse.json({
        url: deploymentUrl,
        subdomain,
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
