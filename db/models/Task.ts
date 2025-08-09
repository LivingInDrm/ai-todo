import { TaskData, TaskStatus } from '../../lib/types';
import { taskRepository } from '../repositories/taskRepository';

/**
 * Task model class that provides a similar interface to the old WatermelonDB model
 * but uses the TaskRepository for database operations
 */
export default class Task implements TaskData {
  id: string;
  title: string;
  dueTs?: number | null;
  urgent: boolean;
  status: number;
  pending: boolean;
  completedTs?: number | null;
  pinnedAt?: number | null;
  remoteId?: string;
  createdTs: number;
  updatedTs: number;
  
  constructor(data: TaskData) {
    this.id = data.id;
    this.title = data.title;
    this.dueTs = data.dueTs;
    this.urgent = data.urgent;
    this.status = data.status;
    this.pending = data.pending;
    this.completedTs = data.completedTs;
    this.pinnedAt = data.pinnedAt;
    this.remoteId = data.remoteId;
    this.createdTs = data.createdTs;
    this.updatedTs = data.updatedTs;
  }
  
  get isCompleted(): boolean {
    return this.status === TaskStatus.Completed;
  }
  
  get isActive(): boolean {
    return this.status === TaskStatus.Active;
  }
  
  get isDraft(): boolean {
    return this.pending;
  }
  
  get isOverdue(): boolean {
    if (!this.dueTs || this.isCompleted) return false;
    return this.dueTs < Date.now();
  }
  
  get isToday(): boolean {
    if (!this.dueTs) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return this.dueTs >= today.getTime() && this.dueTs < tomorrow.getTime();
  }
  
  get isWithinWeek(): boolean {
    if (!this.dueTs) return false;
    const now = Date.now();
    const weekFromNow = now + (7 * 24 * 60 * 60 * 1000);
    return this.dueTs >= now && this.dueTs <= weekFromNow;
  }
  
  async markAsCompleted(): Promise<void> {
    const updated = await taskRepository.update(this.id, {
      status: TaskStatus.Completed,
      completedTs: Date.now(),
    });
    
    if (updated) {
      this.status = updated.status;
      this.completedTs = updated.completedTs;
      this.updatedTs = updated.updatedTs;
    }
  }
  
  async markAsActive(): Promise<void> {
    const updated = await taskRepository.update(this.id, {
      status: TaskStatus.Active,
      completedTs: undefined,
    });
    
    if (updated) {
      this.status = updated.status;
      this.completedTs = updated.completedTs;
      this.updatedTs = updated.updatedTs;
    }
  }
  
  async toggleUrgent(): Promise<void> {
    const updated = await taskRepository.toggleUrgent(this.id);
    
    if (updated) {
      this.urgent = updated.urgent;
      this.updatedTs = updated.updatedTs;
    }
  }
  
  async confirmDraft(): Promise<void> {
    const updated = await taskRepository.confirmDraft(this.id);
    
    if (updated) {
      this.pending = updated.pending;
      this.updatedTs = updated.updatedTs;
    }
  }
  
  async postpone(newDueTs: number): Promise<void> {
    const updated = await taskRepository.update(this.id, {
      dueTs: newDueTs,
    });
    
    if (updated) {
      this.dueTs = updated.dueTs;
      this.updatedTs = updated.updatedTs;
    }
  }
  
  async pin(): Promise<void> {
    const updated = await taskRepository.update(this.id, {
      pinnedAt: Date.now(),
    });
    
    if (updated) {
      this.pinnedAt = updated.pinnedAt;
      this.updatedTs = updated.updatedTs;
    }
  }
  
  async unpin(): Promise<void> {
    const updated = await taskRepository.update(this.id, {
      pinnedAt: undefined,
    });
    
    if (updated) {
      this.pinnedAt = updated.pinnedAt;
      this.updatedTs = updated.updatedTs;
    }
  }
  
  async togglePin(): Promise<void> {
    const updated = await taskRepository.togglePin(this.id);
    
    if (updated) {
      this.pinnedAt = updated.pinnedAt;
      this.updatedTs = updated.updatedTs;
    }
  }
  
  async update(fn: (task: Task) => void): Promise<void> {
    // Apply the update function to this instance
    fn(this);
    
    // Update in database
    const updated = await taskRepository.update(this.id, {
      title: this.title,
      dueTs: this.dueTs,
      urgent: this.urgent,
      status: this.status,
      pending: this.pending,
      completedTs: this.completedTs,
      pinnedAt: this.pinnedAt,
      remoteId: this.remoteId,
    });
    
    if (updated) {
      this.updatedTs = updated.updatedTs;
    }
  }
  
  async markAsDeleted(): Promise<void> {
    await taskRepository.delete(this.id);
  }
  
  /**
   * Static method to create a Task instance from TaskData
   */
  static fromData(data: TaskData): Task {
    return new Task(data);
  }
}