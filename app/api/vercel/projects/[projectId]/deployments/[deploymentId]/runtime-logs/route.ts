import { NextRequest, NextResponse } from 'next/server';

/**
 * Get runtime logs for a specific deployment
 * 
 * This endpoint streams runtime logs from a deployed application, including
 * request logs, function logs, and errors from production deployments.
 * 
 * Uses GET /v1/projects/{projectId}/deployments/{deploymentId}/runtime-logs
 * Official API: https://vercel.com/docs/rest-api/reference/endpoints/logs/get-logs-for-a-deployment
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string; deploymentId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const vercelToken = searchParams.get('token');
    const teamId = searchParams.get('teamId');
    const stream = searchParams.get('stream') === 'true';
    const limit = searchParams.get('limit') || '100';

    // Validate required parameters
    if (!vercelToken) {
      return NextResponse.json({
        error: 'Vercel token is required'
      }, { status: 400 });
    }

    // Validate project ID is not undefined
    if (!params.projectId || params.projectId === 'undefined') {
      return NextResponse.json({
        error: 'Valid project ID is required',
        code: 'INVALID_PROJECT_ID'
      }, { status: 400 });
    }

    // Validate deployment ID is not undefined
    if (!params.deploymentId || params.deploymentId === 'undefined') {
      return NextResponse.json({
        error: 'Valid deployment ID is required',
        code: 'INVALID_DEPLOYMENT_ID'
      }, { status: 400 });
    }

    // Build API URL
    let apiUrl = `https://api.vercel.com/v1/projects/${params.projectId}/deployments/${params.deploymentId}/runtime-logs`;
    
    const queryParams = new URLSearchParams();
    if (teamId) queryParams.set('teamId', teamId);
    
    if (queryParams.toString()) {
      apiUrl += `?${queryParams.toString()}`;
    }

    // Handle streaming response (Server-Sent Events)
    if (stream) {
      const encoder = new TextEncoder();
      
      const readable = new ReadableStream({
        async start(controller) {
          try {
            const response = await fetch(apiUrl, {
              headers: {
                'Authorization': `Bearer ${vercelToken}`,
                'Accept': 'application/stream+json',
              },
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              const errorMessage = JSON.stringify({
                error: errorData.error?.message || 'Failed to fetch runtime logs',
                code: 'RUNTIME_LOGS_FETCH_FAILED',
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
              
              if (done) {
                controller.close();
                break;
              }

              controller.enqueue(value);
            }
          } catch (err) {
            console.error('Runtime logs streaming error:', err);
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ error: 'Streaming error' })}\n\n`)
            );
            controller.close();
          }
        },
      });

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Handle regular JSON response (non-streaming)
    // Let the fetch connect without timeout, then read stream with timeout
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
      },
      // No signal here - let it connect and start streaming
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
        code: 'RUNTIME_LOGS_FETCH_FAILED'
      }, { status: response.status });
    }

      // Read the stream with a timeout - give it time to actually receive data
      const logs: any[] = [];
      const reader = response.body?.getReader();
      
      if (!reader) {
        return NextResponse.json({
          logs: [],
          count: 0,
          projectId: params.projectId,
          deploymentId: params.deploymentId,
          message: 'No response body'
        });
      }

      const decoder = new TextDecoder();
      let buffer = '';
      const startTime = Date.now();
      const readTimeoutMs = 15000; // 15 seconds to read logs
      let hasReceivedData = false;

      try {
        while (true) {
          // Check timeout - but only after we've tried to read some data
          const elapsed = Date.now() - startTime;
          if (elapsed > readTimeoutMs) {
            console.log(`Read timeout after ${elapsed}ms, collected ${logs.length} logs`);
            break;
          }

          const { done, value } = await reader.read();
          
          if (done) {
            console.log('Stream ended naturally');
            break;
          }
          
          hasReceivedData = true;
          buffer += decoder.decode(value, { stream: true });
          
          // Process complete lines
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer
          
          for (const line of lines) {
            if (!line.trim()) continue;
            
            try {
              const log = JSON.parse(line);
              logs.push({
                level: log.level,
                message: log.message,
                rowId: log.rowId,
                source: log.source,
                timestamp: log.timestampInMs,
                domain: log.domain,
                messageTruncated: log.messageTruncated,
                requestMethod: log.requestMethod,
                requestPath: log.requestPath,
                responseStatusCode: log.responseStatusCode,
              });
              
              // Stop after collecting the requested number of logs
              if (logs.length >= parseInt(limit)) {
                console.log(`Collected ${logs.length} logs (limit reached)`);
                break;
              }
            } catch (parseError) {
              console.error('Failed to parse log line:', parseError);
            }
          }
          
          // Exit if we hit the limit
          if (logs.length >= parseInt(limit)) {
            break;
          }
        }
      } catch (error: any) {
        console.error('Error reading stream:', error);
      } finally {
        try {
          reader.cancel();
        } catch (e) {
          // Ignore cancel errors
        }
      }

      console.log(`Returning ${logs.length} runtime logs (received data: ${hasReceivedData})`);
      
      // Return formatted logs
      return NextResponse.json({
        logs,
        count: logs.length,
        projectId: params.projectId,
        deploymentId: params.deploymentId,
      });

  } catch (error: any) {
    console.error('Runtime logs error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch runtime logs',
      code: 'INTERNAL_ERROR',
      details: error.message
    }, { status: 500 });
  }
}
