import { create } from 'zustand';
import database, { Task, taskRepository } from '../../db/database';
import { ensureDatabaseInitialized } from '../../db/database';
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
  createTaskWithRemoteId: (taskData: Partial<TaskData>, skipSync?: boolean) => Promise<Task>;
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
      await ensureDatabaseInitialized();
      const tasks = await taskRepository.getAllTasks();
      set({ tasks, loading: false });
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
      await ensureDatabaseInitialized();
      const created = await taskRepository.create({
        title: data.title!.trim(),
        dueTs: data.dueTs,
        urgent: data.urgent || false,
        status: data.status ?? TaskStatus.Active,
        pending: data.pending ?? false,
        pinnedAt: data.pinnedAt || undefined,
        remoteId: data.remoteId,
        completedTs: data.completedTs,
        createdTs: data.createdTs || Date.now(),
        updatedTs: data.updatedTs || Date.now(),
      });
      const newTask = Task.fromData(created);
      
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

  createTaskWithRemoteId: async (taskData: Partial<TaskData>, skipSync = false) => {
    // Special method for creating tasks from Supabase sync with remote_id
    if (!taskData.title || taskData.title.trim() === '') {
      const error = new Error('Task title cannot be empty');
      set({ error: error.message });
      throw error;
    }
    
    try {
      await ensureDatabaseInitialized();
      const created = await taskRepository.create({
        title: taskData.title!.trim(),
        dueTs: taskData.dueTs,
        urgent: taskData.urgent || false,
        status: taskData.status ?? TaskStatus.Active,
        pending: taskData.pending ?? false,
        pinnedAt: taskData.pinnedAt || undefined,
        remoteId: taskData.remoteId,
        completedTs: taskData.completedTs,
        createdTs: taskData.createdTs || Date.now(),
        updatedTs: taskData.updatedTs || Date.now(),
      });
      const newTask = Task.fromData(created);
      
      // Don't sync back to Supabase since this came from there
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
      await ensureDatabaseInitialized();
      const updated = await taskRepository.update(id, updates);
      if (!updated) {
        throw new Error('Task not found');
      }
      const updatedTask = Task.fromData(updated);
      
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
      await ensureDatabaseInitialized();
      
      // Cancel reminder before deleting task
      await reminderService.cancelReminder(id);
      
      // Get task to fetch remoteId before deletion
      const task = await taskRepository.findById(id);
      if (!task) return;
      
      const remoteId = task.remoteId;
      await taskRepository.delete(id);
      
      // Sync deletion to Supabase if not skipped
      if (!skipSync && remoteId) {
        await taskSyncService.deleteTaskFromSupabase(id, remoteId);
      }
      
      await get().fetchTasks();
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  toggleTaskStatus: async (id: string) => {
    try {
      await ensureDatabaseInitialized();
      const updated = await taskRepository.toggleStatus(id);
      if (!updated) return;
      
      const updatedTask = Task.fromData(updated);
      
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
      await ensureDatabaseInitialized();
      const updated = await taskRepository.update(id, { dueTs: newDueTs });
      if (!updated) return;
      
      const updatedTask = Task.fromData(updated);
      
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
      await ensureDatabaseInitialized();
      const updated = await taskRepository.togglePin(id);
      if (!updated) return;
      
      const updatedTask = Task.fromData(updated);
      
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
        task.dueTs !== undefined && task.dueTs !== null && task.dueTs <= weekFromNow
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
      await ensureDatabaseInitialized();
      const task = await taskRepository.findById(id);
      if (task && !task.pending) {
        return task;
      }
      return null;
    } catch (error) {
      console.error('Failed to get task by ID:', error);
      return null;
    }
  },

  findTaskByTitle: async (title: string) => {
    try {
      await ensureDatabaseInitialized();
      return await taskRepository.findByTitle(title);
    } catch (error) {
      console.error('Failed to find task by title:', error);
      return null;
    }
  },

  clearCompletedTasks: async () => {
    try {
      await ensureDatabaseInitialized();
      const completedTasks = await taskRepository.getTasksByStatus(TaskStatus.Completed);
      
      // Cancel reminders for all completed tasks before deleting
      for (const task of completedTasks) {
        await reminderService.cancelReminder(task.id);
      }
      
      // Delete all completed tasks
      await taskRepository.clearCompleted();
      
      // Sync deletions to Supabase
      for (const task of completedTasks) {
        if (task.remoteId) {
          await taskSyncService.deleteTaskFromSupabase(task.id, task.remoteId);
        }
      }
      
      await get().fetchTasks();
    } catch (error) {
      set({ error: (error as Error).message });
      console.error('Failed to clear completed tasks:', error);
    }
  },
  
  cleanupOldDoneTasks: async () => {
    try {
      await ensureDatabaseInitialized();
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      
      // Get all done tasks to check which ones are old
      const doneTasks = await taskRepository.getDoneTasks();
      const oldCompletedTasks = doneTasks.filter(task => 
        task.completedTs && task.completedTs < thirtyDaysAgo
      );
      
      if (oldCompletedTasks.length === 0) {
        console.log('No old completed tasks to cleanup');
        return;
      }
      
      console.log(`Cleaning up ${oldCompletedTasks.length} old completed tasks`);
      
      // Cancel reminders for old tasks before deleting
      for (const task of oldCompletedTasks) {
        await reminderService.cancelReminder(task.id);
      }
      
      // Delete old tasks using the repository method
      await taskRepository.cleanupOldDoneTasks();
      
      // Sync deletions to Supabase
      for (const task of oldCompletedTasks) {
        if (task.remoteId) {
          await taskSyncService.deleteTaskFromSupabase(task.id, task.remoteId);
        }
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