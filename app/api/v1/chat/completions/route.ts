import { NextRequest, NextResponse } from 'next/server';

// OpenAI-compatible API wrapper for a0.dev LLM API
// Endpoint: POST /api/v1/chat/completions

interface OpenAIMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

interface OpenAIRequest {
    model?: string;
    messages: OpenAIMessage[];
    temperature?: number;
    max_tokens?: number;
    stream?: boolean;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
    n?: number;
}

interface A0DevRequest {
    messages: OpenAIMessage[];
    temperature?: number;
}

interface A0DevResponse {
    completion: string;
    metadata?: any;
}

// Generate a unique chat completion ID
function generateChatCompletionId(): string {
    return `chatcmpl-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

// Transform OpenAI request to a0.dev format
function transformRequest(openAIRequest: OpenAIRequest): A0DevRequest {
    const a0Request: A0DevRequest = {
        messages: openAIRequest.messages,
    };

    if (openAIRequest.temperature !== undefined) {
        a0Request.temperature = openAIRequest.temperature;
    }

    return a0Request;
}

// Transform a0.dev response to OpenAI format (non-streaming)
function transformResponse(
    a0Response: A0DevResponse,
    model: string,
    id: string,
    created: number
) {
    return {
        id,
        object: 'chat.completion',
        created,
        model,
        choices: [
            {
                index: 0,
                message: {
                    role: 'assistant',
                    content: a0Response.completion,
                },
                finish_reason: 'stop',
            },
        ],
        usage: {
            prompt_tokens: 0, // a0.dev doesn't provide token counts
            completion_tokens: 0,
            total_tokens: 0,
        },
    };
}

// Create SSE chunk in OpenAI format
function createStreamChunk(
    content: string,
    id: string,
    model: string,
    created: number,
    finishReason: string | null = null
): string {
    const chunk = {
        id,
        object: 'chat.completion.chunk',
        created,
        model,
        choices: [
            {
                index: 0,
                delta: finishReason ? {} : { content },
                finish_reason: finishReason,
            },
        ],
    };
    return `data: ${JSON.stringify(chunk)}\n\n`;
}

// Non-streaming call to a0.dev
async function callA0DevNonStreaming(
    request: A0DevRequest
): Promise<A0DevResponse> {
    const response = await fetch('https://api.a0.dev/ai/llm', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
            `a0.dev API error: ${response.status} ${response.statusText} - ${errorText}`
        );
    }

    const data = await response.json();
    return data;
}

// Streaming call to a0.dev
async function* streamA0Dev(request: A0DevRequest): AsyncGenerator<string> {
    const response = await fetch('https://api.a0.dev/ai/llm', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
            `a0.dev API error: ${response.status} ${response.statusText} - ${errorText}`
        );
    }

    if (!response.body) {
        throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            yield chunk;
        }
    } finally {
        reader.releaseLock();
    }
}

export async function POST(request: NextRequest) {
    try {
        const body: OpenAIRequest = await request.json();

        // Validate required fields
        if (!body.messages || !Array.isArray(body.messages)) {
            return NextResponse.json(
                {
                    error: {
                        message: 'Invalid request: messages array is required',
                        type: 'invalid_request_error',
                        param: 'messages',
                        code: 'invalid_request',
                    },
                },
                { status: 400 }
            );
        }

        const model = body.model || 'a0-llm';
        const id = generateChatCompletionId();
        const created = Math.floor(Date.now() / 1000);
        const a0Request = transformRequest(body);

        // Handle streaming
        if (body.stream) {
            const encoder = new TextEncoder();

            const stream = new ReadableStream({
                async start(controller) {
                    try {
                        // Try streaming from a0.dev
                        for await (const chunk of streamA0Dev(a0Request)) {
                            const sseChunk = createStreamChunk(chunk, id, model, created);
                            controller.enqueue(encoder.encode(sseChunk));
                        }

                        // Send final chunk with finish_reason
                        const finalChunk = createStreamChunk('', id, model, created, 'stop');
                        controller.enqueue(encoder.encode(finalChunk));

                        // Send [DONE] message
                        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                        controller.close();
                    } catch (error) {
                        // Fallback to non-streaming if streaming fails
                        try {
                            const a0Response = await callA0DevNonStreaming(a0Request);
                            const sseChunk = createStreamChunk(
                                a0Response.completion,
                                id,
                                model,
                                created
                            );
                            controller.enqueue(encoder.encode(sseChunk));

                            const finalChunk = createStreamChunk('', id, model, created, 'stop');
                            controller.enqueue(encoder.encode(finalChunk));
                            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                            controller.close();
                        } catch (fallbackError) {
                            controller.error(fallbackError);
                        }
                    }
                },
            });

            return new NextResponse(stream, {
                headers: {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    Connection: 'keep-alive',
                },
            });
        }

        // Handle non-streaming
        const a0Response = await callA0DevNonStreaming(a0Request);
        const openAIResponse = transformResponse(a0Response, model, id, created);

        return NextResponse.json(openAIResponse);
    } catch (error) {
        console.error('OpenAI-compatible API error:', error);

        return NextResponse.json(
            {
                error: {
                    message:
                        error instanceof Error ? error.message : 'Internal server error',
                    type: 'api_error',
                    code: 'internal_error',
                },
            },
            { status: 500 }
        );
    }
}
