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

    // Fetch user's repositories from GitHub
    const response = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated&type=all', {
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

      const error = await response.json().catch(() => ({ message: 'Unknown error' }))
      console.error('GitHub API error:', error)
      return NextResponse.json({
        error: 'Failed to fetch repositories',
        connected: true,
        message: 'Failed to fetch your GitHub repositories'
      }, { status: response.status })
    }

    const repos = await response.json()

    // Filter and format the response for repo agent
    const formattedRepos = repos.map((repo: any) => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      owner: repo.owner.login,
      private: repo.private,
      html_url: repo.html_url,
      description: repo.description,
      language: repo.language,
      updated_at: repo.updated_at,
      default_branch: repo.default_branch,
      permissions: repo.permissions, // push, pull, admin permissions
      archived: repo.archived,
      disabled: repo.disabled
    }))

    return NextResponse.json({
      connected: true,
      repositories: formattedRepos,
      total_count: formattedRepos.length
    })

  } catch (error) {
    console.error('Error fetching GitHub repositories for repo agent:', error)
    return NextResponse.json({
      error: 'Internal server error',
      connected: false,
      message: 'An unexpected error occurred'
    }, { status: 500 })
  }
}