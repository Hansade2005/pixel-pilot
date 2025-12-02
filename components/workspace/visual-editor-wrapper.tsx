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
import { Edit3, Wand2 } from 'lucide-react';

interface VisualEditorWrapperProps {
  children: React.ReactNode;
  iframeRef?: React.RefObject<HTMLIFrameElement | null>;
  previewUrl?: string;
  isEnabled?: boolean;
  onToggle?: (enabled: boolean) => void;
  onSaveChanges?: (changes: { elementId: string; changes: StyleChange[]; sourceFile?: string; sourceLine?: number }) => Promise<boolean>;
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
  const [isIframeReady, setIsIframeReady] = useState(false);
  const lastIframeRef = useRef<HTMLIFrameElement | null>(null);

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

  // Monitor iframe ref changes and inject script when available
  useEffect(() => {
    const checkAndSetupIframe = () => {
      const iframe = activeIframeRef.current;
      
      if (!iframe) {
        setIsIframeReady(false);
        return;
      }
      
      // Only setup if iframe changed
      if (lastIframeRef.current === iframe && isIframeReady) {
        return;
      }
      
      const setupIframe = () => {
        console.log('[Visual Editor Wrapper] Setting up iframe');
        lastIframeRef.current = iframe;
        setIframeRef(iframe);
        
        // Try to inject the script
        try {
          const injected = injectVisualEditorScript(iframe);
          if (injected) {
            console.log('[Visual Editor Wrapper] Script injected successfully');
            setIsIframeReady(true);
            
            // Send initial state after a short delay to ensure script is ready
            setTimeout(() => {
              sendToIframe({ type: 'VISUAL_EDITOR_INIT', payload: { enabled: state.isEnabled } });
            }, 100);
          }
        } catch (error) {
          console.warn('[Visual Editor Wrapper] Failed to inject script:', error);
        }
      };
      
      // Check if iframe is loaded
      if (iframe.contentDocument?.readyState === 'complete') {
        setupIframe();
      } else {
        // Wait for load
        const handleLoad = () => {
          setupIframe();
          iframe.removeEventListener('load', handleLoad);
        };
        iframe.addEventListener('load', handleLoad);
        return () => iframe.removeEventListener('load', handleLoad);
      }
    };
    
    // Check immediately and also poll for changes (ref might be set after render)
    checkAndSetupIframe();
    const interval = setInterval(checkAndSetupIframe, 500);
    
    return () => clearInterval(interval);
  }, [activeIframeRef, setIframeRef, sendToIframe, state.isEnabled, isIframeReady]);

  // Send toggle message when isEnabled changes AND iframe is ready
  useEffect(() => {
    if (isIframeReady) {
      console.log('[Visual Editor Wrapper] Sending toggle message:', state.isEnabled);
      sendToIframe({ type: 'VISUAL_EDITOR_TOGGLE', payload: { enabled: state.isEnabled } });
    }
  }, [state.isEnabled, isIframeReady, sendToIframe]);

  return (
    <div className={cn('relative h-full w-full', className)}>
      {/* Main content area */}
      <div className="h-full w-full relative">
        {children}
        
        {/* Visual editor overlay */}
        <VisualEditorOverlay iframeRef={activeIframeRef} />
      </div>
      
      {/* Sidebar - positioned as fixed overlay on left side */}
      {state.isEnabled && (
        <VisualEditorSidebar
          onSave={async () => {
            if (!onSaveChanges) return;
            
            console.log('[Visual Editor Wrapper] Starting multi-element save');
            console.log('[Visual Editor Wrapper] Total pending changes:', state.pendingChanges.size);
            
            // Group changes by file for batch processing
            const fileGroups = new Map<string, Array<{
              elementId: string;
              changes: StyleChange[];
              sourceLine?: number;
            }>>();
            
            for (const [elementId, changes] of state.pendingChanges) {
              const selection = state.selectedElements.find(s => s.elementId === elementId);
              const sourceFile = selection?.element.sourceFile;
              
              if (!sourceFile) {
                console.warn('[Visual Editor Wrapper] No source file for element:', elementId);
                continue;
              }
              
              if (!fileGroups.has(sourceFile)) {
                fileGroups.set(sourceFile, []);
              }
              
              fileGroups.get(sourceFile)!.push({
                elementId,
                changes,
                sourceLine: selection?.element.sourceLine,
              });
            }
            
            console.log('[Visual Editor Wrapper] Grouped into', fileGroups.size, 'file(s)');
            
            // Process each file's changes
            const results: Array<{ file: string; success: boolean; error?: string }> = [];
            
            for (const [sourceFile, elements] of fileGroups) {
              console.log(`[Visual Editor Wrapper] Processing ${elements.length} element(s) in ${sourceFile}`);
              
              // Check if we can use batch editing (multiple elements in same file)
              if (elements.length > 1) {
                console.log(`[Visual Editor Wrapper] Using BATCH EDIT for ${elements.length} elements`);
                
                try {
                  const success = await onSaveChanges({
                    elementId: '__BATCH__', // Special marker for batch
                    changes: [], // Batch handler will handle this differently
                    sourceFile,
                    sourceLine: 0,
                    batchElements: elements, // Pass all elements for batch processing
                  } as any);
                  
                  results.push({
                    file: sourceFile,
                    success,
                    error: success ? undefined : 'Batch edit failed',
                  });
                  
                  if (success) {
                    console.log(`[Visual Editor Wrapper] ✓ Batch saved ${elements.length} elements`);
                  }
                  
                  continue; // Skip sequential processing
                } catch (error) {
                  console.error('[Visual Editor Wrapper] Batch edit failed, falling back to sequential:', error);
                  // Fall through to sequential processing
                }
              }
              
              // Sequential processing for single element or batch fallback
              console.log(`[Visual Editor Wrapper] Using SEQUENTIAL EDIT for ${elements.length} element(s)`);
              
              // Sort elements by line number (bottom to top) to avoid line shifts
              const sortedElements = elements.sort((a, b) => 
                (b.sourceLine || 0) - (a.sourceLine || 0)
              );
              
              // Apply changes sequentially for same file (to avoid conflicts)
              let fileSuccess = true;
              let fileError: string | undefined;
              
              for (const element of sortedElements) {
                try {
                  const success = await onSaveChanges({
                    elementId: element.elementId,
                    changes: element.changes,
                    sourceFile,
                    sourceLine: element.sourceLine,
                  });
                  
                  if (!success) {
                    fileSuccess = false;
                    fileError = `Failed to apply changes to element ${element.elementId}`;
                    console.error('[Visual Editor Wrapper]', fileError);
                    break; // Stop processing this file on error
                  }
                  
                  console.log(`[Visual Editor Wrapper] ✓ Saved element ${element.elementId}`);
                } catch (error) {
                  fileSuccess = false;
                  fileError = error instanceof Error ? error.message : 'Unknown error';
                  console.error('[Visual Editor Wrapper] Error saving element:', error);
                  break;
                }
              }
              
              results.push({
                file: sourceFile,
                success: fileSuccess,
                error: fileError,
              });
            }
            
            // Report results
            const successCount = results.filter(r => r.success).length;
            const failCount = results.length - successCount;
            
            console.log(`[Visual Editor Wrapper] Completed: ${successCount} success, ${failCount} failed`);
            
            // Show toast notification
            if (failCount === 0 && successCount > 0) {
              // All succeeded
              const totalElements = Array.from(state.pendingChanges.keys()).length;
              const notification = successCount === 1
                ? `Updated 1 file successfully`
                : `Updated ${successCount} file(s) with ${totalElements} element change(s)`;
              
              // Use a success toast (you'll need to import toast from your UI lib)
              console.log('✅ [Visual Editor Wrapper]', notification);
            } else if (failCount > 0) {
              // Some failed
              const failedFiles = results.filter(r => !r.success).map(r => r.file);
              console.error('❌ [Visual Editor Wrapper] Failed files:', failedFiles);
              
              const errorMsg = successCount > 0
                ? `${successCount} file(s) updated, but ${failCount} failed`
                : `Failed to update ${failCount} file(s)`;
              
              console.error('❌ [Visual Editor Wrapper]', errorMsg);
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
    sourceFile?: string,
    sourceLine?: number
  ): Promise<boolean> => {
    if (onSaveChanges) {
      return onSaveChanges({ elementId, changes, sourceFile, sourceLine });
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
