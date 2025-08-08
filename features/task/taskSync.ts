import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase, SupabaseTask, TABLES, isSupabaseConfigured } from '../../services/supabase';
import useTaskStore from './taskStore';
import { TaskData } from '../../lib/types';
import { authService } from '../auth/authService';
import database from '../../db/database';
import { Q } from '@nozbe/watermelondb';

class TaskSyncService {
  private channel: RealtimeChannel | null = null;
  private syncQueue: Map<string, SupabaseTask> = new Map();
  private isSyncing = false;
  private retryTimeout: NodeJS.Timeout | null = null;
  
  /**
   * Initialize real-time subscription for task updates
   */
  async initializeRealtimeSync(): Promise<void> {
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
    if (!isSupabaseConfigured()) {
      // Add to offline queue
      this.addToOfflineQueue(task);
      return;
    }
    
    const user = await authService.getCurrentUser();
    if (!user) {
      console.log('No authenticated user, skipping sync to Supabase');
      return;
    }
    
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
  private addToOfflineQueue(task: SupabaseTask): void {
    this.syncQueue.set(task.id, task);
    
    // Schedule retry
    if (!this.retryTimeout) {
      this.retryTimeout = setTimeout(() => {
        this.processOfflineQueue();
      }, 30000); // Retry after 30 seconds
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
    this.syncQueue.clear();
    
    for (const task of tasksToSync) {
      try {
        const { error } = await supabase!
          .from(TABLES.TASKS)
          .upsert(task, {
            onConflict: 'id',
          });
        
        if (error) {
          console.error('Error syncing queued task:', error);
          this.addToOfflineQueue(task);
        }
      } catch (error) {
        console.error('Error syncing queued task:', error);
        this.addToOfflineQueue(task);
      }
    }
    
    // Clear retry timeout if queue is empty
    if (this.syncQueue.size === 0 && this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
  }
  
  /**
   * Cleanup subscriptions and timers
   */
  cleanup(): void {
    if (this.channel) {
      supabase?.removeChannel(this.channel);
      this.channel = null;
    }
    
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
  }
}

export const taskSyncService = new TaskSyncService();