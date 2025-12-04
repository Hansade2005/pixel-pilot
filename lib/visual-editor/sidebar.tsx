"use client";

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useVisualEditor } from './context';
import type { SidebarPanel } from './types';
import {
  TAILWIND_MAPPINGS,
  TAILWIND_SPACING,
  TAILWIND_FONT_SIZES,
  TAILWIND_BORDER_RADIUS,
} from './types';
import {
  BUILT_IN_THEMES,
  generateVanillaCSS,
  type Theme,
} from './themes';
import { CUSTOM_THEMES } from './custom-themes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  X,
  Undo2,
  Redo2,
  Save,
  MousePointer2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ChevronUp,
  ChevronDown,
  Bold,
  Underline,
  Trash2,
  Tag,
  Upload,
  RotateCcw,
  Palette,
  Italic,
  Strikethrough,
  Type,
  Move,
} from 'lucide-react';
import { ThemesPanel } from './panels/themes-panel'

interface VisualEditorSidebarProps {
  className?: string;
  onSave?: () => Promise<void>;
  onTagToChat?: (elementInfo: {
    id: string;
    tagName: string;
    sourceFile?: string;
    sourceLine?: number;
    className: string;
    textContent?: string;
  }) => void;
  onPublish?: () => void;
  projectType?: 'nextjs' | 'vite' | 'unknown';
  hasUnsavedChanges?: boolean;
  onApplyTheme?: (theme: Theme, cssContent: string) => Promise<boolean>;
}

export function VisualEditorSidebar({ 
  className, 
  onSave, 
  onTagToChat,
  onPublish,
  projectType = 'unknown',
  hasUnsavedChanges = false,
  onApplyTheme,
}: VisualEditorSidebarProps) {
  const {
    state,
    config,
    setActivePanel,
    setActiveTool,
    setSidebarOpen,
    addPendingChange,
    applyChangesToFile,
    applyPendingDeletes,
    hasPendingDeletes,
    undo,
    redo,
    undoPendingChange,
    redoPendingChange,
    canUndoPending,
    canRedoPending,
    clearSelection,
    deleteSelectedElements,
    discardChangesForElement,
  } = useVisualEditor();

  const [isSaving, setIsSaving] = useState(false);
  const [hasEverSavedChanges, setHasEverSavedChanges] = useState(false);

  // Get the first selected element for editing
  const selectedElement = state.selectedElements[0]?.element;
  
  // Check if there are pending changes for the selected element OR pending deletes
  const hasPendingChanges = selectedElement 
    ? (state.pendingChanges.get(selectedElement.id)?.length ?? 0) > 0
    : false;
  
  // Show save button if there are ANY pending changes or deletes
  const hasAnythingToSave = hasPendingChanges || hasPendingDeletes() || 
    Array.from(state.pendingChanges.values()).some(c => c.length > 0);

  const handleSave = async () => {
    console.log('[Sidebar] handleSave clicked');
    console.log('[Sidebar] Selected element:', selectedElement);
    console.log('[Sidebar] Pending deletes:', state.pendingDeletes.size);
    console.log('[Sidebar] All pending changes:', state.pendingChanges);
    
    setIsSaving(true);
    try {
      // First apply any pending deletes
      if (hasPendingDeletes()) {
        console.log('[Sidebar] Applying pending deletes...');
        const deleteSuccess = await applyPendingDeletes();
        console.log('[Sidebar] Delete result:', deleteSuccess);
      }
      
      // Then apply style/text changes for selected element
      if (selectedElement) {
        const changes = state.pendingChanges.get(selectedElement.id) || [];
        console.log('[Sidebar] Changes to save:', changes);
        
        if (changes.length > 0) {
          console.log('[Sidebar] Calling applyChangesToFile...');
          const success = await applyChangesToFile(selectedElement.id, changes);
          console.log('[Sidebar] applyChangesToFile result:', success);
        }
      }
      
      if (onSave) {
        console.log('[Sidebar] Calling onSave callback...');
        await onSave();
      }
      setHasEverSavedChanges(true);
    } catch (error) {
      console.error('[Sidebar] handleSave error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!state.sidebarOpen) return null;

  return (
    <div
      className={cn(
        'fixed left-0 top-0 z-50 h-screen bg-background border-r shadow-lg flex flex-col',
        'w-64 sm:w-72 md:w-80 lg:w-80 xl:w-80', // More narrow on mobile for better responsiveness
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b bg-card/50">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="font-semibold text-sm truncate">Visual Editor</span>
          {state.selectedElements.length > 1 && (
            <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full">
              {state.selectedElements.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Save button in header - show when there are any pending changes or deletes */}
          {hasAnythingToSave && (
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="h-7 px-2 text-xs bg-green-600 hover:bg-green-700 text-white"
            >
              {isSaving ? (
                <>Saving...</>
              ) : (
                <>
                  <Save className="h-3 w-3 mr-1" />
                  Save
                </>
              )}
            </Button>
          )}
          {/* Discard button - show when there are pending changes for the selected element */}
          {selectedElement && hasPendingChanges && (
            <Button
              size="sm"
              onClick={() => {
                if (confirm('Discard all unsaved changes for this element?')) {
                  discardChangesForElement(selectedElement.id);
                }
              }}
              className="h-7 px-2 text-xs bg-red-600 hover:bg-red-700 text-white"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Discard
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => {
              // Use pending changes undo if there are pending changes, otherwise use saved history undo
              if (canUndoPending()) {
                undoPendingChange();
              } else {
                undo();
              }
            }}
            disabled={!canUndoPending() && state.historyIndex < 0}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => {
              // Use pending changes redo if there are pending changes, otherwise use saved history redo
              if (canRedoPending()) {
                redoPendingChange();
              } else {
                redo();
              }
            }}
            disabled={!canRedoPending() && state.historyIndex >= state.history.length - 1}
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setSidebarOpen(false)}
            title="Close sidebar"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Tools - Select and Delete */}
      <div className="flex items-center justify-center gap-1 p-2 border-b bg-muted/30">
        <ToolButton
          icon={<MousePointer2 className="h-4 w-4" />}
          isActive={state.activeTool === 'select'}
          onClick={() => setActiveTool('select')}
          tooltip="Select (V) - Click elements to edit"
        />
        {/* Delete button - only enabled when element is selected */}
        <ToolButton
          icon={<Trash2 className="h-4 w-4" />}
          isActive={state.activeTool === 'delete'}
          onClick={() => {
            if (state.selectedElements.length > 0) {
              // Confirm before deleting
              if (confirm(`Delete ${state.selectedElements.length} selected element(s)?`)) {
                deleteSelectedElements();
              }
            } else {
              setActiveTool('delete');
            }
          }}
          tooltip="Delete (Del)"
          disabled={state.selectedElements.length === 0 && state.activeTool !== 'delete'}
        />
      </div>

      {/* Main Mode Tabs */}
      <div className="flex border-b bg-muted/20">
        <button
          onClick={() => setActivePanel('styles')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors',
            ['styles', 'layout', 'spacing', 'typography'].includes(state.activePanel)
              ? 'bg-background text-foreground border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <MousePointer2 className="h-3.5 w-3.5" />
          Edit
        </button>
        <button
          onClick={() => setActivePanel('themes')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors',
            state.activePanel === 'themes'
              ? 'bg-background text-foreground border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Palette className="h-3.5 w-3.5" />
          Themes
        </button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {/* Edit Panel - Style editing for selected element */}
          {['styles', 'layout', 'spacing', 'typography', 'themes'].includes(state.activePanel) && (
            <>
              {selectedElement ? (
                <>
                  {/* Tag to Chat Button */}
                  <div className="mb-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2 text-xs bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-950/50 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300"
                      onClick={() => {
                        if (onTagToChat && selectedElement) {
                          onTagToChat({
                            id: selectedElement.id,
                            tagName: selectedElement.tagName,
                            sourceFile: selectedElement.sourceFile,
                            sourceLine: selectedElement.sourceLine,
                            className: selectedElement.className,
                            textContent: selectedElement.textContent,
                          });
                        }
                      }}
                    >
                      <Tag className="h-3.5 w-3.5" />
                      Tag to Chat
                    </Button>
                  </div>
                  
                  <Tabs value={state.activePanel} onValueChange={(v) => setActivePanel(v as SidebarPanel)} className="w-full">
                    <TabsList className="grid w-full grid-cols-5 h-8 mb-3">
                      <TabsTrigger value="styles" className="text-xs px-1">Styles</TabsTrigger>
                      <TabsTrigger value="layout" className="text-xs px-1">Layout</TabsTrigger>
                      <TabsTrigger value="spacing" className="text-xs px-1">Spacing</TabsTrigger>
                      <TabsTrigger value="typography" className="text-xs px-1">Text</TabsTrigger>
                      <TabsTrigger value="themes" className="text-xs px-1">Themes</TabsTrigger>
                    </TabsList>

                    <TabsContent value="styles" className="mt-0">
                      <ScrollArea className="h-64">
                        <StylesPanel element={selectedElement} />
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="layout" className="mt-0 space-y-2">
                      <LayoutPanel element={selectedElement} />
                    </TabsContent>

                    <TabsContent value="spacing" className="mt-0">
                      <ScrollArea className="h-64">
                        <SpacingPanel element={selectedElement} />
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="typography" className="mt-0">
                      <ScrollArea className="h-64">
                        <TypographyPanel element={selectedElement} />
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="themes" className="mt-0">
                      <ScrollArea className="h-64">
                        <ThemesPanel 
                          onApplyTheme={onApplyTheme}
                          projectType={projectType}
                        />
                      </ScrollArea>
                    </TabsContent>
                  </Tabs>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
                  <MousePointer2 className="h-12 w-12 mb-4 opacity-50" />
                  <p className="text-sm">Select an element to edit</p>
                  <p className="text-xs mt-1">Click on any element in the canvas</p>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Footer with Publish button */}
      <div className="p-2 border-t bg-muted/30 space-y-2">
        {/* Publish button - shows only after changes have been made and saved */}
        {hasEverSavedChanges && hasUnsavedChanges === false && onPublish && (
          <Button
            size="sm"
            className="w-full gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
            onClick={onPublish}
          >
            <Upload className="h-3.5 w-3.5" />
            Publish Preview
          </Button>
        )}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Changes: {Array.from(state.pendingChanges.values()).reduce((total, changes) => total + changes.length, 0)}</span>
          <span>Selected: {state.selectedElements.length}</span>
        </div>
      </div>
    </div>
  );
}

// Tool button component
interface ToolButtonProps {
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
  tooltip: string;
  disabled?: boolean;
}

function ToolButton({ icon, isActive, onClick, tooltip, disabled }: ToolButtonProps) {
  return (
    <Button
      variant={isActive ? 'secondary' : 'ghost'}
      size="icon"
      className={cn('h-8 w-8', disabled && 'opacity-50 cursor-not-allowed')}
      onClick={onClick}
      title={tooltip}
      disabled={disabled}
    >
      {icon}
    </Button>
  );
}

// Styles Panel
interface StylesPanelProps {
  element: NonNullable<ReturnType<typeof useVisualEditor>['state']['selectedElements'][0]>['element'];
}

// Helper function to safely get computed style values with defaults
function getComputedStyleValue(
  computedStyles: StylesPanelProps['element']['computedStyles'] | undefined,
  property: keyof StylesPanelProps['element']['computedStyles'],
  defaultValue: string = ''
): string {
  if (!computedStyles) return defaultValue;
  return computedStyles[property] ?? defaultValue;
}

function StylesPanel({ element }: StylesPanelProps) {
  // Always call hooks at the top level - before any conditional returns
  const { addPendingChange } = useVisualEditor();

  // Guard against missing computedStyles - after hooks
  if (!element?.computedStyles) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Unable to load element styles. Please try selecting another element.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Background Color */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Background</Label>
        <ColorPicker
          value={element.computedStyles.backgroundColor}
          onChange={(color) => {
            addPendingChange(element.id, [{
              property: 'backgroundColor',
              oldValue: element.computedStyles.backgroundColor,
              newValue: color,
              useTailwind: false,
            }]);
          }}
        />
      </div>

      {/* Text Color */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Text Color</Label>
        <ColorPicker
          value={element.computedStyles.color}
          onChange={(color) => {
            addPendingChange(element.id, [{
              property: 'color',
              oldValue: element.computedStyles.color,
              newValue: color,
              useTailwind: false,
            }]);
          }}
        />
      </div>

      <Separator />

      {/* Border */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Border Width</Label>
        <Select
          value={element.computedStyles.borderWidth || '0px'}
          onValueChange={(value) => {
            addPendingChange(element.id, [{
              property: 'borderWidth',
              oldValue: element.computedStyles.borderWidth || '0px',
              newValue: value,
              useTailwind: true,
              tailwindClass: value === '0px' ? 'border-0' : value === '1px' ? 'border' : value === '2px' ? 'border-2' : value === '4px' ? 'border-4' : 'border-8',
            }]);
          }}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0px">None</SelectItem>
            <SelectItem value="1px">1px</SelectItem>
            <SelectItem value="2px">2px</SelectItem>
            <SelectItem value="4px">4px</SelectItem>
            <SelectItem value="8px">8px</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Border Style</Label>
        <Select
          value={element.computedStyles.borderStyle || 'solid'}
          onValueChange={(value) => {
            addPendingChange(element.id, [{
              property: 'borderStyle',
              oldValue: element.computedStyles.borderStyle || 'solid',
              newValue: value,
              useTailwind: true,
              tailwindClass: value === 'solid' ? 'border-solid' : value === 'dashed' ? 'border-dashed' : value === 'dotted' ? 'border-dotted' : value === 'double' ? 'border-double' : 'border-none',
            }]);
          }}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="solid">Solid</SelectItem>
            <SelectItem value="dashed">Dashed</SelectItem>
            <SelectItem value="dotted">Dotted</SelectItem>
            <SelectItem value="double">Double</SelectItem>
            <SelectItem value="none">None</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Border Color</Label>
        <ColorPicker
          value={element.computedStyles.borderColor}
          onChange={(color) => {
            addPendingChange(element.id, [{
              property: 'borderColor',
              oldValue: element.computedStyles.borderColor || 'transparent',
              newValue: color,
              useTailwind: false,
            }]);
          }}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Border Radius</Label>
        <Select
          value={element.computedStyles.borderRadius || '0px'}
          onValueChange={(value) => {
            addPendingChange(element.id, [{
              property: 'borderRadius',
              oldValue: element.computedStyles.borderRadius || '0px',
              newValue: value,
              useTailwind: true,
              tailwindClass: TAILWIND_BORDER_RADIUS[value],
            }]);
          }}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(TAILWIND_BORDER_RADIUS).map(([px, tw]) => (
              <SelectItem key={px} value={px}>
                {tw} ({px})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Box Shadow */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Box Shadow</Label>
        <Select
          value={element.computedStyles.boxShadow || 'none'}
          onValueChange={(value) => {
            addPendingChange(element.id, [{
              property: 'boxShadow',
              oldValue: element.computedStyles.boxShadow || 'none',
              newValue: value,
              useTailwind: true,
              tailwindClass: value === 'none' ? 'shadow-none' : value === '0 1px 2px 0 rgb(0 0 0 / 0.05)' ? 'shadow-sm' : value === '0 1px 3px 0 rgb(0 0 0 / 0.1)' ? 'shadow' : value === '0 4px 6px -1px rgb(0 0 0 / 0.1)' ? 'shadow-md' : value === '0 10px 15px -3px rgb(0 0 0 / 0.1)' ? 'shadow-lg' : value === '0 20px 25px -5px rgb(0 0 0 / 0.1)' ? 'shadow-xl' : 'shadow-2xl',
            }]);
          }}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="0 1px 2px 0 rgb(0 0 0 / 0.05)">Small</SelectItem>
            <SelectItem value="0 1px 3px 0 rgb(0 0 0 / 0.1)">Base</SelectItem>
            <SelectItem value="0 4px 6px -1px rgb(0 0 0 / 0.1)">Medium</SelectItem>
            <SelectItem value="0 10px 15px -3px rgb(0 0 0 / 0.1)">Large</SelectItem>
            <SelectItem value="0 20px 25px -5px rgb(0 0 0 / 0.1)">XL</SelectItem>
            <SelectItem value="0 25px 50px -12px rgb(0 0 0 / 0.25)">2XL</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Transform Scale */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">
          Scale: {Math.round((parseFloat(element.computedStyles.transform?.match(/scale\(([^)]+)\)/)?.[1] || '1') * 100))}%
        </Label>
        <Slider
          value={[parseFloat(element.computedStyles.transform?.match(/scale\(([^)]+)\)/)?.[1] || '1') * 100]}
          min={0}
          max={200}
          step={5}
          onValueChange={([value]) => {
            addPendingChange(element.id, [{
              property: 'transform',
              oldValue: element.computedStyles.transform || 'none',
              newValue: `scale(${value / 100})`,
              useTailwind: true,
              tailwindClass: `scale-[${value}]`,
            }]);
          }}
        />
      </div>

      {/* Backdrop Filter */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Backdrop Blur</Label>
        <Select
          value={element.computedStyles.backdropFilter || 'none'}
          onValueChange={(value) => {
            addPendingChange(element.id, [{
              property: 'backdropFilter',
              oldValue: element.computedStyles.backdropFilter || 'none',
              newValue: value,
              useTailwind: true,
              tailwindClass: value === 'none' ? 'backdrop-blur-none' : value === 'blur(4px)' ? 'backdrop-blur-sm' : value === 'blur(8px)' ? 'backdrop-blur' : value === 'blur(12px)' ? 'backdrop-blur-md' : value === 'blur(16px)' ? 'backdrop-blur-lg' : 'backdrop-blur-xl',
            }]);
          }}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="blur(4px)">Small</SelectItem>
            <SelectItem value="blur(8px)">Base</SelectItem>
            <SelectItem value="blur(12px)">Medium</SelectItem>
            <SelectItem value="blur(16px)">Large</SelectItem>
            <SelectItem value="blur(24px)">XL</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Opacity */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">
          Opacity: {Math.round(parseFloat(element.computedStyles.opacity || '1') * 100)}%
        </Label>
        <Slider
          value={[parseFloat(element.computedStyles.opacity || '1') * 100]}
          min={0}
          max={100}
          step={5}
          onValueChange={([value]) => {
            addPendingChange(element.id, [{
              property: 'opacity',
              oldValue: element.computedStyles.opacity || '1',
              newValue: String(value / 100),
              useTailwind: false,
            }]);
          }}
        />
      </div>
    </div>
  );
}

// Layout Panel
function LayoutPanel({ element }: StylesPanelProps) {
  // Always call hooks at the top level - before any conditional returns
  const { addPendingChange } = useVisualEditor();

  // Guard against missing computedStyles - after hooks
  if (!element?.computedStyles) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Unable to load element layout. Please try selecting another element.
      </div>
    );
  }

  // Safe access to display property with default
  const display = element.computedStyles.display || 'block';

  return (
    <div className="space-y-4">
      {/* Position */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Position</Label>
        <Select
          value={element.computedStyles.position || 'static'}
          onValueChange={(value) => {
            addPendingChange(element.id, [{
              property: 'position',
              oldValue: element.computedStyles.position || 'static',
              newValue: value,
              useTailwind: true,
              tailwindClass: value === 'static' ? 'static' : value === 'relative' ? 'relative' : value === 'absolute' ? 'absolute' : value === 'fixed' ? 'fixed' : 'sticky',
            }]);
          }}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="static">Static</SelectItem>
            <SelectItem value="relative">Relative</SelectItem>
            <SelectItem value="absolute">Absolute</SelectItem>
            <SelectItem value="fixed">Fixed</SelectItem>
            <SelectItem value="sticky">Sticky</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Z-Index */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Z-Index</Label>
        <Input
          type="number"
          className="h-8"
          value={element.computedStyles.zIndex || 'auto'}
          onChange={(e) => {
            addPendingChange(element.id, [{
              property: 'zIndex',
              oldValue: element.computedStyles.zIndex || 'auto',
              newValue: e.target.value,
              useTailwind: true,
              tailwindClass: `z-[${e.target.value}]`,
            }]);
          }}
        />
      </div>

      {/* Overflow */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Overflow</Label>
        <Select
          value={element.computedStyles.overflow || 'visible'}
          onValueChange={(value) => {
            addPendingChange(element.id, [{
              property: 'overflow',
              oldValue: element.computedStyles.overflow || 'visible',
              newValue: value,
              useTailwind: true,
              tailwindClass: value === 'visible' ? 'overflow-visible' : value === 'hidden' ? 'overflow-hidden' : value === 'scroll' ? 'overflow-scroll' : 'overflow-auto',
            }]);
          }}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="visible">Visible</SelectItem>
            <SelectItem value="hidden">Hidden</SelectItem>
            <SelectItem value="scroll">Scroll</SelectItem>
            <SelectItem value="auto">Auto</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Display */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Display</Label>
        <Select
          value={display}
          onValueChange={(value) => {
            addPendingChange(element.id, [{
              property: 'display',
              oldValue: display,
              newValue: value,
              useTailwind: true,
              tailwindClass: TAILWIND_MAPPINGS.display[value],
            }]);
          }}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="block">Block</SelectItem>
            <SelectItem value="flex">Flex</SelectItem>
            <SelectItem value="grid">Grid</SelectItem>
            <SelectItem value="inline">Inline</SelectItem>
            <SelectItem value="inline-block">Inline Block</SelectItem>
            <SelectItem value="inline-flex">Inline Flex</SelectItem>
            <SelectItem value="none">Hidden</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Flex Direction (only if display is flex) */}
      {display.includes('flex') && (
        <>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Flex Direction</Label>
            <Select
              value={element.computedStyles.flexDirection || 'row'}
              onValueChange={(value) => {
                addPendingChange(element.id, [{
                  property: 'flexDirection',
                  oldValue: element.computedStyles.flexDirection || 'row',
                  newValue: value,
                  useTailwind: true,
                  tailwindClass: TAILWIND_MAPPINGS.flexDirection[value],
                }]);
              }}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="row">Row</SelectItem>
                <SelectItem value="row-reverse">Row Reverse</SelectItem>
                <SelectItem value="column">Column</SelectItem>
                <SelectItem value="column-reverse">Column Reverse</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Flex Wrap</Label>
            <Select
              value={element.computedStyles.flexWrap || 'nowrap'}
              onValueChange={(value) => {
                addPendingChange(element.id, [{
                  property: 'flexWrap',
                  oldValue: element.computedStyles.flexWrap || 'nowrap',
                  newValue: value,
                  useTailwind: true,
                  tailwindClass: value === 'nowrap' ? 'flex-nowrap' : value === 'wrap' ? 'flex-wrap' : 'flex-wrap-reverse',
                }]);
              }}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nowrap">No Wrap</SelectItem>
                <SelectItem value="wrap">Wrap</SelectItem>
                <SelectItem value="wrap-reverse">Wrap Reverse</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Justify Content</Label>
            <div className="flex gap-1">
              {[
                { value: 'flex-start', icon: <AlignLeft className="h-4 w-4" /> },
                { value: 'center', icon: <AlignCenter className="h-4 w-4" /> },
                { value: 'flex-end', icon: <AlignRight className="h-4 w-4" /> },
                { value: 'space-between', icon: <AlignJustify className="h-4 w-4" /> },
              ].map(({ value, icon }) => (
                <Button
                  key={value}
                  variant={element.computedStyles.justifyContent === value ? 'secondary' : 'outline'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    addPendingChange(element.id, [{
                      property: 'justifyContent',
                      oldValue: element.computedStyles.justifyContent || 'flex-start',
                      newValue: value,
                      useTailwind: true,
                      tailwindClass: TAILWIND_MAPPINGS.justifyContent[value],
                    }]);
                  }}
                >
                  {icon}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Align Items</Label>
            <Select
              value={element.computedStyles.alignItems || 'stretch'}
              onValueChange={(value) => {
                addPendingChange(element.id, [{
                  property: 'alignItems',
                  oldValue: element.computedStyles.alignItems || 'stretch',
                  newValue: value,
                  useTailwind: true,
                  tailwindClass: TAILWIND_MAPPINGS.alignItems[value],
                }]);
              }}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="flex-start">Start</SelectItem>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="flex-end">End</SelectItem>
                <SelectItem value="baseline">Baseline</SelectItem>
                <SelectItem value="stretch">Stretch</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Align Self</Label>
            <Select
              value={element.computedStyles.alignSelf || 'auto'}
              onValueChange={(value) => {
                addPendingChange(element.id, [{
                  property: 'alignSelf',
                  oldValue: element.computedStyles.alignSelf || 'auto',
                  newValue: value,
                  useTailwind: true,
                  tailwindClass: value === 'auto' ? 'self-auto' : value === 'flex-start' ? 'self-start' : value === 'center' ? 'self-center' : value === 'flex-end' ? 'self-end' : 'self-stretch',
                }]);
              }}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto</SelectItem>
                <SelectItem value="flex-start">Start</SelectItem>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="flex-end">End</SelectItem>
                <SelectItem value="stretch">Stretch</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Order</Label>
            <Input
              type="number"
              className="h-8"
              value={parseInt(element.computedStyles.order || '0', 10)}
              onChange={(e) => {
                addPendingChange(element.id, [{
                  property: 'order',
                  oldValue: element.computedStyles.order || '0',
                  newValue: e.target.value,
                  useTailwind: true,
                  tailwindClass: `order-[${e.target.value}]`,
                }]);
              }}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Gap</Label>
            <SpacingInput
              value={element.computedStyles.gap || '0px'}
              onChange={(value) => {
                addPendingChange(element.id, [{
                  property: 'gap',
                  oldValue: element.computedStyles.gap || '0px',
                  newValue: value,
                  useTailwind: true,
                }]);
              }}
            />
          </div>
        </>
      )}

      {/* Grid Layout (only if display is grid) */}
      {display === 'grid' && (
        <>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Grid Columns</Label>
            <Select
              value={element.computedStyles.gridTemplateColumns || 'none'}
              onValueChange={(value) => {
                addPendingChange(element.id, [{
                  property: 'gridTemplateColumns',
                  oldValue: element.computedStyles.gridTemplateColumns || 'none',
                  newValue: value,
                  useTailwind: true,
                  tailwindClass: value === 'none' ? 'grid-cols-none' : `grid-cols-${value}`,
                }]);
              }}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="1">1 Column</SelectItem>
                <SelectItem value="2">2 Columns</SelectItem>
                <SelectItem value="3">3 Columns</SelectItem>
                <SelectItem value="4">4 Columns</SelectItem>
                <SelectItem value="6">6 Columns</SelectItem>
                <SelectItem value="12">12 Columns</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Grid Rows</Label>
            <Select
              value={element.computedStyles.gridTemplateRows || 'none'}
              onValueChange={(value) => {
                addPendingChange(element.id, [{
                  property: 'gridTemplateRows',
                  oldValue: element.computedStyles.gridTemplateRows || 'none',
                  newValue: value,
                  useTailwind: true,
                  tailwindClass: value === 'none' ? 'grid-rows-none' : `grid-rows-${value}`,
                }]);
              }}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="1">1 Row</SelectItem>
                <SelectItem value="2">2 Rows</SelectItem>
                <SelectItem value="3">3 Rows</SelectItem>
                <SelectItem value="4">4 Rows</SelectItem>
                <SelectItem value="6">6 Rows</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Gap</Label>
            <SpacingInput
              value={element.computedStyles.gap || '0px'}
              onChange={(value) => {
                addPendingChange(element.id, [{
                  property: 'gap',
                  oldValue: element.computedStyles.gap || '0px',
                  newValue: value,
                  useTailwind: true,
                }]);
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}

// Spacing Panel
function SpacingPanel({ element }: StylesPanelProps) {
  const { addPendingChange } = useVisualEditor();

  // Guard against missing computedStyles
  if (!element?.computedStyles) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Unable to load element spacing. Please try selecting another element.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Margin */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground font-medium">Margin</Label>
        <div className="grid grid-cols-3 gap-2 place-items-center">
          <div />
          <SpacingInput
            value={element.computedStyles.marginTop}
            onChange={(value) => {
              addPendingChange(element.id, [{
                property: 'marginTop',
                oldValue: element.computedStyles.marginTop,
                newValue: value,
                useTailwind: true,
              }]);
            }}
            label={<ArrowUp className="h-3 w-3" />}
          />
          <div />
          
          <SpacingInput
            value={element.computedStyles.marginLeft}
            onChange={(value) => {
              addPendingChange(element.id, [{
                property: 'marginLeft',
                oldValue: element.computedStyles.marginLeft,
                newValue: value,
                useTailwind: true,
              }]);
            }}
            label={<ArrowLeft className="h-3 w-3" />}
          />
          <div className="w-12 h-12 border-2 border-dashed rounded flex items-center justify-center text-xs text-muted-foreground">
            M
          </div>
          <SpacingInput
            value={element.computedStyles.marginRight}
            onChange={(value) => {
              addPendingChange(element.id, [{
                property: 'marginRight',
                oldValue: element.computedStyles.marginRight,
                newValue: value,
                useTailwind: true,
              }]);
            }}
            label={<ArrowRight className="h-3 w-3" />}
          />
          
          <div />
          <SpacingInput
            value={element.computedStyles.marginBottom}
            onChange={(value) => {
              addPendingChange(element.id, [{
                property: 'marginBottom',
                oldValue: element.computedStyles.marginBottom,
                newValue: value,
                useTailwind: true,
              }]);
            }}
            label={<ArrowDown className="h-3 w-3" />}
          />
          <div />
        </div>
      </div>

      <Separator />

      {/* Padding */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground font-medium">Padding</Label>
        <div className="grid grid-cols-3 gap-2 place-items-center">
          <div />
          <SpacingInput
            value={element.computedStyles.paddingTop}
            onChange={(value) => {
              addPendingChange(element.id, [{
                property: 'paddingTop',
                oldValue: element.computedStyles.paddingTop,
                newValue: value,
                useTailwind: true,
              }]);
            }}
            label={<ChevronUp className="h-3 w-3" />}
          />
          <div />
          
          <SpacingInput
            value={element.computedStyles.paddingLeft}
            onChange={(value) => {
              addPendingChange(element.id, [{
                property: 'paddingLeft',
                oldValue: element.computedStyles.paddingLeft,
                newValue: value,
                useTailwind: true,
              }]);
            }}
            label={<ArrowLeft className="h-3 w-3" />}
          />
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded flex items-center justify-center text-xs text-green-600 dark:text-green-400">
            P
          </div>
          <SpacingInput
            value={element.computedStyles.paddingRight}
            onChange={(value) => {
              addPendingChange(element.id, [{
                property: 'paddingRight',
                oldValue: element.computedStyles.paddingRight,
                newValue: value,
                useTailwind: true,
              }]);
            }}
            label={<ArrowRight className="h-3 w-3" />}
          />
          
          <div />
          <SpacingInput
            value={element.computedStyles.paddingBottom}
            onChange={(value) => {
              addPendingChange(element.id, [{
                property: 'paddingBottom',
                oldValue: element.computedStyles.paddingBottom,
                newValue: value,
                useTailwind: true,
              }]);
            }}
            label={<ChevronDown className="h-3 w-3" />}
          />
          <div />
        </div>
      </div>

      <Separator />

      {/* Size */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground font-medium">Size</Label>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Width</Label>
            <Input
              className="h-8"
              value={element.computedStyles.width}
              onChange={(e) => {
                addPendingChange(element.id, [{
                  property: 'width',
                  oldValue: element.computedStyles.width,
                  newValue: e.target.value,
                  useTailwind: false,
                }]);
              }}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Height</Label>
            <Input
              className="h-8"
              value={element.computedStyles.height}
              onChange={(e) => {
                addPendingChange(element.id, [{
                  property: 'height',
                  oldValue: element.computedStyles.height,
                  newValue: e.target.value,
                  useTailwind: false,
                }]);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Typography Panel
function TypographyPanel({ element }: StylesPanelProps) {
  const { addPendingChange, updateElementText } = useVisualEditor();

  // Guard against missing computedStyles
  if (!element?.computedStyles) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Unable to load typography styles. Please try selecting another element.
      </div>
    );
  }

  // Safe font family extraction
  const fontFamily = element.computedStyles.fontFamily || 'system-ui';
  const displayFontFamily = fontFamily.split(',')[0]?.replace(/['"]/g, '').trim() || 'system-ui';

  return (
    <div className="space-y-4">
      {/* Text Content */}
      {element.textContent !== undefined && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Text Content</Label>
          <textarea
            className="w-full min-h-[80px] p-2 text-sm border rounded resize-none bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            value={element.textContent || ''}
            onChange={(e) => {
              updateElementText(element.id, e.target.value);
            }}
            placeholder="Enter text content..."
          />
        </div>
      )}

      {/* Font Family */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Font Family</Label>
        <Select
          value={displayFontFamily}
          onValueChange={(value) => {
            addPendingChange(element.id, [{
              property: 'fontFamily',
              oldValue: fontFamily,
              newValue: value,
              useTailwind: true,
            }]);
          }}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-[400px]">
            {/* Built-in Tailwind Fonts */}
            <SelectItem value="ui-sans-serif, system-ui, -apple-system, sans-serif" className="font-medium text-muted-foreground">— Tailwind Defaults —</SelectItem>
            <SelectItem value="Inter, ui-sans-serif, system-ui">font-sans (Inter)</SelectItem>
            <SelectItem value="ui-serif, Georgia, Cambria, serif">font-serif</SelectItem>
            <SelectItem value="ui-monospace, SFMono-Regular, Menlo, monospace">font-mono</SelectItem>
            
            {/* Popular Sans-serif Google Fonts */}
            <SelectItem value="separator-sans" disabled className="font-medium text-muted-foreground">— Sans-serif —</SelectItem>
            <SelectItem value="Inter">Inter</SelectItem>
            <SelectItem value="Poppins">Poppins</SelectItem>
            <SelectItem value="Roboto">Roboto</SelectItem>
            <SelectItem value="Open Sans">Open Sans</SelectItem>
            <SelectItem value="Montserrat">Montserrat</SelectItem>
            <SelectItem value="Lato">Lato</SelectItem>
            <SelectItem value="Nunito">Nunito</SelectItem>
            <SelectItem value="Raleway">Raleway</SelectItem>
            <SelectItem value="Source Sans Pro">Source Sans Pro</SelectItem>
            <SelectItem value="Work Sans">Work Sans</SelectItem>
            <SelectItem value="Urbanist">Urbanist</SelectItem>
            <SelectItem value="Outfit">Outfit</SelectItem>
            <SelectItem value="DM Sans">DM Sans</SelectItem>
            <SelectItem value="Plus Jakarta Sans">Plus Jakarta Sans</SelectItem>
            <SelectItem value="Lexend">Lexend</SelectItem>
            <SelectItem value="Space Grotesk">Space Grotesk</SelectItem>
            <SelectItem value="Figtree">Figtree</SelectItem>
            <SelectItem value="Cabin">Cabin</SelectItem>
            <SelectItem value="PT Sans">PT Sans</SelectItem>
            <SelectItem value="Manrope">Manrope</SelectItem>
            <SelectItem value="Mulish">Mulish</SelectItem>
            <SelectItem value="Sofia Sans">Sofia Sans</SelectItem>
            <SelectItem value="Josefin Sans">Josefin Sans</SelectItem>
            
            {/* Serif Fonts */}
            <SelectItem value="separator-serif" disabled className="font-medium text-muted-foreground">— Serif —</SelectItem>
            <SelectItem value="Merriweather">Merriweather</SelectItem>
            <SelectItem value="Playfair Display">Playfair Display</SelectItem>
            <SelectItem value="Lora">Lora</SelectItem>
            <SelectItem value="Domine">Domine</SelectItem>
            <SelectItem value="Crimson Text">Crimson Text</SelectItem>
            <SelectItem value="DM Serif Display">DM Serif Display</SelectItem>
            <SelectItem value="DM Serif Text">DM Serif Text</SelectItem>
            <SelectItem value="Cormorant Garamond">Cormorant Garamond</SelectItem>
            <SelectItem value="Cardo">Cardo</SelectItem>
            <SelectItem value="Libre Baskerville">Libre Baskerville</SelectItem>
            <SelectItem value="Spectral">Spectral</SelectItem>
            <SelectItem value="EB Garamond">EB Garamond</SelectItem>
            <SelectItem value="Old Standard TT">Old Standard TT</SelectItem>
            <SelectItem value="Bodoni Moda">Bodoni Moda</SelectItem>
            <SelectItem value="Cormorant">Cormorant</SelectItem>
            <SelectItem value="Cinzel">Cinzel</SelectItem>
            <SelectItem value="Cinzel Decorative">Cinzel Decorative</SelectItem>
            <SelectItem value="Forum">Forum</SelectItem>
            <SelectItem value="Tenor Sans">Tenor Sans</SelectItem>
            <SelectItem value="Gilda Display">Gilda Display</SelectItem>
            <SelectItem value="Fraunces">Fraunces</SelectItem>
            <SelectItem value="Rosarivo">Rosarivo</SelectItem>
            
            {/* Monospace Fonts */}
            <SelectItem value="separator-mono" disabled className="font-medium text-muted-foreground">— Monospace —</SelectItem>
            <SelectItem value="JetBrains Mono">JetBrains Mono</SelectItem>
            <SelectItem value="Fira Code">Fira Code</SelectItem>
            <SelectItem value="Source Code Pro">Source Code Pro</SelectItem>
            <SelectItem value="IBM Plex Mono">IBM Plex Mono</SelectItem>
            <SelectItem value="Inconsolata">Inconsolata</SelectItem>
            <SelectItem value="Space Mono">Space Mono</SelectItem>
            <SelectItem value="Cousine">Cousine</SelectItem>
            <SelectItem value="Noto Sans Mono">Noto Sans Mono</SelectItem>
            
            {/* Handwritten / Script Fonts */}
            <SelectItem value="separator-script" disabled className="font-medium text-muted-foreground">— Handwritten / Script —</SelectItem>
            <SelectItem value="Pacifico">Pacifico</SelectItem>
            <SelectItem value="Dancing Script">Dancing Script</SelectItem>
            <SelectItem value="Caveat">Caveat</SelectItem>
            <SelectItem value="Sacramento">Sacramento</SelectItem>
            <SelectItem value="Shantell Sans">Shantell Sans</SelectItem>
            <SelectItem value="Amatic SC">Amatic SC</SelectItem>
            <SelectItem value="Great Vibes">Great Vibes</SelectItem>
            <SelectItem value="Parisienne">Parisienne</SelectItem>
            <SelectItem value="Shadows Into Light">Shadows Into Light</SelectItem>
            <SelectItem value="Yellowtail">Yellowtail</SelectItem>
            <SelectItem value="Satisfy">Satisfy</SelectItem>
            <SelectItem value="Allura">Allura</SelectItem>
            <SelectItem value="Indie Flower">Indie Flower</SelectItem>
            <SelectItem value="Kristi">Kristi</SelectItem>
            <SelectItem value="Bad Script">Bad Script</SelectItem>
            <SelectItem value="Mrs Saint Delafield">Mrs Saint Delafield</SelectItem>
            <SelectItem value="Marck Script">Marck Script</SelectItem>
            
            {/* Display / Decorative Fonts */}
            <SelectItem value="separator-display" disabled className="font-medium text-muted-foreground">— Display / Decorative —</SelectItem>
            <SelectItem value="Bebas Neue">Bebas Neue</SelectItem>
            <SelectItem value="Oswald">Oswald</SelectItem>
            <SelectItem value="Anton">Anton</SelectItem>
            <SelectItem value="Abril Fatface">Abril Fatface</SelectItem>
            <SelectItem value="Bungee">Bungee</SelectItem>
            <SelectItem value="Alfa Slab One">Alfa Slab One</SelectItem>
            <SelectItem value="Lobster">Lobster</SelectItem>
            <SelectItem value="Rubik Dirt">Rubik Dirt</SelectItem>
            <SelectItem value="Playball">Playball</SelectItem>
            <SelectItem value="Fredoka One">Fredoka One</SelectItem>
            <SelectItem value="Monoton">Monoton</SelectItem>
            <SelectItem value="Righteous">Righteous</SelectItem>
            <SelectItem value="Ultra">Ultra</SelectItem>
            <SelectItem value="Press Start 2P">Press Start 2P</SelectItem>
            <SelectItem value="Rampart One">Rampart One</SelectItem>
            
            {/* Futuristic / Tech Fonts */}
            <SelectItem value="separator-tech" disabled className="font-medium text-muted-foreground">— Futuristic / Tech —</SelectItem>
            <SelectItem value="Orbitron">Orbitron</SelectItem>
            <SelectItem value="Exo 2">Exo 2</SelectItem>
            <SelectItem value="Audiowide">Audiowide</SelectItem>
            <SelectItem value="Oxanium">Oxanium</SelectItem>
            <SelectItem value="Quantico">Quantico</SelectItem>
            <SelectItem value="Syncopate">Syncopate</SelectItem>
            <SelectItem value="Teko">Teko</SelectItem>
            <SelectItem value="Rajdhani">Rajdhani</SelectItem>
            <SelectItem value="Changa">Changa</SelectItem>
            <SelectItem value="Michroma">Michroma</SelectItem>
            
            {/* System Fonts */}
            <SelectItem value="separator-system" disabled className="font-medium text-muted-foreground">— System Fonts —</SelectItem>
            <SelectItem value="system-ui">System UI</SelectItem>
            <SelectItem value="Arial">Arial</SelectItem>
            <SelectItem value="Helvetica">Helvetica</SelectItem>
            <SelectItem value="Georgia">Georgia</SelectItem>
            <SelectItem value="Times New Roman">Times New Roman</SelectItem>
            <SelectItem value="Courier New">Courier New</SelectItem>
            <SelectItem value="Verdana">Verdana</SelectItem>
            <SelectItem value="Tahoma">Tahoma</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Font Size */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Font Size</Label>
        <Select
          value={element.computedStyles.fontSize || '16px'}
          onValueChange={(value) => {
            addPendingChange(element.id, [{
              property: 'fontSize',
              oldValue: element.computedStyles.fontSize || '16px',
              newValue: value,
              useTailwind: true,
              tailwindClass: TAILWIND_FONT_SIZES[value],
            }]);
          }}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(TAILWIND_FONT_SIZES).map(([px, tw]) => (
              <SelectItem key={px} value={px}>
                {tw} ({px})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Font Weight */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Font Weight</Label>
        <Select
          value={element.computedStyles.fontWeight || '400'}
          onValueChange={(value) => {
            addPendingChange(element.id, [{
              property: 'fontWeight',
              oldValue: element.computedStyles.fontWeight || '400',
              newValue: value,
              useTailwind: true,
              tailwindClass: TAILWIND_MAPPINGS.fontWeight[value],
            }]);
          }}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(TAILWIND_MAPPINGS.fontWeight).map(([weight, tw]) => (
              <SelectItem key={weight} value={weight}>
                {tw} ({weight})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Text Align */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Text Align</Label>
        <div className="flex gap-1">
          {[
            { value: 'left', icon: <AlignLeft className="h-4 w-4" /> },
            { value: 'center', icon: <AlignCenter className="h-4 w-4" /> },
            { value: 'right', icon: <AlignRight className="h-4 w-4" /> },
            { value: 'justify', icon: <AlignJustify className="h-4 w-4" /> },
          ].map(({ value, icon }) => (
            <Button
              key={value}
              variant={element.computedStyles.textAlign === value ? 'secondary' : 'outline'}
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                addPendingChange(element.id, [{
                  property: 'textAlign',
                  oldValue: element.computedStyles.textAlign || 'left',
                  newValue: value,
                  useTailwind: true,
                  tailwindClass: TAILWIND_MAPPINGS.textAlign[value],
                }]);
              }}
            >
              {icon}
            </Button>
          ))}
        </div>
      </div>

      {/* Line Height */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Line Height</Label>
        <Input
          className="h-8"
          value={element.computedStyles.lineHeight}
          onChange={(e) => {
            addPendingChange(element.id, [{
              property: 'lineHeight',
              oldValue: element.computedStyles.lineHeight,
              newValue: e.target.value,
              useTailwind: false,
            }]);
          }}
        />
      </div>

      {/* Text Decoration */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Text Style</Label>
        <div className="flex gap-1">
          <Button
            variant={element.computedStyles.fontWeight === '700' ? 'secondary' : 'outline'}
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              const newWeight = element.computedStyles.fontWeight === '700' ? '400' : '700';
              addPendingChange(element.id, [{
                property: 'fontWeight',
                oldValue: element.computedStyles.fontWeight,
                newValue: newWeight,
                useTailwind: true,
                tailwindClass: newWeight === '700' ? 'font-bold' : 'font-normal',
              }]);
            }}
            title="Bold"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            variant={element.computedStyles.fontStyle === 'italic' ? 'secondary' : 'outline'}
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              const newStyle = element.computedStyles.fontStyle === 'italic' ? 'normal' : 'italic';
              addPendingChange(element.id, [{
                property: 'fontStyle',
                oldValue: element.computedStyles.fontStyle || 'normal',
                newValue: newStyle,
                useTailwind: true,
                tailwindClass: newStyle === 'italic' ? 'italic' : 'not-italic',
              }]);
            }}
            title="Italic"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            variant={element.computedStyles.textDecoration === 'underline' ? 'secondary' : 'outline'}
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              const newDecoration = element.computedStyles.textDecoration === 'underline' ? 'none' : 'underline';
              addPendingChange(element.id, [{
                property: 'textDecoration',
                oldValue: element.computedStyles.textDecoration || 'none',
                newValue: newDecoration,
                useTailwind: true,
                tailwindClass: newDecoration === 'underline' ? 'underline' : 'no-underline',
              }]);
            }}
            title="Underline"
          >
            <Underline className="h-4 w-4" />
          </Button>
          <Button
            variant={element.computedStyles.textDecoration === 'line-through' ? 'secondary' : 'outline'}
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              const newDecoration = element.computedStyles.textDecoration === 'line-through' ? 'none' : 'line-through';
              addPendingChange(element.id, [{
                property: 'textDecoration',
                oldValue: element.computedStyles.textDecoration || 'none',
                newValue: newDecoration,
                useTailwind: true,
                tailwindClass: newDecoration === 'line-through' ? 'line-through' : 'no-underline',
              }]);
            }}
            title="Strikethrough"
          >
            <Strikethrough className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Text Transform */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Text Transform</Label>
        <Select
          value={element.computedStyles.textTransform || 'none'}
          onValueChange={(value) => {
            addPendingChange(element.id, [{
              property: 'textTransform',
              oldValue: element.computedStyles.textTransform || 'none',
              newValue: value,
              useTailwind: true,
              tailwindClass: value === 'none' ? 'normal-case' : value === 'uppercase' ? 'uppercase' : value === 'lowercase' ? 'lowercase' : 'capitalize',
            }]);
          }}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Normal</SelectItem>
            <SelectItem value="uppercase">UPPERCASE</SelectItem>
            <SelectItem value="lowercase">lowercase</SelectItem>
            <SelectItem value="capitalize">Capitalize</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Letter Spacing */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Letter Spacing</Label>
        <Select
          value={element.computedStyles.letterSpacing || 'normal'}
          onValueChange={(value) => {
            addPendingChange(element.id, [{
              property: 'letterSpacing',
              oldValue: element.computedStyles.letterSpacing || 'normal',
              newValue: value,
              useTailwind: true,
              tailwindClass: value === '-0.05em' ? 'tracking-tighter' : value === '-0.025em' ? 'tracking-tight' : value === 'normal' ? 'tracking-normal' : value === '0.025em' ? 'tracking-wide' : value === '0.05em' ? 'tracking-wider' : 'tracking-widest',
            }]);
          }}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="-0.05em">Tighter</SelectItem>
            <SelectItem value="-0.025em">Tight</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="0.025em">Wide</SelectItem>
            <SelectItem value="0.05em">Wider</SelectItem>
            <SelectItem value="0.1em">Widest</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Word Spacing */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Word Spacing</Label>
        <Input
          type="number"
          className="h-8"
          value={parseFloat(element.computedStyles.wordSpacing || '0') || 0}
          onChange={(e) => {
            addPendingChange(element.id, [{
              property: 'wordSpacing',
              oldValue: element.computedStyles.wordSpacing || '0px',
              newValue: `${e.target.value}px`,
              useTailwind: false,
            }]);
          }}
          step={0.5}
        />
      </div>

      {/* Text Shadow */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Text Shadow</Label>
        <Select
          value={element.computedStyles.textShadow || 'none'}
          onValueChange={(value) => {
            addPendingChange(element.id, [{
              property: 'textShadow',
              oldValue: element.computedStyles.textShadow || 'none',
              newValue: value,
              useTailwind: false,
            }]);
          }}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="1px 1px 2px rgba(0,0,0,0.1)">Light</SelectItem>
            <SelectItem value="2px 2px 4px rgba(0,0,0,0.2)">Medium</SelectItem>
            <SelectItem value="3px 3px 6px rgba(0,0,0,0.3)">Heavy</SelectItem>
            <SelectItem value="0 0 10px rgba(0,0,0,0.5)">Glow</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// Color Picker Component
interface ColorPickerProps {
  value: string | undefined;
  onChange: (color: string) => void;
}

function ColorPicker({ value, onChange }: ColorPickerProps) {
  // Safe handling of undefined/null values
  const safeValue = value || '#000000';
  const presetColors = [
    '#000000', '#ffffff', '#ef4444', '#f97316', '#eab308',
    '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899',
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full h-8 justify-start gap-2">
          <div
            className="w-4 h-4 rounded border"
            style={{ backgroundColor: safeValue }}
          />
          <span className="text-xs font-mono truncate">{safeValue}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60">
        <div className="space-y-3">
          <div className="grid grid-cols-5 gap-2">
            {presetColors.map(color => (
              <button
                key={color}
                className={cn(
                  'w-8 h-8 rounded border-2 transition-all',
                  safeValue === color ? 'border-blue-500 scale-110' : 'border-transparent hover:scale-105'
                )}
                style={{ backgroundColor: color }}
                onClick={() => onChange(color)}
              />
            ))}
          </div>
          <Input
            type="color"
            value={safeValue}
            onChange={(e) => onChange(e.target.value)}
            className="h-8 p-1"
          />
          <Input
            type="text"
            value={safeValue}
            onChange={(e) => onChange(e.target.value)}
            placeholder="#000000"
            className="h-8 font-mono text-xs"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Spacing Input Component
interface SpacingInputProps {
  value: string | undefined;
  onChange: (value: string) => void;
  label?: React.ReactNode;
}

function SpacingInput({ value, onChange, label }: SpacingInputProps) {
  // Safe handling of undefined/null values
  const safeValue = value || '0px';
  const numericValue = parseInt(safeValue.replace('px', ''), 10) || 0;

  return (
    <div className="relative">
      {label && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-muted-foreground">
          {label}
        </div>
      )}
      <Input
        type="number"
        className="h-8 w-16 text-center text-xs"
        value={numericValue}
        onChange={(e) => onChange(`${e.target.value}px`)}
        min={0}
        step={4}
      />
    </div>
  );
}

export default VisualEditorSidebar;
