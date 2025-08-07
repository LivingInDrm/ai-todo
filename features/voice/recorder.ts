import { Audio } from 'expo-av';

class AudioRecorder {
  private recording: Audio.Recording | null = null;
  private isRecording = false;

  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Failed to request audio permissions:', error);
      return false;
    }
  }

  async startRecording(): Promise<void> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error('Audio recording permission not granted');
      }

      // Configure audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        interruptionModeIOS: 1, // InterruptionModeIOS.DoNotMix
        interruptionModeAndroid: 1, // InterruptionModeAndroid.DoNotMix
      });

      // Create and start recording
      const { recording } = await Audio.Recording.createAsync(
        {
          android: {
            extension: '.m4a',
            outputFormat: 2, // MPEG_4
            audioEncoder: 3, // AAC
            sampleRate: 16000, // 16kHz for Whisper
            numberOfChannels: 1, // Mono
            bitRate: 128000,
          },
          ios: {
            extension: '.m4a',
            audioQuality: 127, // MAX
            sampleRate: 16000, // 16kHz for Whisper
            numberOfChannels: 1, // Mono
            bitRate: 128000,
            linearPCMBitDepth: 16,
            linearPCMIsBigEndian: false,
            linearPCMIsFloat: false,
          },
          web: {
            mimeType: 'audio/webm',
            bitsPerSecond: 128000,
          },
        }
      );

      this.recording = recording;
      this.isRecording = true;
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }

  async stopRecording(): Promise<string | null> {
    if (!this.recording) {
      console.warn('No recording in progress');
      return null;
    }

    try {
      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      
      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      this.recording = null;
      this.isRecording = false;

      return uri;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      this.recording = null;
      this.isRecording = false;
      throw error;
    }
  }

  async cancelRecording(): Promise<void> {
    if (!this.recording) return;

    try {
      await this.recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });
    } catch (error) {
      console.error('Failed to cancel recording:', error);
    } finally {
      this.recording = null;
      this.isRecording = false;
    }
  }

  getIsRecording(): boolean {
    return this.isRecording;
  }

  async getRecordingDuration(): Promise<number> {
    if (!this.recording) return 0;

    try {
      const status = await this.recording.getStatusAsync();
      return status.durationMillis || 0;
    } catch (error) {
      console.error('Failed to get recording duration:', error);
      return 0;
    }
  }
}

export default new AudioRecorder();