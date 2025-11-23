# OpenAI-Compatible API for a0.dev

This API provides an OpenAI-compatible interface for the a0.dev LLM API, allowing you to use any OpenAI client library with the a0.dev backend.

## Endpoint

```
POST /api/v1/chat/completions
```

## Features

- ✅ OpenAI Chat Completions API format
- ✅ Streaming and non-streaming support
- ✅ Compatible with OpenAI client libraries
- ✅ Automatic request/response transformation
- ✅ Fallback to non-streaming if streaming fails

## Request Format

The API accepts the same request format as OpenAI's Chat Completions API:

```json
{
  "model": "gpt-3.5-turbo",
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful assistant."
    },
    {
      "role": "user",
      "content": "Hello, how are you?"
    }
  ],
  "temperature": 0.7,
  "stream": false
}
```

### Supported Parameters

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `messages` | array | Array of message objects (required) | - |
| `model` | string | Model identifier (ignored, uses a0.dev) | `"a0-llm"` |
| `temperature` | number | Sampling temperature (0-2) | - |
| `stream` | boolean | Enable streaming responses | `false` |

> **Note**: The `model` parameter is accepted for compatibility but ignored. All requests use the a0.dev LLM backend.

## Response Format

### Non-Streaming Response

```json
{
  "id": "chatcmpl-1732374696000-abc123",
  "object": "chat.completion",
  "created": 1732374696,
  "model": "a0-llm",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! I'm doing well, thank you for asking. How can I help you today?"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 0,
    "completion_tokens": 0,
    "total_tokens": 0
  }
}
```

### Streaming Response

When `stream: true`, the API returns Server-Sent Events (SSE):

```
data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1732374696,"model":"a0-llm","choices":[{"index":0,"delta":{"content":"Hello"},"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1732374696,"model":"a0-llm","choices":[{"index":0,"delta":{"content":"!"},"finish_reason":null}]}

```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: 'not-needed', // a0.dev doesn't require API key
  baseURL: 'http://localhost:3000/api/v1',
});

// Non-streaming
const completion = await openai.chat.completions.create({
  model: 'gpt-3.5-turbo',
  messages: [
    { role: 'user', content: 'Hello!' }
  ],
});

console.log(completion.choices[0].message.content);

// Streaming
const stream = await openai.chat.completions.create({
  model: 'gpt-3.5-turbo',
  messages: [
    { role: 'user', content: 'Tell me a story' }
  ],
  stream: true,
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '');
}
```

### JavaScript (Fetch API)

```javascript
// Non-streaming
const response = await fetch('http://localhost:3000/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'user', content: 'Hello!' }
    ],
  }),
});

const data = await response.json();
console.log(data.choices[0].message.content);

// Streaming
const streamResponse = await fetch('http://localhost:3000/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'user', content: 'Count to 5' }
    ],
    stream: true,
  }),
});

const reader = streamResponse.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  const lines = chunk.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = line.slice(6);
      if (data === '[DONE]') break;
      
    messages=[
        {"role": "user", "content": "Tell me a story"}
    ],
    stream=True
)

for chunk in stream:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="")
```

## Error Handling

The API returns errors in OpenAI-compatible format:

```json
{
  "error": {
    "message": "Invalid request: messages array is required",
    "type": "invalid_request_error",
    "param": "messages",
    "code": "invalid_request"
  }
}
```

### Common Error Codes

- `400` - Invalid request (missing or malformed parameters)
- `500` - Internal server error (a0.dev API error or network issue)

## Limitations

1. **Token Usage**: The `usage` field always returns zeros because a0.dev doesn't provide token counts
2. **Model Parameter**: Ignored - all requests use the a0.dev LLM backend
3. **Advanced Parameters**: Parameters like `top_p`, `frequency_penalty`, `presence_penalty`, and `n` are accepted but not passed to a0.dev
4. **Streaming Fallback**: If streaming fails, the API automatically falls back to non-streaming mode

## Differences from OpenAI API

| Feature | OpenAI | This API |
|---------|--------|----------|
| Authentication | Required | Not required |
| Model selection | Multiple models | Single a0.dev backend |
| Token counting | Accurate | Always returns 0 |
| Function calling | Supported | Not supported |
| Vision | Supported | Not supported |
| Fine-tuning | Supported | Not supported |

## Production Deployment

When deploying to production:

1. **Base URL**: Update the base URL in client code to your production domain
2. **Rate Limiting**: Consider adding rate limiting to prevent abuse
3. **Authentication**: Add authentication if needed (API keys, OAuth, etc.)
4. **Monitoring**: Monitor API usage and errors
5. **CORS**: Configure CORS headers if calling from browser clients

## Testing

Test the endpoint with the provided examples or use tools like:

- [Postman](https://www.postman.com/)
- [Insomnia](https://insomnia.rest/)
- [HTTPie](https://httpie.io/)

## Support

For issues or questions:
- Check the [a0.dev API documentation](../a0llmdoc.md)
- Review the [implementation code](file:///c:/Users/DELL/Downloads/ai-app-builder/app/api/v1/chat/completions/route.ts)
