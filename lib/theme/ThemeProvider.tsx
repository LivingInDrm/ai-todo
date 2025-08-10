/**
 * Theme Provider and Context
 * Manages theme state and provides theme access to components
 */

import React, { createContext, useContext, useEffect, useState, ReactNode, useMemo, useCallback } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Theme, createTheme, ColorScheme } from './index';

// Theme preferences
export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  actualColorScheme: ColorScheme;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_STORAGE_KEY = '@ai-todo/theme-preference';

interface ThemeProviderProps {
  children: ReactNode;
  initialTheme?: ThemeMode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ 
  children, 
  initialTheme = 'system' 
}) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(initialTheme);
  const [systemColorScheme, setSystemColorScheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme()
  );

  // Load saved theme preference
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (saved && ['light', 'dark', 'system'].includes(saved)) {
          setThemeModeState(saved as ThemeMode);
        }
      } catch (error) {
        console.error('Failed to load theme preference:', error);
      }
    };
    
    loadThemePreference();
  }, []);

  // Listen to system theme changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemColorScheme(colorScheme);
    });

    return () => subscription?.remove();
  }, []);

  // Determine actual color scheme with null safety
  const actualColorScheme: ColorScheme = 
    themeMode === 'system' 
      ? (systemColorScheme ?? 'light') // Default to 'light' if system returns null
      : themeMode as ColorScheme;

  // Create theme based on actual color scheme with memoization
  const theme = useMemo(
    () => createTheme(actualColorScheme),
    [actualColorScheme]
  );

  // Set theme mode and persist with useCallback
  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
      setThemeModeState(mode);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
      throw error;
    }
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const value: ThemeContextValue = useMemo(
    () => ({
      theme,
      themeMode,
      setThemeMode,
      actualColorScheme,
    }),
    [theme, themeMode, setThemeMode, actualColorScheme]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// Hook to use theme
export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
};

// Hook to get just the theme object (convenience)
export const useThemeValues = (): Theme => {
  const { theme } = useTheme();
  return theme;
};