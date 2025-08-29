// AI Development Agent - Main Export File
// This file exports all the AI Agent functionality for easy importing

// Core AI Agent
export { AIDevelopmentAgent } from './core'
export type { RequestAnalysis, AIAgentResult } from './core'

// Tool System
export { aiAgentTools, toolResults } from './tools'
export { ToolHandlers } from './tool-handlers'

// File Operations
export { FileOperations } from './file-operations'
export type { FileOperationRequest, FileOperationResult } from './file-operations'

// Dependency Management
export { DependencyManager } from './dependency-manager'
export type { PackageInfo, DependencyResult } from './dependency-manager'

// Diff Editing
export { DiffEditor } from './diff-editor'
export type { DiffEditBlock, DiffEditResult } from './diff-editor'

// Types
export type { ProjectContext, FileOperation, BuildOperation, AIOperation } from './types'

// Factory Functions
export function createAIAgent(projectId: string) {
  const { AIDevelopmentAgent } = require('./core')
  return new AIDevelopmentAgent(projectId)
}

export function analyzeRequest(prompt: string, projectContext: any) {
  const { ToolHandlers } = require('./tool-handlers')
  const handlers = new ToolHandlers('temp-project-id')
  return handlers.handleAnalyzeRequest(prompt, projectContext)
}

export function generateCode(prompt: string, filePath: string, context: string) {
  const { AIDevelopmentAgent } = require('./core')
  const agent = new AIDevelopmentAgent('temp-project-id')
  return agent.generateCode(prompt, filePath, context)
}

export function editFile(prompt: string, fileContent: string, filePath: string) {
  const { AIDevelopmentAgent } = require('./core')
  const agent = new AIDevelopmentAgent('temp-project-id')
  return agent.generateFileEdits(prompt, fileContent, filePath)
}

// Utility Functions for Diff Editing
export function parseSearchReplaceBlocks(content: string) {
  const { DiffEditor } = require('./diff-editor')
  return DiffEditor.parseSearchReplaceBlocks(content)
}

export function applySearchReplaceEdits(content: string, edits: any[]) {
  const { DiffEditor } = require('./diff-editor')
  return DiffEditor.applySearchReplaceEdits(content, edits)
}

export function checkForConflicts(content: string, edits: any[]) {
  const { DiffEditor } = require('./diff-editor')
  return DiffEditor.checkForConflicts(content, edits)
}

export function validateDiffEdits(edits: any[]) {
  const { DiffEditor } = require('./diff-editor')
  return DiffEditor.validateDiffEdits(edits)
}
