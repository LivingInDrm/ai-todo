/**
 * Responsive Container Component
 * Provides responsive layout with max width constraints
 */

import React from 'react';
import { View, ViewProps, ViewStyle, StyleProp } from 'react-native';
import { useMaxContentWidth, useScreenSize, useResponsiveSpacing } from '../../lib/theme/responsive';
import { useThemeValues } from '../../lib/theme/ThemeProvider';

export interface ResponsiveContainerProps extends ViewProps {
  padding?: boolean;
  centered?: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  padding = true,
  centered = true,
  style,
  children,
  ...props
}) => {
  const theme = useThemeValues();
  const maxWidth = useMaxContentWidth();
  const screenSize = useScreenSize();
  const responsivePadding = useResponsiveSpacing(theme.spacingGroups.padding.screen);
  
  const containerStyle: ViewStyle = {
    flex: 1,
    width: '100%',
    ...(padding && {
      paddingHorizontal: responsivePadding,
    }),
  };
  
  // Build inner styles with proper maxWidth handling
  const innerBaseStyle: ViewStyle = {
    flex: 1,
    width: '100%',
  };
  
  // Only set maxWidth if it's a number
  if (typeof maxWidth === 'number') {
    innerBaseStyle.maxWidth = maxWidth;
  }
  
  if (centered && typeof maxWidth === 'number') {
    innerBaseStyle.alignSelf = 'center';
  }
  
  // For tablets, wrap in an extra container to center content
  if (screenSize === 'wide' && centered) {
    return (
      <View style={containerStyle} {...props}>
        <View style={[innerBaseStyle, style]}>
          {children}
        </View>
      </View>
    );
  }
  
  // For phones, apply styles directly
  return (
    <View style={[containerStyle, innerBaseStyle, style]} {...props}>
      {children}
    </View>
  );
};