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
  
  // Resize state
  let isResizing = false;
  let resizeHandle = null;
  let resizeStartX = 0;
  let resizeStartY = 0;
  let resizeStartWidth = 0;
  let resizeStartHeight = 0;
  let resizeElement = null;
  let resizeElementId = null;

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
  let resizeHandles = new Map(); // Map of elementId -> handle elements

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

  // Create resize handles for an element
  function createResizeHandles(elementId, rect) {
    const handles = [];
    const handleSize = 10; // Increased from 8 for easier clicking
    const positions = [
      { name: 'nw', cursor: 'nwse-resize', x: -handleSize/2, y: -handleSize/2 },
      { name: 'n', cursor: 'ns-resize', x: rect.width/2 - handleSize/2, y: -handleSize/2 },
      { name: 'ne', cursor: 'nesw-resize', x: rect.width - handleSize/2, y: -handleSize/2 },
      { name: 'e', cursor: 'ew-resize', x: rect.width - handleSize/2, y: rect.height/2 - handleSize/2 },
      { name: 'se', cursor: 'nwse-resize', x: rect.width - handleSize/2, y: rect.height - handleSize/2 },
      { name: 's', cursor: 'ns-resize', x: rect.width/2 - handleSize/2, y: rect.height - handleSize/2 },
      { name: 'sw', cursor: 'nesw-resize', x: -handleSize/2, y: rect.height - handleSize/2 },
      { name: 'w', cursor: 'ew-resize', x: -handleSize/2, y: rect.height/2 - handleSize/2 },
    ];

    positions.forEach(pos => {
      const handle = document.createElement('div');
      handle.setAttribute('data-ve-overlay', 'true');
      handle.setAttribute('data-ve-handle', pos.name);
      handle.setAttribute('data-ve-element-id', elementId);
      handle.style.cssText = \`
        position: fixed;
        width: \${handleSize}px;
        height: \${handleSize}px;
        background: #2563eb;
        border: 2px solid white;
        border-radius: 2px;
        cursor: \${pos.cursor};
        z-index: 1000001;
        pointer-events: auto !important;
        left: \${rect.left + pos.x}px;
        top: \${rect.top + pos.y}px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        transition: transform 0.1s ease;
      \`;
      
      // Hover effect
      handle.addEventListener('mouseenter', () => {
        handle.style.transform = 'scale(1.2)';
        handle.style.background = '#1d4ed8';
      });
      handle.addEventListener('mouseleave', () => {
        if (!isResizing) {
          handle.style.transform = 'scale(1)';
          handle.style.background = '#2563eb';
        }
      });
      
      handle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('[Visual Editor] Handle mousedown:', pos.name, elementId);
        startResize(elementId, pos.name, e);
      });
      
      document.body.appendChild(handle);
      handles.push(handle);
    });

    return handles;
  }

  function updateResizeHandles(elementId, rect) {
    const handles = resizeHandles.get(elementId);
    if (!handles) return;

    const handleSize = 10; // Match the new size
    const positions = [
      { name: 'nw', x: -handleSize/2, y: -handleSize/2 },
      { name: 'n', x: rect.width/2 - handleSize/2, y: -handleSize/2 },
      { name: 'ne', x: rect.width - handleSize/2, y: -handleSize/2 },
      { name: 'e', x: rect.width - handleSize/2, y: rect.height/2 - handleSize/2 },
      { name: 'se', x: rect.width - handleSize/2, y: rect.height - handleSize/2 },
      { name: 's', x: rect.width/2 - handleSize/2, y: rect.height - handleSize/2 },
      { name: 'sw', x: -handleSize/2, y: rect.height - handleSize/2 },
      { name: 'w', x: -handleSize/2, y: rect.height/2 - handleSize/2 },
    ];

    handles.forEach((handle, index) => {
      const pos = positions[index];
      handle.style.left = (rect.left + pos.x) + 'px';
      handle.style.top = (rect.top + pos.y) + 'px';
    });
  }

  function removeResizeHandles(elementId) {
    const handles = resizeHandles.get(elementId);
    if (handles) {
      handles.forEach(handle => handle.parentNode?.removeChild(handle));
      resizeHandles.delete(elementId);
    }
  }

  function removeAllResizeHandles() {
    resizeHandles.forEach((handles, elementId) => {
      handles.forEach(handle => handle.parentNode?.removeChild(handle));
    });
    resizeHandles.clear();
  }

  // Resize functions
  function startResize(elementId, handle, event) {
    console.log('[Visual Editor] startResize called:', elementId, handle);
    const element = findElementById(elementId);
    if (!element) {
      console.warn('[Visual Editor] Element not found for resize:', elementId);
      return;
    }

    isResizing = true;
    resizeHandle = handle;
    resizeStartX = event.clientX;
    resizeStartY = event.clientY;
    resizeElement = element;
    resizeElementId = elementId;

    const rect = element.getBoundingClientRect();
    resizeStartWidth = rect.width;
    resizeStartHeight = rect.height;
    
    console.log('[Visual Editor] Starting resize - width:', resizeStartWidth, 'height:', resizeStartHeight);

    document.body.style.cursor = event.target.style.cursor;
    document.addEventListener('mousemove', handleResizeMove, true);
    document.addEventListener('mouseup', handleResizeEnd, true);
  }

  function handleResizeMove(event) {
    if (!isResizing || !resizeElement) return;

    const deltaX = event.clientX - resizeStartX;
    const deltaY = event.clientY - resizeStartY;

    let newWidth = resizeStartWidth;
    let newHeight = resizeStartHeight;

    // Calculate new dimensions based on handle
    switch (resizeHandle) {
      case 'e':
      case 'ne':
      case 'se':
        newWidth = Math.max(20, resizeStartWidth + deltaX);
        break;
      case 'w':
      case 'nw':
      case 'sw':
        newWidth = Math.max(20, resizeStartWidth - deltaX);
        break;
    }

    switch (resizeHandle) {
      case 's':
      case 'se':
      case 'sw':
        newHeight = Math.max(20, resizeStartHeight + deltaY);
        break;
      case 'n':
      case 'ne':
      case 'nw':
        newHeight = Math.max(20, resizeStartHeight - deltaY);
        break;
    }

    // Apply resize to element
    resizeElement.style.width = newWidth + 'px';
    resizeElement.style.height = newHeight + 'px';

    // Update overlay and handles
    const rect = resizeElement.getBoundingClientRect();
    const overlay = selectionOverlays.get(resizeElementId);
    if (overlay) {
      updateOverlay(overlay, rect, 'selected');
    }
    updateResizeHandles(resizeElementId, rect);

    // Send resize update to parent
    sendToParent({ 
      type: 'ELEMENT_RESIZED', 
      payload: { 
        elementId: resizeElementId, 
        newRect: {
          width: rect.width,
          height: rect.height,
          top: rect.top,
          left: rect.left,
          right: rect.right,
          bottom: rect.bottom,
          x: rect.x,
          y: rect.y,
        }
      } 
    });
  }

  function handleResizeEnd(event) {
    if (!isResizing || !resizeElement) return;

    const rect = resizeElement.getBoundingClientRect();
    
    // Notify parent of final size
    sendToParent({ 
      type: 'ELEMENT_RESIZED', 
      payload: { 
        elementId: resizeElementId, 
        newRect: {
          width: rect.width,
          height: rect.height,
          top: rect.top,
          left: rect.left,
          right: rect.right,
          bottom: rect.bottom,
          x: rect.x,
          y: rect.y,
        }
      } 
    });

    isResizing = false;
    resizeHandle = null;
    resizeElement = null;
    resizeElementId = null;
    document.body.style.cursor = isEnabled ? 'crosshair' : '';
    
    document.removeEventListener('mousemove', handleResizeMove, true);
    document.removeEventListener('mouseup', handleResizeEnd, true);
  }

  // Delete element function
  function deleteElement(elementId) {
    const element = findElementById(elementId);
    if (!element) {
      sendToParent({ type: 'ELEMENT_DELETED', payload: { elementId, success: false } });
      return false;
    }

    // Get parent info before deleting
    const parentElement = element.parentElement;
    
    // Remove the element from DOM
    element.remove();

    // Clear selection for this element
    selectedElements.delete(elementId);
    const overlay = selectionOverlays.get(elementId);
    if (overlay) {
      removeOverlay(overlay);
      selectionOverlays.delete(elementId);
    }
    removeResizeHandles(elementId);

    sendToParent({ type: 'ELEMENT_DELETED', payload: { elementId, success: true } });
    sendToParent({ type: 'CLEAR_SELECTION', payload: {} });
    
    return true;
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
    if (isResizing) return; // Don't process clicks while resizing
    
    // Check if clicking on a resize handle - if so, ignore (handle has its own mousedown)
    if (event.target.hasAttribute && event.target.hasAttribute('data-ve-handle')) {
      return;
    }
    
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
        removeResizeHandles(elementId);
        sendToParent({ type: 'ELEMENT_DESELECTED', payload: { elementId } });
      } else {
        selectedElements.set(elementId, element);
        const overlay = createOverlay();
        selectionOverlays.set(elementId, overlay);
        const rect = element.getBoundingClientRect();
        updateOverlay(overlay, rect, 'selected');
        
        // Create resize handles for the element
        const handles = createResizeHandles(elementId, rect);
        resizeHandles.set(elementId, handles);
        
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
      const rect = element.getBoundingClientRect();
      updateOverlay(overlay, rect, 'selected');
      
      // Create resize handles for the element
      const handles = createResizeHandles(elementId, rect);
      resizeHandles.set(elementId, handles);
      
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
    removeAllResizeHandles();
  }

  function handleKeyDown(event) {
    if (!isEnabled) return;

    // Escape to clear selection
    if (event.key === 'Escape') {
      clearSelection();
      sendToParent({ type: 'CLEAR_SELECTION', payload: {} });
    }
    
    // Delete or Backspace to delete selected elements
    if (event.key === 'Delete' || event.key === 'Backspace') {
      // Don't delete if user is typing in an input
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.isContentEditable) {
        return;
      }
      
      event.preventDefault();
      
      // Delete all selected elements
      const elementsToDelete = Array.from(selectedElements.keys());
      elementsToDelete.forEach(elementId => {
        deleteElement(elementId);
      });
    }
  }

  function handleScroll() {
    // Update overlay positions on scroll
    selectionOverlays.forEach((overlay, elementId) => {
      const element = findElementById(elementId);
      if (element) {
        const rect = element.getBoundingClientRect();
        updateOverlay(overlay, rect, 'selected');
        updateResizeHandles(elementId, rect);
      }
    });
    
    if (hoverOverlay && hoveredElement) {
      updateOverlay(hoverOverlay, hoveredElement.getBoundingClientRect(), 'hover');
    }
  }

  function handleResize() {
    handleScroll();
  }

  // Apply style changes from parent (for individual elements)
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

  // Apply CSS variables to root (for themes) - uses same setProperty pattern as applyStyleChanges
  function applyRootStyles(cssVars) {
    const root = document.documentElement;
    Object.entries(cssVars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
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
    
    // Debug: Log and acknowledge theme/drag messages
    if (message.type.includes('THEME') || message.type.includes('DRAG')) {
      console.log('[Visual Editor Iframe] Received message:', message.type, message.payload);
      // Send acknowledgment to parent so they can see in parent console
      sendToParent({ 
        type: 'DEBUG_MESSAGE_RECEIVED', 
        payload: { receivedType: message.type, timestamp: Date.now() } 
      });
    }

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

      case 'DELETE_ELEMENT':
        deleteElement(message.payload.elementId);
        break;

      case 'RESIZE_ELEMENT':
        const resizeEl = findElementById(message.payload.elementId);
        if (resizeEl) {
          if (message.payload.width) {
            resizeEl.style.width = message.payload.width;
          }
          if (message.payload.height) {
            resizeEl.style.height = message.payload.height;
          }
          // Update overlay and handles
          const rect = resizeEl.getBoundingClientRect();
          const overlay = selectionOverlays.get(message.payload.elementId);
          if (overlay) {
            updateOverlay(overlay, rect, 'selected');
          }
          updateResizeHandles(message.payload.elementId, rect);
          sendToParent({ 
            type: 'ELEMENT_RESIZED', 
            payload: { 
              elementId: message.payload.elementId, 
              newRect: {
                width: rect.width,
                height: rect.height,
                top: rect.top,
                left: rect.left,
                right: rect.right,
                bottom: rect.bottom,
                x: rect.x,
                y: rect.y,
              }
            } 
          });
        }
        break;

      case 'REQUEST_ELEMENT_INFO':
        const element = findElementById(message.payload.elementId);
        if (element) {
          const info = getElementInfo(element);
          sendToParent({ type: 'ELEMENT_INFO_RESPONSE', payload: { element: info } });
        }
        break;

      // Theme preview handlers
      case 'APPLY_THEME_PREVIEW':
        applyThemePreview(message.payload.themeVars);
        // Send confirmation back to parent
        sendToParent({ type: 'THEME_PREVIEW_APPLIED', payload: { success: true, varsCount: Object.keys(message.payload.themeVars || {}).length } });
        break;

      case 'CLEAR_THEME_PREVIEW':
        clearThemePreview();
        sendToParent({ type: 'THEME_PREVIEW_CLEARED', payload: { success: true } });
        break;

      // Undo/Redo style handlers
      case 'UNDO_STYLE':
      case 'REDO_STYLE':
        if (message.payload.elementId && message.payload.changes) {
          applyStyleChanges(message.payload.elementId, message.payload.changes);
        }
        break;

      // Drag and drop handlers
      case 'DRAG_ELEMENT_START':
        startDragMode(message.payload.elementType, message.payload.content);
        break;

      case 'DRAG_ELEMENT_END':
        endDragMode();
        break;

      case 'INSERT_ELEMENT':
        insertElement(message.payload.content, message.payload.targetElementId, message.payload.position);
        break;
    }
  }

  // Theme preview functions - uses applyRootStyles for consistency with applyStyleChanges pattern
  function applyThemePreview(themeVars) {
    console.log('[Visual Editor] Applying theme preview, vars count:', themeVars ? Object.keys(themeVars).length : 0);
    
    if (!themeVars || typeof themeVars !== 'object') {
      console.warn('[Visual Editor] No theme variables provided');
      return;
    }
    
    // Apply theme variables using the same setProperty pattern as applyStyleChanges
    // This ensures consistent behavior with pending style changes
    applyRootStyles(themeVars);
    
    console.log('[Visual Editor] Theme preview applied successfully');
    console.log('[Visual Editor] Applied', Object.keys(themeVars).length, 'CSS variables');
  }

  function clearThemePreview() {
    const root = document.documentElement;
    const computedStyle = window.getComputedStyle(root);
    
    // Get all CSS custom properties that start with '--'
    const existingVars = [];
    for (let i = 0; i < computedStyle.length; i++) {
      const prop = computedStyle[i];
      if (prop.startsWith('--')) {
        existingVars.push(prop);
      }
    }
    
    // Remove all theme variables
    existingVars.forEach(prop => {
      root.style.removeProperty(prop);
    });
    
    console.log('[Visual Editor] Theme preview cleared, removed', existingVars.length, 'CSS variables');
  }

  // Drag and drop functions
  let isDraggingElement = false;
  let dragElementType = null;
  let dragElementContent = null;
  let dropTargetOverlay = null;
  let currentDropTarget = null;
  let dropPosition = 'inside'; // 'before', 'after', 'inside'

  function startDragMode(elementType, content) {
    isDraggingElement = true;
    dragElementType = elementType;
    dragElementContent = content;
    document.body.style.cursor = 'copy';
    
    // Create drop target overlay
    if (!dropTargetOverlay) {
      dropTargetOverlay = document.createElement('div');
      dropTargetOverlay.setAttribute('data-ve-overlay', 'true');
      dropTargetOverlay.id = 've-drop-overlay';
      dropTargetOverlay.style.cssText = \`
        position: fixed;
        pointer-events: none;
        z-index: 999998;
        box-sizing: border-box;
        border: 2px dashed #22c55e;
        background: rgba(34, 197, 94, 0.1);
        display: none;
      \`;
      document.body.appendChild(dropTargetOverlay);
    }
    
    // Add drag-specific event listeners
    document.addEventListener('mousemove', handleDragMove, true);
    document.addEventListener('click', handleDrop, true);
    document.addEventListener('keydown', handleDragKeyDown, true);
    
    console.log('[Visual Editor] Drag mode started:', elementType);
  }

  function endDragMode() {
    isDraggingElement = false;
    dragElementType = null;
    dragElementContent = null;
    currentDropTarget = null;
    document.body.style.cursor = isEnabled ? 'crosshair' : '';
    
    // Hide drop overlay
    if (dropTargetOverlay) {
      dropTargetOverlay.style.display = 'none';
    }
    
    // Remove drag event listeners
    document.removeEventListener('mousemove', handleDragMove, true);
    document.removeEventListener('click', handleDrop, true);
    document.removeEventListener('keydown', handleDragKeyDown, true);
    
    console.log('[Visual Editor] Drag mode ended');
  }

  function handleDragMove(event) {
    if (!isDraggingElement) return;
    
    const target = document.elementFromPoint(event.clientX, event.clientY);
    if (!target || shouldIgnoreElement(target)) {
      if (dropTargetOverlay) dropTargetOverlay.style.display = 'none';
      currentDropTarget = null;
      return;
    }
    
    // Find valid drop container
    const dropTarget = findDropTarget(target);
    if (!dropTarget) {
      if (dropTargetOverlay) dropTargetOverlay.style.display = 'none';
      currentDropTarget = null;
      return;
    }
    
    currentDropTarget = dropTarget;
    
    // Determine drop position based on mouse position
    const rect = dropTarget.getBoundingClientRect();
    const mouseY = event.clientY;
    const relativeY = (mouseY - rect.top) / rect.height;
    
    if (relativeY < 0.25) {
      dropPosition = 'before';
    } else if (relativeY > 0.75) {
      dropPosition = 'after';
    } else {
      dropPosition = 'inside';
    }
    
    // Update drop overlay
    if (dropTargetOverlay) {
      dropTargetOverlay.style.display = 'block';
      
      if (dropPosition === 'before') {
        dropTargetOverlay.style.left = rect.left + 'px';
        dropTargetOverlay.style.top = (rect.top - 2) + 'px';
        dropTargetOverlay.style.width = rect.width + 'px';
        dropTargetOverlay.style.height = '4px';
        dropTargetOverlay.style.background = '#22c55e';
        dropTargetOverlay.style.border = 'none';
      } else if (dropPosition === 'after') {
        dropTargetOverlay.style.left = rect.left + 'px';
        dropTargetOverlay.style.top = (rect.bottom - 2) + 'px';
        dropTargetOverlay.style.width = rect.width + 'px';
        dropTargetOverlay.style.height = '4px';
        dropTargetOverlay.style.background = '#22c55e';
        dropTargetOverlay.style.border = 'none';
      } else {
        dropTargetOverlay.style.left = rect.left + 'px';
        dropTargetOverlay.style.top = rect.top + 'px';
        dropTargetOverlay.style.width = rect.width + 'px';
        dropTargetOverlay.style.height = rect.height + 'px';
        dropTargetOverlay.style.background = 'rgba(34, 197, 94, 0.1)';
        dropTargetOverlay.style.border = '2px dashed #22c55e';
      }
    }
  }

  function findDropTarget(element) {
    // Valid drop containers
    const validContainers = ['DIV', 'SECTION', 'ARTICLE', 'MAIN', 'ASIDE', 'HEADER', 'FOOTER', 'NAV', 'FORM', 'UL', 'OL', 'BODY'];
    
    let current = element;
    while (current && current !== document.body) {
      if (validContainers.includes(current.tagName) && !current.hasAttribute('data-ve-overlay')) {
        return current;
      }
      current = current.parentElement;
    }
    
    // Default to body if no valid container found
    return document.body;
  }

  function handleDrop(event) {
    if (!isDraggingElement || !currentDropTarget || !dragElementContent) {
      endDragMode();
      return;
    }
    
    event.preventDefault();
    event.stopPropagation();
    
    // Parse the JSX content and create HTML element
    const htmlContent = jsxToHtml(dragElementContent);
    
    // Create a temporary container to parse the HTML
    const temp = document.createElement('div');
    temp.innerHTML = htmlContent;
    const newElement = temp.firstElementChild;
    
    if (!newElement) {
      console.warn('[Visual Editor] Failed to create element');
      endDragMode();
      return;
    }
    
    // Generate unique ID for the new element
    const elementId = generateElementId(newElement);
    
    // Insert element based on position
    if (dropPosition === 'before') {
      currentDropTarget.parentNode.insertBefore(newElement, currentDropTarget);
    } else if (dropPosition === 'after') {
      currentDropTarget.parentNode.insertBefore(newElement, currentDropTarget.nextSibling);
    } else {
      currentDropTarget.appendChild(newElement);
    }
    
    // Notify parent about the insertion
    sendToParent({
      type: 'ELEMENT_INSERTED',
      payload: {
        elementId,
        content: dragElementContent,
        targetElementId: generateElementId(currentDropTarget),
        position: dropPosition,
        parentTag: currentDropTarget.tagName,
      }
    });
    
    console.log('[Visual Editor] Element inserted:', elementId, 'position:', dropPosition);
    
    endDragMode();
  }

  function handleDragKeyDown(event) {
    // Cancel drag on Escape
    if (event.key === 'Escape') {
      endDragMode();
      sendToParent({ type: 'DRAG_CANCELLED', payload: {} });
    }
  }

  // Convert JSX-like content to HTML (basic conversion)
  function jsxToHtml(jsx) {
    if (!jsx) return '';
    
    return jsx
      // Convert className to class
      .replace(/className=/g, 'class=')
      // Convert JSX expressions {value} to empty (remove them)
      .replace(/\\{[^}]+\\}/g, '')
      // Handle self-closing tags
      .replace(/<(\\w+)([^>]*)\\/>/g, '<$1$2></$1>')
      // Clean up any double spaces
      .replace(/\\s+/g, ' ')
      .trim();
  }

  function insertElement(content, targetElementId, position) {
    const target = targetElementId ? findElementById(targetElementId) : document.body;
    if (!target) return;
    
    const htmlContent = jsxToHtml(content);
    const temp = document.createElement('div');
    temp.innerHTML = htmlContent;
    const newElement = temp.firstElementChild;
    
    if (!newElement) return;
    
    if (position === 'before') {
      target.parentNode.insertBefore(newElement, target);
    } else if (position === 'after') {
      target.parentNode.insertBefore(newElement, target.nextSibling);
    } else {
      target.appendChild(newElement);
    }
    
    const elementId = generateElementId(newElement);
    sendToParent({
      type: 'ELEMENT_INSERTED',
      payload: { elementId, content, position }
    });
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
