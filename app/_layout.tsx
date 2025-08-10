import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../lib/theme/ThemeProvider';
import { useAuthStore } from '../features/auth/authStore';
import notificationService from '../features/notify/notificationService';
import reminderService from '../features/notify/reminderService';
import { taskRepository } from '../db/repositories/taskRepository';
import { ensureDatabaseInitialized } from '../db/database';
import * as Notifications from 'expo-notifications';

export default function RootLayout() {
  const { initialize, cleanup } = useAuthStore();
  
  useEffect(() => {
    // Initialize database first before any repository operations
    initializeApp();
    
    // Set up notification listeners
    const notificationListener = Notifications.addNotificationReceivedListener(
      notification => notificationService.handleNotificationReceived(notification)
    );
    
    const responseListener = Notifications.addNotificationResponseReceivedListener(
      response => notificationService.handleNotificationResponse(response)
    );
    
    // Clean up listeners on unmount
    return () => {
      notificationListener.remove();
      responseListener.remove();
      cleanup();
    };
  }, []);
  
  const initializeApp = async () => {
    // Ensure database is initialized first
    await ensureDatabaseInitialized();
    
    // Initialize authentication on app startup
    initialize();
    
    // Initialize notification services
    initializeNotifications();
    
    // Auto-cleanup of old done tasks on startup (as per design.md)
    cleanupOldTasks();
  };
  
  const initializeNotifications = async () => {
    const hasPermission = await notificationService.requestPermissions();
    if (hasPermission) {
      await reminderService.initialize();
    }
  };
  
  const cleanupOldTasks = async () => {
    try {
      await taskRepository.cleanupOldDoneTasks();
      console.log('Cleaned up old done tasks (>30 days)');
    } catch (error) {
      console.error('Failed to cleanup old tasks:', error);
    }
  };
  
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <BottomSheetModalProvider>
            <Stack
              screenOptions={{
                headerShown: false,
              }}
            >
              <Stack.Screen name="index" />
              <Stack.Screen name="auth" />
              <Stack.Screen name="task-list" />
              <Stack.Screen name="settings" />
            </Stack>
          </BottomSheetModalProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}