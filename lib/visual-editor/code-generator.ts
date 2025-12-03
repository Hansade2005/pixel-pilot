// Code Generator Utilities for Visual Editor
// Handles AST parsing and code generation for applying visual edits to source files

import type { StyleChange, ComputedStyleInfo } from './types';
import {
  TAILWIND_MAPPINGS,
  TAILWIND_SPACING,
  TAILWIND_FONT_SIZES,
  TAILWIND_BORDER_RADIUS,
} from './types';
import { generateAICodeEdit } from './ai-code-editor';

// Configuration
export const CODE_EDITOR_CONFIG = {
  useAI: false, // Changed: Use direct search-replace instead of AI
  useClientReplaceTool: true, // New: Use client_replace_string_in_file tool
  // Note: Direct search-replace is faster and more reliable than AI regeneration
};

// CSS property to Tailwind class prefix mapping
const TAILWIND_PREFIXES: Record<string, string> = {
  marginTop: 'mt',
  marginRight: 'mr',
  marginBottom: 'mb',
  marginLeft: 'ml',
  paddingTop: 'pt',
  paddingRight: 'pr',
  paddingBottom: 'pb',
  paddingLeft: 'pl',
  gap: 'gap',
  width: 'w',
  height: 'h',
  minWidth: 'min-w',
  maxWidth: 'max-w',
  minHeight: 'min-h',
  maxHeight: 'max-h',
};

// Convert pixel value to Tailwind spacing class
function pixelsToTailwindSpacing(pixels: number, prefix: string): string {
  // Find the closest Tailwind spacing value
  const spacingValues = Object.keys(TAILWIND_SPACING).map(Number).sort((a, b) => a - b);
  
  let closest = spacingValues[0];
  let minDiff = Math.abs(pixels - closest);
  
  for (const value of spacingValues) {
    const diff = Math.abs(pixels - value);
    if (diff < minDiff) {
      minDiff = diff;
      closest = value;
    }
  }
  
  const tailwindValue = TAILWIND_SPACING[closest];
  return `${prefix}-${tailwindValue}`;
}

// Convert CSS value to Tailwind class
export function cssToTailwindClass(
  property: keyof ComputedStyleInfo,
  value: string
): string | null {
  // Check direct mappings first
  const mappings = TAILWIND_MAPPINGS[property];
  if (mappings && mappings[value]) {
    return mappings[value];
  }

  // Handle spacing properties
  if (property in TAILWIND_PREFIXES) {
    const prefix = TAILWIND_PREFIXES[property];
    const numericValue = parseInt(value.replace('px', ''), 10);
    
    if (!isNaN(numericValue)) {
      return pixelsToTailwindSpacing(numericValue, prefix);
    }
    
    // Handle auto, full, etc.
    if (value === 'auto') return `${prefix}-auto`;
    if (value === '100%') return `${prefix}-full`;
    if (value === '50%') return `${prefix}-1/2`;
  }

  // Handle font sizes
  if (property === 'fontSize') {
    return TAILWIND_FONT_SIZES[value] || null;
  }

  // Handle font weights
  if (property === 'fontWeight') {
    return TAILWIND_MAPPINGS.fontWeight?.[value] || null;
  }

  // Handle font families
  if (property === 'fontFamily') {
    // Check direct mappings first
    const fontMapping = TAILWIND_MAPPINGS.fontFamily?.[value];
    if (fontMapping) {
      return fontMapping;
    }
    // For arbitrary fonts, use bracket notation
    return `font-[${value.replace(/\s+/g, '_')}]`;
  }

  // Handle border radius
  if (property === 'borderRadius') {
    return TAILWIND_BORDER_RADIUS[value] || null;
  }

  // Handle text align
  if (property === 'textAlign') {
    return TAILWIND_MAPPINGS.textAlign?.[value] || null;
  }

  // Handle colors - convert to Tailwind color format
  if (property === 'color' || property === 'backgroundColor') {
    return colorToTailwindClass(value, property === 'backgroundColor' ? 'bg' : 'text');
  }

  return null;
}

// Convert color value to Tailwind class
function colorToTailwindClass(color: string, prefix: 'bg' | 'text'): string | null {
  // Handle common colors
  const colorMap: Record<string, string> = {
    'rgb(0, 0, 0)': 'black',
    '#000000': 'black',
    '#000': 'black',
    'rgb(255, 255, 255)': 'white',
    '#ffffff': 'white',
    '#fff': 'white',
    'transparent': 'transparent',
    'rgba(0, 0, 0, 0)': 'transparent',
  };

  const normalizedColor = color.toLowerCase();
  if (colorMap[normalizedColor]) {
    return `${prefix}-${colorMap[normalizedColor]}`;
  }

  // For arbitrary colors, use bracket notation
  if (color.startsWith('#')) {
    return `${prefix}-[${color}]`;
  }

  if (color.startsWith('rgb')) {
    return `${prefix}-[${color}]`;
  }

  return null;
}

// Update className string with new Tailwind classes
export function updateClassName(
  currentClassName: string | undefined,
  changes: StyleChange[]
): string {
  // Safe handling of undefined/null className
  const safeClassName = currentClassName || '';
  const classes = safeClassName.split(/\s+/).filter(Boolean);
  const classSet = new Set(classes);

  for (const change of changes) {
    if (!change.useTailwind) continue;

    // Get the new Tailwind class
    const newClass = change.tailwindClass || cssToTailwindClass(change.property, change.newValue);
    
    if (!newClass) {
      continue;
    }

    // Find and remove any existing classes for this property
    const prefix = getTailwindPrefix(change.property);
    
    if (prefix) {
      // Remove existing classes with the same prefix
      const classesToRemove = Array.from(classSet).filter(cls => {
        // Special handling for 'text' prefix - distinguish between text color and text size
        if (prefix === 'text' && change.property === 'color') {
          // Only remove color-related text classes, not size classes like text-lg, text-xl
          // Color classes: text-red-500, text-[#fff], text-white, text-black, etc.
          if (cls.match(/^text-(\[|black|white|transparent|current|inherit|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)/)) {
            return true;
          }
          return false;
        }
        // Special handling for 'text' prefix when changing fontSize
        if (prefix === 'text' && change.property === 'fontSize') {
          // Only remove size-related text classes: text-xs, text-sm, text-base, text-lg, text-xl, etc.
          if (cls.match(/^text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)$/)) {
            return true;
          }
          return false;
        }
        // Special handling for 'font' prefix - distinguish between fontWeight and fontFamily
        if (prefix === 'font' && change.property === 'fontWeight') {
          // Only remove weight classes: font-thin, font-light, font-normal, font-medium, font-semibold, font-bold, font-extrabold, font-black
          if (cls.match(/^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/)) {
            return true;
          }
          return false;
        }
        if (prefix === 'font' && change.property === 'fontFamily') {
          // Only remove family classes: font-sans, font-serif, font-mono, font-[...]
          if (cls.match(/^font-(sans|serif|mono|\[)/)) {
            return true;
          }
          return false;
        }
        // Match classes like mt-4, mb-8, bg-blue-500, etc.
        if (cls.startsWith(`${prefix}-`)) return true;
        if (cls.startsWith(`${prefix}[`)) return true;
        // For display properties, remove exact matches
        if (['flex', 'grid', 'block', 'inline', 'inline-block', 'inline-flex', 'hidden'].includes(cls)) {
          return change.property === 'display';
        }
        return false;
      });
      
      classesToRemove.forEach(cls => classSet.delete(cls));
    }

    // Add the new class
    classSet.add(newClass);
  }

  return Array.from(classSet).join(' ');
}

// Get Tailwind prefix for a CSS property
function getTailwindPrefix(property: keyof ComputedStyleInfo): string | null {
  // Direct mappings
  if (property in TAILWIND_PREFIXES) {
    return TAILWIND_PREFIXES[property];
  }

  // Special cases
  switch (property) {
    case 'display': return null; // Display uses specific class names
    case 'flexDirection': return 'flex';
    case 'justifyContent': return 'justify';
    case 'alignItems': return 'items';
    case 'fontSize': return 'text';
    case 'fontWeight': return 'font';
    case 'fontFamily': return 'font';
    case 'textAlign': return 'text';
    case 'lineHeight': return 'leading';
    case 'letterSpacing': return 'tracking';
    case 'color': return 'text';
    case 'backgroundColor': return 'bg';
    case 'borderColor': return 'border';
    case 'borderWidth': return 'border';
    case 'borderRadius': return 'rounded';
    case 'boxShadow': return 'shadow';
    case 'opacity': return 'opacity';
    default: return null;
  }
}

  // Generate inline style string for non-Tailwind changes (JSX object syntax)
export function generateInlineStyle(changes: StyleChange[]): string {
  const nonTailwindChanges = changes.filter(c => !c.useTailwind);
  if (nonTailwindChanges.length === 0) return '';

  const styles = nonTailwindChanges.map(change => {
    // In JSX, style values must be quoted strings or numbers
    const value = change.newValue;
    // Check if it's a pure number (for things like opacity, zIndex)
    const isNumeric = /^-?\d+(\.\d+)?$/.test(value);
    // Quote the value for JSX object syntax - use single quotes to avoid escaping issues
    const quotedValue = isNumeric ? value : `'${value}'`;
    return `${change.property}: ${quotedValue}`;
  });

  return styles.join(', ');
}

// Parse existing inline style string to object (handles both CSS and JSX syntax)
export function parseInlineStyle(style: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!style) return result;

  // Handle JSX object syntax: { color: "#fff", fontSize: "16px" }
  // or CSS syntax: color: #fff; font-size: 16px
  
  // Try to detect if it's JSX syntax (has quotes around values or uses camelCase)
  const isJSXSyntax = style.includes(':') && (style.includes('"') || style.includes("'") || /[a-z][A-Z]/.test(style));
  
  if (isJSXSyntax) {
    // JSX syntax: property: "value" or property: value
    const declarations = style.split(',').filter(Boolean);
    for (const declaration of declarations) {
      const colonIndex = declaration.indexOf(':');
      if (colonIndex === -1) continue;
      
      const property = declaration.slice(0, colonIndex).trim();
      let value = declaration.slice(colonIndex + 1).trim();
      
      // Remove surrounding quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      if (property && value) {
        result[property] = value;
      }
    }
  } else {
    // CSS syntax: property: value;
    const declarations = style.split(';').filter(Boolean);
    for (const declaration of declarations) {
      const [property, value] = declaration.split(':').map(s => s.trim());
      if (property && value) {
        const camelProperty = kebabToCamel(property);
        result[camelProperty] = value;
      }
    }
  }

  return result;
}

// Convert kebab-case to camelCase
function kebabToCamel(str: string): string {
  return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

// Merge inline styles (JSX object syntax)
export function mergeInlineStyles(
  existing: string,
  changes: StyleChange[]
): string {
  const existingStyles = parseInlineStyle(existing);
  
  for (const change of changes) {
    if (!change.useTailwind) {
      existingStyles[change.property] = change.newValue;
    }
  }

  // Convert back to JSX object syntax with quoted values - use single quotes to avoid escaping issues
  return Object.entries(existingStyles)
    .map(([prop, val]) => {
      // Check if it's a pure number
      const isNumeric = /^-?\d+(\.\d+)?$/.test(val);
      const quotedValue = isNumeric ? val : `'${val}'`;
      return `${prop}: ${quotedValue}`;
    })
    .join(', ');
}

// Simple regex-based code updater (works without full AST parsing)
// This is a fallback when AST parsing is not available
export interface CodeUpdateResult {
  success: boolean;
  updatedCode: string;
  error?: string;
}

export function updateCodeWithChanges(
  code: string,
  elementId: string,
  changes: StyleChange[],
  elementTag?: string
): CodeUpdateResult {
  try {
    // Try to find the element by data-ve-id attribute
    const veIdPattern = new RegExp(
      `data-ve-id=["']${escapeRegex(elementId)}["']`,
      'g'
    );

    if (veIdPattern.test(code)) {
      // Element has a visual editor ID, find and update it
      return updateElementByVeId(code, elementId, changes);
    }

    // If no ve-id, try to find by context (less reliable)
    if (elementTag) {
      return updateElementByTag(code, elementTag, changes);
    }

    return {
      success: false,
      updatedCode: code,
      error: 'Could not locate element in source code',
    };
  } catch (error) {
    return {
      success: false,
      updatedCode: code,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function updateElementByVeId(
  code: string,
  elementId: string,
  changes: StyleChange[]
): CodeUpdateResult {
  // Find the JSX element containing data-ve-id
  const elementPattern = new RegExp(
    `(<\\w+[^>]*\\s)data-ve-id=["']${escapeRegex(elementId)}["']([^>]*)(className=["']([^"']*)["'])?([^>]*)>`,
    'g'
  );

  let updated = false;
  const updatedCode = code.replace(elementPattern, (match, prefix, afterId, classNameMatch, existingClassName, suffix) => {
    updated = true;
    
    // Get Tailwind changes
    const tailwindChanges = changes.filter(c => c.useTailwind);
    const styleChanges = changes.filter(c => !c.useTailwind);

    let newMatch = match;

    // Update className if there are Tailwind changes
    if (tailwindChanges.length > 0) {
      const newClassName = updateClassName(existingClassName || '', tailwindChanges);
      
      if (classNameMatch) {
        // Replace existing className
        newMatch = newMatch.replace(
          classNameMatch,
          `className="${newClassName}"`
        );
      } else {
        // Add new className attribute
        newMatch = newMatch.replace(
          prefix,
          `${prefix}className="${newClassName}" `
        );
      }
    }

    // Update or add style attribute for non-Tailwind changes
    if (styleChanges.length > 0) {
      const inlineStyle = generateInlineStyle(styleChanges);
      const stylePattern = /style=\{?\{([^}]*)\}\}?/;
      const styleMatch = newMatch.match(stylePattern);

      if (styleMatch) {
        // Merge with existing style
        const mergedStyle = mergeInlineStyles(styleMatch[1], styleChanges);
        newMatch = newMatch.replace(stylePattern, `style={{ ${mergedStyle} }}`);
      } else {
        // Add new style attribute
        newMatch = newMatch.replace('>', ` style={{ ${inlineStyle} }}>`);
      }
    }

    return newMatch;
  });

  return {
    success: updated,
    updatedCode,
    error: updated ? undefined : 'Element not found in code',
  };
}

function updateElementByTag(
  code: string,
  elementTag: string,
  changes: StyleChange[]
): CodeUpdateResult {
  // This is a very basic implementation that finds the first matching element
  // A proper implementation would use AST parsing
  const tagLower = elementTag.toLowerCase();
  const elementPattern = new RegExp(
    `<${tagLower}([^>]*)(className=["']([^"']*)["'])?([^>]*)>`,
    'i'
  );

  let updated = false;
  const updatedCode = code.replace(elementPattern, (match, prefix, classNameMatch, existingClassName, suffix) => {
    updated = true;
    
    const tailwindChanges = changes.filter(c => c.useTailwind);
    let newMatch = match;

    if (tailwindChanges.length > 0) {
      const newClassName = updateClassName(existingClassName || '', tailwindChanges);
      
      if (classNameMatch) {
        newMatch = newMatch.replace(classNameMatch, `className="${newClassName}"`);
      } else {
        newMatch = `<${elementTag} className="${newClassName}"${prefix}${suffix}>`;
      }
    }

    return newMatch;
  });

  return {
    success: updated,
    updatedCode,
    error: updated ? undefined : 'Element not found',
  };
}

// Generate full file update with direct search-replace operations
export function generateFileUpdate(
  originalCode: string,
  elementId: string,
  changes: StyleChange[],
  sourceFile?: string,
  sourceLine?: number,
  aiGenerateFunction?: (prompt: string) => Promise<string>
): CodeUpdateResult | Promise<CodeUpdateResult> {
  console.log('[generateFileUpdate] Config:', CODE_EDITOR_CONFIG);
  console.log('[generateFileUpdate] Source line:', sourceLine, 'Source file:', sourceFile);

  // Use direct search-replace approach (much faster and more reliable)
  if (CODE_EDITOR_CONFIG.useClientReplaceTool && sourceLine && sourceFile) {
    console.log('[generateFileUpdate] Using direct search-replace approach');

    // Return the promise from search-replace editing
    return generateSearchReplaceEdit(
      originalCode,
      elementId,
      changes,
      sourceFile,
      sourceLine
    );
  }

  // Fallback to AI-powered editing if enabled
  if (CODE_EDITOR_CONFIG.useAI && sourceLine && sourceFile) {
    console.log('[generateFileUpdate] Using AI-powered editing via API');

    // Return the promise from AI editing (calls /api/visual-editor/edit-code)
    return generateAICodeEdit(
      originalCode,
      elementId,
      changes,
      sourceFile,
      sourceLine,
      aiGenerateFunction
    );
  }

  console.log('[generateFileUpdate] Using regex-based editing fallback');

  // Fall back to regex-based editing (least reliable)
  return updateCodeWithChanges(originalCode, elementId, changes);
}

// Find the JSX element including opening tag, content, and closing tag
function findJSXElement(
  lines: string[],
  targetLine: number
): { startLine: number; endLine: number; openingTag: string; closingTagLine: number; elementContent: string } {
  // First, try to find an opening tag on the target line itself
  const targetLineText = lines[targetLine];
  const openTagMatch = targetLineText.match(/<(\w+)/);

  if (openTagMatch) {
    const tagName = openTagMatch[1];
    const tagStartIndex = targetLineText.indexOf('<' + tagName);

    // Check if this is a valid opening tag (not inside quotes or JSX expressions)
    let isValidTag = true;
    for (let j = 0; j < tagStartIndex; j++) {
      const char = targetLineText[j];
      if (char === '"' || char === "'") {
        const quote = char;
        j++;
        while (j < tagStartIndex && targetLineText[j] !== quote) {
          if (targetLineText[j] === '\\') j++;
          j++;
        }
        if (j >= tagStartIndex) {
          isValidTag = false;
          break;
        }
      } else if (char === '{') {
        let braceDepth = 1;
        j++;
        while (j < tagStartIndex && braceDepth > 0) {
          if (targetLineText[j] === '{') braceDepth++;
          else if (targetLineText[j] === '}') braceDepth--;
          j++;
        }
        if (braceDepth > 0) {
          isValidTag = false;
          break;
        }
      }
    }

    if (isValidTag) {
      // Found a valid opening tag on the target line, parse it
      let depth = 0;
      let tagContent = '';
      let endLine = targetLine;
      let isSelfClosing = false;

      for (let i = targetLine; i < lines.length && i <= targetLine + 20; i++) {
        tagContent += (i > targetLine ? '\n' : '') + lines[i];

        for (let j = (i === targetLine ? tagStartIndex : 0); j < lines[i].length; j++) {
          const char = lines[i][j];

          // Skip strings
          if (char === '"' || char === "'") {
            const quote = char;
            j++;
            while (j < lines[i].length && lines[i][j] !== quote) {
              if (lines[i][j] === '\\') j++;
              j++;
            }
            continue;
          }

          // Skip template literals and JSX expressions
          if (char === '{') {
            let braceDepth = 1;
            j++;
            while (j < lines[i].length && braceDepth > 0) {
              if (lines[i][j] === '{') braceDepth++;
              else if (lines[i][j] === '}') braceDepth--;
              j++;
            }
            continue;
          }

          // Check for self-closing tag
          if (char === '/' && j + 1 < lines[i].length && lines[i][j + 1] === '>') {
            isSelfClosing = true;
          }

          if (char === '<') depth++;
          else if (char === '>') {
            depth--;
            if (depth === 0) {
              endLine = i;

              const fullText = lines.slice(targetLine, endLine + 1).join('\n');
              const tagEndIndex = fullText.indexOf('>', fullText.indexOf('<' + tagName)) + 1;
              const openingTag = fullText.substring(
                fullText.indexOf('<' + tagName),
                tagEndIndex
              );

              if (isSelfClosing) {
                return { startLine: targetLine, endLine, openingTag, closingTagLine: -1, elementContent: '' };
              }

              // Find the closing tag
              const closingTagPattern = new RegExp(`</${tagName}\\s*>`);
              let closingTagLine = -1;
              let elementContent = '';
              let tagDepth = 1;

              // First check if the closing tag is on the same line as the opening tag
              const openingLine = lines[endLine];
              // Calculate the actual position where the opening tag ends in the line
              const tagStartInLine = openingLine.indexOf('<' + tagName);
              const openingTagEndPos = tagStartInLine + openingTag.length;
              const remainingOnOpeningLine = openingLine.substring(openingTagEndPos);

              const sameLineClosingMatch = remainingOnOpeningLine.match(closingTagPattern);
              if (sameLineClosingMatch) {
                const contentEnd = remainingOnOpeningLine.indexOf(sameLineClosingMatch[0]);
                elementContent = remainingOnOpeningLine.substring(0, contentEnd);
                closingTagLine = endLine;
              } else {
                for (let k = endLine + 1; k < lines.length && k <= endLine + 50; k++) {
                  const searchLine = lines[k];

                  const openings = (searchLine.match(new RegExp(`<${tagName}[\\s>]`, 'g')) || []).length;
                  const closings = (searchLine.match(closingTagPattern) || []).length;

                  tagDepth += openings - closings;

                  if (tagDepth === 0) {
                    closingTagLine = k;
                    elementContent = lines.slice(endLine + 1, k).join('\n');
                    break;
                  }
                }
              }

              return { startLine: targetLine, endLine, openingTag, closingTagLine, elementContent };
            }
          }
        }
      }
    }
  }

  // If no opening tag found on target line, search backward (fallback)
  for (let start = targetLine - 1; start >= Math.max(0, targetLine - 5); start--) {
    const line = lines[start];
    const openTagMatch = line.match(/<(\w+)/);
    if (!openTagMatch) continue;

    const tagName = openTagMatch[1];

    let depth = 0;
    let tagContent = '';
    let endLine = start;
    let isSelfClosing = false;

    for (let i = start; i < lines.length && i <= start + 20; i++) {
      tagContent += (i > start ? '\n' : '') + lines[i];

      for (let j = (i === start ? line.indexOf('<' + tagName) : 0); j < lines[i].length; j++) {
        const char = lines[i][j];

        // Skip strings
        if (char === '"' || char === "'") {
          const quote = char;
          j++;
          while (j < lines[i].length && lines[i][j] !== quote) {
            if (lines[i][j] === '\\') j++;
            j++;
          }
          continue;
        }

        if (char === '{') {
          let braceDepth = 1;
          j++;
          while (j < lines[i].length && braceDepth > 0) {
            if (lines[i][j] === '{') braceDepth++;
            else if (lines[i][j] === '}') braceDepth--;
            j++;
          }
          continue;
        }

        if (char === '/' && j + 1 < lines[i].length && lines[i][j + 1] === '>') {
          isSelfClosing = true;
        }

        if (char === '<') depth++;
        else if (char === '>') {
          depth--;
          if (depth === 0) {
            endLine = i;

            const fullText = lines.slice(start, endLine + 1).join('\n');
            const tagEndIndex = fullText.indexOf('>', fullText.indexOf('<' + tagName)) + 1;
            const openingTag = fullText.substring(
              fullText.indexOf('<' + tagName),
              tagEndIndex
            );

            if (isSelfClosing) {
              return { startLine: start, endLine, openingTag, closingTagLine: -1, elementContent: '' };
            }

            const closingTagPattern = new RegExp(`</${tagName}\\s*>`);
            let closingTagLine = -1;
            let elementContent = '';
            let tagDepth = 1;

            const openingLine = lines[endLine];
            // Calculate the actual position where the opening tag ends in the line
            const tagStartInLine = openingLine.indexOf('<' + tagName);
            const openingTagEndPos = tagStartInLine + openingTag.length;
            const remainingOnOpeningLine = openingLine.substring(openingTagEndPos);

            const sameLineClosingMatch = remainingOnOpeningLine.match(closingTagPattern);
            if (sameLineClosingMatch) {
              const contentEnd = remainingOnOpeningLine.indexOf(sameLineClosingMatch[0]);
              elementContent = remainingOnOpeningLine.substring(0, contentEnd);
              closingTagLine = endLine;
            } else {
              for (let k = endLine + 1; k < lines.length && k <= endLine + 50; k++) {
                const searchLine = lines[k];

                const openings = (searchLine.match(new RegExp(`<${tagName}[\\s>]`, 'g')) || []).length;
                const closings = (searchLine.match(closingTagPattern) || []).length;

                tagDepth += openings - closings;

                if (tagDepth === 0) {
                  closingTagLine = k;
                  elementContent = lines.slice(endLine + 1, k).join('\n');
                  break;
                }
              }
            }

            return { startLine: start, endLine, openingTag, closingTagLine, elementContent };
          }
        }
      }
    }
  }

  return { startLine: -1, endLine: -1, openingTag: '', closingTagLine: -1, elementContent: '' };
}

// Apply style changes to an opening tag
function applyChangesToOpeningTag(openingTag: string, changes: StyleChange[]): string {
  const tailwindChanges = changes.filter(c => c.useTailwind);
  const styleChanges = changes.filter(c => !c.useTailwind);
  
  let result = openingTag;
  
  // Handle className updates
  if (tailwindChanges.length > 0) {
    // Check for existing className
    const classNameMatch = result.match(/className=["']([^"']*)["']/);
    const classNameExprMatch = result.match(/className=\{([^}]+)\}/);
    
    if (classNameMatch) {
      // Update existing className string
      const newClassName = updateClassName(classNameMatch[1], tailwindChanges);
      result = result.replace(classNameMatch[0], `className="${newClassName}"`);
    } else if (classNameExprMatch) {
      // Has dynamic className - append our classes using cn() or template literal
      const existingExpr = classNameExprMatch[1];
      const newClasses = tailwindChanges
        .map(c => c.tailwindClass || cssToTailwindClass(c.property, c.newValue))
        .filter(Boolean)
        .join(' ');
      
      // Try to use cn() if it looks like it's already using it
      if (existingExpr.includes('cn(')) {
        result = result.replace(
          classNameExprMatch[0],
          `className={cn(${existingExpr.replace('cn(', '').replace(/\)$/, '')}, "${newClasses}")}`
        );
      } else {
        result = result.replace(
          classNameExprMatch[0],
          `className={\`\${${existingExpr}} ${newClasses}\`}`
        );
      }
    } else {
      // No className - add one
      const newClassName = tailwindChanges
        .map(c => c.tailwindClass || cssToTailwindClass(c.property, c.newValue))
        .filter(Boolean)
        .join(' ');
      
      // Find position to insert (after tag name)
      const tagNameMatch = result.match(/^<(\w+)/);
      if (tagNameMatch) {
        const insertPos = tagNameMatch[0].length;
        result = result.slice(0, insertPos) + ` className="${newClassName}"` + result.slice(insertPos);
      }
    }
  }
  
  // Handle style updates
  if (styleChanges.length > 0) {
    const newInlineStyle = generateInlineStyle(styleChanges);
    // Use a more robust pattern that handles nested braces
    const styleMatch = result.match(/style=\{\{([^}]*(?:\{[^}]*\}[^}]*)*)\}\}/);
    
    if (styleMatch) {
      // Merge with existing style
      const mergedStyle = mergeInlineStyles(styleMatch[1], styleChanges);
      result = result.replace(styleMatch[0], `style={{ ${mergedStyle} }}`);
    } else {
      // Add new style attribute
      const tagNameMatch = result.match(/^<(\w+)/);
      if (tagNameMatch) {
        // Insert after className if it exists, otherwise after tag name
        const classNamePos = result.indexOf('className=');
        if (classNamePos > 0) {
          // Find end of className attribute
          let pos = classNamePos + 'className='.length;
          if (result[pos] === '"' || result[pos] === "'") {
            const quote = result[pos];
            pos++;
            while (pos < result.length && result[pos] !== quote) pos++;
            pos++;
          } else if (result[pos] === '{') {
            let depth = 1;
            pos++;
            while (pos < result.length && depth > 0) {
              if (result[pos] === '{') depth++;
              else if (result[pos] === '}') depth--;
              pos++;
            }
          }
          result = result.slice(0, pos) + ` style={{ ${newInlineStyle} }}` + result.slice(pos);
        } else {
          const insertPos = tagNameMatch[0].length;
          result = result.slice(0, insertPos) + ` style={{ ${newInlineStyle} }}` + result.slice(insertPos);
        }
      }
    }
  }
  
  return result;
}

// Generate search-replace operations for visual editor changes
export async function generateSearchReplaceEdit(
  originalCode: string,
  elementId: string,
  changes: StyleChange[],
  sourceFile: string,
  sourceLine: number
): Promise<CodeUpdateResult> {
  try {
    // Find the element in the code using line-based approach
    const elementInfo = findElementByLine(originalCode, sourceLine);
    if (!elementInfo) {
      return {
        success: false,
        updatedCode: originalCode,
        error: `Could not locate element at line ${sourceLine}`,
      };
    }

    // Separate text content changes from style changes
    const textChange = changes.find(c => (c.property as string) === 'textContent');
    const styleChanges = changes.filter(c => (c.property as string) !== 'textContent');

    // Generate all search-replace operations
    const operations: Array<{ searchString: string; replaceString: string; change: StyleChange }> = [];

    // Handle text content changes
    if (textChange) {
      const lines = originalCode.split('\n');
      
      if (elementInfo.closingTagLine === elementInfo.endLine) {
        // Content is on the same line as opening tag
        const openingLine = lines[elementInfo.endLine];
        
        // Find the actual position of the opening tag in the line
        const tagMatch = elementInfo.openingTag.match(/^<(\w+)/);
        const tagName = tagMatch ? tagMatch[1] : '';
        const tagStartPos = openingLine.indexOf('<' + tagName);
        const openingTagEndPos = tagStartPos + elementInfo.openingTag.length;
        const remainingOnLine = openingLine.substring(openingTagEndPos);
        
        // Find the closing tag on the same line
        const closingTagPattern = new RegExp(`</${tagName}\\s*>`);
        const closingMatch = remainingOnLine.match(closingTagPattern);
        
        if (closingMatch) {
          const contentEnd = remainingOnLine.indexOf(closingMatch[0]);
          const currentContent = remainingOnLine.substring(0, contentEnd);
          
          // Replace the content on the same line
          const beforeContent = openingLine.substring(0, openingTagEndPos);
          const afterContent = remainingOnLine.substring(contentEnd);
          const newLine = beforeContent + textChange.newValue + afterContent;
          
          operations.push({
            searchString: openingLine,
            replaceString: newLine,
            change: textChange,
          });
        }
      } else if (elementInfo.closingTagLine !== -1) {
        // Content spans multiple lines - replace the entire content block precisely
        const contentLines = lines.slice(elementInfo.endLine + 1, elementInfo.closingTagLine);
        
        // Get the exact content as it appears in the file (preserve all whitespace)
        const exactContentBlock = contentLines.join('\n');
        
        // Trim to get the actual text content for comparison
        const trimmedContent = exactContentBlock.trim();
        
        // If the trimmed content matches what we're trying to replace, do the replacement
        if (trimmedContent === textChange.oldValue || trimmedContent.includes(textChange.oldValue)) {
          // Find the indentation pattern of the first content line
          const firstContentLine = contentLines.find(line => line.trim().length > 0);
          const indentMatch = firstContentLine ? firstContentLine.match(/^(\s*)/) : null;
          const baseIndent = indentMatch ? indentMatch[1] : '';
          
          // Replace the entire content block with properly indented new content
          const indentedNewContent = textChange.newValue.split('\n').map((line, i) => 
            i === 0 ? baseIndent + line : line
          ).join('\n');
          
          operations.push({
            searchString: exactContentBlock,
            replaceString: indentedNewContent,
            change: textChange,
          });
        } else {
          // Fallback: if we can't match exactly, try to find and replace within the content
          // Look for the old value within the content block
          const oldValueIndex = exactContentBlock.indexOf(textChange.oldValue);
          if (oldValueIndex !== -1) {
            const before = exactContentBlock.substring(0, oldValueIndex);
            const after = exactContentBlock.substring(oldValueIndex + textChange.oldValue.length);
            const newContentBlock = before + textChange.newValue + after;
            
            operations.push({
              searchString: exactContentBlock,
              replaceString: newContentBlock,
              change: textChange,
            });
          }
        }
      }
    }

    // Handle style changes - convert inline styles to Tailwind when possible
    const tailwindChanges: StyleChange[] = [];
    const inlineChanges: StyleChange[] = [];

    for (const change of styleChanges) {
      // Convert color and background changes to Tailwind even if useTailwind is false
      if (!change.useTailwind && (change.property === 'color' || change.property === 'backgroundColor')) {
        const tailwindClass = cssToTailwindClass(change.property, change.newValue);
        if (tailwindClass) {
          tailwindChanges.push({
            ...change,
            useTailwind: true,
            tailwindClass,
          });
        } else {
          inlineChanges.push(change);
        }
      } else if (change.useTailwind) {
        tailwindChanges.push(change);
      } else {
        inlineChanges.push(change);
      }
    }

    if (tailwindChanges.length > 0) {
      const searchReplace = generateGroupedTailwindSearchReplace(elementInfo.openingTag, tailwindChanges);
      if (searchReplace) {
        operations.push({
          searchString: searchReplace.searchString,
          replaceString: searchReplace.replaceString,
          change: tailwindChanges[0], // Use first change as representative
        });
      }
    }

    // Handle remaining inline style changes
    for (const change of inlineChanges) {
      const searchReplace = generateSearchReplaceStrings(elementInfo.openingTag, change);
      if (searchReplace) {
        operations.push({
          ...searchReplace,
          change,
        });
      }
    }

    if (operations.length === 0) {
      return {
        success: false,
        updatedCode: originalCode,
        error: 'No valid search-replace operations generated',
      };
    }

    // Apply all operations sequentially
    let currentCode = originalCode;
    const appliedOperations: any[] = [];
    const failedOperations: any[] = [];

    for (const operation of operations) {
      try {
        // Apply the search-replace operation
        if (currentCode.includes(operation.searchString)) {
          currentCode = currentCode.replace(operation.searchString, operation.replaceString);
          appliedOperations.push({
            searchString: operation.searchString,
            replaceString: operation.replaceString,
            change: operation.change,
          });
        } else {
          // Try to find and replace in the element context
          const elementStart = currentCode.indexOf(elementInfo.openingTag);
          if (elementStart !== -1) {
            const beforeElement = currentCode.substring(0, elementStart);
            const afterElement = currentCode.substring(elementStart);
            const updatedAfter = afterElement.replace(operation.searchString, operation.replaceString);

            if (updatedAfter !== afterElement) {
              currentCode = beforeElement + updatedAfter;
              appliedOperations.push({
                searchString: operation.searchString,
                replaceString: operation.replaceString,
                change: operation.change,
              });
            } else {
              failedOperations.push({
                searchString: operation.searchString,
                replaceString: operation.replaceString,
                change: operation.change,
                error: 'Search string not found in element',
              });
            }
          } else {
            failedOperations.push({
              searchString: operation.searchString,
              replaceString: operation.replaceString,
              change: operation.change,
              error: 'Element not found in code',
            });
          }
        }
      } catch (error) {
        failedOperations.push({
          searchString: operation.searchString,
          replaceString: operation.replaceString,
          change: operation.change,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      success: appliedOperations.length > 0,
      updatedCode: currentCode,
      error: failedOperations.length > 0 ? `Failed to apply ${failedOperations.length} operations` : undefined,
    };

  } catch (error) {
    console.error('[SearchReplace] Error:', error);
    return {
      success: false,
      updatedCode: originalCode,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Find element information by line number
function findElementByLine(code: string, lineNumber: number): any {
  const lines = code.split('\n');
  const targetLineIndex = lineNumber - 1;

  if (targetLineIndex < 0 || targetLineIndex >= lines.length) {
    return null;
  }

  // Use the existing findJSXElement function
  const elementInfo = findJSXElement(lines, targetLineIndex);

  if (elementInfo.startLine === -1) {
    return null;
  }

  return {
    openingTag: elementInfo.openingTag,
    startLine: elementInfo.startLine,
    endLine: elementInfo.endLine,
    closingTagLine: elementInfo.closingTagLine,
    elementContent: elementInfo.elementContent,
    fullElement: lines.slice(elementInfo.startLine, elementInfo.closingTagLine !== -1 ? elementInfo.closingTagLine + 1 : elementInfo.endLine + 1).join('\n'),
  };
}

// Generate search and replace strings for a change
function generateSearchReplaceStrings(openingTag: string, change: StyleChange): { searchString: string; replaceString: string } | null {
  if (change.useTailwind) {
    // Handle Tailwind class changes
    const classNameMatch = openingTag.match(/className=["']([^"']*)["']/);
    if (classNameMatch) {
      const oldClassName = classNameMatch[1];
      const newClassName = updateClassName(oldClassName, [change]);
      return {
        searchString: `className="${oldClassName}"`,
        replaceString: `className="${newClassName}"`,
      };
    } else {
      // Add new className
      const newClassName = change.tailwindClass || cssToTailwindClass(change.property, change.newValue);
      if (newClassName) {
        const tagStart = openingTag.match(/^<(\w+)/);
        if (tagStart) {
          return {
            searchString: tagStart[0],
            replaceString: `${tagStart[0]} className="${newClassName}"`,
          };
        }
      }
    }
  } else {
    // Handle inline style changes
    // Use a more robust pattern that handles nested braces
    const styleMatch = openingTag.match(/style=\{\{([^}]*(?:\{[^}]*\}[^}]*)*)\}\}/);
    const newInlineStyle = generateInlineStyle([change]);

    if (styleMatch) {
      // Merge with existing style
      const mergedStyle = mergeInlineStyles(styleMatch[1], [change]);
      return {
        searchString: `style={{ ${styleMatch[1]} }}`,
        replaceString: `style={{ ${mergedStyle} }}`,
      };
    } else {
      // Add new style
      const tagStart = openingTag.match(/^<(\w+)/);
      if (tagStart) {
        return {
          searchString: tagStart[0],
          replaceString: `${tagStart[0]} style={{ ${newInlineStyle} }}`,
        };
      }
    }
  }

  return null;
}

// Generate grouped search-replace for multiple Tailwind changes
function generateGroupedTailwindSearchReplace(openingTag: string, changes: StyleChange[]): { searchString: string; replaceString: string } | null {
  const classNameMatch = openingTag.match(/className=["']([^"']*)["']/);
  const styleMatch = openingTag.match(/style=\{\{([^}]*)\}\}/);

  // If element has inline styles, try to convert them to Tailwind classes
  if (styleMatch) {
    // Parse existing inline styles
    const existingStyles = parseInlineStyle(styleMatch[1]);

    // Create changes for existing inline styles
    const inlineStyleChanges = Object.entries(existingStyles).map(([prop, value]) => ({
      property: prop as keyof ComputedStyleInfo,
      oldValue: value,
      newValue: value,
      useTailwind: true,
      tailwindClass: cssToTailwindClass(prop as keyof ComputedStyleInfo, value) || undefined,
    }));

    // Combine with new changes
    const allChanges = [...inlineStyleChanges, ...changes];
    const newClassName = allChanges
      .map(c => c.tailwindClass || cssToTailwindClass(c.property, c.newValue))
      .filter(Boolean)
      .join(' ');

    if (newClassName) {
      // Replace inline style with className
      const tagStart = openingTag.match(/^<(\w+)/);
      if (tagStart) {
        // Use a more robust pattern that handles nested braces
        const styleAttrPattern = /\s*style=\{\{[^}]*(?:\{[^}]*\}[^}]*)*\}\}\s*/;
        // Replace style and normalize extra spaces
        let withoutStyle = openingTag.replace(styleAttrPattern, ' ').replace(/\s+/g, ' ').trim();

        // If there's already a className, update it
        if (classNameMatch) {
          const oldClassName = classNameMatch[1];
          const updatedClassName = updateClassName(oldClassName, allChanges);
          withoutStyle = withoutStyle.replace(`className="${oldClassName}"`, `className="${updatedClassName}"`);
        } else {
          // Add new className
          withoutStyle = `${tagStart[0]} className="${newClassName}"${withoutStyle.slice(tagStart[0].length)}`;
        }

        return {
          searchString: openingTag,
          replaceString: withoutStyle,
        };
      }
    }
  }

  // Normal className handling (no inline styles to convert)
  if (classNameMatch) {
    const oldClassName = classNameMatch[1];
    const newClassName = updateClassName(oldClassName, changes);
    return {
      searchString: `className="${oldClassName}"`,
      replaceString: `className="${newClassName}"`,
    };
  } else {
    // Add new className with all changes
    const newClassName = changes
      .map(c => c.tailwindClass || cssToTailwindClass(c.property, c.newValue))
      .filter(Boolean)
      .join(' ');

    if (newClassName) {
      const tagStart = openingTag.match(/^<(\w+)/);
      if (tagStart) {
        return {
          searchString: tagStart[0],
          replaceString: `${tagStart[0]} className="${newClassName}"`,
        };
      }
    }
  }

  return null;
}

export default {
  cssToTailwindClass,
  updateClassName,
  generateInlineStyle,
  parseInlineStyle,
  mergeInlineStyles,
  updateCodeWithChanges,
  generateFileUpdate,
  generateSearchReplaceEdit,
};
