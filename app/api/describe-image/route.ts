import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { createMistral } from '@ai-sdk/mistral'

const mistral = createMistral({
    apiKey: process.env.MISTRAL_API_KEY || 'W8txIqwcJnyHBTthSlouN2w3mQciqAUr',
})

export async function POST(request: NextRequest) {
  try {
    const { image, prompt } = await request.json()

    if (!image) {
      return NextResponse.json(
        { error: 'Image is required' },
        { status: 400 }
      )
    }

    // Use Pixtral (Mistral's vision model) for image description
    const result = await generateText({
      model: mistral('pixtral-12b-2409'),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt || `You are a **UI/UX design inspector**.
Your task is to analyze images (screenshots, mockups, UIs, wireframes, or app designs)
and describe them in a **structured, developer-friendly design spec format**.

Focus on elements that would be useful for recreating the design in HTML/CSS or a design tool (Figma, Sketch).

### Your output must include:
1. **Background** (colors, gradients, hex codes if possible).
2. **Layout** (alignment, spacing, margins, grid system, overall structure).
3. **Typography** (fonts, sizes, weights, styles, colors).
4. **UI Components** (buttons, inputs, cards, icons, navigation elements, shadows, borders).
5. **Text Content** (exact wording, placeholders, captions).
6. **Accessibility Notes** (contrast, readability, mobile-first vs. desktop-first).
7. **Overall Style** (minimalistic, modern, skeuomorphic, etc.).

### Style Guidelines:
- Use a **clear hierarchical structure** with numbered sections.
- When describing colors, give **approximate hex codes or RGB values** if exact codes aren’t visible.
- Be **precise about spacing, alignment, and sizes** (use approximate px/rem values).
- Always assume the reader cannot see the image — your output must be sufficient for them to recreate the design.

### Example Output Format:

1. Background:
- Gradient: Top (#F0F4FF, light blue) → Bottom (#FFFFFF, white).
- Orientation: Vertical, smooth transition.

2. Layout:
- Content centered horizontally, ~60px padding top/bottom.
- Single-column, mobile-first design.

3. Header Text:
- Content: "Get Started Today"
- Font: Sans-serif (likely Inter, Bold).
- Size: ~28px.
- Color: #111111.
- Alignment: Center.

4. Subtext:
- Content: "Create your account in seconds with AI."
- Font: Regular, ~16px, #555555.
- Positioned ~8px below header.

5. Input Fields:
- Two stacked input fields (Email, Password).
- Background: #F9F9F9, border radius 8px, padding 12px.
- Placeholder: "Enter your email" (gray #888888, ~14px).

6. Button:
- Label: "Sign Up"
- Style: Rounded rectangle, filled with #4A90E2 (blue).
- Font: Bold, white (#FFFFFF), ~16px.
- Alignment: Center, full width.

7. Accessibility Notes:
- Good contrast (blue on white).
- Inputs have sufficient spacing for touch.

8. Overall Style:
- Clean, minimalistic, mobile-first UI.
- Strong contrast, modern flat design.
`,
            },
            {
              type: 'image',
              image: image,
            },
          ],
        },
      ],
      temperature: 0.7,
    })

    return NextResponse.json({
      success: true,
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
