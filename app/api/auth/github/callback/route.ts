import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/workspace'
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // Handle OAuth errors from GitHub
  if (error) {
    console.error('GitHub OAuth error:', error, errorDescription)
    return NextResponse.redirect(`${origin}/auth/login?error=${error}&description=${errorDescription || 'OAuth error occurred'}`)
  }

  if (code) {
    // Instead of handling session exchange server-side via Supabase,
    // redirect to a client-side handler that will exchange the code
    // and persist tokens into the client's storageManager (IndexedDB).
    // This keeps the server callback minimal and defers token handling to client.
    // We append the code and next to the hash fragment to avoid it being sent to server logs.
    const redirectUrl = `${origin}/auth/oauth-redirect#provider=github&code=${encodeURIComponent(code)}&next=${encodeURIComponent(next)}`
    return NextResponse.redirect(redirectUrl)
  }

  return NextResponse.redirect(`${origin}/auth/login?error=no_code&description=No authorization code received`)
}
