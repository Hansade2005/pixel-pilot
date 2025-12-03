"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useVisualEditor } from '../context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Search,
  GripVertical,
  Box,
  Layers,
  Columns2,
  Columns3,
  LayoutGrid,
  ArrowRight,
  ArrowDown,
  Minus,
  Space,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  AlignLeft,
  Type,
  Tag,
  Image,
  Play,
  Smile,
  MousePointer,
  Link,
  ExternalLink,
  Megaphone,
  List,
  ListOrdered,
  Table,
  BookOpen,
  TextCursor,
  ChevronDown,
  CheckSquare,
  Circle,
  Send,
  Quote,
  Square,
  MessageSquareQuote,
  Star,
  CreditCard,
  TrendingUp,
  AlertCircle,
  Award,
  Users,
  Code,
} from 'lucide-react';
import {
  DraggableElement,
  ElementCategory,
  DRAGGABLE_ELEMENTS,
  ELEMENT_CATEGORIES,
  getElementsByCategory,
  jsxToHtmlPreview,
} from '../draggable-elements';

// Icon mapping
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Box,
  Layers,
  Columns2,
  Columns3,
  LayoutGrid,
  ArrowRight,
  ArrowDown,
  Minus,
  Space,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  AlignLeft,
  Type,
  Tag,
  Image,
  Play,
  Smile,
  MousePointer,
  Link,
  ExternalLink,
  Megaphone,
  List,
  ListOrdered,
  Table,
  BookOpen,
  TextCursor,
  ChevronDown,
  CheckSquare,
  Circle,
  Send,
  Quote,
  Square,
  MessageSquareQuote,
  Star,
  CreditCard,
  TrendingUp,
  AlertCircle,
  Award,
  Users,
  Code,
};

interface ElementsPanelProps {
  onInsertElement?: (element: DraggableElement, variant?: string) => void;
}

export function ElementsPanel({ onInsertElement }: ElementsPanelProps) {
  const { sendToIframe, state } = useVisualEditor();
  const [searchQuery, setSearchQuery] = useState('');
  const [draggingElement, setDraggingElement] = useState<DraggableElement | null>(null);
  const [placingElement, setPlacingElement] = useState<DraggableElement | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['layout', 'typography']);

  // Listen for element inserted message from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message?.type === 'ELEMENT_INSERTED' || message?.type === 'DRAG_CANCELLED') {
        console.log('[Elements Panel] Element inserted/cancelled, clearing placement mode');
        setPlacingElement(null);
        setDraggingElement(null);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Filter elements based on search
  const filteredElements = searchQuery
    ? DRAGGABLE_ELEMENTS.filter(
        (el: DraggableElement) =>
          el.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          el.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : null;

  const handleDragStart = useCallback((e: React.DragEvent, element: DraggableElement) => {
    e.dataTransfer.setData('application/visual-editor-element', JSON.stringify({
      id: element.id,
      content: element.defaultContent,
    }));
    e.dataTransfer.effectAllowed = 'copy';
    setDraggingElement(element);

    // Notify iframe about drag start
    console.log('[Elements Panel] Starting drag:', element.name);
    sendToIframe({
      type: 'DRAG_ELEMENT_START',
      payload: {
        elementType: element.id,
        content: element.defaultContent,
      },
    });
  }, [sendToIframe]);

  const handleDragEnd = useCallback(() => {
    console.log('[Elements Panel] Drag ended');
    setDraggingElement(null);
    sendToIframe({ type: 'DRAG_ELEMENT_END', payload: {} });
  }, [sendToIframe]);

  // Click to enter placement mode (more reliable than drag across iframes)
  const handleStartPlacement = useCallback((element: DraggableElement) => {
    console.log('[Elements Panel] Starting placement mode:', element.name);
    setPlacingElement(element);
    sendToIframe({
      type: 'DRAG_ELEMENT_START',
      payload: {
        elementType: element.id,
        content: element.defaultContent,
      },
    });
  }, [sendToIframe]);

  const handleCancelPlacement = useCallback(() => {
    console.log('[Elements Panel] Cancelling placement');
    setPlacingElement(null);
    sendToIframe({ type: 'DRAG_ELEMENT_END', payload: {} });
  }, [sendToIframe]);

  const handleInsertClick = useCallback((element: DraggableElement) => {
    if (onInsertElement) {
      onInsertElement(element);
    }
  }, [onInsertElement]);

  const renderElementCard = (element: DraggableElement) => {
    const IconComponent = ICON_MAP[element.icon] || Box;
    const isPlacing = placingElement?.id === element.id;

    return (
      <TooltipProvider key={element.id}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              draggable
              onDragStart={(e) => handleDragStart(e, element)}
              onDragEnd={handleDragEnd}
              onClick={() => handleStartPlacement(element)}
              className={cn(
                'group relative flex items-center gap-2 p-2 rounded-md border cursor-pointer',
                'hover:border-primary/50 hover:bg-accent/50 transition-all',
                draggingElement?.id === element.id && 'opacity-50 border-primary',
                isPlacing && 'border-green-500 bg-green-500/10 ring-1 ring-green-500'
              )}
            >
              <div className={cn(
                "flex items-center justify-center w-8 h-8 rounded bg-muted/50 flex-shrink-0",
                isPlacing && "bg-green-500/20"
              )}>
                <IconComponent className={cn("h-4 w-4 text-muted-foreground", isPlacing && "text-green-600")} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{element.name}</p>
                {isPlacing ? (
                  <span className="text-[10px] text-green-600 font-medium">Click in preview to place</span>
                ) : element.supportsNesting ? (
                  <span className="text-[10px] text-primary">Nestable</span>
                ) : null}
              </div>
              <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-xs">
            <p className="font-medium">{element.name}</p>
            <p className="text-xs text-muted-foreground">{element.description}</p>
            <p className="text-xs text-primary mt-1">Click to place, or drag to preview</p>
            {element.variants && element.variants.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {element.variants.length} variant{element.variants.length > 1 ? 's' : ''} available
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <LayoutGrid className="h-4 w-4 text-primary" />
        <span className="font-medium text-sm">Elements</span>
      </div>

      {/* Placement Mode Banner */}
      {placingElement && (
        <div className="bg-green-500/10 border border-green-500 rounded-md p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700">Placing: {placingElement.name}</p>
              <p className="text-xs text-green-600">Click anywhere in the preview to insert</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancelPlacement}
              className="h-7 text-xs text-green-700 hover:text-green-800 hover:bg-green-500/20"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search elements..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-8 pl-8 text-sm"
        />
      </div>

      {/* Instructions */}
      <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2">
        <p>Click an element to start placement mode, then click in preview to insert.</p>
      </div>

      <Separator />

      {/* Elements List */}
      <ScrollArea className="h-[450px]">
        {searchQuery && filteredElements ? (
          // Search Results
          <div className="space-y-2">
            {filteredElements.length > 0 ? (
              <>
                <p className="text-xs text-muted-foreground mb-2">
                  {filteredElements.length} result{filteredElements.length !== 1 ? 's' : ''}
                </p>
                {filteredElements.map(renderElementCard)}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No elements found</p>
                <p className="text-xs">Try a different search term</p>
              </div>
            )}
          </div>
        ) : (
          // Categorized Elements
          <Accordion
            type="multiple"
            value={expandedCategories}
            onValueChange={setExpandedCategories}
            className="w-full"
          >
            {ELEMENT_CATEGORIES.map((category: { id: ElementCategory; name: string; icon: string }) => {
              const elements = getElementsByCategory(category.id);
              const CategoryIcon = ICON_MAP[category.icon] || Box;

              return (
                <AccordionItem key={category.id} value={category.id}>
                  <AccordionTrigger className="text-sm py-2 hover:no-underline">
                    <div className="flex items-center gap-2">
                      <CategoryIcon className="h-4 w-4" />
                      <span>{category.name}</span>
                      <span className="text-xs text-muted-foreground">({elements.length})</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-1.5 pt-1">
                      {elements.map(renderElementCard)}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </ScrollArea>

      {/* Quick Insert for Selected Element */}
      {state.selectedElements.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Quick Insert</p>
            <p className="text-xs text-muted-foreground">
              Insert relative to: <span className="text-foreground">{state.selectedElements[0].element.tagName}</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  // Insert before selected element
                }}
              >
                Insert Before
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  // Insert after selected element
                }}
              >
                Insert After
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ElementsPanel;
