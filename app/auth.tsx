import React, { useState } from 'react';
import {
  View,
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
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../features/auth/authStore';
import { useTheme } from '../lib/theme/ThemeProvider';
import { lightTheme as defaultTheme } from '../lib/theme';
import { Text } from '@ui';

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
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text variant="title" style={styles.title}>AI Todo</Text>
            <Text variant="heading" color="secondary" style={styles.subtitle}>
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
              <Text 
                variant="body" 
                color={authMode === 'magic' ? 'link' : 'secondary'}
                style={[
                  styles.authModeText,
                  authMode === 'magic' && styles.authModeTextActive
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
              <Text 
                variant="body" 
                color={authMode === 'password' ? 'link' : 'secondary'}
                style={[
                  styles.authModeText,
                  authMode === 'password' && styles.authModeTextActive
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
                        <Text variant="body" color="inverse" style={styles.buttonText}>
                          Send Login Link
                        </Text>
                      )}
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text variant="caption" color="secondary" style={styles.instructionText}>
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
                        <Text variant="body" color="inverse" style={styles.buttonText}>
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
                      <Text variant="caption" color="link" style={styles.switchText}>
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
                    <ActivityIndicator color={theme.colors.text.inverse} />
                  ) : (
                    <Text variant="body" color="inverse" style={styles.buttonText}>
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
                  <Text variant="caption" color="secondary" style={styles.switchText}>
                    {isSignUp
                      ? 'Already have an account? Sign In'
                      : "Don't have an account? Sign Up"}
                  </Text>
                </TouchableOpacity>
              </>
            )}
            
            {error && (
              <Text variant="caption" color="danger" style={styles.errorText}>{error}</Text>
            )}
          </View>
          
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: theme.colors.border.default }]} />
            <Text variant="caption" color="muted" style={styles.dividerText}>OR</Text>
            <View style={[styles.dividerLine, { backgroundColor: theme.colors.border.default }]} />
          </View>
          
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton, { backgroundColor: theme.colors.bg.subtle }]}
            onPress={handleOfflineMode}
            disabled={isLoading}
          >
            <Text variant="body" color="primary" style={styles.secondaryButtonText}>Continue Offline</Text>
          </TouchableOpacity>
          
          <Text variant="caption" color="muted" style={styles.offlineNote}>
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
    paddingHorizontal: defaultTheme.spacing.xl,
    paddingVertical: defaultTheme.spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: defaultTheme.spacing.xxl,
  },
  title: {
    fontSize: defaultTheme.fontSize['2xl'],
    fontWeight: defaultTheme.fontWeight.bold,
    marginBottom: defaultTheme.spacing.s,
  },
  subtitle: {
    fontSize: defaultTheme.fontSize.m,
  },
  authModeSelector: {
    flexDirection: 'row',
    borderRadius: defaultTheme.radius.m,
    padding: defaultTheme.spacing.xs,
    marginBottom: defaultTheme.spacing.xl,
  },
  authModeButton: {
    flex: 1,
    paddingVertical: defaultTheme.spacing.s,
    paddingHorizontal: defaultTheme.spacing.m,
    borderRadius: defaultTheme.radius.s,
    alignItems: 'center',
  },
  authModeButtonActive: {
    ...defaultTheme.elevationPresets.button,
  },
  authModeText: {
    fontSize: defaultTheme.fontSize.s,
    fontWeight: defaultTheme.fontWeight.medium,
  },
  authModeTextActive: {
    fontWeight: defaultTheme.fontWeight.semibold,
  },
  form: {
    marginBottom: defaultTheme.spacing.xl,
  },
  input: {
    height: defaultTheme.sizing.control.l,
    borderWidth: 1,
    borderRadius: defaultTheme.radius.m,
    paddingHorizontal: defaultTheme.spacing.m,
    fontSize: defaultTheme.fontSize.m,
    marginBottom: defaultTheme.spacing.m,
  },
  button: {
    height: defaultTheme.sizing.control.l,
    borderRadius: defaultTheme.radius.m,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: defaultTheme.spacing.m,
  },
  primaryButton: {
    // Primary button styles are applied inline
  },
  secondaryButton: {
    // Secondary button styles are applied inline
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: defaultTheme.fontSize.m,
    fontWeight: defaultTheme.fontWeight.semibold,
  },
  secondaryButtonText: {
    fontSize: defaultTheme.fontSize.m,
    fontWeight: defaultTheme.fontWeight.semibold,
  },
  switchButton: {
    alignItems: 'center',
  },
  switchText: {
    fontSize: defaultTheme.fontSize.s,
  },
  instructionText: {
    fontSize: defaultTheme.fontSize.s,
    marginBottom: defaultTheme.spacing.m,
    textAlign: 'center',
  },
  errorText: {
    fontSize: defaultTheme.fontSize.s,
    marginTop: defaultTheme.spacing.s,
    textAlign: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: defaultTheme.spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: defaultTheme.spacing.m,
    fontSize: defaultTheme.fontSize.s,
  },
  offlineNote: {
    fontSize: defaultTheme.fontSize.xs,
    textAlign: 'center',
    marginTop: defaultTheme.spacing.s,
  },
});