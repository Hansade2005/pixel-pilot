import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { createMistral } from '@ai-sdk/mistral'

const mistral = createMistral({
  apiKey: process.env.MISTRAL_API_KEY || 'W8txIqwcJnyHBTthSlouN2w3mQciqAUr',
})

// =============================================================================
// MODE: CLONE - Structured JSON for UI cloning/recreation
// =============================================================================
const CLONE_PROMPT = `You are a UI-to-Code Translation Engine. Your job is to analyze UI images and output a STRUCTURED JSON specification that a non-vision AI model can use to generate exact code.

# CRITICAL: OUTPUT FORMAT
You MUST output valid JSON only. No markdown, no explanations, no extra text. Just pure JSON.

# JSON Schema

{
  "pageType": "landing|dashboard|form|auth|settings|profile|list|detail|error|other",
  "theme": {
    "mode": "light|dark",
    "primaryColor": "#hex",
    "backgroundColor": "#hex",
    "textColor": "#hex",
    "accentColor": "#hex"
  },
  "layout": {
    "type": "flex-col|flex-row|grid|absolute",
    "maxWidth": "string (e.g., 'max-w-7xl', '1200px')",
    "padding": "string (e.g., 'p-4', 'px-6 py-8')",
    "gap": "string (e.g., 'gap-4', 'space-y-6')",
    "alignment": "center|start|end|stretch"
  },
  "sections": [
    {
      "id": "unique-section-id",
      "type": "navbar|hero|features|cta|footer|sidebar|content|form|grid|list|modal|card-grid",
      "layout": {
        "type": "flex-col|flex-row|grid",
        "justify": "start|center|end|between|around",
        "align": "start|center|end|stretch",
        "gap": "string",
        "padding": "string",
        "margin": "string"
      },
      "style": {
        "background": "string (color or gradient)",
        "borderRadius": "string",
        "border": "string",
        "shadow": "string"
      },
      "children": [
        {
          "component": "heading|text|button|input|image|icon|card|link|badge|avatar|divider|spacer|container|list|nav-item|logo|form-field",
          "props": {},
          "className": "Tailwind classes string",
          "children": []
        }
      ]
    }
  ]
}

# Component Props Reference

## heading: { "level": 1-6, "text": "content", "className": "text-4xl font-bold" }
## text: { "text": "content", "variant": "body|caption|label|muted", "className": "text-base" }
## button: { "text": "Label", "variant": "primary|secondary|outline|ghost", "size": "sm|md|lg", "icon": "name|null", "className": "..." }
## input: { "type": "text|email|password|textarea|select", "placeholder": "...", "label": "...|null", "className": "..." }
## image: { "src": "description of image", "alt": "...", "aspectRatio": "16:9|4:3|1:1", "className": "..." }
## icon: { "name": "menu|search|close|arrow-right|check|user|settings", "size": "sm|md|lg", "className": "..." }
## card: { "variant": "default|elevated|outlined", "className": "...", "children": [] }
## badge: { "text": "...", "variant": "default|success|warning|error", "className": "..." }
## container: { "className": "flex items-center gap-4", "children": [] }

# Rules
1. Output ONLY valid JSON - no markdown, no explanations
2. Transcribe ALL visible text exactly
3. Use Tailwind classes for ALL styling
4. Build complete component tree with proper nesting
5. For icons, use descriptive names
6. For images, describe what they show

Analyze the image and output JSON now.`

// =============================================================================
// MODE: DEBUG - For bug reports, styling issues, visual problems
// =============================================================================
const DEBUG_PROMPT = `You are a UI Debugging Assistant. The user is showing you a screenshot of their app because something is wrong or needs fixing. Your job is to analyze the image and describe the issues you observe.

# Your Task
Carefully examine the screenshot and identify:

1. **Visual Issues**: What looks wrong, broken, or out of place?
   - Misaligned elements
   - Overlapping content
   - Incorrect spacing
   - Cut-off text or elements
   - Broken layouts

2. **Styling Problems**: What styling doesn't look right?
   - Color mismatches or inconsistencies
   - Font issues (wrong size, weight, or family)
   - Border/shadow problems
   - Background issues
   - Responsive/sizing issues

3. **UI/UX Concerns**: What hurts usability?
   - Hard to read text (contrast issues)
   - Unclear interactive elements
   - Confusing layout
   - Missing visual feedback

4. **Error Indicators**: Any visible errors?
   - Error messages in the UI
   - Console errors if visible
   - Loading states stuck
   - Empty states that shouldn't be empty

# Output Format
Provide a structured analysis:

## ISSUES IDENTIFIED

### Issue 1: [Brief title]
- **Location**: Where in the UI (top-left, navbar, card #2, etc.)
- **Problem**: What exactly is wrong
- **Expected**: What it should look like
- **Likely Cause**: Probable CSS/code issue (e.g., "missing flex-wrap", "z-index conflict")
- **Suggested Fix**: Specific code change (e.g., "add 'flex-wrap: wrap' to the container")

### Issue 2: [Brief title]
...

## ADDITIONAL OBSERVATIONS
- Any other things that look slightly off
- Potential improvements even if not bugs

Be specific about element locations and provide actionable fixes.`

// =============================================================================
// MODE: CONTEXT - General understanding, reference images, examples
// =============================================================================
const CONTEXT_PROMPT = `You are a Visual Context Analyzer. The user is sharing an image to give you context about what they're working on or what they want. Your job is to thoroughly describe what you see so a non-vision AI model can understand it.

# Analyze and Describe

## 1. Overview
- What type of content is this? (UI mockup, screenshot, diagram, example, inspiration, etc.)
- What is the main purpose or subject?

## 2. Visual Content
Describe everything you see in detail:
- Text content (transcribe exactly)
- Images and graphics
- UI elements (buttons, forms, cards, etc.)
- Layout and structure
- Colors and styling

## 3. Key Details
- Important information the user likely wants to reference
- Specific elements that stand out
- Any annotations, highlights, or indicators

## 4. Context Clues
- What might the user be trying to achieve?
- How does this relate to building/coding something?
- What aspects should the AI focus on?

## 5. Actionable Information
Summarize what a coding AI should know:
- Specific styles to match
- Functionality to implement
- Content to include
- Patterns to follow

Be thorough but organized. The goal is to give a non-vision AI everything it needs to understand this image.`

// =============================================================================
// MODE: AUTO - Detect intent from user message and choose appropriate mode
// =============================================================================
function detectMode(userMessage?: string): 'clone' | 'debug' | 'context' {
  if (!userMessage) return 'clone' // Default to clone for UI recreation

  const message = userMessage.toLowerCase()

  // Debug/issue keywords
  const debugKeywords = [
    'bug', 'issue', 'problem', 'wrong', 'broken', 'fix', 'error',
    'not working', 'doesnt work', "doesn't work", 'incorrect',
    'misalign', 'overflow', 'cut off', 'overlap', 'spacing',
    'color wrong', 'style issue', 'styling issue', 'looks off',
    'why is', 'why does', 'what happened', 'help me fix',
    'something wrong', 'messed up', 'weird', 'glitch'
  ]

  // Clone/build keywords
  const cloneKeywords = [
    'clone', 'copy', 'recreate', 'build this', 'make this',
    'create this', 'like this', 'same as', 'replicate',
    'implement this', 'code this', 'build like', 'design like',
    'match this', 'similar to'
  ]

  // Context/reference keywords
  const contextKeywords = [
    'example', 'reference', 'inspiration', 'show you', 'look at',
    'here is', "here's", 'this is', 'see this', 'check this',
    'screenshot of', 'image of', 'what do you think', 'feedback',
    'compare', 'versus', 'or this'
  ]

  // Check for debug intent
  for (const keyword of debugKeywords) {
    if (message.includes(keyword)) return 'debug'
  }

  // Check for clone intent
  for (const keyword of cloneKeywords) {
    if (message.includes(keyword)) return 'clone'
  }

  // Check for context intent
  for (const keyword of contextKeywords) {
    if (message.includes(keyword)) return 'context'
  }

  // Default to clone for UI-focused platform
  return 'clone'
}

// =============================================================================
// API HANDLER
// =============================================================================
export async function POST(request: NextRequest) {
  try {
    const { image, prompt, mode, userMessage } = await request.json()

    if (!image) {
      return NextResponse.json(
        { error: 'Image is required' },
        { status: 400 }
      )
    }

    // Determine mode: explicit mode > auto-detect from userMessage > default to clone
    const effectiveMode = mode || detectMode(userMessage)
    console.log(`[describe-image] Mode: ${effectiveMode}, userMessage: "${userMessage?.slice(0, 50)}..."`)

    // Select prompt based on mode
    let systemPrompt: string
    switch (effectiveMode) {
      case 'debug':
        systemPrompt = DEBUG_PROMPT
        break
      case 'context':
        systemPrompt = CONTEXT_PROMPT
        break
      case 'clone':
      case 'structured': // Backwards compatibility
      default:
        systemPrompt = CLONE_PROMPT
        break
    }

    // If custom prompt provided, append user context
    if (userMessage && effectiveMode !== 'clone') {
      systemPrompt = `${systemPrompt}\n\n# USER'S MESSAGE\nThe user said: "${userMessage}"\n\nKeep this context in mind when analyzing the image.`
    }

    // Use custom prompt if explicitly provided (overrides everything)
    if (prompt) {
      systemPrompt = prompt
    }

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
      temperature: effectiveMode === 'clone' ? 0.2 : 0.4,
    })

    // For clone mode, try to parse JSON
    if ((effectiveMode === 'clone' || effectiveMode === 'structured') && !prompt) {
      try {
        let jsonText = result.text.trim()

        // Remove markdown code block wrapper if present
        if (jsonText.startsWith('```json')) {
          jsonText = jsonText.slice(7)
        } else if (jsonText.startsWith('```')) {
          jsonText = jsonText.slice(3)
        }
        if (jsonText.endsWith('```')) {
          jsonText = jsonText.slice(0, -3)
        }
        jsonText = jsonText.trim()

        const parsed = JSON.parse(jsonText)

        return NextResponse.json({
          success: true,
          mode: 'clone',
          specification: parsed,
          raw: jsonText,
        })
      } catch (parseError) {
        console.warn('Failed to parse clone output as JSON:', parseError)
        return NextResponse.json({
          success: true,
          mode: 'clone',
          parseError: true,
          raw: result.text,
          description: result.text,
        })
      }
    }

    // For debug and context modes, return text directly
    return NextResponse.json({
      success: true,
      mode: effectiveMode,
      description: result.text,
    })
  } catch (error) {
    console.error('Error describing image:', error)
    return NextResponse.json(
      { error: 'Failed to describe image', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
