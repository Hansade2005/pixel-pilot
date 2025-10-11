// Conversation Summarization Service
// Implements VSCode-style conversation summarization for context window management

import { generateText } from 'ai'
import { getModel } from '@/lib/ai-providers'
import { countTokens, estimateConversationTokens } from '@/lib/token-counter'

export interface ConversationMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  tokenCount?: number
}

export interface ConversationSummary {
  id: string
  conversationId: string
  summaryText: string
  keyPoints: string[]
  technicalInventory: {
    technologies: string[]
    frameworks: string[]
    patterns: string[]
    decisions: string[]
  }
  progressAssessment: {
    completedTasks: string[]
    pendingTasks: string[]
    currentFocus: string
  }
  contextForContinuation: string
  tokenCount: number
  createdAt: Date
  modelUsed: string
}

export interface AnalysisResult {
  chronologicalReview: string
  intentMapping: string
  technicalInventory: string
  codeArchaeology: string
  progressAssessment: string
  contextValidation: string
  recentCommandsAnalysis: string
}

export interface SummarySections {
  conversationOverview: string
  technicalFoundation: string
  codebaseStatus: string
  problemResolution: string
  progressTracking: string
  activeWorkState: string
  recentOperations: string
  continuationPlan: string
}

/**
 * Enhanced Summarizer System Prompt for conversation analysis
 */
const ENHANCED_SUMMARIZER_PROMPT = `# 📋 Conversation History Summarization

Your task is to create a detailed summary of the conversation, preserving all technical details, decisions, and progress so work can continue seamlessly.

---

## 🕵️‍♂️ Recent Context Analysis
Focus on the **latest agent actions and tool calls**, including:
- **Commands:** Tools just executed (\`write_file\`, \`delete_file\`, \`add_package\`, \`remove_package\`)
- **Results:** Key tool outcomes (truncate long ones, keep essentials)
- **State:** What was being worked on last
- **Trigger:** Why summarization occurred (e.g., token limit reached)

---

## 🧩 Analysis Steps
1. **Chronological Review:** Trace key phases and transitions
2. **Intent Mapping:** Capture all user goals and expectations (with short quotes)
3. **Technical Inventory:** List all tools, frameworks, and decisions used
4. **Code Archaeology:** Document all files, functions, and code changes discussed
5. **Progress Assessment:** Note completed vs. pending work
6. **Context Validation:** Ensure all continuation context is captured
7. **Recent Commands Analysis:** List latest tool calls and outcomes

---

## ✨ Required Output Structure

### 1. Conversation Overview
- List user requests (with direct quotes) and assistant actions, in chronological order.

### 2. Technical Foundation
- [Core Technology 1]: [Version/details and purpose]
- [Framework/Library 2]: [Configuration and usage context]
- [Architectural Pattern 3]: [Implementation approach and reasoning]

### 3. Codebase Status
- [File Name 1]: Purpose, current state, key code segments, dependencies
- [Additional files as needed]

### 4. Problem Resolution
- Issues encountered, solutions implemented, debugging context, lessons learned

### 5. Progress Tracking
- Completed tasks with status indicators
- Partially complete work with current completion status
- Validated outcomes

### 6. Active Work State
- Current focus, recent context, working code, immediate context

### 7. Recent Operations
- Last agent commands with exact names
- Tool results summary (truncated if long)
- Pre-summary state and operation context

### 8. Continuation Plan
- [Pending Task 1]: Details and specific next steps with verbatim quotes
- Priority information and next action

---

## Quality Guidelines
- **Precision**: Include exact filenames, function names, variable names, and technical terms
- **Completeness**: Capture all context needed to continue without re-reading
- **Clarity**: Write for someone who needs to pick up exactly where left off
- **Verbatim Accuracy**: Use direct quotes for task specifications
- **Technical Depth**: Include enough detail for complex decisions and patterns
- **Logical Flow**: Present information progressively

This summary serves as a comprehensive handoff document for seamless continuation.
`

/**
 * Conversation Summarization Service Class
 */
export class ConversationSummarizer {
  private static readonly SUMMARY_MODEL = 'pixtral-12b-2409' // Good balance of speed and quality
  private static readonly MAX_SUMMARY_TOKENS = 4000 // Keep summaries concise

  /**
   * Generate a comprehensive conversation summary
   */
  static async generateSummary(
    messages: ConversationMessage[],
    conversationId: string,
    triggerReason: 'manual' | 'auto-token-limit' | 'auto-time-based' = 'manual',
    modelUsed: string = 'auto'
  ): Promise<ConversationSummary> {
    try {
      console.log(`[SUMMARIZER] Generating summary for conversation ${conversationId} (${messages.length} messages)`)

      // Prepare conversation context for summarization
      const conversationText = this.formatConversationForSummary(messages)

      // Generate summary using AI
      const summaryText = await this.generateAISummary(conversationText, triggerReason)

      // Parse the structured summary
      const sections = this.parseSummarySections(summaryText)

      // Extract technical inventory
      const technicalInventory = this.extractTechnicalInventory(sections.technicalFoundation)

      // Extract progress information
      const progressAssessment = this.extractProgressAssessment(sections.progressTracking)

      // Calculate token count
      const tokenCount = countTokens(summaryText, 'default')

      const summary: ConversationSummary = {
        id: `summary_${conversationId}_${Date.now()}`,
        conversationId,
        summaryText: sections.conversationOverview,
        keyPoints: this.extractKeyPoints(sections.activeWorkState),
        technicalInventory,
        progressAssessment,
        contextForContinuation: sections.continuationPlan,
        tokenCount,
        createdAt: new Date(),
        modelUsed: this.SUMMARY_MODEL
      }

      console.log(`[SUMMARIZER] Summary generated successfully (${tokenCount} tokens)`)
      return summary

    } catch (error) {
      console.error('[SUMMARIZER] Error generating summary:', error)
      throw new Error(`Failed to generate conversation summary: ${error}`)
    }
  }

  /**
   * Check if conversation needs summarization based on message count
   */
  static shouldSummarizeByMessageCount(
    messages: ConversationMessage[],
    messageThreshold: number = 15
  ): {
    shouldSummarize: boolean
    currentMessageCount: number
    threshold: number
    reason: string
  } {
    const currentMessageCount = messages.length
    const shouldSummarize = currentMessageCount >= messageThreshold

    let reason = ''
    if (shouldSummarize) {
      reason = `Message count (${currentMessageCount}) reached threshold (${messageThreshold})`
    }

    return {
      shouldSummarize,
      currentMessageCount,
      threshold: messageThreshold,
      reason
    }
  }

  /**
   * Format conversation messages for summarization input
   */
  private static formatConversationForSummary(messages: ConversationMessage[]): string {
    // Take last 20 messages to keep context manageable but comprehensive
    const recentMessages = messages.slice(-20)

    return recentMessages.map(msg => {
      const timestamp = msg.timestamp.toISOString().split('T')[1].substring(0, 8) // HH:MM:SS format
      const role = msg.role.toUpperCase()
      return `[${timestamp}] ${role}: ${msg.content}`
    }).join('\n\n')
  }

  /**
   * Generate AI-powered summary using configured model
   */
  private static async generateAISummary(
    conversationText: string,
    triggerReason: string
  ): Promise<string> {
    const model = getModel(this.SUMMARY_MODEL)

    const prompt = `${ENHANCED_SUMMARIZER_PROMPT}

## Conversation to Summarize
${conversationText}

## Summarization Trigger
${triggerReason}

Generate a comprehensive summary following the exact structure specified above.`

    const result = await generateText({
      model,
      prompt,
      temperature: 0.3, // Balanced creativity and consistency
      maxOutputTokens: this.MAX_SUMMARY_TOKENS
    })

    return result.text || 'Summary generation failed'
  }

  /**
   * Parse structured summary into sections
   */
  private static parseSummarySections(summaryText: string): SummarySections {
    const extractSection = (header: string): string => {
      const regex = new RegExp(`${header}[\\s\\S]*?(?=\\n##|\\n###|$)`, 'i')
      const match = summaryText.match(regex)
      return match ? match[0].replace(new RegExp(`^${header}`, 'i'), '').trim() : ''
    }

    return {
      conversationOverview: extractSection('### 1. Conversation Overview'),
      technicalFoundation: extractSection('### 2. Technical Foundation'),
      codebaseStatus: extractSection('### 3. Codebase Status'),
      problemResolution: extractSection('### 4. Problem Resolution'),
      progressTracking: extractSection('### 5. Progress Tracking'),
      activeWorkState: extractSection('### 6. Active Work State'),
      recentOperations: extractSection('### 7. Recent Operations'),
      continuationPlan: extractSection('### 8. Continuation Plan')
    }
  }

  /**
   * Extract technical inventory from summary section
   */
  private static extractTechnicalInventory(technicalSection: string): ConversationSummary['technicalInventory'] {
    const technologies: string[] = []
    const frameworks: string[] = []
    const patterns: string[] = []
    const decisions: string[] = []

    // Simple extraction - could be enhanced with better parsing
    const lines = technicalSection.split('\n')
    lines.forEach(line => {
      if (line.includes(':')) {
        const [key, value] = line.split(':', 2)
        const item = value?.trim() || ''
        if (key.toLowerCase().includes('technolog')) {
          technologies.push(item)
        } else if (key.toLowerCase().includes('framework')) {
          frameworks.push(item)
        } else if (key.toLowerCase().includes('pattern')) {
          patterns.push(item)
        } else if (key.toLowerCase().includes('decision')) {
          decisions.push(item)
        }
      }
    })

    return { technologies, frameworks, patterns, decisions }
  }

  /**
   * Extract progress assessment from summary section
   */
  private static extractProgressAssessment(progressSection: string): ConversationSummary['progressAssessment'] {
    const completedTasks: string[] = []
    const pendingTasks: string[] = []
    let currentFocus = ''

    const lines = progressSection.split('\n')
    lines.forEach(line => {
      if (line.toLowerCase().includes('completed') || line.includes('✅')) {
        completedTasks.push(line.replace(/^[•\-*]\s*/, '').trim())
      } else if (line.toLowerCase().includes('pending') || line.toLowerCase().includes('todo')) {
        pendingTasks.push(line.replace(/^[•\-*]\s*/, '').trim())
      } else if (line.toLowerCase().includes('focus') || line.toLowerCase().includes('current')) {
        currentFocus = line.replace(/^[•\-*]\s*/, '').trim()
      }
    })

    return { completedTasks, pendingTasks, currentFocus }
  }

  /**
   * Extract key points from active work state section
   */
  private static extractKeyPoints(activeWorkSection: string): string[] {
    const keyPoints: string[] = []
    const lines = activeWorkSection.split('\n')

    lines.forEach(line => {
      if (line.match(/^[•\-*]\s/) || line.match(/^\d+\.\s/)) {
        keyPoints.push(line.replace(/^[•\-*\d\.]+\s*/, '').trim())
      }
    })

    return keyPoints
  }

  /**
   * Validate summary quality and completeness
   */
  static validateSummary(summary: ConversationSummary): {
    isValid: boolean
    issues: string[]
    score: number
  } {
    const issues: string[] = []
    let score = 0

    // Check required fields
    if (!summary.summaryText || summary.summaryText.length < 50) {
      issues.push('Summary text too short or missing')
    } else {
      score += 20
    }

    if (!summary.keyPoints || summary.keyPoints.length === 0) {
      issues.push('No key points extracted')
    } else {
      score += 15
    }

    if (!summary.technicalInventory.technologies.length &&
        !summary.technicalInventory.frameworks.length) {
      issues.push('Technical inventory incomplete')
    } else {
      score += 20
    }

    if (!summary.progressAssessment.currentFocus) {
      issues.push('Current focus not identified')
    } else {
      score += 15
    }

    if (!summary.contextForContinuation || summary.contextForContinuation.length < 20) {
      issues.push('Continuation context insufficient')
    } else {
      score += 20
    }

    // Token efficiency check
    if (summary.tokenCount > this.MAX_SUMMARY_TOKENS * 1.2) {
      issues.push('Summary too verbose')
      score -= 10
    } else {
      score += 10
    }

    return {
      isValid: issues.length === 0,
      issues,
      score: Math.max(0, score)
    }
  }
}

/**
 * Export singleton instance
 */
export const conversationSummarizer = new ConversationSummarizer()