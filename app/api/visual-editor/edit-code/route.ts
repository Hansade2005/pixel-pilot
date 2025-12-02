import { generateText } from 'ai'
import { z } from 'zod'
import { getModel } from '@/lib/ai-providers'

// Input validation schema
const editCodeSchema = z.object({
  fullCode: z.string().min(1),
  targetLine: z.number(),
  originalText: z.string().optional(), // Original text content from target line
  intent: z.string().min(1).max(2000),
  elementId: z.string(),
  sourceFile: z.string(),
})

export async function POST(request: Request) {
  try {
    // Parse and validate request body
    const body = await request.json()
    const { fullCode, targetLine, originalText, intent, elementId, sourceFile } = editCodeSchema.parse(body)

    console.log('🎨 [Visual Editor API] Editing code for:', sourceFile)
    console.log('🎨 [Visual Editor API] Element ID:', elementId)
    console.log('🎨 [Visual Editor API] Target line:', targetLine)
    console.log('🎨 [Visual Editor API] Original text:', originalText)
    console.log('🎨 [Visual Editor API] Intent:', intent)
    console.log('🎨 [Visual Editor API] File size:', fullCode.length, 'chars')

    // Use Grok with 2M token context window
    const model = getModel('grok-4-1-fast-non-reasoning')
   
    // Build the editing prompt with explicit change type examples
    const originalTextContext = originalText ? `
**ORIGINAL TEXT ON LINE ${targetLine}:**
"${originalText}"
` : '';
    
    const editPrompt = `You are an expert code editor. Your task is to apply changes to React/JSX code with surgical precision.

**CRITICAL INSTRUCTIONS:**
1. You will receive the COMPLETE file content below
2. Apply the requested changes ONLY to line ${targetLine}
3. Return the COMPLETE updated file with ALL lines
4. DO NOT add explanations, markdown, or code fences
5. Return ONLY the updated code - nothing else

**UNDERSTANDING THE CHANGES:**
- "REPLACE TEXT \"X\" WITH \"Y\"" → Find text X inside JSX element and replace with Y
  Example: <p>Hello World</p> where X="World" → <p>Hello Y</p>
- "CHANGE TEXT CONTENT to: X" → Replace the text/children inside the JSX element with X
  Example: <h1>Old Text</h1> → <h1>X</h1>
- "UPDATE INLINE STYLE X to: Y" → Modify the style={{X: ...}} property to Y
  Example: style={{color: 'red'}} → style={{color: Y}}
- "Add Tailwind class: X" → Add X to the className attribute
  Example: className="btn" → className="btn X"
- "UPDATE X to: Y" → Change attribute X to value Y
  Example: href="old" → href="Y"

**File:** ${sourceFile}
**Element ID:** ${elementId}
**Target Line:** ${targetLine}${originalTextContext}
**Changes to Apply:**
${intent}

**Complete File Content:**
\`\`\`
${fullCode}
\`\`\`

**Instructions:**
Locate line ${targetLine} in the file above. Apply ONLY the changes specified. If it says "CHANGE TEXT CONTENT", modify only the text between the JSX tags. If it says "UPDATE INLINE STYLE", modify only the style object. Return the complete updated file with proper formatting and indentation:`

    // Generate the edited code with low temperature for precision
    const result = await generateText({
      model: model,
      temperature: 0.1, // Very low temperature for deterministic edits
      prompt: editPrompt,
    })

    let updatedCode = result.text.trim()
    
    // Remove markdown code fences if present
    updatedCode = updatedCode.replace(/^```(?:tsx|jsx|typescript|javascript)?\s*\n/i, '');
    updatedCode = updatedCode.replace(/\n```\s*$/i, '');
    updatedCode = updatedCode.trim();

    console.log('✅ [Visual Editor API] Code edited successfully')
    console.log('📝 [Visual Editor API] Original size:', fullCode.length, 'chars')
    console.log('📝 [Visual Editor API] Updated size:', updatedCode.length, 'chars')

    return Response.json({
      success: true,
      updatedCode,
      metadata: {
        elementId,
        sourceFile,
        targetLine,
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
