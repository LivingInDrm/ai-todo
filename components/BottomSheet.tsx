import React, { forwardRef, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import BottomSheetLib, {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetModalProvider,
} from '@gorhom/bottom-sheet';
import { Text } from '@ui';
import { useThemeValues } from '@lib/theme/ThemeProvider';

interface BottomSheetProps {
  children: React.ReactNode;
  snapPoints?: (string | number)[];
  onClose?: () => void;
  enablePanDownToClose?: boolean;
  title?: string;
}

const BottomSheet = forwardRef<BottomSheetModal, BottomSheetProps>(
  (
    {
      children,
      snapPoints = [400, 600],  // Use fixed pixel values as default
      onClose,
      enablePanDownToClose = true,
      title,
    },
    ref
  ) => {
    const theme = useThemeValues();
    
    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.5}
        />
      ),
      []
    );

    const handleSheetChanges = useCallback(
      (index: number) => {
        if (index === -1 && onClose) {
          onClose();
        }
      },
      [onClose]
    );

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        enablePanDownToClose={enablePanDownToClose}
        onChange={handleSheetChanges}
        handleIndicatorStyle={{
          backgroundColor: theme.colors.border.default,
          width: 36,
          height: 5,
        }}
        backgroundStyle={{
          backgroundColor: theme.colors.bg.elevated,
          borderTopLeftRadius: theme.radiusPresets.sheet,
          borderTopRightRadius: theme.radiusPresets.sheet,
        }}
        android_keyboardInputMode="adjustResize"  // For Android keyboard handling
        enableDynamicSizing={false}  // Disable dynamic sizing
        keyboardBehavior="extend"  // Extend the sheet when keyboard appears
        keyboardBlurBehavior="restore"  // Restore position when keyboard dismisses
        detached={false}  // Ensure it's attached to the screen
        bottomInset={0}  // Reset bottom inset
        style={styles.modal}  // Add explicit styling
      >
        {title ? (
          <View style={styles.container}>
            <View style={[styles.header, {
              paddingHorizontal: theme.spacingGroups.padding.sheet,
              paddingVertical: theme.spacing.l,
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: theme.colors.border.subtle,
            }]}>
              <Text variant="heading" style={{ fontWeight: theme.fontWeight.semibold }}>
                {title}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  if (ref && 'current' in ref && ref.current) {
                    ref.current.dismiss();
                  }
                }}
                style={[styles.closeButton, {
                  width: theme.spacing.xl,
                  height: theme.spacing.xl,
                }]}
              >
                <Text variant="body" color="secondary" style={{ fontSize: 20 }}>
                  ✕
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.content}>{children}</View>
          </View>
        ) : (
          children
        )}
      </BottomSheetModal>
    );
  }
);

export const BottomSheetProvider = BottomSheetModalProvider;

const styles = StyleSheet.create({
  modal: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  container: {
    flex: 1,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
});

export default BottomSheet;