// Visual Editor Module - Main exports
// This module provides a complete visual editing solution for React applications
// Compatible with both Vite React and Next.js templates

// Core types
export * from './types';

// Context and hooks
export {
  VisualEditorProvider,
  useVisualEditor,
  useVisualEditorShortcuts,
  type VisualEditorContextValue,
} from './context';

// UI Components
export { VisualEditorOverlay, ElementTree } from './overlay';
export { VisualEditorSidebar } from './sidebar';

// Iframe injection
export {
  VISUAL_EDITOR_INJECTION_SCRIPT,
  injectVisualEditorScript,
  VITE_VISUAL_EDITOR_PLUGIN_CODE,
} from './injection-script';

// Code generation utilities
export {
  cssToTailwindClass,
  updateClassName,
  generateInlineStyle,
  parseInlineStyle,
  mergeInlineStyles,
  updateCodeWithChanges,
  generateFileUpdate,
  type CodeUpdateResult,
} from './code-generator';

// Theme utilities
export {
  type Theme,
  type ThemeColors,
  BUILT_IN_THEMES,
  generateThemeCSS,
  generateVanillaCSS,
  generateCompleteVanillaCSS,
  generateGlobalsCSSForNextJS,
  generateAppCSSForVite,
  parseThemeFromCSS,
} from './themes';
