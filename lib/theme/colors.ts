/**
 * Color Design Tokens
 * Semantic color definitions that map to actual color values
 * Supports light and dark themes
 */

export interface ColorTokens {
  // Background colors
  bg: {
    surface: string;      // Main surface background
    elevated: string;     // Elevated elements (sheets, modals)
    subtle: string;       // Subtle background variations
    inverse: string;      // Inverse background for contrast
  };
  
  // Text colors
  text: {
    primary: string;      // Primary text
    secondary: string;    // Secondary/supporting text
    muted: string;        // Muted/disabled text
    inverse: string;      // Text on inverse backgrounds
    link: string;         // Interactive text/links
  };
  
  // Border colors
  border: {
    default: string;      // Default borders
    subtle: string;       // Subtle borders
    focus: string;        // Focus state borders
  };
  
  // Brand/Accent colors
  accent: {
    primary: string;      // Primary brand color
    secondary: string;    // Secondary brand color
  };
  
  // Feedback colors
  feedback: {
    success: string;      // Success states
    warning: string;      // Warning states
    danger: string;       // Error/danger states
    info: string;         // Informational states
  };
  
  // Overlay
  overlay: {
    backdrop: string;     // Modal backdrop
  };
  
  // Utility colors
  utility: {
    shadow: string;           // Shadow color for elevation
    activityIndicator: string; // Activity indicator/spinner color
    divider: string;          // Divider/separator color
    placeholder: string;      // Input placeholder text color
  };
  
  // Brand-specific colors
  brand: {
    notification: string;     // Android notification channel color
  };
}

// Light theme colors
export const lightColors: ColorTokens = {
  bg: {
    surface: '#FFFFFF',
    elevated: '#FFFFFF',
    subtle: '#F2F2F7',
    inverse: '#000000',
  },
  text: {
    primary: '#000000',
    secondary: '#666666',
    muted: '#8E8E93',
    inverse: '#FFFFFF',
    link: '#007AFF',
  },
  border: {
    default: '#E5E5EA',
    subtle: '#F0F0F0',
    focus: '#007AFF',
  },
  accent: {
    primary: '#007AFF',
    secondary: '#5856D6',
  },
  feedback: {
    success: '#34C759',
    warning: '#FF9500',
    danger: '#FF3B30',
    info: '#007AFF',
  },
  overlay: {
    backdrop: 'rgba(0, 0, 0, 0.5)',
  },
  utility: {
    shadow: '#000000',
    activityIndicator: '#8E8E93',
    divider: '#E5E5EA',
    placeholder: '#8E8E93',
  },
  brand: {
    notification: '#FF231F7C',
  },
};

// Dark theme colors
export const darkColors: ColorTokens = {
  bg: {
    surface: '#000000',
    elevated: '#1C1C1E',
    subtle: '#2C2C2E',
    inverse: '#FFFFFF',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#ABABAB',
    muted: '#8E8E93',
    inverse: '#000000',
    link: '#0A84FF',
  },
  border: {
    default: '#38383A',
    subtle: '#2C2C2E',
    focus: '#0A84FF',
  },
  accent: {
    primary: '#0A84FF',
    secondary: '#5E5CE6',
  },
  feedback: {
    success: '#32D74B',
    warning: '#FF9F0A',
    danger: '#FF453A',
    info: '#0A84FF',
  },
  overlay: {
    backdrop: 'rgba(0, 0, 0, 0.8)',
  },
  utility: {
    shadow: '#000000',
    activityIndicator: '#8E8E93',
    divider: '#38383A',
    placeholder: '#8E8E93',
  },
  brand: {
    notification: '#FF231F7C',
  },
};