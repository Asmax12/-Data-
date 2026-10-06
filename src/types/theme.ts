export type ThemeId = 'warm-plum' | 'soft-coral' | 'calm-lavender' | 'fresh-sage' | 'elegant-sand';

export interface ThemeColors {
  primary: string;
  primaryHover: string;
  secondary: string;
  background: string;
  surface: string;
  surfaceSecondary: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  borderAccent: string;
  accent: string;
  success: string;
  warning: string;
  danger: string;
  chart1: string;
  chart2: string;
  chart3: string;
  chart4: string;
  chart5: string;
  // Aliases for compatibility
  bg: string;
  cardBg: string;
  text: string;
  cocoa: string;
  lavender: string;
  muted: string;
  chartPalette: string[];
}

export interface ThemeConfig {
  id: ThemeId;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  previewColors: string[];
  colors: ThemeColors;
}
