import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { TaskView } from '../lib/types';
import { Text } from '@ui';
import { Badge } from '@ui';
import { useThemeValues } from '@lib/theme/ThemeProvider';

interface TaskTabsProps {
  currentView: TaskView;
  onViewChange: (view: TaskView) => void;
  focusCount?: number;
  backlogCount?: number;
  doneCount?: number;
}

const TaskTabs: React.FC<TaskTabsProps> = ({
  currentView,
  onViewChange,
  focusCount = 0,
  backlogCount = 0,
  doneCount = 0,
}) => {
  const theme = useThemeValues();
  
  const tabs = [
    { key: TaskView.Focus, label: 'Focus', count: focusCount },
    { key: TaskView.Backlog, label: 'Backlog', count: backlogCount },
    { key: TaskView.Done, label: 'Done', count: doneCount },
  ];

  return (
    <View style={[styles.container, { 
      backgroundColor: theme.colors.bg.subtle,
      borderRadius: theme.radius.m,
      marginHorizontal: theme.spacing.l,
      marginVertical: theme.spacing.m,
      padding: theme.spacing.xs,
    }]}>
      {tabs.map((tab) => {
        const isActive = currentView === tab.key;
        
        return (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              {
                paddingVertical: theme.spacing.s,
                paddingHorizontal: theme.spacing.m,
                borderRadius: theme.radius.s,
              },
              isActive && {
                backgroundColor: theme.colors.bg.surface,
                ...theme.elevation.s,
              },
            ]}
            onPress={() => onViewChange(tab.key)}
            activeOpacity={0.7}
          >
            <Text
              variant="body"
              color={isActive ? 'primary' : 'secondary'}
              style={{
                fontWeight: isActive ? theme.fontWeight.semibold : theme.fontWeight.medium,
              }}
            >
              {tab.label}
            </Text>
            {tab.count > 0 && (
              <Badge
                variant={isActive ? 'primary' : 'muted'}
                size="sm"
                style={{ marginLeft: theme.spacing.s }}
              >
                {tab.count}
              </Badge>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default TaskTabs;