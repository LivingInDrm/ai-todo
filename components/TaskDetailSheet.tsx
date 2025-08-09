import React, { useState, useRef, useImperativeHandle, forwardRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import BottomSheet from './BottomSheet';
import DateTimeButton from './DateTimeButton';
import { TaskData } from '../lib/types';
import { debounce } from 'lodash';

interface TaskDetailSheetProps {
  task?: TaskData;
  onSave: (task: Partial<TaskData>) => void;
  onDelete?: (taskId: string) => void;
}

export interface TaskDetailSheetRef {
  present: (task?: TaskData) => void;
  dismiss: () => void;
}

const TaskDetailSheet = forwardRef<TaskDetailSheetRef, TaskDetailSheetProps>(
  ({ task, onSave, onDelete }, ref) => {
    const bottomSheetRef = useRef<BottomSheetModal>(null);
    const [title, setTitle] = useState('');
    const [dueDate, setDueDate] = useState<Date | undefined>();
    const [isUrgent, setIsUrgent] = useState(false);
    const [currentTask, setCurrentTask] = useState<TaskData | undefined>();
    const [isNewTask, setIsNewTask] = useState(false);
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const isDeleting = useRef(false);

    // Create debounced auto-save function (400ms delay)
    const debouncedAutoSave = useCallback(
      debounce((taskTitle: string, taskDueDate: Date | undefined, taskUrgent: boolean, task?: TaskData) => {
        // Only auto-save for existing tasks, not new ones
        if (!taskTitle.trim() || !task) return;
        
        const taskData: Partial<TaskData> = {
          id: task.id,
          title: taskTitle.trim(),
          dueTs: taskDueDate?.getTime(),
          urgent: taskUrgent,
        };
        
        onSave(taskData);
      }, 400),
      [onSave]
    );

    useImperativeHandle(ref, () => ({
      present: (task?: TaskData) => {
        console.log('TaskDetailSheet present called with task:', task);
        // Reset state for new or existing task
        setCurrentTask(task);
        setIsNewTask(!task); // Mark as new task if no task provided
        setTitle(task?.title || '');
        setDueDate(task?.dueTs ? new Date(task.dueTs) : undefined);
        setIsUrgent(task?.urgent || false);
        
        // Call present directly
        bottomSheetRef.current?.present();
      },
      dismiss: () => {
        // Force save before dismissing
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        debouncedAutoSave.cancel();
        handleSave();
        bottomSheetRef.current?.dismiss();
      },
    }));

    // Auto-save when title changes (only for existing tasks)
    useEffect(() => {
      if (currentTask && !isNewTask && title.trim()) {
        debouncedAutoSave(title, dueDate, isUrgent, currentTask);
      }
    }, [title, currentTask, dueDate, isUrgent, debouncedAutoSave, isNewTask]);

    // Auto-save when date or urgent changes (only for existing tasks)
    useEffect(() => {
      if (currentTask && !isNewTask && title.trim()) {
        debouncedAutoSave(title, dueDate, isUrgent, currentTask);
      }
    }, [dueDate, isUrgent]);

    const handleSave = () => {
      if (!title.trim()) {
        return;
      }

      const taskData: Partial<TaskData> = {
        title: title.trim(),
        dueTs: dueDate?.getTime(),
        urgent: isUrgent,
      };

      // Include ID only for existing tasks
      if (currentTask && !isNewTask) {
        taskData.id = currentTask.id;
      }

      onSave(taskData);
      
      // Reset new task flag after saving
      if (isNewTask) {
        setIsNewTask(false);
      }
    };

    const handleClose = () => {
      // Cancel pending auto-save and force immediate save
      debouncedAutoSave.cancel();
      // Skip save if we're deleting the task
      if (!isDeleting.current) {
        handleSave();
      }
      // Reset the deleting flag
      isDeleting.current = false;
    };

    const toggleUrgent = () => {
      setIsUrgent(!isUrgent);
    };

    // Clean up on unmount
    useEffect(() => {
      return () => {
        debouncedAutoSave.cancel();
      };
    }, [debouncedAutoSave]);

    return (
      <BottomSheet
        ref={bottomSheetRef}
        snapPoints={[400, 600]}  // Use fixed pixel values instead of percentages
        onClose={handleClose}
        enablePanDownToClose={true}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          <ScrollView 
            style={styles.container}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.header}>
              <TouchableOpacity
                onPress={() => bottomSheetRef.current?.dismiss()}
                style={styles.closeButton}
              >
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.titleInput}
              placeholder="添加任务..."
              value={title}
              onChangeText={setTitle}
              multiline
              numberOfLines={2}
              autoFocus
              returnKeyType="done"
              blurOnSubmit={true}
            />

            <View style={styles.controls}>
              <DateTimeButton
                value={dueDate}
                onChange={setDueDate}
                mode="datetime"
              />

              <TouchableOpacity
                style={[
                  styles.urgentButton,
                  isUrgent && styles.urgentButtonActive,
                ]}
                onPress={toggleUrgent}
                activeOpacity={0.7}
              >
                <Text style={styles.urgentIcon}>❗️</Text>
                <Text
                  style={[
                    styles.urgentText,
                    isUrgent && styles.urgentTextActive,
                  ]}
                >
                  {isUrgent ? '紧急' : '标记紧急'}
                </Text>
              </TouchableOpacity>
            </View>

            {currentTask && !isNewTask && onDelete && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => {
                  isDeleting.current = true;
                  onDelete(currentTask.id);
                  bottomSheetRef.current?.dismiss();
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.deleteText}>删除任务</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </BottomSheet>
    );
  }
);

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 20,
  },
  closeButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 20,
    color: '#8E8E93',
  },
  titleInput: {
    fontSize: 18,
    color: '#000',
    minHeight: 60,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    marginBottom: 20,
  },
  controls: {
    marginTop: 10,
  },
  urgentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
  },
  urgentButtonActive: {
    backgroundColor: '#FFEBE5',
  },
  urgentIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  urgentText: {
    fontSize: 16,
    color: '#000',
  },
  urgentTextActive: {
    color: '#FF3B30',
    fontWeight: '500',
  },
  deleteButton: {
    marginTop: 30,
    paddingVertical: 12,
    alignItems: 'center',
  },
  deleteText: {
    fontSize: 16,
    color: '#FF3B30',
  },
});

export default TaskDetailSheet;