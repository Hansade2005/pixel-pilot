import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Sandbox } from '@e2b/code-interpreter'

export async function POST(req: NextRequest) {
  try {
    const { sandboxId, command } = await req.json()
    
    if (!sandboxId) {
      return Response.json({ error: 'Sandbox ID is required' }, { status: 400 })
    }

    if (!command) {
      return Response.json({ error: 'Command is required' }, { status: 400 })
    }

    // Get user from Supabase for authentication
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return new Response('Unauthorized', { status: 401 })
    }

    console.log(`Executing E2B command: ${command} in sandbox ${sandboxId}`)

    try {
      // Connect to existing E2B sandbox
      const sandbox = await Sandbox.connect(sandboxId)
      
      let stdout = ''
      let stderr = ''
      
      // Execute command with streaming output
      const result = await sandbox.commands.run(command, {
        onStdout: (data) => {
          stdout += data
          console.log(`[E2B ${sandboxId}] stdout:`, data)
        },
        onStderr: (data) => {
          stderr += data
          console.error(`[E2B ${sandboxId}] stderr:`, data)
        },
      })

      return Response.json({
        output: stdout,
        error: stderr,
        exitCode: result.exitCode || 0,
        success: true
      })

    } catch (sandboxError) {
      console.error('E2B sandbox error:', sandboxError)
      
      // If connection failed, try to find and connect to a running sandbox
      try {
        console.log('Attempting to find running E2B sandboxes...')
        const runningSandboxes = await Sandbox.list({
          query: { state: ['running'] }
        })
        
        const nextItems = await runningSandboxes.nextItems()
        
        if (nextItems.length === 0) {
          throw new Error('No running sandboxes found')
        }

        // Try to connect to the first running sandbox
        const fallbackSandbox = await Sandbox.connect(nextItems[0].sandboxId)
        
        let stdout = ''
        let stderr = ''
        
        const result = await fallbackSandbox.commands.run(command, {
          onStdout: (data) => {
            stdout += data
            console.log(`[E2B ${nextItems[0].sandboxId}] stdout:`, data)
          },
          onStderr: (data) => {
            stderr += data
            console.error(`[E2B ${nextItems[0].sandboxId}] stderr:`, data)
          },
        })

        return Response.json({
          output: stdout,
          error: stderr,
          exitCode: result.exitCode || 0,
          success: true,
          note: `Connected to fallback sandbox ${nextItems[0].sandboxId}`
        })

      } catch (fallbackError) {
        console.error('E2B fallback error:', fallbackError)
        return Response.json({
          output: '',
          error: `Failed to execute command: ${sandboxError instanceof Error ? sandboxError.message : 'Sandbox connection failed'}`,
          exitCode: 1,
          success: false
        }, { status: 500 })
      }
    }

  } catch (error) {
    console.error('E2B command API error:', error)
    return Response.json({ 
      output: '',
      error: `API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      exitCode: 1,
      success: false
    }, { status: 500 })
  }
}

// Health check
export async function GET() {
  return Response.json({ 
    status: 'ok',
    service: 'e2b-command-api',
    timestamp: new Date().toISOString()
  })
}
