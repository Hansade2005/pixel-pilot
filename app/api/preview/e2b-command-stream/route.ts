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

    console.log(`Streaming E2B command: ${command} in sandbox ${sandboxId}`)

    // Create a streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Connect to existing E2B sandbox
          const sandbox = await Sandbox.connect(sandboxId)
          
          controller.enqueue(`data: ${JSON.stringify({ type: 'start', message: 'Command execution started' })}\n\n`)
          
          // Execute command with streaming output
          const result = await sandbox.commands.run(command, {
            onStdout: (data) => {
              controller.enqueue(`data: ${JSON.stringify({ 
                type: 'stdout', 
                data: data,
                timestamp: new Date().toISOString()
              })}\n\n`)
            },
            onStderr: (data) => {
              controller.enqueue(`data: ${JSON.stringify({ 
                type: 'stderr', 
                data: data,
                timestamp: new Date().toISOString()
              })}\n\n`)
            },
          })

          // Send completion message
          controller.enqueue(`data: ${JSON.stringify({ 
            type: 'complete', 
            exitCode: result.exitCode || 0,
            message: 'Command execution completed',
            timestamp: new Date().toISOString()
          })}\n\n`)
          
          controller.close()

        } catch (sandboxError) {
          console.error('E2B streaming error:', sandboxError)
          
          // Try fallback to running sandbox
          try {
            const runningSandboxes = await Sandbox.list({
              query: { state: ['running'] }
            })
            
            const nextItems = await runningSandboxes.nextItems()
            
            if (nextItems.length === 0) {
              throw new Error('No running sandboxes found')
            }

            const fallbackSandbox = await Sandbox.connect(nextItems[0].sandboxId)
            
            controller.enqueue(`data: ${JSON.stringify({ 
              type: 'info', 
              message: `Connected to fallback sandbox ${nextItems[0].sandboxId}` 
            })}\n\n`)
            
            const result = await fallbackSandbox.commands.run(command, {
              onStdout: (data) => {
                controller.enqueue(`data: ${JSON.stringify({ 
                  type: 'stdout', 
                  data: data,
                  timestamp: new Date().toISOString()
                })}\n\n`)
              },
              onStderr: (data) => {
                controller.enqueue(`data: ${JSON.stringify({ 
                  type: 'stderr', 
                  data: data,
                  timestamp: new Date().toISOString()
                })}\n\n`)
              },
            })

            controller.enqueue(`data: ${JSON.stringify({ 
              type: 'complete', 
              exitCode: result.exitCode || 0,
              message: 'Command execution completed',
              timestamp: new Date().toISOString()
            })}\n\n`)
            
            controller.close()

          } catch (fallbackError) {
            controller.enqueue(`data: ${JSON.stringify({ 
              type: 'error', 
              message: `Failed to execute command: ${sandboxError instanceof Error ? sandboxError.message : 'Unknown error'}`,
              timestamp: new Date().toISOString()
            })}\n\n`)
            controller.close()
          }
        }
      }
    })

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    })

  } catch (error) {
    console.error('E2B streaming API error:', error)
    return Response.json({ 
      error: `API error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 })
  }
}
