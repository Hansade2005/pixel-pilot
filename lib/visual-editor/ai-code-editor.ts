// AI-Powered Code Editor for Visual Edits
// Uses AI to generate precise code edits based on user intentions

import type { StyleChange } from './types';

interface EditContext {
  filePath: string;
  lineNumber: number;
  elementTag: string;
  surroundingCode: string;
  fullFileContent: string;
}

interface EditIntent {
  changes: StyleChange[];
  description: string;
  targetElement: {
    tag: string;
    className?: string;
    id?: string;
    textContent?: string;
  };
}

/**
 * Extract code context around a specific line, ensuring complete JSX elements
 */
export function extractCodeContext(
  code: string,
  targetLine: number,
  contextLines: number = 10
): { context: string; startLine: number; endLine: number } {
  const lines = code.split('\n');
  let startLine = Math.max(0, targetLine - contextLines);
  let endLine = Math.min(lines.length, targetLine + contextLines + 1);
  
  // Expand backwards to ensure we start with a complete line/tag
  // Look for opening tags or complete statements
  while (startLine > 0) {
    const line = lines[startLine].trim();
    
    // Good starting points:
    // - Function/component declarations
    // - Complete JSX opening tags at start of line
    // - Import statements
    // - Variable declarations
    if (
      line.startsWith('export ') ||
      line.startsWith('function ') ||
      line.startsWith('const ') ||
      line.startsWith('let ') ||
      line.startsWith('import ') ||
      line.match(/^<\w+/) || // JSX tag at start
      line === '' // Empty line is natural boundary
    ) {
      break;
    }
    
    startLine--;
    if (targetLine - startLine > contextLines + 10) break; // Don't go too far
  }
  
  // Expand forwards to ensure we end with complete tags
  // Track open/close tag balance
  let tagBalance = 0;
  let inTarget = false;
  
  for (let i = startLine; i < endLine && i < lines.length; i++) {
    const line = lines[i];
    
    if (i === targetLine) {
      inTarget = true;
    }
    
    // Count opening tags (not self-closing)
    const openTags = line.match(/<(\w+)(?![^>]*\/>)[^>]*>/g) || [];
    tagBalance += openTags.length;
    
    // Count closing tags
    const closeTags = line.match(/<\/\w+>/g) || [];
    tagBalance -= closeTags.length;
    
    // Count self-closing tags (don't affect balance)
    const selfClosing = line.match(/<\w+[^>]*\/>/g) || [];
    
    // After target line, if tags are balanced and we hit a natural boundary, stop
    if (inTarget && i > targetLine && tagBalance === 0) {
      const nextLine = lines[i + 1]?.trim() || '';
      
      // Natural stopping points
      if (
        nextLine === '' ||
        nextLine === '}' ||
        nextLine.startsWith('export ') ||
        nextLine.startsWith('function ') ||
        nextLine.startsWith('const ') ||
        nextLine.startsWith('import ') ||
        nextLine.startsWith('//') ||
        i - targetLine > contextLines
      ) {
        endLine = i + 1;
        break;
      }
    }
  }
  
  // Ensure we don't extend too far
  endLine = Math.min(endLine, targetLine + contextLines + 15);
  
  const context = lines.slice(startLine, endLine).join('\n');
  
  return {
    context,
    startLine: startLine + 1, // 1-indexed
    endLine: endLine + 1,
  };
}

/**
 * Convert style changes to human-readable intent
 */
export function generateEditIntent(changes: StyleChange[]): string {
  const intents: string[] = [];
  
  for (const change of changes) {
    if (change.useTailwind) {
      // Tailwind class change
      const tailwindClass = change.tailwindClass || 'auto-generated';
      intents.push(
        `- Change ${String(change.property)} from "${change.oldValue}" to "${change.newValue}" (add Tailwind class: ${tailwindClass})`
      );
    } else {
      // Inline style change
      intents.push(
        `- Change ${String(change.property)} from "${change.oldValue}" to "${change.newValue}" (use inline style)`
      );
    }
  }
  
  return intents.join('\n');
}

/**
 * Build AI prompt for code editing
 */
export function buildEditPrompt(
  context: EditContext,
  intent: EditIntent
): string {
  const intentDescription = generateEditIntent(intent.changes);
  
  return `You are a expert code editor. Your task is to apply visual styling changes to React/TSX code with precision.

## File Information
- File: ${context.filePath}
- Target Line: ${context.lineNumber}
- Element: <${context.elementTag}>

## Current Code Context
\`\`\`tsx
${context.surroundingCode}
\`\`\`

## Target Element
- Tag: ${context.elementTag}
${intent.targetElement.className ? `- Current className: "${intent.targetElement.className}"` : ''}
${intent.targetElement.textContent ? `- Text content: "${intent.targetElement.textContent}"` : ''}

## Changes to Apply
${intentDescription}

## Instructions
1. Locate the exact element at line ${context.lineNumber}
2. Apply the styling changes precisely
3. For Tailwind changes: Update the className attribute
   - Add new Tailwind classes
   - Remove conflicting classes (e.g., if adding text-xl, remove text-lg, text-sm, etc.)
   - Preserve unrelated classes
4. For inline style changes: Update or add the style attribute
   - Use JSX object syntax: style={{ property: 'value' }}
   - Quote string values with single quotes: style={{ color: '#fff' }}
   - Merge with existing inline styles if present
5. Preserve all other attributes and code structure
6. Return ONLY the updated code context (same line range as input)
7. Do NOT add explanations or markdown - just the code

## Output Format
Return the exact updated code that should replace the context shown above, maintaining the same line range and indentation.`;
}

/**
 * Build a simpler prompt for multi-line edits
 */
export function buildSimpleEditPrompt(
  filePath: string,
  lineNumber: number,
  elementTag: string,
  codeContext: string,
  changes: StyleChange[]
): string {
  const changesList = changes.map(c => {
    if (c.useTailwind) {
      return `Add Tailwind class "${c.tailwindClass || 'auto'}" for ${String(c.property)}: ${c.newValue}`;
    }
    return `Set inline style ${String(c.property)}: '${c.newValue}'`;
  }).join('\n');

  return `Apply these styling changes to the <${elementTag}> element at line ${lineNumber}:

${changesList}

Current code:
\`\`\`tsx
${codeContext}
\`\`\`

Return ONLY the updated code (no explanations, no markdown).`;
}

/**
 * Parse AI response and extract updated code
 */
export function parseAIResponse(response: string): string {
  // Remove markdown code fences if present
  let cleaned = response.trim();
  
  // Remove ```tsx or ```javascript opening
  cleaned = cleaned.replace(/^```(?:tsx|javascript|typescript|jsx)?\s*\n/i, '');
  
  // Remove closing ```
  cleaned = cleaned.replace(/\n```\s*$/, '');
  
  return cleaned.trim();
}

/**
 * Validate that AI-generated code is safe and reasonable
 */
export function validateAIEdit(
  originalCode: string,
  updatedCode: string,
  targetLine: number
): { valid: boolean; reason?: string } {
  // Basic sanity checks
  
  // 1. Check if code is not empty
  if (!updatedCode || updatedCode.trim().length === 0) {
    return { valid: false, reason: 'AI returned empty code' };
  }
  
  // 2. Check if it looks like actual code (has < or { or function/const/let)
  if (!updatedCode.includes('<') && !updatedCode.includes('{') && 
      !updatedCode.includes('function') && !updatedCode.includes('const')) {
    return { valid: false, reason: 'AI response does not look like code' };
  }
  
  // 3. Check line count hasn't changed dramatically (±30%)
  const origLines = originalCode.split('\n').length;
  const updatedLines = updatedCode.split('\n').length;
  const lineRatio = updatedLines / origLines;
  
  if (lineRatio < 0.7 || lineRatio > 1.3) {
    return { 
      valid: false, 
      reason: `Line count changed too much: ${origLines} → ${updatedLines}` 
    };
  }
  
  // 4. Check for common AI explanation patterns
  if (updatedCode.toLowerCase().includes('here is') || 
      updatedCode.toLowerCase().includes('here are') ||
      updatedCode.toLowerCase().includes('i have') ||
      updatedCode.toLowerCase().includes('i\'ve')) {
    return { valid: false, reason: 'AI returned explanation instead of code' };
  }
  
  return { valid: true };
}

/**
 * Apply AI-generated code context back to full file
 */
export function applyContextToFile(
  fullCode: string,
  updatedContext: string,
  startLine: number,
  endLine: number
): string {
  const lines = fullCode.split('\n');
  const updatedLines = updatedContext.split('\n');
  
  // Replace the context lines with updated lines
  const before = lines.slice(0, startLine - 1);
  const after = lines.slice(endLine);
  
  return [...before, ...updatedLines, ...after].join('\n');
}

/**
 * Main function: Generate AI-powered code edit via dedicated API
 */
export async function generateAICodeEdit(
  originalCode: string,
  elementId: string,
  changes: StyleChange[],
  sourceFile: string,
  sourceLine: number,
  _aiGenerateFunction?: (prompt: string) => Promise<string> // No longer used, kept for compatibility
): Promise<{ success: boolean; updatedCode: string; error?: string }> {
  try {
    console.log('[AI Code Editor] Starting AI-powered edit via API');
    console.log('[AI Code Editor] Changes:', changes);
    
    // Extract code context around target line
    const { context, startLine, endLine } = extractCodeContext(
      originalCode,
      sourceLine - 1, // Convert to 0-indexed
      15 // Get 15 lines before and after for better context
    );
    
    console.log('[AI Code Editor] Context extracted:', { startLine, endLine });
    
    // Build the context object for API
    const contextLines = context.split('\n');
    const targetLineIndex = sourceLine - startLine - 1;
    const beforeLines = contextLines.slice(0, targetLineIndex);
    const targetLine = contextLines[targetLineIndex] || '';
    const afterLines = contextLines.slice(targetLineIndex + 1);
    
    // Generate edit intent
    const intent = changes.map(change => {
      const parts: string[] = [];
      
      if (change.tailwindClass) {
        parts.push(`Add Tailwind class: ${change.tailwindClass}`);
      }
      
      if (change.newValue && change.property) {
        parts.push(`Set ${String(change.property)}: ${change.newValue}`);
      }
      
      return parts.join('; ');
    }).filter(Boolean).join('\n');
    
    console.log('[AI Code Editor] Intent:', intent);
    
    // Call our dedicated visual editor API
    // Only send the context lines, not the full file (saves tokens & cost)
    const response = await fetch('/api/visual-editor/edit-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        context: {
          beforeLines,
          targetLine,
          afterLines,
          lineNumber: sourceLine,
        },
        intent,
        elementId,
        sourceFile,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'API returned unsuccessful response');
    }
    
    const editedSection = data.editedCode;
    console.log('[AI Code Editor] API response received:', editedSection.substring(0, 200));
    
    // Parse and clean AI response
    const updatedContext = parseAIResponse(editedSection);
    
    console.log('[AI Code Editor] Parsed response:', updatedContext);
    
    // Validate the AI edit
    const validation = validateAIEdit(context, updatedContext, sourceLine);
    
    if (!validation.valid) {
      console.error('[AI Code Editor] Validation failed:', validation.reason);
      return {
        success: false,
        updatedCode: originalCode,
        error: `AI edit validation failed: ${validation.reason}`,
      };
    }
    
    console.log('[AI Code Editor] Validation passed');
    
    // Apply the updated context back to the full file
    const updatedCode = applyContextToFile(
      originalCode,
      updatedContext,
      startLine,
      endLine
    );
    
    console.log('[AI Code Editor] ✅ Code updated successfully via API');
    
    return {
      success: true,
      updatedCode,
    };
  } catch (error) {
    console.error('[AI Code Editor] Error:', error);
    return {
      success: false,
      updatedCode: originalCode,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Export for use in code generator
 */
export default {
  extractCodeContext,
  generateEditIntent,
  buildEditPrompt,
  buildSimpleEditPrompt,
  parseAIResponse,
  validateAIEdit,
  applyContextToFile,
  generateAICodeEdit,
};
