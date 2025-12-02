"use client";

import type { StyleChange } from './types';

export interface BatchElement {
  elementId: string;
  changes: StyleChange[];
  sourceLine?: number;
}

/**
 * Generate a batch file update using AI for multiple elements
 * This is more efficient and accurate than sequential edits
 */
export async function generateBatchFileUpdate(
  originalCode: string,
  elements: BatchElement[],
  sourceFile: string
): Promise<{ success: boolean; updatedCode: string; error?: string }> {
  try {
    console.log('[Batch Code Editor] Starting batch edit for', elements.length, 'elements');
    console.log('[Batch Code Editor] Source file:', sourceFile);
    
    // Extract original text for each element's target line
    const allLines = originalCode.split('\n');
    const elementsWithText = elements.map(element => {
      const targetLineContent = element.sourceLine ? allLines[element.sourceLine - 1] || '' : '';
      const textMatch = targetLineContent.match(/>([^<]+)</);
      const originalText = textMatch ? textMatch[1].trim() : '';
      
      return {
        ...element,
        originalText,
      };
    });
    
    console.log('[Batch Code Editor] Elements with extracted text:', elementsWithText.length);
    
    // Build intent for each element
    const elementsData = elementsWithText.map(element => {
      const intent = element.changes.map(change => {
        const parts: string[] = [];
        
        if (change.tailwindClass) {
          parts.push(`Add Tailwind class: ${change.tailwindClass}`);
        }
        
        if (change.newValue && change.property) {
          const prop = String(change.property);
          
          if (prop === 'textContent' || prop === 'innerText' || prop === 'children') {
            if (element.originalText) {
              parts.push(`REPLACE TEXT "${element.originalText}" WITH "${change.newValue}"`);
            } else {
              parts.push(`CHANGE TEXT CONTENT to: "${change.newValue}"`);
            }
          } else if (prop.startsWith('style.')) {
            const styleProp = prop.replace('style.', '');
            parts.push(`UPDATE INLINE STYLE ${styleProp} to: ${change.newValue}`);
          } else {
            parts.push(`UPDATE ${prop} to: ${change.newValue}`);
          }
        }
        
        return parts.join('; ');
      }).filter(Boolean).join('; ');
      
      return {
        elementId: element.elementId,
        targetLine: element.sourceLine || 0,
        originalText: element.originalText,
        changes: element.changes,
      };
    });
    
    console.log('[Batch Code Editor] Calling batch API with', elementsData.length, 'elements');
    
    // Call the batch API
    const response = await fetch('/api/visual-editor/batch-edit-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullCode: originalCode,
        sourceFile,
        elements: elementsData,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Batch API returned unsuccessful response');
    }
    
    console.log('[Batch Code Editor] ✅ Batch edit successful');
    console.log('[Batch Code Editor] Elements processed:', data.metadata?.elementsProcessed);
    
    return {
      success: true,
      updatedCode: data.updatedCode,
    };
  } catch (error) {
    console.error('[Batch Code Editor] Error:', error);
    return {
      success: false,
      updatedCode: originalCode,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export default {
  generateBatchFileUpdate,
};
