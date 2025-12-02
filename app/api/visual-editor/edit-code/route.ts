import { generateText } from 'ai'
import { z } from 'zod'
import { getModel } from '@/lib/ai-providers'

// Input validation schema
const editCodeSchema = z.object({
  code: z.string().min(1),
  context: z.object({
    beforeLines: z.array(z.string()),
    targetLine: z.string(),
    afterLines: z.array(z.string()),
    lineNumber: z.number(),
  }),
  intent: z.string().min(1).max(2000),
  elementId: z.string(),
  sourceFile: z.string(),
})

export async function POST(request: Request) {
  try {
    // Parse and validate request body
    const body = await request.json()
    const { code, context, intent, elementId, sourceFile } = editCodeSchema.parse(body)

    console.log('🎨 [Visual Editor API] Editing code for:', sourceFile)
    console.log('🎨 [Visual Editor API] Element ID:', elementId)
    console.log('🎨 [Visual Editor API] Intent:', intent)

    // Use Codestral for precise code editing
    const codestralModel = getModel('codestral-latest')
   
    // Build the editing prompt
    const editPrompt = `You are an expert code editor. Your task is to apply styling changes to React/JSX code with surgical precision.

**IMPORTANT RULES:**
1. Return ONLY the edited code section - no explanations, no markdown, no code fences
2. Maintain ALL existing code structure, props, and logic
3. Apply the requested changes precisely
4. Preserve whitespace and indentation exactly as in the original
5. DO NOT add comments or explanations in the code
6. DO NOT wrap the response in markdown code blocks

**File:** ${sourceFile}
**Element ID:** ${elementId}
**Line Number:** ${context.lineNumber}

**Code Context:**
\`\`\`
${context.beforeLines.join('\n')}
${context.targetLine} ← TARGET LINE
${context.afterLines.join('\n')}
\`\`\`

**Changes to Apply:**
${intent}

**Instructions:**
Apply the requested changes to the TARGET LINE and return the complete edited section (all lines shown above). The output should be valid ${sourceFile.endsWith('.tsx') || sourceFile.endsWith('.jsx') ? 'JSX' : sourceFile.endsWith('.ts') ? 'TypeScript' : 'JavaScript'} code that can directly replace the original section.

Return the edited code now:`

    // Generate the edited code with low temperature for precision
    const result = await generateText({
      model: codestralModel,
      temperature: 0.1, // Very low temperature for deterministic edits
      prompt: editPrompt,
    })

    const editedCode = result.text.trim()

    console.log('✅ [Visual Editor API] Code edited successfully')
    console.log('📝 [Visual Editor API] Output length:', editedCode.length, 'chars')

    return Response.json({
      success: true,
      editedCode,
      metadata: {
        elementId,
        sourceFile,
        lineNumber: context.lineNumber,
        intent,
      },
    })

  } catch (error) {
    console.error('❌ [Visual Editor API] Error editing code:', error)
    
    // Return error response
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      )
    }

    return Response.json(
      { error: 'Failed to edit code', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
