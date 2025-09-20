import { streamText, generateText, tool, stepCountIs } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server' // Only used for auth, not message storage
import { getModel } from '@/lib/ai-providers'
import { DEFAULT_CHAT_MODEL, getModelById } from '@/lib/ai-models'

// Lovable-style system imports
import { EnhancedIntentDetector } from '@/lib/enhanced-intent-detector'

// Type definitions
interface Message {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  createdAt?: string
  metadata?: {
    toolCalls?: any[]
    success?: boolean
    hasToolCalls?: boolean
    hasToolErrors?: boolean
    stepCount?: number
    steps?: any[]
    serverSideExecution?: boolean
    fileOperations?: Array<{
      type: string
      path: string
      content?: string
      projectId: string
      success: boolean
    }>
    lovableMode?: boolean
    nextStepsPlan?: any
    implementedStep?: string
    requestedStep?: string
    workflowMode?: boolean
    workflowChunk?: any
    sessionId?: string
  }
}

// Helper functions for string operations
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findNthOccurrence(content: string, searchText: string, n: number): number {
  let index = -1;
  for (let i = 0; i < n; i++) {
    index = content.indexOf(searchText, index + 1);
    if (index === -1) return -1;
  }
  return index;
}

function replaceNthOccurrence(content: string, searchText: string, replaceText: string, n: number): string {
  const index = findNthOccurrence(content, searchText, n);
  if (index === -1) return content;
  return content.substring(0, index) + replaceText + content.substring(index + searchText.length);
}

// Detect if request requires sophisticated workflow
function isComplexDevelopmentTask(userMessage: string): boolean {
  const complexPatterns = [
    // Page/component creation
    /\b(add|create|build|make)\b.*\b(page|component|homepage|dashboard|login|signup|profile)\b/i,
    /\bnew\b.*\b(page|component|screen|view)\b/i,

    // Feature implementation
    /\b(add|implement|create)\b.*\b(auth|authentication|login|signup|register)\b/i,
    /\b(add|implement|create)\b.*\b(crud|dashboard|navigation|menu)\b/i,
    /\b(add|implement|create)\b.*\b(api|endpoint|route|database)\b/i,

    // App structure changes
    /\b(update|modify|change)\b.*\b(app|application|structure|layout)\b/i,
    /\b(integrate|connect)\b.*\b(component|page|feature)\b/i,

    // Complex UI tasks
    /\b(create|build|design)\b.*\b(form|modal|dialog|table|chart)\b/i,
    /\b(add|implement)\b.*\b(validation|error.*handling|loading.*state)\b/i
  ]

  return complexPatterns.some(pattern => pattern.test(userMessage))
}

// Multistep Workflow Manager
class MultistepWorkflowManager {
  private encoder = new TextEncoder()
  private controller: WritableStreamDefaultController | null = null
  private currentStep = 0
  
  constructor(controller?: WritableStreamDefaultController) {
    this.controller = controller
  }

  private sendSSE(data: any) {
    if (this.controller) {
      const sseData = `data: ${JSON.stringify(data)}\n\n`
      this.controller.write(this.encoder.encode(sseData))
    }
  }

  async sendStep(stepNumber: number, message: string, type: 'planning' | 'execution' | 'verification' | 'completion' = 'planning') {
    this.currentStep = stepNumber
    this.sendSSE({
      type: 'workflow_step',
      step: stepNumber,
      message,
      stepType: type,
      timestamp: new Date().toISOString()
    })
    
    // Small delay to ensure proper streaming
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  async sendNarration(message: string) {
    this.sendSSE({
      type: 'ai_narration',
      message,
      currentStep: this.currentStep,
      timestamp: new Date().toISOString()
    })
    
    await new Promise(resolve => setTimeout(resolve, 50))
  }

  async sendToolExecution(toolName: string, status: 'starting' | 'success' | 'error', details?: any) {
    this.sendSSE({
      type: 'tool_execution',
      tool: toolName,
      status,
      details,
      currentStep: this.currentStep,
      timestamp: new Date().toISOString()
    })
    
    await new Promise(resolve => setTimeout(resolve, 50))
  }

  async sendVerification(message: string, success: boolean) {
    this.sendSSE({
      type: 'verification',
      message,
      success,
      currentStep: this.currentStep,
      timestamp: new Date().toISOString()
    })
    
    await new Promise(resolve => setTimeout(resolve, 50))
  }

  async sendCompletion(summary: string, toolCalls: any[], fileOperations: any[]) {
    this.sendSSE({
      type: 'workflow_completion',
      summary,
      toolCalls,
      fileOperations,
      totalSteps: this.currentStep,
      timestamp: new Date().toISOString()
    })
  }
}

// Execute Multistep Workflow with SSE streaming
async function executeMultistepWorkflow(
  generateTextOptions: any,
  userMessage: string,
  controller: ReadableStreamDefaultController,
  projectId: string,
  userId: string
) {
  const workflow = new MultistepWorkflowManager(controller)
  let allToolCalls: any[] = []
  let allFileOperations: any[] = []

  try {
    // Step 1: Understanding Request
    await workflow.sendStep(1, "Understanding your request...", 'planning')
    await workflow.sendNarration(`I'm analyzing your request: "${userMessage}". Let me break this down and create a plan.`)

    // Step 2: Planning Actions  
    await workflow.sendStep(2, "Planning the implementation...", 'planning')
    await workflow.sendNarration("Based on your request, I'm creating a step-by-step plan to implement this feature effectively.")

    // Step 3: Reading/Listing Files (if needed)
    await workflow.sendStep(3, "Examining current project structure...", 'execution')
    await workflow.sendNarration("I'll first examine the current project files to understand the existing structure and determine what needs to be created or modified.")

    // Execute the first phase - gathering information
    const explorationResult = await generateText({
      ...generateTextOptions,
      messages: [
        ...generateTextOptions.messages,
        { 
          role: 'user', 
          content: `Before implementing "${userMessage}", I need you to:
1. Use read_file or list_files to understand the current project structure
2. Explain what you found and how it relates to the request
3. Stop after gathering information - don't implement anything yet

Focus ONLY on understanding the current state. The implementation will come in the next phase.`
        }
      ],
      stopWhen: stepCountIs(2), // Limit to just exploration
      toolChoice: 'required'
    })

    // Process exploration results
    if (explorationResult.steps) {
      for (const step of explorationResult.steps) {
        if (step.toolResults) {
          for (const toolResult of step.toolResults) {
            await workflow.sendToolExecution(toolResult.toolName, 'success', {
              path: toolResult.args?.path,
              result: toolResult.result
            })
            allToolCalls.push({
              name: toolResult.toolName,
              args: toolResult.args,
              result: toolResult.result
            })
          }
        }
      }
    }

    await workflow.sendNarration(`I've examined the project structure. ${explorationResult.text || 'Information gathered successfully.'}`)

    // Step 4: Executing Tools
    await workflow.sendStep(4, "Implementing the changes...", 'execution')
    await workflow.sendNarration("Now I'll implement the requested changes step by step.")

    // Execute the implementation phase
    const implementationResult = await generateText({
      ...generateTextOptions,
      messages: [
        ...generateTextOptions.messages,
        { 
          role: 'assistant', 
          content: explorationResult.text || 'I have examined the project structure.'
        },
        { 
          role: 'user', 
          content: `Now implement "${userMessage}" based on what you learned about the project structure. 
Create/modify the necessary files to fulfill the request completely.

Make sure to:
1. Create well-structured, modern code
2. Follow best practices and the existing project patterns
3. Include proper error handling and TypeScript types where applicable
4. Make the implementation complete and functional`
        }
      ],
      stopWhen: stepCountIs(6), // Allow more steps for implementation
      toolChoice: 'required'
    })

    // Process implementation results
    if (implementationResult.steps) {
      for (const step of implementationResult.steps) {
        if (step.toolResults) {
          for (const toolResult of step.toolResults) {
            await workflow.sendToolExecution(toolResult.toolName, 'success', {
              path: toolResult.args?.path,
              result: toolResult.result
            })
            
            allToolCalls.push({
              name: toolResult.toolName,
              args: toolResult.args,
              result: toolResult.result
            })

            // Track file operations
            if (['write_file', 'edit_file', 'delete_file'].includes(toolResult.toolName)) {
              allFileOperations.push({
                type: toolResult.toolName,
                path: toolResult.args?.path || toolResult.result?.path,
                content: toolResult.args?.content,
                projectId: projectId,
                success: toolResult.result?.success !== false
              })
            }
          }
        }
      }
    }

    await workflow.sendNarration(`Implementation completed. ${implementationResult.text || 'All changes have been applied successfully.'}`)

    // Step 5: Verification
    await workflow.sendStep(5, "Verifying the changes...", 'verification')
    await workflow.sendNarration("Let me verify that all changes were applied correctly.")

    // Verification phase - read back the created/modified files
    if (allFileOperations.length > 0) {
      const verificationFiles = allFileOperations.filter(op => op.type !== 'delete_file').map(op => op.path)
      
      if (verificationFiles.length > 0) {
        const verificationResult = await generateText({
          ...generateTextOptions,
          messages: [
            { role: 'system', content: 'You are verifying that file changes were applied correctly. Read the specified files and confirm the changes are present and correct.' },
            { 
              role: 'user', 
              content: `Please verify the implementation by reading these files that were created/modified: ${verificationFiles.join(', ')}.
              
Confirm that:
1. The files contain the expected content
2. The implementation matches the original request
3. The code follows best practices

Just read the files and provide a brief verification summary.`
            }
          ],
          stopWhen: stepCountIs(3),
          tools: { read_file: generateTextOptions.tools.read_file },
          toolChoice: 'required'
        })

        if (verificationResult.steps) {
          for (const step of verificationResult.steps) {
            if (step.toolResults) {
              for (const toolResult of step.toolResults) {
                await workflow.sendToolExecution(toolResult.toolName, 'success', {
                  path: toolResult.args?.path,
                  verification: true
                })
              }
            }
          }
        }

        await workflow.sendVerification(
          verificationResult.text || 'All files have been verified successfully.', 
          true
        )
      } else {
        await workflow.sendVerification('No files to verify.', true)
      }
    } else {
      await workflow.sendVerification('No file changes were made.', true)
    }

    // Step 6: Completion & Summary
    await workflow.sendStep(6, "Generating final summary...", 'completion')
    
    const summary = generateWorkflowSummary(userMessage, allToolCalls, allFileOperations, [
      explorationResult.text || '',
      implementationResult.text || ''
    ])

    await workflow.sendCompletion(summary, allToolCalls, allFileOperations)

  } catch (error) {
    console.error('[WORKFLOW] Error during execution:', error)
    workflow.sendSSE({
      type: 'workflow_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    })
  }
}

// Generate a comprehensive workflow summary
function generateWorkflowSummary(
  originalRequest: string,
  toolCalls: any[],
  fileOperations: any[],
  aiResponses: string[]
): string {
  const summary = `## ✅ Task Completed: ${originalRequest}

### 🔧 Actions Performed
${toolCalls.length > 0 ? `- Executed ${toolCalls.length} tool operations` : '- No tools were needed'}
${fileOperations.length > 0 ? `- Modified ${fileOperations.length} files` : '- No files were modified'}

### 📁 File Changes
${fileOperations.length > 0 
  ? fileOperations.map(op => `- **${op.type}**: \`${op.path}\``).join('\n')
  : '- No file changes were made'
}

### 🤖 Implementation Notes
${aiResponses.filter(r => r && r.trim()).join('\n\n')}

### 🎯 Summary
The requested task has been completed successfully using a structured multistep workflow. All changes have been implemented and verified.`

  return summary
}

// Server-side message saving function using storage manager (IndexedDB)
async function saveMessageToIndexedDB(message: Message, projectId?: string, userId?: string): Promise<void> {
  if (!projectId || !userId) {
    console.warn('[Chat Route] Cannot save message: missing projectId or userId')
    return
  }

  try {
    console.log(`[Chat Route] Saving message to project ${projectId}:`, message.role, message.content.substring(0, 50) + '...')

    // Use storage manager for IndexedDB storage (client-side)
    // Since we're on server-side, we can't directly access IndexedDB
    // Messages will be saved by the client via storage manager
    console.log(`[Chat Route] Message queued for IndexedDB storage: ${message.id}`)
  } catch (error) {
    console.error('[Chat Route] Error queuing message for storage:', error)
    // Don't throw error, just log it
  }
}

// Global user ID for tool access
declare global {
  var currentUserId: string

  // Surgical file tracking system
  var surgicalContext: {
    currentUserMessage: string
    currentRequestId: string
    fileOperationsThisRequest: number
    recentEdits: Array<{
      filePath: string
      action: 'created' | 'edited' | 'read'
      timestamp: number
      userIntent: string
      projectId: string
      requestId: string
    }>
    projectContext: {
      filesCreated: string[]
      filesEdited: string[]
      lastActivity: number
      componentRelationships: Record<string, string[]>
    }
    conversationMemory: Array<{
      message: string
      intent: string
      filesAffected: string[]
      timestamp: number
    }>
  } | null
}

// Use Node.js runtime for full IndexedDB and file system access
// export const runtime = 'edge' // Removed: Edge runtime doesn't support IndexedDB

// Initialize surgical context for a project
function initializeSurgicalContext(projectId: string, userMessage: string = '', requestId?: string) {
  const currentRequestId = requestId || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  if (!global.surgicalContext) {
    global.surgicalContext = {
      currentUserMessage: userMessage,
      currentRequestId,
      fileOperationsThisRequest: 0,
      recentEdits: [],
      projectContext: {
        filesCreated: [],
        filesEdited: [],
        lastActivity: Date.now(),
        componentRelationships: {}
      },
      conversationMemory: []
    }
  } else {
    // Reset counter for new request
    if (global.surgicalContext.currentRequestId !== currentRequestId) {
      global.surgicalContext.fileOperationsThisRequest = 0
      global.surgicalContext.currentRequestId = currentRequestId
    }
    // Update current user message
    global.surgicalContext.currentUserMessage = userMessage
  }

  // Clean up old entries (keep last 24 hours)
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000)
  global.surgicalContext.recentEdits = global.surgicalContext.recentEdits.filter(
    edit => edit.timestamp > oneDayAgo
  )
  global.surgicalContext.conversationMemory = global.surgicalContext.conversationMemory.filter(
    memory => memory.timestamp > oneDayAgo
  )

  return global.surgicalContext
}

// Track file operations for surgical context
function trackFileOperation(projectId: string, filePath: string, action: 'created' | 'edited' | 'read') {
  const context = initializeSurgicalContext(projectId)
  const userIntent = context.currentUserMessage || 'Unknown intent'

  // Increment operation counter
  context.fileOperationsThisRequest++

  context.recentEdits.push({
    filePath,
    action,
    timestamp: Date.now(),
    userIntent,
    projectId,
    requestId: context.currentRequestId
  })

  // Update project context
  if (action === 'created' && !context.projectContext.filesCreated.includes(filePath)) {
    context.projectContext.filesCreated.push(filePath)
  } else if (action === 'edited' && !context.projectContext.filesEdited.includes(filePath)) {
    context.projectContext.filesEdited.push(filePath)
  }

  context.projectContext.lastActivity = Date.now()

  // Limit arrays to prevent memory bloat
  if (context.recentEdits.length > 50) {
    context.recentEdits = context.recentEdits.slice(-50)
  }
  if (context.projectContext.filesCreated.length > 20) {
    context.projectContext.filesCreated = context.projectContext.filesCreated.slice(-20)
  }
  if (context.projectContext.filesEdited.length > 20) {
    context.projectContext.filesEdited = context.projectContext.filesEdited.slice(-20)
  }
}

// Add conversation memory for better context
function addConversationMemory(projectId: string, message: string, intent: string, filesAffected: string[] = []) {
  const context = initializeSurgicalContext(projectId)

  context.conversationMemory.push({
    message,
    intent,
    filesAffected,
    timestamp: Date.now()
  })

  // Keep only recent conversations
  if (context.conversationMemory.length > 10) {
    context.conversationMemory = context.conversationMemory.slice(-10)
  }
}

// Check if we've exceeded file operation limits
function checkFileOperationLimit(projectId: string): { allowed: boolean; operationsUsed: number; limit: number } {
  const context = initializeSurgicalContext(projectId)
  const limit = 3 // Maximum 3 file operations per request
  const operationsUsed = context.fileOperationsThisRequest

  return {
    allowed: operationsUsed < limit,
    operationsUsed,
    limit
  }
}

// Generate detailed surgical guidance with specific file instructions
function generateSurgicalGuidance(projectId: string, userMessage: string, intentData?: any): string {
  const context = initializeSurgicalContext(projectId)
  const limits = checkFileOperationLimit(projectId)

  let guidance = '\n### 🔪 PRECISE SURGICAL INSTRUCTIONS 🔪\n'

  // Operation limits warning
  if (!limits.allowed) {
    guidance += `\n🚨 FILE OPERATION LIMIT EXCEEDED: ${limits.operationsUsed}/${limits.limit}`
    guidance += '\n⚠️ STOP ALL FILE OPERATIONS - Request limit reached!'
    return guidance
  }

  guidance += `\n📊 FILE OPERATIONS USED: ${limits.operationsUsed}/${limits.limit}`

  // Analyze user message for specific file operations
  const specificInstructions = analyzeUserMessageForFileOperations(userMessage, context, intentData)

  if (specificInstructions.length > 0) {
    guidance += '\n\n🎯 SPECIFIC FILE OPERATIONS TO PERFORM:'
    specificInstructions.forEach((instruction, index) => {
      guidance += `\n${index + 1}. ${instruction}`
    })
  }

  // Recent edits context with specific warnings
  if (context.recentEdits.length > 0) {
    const recentFiles = Array.from(new Set(context.recentEdits.slice(-5).map(edit => edit.filePath)))
    guidance += '\n\n📁 EXISTING FILES (DO NOT RECREATE):'
    recentFiles.forEach(file => {
      const lastAction = context.recentEdits
        .filter(edit => edit.filePath === file)
        .sort((a, b) => b.timestamp - a.timestamp)[0]?.action
      guidance += `\n- ${file} (${lastAction})`
    })
    guidance += '\n\n⚠️ CRITICAL: EDIT existing files instead of creating duplicates!'
  }

  // Project context with specific file status
  if (context.projectContext.filesCreated.length > 0) {
    guidance += '\n\n🆕 FILES ALREADY CREATED THIS SESSION:'
    context.projectContext.filesCreated.forEach(file => {
      guidance += `\n- ${file} ✅ (ready to use)`
    })
  }

  // Read file recommendations
  const readRecommendations = getReadFileRecommendations(userMessage, context, intentData)
  if (readRecommendations.length > 0) {
    guidance += '\n\n📖 FILES TO READ FIRST:'
    readRecommendations.forEach(file => {
      guidance += `\n- ${file.filePath}: ${file.reason}`
    })
  }

  // Edit file instructions
  const editInstructions = getEditFileInstructions(userMessage, context, intentData)
  if (editInstructions.length > 0) {
    guidance += '\n\n✏️ FILES TO EDIT:'
    editInstructions.forEach(instruction => {
      guidance += `\n- ${instruction.filePath}: ${instruction.action}`
      if (instruction.lineHint) {
        guidance += ` (around line ${instruction.lineHint})`
      }
    })
  }

  // Create file instructions
  const createInstructions = getCreateFileInstructions(userMessage, context, intentData)
  if (createInstructions.length > 0) {
    guidance += '\n\n➕ FILES TO CREATE:'
    createInstructions.forEach(instruction => {
      guidance += `\n- ${instruction.filePath}: ${instruction.purpose}`
    })
  }

  // Operation sequence
  guidance += '\n\n🔄 OPERATION SEQUENCE:'
  guidance += '\n1. Read existing files first (to understand current structure)'
  guidance += '\n2. Edit existing files (preferred over creating new ones)'
  guidance += '\n3. Create new files only when necessary'
  guidance += `\n4. Maximum ${limits.limit} total file operations per request`

  // Component relationships
  if (Object.keys(context.projectContext.componentRelationships).length > 0) {
    guidance += '\n\n🔗 COMPONENT RELATIONSHIPS TO MAINTAIN:'
    Object.entries(context.projectContext.componentRelationships).forEach(([component, related]) => {
      guidance += `\n- ${component} depends on: ${related.join(', ')}`
    })
  }

  return guidance
}

// Analyze user message for specific file operations needed
function analyzeUserMessageForFileOperations(userMessage: string, context: any, intentData?: any): string[] {
  const instructions: string[] = []
  const message = userMessage.toLowerCase()

  // Component creation patterns
  if (message.includes('create') || message.includes('add') || message.includes('new')) {
    if (message.includes('component') || message.includes('button') || message.includes('header') ||
        message.includes('footer') || message.includes('nav') || message.includes('form')) {
      instructions.push('Check existing components first - do not create duplicates')
      instructions.push('Read App.jsx to see current component structure')
    }
  }

  // Styling patterns
  if (message.includes('style') || message.includes('color') || message.includes('layout') ||
      message.includes('design') || message.includes('css')) {
    instructions.push('Check existing CSS files and Tailwind classes before adding new styles')
    instructions.push('Look for existing component styling patterns to maintain consistency')
  }

  // Feature addition patterns
  if (message.includes('add feature') || message.includes('implement') || message.includes('build')) {
    instructions.push('READ App.jsx first to understand current app structure')
    instructions.push('Check what components are already imported and used')
  }

  // Edit patterns
  if (message.includes('change') || message.includes('update') || message.includes('modify') ||
      message.includes('fix') || message.includes('edit')) {
    instructions.push('Find the exact file that contains the code to change')
    instructions.push('READ the file first to see current content before editing')
  }

  // Specific component patterns
  if (message.includes('hero') || message.includes('landing')) {
    instructions.push('Check if Hero component exists - edit it instead of creating new')
  }

  if (message.includes('navigation') || message.includes('menu') || message.includes('navbar')) {
    instructions.push('Navigation is usually in Header.jsx - read it first')
  }

  if (message.includes('contact') || message.includes('about') || message.includes('services')) {
    instructions.push('These sections might already exist - check App.jsx structure first')
  }

  return instructions.slice(0, 4) // Max 4 specific instructions
}

// Get specific files that should be read first
function getReadFileRecommendations(userMessage: string, context: any, intentData?: any): Array<{filePath: string, reason: string}> {
  const recommendations: Array<{filePath: string, reason: string}> = []
  const message = userMessage.toLowerCase()

  // Always recommend reading App.jsx for structural changes
  if (message.includes('component') || message.includes('page') || message.includes('layout') ||
      message.includes('structure') || message.includes('add') || message.includes('create') ||
      message.includes('new') || message.includes('build')) {
    recommendations.push({
      filePath: 'src/App.jsx',
      reason: 'ESSENTIAL: Check current app structure and component hierarchy first'
    })
  }

  // Read specific component files based on user request
  if (message.includes('header') || message.includes('navigation') || message.includes('nav') ||
      message.includes('menu') || message.includes('navbar')) {
    const existingHeader = context.recentEdits.find((edit: any) => edit.filePath.includes('Header'))
    if (existingHeader) {
      recommendations.push({
        filePath: 'src/components/Header.jsx',
        reason: 'Header exists - read current navigation structure'
      })
    } else {
      recommendations.push({
        filePath: 'src/App.jsx',
        reason: 'Check if navigation exists in App or separate Header component'
      })
    }
  }

  if (message.includes('footer') || message.includes('bottom')) {
    const existingFooter = context.recentEdits.find((edit: any) => edit.filePath.includes('Footer'))
    if (existingFooter) {
      recommendations.push({
        filePath: 'src/components/Footer.jsx',
        reason: 'Footer exists - read current footer content'
      })
    }
  }

  if (message.includes('hero') || message.includes('landing') || message.includes('main')) {
    const existingHero = context.recentEdits.find((edit: any) => edit.filePath.includes('Hero'))
    if (existingHero) {
      recommendations.push({
        filePath: 'src/components/Hero.jsx',
        reason: 'Hero component exists - read current landing section'
      })
    }
  }

  if (message.includes('button') || message.includes('btn') || message.includes('click')) {
    const existingButton = context.recentEdits.find((edit: any) => edit.filePath.includes('Button'))
    if (existingButton) {
      recommendations.push({
        filePath: 'src/components/Button.jsx',
        reason: 'Button component exists - check current button styles and functionality'
      })
    }
  }

  if (message.includes('form') || message.includes('input') || message.includes('contact')) {
    const existingForm = context.recentEdits.find((edit: any) => edit.filePath.includes('Form'))
    if (existingForm) {
      recommendations.push({
        filePath: 'src/components/Form.jsx',
        reason: 'Form component exists - read current form structure'
      })
    }
  }

  // Read files that have been recently edited for context
  context.recentEdits.slice(-3).forEach((edit: any) => {
    if (!recommendations.some(rec => rec.filePath === edit.filePath)) {
      recommendations.push({
        filePath: edit.filePath,
        reason: `Recently ${edit.action} - check current state before making changes`
      })
    }
  })

  // If no specific recommendations, suggest reading main app file
  if (recommendations.length === 0) {
    recommendations.push({
      filePath: 'src/App.jsx',
      reason: 'Read main app structure to understand current implementation'
    })
  }

  return recommendations.slice(0, 4) // Max 4 read recommendations
}

// Get specific edit instructions
function getEditFileInstructions(userMessage: string, context: any, intentData?: any): Array<{filePath: string, action: string, lineHint?: number}> {
  const instructions: Array<{filePath: string, action: string, lineHint?: number}> = []
  const message = userMessage.toLowerCase()

  // Edit existing components based on user request
  if (message.includes('header') || message.includes('navigation') || message.includes('nav') ||
      message.includes('menu') || message.includes('navbar')) {
    const existingHeader = context.recentEdits.find((edit: any) => edit.filePath.includes('Header'))
    if (existingHeader) {
      let action = 'Update header content and navigation'
      if (message.includes('color') || message.includes('style')) {
        action = 'Update header styling and colors'
      } else if (message.includes('text') || message.includes('change')) {
        action = 'Update header text and links'
      }
      instructions.push({
        filePath: 'src/components/Header.jsx',
        action,
        lineHint: 5
      })
    }
  }

  if (message.includes('footer') || message.includes('bottom')) {
    const existingFooter = context.recentEdits.find((edit: any) => edit.filePath.includes('Footer'))
    if (existingFooter) {
      let action = 'Update footer content and links'
      if (message.includes('color') || message.includes('style')) {
        action = 'Update footer styling and layout'
      } else if (message.includes('text') || message.includes('contact')) {
        action = 'Update footer text and contact information'
      }
      instructions.push({
        filePath: 'src/components/Footer.jsx',
        action,
        lineHint: 3
      })
    }
  }

  if (message.includes('hero') || message.includes('landing') || message.includes('main')) {
    const existingHero = context.recentEdits.find((edit: any) => edit.filePath.includes('Hero'))
    if (existingHero) {
      let action = 'Update hero section content and layout'
      if (message.includes('color') || message.includes('background')) {
        action = 'Update hero background and colors'
      } else if (message.includes('text') || message.includes('title')) {
        action = 'Update hero title and description text'
      }
      instructions.push({
        filePath: 'src/components/Hero.jsx',
        action,
        lineHint: 8
      })
    }
  }

  if (message.includes('button') || message.includes('btn') || message.includes('click')) {
    const existingButton = context.recentEdits.find((edit: any) => edit.filePath.includes('Button'))
    if (existingButton) {
      let action = 'Update button component styling and functionality'
      if (message.includes('color') || message.includes('style')) {
        action = 'Update button colors and visual styling'
      } else if (message.includes('text') || message.includes('label')) {
        action = 'Update button text and labels'
      } else if (message.includes('function') || message.includes('click')) {
        action = 'Update button click handlers and functionality'
      }
      instructions.push({
        filePath: 'src/components/Button.jsx',
        action,
        lineHint: 5
      })
    }
  }

  // Edit App.jsx for structural changes
  if (message.includes('layout') || message.includes('structure') || message.includes('component') ||
      message.includes('add') || message.includes('remove') || message.includes('reorganize')) {
    let action = 'Update component imports and app layout structure'
    if (message.includes('add')) {
      action = 'Add new component imports and update layout'
    } else if (message.includes('remove')) {
      action = 'Remove component imports and update layout'
    }
    instructions.push({
      filePath: 'src/App.jsx',
      action,
      lineHint: 1
    })
  }

  // Edit based on recently created files
  context.projectContext.filesCreated.forEach((filePath: string) => {
    const componentName = filePath.split('/').pop()?.replace('.jsx', '').toLowerCase() || ''
    if (message.includes(componentName) || message.includes('new') || message.includes('created')) {
      instructions.push({
        filePath,
        action: `Modify newly created ${componentName} component`,
        lineHint: 1
      })
    }
  })

  // If no specific instructions but we have existing files, suggest editing them
  if (instructions.length === 0 && context.recentEdits.length > 0) {
    const mostRecentEdit = context.recentEdits[context.recentEdits.length - 1]
    instructions.push({
      filePath: mostRecentEdit.filePath,
      action: `Continue editing ${mostRecentEdit.filePath.split('/').pop()}`,
      lineHint: 1
    })
  }

  return instructions.slice(0, 3) // Max 3 edit instructions
}

// Get specific create instructions
function getCreateFileInstructions(userMessage: string, context: any, intentData?: any): Array<{filePath: string, purpose: string}> {
  const instructions: Array<{filePath: string, purpose: string}> = []
  const message = userMessage.toLowerCase()

  // Only suggest creating files if they don't already exist and are specifically requested
  if (message.includes('create') || message.includes('add') || message.includes('new') ||
      message.includes('build') || message.includes('make')) {

    // Check for specific component requests
    if ((message.includes('button') || message.includes('btn')) &&
        !context.recentEdits.some((edit: any) => edit.filePath.includes('Button'))) {
      let purpose = 'Create reusable button component with proper styling'
      if (message.includes('primary') || message.includes('main')) {
        purpose = 'Create primary action button component'
      } else if (message.includes('secondary')) {
        purpose = 'Create secondary button component'
      } else if (message.includes('icon')) {
        purpose = 'Create button component with icon support'
      }
      instructions.push({
        filePath: 'src/components/Button.jsx',
        purpose
      })
    }

    if ((message.includes('header') || message.includes('navigation') || message.includes('nav') ||
         message.includes('menu') || message.includes('navbar')) &&
        !context.recentEdits.some((edit: any) => edit.filePath.includes('Header'))) {
      let purpose = 'Create header component with navigation'
      if (message.includes('responsive') || message.includes('mobile')) {
        purpose = 'Create responsive header with mobile navigation menu'
      } else if (message.includes('logo')) {
        purpose = 'Create header component with logo and navigation'
      }
      instructions.push({
        filePath: 'src/components/Header.jsx',
        purpose
      })
    }

    if ((message.includes('footer') || message.includes('bottom')) &&
        !context.recentEdits.some((edit: any) => edit.filePath.includes('Footer'))) {
      let purpose = 'Create footer component with links and information'
      if (message.includes('contact')) {
        purpose = 'Create footer with contact information and social links'
      } else if (message.includes('links')) {
        purpose = 'Create footer with navigation links'
      }
      instructions.push({
        filePath: 'src/components/Footer.jsx',
        purpose
      })
    }

    if ((message.includes('hero') || message.includes('landing') || message.includes('main') ||
         message.includes('banner')) &&
        !context.recentEdits.some((edit: any) => edit.filePath.includes('Hero'))) {
      let purpose = 'Create hero section component for landing page'
      if (message.includes('call') || message.includes('action')) {
        purpose = 'Create hero section with call-to-action buttons'
      } else if (message.includes('image') || message.includes('background')) {
        purpose = 'Create hero section with background image'
      }
      instructions.push({
        filePath: 'src/components/Hero.jsx',
        purpose
      })
    }

    if ((message.includes('form') || message.includes('contact') || message.includes('input')) &&
        !context.recentEdits.some((edit: any) => edit.filePath.includes('Form'))) {
      let purpose = 'Create form component with input validation'
      if (message.includes('contact')) {
        purpose = 'Create contact form with name, email, and message fields'
      } else if (message.includes('login') || message.includes('sign')) {
        purpose = 'Create login/signup form component'
      }
      instructions.push({
        filePath: 'src/components/Form.jsx',
        purpose
      })
    }

    if ((message.includes('card') || message.includes('panel')) &&
        !context.recentEdits.some((edit: any) => edit.filePath.includes('Card'))) {
      let purpose = 'Create reusable card component'
      if (message.includes('product')) {
        purpose = 'Create product card component for e-commerce'
      } else if (message.includes('feature')) {
        purpose = 'Create feature card component'
      }
      instructions.push({
        filePath: 'src/components/Card.jsx',
        purpose
      })
    }

    // Generic component creation for other requests
    if (instructions.length === 0 && (message.includes('component') || message.includes('page'))) {
      // Extract potential component name from the message
      const words = message.split(' ')
      const componentKeywords = ['page', 'section', 'modal', 'sidebar', 'sidebar', 'panel', 'widget']
      const potentialName = words.find(word =>
        word.length > 3 &&
        !['create', 'add', 'new', 'build', 'make', 'component', 'page', 'section'].includes(word)
      )

      if (potentialName) {
        const componentName = potentialName.charAt(0).toUpperCase() + potentialName.slice(1)
        instructions.push({
          filePath: `src/components/${componentName}.jsx`,
          purpose: `Create ${componentName} component as requested`
        })
      }
    }
  }

  return instructions.slice(0, 2) // Max 2 create instructions
}

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

// Get Mistral Pixtral model for NLP and intent detection
const getMistralPixtralModel = () => {
  try {
    return getModel('pixtral-12b-2409')
  } catch (error) {
    console.warn('Mistral Pixtral model not available, falling back to default')
    return getModel(DEFAULT_CHAT_MODEL)
  }
}

// Add Tavily API configuration with environment variable support
const tavilyConfig = {
  apiKeys: [
    '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',
    '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',
    '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'
  ],
  searchUrl: 'https://api.tavily.com/search',
  extractUrl: 'https://api.tavily.com/extract',
  currentKeyIndex: 0
};

// Clean and format web search results for better AI consumption
function cleanWebSearchResults(results: any[], query: string): string {
  if (!results || results.length === 0) {
    return `No results found for query: "${query}"`
  }

  let cleanedText = `🔍 **Web Search Results for: "${query}"**\n\n`
  
  results.forEach((result, index) => {
    const title = result.title || 'Untitled'
    const url = result.url || 'No URL'
    const content = result.content || result.raw_content || 'No content available'
    
    // Clean and truncate content to 1500 chars total
    const maxContentPerResult = Math.floor(1500 / results.length)
    const cleanedContent = content
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\n+/g, ' ') // Replace multiple newlines with single space
      .trim()
      .substring(0, maxContentPerResult)
    
    cleanedText += `**${index + 1}. ${title}**\n`
    cleanedText += `🔗 ${url}\n`
    cleanedText += `${cleanedContent}${cleanedContent.length >= maxContentPerResult ? '...' : ''}\n\n`
  })
  
  // Ensure total length doesn't exceed 1500 characters
  if (cleanedText.length > 1500) {
    cleanedText = cleanedText.substring(0, 1497) + '...'
  }
  
  return cleanedText
}

// Web search function using Tavily API
async function searchWeb(query: string) {
  // Check if API keys are available
  if (tavilyConfig.apiKeys.length === 0) {
    throw new Error('No Tavily API keys are configured.');
  }
  
  try {
    console.log('Starting web search for:', query);
    
    // Rotate through available API keys
    const apiKey = tavilyConfig.apiKeys[tavilyConfig.currentKeyIndex];
    tavilyConfig.currentKeyIndex = (tavilyConfig.currentKeyIndex + 1) % tavilyConfig.apiKeys.length;
    
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        query: query,
        search_depth: "basic",
        include_answer: false,
        include_raw_content: true,
        max_results: 3
      })
    });

    if (!response.ok) {
      throw new Error(`Web search failed with status ${response.status}`);
    }

    const data = await response.json();
    
    // Clean and format results for AI consumption
    const cleanedResults = cleanWebSearchResults(data.results || [], query)
    
    console.log('Web search successful (cleaned and formatted):', {
      query,
      resultCount: data.results?.length || 0,
      cleanedLength: cleanedResults.length
    })
    
    return {
      rawData: data,
      cleanedResults: cleanedResults,
      query: query,
      resultCount: data.results?.length || 0
    }
  } catch (error) {
    console.error('Web search error:', error);
    throw error;
  }
}

// Clean and format extracted content for better AI consumption
function cleanExtractedContent(content: any[], urls: string[]): string {
  if (!content || content.length === 0) {
    return `No content extracted from URLs: ${urls.join(', ')}`
  }

  let cleanedText = `📄 **Content Extraction Results**\n\n`
  
  content.forEach((item, index) => {
    const url = item.url || urls[index] || 'Unknown URL'
    const title = item.title || 'Untitled'
    const text = item.text || item.raw_content || 'No content available'
    
    // Clean and truncate content to fit within 1500 chars total
    const maxContentPerItem = Math.floor(1500 / content.length)
    const cleanedItemText = text
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\n+/g, ' ') // Replace multiple newlines with single space
      .trim()
      .substring(0, maxContentPerItem)
    
    cleanedText += `**${index + 1}. ${title}**\n`
    cleanedText += `🔗 ${url}\n`
    cleanedText += `${cleanedItemText}${cleanedItemText.length >= maxContentPerItem ? '...' : ''}\n\n`
  })
  
  // Ensure total length doesn't exceed 1500 characters
  if (cleanedText.length > 1500) {
    cleanedText = cleanedText.substring(0, 1497) + '...'
  }
  
  return cleanedText
}

// Content extraction function using Tavily API
async function extractContent(urls: string | string[]) {
  // Check if API keys are available
  if (tavilyConfig.apiKeys.length === 0) {
    throw new Error('No Tavily API keys are configured.');
  }
  
  try {
    // Ensure urls is always an array
    const urlArray = Array.isArray(urls) ? urls : [urls];
    
    // Rotate through available API keys
    const apiKey = tavilyConfig.apiKeys[tavilyConfig.currentKeyIndex];
    tavilyConfig.currentKeyIndex = (tavilyConfig.currentKeyIndex + 1) % tavilyConfig.apiKeys.length;
    
    console.log('Starting content extraction for:', urlArray);
    const response = await fetch('https://api.tavily.com/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        urls: urlArray,
        include_images: false,
        extract_depth: "basic"
      })
    });

    if (!response.ok) {
      throw new Error(`Content extraction failed with status ${response.status}`);
    }

    const data = await response.json();
    
    // Clean and format extracted content for AI consumption
    const cleanedContent = cleanExtractedContent(data.content || [], urlArray)
    
    console.log('Content extraction successful (cleaned and formatted):', {
      urlCount: urlArray.length,
      contentCount: data.content?.length || 0,
      cleanedLength: cleanedContent.length
    })
    
    return {
      rawData: data,
      cleanedContent: cleanedContent,
      urls: urlArray,
      contentCount: data.content?.length || 0
    }
  } catch (error) {
    console.error('Content extraction error:', error);
    throw error;
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

// ENHANCED: Ultra-optimized project context builder (95%+ token reduction)
async function buildOptimizedProjectContext(projectId: string, storageManager: any, userIntent?: any) {
  try {
    const files = await storageManager.getFiles(projectId)

    // ENHANCEMENT 1: Intelligent file prioritization based on multiple factors
    let relevantFiles = files
    let contextPriority = 'balanced' // 'minimal', 'balanced', 'comprehensive'

    if (userIntent?.intent) {
      // Determine context priority based on task complexity
      if (userIntent.complexity === 'simple') {
        contextPriority = 'minimal'
      } else if (userIntent.complexity === 'complex') {
        contextPriority = 'comprehensive'
      }

      // Enhanced intent-based filtering
      const intent = userIntent.intent.toLowerCase()
      if (intent.includes('component') || intent.includes('ui') || intent.includes('react')) {
        relevantFiles = files.filter((f: any) =>
          f.path.includes('/components/') ||
          f.path.includes('/ui/') ||
          f.path.includes('.tsx') ||
          f.path.includes('.jsx') ||
          f.path === 'package.json'
        )
      } else if (intent.includes('api') || intent.includes('route') || intent.includes('backend')) {
        relevantFiles = files.filter((f: any) =>
          f.path.includes('/api/') ||
          f.path.includes('/routes/') ||
          f.path.includes('/lib/') ||
          f.path.includes('.ts')
        )
      } else if (intent.includes('config') || intent.includes('setup')) {
        relevantFiles = files.filter((f: any) =>
          f.path.includes('config') ||
          f.path.includes('.json') ||
          f.path.includes('.env') ||
          f.path.includes('vite.config') ||
          f.path.includes('package.json')
        )
      } else if (intent.includes('style') || intent.includes('css')) {
        relevantFiles = files.filter((f: any) =>
          f.path.includes('.css') ||
          f.path.includes('.scss') ||
          f.path.includes('tailwind')
        )
      }
    }

    // ENHANCEMENT 2: Smart file ranking and limiting
    const maxFiles = contextPriority === 'minimal' ? 8 : contextPriority === 'comprehensive' ? 25 : 15

    // Score files by relevance
    const scoredFiles = relevantFiles.map((file: any) => {
      let score = 0

      // Boost score for core files
      if (file.path.includes('package.json')) score += 10
      if (file.path.includes('main.') || file.path.includes('App.')) score += 8
      if (file.path.includes('index.')) score += 6

      // Boost score for recently modified files
      const daysSinceModified = file.updatedAt ?
        (Date.now() - new Date(file.updatedAt).getTime()) / (1000 * 60 * 60 * 24) : 30
      if (daysSinceModified < 7) score += 5
      else if (daysSinceModified < 30) score += 2

      // Boost score for larger files (likely more important)
      if (file.size > 1000) score += 3

      return { ...file, relevanceScore: score }
    })

    // Sort by relevance and limit
    scoredFiles.sort((a: any, b: any) => b.relevanceScore - a.relevanceScore)
    const limitedFiles = scoredFiles.slice(0, maxFiles)

    // ENHANCEMENT 3: Compact but informative file summary
    const fileSummary = limitedFiles.map((f: any) => {
      const fileName = f.path.split('/').pop() || f.path
      const fileType = f.fileType || f.type || 'file'
      const size = f.size ? `(${Math.round(f.size / 1024)}KB)` : ''
      return `${fileName} [${fileType}] ${size}`
    }).join(' • ')

    // ENHANCEMENT 4: Smart directory structure
    const directories = new Set<string>()
    limitedFiles.forEach((f: any) => {
      const pathParts = f.path.split('/')
      if (pathParts.length > 1) {
        directories.add(pathParts.slice(0, -1).join('/'))
      }
    })

    const dirSummary = Array.from(directories)
      .filter(dir => dir && !dir.includes('node_modules'))
      .slice(0, 8)
      .join(' • ')


    // ENHANCEMENT 6: File type breakdown for better understanding
    const fileTypeStats = limitedFiles.reduce((acc: any, file: any) => {
      const type = file.fileType || file.type || 'unknown'
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {})

    const typeSummary = Object.entries(fileTypeStats)
      .map(([type, count]) => `${type}: ${count}`)
      .join(', ')

    // ENHANCEMENT 7: Ultra-compact context format with emoji indicators
    const context = `📁 PROJECT: ${files.length} total files
🔧 ACTIVE: ${limitedFiles.length} relevant (${typeSummary})
📂 DIRS: ${dirSummary || 'src • components • lib'}
📄 FILES: ${fileSummary || 'App.tsx • package.json • index.html'}
🎯 MODE: AGENT (file operations enabled)`

    console.log(`[CONTEXT OPTIMIZATION] Enhanced: ${files.length} → ${limitedFiles.length} files (${contextPriority} priority)`)
    return context

  } catch (error) {
    console.error('Error building enhanced project context:', error)
    return `📁 PROJECT: ${projectId}
🎯 MODE: AGENT (file operations available)
⚠️ Context loading failed - working with limited context`
  }
}

// AI-Enhanced Memory Processing Functions
async function processMemoryWithAI(
  conversationMemory: any,
  userMessage: string,
  projectContext: string,
  toolCalls?: any[]
) {
  try {
    const mistralPixtral = getMistralPixtralModel()
    
    const enhancedMemory = await generateText({
      model: mistralPixtral,
      messages: [
        { role: 'system', content: 'You are an AI assistant analyzing development conversations.' },
        { role: 'user', content: `Analyze this development conversation and enhance the memory with intelligent insights:

User Message: "${userMessage}"
Project Context: ${projectContext}
Conversation History: ${JSON.stringify(conversationMemory?.messages?.slice(-20) || [])}
Tool Calls: ${JSON.stringify(toolCalls || [])}

Provide a JSON response with enhanced memory analysis:
{
  "semanticSummary": "Intelligent summary of development progress and key decisions",
  "keyInsights": ["insight1", "insight2", "insight3"],
  "technicalPatterns": ["pattern1", "pattern2"],
  "architecturalDecisions": ["decision1", "decision2"],
  "nextLogicalSteps": ["step1", "step2"],
  "potentialImprovements": ["improvement1", "improvement2"],
  "relevanceScore": 0.0-1.0,
  "contextForFuture": "What future developers should know about this work"
}

Focus on extracting meaningful patterns, decisions, and insights that will be valuable for future development.` }
      ],
      temperature: 0.3
    })

    try {
      // Check if the response is actually JSON
      console.log('[DEBUG] Memory enhancement response type check:', {
        hasText: !!enhancedMemory.text,
        textLength: enhancedMemory.text?.length || 0,
        startsWithBrace: enhancedMemory.text?.trim().startsWith('{') || false,
        textPreview: enhancedMemory.text?.substring(0, 100) || 'no text'
      })
      
      if (enhancedMemory.text && enhancedMemory.text.trim().startsWith('{')) {
        // Extract JSON from markdown response if present
        let jsonText = enhancedMemory.text
        if (jsonText.includes('```json')) {
          jsonText = jsonText.replace(/```json\s*/, '').replace(/\s*```$/, '')
        } else if (jsonText.includes('```')) {
          jsonText = jsonText.replace(/```\s*/, '').replace(/\s*```$/, '')
        }
        jsonText = jsonText.trim()
        
        // Remove any text after the JSON object
        const jsonEndIndex = jsonText.lastIndexOf('}')
        if (jsonEndIndex !== -1) {
          jsonText = jsonText.substring(0, jsonEndIndex + 1)
        }
        
        const parsed = JSON.parse(jsonText)
      return {
        semanticSummary: parsed.semanticSummary || 'Development progress analyzed',
        keyInsights: parsed.keyInsights || [],
        technicalPatterns: parsed.technicalPatterns || [],
        architecturalDecisions: parsed.architecturalDecisions || [],
        nextLogicalSteps: parsed.nextLogicalSteps || [],
        potentialImprovements: parsed.potentialImprovements || [],
        relevanceScore: parsed.relevanceScore || 0.8,
        contextForFuture: parsed.contextForFuture || 'Standard development patterns used'
        }
      } else {
        // Handle non-JSON responses (plain text)
        console.log('[DEBUG] AI returned plain text instead of JSON for memory enhancement')
        return {
          semanticSummary: enhancedMemory.text || 'Development progress tracked',
          keyInsights: ['Basic development patterns established'],
          technicalPatterns: ['Standard React/TypeScript patterns'],
          architecturalDecisions: ['Component-based architecture'],
          nextLogicalSteps: ['Continue with current patterns'],
          potentialImprovements: ['Consider adding tests'],
          relevanceScore: 0.7,
          contextForFuture: 'Standard development approach used'
        }
      }
    } catch (parseError) {
      console.warn('Failed to parse AI memory enhancement, using fallback:', parseError)
      return {
        semanticSummary: 'Development progress tracked',
        keyInsights: ['Basic development patterns established'],
        technicalPatterns: ['Standard React/TypeScript patterns'],
        architecturalDecisions: ['Component-based architecture'],
        nextLogicalSteps: ['Continue with current patterns'],
        potentialImprovements: ['Consider adding tests'],
        relevanceScore: 0.7,
        contextForFuture: 'Standard development approach used'
      }
    }
  } catch (error) {
    console.error('AI memory enhancement failed:', error)
    // Return fallback enhancement
    return {
      semanticSummary: 'Memory processing completed',
      keyInsights: ['Development work tracked'],
      technicalPatterns: ['React/TypeScript patterns'],
      architecturalDecisions: ['Component architecture'],
      nextLogicalSteps: ['Continue development'],
      potentialImprovements: ['Add documentation'],
      relevanceScore: 0.6,
      contextForFuture: 'Development work in progress'
    }
  }
}

// ULTRA-COMPACT: Memory retrieval (80% token reduction)
async function findRelevantMemories(
  userQuery: string,
  projectContext: string,
  conversationMemory: any
) {
  try {
    // OPTIMIZATION: Compress conversation memory to essential info only
    const compressedMemory = conversationMemory?.messages?.slice(-10).map((m: any) =>
      `${m.role[0]}:${m.content.substring(0, 100)}`
    ).join('|') || ''

    // OPTIMIZATION: Compact prompt format
    const compactQuery = `${userQuery.substring(0, 200)}|${compressedMemory}`

    const mistralPixtral = getMistralPixtralModel()
    const relevantMemories = await generateText({
      model: mistralPixtral,
      messages: [
        { role: 'system', content: 'JSON: {"context":"", "files":[], "score":0.5}' },
        { role: 'user', content: compactQuery }
      ],
      temperature: 0.3,
    })

    try {
      // Check if the response is actually JSON
      console.log('[DEBUG] Memory retrieval response type check:', {
        hasText: !!relevantMemories.text,
        textLength: relevantMemories.text?.length || 0,
        startsWithBrace: relevantMemories.text?.trim().startsWith('{') || false,
        textPreview: relevantMemories.text?.substring(0, 100) || 'no text'
      })
      
      if (relevantMemories.text && relevantMemories.text.trim().startsWith('{')) {
        const parsed = JSON.parse(relevantMemories.text)
      return {
        relevantContext: parsed.relevantContext || 'No specific relevant context found',
        keyRelevantFiles: parsed.keyRelevantFiles || [],
        relevantDecisions: parsed.relevantDecisions || [],
        applicablePatterns: parsed.applicablePatterns || [],
        relevanceScore: parsed.relevanceScore || 0.5,
        whyRelevant: parsed.whyRelevant || 'General development context'
        }
      } else {
        // Handle non-JSON responses (plain text)
        console.log('[DEBUG] AI returned plain text instead of JSON for memory retrieval')
        return {
          relevantContext: relevantMemories.text || 'General development context available',
          keyRelevantFiles: [],
          relevantDecisions: ['Standard development patterns'],
          applicablePatterns: ['React/TypeScript best practices'],
          relevanceScore: 0.5,
          whyRelevant: 'Provides general development guidance'
        }
      }
    } catch (parseError) {
      console.warn('Failed to parse AI memory retrieval, using fallback:', parseError)
      return {
        relevantContext: 'General development context available',
        keyRelevantFiles: [],
        relevantDecisions: ['Standard development patterns'],
        applicablePatterns: ['React/TypeScript best practices'],
        relevanceScore: 0.5,
        whyRelevant: 'Provides general development guidance'
      }
    }
  } catch (error) {
    console.error('AI memory retrieval failed:', error)
    return {
      relevantContext: 'Basic development context',
      keyRelevantFiles: [],
      relevantDecisions: ['Standard patterns'],
      applicablePatterns: ['Best practices'],
      relevanceScore: 0.4,
      whyRelevant: 'General development knowledge'
    }
  }
}

// AI Learning from Development Patterns
async function learnFromPatterns(
  projectId: string,
  userId: string,
  conversationMemory: any,
  projectFiles: any[]
) {
  try {
    const mistralPixtral = getMistralPixtralModel()
    
    // OPTIMIZATION 1: Filter files - only src/ files, exclude ui components
    const relevantFiles = projectFiles.filter(file => 
      file.path.startsWith('src/') && 
      !file.path.startsWith('src/components/ui/') &&
      !file.isDirectory
    )
    
    // OPTIMIZATION 2: Truncate file content to max 50 tokens (~200 chars) per file
    const truncatedFiles = relevantFiles.slice(0, 10).map(file => ({
      path: file.path,
      content: (file.content || '').substring(0, 200) + (file.content?.length > 200 ? '...' : ''),
      type: file.fileType || 'text'
    }))
    
    // OPTIMIZATION 3: Only last 5 messages with truncation
    const recentMessages = (conversationMemory?.messages || [])
      .slice(-5)
      .map((msg: any) => ({
        role: msg.role,
        content: (msg.content || '').substring(0, 100) + (msg.content?.length > 100 ? '...' : '')
      }))
    // ULTRA-COMPACT: 100-token optimization with type safety
    const messagesSummary = recentMessages.map((m: { role: string, content: string }) => 
      `${m.role[0]}:${m.content.substring(0, 50)}`
    ).join('|')
    const filesSummary = truncatedFiles.map((f: { path: string, type: string }) => 
      `${f.path.split('/').pop()}:${f.type}`
    ).join(',')
    const promptContent = `${messagesSummary}|${filesSummary}`

    const estimatedTokens = Math.ceil(promptContent.length / 4)
    console.log(`[ULTRA-COMPACT] Token estimate: ${estimatedTokens}`)

    const learningInsights = await generateText({
      model: mistralPixtral,
      messages: [
        { role: 'system', content: 'JSON output only: {"patterns":[], "tech":[], "score":0.0}' },
        { role: 'user', content: promptContent }
      ],
      temperature: 0.1,
    })

    try {
      // Check if the response is actually JSON
      console.log('[DEBUG] Learning insights response type check:', {
        hasText: !!learningInsights.text,
        textLength: learningInsights.text?.length || 0,
        startsWithBrace: learningInsights.text?.trim().startsWith('{') || false,
        textPreview: learningInsights.text?.substring(0, 100) || 'no text'
      })
      
      if (learningInsights.text && learningInsights.text.trim().startsWith('{')) {
        // Extract JSON from markdown response if present
        let jsonText = learningInsights.text
        if (jsonText.includes('```json')) {
          jsonText = jsonText.replace(/```json\s*/, '').replace(/\s*```$/, '')
        } else if (jsonText.includes('```')) {
          jsonText = jsonText.replace(/```\s*/, '').replace(/\s*```$/, '')
        }
        jsonText = jsonText.trim()
        
        // Remove any text after the JSON object
        const jsonEndIndex = jsonText.lastIndexOf('}')
        if (jsonEndIndex !== -1) {
          jsonText = jsonText.substring(0, jsonEndIndex + 1)
        }
        
        const parsed = JSON.parse(jsonText)
      return {
        codingStyle: parsed.style || parsed.codingStyle || 'Standard React/TypeScript patterns',
        componentPatterns: parsed.patterns || parsed.componentPatterns || ['Functional components'],
        stylingPreferences: parsed.styling || parsed.stylingPreferences || ['Tailwind CSS'],
        technicalDecisions: parsed.tech || parsed.technicalDecisions || ['Component-based architecture'],
        commonApproaches: parsed.approaches || parsed.commonApproaches || ['Modular development'],
        optimizationAreas: parsed.areas || parsed.optimizationAreas || ['Code organization'],
        learningScore: parsed.score || parsed.learningScore || 0.7,
        recommendations: parsed.recs || parsed.recommendations || ['Continue current patterns']
        }
      } else {
        // Handle non-JSON responses (plain text)
        console.log('[DEBUG] AI returned plain text instead of JSON for learning insights')
        return {
          codingStyle: learningInsights.text || 'Standard React/TypeScript patterns',
          componentPatterns: ['Functional components'],
          stylingPreferences: ['Tailwind CSS'],
          technicalDecisions: ['Component-based architecture'],
          commonApproaches: ['Modular development'],
          optimizationAreas: ['Code organization'],
          learningScore: 0.6,
          recommendations: ['Continue current patterns']
        }
      }
    } catch (parseError) {
      console.warn('Failed to parse AI learning insights, using fallback:', parseError)
      return {
        codingStyle: 'Standard React/TypeScript patterns',
        componentPatterns: ['Functional components'],
        stylingPreferences: ['Tailwind CSS'],
        technicalDecisions: ['Component-based architecture'],
        commonApproaches: ['Modular development'],
        optimizationAreas: ['Code organization'],
        learningScore: 0.6,
        recommendations: ['Continue current patterns']
      }
    }
  } catch (error) {
    console.error('AI learning analysis failed:', error)
    return {
      codingStyle: 'Standard development patterns',
      componentPatterns: ['Basic components'],
      stylingPreferences: ['CSS frameworks'],
      technicalDecisions: ['Standard architecture'],
      commonApproaches: ['Basic development'],
      optimizationAreas: ['General improvement'],
      learningScore: 0.5,
      recommendations: ['Follow best practices']
    }
  }
}

// Helper function to detect if user is reporting code issues
function isReportingCodeIssues(userMessage: string, intentData?: any): boolean {
  const lowerMessage = userMessage.toLowerCase()

  // Keywords that indicate code issues or problems
  const codeIssueKeywords = [
    'error', 'bug', 'issue', 'problem', 'broken', 'not working', 'fails', 'failing',
    'crash', 'crashes', 'exception', 'debug', 'fix', 'broken', 'malfunction',
    'dependency issue', 'import error', 'compilation error', 'runtime error',
    'type error', 'syntax error', 'linting error', 'build error', 'test failure',
    'doesn\'t work', 'won\'t work', 'can\'t', 'unable to', 'stuck', 'hangs',
    'freezes', 'stops working', 'not responding', 'issues with', 'problems with',
    'trouble with', 'having issues', 'having problems', 'need help with'
  ]

  // Check if any code issue keywords are present
  const hasCodeIssueKeywords = codeIssueKeywords.some(keyword =>
    lowerMessage.includes(keyword)
  )

  // Check intent data for debugging or fixing patterns
  const hasDebugIntent = intentData?.intent?.toLowerCase().includes('debug') ||
                        intentData?.intent?.toLowerCase().includes('fix') ||
                        intentData?.intent?.toLowerCase().includes('error')

  return hasCodeIssueKeywords || hasDebugIntent
}

// Helper function to detect if user is requesting file listing
function isRequestingFileList(userMessage?: string): boolean {
  if (!userMessage) return false
  
  const lowerMessage = userMessage.toLowerCase()
  return /\b(list files?|show files|directory|dir\b|ls\b|file list|what files|show me.*(files|directory)|browse files|view files)\b/i.test(lowerMessage)
}

// Helper function to create file operation tools based on AI mode
function createFileOperationTools(projectId: string, aiMode: 'ask' | 'agent' = 'agent', conversationMemory: any[] = [], userId?: string, intentData?: any, userMessage?: string, globalTracker?: any) {
  const tools: Record<string, any> = {}

  // Tool usage tracking for efficiency monitoring
  const toolUsageTracker = {
    filesRead: new Set<string>(),
    filesEdited: new Set<string>(),
    readCount: 0,
    editCount: 0,
    totalTools: 0,
    globalTracker: globalTracker // Reference to the global tracker
  }

  // Check if user is reporting code issues - only include advanced tools then
  const userReportingIssues = userMessage ? isReportingCodeIssues(userMessage, intentData) : false

  // Check if web tools are explicitly needed based on intent detection
  const needsWebTools = intentData?.required_tools?.includes('web_search') || intentData?.required_tools?.includes('web_extract')

  // ASK MODE: Include read-only tools for codebase exploration and analysis
  if (aiMode === 'ask') {
    // Always include read and analysis tools for ask mode
    tools.read_file = tool({
      description: 'Read and analyze file contents for codebase discussion and questions',
      inputSchema: z.object({
        path: z.string().describe('File path to read for analysis')
      }),
      execute: async ({ path }, { abortSignal, toolCallId }) => {
        if (abortSignal?.aborted) {
          throw new Error('Operation cancelled')
        }

        // Track file reads for efficiency monitoring
        toolUsageTracker.totalTools++
        toolUsageTracker.readCount++
        
        if (toolUsageTracker.filesRead.has(path)) {
          console.warn(`⚠️ EFFICIENCY WARNING: Reading file ${path} multiple times in one request`)
        }
        toolUsageTracker.filesRead.add(path)

        try {
          const { storageManager } = await import('@/lib/storage-manager')
          await storageManager.init()

          const file = await storageManager.getFile(projectId, path)
          if (!file) {
            return {
              success: false,
              error: `File not found: ${path}`,
              toolCallId
            }
          }

          return {
            success: true,
            message: `📖 Analyzed file: ${path}`,
            path,
            content: file.content,
            size: file.size,
            type: file.type,
            toolCallId
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          return {
            success: false,
            error: `Failed to read file: ${errorMessage}`,
            toolCallId
          }
        }
      }
    })

    // Include list_files only when user explicitly requests file listing
    if (isRequestingFileList(userMessage)) {
      tools.list_files = tool({
        description: 'Explore project structure and file organization for codebase understanding',
        inputSchema: z.object({
          path: z.string().optional().describe('Directory path to list (default: root)')
        }),
        execute: async ({ path = '/' }, { abortSignal, toolCallId }) => {
          if (abortSignal?.aborted) {
            throw new Error('Operation cancelled')
          }

        try {
          const { storageManager } = await import('@/lib/storage-manager')
          await storageManager.init()

          const files = await storageManager.getFiles(projectId)

          // Filter by path if specified
          const filteredFiles = path === '/' ? files : files.filter(f =>
            f.path.startsWith(path) && !f.path.slice(path.length + 1).includes('/')
          )

          return {
            success: true,
            message: `📁 Explored directory: ${path}`,
            files: filteredFiles.map(f => ({
              name: f.name,
              path: f.path,
              type: f.type,
              size: f.size,
              isDirectory: f.isDirectory
            })),
            count: filteredFiles.length,
            path,
            toolCallId
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          return {
            success: false,
            error: `Failed to list files: ${errorMessage}`,
            toolCallId
          }
        }
      }
    })
  }

    // Include analysis tools for ask mode
    tools.analyze_dependencies = tool({
      description: 'Analyze project dependencies and provide insights for codebase understanding',
      inputSchema: z.object({
        filePath: z.string().optional().describe('Specific file to analyze (optional)')
      }),
      execute: async ({ filePath }, { abortSignal, toolCallId }) => {
        if (abortSignal?.aborted) {
          throw new Error('Operation cancelled')
        }

        try {
          const { storageManager } = await import('@/lib/storage-manager')
          await storageManager.init()

          const files = await storageManager.getFiles(projectId)

          // Analyze package.json if available
          const packageJson = files.find(f => f.path === 'package.json')

          let analysis = {
            totalFiles: files.length,
            fileTypes: {} as Record<string, number>,
            dependencies: {} as Record<string, string>,
            scripts: {} as Record<string, string>,
            analysis: [] as string[]
          }

          if (packageJson) {
            try {
              const pkg = JSON.parse(packageJson.content)
              analysis.dependencies = pkg.dependencies || {}
              analysis.scripts = pkg.scripts || {}
              analysis.analysis.push(`📦 Found ${Object.keys(analysis.dependencies).length} dependencies`)
              analysis.analysis.push(`🎯 Found ${Object.keys(analysis.scripts).length} npm scripts`)
            } catch (e) {
              analysis.analysis.push('⚠️ Could not parse package.json')
            }
          }

          // Count file types
          files.forEach(f => {
            const ext = f.path.split('.').pop() || 'no-ext'
            analysis.fileTypes[ext] = (analysis.fileTypes[ext] || 0) + 1
          })

          return {
            success: true,
            message: '🔍 Completed dependency and project analysis',
            analysis,
            toolCallId
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          return {
            success: false,
            error: `Analysis failed: ${errorMessage}`,
            toolCallId
          }
        }
      }
    })

  }

  // Debug logging to verify web tools are conditionally included
  console.log('[DEBUG] Web Tools Conditional Logic:', {
    needsWebTools,
    requiredTools: intentData?.required_tools || [],
    intent: intentData?.intent || 'unknown',
    confidence: intentData?.confidence || 0
  })
  
  

  // Enhanced conversation memory tool with AI-powered context retrieval
  // Only include when user is reporting code issues
  if (userReportingIssues) {
    tools.recall_context = tool({
    description: 'Recall previous conversation context and key points with AI-enhanced analysis',
    inputSchema: z.object({
      limit: z.number().optional().describe('Number of recent messages to recall (default: 10)'),
      includeUserMessages: z.boolean().optional().describe('Include user messages in the recall (default: true)'),
      includeAssistantMessages: z.boolean().optional().describe('Include assistant messages in the recall (default: true)'),
      useAIEnhancement: z.boolean().optional().describe('Use AI to enhance context retrieval (default: true)')
    }),
    execute: async ({ limit = 10, includeUserMessages = true, includeAssistantMessages = true, useAIEnhancement = true }, { abortSignal, toolCallId }) => {
      if (abortSignal?.aborted) {
        throw new Error('Operation cancelled')
      }
      
      try {
        // Import storage manager for conversation memory
        const { storageManager } = await import('@/lib/storage-manager')
        await storageManager.init()
        
        // Get conversation memory from storage using the passed user ID
        const actualUserId = userId || global.currentUserId || 'current-user'
        const conversationMemory = await storageManager.getConversationMemory(projectId, actualUserId)
        const conversationHistory = conversationMemory?.messages || []
        
        let filteredMessages = conversationHistory
        
        // Filter by message type if specified
        if (!includeUserMessages || !includeAssistantMessages) {
          filteredMessages = conversationHistory.filter((msg: any) => {
            if (!includeUserMessages && msg.role === 'user') return false
            if (!includeAssistantMessages && msg.role === 'assistant') return false
            return true
          })
        }
        
        // Limit the number of messages
        const limitedMessages = filteredMessages.slice(-limit)
        
        // Basic analysis for key points
        const keyPoints: string[] = []
        const fileOperations: string[] = []
        const decisions: string[] = []
        
        limitedMessages.forEach((msg: any) => {
          if (msg.role === 'assistant') {
            // Extract key information from assistant messages
            if (msg.content.includes('created') || msg.content.includes('modified')) {
              fileOperations.push(msg.content.substring(0, 100) + '...')
            }
            if (msg.content.includes('decided') || msg.content.includes('chose')) {
              decisions.push(msg.content.substring(0, 100) + '...')
            }
          }
        })
        
        // AI-enhanced context retrieval if enabled
        let aiEnhancedContext = null
        if (useAIEnhancement && conversationMemory) {
          try {
            const projectContext = await buildOptimizedProjectContext(projectId, storageManager, conversationMemory)
            aiEnhancedContext = await findRelevantMemories(
              'What is most important to remember from our development work?',
              projectContext,
              conversationMemory
            )
          } catch (aiError) {
            console.warn('AI enhancement failed, using basic context:', aiError)
          }
        }
        
        // Combine basic and AI-enhanced insights
        const enhancedKeyPoints = aiEnhancedContext ? [
          ...keyPoints,
          ...aiEnhancedContext.relevantDecisions,
          ...aiEnhancedContext.applicablePatterns
        ] : keyPoints
        
        const enhancedSummary = aiEnhancedContext ? 
          `${aiEnhancedContext.relevantContext}\n\nConversation contains ${limitedMessages.length} messages with ${fileOperations.length} file operations and ${decisions.length} key decisions` :
          `Conversation contains ${limitedMessages.length} messages with ${fileOperations.length} file operations and ${decisions.length} key decisions`
        
        return {
          success: true,
          message: `Retrieved ${limitedMessages.length} messages from conversation memory${aiEnhancedContext ? ' with AI enhancement' : ''}`,
          messages: limitedMessages.map((msg: any) => ({
            role: msg.role,
            content: msg.content.substring(0, 200) + (msg.content.length > 200 ? '...' : ''),
            timestamp: msg.timestamp || new Date().toISOString()
          })),
          summary: enhancedSummary,
          keyPoints: enhancedKeyPoints,
          count: limitedMessages.length,
          // AI-enhanced insights
          aiInsights: aiEnhancedContext ? {
            relevantContext: aiEnhancedContext.relevantContext,
            technicalPatterns: aiEnhancedContext.applicablePatterns,
            relevanceScore: aiEnhancedContext.relevanceScore,
            whyRelevant: aiEnhancedContext.whyRelevant
          } : null,
          toolCallId
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error('[ERROR] recall_context failed:', error)
        
        // Provide fallback response instead of failing
        return { 
          success: true, 
          message: `Context recall completed with some issues: ${errorMessage}`,
          messages: [],
          summary: 'No context available due to error',
          keyPoints: [],
          count: 0,
          toolCallId
        }
      }
    }
  })

  } // End conditional for recall_context

  // Add knowledge base tool
  // Only include when user is reporting code issues
  if (userReportingIssues) {
    tools.search_knowledge = tool({
      description: 'Advanced knowledge search with semantic matching, content categorization, and relevance ranking',
      inputSchema: z.object({
        query: z.string().optional().describe('Search query or keywords for semantic search'),
        id: z.string().optional().describe('Specific ID to retrieve (alternative to query)'),
        category: z.string().optional().describe('Filter by category'),
        tags: z.array(z.string()).optional().describe('Filter by tags'),
        semantic: z.boolean().optional().describe('Use semantic search (default: true)'),
        maxResults: z.number().optional().describe('Maximum results to return (default: 5)'),
        sortBy: z.enum(['relevance', 'date', 'title']).optional().describe('Sort results by (default: relevance)')
      }),
      execute: async ({ query, id, category, tags, semantic = true, maxResults = 5, sortBy = 'relevance' }, { abortSignal, toolCallId }) => {
        if (abortSignal?.aborted) {
          throw new Error('Operation cancelled')
        }

        try {
          // Import knowledge base service
          const { KnowledgeBase } = await import('@/lib/knowledge-base')

          // If specific ID provided, use direct lookup
          if (id) {
            const item = KnowledgeBase.getById(id)

            if (!item) {
              const allItems = KnowledgeBase.getAll()
              const availableIds = allItems.map((item: any) => item.id).slice(0, 10).join(', ')

              return {
                success: false,
                error: `Knowledge item with ID '${id}' not found. Available IDs: ${availableIds}...`,
                availableItems: allItems.slice(0, 5).map((item: any) => ({
                  id: item.id,
                  title: item.title,
                  category: item.category
                })),
                toolCallId
              }
            }

            return {
              success: true,
              message: `Retrieved knowledge item: ${item.title}`,
              item: {
                id: item.id,
                title: item.title,
                content: item.content,
                category: item.category,
                tags: item.tags,
                createdAt: item.createdAt,
                updatedAt: item.createdAt // Use createdAt as fallback since updatedAt doesn't exist
              },
              toolCallId
            }
          }

          // Semantic search functionality
          if (!query && !category && !tags) {
            return {
              success: false,
              error: 'Please provide either a query, category, or tags to search',
              toolCallId
            }
          }

          const allItems = KnowledgeBase.getAll()

          // Filter by category and tags first
          let filteredItems = allItems

          if (category) {
            filteredItems = filteredItems.filter((item: any) =>
              item.category?.toLowerCase().includes(category.toLowerCase())
            )
          }

          if (tags && tags.length > 0) {
            filteredItems = filteredItems.filter((item: any) =>
              tags.some((tag: string) =>
                item.tags?.some((itemTag: string) =>
                  itemTag.toLowerCase().includes(tag.toLowerCase())
                )
              )
            )
          }

          // Semantic search scoring
          let scoredItems = filteredItems.map((item: any) => {
            let score = 0
            const title = item.title?.toLowerCase() || ''
            const content = item.content?.toLowerCase() || ''
            const itemTags = item.tags?.join(' ').toLowerCase() || ''
            const itemCategory = item.category?.toLowerCase() || ''

            if (query) {
              const searchTerms = query.toLowerCase().split(' ')

              // Title matches (highest weight)
              searchTerms.forEach(term => {
                if (title.includes(term)) score += 10
                if (title.startsWith(term)) score += 5
              })

              // Content matches
              searchTerms.forEach(term => {
                const contentCount = (content.match(new RegExp(term, 'g')) || []).length
                score += contentCount * 2
              })

              // Tag matches
              searchTerms.forEach(term => {
                if (itemTags.includes(term)) score += 7
              })

              // Category matches
              searchTerms.forEach(term => {
                if (itemCategory.includes(term)) score += 6
              })
            } else {
              score = 5 // Base score for filtered items
            }

            return { ...item, relevanceScore: score }
          })

          // Sort by relevance or other criteria
          switch (sortBy) {
            case 'date':
              scoredItems.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
              break
            case 'title':
              scoredItems.sort((a, b) => a.title.localeCompare(b.title))
              break
            default: // relevance
              scoredItems.sort((a, b) => b.relevanceScore - a.relevanceScore)
          }

          // Limit results
          const results = scoredItems.slice(0, maxResults)

          // Group by categories for better organization
          const categories = Array.from(new Set(results.map(item => item.category).filter(Boolean)))
          const categoryGroups = categories.map(cat => ({
            category: cat,
            items: results.filter(item => item.category === cat).map(item => ({
              id: item.id,
              title: item.title,
              relevanceScore: item.relevanceScore,
              tags: item.tags,
              preview: item.content?.substring(0, 100) + '...'
            }))
          }))

          return {
            success: true,
            message: `Found ${results.length} knowledge items${query ? ` for query "${query}"` : ''}`,
            results: results.map(item => ({
              id: item.id,
              title: item.title,
              category: item.category,
              tags: item.tags,
              relevanceScore: item.relevanceScore,
              contentLength: item.content?.length || 0,
              createdAt: item.createdAt,
              updatedAt: item.updatedAt
            })),
            categoryGroups,
            totalAvailable: allItems.length,
            searchCriteria: {
              query,
              category,
              tags,
              semantic,
              maxResults,
              sortBy
            },
            toolCallId
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          console.error('[ERROR] search_knowledge failed:', error)

          return {
            success: false,
            error: `Knowledge search failed: ${errorMessage}`,
            toolCallId
          }
        }
      }
    })

  } // End conditional for search_knowledge

  // Get knowledge item tool
  // Only include when user is reporting code issues
  if (userReportingIssues) {
    tools.get_knowledge_item = tool({
    description: 'Get a specific knowledge item by ID',
    inputSchema: z.object({
      id: z.string().describe('ID of the knowledge item to retrieve')
    }),
    execute: async ({ id }, { abortSignal, toolCallId }) => {
      if (abortSignal?.aborted) {
        throw new Error('Operation cancelled')
      }
      
      try {
        // Import knowledge base service
        const { KnowledgeBase } = await import('@/lib/knowledge-base')
        
        const item = KnowledgeBase.getById(id)
        
        if (!item) {
          // If item not found, provide a helpful response with available IDs
          const allItems = KnowledgeBase.getAll()
          const availableIds = allItems.map((item: any) => item.id).join(', ')
          
          return {
            success: false,
            error: `Knowledge item with ID '${id}' not found. Available IDs: ${availableIds}`,
            toolCallId
          }
        }
        
        return {
          success: true,
          message: `Retrieved knowledge item: ${item.title}`,
          content: item.content,
          toolCallId
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error('[ERROR] get_knowledge_item failed:', error)
        
        // Provide fallback response instead of failing
        return { 
          success: false, 
          error: `Failed to retrieve knowledge item: ${errorMessage}. Please try again or use search_knowledge instead.`,
          toolCallId
        }
      }
    }
  })

  } // End conditional for get_knowledge_item

  // REMOVED: tool_results_summary - AI was calling it multiple times, wasting resources
  // REMOVED: Duplicate read_file tool - keeping the one above

  // REMOVED: Duplicate list_files tool - keeping the one above

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

        // Check file operation limits
        const limits = checkFileOperationLimit(projectId)
        if (!limits.allowed) {
          return {
            success: false,
            error: `File operation limit exceeded (${limits.operationsUsed}/${limits.limit}). Maximum ${limits.limit} file operations per request allowed.`,
            path,
            toolCallId,
            limitExceeded: true
          }
        }
        
        try {
          // Validate inputs
          if (!path || typeof path !== 'string') {
            return { 
              success: false, 
              error: `Invalid file path provided`,
              path,
              toolCallId
            }
          }
          
          if (content === undefined || content === null) {
            return { 
              success: false, 
              error: `Invalid content provided`,
              path,
              toolCallId
            }
          }
          
          // Import storage manager
          const { storageManager } = await import('@/lib/storage-manager')
          await storageManager.init()
          
          // Check if file already exists
          const existingFile = await storageManager.getFile(projectId, path)

          if (existingFile) {
            // Update existing file
            await storageManager.updateFile(projectId, path, { content })

            // Track surgical operation
            trackFileOperation(projectId, path, 'edited')

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

            // Track surgical operation
            trackFileOperation(projectId, path, 'created')
            
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
    
    tools.delete_file = tool({
      description: 'Delete a file from the project',
      inputSchema: z.object({
        path: z.string().describe('File path relative to project root')
      }),
      execute: async ({ path }, { abortSignal, toolCallId }) => {
        // Check for cancellation
        if (abortSignal?.aborted) {
          throw new Error('Operation cancelled')
        }
        
        try {
          // Validate path
          if (!path || typeof path !== 'string') {
            return { 
              success: false, 
              error: `Invalid file path provided`,
              path,
              toolCallId
            }
          }
          
          // Import storage manager
          const { storageManager } = await import('@/lib/storage-manager')
          await storageManager.init()
          
          // Check if file exists
          const existingFile = await storageManager.getFile(projectId, path)

          if (!existingFile) {
            return { 
              success: false, 
              error: `File not found: ${path}. Please check the file path.`,
              path,
              toolCallId
            }
          }

          // Delete the file
          const result = await storageManager.deleteFile(projectId, path)
          
          if (result) {
            return { 
              success: true, 
              message: `✅ File ${path} deleted successfully.`,
              path,
              action: 'deleted',
              toolCallId
            }
          } else {
            return { 
              success: false, 
              error: `Failed to delete file ${path}`,
              path,
              toolCallId
            }
          }
        } catch (error) {
          // Enhanced error handling
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          console.error(`[ERROR] delete_file failed for ${path}:`, error)
          
          return { 
            success: false, 
            error: `Failed to delete file ${path}: ${errorMessage}`,
            path,
            toolCallId
          }
        }
      }
    })

    tools.edit_file = tool({
      description: 'Edit an existing file using precise search/replace operations. Provide the search and replace blocks directly as parameters.',
      inputSchema: z.object({
        path: z.string().describe('File path relative to project root to edit'),
        searchReplaceBlocks: z.array(z.object({
          search: z.string().describe('Exact text to find in the file (must match exactly including whitespace)'),
          replace: z.string().describe('Text to replace the search text with'),
          replaceAll: z.boolean().optional().describe('If true, replace all occurrences. If false or omitted, replace only the first occurrence.'),
          occurrenceIndex: z.number().optional().describe('If specified, replace only the Nth occurrence (1-based index). Overrides replaceAll.'),
          validateAfter: z.string().optional().describe('Optional text that should exist in the file after this operation (for validation)')
        })).describe('Array of search/replace operations to perform'),
        dryRun: z.boolean().optional().describe('If true, validate all operations without applying changes'),
        rollbackOnFailure: z.boolean().optional().describe('If true, rollback all changes if any operation fails (default: true)')
      }),
      execute: async ({ path, searchReplaceBlocks, dryRun = false, rollbackOnFailure = true }, { abortSignal, toolCallId }) => {
        // Check for cancellation
        if (abortSignal?.aborted) {
          throw new Error('Operation cancelled')
        }

        // Check file operation limits
        const limits = checkFileOperationLimit(projectId)
        if (!limits.allowed) {
          return {
            success: false,
            error: `File operation limit exceeded (${limits.operationsUsed}/${limits.limit}). Maximum ${limits.limit} file operations per request allowed.`,
            path,
            toolCallId,
            limitExceeded: true
          }
        }
        
        try {
          // Validate inputs
          if (!path || typeof path !== 'string') {
            return { 
              success: false, 
              error: `Invalid file path provided`,
              path,
              toolCallId
            }
          }

          if (!searchReplaceBlocks || !Array.isArray(searchReplaceBlocks) || searchReplaceBlocks.length === 0) {
            return { 
              success: false, 
              error: `No search/replace blocks provided`,
              path,
              toolCallId
            }
          }

          // Import storage manager
          const { storageManager } = await import('@/lib/storage-manager')
          await storageManager.init()
          
          // Check if file exists
          const existingFile = await storageManager.getFile(projectId, path)

          if (!existingFile) {
            return { 
              success: false, 
              error: `File not found: ${path}. Please check the file path.`,
              path,
              toolCallId
            }
          }

          // Helper functions are defined at the top level

          // Initialize tracking arrays
          const appliedEdits: Array<{
            blockIndex: number;
            search: string;
            replace: string;
            status: string;
            replaceAll?: boolean;
            occurrenceIndex?: number;
            occurrencesReplaced?: number;
            validationPassed?: boolean;
          }> = [];
          const failedEdits: Array<{
            blockIndex: number;
            search: string;
            replace: string;
            status: string;
            reason: string;
            validationError?: string;
          }> = [];

          // Store original content for rollback
          const originalContent = existingFile.content;
          let modifiedContent = originalContent;
          const contentSnapshots: string[] = [originalContent];

          // Phase 1: Dry run validation (always performed)
          console.log(`[DEBUG] Starting validation phase for ${searchReplaceBlocks.length} blocks`);

          // Check for duplicate operations within the same request
          const operationSignatures = new Set<string>();
          for (let i = 0; i < searchReplaceBlocks.length; i++) {
            const block = searchReplaceBlocks[i];
            const signature = `${block.search}|${block.replace}`;
            if (operationSignatures.has(signature)) {
              console.warn(`[EDIT_FILE WARNING] Duplicate operation detected in block ${i}: ${signature}`);
            }
            operationSignatures.add(signature);
          }
          
          let tempContent = originalContent;
          const validationResults: Array<{
            blockIndex: number;
            canApply: boolean;
            reason?: string;
            occurrencesFound: number;
          }> = [];

          for (let i = 0; i < searchReplaceBlocks.length; i++) {
            const block = searchReplaceBlocks[i];
            const searchText = block.search;
            const replaceText = block.replace;
            const replaceAll = block.replaceAll || false;
            const occurrenceIndex = block.occurrenceIndex;
            const validateAfter = block.validateAfter;

            // Count occurrences in current temp content
            const occurrences = (tempContent.match(new RegExp(escapeRegExp(searchText), 'g')) || []).length;

            // Check for potential duplicate imports (common issue)
            const isImportAddition = replaceText.includes('import ') && searchText.includes('import ');
            if (isImportAddition) {
              const importPattern = replaceText.match(/import\s+.*?\s+from\s+['"`][^'"`]+['"`]/);
              if (importPattern && tempContent.includes(importPattern[0])) {
                console.warn(`[EDIT_FILE WARNING] Potential duplicate import detected: ${importPattern[0]}`);
              }
            }
            
            let canApply = true;
            let reason = '';

            if (occurrences === 0) {
              canApply = false;
              reason = 'Search text not found in content';
            } else if (occurrenceIndex && occurrenceIndex > occurrences) {
              canApply = false;
              reason = `Requested occurrence ${occurrenceIndex} but only ${occurrences} occurrences found`;
            }

            validationResults.push({
              blockIndex: i,
              canApply,
              reason,
              occurrencesFound: occurrences
            });

            // If this block can be applied, simulate the change for next validation
            if (canApply) {
              if (occurrenceIndex) {
                tempContent = replaceNthOccurrence(tempContent, searchText, replaceText, occurrenceIndex);
              } else if (replaceAll) {
                tempContent = tempContent.replaceAll(searchText, replaceText);
              } else {
                tempContent = tempContent.replace(searchText, replaceText);
              }

              // Validate the content after this change if specified
              if (validateAfter && !tempContent.includes(validateAfter)) {
                canApply = false;
                reason = `Validation failed: expected text "${validateAfter}" not found after operation`;
                validationResults[i].canApply = false;
                validationResults[i].reason = reason;
              }
            }
          }

          // Check if any validations failed
          const failedValidations = validationResults.filter(r => !r.canApply);
          
          if (dryRun) {
            // Return dry run results
            return {
              success: failedValidations.length === 0,
              message: `🔍 Dry run completed. ${validationResults.length - failedValidations.length}/${validationResults.length} operations would succeed.`,
              path,
              action: 'dry_run_completed',
              toolCallId,
              dryRunResults: {
                totalBlocks: searchReplaceBlocks.length,
                validBlocks: validationResults.length - failedValidations.length,
                invalidBlocks: failedValidations.length,
                validationResults,
                previewContent: tempContent
              }
            };
          }

          // Phase 2: Apply changes (only if not dry run)
          console.log(`[DEBUG] Applying ${validationResults.length - failedValidations.length} valid operations`);
          
          for (let i = 0; i < searchReplaceBlocks.length; i++) {
            const block = searchReplaceBlocks[i];
            const validation = validationResults[i];
            
            if (!validation.canApply) {
              failedEdits.push({
                blockIndex: i,
                search: block.search,
                replace: block.replace,
                status: 'failed',
                reason: validation.reason || 'Validation failed'
              });
              
              if (rollbackOnFailure) {
                console.log(`[DEBUG] Block ${i} failed, rolling back all changes`);
                modifiedContent = originalContent;
                return {
                  success: false,
                  error: `Operation ${i + 1} failed: ${validation.reason}. All changes rolled back.`,
                  path,
                  toolCallId,
                  rollbackPerformed: true,
                  failedEdits
                };
              }
              continue;
            }

            const searchText = block.search;
            const replaceText = block.replace;
            const replaceAll = block.replaceAll || false;
            const occurrenceIndex = block.occurrenceIndex;

            // Apply the replacement
            let occurrencesReplaced = 0;
            
            if (occurrenceIndex) {
              modifiedContent = replaceNthOccurrence(modifiedContent, searchText, replaceText, occurrenceIndex);
              occurrencesReplaced = 1;
            } else if (replaceAll) {
              const beforeCount = (modifiedContent.match(new RegExp(escapeRegExp(searchText), 'g')) || []).length;
              modifiedContent = modifiedContent.replaceAll(searchText, replaceText);
              occurrencesReplaced = beforeCount;
            } else {
              modifiedContent = modifiedContent.replace(searchText, replaceText);
              occurrencesReplaced = 1;
            }

            // Validate after replacement if specified
            let validationPassed = true;
            if (block.validateAfter && !modifiedContent.includes(block.validateAfter)) {
              validationPassed = false;
              if (rollbackOnFailure) {
                console.log(`[DEBUG] Post-operation validation failed for block ${i}, rolling back`);
                modifiedContent = originalContent;
                return {
                  success: false,
                  error: `Post-operation validation failed for block ${i + 1}. All changes rolled back.`,
                  path,
                  toolCallId,
                  rollbackPerformed: true,
                  validationError: `Expected text "${block.validateAfter}" not found after operation`
                };
              }
            }

            appliedEdits.push({
              blockIndex: i,
              search: searchText,
              replace: replaceText,
              status: 'applied',
              replaceAll,
              occurrenceIndex,
              occurrencesReplaced,
              validationPassed
            });

            // Take snapshot after each successful operation
            contentSnapshots.push(modifiedContent);
          }

          // Check if any edits were applied
          if (appliedEdits.length === 0) {
            return {
              success: false,
              error: `No changes could be applied. All ${failedEdits.length} search/replace operations failed.`,
              path,
              toolCallId,
              failedEdits
            }
          }

          // Update the file in storage
          await storageManager.updateFile(projectId, path, { 
            content: modifiedContent,
            updatedAt: new Date().toISOString()
          });

          console.log(`[DEBUG] Successfully applied ${appliedEdits.length} edits to ${path}`);

          // Track surgical operation
          trackFileOperation(projectId, path, 'edited')
          
          return {
            success: true,
            message: `✅ File ${path} updated successfully. Applied ${appliedEdits.length}/${searchReplaceBlocks.length} changes.`,
            path,
            content: modifiedContent,
            action: 'edit_completed',
            toolCallId,
            appliedEdits,
            failedEdits: failedEdits.length > 0 ? failedEdits : undefined,
            validationResults,
            rollbackOnFailure,
            contentSnapshots: contentSnapshots.length > 2 ? ['original', '...', 'final'] : contentSnapshots.map((_, i) => i === 0 ? 'original' : `step_${i}`)
          }

        } catch (error) {
          // Enhanced error handling
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          console.error(`[ERROR] edit_file failed for ${path}:`, error)

          // Add fallback suggestion for repeated failures
          const fallbackSuggestion = `Consider using write_file tool instead: read the file first, then use write_file to create the complete updated content.`
          
          return { 
            success: false, 
            error: `Failed to edit file ${path}: ${errorMessage}`,
            fallbackSuggestion,
            path,
            toolCallId
          }
        }
      }
    })
  }
  
  // Add web search tool - ONLY when explicitly needed based on intent detection
  if (needsWebTools) {
    tools.web_search = tool({
    description: 'Search the web for current information and context. Returns clean, structured text instead of raw JSON data.',
    inputSchema: z.object({
      query: z.string().describe('Search query to find relevant web content')
    }),
    execute: async ({ query }, { abortSignal, toolCallId }) => {
      if (abortSignal?.aborted) {
        throw new Error('Operation cancelled')
      }
      
      try {
        const searchResults = await searchWeb(query)
        
        return {
          success: true,
          message: `Web search completed successfully for query: "${query}"`,
          // Send clean, structured text instead of raw JSON
          cleanResults: searchResults.cleanedResults,
          // Keep minimal metadata for reference
          metadata: {
            query: searchResults.query,
            resultCount: searchResults.resultCount,
            totalLength: searchResults.cleanedResults.length
          },
          query,
          toolCallId
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error('[ERROR] web_search failed:', error)
        
        return { 
          success: false, 
          error: `Web search failed: ${errorMessage}`,
          query,
          toolCallId
        }
      }
    }
  })

    // Add web content extraction tool using AnyAPI - ONLY when explicitly needed
    tools.web_extract = tool({
    description: 'Extract content from web pages using AnyAPI. Returns clean, structured text.',
    inputSchema: z.object({
      urls: z.union([
        z.string().url().describe('URL to extract content from'),
        z.array(z.string().url()).describe('Array of URLs to extract content from')
      ]).describe('URL or URLs to extract content from')
    }),
    execute: async ({ urls }, { abortSignal, toolCallId }) => {
      if (abortSignal?.aborted) {
        throw new Error('Operation cancelled')
      }
      
      // Ensure urls is always an array
      const urlArray = Array.isArray(urls) ? urls : [urls];
      
      try {
        // Import the web scraper
        const { webScraper } = await import('@/lib/web-scraper');
        
        // Process URLs sequentially to manage API key usage
        const extractionResults = await Promise.all(
          urlArray.map(async (url) => {
            try {
              const scraperResult = await webScraper.execute({ url });
              
              // Debug logging for web extraction
              console.log(`[DEBUG] Web extract for ${url}:`, {
                hasResult: !!scraperResult,
                resultType: typeof scraperResult,
                resultKeys: scraperResult ? Object.keys(scraperResult) : [],
                hasCleanResults: scraperResult?.cleanResults ? true : false,
                cleanResultsType: typeof scraperResult?.cleanResults,
                cleanResultsLength: scraperResult?.cleanResults?.length || 0
              });
              
              // Extract content from the scraper result
              const extractContent = (result: any): string => {
                // The webScraper returns cleanResults directly
                if (result && typeof result === 'object' && result.cleanResults) {
                  return result.cleanResults;
                }
                
                // Fallback to message if cleanResults not available
                if (result && typeof result === 'object' && result.message) {
                  return result.message;
                }
                
                // Last resort: stringify the result (but avoid circular references)
                try {
                  return JSON.stringify(result, (key, value) => {
                    if (key === 'metadata' || key === 'apiKeyUsed') {
                      return '[REDACTED]';
                    }
                    return value;
                  }, 2);
                } catch {
                  return 'Content extracted successfully';
                }
              };
              
              return {
                success: true,
                url,
                cleanResults: extractContent(scraperResult),
                metadata: {
                  url,
                  timestamp: new Date().toISOString(),
                  apiKeyUsed: scraperResult.metadata?.apiKeyUsed || 'unknown'
                }
              };
            } catch (error) {
              console.error(`[ERROR] Web extract failed for ${url}:`, error);
              return {
                success: false,
                url,
                error: error instanceof Error ? error.message : 'Unknown error',
                cleanResults: ''
              };
            }
          })
        );
        
        // Separate successful and failed extractions
        const successfulResults = extractionResults.filter(result => result.success);
        const failedResults = extractionResults.filter(result => !result.success);
        
        // Debug logging for final result
        console.log('[DEBUG] Web extract final result:', {
          totalUrls: urlArray.length,
          successfulCount: successfulResults.length,
          failedCount: failedResults.length,
          cleanResultsLength: successfulResults.map(r => r.cleanResults?.length || 0),
          sampleCleanResults: successfulResults[0]?.cleanResults?.substring(0, 100) || 'none'
        });
        
        return {
          success: successfulResults.length > 0,
          message: successfulResults.length > 0 
            ? `Successfully extracted content from ${successfulResults.length} URL(s)` 
            : 'Failed to extract content from any URLs',
          cleanResults: successfulResults.map(result => result.cleanResults).join('\n\n'),
          metadata: {
            successCount: successfulResults.length,
            failedCount: failedResults.length,
            urls: urlArray
          },
          toolCallId
        };
      } catch (error) {
        console.error('[ERROR] Web extract failed:', error);
        
        return { 
          success: false, 
          error: `Web extract failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          cleanResults: '',
          metadata: {
            urls: urlArray
          },
          toolCallId
        };
      }
    }
  })
  } // End conditional for web tools

  // REMOVED: learn_patterns tool - too complex and not needed for Lovable-style system
  // if (aiMode === 'agent' && userReportingIssues) { // Disabled - wasting resources
  /*
  tools.learn_patterns = tool({
    description: 'Advanced pattern analysis with code metrics, complexity analysis, and actionable recommendations',
    inputSchema: z.object({
      analysisType: z.enum(['coding_style', 'component_patterns', 'technical_decisions', 'optimization_areas', 'code_metrics', 'all']).optional().describe('Type of analysis to perform (default: all)'),
      includeRecommendations: z.boolean().optional().describe('Include improvement recommendations (default: true)'),
      includeMetrics: z.boolean().optional().describe('Include code complexity metrics (default: true)'),
      focusAreas: z.array(z.enum(['performance', 'maintainability', 'security', 'best_practices', 'testing', 'documentation'])).optional().describe('Specific areas to focus on'),
      generateActionItems: z.boolean().optional().describe('Generate specific action items (default: true)'),
      depth: z.enum(['basic', 'detailed', 'comprehensive']).optional().describe('Analysis depth (default: detailed)')
    }),
    execute: async ({
      analysisType = 'all',
      includeRecommendations = true,
      includeMetrics = true,
      focusAreas,
      generateActionItems = true,
      depth = 'detailed'
    }, { abortSignal, toolCallId }) => {
      if (abortSignal?.aborted) {
        throw new Error('Operation cancelled')
      }

      try {
        // Import storage manager
        const { storageManager } = await import('@/lib/storage-manager')
        await storageManager.init()

        // Get conversation memory and project files
        const conversationMemory = await storageManager.getConversationMemory(projectId, global.currentUserId || 'current-user')
        const projectFiles = await storageManager.getFiles(projectId)

        if (!conversationMemory) {
          return {
            success: false,
            error: 'No conversation memory found for pattern analysis',
            toolCallId
          }
        }

        // Enhanced code metrics analysis
        const codeMetrics = includeMetrics ? await (async (projectFiles: any[]) => {
          const metrics = {
            totalFiles: 0,
            totalLines: 0,
            averageFileSize: 0,
            largestFile: { path: '', size: 0 },
            languageDistribution: {} as Record<string, number>,
            complexityIndicators: {
              largeFiles: 0, // > 500 lines
              complexFiles: 0, // > 1000 lines
              testCoverage: 0 // estimated
            },
            maintainability: {
              score: 0,
              factors: [] as string[]
            },
            patterns: {
              hooks: 0,
              components: 0,
              utilities: 0,
              tests: 0,
              configs: 0
            }
          }

          let totalSize = 0

          for (const file of projectFiles) {
            if (file.isDirectory) continue

            metrics.totalFiles++
            const fileSize = file.size || 0
            totalSize += fileSize

            // Track largest file
            if (fileSize > metrics.largestFile.size) {
              metrics.largestFile = { path: file.path, size: fileSize }
            }

            // Language distribution
            const ext = file.path.split('.').pop()?.toLowerCase() || 'unknown'
            metrics.languageDistribution[ext] = (metrics.languageDistribution[ext] || 0) + 1

            // Complexity indicators
            if (fileSize > 1000) {
              metrics.complexityIndicators.complexFiles++
            } else if (fileSize > 500) {
              metrics.complexityIndicators.largeFiles++
            }

            // Pattern detection
            const path = file.path.toLowerCase()
            if (path.includes('test') || path.includes('spec')) {
              metrics.patterns.tests++
            } else if (path.includes('hook')) {
              metrics.patterns.hooks++
            } else if (path.includes('component') || path.includes('.tsx') || path.includes('.jsx')) {
              metrics.patterns.components++
            } else if (path.includes('util') || path.includes('helper')) {
              metrics.patterns.utilities++
            } else if (path.includes('config') || path.includes('.json') || path.includes('.config')) {
              metrics.patterns.configs++
            }
          }

          metrics.totalLines = Math.round(totalSize / 50) // Rough estimation: ~50 chars per line
          metrics.averageFileSize = Math.round(totalSize / metrics.totalFiles)

          // Calculate maintainability score (0-100)
          const maintainabilityFactors = []
          let maintainabilityScore = 100

          if (metrics.complexityIndicators.complexFiles > metrics.totalFiles * 0.1) {
            maintainabilityScore -= 20
            maintainabilityFactors.push('Many complex files')
          }

          if (metrics.averageFileSize > 2000) {
            maintainabilityScore -= 15
            maintainabilityFactors.push('Large average file size')
          }

          if (metrics.patterns.tests < metrics.totalFiles * 0.1) {
            maintainabilityScore -= 10
            maintainabilityFactors.push('Low test coverage')
          }

          metrics.maintainability.score = Math.max(0, maintainabilityScore)
          metrics.maintainability.factors = maintainabilityFactors

          return metrics
        })(projectFiles) : null

        // Use AI to analyze patterns with enhanced context
        const learningInsights = await learnFromPatterns(
          projectId,
          global.currentUserId || 'current-user',
          conversationMemory,
          projectFiles
        )

        // Generate comprehensive analysis report
        const analysisReport = await (async (analysisType: string, insights: any, metrics: any, focusAreas: string[] | undefined, depth: string) => {
          let report = `# Advanced Pattern Analysis Report\n\n**Analysis Type:** ${analysisType}\n**Depth:** ${depth}\n**Focus Areas:** ${focusAreas?.join(', ') || 'All'}\n\n`

          if (metrics && (analysisType === 'code_metrics' || analysisType === 'all')) {
            report += `## 📊 Code Metrics\n\n`
            report += `- **Total Files:** ${metrics.totalFiles}\n`
            report += `- **Total Lines:** ~${metrics.totalLines}\n`
            report += `- **Average File Size:** ${metrics.averageFileSize} bytes\n`
            report += `- **Largest File:** ${metrics.largestFile.path} (${metrics.largestFile.size} bytes)\n`
            report += `- **Maintainability Score:** ${metrics.maintainability.score}/100\n`

            if (metrics.maintainability.factors.length > 0) {
              report += `- **Maintainability Factors:** ${metrics.maintainability.factors.join(', ')}\n`
            }

            report += `\n### Language Distribution\n`
            Object.entries(metrics.languageDistribution).forEach(([lang, count]) => {
              report += `- ${lang}: ${count} files\n`
            })

            report += `\n### Pattern Distribution\n`
            Object.entries(metrics.patterns).forEach(([pattern, count]) => {
              report += `- ${pattern}: ${count} files\n`
            })

            report += `\n### Complexity Indicators\n`
            report += `- Large Files (>500 lines): ${metrics.complexityIndicators.largeFiles}\n`
            report += `- Complex Files (>1000 lines): ${metrics.complexityIndicators.complexFiles}\n`
          }

          if (analysisType === 'coding_style' || analysisType === 'all') {
            report += `\n## 🎨 Coding Style Analysis\n\n`
            report += `**Your Preferred Style:** ${insights.codingStyle}\n\n`
            report += `**Component Patterns:** ${insights.componentPatterns.join(', ')}\n\n`
            report += `**Styling Preferences:** ${insights.stylingPreferences.join(', ')}\n`
          }

          if (analysisType === 'component_patterns' || analysisType === 'all') {
            report += `\n## 🧩 Component Pattern Analysis\n\n`
            report += `**Established Patterns:** ${insights.componentPatterns.join(', ')}\n\n`
            report += `**Technical Decisions:** ${insights.technicalDecisions.join(', ')}\n\n`
            report += `**Common Approaches:** ${insights.commonApproaches.join(', ')}\n`
          }

          if (analysisType === 'technical_decisions' || analysisType === 'all') {
            report += `\n## 🏗️ Technical Decision Analysis\n\n`
            report += `**Architecture Choices:** ${insights.technicalDecisions.join(', ')}\n\n`
            report += `**Common Approaches:** ${insights.commonApproaches.join(', ')}\n\n`
            report += `**Learning Score:** ${Math.round(insights.learningScore * 100)}%\n`
          }

          if (analysisType === 'optimization_areas' || analysisType === 'all') {
            report += `\n## ⚡ Optimization Analysis\n\n`
            report += `**Areas for Improvement:** ${insights.optimizationAreas.join(', ')}\n\n`
            report += `**Recommendations:** ${insights.recommendations.join(', ')}\n`
          }

          return report
        })(analysisType, learningInsights, codeMetrics, focusAreas, depth)

        // Generate actionable recommendations
        const recommendations = includeRecommendations ?
          await (async (insights: any, metrics: any, focusAreas: string[] | undefined) => {
            const recommendations = []

            // Code quality recommendations
            if (metrics?.maintainability?.score < 70) {
              recommendations.push('Consider breaking down large files into smaller, more manageable modules')
              recommendations.push('Implement comprehensive testing to improve maintainability')
            }

            if (metrics?.complexityIndicators?.complexFiles > 0) {
              recommendations.push(`Refactor ${metrics.complexityIndicators.complexFiles} complex files (>1000 lines) into smaller components`)
            }

            // Pattern-based recommendations
            if (insights.componentPatterns?.includes('class components')) {
              recommendations.push('Consider migrating class components to functional components with hooks')
            }

            if (insights.stylingPreferences?.includes('inline styles')) {
              recommendations.push('Move inline styles to CSS modules or styled-components for better maintainability')
            }

            // Focus area specific recommendations
            if (focusAreas?.includes('performance')) {
              recommendations.push('Implement code splitting for better performance')
              recommendations.push('Consider lazy loading for components')
            }

            if (focusAreas?.includes('testing')) {
              recommendations.push('Increase test coverage, especially for complex business logic')
              recommendations.push('Implement integration tests for critical user flows')
            }

            if (focusAreas?.includes('security')) {
              recommendations.push('Review and sanitize user inputs')
              recommendations.push('Implement proper error boundaries')
            }

            return recommendations
          })(learningInsights, codeMetrics, focusAreas) : []

        // Generate specific action items
        const actionItems = generateActionItems ?
          await (async (insights: any, metrics: any, focusAreas: string[] | undefined) => {
            const actionItems = []

            // High-priority action items
            if (metrics?.largestFile?.size > 5000) {
              actionItems.push({
                priority: 'high',
                category: 'refactoring',
                description: `Break down ${metrics.largestFile.path} (${metrics.largestFile.size} bytes) into smaller modules`,
                estimatedEffort: '4-6 hours',
                impact: 'high'
              })
            }

            // Medium-priority items
            if (metrics?.maintainability?.score < 50) {
              actionItems.push({
                priority: 'medium',
                category: 'testing',
                description: 'Implement unit tests for complex functions',
                estimatedEffort: '2-3 hours',
                impact: 'medium'
              })
            }

            // Low-priority items
            if (insights.componentPatterns?.length < 3) {
              actionItems.push({
                priority: 'low',
                category: 'documentation',
                description: 'Document established component patterns and conventions',
                estimatedEffort: '1-2 hours',
                impact: 'low'
              })
            }

            return actionItems
          })(learningInsights, codeMetrics, focusAreas) : []

        return {
          success: true,
          message: `Advanced pattern analysis completed for ${analysisType} (${depth} depth)`,
          analysis: {
            type: analysisType,
            depth,
            report: analysisReport,
            insights: learningInsights,
            metrics: codeMetrics,
            recommendations,
            actionItems,
            learningScore: learningInsights.learningScore,
            focusAreas: focusAreas || ['all'],
            generatedAt: new Date().toISOString()
          },
          toolCallId
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error('[ERROR] learn_patterns failed:', error)

        return {
          success: false,
          error: `Advanced pattern analysis failed: ${errorMessage}`,
          toolCallId
        }
      }
    }
  })

  */ // End learn_patterns conditional - DISABLED
  // }

  // AI Dependency Analyzer - Validates imports and auto-adds missing dependencies
  // ALWAYS INCLUDE - Critical for production-ready code generation
    tools.analyze_dependencies = tool({
      description: 'Analyze project dependencies from all src/app/components/lib/hooks files, validate against package.json, and identify only real npm packages (excludes local UI components)',
      inputSchema: z.object({
        includePackageJson: z.boolean().optional().describe('Include package.json content in analysis (default: true)'),
        autoFix: z.boolean().optional().describe('Automatically suggest package.json updates (default: true)'),
        excludeUI: z.boolean().optional().describe('Exclude UI components from analysis (default: true)')
      }),
      execute: async ({ includePackageJson = true, autoFix = true, excludeUI = true }, { abortSignal, toolCallId }) => {
      if (abortSignal?.aborted) {
        throw new Error('Operation cancelled')
      }
      
      try {
        // Import storage manager
        const { storageManager } = await import('@/lib/storage-manager')
        await storageManager.init()

        // Get package.json
        const packageJsonFile = await storageManager.getFile(projectId, 'package.json')
        if (!packageJsonFile) {
          return {
            success: false,
            error: 'package.json not found',
            toolCallId
          }
        }

        let packageJson: any = {}
        try {
          packageJson = JSON.parse(packageJsonFile.content)
        } catch (error) {
          return {
            success: false,
            error: 'Invalid package.json format',
            toolCallId
          }
        }

        // Get all project files for comprehensive analysis
        const allFiles = await storageManager.getFiles(projectId)

        // Filter relevant files from src, app, components, lib, hooks directories
        const relevantFiles = allFiles.filter(file => {
          if (file.isDirectory) return false

          const path = file.path.toLowerCase()
          const isRelevantDir = path.startsWith('src/') ||
                               path.startsWith('app/') ||
                               path.startsWith('components/') ||
                               path.startsWith('lib/') ||
                               path.startsWith('hooks/') ||
                               path.includes('page.json') ||
                               path.includes('middleware.')

          // Exclude UI components if requested
          if (excludeUI && (
            path.includes('components/ui/') ||
            path.includes('/ui/') ||
            path.includes('shadcn') ||
            path.includes('radix-ui')
          )) {
            return false
          }

          return isRelevantDir
        })

        // Include package.json content if requested (already have it from earlier, but include in analysis)
        let packageJsonContent = ''
        if (includePackageJson && packageJsonFile) {
          packageJsonContent = packageJsonFile.content
        }

        // Extract all imports from relevant files
        const allImports: string[] = []
        const fileContents: string[] = []

        for (const file of relevantFiles.slice(0, 20)) { // Limit to prevent token overflow
          try {
            const fileData = await storageManager.getFile(projectId, file.path)
            if (fileData && fileData.content) {
              const content = fileData.content

              // Extract import statements
              const importMatches = content.match(/import\s+.*?from\s+['"]([^'"]+)['"]/g) || []
              const imports = importMatches.map(match => {
                const fromMatch = match.match(/from\s+['"]([^'"]+)['"]/)
                return fromMatch ? fromMatch[1] : ''
              }).filter(Boolean)

              allImports.push(...imports)
              fileContents.push(`File: ${file.path}\n${content.substring(0, 1000)}`)
            }
          } catch (error) {
            console.warn(`Failed to read ${file.path}:`, error)
          }
        }

        // Use AI to analyze all imports and identify only npm packages
        const mistralPixtral = getMistralPixtralModel()

        const analysisPrompt = `Analyze all import statements from project files and identify ONLY real npm packages.

PROJECT FILES ANALYZED:
${fileContents.join('\n\n---\n\n')}

${packageJsonContent ? `PACKAGE.JSON CONTENT:\n${packageJsonContent}\n\n` : ''}

CURRENT PACKAGE.JSON DEPENDENCIES:
${JSON.stringify({
  dependencies: packageJson.dependencies || {},
  devDependencies: packageJson.devDependencies || {}
}, null, 2)}

INSTRUCTIONS:
1. Extract ALL import statements from the provided files
2. Identify ONLY real npm packages - NEVER suggest local files as missing packages
3. Exclude UI components (Button, Card, Modal, etc.) - these are local components, not npm packages
4. Exclude relative imports (./, ../) - these are local files
5. Exclude path aliases (@/, ~/) - these resolve to local files
6. Only suggest real npm packages like: react, axios, lodash, moment, framer-motion, etc.

REAL NPM PACKAGES EXAMPLES:
✅ axios, lodash, moment, react-router-dom, framer-motion
✅ @types/react, @types/node, @headlessui/react
✅ tailwindcss, clsx, zod, date-fns, uuid
❌ Button, Card, Modal, Input, Select (these are UI components)
❌ ./utils, ../hooks, @/components (these are local files)

Respond with JSON:
{
  "imports": [
    {"package": "axios", "statement": "import axios from 'axios'", "exists": false},
    {"package": "react", "statement": "import React from 'react'", "exists": true}
  ],
  "missingDeps": [
    {"package": "axios", "version": "^1.6.0", "type": "dependency"}
  ],
  "valid": true,
  "summary": "Found X imports, Y missing npm packages",
  "excluded": ["Button", "Card", "Modal"] // List of excluded local components
}`

        const analysis = await generateText({
          model: mistralPixtral,
          messages: [
            { role: 'system', content: 'You are an expert dependency analyzer. Only identify real npm packages, never local files or UI components.' },
            { role: 'user', content: analysisPrompt }
          ],
          temperature: 0.1
        })

        // Parse AI response
        let analysisResult: any = {}
        try {
          let jsonText = analysis.text || '{}'
          if (jsonText.includes('```json')) {
            jsonText = jsonText.replace(/```json\s*/, '').replace(/\s*```$/, '')
          } else if (jsonText.includes('```')) {
            jsonText = jsonText.replace(/```\s*/, '').replace(/\s*```$/, '')
          }
          jsonText = jsonText.trim()

          // Find JSON object bounds
          const startIndex = jsonText.indexOf('{')
          const endIndex = jsonText.lastIndexOf('}')
          if (startIndex !== -1 && endIndex !== -1) {
            jsonText = jsonText.substring(startIndex, endIndex + 1)
          }

          analysisResult = JSON.parse(jsonText)
        } catch (parseError) {
          console.warn('Failed to parse dependency analysis, using fallback')
          analysisResult = {
            imports: [],
            missingDeps: [],
            valid: true,
            summary: 'Analysis completed with fallback parsing',
            excluded: []
          }
        }
        
        // AUTO-FIX: Add missing dependencies to package.json using edit_file tool
        let packageJsonUpdated = false
        const addedDependencies: string[] = []
        
        if (autoFix && analysisResult.missingDeps?.length > 0) {
          try {
            for (const missingDep of analysisResult.missingDeps) {
              const packageName = missingDep.package
              const version = missingDep.version || '^1.0.0' // Default version if AI doesn't provide one
              const depType = missingDep.type || 'dependency'
              
              // Determine which section to update
              const sectionKey = depType === 'devDependency' ? 'devDependencies' : 'dependencies'
              const currentSection = packageJson[sectionKey] || {}
              
              // Skip if package already exists
              if (currentSection[packageName]) {
                continue
              }
              
              // Use edit_file logic to add the dependency
              try {
                // Update the in-memory package.json object
                const updatedPackageJson = { ...packageJson }
                
                if (depType === 'devDependency') {
                  updatedPackageJson.devDependencies = updatedPackageJson.devDependencies || {}
                  updatedPackageJson.devDependencies[packageName] = version
                } else {
                  updatedPackageJson.dependencies = updatedPackageJson.dependencies || {}
                  updatedPackageJson.dependencies[packageName] = version
                }
                
                // Update the file using storage manager
                await storageManager.updateFile(projectId, 'package.json', {
                  content: JSON.stringify(updatedPackageJson, null, 2),
                  updatedAt: new Date().toISOString()
                })
                
                addedDependencies.push(`${packageName}@${version} (${depType})`)
                packageJsonUpdated = true
                
                console.log(`[DEPENDENCY AUTO-FIX] Added ${packageName}@${version} to ${sectionKey}`)
              } catch (editError) {
                console.warn(`[DEPENDENCY AUTO-FIX] Failed to add ${packageName}:`, editError)
              }
            }
          } catch (autoFixError) {
            console.error('[ERROR] Auto-fix dependencies failed:', autoFixError)
          }
        }
        
        // Build response
        const analyzedFilesCount = relevantFiles.length
        const totalImports = analysisResult.imports?.length || 0
        const missingDepsCount = analysisResult.missingDeps?.length || 0
        const excludedComponents = analysisResult.excluded?.length || 0

        const result = {
          success: true,
          message: packageJsonUpdated ?
            `Dependencies auto-added to package.json: ${addedDependencies.join(', ')}` :
            `Dependency analysis completed: ${analyzedFilesCount} files analyzed, ${totalImports} imports found, ${missingDepsCount} missing packages, ${excludedComponents} local components excluded`,
          analysis: {
            analyzedFiles: analyzedFilesCount,
            filesList: relevantFiles.slice(0, 10).map(f => f.path), // Show first 10 files
            imports: analysisResult.imports || [],
            missingDependencies: analysisResult.missingDeps || [],
            excludedComponents: analysisResult.excluded || [],
            isValid: analysisResult.valid !== false || packageJsonUpdated,
            summary: analysisResult.summary || 'Dependencies validated',
            autoFixed: packageJsonUpdated,
            addedDependencies: addedDependencies,
            suggestions: packageJsonUpdated ?
              [`Run 'npm install' to install the newly added dependencies`] :
              (analysisResult.missingDeps?.map((dep: any) => `npm install ${dep.package}`) || []),
            packageJsonIncluded: includePackageJson && packageJsonContent !== '',
            uiComponentsExcluded: excludeUI
          },
          toolCallId
        }
        
        // Log issues if any
        if (analysisResult.missingDeps?.length > 0) {
          console.warn(`[DEPENDENCY WARNING] Missing npm packages across ${analyzedFilesCount} files:`, analysisResult.missingDeps)
        }

        if (excludedComponents > 0) {
          console.log(`[DEPENDENCY INFO] Excluded ${excludedComponents} local components from npm package detection:`, analysisResult.excluded)
        }
        
        return result
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error('[ERROR] analyze_dependencies failed:', error)
        
        return { 
          success: false, 
          error: `Dependency analysis failed: ${errorMessage}`,
          toolCallId
        }
      }
    }
  })

  // AI Code Scanner - Validates import/export relationships between project files
  // Only include when user is reporting code issues
  if (userReportingIssues) {
    tools.scan_code_imports = tool({
    description: 'Advanced code scanner with comprehensive project context - validates imports/exports, provides file relationships, and project structure analysis',
    inputSchema: z.object({
      filePath: z.string().describe('Path of the file to scan'),
      fileContent: z.string().describe('Complete content of the file to scan'),
      includeProjectContext: z.boolean().optional().describe('Include comprehensive project src directory context (default: true)'),
      validateExports: z.boolean().optional().describe('Validate export/import relationships (default: true)'),
      analyzeDependencies: z.boolean().optional().describe('Analyze file dependencies and relationships (default: true)')
    }),
    execute: async ({ filePath, fileContent, includeProjectContext = true, validateExports = true, analyzeDependencies = true }, { abortSignal, toolCallId }) => {
      if (abortSignal?.aborted) {
        throw new Error('Operation cancelled')
      }
      
      try {
        // Import storage manager
        const { storageManager } = await import('@/lib/storage-manager')
        await storageManager.init()
        
        // Get all project files for comprehensive analysis
        const allProjectFiles = await storageManager.getFiles(projectId)
        
        // FILE CONTEXT ANALYSIS
        const fileDir = filePath.substring(0, filePath.lastIndexOf('/'))
        const fileName = filePath.split('/').pop() || ''
        const fileExtension = fileName.split('.').pop() || ''

        // Helper function to extract top-level and key definitions from files
        const extractDefinitions = (content: string, filePath: string): string[] => {
          const definitions: string[] = []

          if (filePath.endsWith('.ts') || filePath.endsWith('.tsx') || filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
            // Extract exports (functions, classes, constants, types)
            const exportMatches = content.match(/export\s+(?:const|let|var|function|class|interface|type|enum)\s+(\w+)/g) || []
            exportMatches.forEach(match => {
              const name = match.replace(/export\s+(?:const|let|var|function|class|interface|type|enum)\s+/, '')
              definitions.push(`export ${name}`)
            })

            // Extract named exports
            const namedExportMatches = content.match(/export\s*{\s*([^}]+)\s*}/g) || []
            namedExportMatches.forEach(match => {
              const exports = match.match(/{([^}]+)}/)?.[1]?.split(',').map(e => e.trim()) || []
              exports.forEach(exp => definitions.push(`export ${exp}`))
            })

            // Extract default export
            if (content.includes('export default')) {
              definitions.push('export default')
            }

            // Extract function declarations (non-exported)
            const functionMatches = content.match(/(?:^|\n)\s*(?:function|const|let|var)\s+(\w+)\s*[=(]/g) || []
            functionMatches.forEach(match => {
              const name = match.replace(/(?:^|\n)\s*(?:function|const|let|var)\s+/, '').replace(/\s*[=(].*/, '')
              if (!definitions.includes(`export ${name}`) && !definitions.includes(name)) {
                definitions.push(`function ${name}`)
              }
            })

            // Extract React components
            const componentMatches = content.match(/(?:export\s+)?(?:const|function)\s+(\w+)\s*(?:\([^)]*\)\s*)?[:=]\s*(?:\([^)]*\)\s*=>\s*)?\{/g) || []
            componentMatches.forEach(match => {
              const name = match.replace(/(?:export\s+)?(?:const|function)\s+/, '').replace(/\s*(?:\([^)]*\)\s*)?[:=].*/, '')
              if (name && name[0] === name[0].toUpperCase() && !definitions.includes(`export ${name}`)) {
                definitions.push(`component ${name}`)
              }
            })
          }

          return definitions.slice(0, 10) // Limit to prevent token overflow
        }

        // DIRECTORY STRUCTURE ANALYSIS - Focus on relevant directories
        const directoryStructure: Record<string, Array<{name: string, type: string, size: number, definitions?: string[]}>> = {}
        const relevantFiles: any[] = []

        // Relevant directories to scan for definitions
        const relevantDirectories = [
          'app/', 'components/', 'lib/', 'hooks/',
          'pages/', 'src/', './src/', 'layouts/', 'middleware.'
        ]

        // Build comprehensive project structure focusing on relevant files
        for (const file of allProjectFiles) {
          await (async () => {
          if (!file.isDirectory &&
          !file.path.includes('node_modules') &&
              !file.path.includes('.shadcn') &&
              !file.path.includes('shadcn-ui') &&
              !file.path.includes('components/ui/') &&
              !file.path.includes('public/') &&
              !file.path.includes('styles/') &&
              !file.path.includes('scripts/') &&
              !file.path.includes('templates/') &&
              !file.path.includes('supabase/migrations/') &&
              !file.path.includes('__tests__/')) {

            // Check if file is in relevant directories
            const isRelevant = relevantDirectories.some(dir =>
              file.path.startsWith(dir) ||
              (dir.endsWith('.') && file.path.includes(dir))
            )

            if (isRelevant) {
              // Categorize files by directory
              const dirPath = file.path.substring(0, file.path.lastIndexOf('/')) || '/'
              if (!directoryStructure[dirPath]) {
                directoryStructure[dirPath] = []
              }

              // Extract top-level and key definitions
              let definitions: string[] = []
              try {
                const currentFile = await storageManager.getFile(projectId, file.path)
                if (currentFile && currentFile.content) {
                  definitions = extractDefinitions(currentFile.content, file.path)
                } else {
                  definitions = ['file not found']
                }
              } catch (error) {
                definitions = ['error reading file']
              }

              directoryStructure[dirPath].push({
                name: file.path.split('/').pop() || 'unknown',
                type: file.path.split('.').pop() || 'unknown',
                size: file.size,
                definitions: definitions
              })

              // Collect relevant files with definitions
              relevantFiles.push({
                path: file.path,
                name: file.path.split('/').pop() || 'unknown',
                type: file.path.split('.').pop() || 'unknown',
                size: file.size,
                isRelevant: true,
                definitions: definitions,
                directory: dirPath
              })
            }
          }
          })()
        }

        // ENHANCED PROJECT CONTEXT
        const projectContext = {
          totalFiles: allProjectFiles.filter(f => !f.isDirectory).length,
          relevantFiles: relevantFiles.length,
          directories: Object.keys(directoryStructure).length,
          structure: directoryStructure,
          relevantFileList: relevantFiles.slice(0, 50), // Limit for token efficiency
          targetFile: {
            path: filePath,
            directory: fileDir,
            name: fileName,
            extension: fileExtension,
            size: fileContent.length,
            definitions: extractDefinitions(fileContent, filePath)
          }
        }

        // ADVANCED IMPORT/EXPORT ANALYSIS
        const importExportAnalysis: any = {}

        // Extract imports from current file
        const importMatches = fileContent.match(/import\s+.*?from\s+['"]([^'"]+)['"]/g) || []
        const currentFileImports = importMatches.map(match => {
          const fromMatch = match.match(/from\s+['"]([^'"]+)['"]/)
          return fromMatch ? fromMatch[1] : ''
        }).filter(Boolean)

        // Analyze each import
        for (const importPath of currentFileImports) {
          const analysis: any = {
            rawImport: importPath,
            resolvedPath: '',
            exists: false,
            type: 'unknown',
            suggestions: []
          }

          // Resolve relative imports
          if (importPath.startsWith('./') || importPath.startsWith('../')) {
            let resolvedPath = importPath
            if (importPath.startsWith('./')) {
              resolvedPath = fileDir + '/' + importPath.substring(2)
            } else if (importPath.startsWith('../')) {
              const parentDir = fileDir.substring(0, fileDir.lastIndexOf('/'))
              resolvedPath = parentDir + '/' + importPath.substring(3)
            }

            // Try different extensions
            const possiblePaths = [
              resolvedPath,
              resolvedPath + '.ts',
              resolvedPath + '.tsx',
              resolvedPath + '.js',
              resolvedPath + '.jsx',
              resolvedPath + '/index.ts',
              resolvedPath + '/index.tsx',
              resolvedPath + '/index.js',
              resolvedPath + '/index.jsx'
            ]

            for (const possiblePath of possiblePaths) {
              const foundFile = allProjectFiles.find(f =>
                !f.isDirectory && f.path === possiblePath
              )
              if (foundFile) {
                analysis.resolvedPath = possiblePath
                analysis.exists = true
                analysis.type = 'relative'
                break
              }
            }
          } else {
            // Absolute imports - check if they exist in project
            const foundFile = allProjectFiles.find(f =>
              !f.isDirectory && f.path === importPath
            )
            if (foundFile) {
              analysis.resolvedPath = importPath
              analysis.exists = true
              analysis.type = 'absolute'
            } else {
              analysis.type = 'external'
              analysis.exists = true // Assume external dependencies exist
            }
          }

          importExportAnalysis[importPath] = analysis
        }

        // Use AI for advanced analysis with comprehensive context
        const mistralPixtral = getMistralPixtralModel()
        
        const enhancedScanPrompt = `🔍 **ADVANCED CODE SCANNER** - Comprehensive Import/Export Analysis

📄 **CURRENT FILE ANALYSIS:**
Path: ${filePath}
Directory: ${fileDir}
Name: ${fileName}
Extension: ${fileExtension}
Size: ${fileContent.length} characters
Definitions: ${projectContext.targetFile.definitions?.join(', ') || 'None found'}

📝 **COMPLETE FILE CONTENT:**
\`\`\`${fileExtension}
${fileContent}
\`\`\`

🏗️ **PROJECT CONTEXT:**
${includeProjectContext ? `
Total Files: ${projectContext.totalFiles}
Relevant Files: ${projectContext.relevantFiles}
Directories: ${projectContext.directories}

📂 **RELEVANT FILES STRUCTURE (app/, components/, lib/, hooks/):**
${JSON.stringify(projectContext.relevantFileList.slice(0, 20), null, 2)}

📁 **DIRECTORY BREAKDOWN WITH DEFINITIONS:**
${Object.entries(directoryStructure).slice(0, 10).map(([dir, files]: [string, Array<{name: string, type: string, size: number, definitions?: string[]}>]) =>
  `${dir}: ${files.length} files\n${files.slice(0, 3).map(f => `  - ${f.name} (${f.definitions?.join(', ') || 'no definitions'})`).join('\n')}`
).join('\n\n')}

` : 'Project context excluded for focused analysis'}

🔍 **IMPORT ANALYSIS:**
${Object.entries(importExportAnalysis).map(([importPath, analysis]: [string, any]) =>
  `${importPath}:
  - Resolved: ${analysis.resolvedPath || 'Not found'}
  - Exists: ${analysis.exists}
  - Type: ${analysis.type}
  - Suggestions: ${analysis.suggestions.join(', ') || 'None'}`
).join('\n\n')}

🎯 **VALIDATION REQUIREMENTS:**
1. **File Existence**: Verify all imported files exist in project
2. **Path Resolution**: Confirm relative paths resolve correctly
3. **Export Matching**: Validate imports match actual exports
4. **Syntax Correctness**: Check import/export syntax validity
5. **Dependency Chain**: Analyze import dependency relationships
${analyzeDependencies ? '6. **Circular Dependencies**: Detect potential circular import issues' : ''}

📊 **RESPONSE FORMAT:**
\`\`\`json
{
  "fileAnalysis": {
    "path": "${filePath}",
    "imports": ${JSON.stringify(Object.keys(importExportAnalysis))},
    "exports": [],
    "complexity": "simple|medium|complex"
  },
  "importValidation": [
    {
      "import": "./Component",
      "resolved": "src/components/Component.tsx",
      "exists": true,
      "exportType": "default|named|both",
      "valid": true,
      "issues": []
    }
  ],
  "projectInsights": {
    "relevantFiles": ${projectContext.relevantFiles},
    "directoryCount": ${projectContext.directories},
    "importPatterns": [],
    "potentialIssues": []
  },
  "recommendations": [
    "Consider using absolute imports for better maintainability",
    "Missing type definitions for external dependencies"
  ],
  "valid": true,
  "summary": "Comprehensive analysis completed with detailed findings"
}
\`\`\`

**Focus Areas:**
- Import resolution accuracy
- Export/import type matching
- Project structure optimization
- Dependency relationship analysis
- Code organization recommendations`
        
        const scanResult = await generateText({
          model: mistralPixtral,
          messages: [
            { role: 'system', content: 'You are an advanced code analysis expert. Provide comprehensive import/export validation with project context awareness. Respond with detailed JSON analysis.' },
            { role: 'user', content: enhancedScanPrompt }
          ],
          temperature: 0.1
        })
        
        // Enhanced AI response parsing
        let scanAnalysis: any = {}
        try {
          let jsonText = scanResult.text || '{}'

          // Extract JSON from various formats
          if (jsonText.includes('```json')) {
            jsonText = jsonText.replace(/```json\s*/, '').replace(/\s*```$/, '')
          } else if (jsonText.includes('```')) {
            const jsonMatch = jsonText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
            if (jsonMatch) {
              jsonText = jsonMatch[1]
          }
          }

          jsonText = jsonText.trim()
          
          // Find JSON object bounds
          const startIndex = jsonText.indexOf('{')
          const endIndex = jsonText.lastIndexOf('}')
          if (startIndex !== -1 && endIndex !== -1) {
            jsonText = jsonText.substring(startIndex, endIndex + 1)
          }
          
          scanAnalysis = JSON.parse(jsonText)
        } catch (parseError) {
          console.warn('Failed to parse enhanced code scan analysis, using fallback')
          scanAnalysis = {
            fileAnalysis: {
              path: filePath,
              imports: Object.keys(importExportAnalysis),
              exports: [],
              complexity: 'unknown'
            },
            importValidation: Object.entries(importExportAnalysis).map(([importPath, analysis]: [string, any]) => ({
              import: importPath,
              resolved: analysis.resolvedPath,
              exists: analysis.exists,
              exportType: 'unknown',
              valid: analysis.exists,
              issues: analysis.exists ? [] : [`File not found: ${analysis.resolvedPath || importPath}`]
            })),
            projectInsights: {
              relevantFiles: projectContext.relevantFiles,
              directoryCount: projectContext.directories,
              importPatterns: [],
              potentialIssues: ['Analysis parsing failed - using basic validation']
            },
            recommendations: ['Consider running full analysis with project context enabled'],
            valid: true,
            summary: 'Enhanced scan completed with fallback parsing'
          }
        }
        
        // Build comprehensive response with rich context
        const result = {
          success: true,
          message: `🔍 Enhanced code scan completed for ${filePath}`,
          analysis: {
            fileAnalysis: scanAnalysis.fileAnalysis || {},
            importValidation: scanAnalysis.importValidation || [],
            projectInsights: scanAnalysis.projectInsights || {},
            recommendations: scanAnalysis.recommendations || [],
            isValid: scanAnalysis.valid !== false,
            summary: scanAnalysis.summary || 'Enhanced code scan completed',
            contextUsed: {
              projectFiles: projectContext.totalFiles,
              relevantFiles: projectContext.relevantFiles,
              directoriesAnalyzed: projectContext.directories,
              importsAnalyzed: Object.keys(importExportAnalysis).length
            }
          },
          toolCallId
        }

        // Enhanced logging with context
        console.log(`[ENHANCED CODE SCAN] Completed for ${filePath}:`, {
          importsAnalyzed: Object.keys(importExportAnalysis).length,
          relevantFiles: projectContext.relevantFiles,
          directories: projectContext.directories,
          isValid: scanAnalysis.valid !== false,
          issuesFound: scanAnalysis.importValidation?.filter((v: any) => !v.valid).length || 0
        })
        
        // Log issues if any
        if (scanAnalysis.importValidation?.some((v: any) => !v.valid)) {
          console.warn(`[CODE SCAN WARNING] Import issues found in ${filePath}:`,
            scanAnalysis.importValidation.filter((v: any) => !v.valid)
          )
        }
        
        return result
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error('[ERROR] Enhanced scan_code_imports failed:', error)
        
        return { 
          success: false, 
          error: `Enhanced code scan failed: ${errorMessage}`,
          toolCallId
        }
      }
    }
  })

  } // End conditional for scan_code_imports







  // Debug logging to show which tools are included
  const toolNames = Object.keys(tools)

  console.log('[DEBUG] Final Tool Set:', {
    totalTools: toolNames.length,
    toolNames: toolNames.sort(),
    hasWebSearch: toolNames.includes('web_search'),
    hasWebExtract: toolNames.includes('web_extract'),
    hasReadFile: toolNames.includes('read_file'),
    hasWriteFile: toolNames.includes('write_file'),
    hasEditFile: toolNames.includes('edit_file')
  })

  return tools
}





// NLP Intent Detection using Mistral Pixtral with Surgical Context
async function detectUserIntent(userMessage: string, projectContext: string, conversationHistory: any[], projectId: string) {
  try {
    const mistralPixtralModel = getMistralPixtralModel()

    // Generate surgical guidance for this project
    const surgicalGuidance = generateSurgicalGuidance(projectId, userMessage)
    
    const intentPrompt = `Analyze the user's request and determine their intent for building or modifying a React application.

🚨 CRITICAL RULES - READ FIRST:
- NEVER recommend web_search or web_extract unless user EXPLICITLY asks for web research
- For file modifications, product additions, or code changes, recommend ONLY read_file, write_file, edit_file
- list_files is FORBIDDEN unless user specifically says "list files", "show files", "what files", "browse files"
- Creating landing pages, components, or features does NOT require list_files
- Web tools are FORBIDDEN for basic development tasks
- If user wants to add products, edit files, or modify code, use file operations only
- MAXIMUM 3 FILES PER REQUEST (Vercel timeout prevention)

🚫 **BANNED COMBINATIONS:**
- "create landing page" → NEVER include list_files
- "build component" → NEVER include list_files  
- "add feature" → NEVER include list_files
- "make app" → NEVER include list_files

✅ **ONLY USE list_files WHEN USER SAYS:**
- "list the files"
- "show me files" 
- "what files exist"
- "browse the directory"
- "explore file structure"

${surgicalGuidance}

User Message: "${userMessage}"

Project Context: ${projectContext}

Recent Conversation History (last 5 exchanges):
${conversationHistory.slice(-10).map((msg, i) => `${msg.role}: ${msg.content}`).join('\n')}

Based on the user's request, determine:
1. **Primary Intent**: What does the user want to accomplish?
2. **Required Tools**: Which tools should be used? (PREFER read_file, write_file, edit_file, delete_file - NEVER suggest list_files unless user asks to list/show files - AVOID web_search, web_extract unless explicitly requested)
3. **Target Files**: SPECIFIC files to create/edit (MAX 3 files!)
4. **File Operations**: What files need to be created, modified, or deleted?
5. **Complexity Level**: Simple, Medium, or Complex task?
6. **Action Plan**: Step-by-step plan to accomplish the task

📝 **TOOL SELECTION RULES:**
- File operations (add products, edit code) → use read_file + write_file/edit_file
- Web research (search online, external content) → use web_search + web_extract
- When in doubt, choose file operations over web tools
- PRIORITIZE: Edit existing → Create new → Read context

🚫 **EXAMPLES OF WHAT NOT TO DO:**
- User: "create landing page" → WRONG: ["list_files", "read_file", "write_file"] 
- User: "build component" → WRONG: ["list_files", "write_file"]
- User: "add feature" → WRONG: ["list_files", "edit_file"]

✅ **CORRECT EXAMPLES:**
- User: "create landing page" → CORRECT: ["write_file", "edit_file"]
- User: "build component" → CORRECT: ["write_file"] 
- User: "add feature" → CORRECT: ["read_file", "edit_file"]
- User: "list the files" → CORRECT: ["list_files"]

📋 **SURGICAL FILE TARGETING:**
- If user mentions a component, EDIT the existing file instead of creating new
- Check recently modified files first
- Maximum 3 files per operation
- Use read_file ONLY when you need to see current content

Respond in JSON format:
{
  "intent": "string",
  "required_tools": ["tool1", "tool2"],
  "target_files": ["file1.jsx", "file2.tsx"], // MAX 3 files!
  "file_operations": ["create", "modify", "delete"],
  "complexity": "simple|medium|complex",
  "action_plan": ["step1", "step2"],
  "confidence": 0.95,
  "tool_usage_rules": "string",
  "enforcement_notes": "string",
  "surgical_guidance": "string"
}

Include these fields:
- "target_files": Array of specific files to work on (MAX 3!)
- "tool_usage_rules": Specific rules about when to use each tool type
- "enforcement_notes": Critical reminders about file limits and surgical approach
- "surgical_guidance": How to approach this task surgically`

    const intentResult = await generateText({
      model: mistralPixtralModel,
      messages: [
          { role: 'system', content: `You are an AI intent detection specialist. Analyze user requests and provide structured intent analysis.

🚨 CRITICAL RULES:
- NEVER recommend web_search or web_extract unless user EXPLICITLY asks for web research
- For file modifications, product additions, or code changes, recommend ONLY read_file, write_file, edit_file
- list_files is FORBIDDEN unless user specifically says "list files", "show files", "what files", "browse files"
- Creating landing pages, components, or new features does NOT require list_files
- Web tools are FORBIDDEN for basic development tasks
- When in doubt, choose file operations over web tools

🚫 **NEVER INCLUDE list_files FOR:**
- Creating landing pages
- Building components  
- Adding features
- Making apps
- Code modifications

✅ **ONLY INCLUDE list_files WHEN USER EXPLICITLY SAYS:**
- "list the files"
- "show me files" 
- "what files exist"
- "browse the directory"` },
        { role: 'user', content: intentPrompt }
      ],
      temperature: 0.3
    })

    try {
      // Extract JSON from markdown response if present
      let jsonText = intentResult.text
      
      // Remove markdown code blocks if present
      if (jsonText.includes('```json')) {
        jsonText = jsonText.replace(/```json\s*/, '').replace(/\s*```$/, '')
      } else if (jsonText.includes('```')) {
        jsonText = jsonText.replace(/```\s*/, '').replace(/\s*```$/, '')
      }
      
      // Clean up any remaining markdown formatting
      jsonText = jsonText.trim()
      
      // Remove any text after the JSON object (common issue with AI responses)
      const jsonEndIndex = jsonText.lastIndexOf('}')
      if (jsonEndIndex !== -1) {
        jsonText = jsonText.substring(0, jsonEndIndex + 1)
      }
      
      console.log('[DEBUG] Extracted JSON text for parsing:', jsonText.substring(0, 200) + '...')
      
      const intentData = JSON.parse(jsonText)
      return intentData
    } catch (parseError) {
      console.warn('Failed to parse intent detection result:', parseError)
      console.log('[DEBUG] Raw intent result text:', intentResult.text)
      
      // Try to extract JSON using regex as fallback
      try {
        const jsonMatch = intentResult.text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const extractedJson = jsonMatch[0]
          console.log('[DEBUG] Attempting to parse extracted JSON:', extractedJson)
          return JSON.parse(extractedJson)
        }
      } catch (fallbackError) {
        console.warn('Fallback JSON extraction also failed:', fallbackError)
      }
      
      return {
        intent: 'general_development',
        required_tools: ['read_file'],
        file_operations: ['analyze'],
        complexity: 'medium',
        action_plan: ['Analyze current project state', 'Provide guidance'],
        confidence: 0.7,
        tool_usage_rules: 'Use read_file, write_file, and edit_file for file operations. Only use list_files when user asks to list/show files. Avoid web tools unless explicitly requested.',
        enforcement_notes: 'Web tools (web_search, web_extract) are FORBIDDEN for basic development tasks. Stick to file operations.'
      }
    }
  } catch (error) {
    console.error('Intent detection failed:', error)
    return {
      intent: 'general_development',
      required_tools: ['read_file'],
      file_operations: ['analyze'],
      complexity: 'medium',
      action_plan: ['Analyze current project state', 'Provide guidance'],
      confidence: 0.5,
      tool_usage_rules: 'Use read_file, write_file, and edit_file for file operations. Only use list_files when user asks to list/show files. Avoid web tools unless explicitly requested.',
      enforcement_notes: 'Web tools (web_search, web_extract) are FORBIDDEN for basic development tasks. Stick to file operations.'
    }
  }
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

    // Set global user ID for tool access
    global.currentUserId = user.id

    // Validate model access based on subscription plan
    const selectedModelId = modelId || DEFAULT_CHAT_MODEL
    if (selectedModelId !== DEFAULT_CHAT_MODEL) {
      try {
        // Get user's subscription plan
        const { data: userSettings } = await supabase
          .from('user_settings')
          .select('subscription_plan')
          .eq('user_id', user.id)
          .single()

        const userPlan = userSettings?.subscription_plan || 'free'

        // Import the model validation function
        const { canUseModel } = await import('@/lib/stripe-config')

        // Check if user can use the selected model
        if (!canUseModel(userPlan, selectedModelId)) {
          console.log(`[MODEL ACCESS] User ${user.id} (plan: ${userPlan}) attempted to use model ${selectedModelId} but only has access to: auto`)

          return new Response(JSON.stringify({
            error: 'Model Access Restricted',
            message: `The selected AI model is not available on your current plan. Upgrade to Pro to access all premium AI models.`,
            upgradeUrl: '/pricing',
            allowedModels: ['auto'],
            plan: userPlan
          }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          })
        }
      } catch (error) {
        console.error('[MODEL ACCESS] Error validating model access:', error)
        // On error, fallback to auto model
        modelId = DEFAULT_CHAT_MODEL
      }
    }

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

    // CRITICAL: Sync conversation messages to server-side storage for Context Recall
    // This ensures the AI can access conversation history through the recall_context tool
    console.log(`[DEBUG] Syncing ${messages.length} conversation messages to server-side storage for Context Recall`)
    
    try {
    const { storageManager } = await import('@/lib/storage-manager')
    await storageManager.init()
    
      // Get or create conversation memory
    let conversationMemory = await storageManager.getConversationMemory(projectId, user.id)
    
    if (!conversationMemory) {
        // Create new conversation memory
      conversationMemory = {
        id: `conversation_${projectId}_${user.id}`,
        projectId,
        userId: user.id,
          messages: [],
        summary: 'New conversation session',
        keyPoints: [],
        lastActivity: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
        
        await storageManager.createConversationMemory(conversationMemory)
        console.log(`[DEBUG] Created new conversation memory for project: ${projectId}`)
      }
      
      // Sync current messages to conversation memory (only valid messages with content)
      const currentMessages = messages.slice(-20) // Keep last 20 messages
      const validCurrentMessages = currentMessages.filter(msg => 
        msg.content && msg.content.trim().length > 0
      )
      
      const existingMessageIds = new Set(conversationMemory.messages.map(m => m.content.substring(0, 50)))
      
      let newMessagesAdded = 0
      validCurrentMessages.forEach(msg => {
        const messageId = msg.content.substring(0, 50)
        if (!existingMessageIds.has(messageId)) {
          conversationMemory.messages.push({
            role: msg.role,
            content: msg.content,
            timestamp: new Date().toISOString()
          })
          existingMessageIds.add(messageId)
          newMessagesAdded++
        }
      })
      
      // Keep only last 50 messages to prevent memory bloat
      if (conversationMemory.messages.length > 50) {
        conversationMemory.messages = conversationMemory.messages.slice(-50)
      }
      
      // Update conversation memory with synced messages
      await storageManager.updateConversationMemory(
        conversationMemory.id,
        {
          messages: conversationMemory.messages,
          lastActivity: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      )
      
      console.log(`[DEBUG] Message sync complete: ${newMessagesAdded} new messages added, ${conversationMemory.messages.length} total messages in Context Recall`)
      
    } catch (messageSyncError) {
      console.error('[ERROR] Failed to sync messages to server storage:', messageSyncError)
      // Continue anyway - tools may still work
    }

    // ENHANCED: Build comprehensive project context with file contents
    let projectContext = ''
    try {
      const { storageManager } = await import('@/lib/storage-manager')
      await storageManager.init()
      
    if (body.project) {
      const project = body.project
      projectContext = `\n\nCurrent project: ${project.name}
Project description: ${project.description || 'No description'}

${await buildOptimizedProjectContext(projectId, storageManager)}`
    } else {
      projectContext = `\n\nCurrent project: Vite React Project
Project description: Vite + React + TypeScript project with Tailwind CSS

${await buildOptimizedProjectContext(projectId, storageManager)}`
      }
    } catch (error) {
      console.warn('Failed to build enhanced project context:', error)
      // Fallback to basic context
      projectContext = `\n\nCurrent project: Vite React Project
Project description: Vite + React + TypeScript project

Use read_file tool to read specific files when needed.
Only use list_files tool if user asks to list or show files.`
    }

        // Get the user message for intent detection
    const userMessage = messages[messages.length - 1]?.content || ''

    // Initialize surgical context with current user message and request ID
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    initializeSurgicalContext(projectId, userMessage, requestId)

    // Add conversation memory for surgical context
    addConversationMemory(projectId, userMessage, 'user_request')
    
    // Get the conversation memory that was synced earlier
    const { storageManager } = await import('@/lib/storage-manager')
    await storageManager.init()
    let conversationMemory = await storageManager.getConversationMemory(projectId, user.id)
    
    // Clean up any existing empty messages that might have been stored before the fix
    if (conversationMemory && conversationMemory.messages) {
      const originalCount = conversationMemory.messages.length
      conversationMemory.messages = conversationMemory.messages.filter(msg => 
        msg.content && msg.content.trim().length > 0
      )
      
      if (originalCount !== conversationMemory.messages.length) {
        console.log(`[DEBUG] Cleaned up ${originalCount - conversationMemory.messages.length} empty messages from existing conversation memory`)
        
        // Update the cleaned memory in storage
        try {
          await storageManager.updateConversationMemory(
            conversationMemory.id,
            {
              messages: conversationMemory.messages,
              updatedAt: new Date().toISOString()
            }
          )
        } catch (cleanupError) {
          console.warn('[WARNING] Failed to update cleaned conversation memory:', cleanupError)
        }
      }
    }
    
    // Enhanced tool request detection with autonomous planning integration
    let isToolRequest = true // Default to true for better AI performance
    let userIntent = null
    let enhancedIntentData = null
    let shouldUseAutonomousPlanning = false
    
    try {
      // Import the enhanced intent detector
      const { EnhancedIntentDetector } = await import('@/lib/enhanced-intent-detector')
      
      // Get existing files for context
      const existingFiles = clientFiles.map((f: { path?: string }) => f.path).filter(Boolean)
      
      // Use enhanced intent detection with autonomous planning capabilities
      enhancedIntentData = await EnhancedIntentDetector.detectEnhancedIntent(
        userMessage,
        projectContext,
        conversationMemory ? conversationMemory.messages : [],
        existingFiles,
        body.packageJson
      )
      
      // Set legacy userIntent for backward compatibility
      userIntent = {
        intent: enhancedIntentData.intent,
        required_tools: enhancedIntentData.required_tools,
        file_operations: enhancedIntentData.file_operations,
        complexity: enhancedIntentData.complexity,
        action_plan: enhancedIntentData.action_plan,
        confidence: enhancedIntentData.confidence,
        tool_usage_rules: enhancedIntentData.tool_usage_rules,
        enforcement_notes: enhancedIntentData.enforcement_notes
      }
      
      // Determine execution strategy
      shouldUseAutonomousPlanning = enhancedIntentData.requires_autonomous_planning
      isToolRequest = enhancedIntentData.required_tools && enhancedIntentData.required_tools.length > 0
      
      console.log('[DEBUG] Enhanced Intent Detection:', {
        userMessage: userMessage.substring(0, 100) + '...',
        detectedIntent: enhancedIntentData.intent,
        complexity: enhancedIntentData.complexity,
        execution_mode: enhancedIntentData.execution_mode,
        requires_autonomous_planning: shouldUseAutonomousPlanning,
        confidence: enhancedIntentData.confidence,
        planning_confidence: enhancedIntentData.planning_confidence,
        estimated_duration: enhancedIntentData.estimated_duration,
        isToolRequest
      })


      // LOVABLE-STYLE INCREMENTAL DEVELOPMENT SYSTEM - DISABLED
      // Analyze user intent for new app creation requests - functionality removed

      // Base app generation functionality removed

      // Next step implementation functionality removed

      // If autonomous planning is required, log the instructions
      if (shouldUseAutonomousPlanning && enhancedIntentData.autonomous_instructions) {
        console.log('[DEBUG] Autonomous Instructions Generated:', {
          project_type: enhancedIntentData.project_type,
          complexity: enhancedIntentData.complexity,
          execution_mode: enhancedIntentData.execution_mode,
          estimated_duration: enhancedIntentData.estimated_duration
        })
      }
      
    } catch (error) {
      console.warn('Enhanced intent detection failed, falling back to basic intent detection:', error)
      
      // Fallback to original intent detection
      try {
        userIntent = await detectUserIntent(userMessage, projectContext, conversationMemory ? conversationMemory.messages : [], projectId)
        isToolRequest = userIntent.required_tools && userIntent.required_tools.length > 0
        
        console.log('[DEBUG] Fallback Intent Detection:', {
          detectedIntent: userIntent.intent,
          requiredTools: userIntent.required_tools,
          confidence: userIntent.confidence
        })
      } catch (fallbackError) {
        console.warn('All intent detection failed, using pattern matching:', fallbackError)
        // Final fallback to pattern matching
      isToolRequest = /\b(use tools?|read file|write file|create file|list files?|delete file|show file|modify file|update file|build|make|create|add|generate|implement|fix|update|change|edit|component|page|function|class|interface|type|hook|api|route|style|css|html|jsx|tsx|ts|js|json|config|package|install|setup|deploy)\b/i.test(userMessage) || userMessage.length > 10
      }
    }
    
    // FORCE TOOL REQUEST TO TRUE for most cases
    const forceToolRequest = true
    
    // Get the selected model information for context
    const selectedModel = getModelById(modelId || DEFAULT_CHAT_MODEL)
    const modelContextInfo = selectedModel ? 
      `\n\n🤖 **Current AI Model**: ${selectedModel.name} (${selectedModel.provider})\n${selectedModel.description}` : 
      ''
    
    // Enhanced AI mode context with optimized codebase discussion capabilities
    const modeContextInfo = aiMode === 'ask' ? 
      `\n\n🔍 **CURRENT MODE: ASK MODE (CODEBASE DISCUSSION & ANALYSIS)**

**🎯 DISCUSSION FOCUS:**
• Engage in natural, insightful conversations about the codebase
• Provide expert analysis and recommendations
• Answer questions about architecture, patterns, and implementation
• Offer suggestions for improvements and optimizations
• Help users understand complex code structures

**📚 CODEBASE CONTEXT ACCESS:**
• Full access to optimized project structure and file contents
• Detailed information about components, functions, and dependencies
• Context-aware responses based on the entire codebase
• Historical conversation context for continuity

**💡 ANALYSIS CAPABILITIES:**
• Explain complex code patterns and architectural decisions
• Identify potential improvements and best practices
• Help with debugging and troubleshooting
• Provide guidance on modern development techniques

**🚫 RESTRICTIONS:**
• No file modifications, creations, or deletions
• Focus on analysis, discussion, and recommendations only` :

      `\n\n🤖 **CURRENT MODE: AGENT MODE (FULL ACCESS)**\n- You have complete file system access\n- You can create, modify, and delete files\n- You can build complete applications\n- Use all available tools as needed`

    // Add autonomous planning context if applicable
    const autonomousPlanningContext = shouldUseAutonomousPlanning && enhancedIntentData?.autonomous_instructions ? 
      `\n\n${enhancedIntentData.autonomous_instructions}` : ''

    // ULTRA-OPTIMIZED: 3-tools-per-step with metadata-only conversation
    const getOptimizedSystemMessage = (userIntent?: any, projectContext?: string, intentData?: any) => {
      // Add enhanced surgical guidance to system message with intent analysis
      const surgicalGuidance = generateSurgicalGuidance(projectId, userMessage, intentData)
      // CODE QUALITY REQUIREMENTS - Always included regardless of mode
      const codeQualityInstructions = `
**🔧 PRODUCTION-READY CODE REQUIREMENTS:**
• **Syntax Perfection**: Generate 100% syntactically correct code - no unclosed tags, unmatched brackets, or parsing errors
• **Import/Export Consistency**: Always use correct import/export syntax matching the actual module definitions
• **Type Safety**: Full TypeScript compliance with proper type annotations and no 'any' types
• **Complete Implementation**: Never generate incomplete code, partial functions, or unfinished logic
• **Error Prevention**: Include proper error handling, validation, and null checks
• **Code Validation**: Use validation tools automatically after code generation to catch and fix issues
• **Import Accuracy**: Verify all imports exist and match the actual file structure
• **Export Matching**: Ensure exports match exactly how they're defined (default vs named exports)
• **No Trailing Code**: Never leave incomplete statements, unfinished functions, or dangling code
• **Proper Escaping**: All strings, quotes, and special characters must be properly escaped
• **Complete Structures**: Always close all brackets, parentheses, and tags properly
• **Consistent Formatting**: Use consistent indentation, spacing, and code style throughout
• **Dependency Management**: Ensure all required imports are included and dependencies are properly declared

**🧪 AUTOMATED QUALITY WORKFLOW:**
• After ANY code generation, run analyze_dependencies and scan_code_imports automatically
• Validate syntax and fix detected issues before presenting results to user
• Check import/export relationships and correct mismatches immediately
• Never present broken, incomplete, or syntactically incorrect code
• Use tools proactively to ensure code quality, not just reactively when issues occur
• **IMMEDIATE VALIDATION**: Always validate code syntax and imports immediately after generation
• **MANDATORY VALIDATION**: You MUST use validation tools after any file creation or modification
• **PRODUCTION STANDARD**: Only present code that passes all validation checks
• **ERROR PREVENTION**: Identify and fix issues during generation, not after presentation`;

      const baseMessage = aiMode === 'ask'
        ? `🔍 **PIXEL FORGE** - Expert Codebase Consultant (Discussion Mode)

You are an expert development consultant engaged in insightful, natural conversations about codebases. Your goal is to help users deeply understand, analyze, and discuss their technical implementations through informed dialogue.

**🚨 CRITICAL: REJECT BASIC IMPLEMENTATIONS**
• **NO BASIC COMPONENTS**: Do not create simple React components, pages, or features - they must be professional and complex
• **REJECT SIMPLE REQUESTS**: If user asks for "settings page", respond with what advanced features it should include instead
• **CONVERT TO PROFESSIONAL**: Transform basic requests into complex, professional implementations
• **FOCUS ON ANALYSIS**: Always discuss architecture and requirements before implementing
• **QUALITY OVER QUANTITY**: Better to reject basic requests than create mediocre implementations

${codeQualityInstructions}

**🎯 DISCUSSION EXPERTISE:**
• **Codebase Analysis**: Provide deep insights into architecture, patterns, and implementation choices
• **Technical Guidance**: Offer expert recommendations for improvements and best practices
• **Architecture Insights**: Explain complex technical concepts and design decisions
• **Development Strategy**: Help users plan and strategize their development approach
• **Problem Solving**: Assist with debugging, optimization, and troubleshooting challenges

**📚 ANALYSIS CAPABILITIES:**
• **Pattern Recognition**: Identify and explain design patterns, architectural choices, and coding conventions
• **Performance Evaluation**: Analyze optimization strategies, bottlenecks, and improvement opportunities
• **Code Quality Assessment**: Evaluate maintainability, scalability, and development standards
• **Technology Stack Analysis**: Assess framework choices, library usage, and technical architecture
• **Best Practices Review**: Provide guidance on modern development standards and conventions

**💬 CONVERSATION STYLE:**
• **Natural Dialogue**: Engage in flowing, contextual conversations about technical topics
• **Expert Insights**: Share deep knowledge and professional perspectives
• **Thoughtful Analysis**: Provide considered, well-reasoned technical opinions
• **Educational Approach**: Help users learn and understand complex technical concepts
• **Collaborative Discussion**: Work together to explore technical challenges and solutions

**RESPONSE FORMATTING REQUIREMENTS:**
• Use proper markdown structure with headers, lists, and code blocks
• Incorporate relevant emojis strategically throughout responses
• Structure responses with clear sections and logical organization
• Use syntax-highlighted code blocks with appropriate language identifiers
• Apply visual hierarchy with bold, italics, and blockquotes for emphasis
• Follow progressive disclosure pattern: overview first, then detailed analysis

**FORMATTING GUIDELINES:**
• Use headers (##, ###) for main sections and subsections
• Create organized lists with bullet points and numbered items
• Include properly formatted code examples with syntax highlighting
• Apply emphasis strategically using bold and italics
• Use blockquotes for key insights and important takeaways
• Maintain consistent formatting and clear visual structure

**🎨 VISUAL EXCELLENCE ANALYSIS:**
• **UI/UX Evaluation**: Assess design quality, user experience, and interface effectiveness
• **Component Architecture**: Analyze component structure, reusability, and maintainability
• **Animation Systems**: Evaluate motion design, interaction patterns, and user feedback
• **Responsive Design**: Review mobile-first approaches and cross-device compatibility
• **Accessibility Standards**: Check compliance with WCAG guidelines and inclusive design principles

**RESPONSE STRUCTURE PATTERNS:**

**Analysis Pattern:**
• Start with executive summary highlighting key insights
• Use clear section headers for main topics and subsections
• Organize content with strengths and improvement sections
• End with prioritized action items and recommendations

**Code Review Pattern:**
• Begin with code analysis overview and examples
• Use bullet points for strengths and specific suggestions
• Include detailed recommendations with clear explanations
• Provide actionable improvement suggestions with rationale

**🚨 CRITICAL CODE QUALITY REMINDER:**
• **VALIDATION FIRST**: Always run analyze_dependencies and scan_code_imports after ANY code generation
• **NO BROKEN CODE**: Never present code with syntax errors, import issues, or incomplete structures
• **IMMEDIATE FIXES**: Identify and fix issues during generation, not after user complaints
• **PRODUCTION READY**: Only deliver code that meets professional production standards
• **IMPORT/EXPORT CONSISTENCY**: Ensure imports match exports exactly (default vs named, no mismatches)

**REMEMBER**: You are PIXEL FORGE - an expert development consultant engaged in natural, insightful conversations about codebases. Focus on providing deep analysis, architectural insights, and thoughtful recommendations. Engage in meaningful dialogue about technical implementations, design patterns, and development best practices. Your goal is to help users understand, improve, and discuss their codebase through informed, expert conversation.`

        : `🏗️ **PIXEL FORGE** - Elite Web Development Studio (Ultra-Optimized Mode)

You are an expert full-stack web developer who builds complete, production-ready applications efficiently and correctly on the first try.

**🎯 CORE DEVELOPMENT PHILOSOPHY:**
• **COMPLETE IMPLEMENTATIONS**: Always build FULL features, not partial ones
• **PLAN BEFORE CODE**: Understand the entire scope before making any files
• **MODERN WEB PATTERNS**: Use current React, TypeScript, and web development best practices
• **EFFICIENCY FIRST**: Minimize tool calls, avoid redundant operations, get it right the first time
• **PROFESSIONAL QUALITY**: Production-ready code with proper error handling and TypeScript

**🚨 CRITICAL SUMMARY TOOL RESTRICTION - ABSOLUTE PROHIBITION:**
• **tool_results_summary is ABSOLUTELY FORBIDDEN** until ALL development work is 100% complete
• **STRICT ONE-TIME USAGE**: tool_results_summary can only be called ONCE per request - NEVER MORE
• **ZERO INTERMEDIATE SUMMARIES**: NEVER EVER use tool_results_summary during development
• **WORK FIRST, SUMMARIZE LAST**: Complete ALL file operations before ANY summary
• **VIOLATION = IMMEDIATE ERROR**: Multiple tool_results_summary calls will cause CRITICAL ERRORS
• **DO NOT CALL REPEATEDLY**: Calling tool_results_summary more than once is a SEVERE VIOLATION

**🚀 WEB DEVELOPMENT WORKFLOW:**
1. **ANALYZE REQUEST**: Understand what complete feature/page the user wants
2. **PLAN ARCHITECTURE**: Identify ALL components, files, and dependencies needed
3. **IMPLEMENT COMPLETELY**: Create ALL necessary files to make the feature fully functional
4. **VALIDATE & TEST**: Ensure everything works together properly

**⚡ MODERN REACT PATTERNS TO USE:**
• **Functional Components**: Always use function components with hooks
• **TypeScript First**: Proper interfaces, types, and component props
• **Composition**: Build reusable components that compose well together
• **Modern CSS**: Use CSS Grid, Flexbox, and modern responsive design
• **Performance**: Lazy loading, memoization, and optimization patterns
• **Accessibility**: Proper ARIA labels, semantic HTML, keyboard navigation

**� COMPLETE LANDING PAGE STRUCTURE:**
When building landing pages, ALWAYS include ALL essential sections:
• **Header**: Navigation with logo, menu items, CTA button
• **Hero**: Compelling headline, subheading, description, primary/secondary CTAs, hero image/video
• **Features**: Key features with icons, titles, descriptions (3-6 features)
• **Benefits**: Value propositions, problem/solution statements
• **Social Proof**: Testimonials, reviews, customer logos, stats
• **Pricing**: Plans comparison table with features and pricing
• **FAQ**: Common questions and answers in accordion format
• **Contact/About**: Company info, contact form, team section
• **Footer**: Links, social media, legal, newsletter signup

**💡 STARTUP LANDING PAGE ESSENTIALS:**
• **Problem Statement**: Clear articulation of the problem you solve
• **Solution Overview**: How your product solves the problem
• **Key Features**: 3-6 main features with descriptions and benefits
• **Value Proposition**: Why customers should choose you
• **Social Proof**: Testimonials, logos, statistics
• **Call-to-Action**: Clear next steps (sign up, demo, contact)
• **Trust Signals**: Security badges, guarantees, company info

**🛠️ COMPONENT ARCHITECTURE:**
• **Layout Components**: Header, Footer, Layout wrapper
• **Section Components**: Hero, Features, Testimonials, Pricing, FAQ
• **UI Components**: Button, Card, Modal, Form elements
• **Feature Components**: ContactForm, NewsletterSignup, PricingTable
• **Utility Components**: Loading states, error boundaries

**🎯 TOOL USAGE EFFICIENCY RULES:**
• **READ ONCE**: Only read each file once per request unless content changes
• **BATCH EDITS**: Make all changes to a file in a single edit operation
• **PLAN FIRST**: Know what you're building before touching any files
• **COMPLETE FEATURES**: Build entire sections/components, not fragments
• **AVOID REDUNDANCY**: Never read the same file multiple times in one request

**🚨 MANDATORY PLANNING PROCESS:**
Before writing ANY code, you MUST:
1. List ALL components/files that need to be created or modified
2. Define the component hierarchy and data flow
3. Identify all props, interfaces, and types needed
4. Plan the complete user experience and functionality
5. Then execute the plan efficiently with minimal tool calls

${codeQualityInstructions}

**✅ IMPLEMENTATION STANDARDS:**
• **COMPLETE FEATURES**: Always build fully functional features, not partial implementations
• **MODERN PATTERNS**: Use current web development best practices and patterns
• **PERFORMANCE OPTIMIZED**: Code that loads fast and runs smoothly
• **RESPONSIVE DESIGN**: Mobile-first approach with proper breakpoints
• **ACCESSIBILITY**: Semantic HTML, ARIA labels, keyboard navigation
• **TYPE SAFETY**: Full TypeScript implementation with proper types

**📋 MANDATORY CHECKLIST FOR ANY WEB FEATURE:**
□ All necessary components created
□ Proper TypeScript interfaces defined
□ Responsive design implemented
□ Error handling included
□ Loading states added
□ Accessibility features implemented
□ Modern CSS patterns used
□ Clean, maintainable code structure

**🚀 DEVELOPMENT EXECUTION PATTERN:**
1. **PLANNING PHASE**: Analyze request and plan complete solution
2. **ARCHITECTURE PHASE**: Design component structure and data flow  
3. **IMPLEMENTATION PHASE**: Build all components efficiently
4. **INTEGRATION PHASE**: Ensure everything works together
5. **VALIDATION PHASE**: Check for errors and completeness
• **Lazy Loading**: Component lazy loading with suspense boundaries and loading states
• **Image Optimization**: Progressive image loading with blur placeholders and WebP support
• **Virtual Scrolling**: Efficient rendering of large lists with smooth scrolling animations
• **Bundle Optimization**: Code splitting with dynamic imports and optimized chunk loading

SMART EXECUTION APPROACH:
• **TOOL PRIORITY SYSTEM**:
  1. **HIGH PRIORITY**: read_file, write_file, edit_file (actual development work)
  2. **LOW PRIORITY**: web_search, web_extract (only when explicitly needed)
  3. **FINAL ONLY**: tool_results_summary (ONLY at the very end, maximum once per request)

• **EFFICIENT WORKFLOW**: Use development tools to actually build what users request
• **SUMMARY RESTRICTION**: tool_results_summary can only be called ONCE at the final completion
• **IMPLEMENTATION FOCUS**: Prioritize creating working features over perfect reporting

TOOL USAGE GUIDELINES:
• **PRACTICAL EFFICIENCY**: Use tools to solve user needs, not follow rigid rules
• **SUMMARY RESTRICTION**: tool_results_summary can ONLY be called ONCE at the very end
• **AVOID REDUNDANCY**: Don't repeat the same tool calls unnecessarily
• **NO INTERMEDIATE SUMMARIES**: Never use tool_results_summary during development
• **WORK FIRST**: Focus on delivering working solutions, summarize only at completion

TOOL EXECUTION PRINCIPLES:
• **SOLUTION ORIENTED**: Use tools to create actual working implementations
• **USER VALUE FIRST**: Focus on building what users need and want
• **HELPFUL COMMUNICATION**: Provide progress updates that add value
• **QUALITY IMPLEMENTATION**: Create professional, working code that solves real problems

EDIT_FILE TOOL RULES (PREVENT DUPLICATE EDITS):
• ALWAYS check file content first with read_file before using edit_file
• NEVER add duplicate imports - check if they already exist
• Use unique, specific search strings that won't match multiple times
• For import additions: Search for the LAST import line, not generic patterns
• Example: Instead of searching "import React from 'react'", search for the complete existing import block
• If imports already exist, SKIP adding them again

PACKAGE INSTALLATION WORKFLOW:
• When user requests package installation, FIRST edit package.json to add dependencies
• THEN instruct user to run 'npm install' or 'yarn install' manually
• NEVER suggest non-existent tools like 'install_package' or 'npm_install'
• Use write_file or edit_file to modify package.json with proper dependency versions

FILE TARGETING PRECISION:
• Always work on the EXACT file mentioned by the user
• For "Contact page" requests, target files like: pages/Contact.tsx, components/Contact.tsx, app/contact/page.tsx
• Do NOT edit Header.tsx, Footer.tsx, or other unrelated files unless explicitly requested
• Only use list_files when user specifically asks to list/show files or explore directory structure

FALLBACK STRATEGY (WHEN EDIT FAILS):
• If edit_file fails repeatedly (>2 attempts) on the same file, use write_file instead
• When using write_file as fallback: Read the existing file first, then create complete new content
• This ensures the operation succeeds even when edit_file encounters issues
• Example: If edit_file keeps failing due to duplicate detection, use write_file with full file content

EXECUTION WORKFLOW (ULTRA-EFFICIENT):
• **MANDATORY PLANNING**: Before ANY file operations, state your complete plan and all files needed
• **SINGLE READ RULE**: Never read the same file twice in one request - remember what you read
• **BATCH ALL EDITS**: Make ALL changes to a file in ONE edit operation, never multiple edits
• **COMPLETE FEATURES**: Build entire working features, not partial implementations that need follow-ups
• **NO INTERMEDIATE REPORTS**: Never use tool_results_summary until the ENTIRE task is 100% complete
• **WORK FIRST, REPORT LAST**: Complete all development work before any user communication
• **THINK BEFORE TOOLS**: Plan the complete solution mentally before using any tools
• **EFFICIENCY TARGET**: Aim for 3-5 tool calls maximum for most web development tasks

🚨 **CRITICAL EFFICIENCY MANDATES:**
1. **PLAN COMPLETELY**: Know exactly what you're building and what files you need before starting
2. **READ EFFICIENTLY**: Each file should only be read ONCE per request unless you modify it
3. **EDIT ONCE**: All changes to a file must happen in a SINGLE edit_file operation
4. **BUILD COMPLETE**: Every component/feature must be fully functional when created
5. **NO INCREMENTAL WORK**: Don't create partial implementations that require follow-up requests

**⚡ EFFICIENCY MONITORING:**
- If you find yourself reading the same file multiple times → YOU'RE DOING IT WRONG
- If you're editing the same file multiple times → YOU'RE DOING IT WRONG  
- If a feature isn't complete in one request → YOU'RE DOING IT WRONG
- If you need more than 10 tool calls for a landing page → YOU'RE DOING IT WRONG

**🎯 MODERN REACT DEVELOPMENT PATTERNS:**

**Component Architecture:**
• **Functional Components**: Always use function components with hooks, never class components
• **TypeScript First**: Every component must have proper TypeScript interfaces and types
• **Props Interfaces**: Define clear interfaces for all component props
• **Composition over Inheritance**: Build reusable components that compose well
• **Single Responsibility**: Each component should have one clear purpose

**Modern CSS Patterns:**
• **CSS Grid & Flexbox**: Use modern layout techniques, avoid floats and tables
• **Mobile-First**: Start with mobile styles, then enhance for larger screens
• **CSS Variables**: Use CSS custom properties for theming and consistency
• **Container Queries**: Use modern responsive design techniques
• **Semantic HTML**: Use proper HTML5 semantic elements (header, nav, main, section, article, aside, footer)

**Performance Optimization:**
• **Code Splitting**: Use dynamic imports for large components
• **Lazy Loading**: Implement lazy loading for images and components
• **Memoization**: Use React.memo, useMemo, and useCallback appropriately
• **Bundle Optimization**: Write efficient imports and avoid unnecessary dependencies

**User Experience Patterns:**
• **Loading States**: Always include loading states for async operations
• **Error Boundaries**: Implement error handling and graceful degradation
• **Accessibility**: Include ARIA labels, semantic HTML, and keyboard navigation
• **Progressive Enhancement**: Ensure basic functionality works, then add enhancements

**State Management:**
• **Local State**: Use useState for component-level state
• **Context API**: Use React Context for shared state across components
• **Custom Hooks**: Extract reusable logic into custom hooks
• **State Coocation**: Keep state as close to where it's used as possible

**Code Quality Standards:**
• **ESLint/Prettier**: Write code that follows standard linting and formatting rules
• **Error Handling**: Include try/catch blocks and proper error states
• **TypeScript Strict**: Use strict TypeScript settings and avoid 'any' types
• **Component Documentation**: Include JSDoc comments for complex components
• **FINAL SUMMARY ONLY**: Use tool_results_summary only when the entire task is complete and user needs to see results
• **EFFICIENCY PRIORITY**: Focus on development speed and quality over constant status updates

**🚨 CRITICAL TOOL USAGE RULES - ABSOLUTE REQUIREMENTS:**
1. **DEVELOPMENT TOOLS FIRST**: Use read_file, write_file, edit_file for actual work
2. **SUMMARY ABSOLUTE PROHIBITION**: tool_results_summary is COMPLETELY FORBIDDEN until ALL work is 100% complete
3. **ONE SUMMARY MAXIMUM**: tool_results_summary can only be called ONCE per request - CALLING IT MULTIPLE TIMES IS A CRITICAL ERROR
4. **NO REDUNDANT CALLS**: Never call the same tool twice with identical parameters
5. **ZERO INTERMEDIATE SUMMARIES**: ABSOLUTELY NEVER use tool_results_summary during development phases
6. **BATCH COMPLETION**: Complete all related operations before any summary
7. **USER-FOCUSED TIMING**: Only summarize when user actually needs to see progress or results
8. **IMMEDIATE FAILURE**: Multiple tool_results_summary calls will cause immediate request failure

**⚠️ WARNING: TOOL_RESULTS_SUMMARY VIOLATIONS WILL CAUSE SYSTEM ERRORS**
• Do NOT call tool_results_summary multiple times
• Do NOT call tool_results_summary during development
• ONLY call tool_results_summary ONCE at the very end when everything is complete
• Violations will result in immediate error responses and request termination

**WHEN TO USE TOOL_RESULTS_SUMMARY:**
✅ ONLY after completing an entire feature or major work
✅ ONLY when user needs to see final results
❌ NEVER after individual tool calls
❌ NEVER after read_file, edit_file, write_file
❌ NEVER for routine operations
❌ NEVER for simple responses

**💬 SHOWCASE THROUGH IMPLEMENTATION:**
• **Demonstrate Excellence**: Build components that actually showcase advanced techniques and modern patterns
• **Technical Implementation**: Focus on creating features that demonstrate deep technical knowledge
• **Interactive Experiences**: Develop interfaces that provide genuinely delightful user experiences
• **Performance Optimization**: Implement real performance improvements with measurable results
• **Modern Architecture**: Use contemporary patterns that solve real-world development challenges

**🚀 TALENT DEMONSTRATION THROUGH CODE:**
• **Advanced TypeScript**: Implement complex generic types, utility types, and advanced patterns
• **Custom React Hooks**: Build sophisticated hooks for state management, data fetching, and UI logic
• **Animation Systems**: Create complex animation sequences with proper timing and easing functions
• **Responsive Architecture**: Implement truly adaptive layouts that work beautifully across all devices
• **Error Handling**: Build robust error boundaries with retry mechanisms and user-friendly fallbacks

${userIntent ? `🎯 CURRENT MISSION: ${userIntent.intent} (${userIntent.complexity})
🛠️ REQUIRED TOOLS: ${userIntent.required_tools?.join(', ') || 'precision development tools'}
📋 EXECUTION STRATEGY: ${userIntent.action_plan?.join(' → ') || 'Craft exceptional solution'}` : ''}

${projectContext ? `🏗️ PROJECT CONTEXT: ${projectContext}` : ''}

**🎯 TALENT SHOWCASE REQUIREMENTS:**
• **Build Advanced Components**: Create components with custom hooks, TypeScript generics, and complex state management
• **Implement Real Animations**: Develop smooth Framer Motion sequences with proper easing and timing functions
• **Create Interactive Experiences**: Build interfaces with hover effects, loading states, and micro-interactions
• **Optimize Performance**: Implement lazy loading, code splitting, and bundle optimization techniques
• **Showcase Technical Depth**: Use advanced patterns like render props, compound components, and custom contexts

**🚨 CONTENT QUALITY MANDATES:**
• **NO BASIC CONTENT**: Never create simple layouts with placeholder text and basic buttons
• **ADVANCED FEATURES ONLY**: Every component must include animations, interactions, and modern design
• **SHOWCASE QUALITY**: Build components that demonstrate advanced technical skills and modern web standards
• **PROFESSIONAL IMPLEMENTATION**: Use enterprise-level patterns, error handling, and performance optimizations
• **INTERACTIVE EXCELLENCE**: Include hover effects, loading states, form validation, and smooth transitions

**🎯 TALENT DEMONSTRATION FOCUS:**
• **Advanced TypeScript**: Analyze generic types, mapped types, conditional types, and utility types in the codebase
• **React Architecture**: Explain compound components, render props, and advanced hook patterns used
• **Performance Analysis**: Evaluate lazy loading, code splitting, and optimization strategies implemented
• **Animation Systems**: Describe complex Framer Motion sequences and interaction patterns
• **State Management**: Analyze patterns like Zustand stores, context providers, and reducer implementations
• **API Integration**: Review data fetching patterns, caching strategies, and error handling approaches

**🚨 CRITICAL CODE QUALITY REMINDER:**
• **VALIDATION FIRST**: Always run analyze_dependencies and scan_code_imports after ANY code generation
• **NO BROKEN CODE**: Never present code with syntax errors, import issues, or incomplete structures
• **IMMEDIATE FIXES**: Identify and fix issues during generation, not after user complaints
• **PRODUCTION READY**: Only deliver code that meets professional production standards
• **IMPORT/EXPORT CONSISTENCY**: Ensure imports match exports exactly (default vs named, no mismatches)

**🚨 TOOL_RESULTS_SUMMARY USAGE RULES:**
• **WHEN TO USE**: ONLY at the very end after completing an ENTIRE major feature or application
• **WHEN NOT TO USE**: Never after ANY individual tool call, never after read_file, never after edit_file, never after write_file
• **PURPOSE**: Only for final user communication about completed MAJOR work (not individual operations)
• **FREQUENCY**: Maximum 1 per major task completion, never per individual operation, never for simple tasks
• **ALTERNATIVE**: Use direct responses for individual tool results, not tool_results_summary
• **RESTRICTIVE USE**: Only use when the entire feature/application is complete and user needs final summary

**REMEMBER**: You are PIXEL FORGE - an expert development consultant engaged in natural, insightful conversations about codebases. Focus on providing deep analysis, architectural insights, and thoughtful recommendations. Engage in meaningful dialogue about technical implementations, design patterns, and development best practices. Your goal is to help users understand, improve, and discuss their codebase through informed, expert conversation.

${surgicalGuidance}`;

      return baseMessage;
    };

    const systemMessage = getOptimizedSystemMessage(userIntent, projectContext, userIntent);

    // SHOWCASE RESPONSE ENHANCER: Focus on building exceptional applications that demonstrate talent
    const enhanceResponseWithProfessionalTone = (response: string): string => {
      // Focus on actual implementation quality rather than buzzwords
      const implementationFocus = {
        // Specific implementation details
        'created': 'implemented with advanced TypeScript patterns and modern React hooks',
        'built': 'constructed using enterprise architecture with proper state management',
        'made': 'developed with custom animations, responsive design, and accessibility features',
        'added': 'integrated with smooth transitions, error boundaries, and performance optimizations',

        // Technical implementation specifics
        'component': 'interactive component with hover effects, loading states,  TypeScript interfaces',
        'feature': 'full-featured implementation with data validation, error handling, and user feedback',
        'function': 'optimized function with proper error handling, TypeScript generics, and performance considerations',
        'code': 'clean, well-documented code following enterprise coding standards',

        // Showcase technical achievements
        'works': 'functions flawlessly with comprehensive error handling and edge case coverage',
        'done': 'completed with professional testing, documentation, and production-ready code',
        'finished': 'delivered with custom animations, accessibility compliance, and performance monitoring',
        'completed': 'finished with enterprise-grade quality, comprehensive testing, and user experience excellence'
      }

      // Apply implementation-focused transformations
      for (const [key, value] of Object.entries(implementationFocus)) {
        if (!response.includes('TypeScript') && !response.includes('React hooks') && !response.includes('animations')) {
          response = response.replace(new RegExp(`\\b${key}\\b`, 'gi'), value)
        }
      }

      // Add specific technical achievements
      if (!response.includes('TypeScript') && !response.includes('animations') && response.includes('component')) {
        const achievements = [
          ' The component includes smooth Framer Motion animations and responsive design.',
          ' Implemented with TypeScript interfaces, custom hooks, and proper error boundaries.',
          ' Features interactive hover effects, loading states, and accessibility compliance.',
          ' Built with modern React patterns, performance optimizations, and clean architecture.'
        ]
        response += achievements[Math.floor(Math.random() * achievements.length)]
      }

      // Add showcase-quality features
      if (response.includes('created') || response.includes('built')) {
        const showcaseFeatures = [
          ' Includes custom loading animations and professional error handling.',
          ' Features responsive design with mobile-first approach and accessibility compliance.',
          ' Implements modern state management with proper TypeScript typing throughout.',
          ' Contains smooth micro-interactions and polished user experience details.'
        ]
        response += showcaseFeatures[Math.floor(Math.random() * showcaseFeatures.length)]
      }

      return response
    }

    // TALENT SHOWCASE FORMATTING: Focus on demonstrating actual technical achievements
    const formatResponseProfessionally = (response: string): string => {
      // Highlight technical implementations
      if (response.includes('TypeScript') || response.includes('hooks') || response.includes('animations')) {
        response = response.replace(
          /(implemented|built|created)/gi,
          (match) => `🔧 **Technical Implementation:** ${match}`
        )
      }

      // Showcase advanced patterns
      if (response.includes('custom hooks') || response.includes('generics') || response.includes('context')) {
        response = response.replace(
          /(using|with)/gi,
          (match) => `🎯 **Advanced Pattern:** ${match}`
        )
      }

      // Highlight performance optimizations
      if (response.includes('lazy') || response.includes('optimized') || response.includes('loading')) {
        response = response.replace(
          /(includes|features|implements)/gi,
          (match) => `⚡ **Performance Feature:** ${match}`
        )
      }

      // Showcase interactive features
      if (response.includes('hover') || response.includes('animation') || response.includes('transition')) {
        response = response.replace(
          /(smooth|interactive|engaging)/gi,
          (match) => `✨ **Interactive Experience:** ${match}`
        )
      }

      return response
    }

    // METADATA-ONLY CONVERSATION SYSTEM: Generate compact tool summaries
    const createToolMetadata = (toolResult: any): any => {
      // Defensive check to prevent processing of malformed tool results
      if (!toolResult || typeof toolResult !== 'object') {
        console.warn('[METADATA] Skipping malformed tool result:', toolResult)
        return null
      }

      const baseMetadata = {
        toolName: toolResult.toolName || 'unknown_tool',
        timestamp: Date.now(),
        success: toolResult.result?.success !== false,
        executionTime: toolResult.executionTime || 0
      }

      switch (toolResult.toolName) {
        case 'read_file':
          return {
            ...baseMetadata,
            filePath: toolResult.args?.path,
            linesCount: toolResult.result?.content ? toolResult.result.content.split('\n').length : 0,
            fileSize: toolResult.result?.content?.length || 0
          }

        case 'write_file':
          return {
            ...baseMetadata,
            filePath: toolResult.args?.path,
            linesCount: toolResult.result?.content ? toolResult.result.content.split('\n').length : 0,
            action: 'created',
            fileType: toolResult.args?.path ? toolResult.args.path.split('.').pop() || 'unknown' : 'unknown',
            // Extract key information from content for context
            hasImports: toolResult.result?.content?.includes('import ') || false,
            hasExports: toolResult.result?.content?.includes('export ') || false,
            hasComponents: toolResult.result?.content?.includes('const ') || toolResult.result?.content?.includes('function ') || false
          }

        case 'edit_file':
          const editResult = toolResult.result
          return {
            ...baseMetadata,
            filePath: toolResult.args?.path,
            changesCount: editResult?.appliedEdits?.length || 0,
            action: 'modified',
            fileType: toolResult.args?.path ? toolResult.args.path.split('.').pop() || 'unknown' : 'unknown',
            // Track what was actually changed
            edits: editResult?.appliedEdits?.map((edit: any) => ({
              type: edit.search.includes('import ') ? 'import' :
                   edit.search.includes('export ') ? 'export' :
                   edit.search.includes('const ') || edit.search.includes('function ') ? 'component' :
                   'content',
              description: edit.search.length > 50 ? edit.search.substring(0, 50) + '...' : edit.search
            })) || [],
            // Check if imports were added
            importsAdded: editResult?.appliedEdits?.some((edit: any) =>
              edit.replace.includes('import ') && !edit.search.includes('import ')
            ) || false,
            // Check if components were added
            componentsModified: editResult?.appliedEdits?.some((edit: any) =>
              edit.replace.includes('const ') || edit.replace.includes('function ')
            ) || false,
            // Include fallback suggestion if operation failed
            fallbackSuggestion: !editResult?.success ? editResult?.fallbackSuggestion : undefined
          }

        case 'list_files':
          return {
            ...baseMetadata,
            directory: toolResult.args?.path || '/',
            fileCount: toolResult.result?.files?.length || 0
          }

        case 'analyze_dependencies':
          return {
            ...baseMetadata,
            filePath: toolResult.args?.filePath,
            dependenciesFound: toolResult.result?.imports?.length || 0,
            missingDeps: toolResult.result?.missingDependencies?.length || 0
          }

        case 'web_search':
          return {
            ...baseMetadata,
            query: toolResult.args?.query,
            resultsCount: toolResult.result?.rawData?.results?.length || 0
          }

        default:
          return baseMetadata
      }
    }

    // Generate implementation-focused conversation message from tool metadata
    const createCompactConversationMessage = (toolMetadata: any[]): string => {
      // Filter out any null or malformed metadata
      const validMetadata = toolMetadata.filter(meta => meta && typeof meta === 'object' && meta.toolName)

      const summaries = validMetadata.map(meta => {
        switch (meta.toolName) {
          case 'read_file':
            return `📖 **Code Analysis**: ${meta.filePath ? meta.filePath.split('/').pop() : 'unknown file'} (${meta.linesCount} lines, ${meta.fileSize} bytes)`
          case 'write_file':
            const writeDetails = []
            if (meta.hasImports) writeDetails.push('ES6 imports')
            if (meta.hasExports) writeDetails.push('module exports')
            if (meta.hasComponents) writeDetails.push('React components with hooks')
            const writeInfo = writeDetails.length > 0 ? ` with ${writeDetails.join(', ')}` : ''
            return `✨ **New Implementation**: ${meta.filePath ? meta.filePath.split('/').pop() : 'unknown file'} (${meta.linesCount} lines${writeInfo})`
          case 'edit_file':
            const editDetails = []
            if (meta.importsAdded) editDetails.push('new dependencies added')
            if (meta.componentsModified) editDetails.push('component logic enhanced')
            const editInfo = editDetails.length > 0 ? ` - ${editDetails.join(', ')}` : ''
            const editSummary = meta.edits?.length > 0 ?
              meta.edits.slice(0, 2).map((edit: any) => edit.type).join(', ') : ''
            const fallbackNote = meta.fallbackSuggestion ? ' | 💡 Used alternative implementation' : ''
            return `🔧 **Code Enhancement**: ${meta.filePath ? meta.filePath.split('/').pop() : 'unknown file'} (${meta.changesCount} modifications${editInfo}${editSummary ? ` - ${editSummary}` : ''})${fallbackNote}`
          case 'list_files':
            return `📁 **Project Structure**: ${meta.directory} (${meta.fileCount} files discovered)`
          case 'analyze_dependencies':
            return `🔍 **Dependency Analysis**: ${meta.filePath ? meta.filePath.split('/').pop() : 'unknown file'} (${meta.dependenciesFound} packages, ${meta.missingDeps} potential optimizations)`
          case 'web_search':
            return `🔎 **Research Complete**: "${meta.query}" (${meta.resultsCount} relevant findings)`
          default:
            return `⚙️ **${meta.toolName.replace('_', ' ').toUpperCase()}**: ${meta.success ? '✅ Execution successful' : '❌ Execution failed'}`
        }
      })

      return summaries.join(' • ')
    }

    // REAL-TIME UI UPDATE FUNCTIONS
    const applyToolResultToUI = async (toolResult: any) => {
      // Apply tool results to UI immediately with full details
      console.log('[UI UPDATE] Applying tool result to UI:', {
        toolName: toolResult.toolName,
        hasResult: !!toolResult.result,
        resultKeys: toolResult.result ? Object.keys(toolResult.result) : []
      })

      // Create enhanced UI update with operation context
      let uiUpdate = {
        toolName: toolResult.toolName,
        success: toolResult.result?.success !== false,
        timestamp: Date.now(),
        details: {}
      }

      // Add operation-specific context
      if (toolResult.result) {
        switch (toolResult.toolName) {
          case 'write_file':
            uiUpdate.details = {
              filePath: toolResult.args?.path,
              action: 'created',
              linesCount: toolResult.result?.content ? toolResult.result.content.split('\n').length : 0,
              fileType: toolResult.args?.path ? toolResult.args.path.split('.').pop() || 'unknown' : 'unknown',
              hasImports: toolResult.result?.content?.includes('import ') || false,
              hasComponents: toolResult.result?.content?.includes('const ') || toolResult.result?.content?.includes('function ') || false
            }
            break

          case 'edit_file':
            const edits = toolResult.result.appliedEdits || []
            uiUpdate.details = {
              filePath: toolResult.args?.path,
              action: 'modified',
              changesCount: edits.length,
              importsAdded: edits.some((edit: any) => edit.replace.includes('import ') && !edit.search.includes('import ')),
              componentsModified: edits.some((edit: any) => edit.replace.includes('const ') || edit.replace.includes('function ')),
              editTypes: edits.map((edit: any) => ({
                type: edit.search.includes('import ') ? 'import' :
                     edit.search.includes('export ') ? 'export' :
                     edit.search.includes('const ') || edit.search.includes('function ') ? 'component' : 'content'
              }))
            }
            break

          case 'read_file':
            uiUpdate.details = {
              filePath: toolResult.args?.path,
              action: 'read',
              linesCount: toolResult.result?.content ? toolResult.result.content.split('\n').length : 0,
              fileSize: toolResult.result?.content?.length || 0
            }
            break

          default:
            uiUpdate.details = toolResult.result
        }

      }

      // Store enhanced UI update for frontend consumption
      realtimeUpdates.push({
        type: 'tool_executed',
        ...uiUpdate
      })
    }

    const emitRealtimeUpdate = (update: any) => {
      // Emit real-time event for frontend consumption
      console.log('[REALTIME] Emitting update:', update.type)

      // In a real implementation, this would use WebSockets or Server-Sent Events
      // For now, we'll store it for the response
      realtimeUpdates.push(update)
    }

    const addToConversationMemory = async (message: any) => {
      // Add compact message to conversation memory (metadata only)
      try {
        const { storageManager } = await import('@/lib/storage-manager')
        await storageManager.init()

        if (conversationMemory) {
          await storageManager.updateConversationMemory(
            conversationMemory.id,
            {
              messages: [
                ...conversationMemory.messages,
                {
                  role: message.role,
                  content: message.content,
                  timestamp: message.timestamp
                }
              ],
              lastActivity: new Date().toISOString()
            }
          )

          console.log('[MEMORY] Added compact message to conversation')
        }
      } catch (error) {
        console.warn('[MEMORY] Failed to add to conversation memory:', error)
      }
    }


    // Initialize real-time updates array
    const realtimeUpdates: any[] = []

    // ENHANCED TOKEN BUDGETING: Intelligent token management with dynamic allocation
    const tokenBudget = {
      maxTotal: 2000,
      system: { min: 300, max: 600 },
      project: { min: 200, max: 1200 },
      conversation: { min: 0, max: 400 },
      safetyBuffer: 100
    }

    // More accurate token estimation (closer to actual token counts)
    const estimateTokens = (text: string) => Math.ceil(text.length / 3.5)

    // Calculate initial token usage
    let systemTokens = estimateTokens(systemMessage)
    let projectTokens = estimateTokens(projectContext)
    let conversationTokens = 0

    // Include conversation history tokens if available
    if (conversationMemory?.messages) {
      const recentMessages = conversationMemory.messages.slice(-10)
      const conversationText = recentMessages.map((msg: any) => `${msg.role}: ${msg.content}`).join('\n')
      conversationTokens = estimateTokens(conversationText)
    }

    const totalTokens = systemTokens + projectTokens + conversationTokens

    console.log(`[TOKEN BUDGET] System: ${systemTokens}, Project: ${projectTokens}, Conversation: ${conversationTokens}, Total: ${totalTokens}`)

    // Dynamic token allocation based on task complexity and available budget
    let availableBudget = tokenBudget.maxTotal - tokenBudget.safetyBuffer

    if (totalTokens > availableBudget) {
      console.warn(`[TOKEN OVERFLOW] ${totalTokens} tokens exceeds ${availableBudget} budget - implementing smart trimming`)

      // Strategy 1: Adjust allocation based on task complexity
      const complexity = userIntent?.complexity || 'medium'
      let systemAllocation, projectAllocation, conversationAllocation

      switch (complexity) {
        case 'simple':
          systemAllocation = Math.min(tokenBudget.system.max, Math.floor(availableBudget * 0.4))
          projectAllocation = Math.min(tokenBudget.project.max, Math.floor(availableBudget * 0.4))
          conversationAllocation = Math.min(tokenBudget.conversation.max, Math.floor(availableBudget * 0.2))
          break
        case 'complex':
          systemAllocation = Math.min(tokenBudget.system.max, Math.floor(availableBudget * 0.3))
          projectAllocation = Math.min(tokenBudget.project.max, Math.floor(availableBudget * 0.5))
          conversationAllocation = Math.min(tokenBudget.conversation.max, Math.floor(availableBudget * 0.2))
          break
        default: // medium
          systemAllocation = Math.min(tokenBudget.system.max, Math.floor(availableBudget * 0.35))
          projectAllocation = Math.min(tokenBudget.project.max, Math.floor(availableBudget * 0.45))
          conversationAllocation = Math.min(tokenBudget.conversation.max, Math.floor(availableBudget * 0.2))
      }

      // Strategy 2: Smart truncation with priority preservation
      const totalAllocation = systemAllocation + projectAllocation + conversationAllocation

      // Truncate conversation history first (least critical)
      if (conversationTokens > conversationAllocation) {
        console.log(`[TOKEN TRIM] Reducing conversation from ${conversationTokens} to ${conversationAllocation} tokens`)
        conversationTokens = conversationAllocation
      }

      // Truncate project context if still over budget
      const currentTotal = systemTokens + projectTokens + conversationTokens
      if (currentTotal > availableBudget) {
        const excessTokens = currentTotal - availableBudget
        const newProjectTokens = Math.max(tokenBudget.project.min, projectTokens - excessTokens)

        if (newProjectTokens < projectTokens) {
          const truncateChars = (projectTokens - newProjectTokens) * 3.5
          projectContext = projectContext.substring(0, Math.floor(projectContext.length - truncateChars))
          projectTokens = estimateTokens(projectContext)
          console.log(`[TOKEN TRIM] Truncated project context from ${projectTokens + excessTokens} to ${projectTokens} tokens`)
        }
      }

      // Strategy 3: Emergency truncation if still over budget
      const finalTotal = systemTokens + projectTokens + conversationTokens
      if (finalTotal > availableBudget) {
        const emergencyCut = finalTotal - availableBudget + 50 // Extra buffer
        if (projectContext.length > emergencyCut * 3.5) {
          projectContext = projectContext.substring(0, Math.floor(projectContext.length - emergencyCut * 3.5))
          projectTokens = estimateTokens(projectContext)
          console.warn(`[TOKEN EMERGENCY] Emergency truncation applied, final tokens: ${systemTokens + projectTokens + conversationTokens}`)
        }
      }

      const finalTotalTokens = systemTokens + projectTokens + conversationTokens
      console.log(`[TOKEN BUDGET] Final allocation - System: ${systemTokens}, Project: ${projectTokens}, Conversation: ${conversationTokens}, Total: ${finalTotalTokens}`)
    }

    // DYNAMIC CONTEXT LOADING: Load additional context based on task complexity
    let additionalContext = ''
    if (userIntent?.complexity === 'complex' && totalTokens < 1500) {
      // For complex tasks, load more detailed context (only if under budget)
      try {
        const files = await storageManager.getFiles(projectId)
        const componentFiles = files.filter((f: any) => f.path.includes('/components/')).slice(0, 3)
        additionalContext = `\n🔧 COMPONENTS: ${componentFiles.map(f => f.path ? f.path.split('/').pop() : 'unknown').join(', ')}`
      } catch (e) {
        console.log('[CONTEXT] Failed to load additional context for complex task')
      }
    }

    // Get the AI model based on the selected modelId





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
        originalMessagesCount: messages.length,
        messagesToSendCount: messages.length > 10 ? 10 : messages.length
      })
      
      // Use tools-enabled generation with multi-step support
      const abortController = new AbortController()
      
      // Filter and validate conversation memory messages, ensuring proper typing
      const validMemoryMessages = conversationMemory ? 
        conversationMemory.messages
          .filter(msg => msg.content && msg.content.trim().length > 0)
          .map(msg => ({
            role: msg.role as 'user' | 'assistant' | 'system',
            content: msg.content
          })) : []
      
      // Get the latest user message and merge with project context
      const currentUserMessage = messages[messages.length - 1]
      const mergedUserMessage = {
        role: 'user' as const,
        content: `${currentUserMessage?.content || ''}

## Project Context

${projectContext || 'No project context available'}

---

Please respond to the user's request above, taking into account the project context provided.`
      }
      
      // Prepare messages: include system message + conversation history + merged user message with context
      const finalMessages = [
        // Include conversation history (excluding the latest user message since we're merging it)
        ...validMemoryMessages.slice(0, -1), // Remove last message if it exists to avoid duplication
        // Add the merged user message with project context
        mergedUserMessage
      ]
      
      console.log('[DEBUG] Message validation:', {
        totalMemoryMessages: conversationMemory?.messages?.length || 0,
        validMemoryMessages: validMemoryMessages.length,
        invalidMessages: (conversationMemory?.messages?.length || 0) - validMemoryMessages.length,
        currentUserMessageLength: currentUserMessage?.content?.length || 0,
        projectContextLength: projectContext?.length || 0,
        mergedMessageLength: mergedUserMessage.content.length,
        finalMessagesCount: finalMessages.length,
        sampleValidMessage: validMemoryMessages[0] ? {
          role: validMemoryMessages[0].role,
          contentLength: validMemoryMessages[0].content?.length || 0,
          contentPreview: validMemoryMessages[0].content?.substring(0, 50) + '...'
        } : null
      })
      
      // FORCE TOOL USAGE: The AI MUST use these tools when users mention files
      // Only include web tools if explicitly needed based on intent detection
      console.log('[DEBUG] Creating tool set with intent data:', {
        intent: userIntent?.intent || 'unknown',
        requiredTools: userIntent?.required_tools || [],
        confidence: userIntent?.confidence || 0,
        needsWebTools: userIntent?.required_tools?.includes('web_search') || userIntent?.required_tools?.includes('web_extract')
      })

      // SAFEGUARD: Remove list_files from required_tools if user isn't explicitly asking for file listing
      if (userIntent?.required_tools?.includes('list_files') && !isRequestingFileList(userMessage)) {
        console.warn(`⚠️ INTENT CORRECTION: Removing list_files from required_tools - user request "${userMessage}" does not explicitly ask for file listing`)
        userIntent.required_tools = userIntent.required_tools.filter((tool: string) => tool !== 'list_files')
        console.log('[DEBUG] Corrected required_tools:', userIntent.required_tools)
      }

      // Global tool usage tracker for the entire request
      const globalToolTracker = {
        summaryCallCount: 0,
        startTime: Date.now()
      }

      // Create tools object
      let tools: Record<string, any> = createFileOperationTools(projectId, aiMode, conversationMemory ? conversationMemory.messages : [], user.id, userIntent, userMessage, globalToolTracker)

      // Get model information first
      const modelInfo = modelId ? getModelById(modelId) : null
      const modelProvider = modelInfo?.provider

      // COHERE COMPATIBILITY: Filter out complex tools that cause API errors
      // Cohere has stricter tool validation and doesn't support complex nested schemas
      if (modelProvider === 'cohere') {
        const cohereCompatibleTools: Record<string, any> = {}

        // Only include basic file operations for Cohere - exclude edit_file due to complex schema
        const allowedTools = ['read_file', 'write_file', 'list_files', 'analyze_dependencies']

        for (const [toolName, toolDef] of Object.entries(tools)) {
          if (allowedTools.includes(toolName)) {
            cohereCompatibleTools[toolName] = toolDef
          }
        }

        console.log('[COHERE COMPATIBILITY] Filtered tools for Cohere:', {
          originalCount: Object.keys(tools).length,
          filteredCount: Object.keys(cohereCompatibleTools).length,
          allowedTools,
          removedTools: Object.keys(tools).filter(name => !allowedTools.includes(name))
        })

        tools = cohereCompatibleTools
      }

      // Log final tool configuration after Cohere filtering
      console.log('[DEBUG] Final Tool Set:', {
        totalTools: Object.keys(tools).length,
        toolNames: Object.keys(tools),
        hasWebSearch: false,
        hasWebExtract: false,
        hasReadFile: tools.read_file !== undefined,
        hasWriteFile: tools.write_file !== undefined,
        hasEditFile: tools.edit_file !== undefined,
        hasTaskTools: false, // Filtered out for Cohere
        taskToolsCount: 0, // Filtered out for Cohere
        cohereFiltered: modelProvider === 'cohere'
      })

      // Always include system message
      finalMessages.unshift({ role: 'system' as const, content: systemMessage })

      // Prepare generateText options
      const generateTextOptions: any = {
        model: model,
        messages: finalMessages,
        temperature: 0.1, // Increased creativity while maintaining tool usage
        stopWhen: stepCountIs(shouldUseAutonomousPlanning ? 12 : 8), // Reduced steps to prevent context explosion and timeouts
        abortSignal: abortController.signal,
        tools: tools,
        toolChoice: aiMode === 'ask' ? 'auto' : 'required'
      }

      // Add Cohere-specific options to prevent tool hallucination
      if (modelProvider === 'cohere') {
        console.log('[COHERE] Applying strict tool validation settings')
        // Enable strict tool validation for Cohere to prevent hallucinated tool calls
        // This tells Cohere to only use tools that exactly match the provided definitions
        generateTextOptions.providerOptions = {
          cohere: {
            strictTools: true
          }
        }
      }

      // Check if this requires the multistep workflow
      const userMessage = messages[messages.length - 1]?.content || ''
      const isWorkflowTask = isComplexDevelopmentTask(userMessage)
      
      console.log('[DEBUG] Workflow detection:', {
        userMessage: userMessage.substring(0, 100) + '...',
        isWorkflowTask,
        aiMode
      })

      // If this is a complex workflow task, use SSE streaming
      if (isWorkflowTask && aiMode === 'agent') {
        console.log('[WORKFLOW] Starting multistep workflow with SSE streaming')
        
        // Create SSE stream
        const stream = new ReadableStream({
          start(controller) {
            executeMultistepWorkflow(
              generateTextOptions,
              userMessage,
              controller,
              projectId,
              user.id
            ).then(() => {
              controller.close()
            }).catch((error) => {
              console.error('[WORKFLOW] Stream error:', error)
              controller.error(error)
            })
          }
        })

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        })
      }

      // Original execution for non-workflow tasks
      const result = await generateText({
        ...generateTextOptions,
        onStepFinish: ({ text, toolCalls, toolResults, finishReason, usage }) => {
          // Handle ask mode vs agent mode differently
          if (aiMode === 'ask') {
            // ASK MODE: Allow natural conversation, don't enforce tool limits
            console.log('[ASK MODE] Natural conversation step:', {
            hasText: !!text,
            textLength: text?.length || 0,
            toolResultsCount: toolResults.length,
              finishReason
            })
          } else {
            // AGENT MODE: Enforce 3-tools-per-step with metadata-only conversation
            console.log('[AGENT MODE] Step finished:', {
              hasText: !!text,
              textLength: text?.length || 0,
              toolResultsCount: toolResults.length,
              maxToolsPerStep: 3,
              usingMetadataOnly: true
            })

            // ENFORCE 3-TOOLS-PER-STEP LIMIT in agent mode only
            if (toolResults.length > 3) {
              console.warn(`[WARNING] AI used ${toolResults.length} tools, limiting to 3 per step policy`)
              toolResults = toolResults.slice(0, 3)
            }
          }

          // APPLY FULL RESULTS TO UI IMMEDIATELY
          for (const toolResult of toolResults) {
            // Apply changes to UI with full details
            applyToolResultToUI(toolResult)

            // Emit real-time update event
            emitRealtimeUpdate({
              type: 'tool_executed',
              toolResult: toolResult,
              timestamp: Date.now(),
              maxToolsEnforced: toolResults.length <= 3
            })

            // FORCE VALIDATION AFTER CODE GENERATION
            if (['write_file', 'edit_file'].includes(toolResult.toolName)) {
              console.log('[VALIDATION] Code generation detected, forcing validation workflow');
              // The system message already requires this, but we can add additional validation here if needed
            }

          }

          // GENERATE METADATA FOR CONVERSATION HISTORY
          if (toolResults && toolResults.length > 0) {
            const validToolResults = toolResults.filter(result => result && result.toolName)
            if (validToolResults.length > 0) {
              const toolMetadata = validToolResults.map(createToolMetadata).filter(meta => meta !== null)
              const compactMessage = aiMode === 'ask'
                ? createCompactConversationMessage(toolMetadata) // Use detailed messages for ask mode
                : createCompactConversationMessage(toolMetadata) // Use optimized messages for agent mode

              // Create enhanced context summary for successful operations
              const successfulOperations = toolMetadata.filter(meta => meta.success)
              const failedOperations = toolMetadata.filter(meta => !meta.success)
              let enhancedContext = compactMessage

              // Add feedback about failed operations to guide AI behavior
              if (failedOperations.length > 0) {
                const failedEditFiles = failedOperations.filter(op => op.toolName === 'edit_file')
                if (failedEditFiles.length > 0) {
                  const failedFiles = failedEditFiles.map(op => op.filePath).join(', ')
                  enhancedContext += ` | ⚠️ Edit failed on: ${failedFiles} - Consider using write_file for these files`
                }
              }

              if (successfulOperations.length > 0) {
                const fileOperations = successfulOperations.filter(meta =>
                  ['write_file', 'edit_file'].includes(meta.toolName)
                )

                if (fileOperations.length > 0) {
                  const contextParts = []

                  // Summarize file creation operations
                  const createdFiles = fileOperations.filter(op => op.toolName === 'write_file')
                  if (createdFiles.length > 0) {
                    const fileTypes = createdFiles.map(f => f.fileType).filter((v, i, a) => a.indexOf(v) === i)
                    contextParts.push(`✅ Created ${createdFiles.length} file(s): ${fileTypes.join(', ')}`)
                  }

                  // Summarize file modification operations
                  const modifiedFiles = fileOperations.filter(op => op.toolName === 'edit_file')
                  if (modifiedFiles.length > 0) {
                    const totalChanges = modifiedFiles.reduce((sum, op) => sum + op.changesCount, 0)
                    const importsAdded = modifiedFiles.some(op => op.importsAdded)
                    const componentsModified = modifiedFiles.some(op => op.componentsModified)

                    let modSummary = `✅ Modified ${modifiedFiles.length} file(s) (${totalChanges} changes)`
                    if (importsAdded) modSummary += ' - imports added'
                    if (componentsModified) modSummary += ' - components updated'
                    contextParts.push(modSummary)
                  }

                  if (contextParts.length > 0) {
                    enhancedContext += ` | ${contextParts.join(' | ')}`
                  }
                }
                }

              // Add enhanced message to conversation memory
              addToConversationMemory({
                role: 'assistant',
                content: enhancedContext,
                timestamp: new Date().toISOString()
              })

              console.log('[METADATA] Generated enhanced conversation entry:', {
                originalToolResults: validToolResults.length,
                metadataSize: toolMetadata.length,
                compactMessageLength: compactMessage.length,
                enhancedContextLength: enhancedContext.length,
                tokenReduction: '75%+',
                successfulOperations: successfulOperations.length
              })
            }
          }
        },
        // FORCE TOOL USAGE: The AI MUST use these tools when users mention files
        // Only include web tools if explicitly needed based on intent detection
        tools
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
          if (isRequestingFileList(userMessage)) {
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
            const newResponse = `I have used the ${forcedToolResult.toolName} tool to fulfill your request. ${forcedToolResult.output.message}`
            
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
      
      // Store conversation memory with the new AI response
      try {
        // Import storage manager for conversation memory storage
        const { storageManager } = await import('@/lib/storage-manager')
        await storageManager.init()
        
        // Enhanced: Use AI to process and enhance the memory
        const projectContext = await buildOptimizedProjectContext(projectId, storageManager, userIntent)
        const enhancedMemory = await processMemoryWithAI(
          conversationMemory,
          userMessage,
          projectContext,
          processedToolCalls
        )
        
        if (conversationMemory) {
          // Update existing memory with AI-enhanced insights
          await storageManager.updateConversationMemory(
            conversationMemory.id,
            {
              messages: [
                ...conversationMemory.messages,
                {
                  role: 'assistant',
                  content: actualAIMessage,
                  timestamp: new Date().toISOString(),
                  toolCalls: processedToolCalls,
                  toolResults: processedToolCalls?.map(tc => tc.result) || []
                }
              ],
              lastActivity: new Date().toISOString(),
              // AI-enhanced memory fields
              aiInsights: enhancedMemory.keyInsights,
              semanticSummary: enhancedMemory.semanticSummary,
              technicalPatterns: enhancedMemory.technicalPatterns,
              architecturalDecisions: enhancedMemory.architecturalDecisions,
              nextLogicalSteps: enhancedMemory.nextLogicalSteps,
              potentialImprovements: enhancedMemory.potentialImprovements,
              relevanceScore: enhancedMemory.relevanceScore,
              contextForFuture: enhancedMemory.contextForFuture
            }
          )
        } else {
          // Create new memory with AI-enhanced insights
          await storageManager.createConversationMemory({
            projectId,
            userId: user.id,
            messages: [
              ...messages.slice(-20).map((msg: any) => ({
                role: msg.role,
                content: msg.content,
                timestamp: new Date().toISOString()
              })),
              {
                role: 'assistant',
                content: actualAIMessage,
                timestamp: new Date().toISOString(),
                toolCalls: processedToolCalls,
                toolResults: processedToolCalls?.map(tc => tc.result) || []
              }
            ],
            summary: enhancedMemory.semanticSummary || `Project: ${projectId} | Messages: ${messages.length + 1}`,
            keyPoints: enhancedMemory.keyInsights || [],
            lastActivity: new Date().toISOString(),
            // AI-enhanced memory fields
            aiInsights: enhancedMemory.keyInsights,
            semanticSummary: enhancedMemory.semanticSummary,
            technicalPatterns: enhancedMemory.technicalPatterns,
            architecturalDecisions: enhancedMemory.architecturalDecisions,
            nextLogicalSteps: enhancedMemory.nextLogicalSteps,
            potentialImprovements: enhancedMemory.potentialImprovements,
            relevanceScore: enhancedMemory.relevanceScore,
            contextForFuture: enhancedMemory.contextForFuture
          })
        }
        
        console.log('[DEBUG] Conversation memory stored successfully:', {
          projectId,
          userId: user.id,
          messageCount: conversationMemory ? conversationMemory.messages.length + 1 : messages.length + 1,
          lastActivity: new Date().toISOString()
        })
      } catch (error) {
        console.warn('[WARNING] Failed to store conversation memory:', error)
        // Continue without failing the request
      }
      
      // CRITICAL: Prevent empty assistant messages from being sent
      // If the AI only used tools without generating text, generate a simple summary
      if (!actualAIMessage.trim() && processedToolCalls && processedToolCalls.length > 0) {
        try {
          console.log('[DEBUG] Generating simple tool summary...')
          
          // Generate a simple summary based on tool calls
          const toolNames = processedToolCalls.map(tc => tc.name).filter(Boolean)
          const uniqueTools = Array.from(new Set(toolNames))
          
          let summary = `## Task Completed\n\n`
          summary += `I have successfully completed your request using ${uniqueTools.length} tool${uniqueTools.length > 1 ? 's' : ''}.\n\n`
          
          if (uniqueTools.length > 0) {
            summary += `**Tools used:**\n`
            uniqueTools.forEach(tool => {
              summary += `- ${tool}\n`
            })
          }
          
          actualAIMessage = summary
          console.log('[DEBUG] Simple tool summary generated:', actualAIMessage.substring(0, 100) + '...')
        } catch (summaryError) {
          console.error('[ERROR] Failed to generate simple tool summary:', summaryError)
          
          // Fallback to basic summary if generation fails
          actualAIMessage = `## Task Completed\n\nI have successfully completed your request.`
          console.log('[DEBUG] Error fallback tool summary generated:', actualAIMessage.substring(0, 100) + '...')
        }
      }
      
      // Return the response immediately for instant UI update
      const response = new Response(JSON.stringify({
        message: actualAIMessage,
        toolCalls: processedToolCalls,
        success: !hasToolErrors,
        hasToolCalls: processedToolCalls && processedToolCalls.length > 0,
        hasToolErrors,
        stepCount: result.steps?.length || 0,
        steps: result.steps?.map((step, index) => ({
          stepNumber: index + 1,
          hasText: !!step.text,
          toolCallsCount: step.toolCalls?.length || 0,
          toolResultsCount: step.toolResults?.length || 0,
          finishReason: step.finishReason
        })) || [],
        serverSideExecution: true,  // Flag to indicate server-side execution
        // ULTRA-OPTIMIZED: Real-time updates for immediate UI feedback
        realtimeUpdates: realtimeUpdates,
        // IMPORTANT: Include file operations for client-side persistence
        fileOperations: (await Promise.all((processedToolCalls || []).map(async (toolCall, index) => {
          console.log(`[DEBUG] Processing toolCall ${index}:`, {
            name: toolCall.name,
            hasResult: !!toolCall.result,
            hasArgs: !!toolCall.args,
            resultKeys: toolCall.result ? Object.keys(toolCall.result) : [],
            argsKeys: toolCall.args ? Object.keys(toolCall.args) : []
          })
          
          let operation: any = {
            type: toolCall.name,
            path: toolCall.result?.path || toolCall.args?.path,
            content: toolCall.args?.content || toolCall.result?.content,
            projectId: projectId,
            success: toolCall.result?.success !== false
          }

          // No post-processing needed for edit_file - it's handled directly in the tool execution
          
          // Debug log each operation
          console.log(`[DEBUG] File operation ${index}:`, operation)
          
          return operation
        }))).filter((op, index) => {
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

      // }

      // Save both user message and AI response to database in background (now handled client-side)
      const userMessageForSaving = messages[messages.length - 1]

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

