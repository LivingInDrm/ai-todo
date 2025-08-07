import { create } from 'zustand';
import { Q } from '@nozbe/watermelondb';
import database, { Task } from '../../db/database';
import { DraftTask, TaskStatus, VoiceOperation } from '../../lib/types';
import useTaskStore from '../task/taskStore';

interface DraftStore {
  drafts: DraftTask[];
  isExpanded: boolean;
  loading: boolean;
  lastConfirmedIds: string[];
  
  // Actions
  fetchDrafts: () => Promise<void>;
  addDrafts: (operations: VoiceOperation[]) => Promise<void>;
  addDraftTasks: (drafts: any[]) => Promise<void>;
  toggleDraftSelection: (id: string) => void;
  toggleAllSelection: () => void;
  confirmSelectedDrafts: () => Promise<{ added: number; completed: number }>;
  confirmDrafts: (selectedIds: string[]) => Promise<void>;
  rejectDrafts: (rejectedIds: string[]) => Promise<void>;
  confirmSingleDraft: (id: string) => Promise<void>;
  clearUnselectedDrafts: () => Promise<void>;
  toggleExpanded: () => void;
  undoLastOperation: (taskIds: string[]) => Promise<void>;
  undoLastConfirmation: () => Promise<void>;
}

const useDraftStore = create<DraftStore>((set, get) => ({
  drafts: [],
  isExpanded: true,
  loading: false,
  lastConfirmedIds: [],

  fetchDrafts: async () => {
    set({ loading: true });
    try {
      const drafts = await database.collections
        .get<Task>('tasks')
        .query(Q.where('pending', true))
        .fetch();
      
      const draftData: DraftTask[] = drafts.map(draft => ({
        id: draft.id,
        title: draft.title,
        dueTs: draft.dueTs,
        urgent: draft.urgent,
        status: draft.status,
        pending: draft.pending,
        completedTs: draft.completedTs,
        createdTs: draft.createdTs,
        updatedTs: draft.updatedTs,
        operation: 'add',
        selected: true,
      }));
      
      set({ drafts: draftData, loading: false });
    } catch (error) {
      console.error('Failed to fetch drafts:', error);
      set({ loading: false });
    }
  },

  addDrafts: async (operations: VoiceOperation[]) => {
    set({ loading: true });
    
    try {
      const newDrafts: DraftTask[] = [];
      
      await database.write(async () => {
        for (const op of operations.slice(0, 10)) { // Max 10 drafts
          if (op.action === 'add' && op.payload.title) {
            const task = await database.collections.get<Task>('tasks').create(t => {
              t.title = op.payload.title!;
              t.dueTs = op.payload.dueTs;
              t.urgent = op.payload.urgent || false;
              t.status = TaskStatus.Active;
              t.pending = true;
              t.createdTs = Date.now();
              t.updatedTs = Date.now();
            });
            
            newDrafts.push({
              id: task.id,
              title: task.title,
              dueTs: task.dueTs,
              urgent: task.urgent,
              status: task.status,
              pending: task.pending,
              completedTs: task.completedTs,
              createdTs: task.createdTs,
              updatedTs: task.updatedTs,
              operation: op.action,
              selected: true,
            });
          }
        }
      });
      
      const currentDrafts = get().drafts;
      set({ drafts: [...newDrafts, ...currentDrafts], loading: false, isExpanded: true });
    } catch (error) {
      console.error('Failed to add drafts:', error);
      set({ loading: false });
    }
  },

  addDraftTasks: async (drafts: any[]) => {
    set({ loading: true });
    
    try {
      const newDrafts: DraftTask[] = [];
      
      await database.write(async () => {
        for (const draft of drafts.slice(0, 10)) { // Max 10 drafts
          const task = await database.collections.get<Task>('tasks').create(t => {
            t.title = draft.title;
            t.dueTs = draft.due_ts || draft.dueTs;
            t.urgent = draft.urgent || false;
            t.status = draft.status || TaskStatus.Active;
            t.pending = true;
            t.createdTs = Date.now();
            t.updatedTs = Date.now();
          });
          
          newDrafts.push({
            id: task.id,
            title: task.title,
            dueTs: task.dueTs,
            urgent: task.urgent,
            status: task.status,
            pending: task.pending,
            completedTs: task.completedTs,
            createdTs: task.createdTs,
            updatedTs: task.updatedTs,
            operation: draft.action || 'add',
            selected: true,
          });
        }
      });
      
      const currentDrafts = get().drafts;
      set({ drafts: [...newDrafts, ...currentDrafts], loading: false, isExpanded: true });
    } catch (error) {
      console.error('Failed to add draft tasks:', error);
      set({ loading: false });
    }
  },

  confirmDrafts: async (selectedIds: string[]) => {
    const { drafts } = get();
    const selectedDrafts = drafts.filter(d => selectedIds.includes(d.id));
    const confirmedIds: string[] = [];
    
    try {
      await database.write(async () => {
        for (const draft of selectedDrafts) {
          const task = await database.collections.get<Task>('tasks').find(draft.id);
          await task.confirmDraft();
          confirmedIds.push(draft.id);
          
          if (draft.operation === 'complete') {
            await task.markAsCompleted();
          }
        }
      });
      
      const remainingDrafts = drafts.filter(d => !selectedIds.includes(d.id));
      set({ drafts: remainingDrafts, lastConfirmedIds: confirmedIds });
      await useTaskStore.getState().fetchTasks();
    } catch (error) {
      console.error('Failed to confirm drafts:', error);
      throw error;
    }
  },

  rejectDrafts: async (rejectedIds: string[]) => {
    try {
      await database.write(async () => {
        for (const id of rejectedIds) {
          const task = await database.collections.get<Task>('tasks').find(id);
          await task.markAsDeleted();
        }
      });
      
      const drafts = get().drafts.filter(d => !rejectedIds.includes(d.id));
      set({ drafts });
    } catch (error) {
      console.error('Failed to reject drafts:', error);
      throw error;
    }
  },

  undoLastConfirmation: async () => {
    const { lastConfirmedIds } = get();
    
    if (lastConfirmedIds.length === 0) {
      console.warn('No confirmation to undo');
      return;
    }
    
    try {
      await database.write(async () => {
        for (const id of lastConfirmedIds) {
          try {
            const task = await database.collections.get<Task>('tasks').find(id);
            await task.markAsDeleted();
          } catch {
            // Task might not exist, ignore
          }
        }
      });
      
      set({ lastConfirmedIds: [] });
      await useTaskStore.getState().fetchTasks();
    } catch (error) {
      console.error('Failed to undo last confirmation:', error);
      throw error;
    }
  },

  toggleDraftSelection: (id: string) => {
    const drafts = get().drafts.map(draft =>
      draft.id === id ? { ...draft, selected: !draft.selected } : draft
    );
    set({ drafts });
  },

  toggleAllSelection: () => {
    const drafts = get().drafts;
    const allSelected = drafts.every(d => d.selected);
    
    set({
      drafts: drafts.map(d => ({ ...d, selected: !allSelected }))
    });
  },

  confirmSelectedDrafts: async () => {
    const { drafts } = get();
    const selectedDrafts = drafts.filter(d => d.selected);
    const unselectedIds = drafts.filter(d => !d.selected).map(d => d.id);
    
    let added = 0;
    let completed = 0;
    
    try {
      await database.write(async () => {
        // Confirm selected drafts
        for (const draft of selectedDrafts) {
          const task = await database.collections.get<Task>('tasks').find(draft.id);
          await task.confirmDraft();
          
          if (draft.operation === 'complete') {
            await task.markAsCompleted();
            completed++;
          } else {
            added++;
          }
        }
        
        // Delete unselected drafts
        for (const id of unselectedIds) {
          const task = await database.collections.get<Task>('tasks').find(id);
          await task.markAsDeleted();
        }
      });
      
      set({ drafts: [] });
      await useTaskStore.getState().fetchTasks();
      
      return { added, completed };
    } catch (error) {
      console.error('Failed to confirm drafts:', error);
      throw error;
    }
  },

  confirmSingleDraft: async (id: string) => {
    try {
      await database.write(async () => {
        const task = await database.collections.get<Task>('tasks').find(id);
        await task.confirmDraft();
      });
      
      const drafts = get().drafts.filter(d => d.id !== id);
      set({ drafts });
      await useTaskStore.getState().fetchTasks();
    } catch (error) {
      console.error('Failed to confirm single draft:', error);
    }
  },

  clearUnselectedDrafts: async () => {
    const { drafts } = get();
    const unselectedIds = drafts.filter(d => !d.selected).map(d => d.id);
    
    try {
      await database.write(async () => {
        for (const id of unselectedIds) {
          const task = await database.collections.get<Task>('tasks').find(id);
          await task.markAsDeleted();
        }
      });
      
      set({ drafts: drafts.filter(d => d.selected) });
    } catch (error) {
      console.error('Failed to clear unselected drafts:', error);
    }
  },

  toggleExpanded: () => {
    set(state => ({ isExpanded: !state.isExpanded }));
  },

  undoLastOperation: async (taskIds: string[]) => {
    try {
      await database.write(async () => {
        for (const id of taskIds) {
          try {
            const task = await database.collections.get<Task>('tasks').find(id);
            await task.markAsDeleted();
          } catch {
            // Task might not exist, ignore
          }
        }
      });
      
      await useTaskStore.getState().fetchTasks();
    } catch (error) {
      console.error('Failed to undo operation:', error);
    }
  },
}));

export default useDraftStore;
export { useDraftStore as draftStore };