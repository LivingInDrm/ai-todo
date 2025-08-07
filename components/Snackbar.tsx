import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';

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
  const translateY = useRef(new Animated.Value(100)).current;
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

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
          transform: [{ translateY }],
        },
      ]}
    >
      <Text style={styles.message} numberOfLines={2}>
        {message}
      </Text>
      {actionText && (
        <TouchableOpacity
          onPress={handleActionPress}
          activeOpacity={0.7}
        >
          <Text style={styles.actionText}>{actionText}</Text>
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
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  message: {
    flex: 1,
    fontSize: 14,
    color: '#fff',
    marginRight: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});

export default Snackbar;