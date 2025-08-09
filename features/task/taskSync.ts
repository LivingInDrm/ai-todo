import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase, SupabaseTask, TABLES, isSupabaseConfigured } from '../../services/supabase';
import useTaskStore from './taskStore';
import { TaskData } from '../../lib/types';
import { authService } from '../auth/authService';
import database from '../../db/database';
import { Q } from '@nozbe/watermelondb';
import AsyncStorage from '@react-native-async-storage/async-storage';

const OFFLINE_QUEUE_KEY = 'task_sync_offline_queue';

type QueueOperation = {
  op: 'upsert' | 'delete';
  taskId: string;
  task?: SupabaseTask;
};

class TaskSyncService {
  private channel: RealtimeChannel | null = null;
  private syncQueue: Map<string, QueueOperation> = new Map();
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
        const queue = JSON.parse(stored) as QueueOperation[];
        queue.forEach(operation => {
          this.syncQueue.set(operation.taskId, operation);
        });
        console.log(`Loaded ${queue.length} operations from offline queue`);
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
   * Initialize realtime subscriptions
   */
  async initializeRealtimeSync(): Promise<void> {
    if (!isSupabaseConfigured()) {
      console.log('Supabase not configured, skipping realtime sync');
      return;
    }
    
    // Load offline queue before starting
    await this.loadOfflineQueue();
    
    // Process any pending offline operations
    await this.processOfflineQueue();
    
    const user = await authService.getCurrentUser();
    if (!user) {
      console.log('No authenticated user, skipping realtime sync');
      return;
    }
    
    // Perform initial sync
    await this.performInitialSync();
    
    // Setup realtime subscription
    this.channel = supabase!
      .channel('tasks-changes')
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
      .subscribe();
  }
  
  /**
   * Perform initial sync from Supabase to local
   */
  async performInitialSync(): Promise<void> {
    const user = await authService.getCurrentUser();
    if (!user || !isSupabaseConfigured()) {
      return;
    }
    
    try {
      const { data: remoteTasks, error } = await supabase!
        .from(TABLES.TASKS)
        .select('*')
        .eq('user_id', user.id);
      
      if (error) {
        console.error('Error fetching remote tasks:', error);
        return;
      }
      
      if (!remoteTasks || remoteTasks.length === 0) {
        return;
      }
      
      const taskStore = useTaskStore.getState();
      const localTasks = taskStore.tasks;
      
      // Process each remote task
      for (const remoteTask of remoteTasks) {
        const localTask = localTasks.find(t => t.id === remoteTask.id);
        
        if (!localTask) {
          // Task exists in remote but not local - check if it's in delete queue
          const queuedOp = this.syncQueue.get(remoteTask.id);
          if (queuedOp && queuedOp.op === 'delete') {
            // Skip this task as it's pending deletion
            console.log(`Skipping remote task ${remoteTask.id} as it's pending deletion`);
            continue;
          }
          
          // Create task locally
          await this.syncTaskToLocal(remoteTask);
        } else if (remoteTask.updated_ts > localTask.updatedTs) {
          // Remote task is newer - update local
          await this.syncTaskToLocal(remoteTask);
        }
      }
    } catch (error) {
      console.error('Error during initial sync:', error);
    }
  }
  
  /**
   * Handle realtime changes from Supabase
   */
  private async handleRealtimeChange(
    payload: RealtimePostgresChangesPayload<SupabaseTask>
  ): Promise<void> {
    console.log('Realtime change received:', payload.eventType);
    
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
          const taskStore = useTaskStore.getState();
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
        await taskStore.updateTask(supabaseTask.id, localTask, true); // Don't sync back to Supabase
      }
    } else {
      // Create new task locally
      await taskStore.createTask(localTask, true); // Don't sync back to Supabase
    }
  }
  
  /**
   * Sync a task from local to Supabase
   */
  async syncTaskToSupabase(task: any): Promise<void> {
    const user = await authService.getCurrentUser();
    const userId = user?.id || '';
    
    if (!isSupabaseConfigured()) {
      // Add to offline queue
      const supabaseTask = this.convertToSupabaseTask(task, userId);
      await this.addToOfflineQueue({
        op: 'upsert',
        taskId: task.id,
        task: supabaseTask
      });
      return;
    }
    
    if (!user) {
      return;
    }
    
    const supabaseTask = this.convertToSupabaseTask(task, userId);
    
    try {
      const { error } = await supabase!
        .from(TABLES.TASKS)
        .upsert(supabaseTask, {
          onConflict: 'id',
        });
      
      if (error) {
        console.error('Error syncing task to Supabase:', error);
        // Add to offline queue for retry
        await this.addToOfflineQueue({
          op: 'upsert',
          taskId: task.id,
          task: supabaseTask
        });
      } else {
        // Remove from queue if it was there
        if (this.syncQueue.has(task.id)) {
          this.syncQueue.delete(task.id);
          await this.saveOfflineQueue();
        }
      }
    } catch (error) {
      console.error('Error syncing task to Supabase:', error);
      // Add to offline queue for retry
      await this.addToOfflineQueue({
        op: 'upsert',
        taskId: task.id,
        task: supabaseTask
      });
    }
  }
  
  /**
   * Convert local task to Supabase format
   */
  private convertToSupabaseTask(task: any, userId: string): SupabaseTask {
    return {
      id: task.id,
      user_id: userId,
      title: task.title,
      due_ts: task.dueTs || task.due_ts || null,
      urgent: task.urgent ? 1 : 0,
      status: task.status,
      pending: task.pending ? 1 : 0,
      pinned_at: task.pinnedAt || task.pinned_at || 0,
      completed_ts: task.completedTs || task.completed_ts || null,
      created_ts: task.createdTs || task.created_ts || Date.now(),
      updated_ts: task.updatedTs || task.updated_ts || Date.now(),
    };
  }
  
  /**
   * Delete a task from Supabase
   */
  async deleteTaskFromSupabase(taskId: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      // Add delete operation to offline queue
      await this.addToOfflineQueue({
        op: 'delete',
        taskId: taskId
      });
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
        // Add to offline queue for retry
        await this.addToOfflineQueue({
          op: 'delete',
          taskId: taskId
        });
      } else {
        // Remove from queue if it was there
        if (this.syncQueue.has(taskId)) {
          this.syncQueue.delete(taskId);
          await this.saveOfflineQueue();
        }
      }
    } catch (error) {
      console.error('Error deleting task from Supabase:', error);
      // Add to offline queue for retry
      await this.addToOfflineQueue({
        op: 'delete',
        taskId: taskId
      });
    }
  }
  
  /**
   * Add operation to offline queue for later sync
   */
  private async addToOfflineQueue(operation: QueueOperation): Promise<void> {
    this.syncQueue.set(operation.taskId, operation);
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
    if (this.syncQueue.size === 0 || this.isSyncing) {
      return;
    }
    
    if (!isSupabaseConfigured()) {
      return;
    }
    
    const user = await authService.getCurrentUser();
    if (!user) {
      return;
    }
    
    this.isSyncing = true;
    console.log(`Processing offline queue with ${this.syncQueue.size} operations`);
    
    const operationsToSync = Array.from(this.syncQueue.values());
    const failedOperations: QueueOperation[] = [];
    let successCount = 0;
    
    for (const operation of operationsToSync) {
      try {
        let error;
        
        if (operation.op === 'delete') {
          // Process delete operation
          const result = await supabase!
            .from(TABLES.TASKS)
            .delete()
            .eq('id', operation.taskId)
            .eq('user_id', user.id);
          error = result.error;
        } else if (operation.op === 'upsert' && operation.task) {
          // Process upsert operation
          const result = await supabase!
            .from(TABLES.TASKS)
            .upsert(operation.task, {
              onConflict: 'id',
            });
          error = result.error;
        }
        
        if (error) {
          console.error(`Error syncing queued ${operation.op}:`, error);
          failedOperations.push(operation);
        } else {
          successCount++;
          this.syncQueue.delete(operation.taskId);
        }
      } catch (error) {
        console.error(`Error syncing queued ${operation.op}:`, error);
        failedOperations.push(operation);
      }
    }
    
    this.isSyncing = false;
    
    // Re-add failed operations to queue
    if (failedOperations.length > 0) {
      failedOperations.forEach(operation => {
        this.syncQueue.set(operation.taskId, operation);
      });
      await this.saveOfflineQueue();
      
      // Schedule retry with exponential backoff
      if (!this.retryTimeout) {
        const retryDelay = Math.min(30000 * Math.pow(2, failedOperations.length), 300000); // Max 5 minutes
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
    
    console.log(`Sync complete: ${successCount} successful, ${failedOperations.length} failed`);
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
    
    // Clear sync queue
    this.syncQueue.clear();
    await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
  }
}

const taskSyncService = new TaskSyncService();

// Re-export the taskStore for convenience
export { taskSyncService, useTaskStore as taskStore };