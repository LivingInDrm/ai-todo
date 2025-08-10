/**
 * Main Theme Export
 * Combines all design tokens into a unified theme object
 */

// Define our own ColorScheme type to avoid null issues
export type ColorScheme = 'light' | 'dark';

import { lightColors, darkColors, ColorTokens } from './colors';
import { spacing, spacingGroups } from './spacing';
import { fontSize, fontWeight, lineHeight, typography } from './typography';
import { radius, radiusPresets } from './radius';
import { elevation, elevationPresets } from './elevation';

export interface Theme {
  colors: ColorTokens;
  spacing: typeof spacing;
  spacingGroups: typeof spacingGroups;
  fontSize: typeof fontSize;
  fontWeight: typeof fontWeight;
  lineHeight: typeof lineHeight;
  typography: typeof typography;
  radius: typeof radius;
  radiusPresets: typeof radiusPresets;
  elevation: typeof elevation;
  elevationPresets: typeof elevationPresets;
  isDark: boolean;
}

// Create theme based on color scheme
export const createTheme = (colorScheme: ColorScheme = 'light'): Theme => {
  const isDark = colorScheme === 'dark';
  
  return {
    colors: isDark ? darkColors : lightColors,
    spacing,
    spacingGroups,
    fontSize,
    fontWeight,
    lineHeight,
    typography,
    radius,
    radiusPresets,
    elevation,
    elevationPresets,
    isDark,
  };
};

// Export individual modules for direct import
export * from './colors';
export * from './spacing';
export * from './typography';
export * from './radius';
export * from './elevation';
export * from './responsive';

// Default themes
export const lightTheme = createTheme('light');
export const darkTheme = createTheme('dark');