"use client";

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useVisualEditor } from './context';
import { ElementTree } from './overlay';
import type { StyleChange, SidebarPanel, ComputedStyleInfo } from './types';
import {
  TAILWIND_MAPPINGS,
  TAILWIND_SPACING,
  TAILWIND_FONT_SIZES,
  TAILWIND_BORDER_RADIUS,
} from './types';
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
  Type,
  Move,
  Square,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Maximize2,
  ChevronUp,
  ChevronDown,
  Palette,
  Bold,
  Italic,
  Underline,
} from 'lucide-react';

interface VisualEditorSidebarProps {
  className?: string;
  onSave?: () => Promise<void>;
}

export function VisualEditorSidebar({ className, onSave }: VisualEditorSidebarProps) {
  const {
    state,
    config,
    setActivePanel,
    setActiveTool,
    setSidebarOpen,
    addPendingChange,
    applyChangesToFile,
    undo,
    redo,
    clearSelection,
  } = useVisualEditor();

  const [isSaving, setIsSaving] = useState(false);

  // Get the first selected element for editing
  const selectedElement = state.selectedElements[0]?.element;
  
  // Check if there are pending changes for the selected element
  const hasPendingChanges = selectedElement 
    ? (state.pendingChanges.get(selectedElement.id)?.length ?? 0) > 0
    : false;

  const handleSave = async () => {
    if (!selectedElement) return;
    
    console.log('[Sidebar] handleSave clicked');
    console.log('[Sidebar] Selected element:', selectedElement);
    console.log('[Sidebar] Pending changes for element:', state.pendingChanges.get(selectedElement.id));
    
    setIsSaving(true);
    try {
      const changes = state.pendingChanges.get(selectedElement.id) || [];
      console.log('[Sidebar] Changes to save:', changes);
      
      if (changes.length > 0) {
        console.log('[Sidebar] Calling applyChangesToFile...');
        const success = await applyChangesToFile(selectedElement.id, changes);
        console.log('[Sidebar] applyChangesToFile result:', success);
      } else {
        console.warn('[Sidebar] No changes to save!');
      }
      
      if (onSave) {
        console.log('[Sidebar] Calling onSave callback...');
        await onSave();
      }
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
        'w-72 sm:w-80 md:w-80 lg:w-80 xl:w-80', // Responsive width - narrower on mobile
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
          {/* Save button in header - always visible */}
          {selectedElement && hasPendingChanges && (
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
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={undo}
            disabled={state.historyIndex < 0}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={redo}
            disabled={state.historyIndex >= state.history.length - 1}
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

      {/* Tools - Compact */}
      <div className="flex items-center justify-center gap-1 p-2 border-b bg-muted/30">
        <ToolButton
          icon={<MousePointer2 className="h-4 w-4" />}
          isActive={state.activeTool === 'select'}
          onClick={() => setActiveTool('select')}
          tooltip="Select (V)"
        />
        <ToolButton
          icon={<Type className="h-4 w-4" />}
          isActive={state.activeTool === 'text'}
          onClick={() => setActiveTool('text')}
          tooltip="Text (T)"
        />
        <ToolButton
          icon={<Move className="h-4 w-4" />}
          isActive={state.activeTool === 'spacing'}
          onClick={() => setActiveTool('spacing')}
          tooltip="Spacing (S)"
        />
        <ToolButton
          icon={<Square className="h-4 w-4" />}
          isActive={state.activeTool === 'layout'}
          onClick={() => setActiveTool('layout')}
          tooltip="Layout (L)"
        />
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {selectedElement ? (
            <Tabs value={state.activePanel} onValueChange={(v) => setActivePanel(v as SidebarPanel)} className="w-full">
              <TabsList className="grid w-full grid-cols-4 h-8 mb-3">
                <TabsTrigger value="styles" className="text-xs px-1">Styles</TabsTrigger>
                <TabsTrigger value="layout" className="text-xs px-1">Layout</TabsTrigger>
                <TabsTrigger value="spacing" className="text-xs px-1">Spacing</TabsTrigger>
                <TabsTrigger value="typography" className="text-xs px-1">Text</TabsTrigger>
              </TabsList>

              <TabsContent value="styles" className="mt-0 space-y-2">
                <StylesPanel element={selectedElement} />
              </TabsContent>

              <TabsContent value="layout" className="mt-0 space-y-2">
                <LayoutPanel element={selectedElement} />
              </TabsContent>

              <TabsContent value="spacing" className="mt-0 space-y-2">
                <SpacingPanel element={selectedElement} />
              </TabsContent>

              <TabsContent value="typography" className="mt-0 space-y-2">
                <TypographyPanel element={selectedElement} />
              </TabsContent>
            </Tabs>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
              <MousePointer2 className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-sm">Select an element to edit</p>
              <p className="text-xs mt-1">Click on any element in the canvas</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer - Compact */}
      <div className="p-2 border-t bg-muted/30">
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
}

function ToolButton({ icon, isActive, onClick, tooltip }: ToolButtonProps) {
  return (
    <Button
      variant={isActive ? 'secondary' : 'ghost'}
      size="icon"
      className="h-8 w-8"
      onClick={onClick}
      title={tooltip}
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
          <SelectContent>
            <SelectItem value="Inter">Inter</SelectItem>
            <SelectItem value="system-ui">System UI</SelectItem>
            <SelectItem value="Arial">Arial</SelectItem>
            <SelectItem value="Helvetica">Helvetica</SelectItem>
            <SelectItem value="Georgia">Georgia</SelectItem>
            <SelectItem value="Times New Roman">Times New Roman</SelectItem>
            <SelectItem value="monospace">Monospace</SelectItem>
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
          >
            <Bold className="h-4 w-4" />
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
          >
            <Underline className="h-4 w-4" />
          </Button>
        </div>
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
