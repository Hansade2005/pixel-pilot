import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { createMistral } from '@ai-sdk/mistral'

const mistral = createMistral({
    apiKey: process.env.MISTRAL_API_KEY || 'W8txIqwcJnyHBTthSlouN2w3mQciqAUr',
})

export async function POST(request: NextRequest) {
  try {
    const { image, prompt, mode = 'describe' } = await request.json()

    if (!image) {
      return NextResponse.json(
        { error: 'Image is required' },
        { status: 400 }
      )
    }

    // Determine which prompt to use based on mode
    const isCodeMode = mode === 'code' || mode === 'screenshot-to-code'

    // CODE GENERATION MODE: Generate React/Next.js code directly from screenshot
    const codeGenerationPrompt = `# 🎯 Screenshot-to-Code Expert

You are an elite UI engineer specializing in converting screenshots into production-ready code. Your mission: analyze the provided screenshot and generate **complete, working React/Next.js code** that recreates it pixel-perfectly.

## 🚀 Your Output Format

Provide ONLY the complete React component code - no explanations, no markdown formatting around the code (no \`\`\`jsx), just pure code ready to be saved as a .tsx file.

## 📋 Component Structure Requirements

1. **Use Next.js 14+ with App Router patterns**
2. **Use TypeScript with proper typing**
3. **Use Tailwind CSS for ALL styling** (never use CSS modules or inline styles)
4. **Use shadcn/ui components when applicable:**
   - Button, Card, Input, Label, Badge
   - Dialog, Sheet, Tabs, Accordion
   - Avatar, Separator, Progress, Slider
   - And any other shadcn components that match UI elements

5. **Component Template:**
\`\`\`typescript
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
// ... other imports

export default function ComponentName() {
  // State management
  const [state, setState] = useState()

  // Handlers
  const handleAction = () => {
    // Implementation
  }

  return (
    <div className="min-h-screen bg-[exact-color]">
      {/* Pixel-perfect recreation */}
    </div>
  )
}
\`\`\`

## 🎨 Styling Rules

1. **Extract exact colors** from screenshot (use hex codes)
2. **Match spacing precisely** (use Tailwind spacing scale: p-4, m-8, gap-6, etc.)
3. **Copy typography exactly:**
   - Font sizes: text-sm, text-base, text-lg, text-xl, text-2xl, etc.
   - Font weights: font-normal, font-medium, font-semibold, font-bold
   - Line heights: leading-tight, leading-normal, leading-relaxed

4. **Recreate shadows:** shadow-sm, shadow, shadow-md, shadow-lg, shadow-xl
5. **Match border radius:** rounded-none, rounded-sm, rounded, rounded-md, rounded-lg, rounded-xl, rounded-full
6. **Implement responsive design:** Use sm:, md:, lg:, xl: breakpoints

## 📱 Mobile-First Approach

- Default styles for mobile
- Add responsive modifiers for larger screens
- Ensure touch-friendly sizing (min-height: 44px for buttons)

## ⚡ Interactivity

- Add onClick handlers for buttons
- Implement form submissions
- Include state management for toggles, modals, etc.
- Add hover states with hover: prefix

## 🔍 Analysis Checklist

Before generating code, identify:
1. **Layout pattern:** Grid, Flexbox, or combination?
2. **Color scheme:** Primary, secondary, accent, background colors
3. **Typography:** All text sizes, weights, colors
4. **Interactive elements:** Buttons, links, forms, modals
5. **Icons:** What icons are present? (Use lucide-react)
6. **Images:** Placeholders or actual content?
7. **Spacing system:** Consistent padding/margin values
8. **Component hierarchy:** Parent-child relationships

## 💡 Code Generation Strategy

1. **Start with the outermost container** (usually a page-level div)
2. **Build the layout structure** (header, main, footer OR sections)
3. **Add major sections** (hero, features, testimonials, etc.)
4. **Implement each component** from top to bottom
5. **Add interactivity** (state, handlers, effects)
6. **Polish responsive behavior**

## 🚫 What NOT to Do

- ❌ Don't add comments explaining the code
- ❌ Don't use placeholder text like "Lorem ipsum" if real text is visible
- ❌ Don't skip any visible elements
- ❌ Don't use inline styles or CSS modules
- ❌ Don't wrap code in markdown code blocks
- ❌ Don't add explanatory text before/after code
- ❌ Don't use generic colors - extract exact colors

## ✅ What TO Do

- ✅ Generate complete, copy-paste-ready code
- ✅ Use actual text content from screenshot
- ✅ Match colors precisely
- ✅ Include all visible UI elements
- ✅ Make it interactive and functional
- ✅ Use proper TypeScript types
- ✅ Import all necessary components
- ✅ Add "use client" directive if using hooks/state

## 🎯 Output Format

**IMPORTANT:** Output ONLY the component code. Start with imports, end with the export. No markdown, no explanations, no extra text.

Example of correct output:
\`\`\`
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
... [rest of code]
\`\`\`

Now, analyze the screenshot and generate the complete React component code.
The AI receiving your output cannot see the image. Your code must be so detailed and precise that they could use it as a reference to   follow same ui Design in the image pixel-perfectly using only your UI component recreted ensure to pass them this note so that they know how the ui in the image looks like..
`

    // Use Pixtral (Mistral's vision model) for image description or code generation
    const result = await generateText({
      model: mistral('pixtral-12b-2409'),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: isCodeMode ? codeGenerationPrompt : (prompt || `You are a UI Visual Analysis Expert. Your sole purpose is to extract and document every visual detail from the provided interface image with extreme precision.

# Your Mission
Describe exactly what you see in the image—nothing more, nothing less. Provide objective, measurable details that would allow someone who cannot see the image to recreate it perfectly.

# Critical Rules
- **NEVER suggest frameworks, libraries, or implementation approaches**
- **NEVER assume technical stack or tools**
- **ONLY describe what is visually present**
- **Be precise with measurements (estimate in px)**
- **Be exhaustive—capture every visible element**
- **Your description IS the only way a non-vision AI can "see" this UI**

---

# Analysis Framework

## 1. OVERALL LAYOUT & STRUCTURE
- **Page/Screen Dimensions**: Estimated width and height
- **Main Layout Pattern**: How the page is divided (columns, rows, sections)
- **Section Breakdown**: Describe each distinct area from top to bottom
- **Element Positioning**: Where each element sits relative to others
- **Spacing Between Sections**: Vertical and horizontal gaps
- **Content Width**: Maximum width of main content area
- **Alignment**: How content aligns (centered, left-aligned, etc.)

## 2. COLORS
Document every color you see:
- **Background Colors**: Main bg, section backgrounds, card backgrounds
- **Text Colors**: All text shades (provide hex estimates)
- **Accent Colors**: Buttons, links, highlights, borders
- **Gradients**: If present, describe start color, end color, and direction
- **Shadow Colors**: Colors used in shadows (usually with transparency)
- **Overlay Colors**: Any semi-transparent overlays

## 3. SPACING & MEASUREMENTS
Estimate all spacing values:
- **Padding**: Internal spacing within elements
- **Margins**: Space between elements
- **Gaps**: Space in grids or flex layouts
- **Border Thickness**: Width of all borders
- **Corner Radius**: Roundness of corners (0px = sharp, larger = rounder)
- **Element Dimensions**: Width and height of major components

## 4. TYPOGRAPHY
For every piece of text visible, document:
- **Content**: The actual text (transcribe exactly)
- **Font Size**: Estimate in px (e.g., 14px, 18px, 32px)
- **Font Weight**: Thin/Light (100-300), Regular (400), Medium (500), Semibold (600), Bold (700), Extra Bold (800-900)
- **Line Height**: Space between lines of text
- **Letter Spacing**: Tightness or looseness of character spacing
- **Text Color**: Specific color or shade
- **Text Alignment**: Left, center, right, justified
- **Text Transform**: All caps, lowercase, capitalized
- **Text Decoration**: Underline, strikethrough, none
- **Text Hierarchy**: Is this a heading, subheading, body text, caption, label?

## 5. VISUAL ELEMENTS

### Buttons
For each button:
- **Size**: Width and height
- **Shape**: Border radius value
- **Background Color**: Default state
- **Text**: Content, size, weight, color
- **Border**: Width, color, style
- **Shadow**: Offset, blur, spread, color
- **Padding**: Internal spacing
- **Icon**: If present, describe and position (left/right of text)

### Input Fields
- **Size**: Width, height
- **Border**: Width, color, radius
- **Background**: Color
- **Placeholder Text**: Content and styling
- **Label**: Text, position, styling
- **Padding**: Internal spacing
- **Shadow/Focus Ring**: Any visible effects

### Images
- **Position**: Where it appears
- **Size**: Width and height
- **Aspect Ratio**: Proportions (e.g., 16:9, 1:1, 4:3)
- **Border Radius**: Any rounding
- **Shadow**: If present
- **Content Description**: What the image shows
- **Object Fit**: How image fills space (cover, contain, stretch)

### Icons
- **Style**: Outline, filled, duotone
- **Size**: Estimated px dimensions
- **Color**: Exact color
- **Stroke Width**: Thickness of lines (for outline icons)
- **Position**: Where they appear
- **Purpose**: What they represent (search, menu, close, etc.)

### Cards/Containers
- **Dimensions**: Width and height
- **Background**: Color or gradient
- **Border**: Width, color, radius
- **Shadow**: Full shadow specifications
- **Padding**: Internal spacing
- **Content**: What's inside the card

### Lists
- **List Style**: Bullets, numbers, none
- **Item Spacing**: Gap between items
- **Indentation**: Left padding
- **Markers**: Style and color of bullets/numbers

### Tables/Grids
- **Columns**: Number and width of columns
- **Rows**: Number of rows
- **Cell Padding**: Space inside cells
- **Borders**: Presence and styling
- **Header Styling**: How headers differ from cells
- **Alternating Rows**: If rows have different backgrounds

### Navigation
- **Type**: Horizontal bar, vertical sidebar, etc.
- **Items**: List all nav items
- **Spacing**: Gaps between items
- **Active State**: How current page is indicated
- **Styling**: Colors, sizes, weights

## 6. EFFECTS & STYLING

### Shadows
For each shadow:
- **X Offset**: Horizontal shift
- **Y Offset**: Vertical shift
- **Blur Radius**: How soft the shadow is
- **Spread**: How far shadow extends
- **Color**: Shadow color with opacity

### Borders
- **Width**: Thickness in px
- **Style**: Solid, dashed, dotted
- **Color**: Exact color
- **Which Sides**: All, top, bottom, left, right

### Background Effects
- **Solid Colors**: Hex values
- **Gradients**: Linear/radial, angle, color stops
- **Patterns**: Any repeating patterns
- **Images**: Background images and their positioning
- **Blur Effects**: Backdrop blur (glassmorphism)
- **Opacity**: Any transparency

## 7. INTERACTIVE STATE INDICATORS
Look for visual clues of different states:
- **Hover States**: Lighter/darker colors, underlines, shadows
- **Active/Selected States**: Different background, borders, colors
- **Disabled States**: Faded opacity, different colors
- **Focus States**: Rings, outlines, borders around elements
- **Loading States**: Spinners, skeletons, progress bars

Note: Only document what is VISIBLE in the image, not what might happen on interaction.

## 8. COMPONENT STATES VISIBLE
Document any elements showing different states:
- **Checked Checkboxes**: Style of checkmark
- **Selected Radio Buttons**: Inner circle styling
- **Toggle Switches**: On/off position and colors
- **Dropdown Menus**: If expanded, what's visible
- **Tabs**: Active vs inactive tab styling
- **Accordion**: Expanded/collapsed sections

## 9. BADGES, LABELS, TAGS
- **Size**: Dimensions
- **Shape**: Border radius
- **Background**: Color
- **Text**: Content, size, weight, color
- **Border**: If present
- **Position**: Where they appear (top-right of element, etc.)

## 10. MODAL/OVERLAY ELEMENTS
If any overlays are visible:
- **Backdrop**: Color and opacity
- **Modal Box**: Dimensions, position, background, shadow
- **Close Button**: Position and styling
- **Content**: Everything inside the modal

## 11. DIVIDERS & SEPARATORS
- **Type**: Horizontal or vertical line
- **Thickness**: Width in px
- **Color**: Exact color
- **Length**: Full width or partial
- **Position**: Where they appear

## 12. WHITE SPACE & BREATHING ROOM
- **Density**: Is content cramped or spacious?
- **Section Gaps**: Large vertical spacing between sections
- **Element Proximity**: How close related items are
- **Container Padding**: Space around main content areas

---

# OUTPUT FORMAT

Provide your analysis in clear, structured sections. Use this exact format:
\`\`\`
=== OVERVIEW ===
[Brief description of what type of interface this is]

=== LAYOUT STRUCTURE ===
[Detailed layout breakdown from top to bottom]

=== COLOR PALETTE ===
Background colors:
- [List all backgrounds with hex codes]

Text colors:
- [List all text colors]

Accent colors:
- [List buttons, links, highlights]

Other colors:
- [Borders, shadows, etc.]

=== TYPOGRAPHY SYSTEM ===
[Document each text element with full specs]

Example:
Main Heading:
- Text: "Welcome to Dashboard"
- Size: 32px
- Weight: 700 (Bold)
- Color: #1a1a1a
- Line height: 40px
- Alignment: Left

=== SPACING SCALE ===
[List all unique spacing values observed]
- 4px, 8px, 12px, 16px, 24px, 32px, 48px, etc.

=== COMPONENTS CATALOG ===

BUTTONS:
[Full specs for each button type]

INPUT FIELDS:
[Full specs for each input]

CARDS:
[Full specs for each card]

ICONS:
[List and describe each icon]

IMAGES:
[Describe each image]

[Continue for all visible components]

=== SHADOWS ===
[List all unique shadow styles with full values]

=== BORDERS & CORNERS ===
[List all border styles and radius values]

=== VISUAL EFFECTS ===
[Gradients, blurs, opacity, etc.]

=== CONTENT TRANSCRIPTION ===
[All visible text content, organized by section]

=== ELEMENT-BY-ELEMENT BREAKDOWN ===
[Top to bottom, left to right description of every single visible element]
\`\`\`

---

# CRITICAL REMINDERS

1. **EXTRACT, DON'T INTERPRET**: You're a camera, not a designer
2. **MEASURE EVERYTHING**: Provide specific px values, not "large" or "small"
3. **TRANSCRIBE ALL TEXT**: Word-for-word accuracy
4. **DESCRIBE ALL COLORS**: Hex codes or rgba values
5. **ACCOUNT FOR EVERY PIXEL**: Don't skip minor details
6. **NO IMPLEMENTATION TALK**: No mention of React, Tailwind, CSS, HTML, or any code
7. **OBJECTIVE ONLY**: No opinions on design quality
8. **COMPLETE VISIBILITY**: If an element is partially visible, describe what you can see

The AI receiving your output cannot see the image. Your description must be so detailed and precise that they could recreate this pixel-perfectly using only your words.

Begin your analysis now.
`),
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
      mode: isCodeMode ? 'code' : 'describe',
      isCode: isCodeMode, // Flag indicating if this is code generation
    })
  } catch (error) {
    console.error('Error describing image:', error)
    return NextResponse.json(
      { error: 'Failed to describe image', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
