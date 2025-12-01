"use client";

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useVisualEditor } from './context';
import type { ElementInfo } from './types';

interface VisualEditorOverlayProps {
  className?: string;
  iframeRef?: React.RefObject<HTMLIFrameElement | null>;
}

export function VisualEditorOverlay({ className, iframeRef }: VisualEditorOverlayProps) {
  const {
    state,
    config,
    selectElement,
    deselectElement,
    clearSelection,
    setHoveredElement,
    updateElementRect,
  } = useVisualEditor();

  const overlayRef = useRef<HTMLDivElement>(null);
  const [iframeRect, setIframeRect] = useState<DOMRect | null>(null);

  // Update iframe rect on resize
  useEffect(() => {
    const updateIframeRect = () => {
      if (iframeRef?.current) {
        setIframeRect(iframeRef.current.getBoundingClientRect());
      }
    };

    updateIframeRect();
    window.addEventListener('resize', updateIframeRect);
    
    // Also update on scroll
    const handleScroll = () => updateIframeRect();
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('resize', updateIframeRect);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [iframeRef]);

  // Update element rects when iframe scrolls
  useEffect(() => {
    if (!iframeRef?.current?.contentWindow) return;

    const handleIframeScroll = () => {
      // Request updated rects from iframe
      state.selectedElements.forEach(sel => {
        // The iframe will send updated rects via postMessage
      });
    };

    try {
      iframeRef.current.contentWindow.addEventListener('scroll', handleIframeScroll);
      return () => {
        iframeRef.current?.contentWindow?.removeEventListener('scroll', handleIframeScroll);
      };
    } catch (e) {
      // Cross-origin iframe, can't add listener directly
      return;
    }
  }, [iframeRef, state.selectedElements]);

  if (!state.isEnabled || !iframeRect) return null;

  // Calculate overlay position relative to iframe
  const getOverlayPosition = (elementRect: DOMRect) => {
    return {
      top: iframeRect.top + elementRect.top,
      left: iframeRect.left + elementRect.left,
      width: elementRect.width,
      height: elementRect.height,
    };
  };

  return (
    <div
      ref={overlayRef}
      className={cn(
        'fixed inset-0 pointer-events-none z-50',
        className
      )}
    >
      {/* Hovered element highlight */}
      {state.hoveredElement && !state.selectedElements.find(s => s.elementId === state.hoveredElement?.id) && (
        <ElementHighlight
          element={state.hoveredElement}
          type="hover"
          position={getOverlayPosition(state.hoveredElement.rect)}
        />
      )}

      {/* Selected elements highlights */}
      {state.selectedElements.map(selection => (
        <ElementHighlight
          key={selection.elementId}
          element={selection.element}
          type="selected"
          position={getOverlayPosition(selection.element.rect)}
          showHandles
          showDimensions
        />
      ))}

      {/* Multi-select hint */}
      {state.isEnabled && state.selectedElements.length === 0 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-lg text-sm shadow-lg pointer-events-none">
          Click to select an element • {config.multiSelectKey === 'meta' ? '⌘' : 'Ctrl'} + Click for multi-select
        </div>
      )}

      {/* Selection count badge */}
      {state.selectedElements.length > 1 && (
        <div className="absolute top-4 right-4 bg-blue-600 text-white px-3 py-1.5 rounded-full text-sm font-medium shadow-lg pointer-events-none">
          {state.selectedElements.length} elements selected
        </div>
      )}
    </div>
  );
}

interface ElementHighlightProps {
  element: ElementInfo;
  type: 'hover' | 'selected';
  position: { top: number; left: number; width: number; height: number };
  showHandles?: boolean;
  showDimensions?: boolean;
}

function ElementHighlight({
  element,
  type,
  position,
  showHandles = false,
  showDimensions = false,
}: ElementHighlightProps) {
  const isHover = type === 'hover';
  const isSelected = type === 'selected';

  return (
    <div
      className={cn(
        'absolute transition-all duration-100',
        isHover && 'border-2 border-blue-400 bg-blue-400/10',
        isSelected && 'border-2 border-blue-600 bg-blue-600/5'
      )}
      style={{
        top: position.top,
        left: position.left,
        width: position.width,
        height: position.height,
      }}
    >
      {/* Element label */}
      <div
        className={cn(
          'absolute -top-6 left-0 px-2 py-0.5 text-xs font-medium rounded-t',
          isHover && 'bg-blue-400 text-white',
          isSelected && 'bg-blue-600 text-white'
        )}
      >
        {element.tagName.toLowerCase()}
        {element.className && (
          <span className="ml-1 opacity-75">
            .{element.className.split(' ')[0]}
          </span>
        )}
      </div>

      {/* Dimensions badge */}
      {showDimensions && (
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-gray-800 text-white text-xs rounded whitespace-nowrap">
          {Math.round(position.width)} × {Math.round(position.height)}
        </div>
      )}

      {/* Resize handles */}
      {showHandles && (
        <>
          {/* Corner handles */}
          <ResizeHandle position="top-left" />
          <ResizeHandle position="top-right" />
          <ResizeHandle position="bottom-left" />
          <ResizeHandle position="bottom-right" />
          
          {/* Edge handles */}
          <ResizeHandle position="top" />
          <ResizeHandle position="right" />
          <ResizeHandle position="bottom" />
          <ResizeHandle position="left" />
        </>
      )}

      {/* Margin indicators */}
      {isSelected && element.computedStyles && (
        <MarginIndicators styles={element.computedStyles} position={position} />
      )}
    </div>
  );
}

interface ResizeHandleProps {
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top' | 'right' | 'bottom' | 'left';
}

function ResizeHandle({ position }: ResizeHandleProps) {
  const isCorner = position.includes('-');
  
  const positionClasses = {
    'top-left': '-top-1.5 -left-1.5 cursor-nwse-resize',
    'top-right': '-top-1.5 -right-1.5 cursor-nesw-resize',
    'bottom-left': '-bottom-1.5 -left-1.5 cursor-nesw-resize',
    'bottom-right': '-bottom-1.5 -right-1.5 cursor-nwse-resize',
    'top': 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize',
    'right': 'right-0 top-1/2 translate-x-1/2 -translate-y-1/2 cursor-ew-resize',
    'bottom': 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 cursor-ns-resize',
    'left': 'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize',
  };

  return (
    <div
      className={cn(
        'absolute bg-white border-2 border-blue-600 pointer-events-auto',
        isCorner ? 'w-3 h-3 rounded-sm' : 'w-2.5 h-2.5 rounded-full',
        positionClasses[position]
      )}
    />
  );
}

interface MarginIndicatorsProps {
  styles: ElementInfo['computedStyles'];
  position: { top: number; left: number; width: number; height: number };
}

function MarginIndicators({ styles, position }: MarginIndicatorsProps) {
  const parsePixels = (value: string): number => {
    return parseInt(value.replace('px', ''), 10) || 0;
  };

  const margins = {
    top: parsePixels(styles.marginTop),
    right: parsePixels(styles.marginRight),
    bottom: parsePixels(styles.marginBottom),
    left: parsePixels(styles.marginLeft),
  };

  const paddings = {
    top: parsePixels(styles.paddingTop),
    right: parsePixels(styles.paddingRight),
    bottom: parsePixels(styles.paddingBottom),
    left: parsePixels(styles.paddingLeft),
  };

  return (
    <>
      {/* Margin indicators (outside the element) */}
      {margins.top > 0 && (
        <div
          className="absolute left-0 right-0 bg-orange-400/30 border-t border-dashed border-orange-400"
          style={{ bottom: '100%', height: margins.top }}
        >
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] text-orange-600 font-medium">
            {margins.top}
          </span>
        </div>
      )}
      {margins.bottom > 0 && (
        <div
          className="absolute left-0 right-0 bg-orange-400/30 border-b border-dashed border-orange-400"
          style={{ top: '100%', height: margins.bottom }}
        >
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] text-orange-600 font-medium">
            {margins.bottom}
          </span>
        </div>
      )}
      {margins.left > 0 && (
        <div
          className="absolute top-0 bottom-0 bg-orange-400/30 border-l border-dashed border-orange-400"
          style={{ right: '100%', width: margins.left }}
        >
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] text-orange-600 font-medium">
            {margins.left}
          </span>
        </div>
      )}
      {margins.right > 0 && (
        <div
          className="absolute top-0 bottom-0 bg-orange-400/30 border-r border-dashed border-orange-400"
          style={{ left: '100%', width: margins.right }}
        >
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] text-orange-600 font-medium">
            {margins.right}
          </span>
        </div>
      )}

      {/* Padding indicators (inside the element) */}
      {paddings.top > 0 && (
        <div
          className="absolute left-0 right-0 top-0 bg-green-400/30"
          style={{ height: paddings.top }}
        >
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] text-green-600 font-medium">
            {paddings.top}
          </span>
        </div>
      )}
      {paddings.bottom > 0 && (
        <div
          className="absolute left-0 right-0 bottom-0 bg-green-400/30"
          style={{ height: paddings.bottom }}
        >
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] text-green-600 font-medium">
            {paddings.bottom}
          </span>
        </div>
      )}
      {paddings.left > 0 && (
        <div
          className="absolute top-0 bottom-0 left-0 bg-green-400/30"
          style={{ width: paddings.left }}
        >
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] text-green-600 font-medium">
            {paddings.left}
          </span>
        </div>
      )}
      {paddings.right > 0 && (
        <div
          className="absolute top-0 bottom-0 right-0 bg-green-400/30"
          style={{ width: paddings.right }}
        >
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] text-green-600 font-medium">
            {paddings.right}
          </span>
        </div>
      )}
    </>
  );
}

// Element tree component for sidebar
export function ElementTree() {
  const { state, selectElement, clearSelection } = useVisualEditor();

  if (state.selectedElements.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        No element selected
      </div>
    );
  }

  return (
    <div className="p-2">
      <div className="text-xs font-medium text-muted-foreground mb-2">
        Selected Elements ({state.selectedElements.length})
      </div>
      <div className="space-y-1">
        {state.selectedElements.map(selection => (
          <div
            key={selection.elementId}
            className="flex items-center gap-2 px-2 py-1.5 rounded bg-blue-50 dark:bg-blue-950 text-sm"
          >
            <span className="font-mono text-blue-600 dark:text-blue-400">
              {'<'}{selection.element.tagName.toLowerCase()}{'>'}
            </span>
            {selection.element.className && (
              <span className="text-muted-foreground truncate text-xs">
                .{selection.element.className.split(' ')[0]}
              </span>
            )}
          </div>
        ))}
      </div>
      {state.selectedElements.length > 0 && (
        <button
          onClick={clearSelection}
          className="mt-2 w-full text-xs text-muted-foreground hover:text-foreground py-1"
        >
          Clear Selection
        </button>
      )}
    </div>
  );
}
