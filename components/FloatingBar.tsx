import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';

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
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <View style={styles.content}>
        <TouchableOpacity
          style={styles.selectButton}
          onPress={onToggleAll}
          activeOpacity={0.7}
        >
          <Text style={styles.selectText}>
            {allSelected ? '取消全选' : '全选'}
          </Text>
        </TouchableOpacity>
        
        <View style={styles.info}>
          <Text style={styles.infoText}>
            {selectedCount} / {totalCount} 已选
          </Text>
        </View>
        
        <TouchableOpacity
          style={[
            styles.confirmButton,
            selectedCount === 0 && styles.confirmButtonDisabled,
          ]}
          onPress={onConfirm}
          activeOpacity={0.7}
          disabled={selectedCount === 0}
        >
          <Text
            style={[
              styles.confirmText,
              selectedCount === 0 && styles.confirmTextDisabled,
            ]}
          >
            确认
          </Text>
        </TouchableOpacity>
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
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
    paddingBottom: 34, // Safe area bottom
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 10,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  selectButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
  },
  selectText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
  },
  info: {
    flex: 1,
    alignItems: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  confirmButton: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#007AFF',
  },
  confirmButtonDisabled: {
    backgroundColor: '#E5E5EA',
  },
  confirmText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  confirmTextDisabled: {
    color: '#8E8E93',
  },
});

export default FloatingBar;