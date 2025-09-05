import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    return NextResponse.json({
      success: true,
      message: 'Pipilot API is working!',
      received: body,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Invalid JSON', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 400 }
    )
  }
}
