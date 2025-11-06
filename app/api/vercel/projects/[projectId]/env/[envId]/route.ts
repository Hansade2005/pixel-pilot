import { NextRequest, NextResponse } from 'next/server';

/**
 * Get a specific environment variable (with decrypted value)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string; envId: string } }
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

    // Build API URL
    let apiUrl = `https://api.vercel.com/v1/projects/${params.projectId}/env/${params.envId}`;
    if (teamId) {
      apiUrl += `?teamId=${teamId}`;
    }

    // Fetch environment variable
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json({
        error: errorData.error?.message || 'Failed to fetch environment variable',
        code: 'ENV_FETCH_FAILED'
      }, { status: response.status });
    }

    const data = await response.json();

    return NextResponse.json(data);

  } catch (error) {
    console.error('Env fetch error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch environment variable',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}

/**
 * Update an environment variable
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { projectId: string; envId: string } }
) {
  try {
    const { vercelToken, teamId, value, target, gitBranch, comment } = await request.json();

    if (!vercelToken) {
      return NextResponse.json({
        error: 'Vercel token is required'
      }, { status: 400 });
    }

    // Build API URL
    let apiUrl = `https://api.vercel.com/v9/projects/${params.projectId}/env/${params.envId}`;
    if (teamId) {
      apiUrl += `?teamId=${teamId}`;
    }

    // Prepare update payload
    const updatePayload: any = {};
    if (value !== undefined) updatePayload.value = value;
    if (target) updatePayload.target = target;
    if (gitBranch !== undefined) updatePayload.gitBranch = gitBranch;
    if (comment !== undefined) updatePayload.comment = comment;

    // Update environment variable
    const response = await fetch(apiUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatePayload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      if (response.status === 404) {
        return NextResponse.json({
          error: 'Environment variable not found',
          code: 'ENV_NOT_FOUND'
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
        error: errorData.error?.message || 'Failed to update environment variable',
        code: 'ENV_UPDATE_FAILED'
      }, { status: response.status });
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      env: {
        id: data.id,
        key: data.key,
        type: data.type,
        target: data.target,
        updatedAt: data.updatedAt,
      },
    });

  } catch (error) {
    console.error('Env update error:', error);
    return NextResponse.json({ 
      error: 'Failed to update environment variable',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}

/**
 * Delete an environment variable
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { projectId: string; envId: string } }
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

    // Build API URL
    let apiUrl = `https://api.vercel.com/v9/projects/${params.projectId}/env/${params.envId}`;
    if (teamId) {
      apiUrl += `?teamId=${teamId}`;
    }

    // Delete environment variable
    const response = await fetch(apiUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      if (response.status === 404) {
        return NextResponse.json({
          error: 'Environment variable not found',
          code: 'ENV_NOT_FOUND'
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
        error: errorData.error?.message || 'Failed to delete environment variable',
        code: 'ENV_DELETE_FAILED'
      }, { status: response.status });
    }

    return NextResponse.json({
      success: true,
      message: 'Environment variable deleted successfully',
      envId: params.envId,
    });

  } catch (error) {
    console.error('Env delete error:', error);
    return NextResponse.json({ 
      error: 'Failed to delete environment variable',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}
