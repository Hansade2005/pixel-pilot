import { generateText, streamText } from 'ai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { ToolHandlers } from './tool-handlers'
import { aiAgentTools } from './tools'
import type { ProjectContext } from './types'

export interface RequestAnalysis {
  type: 'plan' | 'build' | 'analysis'
  complexity: 'simple' | 'medium' | 'complex'
  estimatedTime: string
  requiredFiles: string[]
  requiredDependencies: string[]
  steps: string[]
  summary: string
}

export interface AIAgentResult {
  success: boolean
  operations: Array<{
    type: string
    description: string
    status: 'pending' | 'completed' | 'failed'
    result?: any
    error?: string
  }>
  summary: string
  errors: Array<{ message: string; details?: string }>
}

export class AIDevelopmentAgent {
  private mistral: any
  private toolHandlers: ToolHandlers

  constructor(projectId: string) {
    this.mistral = createOpenAICompatible({
      name: 'codestral',
      baseURL: 'https://codestral.mistral.ai/v1',
      apiKey: process.env.MISTRAL_API_KEY || 'DXfXAjwNIZcAv1ESKtoDwWZZF98lJxho',
    })
    this.toolHandlers = new ToolHandlers(projectId)
  }

  async processRequest(prompt: string, projectContext: ProjectContext): Promise<AIAgentResult> {
    try {
      // First, analyze the request to understand what tools are needed
      const analysis = await this.understandRequest(prompt, projectContext)
      
      // Execute the plan using appropriate tools
      const operations = await this.executePlan(analysis, prompt, projectContext)
      
      return {
        success: true,
        operations,
        summary: `Successfully processed request: ${prompt}`,
        errors: []
      }
    } catch (error) {
      return {
        success: false,
        operations: [],
        summary: `Failed to process request: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errors: [{ message: error instanceof Error ? error.message : 'Unknown error', details: error instanceof Error ? error.stack : undefined }]
      }
    }
  }

  private async understandRequest(prompt: string, projectContext: ProjectContext): Promise<RequestAnalysis> {
    const systemPrompt = `You are an AI development agent. Analyze the user's request and determine what needs to be done.

Available tools:
${aiAgentTools.map(tool => `- ${tool.name}: ${tool.description}`).join('\n')}

Analyze the request and return a JSON response with:
- type: "plan", "build", or "analysis"
- complexity: "simple", "medium", or "complex"
- estimatedTime: estimated time to complete
- requiredFiles: array of files that need to be created/modified
- requiredDependencies: array of dependencies that need to be added
- steps: array of implementation steps
- summary: brief summary of what needs to be done

Request: ${prompt}
Project Context: ${JSON.stringify(projectContext, null, 2)}`

    const { text: response } = await generateText({
      model: this.mistral('codestral-latest'),
      prompt: systemPrompt,
      temperature: 0.3,
    })

    try {
      return JSON.parse(response) as RequestAnalysis
    } catch (error) {
      // Fallback analysis if JSON parsing fails
      return {
        type: 'plan',
        complexity: 'medium',
        estimatedTime: '1-2 hours',
        requiredFiles: [],
        requiredDependencies: [],
        steps: ['Analyze request', 'Create implementation plan', 'Execute plan'],
        summary: 'Process user request using available tools'
      }
    }
  }

  private async executePlan(analysis: RequestAnalysis, prompt: string, projectContext: ProjectContext) {
    const operations: AIAgentResult['operations'] = []
    
    try {
      // Execute analysis tool first
      const analysisResult = await this.toolHandlers.handleAnalyzeRequest({
        request: prompt,
        projectContext: {
          framework: projectContext.framework,
          language: projectContext.language,
          features: projectContext.features,
          complexity: analysis.complexity
        },
        mode: analysis.type === 'build' ? 'build' : 'plan'
      })

      operations.push({
        type: 'analyze_request',
        description: 'Analyzed user request and created implementation plan',
        status: 'completed',
        result: analysisResult
      })

      // If this is a build request, execute the required operations
      if (analysis.type === 'build') {
        // Execute file creation operations
        for (const file of analysis.requiredFiles) {
          try {
            const fileResult = await this.toolHandlers.handleCreateFile({
              filePath: file,
              content: this.generateFileContent(file, analysis),
              fileType: this.detectFileType(file),
              description: `Creating ${file} as part of the build process`
            })

            operations.push({
              type: 'create_file',
              description: `Created file: ${file}`,
              status: fileResult.success ? 'completed' : 'failed',
              result: fileResult,
              error: fileResult.success ? undefined : fileResult.message
            })
          } catch (error) {
            operations.push({
              type: 'create_file',
              description: `Failed to create file: ${file}`,
              status: 'failed',
              error: error instanceof Error ? error.message : 'Unknown error'
            })
          }
        }

        // Execute dependency management operations
        if (analysis.requiredDependencies.length > 0) {
          try {
            const depResult = await this.toolHandlers.handleManageDependencies({
              operation: 'add',
              dependencies: analysis.requiredDependencies.map(dep => ({ name: dep })),
              description: 'Adding required dependencies for the build'
            })

            operations.push({
              type: 'manage_dependencies',
              description: 'Added required dependencies',
              status: depResult.success ? 'completed' : 'failed',
              result: depResult,
              error: depResult.success ? undefined : depResult.message
            })
          } catch (error) {
            operations.push({
              type: 'manage_dependencies',
              description: 'Failed to manage dependencies',
              status: 'failed',
              error: error instanceof Error ? error.message : 'Unknown error'
            })
          }
        }

        // Execute build operations
        try {
          const buildResult = await this.toolHandlers.handleExecuteBuild({
            operation: 'build',
            description: 'Building the project after implementing changes'
          })

          operations.push({
            type: 'execute_build',
            description: 'Built the project',
            status: buildResult.success ? 'completed' : 'failed',
            result: buildResult,
            error: buildResult.success ? undefined : 'Build operation failed'
          })
        } catch (error) {
          operations.push({
            type: 'execute_build',
            description: 'Failed to build the project',
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

      return operations
    } catch (error) {
      operations.push({
        type: 'execute_plan',
        description: 'Failed to execute implementation plan',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      return operations
    }
  }

  private generateFileContent(filePath: string, analysis: RequestAnalysis): string {
    // Generate basic file content based on file type
    const fileType = this.detectFileType(filePath)
    
    switch (fileType) {
      case 'component':
        return `import React from 'react'

export function ${this.getComponentName(filePath)}() {
  return (
    <div className="p-4">
      <h2>${this.getComponentName(filePath)}</h2>
      <p>Generated component as part of: ${analysis.summary}</p>
    </div>
  )
}`
      
      case 'page':
        return `import React from 'react'

export default function ${this.getPageName(filePath)}() {
  return (
    <div className="min-h-screen p-8">
      <h1 className="text-3xl font-bold">${this.getPageName(filePath)}</h1>
      <p>Generated page as part of: ${analysis.summary}</p>
    </div>
  )
}`
      
      case 'utility':
        return `// Generated utility function as part of: ${analysis.summary}

export function ${this.getUtilityName(filePath)}() {
  // TODO: Implement utility function
  return null
}`
      
      default:
        return `// Generated file as part of: ${analysis.summary}
// File: ${filePath}
// TODO: Implement required functionality`
    }
  }

  private detectFileType(filePath: string): string {
    if (filePath.includes('components/')) return 'component'
    if (filePath.includes('pages/')) return 'page'
    if (filePath.includes('utils/') || filePath.includes('lib/')) return 'utility'
    if (filePath.endsWith('.tsx') || filePath.endsWith('.jsx')) return 'component'
    if (filePath.endsWith('.ts') || filePath.endsWith('.js')) return 'utility'
    return 'file'
  }

  private getComponentName(filePath: string): string {
    const fileName = filePath.split('/').pop() || ''
    return fileName.replace(/\.(tsx|jsx|ts|js)$/, '').replace(/[^a-zA-Z0-9]/g, '')
  }

  private getPageName(filePath: string): string {
    return this.getComponentName(filePath)
  }

  private getUtilityName(filePath: string): string {
    return this.getComponentName(filePath)
  }

  // Legacy methods for backward compatibility
  async generateCode(prompt: string, filePath: string, context: string): Promise<Response> {
    const result = await streamText({
      model: this.mistral('codestral-latest'),
      prompt: `Generate code for ${filePath} based on: ${prompt}\n\nContext: ${context}`,
      temperature: 0.7,
    })
    return result.toTextStreamResponse()
  }

  async generateFileEdits(prompt: string, fileContent: string, filePath: string): Promise<Response> {
    const result = await streamText({
      model: this.mistral('codestral-latest'),
      prompt: `Edit the file ${filePath} based on: ${prompt}\n\nCurrent content:\n${fileContent}\n\nProvide search and replace operations in the format:\n<<<<<<< SEARCH\n[exact text to find]\n=======\n[replacement text]\n>>>>>>> REPLACE`,
      temperature: 0.3,
    })
    return result.toTextStreamResponse()
  }
}
