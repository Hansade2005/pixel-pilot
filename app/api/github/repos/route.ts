import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getDeploymentTokens } from '@/lib/cloud-sync';

export async function GET(request: NextRequest) {
  try {
    // Get current user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get GitHub token from Authorization header or from stored tokens
    const authHeader = request.headers.get('Authorization');
    let githubToken = authHeader?.replace('Bearer ', '');

    // If no token in header, try to get from storage
    if (!githubToken) {
      const tokens = await getDeploymentTokens(user.id);
      githubToken = tokens?.github;
    }

    if (!githubToken) {
      return NextResponse.json(
        { error: 'GitHub token not found. Please add your GitHub token in Account Settings.' },
        { status: 401 }
      );
    }

    // Fetch repositories from GitHub API
    const response = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100', {
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.message || 'Failed to fetch repositories from GitHub' },
        { status: response.status }
      );
    }

    const repos = await response.json();

    // Return the repositories
    return NextResponse.json(repos);

  } catch (error: any) {
    console.error('GitHub repos API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
