# 🚀 a0.dev LLM API Usage Guide

This comprehensive guide teaches you how to use the a0.dev Large Language Model (LLM) API effectively, including how to send messages, handle responses, and implement streaming for real-time interactions.

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [API Overview](#api-overview)
- [Authentication](#authentication)
- [Message Format](#message-format)
- [Making API Calls](#making-api-calls)
- [Response Structure](#response-structure)
- [Streaming vs Non-Streaming](#streaming-vs-non-streaming)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)
- [Complete Examples](#complete-examples)
- [Troubleshooting](#troubleshooting)

## 🚀 Quick Start

```javascript
// Basic non-streaming call
const messages = [
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'Hello, how are you?' }
];

const response = await fetch('https://api.a0.dev/ai/llm', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ messages })
});

const result = await response.json();
console.log(result.completion); // "Hello! I'm doing well, thank you for asking..."
```

## 📖 API Overview

The a0.dev LLM API provides access to powerful language models through a simple REST interface. Key features:

- **Endpoint**: `POST https://api.a0.dev/ai/llm`
- **Content-Type**: `application/json`
- **No Authentication Required** (for most setups)
- **Supports Streaming** for real-time responses
- **Chat-style conversations** using role-based messages

## 🔐 Authentication

Unlike many APIs, the a0.dev LLM API typically doesn't require authentication headers. Simply include the `Content-Type: application/json` header:

```javascript
const headers = {
  'Content-Type': 'application/json'
  // No Authorization header needed!
};
```



## 💬 Message Format

Messages use a chat-style format with three roles:

```javascript
interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
```

### Message Roles

- **`system`**: Sets the AI's behavior and personality
- **`user`**: Represents human input/questions
- **`assistant`**: Contains previous AI responses (for conversation continuity)

### Example Messages Array

```javascript
const messages = [
  {
    role: 'system',
    content: 'You are a friendly coding assistant who explains concepts clearly.'
  },
  {
    role: 'user',
    content: 'How do I create a React component?'
  },
  {
    role: 'assistant',
    content: 'To create a React component, you can use either a function or class component...'
  },
  {
    role: 'user',
    content: 'Can you show me an example?'
  }
];
```

## 📤 Making API Calls

### Basic Request Structure

```javascript
const requestBody = {
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Explain JavaScript closures.' }
  ],
  temperature: 0.7,     // Optional: Controls randomness (0.0-1.0)
  max_tokens: 1000      // Optional: Maximum response length
};
```

### Complete API Call

```javascript
async function callLLM(messages, options = {}) {
  const { temperature = 0.7, maxTokens } = options;

  const body = {
    messages,
    temperature,
    ...(maxTokens && { max_tokens: maxTokens })
  };

  const response = await fetch('https://api.a0.dev/ai/llm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`API call failed: ${response.status}`);
  }

  return await response.json();
}
```

## 📥 Response Structure

**All responses are wrapped in JSON with the completion in a `completion` field:**

```json
{
  "completion": "The actual AI response text goes here..."
}
```

### Response Format Details

```javascript
// Example API response
{
  "completion": "JavaScript closures are functions that have access to variables from their outer scope..."
}

// Sometimes you might see:
{
  "message": "Alternative response format..."
}

// Handle both formats safely:
const response = await callLLM(messages);
const completion = response.completion ?? response.message ?? '';
```

### Extracting the Completion

```javascript
// Always use safe extraction
const json = await response.json();
const completion = json.completion ?? json.message ?? 'No response';

// Or for more robust handling:
function extractCompletion(response) {
  if (typeof response === 'string') return response;
  if (response.completion) return response.completion;
  if (response.message) return response.message;
  return JSON.stringify(response); // Fallback
}
```

## 🌊 Streaming vs Non-Streaming

### Non-Streaming (Default)

```javascript
// Simple, returns full response at once
const response = await fetch('https://api.a0.dev/ai/llm', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ messages })
});

const result = await response.json();
console.log(result.completion);
```

### Streaming (Real-time)

```javascript
// Process response as it arrives
const response = await fetch('https://api.a0.dev/ai/llm', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ messages })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value, { stream: true });

  // Parse JSON and extract completion
  try {
    const chunkData = JSON.parse(chunk);
    const token = chunkData.completion ?? chunkData.message ?? chunk;

    // Process token (display, speak, etc.)
    processToken(token);
  } catch (error) {
    // Handle parsing errors
    console.warn('Failed to parse chunk:', chunk);
  }
}
```

## 🚨 Error Handling

### Network and API Errors

```javascript
async function safeLLMCall(messages) {
  try {
    const response = await fetch('https://api.a0.dev/ai/llm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    return extractCompletion(result);

  } catch (error) {
    console.error('LLM call failed:', error);

    // Fallback behavior
    if (error.name === 'TypeError') {
      throw new Error('Network error - check your connection');
    }

    throw error;
  }
}
```

### Streaming Error Handling

```javascript
async function streamingLLMCall(messages, onToken, onError) {
  try {
    const response = await fetch('https://api.a0.dev/ai/llm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    if (!response.body) {
      throw new Error('No response body for streaming');
    }

    // Streaming logic here...

  } catch (error) {
    console.error('Streaming failed:', error);

    // Fallback to non-streaming
    try {
      return await safeLLMCall(messages);
    } catch (fallbackError) {
      onError?.(fallbackError);
      throw fallbackError;
    }
  }
}
```

## ✨ Best Practices

### 1. Message Management

```javascript
// Keep conversations focused
const messages = [
  { role: 'system', content: 'You are a React expert.' },
  // Only include recent relevant messages
  // Limit to last 10-20 messages for performance
];

// Add user input
messages.push({ role: 'user', content: userInput });
```

### 2. Temperature Settings

```javascript
const configs = {
  creative: { temperature: 0.9 },    // Brainstorming, stories
  balanced: { temperature: 0.7 },    // General chat
  precise: { temperature: 0.3 },     // Code, facts, instructions
  strict: { temperature: 0.1 }       // Math, analysis
};
```

### 3. Token Limits

```javascript
// Control response length
const response = await callLLM(messages, {
  maxTokens: 500,  // Shorter responses
  temperature: 0.7
});
```

### 4. Error Recovery

```javascript
async function robustLLMCall(messages, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await callLLM(messages);
    } catch (error) {
      if (attempt === retries) throw error;

      // Exponential backoff
      await new Promise(resolve =>
        setTimeout(resolve, Math.pow(2, attempt) * 1000)
      );
    }
  }
}
```

## 📚 Complete Examples

### Chatbot with Conversation History

```javascript
class Chatbot {
  constructor(systemPrompt = 'You are a helpful assistant.') {
    this.messages = [{ role: 'system', content: systemPrompt }];
  }

  async sendMessage(userInput) {
    // Add user message
    this.messages.push({ role: 'user', content: userInput });

    try {
      const response = await callLLM(this.messages);
      const completion = extractCompletion(response);

      // Add AI response to history
      this.messages.push({ role: 'assistant', content: completion });

      return completion;
    } catch (error) {
      throw new Error(`Chat failed: ${error.message}`);
    }
  }

  clearHistory() {
    // Keep only system message
    this.messages = [this.messages[0]];
  }
}
```

### Streaming Chat Interface

```javascript
function createStreamingChat(onToken, onComplete) {
  let fullResponse = '';

  return async function sendMessage(messages) {
    fullResponse = '';

    const response = await fetch('https://api.a0.dev/ai/llm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });

      try {
        const chunkData = JSON.parse(chunk);
        const token = chunkData.completion ?? chunkData.message ?? chunk;

        fullResponse += token;
        onToken(token);
      } catch (error) {
        console.warn('Parse error:', error);
      }
    }

    onComplete(fullResponse);
    return fullResponse;
  };
}
```

### React Hook for LLM Calls

```javascript
import { useState, useCallback } from 'react';

function useLLM() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const call = useCallback(async (messages, options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('https://api.a0.dev/ai/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          temperature: options.temperature ?? 0.7,
          ...(options.maxTokens && { max_tokens: options.maxTokens })
        })
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
      }

      const result = await response.json();
      return extractCompletion(result);

    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { call, loading, error };
}
```

## 🔧 Troubleshooting

### Common Issues

**1. "Failed to fetch" errors**
```javascript
// Check network connectivity
// Verify the API endpoint URL
// Try with a simple curl command first
curl -X POST https://api.a0.dev/ai/llm \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello"}]}'
```

**2. Empty responses**
```javascript
// Check message format
// Ensure messages array is not empty
// Verify role values are valid
console.log('Messages:', JSON.stringify(messages, null, 2));
```

**3. Streaming not working**
```javascript
// Check if your environment supports fetch streams
// Some Node.js versions or React Native environments don't support streaming
// Implement fallback to non-streaming

const supportsStreaming = typeof Response !== 'undefined' &&
  typeof ReadableStream !== 'undefined';

if (!supportsStreaming) {
  console.log('Streaming not supported, using non-streaming fallback');
}
```

**4. JSON parsing errors**
```javascript
// Log raw response first
const text = await response.text();
console.log('Raw response:', text);

try {
  const json = JSON.parse(text);
  // Process json...
} catch (error) {
  console.error('Invalid JSON:', error);
}
```

### Debug Helper

```javascript
async function debugLLMCall(messages) {
  console.log('📤 Sending messages:', messages);

  try {
    const response = await fetch('https://api.a0.dev/ai/llm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages })
    });

    console.log('📥 Response status:', response.status);
    console.log('📥 Response headers:', Object.fromEntries(response.headers));

    const text = await response.text();
    console.log('📥 Raw response:', text);

    if (response.ok) {
      const json = JSON.parse(text);
      console.log('📥 Parsed response:', json);
      return json;
    } else {
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}
```

## 🎯 Key Takeaways

1. **Response Structure**: Always expect `{"completion": "..."}` format
2. **Safe Extraction**: Use `response.completion ?? response.message ?? fallback`
3. **Streaming**: Parse each chunk as JSON and extract completion field
4. **Error Handling**: Implement fallbacks and retry logic
5. **Message Format**: Use proper role-based message structure
6. **Limits**: Keep conversations focused and within token limits

## 📞 Support

If you encounter issues:


1. Verify your message format with the debug helper above
2. Test with simple examples first
3. Check network connectivity and CORS policies

---

**Happy coding! 🎉** Remember: The a0.dev LLM API is designed to be simple and reliable. Start with basic calls and gradually add streaming and advanced features as needed.