import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { TaskData } from '../lib/types';

interface TaskCellProps {
  task: TaskData;
  showTime?: boolean;
  isDraft?: boolean;
  onPress?: () => void;
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  onMorePress?: () => void;
}

const TaskCell: React.FC<TaskCellProps> = ({
  task,
  showTime = true,
  isDraft = false,
  onPress,
  onSwipeRight,
  onSwipeLeft,
  onMorePress,
}) => {
  const isCompleted = task.status === 1;
  
  const formatTime = (timestamp?: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    
    if (showTime) {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    } else {
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      return `${month}-${day}`;
    }
  };

  const renderRightActions = (progress: Animated.AnimatedInterpolation<number>) => {
    const translateX = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [192, 0],
    });

    return (
      <Animated.View style={{ transform: [{ translateX }] }}>
        <TouchableOpacity
          style={[styles.actionButton, styles.moreButton]}
          onPress={onMorePress}
        >
          <Text style={styles.actionText}>⋯</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderLeftActions = () => {
    return (
      <View style={[styles.actionButton, styles.completeButton]}>
        <Text style={styles.actionText}>{isCompleted ? '↺' : '✓'}</Text>
      </View>
    );
  };

  return (
    <Swipeable
      renderLeftActions={onSwipeRight ? renderLeftActions : undefined}
      renderRightActions={onSwipeLeft ? renderRightActions : undefined}
      onSwipeableOpen={(direction) => {
        if (direction === 'left' && onSwipeLeft) {
          onSwipeLeft();
        } else if (direction === 'right' && onSwipeRight) {
          onSwipeRight();
        }
      }}
      overshootLeft={false}
      overshootRight={false}
      friction={2}
    >
      <TouchableOpacity
        style={styles.container}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.content}>
          {task.urgent && !isCompleted && (
            <View style={styles.urgentIndicator} />
          )}
          
          <View style={styles.checkbox}>
            {isCompleted && <Text style={styles.checkmark}>✓</Text>}
          </View>
          
          <Text
            style={[
              styles.title,
              isCompleted && styles.completedTitle,
              task.urgent && !isCompleted && styles.urgentTitle,
            ]}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {task.title}
          </Text>
          
          {task.dueTs && (
            <Text style={[styles.time, isCompleted && styles.completedTime]}>
              {formatTime(task.dueTs)}
            </Text>
          )}
        </View>
        
        {isDraft && (
          <View style={styles.draftIndicator}>
            <Text style={styles.draftText}>草稿</Text>
          </View>
        )}
      </TouchableOpacity>
    </Swipeable>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    minHeight: 60,
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  urgentIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: '#FF3B30',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#C7C7CC',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#34C759',
    fontSize: 14,
    fontWeight: 'bold',
  },
  title: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    lineHeight: 22,
  },
  completedTitle: {
    color: '#8E8E93',
    textDecorationLine: 'line-through',
  },
  urgentTitle: {
    fontWeight: '500',
  },
  time: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 8,
  },
  completedTime: {
    color: '#C7C7CC',
  },
  actionButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
  },
  completeButton: {
    backgroundColor: '#34C759',
  },
  moreButton: {
    backgroundColor: '#8E8E93',
  },
  actionText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  draftIndicator: {
    position: 'absolute',
    top: 4,
    right: 16,
    backgroundColor: '#E5F3FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  draftText: {
    fontSize: 11,
    color: '#007AFF',
  },
});

export default TaskCell;