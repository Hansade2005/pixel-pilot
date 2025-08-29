// Diff Editing System for AI Agent
export interface DiffEditBlock {
  search: string
  replace: string
  description: string
  metadata?: {
    lineNumbers?: number[]
    context?: string
    dependencies?: string[]
  }
}

export interface DiffEditResult {
  success: boolean
  modifiedContent: string
  appliedEdits: AppliedEdit[]
  failedEdits: FailedEdit[]
  conflicts: EditConflict[]
  summary: EditSummary
}

export interface AppliedEdit {
  blockIndex: number
  search: string
  replace: string
  status: 'applied'
  lineNumbers?: number[]
}

export interface FailedEdit {
  blockIndex: number
  search: string
  replace: string
  status: 'failed'
  reason: string
  suggestion?: string
}

export interface EditConflict {
  blockIndex: number
  type: 'overlap' | 'dependency' | 'syntax'
  description: string
  resolution?: string
}

export interface EditSummary {
  totalBlocks: number
  appliedCount: number
  failedCount: number
  conflictCount: number
  modifiedLines: number
}

// Search/Replace constants for diff editing
export const SEARCH_START = "<<<<<<< SEARCH"
export const DIVIDER = "======="
export const REPLACE_END = ">>>>>>> REPLACE"

export class DiffEditor {
  /**
   * Parse AI response into search/replace blocks
   */
  static parseSearchReplaceBlocks(aiResponse: string): DiffEditBlock[] {
    const blocks: DiffEditBlock[] = []
    const lines = aiResponse.split('\n')
    
    let currentBlock: Partial<DiffEditBlock> | null = null
    let mode: 'search' | 'replace' = 'search'
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      if (line.trim() === SEARCH_START) {
        currentBlock = { search: '', replace: '', description: '' }
        mode = 'search'
      } else if (line.trim() === DIVIDER && currentBlock) {
        mode = 'replace'
      } else if (line.trim() === REPLACE_END && currentBlock) {
        if (currentBlock.search && currentBlock.replace) {
          blocks.push({
            search: currentBlock.search,
            replace: currentBlock.replace,
            description: currentBlock.description || `Edit block ${blocks.length + 1}`
          })
        }
        currentBlock = null
        mode = 'search'
      } else if (mode === 'search' && currentBlock) {
        currentBlock.search = (currentBlock.search || '') + line + '\n'
      } else if (mode === 'replace' && currentBlock) {
        currentBlock.replace = (currentBlock.replace || '') + line + '\n'
      }
    }
    
    // Clean up trailing newlines
    return blocks.map(block => ({
      ...block,
      search: block.search.trimEnd(),
      replace: block.replace.trimEnd()
    }))
  }

  /**
   * Apply search/replace edits to content
   */
  static applySearchReplaceEdits(
    content: string,
    blocks: DiffEditBlock[]
  ): DiffEditResult {
    let modifiedContent = content
    const appliedEdits: AppliedEdit[] = []
    const failedEdits: FailedEdit[] = []
    const conflicts: EditConflict[] = []
    
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i]
      const searchText = block.search
      const replaceText = block.replace
      
      if (modifiedContent.includes(searchText)) {
        // Check for conflicts before applying
        const conflict = this.checkForConflicts(block, modifiedContent, i)
        if (conflict) {
          conflicts.push(conflict)
          continue
        }
        
        // Apply the edit
        modifiedContent = modifiedContent.replace(searchText, replaceText)
        
        appliedEdits.push({
          blockIndex: i,
          search: searchText,
          replace: replaceText,
          status: 'applied',
          lineNumbers: this.getLineNumbers(searchText, content)
        })
      } else {
        failedEdits.push({
          blockIndex: i,
          search: searchText,
          replace: replaceText,
          status: 'failed',
          reason: 'Search text not found in content',
          suggestion: 'Check for whitespace differences or line ending variations'
        })
      }
    }
    
    return {
      success: failedEdits.length === 0 && conflicts.length === 0,
      modifiedContent,
      appliedEdits,
      failedEdits,
      conflicts,
      summary: {
        totalBlocks: blocks.length,
        appliedCount: appliedEdits.length,
        failedCount: failedEdits.length,
        conflictCount: conflicts.length,
        modifiedLines: this.countModifiedLines(content, modifiedContent)
      }
    }
  }

  /**
   * Check for potential conflicts in edits
   */
  private static checkForConflicts(
    block: DiffEditBlock,
    content: string,
    blockIndex: number
  ): EditConflict | null {
    // Check for overlapping edits
    const searchIndex = content.indexOf(block.search)
    if (searchIndex === -1) return null
    
    // Check if this edit overlaps with previously applied edits
    // This is a simplified check - in a real implementation, you'd track
    // all applied edits and check for overlaps
    
    // Check for syntax conflicts in TypeScript/React
    if (block.replace.includes('import') && !block.search.includes('import')) {
      // Adding new imports - check if they conflict with existing ones
      return {
        blockIndex,
        type: 'dependency',
        description: 'New import statement may conflict with existing imports',
        resolution: 'Review import statements for conflicts'
      }
    }
    
    return null
  }

  /**
   * Get line numbers for a search text
   */
  private static getLineNumbers(searchText: string, content: string): number[] {
    const lines = content.split('\n')
    const lineNumbers: number[] = []
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(searchText)) {
        lineNumbers.push(i + 1)
      }
    }
    
    return lineNumbers
  }

  /**
   * Count modified lines between original and modified content
   */
  private static countModifiedLines(original: string, modified: string): number {
    const originalLines = original.split('\n')
    const modifiedLines = modified.split('\n')
    
    let modifiedCount = 0
    const maxLines = Math.max(originalLines.length, modifiedLines.length)
    
    for (let i = 0; i < maxLines; i++) {
      if (i >= originalLines.length || i >= modifiedLines.length) {
        modifiedCount++
      } else if (originalLines[i] !== modifiedLines[i]) {
        modifiedCount++
      }
    }
    
    return modifiedCount
  }

  /**
   * Validate diff edits before applying
   */
  static validateDiffEdits(blocks: DiffEditBlock[]): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i]
      
      // Check for empty search text
      if (!block.search.trim()) {
        errors.push(`Block ${i + 1}: Search text cannot be empty`)
      }
      
      // Check for very short search text (might be too generic)
      if (block.search.trim().length < 10) {
        warnings.push(`Block ${i + 1}: Search text is very short, may match multiple locations`)
      }
      
      // Check for balanced search/replace
      if (block.search.includes('{') && !block.replace.includes('{')) {
        warnings.push(`Block ${i + 1}: Search contains braces but replace doesn't - check for syntax issues`)
      }
      
      // Check for import/export conflicts
      if (block.search.includes('import') && block.replace.includes('import')) {
        warnings.push(`Block ${i + 1}: Modifying imports - ensure all references are updated`)
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Create a diff view for user review
   */
  static createDiffView(
    originalContent: string,
    modifiedContent: string,
    blocks: DiffEditBlock[]
  ): DiffView {
    const originalLines = originalContent.split('\n')
    const modifiedLines = modifiedContent.split('\n')
    
    const diffLines: DiffLine[] = []
    let originalIndex = 0
    let modifiedIndex = 0
    
    for (const block of blocks) {
      const searchLines = block.search.split('\n')
      const replaceLines = block.replace.split('\n')
      
      // Find the block in original content
      const blockStart = this.findBlockInContent(originalLines, searchLines, originalIndex)
      if (blockStart === -1) continue
      
      // Add unchanged lines before the block
      while (originalIndex < blockStart) {
        diffLines.push({
          type: 'unchanged',
          originalLine: originalLines[originalIndex],
          modifiedLine: originalLines[originalIndex],
          lineNumber: originalIndex + 1
        })
        originalIndex++
        modifiedIndex++
      }
      
      // Add removed lines
      for (const searchLine of searchLines) {
        diffLines.push({
          type: 'removed',
          originalLine: searchLine,
          modifiedLine: '',
          lineNumber: originalIndex + 1
        })
        originalIndex++
      }
      
      // Add added lines
      for (const replaceLine of replaceLines) {
        diffLines.push({
          type: 'added',
          originalLine: '',
          modifiedLine: replaceLine,
          lineNumber: modifiedIndex + 1
        })
        modifiedIndex++
      }
    }
    
    // Add remaining unchanged lines
    while (originalIndex < originalLines.length) {
      diffLines.push({
        type: 'unchanged',
        originalLine: originalLines[originalIndex],
        modifiedLine: originalLines[originalIndex],
        lineNumber: originalIndex + 1
      })
      originalIndex++
      modifiedIndex++
    }
    
    return {
      lines: diffLines,
      summary: {
        totalLines: diffLines.length,
        unchangedLines: diffLines.filter(l => l.type === 'unchanged').length,
        removedLines: diffLines.filter(l => l.type === 'removed').length,
        addedLines: diffLines.filter(l => l.type === 'added').length
      }
    }
  }

  /**
   * Find a block of text in content starting from a given index
   */
  private static findBlockInContent(
    contentLines: string[],
    searchLines: string[],
    startIndex: number
  ): number {
    for (let i = startIndex; i <= contentLines.length - searchLines.length; i++) {
      let found = true
      for (let j = 0; j < searchLines.length; j++) {
        if (contentLines[i + j] !== searchLines[j]) {
          found = false
          break
        }
      }
      if (found) {
        return i
      }
    }
    return -1
  }
}

// Additional types for diff viewing
export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export interface DiffView {
  lines: DiffLine[]
  summary: DiffViewSummary
}

export interface DiffLine {
  type: 'unchanged' | 'added' | 'removed'
  originalLine: string
  modifiedLine: string
  lineNumber: number
}

export interface DiffViewSummary {
  totalLines: number
  unchangedLines: number
  removedLines: number
  addedLines: number
}
