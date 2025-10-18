// lib/file-validation.ts
export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export const validateFileContent = (content: string, fileType: string): ValidationResult => {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  }

  if (!content || typeof content !== 'string') {
    result.isValid = false
    result.errors.push('File content is empty or invalid')
    return result
  }

  // Basic size validation
  if (content.length > 10 * 1024 * 1024) { // 10MB limit
    result.isValid = false
    result.errors.push('File too large (>10MB)')
    return result
  }

  // Type-specific validation
  switch (fileType.toLowerCase()) {
    case 'json':
      try {
        JSON.parse(content)
      } catch (e) {
        result.isValid = false
        result.errors.push(`Invalid JSON: ${(e as Error).message}`) 
      }
      break

    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
      // Basic syntax checks for JavaScript/TypeScript
      if (content.includes('undefined(') || content.includes('null(')) {
        result.warnings.push('Potential unsafe function calls detected')
      }

      // Check for common AI generation issues
      if (content.includes('import from ""') || content.includes('require("")')) {
        result.warnings.push('Empty import statements detected')
      }

      // Check for unclosed brackets (basic check)
      const openBraces = (content.match(/\{/g) || []).length
      const closeBraces = (content.match(/\}/g) || []).length
      if (Math.abs(openBraces - closeBraces) > 5) {
        result.warnings.push('Potential bracket mismatch')
      }
      break

    case 'html':
      // Basic HTML validation
      if (!content.includes('<html') && !content.includes('<!DOCTYPE')) {
        result.warnings.push('Missing HTML document structure')
      }

      // Check for unclosed tags (basic)
      const openTags = (content.match(/<[^\/][^>]*>/g) || []).length
      const closeTags = (content.match(/<\/[^>]+>/g) || []).length
      if (Math.abs(openTags - closeTags) > 10) {
        result.warnings.push('Potential unclosed HTML tags')
      }
      break

    case 'css':
      // Basic CSS validation
      if (content.includes('{') && !content.includes('}')) {
        result.warnings.push('Unclosed CSS rules')
      }
      break
  }

  return result
}

export const sanitizeFileContent = (content: string, fileType: string): string => {
  if (!content) return ''

  try {
    // Remove null bytes and other problematic characters
    let sanitized = content.replace(/\0/g, '')

    // For JavaScript/TypeScript, remove potentially dangerous patterns
    if (['js', 'jsx', 'ts', 'tsx'].includes(fileType.toLowerCase())) {
      // Remove script injection attempts
      sanitized = sanitized.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      // Remove eval calls
      sanitized = sanitized.replace(/\beval\s*\(/g, '/* eval removed */')
      // Remove Function constructor calls
      sanitized = sanitized.replace(/\bFunction\s*\(/g, '/* Function removed */')
    }

    // For HTML, remove dangerous elements
    if (fileType.toLowerCase() === 'html') {
      sanitized = sanitized.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      sanitized = sanitized.replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
      sanitized = sanitized.replace(/javascript:/gi, '#')
    }

    return sanitized
  } catch (e) {
    console.warn('Error sanitizing file content:', e)
    return content
  }
}

export const isFileTypeSupported = (fileName: string): boolean => {
  const supportedExtensions = [
    'js', 'jsx', 'ts', 'tsx', 'json', 'html', 'css', 'scss', 'md', 'txt',
    'py', 'java', 'cpp', 'c', 'php', 'rb', 'go', 'rs', 'sh', 'yml', 'yaml'
  ]

  const ext = fileName.split('.').pop()?.toLowerCase()
  return ext ? supportedExtensions.includes(ext) : false
}