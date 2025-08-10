import React, { useState, useRef, useEffect } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  Animated,
  View,
  Alert,
} from 'react-native';
import recorder from '../features/voice/recorder';
import { Text } from '@ui';
import { useThemeValues } from '@lib/theme/ThemeProvider';
import { lightTheme as defaultTheme } from '@lib/theme';

interface VoiceButtonProps {
  onRecordingComplete?: (audioUri: string) => void;
  disabled?: boolean;
}

const VoiceButton: React.FC<VoiceButtonProps> = ({
  onRecordingComplete,
  disabled = false,
}) => {
  const theme = useThemeValues();
  const [isRecording, setIsRecording] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const recordingTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
      }
      if (recorder.getIsRecording()) {
        recorder.cancelRecording();
      }
    };
  }, []);

  const handlePressIn = async () => {
    if (disabled) return;
    
    try {
      await recorder.startRecording();
      setIsRecording(true);
      
      Animated.spring(scaleAnim, {
        toValue: 1.2,
        tension: 50,
        friction: 3,
        useNativeDriver: true,
      }).start();
      
      // Set max recording duration to 60 seconds
      recordingTimeoutRef.current = setTimeout(async () => {
        await handlePressOut();
      }, 60000);
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('录音失败', '无法启动录音，请检查麦克风权限');
    }
  };

  const handlePressOut = async () => {
    if (!isRecording) return;
    
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
    }
    
    setIsRecording(false);
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 3,
      useNativeDriver: true,
    }).start();
    
    try {
      const audioUri = await recorder.stopRecording();
      if (audioUri && onRecordingComplete) {
        onRecordingComplete(audioUri);
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('录音失败', '无法保存录音');
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.button,
          {
            backgroundColor: disabled 
              ? theme.colors.border.subtle 
              : isRecording 
                ? theme.colors.feedback.danger 
                : theme.colors.accent.primary,
            ...theme.elevationPresets.floatingButton,
            opacity: disabled ? 0.5 : 1,
          }
        ]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        activeOpacity={0.8}
      >
        <Text style={styles.icon}>🎤</Text>
      </TouchableOpacity>
      {isRecording && (
        <View style={[
          styles.recordingIndicator,
          {
            backgroundColor: theme.colors.feedback.danger,
          }
        ]}>
          <View style={[
            styles.recordingDot,
            {
              backgroundColor: theme.colors.text.inverse,
            }
          ]} />
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    width: defaultTheme.sizing.fab,
    height: defaultTheme.sizing.fab,
    borderRadius: defaultTheme.sizing.fab / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: defaultTheme.fontSize.xl,
  },
  recordingIndicator: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: defaultTheme.spacing.l,
    height: defaultTheme.spacing.l,
    borderRadius: defaultTheme.spacing.l / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingDot: {
    width: defaultTheme.spacing.s,
    height: defaultTheme.spacing.s,
    borderRadius: defaultTheme.spacing.s / 2,
  },
});

export default VoiceButton;