# a0.dev APIs — Reference & Integration Guide

This README documents the a0.dev APIs I know and practical guidance for using them in JavaScript/TypeScript projects — especially Expo React Native apps. It covers the LLM API, the Image Generation API, streaming patterns, fallback behavior, example helper functions, and integration tips (STT/TTS and Expo caveats).

---

## Table of contents

- Overview
- Endpoints
  - LLM API (POST /ai/llm)
  - Image Generation API (GET /assets/image)
- LLM: Request & Response shapes
- LLM: Non-streaming usage examples
- LLM: Streaming usage pattern + fallback
- Example helper: callA0LLM (streaming + fallback)
- Image Generation: usage examples
- Integration tips for Expo / React Native
  - Streaming support caveats
  - STT & TTS integration patterns
  - Permissions and native modules
- Security & production recommendations
- Troubleshooting & common errors
- Example integration snippets
- FAQ and notes

---

## Overview

Two core a0.dev APIs covered here:

1. LLM API — `POST https://api.a0.dev/ai/llm`
   - Send conversation-style messages to the model and receive completions. Supports 
streaming and non-streaming usage patterns.

response format  API response always wraps the completion in JSON {"completion": "..."}
2. Image Generation API — `GET https://api.a0.dev/assets/image`
   - Generate images on demand given a text prompt and optional parameters.

Note: This doc collects the API patterns I've used/seen and working integration patterns for React Native/Expo. Always check the official a0.dev docs for the latest fields and behavior.

---

## Endpoints

### LLM API

- URL: `https://api.a0.dev/ai/llm`
- Method: POST
- Content-Type: `application/json`
- Body: JSON (typically `{ messages: [...] }` plus extra options depending on need)
- Auth: In many a0 setups, calls do not require an Authorization header. The examples below intentionally use only `Content-Type: application/json` unless you have a special server-side or proxied token requirement.

Typical message shape (Chat-style):

{
  "role": "system" | "user" | "assistant",
  "content": string
}

Example body payload:

{
  "messages": [
    { "role": "system", "content": "You are a friendly assistant." },
    { "role": "user", "content": "Hello, can you help me plan a dinner?" }
  ],
  "temperature": 0.3
}

Response (non-streaming typical shape):

{
  "completion": "Sure — here's a quick plan...",
  "metadata": { /* optional */ }
}

> The exact response keys can vary; many clients will find `completion` or a top-level `message` field. Be prepared to inspect the returned JSON and adapt to small schema variations.


### Image Generation API

- URL: `GET https://api.a0.dev/assets/image`
- Method: GET
- Query parameters (commonly used):
  - `text`: (required) prompt describing the image
  - `aspect`: optional, e.g. `1:1`, `16:9`
  - `seed`: optional

Example GET URL:

https://api.a0.dev/assets/image?text=portrait%20of%20a%20friendly%20robot&aspect=1:1

Response:
- Usually returns an image as binary (image/jpeg or image/png) or a JSON payload with an image URL depending on the deployment. If you get binary, request from the app as a blob and convert to a local URI for display.

---

## LLM: Non-streaming usage examples

Basic fetch example (non-streaming):

```js
const bodyPayload = { messages };
const res = await fetch('https://api.a0.dev/ai/llm', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(bodyPayload),
});

if (!res.ok) {
  const text = await res.text();
  throw new Error(`LLM non-streaming call failed: ${res.status} ${text}`);
}

const json = await res.json();
const completion = json.completion ?? json.message ?? JSON.stringify(json);
return completion;
```

This is the most compatible approach for runtimes without fetch-stream support (many RN runtimes).

---

## LLM: Streaming usage pattern + fallback

A common and powerful pattern is to attempt streaming first (so you can display partial tokens and speak incrementally), and if streaming fails (no stream support or non-200 response), fallback to a full non-streaming call.

Pseudocode pattern:

1. POST JSON to `https://api.a0.dev/ai/llm` with Content-Type header.
2. If response is streaming (resp.body.getReader available), read chunks with a TextDecoder and call an `onToken` callback for each token or line.
3. If an exception occurs, or streaming is not supported, call the non-streaming path and return the full completion.

Important: some RN environments (Expo-managed) may not support fetch streaming. When streaming isn't available, use the non-streaming fallback.

Streaming example (browser / runtimes with streaming support):

```js
async function tryStreaming(messages, { onToken }) {
  const bodyPayload = { messages };
  const res = await fetch('https://api.a0.dev/ai/llm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bodyPayload),
  });

  if (!res.ok || !res.body) {
    // fallback to non-streaming
    return nonStreamingCall(messages);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let done = false;
  let accumulated = '';

  while (!done) {
    const { value, done: chunkDone } = await reader.read();
    done = chunkDone;
    if (value) {
      const chunkText = decoder.decode(value, { stream: true });
      // parser: break by newline or data: lines
      onToken(chunkText);
      accumulated += chunkText;
    }
  }

  // Optionally return the canonical full completion by parsing accumulated or
  // calling the non-streaming endpoint again.
  return accumulated;
}
```

Fallback (non-streaming) should be implemented exactly as the non-streaming example above.

---

## Example helper: callA0LLM (pattern used in this project)

A robust helper function should:
- Accept `messages` and optional `stream` and `onToken` callbacks.
- Attempt streaming if requested and runtime supports it.
- If streaming fails or is unavailable, call the non-streaming endpoint and return the full text.
- Always use `Content-Type: application/json` and, per the environment you told me about, do not send Authorization header unless specifically required by your deployment.

Example pseudo-implementation summary (JS/TS):

1. Build `bodyPayload` from `messages` and extras.
2. If opts.stream:
   - POST to endpoint
   - if res.body && res.ok, read chunks and call opts.onToken for each token
   - if any failure: call nonStreamingCall(messages, extras)
3. Otherwise call nonStreamingCall(messages, extras)

Non-streaming call implementation is the basic `fetch` example above and returns `json.completion` or the fallback.

---

## Image Generation: usage examples

Simple fetch to retrieve an image URL or data:

```js
// If API returns JSON with image URL
const url = `https://api.a0.dev/assets/image?text=${encodeURIComponent(prompt)}&aspect=1:1`;
const res = await fetch(url);
if (!res.ok) throw new Error('Image generation failed');
// If JSON with url
// const json = await res.json();
// const imageUrl = json.url;

// If binary image
const blob = await res.blob();
// Convert to local URL for React Native Image component
const localUri = URL.createObjectURL(blob);
```

In Expo: fetching binary images directly into an Image component can be handled by passing the remote URL to <Image source={{ uri: url }} /> when a URL is supplied by the endpoint.

---

## Integration tips for Expo / React Native

1. Streaming caveats
   - Many React Native runtimes historically lacked `Response.body.getReader()`/streaming support. If you're in an environment without streaming, your streaming attempt will fail — implement a non-streaming fallback.
   - In Expo-managed apps, streaming support may depend on the underlying JS engine (Hermes) and SDK version. Test streaming on your target runtime.

2. STT & TTS (voice assistant patterns)
   - STT (Speech-to-Text):
     - On web: use the Web Speech API (SpeechRecognition / webkitSpeechRecognition) for continuous interim results.
     - On native: `@react-native-voice/voice` is a common choice for realtime transcription. This package may require native prebuild/dev client with Expo.
   - TTS (Text-to-Speech):
     - `expo-speech` is an easy cross-platform choice in Expo-managed apps.
   - Turn-taking pattern:
     - While assistant is speaking, stop or pause STT to avoid self-capture.
     - Resume listening after speech finishes.
     - If you stream tokens, buffer them into chunks and trigger TTS for chunks when you detect sentence boundaries or natural pauses.

3. Microphone permissions
   - Request microphone permissions on mount:
     - `Permissions` / `Audio.requestPermissionsAsync()` depending on SDK.
     - Always show clear UX if access is denied and provide a fallback input box.

4. Network & latency
   - For best UX, stream tokens and start incremental TTS as soon as you have meaningful token chunks (punctuation or end-of-phrase heuristics help).
   - If you can't stream, ensure the assistant provides a short greeting immediately (non-streaming call) before entering listen mode.

---

## Security & production recommendations

- Even if the a0.dev endpoint does not require an Authorization header in your setup, consider whether you want clients calling the API directly or via your backend.
  - Pros of client direct: low latency, simpler architecture.
  - Cons: you must trust the endpoint is safe to expose; if any keys or billing controls are needed in the future, you may need to switch to a proxy.
- Rate limiting: use server-side controls or local client backoff to avoid hitting service limits.
- Sensitive data: avoid sending PII in logs or telemetry. If you store conversation history, encrypt at rest or use platform-provided secure storage.

---

## Troubleshooting & common errors

- `fetch` streaming not supported (in RN): fallback to non-streaming call.
- Unexpected response shape: inspect `await res.text()` to see raw response — some deployments return different keys.
- Long pauses or truncated streaming: check runtime streaming support and network proxy behavior (some proxies buffer responses and break streaming).

---

## Example integration snippets

1) Incremental TTS buffer strategy (pseudo):

```js
let buffer = '';
function onToken(token) {
  buffer += token;
  // speak when buffer ends with sentence punctuation or is long
  if (/[.!?]\s*$/.test(buffer) || buffer.length > 200) {
    speak(buffer); // use expo-speech
    buffer = '';
  }
}
```

2) callA0LLM wrapper (simplified):

```js
async function nonStreamingCall(messages) {
  const bodyPayload = { messages };
  const res = await fetch('https://api.a0.dev/ai/llm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bodyPayload),
  });
  if (!res.ok) throw new Error('LLM non-streaming failed');
  const json = await res.json();
  return json.completion ?? json.message ?? '';
}

async function callA0LLM(messages, { stream = false, onToken } = {}) {
  if (!stream) return nonStreamingCall(messages);

  try {
    const bodyPayload = { messages };
    const res = await fetch('https://api.a0.dev/ai/llm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyPayload),
    });

    if (!res.ok || !res.body) {
      // fallback
      return nonStreamingCall(messages);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let done = false;
    let accumulated = '';

    while (!done) {
      const { value, done: chunkDone } = await reader.read();
      done = chunkDone;
      if (value) {
        const chunkText = decoder.decode(value, { stream: true });
        accumulated += chunkText;
        if (typeof onToken === 'function') onToken(chunkText);
      }
    }

    // Return accumulated stream text (or call nonStreamingCall for canonical)
    return accumulated;
  } catch (err) {
    // fallback
    return nonStreamingCall(messages);
  }
}
```

---

## FAQ & notes

Q: Does the a0.dev LLM require an API key?
A: In the setup you described, calls were made without Authorization headers and therefore no API key was required. If your deployment requires a key in the future, add it as an Authorization header or proxy requests through your server.

Q: Is streaming always available?
A: No — streaming depends on the runtime (browser & modern Node have good support). Many RN runtimes require Hermes or other setups to enable fetch streaming. Always implement a non-streaming fallback.

Q: How should I handle long conversations?
A: Keep a window of recent messages (e.g., last 10-20 messages) when sending context to the LLM to control token usage and latency. Persist important context separately if needed.

---

## Final remarks

This README is a practical guide for integrating the a0.dev LLM and image APIs into client apps (especially Expo/React Native). It shows common patterns: non-streaming fetches, a streaming-first approach with fallback, and incremental TTS integration for a natural voice conversation experience.

If you want, I can now:
- Add a concrete `callA0LLM` TypeScript implementation file directly to the codebase (with types and streaming parser tuned to the a0 streaming format you use).
- Update the voice assistant hook in this project to use streaming + incremental TTS using the buffered strategy shown above.
- Add example unit tests or a Postman collection.

Tell me which of the follow-ups you'd like and I will implement it now.