#!/usr/bin/env node

/**
 * Claude Code SDK streaming script for E2B sandbox
 * Provides true token-by-token streaming via the SDK's query() function
 */

import { query } from '@anthropic-ai/claude-code';
import { readFileSync } from 'fs';

// Get arguments
const promptArg = process.argv[2];
const systemPromptArg = process.argv[3];
const historyFileArg = process.argv[4];

if (!promptArg) {
  console.error('Usage: node claude-sdk-stream.mjs <prompt> [systemPrompt] [historyFile]');
  process.exit(1);
}

// Load conversation history if provided
let conversationHistory = [];
if (historyFileArg) {
  try {
    const historyData = readFileSync(historyFileArg, 'utf-8');
    conversationHistory = JSON.parse(historyData);
  } catch (e) {
    // Ignore if file doesn't exist or is invalid
  }
}

// Build a single prompt string from history + current message
let fullPrompt = '';
if (conversationHistory.length > 0) {
  const context = conversationHistory
    .map(msg => `${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`)
    .join('\n\n');
  fullPrompt = `Previous conversation:\n${context}\n\nCurrent request: ${promptArg}`;
} else {
  fullPrompt = promptArg;
}

// Send start event
console.log(JSON.stringify({ type: 'start', timestamp: Date.now() }));

const abortController = new AbortController();

// Handle process termination
process.on('SIGTERM', () => abortController.abort());
process.on('SIGINT', () => abortController.abort());

try {
  // Use SDK query for real streaming
  for await (const message of query({
    prompt: fullPrompt,
    options: {
      systemPrompt: systemPromptArg || undefined,
      abortController,
      maxTurns: 20
    }
  })) {
    // Stream each message as SSE-compatible JSON
    // The SDK returns messages incrementally including text deltas
    
    if (message.type === 'text') {
      // Text content - stream it!
      console.log(JSON.stringify({
        type: 'text',
        data: message.text || '',
        timestamp: Date.now()
      }));
    } else if (message.type === 'tool_use') {
      // Tool being invoked
      console.log(JSON.stringify({
        type: 'tool_use',
        name: message.name,
        input: message.input,
        timestamp: Date.now()
      }));
    } else if (message.type === 'tool_result') {
      // Tool execution result
      console.log(JSON.stringify({
        type: 'tool_result',
        result: typeof message.result === 'string' 
          ? message.result.substring(0, 500)
          : message.result,
        timestamp: Date.now()
      }));
    } else if (message.type === 'result') {
      // Final result with cost
      console.log(JSON.stringify({
        type: 'result',
        subtype: message.subtype,
        result: message.result,
        cost: message.total_cost_usd,
        timestamp: Date.now()
      }));
    } else if (message.type === 'content_block_delta') {
      // Streaming text delta - this is the real-time streaming!
      if (message.delta?.text) {
        console.log(JSON.stringify({
          type: 'text',
          data: message.delta.text,
          timestamp: Date.now()
        }));
      }
    } else if (message.type === 'content_block_start') {
      // Start of content block
      if (message.content_block?.type === 'tool_use') {
        console.log(JSON.stringify({
          type: 'tool_use',
          name: message.content_block.name,
          input: {},
          timestamp: Date.now()
        }));
      }
    }
  }

  console.log(JSON.stringify({ type: 'complete', timestamp: Date.now() }));
  process.exit(0);
} catch (error) {
  console.error(JSON.stringify({
    type: 'error',
    message: error.message || String(error),
    timestamp: Date.now()
  }));
  process.exit(1);
}
