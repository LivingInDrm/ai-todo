import { getDatabase, generateId } from '../sqliteDatabase';
import { TaskData, TaskStatus } from '../../lib/types';

/**
 * Task Repository - Handles all database operations for tasks
 */
export class TaskRepository {
  /**
   * Create a new task
   */
  async create(data: Partial<TaskData>): Promise<TaskData> {
    const db = getDatabase();
    
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
    
    await db.runAsync(
      `INSERT INTO tasks (
        id, title, due_ts, urgent, status, pending, 
        completed_ts, pinned_at, remote_id, created_ts, updated_ts
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      task.id,
      task.title,
      task.dueTs ?? null,
      task.urgent ? 1 : 0,
      task.status,
      task.pending ? 1 : 0,
      task.completedTs ?? null,
      task.pinnedAt ?? null,
      task.remoteId ?? null,
      task.createdTs,
      task.updatedTs
    );
    
    return task;
  }
  
  /**
   * Find a task by ID
   */
  async findById(id: string): Promise<TaskData | null> {
    const db = getDatabase();
    
    const result = await db.getFirstAsync<any>(
      'SELECT * FROM tasks WHERE id = ?',
      id
    );
    
    if (!result) return null;
    
    return this.mapRowToTask(result);
  }
  
  /**
   * Find a task by title (supports partial matching)
   */
  async findByTitle(title: string, exact: boolean = false): Promise<TaskData | null> {
    const db = getDatabase();
    
    const query = exact 
      ? 'SELECT * FROM tasks WHERE title = ? AND pending = 0 LIMIT 1'
      : 'SELECT * FROM tasks WHERE title LIKE ? AND pending = 0 LIMIT 1';
    
    const searchParam = exact ? title : `%${title}%`;
    
    const result = await db.getFirstAsync<any>(query, searchParam);
    
    if (!result) return null;
    
    return this.mapRowToTask(result);
  }
  
  /**
   * Find a task by remote ID
   */
  async findByRemoteId(remoteId: string): Promise<TaskData | null> {
    const db = getDatabase();
    
    const result = await db.getFirstAsync<any>(
      'SELECT * FROM tasks WHERE remote_id = ?',
      remoteId
    );
    
    if (!result) return null;
    
    return this.mapRowToTask(result);
  }
  
  /**
   * Get all non-draft tasks
   */
  async getAllTasks(): Promise<TaskData[]> {
    const db = getDatabase();
    
    const results = await db.getAllAsync<any>(
      'SELECT * FROM tasks WHERE pending = 0 ORDER BY created_ts DESC'
    );
    
    return results.map(row => this.mapRowToTask(row));
  }
  
  /**
   * Get all draft tasks
   */
  async getDraftTasks(): Promise<TaskData[]> {
    const db = getDatabase();
    
    const results = await db.getAllAsync<any>(
      'SELECT * FROM tasks WHERE pending = 1 ORDER BY created_ts DESC'
    );
    
    return results.map(row => this.mapRowToTask(row));
  }
  
  /**
   * Get tasks by status
   */
  async getTasksByStatus(status: TaskStatus): Promise<TaskData[]> {
    const db = getDatabase();
    
    const results = await db.getAllAsync<any>(
      'SELECT * FROM tasks WHERE status = ? AND pending = 0 ORDER BY created_ts DESC',
      status
    );
    
    return results.map(row => this.mapRowToTask(row));
  }
  
  /**
   * Get focus tasks (active tasks due within 7 days, excluding null due_ts)
   */
  async getFocusTasks(): Promise<TaskData[]> {
    const db = getDatabase();
    const now = Date.now();
    const weekFromNow = now + (7 * 24 * 60 * 60 * 1000);
    
    const results = await db.getAllAsync<any>(
      `SELECT * FROM tasks 
       WHERE pending = 0 
         AND status = 0 
         AND due_ts IS NOT NULL
         AND due_ts <= ?
       ORDER BY due_ts ASC`,
      weekFromNow
    );
    
    return results.map(row => this.mapRowToTask(row));
  }
  
  /**
   * Get backlog tasks (active tasks due after 7 days or no due date)
   */
  async getBacklogTasks(): Promise<TaskData[]> {
    const db = getDatabase();
    const weekFromNow = Date.now() + (7 * 24 * 60 * 60 * 1000);
    
    const results = await db.getAllAsync<any>(
      `SELECT * FROM tasks 
       WHERE pending = 0 
         AND status = 0 
         AND (due_ts IS NULL OR due_ts > ?)
       ORDER BY created_ts DESC`,
      weekFromNow
    );
    
    return results.map(row => this.mapRowToTask(row));
  }
  
  /**
   * Get done tasks (completed within last 30 days)
   */
  async getDoneTasks(): Promise<TaskData[]> {
    const db = getDatabase();
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    const results = await db.getAllAsync<any>(
      `SELECT * FROM tasks 
       WHERE status = 1 
         AND completed_ts >= ?
       ORDER BY completed_ts DESC`,
      thirtyDaysAgo
    );
    
    return results.map(row => this.mapRowToTask(row));
  }
  
  /**
   * Update a task
   */
  async update(id: string, updates: Partial<TaskData>): Promise<TaskData | null> {
    const db = getDatabase();
    
    // Build dynamic update query
    const fields: string[] = [];
    const values: any[] = [];
    
    if (updates.title !== undefined) {
      fields.push('title = ?');
      values.push(updates.title);
    }
    if (updates.dueTs !== undefined) {
      fields.push('due_ts = ?');
      values.push(updates.dueTs);
    }
    if (updates.urgent !== undefined) {
      fields.push('urgent = ?');
      values.push(updates.urgent ? 1 : 0);
    }
    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.pending !== undefined) {
      fields.push('pending = ?');
      values.push(updates.pending ? 1 : 0);
    }
    if (updates.completedTs !== undefined) {
      fields.push('completed_ts = ?');
      values.push(updates.completedTs === null ? null : updates.completedTs);
    }
    if (updates.pinnedAt !== undefined) {
      fields.push('pinned_at = ?');
      values.push(updates.pinnedAt === null ? null : updates.pinnedAt);
    }
    if (updates.remoteId !== undefined) {
      fields.push('remote_id = ?');
      values.push(updates.remoteId);
    }
    
    // Always update updated_ts
    fields.push('updated_ts = ?');
    values.push(Date.now());
    
    // Add id to values for WHERE clause
    values.push(id);
    
    if (fields.length === 1) {
      // Only updated_ts, skip update
      return this.findById(id);
    }
    
    const query = `UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`;
    await db.runAsync(query, ...values);
    
    return this.findById(id);
  }
  
  /**
   * Delete a task
   */
  async delete(id: string): Promise<void> {
    const db = getDatabase();
    await db.runAsync('DELETE FROM tasks WHERE id = ?', id);
  }
  
  /**
   * Delete multiple tasks
   */
  async deleteMany(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    
    const db = getDatabase();
    const placeholders = ids.map(() => '?').join(',');
    await db.runAsync(
      `DELETE FROM tasks WHERE id IN (${placeholders})`,
      ...ids
    );
  }
  
  /**
   * Clear all completed tasks
   */
  async clearCompleted(): Promise<void> {
    const db = getDatabase();
    await db.runAsync('DELETE FROM tasks WHERE status = 1');
  }
  
  /**
   * Clean up old done tasks (older than 30 days)
   */
  async cleanupOldDoneTasks(): Promise<void> {
    const db = getDatabase();
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    await db.runAsync(
      'DELETE FROM tasks WHERE status = 1 AND completed_ts < ?',
      thirtyDaysAgo
    );
  }
  
  /**
   * Toggle task status
   */
  async toggleStatus(id: string): Promise<TaskData | null> {
    const task = await this.findById(id);
    if (!task) return null;
    
    if (task.status === TaskStatus.Active) {
      return this.update(id, {
        status: TaskStatus.Completed,
        completedTs: Date.now(),
      });
    } else {
      return this.update(id, {
        status: TaskStatus.Active,
        completedTs: undefined,
      });
    }
  }
  
  /**
   * Toggle task urgent status
   */
  async toggleUrgent(id: string): Promise<TaskData | null> {
    const task = await this.findById(id);
    if (!task) return null;
    
    return this.update(id, { urgent: !task.urgent });
  }
  
  /**
   * Toggle task pin status
   */
  async togglePin(id: string): Promise<TaskData | null> {
    const task = await this.findById(id);
    if (!task) return null;
    
    return this.update(id, {
      pinnedAt: task.pinnedAt ? undefined : Date.now(),
    });
  }
  
  /**
   * Confirm a draft task
   */
  async confirmDraft(id: string): Promise<TaskData | null> {
    return this.update(id, { pending: false });
  }
  
  /**
   * Map database row to TaskData
   * Converts null values from DB to undefined for internal use
   */
  private mapRowToTask(row: any): TaskData {
    return {
      id: row.id,
      title: row.title,
      dueTs: row.due_ts === null ? undefined : row.due_ts,
      urgent: row.urgent === 1,
      status: row.status,
      pending: row.pending === 1,
      completedTs: row.completed_ts === null ? undefined : row.completed_ts,
      pinnedAt: row.pinned_at === null ? undefined : row.pinned_at,
      remoteId: row.remote_id === null ? undefined : row.remote_id,
      createdTs: row.created_ts,
      updatedTs: row.updated_ts,
    };
  }
}

// Export singleton instance
export const taskRepository = new TaskRepository();