import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@ui';
import { Text } from '@ui';
import { useThemeValues } from '@lib/theme/ThemeProvider';

interface FloatingBarProps {
  visible: boolean;
  selectedCount: number;
  totalCount: number;
  allSelected: boolean;
  onToggleAll: () => void;
  onConfirm: () => void;
}

const FloatingBar: React.FC<FloatingBarProps> = ({
  visible,
  selectedCount,
  totalCount,
  allSelected,
  onToggleAll,
  onConfirm,
}) => {
  const theme = useThemeValues();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          tension: 100,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 100,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.bg.surface,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: theme.colors.border.default,
          paddingBottom: insets.bottom,
          ...theme.elevationPresets.snackbar,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <View style={[styles.content, {
        paddingHorizontal: theme.spacing.l,
        paddingVertical: theme.spacing.m,
      }]}>
        <Button
          variant="secondary"
          size="sm"
          onPress={onToggleAll}
        >
          {allSelected ? '取消全选' : '全选'}
        </Button>
        
        <View style={styles.info}>
          <Text variant="body" color="secondary">
            {selectedCount} / {totalCount} 已选
          </Text>
        </View>
        
        <Button
          variant="primary"
          size="sm"
          onPress={onConfirm}
          disabled={selectedCount === 0}
        >
          确认
        </Button>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  info: {
    flex: 1,
    alignItems: 'center',
  },
});

export default FloatingBar;