import React, { useState, useRef, useImperativeHandle, forwardRef, useEffect, useCallback } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import BottomSheet from './BottomSheet';
import DateTimeButton from './DateTimeButton';
import { TaskData } from '../lib/types';
import { debounce } from 'lodash';
import { Text, Button } from '@ui';
import { useThemeValues } from '@lib/theme/ThemeProvider';
import { lightTheme as defaultTheme } from '@lib/theme';

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
    const theme = useThemeValues();
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
        snapPoints={undefined} // Use responsive defaults
        onClose={handleClose}
        enablePanDownToClose={true}
      >
        <BottomSheetScrollView 
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingHorizontal: theme.spacingGroups.padding.sheet,
              paddingTop: theme.spacing.xl,
              paddingBottom: theme.spacing.xl * 5, // Extra padding for keyboard
            }
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
            <TextInput
              style={[
                styles.titleInput,
                {
                  fontSize: theme.fontSize.l,
                  color: theme.colors.text.primary,
                  paddingVertical: theme.spacing.m,
                  paddingHorizontal: theme.spacing.l,
                  backgroundColor: theme.colors.bg.subtle,
                  borderRadius: theme.radius.m,
                  marginBottom: theme.spacing.xl,
                }
              ]}
              placeholder="添加任务..."
              placeholderTextColor={theme.colors.text.muted}
              value={title}
              onChangeText={setTitle}
              multiline
              numberOfLines={2}
              autoFocus
              returnKeyType="done"
            />

            <View style={{ marginTop: theme.spacing.m }}>
              <DateTimeButton
                value={dueDate}
                onChange={setDueDate}
                mode="datetime"
              />

              <TouchableOpacity
                style={[
                  styles.urgentButton,
                  {
                    backgroundColor: theme.colors.bg.subtle,
                    borderWidth: isUrgent ? 2 : 0,
                    borderColor: isUrgent ? theme.colors.feedback.danger : undefined,
                    borderRadius: theme.radius.m,
                    paddingHorizontal: theme.spacing.m,
                    paddingVertical: theme.spacing.m,
                    marginTop: theme.spacing.s,
                  }
                ]}
                onPress={toggleUrgent}
                activeOpacity={0.7}
              >
                <Text style={styles.urgentIcon}>❗️</Text>
                <Text
                  variant="body"
                  color={isUrgent ? 'danger' : 'primary'}
                  style={{ fontWeight: isUrgent ? theme.fontWeight.medium : theme.fontWeight.regular }}
                >
                  {isUrgent ? '紧急' : '标记紧急'}
                </Text>
              </TouchableOpacity>
            </View>

            {currentTask && !isNewTask && onDelete && (
              <View style={{ marginTop: theme.spacing.xl * 2 }}>
                <Button
                  variant="danger"
                  onPress={() => {
                    isDeleting.current = true;
                    onDelete(currentTask.id);
                    bottomSheetRef.current?.dismiss();
                  }}
                  fullWidth
                >
                  删除任务
                </Button>
              </View>
            )}
          </BottomSheetScrollView>
      </BottomSheet>
    );
  }
);

const styles = StyleSheet.create({
  scrollContent: {
    // Styles are applied inline for responsiveness
  },
  titleInput: {
    minHeight: defaultTheme.sizing.minCellHeight,
  },
  urgentButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  urgentIcon: {
    fontSize: defaultTheme.fontSize.m,
    marginRight: defaultTheme.spacing.s,
  },
});

export default TaskDetailSheet;