import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '../features/auth/authStore';
import notificationService from '../features/notify/notificationService';
import reminderService from '../features/notify/reminderService';
import * as Notifications from 'expo-notifications';

export default function RootLayout() {
  const { initialize } = useAuthStore();
  
  useEffect(() => {
    // Initialize authentication on app startup
    initialize();
    
    // Initialize notification services
    initializeNotifications();
    
    // Set up notification listeners
    const notificationListener = Notifications.addNotificationReceivedListener(
      notification => notificationService.handleNotificationReceived(notification)
    );
    
    const responseListener = Notifications.addNotificationResponseReceivedListener(
      response => notificationService.handleNotificationResponse(response)
    );
    
    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);
  
  const initializeNotifications = async () => {
    const hasPermission = await notificationService.requestPermissions();
    if (hasPermission) {
      await reminderService.initialize();
    }
  };
  
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
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
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}