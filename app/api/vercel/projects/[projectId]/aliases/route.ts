import { NextRequest, NextResponse } from 'next/server';

/**
 * Get all aliases for a project
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const vercelToken = searchParams.get('token');
    const teamId = searchParams.get('teamId');

    if (!vercelToken) {
      return NextResponse.json({
        error: 'Vercel token is required'
      }, { status: 400 });
    }

    // Build API URL for getting project aliases
    let apiUrl = `https://api.vercel.com/v2/aliases?projectId=${params.projectId}`;
    if (teamId) {
      apiUrl += `&teamId=${teamId}`;
    }

    // Fetch aliases
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      if (response.status === 404) {
        return NextResponse.json({
          error: 'Project not found',
          code: 'PROJECT_NOT_FOUND'
        }, { status: 404 });
      }

      if (response.status === 401) {
        return NextResponse.json({
          error: 'Invalid Vercel token',
          code: 'INVALID_TOKEN'
        }, { status: 401 });
      }

      if (response.status === 403) {
        return NextResponse.json({
          error: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS'
        }, { status: 403 });
      }

      return NextResponse.json({
        error: errorData.error?.message || 'Failed to fetch aliases',
        code: 'ALIASES_FETCH_FAILED'
      }, { status: response.status });
    }

    const data = await response.json();

    return NextResponse.json({
      aliases: data.aliases || [],
      projectId: params.projectId,
    });

  } catch (error) {
    console.error('Aliases fetch error:', error);
    return NextResponse.json({
      error: 'Failed to fetch aliases',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}