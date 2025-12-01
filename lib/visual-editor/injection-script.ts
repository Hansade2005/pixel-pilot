// Visual Editor Iframe Injection Script
// This script is injected into the preview iframe to enable visual editing capabilities
// Works with both Vite React and Next.js templates

export const VISUAL_EDITOR_INJECTION_SCRIPT = `
(function() {
  // Prevent multiple initializations
  if (window.__VISUAL_EDITOR_INITIALIZED__) return;
  window.__VISUAL_EDITOR_INITIALIZED__ = true;

  // Configuration
  let isEnabled = false;
  let selectedElements = new Map();
  let hoveredElement = null;
  const elementIdMap = new WeakMap();
  let nextElementId = 1;

  // Utility functions
  function generateElementId(element) {
    if (elementIdMap.has(element)) {
      return elementIdMap.get(element);
    }
    
    // Try to use data-ve-id if exists (from Vite plugin)
    const existingId = element.getAttribute('data-ve-id');
    if (existingId) {
      elementIdMap.set(element, existingId);
      return existingId;
    }
    
    // Generate a unique ID based on DOM path
    const id = 've-' + nextElementId++;
    element.setAttribute('data-ve-id', id);
    elementIdMap.set(element, id);
    return id;
  }

  function getComputedStyleInfo(element) {
    const computed = window.getComputedStyle(element);
    return {
      display: computed.display,
      position: computed.position,
      flexDirection: computed.flexDirection,
      justifyContent: computed.justifyContent,
      alignItems: computed.alignItems,
      gap: computed.gap,
      marginTop: computed.marginTop,
      marginRight: computed.marginRight,
      marginBottom: computed.marginBottom,
      marginLeft: computed.marginLeft,
      paddingTop: computed.paddingTop,
      paddingRight: computed.paddingRight,
      paddingBottom: computed.paddingBottom,
      paddingLeft: computed.paddingLeft,
      width: computed.width,
      height: computed.height,
      minWidth: computed.minWidth,
      maxWidth: computed.maxWidth,
      minHeight: computed.minHeight,
      maxHeight: computed.maxHeight,
      fontSize: computed.fontSize,
      fontWeight: computed.fontWeight,
      fontFamily: computed.fontFamily,
      lineHeight: computed.lineHeight,
      letterSpacing: computed.letterSpacing,
      textAlign: computed.textAlign,
      textDecoration: computed.textDecoration,
      color: computed.color,
      backgroundColor: computed.backgroundColor,
      borderColor: computed.borderColor,
      borderWidth: computed.borderWidth,
      borderStyle: computed.borderStyle,
      borderRadius: computed.borderRadius,
      boxShadow: computed.boxShadow,
      opacity: computed.opacity,
    };
  }

  function getInlineStyles(element) {
    const styles = {};
    const style = element.style;
    for (let i = 0; i < style.length; i++) {
      const prop = style[i];
      styles[prop] = style.getPropertyValue(prop);
    }
    return styles;
  }

  function isInteractiveElement(element) {
    const interactiveTags = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'LABEL'];
    return interactiveTags.includes(element.tagName);
  }

  function isContainerElement(element) {
    const containerTags = ['DIV', 'SECTION', 'ARTICLE', 'MAIN', 'HEADER', 'FOOTER', 'NAV', 'ASIDE', 'FORM', 'UL', 'OL', 'LI'];
    return containerTags.includes(element.tagName);
  }

  function shouldIgnoreElement(element) {
    // Ignore script, style, and meta elements
    const ignoreTags = ['SCRIPT', 'STYLE', 'META', 'LINK', 'HEAD', 'HTML', 'NOSCRIPT'];
    if (ignoreTags.includes(element.tagName)) return true;
    
    // Ignore visual editor overlay elements
    if (element.closest('[data-ve-overlay]')) return true;
    
    // Ignore elements with display: none or visibility: hidden
    const computed = window.getComputedStyle(element);
    if (computed.display === 'none' || computed.visibility === 'hidden') return true;
    
    return false;
  }

  function getTextContent(element) {
    // Get only the FIRST direct text node content
    // This matches what updateTextContent edits, preventing duplication
    for (const node of element.childNodes) {
      if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
        return node.textContent.trim();
      }
    }
    return '';
  }

  function getElementInfo(element) {
    if (shouldIgnoreElement(element)) return null;

    const id = generateElementId(element);
    const rect = element.getBoundingClientRect();
    
    // Get source file info from data attributes (if Vite plugin is used)
    const sourceFile = element.getAttribute('data-ve-file');
    const sourceLine = element.getAttribute('data-ve-line');

    return {
      id,
      tagName: element.tagName,
      textContent: getTextContent(element),
      computedStyles: getComputedStyleInfo(element),
      inlineStyles: getInlineStyles(element),
      className: element.className || '',
      rect: {
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        x: rect.x,
        y: rect.y,
      },
      sourceFile: sourceFile || undefined,
      sourceLine: sourceLine ? parseInt(sourceLine, 10) : undefined,
      isContainer: isContainerElement(element),
      parentId: element.parentElement ? generateElementId(element.parentElement) : undefined,
      childrenIds: Array.from(element.children)
        .filter(child => !shouldIgnoreElement(child))
        .map(child => generateElementId(child)),
    };
  }

  function findElementById(id) {
    return document.querySelector('[data-ve-id="' + id + '"]');
  }

  function sendToParent(message) {
    window.parent.postMessage(message, '*');
  }

  // Create highlight overlay
  let hoverOverlay = null;
  let selectionOverlays = new Map();

  function createOverlay() {
    const overlay = document.createElement('div');
    overlay.setAttribute('data-ve-overlay', 'true');
    overlay.style.cssText = \`
      position: fixed;
      pointer-events: none;
      z-index: 999999;
      box-sizing: border-box;
    \`;
    document.body.appendChild(overlay);
    return overlay;
  }

  function updateOverlay(overlay, rect, type) {
    if (!overlay) return;
    
    const isHover = type === 'hover';
    const color = isHover ? 'rgba(59, 130, 246, 0.5)' : 'rgba(37, 99, 235, 0.7)';
    const bgColor = isHover ? 'rgba(59, 130, 246, 0.05)' : 'rgba(37, 99, 235, 0.05)';
    
    overlay.style.cssText = \`
      position: fixed;
      pointer-events: none;
      z-index: 999999;
      box-sizing: border-box;
      top: \${rect.top}px;
      left: \${rect.left}px;
      width: \${rect.width}px;
      height: \${rect.height}px;
      border: 2px solid \${color};
      background: \${bgColor};
      transition: all 0.1s ease;
    \`;
  }

  function removeOverlay(overlay) {
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
  }

  // Event handlers
  function handleMouseMove(event) {
    if (!isEnabled) return;
    
    const element = document.elementFromPoint(event.clientX, event.clientY);
    if (!element || shouldIgnoreElement(element)) {
      if (hoveredElement) {
        hoveredElement = null;
        removeOverlay(hoverOverlay);
        hoverOverlay = null;
        sendToParent({ type: 'ELEMENT_HOVERED', payload: { element: null } });
      }
      return;
    }

    const elementId = generateElementId(element);
    if (hoveredElement !== element && !selectedElements.has(elementId)) {
      hoveredElement = element;
      
      if (!hoverOverlay) {
        hoverOverlay = createOverlay();
      }
      
      const rect = element.getBoundingClientRect();
      updateOverlay(hoverOverlay, rect, 'hover');
      
      const elementInfo = getElementInfo(element);
      sendToParent({ type: 'ELEMENT_HOVERED', payload: { element: elementInfo } });
    }
  }

  function handleClick(event) {
    if (!isEnabled) return;
    
    const element = document.elementFromPoint(event.clientX, event.clientY);
    if (!element || shouldIgnoreElement(element)) return;

    event.preventDefault();
    event.stopPropagation();

    const elementId = generateElementId(element);
    const isMultiSelect = event.ctrlKey || event.metaKey;

    if (isMultiSelect) {
      // Toggle selection
      if (selectedElements.has(elementId)) {
        selectedElements.delete(elementId);
        const overlay = selectionOverlays.get(elementId);
        removeOverlay(overlay);
        selectionOverlays.delete(elementId);
        sendToParent({ type: 'ELEMENT_DESELECTED', payload: { elementId } });
      } else {
        selectedElements.set(elementId, element);
        const overlay = createOverlay();
        selectionOverlays.set(elementId, overlay);
        updateOverlay(overlay, element.getBoundingClientRect(), 'selected');
        
        const elementInfo = getElementInfo(element);
        sendToParent({ 
          type: 'ELEMENT_SELECTED', 
          payload: { elements: [elementInfo], isMultiSelect: true } 
        });
      }
    } else {
      // Single select - clear previous selection
      clearSelection();
      
      selectedElements.set(elementId, element);
      const overlay = createOverlay();
      selectionOverlays.set(elementId, overlay);
      updateOverlay(overlay, element.getBoundingClientRect(), 'selected');
      
      const elementInfo = getElementInfo(element);
      sendToParent({ 
        type: 'ELEMENT_SELECTED', 
        payload: { elements: [elementInfo], isMultiSelect: false } 
      });
    }

    // Clear hover state
    if (hoverOverlay) {
      removeOverlay(hoverOverlay);
      hoverOverlay = null;
    }
    hoveredElement = null;
  }

  function clearSelection() {
    selectedElements.clear();
    selectionOverlays.forEach((overlay) => removeOverlay(overlay));
    selectionOverlays.clear();
  }

  function handleKeyDown(event) {
    if (!isEnabled) return;

    // Escape to clear selection
    if (event.key === 'Escape') {
      clearSelection();
      sendToParent({ type: 'CLEAR_SELECTION', payload: {} });
    }
  }

  function handleScroll() {
    // Update overlay positions on scroll
    selectionOverlays.forEach((overlay, elementId) => {
      const element = findElementById(elementId);
      if (element) {
        updateOverlay(overlay, element.getBoundingClientRect(), 'selected');
      }
    });
    
    if (hoverOverlay && hoveredElement) {
      updateOverlay(hoverOverlay, hoveredElement.getBoundingClientRect(), 'hover');
    }
  }

  function handleResize() {
    handleScroll();
  }

  // Apply style changes from parent
  function applyStyleChanges(elementId, changes) {
    const element = findElementById(elementId);
    if (!element) return false;

    changes.forEach(change => {
      const cssProperty = camelToKebab(change.property);
      element.style.setProperty(cssProperty, change.newValue);
    });

    // Update selection overlay
    const overlay = selectionOverlays.get(elementId);
    if (overlay) {
      updateOverlay(overlay, element.getBoundingClientRect(), 'selected');
    }

    sendToParent({ type: 'STYLE_APPLIED', payload: { elementId, success: true } });
    return true;
  }

  function camelToKebab(str) {
    return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  }

  // Update text content
  function updateTextContent(elementId, text) {
    const element = findElementById(elementId);
    if (!element) return false;

    // Find the first text node and update only that one
    // For elements with mixed content (text + elements), we only edit the first text node
    let firstTextNode = null;
    for (const node of element.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        firstTextNode = node;
        break;
      }
    }
    
    if (firstTextNode) {
      firstTextNode.textContent = text;
      return true;
    }
    
    // If no text node exists, prepend one
    element.insertBefore(document.createTextNode(text), element.firstChild);
    return true;
  }

  // Message handler from parent
  function handleMessage(event) {
    const message = event.data;
    if (!message || !message.type) return;

    switch (message.type) {
      case 'VISUAL_EDITOR_INIT':
      case 'VISUAL_EDITOR_TOGGLE':
        isEnabled = message.payload.enabled;
        if (!isEnabled) {
          clearSelection();
          if (hoverOverlay) {
            removeOverlay(hoverOverlay);
            hoverOverlay = null;
          }
          hoveredElement = null;
        }
        // Update cursor style
        document.body.style.cursor = isEnabled ? 'crosshair' : '';
        break;

      case 'CLEAR_SELECTION':
        clearSelection();
        break;

      case 'APPLY_STYLE':
        applyStyleChanges(message.payload.elementId, message.payload.changes);
        break;

      case 'UPDATE_TEXT':
        updateTextContent(message.payload.elementId, message.payload.text);
        break;

      case 'REQUEST_ELEMENT_INFO':
        const element = findElementById(message.payload.elementId);
        if (element) {
          const info = getElementInfo(element);
          sendToParent({ type: 'ELEMENT_INFO_RESPONSE', payload: { element: info } });
        }
        break;
    }
  }

  // Initialize event listeners
  function init() {
    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    window.addEventListener('message', handleMessage);

    // Prevent default click behavior when enabled
    document.addEventListener('click', (e) => {
      if (isEnabled && !e.target.closest('[data-ve-overlay]')) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);

    // Notify parent that we're ready
    sendToParent({ type: 'VISUAL_EDITOR_READY', payload: {} });
    
    console.log('[Visual Editor] Initialized');
  }

  // Run initialization
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
`;

// Function to inject the visual editor script into an iframe
export function injectVisualEditorScript(iframe: HTMLIFrameElement): boolean {
  try {
    if (!iframe.contentWindow || !iframe.contentDocument) {
      console.warn('[Visual Editor] Cannot access iframe content');
      return false;
    }

    // Check if already injected
    if ((iframe.contentWindow as any).__VISUAL_EDITOR_INITIALIZED__) {
      console.log('[Visual Editor] Already initialized in iframe');
      return true;
    }

    // Method 1: Try direct script injection
    try {
      const scriptElement = iframe.contentDocument.createElement('script');
      scriptElement.textContent = VISUAL_EDITOR_INJECTION_SCRIPT;
      iframe.contentDocument.head.appendChild(scriptElement);
      console.log('[Visual Editor] Injected via script element');
      return true;
    } catch (scriptError) {
      console.warn('[Visual Editor] Script element injection failed:', scriptError);
    }

    // Method 2: Try eval (may be blocked by CSP)
    try {
      (iframe.contentWindow as any).eval(VISUAL_EDITOR_INJECTION_SCRIPT);
      console.log('[Visual Editor] Injected via eval');
      return true;
    } catch (evalError) {
      console.warn('[Visual Editor] Eval injection failed:', evalError);
    }

    // Method 3: Post the script to iframe (requires iframe to handle it)
    iframe.contentWindow.postMessage({
      type: 'VISUAL_EDITOR_INJECT_SCRIPT',
      script: VISUAL_EDITOR_INJECTION_SCRIPT,
    }, '*');
    console.log('[Visual Editor] Sent script via postMessage');
    
    return true;
  } catch (error) {
    console.error('[Visual Editor] Failed to inject script:', error);
    return false;
  }
}

// Vite plugin for adding source file info to JSX elements
// This can be used in Vite React or Next.js projects
export const VITE_VISUAL_EDITOR_PLUGIN_CODE = `
// vite-plugin-visual-editor.ts
// Add this plugin to your Vite config to enable source mapping for visual editor

import { Plugin } from 'vite';
import * as babel from '@babel/core';
import * as t from '@babel/types';

export function visualEditorPlugin(): Plugin {
  return {
    name: 'vite-visual-editor',
    enforce: 'pre',
    transform(code, id) {
      // Only process JSX/TSX files
      if (!id.match(/\\.[jt]sx?$/)) return null;
      if (id.includes('node_modules')) return null;

      try {
        const result = babel.transformSync(code, {
          filename: id,
          presets: [
            ['@babel/preset-react', { runtime: 'automatic' }],
            '@babel/preset-typescript',
          ],
          plugins: [
            function visualEditorBabelPlugin() {
              let elementIndex = 0;
              
              return {
                visitor: {
                  JSXOpeningElement(path, state) {
                    const { node } = path;
                    const loc = node.loc;
                    
                    if (!loc) return;
                    
                    // Add data-ve-id attribute
                    const idAttr = t.jsxAttribute(
                      t.jsxIdentifier('data-ve-id'),
                      t.stringLiteral(\`\${id}:\${loc.start.line}:\${elementIndex++}\`)
                    );
                    
                    // Add data-ve-file attribute
                    const fileAttr = t.jsxAttribute(
                      t.jsxIdentifier('data-ve-file'),
                      t.stringLiteral(id)
                    );
                    
                    // Add data-ve-line attribute
                    const lineAttr = t.jsxAttribute(
                      t.jsxIdentifier('data-ve-line'),
                      t.stringLiteral(String(loc.start.line))
                    );
                    
                    node.attributes.push(idAttr, fileAttr, lineAttr);
                  },
                },
              };
            },
          ],
          sourceMaps: true,
        });

        if (result && result.code) {
          return {
            code: result.code,
            map: result.map,
          };
        }
      } catch (error) {
        console.warn('[Visual Editor Plugin] Transform error:', error);
      }

      return null;
    },
  };
}
`;

export default VISUAL_EDITOR_INJECTION_SCRIPT;
