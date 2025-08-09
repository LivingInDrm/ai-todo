import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export default class Task extends Model {
  static table = 'tasks';

  @field('title') title!: string;
  @field('due_ts') dueTs?: number;
  @field('urgent') urgent!: boolean;
  @field('status') status!: number; // 0: active, 1: completed
  @field('pending') pending!: boolean; // false: normal, true: draft
  @field('completed_ts') completedTs?: number;
  @field('pinned_at') pinnedAt?: number;
  @field('remote_id') remoteId?: string; // Supabase ID for sync
  @readonly @date('created_ts') createdTs!: number;
  @date('updated_ts') updatedTs!: number;

  get isCompleted(): boolean {
    return this.status === 1;
  }

  get isActive(): boolean {
    return this.status === 0;
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

  async markAsCompleted() {
    await this.update((task) => {
      task.status = 1;
      task.completedTs = Date.now();
      task.updatedTs = Date.now();
    });
  }

  async markAsActive() {
    await this.update((task) => {
      task.status = 0;
      task.completedTs = undefined;
      task.updatedTs = Date.now();
    });
  }

  async toggleUrgent() {
    await this.update((task) => {
      task.urgent = !task.urgent;
      task.updatedTs = Date.now();
    });
  }

  async confirmDraft() {
    await this.update((task) => {
      task.pending = false;
      task.updatedTs = Date.now();
    });
  }

  async postpone(newDueTs: number) {
    await this.update((task) => {
      task.dueTs = newDueTs;
      task.updatedTs = Date.now();
    });
  }

  async pin() {
    await this.update((task) => {
      task.pinnedAt = Date.now();
      task.updatedTs = Date.now();
    });
  }

  async unpin() {
    await this.update((task) => {
      task.pinnedAt = undefined;
      task.updatedTs = Date.now();
    });
  }

  async togglePin() {
    await this.update((task) => {
      task.pinnedAt = task.pinnedAt ? undefined : Date.now();
      task.updatedTs = Date.now();
    });
  }
}