import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { authService } from '../auth/authService';

// 配置通知行为
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    // @ts-ignore - Platform-specific fields
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

class NotificationService {
  private static instance: NotificationService;
  
  private constructor() {}
  
  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // 请求通知权限
  async requestPermissions(): Promise<boolean> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get notification permissions!');
      return false;
    }
    
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }
    
    // Only register push token on physical devices
    if (Device.isDevice) {
      await this.registerPushToken();
    } else {
      console.log('Skipping push token registration on simulator');
    }
    
    return true;
  }
  
  // 获取并上传推送令牌到 Supabase
  async registerPushToken(): Promise<void> {
    try {
      // Get projectId from Constants or fallback to env
      const projectId = Constants.easConfig?.projectId || 
                       Constants.expoConfig?.extra?.eas?.projectId ||
                       process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
      
      if (!projectId) {
        console.warn('No EAS project ID found, skipping push token registration');
        return;
      }
      
      // Get the push token
      const token = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
      
      if (token && token.data) {
        console.log('Push token obtained:', token.data);
        
        // Upload to Supabase profiles
        const { error } = await authService.updateProfile({
          push_token: token.data,
        });
        
        if (error) {
          console.error('Failed to upload push token:', error);
        } else {
          console.log('Push token uploaded successfully');
        }
      }
    } catch (error) {
      console.error('Failed to get or upload push token:', error);
    }
  }

  // 调度本地通知
  async scheduleNotification(
    taskId: string,
    title: string,
    dueDate: Date,
    reminderMinutesBefore: number = 30
  ): Promise<string | null> {
    try {
      // 计算提醒时间
      const triggerDate = new Date(dueDate);
      triggerDate.setMinutes(triggerDate.getMinutes() - reminderMinutesBefore);
      
      // 如果提醒时间已过，不设置通知
      if (triggerDate <= new Date()) {
        return null;
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '任务提醒',
          body: title,
          data: { taskId },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
        },
      });

      return notificationId;
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      return null;
    }
  }

  // 取消特定通知
  async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('Failed to cancel notification:', error);
    }
  }

  // 取消所有通知
  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Failed to cancel all notifications:', error);
    }
  }

  // 获取所有已调度的通知
  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Failed to get scheduled notifications:', error);
      return [];
    }
  }

  // 处理收到的通知
  handleNotificationReceived(
    notification: Notifications.Notification
  ): void {
    const taskId = notification.request.content.data?.taskId;
    if (taskId) {
      console.log('Notification received for task:', taskId);
      // 这里可以添加额外的处理逻辑
    }
  }

  // 处理通知响应（用户点击通知）
  handleNotificationResponse(
    response: Notifications.NotificationResponse
  ): void {
    const taskId = response.notification.request.content.data?.taskId;
    if (taskId) {
      console.log('User tapped notification for task:', taskId);
      // TODO: 导航到对应的任务详情
    }
  }
}

export default NotificationService.getInstance();