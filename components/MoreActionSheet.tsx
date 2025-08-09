import React, { forwardRef, useRef, useImperativeHandle } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import BottomSheet from './BottomSheet';

interface MoreActionSheetProps {
  onPostpone: (option: 'tonight' | 'tomorrow' | 'weekend' | 'custom') => void;
  onPin?: () => void;
  onDelete: () => void;
  showPin?: boolean;
}

export interface MoreActionSheetRef {
  present: () => void;
  dismiss: () => void;
}

const MoreActionSheet = forwardRef<MoreActionSheetRef, MoreActionSheetProps>(
  ({ onPostpone, onPin, onDelete, showPin = false }, ref) => {
    const bottomSheetRef = useRef<BottomSheetModal>(null);

    useImperativeHandle(ref, () => ({
      present: () => {
        bottomSheetRef.current?.present();
      },
      dismiss: () => {
        bottomSheetRef.current?.dismiss();
      },
    }));

    const handleAction = (action: () => void) => {
      action();
      bottomSheetRef.current?.dismiss();
    };

    return (
      <BottomSheet
        ref={bottomSheetRef}
        snapPoints={[350]}  // Use fixed pixel value
        enablePanDownToClose={true}
      >
        <View style={styles.container}>
          <Text style={styles.title}>选择操作</Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>延后至</Text>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleAction(() => onPostpone('tonight'))}
            >
              <Text style={styles.actionIcon}>🌙</Text>
              <Text style={styles.actionText}>今晚</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleAction(() => onPostpone('tomorrow'))}
            >
              <Text style={styles.actionIcon}>☀️</Text>
              <Text style={styles.actionText}>明天</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleAction(() => onPostpone('weekend'))}
            >
              <Text style={styles.actionIcon}>📅</Text>
              <Text style={styles.actionText}>本周末</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleAction(() => onPostpone('custom'))}
            >
              <Text style={styles.actionIcon}>🗓</Text>
              <Text style={styles.actionText}>自定义</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.separator} />

          {showPin && onPin && (
            <>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleAction(onPin)}
              >
                <Text style={styles.actionIcon}>📌</Text>
                <Text style={styles.actionText}>置顶</Text>
              </TouchableOpacity>
              <View style={styles.separator} />
            </>
          )}

          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleAction(onDelete)}
          >
            <Text style={styles.actionIcon}>🗑</Text>
            <Text style={[styles.actionText, styles.deleteText]}>删除</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 8,
    marginLeft: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  actionIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 24,
    textAlign: 'center',
  },
  actionText: {
    fontSize: 16,
    color: '#000',
  },
  deleteButton: {
    marginTop: 8,
  },
  deleteText: {
    color: '#FF3B30',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E5EA',
    marginVertical: 8,
  },
});

export default MoreActionSheet;