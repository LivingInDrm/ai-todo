import React, { forwardRef, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import BottomSheetLib, {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetModalProvider,
} from '@gorhom/bottom-sheet';
import { Text } from '@ui';
import { useThemeValues } from '@lib/theme/ThemeProvider';
import { useScreenSize } from '@lib/theme/responsive';

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
      snapPoints,
      onClose,
      enablePanDownToClose = true,
      title,
    },
    ref
  ) => {
    const theme = useThemeValues();
    const screenSize = useScreenSize();
    const { height: screenHeight } = Dimensions.get('window');
    
    // Responsive snap points based on screen size
    const responsiveSnapPoints = useMemo(() => {
      if (snapPoints) return snapPoints;
      
      switch (screenSize) {
        case 'compact':
          return ['65%', Math.min(420, screenHeight * 0.8)];
        case 'regular':
          return ['60%', 480];
        case 'wide':
          return ['50%', 560];
        default:
          return ['60%', 480];
      }
    }, [snapPoints, screenSize, screenHeight]);
    
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
        snapPoints={responsiveSnapPoints}
        backdropComponent={renderBackdrop}
        enablePanDownToClose={enablePanDownToClose}
        onChange={handleSheetChanges}
        topInset={0}
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
                <Text variant="body" color="secondary" style={{ fontSize: theme.fontSize.l }}>
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
  // Note: avoid styling the modal container to prevent layout side-effects
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