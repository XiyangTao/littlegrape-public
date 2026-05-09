import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { useWindowDimensions } from 'react-native';
import { createTheme, type Theme, type ThemeMode } from '@/theme';
import { useTheme as useThemeFromStore } from '@/stores';

// 重新导出 Theme 类型供外部使用
export type { Theme, ThemeMode };

interface ThemeContextType {
  theme: Theme;
  setting: ThemeMode | 'system';
  effectiveMode: ThemeMode;
  setTheme: (theme: ThemeMode | 'system') => void;
  isDark: boolean;
  isLight: boolean;
  isSystem: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { setting, effectiveMode, setTheme } = useThemeFromStore();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const currentTheme = useMemo(
    () => createTheme(effectiveMode, screenWidth, screenHeight),
    [effectiveMode, screenWidth, screenHeight]
  );

  const value: ThemeContextType = {
    theme: currentTheme,
    setting,
    effectiveMode,
    setTheme,
    isDark: effectiveMode === 'dark',
    isLight: effectiveMode === 'light',
    isSystem: setting === 'system',
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

// 保持向后兼容性的useTheme hook
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
