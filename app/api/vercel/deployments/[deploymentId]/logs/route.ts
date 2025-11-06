import { NextRequest, NextResponse } from 'next/server';

/**
 * Stream or fetch build logs for a deployment
 * 
 * This endpoint provides access to deployment build logs, supporting both
 * streaming (Server-Sent Events) and paginated JSON responses.
 * 
 * Query Parameters:
 * - token: Vercel access token (required)
 * - teamId: Team ID (optional)
 * - stream: Enable SSE streaming (default: false)
 * - limit: Number of log entries to return (default: 100)
 * - follow: Keep connection open for live logs (default: false)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { deploymentId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const vercelToken = searchParams.get('token');
    const teamId = searchParams.get('teamId');
    const stream = searchParams.get('stream') === 'true';
    const limit = parseInt(searchParams.get('limit') || '100');
    const follow = searchParams.get('follow') === 'true';
    const since = searchParams.get('since');
    const until = searchParams.get('until');

    // Validate required parameters
    if (!vercelToken) {
      return NextResponse.json({
        error: 'Vercel token is required'
      }, { status: 400 });
    }

    // Build query parameters for Vercel API
    const queryParams = new URLSearchParams();
    if (teamId) queryParams.set('teamId', teamId);
    if (limit) queryParams.set('limit', limit.toString());
    if (follow) queryParams.set('follow', '1');
    if (since) queryParams.set('since', since);
    if (until) queryParams.set('until', until);

    const apiUrl = `https://api.vercel.com/v2/deployments/${params.deploymentId}/events?${queryParams.toString()}`;

    // Handle streaming response (Server-Sent Events)
    if (stream || follow) {
      const encoder = new TextEncoder();
      
      const readable = new ReadableStream({
        async start(controller) {
          try {
            const response = await fetch(apiUrl, {
              headers: {
                'Authorization': `Bearer ${vercelToken}`,
                'Accept': 'text/event-stream',
              },
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              const errorMessage = JSON.stringify({
                error: errorData.error?.message || 'Failed to fetch logs',
                code: 'LOGS_FETCH_FAILED',
                status: response.status
              });
              
              controller.enqueue(encoder.encode(`data: ${errorMessage}\n\n`));
              controller.close();
              return;
            }

            const reader = response.body?.getReader();
            if (!reader) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ error: 'No response body' })}\n\n`)
              );
              controller.close();
              return;
            }

            // Stream the logs
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              controller.enqueue(value);
            }

            controller.close();
          } catch (error) {
            console.error('Streaming error:', error);
            const errorMessage = JSON.stringify({
              error: 'Streaming failed',
              code: 'STREAM_ERROR'
            });
            controller.enqueue(encoder.encode(`data: ${errorMessage}\n\n`));
            controller.error(error);
          }
        },
      });

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no', // Disable nginx buffering
        },
      });
    } 
    
    // Handle standard JSON response
    else {
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${vercelToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 404) {
          return NextResponse.json({
            error: 'Deployment not found',
            code: 'DEPLOYMENT_NOT_FOUND'
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
          error: errorData.error?.message || 'Failed to fetch logs',
          code: 'LOGS_FETCH_FAILED'
        }, { status: response.status });
      }

      const logsData = await response.json();

      // Parse and format logs
      const formattedLogs = Array.isArray(logsData) ? logsData.map((log: any) => ({
        id: log.id || log.serial,
        timestamp: log.created || log.date,
        type: log.type,
        message: log.payload?.text || log.text || JSON.stringify(log.payload || {}),
        payload: log.payload,
      })) : [];

      return NextResponse.json({
        logs: formattedLogs,
        total: formattedLogs.length,
        deploymentId: params.deploymentId,
      });
    }

  } catch (error) {
    console.error('Logs fetch error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch deployment logs',
      code: 'INTERNAL_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
