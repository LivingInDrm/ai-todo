import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { TaskView } from '../lib/types';

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
  const tabs = [
    { key: TaskView.Focus, label: 'Focus', count: focusCount },
    { key: TaskView.Backlog, label: 'Backlog', count: backlogCount },
    { key: TaskView.Done, label: 'Done', count: doneCount },
  ];

  return (
    <View style={styles.container}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[
            styles.tab,
            currentView === tab.key && styles.activeTab,
          ]}
          onPress={() => onViewChange(tab.key)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              currentView === tab.key && styles.activeTabText,
            ]}
          >
            {tab.label}
          </Text>
          {tab.count > 0 && (
            <View
              style={[
                styles.badge,
                currentView === tab.key && styles.activeBadge,
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  currentView === tab.key && styles.activeBadgeText,
                ]}
              >
                {tab.count}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#8E8E93',
  },
  activeTabText: {
    color: '#000',
    fontWeight: '600',
  },
  badge: {
    backgroundColor: '#E5E5EA',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
    paddingHorizontal: 6,
  },
  activeBadge: {
    backgroundColor: '#007AFF',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
  },
  activeBadgeText: {
    color: '#fff',
  },
});

export default TaskTabs;