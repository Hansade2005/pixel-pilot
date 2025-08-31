# Tavily Web Search Integration

This document explains how to use the Tavily web search and extraction tools that have been integrated into the AI App Builder.

## Overview

The Tavily integration provides two new tools for the AI agent:
1. `web_search` - Search the web for current information
2. `web_extract` - Extract content from specific web pages

## Tools

### web_search

Search the web for current information and context.

**Parameters:**
- `query` (string): Search query to find relevant web content

**Usage:**
```javascript
{
  "name": "web_search",
  "arguments": {
    "query": "latest React best practices 2025"
  }
}
```

### web_extract

Extract content from web pages.

**Parameters:**
- `urls` (string or array of strings): URL or URLs to extract content from

**Usage:**
```javascript
{
  "name": "web_extract",
  "arguments": {
    "urls": "https://example.com/article"
  }
}
```

Or for multiple URLs:
```javascript
{
  "name": "web_extract",
  "arguments": {
    "urls": ["https://example.com/article1", "https://example.com/article2"]
  }
}
```

## Configuration

The Tavily API key can be configured using the `TAVILY_API_KEY` environment variable. If not set, a default development key will be used.

To set your own API key, add the following to your `.env.local` file:
```
TAVILY_API_KEY=your-api-key-here
```

## Best Practices

1. Use specific, targeted queries for better search results
2. Extract content only from reputable sources
3. Combine search results with existing knowledge for comprehensive responses
4. Handle cases where no relevant results are found
5. Respect rate limits and usage guidelines

## Example Usage

The AI agent will automatically use these tools when it needs current information that is not available in the knowledge base. For example:

- When asked about recent news or events
- When requesting current statistics or data
- When verifying facts or information
- When building applications that require integration with external data sources

The tools will appear in the chat interface as tool invocation cards, showing the search queries and extracted content.