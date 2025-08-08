import openai, { TaskOperation } from '../../services/openai';
import { draftStore } from '../draft/draftStore';
import { taskStore } from '../task/taskStore';
import { TaskStatus } from '../../lib/types';
import NetInfo from '@react-native-community/netinfo';

class VoiceFlow {
  private isProcessing = false;

  async processVoiceInput(audioUri: string): Promise<void> {
    if (this.isProcessing) {
      console.warn('Already processing voice input');
      return;
    }

    this.isProcessing = true;

    try {
      // Step 1: Transcribe audio to text
      const transcribedText = await openai.transcribeAudio(audioUri);
      
      if (!transcribedText) {
        throw new Error('No text recognized from audio');
      }

      // Step 2: Parse text to task operations using GPT-4o
      const operations = await openai.parseTaskOperations(transcribedText);
      
      if (operations.length === 0) {
        throw new Error('No tasks identified from input');
      }

      // Step 3: Create draft tasks (pending=true)
      await this.createDraftTasks(operations);

    } catch (error) {
      console.error('Voice flow error:', error);
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  private async createDraftTasks(operations: TaskOperation[]): Promise<void> {
    const draftTasks = [];

    for (const operation of operations) {
      switch (operation.action) {
        case 'add_todo':
          const draftTask = {
            title: operation.payload.title,
            due_ts: operation.payload.due_ts || null,
            urgent: operation.payload.urgent || false,
            status: TaskStatus.Active,
            pending: true, // Mark as draft
            action: 'add' as const,
          };
          draftTasks.push(draftTask);
          break;

        case 'update_todo':
          // For updates, we need to find the existing task and create a draft update
          if (operation.payload.id || operation.payload.title) {
            const existingTask = operation.payload.id 
              ? await taskStore.getState().getTaskById(operation.payload.id)
              : await taskStore.getState().findTaskByTitle(operation.payload.title);
            
            if (existingTask) {
              const updateDraft = {
                title: operation.payload.title || existingTask.title,
                due_ts: operation.payload.due_ts !== undefined 
                  ? operation.payload.due_ts 
                  : existingTask.dueTs,
                urgent: operation.payload.urgent !== undefined 
                  ? operation.payload.urgent
                  : existingTask.urgent,
                status: TaskStatus.Active,
                pending: true,
                action: 'update' as const,
                targetTaskId: existingTask.id, // Reference to the original task
              };
              draftTasks.push(updateDraft);
            }
          }
          break;

        case 'complete_todo':
          // For completion, find task by title or ID
          const taskToComplete = operation.payload.id 
            ? await taskStore.getState().getTaskById(operation.payload.id)
            : await taskStore.getState().findTaskByTitle(operation.payload.title);
          
          if (taskToComplete) {
            const completeDraft = {
              title: taskToComplete.title,
              due_ts: taskToComplete.dueTs,
              urgent: taskToComplete.urgent,
              status: TaskStatus.Active, // Keep as active in draft
              pending: true,
              action: 'complete' as const,
              targetTaskId: taskToComplete.id, // Reference to the original task
            };
            draftTasks.push(completeDraft);
          }
          break;

        case 'delete_todo':
          // For deletion, find task by title or ID
          const taskToDelete = operation.payload.id 
            ? await taskStore.getState().getTaskById(operation.payload.id)
            : await taskStore.getState().findTaskByTitle(operation.payload.title);
          
          if (taskToDelete) {
            const deleteDraft = {
              title: taskToDelete.title,
              due_ts: taskToDelete.dueTs,
              urgent: taskToDelete.urgent,
              status: TaskStatus.Active,
              pending: true,
              action: 'delete' as const,
              targetTaskId: taskToDelete.id, // Reference to the original task
            };
            draftTasks.push(deleteDraft);
          }
          break;
      }
    }

    // Add all draft tasks to the draft store
    if (draftTasks.length > 0) {
      await draftStore.getState().addDraftTasks(draftTasks);
    }
  }

  async confirmDrafts(selectedIds: string[]): Promise<void> {
    await draftStore.getState().confirmDrafts(selectedIds);
  }

  async rejectDrafts(rejectedIds: string[]): Promise<void> {
    await draftStore.getState().rejectDrafts(rejectedIds);
  }

  async undoLastConfirmation(): Promise<void> {
    await draftStore.getState().undoLastConfirmation();
  }

  async isAvailable(): Promise<boolean> {
    // Check if OpenAI is configured
    if (!openai.isConfigured()) {
      return false;
    }

    // Check network connectivity
    const netState = await NetInfo.fetch();
    return netState.isConnected === true && netState.isInternetReachable !== false;
  }
}

export default new VoiceFlow();