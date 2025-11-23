import { NextRequest, NextResponse } from 'next/server';

// OpenAI-compatible API wrapper for a0.dev LLM API with vision support
// Endpoint: POST /api/v1/chat/completions

interface OpenAIMessageContent {
    type: 'text' | 'image_url';
    text?: string;
    image_url?: string | { url: string; detail?: string };
}

interface OpenAIMessage {
    role: 'system' | 'user' | 'assistant';
    content: string | OpenAIMessageContent[];
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

// Default system prompts for different models
// These prompts make the API more powerful by providing context and capabilities
const DEFAULT_SYSTEM_PROMPTS: Record<string, string> = {
    // General purpose assistant (default)
    'gpt-3.5-turbo': `You are a helpful, intelligent, and friendly AI assistant. You provide accurate, thoughtful, and well-structured responses. You can help with a wide range of tasks including:
- Answering questions and explaining concepts
- Writing and editing text
- Coding and debugging
- Problem-solving and analysis
- Creative tasks and brainstorming

Always be concise yet comprehensive, and ask clarifying questions when needed.`,

    // Code-focused assistant
    'gpt-4-code': `You are an expert software engineer and coding assistant. You excel at:
- Writing clean, efficient, and well-documented code
- Debugging and fixing code issues
- Explaining complex programming concepts
- Suggesting best practices and design patterns
- Reviewing code and providing constructive feedback

You support multiple programming languages and frameworks. Always provide working code examples and explain your reasoning.`,

    // Creative writing assistant
    'gpt-4-creative': `You are a creative writing assistant with expertise in storytelling, content creation, and creative expression. You help with:
- Creative writing and storytelling
- Content creation for blogs, articles, and social media
- Brainstorming ideas and concepts
- Editing and improving writing style
- Adapting tone and voice for different audiences

You're imaginative, articulate, and help bring ideas to life through words.`,

    // Data analysis assistant
    'gpt-4-analyst': `You are a data analysis and research assistant. You specialize in:
- Analyzing data and identifying patterns
- Creating insights from information
- Explaining statistical concepts
- Helping with research and fact-finding
- Structuring information logically

You provide clear, evidence-based analysis and help users make data-driven decisions.`,

    // Teacher/tutor assistant
    'gpt-4-tutor': `You are a patient and knowledgeable tutor. You excel at:
- Explaining complex topics in simple terms
- Breaking down problems step-by-step
- Adapting explanations to different learning styles
- Providing examples and analogies
- Encouraging critical thinking

You make learning engaging and accessible, always checking for understanding.`,

    // Business/professional assistant
    'gpt-4-business': `You are a professional business assistant. You help with:
- Business writing and communication
- Strategic planning and analysis
- Professional emails and documents
- Meeting summaries and action items
- Business problem-solving

You maintain a professional tone and provide practical, actionable advice.`,

    // Vision models
    'gpt-4-vision': `You are an expert vision AI assistant. You excel at:
- Analyzing and describing images in detail
- Identifying objects, people, and scenes
- Explaining visual content and context
- Answering questions about images
- Providing insights from visual data

You provide accurate, detailed descriptions and thoughtful analysis of visual content.`,

    'gpt-4o': `You are an advanced multimodal AI assistant with vision capabilities. You can:
- Analyze images and visual content
- Process text and images together
- Answer questions about visual and textual information
- Provide comprehensive insights combining multiple modalities
- Help with both visual and text-based tasks

You seamlessly integrate visual and textual understanding to provide comprehensive assistance.`,

    'gpt-4-vision-analyst': `You are a specialized image analysis assistant. You focus on:
- Detailed visual analysis and insights
- Pattern recognition in images
- Data visualization interpretation
- Image quality assessment
- Technical image analysis

You provide professional, analytical insights from visual content with attention to detail.`,

    'gpt-4-vision-ocr': `You are an OCR and document processing specialist. You excel at:
- Extracting text from images and documents
- Reading handwritten and printed text
- Preserving document structure and formatting
- Identifying tables, forms, and structured data
- Processing receipts, invoices, and business documents

You accurately extract and structure text from visual documents.`,
};

// Generate a unique chat completion ID
function generateChatCompletionId(): string {
    return `chatcmpl-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

// Get default system prompt for a model
function getDefaultSystemPrompt(model: string): string | null {
    return DEFAULT_SYSTEM_PROMPTS[model] || DEFAULT_SYSTEM_PROMPTS['gpt-3.5-turbo'] || null;
}

// Inject default system prompt if no system message exists
function injectDefaultSystemPrompt(messages: OpenAIMessage[], model: string): OpenAIMessage[] {
    // Check if there's already a system message
    const hasSystemMessage = messages.some(msg => msg.role === 'system');

    if (hasSystemMessage) {
        // User provided their own system prompt, don't override
        return messages;
    }

    // Get default system prompt for this model
    const defaultPrompt = getDefaultSystemPrompt(model);

    if (!defaultPrompt) {
        // No default prompt for this model
        return messages;
    }

    // Inject default system prompt at the beginning
    return [
        { role: 'system', content: defaultPrompt },
        ...messages
    ];
}

// Check if message content is multimodal (contains images)
function isMultimodalContent(content: string | OpenAIMessageContent[]): content is OpenAIMessageContent[] {
    return Array.isArray(content) && content.some(item => item.type === 'image_url');
}

// Check if any message contains vision content
function hasVisionContent(messages: OpenAIMessage[]): boolean {
    return messages.some(msg => isMultimodalContent(msg.content));
}

// Transform OpenAI multimodal format to Mistral format
function transformToMistralFormat(messages: OpenAIMessage[]): any[] {
    return messages.map(msg => {
        if (isMultimodalContent(msg.content)) {
            return {
                role: msg.role,
                content: msg.content.map((item: OpenAIMessageContent) => {
                    if (item.type === 'image_url') {
                        const imageUrl = typeof item.image_url === 'string'
                            ? item.image_url
                            : item.image_url?.url;
                        return {
                            type: 'image_url',
                            image_url: imageUrl
                        };
                    }
                    return {
                        type: 'text',
                        text: item.text || ''
                    };
                })
            };
        }
        return {
            role: msg.role,
            content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
        };
    });
}

// Call Mistral Pixtral API for vision requests
async function callMistralVision(messages: any[], temperature?: number): Promise<any> {
    const mistralApiKey = process.env.MISTRAL_API_KEY || 'W8txIqwcJnyHBTthSlouN2w3mQciqAUr';

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mistralApiKey}`
        },
        body: JSON.stringify({
            model: 'pixtral-12b-2409',
            messages,
            temperature: temperature || 0.7
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Mistral API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.json();
}

// Call Mistral Pixtral API for vision requests (streaming)
async function* streamMistralVision(messages: any[], temperature?: number): AsyncGenerator<string> {
    const mistralApiKey = process.env.MISTRAL_API_KEY || 'W8txIqwcJnyHBTthSlouN2w3mQciqAUr';

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mistralApiKey}`
        },
        body: JSON.stringify({
            model: 'pixtral-12b-2409',
            messages,
            temperature: temperature || 0.7,
            stream: true
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Mistral streaming API error: ${response.status} ${response.statusText} - ${errorText}`);
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
            const lines = chunk.split('\n').filter(line => line.trim() !== '');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') continue;

                    try {
                        const parsed = JSON.parse(data);
                        const content = parsed.choices?.[0]?.delta?.content;
                        if (content) {
                            yield content;
                        }
                    } catch (e) {
                        // Skip invalid JSON
                    }
                }
            }
        }
    } finally {
        reader.releaseLock();
    }
}

// Transform OpenAI request to a0.dev format
function transformRequest(openAIRequest: OpenAIRequest, model: string): A0DevRequest {
    // Inject default system prompt if needed
    const messagesWithPrompt = injectDefaultSystemPrompt(openAIRequest.messages, model);

    const a0Request: A0DevRequest = {
        messages: messagesWithPrompt,
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

// Transform Mistral response to OpenAI format
function transformMistralResponse(
    mistralResponse: any,
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
                    content: mistralResponse.choices[0].message.content,
                },
                finish_reason: mistralResponse.choices[0].finish_reason || 'stop',
            },
        ],
        usage: mistralResponse.usage || {
            prompt_tokens: 0,
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

        let model = body.model || 'gpt-3.5-turbo';
        const id = generateChatCompletionId();
        const created = Math.floor(Date.now() / 1000);

        // Check if request contains vision content
        const isVisionRequest = hasVisionContent(body.messages);

        if (isVisionRequest) {
            // Route to Pixtral 12B for vision requests
            console.log('🖼️  Vision content detected, routing to Pixtral 12B');
            model = 'pixtral-12b-2409';

            const mistralMessages = transformToMistralFormat(body.messages);

            // Handle streaming for vision
            if (body.stream) {
                const encoder = new TextEncoder();

                const stream = new ReadableStream({
                    async start(controller) {
                        try {
                            for await (const chunk of streamMistralVision(mistralMessages, body.temperature)) {
                                const sseChunk = createStreamChunk(chunk, id, model, created);
                                controller.enqueue(encoder.encode(sseChunk));
                            }

                            const finalChunk = createStreamChunk('', id, model, created, 'stop');
                            controller.enqueue(encoder.encode(finalChunk));
                            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                            controller.close();
                        } catch (error) {
                            controller.error(error);
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

            // Handle non-streaming for vision
            const mistralResponse = await callMistralVision(mistralMessages, body.temperature);
            const openAIResponse = transformMistralResponse(mistralResponse, model, id, created);
            return NextResponse.json(openAIResponse);
        }

        // Regular text-only request - use a0.dev
        const a0Request = transformRequest(body, model);

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
