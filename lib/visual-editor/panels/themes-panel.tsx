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
  Save,
  // Category icons
  Target,
  Zap,
  Flame,
  Gem,
  PaintBucket,
  MoonStar,
  Wrench,
  Leaf,
  Waves,
  type LucideIcon,
} from 'lucide-react';
import { Theme, ThemeColors, BUILT_IN_THEMES, generateThemeCSS, generateVanillaCSS, parseThemeFromCSS } from '../themes';
import { CUSTOM_THEMES } from '../custom-themes';

// Get raw theme vars directly from CUSTOM_THEMES for instant application
function getThemeVars(themeName: string, mode: 'light' | 'dark'): Record<string, string> {
  const themeData = CUSTOM_THEMES[themeName as keyof typeof CUSTOM_THEMES];
  if (!themeData) return {};
  return themeData[mode] || themeData.light;
}

// Convert CUSTOM_THEMES to Theme[] format
const convertCustomThemesToThemes = (): Theme[] => {
  return Object.entries(CUSTOM_THEMES).map(([name, themeData]) => {
    // Map CSS variables to ThemeColors properties
    const mapColors = (colorObj: any): ThemeColors => ({
      primary: colorObj['--primary'] || '240 5.9% 10%',
      primaryForeground: colorObj['--primary-foreground'] || '0 0% 98%',
      secondary: colorObj['--secondary'] || '240 4.8% 95.9%',
      secondaryForeground: colorObj['--secondary-foreground'] || '240 5.9% 10%',
      accent: colorObj['--accent'] || '240 4.8% 95.9%',
      accentForeground: colorObj['--accent-foreground'] || '240 5.9% 10%',
      background: colorObj['--background'] || '0 0% 100%',
      foreground: colorObj['--foreground'] || '240 10% 3.9%',
      card: colorObj['--card'] || '0 0% 100%',
      cardForeground: colorObj['--card-foreground'] || '240 10% 3.9%',
      muted: colorObj['--muted'] || '240 4.8% 95.9%',
      mutedForeground: colorObj['--muted-foreground'] || '240 3.8% 46.1%',
      border: colorObj['--border'] || '240 5.9% 90%',
      input: colorObj['--input'] || '240 5.9% 90%',
      ring: colorObj['--ring'] || '240 5.9% 10%',
      destructive: colorObj['--destructive'] || '0 84.2% 60.2%',
      destructiveForeground: colorObj['--destructive-foreground'] || '0 0% 98%',
    });

    return {
      id: name.toLowerCase(),
      name: name.charAt(0).toUpperCase() + name.slice(1),
      description: `${name.charAt(0).toUpperCase() + name.slice(1)} theme with custom colors`,
      category: 'custom' as const,
      colors: {
        light: mapColors(themeData.light),
        dark: mapColors(themeData.dark),
      },
      typography: {
        fontFamily: themeData.light['--font-sans'] || 'Inter, ui-sans-serif, system-ui',
        fontFamilySerif: themeData.light['--font-serif'] || 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
        fontFamilyMono: themeData.light['--font-mono'] || 'JetBrains Mono, ui-monospace',
        fontSizeBase: '16px',
        lineHeightBase: '1.5',
        letterSpacing: '0em',
      },
      spacing: {
        spacingUnit: themeData.light['--spacing'] || '0.25rem',
        borderRadius: themeData.light['--radius'] || '0.5rem',
        borderRadiusSm: '0.25rem',
        borderRadiusMd: '0.5rem',
        borderRadiusLg: '0.75rem',
        borderRadiusXl: '1rem',
      },
    };
  });
};

const CUSTOM_THEMES_ARRAY = convertCustomThemesToThemes();

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
      
      if (message.type === 'DEBUG_MESSAGE_RECEIVED') {
        console.log('[Themes Panel] 📨 Iframe received message:', message.payload?.receivedType);
      } else if (message.type === 'THEME_PREVIEW_APPLIED') {
        console.log('[Themes Panel] ✅ Theme preview confirmed applied in iframe, vars count:', message.payload?.varsCount);
        setLastConfirmation(`Preview applied (${message.payload?.varsCount} CSS variables)`);
      } else if (message.type === 'THEME_PREVIEW_CLEARED') {
        console.log('[Themes Panel] ✅ Theme preview confirmed cleared in iframe');
        setLastConfirmation('Preview cleared');
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Group themes by category
  const themesByCategory = CUSTOM_THEMES_ARRAY.reduce<Record<string, Theme[]>>((acc, theme: Theme) => {
    if (!acc[theme.category]) {
      acc[theme.category] = [];
    }
    acc[theme.category].push(theme);
    return acc;
  }, {});

  // Category configuration with Lucide icons
  const categoryConfig: Record<string, { label: string; icon: LucideIcon; color: string }> = {
    minimal: { label: 'Minimal', icon: Target, color: 'text-slate-500' },
    modern: { label: 'Modern', icon: Zap, color: 'text-blue-500' },
    bold: { label: 'Bold', icon: Flame, color: 'text-orange-500' },
    elegant: { label: 'Elegant', icon: Gem, color: 'text-purple-500' },
    playful: { label: 'Playful', icon: PaintBucket, color: 'text-pink-500' },
    dark: { label: 'Dark', icon: MoonStar, color: 'text-indigo-500' },
    custom: { label: 'Custom', icon: Wrench, color: 'text-emerald-500' },
    nature: { label: 'Nature', icon: Leaf, color: 'text-green-500' },
    ocean: { label: 'Ocean', icon: Waves, color: 'text-cyan-500' },
  };

  const handleThemeSelect = useCallback((theme: Theme) => {
    console.log('[Themes Panel] Theme selected:', theme.name, theme.id);
    console.log('[Themes Panel] Project type:', projectType);
    setSelectedThemeId(theme.id);
    setLastConfirmation(null); // Clear previous confirmation
    
    // Get raw theme variables directly from CUSTOM_THEMES (like thmeswitcher.html)
    // This ensures instant application using the same method as the working test
    const themeVars = getThemeVars(theme.name.toLowerCase(), previewMode);
    
    console.log('[Themes Panel] Theme vars count:', Object.keys(themeVars).length);
    console.log('[Themes Panel] sendToIframe function exists:', !!sendToIframe);
    
    if (sendToIframe) {
      // Send themeVars directly - same format as thmeswitcher.html
      sendToIframe({ type: 'APPLY_THEME_PREVIEW', payload: { themeVars } });
      console.log('[Themes Panel] Theme preview message sent with', Object.keys(themeVars).length, 'variables');
    } else {
      console.error('[Themes Panel] sendToIframe is not available!');
    }
  }, [sendToIframe, previewMode, projectType]);

  const handleApplyTheme = useCallback(() => {
    console.log('[Themes Panel] Apply Theme clicked, selectedThemeId:', selectedThemeId);
    const theme = CUSTOM_THEMES_ARRAY.find((t: Theme) => t.id === selectedThemeId);
    console.log('[Themes Panel] Found theme:', theme?.name);
    console.log('[Themes Panel] onApplyTheme callback exists:', !!onApplyTheme);
    
    if (!theme) {
      console.warn('[Themes Panel] No theme selected');
      return;
    }
    
    if (onApplyTheme) {
      console.log('[Themes Panel] Calling onApplyTheme with theme:', theme.name);
      onApplyTheme(theme);
      setLastConfirmation(`Theme "${theme.name}" applied to project`);
    } else {
      console.warn('[Themes Panel] onApplyTheme callback not provided - theme cannot be saved to project files');
      setLastConfirmation(`⚠️ Theme selected but save callback not configured`);
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
      const theme = CUSTOM_THEMES_ARRAY.find((t: Theme) => t.id === selectedThemeId);
      if (theme) {
        // Get raw theme variables directly from CUSTOM_THEMES (like thmeswitcher.html)
        const themeVars = getThemeVars(theme.name.toLowerCase(), newMode);
        sendToIframe({ type: 'APPLY_THEME_PREVIEW', payload: { themeVars } });
      }
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-120px)] md:max-h-[calc(100vh-80px)]">
      {/* Header - Fixed */}
      <div className="flex-shrink-0 space-y-3 p-1">
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
            {selectedThemeId && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs gap-1 bg-primary/10 hover:bg-primary/20 text-primary"
                onClick={handleApplyTheme}
                title="Apply theme to project files"
              >
                <Save className="h-3 w-3" />
                Apply
              </Button>
            )}
          </div>
        </div>

        {/* Status Indicator */}
        {lastConfirmation && (
          <div className={cn(
            "text-xs rounded px-2 py-1.5 animate-in fade-in duration-300",
            lastConfirmation.includes('⚠️') 
              ? "text-yellow-700 bg-yellow-50 dark:text-yellow-300 dark:bg-yellow-900/30" 
              : "text-green-700 bg-green-50 dark:text-green-300 dark:bg-green-900/30"
          )}>
            {lastConfirmation.includes('⚠️') ? lastConfirmation : `✅ ${lastConfirmation}`}
          </div>
        )}

        {/* Actions - Responsive grid */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={handleImportClick}
            disabled={isImporting}
          >
            <Upload className="h-3 w-3 mr-1 flex-shrink-0" />
            <span className="truncate">Import</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={onExportTheme}
            disabled={!selectedThemeId}
          >
            <Download className="h-3 w-3 mr-1 flex-shrink-0" />
            <span className="truncate">Export</span>
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
              className="h-8 text-xs px-3"
              onClick={handleClearPreview}
            >
              Cancel
            </Button>
          </div>
        )}

        {/* Project Type Info */}
        <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2">
          <div className="flex items-center gap-1.5">
            <FileCode className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">
              {projectType === 'nextjs' && 'Will update globals.css'}
              {projectType === 'vite' && 'Will update App.css'}
              {projectType === 'unknown' && 'Auto-detect project type'}
            </span>
          </div>
        </div>

        <Separator />
      </div>

      {/* Theme Categories - Scrollable */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-1 pb-4">
          <Accordion type="multiple" defaultValue={['custom']} className="w-full">
            {Object.entries(themesByCategory).map(([category, themes]: [string, Theme[]]) => {
              const config = categoryConfig[category] || { 
                label: category.charAt(0).toUpperCase() + category.slice(1), 
                icon: Palette, 
                color: 'text-gray-500' 
              };
              const CategoryIcon = config.icon;
              
              return (
                <AccordionItem key={category} value={category} className="border-b-0">
                  <AccordionTrigger className="text-sm py-2 hover:no-underline">
                    <div className="flex items-center gap-2">
                      <CategoryIcon className={cn("h-4 w-4", config.color)} />
                      <span>{config.label}</span>
                      <span className="text-xs text-muted-foreground ml-1">({themes.length})</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid gap-2 pb-2">
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
              );
            })}
          </Accordion>
        </div>
      </ScrollArea>
    </div>
  );
}

// Theme Card Component - Mobile Responsive
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
        'w-full text-left p-2.5 sm:p-3 rounded-lg border transition-all touch-manipulation',
        'hover:border-primary/50 hover:shadow-sm active:scale-[0.98]',
        isSelected 
          ? 'border-primary bg-primary/5 ring-1 ring-primary dark:bg-primary/10' 
          : 'border-border hover:bg-muted/30'
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{theme.name}</p>
          <p className="text-xs text-muted-foreground line-clamp-1">{theme.description}</p>
        </div>
        {isSelected && (
          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
            <Check className="h-3 w-3 text-primary-foreground" />
          </div>
        )}
      </div>
      
      {/* Color Preview - Responsive sizes */}
      <div className="flex gap-1 sm:gap-1.5 mt-2">
        {[
          { color: colors.primary, label: 'Primary' },
          { color: colors.secondary, label: 'Secondary' },
          { color: colors.accent, label: 'Accent' },
          { color: colors.background, label: 'Background' },
          { color: colors.foreground, label: 'Foreground' },
        ].map((item, index) => (
          <div
            key={index}
            className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-border/50 shadow-sm"
            style={{ backgroundColor: toHSL(item.color) }}
            title={item.label}
          />
        ))}
      </div>

      {/* Typography Preview - Hidden on very small screens */}
      <div className="mt-2 text-[10px] sm:text-xs text-muted-foreground truncate hidden xs:block">
        <span style={{ fontFamily: theme.typography.fontFamily.split(',')[0] }}>
          {theme.typography.fontFamily.split(',')[0]}
        </span>
        <span className="mx-1 opacity-50">•</span>
        <span>{theme.spacing.borderRadius}</span>
      </div>
    </button>
  );
}

export default ThemesPanel;
