import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Text,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import useTaskStore from '../features/task/taskStore';
import useDraftStore from '../features/draft/draftStore';
import { TaskData, TaskView } from '../lib/types';
import TaskCell from '../components/TaskCell';
import TaskTabs from '../components/TaskTabs';
import EmptyState from '../components/EmptyState';
import VoiceButton from '../components/VoiceButton';
import Snackbar from '../components/Snackbar';
import FloatingBar from '../components/FloatingBar';
import TaskDetailSheet, { TaskDetailSheetRef } from '../components/TaskDetailSheet';
import MoreActionSheet, { MoreActionSheetRef } from '../components/MoreActionSheet';
import voiceFlow from '../features/voice/voiceFlow';
import NetInfo from '@react-native-community/netinfo';
import { taskSyncService } from '../features/task/taskSync';
import { useAuthStore } from '../features/auth/authStore';
import reminderService from '../features/notify/reminderService';
import { useTheme } from '../lib/theme/ThemeProvider';

export default function TaskListScreen() {
  const { theme } = useTheme();
  const {
    tasks,
    loading,
    currentView,
    setCurrentView,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    toggleTaskStatus,
    postponeTask,
    pinTask,
    getFocusTasks,
    getBacklogTasks,
    getDoneTasks,
  } = useTaskStore();

  const {
    drafts,
    isExpanded,
    toggleExpanded,
    toggleDraftSelection,
    toggleAllSelection,
    confirmSelectedDrafts,
    confirmSingleDraft,
    fetchDrafts,
    undoLastConfirmation,
  } = useDraftStore();
  
  const { user } = useAuthStore();

  const [refreshing, setRefreshing] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '', actionText: '', undoType: '' });
  const [selectedTask, setSelectedTask] = useState<TaskData | undefined>();
  const [undoTasks, setUndoTasks] = useState<string[]>([]);
  const [voiceAvailable, setVoiceAvailable] = useState(false);

  const taskDetailRef = useRef<TaskDetailSheetRef>(null);
  const moreActionRef = useRef<MoreActionSheetRef>(null);

  useEffect(() => {
    fetchTasks();
    fetchDrafts();
    
    // Check voice availability
    voiceFlow.isAvailable().then(setVoiceAvailable);
    
    // Set up network listener
    const unsubscribe = NetInfo.addEventListener(state => {
      voiceFlow.isAvailable().then(setVoiceAvailable);
    });
    
    // Initialize real-time sync if user is authenticated
    if (user) {
      taskSyncService.initializeRealtimeSync();
    }
    
    return () => {
      unsubscribe();
      // Clean up real-time sync on unmount
      taskSyncService.cleanup();
    };
  }, [user]);
  
  // Check and update expired reminders when tasks are loaded
  useEffect(() => {
    const checkExpiredReminders = async () => {
      const allTasks = [...getFocusTasks(), ...getBacklogTasks()];
      await reminderService.checkAndUpdateExpiredReminders(allTasks);
    };
    
    if (tasks.length > 0) {
      checkExpiredReminders();
    }
  }, [tasks]);

  const getCurrentTasks = () => {
    switch (currentView) {
      case TaskView.Focus:
        return getFocusTasks();
      case TaskView.Backlog:
        return getBacklogTasks();
      case TaskView.Done:
        return getDoneTasks();
      default:
        return [];
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    
    // Trigger sync with Supabase if user is authenticated
    if (user) {
      await taskSyncService.processOfflineQueue();
    }
    
    await fetchTasks();
    await fetchDrafts();
    setRefreshing(false);
  };

  const handleTaskPress = (task: TaskData) => {
    setSelectedTask(task);
    taskDetailRef.current?.present(task);
  };

  const handleTaskSwipeRight = async (task: TaskData) => {
    await toggleTaskStatus(task.id);
    const message = task.status === 0 ? '任务已完成' : '任务已恢复';
    setSnackbar({ visible: true, message, actionText: '撤销', undoType: 'taskStatus' });
    setUndoTasks([task.id]);
  };

  const handleTaskSwipeLeft = (task: TaskData) => {
    setSelectedTask(task);
    moreActionRef.current?.present();
  };

  const handleNewTask = () => {
    console.log('handleNewTask called');
    console.log('taskDetailRef.current:', taskDetailRef.current);
    taskDetailRef.current?.present();
  };

  const handleSaveTask = async (taskData: Partial<TaskData>) => {
    if (taskData.id) {
      await updateTask(taskData.id, taskData);
    } else {
      await createTask(taskData);
    }
  };

  const handleDeleteTask = async (taskId?: string) => {
    const id = taskId || selectedTask?.id;
    if (!id) return;

    Alert.alert(
      '确认删除',
      '确定要删除这个任务吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            await deleteTask(id);
            setSnackbar({ visible: true, message: '任务已删除', actionText: '', undoType: '' });
          },
        },
      ]
    );
  };

  const handlePostpone = async (option: string) => {
    if (!selectedTask) return;

    let newDueTs: number;
    const now = new Date();

    switch (option) {
      case 'tonight':
        now.setHours(20, 0, 0, 0);
        newDueTs = now.getTime();
        break;
      case 'tomorrow':
        now.setDate(now.getDate() + 1);
        now.setHours(9, 0, 0, 0);
        newDueTs = now.getTime();
        break;
      case 'weekend':
        const daysUntilSaturday = (6 - now.getDay() + 7) % 7 || 7;
        now.setDate(now.getDate() + daysUntilSaturday);
        now.setHours(9, 0, 0, 0);
        newDueTs = now.getTime();
        break;
      case 'custom':
        // Open task detail sheet for custom date selection
        taskDetailRef.current?.present(selectedTask);
        return;
      default:
        return;
    }

    await postponeTask(selectedTask.id, newDueTs);
    setSnackbar({ visible: true, message: '任务已延后', actionText: '', undoType: '' });
  };

  const handlePin = async () => {
    if (!selectedTask) return;
    await pinTask(selectedTask.id);
    setSnackbar({ visible: true, message: '任务已置顶', actionText: '', undoType: '' });
  };

  const handleConfirmDrafts = async () => {
    const result = await confirmSelectedDrafts();
    const message = `已添加 ${result.added} 项${result.completed > 0 ? `，已完成 ${result.completed} 项` : ''}`;
    setSnackbar({ visible: true, message, actionText: '撤销', undoType: 'draftConfirm' });
  };

  const handleUndoSnackbar = async () => {
    if (snackbar.undoType === 'taskStatus' && undoTasks.length > 0) {
      // Undo task status change
      for (const taskId of undoTasks) {
        await toggleTaskStatus(taskId);
      }
      setUndoTasks([]);
    } else if (snackbar.undoType === 'draftConfirm') {
      // Undo draft confirmation
      await undoLastConfirmation();
    }
  };

  const handleVoiceRecordingComplete = async (audioUri: string) => {
    try {
      await voiceFlow.processVoiceInput(audioUri);
      await fetchDrafts();
      setSnackbar({ visible: true, message: '语音识别成功，请确认任务', actionText: '', undoType: '' });
    } catch (error) {
      console.error('Voice processing error:', error);
      Alert.alert('语音识别失败', '无法识别语音内容，请重试');
    }
  };

  const currentTasks = getCurrentTasks();
  const selectedDraftCount = drafts.filter(d => d.selected).length;
  const allDraftsSelected = drafts.length > 0 && drafts.every(d => d.selected);

  const renderTaskItem = ({ item }: { item: TaskData }) => (
    <TaskCell
      task={item}
      showTime={currentView === TaskView.Focus}
      onPress={() => handleTaskPress(item)}
      onSwipeRight={() => handleTaskSwipeRight(item)}
      onSwipeLeft={() => handleTaskSwipeLeft(item)}
    />
  );

  const renderDraftSection = () => {
    if (drafts.length === 0 || currentView !== TaskView.Focus) return null;

    return (
      <View style={[styles.draftSection, { backgroundColor: theme.colors.accent.primary + '10', marginBottom: theme.spacing.s }]}>
        <TouchableOpacity
          style={[styles.draftHeader, { paddingHorizontal: theme.spacing.l, paddingVertical: theme.spacing.m }]}
          onPress={toggleExpanded}
          activeOpacity={0.7}
        >
          <Text style={[styles.draftTitle, { color: theme.colors.accent.primary, fontSize: theme.fontSize.m }]}>⏳ 待确认 ({drafts.length})</Text>
          <Text style={[styles.expandIcon, { color: theme.colors.accent.primary, fontSize: theme.fontSize.xs }]}>{isExpanded ? '▼' : '▶'}</Text>
        </TouchableOpacity>
        
        {isExpanded && (
          <View style={[styles.draftList, { paddingBottom: theme.spacing.s }]}>
            {drafts.slice(0, 10).map((draft) => (
              <View key={draft.id} style={styles.draftItem}>
                <View style={[styles.draftOperationIcon, { width: theme.sizing.icon.m, marginLeft: theme.spacing.l, marginRight: theme.spacing.xs }]}>
                  {draft.operation === 'add' && <Text style={[styles.addIcon, { color: theme.colors.accent.primary, fontSize: theme.fontSize.m }]}>➕</Text>}
                  {draft.operation === 'update' && <Text style={[styles.updateIcon, { color: theme.colors.feedback.warning, fontSize: theme.fontSize.m }]}>✏️</Text>}
                  {draft.operation === 'complete' && <Text style={[styles.completeIcon, { color: theme.colors.feedback.success, fontSize: theme.fontSize.m }]}>✅</Text>}
                  {draft.operation === 'delete' && <Text style={[styles.deleteIcon, { color: theme.colors.feedback.danger, fontSize: theme.fontSize.m }]}>🗑</Text>}
                </View>
                <TouchableOpacity
                  style={[styles.draftCheckbox, { borderColor: theme.colors.accent.primary, width: theme.sizing.icon.m, height: theme.sizing.icon.m, borderRadius: theme.radius.s, marginLeft: theme.spacing.xs, marginRight: theme.spacing.s }]}
                  onPress={() => toggleDraftSelection(draft.id)}
                >
                  {draft.selected && <Text style={[styles.checkmark, { color: theme.colors.accent.primary, fontSize: theme.fontSize.m }]}>✓</Text>}
                </TouchableOpacity>
                <TaskCell
                  task={draft}
                  isDraft
                  showTime
                  onSwipeRight={() => confirmSingleDraft(draft.id)}
                />
              </View>
            ))}
            {drafts.length > 10 && (
              <Text style={[styles.truncatedText, { color: theme.colors.text.muted, fontSize: theme.fontSize.s, paddingVertical: theme.spacing.s }]}>仅显示前10条...</Text>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.bg.surface }]} edges={['top']}>
      <StatusBar style="dark" />
      
      <View style={[styles.header, { paddingVertical: theme.spacing.s }]}>
        <View style={[styles.headerTop, { paddingHorizontal: theme.spacing.l }]}>
          <View style={[styles.headerPlaceholder, { width: theme.sizing.control.m }]} />
          <TaskTabs
            currentView={currentView}
            onViewChange={setCurrentView}
            focusCount={getFocusTasks().length}
            backlogCount={getBacklogTasks().length}
            doneCount={getDoneTasks().length}
          />
          <TouchableOpacity
            style={[styles.settingsButton, { width: theme.sizing.control.m, height: theme.sizing.control.m }]}
            onPress={() => router.push('/settings')}
            activeOpacity={0.7}
          >
            <Text style={[styles.settingsIcon, { fontSize: theme.fontSize.xl }]}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={currentTasks}
        renderItem={renderTaskItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderDraftSection}
        ListEmptyComponent={<EmptyState view={currentView} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: 100 },
          currentTasks.length === 0 && styles.emptyListContent,
        ]}
      />

      <View style={[styles.bottomButtons, { bottom: theme.spacing.xl, gap: theme.spacing.xl }]}>
        <VoiceButton 
          disabled={!voiceAvailable} 
          onRecordingComplete={handleVoiceRecordingComplete}
        />
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.colors.feedback.success, shadowColor: theme.isDark ? theme.colors.text.primary : '#000', width: theme.sizing.fab, height: theme.sizing.fab, borderRadius: theme.sizing.fab / 2 }]}
          onPress={handleNewTask}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: theme.fontSize.xl, color: theme.colors.text.inverse }}>➕</Text>
        </TouchableOpacity>
      </View>

      <FloatingBar
        visible={drafts.length > 0 && isExpanded}
        selectedCount={selectedDraftCount}
        totalCount={drafts.length}
        allSelected={allDraftsSelected}
        onToggleAll={toggleAllSelection}
        onConfirm={handleConfirmDrafts}
      />

      <Snackbar
        visible={snackbar.visible}
        message={snackbar.message}
        actionText={snackbar.actionText}
        onActionPress={handleUndoSnackbar}
        onDismiss={() => setSnackbar({ ...snackbar, visible: false })}
      />

      <TaskDetailSheet
        ref={taskDetailRef}
        task={selectedTask}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
      />

      <MoreActionSheet
        ref={moreActionRef}
        onPostpone={handlePostpone}
        onPin={currentView === TaskView.Focus ? handlePin : undefined}
        onDelete={() => handleDeleteTask()}
        showPin={currentView === TaskView.Focus}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerPlaceholder: {
  },
  settingsButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsIcon: {
  },
  listContent: {
  },
  emptyListContent: {
    flex: 1,
  },
  draftSection: {
  },
  draftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  draftTitle: {
    fontWeight: '500',
  },
  expandIcon: {
  },
  draftList: {
  },
  draftItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  draftOperationIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIcon: {
  },
  updateIcon: {
  },
  completeIcon: {
  },
  deleteIcon: {
  },
  draftCheckbox: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    fontWeight: 'bold',
  },
  truncatedText: {
    textAlign: 'center',
  },
  bottomButtons: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});