import { useEffect } from 'react';
import { router } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuthStore } from '../features/auth/authStore';
import { isSupabaseConfigured } from '../services/supabase';

export default function Index() {
  const { isInitialized, user } = useAuthStore();
  
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
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#007AFF" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
});