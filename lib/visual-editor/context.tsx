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
  PendingChangeEntry,
  VisualEditorConfig,
  VisualEditorMessage,
  DeleteOperation,
} from './types';
import { DEFAULT_VISUAL_EDITOR_CONFIG } from './types';

// Initial state for the visual editor
const initialState: VisualEditorState = {
  isEnabled: false,
  selectedElements: [],
  hoveredElement: null,
  pendingChanges: new Map(),
  pendingChangesHistory: [],
  pendingChangesHistoryIndex: -1,
  pendingDeletes: new Map(),
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
  | { type: 'REMOVE_ELEMENT'; payload: string }
  | { type: 'ADD_PENDING_CHANGE'; payload: { elementId: string; changes: StyleChange[] } }
  | { type: 'ADD_PENDING_DELETE'; payload: { elementId: string; operation: DeleteOperation } }
  | { type: 'REMOVE_PENDING_DELETE'; payload: string }
  | { type: 'CLEAR_PENDING_CHANGES' }
  | { type: 'APPLY_CHANGES'; payload: { elementId: string; description: string } }
  | { type: 'ADD_HISTORY_ENTRY'; payload: HistoryEntry }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'UNDO_PENDING_CHANGE' }
  | { type: 'REDO_PENDING_CHANGE' }
  | { type: 'SET_ACTIVE_TOOL'; payload: VisualEditorTool }
  | { type: 'SET_SIDEBAR_OPEN'; payload: boolean }
  | { type: 'SET_ACTIVE_PANEL'; payload: SidebarPanel }
  | { type: 'UPDATE_ELEMENT_RECT'; payload: { elementId: string; rect: DOMRect } }
  | { type: 'UPDATE_ELEMENT_STYLE'; payload: { elementId: string; property: string; value: string } }
  | { type: 'UPDATE_ELEMENT_TEXT'; payload: { elementId: string; text: string } }
  | { type: 'DISCARD_CHANGES_FOR_ELEMENT'; payload: string }

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

    case 'REMOVE_ELEMENT':
      return {
        ...state,
        selectedElements: state.selectedElements.filter(
          (sel) => sel.element.id !== action.payload
        ),
        hoveredElement: state.hoveredElement?.id === action.payload ? null : state.hoveredElement,
      };

    case 'ADD_PENDING_CHANGE': {
      const newPendingChanges = new Map(state.pendingChanges);
      const existingChanges = newPendingChanges.get(action.payload.elementId) || [];
      
      // For each new change, replace if same property exists, otherwise append
      const mergedChanges = [...existingChanges];
      for (const newChange of action.payload.changes) {
        const existingIndex = mergedChanges.findIndex(c => c.property === newChange.property);
        if (existingIndex >= 0) {
          // Replace existing change for same property
          mergedChanges[existingIndex] = newChange;
        } else {
          // Add new change
          mergedChanges.push(newChange);
        }
      }
      
      newPendingChanges.set(action.payload.elementId, mergedChanges);

      // Add to pending changes history for undo/redo
      const newPendingHistory = [...state.pendingChangesHistory];
      // Remove future history if we're not at the end
      const trimmedHistory = newPendingHistory.slice(0, state.pendingChangesHistoryIndex + 1);
      
      // Add each change as a separate history entry
      for (const change of action.payload.changes) {
        trimmedHistory.push({
          timestamp: Date.now(),
          elementId: action.payload.elementId,
          change,
          description: `Changed ${change.property}`,
        });
      }

      return {
        ...state,
        pendingChanges: newPendingChanges,
        pendingChangesHistory: trimmedHistory.slice(-50), // Keep last 50 entries
        pendingChangesHistoryIndex: Math.min(trimmedHistory.length - 1, 49),
      };
    }

    case 'ADD_PENDING_DELETE': {
      const newPendingDeletes = new Map(state.pendingDeletes);
      newPendingDeletes.set(action.payload.elementId, action.payload.operation);
      return {
        ...state,
        pendingDeletes: newPendingDeletes,
      };
    }

    case 'REMOVE_PENDING_DELETE': {
      const newPendingDeletes = new Map(state.pendingDeletes);
      newPendingDeletes.delete(action.payload);
      return {
        ...state,
        pendingDeletes: newPendingDeletes,
      };
    }

    case 'CLEAR_PENDING_CHANGES':
      return {
        ...state,
        pendingChanges: new Map(),
        pendingDeletes: new Map(),
        pendingChangesHistory: [],
        pendingChangesHistoryIndex: -1,
      };

    case 'APPLY_CHANGES': {
      const changes = state.pendingChanges.get(action.payload.elementId);
      if (!changes || changes.length === 0) return state;

      // Determine operation type based on changes
      let operationType: HistoryEntry['operationType'] = 'style';
      if (changes.some(c => c.property === 'textContent' as any)) {
        operationType = 'text';
      } else if (changes.some(c => c.property === 'width' || c.property === 'height')) {
        operationType = 'resize';
      }

      const historyEntry: HistoryEntry = {
        timestamp: Date.now(),
        elementId: action.payload.elementId,
        changes,
        description: action.payload.description,
        operationType,
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

    case 'ADD_HISTORY_ENTRY': {
      // Remove future history if we're not at the end
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(action.payload);
      return {
        ...state,
        history: newHistory.slice(-50),
        historyIndex: Math.min(newHistory.length - 1, 49),
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

    case 'UNDO_PENDING_CHANGE':
      if (state.pendingChangesHistoryIndex < 0) return state;
      
      const undoEntry = state.pendingChangesHistory[state.pendingChangesHistoryIndex];
      if (undoEntry) {
        // Remove the change from pendingChanges map
        const newPendingChanges = new Map(state.pendingChanges);
        const elementChanges = newPendingChanges.get(undoEntry.elementId) || [];
        const filteredChanges = elementChanges.filter(c => c.property !== undoEntry.change.property);
        
        if (filteredChanges.length === 0) {
          newPendingChanges.delete(undoEntry.elementId);
        } else {
          newPendingChanges.set(undoEntry.elementId, filteredChanges);
        }
        
        return {
          ...state,
          pendingChanges: newPendingChanges,
          pendingChangesHistoryIndex: state.pendingChangesHistoryIndex - 1,
        };
      }
      
      return {
        ...state,
        pendingChangesHistoryIndex: state.pendingChangesHistoryIndex - 1,
      };

    case 'REDO_PENDING_CHANGE':
      if (state.pendingChangesHistoryIndex >= state.pendingChangesHistory.length - 1) return state;
      
      const redoEntry = state.pendingChangesHistory[state.pendingChangesHistoryIndex + 1];
      if (redoEntry) {
        // Add the change back to pendingChanges map
        const newPendingChanges = new Map(state.pendingChanges);
        const elementChanges = newPendingChanges.get(redoEntry.elementId) || [];
        const existingIndex = elementChanges.findIndex(c => c.property === redoEntry.change.property);
        
        if (existingIndex >= 0) {
          // Replace existing change
          elementChanges[existingIndex] = redoEntry.change;
        } else {
          // Add new change
          elementChanges.push(redoEntry.change);
        }
        
        newPendingChanges.set(redoEntry.elementId, elementChanges);
        
        return {
          ...state,
          pendingChanges: newPendingChanges,
          pendingChangesHistoryIndex: state.pendingChangesHistoryIndex + 1,
        };
      }
      
      return {
        ...state,
        pendingChangesHistoryIndex: state.pendingChangesHistoryIndex + 1,
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

    case 'UPDATE_ELEMENT_STYLE': {
      const updatedSelections = state.selectedElements.map(sel => {
        if (sel.elementId === action.payload.elementId) {
          return {
            ...sel,
            element: {
              ...sel.element,
              computedStyles: {
                ...sel.element.computedStyles,
                [action.payload.property]: action.payload.value,
              },
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

    case 'UPDATE_ELEMENT_TEXT': {
      const updatedSelections = state.selectedElements.map(sel => {
        if (sel.elementId === action.payload.elementId) {
          return {
            ...sel,
            element: {
              ...sel.element,
              textContent: action.payload.text,
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

    case 'DISCARD_CHANGES_FOR_ELEMENT': {
      const newPendingChanges = new Map(state.pendingChanges);
      newPendingChanges.delete(action.payload);
      
      // Also remove history entries for this element
      const newPendingHistory = state.pendingChangesHistory.filter(
        entry => entry.elementId !== action.payload
      );
      
      return {
        ...state,
        pendingChanges: newPendingChanges,
        pendingChangesHistory: newPendingHistory,
        pendingChangesHistoryIndex: Math.min(
          state.pendingChangesHistoryIndex,
          newPendingHistory.length - 1
        ),
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
  undoPendingChange: () => void;
  redoPendingChange: () => void;
  canUndoPending: () => boolean;
  canRedoPending: () => boolean;
  setActiveTool: (tool: VisualEditorTool) => void;
  setSidebarOpen: (open: boolean) => void;
  setActivePanel: (panel: SidebarPanel) => void;
  updateElementRect: (elementId: string, rect: DOMRect) => void;
  updateElementStyle: (elementId: string, property: string, value: string) => void;
  updateElementText: (elementId: string, text: string) => void;
  // Delete and resize actions
  deleteElement: (elementId: string) => void;
  deleteSelectedElements: () => void;
  resizeElement: (elementId: string, width: number, height: number) => void;
  // Iframe communication
  sendToIframe: (message: VisualEditorMessage) => void;
  setIframeRef: (iframe: HTMLIFrameElement | null) => void;
  // File operations
  applyChangesToFile: (elementId: string, changes: StyleChange[]) => Promise<boolean>;
  applyPendingDeletes: () => Promise<boolean>;
  hasPendingDeletes: () => boolean;
  // Unsaved changes check
  hasUnsavedChangesForCurrentSelection: () => boolean;
  getCurrentSelectionPendingChanges: () => StyleChange[];
  // Discard changes
  discardChangesForElement: (elementId: string) => void;
}

const VisualEditorContext = createContext<VisualEditorContextValue | null>(null);

// Provider component
interface VisualEditorProviderProps {
  children: ReactNode;
  config?: Partial<VisualEditorConfig>;
  onApplyChanges?: (elementId: string, changes: StyleChange[], sourceFile?: string, sourceLine?: number) => Promise<boolean>;
  onSelectionBlocked?: () => void; // Called when selection is blocked due to unsaved changes
}

export function VisualEditorProvider({
  children,
  config: configOverrides = {},
  onApplyChanges,
  onSelectionBlocked,
}: VisualEditorProviderProps) {
  const [state, dispatch] = useReducer(visualEditorReducer, initialState);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const config = { ...DEFAULT_VISUAL_EDITOR_CONFIG, ...configOverrides };
  
  // Ref to track the callback for blocked selection (allows it to be updated without recreating effects)
  const onSelectionBlockedRef = useRef(onSelectionBlocked);
  useEffect(() => {
    onSelectionBlockedRef.current = onSelectionBlocked;
  }, [onSelectionBlocked]);
  
  // Ref to track current state for use in message handler (avoids stale closure)
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

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
        case 'ELEMENT_SELECTED': {
          // Check if current selection has unsaved changes
          const currentState = stateRef.current;
          const hasUnsavedChanges = currentState.selectedElements.length > 0 &&
            (() => {
              const currentElementId = currentState.selectedElements[0].elementId;
              const pendingChanges = currentState.pendingChanges.get(currentElementId);
              return pendingChanges !== undefined && pendingChanges.length > 0;
            })();
          
          // Check if selecting a different element
          const isSelectingDifferentElement = message.payload.elements.length > 0 &&
            currentState.selectedElements.length > 0 &&
            message.payload.elements[0].id !== currentState.selectedElements[0].elementId;
          
  // Block selection if there are unsaved changes and selecting a different element
  if (hasUnsavedChanges && isSelectingDifferentElement) {
    console.log('[Visual Editor] Selection blocked - unsaved changes exist, calling onSelectionBlocked');
    onSelectionBlockedRef.current?.();
    return;
  }          message.payload.elements.forEach((element, index) => {
            dispatch({
              type: 'SELECT_ELEMENT',
              payload: {
                element,
                isMultiSelect: message.payload.isMultiSelect || index > 0,
              },
            });
          });
          break;
        }
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
        case 'ELEMENT_DELETED':
          // Handle element deletion - remove from selection and clear pending changes
          dispatch({ type: 'REMOVE_ELEMENT', payload: message.payload.elementId });
          break;
        case 'ELEMENT_RESIZED':
          // Handle resize completion - update element dimensions
          if (message.payload.newRect) {
            dispatch({
              type: 'UPDATE_ELEMENT_RECT',
              payload: {
                elementId: message.payload.elementId,
                rect: message.payload.newRect,
              },
            });
          }
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Send message to iframe
  const sendToIframe = useCallback((message: VisualEditorMessage) => {
    // Debug logging for theme-related messages
    if (message.type.includes('THEME') || message.type.includes('DRAG')) {
      console.log('[Visual Editor Context] sendToIframe called:', message.type);
      console.log('[Visual Editor Context] iframe ref exists:', !!iframeRef.current);
      console.log('[Visual Editor Context] contentWindow exists:', !!iframeRef.current?.contentWindow);
    }
    
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(message, '*');
      if (message.type.includes('THEME') || message.type.includes('DRAG')) {
        console.log('[Visual Editor Context] Message sent successfully:', message.type);
      }
    } else {
      console.warn('[Visual Editor Context] Cannot send message - no iframe ref:', message.type);
    }
  }, []);

  // Set iframe reference
  const setIframeRef = useCallback((iframe: HTMLIFrameElement | null) => {
    iframeRef.current = iframe;
    
    // Debug: Check if visual editor is initialized in iframe
    if (iframe?.contentWindow) {
      try {
        const isInitialized = (iframe.contentWindow as any).__VISUAL_EDITOR_INITIALIZED__;
        console.log('[Visual Editor Context] setIframeRef - initialized in iframe:', isInitialized);
      } catch (e) {
        console.log('[Visual Editor Context] Cannot access iframe contentWindow (cross-origin?):', e);
      }
    }
    
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
    
    // Update the element's computed styles in state so sidebar reflects changes
    changes.forEach(change => {
      dispatch({ 
        type: 'UPDATE_ELEMENT_STYLE', 
        payload: { elementId, property: change.property, value: change.newValue } 
      });
    });
    
    // Send style changes to iframe for immediate preview
    sendToIframe({ type: 'APPLY_STYLE', payload: { elementId, changes } });
  }, [sendToIframe]);

  const applyChanges = useCallback((elementId: string, description: string) => {
    dispatch({ type: 'APPLY_CHANGES', payload: { elementId, description } });
  }, []);

  const clearPendingChanges = useCallback(() => {
    dispatch({ type: 'CLEAR_PENDING_CHANGES' });
  }, []);

  // Undo - revert the last change by sending the old values to iframe
  const undo = useCallback(() => {
    if (state.historyIndex < 0) return;
    
    const entry = state.history[state.historyIndex];
    if (entry) {
      // Revert the changes by sending old values to iframe
      const revertedChanges = entry.changes.map(change => ({
        ...change,
        newValue: change.oldValue, // Swap new and old
        oldValue: change.newValue,
      }));
      
      // Send to iframe to revert visual changes
      if (entry.operationType === 'style' || entry.operationType === 'resize') {
        sendToIframe({ 
          type: 'APPLY_STYLE', 
          payload: { elementId: entry.elementId, changes: revertedChanges } 
        });
      } else if (entry.operationType === 'text') {
        const textChange = revertedChanges.find(c => (c.property as string) === 'textContent');
        if (textChange) {
          sendToIframe({ 
            type: 'UPDATE_TEXT', 
            payload: { elementId: entry.elementId, text: textChange.newValue } 
          });
        }
      }
      // Note: delete operations can't be easily undone without page reload
      
      console.log('[Visual Editor] Undo:', entry.description);
    }
    
    dispatch({ type: 'UNDO' });
  }, [state.historyIndex, state.history, sendToIframe]);

  // Redo - re-apply the next change by sending the new values to iframe
  const redo = useCallback(() => {
    if (state.historyIndex >= state.history.length - 1) return;
    
    const entry = state.history[state.historyIndex + 1];
    if (entry) {
      // Re-apply the changes
      if (entry.operationType === 'style' || entry.operationType === 'resize') {
        sendToIframe({ 
          type: 'APPLY_STYLE', 
          payload: { elementId: entry.elementId, changes: entry.changes } 
        });
      } else if (entry.operationType === 'text') {
        const textChange = entry.changes.find(c => (c.property as string) === 'textContent');
        if (textChange) {
          sendToIframe({ 
            type: 'UPDATE_TEXT', 
            payload: { elementId: entry.elementId, text: textChange.newValue } 
          });
        }
      }
      
      console.log('[Visual Editor] Redo:', entry.description);
    }
    
    dispatch({ type: 'REDO' });
  }, [state.historyIndex, state.history, sendToIframe]);

  // Undo pending change - revert the last pending change
  const undoPendingChange = useCallback(() => {
    if (state.pendingChangesHistoryIndex < 0) return;
    
    const entry = state.pendingChangesHistory[state.pendingChangesHistoryIndex];
    if (entry) {
      // Revert the change by sending the old value to iframe
      const revertedChange = {
        ...entry.change,
        newValue: entry.change.oldValue, // Swap new and old
        oldValue: entry.change.newValue,
      };
      
      sendToIframe({ 
        type: 'APPLY_STYLE', 
        payload: { elementId: entry.elementId, changes: [revertedChange] } 
      });
      
      console.log('[Visual Editor] Undo pending change:', entry.description);
    }
    
    dispatch({ type: 'UNDO_PENDING_CHANGE' });
  }, [state.pendingChangesHistoryIndex, state.pendingChangesHistory, sendToIframe]);

  // Redo pending change - re-apply the next pending change
  const redoPendingChange = useCallback(() => {
    if (state.pendingChangesHistoryIndex >= state.pendingChangesHistory.length - 1) return;
    
    const entry = state.pendingChangesHistory[state.pendingChangesHistoryIndex + 1];
    if (entry) {
      // Re-apply the change
      sendToIframe({ 
        type: 'APPLY_STYLE', 
        payload: { elementId: entry.elementId, changes: [entry.change] } 
      });
      
      console.log('[Visual Editor] Redo pending change:', entry.description);
    }
    
    dispatch({ type: 'REDO_PENDING_CHANGE' });
  }, [state.pendingChangesHistoryIndex, state.pendingChangesHistory, sendToIframe]);

  // Check if can undo pending changes
  const canUndoPending = useCallback(() => {
    return state.pendingChangesHistoryIndex >= 0;
  }, [state.pendingChangesHistoryIndex]);

  // Check if can redo pending changes
  const canRedoPending = useCallback(() => {
    return state.pendingChangesHistoryIndex < state.pendingChangesHistory.length - 1;
  }, [state.pendingChangesHistoryIndex, state.pendingChangesHistory.length]);

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

  const updateElementStyle = useCallback((elementId: string, property: string, value: string) => {
    dispatch({ type: 'UPDATE_ELEMENT_STYLE', payload: { elementId, property, value } });
  }, []);

  const updateElementText = useCallback((elementId: string, text: string) => {
    dispatch({ type: 'UPDATE_ELEMENT_TEXT', payload: { elementId, text } });
    // Send text update to iframe for live preview
    sendToIframe({ type: 'UPDATE_TEXT', payload: { elementId, text } });
    
    // Also add as a pending change so it gets saved
    // We use a special 'textContent' property marker
    dispatch({
      type: 'ADD_PENDING_CHANGE',
      payload: {
        elementId,
        changes: [{
          property: 'textContent' as any, // Special marker for text changes
          oldValue: '',
          newValue: text,
          useTailwind: false,
        }],
      },
    });
  }, [sendToIframe]);

  // Delete an element - adds to pending deletes and removes from DOM preview
  const deleteElement = useCallback((elementId: string) => {
    // Find the element info before removing from state
    const selection = state.selectedElements.find(sel => sel.elementId === elementId);
    
    if (selection?.element.sourceFile && selection?.element.sourceLine) {
      // Add to pending deletes for file update
      const deleteOperation: DeleteOperation = {
        elementId,
        sourceFile: selection.element.sourceFile,
        sourceLine: selection.element.sourceLine,
        tagName: selection.element.tagName,
      };
      dispatch({ type: 'ADD_PENDING_DELETE', payload: { elementId, operation: deleteOperation } });
      
      console.log('[Visual Editor] Added pending delete for element:', elementId, 'at line:', selection.element.sourceLine);
    }
    
    // Send delete message to iframe to update preview
    sendToIframe({ type: 'DELETE_ELEMENT', payload: { elementId } });
    
    // Remove from state
    dispatch({ type: 'REMOVE_ELEMENT', payload: elementId });
  }, [sendToIframe, state.selectedElements]);

  // Delete all selected elements
  const deleteSelectedElements = useCallback(() => {
    // Make a copy of selected elements since we're modifying state during iteration
    const elementsToDelete = [...state.selectedElements];
    elementsToDelete.forEach((sel) => {
      deleteElement(sel.elementId);
    });
  }, [state.selectedElements, deleteElement]);

  // Check if there are pending deletes
  const hasPendingDeletes = useCallback(() => {
    return state.pendingDeletes.size > 0;
  }, [state.pendingDeletes]);

  // Check if current selection has unsaved changes
  const hasUnsavedChangesForCurrentSelection = useCallback(() => {
    if (state.selectedElements.length === 0) return false;
    
    const currentElementId = state.selectedElements[0].elementId;
    const pendingChanges = state.pendingChanges.get(currentElementId);
    return pendingChanges !== undefined && pendingChanges.length > 0;
  }, [state.selectedElements, state.pendingChanges]);

  // Get pending changes for current selection
  const getCurrentSelectionPendingChanges = useCallback(() => {
    if (state.selectedElements.length === 0) return [];
    
    const currentElementId = state.selectedElements[0].elementId;
    return state.pendingChanges.get(currentElementId) || [];
  }, [state.selectedElements, state.pendingChanges]);

  // Apply pending delete operations to source files
  const applyPendingDeletes = useCallback(async (): Promise<boolean> => {
    if (state.pendingDeletes.size === 0) return true;
    
    if (!onApplyChanges) {
      console.error('[Visual Editor] No onApplyChanges handler provided');
      return false;
    }
    
    let allSuccess = true;
    
    for (const [elementId, operation] of state.pendingDeletes.entries()) {
      console.log('[Visual Editor] Applying delete for:', elementId, operation);
      
      // Create a special _delete change to signal code generator
      const deleteChange: StyleChange = {
        property: '_delete' as any,
        oldValue: operation.tagName,
        newValue: '', // Empty = delete
        useTailwind: false,
      };
      
      try {
        const success = await onApplyChanges(
          elementId,
          [deleteChange],
          operation.sourceFile,
          operation.sourceLine
        );
        
        if (success) {
          // Remove from pending deletes
          dispatch({ type: 'REMOVE_PENDING_DELETE', payload: elementId });
          
          // Add to history for potential undo
          dispatch({
            type: 'ADD_HISTORY_ENTRY',
            payload: {
              timestamp: Date.now(),
              elementId,
              changes: [deleteChange],
              description: `Deleted ${operation.tagName} element`,
              operationType: 'delete',
            },
          });
        } else {
          allSuccess = false;
        }
      } catch (error) {
        console.error('[Visual Editor] Failed to apply delete:', error);
        allSuccess = false;
      }
    }
    
    return allSuccess;
  }, [state.pendingDeletes, onApplyChanges]);

  // Resize an element
  const resizeElement = useCallback((elementId: string, width: number, height: number) => {
    // Send resize message to iframe with pixel values as strings
    sendToIframe({ 
      type: 'RESIZE_ELEMENT', 
      payload: { elementId, width: `${width}px`, height: `${height}px` } 
    });
    
    // Add as pending changes for width and height
    dispatch({
      type: 'ADD_PENDING_CHANGE',
      payload: {
        elementId,
        changes: [
          {
            property: 'width',
            oldValue: '',
            newValue: `${width}px`,
            useTailwind: true,
          },
          {
            property: 'height',
            oldValue: '',
            newValue: `${height}px`,
            useTailwind: true,
          },
        ],
      },
    });
  }, [sendToIframe]);

  // Apply changes to source file
  const applyChangesToFile = useCallback(async (
    elementId: string,
    changes: StyleChange[]
  ): Promise<boolean> => {
    const selection = state.selectedElements.find(sel => sel.elementId === elementId);
    if (!selection || !onApplyChanges) return false;

    try {
      const success = await onApplyChanges(
        elementId, 
        changes, 
        selection.element.sourceFile,
        selection.element.sourceLine
      );
      if (success) {
        applyChanges(elementId, `Updated ${changes.length} style(s)`);
      }
      return success;
    } catch (error) {
      console.error('Failed to apply changes to file:', error);
      return false;
    }
  }, [state.selectedElements, onApplyChanges, applyChanges]);

  // Discard changes for a specific element
  const discardChangesForElement = useCallback((elementId: string) => {
    const changes = state.pendingChanges.get(elementId);
    if (!changes || changes.length === 0) return;

    // Revert the changes by sending old values to iframe
    const revertedChanges = changes.map(change => ({
      ...change,
      newValue: change.oldValue, // Swap new and old
      oldValue: change.newValue,
    }));

    // Send to iframe to revert visual changes
    sendToIframe({ 
      type: 'APPLY_STYLE', 
      payload: { elementId, changes: revertedChanges } 
    });

    // Remove the pending changes and history
    dispatch({ type: 'DISCARD_CHANGES_FOR_ELEMENT', payload: elementId });
  }, [state.pendingChanges, sendToIframe]);

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
    undoPendingChange,
    redoPendingChange,
    canUndoPending,
    canRedoPending,
    setActiveTool,
    setSidebarOpen,
    setActivePanel,
    updateElementRect,
    updateElementStyle,
    updateElementText,
    deleteElement,
    deleteSelectedElements,
    resizeElement,
    sendToIframe,
    setIframeRef,
    applyChangesToFile,
    applyPendingDeletes,
    hasPendingDeletes,
    hasUnsavedChangesForCurrentSelection,
    getCurrentSelectionPendingChanges,
    discardChangesForElement,
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
