/**
 * Card Component
 * Container component with consistent styling
 */

import React from 'react';
import { View, ViewProps, ViewStyle, StyleProp } from 'react-native';
import { useThemeValues } from '../../lib/theme/ThemeProvider';

export interface CardProps extends ViewProps {
  variant?: 'surface' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  margin?: 'none' | 'sm' | 'md' | 'lg';
  rounded?: boolean;
  bordered?: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  variant = 'surface',
  padding = 'md',
  margin = 'none',
  rounded = true,
  bordered = false,
  style,
  children,
  ...props
}) => {
  const theme = useThemeValues();
  
  // Padding configurations
  const paddingConfig = {
    none: 0,
    sm: theme.spacing.s,
    md: theme.spacing.l,
    lg: theme.spacing.xl,
  };
  
  // Margin configurations
  const marginConfig = {
    none: 0,
    sm: theme.spacing.s,
    md: theme.spacing.m,
    lg: theme.spacing.l,
  };
  
  return (
    <View 
      style={[
        {
          backgroundColor: variant === 'elevated' 
            ? theme.colors.bg.elevated 
            : theme.colors.bg.surface,
          padding: paddingConfig[padding],
          margin: marginConfig[margin],
        },
        rounded && { borderRadius: theme.radiusPresets.card },
        bordered && {
          borderWidth: 1,
          borderColor: theme.colors.border.default,
        },
        variant === 'elevated' && theme.elevationPresets.card,
        style,
      ]} 
      {...props}
    >
      {children}
    </View>
  );
};