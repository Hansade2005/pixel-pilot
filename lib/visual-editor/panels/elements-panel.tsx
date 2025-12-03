"use client";

import React, { useState, useCallback, useRef } from 'react';
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
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['layout', 'typography']);

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
    sendToIframe({
      type: 'DRAG_ELEMENT_START',
      payload: {
        elementType: element.id,
        content: element.defaultContent,
      },
    });
  }, [sendToIframe]);

  const handleDragEnd = useCallback(() => {
    setDraggingElement(null);
    sendToIframe({ type: 'DRAG_ELEMENT_END', payload: {} });
  }, [sendToIframe]);

  const handleInsertClick = useCallback((element: DraggableElement) => {
    if (onInsertElement) {
      onInsertElement(element);
    }
  }, [onInsertElement]);

  const renderElementCard = (element: DraggableElement) => {
    const IconComponent = ICON_MAP[element.icon] || Box;

    return (
      <TooltipProvider key={element.id}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              draggable
              onDragStart={(e) => handleDragStart(e, element)}
              onDragEnd={handleDragEnd}
              className={cn(
                'group relative flex items-center gap-2 p-2 rounded-md border cursor-grab',
                'hover:border-primary/50 hover:bg-accent/50 transition-all',
                'active:cursor-grabbing',
                draggingElement?.id === element.id && 'opacity-50 border-primary'
              )}
            >
              <div className="flex items-center justify-center w-8 h-8 rounded bg-muted/50 flex-shrink-0">
                <IconComponent className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{element.name}</p>
                {element.supportsNesting && (
                  <span className="text-[10px] text-primary">Nestable</span>
                )}
              </div>
              <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-xs">
            <p className="font-medium">{element.name}</p>
            <p className="text-xs text-muted-foreground">{element.description}</p>
            {element.variants && element.variants.length > 0 && (
              <p className="text-xs text-primary mt-1">
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
        <p>Drag elements to the canvas or click to insert at cursor position.</p>
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
