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

  try {
    // Exchange code for access token immediately
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

    // Redirect back to deployment page with success and token data
    const redirectUrl = new URL(`${APP_DOMAIN}/workspace/deployment`)
    redirectUrl.searchParams.set('oauth_success', 'true')
    redirectUrl.searchParams.set('access_token', tokenData.access_token)
    redirectUrl.searchParams.set('token_type', tokenData.token_type || 'bearer')
    redirectUrl.searchParams.set('scope', tokenData.scope || 'repo,user')

    return NextResponse.redirect(redirectUrl.toString())

  } catch (error) {
    console.error('GitHub OAuth callback error:', error)
    return NextResponse.redirect(`${APP_DOMAIN}/workspace/deployment?error=token_exchange_failed`)
  }
}

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'POST method not supported. Use GET method for OAuth callback.' },
    { status: 405 }
  )
}
