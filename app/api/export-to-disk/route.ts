import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import JSZip from 'jszip'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { projectId, filePaths } = await request.json()

    if (!projectId) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 })
    }

    // Get project files
    const { storageManager } = await import('@/lib/storage-manager')
    await storageManager.init()

    const projectFiles = await storageManager.getFiles(projectId)

    // Filter files if specific paths are provided
    const filesToExport = filePaths
      ? projectFiles.filter(file => filePaths.includes(file.path))
      : projectFiles.filter(file => !file.isDirectory)

    if (filesToExport.length === 0) {
      return NextResponse.json({ error: "No files found to export" }, { status: 404 })
    }

    // Create ZIP file using JSZip
    const zip = new JSZip()

    // Add files to ZIP
    for (const file of filesToExport) {
      if (file.content) {
        zip.file(file.name, file.content)
      }
    }

    // Generate ZIP content
    const zipContent = await zip.generateAsync({ type: 'uint8array' })

    // Return the zip file
    const headers = new Headers()
    headers.set('Content-Type', 'application/zip')
    headers.set('Content-Disposition', `attachment; filename="project-export-${projectId}.zip"`)

    return new NextResponse(zipContent, {
      status: 200,
      headers
    })

  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'Export failed' },
      { status: 500 }
    )
  }
}

