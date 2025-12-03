"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useVisualEditor } from '../context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Palette,
  Upload,
  Wand2,
  Check,
  ChevronRight,
  Sun,
  Moon,
  Sparkles,
  Download,
  FileCode,
} from 'lucide-react';
import { Theme, BUILT_IN_THEMES, generateThemeCSS, parseThemeFromCSS } from '../themes';

interface ThemesPanelProps {
  onApplyTheme?: (theme: Theme) => void;
  onImportTheme?: (cssContent: string) => void;
  onExportTheme?: () => void;
  projectType?: 'nextjs' | 'vite' | 'unknown';
}

export function ThemesPanel({ 
  onApplyTheme, 
  onImportTheme,
  onExportTheme,
  projectType = 'unknown'
}: ThemesPanelProps) {
  const { sendToIframe, state } = useVisualEditor();
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'light' | 'dark'>('light');
  const [isImporting, setIsImporting] = useState(false);
  const [lastConfirmation, setLastConfirmation] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Listen for theme preview confirmation from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (!message || !message.type) return;
      
      if (message.type === 'THEME_PREVIEW_APPLIED') {
        console.log('[Themes Panel] ✅ Theme preview confirmed applied in iframe, CSS length:', message.payload?.cssLength);
        setLastConfirmation(`Applied (${message.payload?.cssLength} chars)`);
      } else if (message.type === 'THEME_PREVIEW_CLEARED') {
        console.log('[Themes Panel] ✅ Theme preview confirmed cleared in iframe');
        setLastConfirmation('Cleared');
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Group themes by category
  const themesByCategory = BUILT_IN_THEMES.reduce<Record<string, Theme[]>>((acc, theme: Theme) => {
    if (!acc[theme.category]) {
      acc[theme.category] = [];
    }
    acc[theme.category].push(theme);
    return acc;
  }, {});

  const categoryNames: Record<string, string> = {
    minimal: '🎯 Minimal',
    modern: '✨ Modern',
    bold: '🔥 Bold',
    elegant: '💎 Elegant',
    playful: '🎨 Playful',
    dark: '🌙 Dark',
    custom: '🛠 Custom',
  };

  const handleThemeSelect = useCallback((theme: Theme) => {
    setSelectedThemeId(theme.id);
    // Send preview to iframe
    const previewCSS = generateThemeCSS(theme, previewMode === 'dark');
    console.log('[Themes Panel] Sending theme preview, CSS length:', previewCSS.length);
    console.log('[Themes Panel] Theme:', theme.name, 'Mode:', previewMode);
    sendToIframe({ type: 'APPLY_THEME_PREVIEW', payload: { themeCSS: previewCSS } });
  }, [sendToIframe, previewMode]);

  const handleApplyTheme = useCallback(() => {
    const theme = BUILT_IN_THEMES.find((t: Theme) => t.id === selectedThemeId);
    if (theme && onApplyTheme) {
      onApplyTheme(theme);
    }
  }, [selectedThemeId, onApplyTheme]);

  const handleClearPreview = useCallback(() => {
    setSelectedThemeId(null);
    sendToIframe({ type: 'CLEAR_THEME_PREVIEW', payload: {} });
  }, [sendToIframe]);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const content = await file.text();
      const parsedTheme = parseThemeFromCSS(content);
      
      if (parsedTheme && onImportTheme) {
        onImportTheme(content);
      }
    } catch (error) {
      console.error('Failed to import theme:', error);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const togglePreviewMode = () => {
    const newMode = previewMode === 'light' ? 'dark' : 'light';
    setPreviewMode(newMode);
    
    // Update preview if a theme is selected
    if (selectedThemeId) {
      const theme = BUILT_IN_THEMES.find((t: Theme) => t.id === selectedThemeId);
      if (theme) {
        const previewCSS = generateThemeCSS(theme, newMode === 'dark');
        sendToIframe({ type: 'APPLY_THEME_PREVIEW', payload: { themeCSS: previewCSS } });
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">Themes</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={togglePreviewMode}
            title={`Preview ${previewMode === 'light' ? 'dark' : 'light'} mode`}
          >
            {previewMode === 'light' ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* Debug Status - Remove in production */}
      {lastConfirmation && (
        <div className="text-xs text-green-600 bg-green-50 rounded px-2 py-1">
          ✅ Preview: {lastConfirmation}
        </div>
      )}

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={handleImportClick}
          disabled={isImporting}
        >
          <Upload className="h-3 w-3 mr-1" />
          Import CSS
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={onExportTheme}
          disabled={!selectedThemeId}
        >
          <Download className="h-3 w-3 mr-1" />
          Export
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".css"
          className="hidden"
          onChange={handleFileImport}
        />
      </div>

      {/* Selected Theme Actions */}
      {selectedThemeId && (
        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1 h-8 text-xs bg-primary"
            onClick={handleApplyTheme}
          >
            <Check className="h-3 w-3 mr-1" />
            Apply Theme
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={handleClearPreview}
          >
            Cancel
          </Button>
        </div>
      )}

      {/* Project Type Info */}
      <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2">
        <div className="flex items-center gap-1.5">
          <FileCode className="h-3 w-3" />
          <span>
            {projectType === 'nextjs' && 'Will update globals.css'}
            {projectType === 'vite' && 'Will update App.css'}
            {projectType === 'unknown' && 'Auto-detect project type'}
          </span>
        </div>
      </div>

      <Separator />

      {/* Theme Categories */}
      <ScrollArea className="h-[400px]">
        <Accordion type="multiple" defaultValue={['minimal', 'modern']} className="w-full">
          {Object.entries(themesByCategory).map(([category, themes]: [string, Theme[]]) => (
            <AccordionItem key={category} value={category}>
              <AccordionTrigger className="text-sm py-2">
                {categoryNames[category] || category}
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid gap-2">
                  {themes.map((theme: Theme) => (
                    <ThemeCard
                      key={theme.id}
                      theme={theme}
                      isSelected={selectedThemeId === theme.id}
                      previewMode={previewMode}
                      onClick={() => handleThemeSelect(theme)}
                    />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </ScrollArea>
    </div>
  );
}

// Theme Card Component
interface ThemeCardProps {
  theme: Theme;
  isSelected: boolean;
  previewMode: 'light' | 'dark';
  onClick: () => void;
}

function ThemeCard({ theme, isSelected, previewMode, onClick }: ThemeCardProps) {
  const colors = previewMode === 'dark' ? theme.colors.dark : theme.colors.light;

  // Convert HSL string to CSS color
  const toHSL = (value: string) => `hsl(${value})`;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-3 rounded-lg border transition-all',
        'hover:border-primary/50 hover:shadow-sm',
        isSelected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border'
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-medium text-sm">{theme.name}</p>
          <p className="text-xs text-muted-foreground line-clamp-1">{theme.description}</p>
        </div>
        {isSelected && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
      </div>
      
      {/* Color Preview */}
      <div className="flex gap-1 mt-2">
        <div
          className="w-6 h-6 rounded-full border"
          style={{ backgroundColor: toHSL(colors.primary) }}
          title="Primary"
        />
        <div
          className="w-6 h-6 rounded-full border"
          style={{ backgroundColor: toHSL(colors.secondary) }}
          title="Secondary"
        />
        <div
          className="w-6 h-6 rounded-full border"
          style={{ backgroundColor: toHSL(colors.accent) }}
          title="Accent"
        />
        <div
          className="w-6 h-6 rounded-full border"
          style={{ backgroundColor: toHSL(colors.background) }}
          title="Background"
        />
        <div
          className="w-6 h-6 rounded-full border"
          style={{ backgroundColor: toHSL(colors.foreground) }}
          title="Foreground"
        />
      </div>

      {/* Typography Preview */}
      <div className="mt-2 text-xs text-muted-foreground">
        <span style={{ fontFamily: theme.typography.fontFamily.split(',')[0] }}>
          {theme.typography.fontFamily.split(',')[0]}
        </span>
        <span className="mx-1">•</span>
        <span>Radius: {theme.spacing.borderRadius}</span>
      </div>
    </button>
  );
}

export default ThemesPanel;
