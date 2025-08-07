import React, { useState, useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  View,
} from 'react-native';

interface VoiceButtonProps {
  onRecordingComplete?: (audioUri: string) => void;
  disabled?: boolean;
}

const VoiceButton: React.FC<VoiceButtonProps> = ({
  onRecordingComplete,
  disabled = false,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled) return;
    
    setIsRecording(true);
    Animated.spring(scaleAnim, {
      toValue: 1.2,
      tension: 50,
      friction: 3,
      useNativeDriver: true,
    }).start();
    
    // TODO: Start recording with expo-av
  };

  const handlePressOut = () => {
    if (!isRecording) return;
    
    setIsRecording(false);
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 3,
      useNativeDriver: true,
    }).start();
    
    // TODO: Stop recording and process audio
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
          disabled && styles.buttonDisabled,
          isRecording && styles.buttonRecording,
        ]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        activeOpacity={0.8}
      >
        <Text style={styles.icon}>🎤</Text>
      </TouchableOpacity>
      {isRecording && (
        <View style={styles.recordingIndicator}>
          <View style={styles.recordingDot} />
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
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
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
  buttonDisabled: {
    backgroundColor: '#C7C7CC',
    opacity: 0.5,
  },
  buttonRecording: {
    backgroundColor: '#FF3B30',
  },
  icon: {
    fontSize: 24,
  },
  recordingIndicator: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
});

export default VoiceButton;