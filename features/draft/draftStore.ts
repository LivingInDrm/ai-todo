import { create } from 'zustand';
import { Q } from '@nozbe/watermelondb';
import database, { Task } from '../../db/database';
import { DraftTask, TaskData, TaskStatus, VoiceOperation } from '../../lib/types';
import useTaskStore from '../task/taskStore';

interface UndoOperation {
  type: 'add' | 'update' | 'complete' | 'delete';
  taskId: string;
  previousState?: Partial<TaskData>; // For update/complete operations
}

interface DraftStore {
  drafts: DraftTask[];
  isExpanded: boolean;
  loading: boolean;
  lastConfirmedIds: string[];
  lastUndoOperations: UndoOperation[];
  
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
  lastUndoOperations: [],

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
          // Only create new tasks for 'add' operations or drafts without targetTaskId
          if (draft.action === 'add' || !draft.targetTaskId) {
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
              targetTaskId: draft.targetTaskId,
            });
          } else {
            // For update/complete/delete operations, create a lightweight draft record
            const task = await database.collections.get<Task>('tasks').create(t => {
              t.title = `[${draft.action}] ${draft.title}`;
              t.dueTs = draft.due_ts || draft.dueTs;
              t.urgent = draft.urgent || false;
              t.status = TaskStatus.Active;
              t.pending = true;
              t.createdTs = Date.now();
              t.updatedTs = Date.now();
            });
            
            newDrafts.push({
              id: task.id,
              title: draft.title, // Keep original title for display
              dueTs: draft.dueTs,
              urgent: draft.urgent,
              status: draft.status || TaskStatus.Active,
              pending: true,
              completedTs: undefined,
              createdTs: task.createdTs,
              updatedTs: task.updatedTs,
              operation: draft.action,
              selected: true,
              targetTaskId: draft.targetTaskId,
            });
          }
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
    const undoOperations: UndoOperation[] = [];
    
    try {
      await database.write(async () => {
        for (const draft of selectedDrafts) {
          const task = await database.collections.get<Task>('tasks').find(draft.id);
          await task.confirmDraft();
          confirmedIds.push(draft.id);
          
          // Track undo operation for add
          undoOperations.push({ type: 'add', taskId: draft.id });
          
          if (draft.operation === 'complete') {
            await task.markAsCompleted();
          } else if (draft.operation === 'delete') {
            // Handle delete operation
            await task.markAsDeleted();
          }
        }
      });
      
      const remainingDrafts = drafts.filter(d => !selectedIds.includes(d.id));
      set({ 
        drafts: remainingDrafts, 
        lastConfirmedIds: confirmedIds,
        lastUndoOperations: undoOperations
      });
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
    const { lastUndoOperations } = get();
    
    if (lastUndoOperations.length === 0) {
      console.warn('No confirmation to undo');
      return;
    }
    
    try {
      await database.write(async () => {
        for (const op of lastUndoOperations) {
          try {
            switch (op.type) {
              case 'add':
                // Delete the newly added task
                const addedTask = await database.collections.get<Task>('tasks').find(op.taskId);
                await addedTask.markAsDeleted();
                break;
                
              case 'update':
                // Restore previous values
                if (op.previousState) {
                  const updatedTask = await database.collections.get<Task>('tasks').find(op.taskId);
                  await updatedTask.update(t => {
                    if (op.previousState!.title !== undefined) t.title = op.previousState!.title;
                    if (op.previousState!.dueTs !== undefined) t.dueTs = op.previousState!.dueTs;
                    if (op.previousState!.urgent !== undefined) t.urgent = op.previousState!.urgent;
                    t.updatedTs = Date.now();
                  });
                }
                break;
                
              case 'complete':
                // Restore to active state
                if (op.previousState) {
                  const completedTask = await database.collections.get<Task>('tasks').find(op.taskId);
                  await completedTask.update(t => {
                    t.status = TaskStatus.Active;
                    t.completedTs = undefined;
                    t.updatedTs = Date.now();
                  });
                }
                break;
                
              case 'delete':
                // Recreate the deleted task
                if (op.previousState) {
                  await database.collections.get<Task>('tasks').create(t => {
                    // Recreate with new ID but preserve original data
                    t.title = op.previousState!.title!;
                    t.dueTs = op.previousState!.dueTs;
                    t.urgent = op.previousState!.urgent || false;
                    t.status = op.previousState!.status || TaskStatus.Active;
                    t.pending = false;
                    t.completedTs = op.previousState!.completedTs;
                    t.pinnedAt = op.previousState!.pinnedAt;
                    t.createdTs = op.previousState!.createdTs || Date.now();
                    t.updatedTs = Date.now();
                  });
                }
                break;
            }
          } catch (error) {
            console.error(`Failed to undo operation for task ${op.taskId}:`, error);
          }
        }
      });
      
      set({ lastConfirmedIds: [], lastUndoOperations: [] });
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
    const confirmedIds: string[] = [];
    const undoOperations: UndoOperation[] = [];
    
    let added = 0;
    let completed = 0;
    let updated = 0;
    let deleted = 0;
    
    try {
      await database.write(async () => {
        // Confirm selected drafts
        for (const draft of selectedDrafts) {
          if (draft.operation === 'add') {
            // For add operations, confirm the draft task itself
            const task = await database.collections.get<Task>('tasks').find(draft.id);
            await task.confirmDraft();
            confirmedIds.push(draft.id);
            undoOperations.push({ type: 'add', taskId: draft.id });
            added++;
          } else if (draft.targetTaskId) {
            // For update/complete/delete, operate on the target task
            const targetTask = await database.collections.get<Task>('tasks').find(draft.targetTaskId);
            
            switch (draft.operation) {
              case 'update':
                // Store previous state for undo
                const prevUpdateState = {
                  title: targetTask.title,
                  dueTs: targetTask.dueTs,
                  urgent: targetTask.urgent,
                };
                
                await targetTask.update(t => {
                  t.title = draft.title;
                  t.dueTs = draft.dueTs;
                  t.urgent = draft.urgent;
                  t.updatedTs = Date.now();
                });
                updated++;
                undoOperations.push({ 
                  type: 'update', 
                  taskId: draft.targetTaskId,
                  previousState: prevUpdateState
                });
                break;
                
              case 'complete':
                // Store previous state for undo
                const prevCompleteState = {
                  status: targetTask.status,
                  completedTs: targetTask.completedTs,
                };
                
                await targetTask.markAsCompleted();
                completed++;
                undoOperations.push({ 
                  type: 'complete', 
                  taskId: draft.targetTaskId,
                  previousState: prevCompleteState
                });
                break;
                
              case 'delete':
                // Store full task state for potential restore
                const prevDeleteState = {
                  title: targetTask.title,
                  dueTs: targetTask.dueTs,
                  urgent: targetTask.urgent,
                  status: targetTask.status,
                  pending: targetTask.pending,
                  completedTs: targetTask.completedTs,
                  pinnedAt: targetTask.pinnedAt,
                  createdTs: targetTask.createdTs,
                  updatedTs: targetTask.updatedTs,
                };
                
                await targetTask.markAsDeleted();
                deleted++;
                undoOperations.push({ 
                  type: 'delete', 
                  taskId: draft.targetTaskId,
                  previousState: prevDeleteState
                });
                break;
            }
            
            // Delete the draft after processing
            const draftTask = await database.collections.get<Task>('tasks').find(draft.id);
            await draftTask.markAsDeleted();
          }
        }
        
        // Delete unselected drafts
        for (const id of unselectedIds) {
          const task = await database.collections.get<Task>('tasks').find(id);
          await task.markAsDeleted();
        }
      });
      
      // Store undo operations for proper reversal
      set({ 
        drafts: [], 
        lastConfirmedIds: confirmedIds,
        lastUndoOperations: undoOperations
      });
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