"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  VisualEditorProvider,
  useVisualEditor,
  useVisualEditorShortcuts,
  VisualEditorOverlay,
  VisualEditorSidebar,
  injectVisualEditorScript,
  generateFileUpdate,
  type StyleChange,
} from '@/lib/visual-editor';
import { MousePointer2, X, Edit3, Wand2 } from 'lucide-react';

interface VisualEditorWrapperProps {
  children: React.ReactNode;
  iframeRef?: React.RefObject<HTMLIFrameElement>;
  previewUrl?: string;
  isEnabled?: boolean;
  onToggle?: (enabled: boolean) => void;
  onSaveChanges?: (changes: { elementId: string; changes: StyleChange[]; sourceFile?: string }) => Promise<boolean>;
  className?: string;
}

// Inner component that uses the context
function VisualEditorInner({
  children,
  iframeRef,
  previewUrl,
  isEnabled: externalIsEnabled,
  onToggle,
  onSaveChanges,
  className,
}: VisualEditorWrapperProps) {
  const { 
    state, 
    toggleEnabled, 
    setIframeRef,
    sendToIframe,
  } = useVisualEditor();
  
  // Use keyboard shortcuts
  useVisualEditorShortcuts();

  // Track internal ref if not provided
  const internalIframeRef = useRef<HTMLIFrameElement>(null);
  const activeIframeRef = iframeRef || internalIframeRef;

  // Sync external enabled state
  useEffect(() => {
    if (externalIsEnabled !== undefined && externalIsEnabled !== state.isEnabled) {
      toggleEnabled(externalIsEnabled);
    }
  }, [externalIsEnabled, state.isEnabled, toggleEnabled]);

  // Notify parent of state changes
  useEffect(() => {
    onToggle?.(state.isEnabled);
  }, [state.isEnabled, onToggle]);

  // Inject visual editor script when iframe loads
  useEffect(() => {
    const iframe = activeIframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      // Set the iframe ref in context
      setIframeRef(iframe);
      
      // Inject the visual editor script
      setTimeout(() => {
        if (injectVisualEditorScript(iframe)) {
          // Send initial state
          if (state.isEnabled) {
            sendToIframe({ type: 'VISUAL_EDITOR_TOGGLE', payload: { enabled: true } });
          }
        }
      }, 500);
    };

    // If already loaded, inject immediately
    if (iframe.contentDocument?.readyState === 'complete') {
      handleLoad();
    }

    iframe.addEventListener('load', handleLoad);
    return () => {
      iframe.removeEventListener('load', handleLoad);
    };
  }, [activeIframeRef, setIframeRef, sendToIframe, state.isEnabled]);

  // Handle toggle
  const handleToggle = useCallback(() => {
    toggleEnabled(!state.isEnabled);
  }, [state.isEnabled, toggleEnabled]);

  return (
    <div className={cn('relative h-full flex', className)}>
      {/* Main content area */}
      <div className="flex-1 relative">
        {children}
        
        {/* Visual editor overlay */}
        <VisualEditorOverlay iframeRef={activeIframeRef} />
        
        {/* Toggle button - floating */}
        <div className="absolute top-2 right-2 z-50">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={state.isEnabled ? "default" : "outline"}
                  size="sm"
                  onClick={handleToggle}
                  className={cn(
                    "h-9 gap-2 shadow-lg transition-all",
                    state.isEnabled && "bg-blue-600 hover:bg-blue-700 text-white"
                  )}
                >
                  {state.isEnabled ? (
                    <>
                      <Edit3 className="h-4 w-4" />
                      <span className="hidden sm:inline">Editing</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4" />
                      <span className="hidden sm:inline">Visual Edit</span>
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {state.isEnabled 
                  ? "Exit visual editing mode (Esc)" 
                  : "Enter visual editing mode - click to select elements"
                }
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      {/* Sidebar */}
      {state.isEnabled && (
        <VisualEditorSidebar
          onSave={async () => {
            if (!onSaveChanges) return;
            
            // Save all pending changes
            for (const [elementId, changes] of state.pendingChanges) {
              const selection = state.selectedElements.find(s => s.elementId === elementId);
              await onSaveChanges({
                elementId,
                changes,
                sourceFile: selection?.element.sourceFile,
              });
            }
          }}
        />
      )}
    </div>
  );
}

// Main wrapper component with provider
export function VisualEditorWrapper({
  children,
  iframeRef,
  previewUrl,
  isEnabled,
  onToggle,
  onSaveChanges,
  className,
}: VisualEditorWrapperProps) {
  // Handle saving changes to source files
  const handleApplyChanges = useCallback(async (
    elementId: string,
    changes: StyleChange[],
    sourceFile?: string
  ): Promise<boolean> => {
    if (onSaveChanges) {
      return onSaveChanges({ elementId, changes, sourceFile });
    }
    return false;
  }, [onSaveChanges]);

  return (
    <VisualEditorProvider onApplyChanges={handleApplyChanges}>
      <VisualEditorInner
        iframeRef={iframeRef}
        previewUrl={previewUrl}
        isEnabled={isEnabled}
        onToggle={onToggle}
        onSaveChanges={onSaveChanges}
        className={className}
      >
        {children}
      </VisualEditorInner>
    </VisualEditorProvider>
  );
}

// Standalone toggle button for use outside the wrapper
interface VisualEditorToggleProps {
  isEnabled: boolean;
  onToggle: (enabled: boolean) => void;
  className?: string;
}

export function VisualEditorToggle({ isEnabled, onToggle, className }: VisualEditorToggleProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isEnabled ? "default" : "outline"}
            size="sm"
            onClick={() => onToggle(!isEnabled)}
            className={cn(
              "h-8 gap-2 transition-all",
              isEnabled && "bg-blue-600 hover:bg-blue-700 text-white",
              className
            )}
          >
            {isEnabled ? (
              <>
                <Edit3 className="h-4 w-4" />
                <span className="hidden sm:inline">Editing</span>
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4" />
                <span className="hidden sm:inline">Visual Edit</span>
              </>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {isEnabled 
            ? "Exit visual editing mode" 
            : "Enter visual editing mode"
          }
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default VisualEditorWrapper;
