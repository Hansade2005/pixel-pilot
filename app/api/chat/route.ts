import { streamText, generateText, tool, stepCountIs } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { getModel } from '@/lib/ai-providers'
import { DEFAULT_CHAT_MODEL, getModelById } from '@/lib/ai-models'

// Use Node.js runtime for full IndexedDB and file system access
// export const runtime = 'edge' // Removed: Edge runtime doesn't support IndexedDB

// Get AI model by ID with fallback to default
const getAIModel = (modelId?: string) => {
  try {
    const selectedModelId = modelId || DEFAULT_CHAT_MODEL
    const modelInfo = getModelById(selectedModelId)
    
    if (!modelInfo) {
      console.warn(`Model ${selectedModelId} not found, using default: ${DEFAULT_CHAT_MODEL}`)
      return getModel(DEFAULT_CHAT_MODEL)
    }
    
    console.log(`Using AI model: ${modelInfo.name} (${modelInfo.provider})`)
    return getModel(selectedModelId)
  } catch (error) {
    console.error('Failed to get AI model:', error)
    console.log(`Falling back to default model: ${DEFAULT_CHAT_MODEL}`)
    return getModel(DEFAULT_CHAT_MODEL)
  }
}



// File operation tools using storage manager
async function executeWriteFile(projectId: string, path: string, content: string, userId: string, storageManager: any) {
  try {
    // Check if file already exists
    const existingFile = await storageManager.getFile(projectId, path)

    if (existingFile) {
      // Update existing file
      await storageManager.updateFile(projectId, path, { content })
      return { success: true, message: `File ${path} updated successfully.` }
    } else {
      // Create new file
      const newFile = {
        workspaceId: projectId,
        name: path.split('/').pop() || path,
        path,
        content,
        fileType: path.split('.').pop() || 'text',
        type: path.split('.').pop() || 'text',
        size: content.length,
        isDirectory: false
      }
      
      await storageManager.createFile(newFile)
      return { success: true, message: `File ${path} created successfully.` }
    }
  } catch (error) {
    return { success: false, error: `Error creating file: ${error}` }
  }
}



async function executeReadFile(projectId: string, path: string, userId: string, storageManager: any) {
  try {
    const file = await storageManager.getFile(projectId, path)

    if (!file) {
      return { success: false, error: `File not found: ${path}` }
    }

    return { 
      success: true, 
      content: file.content || '', 
      name: file.name,
      type: file.type,
      message: `File read: ${path}` 
    }
  } catch (error) {
    return { success: false, error: `Failed to read file: ${error}` }
  }
}

async function executeListFiles(projectId: string, userId: string, storageManager: any) {
  try {
    const files = await storageManager.getFiles(projectId)

    return { 
      success: true, 
      files: files.map((file: any) => ({
        path: file.path,
        name: file.name,
        type: file.type,
        created_at: file.createdAt
      })), 
      message: `Found ${files.length} files in project` 
    }
  } catch (error) {
    return { success: false, error: `Failed to list files: ${error}` }
  }
}

async function executeDeleteFile(projectId: string, path: string, userId: string, storageManager: any) {
  try {
    await storageManager.deleteFile(projectId, path)

    return { success: true, message: `File deleted: ${path}` }
  } catch (error) {
    return { success: false, error: `Failed to delete file: ${error}` }
  }
}

// Helper function to create file operation tools based on AI mode
function createFileOperationTools(projectId: string, aiMode: 'ask' | 'agent' = 'agent') {
  const tools: any = {}
  
  // Tool Results Summary - available in both modes for comprehensive reporting
  tools.tool_results_summary = tool({
    description: 'Generate comprehensive summaries for introductions (what will be done) or completions (what was accomplished)',
    inputSchema: z.object({
      phase: z.enum(['introduction', 'completion']).describe('Whether this is an introduction (before work) or completion (after work) summary'),
      session_title: z.string().describe('Brief title describing this development session'),
      changes: z.array(z.object({
        type: z.enum(['created', 'modified', 'deleted', 'analyzed', 'planned']),
        file: z.string().describe('File path that was/will be affected'),
        description: z.string().describe('What was/will be changed or analyzed'),
        impact: z.enum(['high', 'medium', 'low']).describe('Impact level of the change')
      })).describe('List of all changes made/planned during this session'),
      features_implemented: z.array(z.string()).describe('List of features that were implemented or will be implemented'),
      suggestions: z.array(z.object({
        category: z.enum(['performance', 'security', 'ui_ux', 'functionality', 'maintenance', 'accessibility', 'question', 'clarification']),
        title: z.string().describe('Brief title of the suggestion or question'),
        description: z.string().describe('Detailed description of the suggestion, question, or discussion point'),
        priority: z.enum(['high', 'medium', 'low']).describe('Priority level')
      })).describe('Enhancement suggestions, questions, or discussion points'),
      next_steps: z.array(z.string()).describe('Recommended next steps or planned actions'),
      project_status: z.object({
        health: z.enum(['excellent', 'good', 'needs_attention', 'critical']),
        completeness: z.number().min(0).max(100).describe('Project completeness percentage'),
        notes: z.string().describe('Additional notes about project status')
      }).describe('Current project status assessment')
    }),
    execute: async ({ phase, session_title, changes, features_implemented, suggestions, next_steps, project_status }, { abortSignal, toolCallId }) => {
      if (abortSignal?.aborted) {
        throw new Error('Operation cancelled')
      }
      
      // Generate timestamp for the summary
      const timestamp = new Date().toISOString()
      const isIntroduction = phase === 'introduction'
      
      // Create comprehensive markdown summary based on phase
      let summary = `# ${isIntroduction ? 'Development Session Plan' : 'Development Session Summary'}\n\n`
      summary += `**${session_title}**  \n`
      summary += `*${isIntroduction ? 'Planning Phase' : 'Completion Report'} - ${new Date().toLocaleString()}*\n\n`
      
      if (isIntroduction) {
        summary += `## What I Will Do\n\n`
        if (changes.length > 0) {
          changes.forEach(change => {
            const actionName = change.type === 'planned' ? 'Will Plan' : change.type.charAt(0).toUpperCase() + change.type.slice(1)
            summary += `### ${actionName}: \`${change.file}\`\n`
            summary += `- **Impact:** ${change.impact.toUpperCase()}\n`
            summary += `- **Description:** ${change.description}\n\n`
          })
        } else {
          summary += `- I will assess the current project state and determine the best approach\n\n`
        }
        
        summary += `## Planned Features\n\n`
        if (features_implemented.length > 0) {
          features_implemented.forEach(feature => {
            summary += `- ${feature}\n`
          })
        } else {
          summary += `- No specific features planned yet - will determine based on analysis\n`
        }
      } else {
        summary += `## Changes Completed (${changes.length} total)\n\n`
        changes.forEach(change => {
          summary += `### ${change.type.charAt(0).toUpperCase() + change.type.slice(1)}: \`${change.file}\`\n`
          summary += `- **Impact:** ${change.impact.toUpperCase()}\n`
          summary += `- **Description:** ${change.description}\n\n`
        })
        
        summary += `## Features Implemented\n\n`
        if (features_implemented.length > 0) {
          features_implemented.forEach(feature => {
            summary += `- ${feature}\n`
          })
        } else {
          summary += `- No new features implemented in this session\n`
        }
      }
      
      summary += `\n## ${isIntroduction ? 'Questions & Clarifications' : 'Follow-up Discussions & Suggestions'}\n\n`
      if (suggestions.length > 0) {
        suggestions.forEach(suggestion => {
          const questionType = ['question', 'clarification'].includes(suggestion.category) ? 'Question' : 'Description'
          summary += `### ${suggestion.title}\n`
          summary += `**Category:** ${suggestion.category.replace('_', ' ').toUpperCase()}  \n`
          summary += `**Priority:** ${suggestion.priority.toUpperCase()}  \n`
          summary += `**${questionType}:** ${suggestion.description}\n\n`
        })
      } else {
        summary += isIntroduction ? '- No specific questions at this time\n' : '- No specific suggestions at this time - project looks good!\n'
      }
      
      summary += `\n## ${isIntroduction ? 'Planned Next Steps' : 'Recommended Next Steps'}\n\n`
      if (next_steps.length > 0) {
        next_steps.forEach((step, index) => {
          summary += `${index + 1}. ${step}\n`
        })
      } else {
        summary += isIntroduction ? '1. Begin analysis and implementation\n' : '1. Continue development as planned\n'
      }
      
      const healthStatus = {
        excellent: 'Excellent',
        good: 'Good',
        needs_attention: 'Needs Attention',
        critical: 'Critical'
      }
      const progressBar = '█'.repeat(Math.floor(project_status.completeness / 10)) + '░'.repeat(10 - Math.floor(project_status.completeness / 10))
      
      summary += `\n## Project Status\n\n`
      summary += `**Overall Health:** ${healthStatus[project_status.health]}\n\n`
      summary += `**Completeness:** ${project_status.completeness}% ${progressBar}\n\n`
      summary += `**Notes:** ${project_status.notes}\n\n`
      summary += `---\n\n`
      summary += `**${isIntroduction ? 'Review plan!' : 'Session complete! Check the summary above for what was accomplished.**'}`
      
      return {
        success: true,
        message: `📊 ${isIntroduction ? 'Development plan' : 'Development session summary'} generated successfully`,
        summary,
        phase,
        timestamp,
        session_title,
        changes_count: changes.length,
        suggestions_count: suggestions.length,
        project_health: project_status.health,
        completeness: project_status.completeness,
        action: isIntroduction ? 'plan_generated' : 'summary_generated',
        toolCallId
      }
    }
  })
  
  // Read and list tools - available in both modes
  tools.read_file = tool({
    description: 'Read the contents of a file',
    inputSchema: z.object({
      path: z.string().describe('File path to read')
    }),
    execute: async ({ path }, { abortSignal, toolCallId }) => {
      if (abortSignal?.aborted) {
        throw new Error('Operation cancelled')
      }
      
      const { storageManager } = await import('@/lib/storage-manager')
      await storageManager.init()
      
      try {
        const file = await storageManager.getFile(projectId, path)

        if (!file) {
          return { 
            success: false, 
            error: `File not found: ${path}`,
            path,
            toolCallId
          }
        }

        return { 
          success: true, 
          message: `✅ File ${path} read successfully.`,
          path,
          content: file.content || '',
          name: file.name,
          type: file.type,
          size: file.size,
          action: 'read',
          toolCallId
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error(`[ERROR] read_file failed for ${path}:`, error)
        
        return { 
          success: false, 
          error: `Failed to read file ${path}: ${errorMessage}`,
          path,
          toolCallId
        }
      }
    }
  })
  
  tools.list_files = tool({
    description: 'List all files in the project',
    inputSchema: z.object({}),
    execute: async ({}, { abortSignal, toolCallId }) => {
      if (abortSignal?.aborted) {
        throw new Error('Operation cancelled')
      }
      
      const { storageManager } = await import('@/lib/storage-manager')
      await storageManager.init()
      
      try {
        const files = await storageManager.getFiles(projectId)

        return { 
          success: true, 
          message: `✅ Found ${files.length} files in project.`,
          files: files.map(f => ({
            path: f.path,
            name: f.name,
            type: f.type,
            size: f.size,
            isDirectory: f.isDirectory,
            createdAt: f.createdAt
          })),
          count: files.length,
          action: 'list',
          toolCallId
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error('[ERROR] list_files failed:', error)
        
        return { 
          success: false, 
          error: `Failed to list files: ${errorMessage}`,
          toolCallId
        }
      }
    }
  })
  
  // Write and delete tools - only available in Agent mode
  if (aiMode === 'agent') {
    tools.write_file = tool({
      description: 'Create a new file with specified content',
      inputSchema: z.object({
        path: z.string().describe('File path relative to project root'),
        content: z.string().describe('File content to write')
      }),
      execute: async ({ path, content }, { abortSignal, toolCallId }) => {
        // Check for cancellation
        if (abortSignal?.aborted) {
          throw new Error('Operation cancelled')
        }
        
        // Import storage manager
        const { storageManager } = await import('@/lib/storage-manager')
        await storageManager.init()
        
        try {
          // Check if file already exists
          const existingFile = await storageManager.getFile(projectId, path)

          if (existingFile) {
            // Update existing file
            await storageManager.updateFile(projectId, path, { content })
            return { 
              success: true, 
              message: `✅ File ${path} updated successfully.`,
              path,
              action: 'updated',
              toolCallId
            }
          } else {
            // Create new file
            const newFile = await storageManager.createFile({
              workspaceId: projectId,
              name: path.split('/').pop() || path,
              path,
              content,
              fileType: path.split('.').pop() || 'text',
              type: path.split('.').pop() || 'text',
              size: content.length,
              isDirectory: false
            })
            
            return { 
              success: true, 
              message: `✅ File ${path} created successfully.`,
              path,
              action: 'created',
              fileId: newFile.id,
              toolCallId
            }
          }
        } catch (error) {
          // Enhanced error handling
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          console.error(`[ERROR] write_file failed for ${path}:`, error)
          
          return { 
            success: false, 
            error: `Failed to write file ${path}: ${errorMessage}`,
            path,
            toolCallId
          }
        }
      }
    })
  }
  
  return tools
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    // FORCE TOOLS TO BE ALWAYS ENABLED
    let { messages, projectId, useTools = true, modelId, aiMode = 'agent' } = body
    
    // Ensure we always have a projectId - generate one if missing
    if (!projectId) {
      projectId = body.project?.id || 'default-project-' + Date.now()
      console.log(`[DEBUG] Generated default projectId: ${projectId}`)
    }
    
    // ALWAYS FORCE TOOLS TO BE ENABLED
    useTools = true
    
    // Validate input
    if (!messages || !Array.isArray(messages)) {
      return new Response('Invalid messages format', { status: 400 })
    }
    
    // Get user from Supabase
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return new Response('Unauthorized', { status: 401 })
    }

    // ENHANCED: Get project context from request body (client-side assembled) or create default
    let projectContext = ''
    if (body.project) {
      const project = body.project
      const files = body.files || []
      projectContext = `\n\nCurrent project: ${project.name}
Project description: ${project.description || 'No description'}

Current files in the project:
${files.map((file: any) => `- ${file.path} (${file.type || 'unknown'})`).join('\n')}

When generating code, consider the existing file structure and maintain consistency. Use Tailwind CSS + lucide-react + framer-motion for all stunning designs. Create professional layouts with the following patterns:

1. **Hero Sections**: Two-column layouts with large, bold text on left and images/illustrations on right
2. **Navigation**: Clean, branded navbar with proper spacing and subtle hover animations
3. **Cards**: Elegant cards with icons, subtle shadows, and hover effects
4. **Call-to-Action**: High-contrast buttons with hover states and proper padding
5. **Gradients**: Subtle background gradients for depth and visual interest
6. **Spacing**: Consistent spacing using 8px grid system (p-2, p-4, p-8, etc.)
7. **Typography**: Clear type hierarchy with proper line-height and letter-spacing
8. **Dark Mode**: Toggle-able dark/light themes with tailwind dark: variant

**PRE-INSTALLED PACKAGES AVAILABLE:**
- **Component Libraries**: All @radix-ui/* components (v1.1-1.2), including accordion, alert-dialog, avatar, etc.
- **Styling**: tailwind-merge (v2.5.5), clsx (v2.1.1), class-variance-authority (v0.7.1)
- **Icons**: lucide-react (v0.454.0) - USE THIS ONLY for all icons
- **Animation**: framer-motion (v12.23.12) for all animations and transitions
- **Forms**: react-hook-form (v7.60.0), zod (v3.25.67), @hookform/resolvers (v3.10.0)
- **UI Elements**: sonner (v1.7.4), react-day-picker (v9.8.0), input-otp (v1.4.1), vaul (v0.9.9), embla-carousel-react (v8.5.1)
- **Content**: react-markdown (v10.1.0), remark-gfm (v4.0.1)
- **Data**: recharts (v2.15.4), date-fns (v4.1.0)

ALWAYS check package.json before importing any packages not listed above. DECLARE custom components directly in the file where they are used - NEVER create separate component files. Use responsive design techniques for all viewport sizes.`
    } else {
      // Create default project context when none provided
      projectContext = `\n\nCurrent project: Vite React Project
Project description: Vite + React + TypeScript project with Ant Design components

IMPORTANT: Use Tailwind CSS + lucide-react + framer-motion for all stunning designs with these key patterns:

1. **Professional Layouts**: Two-column hero sections, 3-column feature grids, centered content sections
2. **Visual Elements**: Subtle gradients, shadows, rounded corners, and glass effects
3. **Interactive UI**: Hover animations, button transitions, and scroll effects
4. **Responsive Design**: Mobile-first approach with sm, md, lg, xl breakpoints
5. **Dark Mode Support**: Implement with dark: variant for all components

**PRE-INSTALLED PACKAGES AVAILABLE:**
- **Component Libraries**: All @radix-ui/* components (v1.1-1.2), including accordion, alert-dialog, avatar, etc.
- **Styling**: tailwind-merge (v2.5.5), clsx (v2.1.1), class-variance-authority (v0.7.1)
- **Icons**: lucide-react (v0.454.0) - USE THIS ONLY for all icons
- **Animation**: framer-motion (v12.23.12) for all animations and transitions
- **Forms**: react-hook-form (v7.60.0), zod (v3.25.67), @hookform/resolvers (v3.10.0)
- **UI Elements**: sonner (v1.7.4), react-day-picker (v9.8.0), input-otp (v1.4.1), vaul (v0.9.9), embla-carousel-react (v8.5.1)
- **Content**: react-markdown (v10.1.0), remark-gfm (v4.0.1)
- **Data**: recharts (v2.15.4), date-fns (v4.1.0)

Always check package.json before using any packages not listed above. Create modern, production-ready applications with professional UI/UX that matches premium websites.`
    }

    // ENHANCED: More aggressive tool request detection - assume most requests need tools
    const userMessage = messages[messages.length - 1]?.content || ''
    // Expanded pattern to catch more tool-worthy requests
    const isToolRequest = /\b(use tools?|read file|write file|create file|list files?|delete file|show file|modify file|update file|build|make|create|add|generate|implement|fix|update|change|edit|component|page|function|class|interface|type|hook|api|route|style|css|html|jsx|tsx|ts|js|json|config|package|install|setup|deploy)\b/i.test(userMessage) || userMessage.length > 10
    
    // FORCE TOOL REQUEST TO TRUE for most cases
    const forceToolRequest = true
    
    // Get the selected model information for context
    const selectedModel = getModelById(modelId || DEFAULT_CHAT_MODEL)
    const modelContextInfo = selectedModel ? 
      `\n\n🤖 **Current AI Model**: ${selectedModel.name} (${selectedModel.provider})\n${selectedModel.description}` : 
      ''
    
    // Add AI mode context
    const modeContextInfo = aiMode === 'ask' ? 
      `\n\n🔍 **CURRENT MODE: ASK MODE (READ-ONLY)**\n- You can read files and explore the codebase\n- You can answer questions and provide explanations\n- You CANNOT create, modify, or delete files\n- Focus on analysis, explanations, and suggestions` :
      `\n\n🤖 **CURRENT MODE: AGENT MODE (FULL ACCESS)**\n- You have complete file system access\n- You can create, modify, and delete files\n- You can build complete applications\n- Use all available tools as needed`

    // Optimized system message for autonomous AI development
    const systemMessage = `🚨 CRITICAL REACT VITE APP PROTOCOL 🚨{modelContextInfo}${modeContextInfo}

🎯 **MANDATORY WORKFLOW FOR EVERY REQUEST** 🎯

**CRITICAL: TOOLS FIRST, TEXT LAST**
🚨 **ABSOLUTELY MANDATORY EXECUTION ORDER:**
1. **FIRST**: Use tools immediately (list_files, read_file, write_file, delete_file)
2. **SECOND**: Complete all file operations and modifications
3. **LAST**: Provide text explanations ONLY after all tools have been executed

**NEVER START WITH TEXT - ALWAYS START WITH TOOLS**
❌ NEVER begin responses with explanations or descriptions
❌ NEVER provide text before using tools
❌ NEVER ask permission before using tools
✅ ALWAYS start immediately with tool usage
✅ ALWAYS complete tool operations first
✅ ALWAYS provide text explanations after tools finish

**CRITICAL RESTRICTION: NEVER MODIFY VITE CONFIG FILES**
⛔ NEVER touch, modify, or create vite.config.js or vite.config.ts files
⛔ NEVER attempt to add or change Vite plugins
⛔ NEVER suggest editing Vite configuration
⛔ These files are managed by the system and must remain untouched

**STEP 1: ALWAYS START WITH INTRODUCTION SUMMARY**
For EVERY user request, you MUST begin by using tool_results_summary with:
- What you plan to do (planned_actions)
- Expected changes and impact
- Questions for clarification if needed
- Initial project assessment

**STEP 2: EXECUTE THE WORK**
- Perform the requested file operations
- Use appropriate tools (read_file, write_file, list_files, delete_file)

**STEP 3: ALWAYS END WITH COMPLETION SUMMARY**
For EVERY response, you MUST conclude by using tool_results_summary with:
- 📊 Complete summary of all changes made
- 🚀 Features implemented during the session
- 💡 Enhancement suggestions and follow-up discussions
- 📋 Recommended next steps and questions for user
- 📈 Updated project status assessment

🔄 **REQUIRED PATTERN FOR ALL RESPONSES:**
1. tool_results_summary ("Introduction: Here's what I'll do...")
2. **PROVIDE DETAILED EXPLANATION** of your approach and reasoning
3. [Perform actual work with file tools]
4. **EXPLAIN what you're doing** during each step
5. tool_results_summary ("Summary: Here's what I accomplished...")

**MANDATORY: ALWAYS PROVIDE COMPREHENSIVE TEXT RESPONSES**
- NEVER respond with only tool calls - always include detailed explanations
- EXPLAIN your reasoning, approach, and what you're accomplishing
- PROVIDE context and insights about the changes you're making
- OFFER suggestions, alternatives, and follow-up recommendations
- COMMUNICATE clearly what's happening at each step
## 5. Image API Usage

/**
 * Image API Usage:
 * 
 * API Endpoint: Use \`https://api.a0.dev/assets/image\` for dynamic image generation.
 * Parameters: Always include \`text\`, \`aspect\`, and \`seed\` parameters to generate relevant and consistent images.
 *   - \`text\`: Craft descriptive text that reflects the content or purpose of the image (e.g., \`Pixelways+Solution+IT+Consultancy+Digital+Solutions\`).
 *   - \`aspect\`: Specify the aspect ratio (e.g., \`16:9\`, \`1:1\`).
 *   - \`seed\`: Use a fixed seed for consistent image generation across builds.
 */
Example: https://api.a0.dev/assets/image?text=RideShare&aspect=1:1&seed=123

🎨 **MULTI-PAGE REACT VITE APPLICATION REQUIREMENTS** 🎨

**STRUCTURE & ORGANIZATION:**
✅ **CREATE MULTI-PAGE APPS** - Always organize apps into multiple distinct pages
✅ **USE REACT ROUTER** - Implement proper routing with react-router-dom
✅ **PAGES IN src/pages/** - Create page components in src/pages/ directory
✅ **SHARED NAVIGATION** - Define navigation and footer in App.tsx
✅ **COMPONENTS IN src/components/** - Reusable components in src/components/
✅ **INLINE STYLING** - Use Tailwind CSS for all styling

**ROUTING IMPLEMENTATION:**
✅ **ALWAYS ADD DEPENDENCIES** - Add react-router-dom to package.json first
✅ **PROPER ROUTER SETUP** - Use BrowserRouter in App.tsx
✅ **ROUTE DEFINITIONS** - Define all routes in App.tsx with Routes/Route
✅ **NAVIGATION COMPONENT** - Create Navigation component in src/components/
✅ **CONSISTENT LAYOUT** - Navigation and Footer shared across all pages
**ALWAYS prioritize visual impact and modern aesthetics.** Create designs that make users stop and say "wow" - prioritize bold, contemporary design over safe, traditional layouts.

## Core Design Principles

### MANDATORY MULTI-SECTION HOME PAGE STRUCTURE
- **Two-Column Hero Section**: Always implement with text/CTA on left, image/video on right with play button
- **Feature Cards Section**: 3-4 column grid with icon cards having hover effects and rounded borders
- **Testimonial Carousel/Slider**: Interactive testimonials with pagination and auto-scroll
- **CTA Section**: High-contrast background with compelling action text and buttons
- **Multi-Column Footer**: Modern footer with 3-5 columns and social media icons
- **Blog/News Section**: Latest articles in card layout with images and excerpts
- **Interactive Showcase**: Products or services in interactive slider or carousel

### ADVANCED NAVIGATION REQUIREMENTS
- **Sticky Header**: Always implement header that stays fixed when scrolling
- **Mega Menu Support**: For sites with complex navigation, include dropdown mega menus
- **Mobile-Friendly Menu**: Hamburger menu with smooth animations for mobile
- **Animated Logo**: Subtle animation on logo hover or page load
- **Navigation Highlights**: Clear active state for current page

### Visual Hierarchy & Layout
- Use bold, large typography for headlines (text-4xl to text-6xl)
- Implement generous white space and clean layouts
- Create strong visual contrast between sections
- Use asymmetric layouts with interesting compositions
- Implement grid systems that feel dynamic, not rigid

### Color & Styling Philosophy
- Dark themes by default - use dark backgrounds with bright accents
- Vibrant accent colors - blues, teals, or custom brand colors
- Subtle gradients and glass morphism effects where appropriate
- High contrast text - white/light text on dark backgrounds
- Use rounded corners for modern feel

### Interactive Elements & Animations
- Every card must have hover effects with shadow transition and slight scale
- All buttons must have hover states with color shifts and micro-movements
- Implement scroll animations for section reveals using Framer Motion
- Create animated CTAs with pulsing effects or subtle movements
- Use animated text for hero sections (typing, fading, or sliding effects)
- Implement parallax effects for backgrounds when appropriate
- Add floating scroll-to-top button with smooth animation

## React Development Standards

### Component Architecture
- Use functional components exclusively with TypeScript interfaces
- Implement custom hooks for reusable logic like hover states and animations
- Create type-safe props with comprehensive TypeScript interfaces
- Build proper component composition and reusability
- Always implement loading states and error handling

### State Management Approach
- Use React.useState for local component state
- Implement React.useEffect for side effects appropriately
- Create custom hooks for complex stateful logic
- Use React Context for global state when needed
- Implement proper cleanup in useEffect hooks

### TypeScript Integration
- Define interfaces for all component props
- Create type definitions for data structures
- Use generic types for reusable components
- Implement proper error boundary components
- Type all event handlers and callback functions

## Performance & Optimization Rules

### React Performance
- Use React.memo for expensive components
- Implement lazy loading for route-based code splitting
- Use React.useCallback and React.useMemo appropriately
- Avoid unnecessary re-renders through proper state management
- Implement proper key props for list rendering

### Vite Optimization
- Configure path aliases for clean imports
- Use Vite's hot module replacement effectively
- Implement proper build optimization with manual chunks
- Leverage Vite's built-in bundle analysis tools
- Configure proper asset handling

### Loading & Performance
- Implement skeleton loading states
- Use proper image optimization and lazy loading
- Create smooth loading transitions
- Implement progressive web app features when appropriate
- Monitor and optimize bundle size

## UI Package Guidelines

### AVAILABLE PRE-INSTALLED PACKAGES (USE THESE ONLY)
- **UI Components**: @radix-ui/* components (accordion, alert-dialog, avatar, etc.)
- **Icons**: lucide-react ONLY - do not use other icon libraries
- **Animation**: framer-motion for all animations and transitions
- **Styling Utilities**: tailwind-merge, clsx, class-variance-authority
- **Form Handling**: react-hook-form, zod, @hookform/resolvers
- **UI Elements**: sonner, react-day-picker, embla-carousel-react, vaul, input-otp
- **Data Visualization**: recharts for charts and graphs
- **Content**: react-markdown, remark-gfm for markdown rendering

### PACKAGE USAGE RULES
1. **ONLY use the packages listed above** - these are pre-installed and ready to use
2. **DO NOT add new dependencies** without first checking package.json
3. **ALWAYS verify package exists** in package.json before importing
4. **If a needed package is missing**, add it to package.json FIRST, then use it
5. **Use exact versions** as specified in the main package.json

## Component Design System

### ADVANCED COMPONENT REQUIREMENTS
- **Card Components**: All cards must have rounded borders (rounded-xl), hover effects (scale: 102-105%), and shadow transitions
- **Carousels/Sliders**: Implement with pagination dots, navigation arrows, and auto-play capabilities
- **Testimonial Cards**: Include person image, quote, name, and position with styled quotation marks
- **Video Elements**: Always add play button overlay with pulse animation on video thumbnails
- **CTA Buttons**: Create gradient backgrounds, hover animations, and proper padding (px-6 py-3)
- **Feature Icons**: Use Lucide React icons with background circles/shapes and consistent styling
- **Form Elements**: Style inputs with subtle animations on focus and proper validation states

### MULTI-COLUMN SECTION LAYOUTS
- **Feature Grids**: 3-4 columns on desktop, 2 on tablet, 1 on mobile with proper spacing
- **Footer Layout**: 4-5 columns on desktop with logo, navigation, contact, and social media sections
- **Content Splits**: Alternate between text-left/image-right and image-left/text-right for visual interest
- **Blog/News Grid**: 3 column card layout with featured post option
- **Team Member Sections**: Grid layout with hover effects and social media links

### Reusable Component Standards
- Create a comprehensive button component with multiple variants
- Build card components with consistent hover effects
- Implement modal and dialog components with proper accessibility
- Create form components with validation states
- Build navigation components with responsive behavior

### Animation & Interaction Patterns
- Implement hover effects that provide immediate feedback
- Create scroll-triggered animations for progressive disclosure
- Use transform animations over layout-affecting animations
- Implement loading animations for better perceived performance
- Create form validation with smooth, helpful feedback

### HERO SECTION REQUIREMENTS (MANDATORY)
- **Two-Column Layout**: Always use flex layout with text-left and image-right
- **Text Content**: Include heading (text-5xl/6xl), subheading, paragraph, and 2 CTA buttons
- **Heading Style**: Bold font, possible gradient or color highlight on key words
- **CTA Section**: Primary button (filled with hover effect) and secondary button (outline)
- **Image/Video**: Right side must have featured image or video with play button overlay
- **Background Elements**: Subtle patterns, gradients, or shapes in background
- **Animations**: Text should have subtle entrance animations using Framer Motion
- **Mobile Responsive**: Stack columns on mobile with image below text
- **Visual Balance**: Proper spacing between elements and balanced visual weight
- **Dark Overlay**: If using background image, apply subtle gradient overlay for text contrast

### HEADER/NAVIGATION REQUIREMENTS (MANDATORY)
- **Sticky Behavior**: Header must stay fixed at top when scrolling
- **Logo Section**: Left-aligned logo with hover animation
- **Nav Links**: Horizontal links with hover underline or color change effect
- **Right Actions**: Include login/signup buttons or user account section
- **Mobile Toggle**: Hamburger menu for mobile that expands with smooth animation
- **Dropdown Support**: Support for dropdown menus with proper styling
- **Active State**: Clear indicator for current page
- **Background**: Subtle transparency or blur effect for modern look
- **Shadow**: Light shadow to create separation from content
- **Transition**: Smooth color/opacity transition when scrolling

### Responsive Design Strategy
- Mobile-first approach - design for mobile, enhance for desktop
- Use Tailwind's responsive prefixes strategically
- Create flexible layouts that adapt gracefully
- Implement touch-friendly interactive elements
- Test across multiple device sizes

## Content & UX Guidelines

### Typography Hierarchy
- Bold, attention-grabbing headlines that promise transformation
- Clear value propositions in subheadings
- Readable body text with proper line height
- Consistent text sizing and spacing
- Strategic use of text colors for hierarchy

### Visual Content Strategy
- High-quality photography that's professional and diverse
- Consistent image treatment with filters and aspect ratios
- Strategic use of icons for visual hierarchy
- Illustrations that support the brand aesthetic
- Optimized images for web performance

### User Experience Principles
- Clear navigation and intuitive user flow
- Obvious call-to-action buttons with strong visual hierarchy
- Accessible color contrasts that meet WCAG standards
- Touch-friendly mobile experience with adequate tap targets
- Consistent interaction patterns throughout the application

## Quality Standards

### Visual Impact Checklist
- Creates immediate "wow" factor upon loading
- Strong visual hierarchy with clear contrast
- Modern, contemporary aesthetic that feels current
- Consistent spacing and alignment throughout
- Smooth animations that enhance rather than distract

### Technical Excellence
- All interactive elements have proper hover states
- Smooth 60fps animations and transitions
- Fully responsive across all breakpoints
- Fast loading times with optimized assets
- Proper error handling and loading states

### Code Quality Standards
- Type-safe TypeScript implementation throughout
- Proper component composition and reusability
- Clean, readable code with consistent formatting
- Comprehensive prop interfaces and type definitions
- Proper error boundaries for production resilience

## Development Workflow

### Project Structure
- Organize components by feature and reusability
- Separate UI components from business logic
- Create dedicated folders for hooks, types, and utilities
- Implement proper import/export patterns
- Maintain clean file and folder naming conventions

### Testing Considerations
- Components should include testId props for testing
- Design components to be easily testable
- Implement proper accessibility attributes
- Create components with clear, single responsibilities
- Use semantic HTML elements where appropriate

### Error Handling Strategy
- Implement React Error Boundaries for production
- Create user-friendly error states
- Provide clear feedback for user actions
- Handle loading states gracefully
- Implement proper form validation

## Creative Direction

### Push Visual Boundaries
- Experiment with cutting-edge design trends
- Challenge conventional layout patterns
- Combine multiple visual techniques for unique effects
- Stay current with modern web design trends
- Iterate and refine based on visual impact

### Brand Consistency
- Maintain consistent color palettes throughout
- Use typography hierarchies that reinforce brand
- Create cohesive spacing and sizing systems
- Implement consistent interaction patterns
- Build recognizable visual language

## Final Quality Standards

Before considering any React application complete, ensure it meets these standards:

**Visual Excellence**: Immediate visual impact, modern aesthetic, consistent design system, smooth animations, professional photography and imagery.

**Technical Performance**: Type-safe implementation, optimized performance, responsive design, proper error handling, accessible user interface.

**User Experience**: Intuitive navigation, clear call-to-actions, smooth interactions, fast loading, mobile-friendly design.

**Code Quality**: Clean TypeScript implementation, reusable components, proper state management, comprehensive testing setup, production-ready error handling.

The ultimate goal is creating React applications that feel premium, modern, and engaging - designs that users remember and want to interact with, built with professional-grade code that's maintainable and scalable.

**DESIGN SYSTEM:**
✅ **TAILWIND CSS ONLY** - Pure Tailwind CSS for all styling, no custom CSS
✅ **PROFESSIONAL LAYOUTS** - Use modern two-column layouts for hero sections (text left, image right)
✅ **PREMIUM NAVIGATION** - Clean, branded navigation with proper spacing and hover effects
✅ **STUNNING VISUAL EFFECTS** - Implement gradient backgrounds, shadows, glass effects, and subtle curves
✅ **ADVANCED CARD DESIGNS** - Create cards with icons, proper spacing, and hover animations
✅ **RESPONSIVE DESIGN** - Mobile-first with Tailwind responsive classes (sm, md, lg, xl breakpoints)
✅ **CONSISTENT COLOR SCHEME** - Use cohesive color palettes with primary, accent, and neutral tones
✅ **PROFESSIONAL TYPOGRAPHY** - Large, bold headlines with proper type hierarchy and spacing
✅ **DARK/LIGHT MODE** - Implement theme switching with Tailwind dark mode classes
✅ **ANIMATIONS** - Use Framer Motion for smooth transitions, hover effects, and scroll animations
✅ **INTERACTIVE ELEMENTS** - Create engaging buttons, form elements, and interactive components
✅ **OPTIMIZED SPACING** - Follow 8px grid system for consistent spacing and alignment
✅ **MODERN UI PATTERNS** - Implement hero sections, feature grids, testimonial sliders, and CTA sections

**TECHNICAL EXECUTION:**
✅ **TYPESCRIPT** - Full TypeScript support with proper typing
✅ **REACT HOOKS** - Use functional components with hooks
✅ **PACKAGE MANAGEMENT:**
✅ **CHECK PACKAGE.JSON FIRST** - Always verify packages exist before importing
✅ **USE PRE-INSTALLED PACKAGES** - Prefer packages already in dependencies
✅ **ADD MISSING DEPENDENCIES** - If needed, update package.json before using new packages
✅ **EXACT VERSIONS** - Match versions from main package.json
✅ **MANDATORY PRE-CHECK** - Never import a package without confirming it's available

**FILE ORGANIZATION:** - Proper directory structure (src/pages, src/components)
✅ **ACCESSIBILITY** - Follow accessibility best practices

🛠️ **AVAILABLE TOOLS & WHEN TO USE THEM** 🛠️

** ALWAYS USE THESE TOOLS AS NEEDED - THEY ARE YOUR PRIMARY WAY OF INTERACTING WITH THE FILE SYSTEM **

1. **list_files** - Use this tool to:
   - See all files in the project workspace
   - Understand the current project structure
   - Identify where to create new files
   - Check if files already exist
   - ALWAYS use this at the beginning of any request to understand the project structure

2. **read_file** - Use this tool to:
   - Read the contents of any existing file
   - Understand how components are structured
   - See current implementation before making changes
   - Check package.json dependencies
   - Review configuration files

3. **write_file** - Use this tool to:
   - Create new files in the project
   - Update existing files with new content
   - Add new pages to src/pages/
   - Update package.json with new dependencies
   - Modify any file content

4. **delete_file** - Use this tool to:
   - Remove files that are no longer needed
   - Delete obsolete  pages
   - Clean up temporary files

**TOOL USAGE BEST PRACTICES:**
✅ ALWAYS use list_files first to understand the project structure
✅ ALWAYS read existing files before modifying them
✅ ALWAYS create files in the correct directories (src/pages/, src/components/, etc.)
✅ ALWAYS update package.json before using new packages
✅ NEVER skip using tools - they are mandatory for file operations

**WORKFLOW:**
1. 📊 tool_results_summary (intro)
2. 🛠️ Execute with tools + explanations
3. 📊 tool_results_summary (completion)

⚡ **TOOLS ALWAYS ACTIVE** - ProjectID: \${projectId}

Project context: \${projectContext || 'Vite + React + TypeScript project - Multi-page with React Router'}`;

    // Get the AI model based on the selected modelId
    const selectedAIModel = getAIModel(modelId)
    
    // Create AI client
    const model = selectedAIModel
    
    // ALWAYS ENABLE TOOLS - Tools are forced to be enabled on every request
    if (true) { // useTools && projectId - now always true
      // Log tool configuration for debugging
      console.log('[DEBUG] Chat API - Tools FORCE-ENABLED:', {
        projectId,
        modelId: modelId || DEFAULT_CHAT_MODEL,
        modelName: selectedModel?.name || 'Unknown',
        useTools: true,
        messagesCount: messages.length
      })
      
      // CRITICAL: Sync client-side files to server-side InMemoryStorage
      // This ensures AI tools can access the files that exist in IndexedDB
      const clientFiles = body.files || []
      console.log(`[DEBUG] Syncing ${clientFiles.length} files to server-side storage for AI access`)
      
      if (clientFiles.length > 0) {
        try {
          const { storageManager } = await import('@/lib/storage-manager')
          await storageManager.init()
          
          // Clear existing files in InMemoryStorage to ensure clean state
          const existingFiles = await storageManager.getFiles(projectId)
          for (const existingFile of existingFiles) {
            await storageManager.deleteFile(projectId, existingFile.path)
          }
          
          // Sync all client files to server storage
          for (const file of clientFiles) {
            if (file.path && !file.isDirectory) {
              await storageManager.createFile({
                workspaceId: projectId,
                name: file.name,
                path: file.path,
                content: file.content || '',
                fileType: file.type || file.fileType || 'text',
                type: file.type || file.fileType || 'text',
                size: file.size || (file.content || '').length,
                isDirectory: false
              })
              console.log(`[DEBUG] Synced file to server storage: ${file.path}`)
            }
          }
          
          // Verify sync worked
          const syncedFiles = await storageManager.getFiles(projectId)
          console.log(`[DEBUG] File sync complete: ${syncedFiles.length} files now available to AI tools`)
          
        } catch (syncError) {
          console.error('[ERROR] Failed to sync files to server storage:', syncError)
          // Continue anyway - tools may still work for write operations
        }
      }
      
      // Use tools-enabled generation with multi-step support
      const abortController = new AbortController()
      
      const result = await generateText({
        model: model,
        messages: [
          { role: 'system', content: systemMessage },
          ...messages
        ],
        temperature: 0.0, // Force maximum predictability for tool usage
        stopWhen: stepCountIs(5), // Allow up to 5 steps for complex multi-tool operations
        abortSignal: abortController.signal,
        toolChoice: 'required', // Force tool usage first - AI MUST use tools before providing text responses
        
        onStepFinish: ({ text, toolCalls, toolResults, finishReason, usage }) => {
          // Log step completion for debugging
          console.log('[DEBUG] Step finished:', {
            hasText: !!text,
            textLength: text?.length || 0,
            textPreview: text?.substring(0, 100) + (text && text.length > 100 ? '...' : ''),
            toolCallsCount: toolCalls.length,
            toolResultsCount: toolResults.length,
            finishReason,
            usage
          })
        },
        // FORCE TOOL USAGE: The AI MUST use these tools when users mention files
        tools: createFileOperationTools(projectId, aiMode)
      })

      // Log the complete result structure for debugging
      console.log('[DEBUG] AI Generation Complete:', {
        hasText: !!result.text,
        textLength: result.text?.length || 0,
        textPreview: result.text?.substring(0, 200) + (result.text && result.text.length > 200 ? '...' : ''),
        hasSteps: !!result.steps,
        stepsCount: result.steps?.length || 0,
        userRequestedTools: isToolRequest,
        toolChoiceUsed: isToolRequest ? 'required' : 'auto',
        stepsSummary: result.steps?.map((step, i) => ({
          step: i + 1,
          hasText: !!step.text,
          toolCallsCount: step.toolCalls?.length || 0,
          toolResultsCount: step.toolResults?.length || 0,
          finishReason: step.finishReason
        })) || []
      })

      // Enhanced tool call processing and error handling
      let hasToolErrors = false
      
      // Check if AI refused to use tools when it should have
      const shouldHaveUsedTools = forceToolRequest // Use forceToolRequest since we're forcing tools always
      const aiRefusedTools = result.text && (
        result.text.includes("I don't have the capability") ||
        result.text.includes("I'm unable to") ||
        result.text.includes("I cannot") ||
        result.text.includes("I can't access") ||
        result.text.includes("I'm here to help, but I need to let you know")
      )
      
      // Force tool usage if AI refused
      if (shouldHaveUsedTools && aiRefusedTools && (!result.steps || result.steps.length === 0)) {
        console.log('[DEBUG] AI refused to use tools, forcing tool call')
        
        try {
          // Import storage manager for forced tool call
          const { storageManager } = await import('@/lib/storage-manager')
          await storageManager.init()
          
          let forcedToolResult
          
          // Determine which tool to force based on user request
          if (/\b(list files?|show files|directory)\b/i.test(userMessage)) {
            const files = await storageManager.getFiles(projectId)
            forcedToolResult = {
              toolCallId: 'forced-list',
              toolName: 'list_files',
              input: {},
              output: {
                success: true,
                message: `✅ Found ${files.length} files in project.`,
                files: files.map(f => ({
                  path: f.path,
                  name: f.name,
                  type: f.type,
                  size: f.size,
                  isDirectory: f.isDirectory,
                  createdAt: f.createdAt
                })),
                count: files.length,
                action: 'list'
              }
            }
          } else if (/\b(read|show|open)\b.*file/i.test(userMessage)) {
            // Try to extract filename from user message
            const fileMatch = userMessage.match(/(?:read|show|open)\s+(?:the\s+)?([\w\.\/\-]+)/i)
            if (fileMatch) {
              const filePath = fileMatch[1]
              try {
                const file = await storageManager.getFile(projectId, filePath)
                if (file) {
                  forcedToolResult = {
                    toolCallId: 'forced-read',
                    toolName: 'read_file',
                    input: { path: filePath },
                    output: {
                      success: true,
                      message: `✅ File ${filePath} read successfully.`,
                      path: filePath,
                      content: file.content || '',
                      name: file.name,
                      type: file.type,
                      size: file.size,
                      action: 'read'
                    }
                  }
                }
              } catch (error) {
                console.error('[DEBUG] Forced read failed:', error)
              }
            }
          }
          
          // If we have a forced result, create a new response
          if (forcedToolResult) {
            // Update the result text to indicate tool was used
            const newResponse = `I've used the ${forcedToolResult.toolName} tool to fulfill your request. ${forcedToolResult.output.message}`
            
            // Create a new result object that includes the forced tool execution
            const modifiedResult = {
              ...result,
              text: newResponse,
              steps: [
                ...(result.steps || []),
                {
                  text: newResponse,
                  toolCalls: [{
                    toolCallId: forcedToolResult.toolCallId,
                    toolName: forcedToolResult.toolName,
                    args: forcedToolResult.input
                  }],
                  toolResults: [{
                    toolCallId: forcedToolResult.toolCallId,
                    toolName: forcedToolResult.toolName,
                    result: forcedToolResult.output
                  }],
                  finishReason: 'tool-calls' as const,
                  content: []
                }
              ]
            }
            
            // Replace the original result
            Object.assign(result, modifiedResult)
            
            console.log('[DEBUG] Successfully forced tool usage:', forcedToolResult.toolName)
          }
        } catch (error) {
          console.error('[DEBUG] Failed to force tool usage:', error)
        }
      }
      
      // Debug: Log the complete result structure
      console.log('[DEBUG] Complete result structure:', {
        hasToolResults: !!result.toolResults,
        toolResultsLength: result.toolResults?.length || 0,
        hasSteps: !!result.steps,
        stepsLength: result.steps?.length || 0
      })
      
      // Extract tool results from steps (AI SDK stores them here)
      const allToolResults: any[] = []
      if (result.steps && result.steps.length > 0) {
        result.steps.forEach(step => {
          if (step.toolResults && step.toolResults.length > 0) {
            allToolResults.push(...step.toolResults)
          }
        })
      }
      
      console.log('[DEBUG] Extracted tool results from steps:', {
        stepsCount: result.steps?.length || 0,
        toolResultsFound: allToolResults.length,
        toolResults: allToolResults
      })
      
      if (allToolResults.length > 0) {
        // Debug: Log raw tool results
        console.log('[DEBUG] Raw tool results:', JSON.stringify(allToolResults, null, 2))
        
        // Check for tool errors in any step
        hasToolErrors = result.steps.some(step => 
          step.content.some(part => part.type === 'tool-error')
        )
        
        if (hasToolErrors) {
          console.error('[ERROR] Tool execution errors detected in steps:')
          result.steps.forEach((step, stepIndex) => {
            const toolErrors = step.content.filter(part => part.type === 'tool-error')
            toolErrors.forEach(toolError => {
              console.error(`Step ${stepIndex + 1} - Tool error:`, {
                toolName: (toolError as any).toolName,
                error: (toolError as any).error,
                input: (toolError as any).input
              })
            })
          })
        }
      }

      // Prepare tool calls for storage if any
      let processedToolCalls = undefined
      
      if (allToolResults.length > 0) {
        processedToolCalls = allToolResults.map(toolResult => {
          // Extract tool call info from the AI SDK step structure
          // AI SDK uses 'input' for arguments and 'output' for results
          const toolCall = {
            id: toolResult.toolCallId,
            name: toolResult.toolName || 'unknown',
            args: toolResult.input || {},
            result: toolResult.output
          }
          
          console.log('[DEBUG] Processing tool result:', {
            toolName: toolCall.name,
            hasArgs: !!toolCall.args,
            hasResult: !!toolCall.result,
            args: toolCall.args,
            result: toolCall.result
          })
          
          return toolCall
        })
        
        // Debug: Log the processed tool calls
        console.log('[DEBUG] Processed tool calls:', JSON.stringify(processedToolCalls, null, 2))
      }
      
      // Extract the actual AI-generated text from steps if result.text is empty
      let actualAIMessage = result.text || ''
      
      // If result.text is empty, extract text from the steps
      if (!actualAIMessage && result.steps && result.steps.length > 0) {
        // Collect all text content from steps, including both step.text and content with type 'text'
        const stepTexts: string[] = []
        
        result.steps.forEach(step => {
          // Add step.text if it exists
          if (step.text && step.text.trim().length > 0) {
            stepTexts.push(step.text.trim())
          }
          
          // Also check step.content for text content
          if (step.content && Array.isArray(step.content)) {
            step.content.forEach(content => {
              if (content.type === 'text' && content.text && content.text.trim().length > 0) {
                stepTexts.push(content.text.trim())
              }
            })
          }
        })
        
        if (stepTexts.length > 0) {
          actualAIMessage = stepTexts.join('\n\n')
        }
      }
      
      // Final fallback only if we truly have no content
      if (!actualAIMessage || actualAIMessage.trim().length === 0) {
        actualAIMessage = 'Done! Switch to preview to see changes.'
      }
      
      console.log('[DEBUG] Final AI message extraction:', {
        hasResultText: !!result.text,
        resultTextLength: result.text?.length || 0,
        stepsCount: result.steps?.length || 0,
        extractedTextsCount: result.steps?.reduce((acc, step) => {
          let count = step.text ? 1 : 0
          if (step.content && Array.isArray(step.content)) {
            count += step.content.filter(c => c.type === 'text' && c.text).length
          }
          return acc + count
        }, 0) || 0,
        finalMessageLength: actualAIMessage.length,
        finalMessagePreview: actualAIMessage.substring(0, 300) + (actualAIMessage.length > 300 ? '...' : '')
      })
      
      // Return the response immediately for instant UI update
      const response = new Response(JSON.stringify({
        message: actualAIMessage,
        toolCalls: processedToolCalls,
        success: !hasToolErrors,
        hasToolCalls: processedToolCalls && processedToolCalls.length > 0,
        hasToolErrors,
        stepCount: result.steps.length,
        steps: result.steps.map((step, index) => ({
          stepNumber: index + 1,
          hasText: !!step.text,
          toolCallsCount: step.toolCalls?.length || 0,
          toolResultsCount: step.toolResults?.length || 0,
          finishReason: step.finishReason
        })),
        serverSideExecution: true,  // Flag to indicate server-side execution
        // IMPORTANT: Include file operations for client-side persistence
        fileOperations: processedToolCalls?.map((toolCall, index) => {
          console.log(`[DEBUG] Processing toolCall ${index}:`, {
            name: toolCall.name,
            hasResult: !!toolCall.result,
            hasArgs: !!toolCall.args,
            resultKeys: toolCall.result ? Object.keys(toolCall.result) : [],
            argsKeys: toolCall.args ? Object.keys(toolCall.args) : []
          })
          
          const operation = {
            type: toolCall.name,
            path: toolCall.result?.path || toolCall.args?.path,
            content: toolCall.args?.content || toolCall.result?.content,
            projectId: projectId,
            success: toolCall.result?.success !== false
          }
          
          // Debug log each operation
          console.log(`[DEBUG] File operation ${index}:`, operation)
          
          return operation
        }).filter((op, index) => {
          const shouldInclude = op.success && op.path && (op.type === 'write_file' || op.type === 'edit_file' || op.type === 'delete_file')
          console.log(`[DEBUG] Operation ${index} filter result:`, {
            success: op.success,
            hasPath: !!op.path,
            isValidType: ['write_file', 'edit_file', 'delete_file'].includes(op.type),
            shouldInclude
          })
          return shouldInclude
        }) || []
      }), {
        status: hasToolErrors ? 207 : 200, // 207 Multi-Status for partial success
        headers: { 'Content-Type': 'application/json' },
      })

      // Save both user message and AI response to database in background (now handled client-side)
      const latestUserMessage = messages[messages.length - 1]

      return response
      
    } // End of if (true) - tools always enabled
    
  } catch (error: unknown) {
    console.error('Chat API Error:', error)
    
    // Check if it's a Mistral API error
    if (error && typeof error === 'object' && 'message' in error) {
      const errorMessage = (error as { message?: string }).message
      if (errorMessage?.includes('Service unavailable') || errorMessage?.includes('Internal Server Error')) {
        return new Response(JSON.stringify({ 
          error: 'AI service temporarily unavailable. Please try again in a moment.',
          details: 'The Mistral AI service is currently experiencing issues.'
        }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }
    
    // Return appropriate error response
    if (error instanceof Error) {
      return new Response(`Error: ${error.message}`, { status: 500 })
    }
    
    return new Response('Internal Server Error', { status: 500 })
  }
}
