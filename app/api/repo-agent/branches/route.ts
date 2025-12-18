import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDeploymentTokens } from '@/lib/cloud-sync'

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get GitHub token
    const tokens = await getDeploymentTokens(user.id)
    if (!tokens?.github) {
      return NextResponse.json({
        error: 'GitHub not connected',
        connected: false,
        message: 'Please connect your GitHub account first'
      }, { status: 403 })
    }

    // Get repository from query params
    const { searchParams } = new URL(request.url)
    const repo = searchParams.get('repo')

    if (!repo) {
      return NextResponse.json({
        error: 'Repository parameter required',
        message: 'Please provide a repository in the format owner/repo'
      }, { status: 400 })
    }

    // Fetch branches from GitHub
    const response = await fetch(`https://api.github.com/repos/${repo}/branches?per_page=100`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokens.github}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'PiPilot-Repo-Agent',
      },
    })

    if (!response.ok) {
      if (response.status === 401) {
        return NextResponse.json({
          error: 'Invalid GitHub token',
          connected: false,
          message: 'Your GitHub token is invalid or expired'
        }, { status: 401 })
      }
      if (response.status === 403) {
        return NextResponse.json({
          error: 'GitHub API rate limit exceeded',
          connected: true,
          message: 'GitHub API rate limit exceeded. Please try again later.'
        }, { status: 403 })
      }
      if (response.status === 404) {
        return NextResponse.json({
          error: 'Repository not found',
          connected: true,
          message: 'The specified repository was not found or you do not have access to it'
        }, { status: 404 })
      }

      const error = await response.json().catch(() => ({ message: 'Unknown error' }))
      console.error('GitHub API error:', error)
      return NextResponse.json({
        error: 'Failed to fetch branches',
        connected: true,
        message: 'Failed to fetch repository branches'
      }, { status: response.status })
    }

    const branches = await response.json()

    // Extract branch names
    const branchNames = branches.map((branch: any) => branch.name)

    return NextResponse.json({
      connected: true,
      branches: branchNames,
      total_count: branchNames.length
    })

  } catch (error) {
    console.error('Error fetching GitHub branches for repo agent:', error)
    return NextResponse.json({
      error: 'Internal server error',
      connected: false,
      message: 'An unexpected error occurred'
    }, { status: 500 })
  }
}