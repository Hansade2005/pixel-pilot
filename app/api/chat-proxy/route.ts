import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Get authentication headers from the original request
    const authHeaders: Record<string, string> = {};
    
    // Forward common authentication headers
    const originalAuthHeader = request.headers.get('authorization');
    if (originalAuthHeader) {
      authHeaders['Authorization'] = originalAuthHeader;
    }
    
    // Forward other potential auth-related headers
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
      authHeaders['Cookie'] = cookieHeader;
    }
    
    const xAuthHeader = request.headers.get('x-auth-token');
    if (xAuthHeader) {
      authHeaders['X-Auth-Token'] = xAuthHeader;
    }
    
    const supabaseAuthHeader = request.headers.get('x-supabase-auth');
    if (supabaseAuthHeader) {
      authHeaders['X-Supabase-Auth'] = supabaseAuthHeader;
    }

    const externalResponse = await fetch('https://p.appwrite.network/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders, // Include all authentication headers
      },
      body: JSON.stringify(body),
    });

    // Create a streaming response to forward the external API response
    const stream = new ReadableStream({
      async start(controller) {
        const reader = externalResponse.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
        } catch (error) {
          console.error('Stream reading error:', error);
          controller.error(error);
        } finally {
          reader.releaseLock();
          controller.close();
        }
      }
    });

    return new Response(stream, {
      status: externalResponse.status,
      headers: {
        'Content-Type': externalResponse.headers.get('Content-Type') || 'text/plain',
        'Transfer-Encoding': 'chunked',
        ...Object.fromEntries(externalResponse.headers.entries()),
      },
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to forward request' }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
}