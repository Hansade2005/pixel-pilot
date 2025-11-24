# PiPilot AI SDK

A JavaScript/TypeScript SDK for the PiPilot AI Chat API with support for multiple models, tool calling, and streaming responses.

## Installation

```bash
npm install pipilot-ai-sdk
```

## Quick Start

### Basic Chat

```javascript
const PiPilotAI = require('pipilot-ai-sdk');

const ai = new PiPilotAI();

// Simple chat
const response = await ai.chat('Hello, how are you?');
console.log(response.choices[0].message.content);
```

### TypeScript Support

```typescript
import PiPilotAI, { Message, Tool } from 'pipilot-ai-sdk';

const ai = new PiPilotAI();

// Fully typed chat
const messages: Message[] = [
  { role: 'user', content: 'What is the capital of France?' }
];

const response = await ai.createChatCompletion({
  model: 'pipilot-1-chat',
  messages,
  temperature: 0.7
});

console.log(response.choices[0].message.content);
```

## Available Models

- **`pipilot-1-chat`**: General purpose conversational AI
- **`pipilot-1-thinking`**: Advanced reasoning and analysis
- **`pipilot-1-code`**: Programming and development assistance
- **`pipilot-1-vision`**: Image analysis and understanding

## Model-Specific Methods

### Chat Model
```javascript
const response = await ai.chat('Tell me about artificial intelligence');
```

### Thinking Model
```javascript
const response = await ai.think('Analyze the pros and cons of renewable energy');
```

### Code Model
```javascript
const response = await ai.code('Write a function to reverse a string in JavaScript');
```

### Vision Model
```javascript
const messages = [
  { role: 'user', content: 'Describe this image' },
  { role: 'user', content: [{ type: 'image_url', image_url: { url: 'https://example.com/image.jpg' } }] }
];

const response = await ai.vision(messages);
```

## Tool Calling

The SDK supports tool calling for extending AI capabilities:

```javascript
const tools = [
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description: 'Get current weather for a location',
      parameters: {
        type: 'object',
        properties: {
          location: { type: 'string', description: 'City name' }
        },
        required: ['location']
      }
    }
  }
];

const response = await ai.chat('What is the weather like in New York?', { tools });

// Execute tool calls
if (response.choices[0].message.tool_calls) {
  const toolHandlers = {
    get_weather: async (args) => {
      // Your weather API logic here
      return { temperature: 72, condition: 'sunny' };
    }
  };

  const results = await ai.executeTools(
    response.choices[0].message.tool_calls,
    toolHandlers
  );

  console.log('Tool results:', results);
}
```

## Streaming Responses

```javascript
const response = await ai.chat('Tell me a long story', {
  stream: true,
  onChunk: (chunk) => {
    if (chunk.choices[0].delta.content) {
      process.stdout.write(chunk.choices[0].delta.content);
    }
  }
});
```

## Advanced Configuration

```javascript
const ai = new PiPilotAI({
  apiUrl: 'https://custom-api-url.com/api/v1', // Custom API endpoint
  maxRetries: 5,        // Retry failed requests
  retryDelay: 2000,     // Delay between retries (ms)
  timeout: 120000       // Request timeout (ms)
});
```

## Error Handling

```javascript
try {
  const response = await ai.chat('Hello!');
  console.log(response.choices[0].message.content);
} catch (error) {
  console.error('AI request failed:', error.message);
}
```

## Built-in Tools

The API includes several built-in tools that are handled server-side:

- **`search_web`**: Web search functionality
- Custom tools can be defined and executed client-side

## Examples

### Complete Chat with Tool Calling

```javascript
const ai = new PiPilotAI();

// Define custom tools
const tools = [
  {
    type: 'function',
    function: {
      name: 'calculate',
      description: 'Perform mathematical calculations',
      parameters: {
        type: 'object',
        properties: {
          expression: { type: 'string', description: 'Math expression' }
        },
        required: ['expression']
      }
    }
  }
];

// Chat with tools
const response = await ai.chat('Calculate 25 * 15 + 7', { tools });

// Handle tool calls
if (response.choices[0].message.tool_calls) {
  const results = await ai.executeTools(
    response.choices[0].message.tool_calls,
    {
      calculate: async ({ expression }) => {
        // Simple calculator (replace with your logic)
        return eval(expression);
      }
    }
  );

  console.log('Calculation result:', results[0].output);
}
```

### Streaming with Multiple Models

```javascript
// Thinking model with streaming
await ai.think('Explain quantum computing', {
  stream: true,
  onChunk: (chunk) => {
    if (chunk.choices[0].delta.content) {
      process.stdout.write(chunk.choices[0].delta.content);
    }
  }
});

// Code model for development
const codeResponse = await ai.code('Create a React component for a todo list');
console.log(codeResponse.choices[0].message.content);
```

## API Reference

### Constructor Options

- `apiUrl`: Custom API base URL (default: 'https://pipilot.dev/api/v1')
- `maxRetries`: Maximum retry attempts (default: 3)
- `retryDelay`: Base delay between retries in ms (default: 1000)
- `timeout`: Request timeout in ms (default: 60000)

### Methods

- `createChatCompletion(options)`: Raw completion API
- `chat(messages, options)`: Chat with pipilot-1-chat model
- `think(messages, options)`: Chat with pipilot-1-thinking model
- `code(messages, options)`: Chat with pipilot-1-code model
- `vision(messages, options)`: Chat with pipilot-1-vision model
- `executeTools(toolCalls, handlers)`: Execute tool calls with handlers

## License

ISC