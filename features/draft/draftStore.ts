import { create } from 'zustand';
import { Q } from '@nozbe/watermelondb';
import database, { Task } from '../../db/database';
import { DraftTask, TaskStatus, VoiceOperation } from '../../lib/types';
import useTaskStore from '../task/taskStore';

interface DraftStore {
  drafts: DraftTask[];
  isExpanded: boolean;
  loading: boolean;
  
  // Actions
  fetchDrafts: () => Promise<void>;
  addDrafts: (operations: VoiceOperation[]) => Promise<void>;
  toggleDraftSelection: (id: string) => void;
  toggleAllSelection: () => void;
  confirmSelectedDrafts: () => Promise<{ added: number; completed: number }>;
  confirmSingleDraft: (id: string) => Promise<void>;
  clearUnselectedDrafts: () => Promise<void>;
  toggleExpanded: () => void;
  undoLastOperation: (taskIds: string[]) => Promise<void>;
}

const useDraftStore = create<DraftStore>((set, get) => ({
  drafts: [],
  isExpanded: true,
  loading: false,

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