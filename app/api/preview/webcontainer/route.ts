import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Note: WebContainer runs client-side, so this route mainly handles authentication
// and returns the files for the client to mount in WebContainer

export async function POST(req: NextRequest) {
  try {
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

    // Get user from Supabase for authentication
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return new Response('Unauthorized', { status: 401 })
    }

    console.log(`Creating WebContainer preview for project ${projectId} with ${files.length} files`)

    // Validate files for WebContainer compatibility
    const validationResult = validateFilesForWebContainer(files)
    if (!validationResult.isValid) {
      return Response.json({ 
        error: 'Files not compatible with WebContainer',
        details: validationResult.issues
      }, { status: 400 })
    }

    // Return success with files - the actual WebContainer work happens client-side
    return Response.json({
      success: true,
      projectId,
      files,
      message: 'Files ready for WebContainer mounting',
      compatibility: validationResult
    })

  } catch (error) {
    console.error('WebContainer preview error:', error)
    return Response.json({ 
      error: 'Failed to prepare WebContainer preview',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * Validate files for WebContainer compatibility
 */
function validateFilesForWebContainer(files: Array<{path: string, content: string}>) {
  const issues: string[] = []
  const warnings: string[] = []
  
  // Check for package.json
  const packageJson = files.find(f => f.path === 'package.json')
  if (!packageJson) {
    issues.push('package.json is required for WebContainer')
    return { isValid: false, issues, warnings }
  }

  try {
    const pkg = JSON.parse(packageJson.content)
    
    // Check for supported frameworks
    const isVite = pkg.devDependencies?.vite || pkg.dependencies?.vite
    const isNextJs = pkg.dependencies?.next || pkg.devDependencies?.next
    const isReact = pkg.dependencies?.react || pkg.devDependencies?.react
    
    if (!isVite && !isNextJs && !isReact) {
      warnings.push('Project may not be optimized for WebContainer (no Vite, Next.js, or React detected)')
    }

    // Check for dev script
    if (!pkg.scripts?.dev && !pkg.scripts?.start) {
      issues.push('No dev or start script found in package.json')
    }

    // Check for problematic dependencies
    const problematicDeps = [
      'electron',
      'node-gyp',
      'sqlite3',
      'bcrypt',
      'sharp'
    ]
    
    const foundProblematic = problematicDeps.filter(dep => 
      pkg.dependencies?.[dep] || pkg.devDependencies?.[dep]
    )
    
    if (foundProblematic.length > 0) {
      warnings.push(`Potentially problematic dependencies for WebContainer: ${foundProblematic.join(', ')}`)
    }

    // Check file count (WebContainer has some limits)
    if (files.length > 1000) {
      warnings.push('Large number of files may impact WebContainer performance')
    }

    // Check for binary files
    const binaryFiles = files.filter(f => 
      f.path.match(/\.(png|jpg|jpeg|gif|ico|woff|woff2|ttf|otf|eot|pdf|zip|tar|gz)$/i)
    )
    
    if (binaryFiles.length > 0) {
      warnings.push(`Binary files detected (${binaryFiles.length}), may not work in WebContainer`)
    }

  } catch (error) {
    issues.push('Invalid package.json format')
  }

  return {
    isValid: issues.length === 0,
    issues,
    warnings,
    frameworks: {
      vite: !!files.find(f => f.path === 'vite.config.ts' || f.path === 'vite.config.js'),
      nextjs: !!files.find(f => f.path === 'next.config.js' || f.path === 'next.config.ts'),
      react: !!packageJson?.content.includes('"react"')
    }
  }
}

// Health check endpoint
export async function GET() {
  return Response.json({ 
    status: 'ok',
    service: 'webcontainer-preview',
    timestamp: new Date().toISOString()
  })
}
