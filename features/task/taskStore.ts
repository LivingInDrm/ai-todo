import { create } from 'zustand';
import { Q } from '@nozbe/watermelondb';
import database, { Task } from '../../db/database';
import { TaskData, TaskStatus, TaskView } from '../../lib/types';
import { taskSyncService } from './taskSync';
import reminderService from '../notify/reminderService';

interface TaskStore {
  tasks: TaskData[];
  loading: boolean;
  error: string | null;
  currentView: TaskView;
  
  // Actions
  fetchTasks: () => Promise<void>;
  createTask: (taskData: Partial<TaskData> | string, skipSync?: boolean) => Promise<Task>;
  updateTask: (id: string, updates: Partial<TaskData>, skipSync?: boolean) => Promise<void>;
  deleteTask: (id: string, skipSync?: boolean) => Promise<void>;
  toggleTaskStatus: (id: string) => Promise<void>;
  postponeTask: (id: string, newDueTs: number) => Promise<void>;
  pinTask: (id: string) => Promise<void>;
  setCurrentView: (view: TaskView) => void;
  
  // Computed
  getFocusTasks: () => TaskData[];
  getBacklogTasks: () => TaskData[];
  getDoneTasks: () => TaskData[];
  getTaskById: (id: string) => Promise<TaskData | null>;
  findTaskByTitle: (title: string) => Promise<TaskData | null>;
  clearCompletedTasks: () => Promise<void>;
  cleanupOldDoneTasks: () => Promise<void>;
}

const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  loading: false,
  error: null,
  currentView: TaskView.Focus,

  fetchTasks: async () => {
    set({ loading: true, error: null });
    try {
      const tasks = await database.collections
        .get<Task>('tasks')
        .query(Q.where('pending', false))
        .fetch();
      
      const taskData = tasks.map(task => ({
        id: task.id,
        title: task.title,
        dueTs: task.dueTs,
        urgent: task.urgent,
        status: task.status,
        pending: task.pending,
        completedTs: task.completedTs,
        pinnedAt: task.pinnedAt,
        createdTs: task.createdTs,
        updatedTs: task.updatedTs,
      }));
      
      set({ tasks: taskData, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  createTask: async (taskData: Partial<TaskData> | string, skipSync = false) => {
    // Handle both string (title) and object inputs
    const data: Partial<TaskData> = typeof taskData === 'string' 
      ? { title: taskData }
      : taskData;
    
    // Validate title is not empty
    if (!data.title || data.title.trim() === '') {
      const error = new Error('Task title cannot be empty');
      set({ error: error.message });
      throw error;
    }
    
    try {
      const newTask = await database.write(async () => {
        return await database.collections.get<Task>('tasks').create(task => {
          // If an ID is provided (e.g., from Supabase sync), use it
          if (data.id) {
            (task as any)._raw.id = data.id;
          }
          task.title = data.title!.trim();
          task.dueTs = data.dueTs;
          task.urgent = data.urgent || false;
          task.status = data.status ?? TaskStatus.Active;
          task.pending = data.pending ?? false;
          task.pinnedAt = data.pinnedAt || 0;
          task.completedTs = data.completedTs;
          task.createdTs = data.createdTs || Date.now();
          task.updatedTs = data.updatedTs || Date.now();
        });
      });
      
      // Sync to Supabase if not skipped
      if (!skipSync) {
        await taskSyncService.syncTaskToSupabase(newTask);
      }
      
      // Set reminder if task has due date and is active
      if (newTask.dueTs && newTask.status === TaskStatus.Active && !newTask.pending) {
        await reminderService.setReminder({
          id: newTask.id,
          title: newTask.title,
          dueTs: newTask.dueTs,
          due_ts: newTask.dueTs,
          urgent: newTask.urgent,
          status: newTask.status,
          pending: newTask.pending,
          pinnedAt: newTask.pinnedAt,
          pinned_at: newTask.pinnedAt,
          completedTs: newTask.completedTs,
          completed_ts: newTask.completedTs,
          createdTs: newTask.createdTs,
          created_ts: newTask.createdTs,
          updatedTs: newTask.updatedTs,
          updated_ts: newTask.updatedTs
        });
      }
      
      await get().fetchTasks();
      return newTask;
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  updateTask: async (id: string, updates: Partial<TaskData>, skipSync = false) => {
    try {
      const updatedTask = await database.write(async () => {
        const task = await database.collections.get<Task>('tasks').find(id);
        await task.update(t => {
          if (updates.title !== undefined) t.title = updates.title;
          if (updates.dueTs !== undefined) t.dueTs = updates.dueTs;
          if (updates.urgent !== undefined) t.urgent = updates.urgent;
          if (updates.status !== undefined) t.status = updates.status;
          if (updates.completedTs !== undefined) t.completedTs = updates.completedTs;
          if (updates.pending !== undefined) t.pending = updates.pending;
          if (updates.pinnedAt !== undefined) t.pinnedAt = updates.pinnedAt;
          t.updatedTs = updates.updatedTs || Date.now();
        });
        return task;
      });
      
      // Sync to Supabase if not skipped
      if (!skipSync) {
        await taskSyncService.syncTaskToSupabase(updatedTask);
      }
      
      // Update reminder based on task status and due date
      await reminderService.setReminder({
        id: updatedTask.id,
        title: updatedTask.title,
        dueTs: updatedTask.dueTs,
        due_ts: updatedTask.dueTs,
        urgent: updatedTask.urgent,
        status: updatedTask.status,
        pending: updatedTask.pending,
        pinnedAt: updatedTask.pinnedAt,
        pinned_at: updatedTask.pinnedAt,
        completedTs: updatedTask.completedTs,
        completed_ts: updatedTask.completedTs,
        createdTs: updatedTask.createdTs,
        created_ts: updatedTask.createdTs,
        updatedTs: updatedTask.updatedTs,
        updated_ts: updatedTask.updatedTs
      });
      
      await get().fetchTasks();
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  deleteTask: async (id: string, skipSync = false) => {
    try {
      // Cancel reminder before deleting task
      await reminderService.cancelReminder(id);
      
      await database.write(async () => {
        const task = await database.collections.get<Task>('tasks').find(id);
        await task.markAsDeleted();
      });
      
      // Sync deletion to Supabase if not skipped
      if (!skipSync) {
        await taskSyncService.deleteTaskFromSupabase(id);
      }
      
      await get().fetchTasks();
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  toggleTaskStatus: async (id: string) => {
    try {
      const updatedTask = await database.write(async () => {
        const task = await database.collections.get<Task>('tasks').find(id);
        if (task.isCompleted) {
          await task.markAsActive();
        } else {
          await task.markAsCompleted();
        }
        return task;
      });
      
      // Sync to Supabase
      await taskSyncService.syncTaskToSupabase(updatedTask);
      
      // Update reminder after status change
      await reminderService.setReminder({
        id: updatedTask.id,
        title: updatedTask.title,
        dueTs: updatedTask.dueTs,
        due_ts: updatedTask.dueTs,
        urgent: updatedTask.urgent,
        status: updatedTask.status,
        pending: updatedTask.pending,
        pinnedAt: updatedTask.pinnedAt,
        pinned_at: updatedTask.pinnedAt,
        completedTs: updatedTask.completedTs,
        completed_ts: updatedTask.completedTs,
        createdTs: updatedTask.createdTs,
        created_ts: updatedTask.createdTs,
        updatedTs: updatedTask.updatedTs,
        updated_ts: updatedTask.updatedTs
      });
      
      await get().fetchTasks();
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  postponeTask: async (id: string, newDueTs: number) => {
    try {
      const updatedTask = await database.write(async () => {
        const task = await database.collections.get<Task>('tasks').find(id);
        await task.postpone(newDueTs);
        return task;
      });
      
      // Sync to Supabase
      await taskSyncService.syncTaskToSupabase(updatedTask);
      
      // Update reminder with new due date
      await reminderService.setReminder({
        id: updatedTask.id,
        title: updatedTask.title,
        dueTs: updatedTask.dueTs,
        due_ts: updatedTask.dueTs,
        urgent: updatedTask.urgent,
        status: updatedTask.status,
        pending: updatedTask.pending,
        pinnedAt: updatedTask.pinnedAt,
        pinned_at: updatedTask.pinnedAt,
        completedTs: updatedTask.completedTs,
        completed_ts: updatedTask.completedTs,
        createdTs: updatedTask.createdTs,
        created_ts: updatedTask.createdTs,
        updatedTs: updatedTask.updatedTs,
        updated_ts: updatedTask.updatedTs
      });
      
      await get().fetchTasks();
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  pinTask: async (id: string) => {
    try {
      const updatedTask = await database.write(async () => {
        const task = await database.collections.get<Task>('tasks').find(id);
        await task.togglePin();
        return task;
      });
      
      // Sync to Supabase
      await taskSyncService.syncTaskToSupabase(updatedTask);
      
      await get().fetchTasks();
    } catch (error) {
      console.error('Failed to pin task:', error);
      set({ error: (error as Error).message });
    }
  },

  setCurrentView: (view: TaskView) => {
    set({ currentView: view });
  },

  getFocusTasks: () => {
    const { tasks } = get();
    const now = Date.now();
    const weekFromNow = now + (7 * 24 * 60 * 60 * 1000);
    
    return tasks
      .filter(task => 
        task.status === TaskStatus.Active && 
        task.dueTs !== undefined && task.dueTs <= weekFromNow
      )
      .sort((a, b) => {
        // Pinned items first, sorted by pin time (newest pins first)
        if (a.pinnedAt && b.pinnedAt) return b.pinnedAt - a.pinnedAt;
        if (a.pinnedAt) return -1;
        if (b.pinnedAt) return 1;
        // Then by due date
        if (!a.dueTs && !b.dueTs) return 0;
        if (!a.dueTs) return 1;
        if (!b.dueTs) return -1;
        return a.dueTs - b.dueTs;
      });
  },

  getBacklogTasks: () => {
    const { tasks } = get();
    const now = Date.now();
    const weekFromNow = now + (7 * 24 * 60 * 60 * 1000);
    
    return tasks
      .filter(task => 
        task.status === TaskStatus.Active && 
        (!task.dueTs || task.dueTs > weekFromNow)
      )
      .sort((a, b) => {
        // Only sort by creation time (newest first), no pinned priority in Backlog
        return b.createdTs - a.createdTs;
      });
  },

  getDoneTasks: () => {
    const { tasks } = get();
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    return tasks
      .filter(task => 
        task.status === TaskStatus.Completed && 
        task.completedTs && 
        task.completedTs >= thirtyDaysAgo
      )
      .sort((a, b) => (b.completedTs || 0) - (a.completedTs || 0));
  },

  getTaskById: async (id: string) => {
    try {
      const task = await database.collections.get<Task>('tasks').find(id);
      if (task && !task.pending) {
        return {
          id: task.id,
          title: task.title,
          dueTs: task.dueTs,
          urgent: task.urgent,
          status: task.status,
          pending: task.pending,
          completedTs: task.completedTs,
          createdTs: task.createdTs,
          updatedTs: task.updatedTs,
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to get task by ID:', error);
      return null;
    }
  },

  findTaskByTitle: async (title: string) => {
    try {
      const tasks = await database.collections
        .get<Task>('tasks')
        .query(
          Q.where('pending', false),
          Q.where('title', Q.like(`%${title}%`))
        )
        .fetch();
      
      if (tasks.length > 0) {
        const task = tasks[0];
        return {
          id: task.id,
          title: task.title,
          dueTs: task.dueTs,
          urgent: task.urgent,
          status: task.status,
          pending: task.pending,
          completedTs: task.completedTs,
          createdTs: task.createdTs,
          updatedTs: task.updatedTs,
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to find task by title:', error);
      return null;
    }
  },

  clearCompletedTasks: async () => {
    try {
      const completedTasks = await database.collections
        .get<Task>('tasks')
        .query(Q.where('status', TaskStatus.Completed))
        .fetch();
      
      // Cancel reminders for all completed tasks before deleting
      for (const task of completedTasks) {
        await reminderService.cancelReminder(task.id);
      }
      
      await database.write(async () => {
        for (const task of completedTasks) {
          await task.markAsDeleted();
        }
      });
      
      // Sync deletions to Supabase
      for (const task of completedTasks) {
        await taskSyncService.deleteTaskFromSupabase(task.id);
      }
      
      await get().fetchTasks();
    } catch (error) {
      set({ error: (error as Error).message });
      console.error('Failed to clear completed tasks:', error);
    }
  },
  
  cleanupOldDoneTasks: async () => {
    try {
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      
      // Find tasks completed more than 30 days ago
      const oldCompletedTasks = await database.collections
        .get<Task>('tasks')
        .query(
          Q.where('status', TaskStatus.Completed),
          Q.where('completed_ts', Q.lt(thirtyDaysAgo))
        )
        .fetch();
      
      if (oldCompletedTasks.length === 0) {
        console.log('No old completed tasks to cleanup');
        return;
      }
      
      console.log(`Cleaning up ${oldCompletedTasks.length} old completed tasks`);
      
      // Cancel reminders for old tasks before deleting
      for (const task of oldCompletedTasks) {
        await reminderService.cancelReminder(task.id);
      }
      
      // Delete old tasks
      await database.write(async () => {
        for (const task of oldCompletedTasks) {
          await task.markAsDeleted();
        }
      });
      
      // Sync deletions to Supabase
      for (const task of oldCompletedTasks) {
        await taskSyncService.deleteTaskFromSupabase(task.id);
      }
      
      await get().fetchTasks();
      console.log('Old completed tasks cleanup finished');
    } catch (error) {
      console.error('Failed to cleanup old done tasks:', error);
    }
  },
}));

export default useTaskStore;
export { useTaskStore as taskStore };