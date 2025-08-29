import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { name, description, private: isPrivate, token } = await request.json()

    if (!name || !token) {
      return NextResponse.json({ error: 'Repository name and token are required' }, { status: 400 })
    }

    // Create GitHub repository
    const response = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({
        name,
        description,
        private: isPrivate || false,
        auto_init: true, // Initialize with README
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('GitHub API error:', error)
      return NextResponse.json({ error: error.message || 'Failed to create repository' }, { status: response.status })
    }

    const repo = await response.json()

    return NextResponse.json({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      url: repo.html_url,
      cloneUrl: repo.clone_url,
      defaultBranch: repo.default_branch,
    })
  } catch (error) {
    console.error('GitHub repository creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
