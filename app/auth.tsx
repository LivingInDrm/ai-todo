import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../features/auth/authStore';
import { useTheme } from '../lib/theme/ThemeProvider';

export default function AuthScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { 
    signIn, 
    signUp, 
    signInWithMagicLink,
    verifyOtp,
    isLoading, 
    error, 
    clearError 
  } = useAuthStore();
  
  // Auth mode: 'magic' | 'password'
  const [authMode, setAuthMode] = useState<'magic' | 'password'>('magic');
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  
  const handleMagicLinkSubmit = async () => {
    clearError();
    
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }
    
    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }
    
    try {
      await signInWithMagicLink(email);
      setMagicLinkSent(true);
      setShowOtpInput(true);
      Alert.alert(
        'Check Your Email',
        'We sent you a login link. Check your email and click the link or enter the code below.',
        [{ text: 'OK' }]
      );
    } catch (err) {
      console.error('Magic link error:', err);
    }
  };
  
  const handleOtpVerification = async () => {
    clearError();
    
    if (!otpCode || otpCode.length < 6) {
      Alert.alert('Error', 'Please enter the 6-digit code from your email');
      return;
    }
    
    try {
      await verifyOtp(email, otpCode);
      router.replace('/task-list');
    } catch (err) {
      console.error('OTP verification error:', err);
    }
  };
  
  const handlePasswordSubmit = async () => {
    clearError();
    
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    
    if (isSignUp && password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    
    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }
    
    try {
      if (isSignUp) {
        await signUp(email, password);
        Alert.alert(
          'Success',
          'Account created! Please check your email to confirm your account.',
          [{ text: 'OK', onPress: () => setIsSignUp(false) }]
        );
      } else {
        await signIn(email, password);
        router.replace('/task-list');
      }
    } catch (err) {
      console.error('Auth error:', err);
    }
  };
  
  const handleOfflineMode = () => {
    router.replace('/task-list');
  };
  
  const resetAuthState = () => {
    setShowOtpInput(false);
    setMagicLinkSent(false);
    setOtpCode('');
    setPassword('');
    setConfirmPassword('');
    clearError();
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.bg.surface }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.text.primary }]}>AI Todo</Text>
            <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
              {authMode === 'magic' 
                ? 'Sign in with email link'
                : (isSignUp ? 'Create your account' : 'Welcome back')}
            </Text>
          </View>
          
          {/* Auth Mode Selector */}
          <View style={[styles.authModeSelector, { backgroundColor: theme.colors.bg.subtle }]}>
            <TouchableOpacity
              style={[
                styles.authModeButton,
                authMode === 'magic' && [styles.authModeButtonActive, { backgroundColor: theme.colors.bg.surface }]
              ]}
              onPress={() => {
                setAuthMode('magic');
                resetAuthState();
              }}
              disabled={isLoading}
            >
              <Text style={[
                styles.authModeText,
                { color: theme.colors.text.secondary },
                authMode === 'magic' && [styles.authModeTextActive, { color: theme.colors.accent.primary }]
              ]}>
                Email Link
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.authModeButton,
                authMode === 'password' && [styles.authModeButtonActive, { backgroundColor: theme.colors.bg.surface }]
              ]}
              onPress={() => {
                setAuthMode('password');
                resetAuthState();
              }}
              disabled={isLoading}
            >
              <Text style={[
                styles.authModeText,
                { color: theme.colors.text.secondary },
                authMode === 'password' && [styles.authModeTextActive, { color: theme.colors.accent.primary }]
              ]}>
                Password
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.form}>
            {/* Magic Link Mode */}
            {authMode === 'magic' && (
              <>
                {!showOtpInput ? (
                  <>
                    <TextInput
                      style={[styles.input, { 
                        borderColor: theme.colors.border.default,
                        color: theme.colors.text.primary,
                        backgroundColor: theme.colors.bg.subtle
                      }]}
                      placeholder="Email"
                      placeholderTextColor={theme.colors.text.muted}
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      editable={!isLoading}
                    />
                    
                    <TouchableOpacity
                      style={[styles.button, styles.primaryButton, { backgroundColor: theme.colors.accent.primary }, isLoading && styles.disabledButton]}
                      onPress={handleMagicLinkSubmit}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <ActivityIndicator color={theme.colors.text.inverse} />
                      ) : (
                        <Text style={[styles.buttonText, { color: theme.colors.text.inverse }]}>
                          Send Login Link
                        </Text>
                      )}
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={[styles.instructionText, { color: theme.colors.text.secondary }]}>
                      Enter the 6-digit code from your email
                    </Text>
                    
                    <TextInput
                      style={[styles.input, { 
                        borderColor: theme.colors.border.default,
                        color: theme.colors.text.primary,
                        backgroundColor: theme.colors.bg.subtle
                      }]}
                      placeholder="000000"
                      placeholderTextColor={theme.colors.text.muted}
                      value={otpCode}
                      onChangeText={setOtpCode}
                      keyboardType="number-pad"
                      maxLength={6}
                      editable={!isLoading}
                    />
                    
                    <TouchableOpacity
                      style={[styles.button, styles.primaryButton, { backgroundColor: theme.colors.accent.primary }, isLoading && styles.disabledButton]}
                      onPress={handleOtpVerification}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <ActivityIndicator color={theme.colors.text.inverse} />
                      ) : (
                        <Text style={[styles.buttonText, { color: theme.colors.text.inverse }]}>
                          Verify Code
                        </Text>
                      )}
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.switchButton}
                      onPress={() => {
                        setShowOtpInput(false);
                        setMagicLinkSent(false);
                        setOtpCode('');
                      }}
                      disabled={isLoading}
                    >
                      <Text style={[styles.switchText, { color: theme.colors.accent.primary }]}>
                        Send a new code
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </>
            )}
            
            {/* Password Mode */}
            {authMode === 'password' && (
              <>
                <TextInput
                  style={[styles.input, { 
                    borderColor: theme.colors.border.default,
                    color: theme.colors.text.primary,
                    backgroundColor: theme.colors.bg.subtle
                  }]}
                  placeholder="Email"
                  placeholderTextColor={theme.colors.text.muted}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  editable={!isLoading}
                />
                
                <TextInput
                  style={[styles.input, { 
                    borderColor: theme.colors.border.default,
                    color: theme.colors.text.primary,
                    backgroundColor: theme.colors.bg.subtle
                  }]}
                  placeholder="Password"
                  placeholderTextColor={theme.colors.text.muted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  editable={!isLoading}
                />
                
                {isSignUp && (
                  <TextInput
                    style={[styles.input, { 
                      borderColor: theme.colors.border.default,
                      color: theme.colors.text.primary,
                      backgroundColor: theme.colors.bg.subtle
                    }]}
                    placeholder="Confirm Password"
                    placeholderTextColor={theme.colors.text.muted}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    editable={!isLoading}
                  />
                )}
                
                <TouchableOpacity
                  style={[styles.button, styles.primaryButton, { backgroundColor: theme.colors.accent.primary }, isLoading && styles.disabledButton]}
                  onPress={handlePasswordSubmit}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.buttonText}>
                      {isSignUp ? 'Sign Up' : 'Sign In'}
                    </Text>
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.switchButton}
                  onPress={() => {
                    setIsSignUp(!isSignUp);
                    clearError();
                    setConfirmPassword('');
                  }}
                  disabled={isLoading}
                >
                  <Text style={styles.switchText}>
                    {isSignUp
                      ? 'Already have an account? Sign In'
                      : "Don't have an account? Sign Up"}
                  </Text>
                </TouchableOpacity>
              </>
            )}
            
            {error && (
              <Text style={[styles.errorText, { color: theme.colors.feedback.danger }]}>{error}</Text>
            )}
          </View>
          
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: theme.colors.border.default }]} />
            <Text style={[styles.dividerText, { color: theme.colors.text.muted }]}>OR</Text>
            <View style={[styles.dividerLine, { backgroundColor: theme.colors.border.default }]} />
          </View>
          
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton, { backgroundColor: theme.colors.bg.subtle }]}
            onPress={handleOfflineMode}
            disabled={isLoading}
          >
            <Text style={[styles.secondaryButtonText, { color: theme.colors.text.primary }]}>Continue Offline</Text>
          </TouchableOpacity>
          
          <Text style={[styles.offlineNote, { color: theme.colors.text.muted }]}>
            You can use the app offline, but your tasks won't sync across devices
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  authModeSelector: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 4,
    marginBottom: 24,
  },
  authModeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  authModeButtonActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  authModeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  authModeTextActive: {
    fontWeight: '600',
  },
  form: {
    marginBottom: 24,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  button: {
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  primaryButton: {
  },
  secondaryButton: {
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  switchButton: {
    alignItems: 'center',
  },
  switchText: {
    fontSize: 14,
  },
  instructionText: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
  },
  offlineNote: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
});