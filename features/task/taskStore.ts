import { create } from 'zustand';
import { Q } from '@nozbe/watermelondb';
import database, { Task } from '../../db/database';
import { TaskData, TaskStatus, TaskView } from '../../lib/types';

interface TaskStore {
  tasks: TaskData[];
  loading: boolean;
  error: string | null;
  currentView: TaskView;
  
  // Actions
  fetchTasks: () => Promise<void>;
  createTask: (title: string, dueTs?: number, urgent?: boolean) => Promise<Task>;
  updateTask: (id: string, updates: Partial<TaskData>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
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

  createTask: async (title: string, dueTs?: number, urgent = false) => {
    // Validate title is not empty
    if (!title || title.trim() === '') {
      const error = new Error('Task title cannot be empty');
      set({ error: error.message });
      throw error;
    }
    
    try {
      const newTask = await database.write(async () => {
        return await database.collections.get<Task>('tasks').create(task => {
          task.title = title.trim();
          task.dueTs = dueTs;
          task.urgent = urgent;
          task.status = TaskStatus.Active;
          task.pending = false;
          task.createdTs = Date.now();
          task.updatedTs = Date.now();
        });
      });
      
      await get().fetchTasks();
      return newTask;
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  updateTask: async (id: string, updates: Partial<TaskData>) => {
    try {
      await database.write(async () => {
        const task = await database.collections.get<Task>('tasks').find(id);
        await task.update(t => {
          if (updates.title !== undefined) t.title = updates.title;
          if (updates.dueTs !== undefined) t.dueTs = updates.dueTs;
          if (updates.urgent !== undefined) t.urgent = updates.urgent;
          if (updates.status !== undefined) t.status = updates.status;
          if (updates.completedTs !== undefined) t.completedTs = updates.completedTs;
          t.updatedTs = Date.now();
        });
      });
      
      await get().fetchTasks();
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  deleteTask: async (id: string) => {
    try {
      await database.write(async () => {
        const task = await database.collections.get<Task>('tasks').find(id);
        await task.markAsDeleted();
      });
      
      await get().fetchTasks();
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  toggleTaskStatus: async (id: string) => {
    try {
      await database.write(async () => {
        const task = await database.collections.get<Task>('tasks').find(id);
        if (task.isCompleted) {
          await task.markAsActive();
        } else {
          await task.markAsCompleted();
        }
      });
      
      await get().fetchTasks();
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  postponeTask: async (id: string, newDueTs: number) => {
    try {
      await database.write(async () => {
        const task = await database.collections.get<Task>('tasks').find(id);
        await task.postpone(newDueTs);
      });
      
      await get().fetchTasks();
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  pinTask: async (id: string) => {
    try {
      await database.write(async () => {
        const task = await database.collections.get<Task>('tasks').find(id);
        await task.togglePin();
      });
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
        // Pinned items first, sorted by pin time (newest pins first)
        if (a.pinnedAt && b.pinnedAt) return b.pinnedAt - a.pinnedAt;
        if (a.pinnedAt) return -1;
        if (b.pinnedAt) return 1;
        // Then by creation time (newest first)
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
}));

export default useTaskStore;
export { useTaskStore as taskStore };