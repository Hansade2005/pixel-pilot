import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getModel } from '@/lib/ai-providers'
import { streamText } from 'ai'
import { DEFAULT_CHAT_MODEL, getModelById } from '@/lib/ai-models'

// Get AI model for code fixing with fallback logic
const getCodeFixModel = (modelId?: string) => {
  try {
    const selectedModelId = modelId || DEFAULT_CHAT_MODEL
    const modelInfo = getModelById(selectedModelId)

    if (!modelInfo) {
      console.warn(`Model ${selectedModelId} not found, using default: ${DEFAULT_CHAT_MODEL}`)
      return getModel(DEFAULT_CHAT_MODEL)
    }

    console.log(`Using AI model for code fix: ${modelInfo.name} (${modelInfo.provider})`)
    return getModel(selectedModelId)
  } catch (error) {
    console.error('Failed to get code fix model:', error)
    console.log(`Falling back to default model: ${DEFAULT_CHAT_MODEL}`)
    return getModel(DEFAULT_CHAT_MODEL)
  }
}

// Build context for code fixing
const buildCodeFixContext = (context: any, mode: 'streaming' | 'chat' = 'chat') => {
  const { error, lineNumber, fileName, fileContent, userMessage, projectFiles } = context

  // Extract relevant code around the error line
  const lines = fileContent.split('\n')
  const startLine = Math.max(0, lineNumber - 10)
  const endLine = Math.min(lines.length, lineNumber + 10)
  const relevantCode = lines.slice(startLine, endLine).join('\n')

  // Different prompts for different modes
  if (mode === 'streaming') {
    return `You are an intelligent code editor AI. Analyze the context and choose the best editing approach.

CONTEXT ANALYSIS:
- File: ${fileName}
- Primary Error: ${error || 'General improvement'}
- Code Context (lines ${startLine + 1}-${endLine}):
${relevantCode}

INSTRUCTION: ${userMessage}

EDITING MODES:

1. SEARCH_REPLACE (for targeted fixes):
   When to use: Single error, small change, specific line fix
   Format:
   SEARCH_REPLACE
   SEARCH: exact text to find (include 2-3 lines context)
   REPLACE: exact replacement text
   END_SEARCH_REPLACE

2. FULL_FILE (for comprehensive changes):
   When to use: Multiple errors, refactoring, file-wide changes
   Format:
   FULL_FILE
   [complete corrected file content]
   END_FULL_FILE

EXAMPLES:

Targeted Fix:
SEARCH_REPLACE
SEARCH: function divide(a, b) {
  return a / b;
}
REPLACE: function divide(a, b) {
  if (b === 0) {
    throw new Error('Division by zero');
  }
  return a / b;
}
END_SEARCH_REPLACE

Full File Rewrite:
FULL_FILE
import React, { useState, useEffect } from 'react';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="App">
      <h1>Counter: {count}</h1>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
}

export default App;
END_FULL_FILE

Choose the appropriate mode based on the scope of changes needed. For streaming, output the chosen format directly.`
  }

  // Chat mode - more structured
  const systemPrompt = `You are an expert code editor AI assistant, similar to GitHub Copilot.

## Context:
- **File**: ${fileName}
- **Error Line**: ${lineNumber}
- **Error**: ${error || 'No specific error provided'}

## Code Context (lines ${startLine + 1}-${endLine}):
\`\`\`
${relevantCode}
\`\`\`

## Project Files:
${projectFiles?.map((f: any) => `- ${f.name} (${f.path})`).join('\n') || 'No project files provided'}

## Instructions:
1. Provide a direct code fix or suggestion
2. Focus on the specific error or issue
3. Keep changes minimal and targeted
4. Explain what you're changing and why
5. Return only the corrected code snippet, not the entire file
6. If suggesting a replacement, provide the exact text to replace

User request: ${userMessage}`

  return systemPrompt
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { error, lineNumber, fileName, fileContent, userMessage, projectFiles, modelId, mode = 'chat' } = body

    // Validate input
    if (!fileName || !fileContent) {
      return NextResponse.json({ error: 'Missing required fields: fileName, fileContent' }, { status: 400 })
    }

    // Get user from Supabase for authentication
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate model access based on subscription plan (similar to chat API)
    const selectedModelId = modelId || DEFAULT_CHAT_MODEL
    if (selectedModelId !== DEFAULT_CHAT_MODEL) {
      try {
        const { data: userSettings } = await supabase
          .from('user_settings')
          .select('subscription_plan')
          .eq('user_id', user.id)
          .single()

        // Add model access validation logic here if needed
        // Similar to chat API validation
      } catch (error) {
        console.warn('Could not validate subscription plan, proceeding with default model')
      }
    }

    // Get the AI model
    const model = getCodeFixModel(modelId)

    // Build context and messages with mode-specific prompt
    const systemPrompt = buildCodeFixContext({
      error,
      lineNumber,
      fileName,
      fileContent,
      userMessage,
      projectFiles
    }, mode)

    const messages = [
      {
        role: 'system' as const,
        content: systemPrompt
      },
      {
        role: 'user' as const,
        content: userMessage || 'Please fix this code issue'
      }
    ]

    // Stream the AI response
    const result = await streamText({
      model,
      messages,
      temperature: mode === 'streaming' ? 0.1 : 0.3, // Lower temperature for streaming for more consistent output
    })

    // Create a readable stream for the response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let buffer = ''
          for await (const chunk of result.textStream) {
            buffer += chunk

            // For streaming mode, clean the output to ensure pure code
            if (mode === 'streaming') {
              // Process complete lines or significant chunks
              const lines = buffer.split('\n')
              const completeLines = lines.slice(0, -1) // All complete lines
              const lastPartial = lines[lines.length - 1] // Last potentially incomplete line

              // Clean complete lines
              const cleanLines = completeLines.map(line => {
                return line
                  .replace(/^```[\w]*\n?/g, '') // Remove code block start
                  .replace(/^```\n?/g, '') // Remove code block end
                  .replace(/^#.*$/g, '') // Remove comment lines
                  .replace(/^\/\/.*$/g, '') // Remove // comments at start of line
                  .replace(/^\/\*[\s\S]*?\*\//g, '') // Remove /* */ comments
                  .trim()
              }).filter(line => line.length > 0 || line.includes('\n'))

              // Stream clean complete lines
              if (cleanLines.length > 0) {
                controller.enqueue(cleanLines.join('\n') + '\n')
              }

              // Keep the last partial line in buffer for next iteration
              buffer = lastPartial
            } else {
              // For chat mode, stream as-is
              controller.enqueue(chunk)
            }
          }

          // Stream any remaining buffer content
          if (buffer && mode === 'streaming') {
            const cleaned = buffer
              .replace(/^```[\w]*\n?/g, '')
              .replace(/^```\n?/g, '')
              .replace(/^#.*$/g, '')
              .replace(/^\/\/.*$/g, '')
              .replace(/^\/\*[\s\S]*?\*\//g, '')
              .trim()
            if (cleaned) {
              controller.enqueue(cleaned)
            }
          }

          controller.close()
        } catch (error) {
          controller.error(error)
        }
      }
    })

    // Return streaming response
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error) {
    console.error('AI Fix API error:', error)
    return NextResponse.json({
      error: 'Failed to generate code fix',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}