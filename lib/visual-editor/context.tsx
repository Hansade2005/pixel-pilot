"use client";

import React, { 
  createContext, 
  useContext, 
  useReducer, 
  useCallback, 
  useEffect,
  useRef,
  type ReactNode 
} from 'react';
import type {
  VisualEditorState,
  ElementInfo,
  ElementSelection,
  StyleChange,
  VisualEditorTool,
  SidebarPanel,
  HistoryEntry,
  VisualEditorConfig,
  VisualEditorMessage,
} from './types';
import { DEFAULT_VISUAL_EDITOR_CONFIG } from './types';

// Initial state for the visual editor
const initialState: VisualEditorState = {
  isEnabled: false,
  selectedElements: [],
  hoveredElement: null,
  pendingChanges: new Map(),
  history: [],
  historyIndex: -1,
  activeTool: 'select',
  sidebarOpen: false,
  activePanel: 'styles',
};

// Action types for the reducer
type VisualEditorAction =
  | { type: 'TOGGLE_ENABLED'; payload: boolean }
  | { type: 'SET_HOVERED_ELEMENT'; payload: ElementInfo | null }
  | { type: 'SELECT_ELEMENT'; payload: { element: ElementInfo; isMultiSelect: boolean } }
  | { type: 'DESELECT_ELEMENT'; payload: string }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'SET_SELECTED_ELEMENTS'; payload: ElementSelection[] }
  | { type: 'ADD_PENDING_CHANGE'; payload: { elementId: string; changes: StyleChange[] } }
  | { type: 'CLEAR_PENDING_CHANGES' }
  | { type: 'APPLY_CHANGES'; payload: { elementId: string; description: string } }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'SET_ACTIVE_TOOL'; payload: VisualEditorTool }
  | { type: 'SET_SIDEBAR_OPEN'; payload: boolean }
  | { type: 'SET_ACTIVE_PANEL'; payload: SidebarPanel }
  | { type: 'UPDATE_ELEMENT_RECT'; payload: { elementId: string; rect: DOMRect } };

// Reducer function
function visualEditorReducer(
  state: VisualEditorState,
  action: VisualEditorAction
): VisualEditorState {
  switch (action.type) {
    case 'TOGGLE_ENABLED':
      return {
        ...state,
        isEnabled: action.payload,
        // Clear selection when disabling
        selectedElements: action.payload ? state.selectedElements : [],
        hoveredElement: action.payload ? state.hoveredElement : null,
        sidebarOpen: action.payload ? state.sidebarOpen : false,
      };

    case 'SET_HOVERED_ELEMENT':
      return {
        ...state,
        hoveredElement: action.payload,
      };

    case 'SELECT_ELEMENT': {
      const { element, isMultiSelect } = action.payload;
      const existingIndex = state.selectedElements.findIndex(
        sel => sel.elementId === element.id
      );

      if (existingIndex >= 0) {
        // Element already selected - deselect it in multi-select mode
        if (isMultiSelect) {
          return {
            ...state,
            selectedElements: state.selectedElements.filter(
              (_, i) => i !== existingIndex
            ),
          };
        }
        // In single-select mode, keep it selected
        return state;
      }

      const newSelection: ElementSelection = {
        elementId: element.id,
        element,
        isMultiSelect,
      };

      if (isMultiSelect) {
        // Add to existing selection
        return {
          ...state,
          selectedElements: [...state.selectedElements, newSelection],
          sidebarOpen: true,
        };
      }

      // Replace selection
      return {
        ...state,
        selectedElements: [newSelection],
        sidebarOpen: true,
      };
    }

    case 'DESELECT_ELEMENT':
      return {
        ...state,
        selectedElements: state.selectedElements.filter(
          sel => sel.elementId !== action.payload
        ),
      };

    case 'CLEAR_SELECTION':
      return {
        ...state,
        selectedElements: [],
      };

    case 'SET_SELECTED_ELEMENTS':
      return {
        ...state,
        selectedElements: action.payload,
      };

    case 'ADD_PENDING_CHANGE': {
      const newPendingChanges = new Map(state.pendingChanges);
      const existingChanges = newPendingChanges.get(action.payload.elementId) || [];
      newPendingChanges.set(action.payload.elementId, [
        ...existingChanges,
        ...action.payload.changes,
      ]);
      return {
        ...state,
        pendingChanges: newPendingChanges,
      };
    }

    case 'CLEAR_PENDING_CHANGES':
      return {
        ...state,
        pendingChanges: new Map(),
      };

    case 'APPLY_CHANGES': {
      const changes = state.pendingChanges.get(action.payload.elementId);
      if (!changes || changes.length === 0) return state;

      const historyEntry: HistoryEntry = {
        timestamp: Date.now(),
        elementId: action.payload.elementId,
        changes,
        description: action.payload.description,
      };

      // Remove future history if we're not at the end
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(historyEntry);

      // Remove the applied changes from pending
      const newPendingChanges = new Map(state.pendingChanges);
      newPendingChanges.delete(action.payload.elementId);

      return {
        ...state,
        history: newHistory.slice(-50), // Keep last 50 entries
        historyIndex: Math.min(newHistory.length - 1, 49),
        pendingChanges: newPendingChanges,
      };
    }

    case 'UNDO':
      if (state.historyIndex < 0) return state;
      return {
        ...state,
        historyIndex: state.historyIndex - 1,
      };

    case 'REDO':
      if (state.historyIndex >= state.history.length - 1) return state;
      return {
        ...state,
        historyIndex: state.historyIndex + 1,
      };

    case 'SET_ACTIVE_TOOL':
      return {
        ...state,
        activeTool: action.payload,
      };

    case 'SET_SIDEBAR_OPEN':
      return {
        ...state,
        sidebarOpen: action.payload,
      };

    case 'SET_ACTIVE_PANEL':
      return {
        ...state,
        activePanel: action.payload,
      };

    case 'UPDATE_ELEMENT_RECT': {
      const updatedSelections = state.selectedElements.map(sel => {
        if (sel.elementId === action.payload.elementId) {
          return {
            ...sel,
            element: {
              ...sel.element,
              rect: action.payload.rect,
            },
          };
        }
        return sel;
      });
      return {
        ...state,
        selectedElements: updatedSelections,
      };
    }

    default:
      return state;
  }
}

// Context interface
interface VisualEditorContextValue {
  state: VisualEditorState;
  config: VisualEditorConfig;
  // Actions
  toggleEnabled: (enabled: boolean) => void;
  setHoveredElement: (element: ElementInfo | null) => void;
  selectElement: (element: ElementInfo, isMultiSelect: boolean) => void;
  deselectElement: (elementId: string) => void;
  clearSelection: () => void;
  addPendingChange: (elementId: string, changes: StyleChange[]) => void;
  applyChanges: (elementId: string, description: string) => void;
  clearPendingChanges: () => void;
  undo: () => void;
  redo: () => void;
  setActiveTool: (tool: VisualEditorTool) => void;
  setSidebarOpen: (open: boolean) => void;
  setActivePanel: (panel: SidebarPanel) => void;
  updateElementRect: (elementId: string, rect: DOMRect) => void;
  // Iframe communication
  sendToIframe: (message: VisualEditorMessage) => void;
  setIframeRef: (iframe: HTMLIFrameElement | null) => void;
  // File operations
  applyChangesToFile: (elementId: string, changes: StyleChange[]) => Promise<boolean>;
}

const VisualEditorContext = createContext<VisualEditorContextValue | null>(null);

// Provider component
interface VisualEditorProviderProps {
  children: ReactNode;
  config?: Partial<VisualEditorConfig>;
  onApplyChanges?: (elementId: string, changes: StyleChange[], sourceFile?: string) => Promise<boolean>;
}

export function VisualEditorProvider({
  children,
  config: configOverrides = {},
  onApplyChanges,
}: VisualEditorProviderProps) {
  const [state, dispatch] = useReducer(visualEditorReducer, initialState);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const config = { ...DEFAULT_VISUAL_EDITOR_CONFIG, ...configOverrides };

  // Detect OS for multi-select key
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      if (isMac && config.multiSelectKey === 'ctrl') {
        // Auto-switch to meta key on Mac
        config.multiSelectKey = 'meta';
      }
    }
  }, []);

  // Handle messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!iframeRef.current) return;
      if (event.source !== iframeRef.current.contentWindow) return;

      const message = event.data as VisualEditorMessage;
      
      switch (message.type) {
        case 'ELEMENT_HOVERED':
          dispatch({ type: 'SET_HOVERED_ELEMENT', payload: message.payload.element });
          break;
        case 'ELEMENT_SELECTED':
          message.payload.elements.forEach((element, index) => {
            dispatch({
              type: 'SELECT_ELEMENT',
              payload: {
                element,
                isMultiSelect: message.payload.isMultiSelect || index > 0,
              },
            });
          });
          break;
        case 'ELEMENT_DESELECTED':
          dispatch({ type: 'DESELECT_ELEMENT', payload: message.payload.elementId });
          break;
        case 'CLEAR_SELECTION':
          dispatch({ type: 'CLEAR_SELECTION' });
          break;
        case 'STYLE_APPLIED':
          // Handle style applied confirmation from iframe
          break;
        case 'DOM_UPDATED':
          // Update element info when DOM changes
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Send message to iframe
  const sendToIframe = useCallback((message: VisualEditorMessage) => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(message, '*');
    }
  }, []);

  // Set iframe reference
  const setIframeRef = useCallback((iframe: HTMLIFrameElement | null) => {
    iframeRef.current = iframe;
    
    // Initialize visual editor in iframe when ref is set
    if (iframe && state.isEnabled) {
      // Wait for iframe to load
      iframe.addEventListener('load', () => {
        sendToIframe({ type: 'VISUAL_EDITOR_INIT', payload: { enabled: true } });
      });
    }
  }, [state.isEnabled, sendToIframe]);

  // Action creators
  const toggleEnabled = useCallback((enabled: boolean) => {
    dispatch({ type: 'TOGGLE_ENABLED', payload: enabled });
    sendToIframe({ type: 'VISUAL_EDITOR_TOGGLE', payload: { enabled } });
  }, [sendToIframe]);

  const setHoveredElement = useCallback((element: ElementInfo | null) => {
    dispatch({ type: 'SET_HOVERED_ELEMENT', payload: element });
  }, []);

  const selectElement = useCallback((element: ElementInfo, isMultiSelect: boolean) => {
    dispatch({ type: 'SELECT_ELEMENT', payload: { element, isMultiSelect } });
  }, []);

  const deselectElement = useCallback((elementId: string) => {
    dispatch({ type: 'DESELECT_ELEMENT', payload: elementId });
  }, []);

  const clearSelection = useCallback(() => {
    dispatch({ type: 'CLEAR_SELECTION' });
    sendToIframe({ type: 'CLEAR_SELECTION', payload: {} });
  }, [sendToIframe]);

  const addPendingChange = useCallback((elementId: string, changes: StyleChange[]) => {
    dispatch({ type: 'ADD_PENDING_CHANGE', payload: { elementId, changes } });
    
    // Send style changes to iframe for immediate preview
    sendToIframe({ type: 'APPLY_STYLE', payload: { elementId, changes } });
  }, [sendToIframe]);

  const applyChanges = useCallback((elementId: string, description: string) => {
    dispatch({ type: 'APPLY_CHANGES', payload: { elementId, description } });
  }, []);

  const clearPendingChanges = useCallback(() => {
    dispatch({ type: 'CLEAR_PENDING_CHANGES' });
  }, []);

  const undo = useCallback(() => {
    dispatch({ type: 'UNDO' });
  }, []);

  const redo = useCallback(() => {
    dispatch({ type: 'REDO' });
  }, []);

  const setActiveTool = useCallback((tool: VisualEditorTool) => {
    dispatch({ type: 'SET_ACTIVE_TOOL', payload: tool });
  }, []);

  const setSidebarOpen = useCallback((open: boolean) => {
    dispatch({ type: 'SET_SIDEBAR_OPEN', payload: open });
  }, []);

  const setActivePanel = useCallback((panel: SidebarPanel) => {
    dispatch({ type: 'SET_ACTIVE_PANEL', payload: panel });
  }, []);

  const updateElementRect = useCallback((elementId: string, rect: DOMRect) => {
    dispatch({ type: 'UPDATE_ELEMENT_RECT', payload: { elementId, rect } });
  }, []);

  // Apply changes to source file
  const applyChangesToFile = useCallback(async (
    elementId: string,
    changes: StyleChange[]
  ): Promise<boolean> => {
    const selection = state.selectedElements.find(sel => sel.elementId === elementId);
    if (!selection || !onApplyChanges) return false;

    try {
      const success = await onApplyChanges(elementId, changes, selection.element.sourceFile);
      if (success) {
        applyChanges(elementId, `Updated ${changes.length} style(s)`);
      }
      return success;
    } catch (error) {
      console.error('Failed to apply changes to file:', error);
      return false;
    }
  }, [state.selectedElements, onApplyChanges, applyChanges]);

  const contextValue: VisualEditorContextValue = {
    state,
    config,
    toggleEnabled,
    setHoveredElement,
    selectElement,
    deselectElement,
    clearSelection,
    addPendingChange,
    applyChanges,
    clearPendingChanges,
    undo,
    redo,
    setActiveTool,
    setSidebarOpen,
    setActivePanel,
    updateElementRect,
    sendToIframe,
    setIframeRef,
    applyChangesToFile,
  };

  return (
    <VisualEditorContext.Provider value={contextValue}>
      {children}
    </VisualEditorContext.Provider>
  );
}

// Hook to use the visual editor context
export function useVisualEditor() {
  const context = useContext(VisualEditorContext);
  if (!context) {
    throw new Error('useVisualEditor must be used within a VisualEditorProvider');
  }
  return context;
}

// Hook for keyboard shortcuts
export function useVisualEditorShortcuts() {
  const { state, toggleEnabled, undo, redo, clearSelection, setActiveTool } = useVisualEditor();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts when visual editor is enabled
      if (!state.isEnabled) {
        // Escape to enable visual edit mode
        if (event.key === 'Escape' && !event.shiftKey) {
          // Don't enable on Escape - use toggle button instead
          return;
        }
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? event.metaKey : event.ctrlKey;

      // Escape to exit visual edit mode or clear selection
      if (event.key === 'Escape') {
        event.preventDefault();
        if (state.selectedElements.length > 0) {
          clearSelection();
        } else {
          toggleEnabled(false);
        }
        return;
      }

      // Undo: Ctrl/Cmd + Z
      if (modKey && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
        return;
      }

      // Redo: Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y
      if ((modKey && event.shiftKey && event.key === 'z') || (modKey && event.key === 'y')) {
        event.preventDefault();
        redo();
        return;
      }

      // Tool shortcuts (when no input is focused)
      if (!['INPUT', 'TEXTAREA'].includes((event.target as HTMLElement).tagName)) {
        switch (event.key.toLowerCase()) {
          case 'v':
            setActiveTool('select');
            break;
          case 't':
            setActiveTool('text');
            break;
          case 's':
            if (!modKey) setActiveTool('spacing');
            break;
          case 'l':
            setActiveTool('layout');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.isEnabled, state.selectedElements.length, toggleEnabled, undo, redo, clearSelection, setActiveTool]);
}

// Export types
export type { VisualEditorContextValue };
