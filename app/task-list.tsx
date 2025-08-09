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

export default function TaskListScreen() {
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
      <View style={styles.draftSection}>
        <TouchableOpacity
          style={styles.draftHeader}
          onPress={toggleExpanded}
          activeOpacity={0.7}
        >
          <Text style={styles.draftTitle}>⏳ 待确认 ({drafts.length})</Text>
          <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
        </TouchableOpacity>
        
        {isExpanded && (
          <View style={styles.draftList}>
            {drafts.slice(0, 10).map((draft) => (
              <View key={draft.id} style={styles.draftItem}>
                <View style={styles.draftOperationIcon}>
                  {draft.operation === 'add' && <Text style={styles.addIcon}>➕</Text>}
                  {draft.operation === 'update' && <Text style={styles.updateIcon}>✏️</Text>}
                  {draft.operation === 'complete' && <Text style={styles.completeIcon}>✅</Text>}
                  {draft.operation === 'delete' && <Text style={styles.deleteIcon}>🗑</Text>}
                </View>
                <TouchableOpacity
                  style={styles.draftCheckbox}
                  onPress={() => toggleDraftSelection(draft.id)}
                >
                  {draft.selected && <Text style={styles.checkmark}>✓</Text>}
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
              <Text style={styles.truncatedText}>仅显示前10条...</Text>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerPlaceholder} />
          <TaskTabs
            currentView={currentView}
            onViewChange={setCurrentView}
            focusCount={getFocusTasks().length}
            backlogCount={getBacklogTasks().length}
            doneCount={getDoneTasks().length}
          />
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => router.push('/settings')}
            activeOpacity={0.7}
          >
            <Text style={styles.settingsIcon}>⚙️</Text>
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
          currentTasks.length === 0 && styles.emptyListContent,
        ]}
      />

      <View style={styles.bottomButtons}>
        <VoiceButton 
          disabled={!voiceAvailable} 
          onRecordingComplete={handleVoiceRecordingComplete}
        />
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleNewTask}
          activeOpacity={0.7}
        >
          <Text style={styles.addIcon}>➕</Text>
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
    backgroundColor: '#fff',
  },
  header: {
    paddingVertical: 8,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerPlaceholder: {
    width: 40,
  },
  settingsButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsIcon: {
    fontSize: 24,
  },
  listContent: {
    paddingBottom: 100,
  },
  emptyListContent: {
    flex: 1,
  },
  draftSection: {
    backgroundColor: '#F0F8FF',
    marginBottom: 8,
  },
  draftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  draftTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
  },
  expandIcon: {
    fontSize: 12,
    color: '#007AFF',
  },
  draftList: {
    paddingBottom: 8,
  },
  draftItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  draftOperationIcon: {
    width: 24,
    marginLeft: 16,
    marginRight: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIcon: {
    fontSize: 16,
    color: '#007AFF',
  },
  updateIcon: {
    fontSize: 16,
    color: '#FF9500',
  },
  completeIcon: {
    fontSize: 16,
    color: '#34C759',
  },
  deleteIcon: {
    fontSize: 16,
    color: '#FF3B30',
  },
  draftCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#007AFF',
    marginLeft: 4,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  truncatedText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    paddingVertical: 8,
  },
  bottomButtons: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#34C759',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});