import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDeploymentTokens } from '@/lib/cloud-sync'

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({
        connected: false,
        error: 'Unauthorized',
        message: 'Please log in to continue'
      }, { status: 401 })
    }

    // Get GitHub token
    const tokens = await getDeploymentTokens(user.id)
    const hasToken = Boolean(tokens?.github)

    if (!hasToken) {
      return NextResponse.json({
        connected: false,
        has_token: false,
        message: 'GitHub account not connected. Please connect your GitHub account in settings.',
        setup_url: '/workspace/deployment' // Where users can connect GitHub
      })
    }

    // Validate token by making a test API call
    try {
      if (!tokens?.github) {
        return NextResponse.json({
          connected: false,
          has_token: false,
          error: 'Token missing',
          message: 'GitHub token not found. Please reconnect your GitHub account.'
        }, { status: 401 })
      }

      const response = await fetch('https://api.github.com/user', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokens.github}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'PiPilot-Repo-Agent',
        },
      })

      if (response.ok) {
        const userData = await response.json()
        return NextResponse.json({
          connected: true,
          has_token: true,
          user: {
            login: userData.login,
            name: userData.name,
            avatar_url: userData.avatar_url,
            html_url: userData.html_url
          },
          message: 'GitHub account connected successfully'
        })
      } else if (response.status === 401) {
        return NextResponse.json({
          connected: false,
          has_token: true,
          error: 'Invalid token',
          message: 'Your GitHub token is invalid or expired. Please reconnect your GitHub account.',
          setup_url: '/workspace/deployment'
        }, { status: 401 })
      } else {
        return NextResponse.json({
          connected: false,
          has_token: true,
          error: 'API error',
          message: 'Unable to verify GitHub connection. Please try again later.'
        }, { status: 503 })
      }
    } catch (apiError) {
      console.error('GitHub API validation error:', apiError)
      return NextResponse.json({
        connected: false,
        has_token: true,
        error: 'Network error',
        message: 'Unable to connect to GitHub. Please check your internet connection.'
      }, { status: 503 })
    }

  } catch (error) {
    console.error('Error checking GitHub connection status:', error)
    return NextResponse.json({
      connected: false,
      error: 'Internal server error',
      message: 'An unexpected error occurred. Please try again later.'
    }, { status: 500 })
  }
}