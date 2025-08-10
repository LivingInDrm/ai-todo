/**
 * Button Component
 * Themed button with multiple variants and sizes
 */

import React from 'react';
import {
  TouchableOpacity,
  TouchableOpacityProps,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  View,
  StyleProp,
} from 'react-native';
import { useThemeValues } from '../../lib/theme/ThemeProvider';
import { Text } from './Text';

export interface ButtonProps extends Omit<TouchableOpacityProps, 'style'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: TextStyle;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled = false,
  style,
  textStyle,
  children,
  onPress,
  ...props
}) => {
  const theme = useThemeValues();
  
  // Size configurations
  const sizeConfig = {
    sm: {
      paddingVertical: theme.spacing.s,
      paddingHorizontal: theme.spacing.m,
      fontSize: theme.fontSize.s,
    },
    md: {
      paddingVertical: theme.spacing.m,
      paddingHorizontal: theme.spacing.l,
      fontSize: theme.fontSize.m,
    },
    lg: {
      paddingVertical: theme.spacing.l,
      paddingHorizontal: theme.spacing.xl,
      fontSize: theme.fontSize.l,
    },
  };
  
  // Variant styles
  const getVariantStyle = (): { button: ViewStyle; text: TextStyle } => {
    const baseButton: ViewStyle = {
      borderRadius: theme.radiusPresets.button,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      ...sizeConfig[size],
    };
    
    const baseText: TextStyle = {
      fontSize: sizeConfig[size].fontSize,
      fontWeight: theme.fontWeight.semibold,
    };
    
    switch (variant) {
      case 'primary':
        return {
          button: {
            ...baseButton,
            backgroundColor: disabled 
              ? theme.colors.border.subtle 
              : theme.colors.accent.primary,
            ...theme.elevationPresets.button,
          },
          text: {
            ...baseText,
            color: disabled 
              ? theme.colors.text.muted 
              : theme.colors.text.inverse, // Inverse text for contrast
          },
        };
        
      case 'secondary':
        return {
          button: {
            ...baseButton,
            backgroundColor: theme.colors.bg.subtle,
            borderWidth: 1,
            borderColor: disabled 
              ? theme.colors.border.subtle 
              : theme.colors.border.default,
          },
          text: {
            ...baseText,
            color: disabled 
              ? theme.colors.text.muted 
              : theme.colors.text.primary,
          },
        };
        
      case 'ghost':
        return {
          button: {
            ...baseButton,
            backgroundColor: 'transparent',
          },
          text: {
            ...baseText,
            color: disabled 
              ? theme.colors.text.muted 
              : theme.colors.accent.primary,
          },
        };
        
      case 'danger':
        return {
          button: {
            ...baseButton,
            backgroundColor: disabled 
              ? theme.colors.border.subtle 
              : theme.colors.feedback.danger,
            ...theme.elevationPresets.button,
          },
          text: {
            ...baseText,
            color: disabled 
              ? theme.colors.text.muted 
              : theme.colors.text.inverse, // Inverse text for contrast
          },
        };
        
      default:
        return { button: baseButton, text: baseText };
    }
  };
  
  const variantStyles = getVariantStyle();
  
  const combinedTextStyle: TextStyle = {
    ...variantStyles.text,
    ...textStyle,
  };
  
  return (
    <TouchableOpacity
      style={[
        variantStyles.button,
        fullWidth && { width: '100%' },
        disabled && { opacity: 0.6 },
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...props}
    >
      {loading ? (
        <ActivityIndicator 
          size="small" 
          color={variantStyles.text.color as string}
        />
      ) : typeof children === 'string' ? (
        <Text style={combinedTextStyle}>
          {children}
        </Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
};