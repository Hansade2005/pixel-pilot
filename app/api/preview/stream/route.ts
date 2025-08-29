import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  
  if (!projectId) {
    return new NextResponse('Project ID is required', { status: 400 })
  }
  
  // Create a ReadableStream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      controller.enqueue(`data: ${JSON.stringify({ log: 'Connected to preview stream' })}\n\n`)
      
      // Keep connection alive
      const keepAliveInterval = setInterval(() => {
        controller.enqueue(`data: ${JSON.stringify({ log: 'keepalive' })}\n\n`)
      }, 20000)
      
      // Clean up on close
      controller.close = () => {
        clearInterval(keepAliveInterval)
      }
    }
  })
  
  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  })
}