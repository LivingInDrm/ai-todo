import React from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import { TaskView } from '../lib/types';
import { Text } from '@ui';
import { useThemeValues } from '@lib/theme/ThemeProvider';

interface EmptyStateProps {
  view: TaskView;
}

const EmptyState: React.FC<EmptyStateProps> = ({ view }) => {
  const theme = useThemeValues();
  
  const getContent = () => {
    switch (view) {
      case TaskView.Focus:
        return {
          emoji: '😌',
          title: '今天没有待办',
          subtitle: '好好休息！',
        };
      case TaskView.Backlog:
        return {
          emoji: '💡',
          title: '暂无计划任务',
          subtitle: '来点灵感吧～',
        };
      case TaskView.Done:
        return {
          emoji: '📝',
          title: '近30天无已完成任务',
          subtitle: '开始你的第一个任务吧',
        };
      default:
        return {
          emoji: '📋',
          title: '暂无任务',
          subtitle: '',
        };
    }
  };

  const content = getContent();

  return (
    <View style={[
      styles.container,
      {
        paddingHorizontal: theme.spacing.xl * 2,
        paddingBottom: theme.spacing.xl * 5,
      }
    ]}>
      <Text style={styles.emoji}>{content.emoji}</Text>
      <Text 
        variant="heading" 
        color="primary"
        align="center"
        style={{ marginBottom: theme.spacing.s }}
      >
        {content.title}
      </Text>
      {content.subtitle ? (
        <Text 
          variant="caption" 
          color="secondary"
          align="center"
        >
          {content.subtitle}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 64,
    marginBottom: 20,
  },
});

export default EmptyState;