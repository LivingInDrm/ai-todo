import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase, SupabaseTask, TABLES, isSupabaseConfigured } from '../../services/supabase';
import useTaskStore from './taskStore';
import { TaskData } from '../../lib/types';
import { authService } from '../auth/authService';
import database from '../../db/database';
import { Q } from '@nozbe/watermelondb';
import AsyncStorage from '@react-native-async-storage/async-storage';

const OFFLINE_QUEUE_KEY = 'task_sync_offline_queue';

class TaskSyncService {
  private channel: RealtimeChannel | null = null;
  private syncQueue: Map<string, SupabaseTask> = new Map();
  private isSyncing = false;
  private retryTimeout: NodeJS.Timeout | null = null;
  private queueInitialized = false;
  
  /**
   * Load offline queue from persistent storage
   */
  private async loadOfflineQueue(): Promise<void> {
    if (this.queueInitialized) return;
    
    try {
      const stored = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      if (stored) {
        const queue = JSON.parse(stored) as SupabaseTask[];
        queue.forEach(task => {
          this.syncQueue.set(task.id, task);
        });
        console.log(`Loaded ${queue.length} items from offline queue`);
      }
      this.queueInitialized = true;
    } catch (error) {
      console.error('Failed to load offline queue:', error);
      this.queueInitialized = true;
    }
  }
  
  /**
   * Save offline queue to persistent storage
   */
  private async saveOfflineQueue(): Promise<void> {
    try {
      const queue = Array.from(this.syncQueue.values());
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  }
  
  /**
   * Initialize real-time subscription for task updates
   */
  async initializeRealtimeSync(): Promise<void> {
    // Load offline queue first
    await this.loadOfflineQueue();
    
    // Process offline queue if there are items
    if (this.syncQueue.size > 0) {
      console.log('Processing offline queue on initialization...');
      this.processOfflineQueue();
    }
    if (!isSupabaseConfigured()) {
      console.log('Supabase not configured, skipping realtime sync');
      return;
    }
    
    const user = await authService.getCurrentUser();
    if (!user) {
      console.log('No authenticated user, skipping realtime sync');
      return;
    }
    
    // Clean up existing subscription if any
    this.cleanup();
    
    // Create channel for real-time updates
    this.channel = supabase!
      .channel('tasks-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: TABLES.TASKS,
          filter: `user_id=eq.${user.id}`,
        },
        (payload: RealtimePostgresChangesPayload<SupabaseTask>) => {
          this.handleRealtimeChange(payload);
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          // Perform initial sync when subscription is established
          this.performInitialSync();
        }
      });
  }
  
  /**
   * Handle real-time change events from Supabase
   */
  private async handleRealtimeChange(
    payload: RealtimePostgresChangesPayload<SupabaseTask>
  ): Promise<void> {
    console.log('Realtime change received:', payload.eventType);
    
    const taskStore = useTaskStore.getState();
    
    switch (payload.eventType) {
      case 'INSERT':
        if (payload.new) {
          await this.syncTaskToLocal(payload.new);
        }
        break;
        
      case 'UPDATE':
        if (payload.new) {
          await this.syncTaskToLocal(payload.new);
        }
        break;
        
      case 'DELETE':
        if (payload.old && payload.old.id) {
          await taskStore.deleteTask(payload.old.id, true); // Don't sync back to Supabase
        }
        break;
    }
  }
  
  /**
   * Sync a single task from Supabase to local database
   */
  private async syncTaskToLocal(supabaseTask: SupabaseTask): Promise<void> {
    const taskStore = useTaskStore.getState();
    
    // Convert Supabase task to local Task format
    const localTask: Partial<TaskData> = {
      id: supabaseTask.id,
      title: supabaseTask.title,
      dueTs: supabaseTask.due_ts || undefined,
      urgent: supabaseTask.urgent === 1,
      status: supabaseTask.status,
      pending: supabaseTask.pending === 1,
      pinnedAt: supabaseTask.pinned_at,
      completedTs: supabaseTask.completed_ts || undefined,
      createdTs: supabaseTask.created_ts,
      updatedTs: supabaseTask.updated_ts,
    };
    
    // Check if task exists locally
    const existingTask = taskStore.tasks.find(t => t.id === supabaseTask.id);
    
    if (existingTask) {
      // Update existing task (last-write-wins based on updated_ts)
      if (supabaseTask.updated_ts > existingTask.updatedTs) {
        await taskStore.updateTask(supabaseTask.id, localTask, true); // Don't sync back
      }
    } else {
      // Create new task locally
      await taskStore.createTask(localTask, true); // Don't sync back
    }
  }
  
  /**
   * Perform initial sync when connection is established
   */
  private async performInitialSync(): Promise<void> {
    if (!isSupabaseConfigured() || this.isSyncing) {
      return;
    }
    
    const user = await authService.getCurrentUser();
    if (!user) {
      return;
    }
    
    this.isSyncing = true;
    
    try {
      console.log('Performing initial sync...');
      
      // Fetch all tasks from Supabase
      const { data: remoteTasks, error } = await supabase!
        .from(TABLES.TASKS)
        .select('*')
        .eq('user_id', user.id);
      
      if (error) {
        console.error('Error fetching remote tasks:', error);
        return;
      }
      
      if (!remoteTasks) {
        return;
      }
      
      // Get all local tasks
      const localTasksCollection = database.get<any>('tasks');
      const localTasks = await localTasksCollection.query().fetch();
      
      // Create maps for efficient lookup
      const remoteTaskMap = new Map(remoteTasks.map(t => [t.id, t]));
      const localTaskMap = new Map(localTasks.map(t => [t.id, t]));
      
      // Sync remote tasks to local (including new and updated)
      for (const remoteTask of remoteTasks) {
        const localTask = localTaskMap.get(remoteTask.id);
        
        if (!localTask) {
          // Task exists only on remote, create locally
          await this.syncTaskToLocal(remoteTask);
        } else if (remoteTask.updated_ts > localTask.updatedTs) {
          // Remote task is newer, update local
          await this.syncTaskToLocal(remoteTask);
        } else if (localTask.updatedTs > remoteTask.updated_ts) {
          // Local task is newer, update remote
          await this.syncTaskToSupabase(localTask);
        }
      }
      
      // Upload local tasks that don't exist remotely
      for (const localTask of localTasks) {
        if (!remoteTaskMap.has(localTask.id)) {
          await this.syncTaskToSupabase(localTask);
        }
      }
      
      console.log('Initial sync completed');
    } catch (error) {
      console.error('Error during initial sync:', error);
    } finally {
      this.isSyncing = false;
      
      // Process any queued changes
      this.processOfflineQueue();
    }
  }
  
  /**
   * Sync a local task to Supabase
   */
  async syncTaskToSupabase(task: any): Promise<void> {
    const user = await authService.getCurrentUser();
    if (!user) {
      console.log('No authenticated user, skipping sync to Supabase');
      return;
    }
    
    // Convert to Supabase format first, regardless of online/offline status
    const supabaseTask: SupabaseTask = {
      id: task.id,
      user_id: user.id,
      title: task.title,
      due_ts: task.dueTs || null,
      urgent: task.urgent ? 1 : 0,
      status: task.status,
      pending: task.pending ? 1 : 0,
      pinned_at: task.pinnedAt || 0,
      completed_ts: task.completedTs || null,
      created_ts: task.createdTs,
      updated_ts: task.updatedTs,
    };
    
    if (!isSupabaseConfigured()) {
      // Add to offline queue in Supabase format
      this.addToOfflineQueue(supabaseTask);
      return;
    }
    
    try {
      const { error } = await supabase!
        .from(TABLES.TASKS)
        .upsert(supabaseTask, {
          onConflict: 'id',
        });
      
      if (error) {
        console.error('Error syncing task to Supabase:', error);
        this.addToOfflineQueue(supabaseTask);
      }
    } catch (error) {
      console.error('Error syncing task to Supabase:', error);
      this.addToOfflineQueue(supabaseTask);
    }
  }
  
  /**
   * Delete a task from Supabase
   */
  async deleteTaskFromSupabase(taskId: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      return;
    }
    
    const user = await authService.getCurrentUser();
    if (!user) {
      return;
    }
    
    try {
      const { error } = await supabase!
        .from(TABLES.TASKS)
        .delete()
        .eq('id', taskId)
        .eq('user_id', user.id);
      
      if (error) {
        console.error('Error deleting task from Supabase:', error);
      }
    } catch (error) {
      console.error('Error deleting task from Supabase:', error);
    }
  }
  
  /**
   * Add task to offline queue for later sync
   */
  private async addToOfflineQueue(task: SupabaseTask): Promise<void> {
    this.syncQueue.set(task.id, task);
    await this.saveOfflineQueue();
    
    // Schedule retry with exponential backoff
    if (!this.retryTimeout) {
      const retryDelay = Math.min(30000 * Math.pow(2, this.syncQueue.size - 1), 300000); // Max 5 minutes
      this.retryTimeout = setTimeout(() => {
        this.processOfflineQueue();
      }, retryDelay);
    }
  }
  
  /**
   * Process offline queue when connection is restored
   */
  async processOfflineQueue(): Promise<void> {
    if (this.syncQueue.size === 0 || !isSupabaseConfigured()) {
      return;
    }
    
    const user = await authService.getCurrentUser();
    if (!user) {
      return;
    }
    
    console.log(`Processing offline queue with ${this.syncQueue.size} items`);
    
    const tasksToSync = Array.from(this.syncQueue.values());
    const failedTasks: SupabaseTask[] = [];
    let successCount = 0;
    
    for (const task of tasksToSync) {
      try {
        const { error } = await supabase!
          .from(TABLES.TASKS)
          .upsert(task, {
            onConflict: 'id',
          });
        
        if (error) {
          console.error('Error syncing queued task:', error);
          failedTasks.push(task);
        } else {
          successCount++;
          this.syncQueue.delete(task.id);
        }
      } catch (error) {
        console.error('Error syncing queued task:', error);
        failedTasks.push(task);
      }
    }
    
    // Re-add failed tasks to queue
    if (failedTasks.length > 0) {
      failedTasks.forEach(task => {
        this.syncQueue.set(task.id, task);
      });
      await this.saveOfflineQueue();
      
      // Schedule retry with exponential backoff
      if (!this.retryTimeout) {
        const retryDelay = Math.min(30000 * Math.pow(2, failedTasks.length), 300000); // Max 5 minutes
        this.retryTimeout = setTimeout(() => {
          this.processOfflineQueue();
        }, retryDelay);
      }
    } else {
      // Clear queue if all successful
      await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
      if (this.retryTimeout) {
        clearTimeout(this.retryTimeout);
        this.retryTimeout = null;
      }
    }
    
    console.log(`Sync complete: ${successCount} successful, ${failedTasks.length} failed`);
  }
  
  /**
   * Cleanup subscriptions and timers
   */
  async cleanup(): Promise<void> {
    if (this.channel) {
      supabase?.removeChannel(this.channel);
      this.channel = null;
    }
    
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
    
    // Save any pending items before cleanup
    if (this.syncQueue.size > 0) {
      await this.saveOfflineQueue();
    }
  }
}

export const taskSyncService = new TaskSyncService();