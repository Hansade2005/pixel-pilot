import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// OpenAI-compatible API wrapper for a0.dev LLM API, Pixtral (Vision), and Codestral (Code)
// Endpoint: POST /api/v1/chat/completions

interface OpenAIMessageContent {
    type: 'text' | 'image_url';
    text?: string;
    image_url?: string | { url: string; detail?: string };
}

interface OpenAIMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string | OpenAIMessageContent[] | null;
    tool_calls?: any[];
    tool_call_id?: string;
    name?: string;
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
    tools?: any[];
    tool_choice?: any;
}

interface A0DevRequest {
    messages: OpenAIMessage[];
    temperature?: number;
}

interface A0DevResponse {
    completion: string;
    metadata?: any;
}

// Zod schema for simulated tool calls
const ToolCallSchema = z.object({
    tool_uses: z.array(z.object({
        name: z.string(),
        arguments: z.record(z.any())
    }))
});

// Default system prompts for the 4 core models
const DEFAULT_SYSTEM_PROMPTS: Record<string, string> = {
    'pipilot-1-chat': `You are PiPilot Chat, an extremely powerful, intelligent, and versatile AI assistant. 
You excel at every general task, from writing and analysis to problem-solving and creative work.
Your responses are always accurate, thoughtful, comprehensive, and beautifully structured.
You are designed to be the ultimate everyday companion, capable of handling any request with precision and grace.`,

    'pipilot-1-code': `You are PiPilot Code, an elite, autonomous AI software engineer.
You are capable of solving complex coding tasks with minimal human intervention.
Your goal is to achieve state-of-the-art performance (SWE-bench level).

CORE PRINCIPLES:
1. **Explore First:** Never write code without understanding the context. Use tools to read files and explore the codebase.
2. **Plan & Reason:** Before executing, outline your plan. Think step-by-step.
3. **Tool Mastery:** You have access to tools. USE THEM. Do not hallucinate file contents.
4. **Self-Correction:** If a step fails, analyze the error, adjust your plan, and retry.
5. **Precision:** Your code must be production-ready, bug-free, and efficient.

FORMAT:
<thinking>
[Your detailed step-by-step reasoning goes here. Analyze the request, explore the codebase (mentally or via tools), and formulate a plan.]
</thinking>

[Your final response, code, or tool call goes here.]

You are not just a chatbot; you are an agent. ACT like one.`,

    'pipilot-1-vision': `You are PiPilot Vision, a state-of-the-art multimodal AI assistant.
You rival the capabilities of the world's best vision models.
You can analyze images with incredible detail, identifying objects, reading text (OCR), and understanding complex visual scenes.
Provide detailed, accurate, and insightful descriptions of any visual content provided.`,

    'pipilot-1-chat-thinking': `You are PiPilot Thinking, a super-intelligent reasoning model designed to rival the smartest AIs.
You DO NOT just answer; you THINK.
Before providing a final response, you must engage in a deep, step-by-step reasoning process to ensure your answer is correct, logical, and insightful.

FORMAT:
<thinking>
[Your detailed step-by-step reasoning goes here. Explore multiple angles, verify assumptions, and synthesize information.]
</thinking>

[Your final, polished answer goes here.]

Your goal is to provide the most intelligent, well-reasoned, and high-quality response possible.`,
};

function generateChatCompletionId(): string {
    return 'chatcmpl-' + Math.random().toString(36).substring(2, 15);
}

function isMultimodalContent(content: any): boolean {
    return Array.isArray(content) && content.some(item => item.type === 'image_url');
}

function hasVisionContent(messages: OpenAIMessage[]): boolean {
    return messages.some(msg => isMultimodalContent(msg.content));
}

// --- Mistral / Codestral / Pixtral Integration ---

async function callMistralVision(messages: any[], temperature?: number, tools?: any[], tool_choice?: any): Promise<any> {
    const mistralApiKey = process.env.MISTRAL_API_KEY || 'W8txIqwcJnyHBTthSlouN2w3mQciqAUr';
    const body: any = { model: 'pixtral-12b-2409', messages, temperature: temperature || 0.7 };
    if (tools) {
        body.tools = tools;
        body.tool_choice = tool_choice || 'auto';
    }

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${mistralApiKey}` },
        body: JSON.stringify(body)
    });
    if (!response.ok) throw new Error(`Mistral API error: ${response.status} ${await response.text()}`);
    return await response.json();
}

async function* streamMistralVision(messages: any[], temperature?: number, tools?: any[], tool_choice?: any): AsyncGenerator<string> {
    const mistralApiKey = process.env.MISTRAL_API_KEY || 'W8txIqwcJnyHBTthSlouN2w3mQciqAUr';
    const body: any = { model: 'pixtral-12b-2409', messages, temperature: temperature || 0.7, stream: true };
    if (tools) {
        body.tools = tools;
        body.tool_choice = tool_choice || 'auto';
    }

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${mistralApiKey}` },
        body: JSON.stringify(body)
    });
    if (!response.ok) throw new Error(`Mistral streaming API error: ${response.status} ${await response.text()}`);
    if (!response.body) throw new Error('Response body is null');

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
                        if (content) yield content;
                    } catch (e) { }
                }
            }
        }
    } finally {
        reader.releaseLock();
    }
}

async function callCodestral(messages: any[], temperature?: number, tools?: any[], tool_choice?: any): Promise<any> {
    const codestralApiKey = process.env.CODESTRAL_API_KEY || 'DXfXAjwNIZcAv1ESKtoDwWZZF98lJxho';
    const body: any = { model: 'codestral-latest', messages, temperature: temperature || 0.3 };
    if (tools) {
        body.tools = tools;
        body.tool_choice = tool_choice || 'auto';
    }

    const response = await fetch('https://codestral.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${codestralApiKey}` },
        body: JSON.stringify(body)
    });
    if (!response.ok) throw new Error(`Codestral API error: ${response.status} ${await response.text()}`);
    return await response.json();
}

async function* streamCodestral(messages: any[], temperature?: number, tools?: any[], tool_choice?: any): AsyncGenerator<string> {
    const codestralApiKey = process.env.CODESTRAL_API_KEY || 'DXfXAjwNIZcAv1ESKtoDwWZZF98lJxho';
    const body: any = { model: 'codestral-latest', messages, temperature: temperature || 0.3, stream: true };
    if (tools) {
        body.tools = tools;
        body.tool_choice = tool_choice || 'auto';
    }

    const response = await fetch('https://codestral.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${codestralApiKey}` },
        body: JSON.stringify(body)
    });
    if (!response.ok) throw new Error(`Codestral streaming API error: ${response.status} ${await response.text()}`);
    if (!response.body) throw new Error('Response body is null');

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
                        if (content) yield content;
                    } catch (e) { }
                }
            }
        }
    } finally {
        reader.releaseLock();
    }
}

function transformToMistralFormat(openAIMessages: OpenAIMessage[]): any[] {
    return openAIMessages.map(msg => {
        if (isMultimodalContent(msg.content)) {
            return {
                role: msg.role,
                content: (msg.content as OpenAIMessageContent[]).map(item => {
                    if (item.type === 'image_url') {
                        return {
                            type: 'image_url',
                            image_url: typeof item.image_url === 'string' ? item.image_url : item.image_url?.url
                        };
                    }
                    return item;
                })
            };
        }
        return msg;
    });
}

function transformMistralResponse(mistralResponse: any, model: string): any {
    return {
        id: mistralResponse.id,
        object: 'chat.completion',
        created: mistralResponse.created,
        model: model,
        choices: mistralResponse.choices.map((choice: any) => ({
            index: choice.index,
            message: choice.message,
            finish_reason: choice.finish_reason
        })),
        usage: mistralResponse.usage
    };
}

// --- Helper to merge system prompts ---

function ensureSystemPrompt(messages: OpenAIMessage[], model: string, tools?: any[]): OpenAIMessage[] {
    const defaultPrompt = DEFAULT_SYSTEM_PROMPTS[model] || DEFAULT_SYSTEM_PROMPTS['pipilot-1-chat'];
    const newMessages = [...messages];
    const systemMessageIndex = newMessages.findIndex(m => m.role === 'system');

    let toolInstruction = '';
    // Only inject simulated tool instructions for models that DON'T support native function calling
    const isNativeToolModel = model === 'pipilot-1-code' || model === 'pipilot-1-vision' || model === 'codestral-latest';

    if (tools && tools.length > 0 && !isNativeToolModel) {
        toolInstruction = `\n\n[SYSTEM]
You have access to the following tools:
${JSON.stringify(tools, null, 2)}

To call a tool, you MUST output ONLY a JSON object in this format:
{"tool_uses": [{"name": "tool_name", "arguments": { ... }}]}
Do not output any other text if you are calling a tool.`;
    }

    if (systemMessageIndex !== -1) {
        // User provided a system prompt. Merge it with the default.
        const userSystemContent = newMessages[systemMessageIndex].content;
        const userText = Array.isArray(userSystemContent)
            ? userSystemContent.map(c => c.type === 'text' ? c.text : '').join('')
            : userSystemContent;

        newMessages[systemMessageIndex] = {
            role: 'system',
            content: `${defaultPrompt}\n\n--- USER SYSTEM INSTRUCTIONS ---\n${userText}${toolInstruction}`
        };
    } else {
        // No user system prompt, just add the default one
        newMessages.unshift({ role: 'system', content: `${defaultPrompt}${toolInstruction}` });
    }
    return newMessages;
}

// --- a0.dev Integration ---

function transformRequest(req: OpenAIRequest, model: string): A0DevRequest {
    const messages = ensureSystemPrompt(req.messages, model, req.tools);
    return {
        messages: messages,
        temperature: req.temperature
    };
}

function transformResponse(a0Response: A0DevResponse, model: string): any {
    const content = a0Response.completion;
    let toolCalls = undefined;
    let finalContent: string | null = content;

    // Attempt to parse simulated tool calls
    try {
        // Look for JSON-like structure if mixed with text, or just parse if it looks like JSON
        if (content.trim().startsWith('{') && content.trim().includes('tool_uses')) {
            const parsed = JSON.parse(content);
            const validation = ToolCallSchema.safeParse(parsed);

            if (validation.success) {
                toolCalls = validation.data.tool_uses.map((tool: any) => ({
                    id: 'call_' + Math.random().toString(36).substring(2, 10),
                    type: 'function',
                    function: {
                        name: tool.name,
                        arguments: JSON.stringify(tool.arguments)
                    }
                }));
                finalContent = null; // Clear content if it's a tool call
            }
        }
    } catch (e) {
        // Not a valid JSON tool call, treat as normal text
    }

    return {
        id: generateChatCompletionId(),
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: model,
        choices: [
            {
                index: 0,
                message: {
                    role: 'assistant',
                    content: finalContent,
                    tool_calls: toolCalls
                },
                finish_reason: toolCalls ? 'tool_calls' : 'stop'
            }
        ],
        usage: {
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0
        }
    };
}

export async function POST(request: NextRequest) {
    try {
        const body: OpenAIRequest = await request.json();

        if (!body.messages || !Array.isArray(body.messages)) {
            return NextResponse.json(
                { error: { message: "Invalid request: messages array is required", type: "invalid_request_error", param: "messages", code: "invalid_request" } },
                { status: 400 }
            );
        }

        let model = body.model || 'pipilot-1-chat';

        console.log(`🚀 Request for model: ${model}`);

        // 1. Vision Routing (Pixtral)
        if (model === 'pipilot-1-vision' || hasVisionContent(body.messages)) {
            console.log('🖼️  Vision content/model detected, routing to Pixtral 12B');

            const messagesWithPrompt = ensureSystemPrompt(body.messages, 'pipilot-1-vision', body.tools);
            const mistralMessages = transformToMistralFormat(messagesWithPrompt);

            if (body.stream) {
                const stream = streamMistralVision(mistralMessages, body.temperature, body.tools, body.tool_choice);
                const encoder = new TextEncoder();
                const readable = new ReadableStream({
                    async start(controller) {
                        const id = generateChatCompletionId();
                        const created = Math.floor(Date.now() / 1000);
                        for await (const chunk of stream) {
                            const data = JSON.stringify({
                                id, object: 'chat.completion.chunk', created, model: 'pipilot-1-vision',
                                choices: [{ index: 0, delta: { content: chunk }, finish_reason: null }]
                            });
                            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                        }
                        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                        controller.close();
                    }
                });
                return new NextResponse(readable, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' } });
            } else {
                const response = await callMistralVision(mistralMessages, body.temperature, body.tools, body.tool_choice);
                return NextResponse.json(transformMistralResponse(response, 'pipilot-1-vision'));
            }
        }

        // 2. Code Routing (Codestral)
        if (model === 'pipilot-1-code') {
            console.log('💻 Code model detected, routing to Codestral');

            const messages = ensureSystemPrompt(body.messages, 'pipilot-1-code', body.tools);

            if (body.stream) {
                const stream = streamCodestral(messages, body.temperature, body.tools, body.tool_choice);
                const encoder = new TextEncoder();
                const readable = new ReadableStream({
                    async start(controller) {
                        const id = generateChatCompletionId();
                        const created = Math.floor(Date.now() / 1000);
                        for await (const chunk of stream) {
                            const data = JSON.stringify({
                                id, object: 'chat.completion.chunk', created, model: 'pipilot-1-code',
                                choices: [{ index: 0, delta: { content: chunk }, finish_reason: null }]
                            });
                            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                        }
                        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                        controller.close();
                    }
                });
                return new NextResponse(readable, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' } });
            } else {
                const response = await callCodestral(messages, body.temperature, body.tools, body.tool_choice);
                return NextResponse.json(transformMistralResponse(response, 'pipilot-1-code'));
            }
        }

        // 3. General Chat & Thinking (a0.dev)
        console.log(`💬 Routing to a0.dev for model: ${model}`);
        const a0Request = transformRequest(body, model);

        const response = await fetch('https://api.a0.dev/ai/llm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(a0Request)
        });

        if (!response.ok) {
            throw new Error(`a0.dev API error: ${response.status} ${await response.text()}`);
        }

        const data: A0DevResponse = await response.json();
        const transformed = transformResponse(data, model);

        if (body.stream) {
            // Simulate streaming for a0.dev (which is non-streaming)
            const encoder = new TextEncoder();
            const readable = new ReadableStream({
                async start(controller) {
                    // If it's a tool call, we don't stream word by word, just send it all at once
                    if (transformed.choices[0].message.tool_calls) {
                        const toolCallsWithIndex = transformed.choices[0].message.tool_calls.map((tc: any, i: number) => ({
                            ...tc,
                            index: i
                        }));
                        const chunk = JSON.stringify({
                            id: transformed.id, object: 'chat.completion.chunk', created: transformed.created, model: model,
                            choices: [{ index: 0, delta: { tool_calls: toolCallsWithIndex }, finish_reason: null }]
                        });
                        controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
                    } else {
                        const content = transformed.choices[0].message.content || '';
                        const words = content.split(' ');
                        for (const word of words) {
                            const chunk = JSON.stringify({
                                id: transformed.id, object: 'chat.completion.chunk', created: transformed.created, model: model,
                                choices: [{ index: 0, delta: { content: word + ' ' }, finish_reason: null }]
                            });
                            controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
                            await new Promise(r => setTimeout(r, 10));
                        }
                    }
                    const doneChunk = JSON.stringify({
                        id: transformed.id, object: 'chat.completion.chunk', created: transformed.created, model: model,
                        choices: [{ index: 0, delta: {}, finish_reason: 'stop' }]
                    });
                    controller.enqueue(encoder.encode(`data: ${doneChunk}\n\n`));
                    controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                    controller.close();
                }
            });
            return new NextResponse(readable, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' } });
        }

        return NextResponse.json(transformed);

    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json(
            { error: { message: error.message || "Internal server error", type: "server_error", param: null, code: "internal_error" } },
            { status: 500 }
        );
    }
}

export async function OPTIONS(request: NextRequest) {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}
