import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Enhanced error handling utilities
interface APIError {
    message: string;
    type: string;
    code: string;
    param?: string | null;
    details?: any;
    requestId?: string;
    timestamp?: string;
}

function createAPIError(
    message: string,
    type: string,
    code: string,
    param: string | null = null,
    details: any = null,
    requestId?: string
): APIError {
    return {
        message,
        type,
        code,
        param,
        details,
        requestId,
        timestamp: new Date().toISOString()
    };
}

function handleAPIError(error: any, context: string, requestId?: string): APIError {
    // Log full error details internally for debugging
    console.error(`[${context}] Error:`, {
        message: error.message,
        stack: error.stack,
        name: error.name,
        requestId,
        context
    });

    // NEVER expose raw API error messages to users
    // Categorize errors and provide sanitized, user-friendly messages

    if (error.message?.includes('fetch') || error.message?.includes('network') || error.message?.includes('ECONNREFUSED')) {
        return createAPIError(
            'Service temporarily unavailable. Please try again in a moment.',
            'service_unavailable',
            'external_api_unavailable',
            null,
            { context, errorCategory: 'network' },
            requestId
        );
    }

    if (error.message?.includes('timeout') || error.message?.includes('ETIMEDOUT')) {
        return createAPIError(
            'Request timed out. Please try again.',
            'timeout_error',
            'request_timeout',
            null,
            { context, errorCategory: 'timeout' },
            requestId
        );
    }

    if (error.message?.includes('rate limit') || error.message?.includes('429')) {
        return createAPIError(
            'Too many requests. Please wait a moment before trying again.',
            'rate_limit_error',
            'rate_limit_exceeded',
            null,
            { context, errorCategory: 'rate_limit' },
            requestId
        );
    }

    if (error.message?.includes('authentication') || error.message?.includes('unauthorized') || error.message?.includes('401')) {
        return createAPIError(
            'Authentication failed. Please check your credentials.',
            'auth_error',
            'authentication_failed',
            null,
            { context, errorCategory: 'auth' },
            requestId
        );
    }

    if (error.message?.includes('403') || error.message?.includes('forbidden')) {
        return createAPIError(
            'Access denied. Please check your permissions.',
            'auth_error',
            'access_denied',
            null,
            { context, errorCategory: 'forbidden' },
            requestId
        );
    }

    if (error.message?.includes('500') || error.message?.includes('502') || error.message?.includes('503') || error.message?.includes('504')) {
        return createAPIError(
            'Service is experiencing issues. Please try again later.',
            'service_unavailable',
            'external_service_error',
            null,
            { context, errorCategory: 'server_error' },
            requestId
        );
    }

    // For any other errors, provide a generic message
    // Never expose the actual error message from external APIs
    return createAPIError(
        'An unexpected error occurred. Please try again.',
        'server_error',
        'internal_error',
        null,
        { context, errorCategory: 'unknown' },
        requestId
    );
}

function validateRequest(body: any): APIError | null {
    if (!body) {
        return createAPIError(
            'Request body is required',
            'invalid_request_error',
            'missing_body'
        );
    }

    if (!body.messages || !Array.isArray(body.messages)) {
        return createAPIError(
            'The messages parameter must be an array of message objects',
            'invalid_request_error',
            'invalid_messages',
            'messages'
        );
    }

    if (body.messages.length === 0) {
        return createAPIError(
            'At least one message is required',
            'invalid_request_error',
            'empty_messages',
            'messages'
        );
    }

    // Validate message format
    for (let i = 0; i < body.messages.length; i++) {
        const msg = body.messages[i];
        if (!msg.role || !['system', 'user', 'assistant', 'tool'].includes(msg.role)) {
            return createAPIError(
                `Message ${i} has invalid role. Must be one of: system, user, assistant, tool`,
                'invalid_request_error',
                'invalid_message_role',
                `messages[${i}].role`
            );
        }

        if (typeof msg.content !== 'string' && !Array.isArray(msg.content)) {
            return createAPIError(
                `Message ${i} content must be a string or array`,
                'invalid_request_error',
                'invalid_message_content',
                `messages[${i}].content`
            );
        }
    }

    // Validate tools if provided
    if (body.tools) {
        if (!Array.isArray(body.tools)) {
            return createAPIError(
                'Tools parameter must be an array',
                'invalid_request_error',
                'invalid_tools',
                'tools'
            );
        }

        for (let i = 0; i < body.tools.length; i++) {
            const tool = body.tools[i];
            if (!tool.type || tool.type !== 'function') {
                return createAPIError(
                    `Tool ${i} must have type 'function'`,
                    'invalid_request_error',
                    'invalid_tool_type',
                    `tools[${i}].type`
                );
            }

            if (!tool.function?.name || typeof tool.function.name !== 'string') {
                return createAPIError(
                    `Tool ${i} must have a valid function name`,
                    'invalid_request_error',
                    'invalid_tool_name',
                    `tools[${i}].function.name`
                );
            }
        }
    }

    return null; // No validation errors
}

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

// Tool parsing and execution functions
function parseToolCalls(content: string): any[] {
    console.log('Parsing tool calls from content:', content);

    const toolCalls = [];

    // Try primary format: [TOOL_CALL: tool_name(parameters)]
    const toolCallRegex = /\[TOOL_CALL:\s*(\w+)\(([^)]*)\)\]/g;
    let match;
    while ((match = toolCallRegex.exec(content)) !== null) {
        const toolName = match[1];
        const paramsStr = match[2];
        console.log('Found tool call (format 1):', toolName, 'with params:', paramsStr);
        toolCalls.push({
            name: toolName,
            parameters: paramsStr
        });
    }

    // If no tool calls found, try alternative formats
    if (toolCalls.length === 0) {
        // Try format: tool_name("parameters")
        const altRegex = /(\w+)\("([^"]*)"\)/g;
        while ((match = altRegex.exec(content)) !== null) {
            const toolName = match[1];
            const paramsStr = match[2];
            console.log('Found tool call (format 2):', toolName, 'with params:', paramsStr);
            toolCalls.push({
                name: toolName,
                parameters: paramsStr
            });
        }
    }

    // If still no tool calls, try format: tool_name(parameters) without quotes
    if (toolCalls.length === 0) {
        const simpleRegex = /(\w+)\(([^)]*)\)/g;
        while ((match = simpleRegex.exec(content)) !== null) {
            const toolName = match[1];
            const paramsStr = match[2];
            // Skip if it looks like a function call that's not a tool
            if (!['search_web', 'get_weather', 'calculate', 'extract_text'].includes(toolName)) continue;
            console.log('Found tool call (format 3):', toolName, 'with params:', paramsStr);
            toolCalls.push({
                name: toolName,
                parameters: paramsStr
            });
        }
    }

    console.log('Total tool calls found:', toolCalls.length);
    return toolCalls;
}

async function executeToolManually(toolCall: any, availableTools: any[]): Promise<any> {
    const { name, parameters } = toolCall;

    console.log('Executing tool:', name, 'with parameters:', parameters);

    try {
        switch (name) {
            case 'search_web':
                // Try different formats: "query: top shops" or just "top shops"
                let query = parameters.trim();
                const queryMatch = parameters.match(/query:\s*(.+)/) ||
                                  parameters.match(/"([^"]+)"/) ||
                                  parameters.match(/'([^']+)'/);
                if (queryMatch) query = queryMatch[1] || queryMatch[0];
                query = query.replace(/["']/g, '').trim();
                console.log('Parsed query:', query);
                return await searchWebTool(query);

            default:
                // Check if it's a custom tool from the request
                const customTool = availableTools.find(t => t.function?.name === name);
                if (customTool) {
                    return { error: `Custom tool '${name}' execution not implemented in API` };
                }
                return { error: `Unknown tool: ${name}` };
        }
    } catch (error) {
        console.error('Tool execution error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown tool execution error',
            toolName: name,
            timestamp: new Date().toISOString()
        };
    }
}

// Builtin tool implementations
async function searchWebTool(query: string): Promise<any> {
    try {
        const response = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer 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`
            },
            body: JSON.stringify({
                query: query,
                search_depth: "basic",
                include_answer: false,
                include_raw_content: true,
                max_results: 5
            })
        });

        if (!response.ok) {
            throw new Error(`Web search failed with status ${response.status}`);
        }

        const searchData = await response.json();

        // Truncate results for API response
        const truncatedResults = searchData.results?.map((result: any) => ({
            ...result,
            content: result.content?.length > 200 ? result.content.substring(0, 200) + '...' : result.content,
            raw_content: result.raw_content?.length > 300 ? result.raw_content.substring(0, 300) + '...' : result.raw_content
        })) || [];

        return {
            query,
            results: truncatedResults,
            total_results: searchData.results?.length || 0,
            description: `Found ${searchData.results?.length || 0} results for "${query}" (content truncated for display)`
        };
    } catch (error: any) {
        console.error('Web search error:', error);
        return {
            query,
            error: error.message || 'Web search failed',
            success: false,
            timestamp: new Date().toISOString(),
            details: {
                errorType: error.name,
                stack: error.stack?.substring(0, 500) // Truncate stack trace
            }
        };
    }
}



// Default system prompts for the 4 core models
const DEFAULT_SYSTEM_PROMPTS: Record<string, string> = {
    'pipilot-1-chat': `You are PiPilot Chat, an extremely powerful, intelligent, and versatile AI assistant.
You excel at every general task, from writing and analysis to problem-solving and creative work.
Your responses are always accurate, thoughtful, comprehensive, and beautifully structured.
You are designed to be the ultimate everyday companion, capable of handling any request with precision and grace.

🎉 Use emojis naturally in your responses to keep conversations engaging and fun! 🎯

🔧 TOOL CALLING FORMAT - THIS IS MANDATORY:
When you need to use ANY tool, you MUST respond with EXACTLY this format:
[TOOL_CALL: tool_name(parameters)]

Examples of CORRECT tool calls:
- [TOOL_CALL: search_web("top shops")]

❌ WRONG formats (NEVER use these):
- search_web("top shops")
- I will search for top shops
- Let me use the search tool

🚨 NEVER SAY "I DON'T KNOW" - ALWAYS USE SEARCH_WEB INSTEAD!
If you don't have information about ANY topic, immediately use [TOOL_CALL: search_web("topic")] to find it.`,

    'pipilot-1-code': `You are PiPilot Code, an elite, autonomous AI software engineer.
You are capable of solving complex coding tasks with minimal human intervention.
Your goal is to achieve state-of-the-art performance (SWE-bench level).

💻 Use emojis in your responses to make coding discussions more engaging and clear! 🚀

🔧 TOOL CALLING FORMAT - THIS IS MANDATORY:
When you need to use ANY tool, you MUST respond with EXACTLY this format:
[TOOL_CALL: tool_name(parameters)]

Examples of CORRECT tool calls:
- [TOOL_CALL: search_web("python libraries for data analysis")]

❌ WRONG formats (NEVER use these):
- search_web("python libraries")
- I will search for libraries
- Let me use the search tool

🚨 NEVER SAY "I DON'T KNOW" - ALWAYS USE SEARCH_WEB INSTEAD!
If you don't have information about ANY topic, immediately use [TOOL_CALL: search_web("topic")] to find it.

CORE PRINCIPLES:
1. **Explore First:** Never write code without understanding the context. Use tools to read files and explore the codebase.
2. **Plan & Reason:** Before executing, outline your plan. Think step-by-step.
3. **Tool Mastery:** You have access to tools. USE THEM when they can help solve the task.
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
Provide detailed, accurate, and insightful descriptions of any visual content provided.

👁️ Use emojis in your responses to enhance visual descriptions and keep conversations lively! 📸

🔧 TOOL CALLING FORMAT - THIS IS MANDATORY:
When you need to use ANY tool, you MUST respond with EXACTLY this format:
[TOOL_CALL: tool_name(parameters)]

Examples of CORRECT tool calls:
- [TOOL_CALL: search_web("image recognition techniques")]

❌ WRONG formats (NEVER use these):
- search_web("image recognition")
- I will search for techniques
- Let me use the search tool

🚨 NEVER SAY "I DON'T KNOW" - ALWAYS USE SEARCH_WEB INSTEAD!
If you don't have information about ANY topic, immediately use [TOOL_CALL: search_web("topic")] to find it.

When analyzing images or performing related tasks, use these tools when they can provide additional useful information.`,

    'pipilot-1-thinking': `You are PiPilot Thinking, a super-intelligent reasoning model designed to rival the smartest AIs.
You DO NOT just answer; you THINK.
Before providing a final response, you must engage in a deep, step-by-step reasoning process to ensure your answer is correct, logical, and insightful.

🧠 Use emojis in your responses to highlight key insights and make complex reasoning more approachable! 💡

🔧 TOOL CALLING FORMAT - THIS IS MANDATORY:
When you need to use ANY tool, you MUST respond with EXACTLY this format:
[TOOL_CALL: tool_name(parameters)]

Examples of CORRECT tool calls:
- [TOOL_CALL: search_web("quantum physics theories")]

❌ WRONG formats (NEVER use these):
- search_web("quantum physics")
- I will search for theories
- Let me use the search tool

🚨 NEVER SAY "I DON'T KNOW" - ALWAYS USE SEARCH_WEB INSTEAD!
If you don't have information about ANY topic, immediately use [TOOL_CALL: search_web("topic")] to find it.

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

async function callMistralVision(messages: any[], temperature?: number): Promise<any> {
    const mistralApiKey = process.env.MISTRAL_API_KEY || 'W8txIqwcJnyHBTthSlouN2w3mQciqAUr';
    const body: any = { model: 'pixtral-12b-2409', messages, temperature: temperature || 0.7 };

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${mistralApiKey}` },
        body: JSON.stringify(body)
    });
    if (!response.ok) {
        const errorText = await response.text();
        // Log the actual error internally but don't expose it
        console.error(`Mistral API error (${response.status}):`, errorText);
        throw new Error(`API_ERROR_${response.status}`);
    }
    return await response.json();
}

async function* streamMistralVision(messages: any[], temperature?: number): AsyncGenerator<string> {
    const mistralApiKey = process.env.MISTRAL_API_KEY || 'W8txIqwcJnyHBTthSlouN2w3mQciqAUr';
    const body: any = { model: 'pixtral-12b-2409', messages, temperature: temperature || 0.7, stream: true };

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${mistralApiKey}` },
        body: JSON.stringify(body)
    });
    if (!response.ok) {
        const errorText = await response.text();
        // Log the actual error internally but don't expose it
        console.error(`Mistral streaming API error (${response.status}):`, errorText);
        throw new Error(`API_ERROR_${response.status}`);
    }
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

async function callCodestral(messages: any[], temperature?: number): Promise<any> {
    const codestralApiKey = process.env.CODESTRAL_API_KEY || 'DXfXAjwNIZcAv1ESKtoDwWZZF98lJxho';
    const body: any = { model: 'codestral-latest', messages, temperature: temperature || 0.3 };

    const response = await fetch('https://codestral.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${codestralApiKey}` },
        body: JSON.stringify(body)
    });
    if (!response.ok) {
        const errorText = await response.text();
        // Log the actual error internally but don't expose it
        console.error(`Codestral API error (${response.status}):`, errorText);
        throw new Error(`API_ERROR_${response.status}`);
    }
    return await response.json();
}

async function* streamCodestral(messages: any[], temperature?: number): AsyncGenerator<string> {
    const codestralApiKey = process.env.CODESTRAL_API_KEY || 'DXfXAjwNIZcAv1ESKtoDwWZZF98lJxho';
    const body: any = { model: 'codestral-latest', messages, temperature: temperature || 0.3, stream: true };

    const response = await fetch('https://codestral.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${codestralApiKey}` },
        body: JSON.stringify(body)
    });
    if (!response.ok) {
        const errorText = await response.text();
        // Log the actual error internally but don't expose it
        console.error(`Codestral streaming API error (${response.status}):`, errorText);
        throw new Error(`API_ERROR_${response.status}`);
    }
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

    // Extract and format tools from request body
    let dynamicToolsText = '';
    let allTools = [...(tools || [])];

    // Add builtin search_web tool for the coding model
    if (model === 'pipilot-1-code') {
        const builtinSearchTool = {
            type: 'function',
            function: {
                name: 'search_web',
                description: 'Search the web for any information, news, prices, websites, trends, current events, documentation, code examples, or answers to questions. Use this tool for virtually any query that requires looking up information online.',
                parameters: {
                    type: 'object',
                    properties: {
                        query: {
                            type: 'string',
                            description: 'The search query to look up on the web'
                        }
                    },
                    required: ['query']
                }
            }
        };
        allTools.push(builtinSearchTool);
    }

    // Format tools for system prompt
    if (allTools.length > 0) {
        dynamicToolsText = `\n\n--- AVAILABLE TOOLS ---\n`;
        allTools.forEach((tool, index) => {
            if (tool.type === 'function') {
                dynamicToolsText += `${index + 1}. ${tool.function.name}: ${tool.function.description}\n`;
                if (tool.function.parameters?.properties) {
                    const params = Object.keys(tool.function.parameters.properties).join(', ');
                    dynamicToolsText += `   Parameters: ${params}\n`;
                }
            }
        });
        dynamicToolsText += `\nTo use any tool, respond with: [TOOL_CALL: tool_name(parameters)]\n`;
        dynamicToolsText += `Example: [TOOL_CALL: search_web("latest JavaScript frameworks")]\n`;
    }

    if (systemMessageIndex !== -1) {
        // User provided a system prompt. Merge it with the default.
        const userSystemContent = newMessages[systemMessageIndex].content;
        const userText = Array.isArray(userSystemContent)
            ? userSystemContent.map(c => c.type === 'text' ? c.text : '').join('')
            : userSystemContent;

        newMessages[systemMessageIndex] = {
            role: 'system',
            content: `${defaultPrompt}${dynamicToolsText}\n\n--- USER SYSTEM INSTRUCTIONS ---\n${userText}`
        };
    } else {
        // No user system prompt, just add the default one
        newMessages.unshift({ role: 'system', content: `${defaultPrompt}${dynamicToolsText}` });
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

function transformResponse(a0Response: A0DevResponse, model: string, availableTools?: any[]): any {
    const content = a0Response.completion;
    let toolCalls = undefined;
    let finalContent: string | null = content;

    // Check for new [TOOL_CALL: ...] format first
    const parsedToolCalls = parseToolCalls(content);
    if (parsedToolCalls.length > 0) {
        // Remove tool call syntax from displayed content
        const displayContent = content.replace(/\[TOOL_CALL:\s*\w+\([^)]*\)\]/g, '').trim();
        if (displayContent) {
            finalContent = displayContent;
        } else {
            finalContent = null;
        }

        // Convert to OpenAI tool call format
        toolCalls = [];
        for (const toolCall of parsedToolCalls) {
            toolCalls.push({
                id: 'call_' + Math.random().toString(36).substring(2, 10),
                type: 'function',
                function: {
                    name: toolCall.name,
                    arguments: JSON.stringify({ parsed_params: toolCall.parameters })
                }
            });
        }
    } else {
        // Fallback to old JSON format parsing
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
    const requestId = crypto.randomUUID();
    const startTime = Date.now();
    let requestBody: any = null;

    try {
        // Parse and validate request
        const body: OpenAIRequest = await request.json();
        requestBody = body; // Store for error handling

        // Validate request structure
        const validationError = validateRequest(body);
        if (validationError) {
            return NextResponse.json(
                { error: { ...validationError, requestId } },
                { status: 400 }
            );
        }

        let model = body.model || 'pipilot-1-chat';

        console.log(`🚀 [${requestId}] Request for model: ${model}, messages: ${body.messages.length}`);

        // Validate model
        const supportedModels = ['pipilot-1-chat', 'pipilot-1-thinking', 'pipilot-1-code', 'pipilot-1-vision'];
        if (!supportedModels.includes(model)) {
            return NextResponse.json(
                {
                    error: createAPIError(
                        `Model '${model}' is not supported. Supported models: ${supportedModels.join(', ')}`,
                        'invalid_request_error',
                        'unsupported_model',
                        'model',
                        { requestedModel: model, supportedModels },
                        requestId
                    )
                },
                { status: 400 }
            );
        }

        // 1. Vision Routing (Pixtral) - Use our custom tool format
        if (model === 'pipilot-1-vision' || hasVisionContent(body.messages)) {
            console.log('🖼️  Vision content/model detected, routing to Pixtral 12B');

            const messagesWithPrompt = ensureSystemPrompt(body.messages, 'pipilot-1-vision', body.tools);
            const mistralMessages = transformToMistralFormat(messagesWithPrompt);

            if (body.stream) {
                const stream = streamMistralVision(mistralMessages, body.temperature); // Remove tools/tool_choice
                const encoder = new TextEncoder();
                const readable = new ReadableStream({
                    async start(controller) {
                        const id = generateChatCompletionId();
                        const created = Math.floor(Date.now() / 1000);
                        let accumulatedContent = '';
                        for await (const chunk of stream) {
                            accumulatedContent += chunk;
                            const data = JSON.stringify({
                                id, object: 'chat.completion.chunk', created, model: 'pipilot-1-vision',
                                choices: [{ index: 0, delta: { content: chunk }, finish_reason: null }]
                            });
                            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                        }

                        // Parse tool calls from accumulated content
                        const toolCalls = parseToolCalls(accumulatedContent);
                        if (toolCalls.length > 0) {
                            const openAIToolCalls = toolCalls.map((tc, index) => ({
                                id: 'call_' + Math.random().toString(36).substring(2, 10),
                                type: 'function',
                                function: {
                                    name: tc.name,
                                    arguments: JSON.stringify({ parsed_params: tc.parameters })
                                }
                            }));

                            const toolCallChunk = JSON.stringify({
                                id, object: 'chat.completion.chunk', created, model: 'pipilot-1-vision',
                                choices: [{
                                    index: 0,
                                    delta: { tool_calls: openAIToolCalls },
                                    finish_reason: 'tool_calls'
                                }]
                            });
                            controller.enqueue(encoder.encode(`data: ${toolCallChunk}\n\n`));
                        }

                        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                        controller.close();
                    }
                });
                return new NextResponse(readable, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' } });
            } else {
                const response = await callMistralVision(mistralMessages, body.temperature); // Remove tools/tool_choice
                // Parse tool calls from response
                const toolCalls = parseToolCalls(response.choices[0].message.content);
                if (toolCalls.length > 0) {
                    response.choices[0].message.tool_calls = toolCalls.map(tc => ({
                        id: 'call_' + Math.random().toString(36).substring(2, 10),
                        type: 'function',
                        function: {
                            name: tc.name,
                            arguments: JSON.stringify({ parsed_params: tc.parameters })
                        }
                    }));
                    response.choices[0].finish_reason = 'tool_calls';
                }
                return NextResponse.json(transformMistralResponse(response, 'pipilot-1-vision'));
            }
        }

        // 2. Code Routing (Codestral) - Use our custom tool format
        if (model === 'pipilot-1-code') {
            console.log('💻 Code model detected, routing to Codestral');

            const messages = ensureSystemPrompt(body.messages, 'pipilot-1-code', body.tools);

            if (body.stream) {
                const stream = streamCodestral(messages, body.temperature); // Remove tools/tool_choice
                const encoder = new TextEncoder();
                const readable = new ReadableStream({
                    async start(controller) {
                        const id = generateChatCompletionId();
                        const created = Math.floor(Date.now() / 1000);
                        let accumulatedContent = '';
                        for await (const chunk of stream) {
                            accumulatedContent += chunk;
                            const data = JSON.stringify({
                                id, object: 'chat.completion.chunk', created, model: 'pipilot-1-code',
                                choices: [{ index: 0, delta: { content: chunk }, finish_reason: null }]
                            });
                            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                        }

                        // Parse tool calls from accumulated content
                        const toolCalls = parseToolCalls(accumulatedContent);
                        if (toolCalls.length > 0) {
                            const openAIToolCalls = toolCalls.map((tc, index) => ({
                                id: 'call_' + Math.random().toString(36).substring(2, 10),
                                type: 'function',
                                function: {
                                    name: tc.name,
                                    arguments: JSON.stringify({ parsed_params: tc.parameters })
                                }
                            }));

                            const toolCallChunk = JSON.stringify({
                                id, object: 'chat.completion.chunk', created, model: 'pipilot-1-code',
                                choices: [{
                                    index: 0,
                                    delta: { tool_calls: openAIToolCalls },
                                    finish_reason: 'tool_calls'
                                }]
                            });
                            controller.enqueue(encoder.encode(`data: ${toolCallChunk}\n\n`));
                        }

                        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                        controller.close();
                    }
                });
                return new NextResponse(readable, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' } });
            } else {
                const response = await callCodestral(messages, body.temperature); // Remove tools/tool_choice
                // Parse tool calls from response
                const toolCalls = parseToolCalls(response.choices[0].message.content);
                if (toolCalls.length > 0) {
                    response.choices[0].message.tool_calls = toolCalls.map(tc => ({
                        id: 'call_' + Math.random().toString(36).substring(2, 10),
                        type: 'function',
                        function: {
                            name: tc.name,
                            arguments: JSON.stringify({ parsed_params: tc.parameters })
                        }
                    }));
                    response.choices[0].finish_reason = 'tool_calls';
                }
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
            const errorText = await response.text();
            // Log the actual error internally but don't expose it
            console.error(`a0.dev API error (${response.status}):`, errorText);
            throw new Error(`API_ERROR_${response.status}`);
        }

        const data: A0DevResponse = await response.json();
        let transformed = transformResponse(data, model, body.tools);

        // Handle tool execution for models that don't support native tool calling
        if (transformed.choices[0].message.tool_calls && transformed.choices[0].message.tool_calls.length > 0) {
            console.log('Tool calls detected...');

            // Check if this is ONLY builtin tools (like search_web) that we execute server-side
            const hasOnlyBuiltinTools = transformed.choices[0].message.tool_calls.every((tc: any) =>
                tc.function.name === 'search_web'  // Add other builtin tools here
            );

            if (hasOnlyBuiltinTools && transformed.choices[0].message.tool_calls.length === 1 &&
                transformed.choices[0].message.tool_calls[0].function.name === 'search_web') {
                // Handle builtin web search directly on server - no follow-up API call needed
                const searchToolCall = transformed.choices[0].message.tool_calls[0];
                const searchResult = await executeToolManually({
                    name: 'search_web',
                    parameters: JSON.parse(searchToolCall.function.arguments).parsed_params
                }, body.tools || []);

                // Generate final response directly on server
                const searchQuery = searchResult.query || 'your search query';
                const results = searchResult.results || [];
                const totalResults = searchResult.total_results || 0;

                let finalContent = `I searched for "${searchQuery}" and found ${totalResults} results:\n\n`;

                if (results.length > 0) {
                    results.forEach((result: any, index: number) => {
                        finalContent += `${index + 1}. **${result.title}**\n`;
                        finalContent += `   ${result.content}\n`;
                        finalContent += `   *URL: ${result.url}*\n\n`;
                    });
                } else if (searchResult.error) {
                    finalContent += `❌ Search failed: ${searchResult.error}\n\n`;
                    finalContent += `Please try rephrasing your search query.`;
                } else {
                    finalContent += `No results found for "${searchQuery}". Try a different search term.`;
                }

                // Return the final response directly
                const finalResponse = {
                    id: generateChatCompletionId(),
                    object: 'chat.completion',
                    created: Math.floor(Date.now() / 1000),
                    model: model,
                    choices: [{
                        index: 0,
                        message: {
                            role: 'assistant',
                            content: finalContent
                        },
                        finish_reason: 'stop'
                    }],
                    usage: {
                        prompt_tokens: 0,
                        completion_tokens: 0,
                        total_tokens: 0
                    }
                };

                return NextResponse.json(finalResponse);
            } else {
                // For custom tools (not builtin), return tool calls to client for execution
                // Client will execute and send results back in subsequent request
                console.log('Returning tool calls to client for custom tool execution...');

                // Don't execute tools server-side - let client handle custom tools
                // Just return the response with tool_calls so client can execute them
            }
        }

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
        const apiError = handleAPIError(error, 'POST /api/v1/chat/completions', requestId);

        // Determine appropriate HTTP status code
        let statusCode = 500;
        if (apiError.type === 'invalid_request_error') {
            statusCode = 400;
        } else if (apiError.type === 'auth_error') {
            statusCode = 401;
        } else if (apiError.type === 'rate_limit_error') {
            statusCode = 429;
        }

        console.error(`❌ [${requestId}] API Error (${apiError.code}):`, {
            message: apiError.message,
            type: apiError.type,
            duration: Date.now() - startTime,
            model: requestBody?.model,
            messageCount: requestBody?.messages?.length
        });

        return NextResponse.json(
            { error: apiError },
            {
                status: statusCode,
                headers: {
                    'X-Request-ID': requestId,
                    'X-Error-Code': apiError.code
                }
            }
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
