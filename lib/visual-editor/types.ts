// Visual Editor Types - Core type definitions for the visual editing system
// Supports both Vite React and Next.js templates

export interface ElementInfo {
  // Unique identifier for the element (data attribute or path)
  id: string;
  // DOM element tag name
  tagName: string;
  // Element text content (if any)
  textContent?: string;
  // Current computed styles
  computedStyles: ComputedStyleInfo;
  // Current inline styles
  inlineStyles: Record<string, string>;
  // Current Tailwind/CSS classes
  className: string;
  // Bounding rect for positioning overlays
  rect: DOMRect;
  // Path to the source file (if available via data attributes)
  sourceFile?: string;
  // Line number in source (if available)
  sourceLine?: number;
  // Whether the element is a container (div, section, etc.)
  isContainer: boolean;
  // Parent element ID (for hierarchy)
  parentId?: string;
  // Children element IDs
  childrenIds: string[];
}

export interface ComputedStyleInfo {
  // Layout properties
  display: string;
  position: string;
  flexDirection?: string;
  justifyContent?: string;
  alignItems?: string;
  gap?: string;
  
  // Spacing
  marginTop: string;
  marginRight: string;
  marginBottom: string;
  marginLeft: string;
  paddingTop: string;
  paddingRight: string;
  paddingBottom: string;
  paddingLeft: string;
  
  // Sizing
  width: string;
  height: string;
  minWidth?: string;
  maxWidth?: string;
  minHeight?: string;
  maxHeight?: string;
  
  // Typography
  fontSize: string;
  fontWeight: string;
  fontFamily: string;
  lineHeight: string;
  letterSpacing?: string;
  textAlign?: string;
  textDecoration?: string;
  
  // Colors
  color: string;
  backgroundColor: string;
  borderColor?: string;
  
  // Border & Border Radius
  borderWidth?: string;
  borderStyle?: string;
  borderRadius?: string;
  
  // Effects
  boxShadow?: string;
  opacity?: string;
}

export interface StyleChange {
  property: keyof ComputedStyleInfo | 'textContent' | '_delete';
  oldValue: string;
  newValue: string;
  // Whether to use Tailwind class or inline style
  useTailwind: boolean;
  // Generated Tailwind class (if applicable)
  tailwindClass?: string;
}

// Delete operation info (stored alongside style changes)
export interface DeleteOperation {
  elementId: string;
  sourceFile: string;
  sourceLine: number;
  tagName: string;
}

export interface ElementSelection {
  elementId: string;
  element: ElementInfo;
  isMultiSelect: boolean;
}

export interface VisualEditorState {
  // Is visual edit mode enabled
  isEnabled: boolean;
  // Currently selected elements
  selectedElements: ElementSelection[];
  // Hovered element (for preview)
  hoveredElement: ElementInfo | null;
  // Pending changes (not yet saved)
  pendingChanges: Map<string, StyleChange[]>;
  // Pending delete operations (element IDs -> delete info)
  pendingDeletes: Map<string, DeleteOperation>;
  // History for undo/redo
  history: HistoryEntry[];
  historyIndex: number;
  // Active tool/mode
  activeTool: VisualEditorTool;
  // Sidebar panel state
  sidebarOpen: boolean;
  activePanel: SidebarPanel;
}

export type VisualEditorTool = 
  | 'select'      // Default selection mode
  | 'text'        // Text editing mode
  | 'spacing'     // Margin/padding adjustment mode
  | 'layout'      // Layout/alignment mode
  | 'resize'      // Resize mode
  | 'delete';     // Delete mode

export type SidebarPanel = 
  | 'styles'      // General styles panel
  | 'layout'      // Layout & positioning
  | 'spacing'     // Margins & padding
  | 'typography'  // Font, size, color
  | 'effects'     // Shadows, borders, etc.
  | 'themes'      // Theme selection and management
  | 'elements';   // Draggable elements library

// Resize handle positions
export type ResizeHandle = 
  | 'n'   // North (top)
  | 'ne'  // North-east (top-right)
  | 'e'   // East (right)
  | 'se'  // South-east (bottom-right)
  | 's'   // South (bottom)
  | 'sw'  // South-west (bottom-left)
  | 'w'   // West (left)
  | 'nw'; // North-west (top-left)

export interface HistoryEntry {
  timestamp: number;
  elementId: string;
  changes: StyleChange[];
  description: string;
  // Type of operation for proper undo/redo
  operationType: 'style' | 'text' | 'delete' | 'resize';
  // For delete operations - store the removed code so it can be restored
  deletedCode?: string;
  // For resize - store original dimensions
  originalDimensions?: { width: string; height: string };
}

// Message types for iframe communication
export type VisualEditorMessage = 
  | { type: 'VISUAL_EDITOR_INIT'; payload: { enabled: boolean } }
  | { type: 'VISUAL_EDITOR_TOGGLE'; payload: { enabled: boolean } }
  | { type: 'ELEMENT_HOVERED'; payload: { element: ElementInfo | null } }
  | { type: 'ELEMENT_SELECTED'; payload: { elements: ElementInfo[]; isMultiSelect: boolean } }
  | { type: 'ELEMENT_DESELECTED'; payload: { elementId: string } }
  | { type: 'CLEAR_SELECTION'; payload: {} }
  | { type: 'APPLY_STYLE'; payload: { elementId: string; changes: StyleChange[] } }
  | { type: 'UPDATE_TEXT'; payload: { elementId: string; text: string } }
  | { type: 'DELETE_ELEMENT'; payload: { elementId: string } }
  | { type: 'ELEMENT_DELETED'; payload: { elementId: string; success: boolean } }
  | { type: 'RESIZE_ELEMENT'; payload: { elementId: string; width?: string; height?: string } }
  | { type: 'ELEMENT_RESIZED'; payload: { elementId: string; newRect: DOMRect } }
  | { type: 'REQUEST_ELEMENT_INFO'; payload: { elementId: string } }
  | { type: 'ELEMENT_INFO_RESPONSE'; payload: { element: ElementInfo } }
  | { type: 'STYLE_APPLIED'; payload: { elementId: string; success: boolean } }
  | { type: 'DOM_UPDATED'; payload: { elements: ElementInfo[] } }
  // Drag & Drop element messages
  | { type: 'DRAG_ELEMENT_START'; payload: { elementType: string; content: string } }
  | { type: 'DRAG_ELEMENT_OVER'; payload: { x: number; y: number } }
  | { type: 'DRAG_ELEMENT_END'; payload: {} }
  | { type: 'DROP_ELEMENT'; payload: { elementType: string; content: string; targetId?: string; position: 'before' | 'after' | 'inside' } }
  | { type: 'ELEMENT_DROPPED'; payload: { elementId: string; success: boolean; insertedAt?: { targetId: string; position: string } } }
  | { type: 'DROP_ZONE_HIGHLIGHT'; payload: { targetId: string; position: 'before' | 'after' | 'inside' } | null }
  // Theme messages
  | { type: 'APPLY_THEME_PREVIEW'; payload: { themeCSS: string } }
  | { type: 'CLEAR_THEME_PREVIEW'; payload: {} };

// Tailwind utility mappings for common CSS properties
export const TAILWIND_MAPPINGS: Record<string, Record<string, string>> = {
  display: {
    'flex': 'flex',
    'grid': 'grid',
    'block': 'block',
    'inline': 'inline',
    'inline-block': 'inline-block',
    'inline-flex': 'inline-flex',
    'none': 'hidden',
  },
  flexDirection: {
    'row': 'flex-row',
    'row-reverse': 'flex-row-reverse',
    'column': 'flex-col',
    'column-reverse': 'flex-col-reverse',
  },
  justifyContent: {
    'flex-start': 'justify-start',
    'flex-end': 'justify-end',
    'center': 'justify-center',
    'space-between': 'justify-between',
    'space-around': 'justify-around',
    'space-evenly': 'justify-evenly',
  },
  alignItems: {
    'flex-start': 'items-start',
    'flex-end': 'items-end',
    'center': 'items-center',
    'baseline': 'items-baseline',
    'stretch': 'items-stretch',
  },
  textAlign: {
    'left': 'text-left',
    'center': 'text-center',
    'right': 'text-right',
    'justify': 'text-justify',
  },
  fontWeight: {
    '100': 'font-thin',
    '200': 'font-extralight',
    '300': 'font-light',
    '400': 'font-normal',
    '500': 'font-medium',
    '600': 'font-semibold',
    '700': 'font-bold',
    '800': 'font-extrabold',
    '900': 'font-black',
  },
  fontFamily: {
    'sans-serif': 'font-sans',
    'serif': 'font-serif',
    'monospace': 'font-mono',
    'Arial': 'font-sans',
    'Helvetica': 'font-sans',
    'Times New Roman': 'font-serif',
    'Courier New': 'font-mono',
    'Georgia': 'font-serif',
    'Verdana': 'font-sans',
    'system-ui': 'font-sans',
    '-apple-system': 'font-sans',
    'BlinkMacSystemFont': 'font-sans',
  },
}

// Spacing scale for Tailwind (in pixels -> class)
export const TAILWIND_SPACING: Record<number, string> = {
  0: '0',
  1: 'px',
  2: '0.5',
  4: '1',
  6: '1.5',
  8: '2',
  10: '2.5',
  12: '3',
  14: '3.5',
  16: '4',
  20: '5',
  24: '6',
  28: '7',
  32: '8',
  36: '9',
  40: '10',
  44: '11',
  48: '12',
  56: '14',
  64: '16',
  80: '20',
  96: '24',
  112: '28',
  128: '32',
  144: '36',
  160: '40',
  176: '44',
  192: '48',
  208: '52',
  224: '56',
  240: '60',
  256: '64',
  288: '72',
  320: '80',
  384: '96',
};

// Font size scale for Tailwind
export const TAILWIND_FONT_SIZES: Record<string, string> = {
  '12px': 'text-xs',
  '14px': 'text-sm',
  '16px': 'text-base',
  '18px': 'text-lg',
  '20px': 'text-xl',
  '24px': 'text-2xl',
  '30px': 'text-3xl',
  '36px': 'text-4xl',
  '48px': 'text-5xl',
  '60px': 'text-6xl',
  '72px': 'text-7xl',
  '96px': 'text-8xl',
  '128px': 'text-9xl',
};

// Border radius scale for Tailwind
export const TAILWIND_BORDER_RADIUS: Record<string, string> = {
  '0px': 'rounded-none',
  '2px': 'rounded-sm',
  '4px': 'rounded',
  '6px': 'rounded-md',
  '8px': 'rounded-lg',
  '12px': 'rounded-xl',
  '16px': 'rounded-2xl',
  '24px': 'rounded-3xl',
  '9999px': 'rounded-full',
};

export interface VisualEditorConfig {
  // Whether to prefer Tailwind classes over inline styles
  preferTailwind: boolean;
  // Whether to show element tree in sidebar
  showElementTree: boolean;
  // Whether to show source file info (requires Vite plugin)
  showSourceInfo: boolean;
  // Keyboard modifiers for multi-select
  multiSelectKey: 'ctrl' | 'meta' | 'shift';
  // Auto-save delay in ms (0 = manual save only)
  autoSaveDelay: number;
  // Maximum history entries
  maxHistoryEntries: number;
}

export const DEFAULT_VISUAL_EDITOR_CONFIG: VisualEditorConfig = {
  preferTailwind: true,
  showElementTree: true,
  showSourceInfo: false,
  multiSelectKey: 'ctrl', // Use 'meta' on Mac
  autoSaveDelay: 0,
  maxHistoryEntries: 50,
};
