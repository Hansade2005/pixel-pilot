import { NextRequest, NextResponse } from 'next/server'
import { getNextKiloKey } from '@/lib/ai-providers'

// ─── CORS ────────────────────────────────────────────────────────────────────
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400',
}

function corsResponse(body: string | null, status: number) {
  return new NextResponse(body, { status, headers: CORS_HEADERS })
}

// Preflight
export function OPTIONS() {
  return corsResponse(null, 204)
}

// ─── Proxy ───────────────────────────────────────────────────────────────────
const KILO_BASE = 'https://api.kilo.ai/api/gateway'

export async function POST(request: NextRequest) {
  try {
    const apiKey = getNextKiloKey()
    if (!apiKey) {
      return corsResponse(JSON.stringify({ error: { message: 'Kilo API key not configured', type: 'server_error' } }), 500)
    }

    const body = await request.text()

    // Forward to Kilo
    const kiloRes = await fetch(`${KILO_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body,
    })

    // Check if streaming
    const contentType = kiloRes.headers.get('content-type') || ''
    const isStream = contentType.includes('text/event-stream') || contentType.includes('text/plain')

    if (isStream && kiloRes.body) {
      // Stream SSE through
      return new NextResponse(kiloRes.body as ReadableStream, {
        status: kiloRes.status,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    }

    // Non-streaming: forward JSON
    const data = await kiloRes.text()
    return new NextResponse(data, {
      status: kiloRes.status,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    console.error('[Kilo Proxy] Error:', error)
    return corsResponse(
      JSON.stringify({ error: { message: 'Proxy error', type: 'server_error' } }),
      500
    )
  }
}

// GET - list available models
export async function GET() {
  try {
    const apiKey = getNextKiloKey()
    if (!apiKey) {
      return corsResponse(JSON.stringify({ error: { message: 'Kilo API key not configured', type: 'server_error' } }), 500)
    }

    const kiloRes = await fetch(`${KILO_BASE}/models`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    })

    const data = await kiloRes.text()
    return new NextResponse(data, {
      status: kiloRes.status,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    console.error('[Kilo Proxy] Models error:', error)
    return corsResponse(
      JSON.stringify({ error: { message: 'Proxy error', type: 'server_error' } }),
      500
    )
  }
}
