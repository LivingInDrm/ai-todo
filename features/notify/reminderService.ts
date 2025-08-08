import notificationService from './notificationService';
import { TaskData } from '../../lib/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFICATION_IDS_KEY = 'task_notification_ids';

class ReminderService {
  private static instance: ReminderService;
  private notificationIds: Map<string, string> = new Map();
  private initialized = false;

  private constructor() {}

  static getInstance(): ReminderService {
    if (!ReminderService.instance) {
      ReminderService.instance = new ReminderService();
    }
    return ReminderService.instance;
  }

  // 初始化服务，加载已保存的通知ID映射
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      const stored = await AsyncStorage.getItem(NOTIFICATION_IDS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.notificationIds = new Map(Object.entries(parsed));
      }
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize reminder service:', error);
      this.initialized = true;
    }
  }

  // 保存通知ID映射到存储
  private async saveNotificationIds(): Promise<void> {
    try {
      const data = Object.fromEntries(this.notificationIds);
      await AsyncStorage.setItem(NOTIFICATION_IDS_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save notification IDs:', error);
    }
  }

  // 为任务设置提醒
  async setReminder(task: TaskData): Promise<void> {
    await this.initialize();
    
    // 如果任务没有截止时间或已完成，取消提醒
    if (!task.due_ts || task.status === 1) {
      await this.cancelReminder(task.id);
      return;
    }

    // 取消旧的提醒
    await this.cancelReminder(task.id);

    // 设置新的提醒
    const dueDate = new Date(task.due_ts);
    const notificationId = await notificationService.scheduleNotification(
      task.id,
      task.title,
      dueDate,
      30 // 提前30分钟提醒
    );

    if (notificationId) {
      this.notificationIds.set(task.id, notificationId);
      await this.saveNotificationIds();
    }
  }

  // 取消任务的提醒
  async cancelReminder(taskId: string): Promise<void> {
    await this.initialize();
    
    const notificationId = this.notificationIds.get(taskId);
    if (notificationId) {
      await notificationService.cancelNotification(notificationId);
      this.notificationIds.delete(taskId);
      await this.saveNotificationIds();
    }
  }

  // 批量更新任务提醒
  async updateReminders(tasks: TaskData[]): Promise<void> {
    await this.initialize();
    
    // 获取当前所有已调度的通知
    const scheduled = await notificationService.getScheduledNotifications();
    const scheduledTaskIds = new Set(
      scheduled.map(n => n.content.data?.taskId).filter(Boolean)
    );

    // 处理每个任务
    for (const task of tasks) {
      const needsReminder = task.due_ts && task.status === 0;
      const hasReminder = scheduledTaskIds.has(task.id);

      if (needsReminder && !hasReminder) {
        // 需要提醒但没有设置
        await this.setReminder(task);
      } else if (!needsReminder && hasReminder) {
        // 不需要提醒但已设置
        await this.cancelReminder(task.id);
      }
    }
  }

  // 清理所有提醒
  async clearAllReminders(): Promise<void> {
    await this.initialize();
    
    await notificationService.cancelAllNotifications();
    this.notificationIds.clear();
    await AsyncStorage.removeItem(NOTIFICATION_IDS_KEY);
  }

  // 检查并更新过期的提醒
  async checkAndUpdateExpiredReminders(tasks: TaskData[]): Promise<void> {
    await this.initialize();
    
    const now = Date.now();
    
    for (const task of tasks) {
      if (task.due_ts && task.status === 0) {
        const reminderTime = task.due_ts - 30 * 60 * 1000; // 提前30分钟
        
        // 如果提醒时间已过但任务未完成，可以设置立即提醒或跳过
        if (reminderTime <= now && task.due_ts > now) {
          // 任务还未到期，但提醒时间已过，设置立即提醒
          const notificationId = await notificationService.scheduleNotification(
            task.id,
            task.title,
            new Date(task.due_ts),
            0 // 立即提醒
          );
          
          if (notificationId) {
            this.notificationIds.set(task.id, notificationId);
          }
        }
      }
    }
    
    await this.saveNotificationIds();
  }
}

export default ReminderService.getInstance();