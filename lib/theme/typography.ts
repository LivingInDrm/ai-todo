/**
 * Typography Design Tokens
 * Font sizes, weights, and line heights for consistent typography
 */

export const fontSize = {
  xs: 12,   // Extra small (badges, captions)
  s: 14,    // Small (secondary text)
  m: 16,    // Medium (body text)
  l: 18,    // Large (emphasized body)
  xl: 24,   // Extra large (section headers)
  '2xl': 32, // 2x Extra large (page titles)
  '3xl': 48, // 3x Extra large (display text)
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export const lineHeight = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.75,
} as const;

// Semantic typography presets
export const typography = {
  // Titles
  largeTitle: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    lineHeight: Math.round(fontSize['2xl'] * lineHeight.tight),
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    lineHeight: Math.round(fontSize.xl * lineHeight.tight),
  },
  
  // Headings
  heading: {
    fontSize: fontSize.l,
    fontWeight: fontWeight.semibold,
    lineHeight: Math.round(fontSize.l * lineHeight.normal),
  },
  subheading: {
    fontSize: fontSize.m,
    fontWeight: fontWeight.medium,
    lineHeight: Math.round(fontSize.m * lineHeight.normal),
  },
  
  // Body text
  body: {
    fontSize: fontSize.m,
    fontWeight: fontWeight.regular,
    lineHeight: Math.round(fontSize.m * lineHeight.normal),
  },
  bodyEmphasized: {
    fontSize: fontSize.m,
    fontWeight: fontWeight.medium,
    lineHeight: Math.round(fontSize.m * lineHeight.normal),
  },
  
  // Supporting text
  caption: {
    fontSize: fontSize.s,
    fontWeight: fontWeight.regular,
    lineHeight: Math.round(fontSize.s * lineHeight.normal),
  },
  captionEmphasized: {
    fontSize: fontSize.s,
    fontWeight: fontWeight.medium,
    lineHeight: Math.round(fontSize.s * lineHeight.normal),
  },
  
  // Special cases
  button: {
    fontSize: fontSize.m,
    fontWeight: fontWeight.semibold,
    lineHeight: Math.round(fontSize.m * lineHeight.tight),
  },
  badge: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    lineHeight: Math.round(fontSize.xs * lineHeight.tight),
  },
  label: {
    fontSize: fontSize.s,
    fontWeight: fontWeight.medium,
    lineHeight: Math.round(fontSize.s * lineHeight.tight),
  },
} as const;

export type TypographyVariant = keyof typeof typography;
export type FontSize = keyof typeof fontSize;
export type FontWeight = keyof typeof fontWeight;