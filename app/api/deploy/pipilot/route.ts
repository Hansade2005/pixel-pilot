import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createEnhancedSandbox } from '@/lib/e2b-enhanced'
import { storageManager } from '@/lib/storage-manager'

export async function POST(request: NextRequest) {
  try {
    const { projectId, siteName } = await request.json()

    if (!projectId || !siteName) {
      return NextResponse.json(
        { error: 'Project ID and site name are required' },
        { status: 400 }
      )
    }

    // Validate site name format
    const siteNameRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/
    if (!siteNameRegex.test(siteName)) {
      return NextResponse.json(
        { error: 'Site name must be lowercase alphanumeric with hyphens only' },
        { status: 400 }
      )
    }

    // Initialize storage manager
    await storageManager.init()

    // Get project files
    const project = await storageManager.getWorkspace(projectId)
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    const projectFiles = await storageManager.getFiles(projectId)
    if (!projectFiles || projectFiles.length === 0) {
      return NextResponse.json(
        { error: 'No files found in project' },
        { status: 400 }
      )
    }

    // Create E2B sandbox
    const sandbox = await createEnhancedSandbox()
    
    try {
      console.log(`✅ Sandbox created: ${sandbox.id}`)

      // Write all project files to sandbox
      const fileOperations = projectFiles.map((file: any) => ({
        path: file.path,
        content: file.content
      }))

      const writeResult = await sandbox.writeFiles(fileOperations)
      if (!writeResult.success) {
        throw new Error(`Failed to write files: ${writeResult.results.map((r: any) => r.error).join(', ')}`)
      }

      console.log(`✅ Files written to sandbox: ${writeResult.successCount}/${writeResult.totalFiles}`)

      // Install dependencies
      console.log('📦 Installing dependencies...')
      const installResult = await sandbox.executeCommand('npm install')
      if (installResult.exitCode !== 0) {
        throw new Error(`npm install failed: ${installResult.stderr}`)
      }

      // Build the project
      console.log('🔨 Building project...')
      const buildResult = await sandbox.executeCommand('npm run build')
      if (buildResult.exitCode !== 0) {
        throw new Error(`Build failed: ${buildResult.stderr}`)
      }

      // Check if dist folder exists
      const distCheck = await sandbox.executeCommand('ls -la dist/')
      if (distCheck.exitCode !== 0) {
        throw new Error('Build completed but dist folder not found')
      }

      // Create zip file of dist directory
      console.log('📦 Creating zip file of dist directory...')
      const zipResult = await sandbox.executeCommand('cd dist && zip -r ../dist.zip .')
      if (zipResult.exitCode !== 0) {
        throw new Error(`Failed to create zip file: ${zipResult.stderr}`)
      }
      
      console.log('✅ Zip file created successfully')
      
      // Download the zip file using E2B's file system
      console.log('📥 Downloading zip file...')
      const zipData = await sandbox.readFile('/dist.zip')
      if (!zipData) {
        throw new Error('Failed to download zip file')
      }
      
      console.log(`✅ Downloaded zip file (${zipData.length} bytes)`)
      
      // Unzip the file in memory
      console.log('📂 Extracting zip file...')
      const AdmZip = require('adm-zip')
      const zip = new AdmZip(Buffer.from(zipData))
      const zipEntries = zip.getEntries()
      
      if (zipEntries.length === 0) {
        throw new Error('No files found in zip archive')
      }
      
      console.log(`Found ${zipEntries.length} files in zip archive`)
      
      // Extract files from zip
      const distFiles = []
      for (const entry of zipEntries) {
        if (!entry.isDirectory) {
          const filePath = `dist/${entry.entryName}`
          const fileData = entry.getData()
          
          // Check if it's a binary file
          const isBinary = isBinaryFile(entry.entryName, fileData)
          
          distFiles.push({
            path: filePath,
            content: isBinary ? fileData : fileData.toString('utf8'),
            isBinary
          })
        }
      }

      // Upload to Supabase Storage
      console.log('☁️ Uploading to Supabase Storage...')
      const supabase = await createClient()
      
      // Ensure projects bucket exists
      const { error: bucketError } = await supabase.storage.createBucket('projects', {
        public: true,
        allowedMimeTypes: ['text/html', 'text/css', 'application/javascript', 'application/json', 'image/*', 'font/*']
      })

      if (bucketError && !bucketError.message.includes('already exists')) {
        console.warn('Bucket creation warning:', bucketError.message)
      }

      // Upload each file to Supabase Storage
      const uploadPromises = distFiles.map(async (file: any) => {
        const filePath = `${siteName}/${file.path.replace('dist/', '')}`
        
        // Convert content to appropriate format for upload
        const uploadContent = file.isBinary ? file.content : Buffer.from(file.content, 'utf8')
        
        const { error } = await supabase.storage
          .from('projects')
          .upload(filePath, uploadContent, {
            contentType: getContentType(file.path),
            upsert: true
          })

        if (error) {
          console.error(`Error uploading ${filePath}:`, error)
          throw new Error(`Failed to upload ${filePath}: ${error.message}`)
        }

        return filePath
      })

      const uploadedPaths = await Promise.all(uploadPromises)
      console.log(`✅ Uploaded ${uploadedPaths.length} files to Supabase Storage`)

      // Create deployment record
      const deploymentUrl = `https://${siteName}.pipilot.dev`
      
      const { error: deploymentError } = await supabase
        .from('deployments')
        .insert({
          id: crypto.randomUUID(),
          workspace_id: projectId,
          url: deploymentUrl,
          status: 'ready',
          created_at: new Date().toISOString(),
          environment: 'production',
          provider: 'pipilot',
          external_id: siteName
        })

      if (deploymentError) {
        console.error('Error creating deployment record:', deploymentError)
        // Don't fail the deployment for this
      }

      return NextResponse.json({
        success: true,
        url: deploymentUrl,
        siteName,
        filesUploaded: uploadedPaths.length,
        message: 'Project deployed successfully!'
      })

    } finally {
      // Always cleanup sandbox
      await sandbox.terminate()
    }

  } catch (error) {
    console.error('Deployment error:', error)
    return NextResponse.json(
      { 
        error: 'Deployment failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

function isBinaryFile(fileName: string, data: Buffer): boolean {
  // Check file extension for known binary types
  const binaryExtensions = [
    'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'webp', 'bmp', 'tiff',
    'woff', 'woff2', 'ttf', 'eot', 'otf',
    'mp3', 'mp4', 'avi', 'mov', 'wmv', 'flv',
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    'zip', 'rar', '7z', 'tar', 'gz',
    'exe', 'dll', 'so', 'dylib'
  ]
  
  const ext = fileName.split('.').pop()?.toLowerCase()
  if (ext && binaryExtensions.includes(ext)) {
    return true
  }
  
  // Check for null bytes (common in binary files)
  for (let i = 0; i < Math.min(data.length, 1024); i++) {
    if (data[i] === 0) {
      return true
    }
  }
  
  return false
}

function getContentType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase()
  const contentTypes: { [key: string]: string } = {
    'html': 'text/html',
    'htm': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'mjs': 'application/javascript',
    'json': 'application/json',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon',
    'webp': 'image/webp',
    'woff': 'font/woff',
    'woff2': 'font/woff2',
    'ttf': 'font/ttf',
    'eot': 'application/vnd.ms-fontobject',
    'otf': 'font/otf',
    'map': 'application/json'
  }
  return contentTypes[ext || ''] || 'text/plain'
}
