import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThemeConfig, ThemeId } from '../types/theme';
import { THEMES, DEFAULT_THEME_ID } from '../constants/themes';

interface ThemeContextType {
  theme: ThemeConfig;
  themeId: ThemeId;
  setThemeId: (id: ThemeId) => void;
  themes: ThemeConfig[];
}

const THEME_STORAGE_KEY = 'datamate_theme';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeId, setThemeIdState] = useState<ThemeId>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeId;
      if (saved && THEMES.some((t) => t.id === saved)) {
        return saved;
      }
    } catch {}
    return DEFAULT_THEME_ID;
  });

  const currentTheme = THEMES.find((t) => t.id === themeId) || THEMES[0];

  const setThemeId = (newId: ThemeId) => {
    setThemeIdState(newId);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newId);
    } catch {}
  };

  useEffect(() => {
    // Apply data-theme attribute and CSS variables on html root
    const root = document.documentElement;
    root.setAttribute('data-theme', currentTheme.id);

    const colors = currentTheme.colors;
    // Central design tokens (as requested by user)
    root.style.setProperty('--primary', colors.primary);
    root.style.setProperty('--primary-hover', colors.primaryHover);
    root.style.setProperty('--secondary', colors.secondary);
    root.style.setProperty('--background', colors.background);
    root.style.setProperty('--surface', colors.surface);
    root.style.setProperty('--surface-secondary', colors.surfaceSecondary);
    root.style.setProperty('--text-primary', colors.textPrimary);
    root.style.setProperty('--text-secondary', colors.textSecondary);
    root.style.setProperty('--border', colors.border);
    root.style.setProperty('--border-accent', colors.borderAccent);
    root.style.setProperty('--accent', colors.accent);
    root.style.setProperty('--success', colors.success);
    root.style.setProperty('--warning', colors.warning);
    root.style.setProperty('--danger', colors.danger);
    root.style.setProperty('--chart-1', colors.chart1);
    root.style.setProperty('--chart-2', colors.chart2);
    root.style.setProperty('--chart-3', colors.chart3);
    root.style.setProperty('--chart-4', colors.chart4);
    root.style.setProperty('--chart-5', colors.chart5);

    // Compatibility aliases
    root.style.setProperty('--theme-bg', colors.background);
    root.style.setProperty('--theme-text', colors.textPrimary);
    root.style.setProperty('--theme-primary', colors.primary);
    root.style.setProperty('--theme-primary-hover', colors.primaryHover);
    root.style.setProperty('--theme-secondary', colors.secondary);
    root.style.setProperty('--theme-accent', colors.accent);
    root.style.setProperty('--theme-lavender', colors.borderAccent);
    root.style.setProperty('--theme-card-bg', colors.surface);
    root.style.setProperty('--theme-border', colors.border);
    root.style.setProperty('--theme-muted', colors.textSecondary);

    if (document.body) {
      document.body.style.backgroundColor = colors.background;
      document.body.style.color = colors.textPrimary;
    }
  }, [currentTheme]);

  return (
    <ThemeContext.Provider
      value={{
        theme: currentTheme,
        themeId,
        setThemeId,
        themes: THEMES,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
