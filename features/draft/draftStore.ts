import { create } from 'zustand';
import { Q } from '@nozbe/watermelondb';
import database, { Task } from '../../db/database';
import { DraftTask, TaskData, TaskStatus, VoiceOperation } from '../../lib/types';
import useTaskStore from '../task/taskStore';
import reminderService from '../notify/reminderService';
import { taskSyncService } from '../task/taskSync';

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
  lastConfirmationTime: number | null;
  
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
  lastConfirmationTime: null,

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
          
          // Set reminder for new active tasks with due dates
          if (draft.operation === 'add' && task.dueTs && task.status === TaskStatus.Active) {
            await reminderService.setReminder({
              id: task.id,
              title: task.title,
              dueTs: task.dueTs,
              due_ts: task.dueTs,
              urgent: task.urgent,
              status: task.status,
              pending: false,
              pinnedAt: task.pinnedAt,
              pinned_at: task.pinnedAt,
              completedTs: task.completedTs,
              completed_ts: task.completedTs,
              createdTs: task.createdTs,
              created_ts: task.createdTs,
              updatedTs: task.updatedTs,
              updated_ts: task.updatedTs
            });
          }
          
          // Sync to cloud after confirmation
          await taskSyncService.syncTaskToSupabase(task);
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
    const { lastUndoOperations, lastConfirmationTime } = get();
    
    if (lastUndoOperations.length === 0) {
      console.warn('No confirmation to undo');
      return;
    }
    
    // Check if undo is within 3 seconds
    if (lastConfirmationTime && Date.now() - lastConfirmationTime > 3000) {
      console.warn('Undo time window expired (3 seconds)');
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
      
      set({ lastConfirmedIds: [], lastUndoOperations: [], lastConfirmationTime: null });
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
            
            // Set reminder for new tasks with due dates
            if (task.dueTs && task.status === TaskStatus.Active) {
              await reminderService.setReminder({
                id: task.id,
                title: task.title,
                dueTs: task.dueTs,
                due_ts: task.dueTs,
                urgent: task.urgent,
                status: task.status,
                pending: false,
                pinnedAt: task.pinnedAt,
                pinned_at: task.pinnedAt,
                completedTs: task.completedTs,
                completed_ts: task.completedTs,
                createdTs: task.createdTs,
                created_ts: task.createdTs,
                updatedTs: task.updatedTs,
                updated_ts: task.updatedTs
              });
            }
            
            // Sync new task to cloud
            await taskSyncService.syncTaskToSupabase(task);
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
                
                // Update reminder if due date changed
                if (targetTask.dueTs !== prevUpdateState.dueTs) {
                  await reminderService.setReminder({
                    id: targetTask.id,
                    title: targetTask.title,
                    dueTs: targetTask.dueTs,
                    due_ts: targetTask.dueTs,
                    urgent: targetTask.urgent,
                    status: targetTask.status,
                    pending: false,
                    pinnedAt: targetTask.pinnedAt,
                    pinned_at: targetTask.pinnedAt,
                    completedTs: targetTask.completedTs,
                    completed_ts: targetTask.completedTs,
                    createdTs: targetTask.createdTs,
                    created_ts: targetTask.createdTs,
                    updatedTs: targetTask.updatedTs,
                    updated_ts: targetTask.updatedTs
                  });
                }
                
                // Sync updated task to cloud
                await taskSyncService.syncTaskToSupabase(targetTask);
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
                
                // Cancel reminder for completed task
                await reminderService.cancelReminder(targetTask.id);
                
                // Sync completed task to cloud
                await taskSyncService.syncTaskToSupabase(targetTask);
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
                
                // Cancel reminder for deleted task
                await reminderService.cancelReminder(targetTask.id);
                
                // Delete task from cloud
                await taskSyncService.deleteTaskFromSupabase(targetTask.id);
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
        lastUndoOperations: undoOperations,
        lastConfirmationTime: Date.now()
      });
      await useTaskStore.getState().fetchTasks();
      
      return { added, completed };
    } catch (error) {
      console.error('Failed to confirm drafts:', error);
      throw error;
    }
  },

  confirmSingleDraft: async (id: string) => {
    const { drafts } = get();
    const draft = drafts.find(d => d.id === id);
    
    if (!draft) return;
    
    const undoOperations: UndoOperation[] = [];
    
    try {
      await database.write(async () => {
        if (draft.operation === 'add') {
          // For add operations, confirm the draft task itself
          const task = await database.collections.get<Task>('tasks').find(draft.id);
          await task.confirmDraft();
          undoOperations.push({ type: 'add', taskId: draft.id });
          
          // Set reminder for new tasks with due dates
          if (task.dueTs && task.status === TaskStatus.Active) {
            await reminderService.setReminder({
              id: task.id,
              title: task.title,
              dueTs: task.dueTs,
              due_ts: task.dueTs,
              urgent: task.urgent,
              status: task.status,
              pending: false,
              pinnedAt: task.pinnedAt,
              pinned_at: task.pinnedAt,
              completedTs: task.completedTs,
              completed_ts: task.completedTs,
              createdTs: task.createdTs,
              created_ts: task.createdTs,
              updatedTs: task.updatedTs,
              updated_ts: task.updatedTs
            });
          }
          
          // Sync new task to cloud
          await taskSyncService.syncTaskToSupabase(task);
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
              undoOperations.push({ 
                type: 'update', 
                taskId: draft.targetTaskId,
                previousState: prevUpdateState
              });
              
              // Update reminder if due date changed
              if (targetTask.dueTs !== prevUpdateState.dueTs) {
                await reminderService.setReminder({
                  id: targetTask.id,
                  title: targetTask.title,
                  dueTs: targetTask.dueTs,
                  due_ts: targetTask.dueTs,
                  urgent: targetTask.urgent,
                  status: targetTask.status,
                  pending: false,
                  pinnedAt: targetTask.pinnedAt,
                  pinned_at: targetTask.pinnedAt,
                  completedTs: targetTask.completedTs,
                  completed_ts: targetTask.completedTs,
                  createdTs: targetTask.createdTs,
                  created_ts: targetTask.createdTs,
                  updatedTs: targetTask.updatedTs,
                  updated_ts: targetTask.updatedTs
                });
              }
              
              // Sync updated task to cloud
              await taskSyncService.syncTaskToSupabase(targetTask);
              break;
              
            case 'complete':
              // Store previous state for undo
              const prevCompleteState = {
                status: targetTask.status,
                completedTs: targetTask.completedTs,
              };
              
              await targetTask.markAsCompleted();
              undoOperations.push({ 
                type: 'complete', 
                taskId: draft.targetTaskId,
                previousState: prevCompleteState
              });
              
              // Cancel reminder for completed task
              await reminderService.cancelReminder(targetTask.id);
              
              // Sync completed task to cloud
              await taskSyncService.syncTaskToSupabase(targetTask);
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
              undoOperations.push({ 
                type: 'delete', 
                taskId: draft.targetTaskId,
                previousState: prevDeleteState
              });
              
              // Cancel reminder for deleted task
              await reminderService.cancelReminder(targetTask.id);
              
              // Delete task from cloud
              await taskSyncService.deleteTaskFromSupabase(targetTask.id);
              break;
          }
          
          // Delete the draft after processing
          const draftTask = await database.collections.get<Task>('tasks').find(draft.id);
          await draftTask.markAsDeleted();
        }
      });
      
      const remainingDrafts = drafts.filter(d => d.id !== id);
      set({ 
        drafts: remainingDrafts,
        lastConfirmedIds: [id],
        lastUndoOperations: undoOperations,
        lastConfirmationTime: Date.now()
      });
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