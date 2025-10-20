# a0 LLM API — Handbook

This document is a concise handbook for using the a0 LLM API (no API key required). It explains how to call the LLM endpoint, request structured output with JSON Schemas, and a recommended, safe pattern for integrating and "passing tools" to the LLM (tool invocation pattern). Examples are provided in cURL, JavaScript/TypeScript (Node & browser-friendly fetch), and a short guide for image generation.

> Quick note: The a0 LLM returns both free-text completions and, optionally, structured results when you provide a JSON Schema. The API will NOT automatically run external tools for you — the client is responsible for executing tools and feeding their results back to the LLM.

Table of contents
- Overview
- Endpoints
- Quickstart (cURL + JS/TS)
- Structured output (JSON Schema)
- Tool invocation pattern (recommended)
  - Example: image generation tool flow (full code)
- Image generation endpoint
- Best practices
- Security & deployment notes
- Troubleshooting & FAQ


## Overview

The a0 LLM API provides a simple interface to send conversational messages and receive responses. It accepts a messages array (system/user/assistant), and optionally a JSON Schema you can provide to request structured responses.

Key characteristics:
- No API key required to call the endpoint
- Supports structured output via JSON Schema (you get back `schema_data` in the response)
- Client executes any external tools (the API can return instructions to call tools but will not run them for you)


## Endpoints

1) LLM
- POST https://api.a0.dev/ai/llm
- Body: { messages: Message[], schema?: JSONSchema }
- Response: { completion: string, schema_data?: any, is_structured: boolean }

Message shape (informal):
- { role: 'system' | 'user' | 'assistant', content: string }

2) Image generation (example tool)
- GET https://api.a0.dev/assets/image?text=...&aspect=...&seed=...
- Required param: text
- Optional: aspect (e.g., 1:1, 16:9), seed
- Returns image binary (fetch as blob or arraybuffer)


## Quickstart

cURL example (LLM):

curl -X POST https://api.a0.dev/ai/llm \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role":"system","content":"You are a helpful assistant."},{"role":"user","content":"Summarize the benefits of meditation in one sentence."}] }'

Node / TypeScript (fetch) helper

```ts
// llmClient.ts — minimal helper
export async function callA0LLM(messages: Array<{role:string, content:string}>, schema?: any) {
  const res = await fetch('https://api.a0.dev/ai/llm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, schema }),
  });
  if (!res.ok) throw new Error(`LLM request failed: ${res.status}`);
  return res.json();
}
```

Usage

```ts
const messages = [
  { role: 'system', content: 'You are a friendly assistant.' },
  { role: 'user', content: 'Write a short haiku about autumn.' }
];
const result = await callA0LLM(messages);
console.log(result.completion);
```


## Structured output (JSON Schema)

Providing a JSON Schema encourages the LLM to return structured JSON you can parse programmatically. The endpoint returns `schema_data` when a schema is used, and also `is_structured: true`.

Example schema (ask the model to return either a text answer or a tool call request):

```json
{
  "type": "object",
  "properties": {
    "action": { "type": "string", "enum": ["answer", "call_tool"] },
    "answer": { "type": "string" },
    "tool": { "type": "string" },
    "tool_args": { "type": "object" }
  },
  "required": ["action"],
  "additionalProperties": false
}
```

When you pass a schema like above, check the response for `schema_data` (already parsed) or `is_structured`. `schema_data` will contain the structured object that matches your schema.


## Tool invocation pattern (recommended)

Important: The API will not automatically run external tools. Instead, use this pattern:

1) Client sends conversation and optional schema that permits the model to indicate a `call_tool` action.
2) LLM responds. If it requests `action: call_tool` (in `schema_data` or in a parseable JSON completion), read `tool` and `tool_args`.
3) Client executes the tool (e.g., call image endpoint, database query, run local code).
4) Client appends a new message to the conversation describing the tool result and re-calls the LLM to continue the conversation.

This pattern keeps execution explicit and auditable.

Flow diagram (linear steps):
- client -> LLM (messages + schema)
- LLM -> client (structured response: call_tool)
- client executes tool -> obtains tool_result
- client -> LLM (messages + tool_result) -> final response


### Example: Image-generation tool flow (full code)

This example demonstrates the complete cycle where the LLM requests an image generation, and the client executes the image tool and returns the result.

```ts
// 1) helper: call LLM
async function callA0LLM(messages, schema) {
  const r = await fetch('https://api.a0.dev/ai/llm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, schema }),
  });
  if (!r.ok) throw new Error('LLM call failed ' + r.status);
  return r.json();
}

// 2) helper: call image tool
async function callImageTool(prompt, aspect='1:1', seed) {
  const url = new URL('https://api.a0.dev/assets/image');
  url.searchParams.set('text', prompt);
  if (aspect) url.searchParams.set('aspect', aspect);
  if (seed) url.searchParams.set('seed', String(seed));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Image generation failed ' + res.status);
  const blob = await res.blob();
  // Convert blob to base64 data URL for easy embedding or upload storage
  const arrayBuffer = await blob.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  // You can store this in your database or return an upload URL
  return `data:${blob.type};base64,${base64}`;
}

// 3) flow implementation
async function runImageFlow() {
  const messages = [
    { role: 'system', content: 'You are an assistant able to request images be generated.' },
    { role: 'user', content: 'Create a concept for a modern, minimalist logo for a coffee shop called "Brew Haven".' }
  ];

  const schema = {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['answer', 'call_tool'] },
      answer: { type: 'string' },
      tool: { type: 'string' },
      tool_args: { type: 'object' }
    },
    required: ['action'],
    additionalProperties: false
  };

  // 1) ask LLM
  const llmResp = await callA0LLM(messages, schema);
  // 2) check structured decision
  const structured = llmResp.schema_data || null;
  if (structured && structured.action === 'call_tool' && structured.tool === 'image') {
    const prompt = structured.tool_args?.prompt || 'An elegant minimal coffee shop logo';
    const aspect = structured.tool_args?.aspect || '1:1';

    // 3) run the tool
    const imageDataUrl = await callImageTool(prompt, aspect);

    // 4) append result and continue conversation
    messages.push({ role: 'assistant', content: `I requested an image with prompt: ${prompt}` });
    messages.push({ role: 'system', content: `TOOL_RESULT: image_data_url=${imageDataUrl}` });

    // 5) final LLM call to produce user-visible text
    const final = await callA0LLM(messages);
    return { finalText: final.completion, imageDataUrl };
  }

  // If LLM returned a regular answer:
  return { finalText: llmResp.completion };
}
```

Notes about the example:
- The LLM returns a structured object telling you which tool to call and the required args.
- The client runs the actual tool and returns results as a subsequent message.
- Storing the image and returning a reference or a data URL is up to you.


## Image generation endpoint (short guide)

- Endpoint: GET https://api.a0.dev/assets/image
- Required query param: text (the prompt)
- Optional: aspect (1:1, 16:9), seed

Example URL:

https://api.a0.dev/assets/image?text=modern+coffee+shop+logo&aspect=1:1

The endpoint returns binary image data. In browsers, fetch it and then create an object URL or data URL to show in <img>. On Node, convert to base64 or write to disk.


## Best practices

- Use a clear system message to define assistant behavior.
- Use JSON Schema when you need deterministic, machine-readable instructions (tool calls, database actions, etc.).
- Keep tool execution on the client or your backend — this is safer and auditable.
- Validate `schema_data` before executing any tool (ensure allowed tool name, safe arguments).
- Rate-limit and sanitize tool arguments from the model (don't run arbitrary shell commands or uncontrolled URLs).


## Security & deployment notes

- No API key is needed to call the a0 endpoints, but that also means you should not expose direct tool execution to arbitrary end users. Place a proxy/backend where you can:
  - validate requests
  - apply rate limits
  - cache expensive tool results
  - store audit logs

- Never run arbitrary code or shell commands suggested by the model. Treat tool args as untrusted input and validate strictly.


## Troubleshooting & FAQ

Q: The model returns malformed JSON or invalid schema_data.
A: Fall back to parsing the `completion` string and attempt to extract JSON. Use robust error handling, then re-call the model with a clarifying prompt to return correct structured output.

Q: The LLM asks to call a tool your system doesn't offer.
A: Validate the `tool` field. If unsupported, respond to the LLM with a message like: "I cannot run {tool}. Please provide an alternate plan." and re-call the LLM.

Q: How do I handle streaming or long responses?
A: The current API is basic request/response. If you need streaming, implement chunking or progressive prompts client-side (not currently provided by the endpoint described here).


## Summary / Quick checklist

- Use POST /ai/llm with messages and (optionally) a schema.
- Check `schema_data` to see if the model requested a tool.
- If it requests a tool, execute it locally or on your backend, then send the tool result as a new message and re-call /ai/llm.
- For images, call GET /assets/image with text and optional aspect/seed and handle returned binary.

