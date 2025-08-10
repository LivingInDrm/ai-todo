/**
 * Elevation Design Tokens
 * Shadow definitions for depth and hierarchy
 */

import { Platform } from 'react-native';

export interface ElevationStyle {
  shadowColor?: string;
  shadowOffset?: {
    width: number;
    height: number;
  };
  shadowOpacity?: number;
  shadowRadius?: number;
  elevation?: number; // Android-specific
}

// iOS shadow presets
const iosShadows = {
  none: {},
  xs: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  s: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  m: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  l: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
  },
};

// Android elevation presets
const androidElevations = {
  none: { elevation: 0 },
  xs: { elevation: 1 },
  s: { elevation: 2 },
  m: { elevation: 4 },
  l: { elevation: 8 },
  xl: { elevation: 12 },
};

// Combined elevation system
export const elevation: Record<keyof typeof iosShadows, ElevationStyle> = {
  none: {},
  xs: Platform.select({
    ios: iosShadows.xs,
    android: androidElevations.xs as any,
    default: {},
  }) as ElevationStyle,
  s: Platform.select({
    ios: iosShadows.s,
    android: androidElevations.s as any,
    default: {},
  }) as ElevationStyle,
  m: Platform.select({
    ios: iosShadows.m,
    android: androidElevations.m as any,
    default: {},
  }) as ElevationStyle,
  l: Platform.select({
    ios: iosShadows.l,
    android: androidElevations.l as any,
    default: {},
  }) as ElevationStyle,
  xl: Platform.select({
    ios: iosShadows.xl,
    android: androidElevations.xl as any,
    default: {},
  }) as ElevationStyle,
};

export type ElevationScale = keyof typeof elevation;

// Semantic elevation presets
export const elevationPresets = {
  card: elevation.s,
  sheet: elevation.l,
  modal: elevation.xl,
  button: elevation.xs,
  floatingButton: elevation.m,
  snackbar: elevation.m,
  listItem: elevation.xs,
  header: elevation.s,
} as const;