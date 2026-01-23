#!/usr/bin/env node

/**
 * Claude Agent SDK streaming script for E2B sandbox
 * Provides true token-by-token streaming via the SDK's query() function
 */

import { query } from '@anthropic-ai/claude-agent-sdk';
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
  // Use Agent SDK query for real streaming
  // includePartialMessages enables token-by-token streaming via stream_event messages
  for await (const message of query({
    prompt: fullPrompt,
    options: {
      systemPrompt: systemPromptArg || undefined,
      abortController,
      maxTurns: 20,
      includePartialMessages: true
    }
  })) {
    // Handle SDK message types
    if (message.type === 'stream_event') {
      // Real-time streaming events (token-by-token)
      const event = message.event;
      if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
        console.log(JSON.stringify({
          type: 'text',
          data: event.delta.text,
          timestamp: Date.now()
        }));
      } else if (event.type === 'content_block_start' && event.content_block?.type === 'tool_use') {
        console.log(JSON.stringify({
          type: 'tool_use',
          name: event.content_block.name,
          input: {},
          timestamp: Date.now()
        }));
      }
    } else if (message.type === 'assistant') {
      // Complete assistant message with content blocks
      const content = message.message?.content;
      if (Array.isArray(content)) {
        for (const block of content) {
          if (block.type === 'text' && block.text) {
            console.log(JSON.stringify({
              type: 'text',
              data: block.text,
              timestamp: Date.now()
            }));
          } else if (block.type === 'tool_use') {
            console.log(JSON.stringify({
              type: 'tool_use',
              name: block.name,
              input: block.input,
              timestamp: Date.now()
            }));
          } else if (block.type === 'tool_result') {
            console.log(JSON.stringify({
              type: 'tool_result',
              result: typeof block.content === 'string'
                ? block.content.substring(0, 500)
                : JSON.stringify(block.content).substring(0, 500),
              timestamp: Date.now()
            }));
          }
        }
      }
    } else if (message.type === 'result') {
      // Final result with cost and usage
      console.log(JSON.stringify({
        type: 'result',
        subtype: message.subtype,
        result: message.result,
        cost: message.total_cost_usd,
        timestamp: Date.now()
      }));
    }
    // Skip 'user' and 'system' messages (context replay)
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
