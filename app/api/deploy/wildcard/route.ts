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
async function extractZip(zipBuffer: Buffer): Promise<{ files: Buffer[], paths: string[] }> {
  const zip = new JSZip()
  const zipContent = await zip.loadAsync(zipBuffer)

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
}

export async function POST(req: Request) {
  try {
    const e2bApiKey = process.env.E2B_API_KEY
    if (!e2bApiKey) {
      return NextResponse.json({ error: 'E2B API key missing' }, { status: 500 })
    }

    const { workspaceId, subdomain, files } = await req.json()

    if (!workspaceId || !subdomain || !files?.length) {
      return NextResponse.json({
        error: 'Workspace ID, subdomain, and files are required'
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
      await sandbox.installDependenciesRobust("/project", {
        timeoutMs: 0,
        onStdout: (data) => console.log(`[npm Install] ${data}`),
        onStderr: (data) => console.warn(`[npm Install Error] ${data}`),
      })
      console.log('Dependencies installed')

      // Build the project
      const buildResult = await sandbox.executeCommand('npm run build', {
        workingDirectory: '/project'
      })

      if (buildResult.exitCode !== 0) {
        throw new Error(`Build failed: ${buildResult.stderr}`)
      }
      console.log('Project built successfully')

      // Compress dist folder
      const zipResult = await sandbox.executeCommand(
        'cd /project && zip -r dist.zip dist/',
        { workingDirectory: '/project' }
      )

      if (zipResult.exitCode !== 0) {
        throw new Error(`Failed to create ZIP: ${zipResult.stderr}`)
      }

      // Download the ZIP file
      const zipContent = await sandbox.getNativeInstance().files.read('/project/dist.zip')

      // Extract files from ZIP
      const { files: extractedFiles, paths: filePaths } = await extractZip(Buffer.from(zipContent))

      // Upload to Supabase Storage
      const deploymentUrl = await uploadBuildToSupabase(subdomain, extractedFiles, filePaths)
      const storagePath = `projects/${subdomain}`

      // Record deployment in IndexedDB (storage-manager)
      const deploymentRecord = await storageManager.createDeployment({
        workspaceId,
        url: deploymentUrl,
        status: 'ready',
        provider: 'pipilot',
        environment: 'production',
        externalId: subdomain
      })

      // Record subdomain tracking in Supabase
      const supabase = await createClient()
      const { error: trackingError } = await supabase
        .from('subdomain_tracking')
        .insert({
          subdomain,
          user_id: user.id,
          workspace_id: workspaceId,
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
