/**
 * Text Component
 * Themed text component with semantic variants
 */

import React from 'react';
import { Text as RNText, TextProps as RNTextProps, TextStyle, StyleProp } from 'react-native';
import { useThemeValues } from '../../lib/theme/ThemeProvider';
import { TypographyVariant } from '../../lib/theme/typography';

export interface TextProps extends Omit<RNTextProps, 'style'> {
  variant?: TypographyVariant | 'body'; // Default to body
  color?: 'primary' | 'secondary' | 'muted' | 'inverse' | 'link' | 'success' | 'warning' | 'danger';
  align?: 'left' | 'center' | 'right' | 'justify';
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
}

export const Text: React.FC<TextProps> = ({
  variant = 'body',
  color = 'primary',
  align,
  style,
  children,
  ...props
}) => {
  const theme = useThemeValues();
  
  // Get typography styles
  const typographyStyle = theme.typography[variant] || theme.typography.body;
  
  // Get color based on semantic name
  const textColor = (() => {
    switch (color) {
      case 'primary':
        return theme.colors.text.primary;
      case 'secondary':
        return theme.colors.text.secondary;
      case 'muted':
        return theme.colors.text.muted;
      case 'inverse':
        return theme.colors.text.inverse;
      case 'link':
        return theme.colors.text.link;
      case 'success':
        return theme.colors.feedback.success;
      case 'warning':
        return theme.colors.feedback.warning;
      case 'danger':
        return theme.colors.feedback.danger;
      default:
        return theme.colors.text.primary;
    }
  })();
  
  return (
    <RNText 
      style={[
        typographyStyle,
        { color: textColor },
        align && { textAlign: align },
        style,
      ]} 
      {...props}
    >
      {children}
    </RNText>
  );
};