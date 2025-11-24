const fetch = require('node-fetch').default || require('node-fetch');

class PiPilotAI {
    constructor(options = {}) {
        this.apiUrl = options.apiUrl || 'https://pipilot.dev/api/v1';
        this.maxRetries = options.maxRetries || 3;
        this.retryDelay = options.retryDelay || 1000;
        this.timeout = options.timeout || 60000; // 60 seconds
    }

    /**
     * Create a chat completion
     * @param {Object} options - Completion options
     * @param {string} options.model - Model to use (pipilot-1-chat, pipilot-1-thinking, pipilot-1-code, pipilot-1-vision)
     * @param {Array} options.messages - Array of message objects
     * @param {number} options.temperature - Sampling temperature (0.0 to 1.0)
     * @param {Array} options.tools - Array of tool definitions
     * @param {boolean} options.stream - Whether to stream the response
     * @param {Function} options.onChunk - Callback for streaming chunks
     * @returns {Promise<Object>} Completion response
     */
    async createChatCompletion({
        model,
        messages,
        temperature = 0.7,
        tools = [],
        stream = false,
        onChunk
    }) {
        const requestBody = {
            model,
            messages,
            temperature,
            ...(tools.length > 0 && { tools })
        };

        const url = `${this.apiUrl}/chat/completions`;

        if (stream) {
            return this._streamCompletion(url, requestBody, onChunk);
        } else {
            return this._makeRequest(url, requestBody);
        }
    }

    /**
     * Chat with pipilot-1-chat model
     * @param {string|Array} messages - Message string or array of message objects
     * @param {Object} options - Additional options
     */
    async chat(messages, options = {}) {
        const messageArray = this._normalizeMessages(messages);
        return this.createChatCompletion({
            model: 'pipilot-1-chat',
            messages: messageArray,
            ...options
        });
    }

    /**
     * Use thinking model for complex reasoning
     * @param {string|Array} messages - Message string or array of message objects
     * @param {Object} options - Additional options
     */
    async think(messages, options = {}) {
        const messageArray = this._normalizeMessages(messages);
        return this.createChatCompletion({
            model: 'pipilot-1-thinking',
            messages: messageArray,
            ...options
        });
    }

    /**
     * Use code model for programming tasks
     * @param {string|Array} messages - Message string or array of message objects
     * @param {Object} options - Additional options
     */
    async code(messages, options = {}) {
        const messageArray = this._normalizeMessages(messages);
        return this.createChatCompletion({
            model: 'pipilot-1-code',
            messages: messageArray,
            ...options
        });
    }

    /**
     * Use vision model for image analysis
     * @param {string|Array} messages - Message string or array of message objects
     * @param {Object} options - Additional options
     */
    async vision(messages, options = {}) {
        const messageArray = this._normalizeMessages(messages);
        return this.createChatCompletion({
            model: 'pipilot-1-vision',
            messages: messageArray,
            ...options
        });
    }

    /**
     * Execute tool calls from a completion response
     * @param {Array} toolCalls - Tool calls from completion response
     * @param {Object} toolHandlers - Object mapping tool names to handler functions
     * @returns {Array} Tool results
     */
    async executeTools(toolCalls, toolHandlers) {
        const results = [];

        for (const toolCall of toolCalls) {
            const { name, arguments: args } = toolCall.function;
            const handler = toolHandlers[name];

            if (!handler) {
                results.push({
                    tool_call_id: toolCall.id,
                    error: `No handler found for tool: ${name}`
                });
                continue;
            }

            try {
                let parsedArgs;
                try {
                    // Handle both string and object formats
                    if (typeof args === 'string') {
                        parsedArgs = JSON.parse(args);
                    } else {
                        parsedArgs = args;
                    }

                    // Handle the specific format from PiPilot API
                    if (parsedArgs.parsed_params) {
                        // parsed_params is already a string containing the actual parameters
                        // Try to parse it as JSON, or use as-is if it's not JSON
                        try {
                            parsedArgs = JSON.parse(parsedArgs.parsed_params);
                        } catch (e) {
                            // If it's not JSON, treat it as a raw value
                            parsedArgs = { expression: parsedArgs.parsed_params };
                        }
                    }
                } catch (e) {
                    // If parsing fails, try to use as-is
                    parsedArgs = args;
                }

                const result = await handler(parsedArgs);
                results.push({
                    tool_call_id: toolCall.id,
                    output: result
                });
            } catch (error) {
                results.push({
                    tool_call_id: toolCall.id,
                    error: error.message
                });
            }
        }

        return results;
    }

    // Private methods
    _normalizeMessages(messages) {
        if (typeof messages === 'string') {
            return [{ role: 'user', content: messages }];
        }
        return messages;
    }

    async _makeRequest(url, body) {
        let lastError;

        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.timeout);

                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(body),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                return await response.json();

            } catch (error) {
                lastError = error;

                if (attempt < this.maxRetries && !error.name?.includes('AbortError')) {
                    await this._delay(this.retryDelay * attempt);
                    continue;
                }

                break;
            }
        }

        throw lastError;
    }

    async _streamCompletion(url, body, onChunk) {
        const response = await fetch(url + '?stream=true', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        try {
            while (true) {
                const { done, value } = await reader.read();

                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);

                        if (data === '[DONE]') continue;

                        try {
                            const parsed = JSON.parse(data);
                            if (onChunk) {
                                onChunk(parsed);
                            }
                        } catch (e) {
                            // Ignore parse errors for now
                        }
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }

        return { done: true };
    }

    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export for CommonJS
module.exports = PiPilotAI;

// Also export as default for ESM compatibility
module.exports.default = PiPilotAI;