/**
 * Border Radius Design Tokens
 * Consistent corner radius values for rounded elements
 */

export const radius = {
  none: 0,
  xs: 2,
  s: 4,
  m: 8,
  l: 12,
  xl: 16,
  '2xl': 20,
  full: 9999, // For circular elements
} as const;

export type RadiusScale = keyof typeof radius;

// Semantic radius presets
export const radiusPresets = {
  button: radius.m,
  card: radius.l,
  sheet: radius.xl,
  input: radius.m,
  badge: radius.full,
  chip: radius.full,
  modal: radius.xl,
  popover: radius.l,
} as const;