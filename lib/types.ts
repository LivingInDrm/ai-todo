export interface TaskData {
  id: string;
  title: string;
  dueTs?: number;
  urgent: boolean;
  status: number;
  pending: boolean;
  completedTs?: number;
  createdTs: number;
  updatedTs: number;
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
}