import React, { forwardRef, useRef, useImperativeHandle } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import BottomSheet from './BottomSheet';
import { Text } from '@ui';
import { useThemeValues } from '@lib/theme/ThemeProvider';

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
    const theme = useThemeValues();
    const bottomSheetRef = useRef<BottomSheetModal>(null);

    useImperativeHandle(ref, () => ({
      present: () => {
        console.log('MoreActionSheet present called');
        bottomSheetRef.current?.present();
        // Try snapping to index 0 after presenting
        setTimeout(() => {
          bottomSheetRef.current?.snapToIndex(0);
        }, 100);
      },
      dismiss: () => {
        bottomSheetRef.current?.dismiss();
      },
    }));

    const handleAction = (action: () => void) => {
      action();
      bottomSheetRef.current?.dismiss();
    };

    // Action row component for reusability
    const ActionRow = ({ 
      icon, 
      text, 
      onPress, 
      danger = false 
    }: { 
      icon: string; 
      text: string; 
      onPress: () => void; 
      danger?: boolean;
    }) => (
      <TouchableOpacity
        style={[
          styles.actionButton,
          {
            paddingVertical: theme.spacing.m,
            paddingHorizontal: theme.spacing.xs,
          }
        ]}
        onPress={onPress}
      >
        <Text style={styles.actionIcon}>{icon}</Text>
        <Text 
          variant="body" 
          color={danger ? 'danger' : 'primary'}
        >
          {text}
        </Text>
      </TouchableOpacity>
    );

    const Divider = () => (
      <View style={{
        height: StyleSheet.hairlineWidth,
        backgroundColor: theme.colors.border.default,
        marginVertical: theme.spacing.s,
      }} />
    );

    return (
      <BottomSheet
        ref={bottomSheetRef}
        snapPoints={['50%']}  // Back to what was working
        enablePanDownToClose={true}
      >
        <View style={[styles.container, {
          paddingHorizontal: theme.spacingGroups.padding.sheet,
          paddingTop: theme.spacing.m,
          paddingBottom: theme.spacing.xl,
        }]}>
          <Text 
            variant="heading" 
            align="center"
            style={{ 
              marginTop: theme.spacing.l,
              marginBottom: theme.spacing.xl,
            }}
          >
            选择操作
          </Text>

          <View style={{ marginBottom: theme.spacing.m }}>
            <Text 
              variant="caption" 
              color="secondary"
              style={{ 
                marginBottom: theme.spacing.s,
                marginLeft: theme.spacing.xs,
              }}
            >
              延后至
            </Text>
            
            <ActionRow
              icon="🌙"
              text="今晚"
              onPress={() => handleAction(() => onPostpone('tonight'))}
            />
            <ActionRow
              icon="☀️"
              text="明天"
              onPress={() => handleAction(() => onPostpone('tomorrow'))}
            />
            <ActionRow
              icon="📅"
              text="本周末"
              onPress={() => handleAction(() => onPostpone('weekend'))}
            />
            <ActionRow
              icon="🗓"
              text="自定义"
              onPress={() => handleAction(() => onPostpone('custom'))}
            />
          </View>

          <Divider />

          {showPin && onPin && (
            <>
              <ActionRow
                icon="📌"
                text="置顶"
                onPress={() => handleAction(onPin)}
              />
              <Divider />
            </>
          )}

          <View style={{ marginTop: theme.spacing.s }}>
            <ActionRow
              icon="🗑"
              text="删除"
              onPress={() => handleAction(onDelete)}
              danger
            />
          </View>
        </View>
      </BottomSheet>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    // Dynamic styles moved to inline
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 24,
    textAlign: 'center',
  },
});

export default MoreActionSheet;