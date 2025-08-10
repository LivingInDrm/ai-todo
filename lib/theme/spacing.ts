/**
 * Spacing Design Tokens
 * Consistent spacing scale for margins, paddings, and gaps
 */

export const spacing = {
  xs: 4,    // Extra small
  s: 8,     // Small
  m: 12,    // Medium
  l: 16,    // Large
  xl: 20,   // Extra large
  xxl: 24,  // 2x Extra large (alias)
  '2xl': 24, // 2x Extra large
  xxxl: 32, // 3x Extra large (alias)
  '3xl': 32, // 3x Extra large
  '4xl': 40, // 4x Extra large
  '5xl': 48, // 5x Extra large
  '6xl': 56, // 6x Extra large
} as const;

export type SpacingScale = keyof typeof spacing;

// Common spacing combinations
export const spacingGroups = {
  // Padding presets
  padding: {
    cell: spacing.l,           // Standard cell padding
    button: spacing.m,         // Button internal padding
    card: spacing.l,          // Card content padding
    sheet: spacing.xl,        // Bottom sheet padding
    screen: spacing.l,        // Screen edge padding
  },
  
  // Margin presets
  margin: {
    element: spacing.s,       // Between elements
    section: spacing.xl,      // Between sections
    group: spacing.m,         // Within groups
  },
  
  // Gap presets
  gap: {
    xs: spacing.xs,          // Minimal gap
    s: spacing.s,            // Small gap
    m: spacing.m,            // Medium gap
    l: spacing.l,            // Large gap
  },
} as const;