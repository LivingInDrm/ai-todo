import { TaskData, TaskStatus } from '../../lib/types';

// Simple mock task repository for testing
class MockTaskRepository {
  private tasks: Map<string, TaskData> = new Map();
  private idCounter = 1;
  
  generateId(): string {
    return `test-task-${this.idCounter++}`;
  }
  
  async create(data: Partial<TaskData>): Promise<TaskData> {
    const task: TaskData = {
      id: data.id || this.generateId(),
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
    
    this.tasks.set(task.id, task);
    return task;
  }
  
  async findById(id: string): Promise<TaskData | null> {
    return this.tasks.get(id) || null;
  }
  
  async update(id: string, data: Partial<TaskData>): Promise<boolean> {
    const task = this.tasks.get(id);
    if (task) {
      const updated = { ...task, ...data, updatedTs: Date.now() };
      this.tasks.set(id, updated);
      return true;
    }
    return false;
  }
  
  async delete(id: string): Promise<boolean> {
    return this.tasks.delete(id);
  }
  
  async deleteMany(ids: string[]): Promise<number> {
    let deleted = 0;
    for (const id of ids) {
      if (this.tasks.delete(id)) deleted++;
    }
    return deleted;
  }
  
  async getAllTasks(): Promise<TaskData[]> {
    return Array.from(this.tasks.values()).filter(t => !t.pending);
  }
  
  async getActiveTasks(): Promise<TaskData[]> {
    return Array.from(this.tasks.values()).filter(t => t.status === TaskStatus.Active && !t.pending);
  }
  
  async getCompletedTasks(): Promise<TaskData[]> {
    return Array.from(this.tasks.values()).filter(t => t.status === TaskStatus.Completed);
  }
  
  async getDraftTasks(): Promise<TaskData[]> {
    return Array.from(this.tasks.values()).filter(t => t.pending);
  }
  
  async getFocusTasks(): Promise<TaskData[]> {
    const now = Date.now();
    const weekFromNow = now + (7 * 24 * 60 * 60 * 1000);
    return Array.from(this.tasks.values())
      .filter(t => 
        !t.pending && 
        t.status === TaskStatus.Active && 
        t.dueTs && t.dueTs <= weekFromNow
      )
      .sort((a, b) => (a.dueTs || 0) - (b.dueTs || 0));
  }
  
  async getBacklogTasks(): Promise<TaskData[]> {
    const now = Date.now();
    const weekFromNow = now + (7 * 24 * 60 * 60 * 1000);
    return Array.from(this.tasks.values())
      .filter(t => 
        !t.pending && 
        t.status === TaskStatus.Active && 
        (!t.dueTs || t.dueTs > weekFromNow)
      )
      .sort((a, b) => b.createdTs - a.createdTs);
  }
  
  async getDoneTasks(): Promise<TaskData[]> {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    return Array.from(this.tasks.values())
      .filter(t => 
        t.status === TaskStatus.Completed && 
        (t.completedTs || 0) >= thirtyDaysAgo
      )
      .sort((a, b) => (b.completedTs || 0) - (a.completedTs || 0));
  }
  
  async clearCompleted(): Promise<number> {
    const completed = Array.from(this.tasks.values()).filter(t => t.status === TaskStatus.Completed);
    for (const task of completed) {
      this.tasks.delete(task.id);
    }
    return completed.length;
  }
  
  async findExisting(title: string): Promise<TaskData | null> {
    return Array.from(this.tasks.values()).find(t => t.title === title && !t.pending) || null;
  }
  
  async searchByTitle(searchTerm: string): Promise<TaskData | null> {
    return Array.from(this.tasks.values()).find(t => t.title.includes(searchTerm) && !t.pending) || null;
  }
  
  async findByRemoteId(remoteId: string): Promise<TaskData | null> {
    return Array.from(this.tasks.values()).find(t => t.remoteId === remoteId) || null;
  }
  
  async toggleStatus(id: string): Promise<boolean> {
    const task = this.tasks.get(id);
    if (task) {
      const newStatus = task.status === TaskStatus.Active ? TaskStatus.Completed : TaskStatus.Active;
      const updated = {
        ...task,
        status: newStatus,
        completedTs: newStatus === TaskStatus.Completed ? Date.now() : undefined,
        updatedTs: Date.now()
      };
      this.tasks.set(id, updated);
      return true;
    }
    return false;
  }
  
  async togglePin(id: string): Promise<boolean> {
    const task = this.tasks.get(id);
    if (task) {
      const updated = {
        ...task,
        pinnedAt: task.pinnedAt ? undefined : Date.now(),
        updatedTs: Date.now()
      };
      this.tasks.set(id, updated);
      return true;
    }
    return false;
  }
  
  async confirmDraft(id: string): Promise<TaskData | null> {
    const task = this.tasks.get(id);
    if (task && task.pending) {
      const updated = {
        ...task,
        pending: false,
        updatedTs: Date.now()
      };
      this.tasks.set(id, updated);
      return updated;
    }
    return null;
  }
  
  reset(): void {
    this.tasks.clear();
    this.idCounter = 1;
  }
}

// Export singleton instance
export const createMockTaskRepository = () => new MockTaskRepository();