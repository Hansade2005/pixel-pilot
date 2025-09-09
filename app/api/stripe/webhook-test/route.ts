import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Simple webhook test endpoint to verify webhook functionality
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.text()

    console.log('🧪 Webhook test received:', {
      method: request.method,
      url: request.url,
      headers: Object.fromEntries(request.headers.entries()),
      body: body.substring(0, 500) + (body.length > 500 ? '...' : '')
    })

    // Log the test webhook
    await supabase
      .from('webhook_logs')
      .insert({
        event_type: 'webhook_test',
        event_id: `test_${Date.now()}`,
        status: 'success',
        processed_at: new Date().toISOString()
      })

    return NextResponse.json({
      success: true,
      message: 'Webhook test successful',
      timestamp: new Date().toISOString(),
      received: true
    })

  } catch (error) {
    console.error('Webhook test error:', error)

    const supabase = await createClient()
    await supabase
      .from('webhook_logs')
      .insert({
        event_type: 'webhook_test',
        event_id: `test_error_${Date.now()}`,
        status: 'failed',
        error: error.message,
        processed_at: new Date().toISOString()
      })

    return NextResponse.json(
      {
        success: false,
        error: 'Webhook test failed',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// GET endpoint for testing webhook connectivity
export async function GET(request: NextRequest) {
  const supabase = await createClient()

  // Check if webhook_logs table exists and is accessible
  try {
    const { data, error } = await supabase
      .from('webhook_logs')
      .select('id')
      .limit(1)

    if (error) {
      return NextResponse.json({
        status: 'error',
        message: 'Webhook logs table not accessible',
        error: error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      status: 'ok',
      message: 'Webhook system is accessible',
      timestamp: new Date().toISOString(),
      tableExists: true
    })

  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Database connection failed',
      error: error.message
    }, { status: 500 })
  }
}
