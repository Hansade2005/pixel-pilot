
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 })
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix

    if (!token) {
      return NextResponse.json({ error: 'Invalid authorization token' }, { status: 401 })
    }

    // Fetch user's repositories from GitHub
    const response = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'PiPilot-App',
      },
    })

    if (!response.ok) {
      if (response.status === 401) {
        return NextResponse.json({ error: 'Invalid GitHub token' }, { status: 401 })
      }
      if (response.status === 403) {
        return NextResponse.json({ error: 'GitHub API rate limit exceeded or insufficient permissions' }, { status: 403 })
      }

      const error = await response.json().catch(() => ({ message: 'Unknown error' }))
      console.error('GitHub API error:', error)
      return NextResponse.json({ error: 'Failed to fetch repositories from GitHub' }, { status: response.status })
    }

    const repos = await response.json()

    // Filter and format the response
    const formattedRepos = repos.map((repo: any) => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      private: repo.private,
      html_url: repo.html_url,
      description: repo.description,
      language: repo.language,
      updated_at: repo.updated_at,
    }))

    return NextResponse.json(formattedRepos)

  } catch (error) {
    console.error('Error fetching GitHub repositories:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}