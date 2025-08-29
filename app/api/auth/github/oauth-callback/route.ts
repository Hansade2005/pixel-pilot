import { NextRequest, NextResponse } from 'next/server'

// GitHub OAuth App configuration - Fallback credentials
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || 'Ov23lihgU0dNPk4ct1Au'
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || 'c8723d7d32704b6ab8ec235ef720ec955789fb7a'
const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_URL || 'https://dev.pixelways.co'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // Handle OAuth errors
  if (error) {
    console.error('GitHub OAuth error:', error)
    return NextResponse.redirect(`${APP_DOMAIN}/workspace/deployment?error=${error}`)
  }

  if (!code) {
    return NextResponse.redirect(`${APP_DOMAIN}/workspace/deployment?error=no_code`)
  }

  // Verify state parameter for security (if you implement state verification)
  // For now, we'll proceed with the code

  // Redirect to the deployment page with the code in the hash fragment
  // This keeps the code secure and allows the frontend to process it
  const redirectUrl = `${APP_DOMAIN}/workspace/deployment#github_code=${encodeURIComponent(code)}`

  return NextResponse.redirect(redirectUrl)
}

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()

    if (!code) {
      return NextResponse.json({ error: 'No code provided' }, { status: 400 })
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code: code,
        redirect_uri: `${APP_DOMAIN}/api/auth/github/oauth-callback`
      })
    })

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for token')
    }

    const tokenData = await tokenResponse.json()

    if (tokenData.error) {
      throw new Error(tokenData.error_description || tokenData.error)
    }

    return NextResponse.json({
      access_token: tokenData.access_token,
      token_type: tokenData.token_type,
      scope: tokenData.scope
    })

  } catch (error) {
    console.error('GitHub OAuth callback error:', error)
    return NextResponse.json(
      { error: 'Failed to exchange code for token' },
      { status: 500 }
    )
  }
}
