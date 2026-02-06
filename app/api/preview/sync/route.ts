import { NextRequest, NextResponse } from 'next/server'
import { reconnectToSandbox, SandboxError, SandboxErrorType } from '@/lib/e2b-enhanced'

interface SyncFilesRequest {
  sandboxId: string
  files: Array<{
    path: string
    content: string
  }>
}

/**
 * POST /api/preview/sync
 * Sync files to an existing E2B sandbox without recreating it
 */
export async function POST(request: NextRequest) {
  try {
    const body: SyncFilesRequest = await request.json()
    const { sandboxId, files } = body

    if (!sandboxId) {
      return NextResponse.json(
        { error: 'sandboxId is required' },
        { status: 400 }
      )
    }

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { error: 'files array is required and must not be empty' },
        { status: 400 }
      )
    }

    console.log(`[Preview Sync] Connecting to sandbox: ${sandboxId}`)
    console.log(`[Preview Sync] Syncing ${files.length} files`)

    // Reconnect to the existing sandbox
    const sandbox = await reconnectToSandbox(sandboxId)

    // Prepare files for writing - ensure paths start with /home/user/project/
    const sandboxFiles = files.map(f => {
      let path = f.path
      // Normalize path to start with /home/user/project/
      if (!path.startsWith('/')) {
        path = '/' + path
      }
      if (!path.startsWith('/home/user/project')) {
        path = '/home/user/project' + path
      }
      return {
        path,
        content: f.content
      }
    })

    // Write files to sandbox
    const result = await sandbox.writeFiles(sandboxFiles)

    console.log(`[Preview Sync] Write result:`, {
      success: result.success,
      filesWritten: result.results.filter(r => r.success).length,
      filesFailed: result.results.filter(r => !r.success).length
    })

    if (!result.success) {
      const failedFiles = result.results.filter(r => !r.success)
      console.error(`[Preview Sync] Some files failed to write:`, failedFiles)
    }

    return NextResponse.json({
      success: result.success,
      sandboxId,
      filesWritten: result.results.filter(r => r.success).length,
      filesFailed: result.results.filter(r => !r.success).length,
      message: result.success
        ? `Successfully synced ${files.length} files to sandbox`
        : `Synced with some errors: ${result.results.filter(r => !r.success).length} files failed`
    })

  } catch (error) {
    console.error('[Preview Sync] Error:', error)

    // Handle sandbox connection errors
    if (error instanceof SandboxError) {
      if (error.type === SandboxErrorType.CONNECTION_FAILED) {
        return NextResponse.json(
          {
            error: 'Sandbox connection failed - sandbox may have expired',
            code: 'SANDBOX_EXPIRED',
            needsRecreate: true
          },
          { status: 410 } // Gone - sandbox no longer exists
        )
      }
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        needsRecreate: true
      },
      { status: 500 }
    )
  }
}
