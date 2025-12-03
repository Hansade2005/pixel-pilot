// Theme System for Visual Editor
// Defines built-in themes and theme management utilities

export interface ThemeColors {
  // Primary brand colors
  primary: string;
  primaryForeground: string;
  
  // Secondary colors
  secondary: string;
  secondaryForeground: string;
  
  // Accent colors
  accent: string;
  accentForeground: string;
  
  // Background colors
  background: string;
  foreground: string;
  
  // Card/Surface colors
  card: string;
  cardForeground: string;
  
  // Muted colors
  muted: string;
  mutedForeground: string;
  
  // Border and input
  border: string;
  input: string;
  ring: string;
  
  // Semantic colors
  destructive: string;
  destructiveForeground: string;
  
  // Chart colors (optional)
  chart1?: string;
  chart2?: string;
  chart3?: string;
  chart4?: string;
  chart5?: string;
}

export interface ThemeTypography {
  fontFamily: string;
  fontFamilyMono: string;
  fontSizeBase: string;
  lineHeightBase: string;
  letterSpacing: string;
}

export interface ThemeSpacing {
  spacingUnit: string; // Base spacing unit (e.g., "0.25rem")
  borderRadius: string;
  borderRadiusSm: string;
  borderRadiusMd: string;
  borderRadiusLg: string;
  borderRadiusXl: string;
}

export interface Theme {
  id: string;
  name: string;
  description: string;
  category: 'minimal' | 'modern' | 'bold' | 'elegant' | 'playful' | 'dark' | 'custom';
  preview?: string; // Preview image URL
  colors: {
    light: ThemeColors;
    dark: ThemeColors;
  };
  typography: ThemeTypography;
  spacing: ThemeSpacing;
}

// ============================================
// BUILT-IN THEMES
// ============================================

export const BUILT_IN_THEMES: Theme[] = [
  // 1. Default Neutral
  {
    id: 'default-neutral',
    name: 'Default Neutral',
    description: 'Clean, minimal theme with neutral colors. Perfect for professional applications.',
    category: 'minimal',
    colors: {
      light: {
        primary: '240 5.9% 10%',
        primaryForeground: '0 0% 98%',
        secondary: '240 4.8% 95.9%',
        secondaryForeground: '240 5.9% 10%',
        accent: '240 4.8% 95.9%',
        accentForeground: '240 5.9% 10%',
        background: '0 0% 100%',
        foreground: '240 10% 3.9%',
        card: '0 0% 100%',
        cardForeground: '240 10% 3.9%',
        muted: '240 4.8% 95.9%',
        mutedForeground: '240 3.8% 46.1%',
        border: '240 5.9% 90%',
        input: '240 5.9% 90%',
        ring: '240 5.9% 10%',
        destructive: '0 84.2% 60.2%',
        destructiveForeground: '0 0% 98%',
      },
      dark: {
        primary: '0 0% 98%',
        primaryForeground: '240 5.9% 10%',
        secondary: '240 3.7% 15.9%',
        secondaryForeground: '0 0% 98%',
        accent: '240 3.7% 15.9%',
        accentForeground: '0 0% 98%',
        background: '240 10% 3.9%',
        foreground: '0 0% 98%',
        card: '240 10% 3.9%',
        cardForeground: '0 0% 98%',
        muted: '240 3.7% 15.9%',
        mutedForeground: '240 5% 64.9%',
        border: '240 3.7% 15.9%',
        input: '240 3.7% 15.9%',
        ring: '240 4.9% 83.9%',
        destructive: '0 62.8% 30.6%',
        destructiveForeground: '0 0% 98%',
      },
    },
    typography: {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontFamilyMono: 'JetBrains Mono, monospace',
      fontSizeBase: '16px',
      lineHeightBase: '1.5',
      letterSpacing: '0',
    },
    spacing: {
      spacingUnit: '0.25rem',
      borderRadius: '0.5rem',
      borderRadiusSm: '0.25rem',
      borderRadiusMd: '0.375rem',
      borderRadiusLg: '0.5rem',
      borderRadiusXl: '0.75rem',
    },
  },

  // 2. Ocean Blue
  {
    id: 'ocean-blue',
    name: 'Ocean Blue',
    description: 'Calm, professional theme with ocean-inspired blue tones.',
    category: 'modern',
    colors: {
      light: {
        primary: '221 83% 53%',
        primaryForeground: '0 0% 100%',
        secondary: '210 40% 96.1%',
        secondaryForeground: '222.2 47.4% 11.2%',
        accent: '210 40% 96.1%',
        accentForeground: '222.2 47.4% 11.2%',
        background: '0 0% 100%',
        foreground: '222.2 84% 4.9%',
        card: '0 0% 100%',
        cardForeground: '222.2 84% 4.9%',
        muted: '210 40% 96.1%',
        mutedForeground: '215.4 16.3% 46.9%',
        border: '214.3 31.8% 91.4%',
        input: '214.3 31.8% 91.4%',
        ring: '221 83% 53%',
        destructive: '0 84.2% 60.2%',
        destructiveForeground: '0 0% 98%',
      },
      dark: {
        primary: '217 91% 60%',
        primaryForeground: '222.2 47.4% 11.2%',
        secondary: '217.2 32.6% 17.5%',
        secondaryForeground: '210 40% 98%',
        accent: '217.2 32.6% 17.5%',
        accentForeground: '210 40% 98%',
        background: '222.2 84% 4.9%',
        foreground: '210 40% 98%',
        card: '222.2 84% 4.9%',
        cardForeground: '210 40% 98%',
        muted: '217.2 32.6% 17.5%',
        mutedForeground: '215 20.2% 65.1%',
        border: '217.2 32.6% 17.5%',
        input: '217.2 32.6% 17.5%',
        ring: '224.3 76.3% 48%',
        destructive: '0 62.8% 30.6%',
        destructiveForeground: '0 0% 98%',
      },
    },
    typography: {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontFamilyMono: 'Fira Code, monospace',
      fontSizeBase: '16px',
      lineHeightBase: '1.6',
      letterSpacing: '-0.01em',
    },
    spacing: {
      spacingUnit: '0.25rem',
      borderRadius: '0.5rem',
      borderRadiusSm: '0.25rem',
      borderRadiusMd: '0.375rem',
      borderRadiusLg: '0.5rem',
      borderRadiusXl: '1rem',
    },
  },

  // 3. Forest Green
  {
    id: 'forest-green',
    name: 'Forest Green',
    description: 'Nature-inspired theme with earthy green tones.',
    category: 'elegant',
    colors: {
      light: {
        primary: '142 76% 36%',
        primaryForeground: '0 0% 100%',
        secondary: '138 76% 97%',
        secondaryForeground: '142 76% 20%',
        accent: '142 76% 94%',
        accentForeground: '142 76% 20%',
        background: '0 0% 100%',
        foreground: '142 50% 10%',
        card: '0 0% 100%',
        cardForeground: '142 50% 10%',
        muted: '138 20% 94%',
        mutedForeground: '142 20% 40%',
        border: '142 20% 88%',
        input: '142 20% 88%',
        ring: '142 76% 36%',
        destructive: '0 84.2% 60.2%',
        destructiveForeground: '0 0% 98%',
      },
      dark: {
        primary: '142 70% 45%',
        primaryForeground: '0 0% 100%',
        secondary: '142 30% 15%',
        secondaryForeground: '142 70% 90%',
        accent: '142 30% 15%',
        accentForeground: '142 70% 90%',
        background: '142 50% 5%',
        foreground: '142 20% 95%',
        card: '142 40% 8%',
        cardForeground: '142 20% 95%',
        muted: '142 30% 15%',
        mutedForeground: '142 20% 60%',
        border: '142 30% 20%',
        input: '142 30% 20%',
        ring: '142 70% 45%',
        destructive: '0 62.8% 30.6%',
        destructiveForeground: '0 0% 98%',
      },
    },
    typography: {
      fontFamily: 'Nunito Sans, system-ui, sans-serif',
      fontFamilyMono: 'JetBrains Mono, monospace',
      fontSizeBase: '16px',
      lineHeightBase: '1.6',
      letterSpacing: '0',
    },
    spacing: {
      spacingUnit: '0.25rem',
      borderRadius: '0.75rem',
      borderRadiusSm: '0.375rem',
      borderRadiusMd: '0.5rem',
      borderRadiusLg: '0.75rem',
      borderRadiusXl: '1rem',
    },
  },

  // 4. Sunset Orange
  {
    id: 'sunset-orange',
    name: 'Sunset Orange',
    description: 'Warm, energetic theme with vibrant orange and coral tones.',
    category: 'bold',
    colors: {
      light: {
        primary: '24 95% 53%',
        primaryForeground: '0 0% 100%',
        secondary: '30 80% 95%',
        secondaryForeground: '24 95% 25%',
        accent: '30 80% 92%',
        accentForeground: '24 95% 25%',
        background: '0 0% 100%',
        foreground: '24 50% 10%',
        card: '0 0% 100%',
        cardForeground: '24 50% 10%',
        muted: '30 30% 94%',
        mutedForeground: '24 30% 40%',
        border: '30 30% 88%',
        input: '30 30% 88%',
        ring: '24 95% 53%',
        destructive: '0 84.2% 60.2%',
        destructiveForeground: '0 0% 98%',
      },
      dark: {
        primary: '24 90% 55%',
        primaryForeground: '0 0% 100%',
        secondary: '24 40% 15%',
        secondaryForeground: '30 80% 90%',
        accent: '24 40% 15%',
        accentForeground: '30 80% 90%',
        background: '24 50% 5%',
        foreground: '30 20% 95%',
        card: '24 40% 8%',
        cardForeground: '30 20% 95%',
        muted: '24 40% 15%',
        mutedForeground: '24 20% 60%',
        border: '24 40% 20%',
        input: '24 40% 20%',
        ring: '24 90% 55%',
        destructive: '0 62.8% 30.6%',
        destructiveForeground: '0 0% 98%',
      },
    },
    typography: {
      fontFamily: 'Poppins, system-ui, sans-serif',
      fontFamilyMono: 'Source Code Pro, monospace',
      fontSizeBase: '16px',
      lineHeightBase: '1.5',
      letterSpacing: '0',
    },
    spacing: {
      spacingUnit: '0.25rem',
      borderRadius: '1rem',
      borderRadiusSm: '0.5rem',
      borderRadiusMd: '0.75rem',
      borderRadiusLg: '1rem',
      borderRadiusXl: '1.5rem',
    },
  },

  // 5. Purple Haze
  {
    id: 'purple-haze',
    name: 'Purple Haze',
    description: 'Creative, modern theme with rich purple gradients.',
    category: 'playful',
    colors: {
      light: {
        primary: '271 91% 65%',
        primaryForeground: '0 0% 100%',
        secondary: '270 60% 96%',
        secondaryForeground: '271 91% 30%',
        accent: '280 70% 94%',
        accentForeground: '271 91% 30%',
        background: '0 0% 100%',
        foreground: '271 50% 10%',
        card: '0 0% 100%',
        cardForeground: '271 50% 10%',
        muted: '270 30% 95%',
        mutedForeground: '271 20% 45%',
        border: '270 30% 90%',
        input: '270 30% 90%',
        ring: '271 91% 65%',
        destructive: '0 84.2% 60.2%',
        destructiveForeground: '0 0% 98%',
      },
      dark: {
        primary: '271 85% 60%',
        primaryForeground: '0 0% 100%',
        secondary: '271 40% 15%',
        secondaryForeground: '270 60% 90%',
        accent: '280 40% 18%',
        accentForeground: '270 60% 90%',
        background: '271 50% 5%',
        foreground: '270 20% 95%',
        card: '271 40% 8%',
        cardForeground: '270 20% 95%',
        muted: '271 40% 15%',
        mutedForeground: '270 20% 60%',
        border: '271 40% 20%',
        input: '271 40% 20%',
        ring: '271 85% 60%',
        destructive: '0 62.8% 30.6%',
        destructiveForeground: '0 0% 98%',
      },
    },
    typography: {
      fontFamily: 'Space Grotesk, system-ui, sans-serif',
      fontFamilyMono: 'Fira Code, monospace',
      fontSizeBase: '16px',
      lineHeightBase: '1.6',
      letterSpacing: '-0.02em',
    },
    spacing: {
      spacingUnit: '0.25rem',
      borderRadius: '0.75rem',
      borderRadiusSm: '0.375rem',
      borderRadiusMd: '0.5rem',
      borderRadiusLg: '0.75rem',
      borderRadiusXl: '1.25rem',
    },
  },

  // 6. Rose Pink
  {
    id: 'rose-pink',
    name: 'Rose Pink',
    description: 'Soft, elegant theme with beautiful rose and pink tones.',
    category: 'elegant',
    colors: {
      light: {
        primary: '346 77% 50%',
        primaryForeground: '0 0% 100%',
        secondary: '346 50% 96%',
        secondaryForeground: '346 77% 25%',
        accent: '350 60% 94%',
        accentForeground: '346 77% 25%',
        background: '0 0% 100%',
        foreground: '346 40% 10%',
        card: '0 0% 100%',
        cardForeground: '346 40% 10%',
        muted: '346 30% 95%',
        mutedForeground: '346 20% 45%',
        border: '346 30% 90%',
        input: '346 30% 90%',
        ring: '346 77% 50%',
        destructive: '0 84.2% 60.2%',
        destructiveForeground: '0 0% 98%',
      },
      dark: {
        primary: '346 75% 55%',
        primaryForeground: '0 0% 100%',
        secondary: '346 40% 15%',
        secondaryForeground: '346 50% 90%',
        accent: '350 40% 18%',
        accentForeground: '346 50% 90%',
        background: '346 50% 5%',
        foreground: '346 20% 95%',
        card: '346 40% 8%',
        cardForeground: '346 20% 95%',
        muted: '346 40% 15%',
        mutedForeground: '346 20% 60%',
        border: '346 40% 20%',
        input: '346 40% 20%',
        ring: '346 75% 55%',
        destructive: '0 62.8% 30.6%',
        destructiveForeground: '0 0% 98%',
      },
    },
    typography: {
      fontFamily: 'DM Sans, system-ui, sans-serif',
      fontFamilyMono: 'JetBrains Mono, monospace',
      fontSizeBase: '16px',
      lineHeightBase: '1.6',
      letterSpacing: '0',
    },
    spacing: {
      spacingUnit: '0.25rem',
      borderRadius: '0.625rem',
      borderRadiusSm: '0.3125rem',
      borderRadiusMd: '0.4375rem',
      borderRadiusLg: '0.625rem',
      borderRadiusXl: '1rem',
    },
  },

  // 7. Midnight Dark
  {
    id: 'midnight-dark',
    name: 'Midnight Dark',
    description: 'Deep, immersive dark theme for focused work.',
    category: 'dark',
    colors: {
      light: {
        primary: '220 90% 56%',
        primaryForeground: '0 0% 100%',
        secondary: '220 15% 92%',
        secondaryForeground: '220 90% 25%',
        accent: '220 20% 90%',
        accentForeground: '220 90% 25%',
        background: '0 0% 100%',
        foreground: '220 40% 10%',
        card: '0 0% 100%',
        cardForeground: '220 40% 10%',
        muted: '220 15% 94%',
        mutedForeground: '220 15% 45%',
        border: '220 15% 88%',
        input: '220 15% 88%',
        ring: '220 90% 56%',
        destructive: '0 84.2% 60.2%',
        destructiveForeground: '0 0% 98%',
      },
      dark: {
        primary: '220 85% 60%',
        primaryForeground: '0 0% 100%',
        secondary: '220 20% 12%',
        secondaryForeground: '220 15% 90%',
        accent: '220 25% 15%',
        accentForeground: '220 15% 90%',
        background: '220 30% 4%',
        foreground: '220 10% 95%',
        card: '220 25% 6%',
        cardForeground: '220 10% 95%',
        muted: '220 20% 12%',
        mutedForeground: '220 10% 55%',
        border: '220 20% 15%',
        input: '220 20% 15%',
        ring: '220 85% 60%',
        destructive: '0 62.8% 30.6%',
        destructiveForeground: '0 0% 98%',
      },
    },
    typography: {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontFamilyMono: 'Fira Code, monospace',
      fontSizeBase: '16px',
      lineHeightBase: '1.6',
      letterSpacing: '-0.01em',
    },
    spacing: {
      spacingUnit: '0.25rem',
      borderRadius: '0.5rem',
      borderRadiusSm: '0.25rem',
      borderRadiusMd: '0.375rem',
      borderRadiusLg: '0.5rem',
      borderRadiusXl: '0.75rem',
    },
  },

  // 8. Cyber Neon
  {
    id: 'cyber-neon',
    name: 'Cyber Neon',
    description: 'Futuristic theme with vibrant neon accents.',
    category: 'bold',
    colors: {
      light: {
        primary: '180 100% 40%',
        primaryForeground: '0 0% 100%',
        secondary: '280 80% 95%',
        secondaryForeground: '180 100% 20%',
        accent: '320 80% 92%',
        accentForeground: '180 100% 20%',
        background: '0 0% 100%',
        foreground: '220 40% 10%',
        card: '0 0% 100%',
        cardForeground: '220 40% 10%',
        muted: '200 20% 94%',
        mutedForeground: '200 20% 45%',
        border: '200 20% 88%',
        input: '200 20% 88%',
        ring: '180 100% 40%',
        destructive: '0 84.2% 60.2%',
        destructiveForeground: '0 0% 98%',
      },
      dark: {
        primary: '180 100% 50%',
        primaryForeground: '220 40% 5%',
        secondary: '280 50% 15%',
        secondaryForeground: '280 80% 85%',
        accent: '320 60% 20%',
        accentForeground: '320 80% 85%',
        background: '220 40% 3%',
        foreground: '0 0% 95%',
        card: '220 35% 6%',
        cardForeground: '0 0% 95%',
        muted: '220 30% 12%',
        mutedForeground: '200 20% 55%',
        border: '220 30% 15%',
        input: '220 30% 15%',
        ring: '180 100% 50%',
        destructive: '0 62.8% 30.6%',
        destructiveForeground: '0 0% 98%',
      },
    },
    typography: {
      fontFamily: 'Orbitron, system-ui, sans-serif',
      fontFamilyMono: 'Fira Code, monospace',
      fontSizeBase: '16px',
      lineHeightBase: '1.5',
      letterSpacing: '0.02em',
    },
    spacing: {
      spacingUnit: '0.25rem',
      borderRadius: '0.25rem',
      borderRadiusSm: '0.125rem',
      borderRadiusMd: '0.1875rem',
      borderRadiusLg: '0.25rem',
      borderRadiusXl: '0.375rem',
    },
  },

  // 9. Warm Sand
  {
    id: 'warm-sand',
    name: 'Warm Sand',
    description: 'Soft, warm theme with sandy beige and terracotta tones.',
    category: 'elegant',
    colors: {
      light: {
        primary: '28 65% 45%',
        primaryForeground: '0 0% 100%',
        secondary: '35 40% 94%',
        secondaryForeground: '28 65% 20%',
        accent: '20 50% 92%',
        accentForeground: '28 65% 20%',
        background: '40 30% 98%',
        foreground: '28 40% 12%',
        card: '0 0% 100%',
        cardForeground: '28 40% 12%',
        muted: '35 25% 93%',
        mutedForeground: '28 20% 45%',
        border: '35 25% 86%',
        input: '35 25% 86%',
        ring: '28 65% 45%',
        destructive: '0 84.2% 60.2%',
        destructiveForeground: '0 0% 98%',
      },
      dark: {
        primary: '28 60% 50%',
        primaryForeground: '0 0% 100%',
        secondary: '28 30% 15%',
        secondaryForeground: '35 40% 90%',
        accent: '20 35% 18%',
        accentForeground: '35 40% 90%',
        background: '28 40% 6%',
        foreground: '35 20% 93%',
        card: '28 35% 9%',
        cardForeground: '35 20% 93%',
        muted: '28 30% 15%',
        mutedForeground: '28 15% 55%',
        border: '28 30% 18%',
        input: '28 30% 18%',
        ring: '28 60% 50%',
        destructive: '0 62.8% 30.6%',
        destructiveForeground: '0 0% 98%',
      },
    },
    typography: {
      fontFamily: 'Lora, Georgia, serif',
      fontFamilyMono: 'JetBrains Mono, monospace',
      fontSizeBase: '17px',
      lineHeightBase: '1.7',
      letterSpacing: '0',
    },
    spacing: {
      spacingUnit: '0.25rem',
      borderRadius: '0.25rem',
      borderRadiusSm: '0.125rem',
      borderRadiusMd: '0.1875rem',
      borderRadiusLg: '0.25rem',
      borderRadiusXl: '0.5rem',
    },
  },

  // 10. Slate Gray
  {
    id: 'slate-gray',
    name: 'Slate Gray',
    description: 'Sophisticated gray theme for professional applications.',
    category: 'minimal',
    colors: {
      light: {
        primary: '215 20% 25%',
        primaryForeground: '0 0% 100%',
        secondary: '215 15% 95%',
        secondaryForeground: '215 20% 20%',
        accent: '215 15% 92%',
        accentForeground: '215 20% 20%',
        background: '0 0% 100%',
        foreground: '215 25% 10%',
        card: '0 0% 100%',
        cardForeground: '215 25% 10%',
        muted: '215 15% 94%',
        mutedForeground: '215 15% 45%',
        border: '215 15% 88%',
        input: '215 15% 88%',
        ring: '215 20% 25%',
        destructive: '0 84.2% 60.2%',
        destructiveForeground: '0 0% 98%',
      },
      dark: {
        primary: '215 20% 70%',
        primaryForeground: '215 25% 10%',
        secondary: '215 20% 15%',
        secondaryForeground: '215 15% 90%',
        accent: '215 20% 18%',
        accentForeground: '215 15% 90%',
        background: '215 25% 6%',
        foreground: '215 10% 93%',
        card: '215 22% 9%',
        cardForeground: '215 10% 93%',
        muted: '215 20% 15%',
        mutedForeground: '215 10% 55%',
        border: '215 20% 18%',
        input: '215 20% 18%',
        ring: '215 20% 70%',
        destructive: '0 62.8% 30.6%',
        destructiveForeground: '0 0% 98%',
      },
    },
    typography: {
      fontFamily: 'IBM Plex Sans, system-ui, sans-serif',
      fontFamilyMono: 'IBM Plex Mono, monospace',
      fontSizeBase: '16px',
      lineHeightBase: '1.6',
      letterSpacing: '0',
    },
    spacing: {
      spacingUnit: '0.25rem',
      borderRadius: '0.375rem',
      borderRadiusSm: '0.1875rem',
      borderRadiusMd: '0.25rem',
      borderRadiusLg: '0.375rem',
      borderRadiusXl: '0.5rem',
    },
  },
];

// ============================================
// THEME UTILITIES
// ============================================

/**
 * Generate CSS variables from a theme
 */
export function generateThemeCSS(theme: Theme, isDark: boolean = false): string {
  const colors = isDark ? theme.colors.dark : theme.colors.light;
  const { typography, spacing } = theme;

  return `
:root {
  --background: ${colors.background};
  --foreground: ${colors.foreground};
  
  --card: ${colors.card};
  --card-foreground: ${colors.cardForeground};
  
  --popover: ${colors.card};
  --popover-foreground: ${colors.cardForeground};
  
  --primary: ${colors.primary};
  --primary-foreground: ${colors.primaryForeground};
  
  --secondary: ${colors.secondary};
  --secondary-foreground: ${colors.secondaryForeground};
  
  --muted: ${colors.muted};
  --muted-foreground: ${colors.mutedForeground};
  
  --accent: ${colors.accent};
  --accent-foreground: ${colors.accentForeground};
  
  --destructive: ${colors.destructive};
  --destructive-foreground: ${colors.destructiveForeground};
  
  --border: ${colors.border};
  --input: ${colors.input};
  --ring: ${colors.ring};
  
  --radius: ${spacing.borderRadius};
  
  --font-sans: ${typography.fontFamily};
  --font-mono: ${typography.fontFamilyMono};
  
  ${colors.chart1 ? `--chart-1: ${colors.chart1};` : ''}
  ${colors.chart2 ? `--chart-2: ${colors.chart2};` : ''}
  ${colors.chart3 ? `--chart-3: ${colors.chart3};` : ''}
  ${colors.chart4 ? `--chart-4: ${colors.chart4};` : ''}
  ${colors.chart5 ? `--chart-5: ${colors.chart5};` : ''}
}

/* Apply theme colors directly to body for immediate visual feedback */
body {
  background-color: hsl(${colors.background});
  color: hsl(${colors.foreground});
}
`.trim();
}

/**
 * Generate complete globals.css content for a theme (Next.js)
 */
export function generateGlobalsCSSForNextJS(theme: Theme): string {
  const lightColors = theme.colors.light;
  const darkColors = theme.colors.dark;
  const { typography, spacing } = theme;

  return `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: ${lightColors.background};
    --foreground: ${lightColors.foreground};
    --card: ${lightColors.card};
    --card-foreground: ${lightColors.cardForeground};
    --popover: ${lightColors.card};
    --popover-foreground: ${lightColors.cardForeground};
    --primary: ${lightColors.primary};
    --primary-foreground: ${lightColors.primaryForeground};
    --secondary: ${lightColors.secondary};
    --secondary-foreground: ${lightColors.secondaryForeground};
    --muted: ${lightColors.muted};
    --muted-foreground: ${lightColors.mutedForeground};
    --accent: ${lightColors.accent};
    --accent-foreground: ${lightColors.accentForeground};
    --destructive: ${lightColors.destructive};
    --destructive-foreground: ${lightColors.destructiveForeground};
    --border: ${lightColors.border};
    --input: ${lightColors.input};
    --ring: ${lightColors.ring};
    --radius: ${spacing.borderRadius};
    --font-sans: ${typography.fontFamily};
    --font-mono: ${typography.fontFamilyMono};
  }

  .dark {
    --background: ${darkColors.background};
    --foreground: ${darkColors.foreground};
    --card: ${darkColors.card};
    --card-foreground: ${darkColors.cardForeground};
    --popover: ${darkColors.card};
    --popover-foreground: ${darkColors.cardForeground};
    --primary: ${darkColors.primary};
    --primary-foreground: ${darkColors.primaryForeground};
    --secondary: ${darkColors.secondary};
    --secondary-foreground: ${darkColors.secondaryForeground};
    --muted: ${darkColors.muted};
    --muted-foreground: ${darkColors.mutedForeground};
    --accent: ${darkColors.accent};
    --accent-foreground: ${darkColors.accentForeground};
    --destructive: ${darkColors.destructive};
    --destructive-foreground: ${darkColors.destructiveForeground};
    --border: ${darkColors.border};
    --input: ${darkColors.input};
    --ring: ${darkColors.ring};
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    font-family: var(--font-sans);
  }
}
`;
}

/**
 * Generate App.css content for a theme (Vite/React)
 */
export function generateAppCSSForVite(theme: Theme): string {
  const lightColors = theme.colors.light;
  const darkColors = theme.colors.dark;
  const { typography, spacing } = theme;

  return `:root {
  --background: ${lightColors.background};
  --foreground: ${lightColors.foreground};
  --card: ${lightColors.card};
  --card-foreground: ${lightColors.cardForeground};
  --popover: ${lightColors.card};
  --popover-foreground: ${lightColors.cardForeground};
  --primary: ${lightColors.primary};
  --primary-foreground: ${lightColors.primaryForeground};
  --secondary: ${lightColors.secondary};
  --secondary-foreground: ${lightColors.secondaryForeground};
  --muted: ${lightColors.muted};
  --muted-foreground: ${lightColors.mutedForeground};
  --accent: ${lightColors.accent};
  --accent-foreground: ${lightColors.accentForeground};
  --destructive: ${lightColors.destructive};
  --destructive-foreground: ${lightColors.destructiveForeground};
  --border: ${lightColors.border};
  --input: ${lightColors.input};
  --ring: ${lightColors.ring};
  --radius: ${spacing.borderRadius};
  --font-sans: ${typography.fontFamily};
  --font-mono: ${typography.fontFamilyMono};
  
  font-family: var(--font-sans);
  line-height: ${typography.lineHeightBase};
  font-size: ${typography.fontSizeBase};
  letter-spacing: ${typography.letterSpacing};
  
  color: hsl(var(--foreground));
  background-color: hsl(var(--background));
}

.dark {
  --background: ${darkColors.background};
  --foreground: ${darkColors.foreground};
  --card: ${darkColors.card};
  --card-foreground: ${darkColors.cardForeground};
  --popover: ${darkColors.card};
  --popover-foreground: ${darkColors.cardForeground};
  --primary: ${darkColors.primary};
  --primary-foreground: ${darkColors.primaryForeground};
  --secondary: ${darkColors.secondary};
  --secondary-foreground: ${darkColors.secondaryForeground};
  --muted: ${darkColors.muted};
  --muted-foreground: ${darkColors.mutedForeground};
  --accent: ${darkColors.accent};
  --accent-foreground: ${darkColors.accentForeground};
  --destructive: ${darkColors.destructive};
  --destructive-foreground: ${darkColors.destructiveForeground};
  --border: ${darkColors.border};
  --input: ${darkColors.input};
  --ring: ${darkColors.ring};
}

* {
  border-color: hsl(var(--border));
}

body {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
}
`;
}

/**
 * Parse a CSS file and extract theme variables
 */
export function parseThemeFromCSS(cssContent: string): Partial<Theme> | null {
  try {
    const extractVar = (varName: string): string | undefined => {
      const regex = new RegExp(`--${varName}:\\s*([^;]+);`, 'i');
      const match = cssContent.match(regex);
      return match ? match[1].trim() : undefined;
    };

    // Check if .dark section exists
    const hasDarkMode = cssContent.includes('.dark');

    // Extract root variables
    const rootSection = cssContent.match(/:root\s*\{([\s\S]*?)\}/)?.[1] || cssContent;
    const darkSection = cssContent.match(/\.dark\s*\{([\s\S]*?)\}/)?.[1] || '';

    const extractFromSection = (section: string, varName: string): string => {
      const regex = new RegExp(`--${varName}:\\s*([^;]+);`, 'i');
      const match = section.match(regex);
      return match ? match[1].trim() : '';
    };

    const lightColors: Partial<ThemeColors> = {
      primary: extractFromSection(rootSection, 'primary'),
      primaryForeground: extractFromSection(rootSection, 'primary-foreground'),
      secondary: extractFromSection(rootSection, 'secondary'),
      secondaryForeground: extractFromSection(rootSection, 'secondary-foreground'),
      accent: extractFromSection(rootSection, 'accent'),
      accentForeground: extractFromSection(rootSection, 'accent-foreground'),
      background: extractFromSection(rootSection, 'background'),
      foreground: extractFromSection(rootSection, 'foreground'),
      card: extractFromSection(rootSection, 'card'),
      cardForeground: extractFromSection(rootSection, 'card-foreground'),
      muted: extractFromSection(rootSection, 'muted'),
      mutedForeground: extractFromSection(rootSection, 'muted-foreground'),
      border: extractFromSection(rootSection, 'border'),
      input: extractFromSection(rootSection, 'input'),
      ring: extractFromSection(rootSection, 'ring'),
      destructive: extractFromSection(rootSection, 'destructive'),
      destructiveForeground: extractFromSection(rootSection, 'destructive-foreground'),
    };

    const darkColors: Partial<ThemeColors> = hasDarkMode ? {
      primary: extractFromSection(darkSection, 'primary') || lightColors.primary,
      primaryForeground: extractFromSection(darkSection, 'primary-foreground') || lightColors.primaryForeground,
      secondary: extractFromSection(darkSection, 'secondary') || lightColors.secondary,
      secondaryForeground: extractFromSection(darkSection, 'secondary-foreground') || lightColors.secondaryForeground,
      accent: extractFromSection(darkSection, 'accent') || lightColors.accent,
      accentForeground: extractFromSection(darkSection, 'accent-foreground') || lightColors.accentForeground,
      background: extractFromSection(darkSection, 'background') || lightColors.background,
      foreground: extractFromSection(darkSection, 'foreground') || lightColors.foreground,
      card: extractFromSection(darkSection, 'card') || lightColors.card,
      cardForeground: extractFromSection(darkSection, 'card-foreground') || lightColors.cardForeground,
      muted: extractFromSection(darkSection, 'muted') || lightColors.muted,
      mutedForeground: extractFromSection(darkSection, 'muted-foreground') || lightColors.mutedForeground,
      border: extractFromSection(darkSection, 'border') || lightColors.border,
      input: extractFromSection(darkSection, 'input') || lightColors.input,
      ring: extractFromSection(darkSection, 'ring') || lightColors.ring,
      destructive: extractFromSection(darkSection, 'destructive') || lightColors.destructive,
      destructiveForeground: extractFromSection(darkSection, 'destructive-foreground') || lightColors.destructiveForeground,
    } : lightColors as Partial<ThemeColors>;

    const radius = extractFromSection(rootSection, 'radius') || '0.5rem';
    const fontSans = extractFromSection(rootSection, 'font-sans') || 'Inter, sans-serif';
    const fontMono = extractFromSection(rootSection, 'font-mono') || 'monospace';

    return {
      id: 'imported-theme',
      name: 'Imported Theme',
      description: 'Theme imported from CSS file',
      category: 'custom',
      colors: {
        light: lightColors as ThemeColors,
        dark: darkColors as ThemeColors,
      },
      typography: {
        fontFamily: fontSans,
        fontFamilyMono: fontMono,
        fontSizeBase: '16px',
        lineHeightBase: '1.5',
        letterSpacing: '0',
      },
      spacing: {
        spacingUnit: '0.25rem',
        borderRadius: radius,
        borderRadiusSm: '0.25rem',
        borderRadiusMd: '0.375rem',
        borderRadiusLg: radius,
        borderRadiusXl: '0.75rem',
      },
    };
  } catch (error) {
    console.error('Failed to parse theme from CSS:', error);
    return null;
  }
}

/**
 * Get a theme by ID
 */
export function getThemeById(themeId: string): Theme | undefined {
  return BUILT_IN_THEMES.find(t => t.id === themeId);
}

/**
 * Get themes by category
 */
export function getThemesByCategory(category: Theme['category']): Theme[] {
  return BUILT_IN_THEMES.filter(t => t.category === category);
}

export default {
  BUILT_IN_THEMES,
  generateThemeCSS,
  generateGlobalsCSSForNextJS,
  generateAppCSSForVite,
  parseThemeFromCSS,
  getThemeById,
  getThemesByCategory,
};
