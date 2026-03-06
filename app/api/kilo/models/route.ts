import { NextResponse } from 'next/server'
import { getNextKiloKey } from '@/lib/ai-providers'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400',
}

function corsResponse(body: string | null, status: number) {
  return new NextResponse(body, { status, headers: CORS_HEADERS })
}

export function OPTIONS() {
  return corsResponse(null, 204)
}

export async function GET() {
  try {
    const apiKey = getNextKiloKey()
    if (!apiKey) {
      return corsResponse(JSON.stringify({ error: { message: 'Kilo API key not configured', type: 'server_error' } }), 500)
    }

    const kiloRes = await fetch('https://api.kilo.ai/api/gateway/models', {
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
