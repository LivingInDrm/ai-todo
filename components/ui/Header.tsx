/**
 * Header Component
 * Reusable header with back button, title, and right slot
 */

import React from 'react';
import { View, TouchableOpacity, ViewStyle, StyleProp } from 'react-native';
import { Text } from './Text';
import { useThemeValues } from '../../lib/theme/ThemeProvider';

export interface HeaderProps {
  title: string;
  onBack?: () => void;
  backIcon?: string;
  rightSlot?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  onBack,
  backIcon = '←',
  rightSlot,
  style,
}) => {
  const theme = useThemeValues();
  
  return (
    <View style={[
      {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.l,
        paddingVertical: theme.spacing.m,
        backgroundColor: theme.colors.bg.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border.default,
        ...theme.elevationPresets.header,
      },
      style,
    ]}>
      {onBack ? (
        <TouchableOpacity
          style={{
            padding: theme.spacing.s,
            marginRight: theme.spacing.m,
            width: theme.sizing.control.m,
            height: theme.sizing.control.m,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: theme.fontSize.xl }}>
            {backIcon}
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={{ width: theme.sizing.control.m, marginRight: theme.spacing.m }} />
      )}
      
      <Text variant="heading" style={{ flex: 1 }}>
        {title}
      </Text>
      
      {rightSlot ? (
        <View style={{ marginLeft: theme.spacing.m }}>
          {rightSlot}
        </View>
      ) : (
        <View style={{ width: theme.sizing.control.m }} />
      )}
    </View>
  );
};