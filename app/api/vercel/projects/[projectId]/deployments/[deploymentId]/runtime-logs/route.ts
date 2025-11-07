import { NextRequest, NextResponse } from 'next/server';

/**
 * Get runtime logs for a deployment
 * 
 * Returns a stream of runtime logs for a specific deployment.
 * These are logs from the actual running deployment (edge functions, serverless, etc.)
 * 
 * Uses GET /v1/projects/{projectId}/deployments/{deploymentId}/runtime-logs
 * Official API: https://vercel.com/docs/rest-api/reference/endpoints/deployments/get-runtime-logs
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string; deploymentId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const vercelToken = searchParams.get('token');
    const teamId = searchParams.get('teamId');
    const limit = searchParams.get('limit') || '100';

    // Validate required parameters
    if (!vercelToken) {
      return NextResponse.json({
        error: 'Vercel token is required'
      }, { status: 400 });
    }

    // Validate IDs are not undefined
    if (!params.projectId || params.projectId === 'undefined') {
      return NextResponse.json({
        error: 'Valid project ID is required',
        code: 'INVALID_PROJECT_ID'
      }, { status: 400 });
    }

    if (!params.deploymentId || params.deploymentId === 'undefined') {
      return NextResponse.json({
        error: 'Valid deployment ID is required',
        code: 'INVALID_DEPLOYMENT_ID'
      }, { status: 400 });
    }

    // Build API URL with optional team parameter
    const queryParams = new URLSearchParams();
    if (teamId) queryParams.set('teamId', teamId);

    const apiUrl = `https://api.vercel.com/v1/projects/${params.projectId}/deployments/${params.deploymentId}/runtime-logs?${queryParams.toString()}`;

    // Fetch runtime logs
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
        'Accept': 'application/stream+json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      if (response.status === 404) {
        return NextResponse.json({
          error: 'Deployment or project not found',
          code: 'NOT_FOUND'
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
        error: errorData.error?.message || 'Failed to fetch runtime logs',
        code: 'LOGS_FETCH_FAILED'
      }, { status: response.status });
    }

    // Parse streaming response
    const text = await response.text();
    const lines = text.trim().split('\n').filter(line => line.trim());
    
    const logs = lines.map(line => {
      try {
        return JSON.parse(line);
      } catch (e) {
        return null;
      }
    }).filter(log => log !== null);

    // Format logs for display
    const formattedLogs = logs.map((log: any) => ({
      level: log.level || 'info',
      message: log.message || '',
      rowId: log.rowId || '',
      source: log.source || 'unknown',
      timestamp: log.timestampInMs || Date.now(),
      domain: log.domain || '',
      messageTruncated: log.messageTruncated || false,
      requestMethod: log.requestMethod || '',
      requestPath: log.requestPath || '',
      responseStatusCode: log.responseStatusCode || 0,
    }));

    return NextResponse.json({
      logs: formattedLogs,
      count: formattedLogs.length,
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('Runtime logs fetch error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch runtime logs',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}
