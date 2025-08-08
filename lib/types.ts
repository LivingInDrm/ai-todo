export interface TaskData {
  id: string;
  title: string;
  dueTs?: number;
  due_ts?: number; // Alternative naming for compatibility
  urgent: boolean;
  status: number;
  pending: boolean;
  completedTs?: number;
  completed_ts?: number; // Alternative naming for compatibility
  pinnedAt?: number;
  pinned_at?: number; // Alternative naming for compatibility
  createdTs: number;
  created_ts?: number; // Alternative naming for compatibility
  updatedTs: number;
  updated_ts?: number; // Alternative naming for compatibility
}

export enum TaskStatus {
  Active = 0,
  Completed = 1,
}

export enum TaskView {
  Focus = 'focus',
  Backlog = 'backlog',
  Done = 'done',
}

export interface VoiceOperation {
  action: 'add' | 'update' | 'complete' | 'delete';
  payload: {
    title?: string;
    id?: string;
    dueTs?: number;
    urgent?: boolean;
  };
}

export interface DraftTask extends TaskData {
  operation: VoiceOperation['action'];
  selected: boolean;
  targetTaskId?: string; // For update/complete/delete operations
}