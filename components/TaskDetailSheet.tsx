import React, { useState, useRef, useImperativeHandle, forwardRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import BottomSheet from './BottomSheet';
import DateTimeButton from './DateTimeButton';
import { TaskData } from '../lib/types';

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

    useImperativeHandle(ref, () => ({
      present: (task?: TaskData) => {
        setCurrentTask(task);
        setTitle(task?.title || '');
        setDueDate(task?.dueTs ? new Date(task.dueTs) : undefined);
        setIsUrgent(task?.urgent || false);
        bottomSheetRef.current?.present();
      },
      dismiss: () => {
        bottomSheetRef.current?.dismiss();
      },
    }));

    const handleSave = () => {
      if (!title.trim()) {
        bottomSheetRef.current?.dismiss();
        return;
      }

      const taskData: Partial<TaskData> = {
        title: title.trim(),
        dueTs: dueDate?.getTime(),
        urgent: isUrgent,
      };

      if (currentTask) {
        taskData.id = currentTask.id;
      }

      onSave(taskData);
      bottomSheetRef.current?.dismiss();
    };

    const handleClose = () => {
      handleSave();
    };

    const toggleUrgent = () => {
      setIsUrgent(!isUrgent);
    };

    return (
      <BottomSheet
        ref={bottomSheetRef}
        snapPoints={['50%', '75%']}
        onClose={handleClose}
        enablePanDownToClose={true}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
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

          {currentTask && onDelete && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => {
                onDelete(currentTask.id);
                bottomSheetRef.current?.dismiss();
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.deleteText}>删除任务</Text>
            </TouchableOpacity>
          )}
        </KeyboardAvoidingView>
      </BottomSheet>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
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
    gap: 12,
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