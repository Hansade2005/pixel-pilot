import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { name, description, private: isPrivate, token } = await request.json()

    console.log('Creating repository with name:', name)

    if (!name || !token) {
      return NextResponse.json({ error: 'Repository name and token are required' }, { status: 400 })
    }

    // Validate repository name
    const nameRegex = /^[a-zA-Z0-9._-]+$/;
    if (!nameRegex.test(name)) {
      return NextResponse.json({
        error: 'Repository name can only contain letters, numbers, hyphens, underscores, and periods'
      }, { status: 400 })
    }

    if (name.length > 100) {
      return NextResponse.json({
        error: 'Repository name must be 100 characters or less'
      }, { status: 400 })
    }

    // Create GitHub repository
    const response = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
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
      console.error('Response status:', response.status)

      // Handle specific GitHub error cases
      if (response.status === 422) {
        if (error.errors && error.errors.length > 0) {
          const errorMessages = error.errors.map((err: any) => err.message).join(', ')
          return NextResponse.json({
            error: `Repository creation failed: ${errorMessages}`
          }, { status: 422 })
        }
        return NextResponse.json({
          error: error.message || 'Repository name may already exist or is invalid'
        }, { status: 422 })
      }

      if (response.status === 401) {
        return NextResponse.json({
          error: 'Invalid GitHub token. Please check your authentication.'
        }, { status: 401 })
      }

      if (response.status === 403) {
        return NextResponse.json({
          error: 'Access forbidden. You may not have permission to create repositories.'
        }, { status: 403 })
      }

      return NextResponse.json({ error: error.message || 'Failed to create repository' }, { status: response.status })
    }

    const repo = await response.json()
    console.log('Repository created successfully:', repo.full_name)

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
