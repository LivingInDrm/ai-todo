import { create } from 'zustand';
import database, { Task, taskRepository } from '../../db/database';
import { ensureDatabaseInitialized } from '../../db/database';
import { withTransaction } from '../../db/sqliteDatabase';
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
      await ensureDatabaseInitialized();
      const drafts = await taskRepository.getDraftTasks();
      
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
      await ensureDatabaseInitialized();
      const newDrafts: DraftTask[] = [];
      
      for (const op of operations.slice(0, 10)) { // Max 10 drafts
        if (op.action === 'add' && op.payload.title) {
          const created = await taskRepository.create({
            title: op.payload.title!,
            dueTs: op.payload.dueTs,
            urgent: op.payload.urgent || false,
            status: TaskStatus.Active,
            pending: true,
            createdTs: Date.now(),
            updatedTs: Date.now(),
          });
          
          newDrafts.push({
            id: created.id,
            title: created.title,
            dueTs: created.dueTs,
            urgent: created.urgent,
            status: created.status,
            pending: created.pending,
            completedTs: created.completedTs,
            createdTs: created.createdTs,
            updatedTs: created.updatedTs,
            operation: op.action,
            selected: true,
          });
        }
      }
      
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
      await ensureDatabaseInitialized();
      const newDrafts: DraftTask[] = [];
      
      for (const draft of drafts.slice(0, 10)) { // Max 10 drafts
        // Only create new tasks for 'add' operations or drafts without targetTaskId
        if (draft.action === 'add' || !draft.targetTaskId) {
          const created = await taskRepository.create({
            title: draft.title,
            dueTs: draft.due_ts || draft.dueTs,
            urgent: draft.urgent || false,
            status: draft.status || TaskStatus.Active,
            pending: true,
            createdTs: Date.now(),
            updatedTs: Date.now(),
          });
          
          newDrafts.push({
            id: created.id,
            title: created.title,
            dueTs: created.dueTs,
            urgent: created.urgent,
            status: created.status,
            pending: created.pending,
            completedTs: created.completedTs,
            createdTs: created.createdTs,
            updatedTs: created.updatedTs,
            operation: draft.action || 'add',
            selected: true,
            targetTaskId: draft.targetTaskId,
          });
        } else {
          // For update/complete/delete operations, create a lightweight draft record
          const created = await taskRepository.create({
            title: `[${draft.action}] ${draft.title}`,
            dueTs: draft.due_ts || draft.dueTs,
            urgent: draft.urgent || false,
            status: TaskStatus.Active,
            pending: true,
            createdTs: Date.now(),
            updatedTs: Date.now(),
          });
          
          newDrafts.push({
            id: created.id,
            title: draft.title, // Keep original title for display
            dueTs: draft.dueTs,
            urgent: draft.urgent,
            status: draft.status || TaskStatus.Active,
            pending: true,
            completedTs: undefined,
            createdTs: created.createdTs,
            updatedTs: created.updatedTs,
            operation: draft.action,
            selected: true,
            targetTaskId: draft.targetTaskId,
          });
        }
      }
      
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
      await ensureDatabaseInitialized();
      
      // Use transaction for atomic batch confirmation
      await withTransaction(async () => {
        for (const draft of selectedDrafts) {
          await taskRepository.confirmDraft(draft.id);
          confirmedIds.push(draft.id);
          
          // Track undo operation for add
          undoOperations.push({ type: 'add', taskId: draft.id });
          
          if (draft.operation === 'complete') {
            await taskRepository.update(draft.id, {
              status: TaskStatus.Completed,
              completedTs: Date.now(),
            });
          } else if (draft.operation === 'delete') {
            // Handle delete operation
            await taskRepository.delete(draft.id);
          }
        }
      });
      
      // Set reminders after transaction succeeds
      for (const draft of selectedDrafts) {
        // Set reminder for new active tasks with due dates
        if (draft.operation === 'add' && draft.dueTs && draft.status === TaskStatus.Active) {
          await reminderService.setReminder({
            id: draft.id,
            title: draft.title,
            dueTs: draft.dueTs,
            due_ts: draft.dueTs,
            urgent: draft.urgent,
            status: draft.status,
            pending: false,
            pinnedAt: 0,
            pinned_at: 0,
            completedTs: draft.completedTs,
            completed_ts: draft.completedTs,
            createdTs: draft.createdTs,
            created_ts: draft.createdTs,
            updatedTs: draft.updatedTs,
            updated_ts: draft.updatedTs
          });
        }
        
        // Sync to cloud after confirmation
        const task = await taskRepository.findById(draft.id);
        if (task) {
          await taskSyncService.syncTaskToSupabase(Task.fromData(task));
        }
      }
      
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
      await ensureDatabaseInitialized();
      await taskRepository.deleteMany(rejectedIds);
      
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
      await ensureDatabaseInitialized();
      
      // Use transaction for atomic undo operations
      await withTransaction(async () => {
        for (const op of lastUndoOperations) {
          switch (op.type) {
            case 'add':
              // Delete the newly added task
              await taskRepository.delete(op.taskId);
              break;
              
            case 'update':
              // Restore previous values
              if (op.previousState) {
                await taskRepository.update(op.taskId, op.previousState);
              }
              break;
              
            case 'complete':
              // Restore to active state
              if (op.previousState) {
                await taskRepository.update(op.taskId, {
                  status: TaskStatus.Active,
                  completedTs: null,
                });
              }
              break;
              
            case 'delete':
              // Recreate the deleted task
              if (op.previousState) {
                await taskRepository.create({
                  title: op.previousState.title!,
                  dueTs: op.previousState.dueTs,
                  urgent: op.previousState.urgent || false,
                  status: op.previousState.status || TaskStatus.Active,
                  pending: false,
                  completedTs: op.previousState.completedTs,
                  pinnedAt: op.previousState.pinnedAt,
                  createdTs: op.previousState.createdTs || Date.now(),
                  updatedTs: Date.now(),
                });
              }
              break;
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