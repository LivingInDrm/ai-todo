import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
} from 'react-native';
import { TaskView } from '../lib/types';

interface EmptyStateProps {
  view: TaskView;
}

const EmptyState: React.FC<EmptyStateProps> = ({ view }) => {
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
    <View style={styles.container}>
      <Text style={styles.emoji}>{content.emoji}</Text>
      <Text style={styles.title}>{content.title}</Text>
      {content.subtitle ? (
        <Text style={styles.subtitle}>{content.subtitle}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingBottom: 100,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
});

export default EmptyState;