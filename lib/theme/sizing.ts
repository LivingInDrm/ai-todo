/**
 * Sizing Design Tokens
 * Consistent size values for components, icons, and controls
 */

export const sizing = {
  // Icon sizes
  icon: {
    xs: 16,   // Small icons
    s: 20,    // Regular icons
    m: 24,    // Medium icons
    l: 32,    // Large icons
    xl: 40,   // Extra large icons
  },
  
  // Control sizes (buttons, inputs, etc.)
  control: {
    xs: 24,   // Extra small controls
    s: 32,    // Small controls
    m: 40,    // Medium controls
    l: 48,    // Large controls
    xl: 56,   // Extra large controls
  },
  
  // Specific component sizes
  checkbox: 22,
  avatar: 50,
  fab: 56,          // Floating action button
  swipeAction: 80,  // Swipe action button width
  minCellHeight: 60,
  urgentIndicator: 3,
  
  // Border widths
  border: {
    thin: 1,
    medium: 2,
    thick: 3,
  },
} as const;

export type IconSize = keyof typeof sizing.icon;
export type ControlSize = keyof typeof sizing.control;