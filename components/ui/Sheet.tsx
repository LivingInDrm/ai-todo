/**
 * Sheet Component
 * Consistent styling for bottom sheets and modals
 */

import React from 'react';
import { View, ViewStyle, TextStyle } from 'react-native';
import { useThemeValues } from '../../lib/theme/ThemeProvider';
import { Text } from './Text';

interface SheetHeaderProps {
  title: string;
  subtitle?: string;
  onClose?: () => void;
  style?: ViewStyle;
}

export const SheetHeader: React.FC<SheetHeaderProps> = ({
  title,
  subtitle,
  style,
}) => {
  const theme = useThemeValues();
  
  const headerStyle: ViewStyle = {
    paddingHorizontal: theme.spacingGroups.padding.sheet,
    paddingTop: theme.spacing.l,
    paddingBottom: theme.spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.subtle,
    ...style,
  };
  
  return (
    <View style={headerStyle}>
      <View style={{ alignItems: 'center' }}>
        {/* Handle indicator */}
        <View
          style={{
            width: 36,
            height: 4,
            backgroundColor: theme.colors.border.default,
            borderRadius: 2,
            marginBottom: theme.spacing.m,
          }}
        />
      </View>
      
      <Text variant="heading" align="center">
        {title}
      </Text>
      
      {subtitle && (
        <Text 
          variant="caption" 
          color="secondary" 
          align="center"
          style={{ marginTop: theme.spacing.xs }}
        >
          {subtitle}
        </Text>
      )}
    </View>
  );
};

interface SheetContentProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const SheetContent: React.FC<SheetContentProps> = ({
  children,
  style,
}) => {
  const theme = useThemeValues();
  
  const contentStyle: ViewStyle = {
    padding: theme.spacingGroups.padding.sheet,
    ...style,
  };
  
  return (
    <View style={contentStyle}>
      {children}
    </View>
  );
};

interface SheetFooterProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const SheetFooter: React.FC<SheetFooterProps> = ({
  children,
  style,
}) => {
  const theme = useThemeValues();
  
  const footerStyle: ViewStyle = {
    paddingHorizontal: theme.spacingGroups.padding.sheet,
    paddingTop: theme.spacing.m,
    paddingBottom: theme.spacing.xl,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.subtle,
    ...style,
  };
  
  return (
    <View style={footerStyle}>
      {children}
    </View>
  );
};

interface SheetProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const Sheet: React.FC<SheetProps> & {
  Header: typeof SheetHeader;
  Content: typeof SheetContent;
  Footer: typeof SheetFooter;
} = ({ children, style }) => {
  const theme = useThemeValues();
  
  const sheetStyle: ViewStyle = {
    backgroundColor: theme.colors.bg.elevated,
    borderTopLeftRadius: theme.radiusPresets.sheet,
    borderTopRightRadius: theme.radiusPresets.sheet,
    ...theme.elevationPresets.sheet,
    ...style,
  };
  
  return (
    <View style={sheetStyle}>
      {children}
    </View>
  );
};

Sheet.Header = SheetHeader;
Sheet.Content = SheetContent;
Sheet.Footer = SheetFooter;