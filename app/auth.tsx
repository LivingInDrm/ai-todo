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

export default function AuthScreen() {
  const router = useRouter();
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
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>AI Todo</Text>
            <Text style={styles.subtitle}>
              {authMode === 'magic' 
                ? 'Sign in with email link'
                : (isSignUp ? 'Create your account' : 'Welcome back')}
            </Text>
          </View>
          
          {/* Auth Mode Selector */}
          <View style={styles.authModeSelector}>
            <TouchableOpacity
              style={[
                styles.authModeButton,
                authMode === 'magic' && styles.authModeButtonActive
              ]}
              onPress={() => {
                setAuthMode('magic');
                resetAuthState();
              }}
              disabled={isLoading}
            >
              <Text style={[
                styles.authModeText,
                authMode === 'magic' && styles.authModeTextActive
              ]}>
                Email Link
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.authModeButton,
                authMode === 'password' && styles.authModeButtonActive
              ]}
              onPress={() => {
                setAuthMode('password');
                resetAuthState();
              }}
              disabled={isLoading}
            >
              <Text style={[
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
                      style={styles.input}
                      placeholder="Email"
                      placeholderTextColor="#999"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      editable={!isLoading}
                    />
                    
                    <TouchableOpacity
                      style={[styles.button, styles.primaryButton, isLoading && styles.disabledButton]}
                      onPress={handleMagicLinkSubmit}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#FFF" />
                      ) : (
                        <Text style={styles.buttonText}>
                          Send Login Link
                        </Text>
                      )}
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.instructionText}>
                      Enter the 6-digit code from your email
                    </Text>
                    
                    <TextInput
                      style={styles.input}
                      placeholder="000000"
                      placeholderTextColor="#999"
                      value={otpCode}
                      onChangeText={setOtpCode}
                      keyboardType="number-pad"
                      maxLength={6}
                      editable={!isLoading}
                    />
                    
                    <TouchableOpacity
                      style={[styles.button, styles.primaryButton, isLoading && styles.disabledButton]}
                      onPress={handleOtpVerification}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#FFF" />
                      ) : (
                        <Text style={styles.buttonText}>
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
                      <Text style={styles.switchText}>
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
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="#999"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  editable={!isLoading}
                />
                
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#999"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  editable={!isLoading}
                />
                
                {isSignUp && (
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm Password"
                    placeholderTextColor="#999"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    editable={!isLoading}
                  />
                )}
                
                <TouchableOpacity
                  style={[styles.button, styles.primaryButton, isLoading && styles.disabledButton]}
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
              <Text style={styles.errorText}>{error}</Text>
            )}
          </View>
          
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>
          
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handleOfflineMode}
            disabled={isLoading}
          >
            <Text style={styles.secondaryButtonText}>Continue Offline</Text>
          </TouchableOpacity>
          
          <Text style={styles.offlineNote}>
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
    backgroundColor: '#FFF',
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
    color: '#000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  authModeSelector: {
    flexDirection: 'row',
    backgroundColor: '#F0F0F0',
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
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  authModeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  authModeTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  form: {
    marginBottom: 24,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#000',
    marginBottom: 16,
    backgroundColor: '#FAFAFA',
  },
  button: {
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#F0F0F0',
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  switchButton: {
    alignItems: 'center',
  },
  switchText: {
    fontSize: 14,
    color: '#007AFF',
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
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
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#999',
  },
  offlineNote: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
});