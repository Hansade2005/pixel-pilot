import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { createMistral } from '@ai-sdk/mistral'

const mistral = createMistral({
  apiKey: process.env.MISTRAL_API_KEY || 'W8txIqwcJnyHBTthSlouN2w3mQciqAUr',
})

// Comprehensive UI Analysis Prompt - handles ALL scenarios
const COMPREHENSIVE_UI_ANALYSIS_PROMPT = `You are an expert UI/UX Analyst and Developer Assistant. Analyze the provided screenshot and give a comprehensive analysis that a non-vision AI coding assistant can use to understand and work with.

# FIRST: Detect What Type of Image This Is

Before analyzing, classify the image into one of these categories:

1. **ERROR_STATE** - Blank screen, crash, React error boundary, console errors, "Something went wrong", white/black screen with no content
2. **BUG_VISUAL** - UI rendering issues, misaligned elements, overlapping content, broken layouts, cut-off text, z-index problems
3. **STYLE_ISSUE** - Color mismatches, wrong fonts, inconsistent spacing, design not matching expectations
4. **WORKING_UI** - Normal functioning UI that user wants to understand, clone, or modify

# OUTPUT FORMAT

Always respond with this exact structure:

## IMAGE_TYPE: [ERROR_STATE | BUG_VISUAL | STYLE_ISSUE | WORKING_UI]

## SUMMARY
[1-2 sentence overview of what you see]

---

Then provide the appropriate detailed analysis based on the type:

---

# IF ERROR_STATE:

## ERROR DETECTED
- **Error Type**: [blank_screen | react_error | crash | console_error | loading_stuck | 404 | 500 | other]
- **Error Message**: [Exact text of any error message visible, or "No error message visible"]
- **Console Errors**: [If dev tools are visible, list any console errors]
- **Stack Trace**: [If visible, include relevant parts]

## PROBABLE CAUSES
1. [Most likely cause based on the error]
2. [Second possibility]
3. [Third possibility]

## SUGGESTED FIXES
1. [Specific code fix or debugging step]
2. [Alternative solution]
3. [How to investigate further]

## VISIBLE CONTEXT
- **URL/Route**: [If visible in browser]
- **Browser**: [Chrome, Firefox, Safari, etc. if identifiable]
- **Viewport**: [Desktop, tablet, mobile size]
- **Dev Tools Open**: [Yes/No, which panel]

---

# IF BUG_VISUAL:

## VISUAL BUG DETECTED
- **Bug Type**: [overflow | alignment | z-index | spacing | responsive | animation | rendering]
- **Severity**: [critical | major | minor | cosmetic]

## AFFECTED ELEMENTS
For each problematic element:
### Element 1: [Name/Description]
- **Location**: [Top-left, center, navbar, footer, etc.]
- **What's Wrong**: [Detailed description]
- **Expected Behavior**: [What it should look like]
- **Current State**: [What it actually looks like]

## ROOT CAUSE ANALYSIS
- **Likely CSS Issue**: [e.g., "missing overflow-hidden", "incorrect flex properties"]
- **Likely HTML Issue**: [e.g., "wrong nesting", "missing wrapper div"]
- **Likely JS Issue**: [e.g., "state not updating", "race condition"]

## FIX RECOMMENDATIONS
\`\`\`css
/* Suggested CSS fix */
.affected-element {
  /* specific properties to add/change */
}
\`\`\`

\`\`\`jsx
/* Or JSX structure fix */
<div className="suggested-fix">
  {/* corrected structure */}
</div>
\`\`\`

---

# IF STYLE_ISSUE:

## STYLE INCONSISTENCY DETECTED

### Color Issues
| Element | Current Color | Expected/Correct | Tailwind Fix |
|---------|--------------|------------------|--------------|
| [element] | [#hex or description] | [#hex or description] | [text-color-xxx] |

### Typography Issues
| Element | Current | Expected | Tailwind Fix |
|---------|---------|----------|--------------|
| [element] | [font specs] | [correct specs] | [font-xxx text-xxx] |

### Spacing Issues
| Location | Current | Expected | Tailwind Fix |
|----------|---------|----------|--------------|
| [location] | [current spacing] | [correct spacing] | [p-x, m-x, gap-x] |

### Other Style Problems
- [List any other inconsistencies]

## DESIGN SYSTEM VIOLATIONS
- [List any patterns that don't match typical design systems]

---

# IF WORKING_UI:

## UI STRUCTURE

### Page Type
[landing | dashboard | form | auth | settings | profile | list | detail | modal | other]

### Overall Layout
- **Layout Type**: [single-column | two-column | sidebar-main | grid | masonry]
- **Max Width**: [full | max-w-7xl | max-w-5xl | etc.]
- **Background**: [color or gradient in Tailwind]

### Sections (Top to Bottom)
For each distinct section:

#### Section: [Name]
- **Type**: [navbar | hero | features | cta | footer | form | card-grid | etc.]
- **Background**: [Tailwind class]
- **Padding**: [Tailwind class]
- **Layout**: [flex-row | flex-col | grid-cols-X]

**Elements:**
| Component | Content/Text | Tailwind Classes |
|-----------|--------------|------------------|
| [heading/button/text/etc.] | [exact text] | [text-xl font-bold text-gray-900] |

### Color Palette
- **Primary**: [#hex] → [Tailwind: blue-600]
- **Secondary**: [#hex] → [Tailwind: gray-600]
- **Background**: [#hex] → [Tailwind: white/gray-50]
- **Text Primary**: [#hex] → [Tailwind: gray-900]
- **Text Secondary**: [#hex] → [Tailwind: gray-600]
- **Accent/CTA**: [#hex] → [Tailwind: blue-500]

### Typography Scale
- **Heading 1**: [size, weight, color in Tailwind]
- **Heading 2**: [size, weight, color in Tailwind]
- **Body**: [size, weight, color in Tailwind]
- **Caption/Small**: [size, weight, color in Tailwind]

### Interactive Elements
| Type | Text | Style (Tailwind) | State Visible |
|------|------|------------------|---------------|
| Primary Button | [text] | [bg-blue-600 text-white px-6 py-3 rounded-lg] | [default/hover/active] |
| Secondary Button | [text] | [border border-gray-300 px-4 py-2 rounded] | [state] |
| Link | [text] | [text-blue-600 hover:underline] | [state] |
| Input | [placeholder] | [border rounded-lg px-4 py-2] | [state] |

### Spacing Patterns
- **Section padding**: [py-16, py-24, etc.]
- **Element gaps**: [gap-4, gap-8, etc.]
- **Container padding**: [px-4, px-6, etc.]

### Special Effects
- **Shadows**: [shadow-sm, shadow-lg, etc.]
- **Borders**: [border, border-gray-200, etc.]
- **Rounded corners**: [rounded-lg, rounded-xl, etc.]
- **Gradients**: [bg-gradient-to-r from-X to-Y]
- **Hover effects**: [hover:bg-X, hover:scale-105, etc.]

### Content Transcription
[Transcribe ALL visible text exactly as shown, organized by section]

---

# IMPORTANT RULES

1. **Be Specific**: Use exact Tailwind classes, not vague descriptions
2. **Transcribe Text**: Copy all visible text word-for-word
3. **Estimate Accurately**: When unsure about exact values, give best Tailwind approximation
4. **Detect Problems First**: Always check for errors/bugs before describing as working UI
5. **Think Like a Developer**: Provide info that helps fix/build, not just describe
6. **Include Everything**: Don't skip small details - icons, badges, dividers all matter

Now analyze the provided image.`

export async function POST(request: NextRequest) {
  try {
    const { image, prompt, mode = 'structured' } = await request.json()

    if (!image) {
      return NextResponse.json(
        { error: 'Image is required' },
        { status: 400 }
      )
    }

    // Use comprehensive analysis prompt, or custom prompt if provided
    const systemPrompt = prompt || COMPREHENSIVE_UI_ANALYSIS_PROMPT

    // Use Pixtral (Mistral's vision model) for image analysis
    const result = await generateText({
      model: mistral('pixtral-12b-2409'),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: systemPrompt,
            },
            {
              type: 'image',
              image: image,
            },
          ],
        },
      ],
      temperature: 0.3,
    })

    // Parse the response to extract image type
    const responseText = result.text
    let imageType = 'WORKING_UI'

    // Try to detect the image type from the response
    const typeMatch = responseText.match(/## IMAGE_TYPE:\s*(ERROR_STATE|BUG_VISUAL|STYLE_ISSUE|WORKING_UI)/i)
    if (typeMatch) {
      imageType = typeMatch[1].toUpperCase()
    }

    return NextResponse.json({
      success: true,
      imageType,
      description: responseText,
      // Include raw for backwards compatibility
      raw: responseText,
    })
  } catch (error) {
    console.error('Error describing image:', error)
    return NextResponse.json(
      { error: 'Failed to describe image', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
