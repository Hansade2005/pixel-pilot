import { NextRequest, NextResponse } from 'next/server';

/**
 * List environment variables for a project
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

    // Build API URL
    let apiUrl = `https://api.vercel.com/v9/projects/${params.projectId}/env`;
    if (teamId) {
      apiUrl += `?teamId=${teamId}`;
    }

    // Fetch environment variables
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
        error: errorData.error?.message || 'Failed to fetch environment variables',
        code: 'ENV_FETCH_FAILED'
      }, { status: response.status });
    }

    const data = await response.json();

    // Format response (exclude sensitive values)
    const envs = data.envs?.map((env: any) => ({
      id: env.id,
      key: env.key,
      type: env.type,
      target: env.target,
      gitBranch: env.gitBranch,
      configurationId: env.configurationId,
      createdAt: env.createdAt,
      updatedAt: env.updatedAt,
      createdBy: env.createdBy,
      updatedBy: env.updatedBy,
      comment: env.comment,
      // Don't include actual values for security
      hasValue: !!env.value,
    })) || [];

    return NextResponse.json({
      envs: envs,
      total: envs.length,
      projectId: params.projectId,
    });

  } catch (error) {
    console.error('Env fetch error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch environment variables',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}

/**
 * Add environment variables to a project
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { vercelToken, teamId, variables, upsert = false } = await request.json();

    // Validate input
    if (!vercelToken || !variables || !Array.isArray(variables)) {
      return NextResponse.json({
        error: 'Vercel token and variables array are required'
      }, { status: 400 });
    }

    if (variables.length === 0) {
      return NextResponse.json({
        error: 'At least one variable is required'
      }, { status: 400 });
    }

    // Validate each variable
    for (const variable of variables) {
      if (!variable.key || !variable.value) {
        return NextResponse.json({
          error: 'Each variable must have a key and value'
        }, { status: 400 });
      }
    }

    // Build API URL
    let apiUrl = `https://api.vercel.com/v10/projects/${params.projectId}/env`;
    if (teamId) {
      apiUrl += `?teamId=${teamId}`;
    }
    if (upsert) {
      apiUrl += `${teamId ? '&' : '?'}upsert=true`;
    }

    const created = [];
    const failed = [];

    // Add each variable
    for (const variable of variables) {
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${vercelToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            key: variable.key,
            value: variable.value,
            type: variable.type || 'plain',
            target: variable.target || ['production', 'preview', 'development'],
            gitBranch: variable.gitBranch,
            comment: variable.comment,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          created.push({
            id: data.created?.id || data.id,
            key: variable.key,
            target: variable.target || ['production', 'preview', 'development'],
          });
        } else {
          const errorData = await response.json().catch(() => ({}));
          failed.push({
            key: variable.key,
            error: errorData.error?.message || 'Failed to create variable',
            status: response.status,
          });
        }
      } catch (error) {
        console.error(`Failed to add env var ${variable.key}:`, error);
        failed.push({
          key: variable.key,
          error: 'Request failed',
        });
      }
    }

    // Return results
    return NextResponse.json({
      success: failed.length === 0,
      created: created,
      failed: failed.length > 0 ? failed : undefined,
      summary: {
        total: variables.length,
        created: created.length,
        failed: failed.length,
      },
    });

  } catch (error) {
    console.error('Env create error:', error);
    return NextResponse.json({ 
      error: 'Failed to create environment variables',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}
