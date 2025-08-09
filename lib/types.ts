export interface TaskData {
  id: string;
  title: string;
  dueTs?: number;
  urgent: boolean;
  status: number;
  pending: boolean;
  completedTs?: number | null;
  pinnedAt?: number | null;
  remoteId?: string; // Supabase ID for sync
  createdTs: number;
  updatedTs: number;
  // Legacy field names for compatibility with Supabase (snake_case)
  // These are only used internally for database sync, not in the app logic
  due_ts?: number;
  completed_ts?: number;
  pinned_at?: number;
  created_ts?: number;
  updated_ts?: number;
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