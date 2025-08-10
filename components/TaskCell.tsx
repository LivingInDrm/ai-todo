import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { TaskData } from '../lib/types';
import { Text, Badge } from '@ui';
import { useThemeValues } from '@lib/theme/ThemeProvider';

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
  const theme = useThemeValues();
  const isCompleted = task.status === 1;
  const screenWidth = Dimensions.get('window').width;
  const swipeThreshold = screenWidth * 0.3; // 30% of screen width
  
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
          style={[
            styles.actionButton,
            {
              backgroundColor: theme.colors.text.secondary,
              width: theme.sizing.swipeAction,
              height: '100%',
            }
          ]}
          onPress={onMorePress}
        >
          <Text style={[styles.actionText, { color: theme.colors.text.inverse }]}>⋯</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderLeftActions = () => {
    return (
      <View style={[
        styles.actionButton,
        {
          backgroundColor: theme.colors.feedback.success,
          width: theme.sizing.swipeAction,
          height: '100%',
        }
      ]}>
        <Text style={[styles.actionText, { color: theme.colors.text.inverse }]}>{isCompleted ? '↺' : '✓'}</Text>
      </View>
    );
  };

  return (
    <Swipeable
      renderLeftActions={onSwipeRight ? renderLeftActions : undefined}
      renderRightActions={onSwipeLeft ? renderRightActions : undefined}
      onSwipeableOpen={(direction) => {
        if (direction === 'left' && onSwipeRight) {
          onSwipeRight();
        } else if (direction === 'right' && onSwipeLeft) {
          onSwipeLeft();
        }
      }}
      overshootLeft={false}
      overshootRight={false}
      friction={2}
      leftThreshold={swipeThreshold}  // Trigger at 30% of screen width
      rightThreshold={swipeThreshold} // Trigger at 30% of screen width
    >
      <TouchableOpacity
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.bg.surface,
            minHeight: theme.sizing.minCellHeight,
          }
        ]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={[
          styles.content,
          {
            paddingHorizontal: theme.spacing.l,
            paddingVertical: theme.spacing.m,
          }
        ]}>
          {task.urgent && !isCompleted && (
            <View style={[
              styles.urgentIndicator,
              {
                backgroundColor: theme.colors.feedback.danger,
                width: theme.sizing.urgentIndicator,
              }
            ]} />
          )}
          
          <View style={[
            styles.checkbox,
            {
              borderColor: isCompleted 
                ? theme.colors.feedback.success 
                : theme.colors.border.default,
              marginRight: theme.spacing.m,
              width: theme.sizing.checkbox,
              height: theme.sizing.checkbox,
              borderRadius: theme.sizing.checkbox / 2,
            }
          ]}>
            {isCompleted && (
              <Text 
                style={{ 
                  color: theme.colors.feedback.success,
                  fontSize: 14,
                  fontWeight: theme.fontWeight.bold 
                }}
              >
                ✓
              </Text>
            )}
          </View>
          
          <Text
            variant="body"
            color={isCompleted ? 'muted' : 'primary'}
            style={[
              styles.title,
              isCompleted && styles.completedTitle,
              task.urgent && !isCompleted && { fontWeight: theme.fontWeight.medium },
            ]}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {task.title}
          </Text>
          
          {task.dueTs && (
            <Text 
              variant="caption" 
              color={isCompleted ? 'muted' : 'secondary'}
              style={{ marginLeft: theme.spacing.s }}
            >
              {formatTime(task.dueTs)}
            </Text>
          )}
        </View>
        
        {isDraft && (
          <View style={[
            styles.draftIndicator,
            {
              top: theme.spacing.xs,
              right: theme.spacing.l,
            }
          ]}>
            <Badge variant="primary" size="sm">
              草稿
            </Badge>
          </View>
        )}
      </TouchableOpacity>
    </Swipeable>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  urgentIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  checkbox: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    lineHeight: 22,
  },
  completedTitle: {
    textDecorationLine: 'line-through',
  },
  actionButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  draftIndicator: {
    position: 'absolute',
  },
});

export default TaskCell;