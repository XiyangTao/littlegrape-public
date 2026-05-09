import { Dimensions } from 'react-native';
import { lightColors, darkColors, type Colors } from './colors';
import { typography, createScaledTypography, type Typography } from './typography';
import { spacing, createScaledSpacing, type Spacing } from './spacing';
import { scale, fontScale } from '@/utils/responsive';

export type ThemeMode = 'light' | 'dark';

export interface Theme {
  mode: ThemeMode;
  colors: Colors;
  typography: Typography;
  spacing: Spacing;
  screen: { width: number; height: number };
  scale: (size: number) => number;
  fontScale: (size: number) => number;
}

export function createTheme(mode: ThemeMode, screenWidth: number, screenHeight?: number): Theme {
  return {
    mode,
    colors: mode === 'light' ? lightColors : darkColors,
    typography: createScaledTypography(screenWidth),
    spacing: createScaledSpacing(screenWidth),
    screen: { width: screenWidth, height: screenHeight ?? Dimensions.get('window').height },
    scale: (size: number) => scale(size, screenWidth),
    fontScale: (size: number) => fontScale(size, screenWidth),
  };
}

export const lightTheme: Theme = createTheme('light', 375);
export const darkTheme: Theme = createTheme('dark', 375);

export const themes = {
  light: lightTheme,
  dark: darkTheme,
};

export * from './colors';
export * from './typography';
export * from './spacing';
