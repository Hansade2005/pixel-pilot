import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { createMistral } from '@ai-sdk/mistral'

const mistral = createMistral({
  apiKey: process.env.MISTRAL_API_KEY || 'W8txIqwcJnyHBTthSlouN2w3mQciqAUr',
})

// Structured prompt that outputs JSON for code generation
const STRUCTURED_UI_PROMPT = `You are a UI-to-Code Translation Engine. Your job is to analyze UI images and output a STRUCTURED JSON specification that a non-vision AI model can use to generate exact code.

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
          "props": {
            // Component-specific props
          },
          "className": "Tailwind classes string",
          "children": []
        }
      ]
    }
  ]
}

# Component Props Reference

## heading
{
  "level": 1-6,
  "text": "actual text content",
  "className": "text-4xl font-bold text-gray-900"
}

## text
{
  "text": "actual text content",
  "variant": "body|caption|label|muted",
  "className": "text-base text-gray-600"
}

## button
{
  "text": "Button Text",
  "variant": "primary|secondary|outline|ghost|destructive|link",
  "size": "sm|md|lg|xl",
  "icon": "icon-name or null",
  "iconPosition": "left|right",
  "className": "bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
}

## input
{
  "type": "text|email|password|number|search|textarea|select",
  "placeholder": "Placeholder text",
  "label": "Label text or null",
  "className": "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
}

## image
{
  "src": "describe what the image shows",
  "alt": "alt text",
  "aspectRatio": "16:9|4:3|1:1|auto",
  "objectFit": "cover|contain|fill",
  "className": "w-full h-64 rounded-lg object-cover"
}

## icon
{
  "name": "descriptive-icon-name (e.g., menu, search, close, arrow-right, check, user, settings)",
  "size": "sm|md|lg",
  "className": "w-6 h-6 text-gray-500"
}

## card
{
  "variant": "default|elevated|outlined|ghost",
  "className": "bg-white rounded-xl shadow-lg p-6",
  "children": []
}

## link
{
  "text": "Link text",
  "href": "#",
  "className": "text-blue-600 hover:text-blue-800 hover:underline"
}

## badge
{
  "text": "Badge text",
  "variant": "default|success|warning|error|info",
  "className": "px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium"
}

## avatar
{
  "src": "describe avatar image",
  "fallback": "initials like JD",
  "size": "sm|md|lg|xl",
  "className": "w-12 h-12 rounded-full"
}

## divider
{
  "orientation": "horizontal|vertical",
  "className": "border-t border-gray-200 my-8"
}

## container
{
  "className": "flex items-center gap-4",
  "children": []
}

## nav-item
{
  "text": "Nav Item",
  "href": "#",
  "active": true|false,
  "icon": "icon-name or null",
  "className": "px-4 py-2 text-gray-700 hover:text-gray-900"
}

## logo
{
  "text": "Brand Name",
  "icon": "logo description or null",
  "className": "text-2xl font-bold"
}

## form-field
{
  "label": "Field Label",
  "type": "text|email|password|textarea|select|checkbox|radio",
  "placeholder": "placeholder",
  "required": true|false,
  "options": ["option1", "option2"] // for select/radio
}

# Translation Rules

1. ANALYZE THE LAYOUT FIRST
   - Is it a single column? Use flex-col
   - Multiple columns? Use grid with appropriate cols
   - Horizontal alignment? Use flex-row with justify-between

2. IDENTIFY SECTIONS
   - Navbar is always at top
   - Hero sections have big headings and CTAs
   - Feature grids show multiple cards
   - Footers have links and copyright

3. EXTRACT EXACT TEXT
   - Transcribe all visible text word-for-word
   - Don't paraphrase or summarize

4. MATCH COLORS TO TAILWIND
   - Use closest Tailwind color (blue-600, gray-900, etc.)
   - For exact colors, use arbitrary values [#hex]

5. ESTIMATE SPACING
   - Small gaps: gap-2, gap-4
   - Medium: gap-6, gap-8
   - Large: gap-12, gap-16

6. DETECT COMPONENT PATTERNS
   - Button with arrow = button with icon right
   - Input with label above = form-field
   - Image with overlay text = card with background image
   - Icon + text = container with icon and text children

# Example Output

{
  "pageType": "landing",
  "theme": {
    "mode": "light",
    "primaryColor": "#2563eb",
    "backgroundColor": "#ffffff",
    "textColor": "#111827",
    "accentColor": "#3b82f6"
  },
  "layout": {
    "type": "flex-col",
    "maxWidth": "max-w-7xl",
    "padding": "px-4",
    "gap": "gap-0",
    "alignment": "center"
  },
  "sections": [
    {
      "id": "navbar",
      "type": "navbar",
      "layout": {
        "type": "flex-row",
        "justify": "between",
        "align": "center",
        "padding": "px-6 py-4"
      },
      "style": {
        "background": "bg-white",
        "border": "border-b border-gray-200"
      },
      "children": [
        {
          "component": "logo",
          "props": {
            "text": "Acme",
            "className": "text-2xl font-bold text-gray-900"
          }
        },
        {
          "component": "container",
          "props": {
            "className": "flex items-center gap-8"
          },
          "children": [
            {
              "component": "nav-item",
              "props": {
                "text": "Features",
                "active": false,
                "className": "text-gray-600 hover:text-gray-900"
              }
            },
            {
              "component": "nav-item",
              "props": {
                "text": "Pricing",
                "active": false,
                "className": "text-gray-600 hover:text-gray-900"
              }
            },
            {
              "component": "button",
              "props": {
                "text": "Get Started",
                "variant": "primary",
                "className": "bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700"
              }
            }
          ]
        }
      ]
    },
    {
      "id": "hero",
      "type": "hero",
      "layout": {
        "type": "flex-col",
        "align": "center",
        "gap": "gap-6",
        "padding": "py-24 px-4"
      },
      "style": {
        "background": "bg-gradient-to-b from-blue-50 to-white"
      },
      "children": [
        {
          "component": "badge",
          "props": {
            "text": "New Release",
            "className": "px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
          }
        },
        {
          "component": "heading",
          "props": {
            "level": 1,
            "text": "Build faster with AI",
            "className": "text-5xl font-bold text-gray-900 text-center max-w-3xl"
          }
        },
        {
          "component": "text",
          "props": {
            "text": "The most advanced AI-powered development platform.",
            "className": "text-xl text-gray-600 text-center max-w-2xl"
          }
        },
        {
          "component": "container",
          "props": {
            "className": "flex items-center gap-4 mt-4"
          },
          "children": [
            {
              "component": "button",
              "props": {
                "text": "Start Free Trial",
                "variant": "primary",
                "className": "bg-blue-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-blue-700 shadow-lg"
              }
            },
            {
              "component": "button",
              "props": {
                "text": "Watch Demo",
                "variant": "outline",
                "icon": "play",
                "iconPosition": "left",
                "className": "border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-xl font-semibold text-lg hover:border-gray-400"
              }
            }
          ]
        }
      ]
    }
  ]
}

# CRITICAL INSTRUCTIONS

1. Output ONLY valid JSON - no markdown code blocks, no explanations
2. Transcribe ALL visible text exactly as shown
3. Use Tailwind classes for ALL styling
4. Build a complete component tree - every element must be represented
5. Nest children properly - maintain the visual hierarchy
6. Be exhaustive - don't skip any visible elements
7. For icons, use descriptive names (menu, search, arrow-right, check, x, etc.)
8. For images, describe what they show in the "src" field

Analyze the provided image and output the JSON specification now.`

// Simpler prompt for quick descriptions
const QUICK_DESCRIPTION_PROMPT = `Analyze this UI image and provide a brief structured description:

1. **Page Type**: What kind of page is this? (landing, dashboard, form, etc.)
2. **Main Sections**: List the major sections from top to bottom
3. **Key Components**: List the main UI components visible (buttons, cards, inputs, etc.)
4. **Color Scheme**: Primary colors used
5. **Layout Style**: How is the content organized?

Keep it concise but complete.`

export async function POST(request: NextRequest) {
  try {
    const { image, prompt, mode = 'structured' } = await request.json()

    if (!image) {
      return NextResponse.json(
        { error: 'Image is required' },
        { status: 400 }
      )
    }

    // Choose prompt based on mode
    const systemPrompt = mode === 'quick'
      ? QUICK_DESCRIPTION_PROMPT
      : (prompt || STRUCTURED_UI_PROMPT)

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
      temperature: 0.3, // Lower temperature for more consistent structured output
    })

    // For structured mode, try to parse and validate the JSON
    if (mode === 'structured' && !prompt) {
      try {
        // Clean up the response - remove any markdown code blocks if present
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

        // Try to parse to validate it's proper JSON
        const parsed = JSON.parse(jsonText)

        return NextResponse.json({
          success: true,
          mode: 'structured',
          specification: parsed,
          raw: jsonText,
        })
      } catch (parseError) {
        // If JSON parsing fails, return raw text with error flag
        console.warn('Failed to parse structured output as JSON:', parseError)
        return NextResponse.json({
          success: true,
          mode: 'structured',
          parseError: true,
          raw: result.text,
          description: result.text,
        })
      }
    }

    // For quick mode or custom prompts, return text directly
    return NextResponse.json({
      success: true,
      mode: mode,
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
