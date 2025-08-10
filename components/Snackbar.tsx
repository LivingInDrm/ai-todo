import React, { useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Text } from '@ui';
import { useThemeValues } from '@lib/theme/ThemeProvider';

interface SnackbarProps {
  visible: boolean;
  message: string;
  actionText?: string;
  onActionPress?: () => void;
  duration?: number;
  onDismiss?: () => void;
}

const Snackbar: React.FC<SnackbarProps> = ({
  visible,
  message,
  actionText,
  onActionPress,
  duration = 3000,
  onDismiss,
}) => {
  const theme = useThemeValues();
  const translateY = useRef(new Animated.Value(100)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        tension: 100,
        friction: 10,
        useNativeDriver: true,
      }).start();

      if (duration > 0) {
        timeoutRef.current = setTimeout(() => {
          hide();
        }, duration);
      }
    } else {
      hide();
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [visible]);

  const hide = () => {
    Animated.timing(translateY, {
      toValue: 100,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      if (onDismiss) {
        onDismiss();
      }
    });
  };

  const handleActionPress = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    hide();
    if (onActionPress) {
      onActionPress();
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.bg.elevated,
          borderRadius: theme.radius.m,
          paddingHorizontal: theme.spacing.l,
          paddingVertical: theme.spacing.m + 2,
          ...theme.elevationPresets.snackbar,
          transform: [{ translateY }],
        },
      ]}
    >
      <Text 
        variant="body" 
        color="inverse"
        style={styles.message} 
        numberOfLines={2}
      >
        {message}
      </Text>
      {actionText && (
        <TouchableOpacity
          onPress={handleActionPress}
          activeOpacity={0.7}
          style={{
            paddingHorizontal: theme.spacing.s,
            paddingVertical: theme.spacing.xs,
          }}
        >
          <Text 
            variant="body" 
            color="link"
            style={{ fontWeight: theme.fontWeight.semibold }}
          >
            {actionText}
          </Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  message: {
    flex: 1,
    marginRight: 8,
  },
});

export default Snackbar;