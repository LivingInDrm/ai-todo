/**
 * Badge Component
 * Small label for status, counts, or categories
 */

import React from 'react';
import { View, ViewStyle, TextStyle } from 'react-native';
import { useThemeValues } from '../../lib/theme/ThemeProvider';
import { Text } from './Text';

export interface BadgeProps {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'muted';
  size?: 'sm' | 'md';
  rounded?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'md',
  rounded = true,
  style,
  textStyle,
  children,
}) => {
  const theme = useThemeValues();
  
  // Size configurations
  const sizeConfig = {
    sm: {
      paddingVertical: 2,
      paddingHorizontal: theme.spacing.s,
      fontSize: theme.fontSize.xs,
    },
    md: {
      paddingVertical: 4,
      paddingHorizontal: theme.spacing.m,
      fontSize: theme.fontSize.s,
    },
  };
  
  // Variant styles
  const getVariantStyle = (): { container: ViewStyle; text: TextStyle } => {
    const baseContainer: ViewStyle = {
      ...sizeConfig[size],
      borderRadius: rounded ? theme.radiusPresets.badge : theme.radius.s,
      alignItems: 'center',
      justifyContent: 'center',
    };
    
    const baseText: TextStyle = {
      fontSize: sizeConfig[size].fontSize,
      fontWeight: theme.fontWeight.semibold,
    };
    
    switch (variant) {
      case 'primary':
        return {
          container: {
            ...baseContainer,
            backgroundColor: theme.colors.accent.primary,
          },
          text: {
            ...baseText,
            color: theme.colors.text.inverse,
          },
        };
        
      case 'success':
        return {
          container: {
            ...baseContainer,
            backgroundColor: theme.colors.feedback.success,
          },
          text: {
            ...baseText,
            color: theme.colors.text.inverse,
          },
        };
        
      case 'warning':
        return {
          container: {
            ...baseContainer,
            backgroundColor: theme.colors.feedback.warning,
          },
          text: {
            ...baseText,
            color: theme.colors.text.inverse,
          },
        };
        
      case 'danger':
        return {
          container: {
            ...baseContainer,
            backgroundColor: theme.colors.feedback.danger,
          },
          text: {
            ...baseText,
            color: theme.colors.text.inverse,
          },
        };
        
      case 'muted':
        return {
          container: {
            ...baseContainer,
            backgroundColor: theme.colors.bg.subtle,
          },
          text: {
            ...baseText,
            color: theme.colors.text.muted,
          },
        };
        
      case 'default':
      default:
        return {
          container: {
            ...baseContainer,
            backgroundColor: theme.colors.bg.subtle,
          },
          text: {
            ...baseText,
            color: theme.colors.text.secondary,
          },
        };
    }
  };
  
  const variantStyles = getVariantStyle();
  
  const containerStyle: ViewStyle = {
    ...variantStyles.container,
    ...style,
  };
  
  const combinedTextStyle: TextStyle = {
    ...variantStyles.text,
    ...textStyle,
  };
  
  return (
    <View style={containerStyle}>
      {typeof children === 'string' || typeof children === 'number' ? (
        <Text style={combinedTextStyle}>
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
};