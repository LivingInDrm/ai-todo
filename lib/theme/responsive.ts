/**
 * Responsive Design Utilities
 * Breakpoints and responsive helpers for different screen sizes
 */

import { useWindowDimensions, PixelRatio, Platform } from 'react-native';
import { useMemo } from 'react';

// Breakpoint definitions (in dp)
export const breakpoints = {
  compact: 360,   // Small phones
  regular: 600,   // Regular phones
  wide: 768,      // Tablets and large screens
} as const;

export type ScreenSize = 'compact' | 'regular' | 'wide';

// Device density scale
export const getPixelDensity = () => PixelRatio.get();

// Font scale factor from system settings
export const getFontScale = () => PixelRatio.getFontScale();

/**
 * Hook to get current screen size category
 */
export const useScreenSize = (): ScreenSize => {
  const { width } = useWindowDimensions();
  
  return useMemo(() => {
    if (width < breakpoints.compact) {
      return 'compact';
    } else if (width < breakpoints.wide) {
      return 'regular';
    } else {
      return 'wide';
    }
  }, [width]);
};

/**
 * Hook to get responsive values based on screen size
 */
export const useResponsive = <T,>(values: {
  compact?: T;
  regular?: T;
  wide?: T;
  default: T;
}): T => {
  const screenSize = useScreenSize();
  
  // Destructure values to avoid dependency on object reference
  const { compact, regular, wide, default: defaultValue } = values;
  
  return useMemo(() => {
    switch (screenSize) {
      case 'compact':
        return compact ?? defaultValue;
      case 'regular':
        return regular ?? defaultValue;
      case 'wide':
        return wide ?? defaultValue;
      default:
        return defaultValue;
    }
  }, [screenSize, compact, regular, wide, defaultValue]);
};

/**
 * Hook to get device information
 */
export const useDeviceInfo = () => {
  const { width, height } = useWindowDimensions();
  const screenSize = useScreenSize();
  
  return useMemo(() => ({
    width,
    height,
    screenSize,
    isTablet: screenSize === 'wide',
    isLandscape: width > height,
    pixelDensity: getPixelDensity(),
    fontScale: getFontScale(),
    platform: Platform.OS,
  }), [width, height, screenSize]);
};

/**
 * Responsive spacing multiplier based on screen size
 */
export const getSpacingMultiplier = (screenSize: ScreenSize): number => {
  switch (screenSize) {
    case 'compact':
      return 0.9;  // Slightly smaller spacing on compact screens
    case 'regular':
      return 1.0;  // Default spacing
    case 'wide':
      return 1.2;  // Larger spacing on tablets
    default:
      return 1.0;
  }
};

/**
 * Responsive font size multiplier based on screen size and font scale
 */
export const getFontSizeMultiplier = (screenSize: ScreenSize): number => {
  const fontScale = getFontScale();
  
  // Respect system font scale but cap it to prevent extreme sizes
  const cappedFontScale = Math.min(Math.max(fontScale, 0.85), 1.3);
  
  switch (screenSize) {
    case 'compact':
      return 0.95 * cappedFontScale;
    case 'regular':
      return 1.0 * cappedFontScale;
    case 'wide':
      return 1.1 * cappedFontScale;
    default:
      return cappedFontScale;
  }
};

/**
 * Hook to get responsive spacing value
 */
export const useResponsiveSpacing = (baseValue: number): number => {
  const screenSize = useScreenSize();
  
  return useMemo(() => {
    const multiplier = getSpacingMultiplier(screenSize);
    return Math.round(baseValue * multiplier);
  }, [baseValue, screenSize]);
};

/**
 * Hook to get responsive font size
 */
export const useResponsiveFontSize = (baseSize: number): number => {
  const screenSize = useScreenSize();
  
  return useMemo(() => {
    const multiplier = getFontSizeMultiplier(screenSize);
    return Math.round(baseSize * multiplier);
  }, [baseSize, screenSize]);
};

/**
 * Maximum content width for different screen sizes
 */
export const getMaxContentWidth = (screenSize: ScreenSize): number | null => {
  switch (screenSize) {
    case 'compact':
    case 'regular':
      return null;  // No max width constraint on phones
    case 'wide':
      return 600;     // Max width on tablets to prevent overstretching
    default:
      return null;
  }
};

/**
 * Hook to get max content width
 */
export const useMaxContentWidth = (): number | null => {
  const screenSize = useScreenSize();
  return getMaxContentWidth(screenSize);
};