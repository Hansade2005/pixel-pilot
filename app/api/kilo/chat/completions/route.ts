import { NextRequest, NextResponse } from 'next/server'
import { getNextKiloKey } from '@/lib/ai-providers'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400',
}

function corsResponse(body: string | null, status: number) {
  return new NextResponse(body, { status, headers: CORS_HEADERS })
}

export function OPTIONS() {
  return corsResponse(null, 204)
}

const KILO_BASE = 'https://api.kilo.ai/api/gateway'

export async function POST(request: NextRequest) {
  try {
    const apiKey = getNextKiloKey()
    if (!apiKey) {
      return corsResponse(JSON.stringify({ error: { message: 'Kilo API key not configured', type: 'server_error' } }), 500)
    }

    const body = await request.text()

    const kiloRes = await fetch(`${KILO_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body,
    })

    const contentType = kiloRes.headers.get('content-type') || ''
    const isStream = contentType.includes('text/event-stream') || contentType.includes('text/plain')

    if (isStream && kiloRes.body) {
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

    const data = await kiloRes.text()
    return new NextResponse(data, {
      status: kiloRes.status,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    console.error('[Kilo Proxy] Chat error:', error)
    return corsResponse(
      JSON.stringify({ error: { message: 'Proxy error', type: 'server_error' } }),
      500
    )
  }
}
