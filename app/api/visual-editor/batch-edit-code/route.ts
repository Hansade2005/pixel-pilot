import { generateText } from 'ai'
import { z } from 'zod'
import { getModel } from '@/lib/ai-providers'

// Input validation schema for batch edits
const elementEditSchema = z.object({
  elementId: z.string(),
  targetLine: z.number(),
  originalText: z.string().optional(),
  changes: z.array(z.object({
    property: z.string(),
    oldValue: z.string(),
    newValue: z.string(),
    useTailwind: z.boolean(),
    tailwindClass: z.string().optional(),
  })),
})

const batchEditCodeSchema = z.object({
  fullCode: z.string().min(1),
  sourceFile: z.string(),
  elements: z.array(elementEditSchema).min(1),
})

export async function POST(request: Request) {
  try {
    // Parse and validate request body
    const body = await request.json()
    const { fullCode, sourceFile, elements } = batchEditCodeSchema.parse(body)

    console.log('🎨 [Batch Visual Editor API] Editing code for:', sourceFile)
    console.log('🎨 [Batch Visual Editor API] Number of elements:', elements.length)
    console.log('🎨 [Batch Visual Editor API] File size:', fullCode.length, 'chars')

    // Build a comprehensive list of all changes
    const allChanges = elements.map((element, index) => {
      const changesDescription = element.changes.map(change => {
        const parts: string[] = []
        
        if (change.tailwindClass) {
          parts.push(`Add Tailwind class: ${change.tailwindClass}`)
        }
        
        const prop = change.property
        
        if (prop === 'textContent' || prop === 'innerText' || prop === 'children') {
          if (element.originalText) {
            parts.push(`REPLACE TEXT "${element.originalText}" WITH "${change.newValue}"`)
          } else {
            parts.push(`CHANGE TEXT CONTENT to: "${change.newValue}"`)
          }
        } else if (prop.startsWith('style.')) {
          const styleProp = prop.replace('style.', '')
          parts.push(`UPDATE INLINE STYLE ${styleProp} to: ${change.newValue}`)
        } else {
          parts.push(`UPDATE ${prop} to: ${change.newValue}`)
        }
        
        return parts.join('; ')
      }).join('; ')
      
      return `${index + 1}. LINE ${element.targetLine} (Element: ${element.elementId}): ${changesDescription}`
    }).join('\n')

    // Use Grok with 2M token context window
    const model = getModel('grok-4-1-fast-non-reasoning')
   
    // Build the editing prompt for batch processing
    const editPrompt = `You are an expert code editor. Your task is to apply multiple changes to different elements in a React/JSX file with surgical precision.

**CRITICAL INSTRUCTIONS:**
1. You will receive the COMPLETE file content below
2. You must apply changes to ${elements.length} DIFFERENT elements on DIFFERENT lines
3. Apply ALL changes for ALL elements - DO NOT skip any
4. Each element is on a specific line number - be precise
5. Return the COMPLETE updated file with ALL lines
6. DO NOT add explanations, markdown, or code fences
7. Return ONLY the updated code - nothing else

**UNDERSTANDING THE CHANGES:**
- "REPLACE TEXT \"X\" WITH \"Y\"" → Find text X inside JSX element and replace with Y
- "CHANGE TEXT CONTENT to: X" → Replace the text/children inside the JSX element with X
- "UPDATE INLINE STYLE X to: Y" → Modify the style={{X: ...}} property to Y
  IMPORTANT: Keep all existing styles, only change the specified property
- "Add Tailwind class: X" → Add X to className (keep existing classes)

**BATCH EDITING STRATEGY:**
1. Read through ALL ${elements.length} changes below first
2. For each line number, apply the specified changes
3. Be careful not to mix up changes between different elements
4. Preserve all unchanged lines exactly as they are

**File:** ${sourceFile}
**Total Elements to Edit:** ${elements.length}

**ALL CHANGES TO APPLY:**
${allChanges}

**Complete File Content:**
\`\`\`
${fullCode}
\`\`\`

**EXECUTION PLAN:**
Go through the file and for each line mentioned above:
- Line ${elements[0].targetLine}: Apply the changes for element ${elements[0].elementId}
${elements.slice(1).map(el => `- Line ${el.targetLine}: Apply the changes for element ${el.elementId}`).join('\n')}

Now return the COMPLETE updated file with ALL ${elements.length} changes applied correctly:`

    console.log('🎨 [Batch Visual Editor API] Prompt length:', editPrompt.length, 'chars')
    console.log('🎨 [Batch Visual Editor API] Sending to AI...')

    // Generate the edited code with low temperature for precision
    const result = await generateText({
      model: model,
      temperature: 0.05, // Even lower temperature for batch edits (more deterministic)
      prompt: editPrompt,
    })

    let updatedCode = result.text.trim()
    
    // Remove markdown code fences if present
    updatedCode = updatedCode.replace(/^```(?:tsx|jsx|typescript|javascript)?\s*\n/i, '')
    updatedCode = updatedCode.replace(/\n```\s*$/i, '')
    updatedCode = updatedCode.trim()

    console.log('✅ [Batch Visual Editor API] Code edited successfully')
    console.log('📝 [Batch Visual Editor API] Original size:', fullCode.length, 'chars')
    console.log('📝 [Batch Visual Editor API] Updated size:', updatedCode.length, 'chars')
    console.log('📝 [Batch Visual Editor API] Elements processed:', elements.length)

    return Response.json({
      success: true,
      updatedCode,
      metadata: {
        sourceFile,
        elementsProcessed: elements.length,
        linesModified: elements.map(el => el.targetLine),
      },
    })

  } catch (error) {
    console.error('❌ [Batch Visual Editor API] Error editing code:', error)
    
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
