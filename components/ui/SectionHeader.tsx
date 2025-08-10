/**
 * Section Header Component
 * Reusable header for sections with optional right slot
 */

import React from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import { Text } from './Text';
import { useThemeValues } from '../../lib/theme/ThemeProvider';

export interface SectionHeaderProps {
  title: string;
  description?: string;
  rightSlot?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  description,
  rightSlot,
  style,
}) => {
  const theme = useThemeValues();
  
  return (
    <View style={[
      {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.m,
        paddingVertical: theme.spacing.s,
        marginBottom: theme.spacing.s,
      },
      style,
    ]}>
      <View style={{ flex: 1 }}>
        <Text variant="caption" color="secondary">
          {title}
        </Text>
        {description && (
          <Text variant="caption" color="muted" style={{ marginTop: theme.spacing.xs }}>
            {description}
          </Text>
        )}
      </View>
      {rightSlot && (
        <View style={{ marginLeft: theme.spacing.m }}>
          {rightSlot}
        </View>
      )}
    </View>
  );
};