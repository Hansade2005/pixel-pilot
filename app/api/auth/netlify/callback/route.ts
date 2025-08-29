import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/workspace'
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  if (error) {
    console.error('Netlify OAuth error:', error, errorDescription)
    return NextResponse.redirect(`${origin}/auth/login?error=${error}&description=${errorDescription || 'OAuth error occurred'}`)
  }

  if (code) {
    // Redirect to client handler which will exchange the code and persist token in IndexedDB
    const redirectUrl = `${origin}/auth/oauth-redirect#provider=netlify&code=${encodeURIComponent(code)}&next=${encodeURIComponent(next)}`
    return NextResponse.redirect(redirectUrl)
  }

  return NextResponse.redirect(`${origin}/auth/login?error=no_code&description=No authorization code received`)
}
