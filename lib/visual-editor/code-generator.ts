// Code Generator Utilities for Visual Editor
// Handles AST parsing and code generation for applying visual edits to source files

import type { StyleChange, ComputedStyleInfo } from './types';
import {
  TAILWIND_MAPPINGS,
  TAILWIND_SPACING,
  TAILWIND_FONT_SIZES,
  TAILWIND_BORDER_RADIUS,
} from './types';

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
    if (!newClass) continue;

    // Find and remove any existing classes for this property
    const prefix = getTailwindPrefix(change.property);
    if (prefix) {
      // Remove existing classes with the same prefix
      const classesToRemove = Array.from(classSet).filter(cls => {
        // Match classes like mt-4, mb-8, text-lg, bg-blue-500, etc.
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

// Generate inline style string for non-Tailwind changes
export function generateInlineStyle(changes: StyleChange[]): string {
  const nonTailwindChanges = changes.filter(c => !c.useTailwind);
  if (nonTailwindChanges.length === 0) return '';

  const styles = nonTailwindChanges.map(change => {
    const cssProperty = camelToKebab(change.property);
    return `${cssProperty}: ${change.newValue}`;
  });

  return styles.join('; ');
}

// Convert camelCase to kebab-case
function camelToKebab(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

// Parse existing inline style string to object
export function parseInlineStyle(style: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!style) return result;

  const declarations = style.split(';').filter(Boolean);
  for (const declaration of declarations) {
    const [property, value] = declaration.split(':').map(s => s.trim());
    if (property && value) {
      const camelProperty = kebabToCamel(property);
      result[camelProperty] = value;
    }
  }

  return result;
}

// Convert kebab-case to camelCase
function kebabToCamel(str: string): string {
  return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

// Merge inline styles
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

  // Convert back to string
  return Object.entries(existingStyles)
    .map(([prop, val]) => `${camelToKebab(prop)}: ${val}`)
    .join('; ');
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

// Generate full file update with proper formatting
export function generateFileUpdate(
  originalCode: string,
  elementId: string,
  changes: StyleChange[],
  sourceFile?: string,
  sourceLine?: number
): CodeUpdateResult {
  // If we have source line info, use line-based approach
  if (sourceLine && sourceLine > 0) {
    return updateElementByLine(originalCode, sourceLine, changes);
  }

  // Try to parse line from element ID (format: "file:line:column")
  const lineFromId = parseLineFromElementId(elementId);
  if (lineFromId) {
    return updateElementByLine(originalCode, lineFromId, changes);
  }

  // Fall back to regex-based update (least reliable)
  return updateCodeWithChanges(originalCode, elementId, changes);
}

// Parse line number from element ID format "file:line:column"
function parseLineFromElementId(elementId: string): number | null {
  // Format: "src/App.tsx:11:0" -> extract line number 11
  const parts = elementId.split(':');
  if (parts.length >= 2) {
    const lineNum = parseInt(parts[parts.length - 2], 10);
    if (!isNaN(lineNum) && lineNum > 0) {
      return lineNum;
    }
  }
  return null;
}

// Update element by line number - handles JSX elements that may span multiple lines
function updateElementByLine(
  code: string,
  lineNumber: number,
  changes: StyleChange[]
): CodeUpdateResult {
  const lines = code.split('\n');
  const targetLineIndex = lineNumber - 1; // Convert to 0-indexed
  
  if (targetLineIndex < 0 || targetLineIndex >= lines.length) {
    return {
      success: false,
      updatedCode: code,
      error: `Line ${lineNumber} is out of range`,
    };
  }

  // Find the JSX element opening tag that starts at or contains this line
  // We need to handle multi-line elements like:
  // <div
  //   className="..."
  //   style={...}
  // >
  
  const { startLine, endLine, openingTag } = findJSXOpeningTag(lines, targetLineIndex);
  
  if (startLine === -1 || !openingTag) {
    return {
      success: false,
      updatedCode: code,
      error: `Could not find JSX element at line ${lineNumber}`,
    };
  }

  // Apply changes to the opening tag
  const updatedOpeningTag = applyChangesToOpeningTag(openingTag, changes);
  
  // Reconstruct the lines
  const newLines = [...lines];
  
  // Replace the lines containing the opening tag
  const linesBefore = newLines.slice(0, startLine);
  const linesAfter = newLines.slice(endLine + 1);
  
  // Preserve indentation from the first line
  const indent = lines[startLine].match(/^(\s*)/)?.[1] || '';
  const updatedLines = updatedOpeningTag.split('\n').map((line, i) => 
    i === 0 ? indent + line.trimStart() : line
  );
  
  const result = [...linesBefore, ...updatedLines, ...linesAfter].join('\n');
  
  return {
    success: true,
    updatedCode: result,
  };
}

// Find the JSX opening tag that starts at or near the given line
function findJSXOpeningTag(
  lines: string[],
  targetLine: number
): { startLine: number; endLine: number; openingTag: string } {
  // Look for opening tag starting at target line, or search backward
  for (let start = targetLine; start >= Math.max(0, targetLine - 5); start--) {
    const line = lines[start];
    
    // Check if this line contains an opening tag
    const openTagMatch = line.match(/<(\w+)/);
    if (!openTagMatch) continue;
    
    // Find where this tag ends
    let depth = 0;
    let tagContent = '';
    let endLine = start;
    
    for (let i = start; i < lines.length && i <= start + 20; i++) {
      tagContent += (i > start ? '\n' : '') + lines[i];
      
      // Count angle brackets to find the end of the opening tag
      for (let j = (i === start ? line.indexOf('<' + openTagMatch[1]) : 0); j < lines[i].length; j++) {
        const char = lines[i][j];
        
        // Skip strings
        if (char === '"' || char === "'") {
          const quote = char;
          j++;
          while (j < lines[i].length && lines[i][j] !== quote) {
            if (lines[i][j] === '\\') j++; // Skip escaped characters
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
        
        if (char === '<') depth++;
        else if (char === '>') {
          depth--;
          if (depth === 0) {
            // Found the end of the opening tag
            endLine = i;
            
            // Extract just the opening tag
            const fullText = lines.slice(start, endLine + 1).join('\n');
            const tagEndIndex = fullText.indexOf('>', fullText.indexOf('<' + openTagMatch[1])) + 1;
            const openingTag = fullText.substring(
              fullText.indexOf('<' + openTagMatch[1]),
              tagEndIndex
            );
            
            return { startLine: start, endLine, openingTag };
          }
        }
      }
    }
  }
  
  return { startLine: -1, endLine: -1, openingTag: '' };
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
    const styleMatch = result.match(/style=\{\{([^}]*)\}\}/);
    
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

export default {
  cssToTailwindClass,
  updateClassName,
  generateInlineStyle,
  parseInlineStyle,
  mergeInlineStyles,
  updateCodeWithChanges,
  generateFileUpdate,
};
