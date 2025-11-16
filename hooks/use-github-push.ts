"use client"

import { useState } from "react"
import { toast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { storageManager, type Workspace as Project } from "@/lib/storage-manager"
import { getDeploymentTokens } from "@/lib/cloud-sync"
import { compress } from 'lz4js'
import { zipSync, strToU8 } from 'fflate'
import { filterUnwantedFiles } from "@/lib/utils"

interface PushState {
  isPushing: boolean
  error: string | null
}

interface PushOptions {
  onSuccess?: (data: any) => void
  onError?: (error: string) => void
}
  const fetchLastChatMessage = async (): Promise<string | null> => {
    try {
      const { storageManager } = await import('@/lib/storage-manager')
      await storageManager.init()

      // Get current user ID
      const supabaseClient = createClient()
      const { data: { user } } = await supabaseClient.auth.getUser()
      if (!user) return null

      // Get all chat sessions for this user
      const chatSessions = await storageManager.getChatSessions(user.id)

      if (chatSessions.length === 0) {
        return null
      }

      // Get the most recent chat session
      const latestSession = chatSessions.sort((a, b) =>
        new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
      )[0]

      // Get the latest messages from this session (get more for better context)
      const messages = await storageManager.getMessages(latestSession.id)

      if (messages.length === 0) {
        return null
      }

      // Sort messages by creation time
      const sortedMessages = messages.sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )

      // Get the last 4 messages for better context (user request + AI implementation details)
      const recentMessages = sortedMessages.slice(-4)

      if (recentMessages.length === 0) {
        return null
      }

      // Create enhanced context focusing on what the AI implemented
      let context = ''
      const userMessages = recentMessages.filter(msg => msg.role === 'user')
      const assistantMessages = recentMessages.filter(msg => msg.role === 'assistant')

      // Extract the most recent user request
      const lastUserMessage = userMessages[userMessages.length - 1]
      const lastAssistantMessage = assistantMessages[assistantMessages.length - 1]

      if (lastUserMessage && lastAssistantMessage) {
        // Format as user request + AI implementation
        context = `USER REQUEST: ${lastUserMessage.content}\n\n`
        context += `AI IMPLEMENTATION: ${lastAssistantMessage.content}\n\n`

        // Look for implementation keywords in the AI response to highlight what was done
        const implementationKeywords = ['implement', 'add', 'create', 'fix', 'update', 'refactor', 'remove', 'modify', 'build', 'develop', 'code', 'feature', 'function', 'component', 'api', 'database', 'ui', 'interface']
        const aiContent = lastAssistantMessage.content.toLowerCase()

        let implementedFeatures = []
        for (const keyword of implementationKeywords) {
          if (aiContent.includes(keyword)) {
            // Extract sentences containing implementation keywords
            const sentences = lastAssistantMessage.content.split(/[.!?]+/).filter(s => s.toLowerCase().includes(keyword))
            implementedFeatures.push(...sentences.slice(0, 2)) // Take first 2 relevant sentences
          }
        }

        if (implementedFeatures.length > 0) {
          context += `KEY IMPLEMENTATIONS:\n${implementedFeatures.join('. ')}\n\n`
        }

        // Add summary if the AI response contains summary-like content
        if (aiContent.includes('summary') || aiContent.includes('completed') || aiContent.includes('done')) {
          const summaryMatch = lastAssistantMessage.content.match(/(?:summary|completed|done).*?([.!?]+)/i)
          if (summaryMatch) {
            context += `SUMMARY: ${summaryMatch[1]}\n\n`
          }
        }
      } else if (lastUserMessage) {
        // Only user message available
        context = `USER REQUEST: ${lastUserMessage.content}`
      } else if (lastAssistantMessage) {
        // Only assistant message available
        context = `AI WORK: ${lastAssistantMessage.content}`
      }

      return context

    } catch (error) {
      console.error('Error fetching last chat message:', error)
      return null
    }
  }

  /**
   * Clean up markdown formatting from AI-generated commit messages
   */
  const cleanupCommitMessage = (message: string): string => {
    if (!message) return message

    return message
      // Remove markdown code blocks (```language content ```)
      .replace(/```[\s\S]*?```/g, '')
      // Remove inline code backticks
      .replace(/`([^`]+)`/g, '$1')
      // Remove markdown links [text](url)
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove markdown bold/italic (* ** ___)
      .replace(/(\*\*\*|___)(.*?)\1/g, '$2')
      .replace(/(\*\*|__)(.*?)\1/g, '$2')
      .replace(/(\*|_)(.*?)\1/g, '$2')
      // Remove extra whitespace and trim
      .replace(/\s+/g, ' ')
      .trim()
  }

  /**
   * Generate AI-powered commit message from chat conversation context
   */
  const generateCommitMessageFromChat = async (conversationContext: string): Promise<string> => {
    try {
      // Import AI dependencies dynamically
      const { generateText } = await import('ai')
      const { getModel } = await import('@/lib/ai-providers')

      // Get the Pixtral model for commit message generation
      const model = getModel('pixtral-12b-2409')

      const commitMessageResult = await generateText({
        model: model,
        messages: [
          {
            role: 'system',
            content: `You are an expert software engineer creating professional, meaningful commit messages from AI-assisted development conversations.

Your task is to analyze the conversation context and extract what the AI actually implemented, focusing on features, fixes, and changes made.

The context format includes:
- USER REQUEST: What the user asked for
- AI IMPLEMENTATION: The AI's response with implementation details
- KEY IMPLEMENTATIONS: Specific sentences about what was implemented
- SUMMARY: Any completion summary

COMMIT MESSAGE GUIDELINES:
- Keep it under 72 characters total
- Start with a capital letter
- Use imperative mood (Add, Fix, Update, Remove, etc.)
- Be specific and meaningful about WHAT was implemented
- Use conventional commit prefixes: feat:, fix:, chore:, docs:, style:, refactor:, test:
- Focus on the actual implementation, not just the request
- Look for specific features, fixes, or changes mentioned in KEY IMPLEMENTATIONS
- Prioritize technical implementation details over general discussion

EXAMPLES OF GOOD COMMIT MESSAGES:
- "feat: Add user authentication system"
- "fix: Resolve TypeScript compilation errors"
- "feat: Implement responsive navigation component"
- "refactor: Update API error handling with proper validation"
- "feat: Add AI-powered commit message generation"
- "fix: Fix deployment token persistence in database"
- "feat: Create automated testing pipeline for CI/CD"

Return ONLY the commit message, no quotes or additional text.`
          },
          {
            role: 'user',
            content: `Analyze this AI-assisted development conversation and create a professional commit message that captures what was actually implemented:

${conversationContext}

Focus on the AI IMPLEMENTATION and KEY IMPLEMENTATIONS sections to understand what features, fixes, or changes were actually made. Create a commit message that reflects the specific technical work completed, not just the user's request.

Look for:
- New features added (feat:)
- Bugs fixed (fix:)
- Code refactoring (refactor:)
- Documentation updates (docs:)
- Testing improvements (test:)
- Styling changes (style:)
- Configuration/setup changes (chore:)

EXAMPLES:
- If AI implemented a login system: "feat: Add user authentication system"
- If AI fixed a bug: "fix: Resolve validation error in form submission"
- If AI refactored code: "refactor: Update error handling in API routes"`
          }
        ],
        temperature: 0.3, // Low temperature for consistent, professional output
      })

      const aiCommitMessage = commitMessageResult.text?.trim() || ''

      // Clean up markdown formatting from AI response
      const cleanedMessage = cleanupCommitMessage(aiCommitMessage)

      // Validate the generated message
      if (cleanedMessage && cleanedMessage.length > 0 && cleanedMessage.length <= 72 && !cleanedMessage.includes('User request') && !cleanedMessage.includes('error')) {
        return cleanedMessage
      }

      // Fallback if AI generation fails or returns invalid content
      return 'Update project files'

    } catch (error) {
      console.error('AI commit message generation failed:', error)

      // Fallback to simple text processing if AI fails
      return 'Update project files'
    }
  }

export function useGitHubPush() {
  const [pushState, setPushState] = useState<PushState>({
    isPushing: false,
    error: null
  })

  // Compress project files using LZ4 + Zip for efficient transfer
  const compressProjectFiles = async (
    projectFiles: any[],
    fileTree: string[],
    messagesToSend: any[],
    metadata: any
  ): Promise<ArrayBuffer> => {
    console.log(`[Compression] Starting compression of ${projectFiles.length} files`)

    // Filter out images, videos, PDF files, scripts folders, test folders, and unwanted files to reduce payload size
    const filteredFiles = filterUnwantedFiles(projectFiles)
    console.log(`[Compression] Filtered to ${filteredFiles.length} files (removed ${projectFiles.length - filteredFiles.length} unwanted files)`)

    // Create zip file data
    const zipData: Record<string, Uint8Array> = {}

    // Add files to zip
    for (const file of filteredFiles) {
      if (file.path && file.content !== undefined) {
        zipData[file.path] = strToU8(String(file.content))
      }
    }

    // Add metadata file with file tree, messages, and other data
    const fullMetadata = {
      fileTree,
      messages: messagesToSend,
      ...metadata,
      compressedAt: new Date().toISOString(),
      fileCount: filteredFiles.length,
      originalFileCount: projectFiles.length,
      compressionType: 'lz4-zip'
    }
    zipData['__metadata__.json'] = strToU8(JSON.stringify(fullMetadata))

    // Create zip file
    const zippedData = zipSync(zipData)
    console.log(`[Compression] Created zip file: ${zippedData.length} bytes`)

    // Compress with LZ4
    const compressedData = await compress(zippedData)
    console.log(`[Compression] LZ4 compressed to: ${compressedData.length} bytes`)

    // Convert Uint8Array to ArrayBuffer
    const arrayBuffer = new ArrayBuffer(compressedData.length)
    new Uint8Array(arrayBuffer).set(compressedData)
    return arrayBuffer
  }

  /**
   * Check if a project has GitHub connection set up
   */
  const checkGitHubConnection = async (project: Project): Promise<{
    connected: boolean
    hasToken: boolean
    hasRepo: boolean
    reason?: string
  }> => {
    try {
      // Check if project has a GitHub repo URL
      const hasRepo = Boolean(project.githubRepoUrl)
      
      // Get current user and check for GitHub token
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return {
          connected: false,
          hasToken: false,
          hasRepo,
          reason: "User not authenticated"
        }
      }

      // Check if GitHub token exists
      const tokens = await getDeploymentTokens(user.id)
      const hasToken = Boolean(tokens?.github)

      return {
        connected: hasToken && hasRepo,
        hasToken,
        hasRepo,
        reason: !hasToken 
          ? "GitHub token not configured" 
          : !hasRepo 
            ? "No GitHub repository connected"
            : undefined
      }
    } catch (error) {
      console.error("Error checking GitHub connection:", error)
      return {
        connected: false,
        hasToken: false,
        hasRepo: false,
        reason: "Failed to check connection status"
      }
    }
  }

  /**
   * Push changes to GitHub repository
   */
  const pushToGitHub = async (
    project: Project, 
    options: PushOptions = {}
  ): Promise<boolean> => {
    const { 
      onSuccess, 
      onError 
    } = options

    setPushState({ isPushing: true, error: null })

    try {
      // Check connection status first
      const connectionStatus = await checkGitHubConnection(project)
      if (!connectionStatus.connected) {
        const errorMsg = connectionStatus.reason || "GitHub not connected"
        setPushState({ isPushing: false, error: errorMsg })
        onError?.(errorMsg)
        toast({
          title: "GitHub Push Failed",
          description: errorMsg,
          variant: "destructive"
        })
        return false
      }

      // Get current user for token access
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error("User not authenticated")
      }

      // Get stored tokens
      const tokens = await getDeploymentTokens(user.id)
      if (!tokens?.github) {
        throw new Error("GitHub token not found")
      }

      // Get project files
      await storageManager.init()
      const projectFiles = await storageManager.getFiles(project.id)

      if (projectFiles.length === 0) {
        throw new Error("No files found in the workspace to push")
      }

      // Extract repo info from GitHub URL
      const repoUrl = project.githubRepoUrl!
      const repoInfo = repoUrl.split('/').slice(-2).join('/')
      
      if (!repoInfo || !repoInfo.includes('/')) {
        throw new Error("Invalid GitHub repository URL")
      }

      // Auto-generate commit message from recent chat
      const lastMessage = await fetchLastChatMessage()
      const commitMessage = lastMessage 
        ? await generateCommitMessageFromChat(lastMessage)
        : "Update project files from PixelPilot"

      // Compress the project files for efficient transfer
      const compressedData = await compressProjectFiles(projectFiles, [], [], {
        projectId: project.id,
        githubToken: tokens.github,
        repoName: repoInfo.split('/')[1],
        mode: 'push', // This tells the API to push to existing repo
        existingRepo: repoInfo,
        commitMessage,
      })

      // Push to GitHub using the deployment API
      const pushResponse = await fetch('/api/deploy/github', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/octet-stream',
          'X-Compressed': 'true'
        },
        body: compressedData,
      })

      if (!pushResponse.ok) {
        const errorData = await pushResponse.json()
        throw new Error(errorData.error || 'Failed to push changes to GitHub')
      }

      const pushData = await pushResponse.json()

      // Update project's last activity
      await storageManager.updateWorkspace(project.id, {
        lastActivity: new Date().toISOString(),
      })

      // Create deployment record for tracking
      await storageManager.createDeployment({
        workspaceId: project.id,
        url: repoUrl,
        status: 'ready',
        commitSha: pushData.commitSha || 'updated',
        commitMessage: pushData.commitMessage || commitMessage,
        branch: 'main',
        environment: 'production',
        provider: 'github'
      })

      setPushState({ isPushing: false, error: null })
      
      toast({
        title: "Changes Pushed Successfully",
        description: `Pushed to ${project.githubRepoName || repoInfo} with commit: "${commitMessage}"`,
        variant: "default"
      })

      onSuccess?.(pushData)
      return true

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to push changes'
      setPushState({ isPushing: false, error: errorMsg })
      onError?.(errorMsg)
      
      toast({
        title: "GitHub Push Failed",
        description: errorMsg,
        variant: "destructive"
      })
      
      return false
    }
  }

  return {
    pushState,
    pushToGitHub,
    checkGitHubConnection,
    isPushing: pushState.isPushing
  }
}