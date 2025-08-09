import { TaskData, TaskStatus } from '../../../lib/types';
import { generateId } from '../../sqliteDatabase';

// Mock task repository for testing
class MockTaskRepository {
  private tasks: TaskData[] = [];
  
  async create(data: Partial<TaskData>): Promise<TaskData> {
    const task: TaskData = {
      id: data.id || generateId(),
      title: data.title || '',
      dueTs: data.dueTs,
      urgent: data.urgent ?? false,
      status: data.status ?? TaskStatus.Active,
      pending: data.pending ?? false,
      completedTs: data.completedTs,
      pinnedAt: data.pinnedAt,
      remoteId: data.remoteId,
      createdTs: data.createdTs || Date.now(),
      updatedTs: data.updatedTs || Date.now(),
    };
    
    this.tasks.push(task);
    return task;
  }
  
  async findById(id: string): Promise<TaskData | null> {
    return this.tasks.find(t => t.id === id) || null;
  }
  
  async update(id: string, data: Partial<TaskData>): Promise<boolean> {
    const index = this.tasks.findIndex(t => t.id === id);
    if (index >= 0) {
      this.tasks[index] = { ...this.tasks[index], ...data, updatedTs: Date.now() };
      return true;
    }
    return false;
  }
  
  async delete(id: string): Promise<boolean> {
    const index = this.tasks.findIndex(t => t.id === id);
    if (index >= 0) {
      this.tasks.splice(index, 1);
      return true;
    }
    return false;
  }
  
  async deleteMany(ids: string[]): Promise<number> {
    let deleted = 0;
    for (const id of ids) {
      if (await this.delete(id)) deleted++;
    }
    return deleted;
  }
  
  async getAllTasks(): Promise<TaskData[]> {
    return this.tasks.filter(t => !t.pending);
  }
  
  async getActiveTasks(): Promise<TaskData[]> {
    return this.tasks.filter(t => t.status === TaskStatus.Active && !t.pending);
  }
  
  async getCompletedTasks(): Promise<TaskData[]> {
    return this.tasks.filter(t => t.status === TaskStatus.Completed);
  }
  
  async getDraftTasks(): Promise<TaskData[]> {
    return this.tasks.filter(t => t.pending);
  }
  
  async getFocusTasks(): Promise<TaskData[]> {
    const now = Date.now();
    const weekFromNow = now + (7 * 24 * 60 * 60 * 1000);
    return this.tasks.filter(t => 
      !t.pending && 
      t.status === TaskStatus.Active && 
      t.dueTs && t.dueTs <= weekFromNow
    ).sort((a, b) => (a.dueTs || 0) - (b.dueTs || 0));
  }
  
  async getBacklogTasks(): Promise<TaskData[]> {
    const now = Date.now();
    const weekFromNow = now + (7 * 24 * 60 * 60 * 1000);
    return this.tasks.filter(t => 
      !t.pending && 
      t.status === TaskStatus.Active && 
      (!t.dueTs || t.dueTs > weekFromNow)
    ).sort((a, b) => b.createdTs - a.createdTs);
  }
  
  async getDoneTasks(): Promise<TaskData[]> {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    return this.tasks.filter(t => 
      t.status === TaskStatus.Completed && 
      (t.completedTs || 0) >= thirtyDaysAgo
    ).sort((a, b) => (b.completedTs || 0) - (a.completedTs || 0));
  }
  
  async clearCompleted(): Promise<number> {
    const completed = this.tasks.filter(t => t.status === TaskStatus.Completed);
    this.tasks = this.tasks.filter(t => t.status !== TaskStatus.Completed);
    return completed.length;
  }
  
  async findExisting(title: string): Promise<TaskData | null> {
    return this.tasks.find(t => t.title === title && !t.pending) || null;
  }
  
  async searchByTitle(searchTerm: string): Promise<TaskData | null> {
    return this.tasks.find(t => t.title.includes(searchTerm) && !t.pending) || null;
  }
  
  async findByRemoteId(remoteId: string): Promise<TaskData | null> {
    return this.tasks.find(t => t.remoteId === remoteId) || null;
  }
  
  reset(): void {
    this.tasks = [];
  }
}

// Export singleton instance
export const taskRepository = new MockTaskRepository();