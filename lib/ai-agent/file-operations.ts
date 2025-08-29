// File Operations System for AI Agent
import { createClient } from '../supabase/client'
import { DiffEditor, DiffEditBlock, DiffEditResult } from './diff-editor'

export interface FileOperationRequest {
  type: 'create' | 'edit' | 'delete' | 'rename'
  filePath: string
  content?: string
  edits?: DiffEditBlock[]
  newPath?: string
  projectId: string
}

export interface FileOperationResult {
  success: boolean
  operation: FileOperationRequest
  result: {
    filePath: string
    content?: string
    oldPath?: string
    newPath?: string
  }
  errors: string[]
  warnings: string[]
}

export interface FileInfo {
  id: string
  path: string
  name: string
  content: string
  type: string
  size: number
  isDirectory: boolean
  folderId?: string
  createdAt: string
  updatedAt: string
}

export interface ProjectFile {
  id: string
  project_id: string
  name: string
  path: string
  content: string
  file_type: string
  type: string
  folder_id?: string
  size: number
  is_directory: boolean
  created_at: string
  updated_at: string
}

export class FileOperations {
  private supabase = createClient()

  /**
   * Create a new file in the project
   */
  async createFile(request: FileOperationRequest): Promise<FileOperationResult> {
    try {
      // Validate request
      if (!request.content) {
        return {
          success: false,
          operation: request,
          result: { filePath: request.filePath },
          errors: ['File content is required for creation'],
          warnings: []
        }
      }

      // Check if file already exists
      const existingFile = await this.getFileByPath(request.projectId, request.filePath)
      if (existingFile) {
        return {
          success: false,
          operation: request,
          result: { filePath: request.filePath },
          errors: [`File already exists at path: ${request.filePath}`],
          warnings: []
        }
      }

      // Create the file
      const { data: newFile, error } = await this.supabase
        .from('files')
        .insert({
          project_id: request.projectId,
          name: this.getFileName(request.filePath),
          path: request.filePath,
          content: request.content,
          file_type: this.getFileType(request.filePath),
          type: this.getFileType(request.filePath),
          size: request.content.length,
          is_directory: false
        })
        .select()
        .single()

      if (error) {
        return {
          success: false,
          operation: request,
          result: { filePath: request.filePath },
          errors: [`Failed to create file: ${error.message}`],
          warnings: []
        }
      }

      return {
        success: true,
        operation: request,
        result: {
          filePath: request.filePath,
          content: request.content
        },
        errors: [],
        warnings: []
      }
    } catch (error) {
      return {
        success: false,
        operation: request,
        result: { filePath: request.filePath },
        errors: [`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: []
      }
    }
  }

  /**
   * Edit an existing file using diff edits
   */
  async editFile(request: FileOperationRequest): Promise<FileOperationResult> {
    try {
      // Validate request
      if (!request.edits || request.edits.length === 0) {
        return {
          success: false,
          operation: request,
          result: { filePath: request.filePath },
          errors: ['Diff edits are required for file editing'],
          warnings: []
        }
      }

      // Get current file content
      const currentFile = await this.getFileByPath(request.projectId, request.filePath)
      if (!currentFile) {
        return {
          success: false,
          operation: request,
          result: { filePath: request.filePath },
          errors: [`File not found at path: ${request.filePath}`],
          warnings: []
        }
      }

      // Apply diff edits
      const diffResult = DiffEditor.applySearchReplaceEdits(currentFile.content, request.edits)
      
      if (!diffResult.success) {
        return {
          success: false,
          operation: request,
          result: { filePath: request.filePath },
          errors: [
            `Failed to apply ${diffResult.failedEdits.length} edits`,
            ...diffResult.failedEdits.map(e => `Block ${e.blockIndex + 1}: ${e.reason}`)
          ],
          warnings: diffResult.conflicts.map(c => `Conflict: ${c.description}`)
        }
      }

      // Update the file with new content
      const { error } = await this.supabase
        .from('files')
        .update({
          content: diffResult.modifiedContent,
          size: diffResult.modifiedContent.length,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentFile.id)

      if (error) {
        return {
          success: false,
          operation: request,
          result: { filePath: request.filePath },
          errors: [`Failed to update file: ${error.message}`],
          warnings: []
        }
      }

      return {
        success: true,
        operation: request,
        result: {
          filePath: request.filePath,
          content: diffResult.modifiedContent
        },
        errors: [],
        warnings: diffResult.conflicts.map(c => `Warning: ${c.description}`)
      }
    } catch (error) {
      return {
        success: false,
        operation: request,
        result: { filePath: request.filePath },
        errors: [`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: []
      }
    }
  }

  /**
   * Delete a file from the project
   */
  async deleteFile(request: FileOperationRequest): Promise<FileOperationResult> {
    try {
      // Get current file
      const currentFile = await this.getFileByPath(request.projectId, request.filePath)
      if (!currentFile) {
        return {
          success: false,
          operation: request,
          result: { filePath: request.filePath },
          errors: [`File not found at path: ${request.filePath}`],
          warnings: []
        }
      }

      // Delete the file
      const { error } = await this.supabase
        .from('files')
        .delete()
        .eq('id', currentFile.id)

      if (error) {
        return {
          success: false,
          operation: request,
          result: { filePath: request.filePath },
          errors: [`Failed to delete file: ${error.message}`],
          warnings: []
        }
      }

      return {
        success: true,
        operation: request,
        result: {
          filePath: request.filePath,
          oldPath: request.filePath
        },
        errors: [],
        warnings: []
      }
    } catch (error) {
      return {
        success: false,
        operation: request,
        result: { filePath: request.filePath },
        errors: [`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: []
      }
    }
  }

  /**
   * Rename a file in the project
   */
  async renameFile(request: FileOperationRequest): Promise<FileOperationResult> {
    try {
      // Validate request
      if (!request.newPath) {
        return {
          success: false,
          operation: request,
          result: { filePath: request.filePath },
          errors: ['New path is required for file renaming'],
          warnings: []
        }
      }

      // Check if source file exists
      const sourceFile = await this.getFileByPath(request.projectId, request.filePath)
      if (!sourceFile) {
        return {
          success: false,
          operation: request,
          result: { filePath: request.filePath },
          errors: [`Source file not found at path: ${request.filePath}`],
          warnings: []
        }
      }

      // Check if destination file already exists
      const destFile = await this.getFileByPath(request.projectId, request.newPath)
      if (destFile) {
        return {
          success: false,
          operation: request,
          result: { filePath: request.filePath },
          errors: [`Destination file already exists at path: ${request.newPath}`],
          warnings: []
        }
      }

      // Update the file path
      const { error } = await this.supabase
        .from('files')
        .update({
          name: this.getFileName(request.newPath),
          path: request.newPath,
          updated_at: new Date().toISOString()
        })
        .eq('id', sourceFile.id)

      if (error) {
        return {
          success: false,
          operation: request,
          result: { filePath: request.filePath },
          errors: [`Failed to rename file: ${error.message}`],
          warnings: []
        }
      }

      return {
        success: true,
        operation: request,
        result: {
          filePath: request.filePath,
          oldPath: request.filePath,
          newPath: request.newPath
        },
        errors: [],
        warnings: []
      }
    } catch (error) {
      return {
        success: false,
        operation: request,
        result: { filePath: request.filePath },
        errors: [`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: []
      }
    }
  }

  /**
   * Execute a file operation based on the request type
   */
  async executeFileOperation(request: FileOperationRequest): Promise<FileOperationResult> {
    switch (request.type) {
      case 'create':
        return this.createFile(request)
      case 'edit':
        return this.editFile(request)
      case 'delete':
        return this.deleteFile(request)
      case 'rename':
        return this.renameFile(request)
      default:
        return {
          success: false,
          operation: request,
          result: { filePath: request.filePath },
          errors: [`Unknown operation type: ${request.type}`],
          warnings: []
        }
    }
  }

  /**
   * Execute multiple file operations
   */
  async executeMultipleFileOperations(requests: FileOperationRequest[]): Promise<FileOperationResult[]> {
    const results: FileOperationResult[] = []
    
    for (const request of requests) {
      const result = await this.executeFileOperation(request)
      results.push(result)
      
      // If a critical operation fails, stop processing
      if (!result.success && request.type === 'create') {
        break
      }
    }
    
    return results
  }

  /**
   * Get file by path
   */
  private async getFileByPath(projectId: string, filePath: string): Promise<ProjectFile | null> {
    const { data: files, error } = await this.supabase
      .from('files')
      .select('*')
      .eq('project_id', projectId)
      .eq('path', filePath)
      .single()

    if (error || !files) {
      return null
    }

    return files
  }

  /**
   * Get file name from path
   */
  private getFileName(filePath: string): string {
    const parts = filePath.split('/')
    return parts[parts.length - 1] || filePath
  }

  /**
   * Get file type from path
   */
  private getFileType(filePath: string): string {
    const extension = filePath.split('.').pop()?.toLowerCase()
    
    switch (extension) {
      case 'tsx':
      case 'ts':
        return 'typescript'
      case 'jsx':
      case 'js':
        return 'javascript'
      case 'css':
        return 'css'
      case 'scss':
      case 'sass':
        return 'scss'
      case 'json':
        return 'json'
      case 'md':
        return 'markdown'
      case 'html':
        return 'html'
      case 'svg':
        return 'svg'
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
        return 'image'
      default:
        return 'text'
    }
  }

  /**
   * Get all files in a project
   */
  async getProjectFiles(projectId: string): Promise<FileInfo[]> {
    const { data: files, error } = await this.supabase
      .from('files')
      .select('*')
      .eq('project_id', projectId)
      .order('path')

    if (error) {
      console.error('Error fetching project files:', error)
      return []
    }

    return files.map(file => ({
      id: file.id,
      path: file.path,
      name: file.name,
      content: file.content,
      type: file.type,
      size: file.size,
      isDirectory: file.is_directory,
      folderId: file.folder_id,
      createdAt: file.created_at,
      updatedAt: file.updated_at
    }))
  }

  /**
   * Get file content by path
   */
  async getFileContent(projectId: string, filePath: string): Promise<string | null> {
    const file = await this.getFileByPath(projectId, filePath)
    return file?.content || null
  }

  /**
   * Check if file exists
   */
  async fileExists(projectId: string, filePath: string): Promise<boolean> {
    const file = await this.getFileByPath(projectId, filePath)
    return !!file
  }

  /**
   * Get project file structure
   */
  async getProjectStructure(projectId: string): Promise<FileInfo[]> {
    const files = await this.getProjectFiles(projectId)
    
    // Sort files by path for better organization
    return files.sort((a, b) => {
      const aDepth = a.path.split('/').length
      const bDepth = b.path.split('/').length
      
      if (aDepth !== bDepth) {
        return aDepth - bDepth
      }
      
      return a.path.localeCompare(b.path)
    })
  }
}
