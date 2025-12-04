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
  type Theme,
  type TaggedComponent,
  generateGlobalsCSSForNextJS,
  generateAppCSSForVite,
} from '@/lib/visual-editor';
import { Edit3, Wand2, AlertCircle } from 'lucide-react';

interface VisualEditorWrapperProps {
  children: React.ReactNode;
  iframeRef?: React.RefObject<HTMLIFrameElement | null>;
  previewUrl?: string;
  isEnabled?: boolean;
  onToggle?: (enabled: boolean) => void;
  onSaveChanges?: (changes: { elementId: string; changes: StyleChange[]; sourceFile?: string; sourceLine?: number }) => Promise<boolean>;
  onApplyTheme?: (theme: Theme, cssContent: string) => Promise<boolean>;
  onTagToChat?: (component: TaggedComponent) => void;
  onPublish?: () => void;
  onSelectionBlocked?: () => void;
  projectType?: 'nextjs' | 'vite' | 'unknown';
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
  onApplyTheme,
  onTagToChat,
  onPublish,
  onSelectionBlocked,
  projectType = 'unknown',
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

  // Handle theme application
  const handleThemeApply = useCallback(async (theme: Theme) => {
    console.log('[Visual Editor Wrapper] Applying theme:', theme.name);
    
    // Generate appropriate CSS based on project type
    const cssContent = projectType === 'vite' 
      ? generateAppCSSForVite(theme)
      : generateGlobalsCSSForNextJS(theme);
    
    console.log('[Visual Editor Wrapper] Generated CSS content length:', cssContent.length);
    
    if (onApplyTheme) {
      const success = await onApplyTheme(theme, cssContent);
      console.log('[Visual Editor Wrapper] Theme applied result:', success);
      return success;
    } else {
      console.warn('[Visual Editor Wrapper] onApplyTheme callback not provided');
      // Log the CSS so user can at least copy it
      console.log('[Visual Editor Wrapper] Generated theme CSS:', cssContent);
      return false;
    }
  }, [projectType, onApplyTheme]);

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
          projectType={projectType}
          onTagToChat={onTagToChat}
          onPublish={onPublish}
          onApplyTheme={onApplyTheme}
          hasUnsavedChanges={state.pendingChanges.size > 0}
          onSave={async () => {
            if (!onSaveChanges) return;
            
            // Save all pending changes
            for (const [elementId, changes] of state.pendingChanges) {
              const selection = state.selectedElements.find(s => s.elementId === elementId);
              await onSaveChanges({
                elementId,
                changes,
                sourceFile: selection?.element.sourceFile,
                sourceLine: selection?.element.sourceLine,
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
  onApplyTheme,
  onTagToChat,
  onPublish,
  projectType,
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

  // Handle blocked selection due to unsaved changes
  const handleSelectionBlocked = useCallback(() => {
    console.log('[Visual Editor Wrapper] Selection blocked - showing alert');
    alert('Save changes before selecting another element');
  }, []);

  return (
    <VisualEditorProvider 
      onApplyChanges={handleApplyChanges}
      onSelectionBlocked={handleSelectionBlocked}
    >
      <VisualEditorInner
        iframeRef={iframeRef}
        previewUrl={previewUrl}
        isEnabled={isEnabled}
        onToggle={onToggle}
        onSaveChanges={onSaveChanges}
        onApplyTheme={onApplyTheme}
        onTagToChat={onTagToChat}
        onPublish={onPublish}
        projectType={projectType}
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
