import { useEffect } from 'react';
import { router } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuthStore } from '../features/auth/authStore';
import { isSupabaseConfigured } from '../services/supabase';
import { useTheme } from '../lib/theme/ThemeProvider';

export default function Index() {
  const { isInitialized, user } = useAuthStore();
  const { theme } = useTheme();
  
  useEffect(() => {
    if (!isInitialized) {
      return;
    }
    
    // If Supabase is not configured, go directly to task list (offline mode)
    if (!isSupabaseConfigured()) {
      router.replace('/task-list');
      return;
    }
    
    // If user is authenticated, go to task list
    // Otherwise, go to auth screen
    if (user) {
      router.replace('/task-list');
    } else {
      router.replace('/auth');
    }
  }, [isInitialized, user]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg.surface }]}>
      <ActivityIndicator size="large" color={theme.colors.accent.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});