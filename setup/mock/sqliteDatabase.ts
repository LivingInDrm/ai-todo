// Mock implementation of expo-sqlite for testing
import { generateId } from '../../db/sqliteDatabase';
import { TaskData, TaskStatus } from '../../lib/types';

// In-memory storage for test data
class InMemoryDatabase {
  private data: Map<string, any[]> = new Map();
  
  constructor() {
    this.data.set('tasks', []);
    this.data.set('migrations', []);
  }
  
  async runAsync(query: string, ...params: any[]): Promise<void> {
    if (query.includes('INSERT INTO tasks')) {
      const task = {
        id: params[0],
        title: params[1],
        due_ts: params[2],
        urgent: params[3],
        status: params[4],
        pending: params[5],
        completed_ts: params[6],
        pinned_at: params[7],
        remote_id: params[8],
        created_ts: params[9],
        updated_ts: params[10],
      };
      this.data.get('tasks')!.push(task);
    } else if (query.includes('UPDATE tasks')) {
      const id = params[params.length - 1];
      const tasks = this.data.get('tasks')!;
      const index = tasks.findIndex(t => t.id === id);
      if (index >= 0) {
        // Parse the SET clause to update fields
        const setClause = query.match(/SET (.+) WHERE/)?.[1];
        if (setClause) {
          const updates = setClause.split(',').map(s => s.trim());
          let paramIndex = 0;
          for (const update of updates) {
            const [field] = update.split('=').map(s => s.trim());
            const fieldName = field.replace(/ /g, '_');
            if (paramIndex < params.length - 1) {
              tasks[index][fieldName] = params[paramIndex];
              paramIndex++;
            }
          }
        }
      }
    } else if (query.includes('DELETE FROM tasks WHERE id = ?')) {
      const id = params[0];
      const tasks = this.data.get('tasks')!;
      const index = tasks.findIndex(t => t.id === id);
      if (index >= 0) {
        tasks.splice(index, 1);
      }
    } else if (query.includes('DELETE FROM tasks WHERE id IN')) {
      const ids = params;
      const tasks = this.data.get('tasks')!;
      for (const id of ids) {
        const index = tasks.findIndex(t => t.id === id);
        if (index >= 0) {
          tasks.splice(index, 1);
        }
      }
    } else if (query.includes('DELETE FROM tasks WHERE status = 1')) {
      const tasks = this.data.get('tasks')!;
      this.data.set('tasks', tasks.filter(t => t.status !== 1));
    } else if (query.includes('INSERT INTO migrations')) {
      const migration = { version: params[0], applied_at: params[1] };
      this.data.get('migrations')!.push(migration);
    }
  }
  
  async getFirstAsync<T>(query: string, ...params: any[]): Promise<T | null> {
    if (query.includes('SELECT * FROM tasks WHERE id = ?')) {
      const id = params[0];
      const task = this.data.get('tasks')!.find(t => t.id === id);
      return task as T;
    } else if (query.includes('SELECT * FROM tasks WHERE title')) {
      const searchParam = params[0];
      const tasks = this.data.get('tasks')!;
      if (query.includes('LIKE')) {
        const searchValue = searchParam.replace(/%/g, '');
        const task = tasks.find(t => t.title.includes(searchValue) && t.pending === 0);
        return task as T;
      } else {
        const task = tasks.find(t => t.title === searchParam && t.pending === 0);
        return task as T;
      }
    } else if (query.includes('SELECT * FROM tasks WHERE remote_id = ?')) {
      const remoteId = params[0];
      const task = this.data.get('tasks')!.find(t => t.remote_id === remoteId);
      return task as T;
    } else if (query.includes('SELECT MAX(version)')) {
      const migrations = this.data.get('migrations')!;
      const maxVersion = migrations.length > 0 
        ? Math.max(...migrations.map(m => m.version))
        : 0;
      return { version: maxVersion } as T;
    }
    return null;
  }
  
  async getAllAsync<T>(query: string, ...params: any[]): Promise<T[]> {
    const tasks = this.data.get('tasks')!;
    
    if (query.includes('WHERE pending = 0') && !query.includes('status')) {
      return tasks.filter(t => t.pending === 0) as T[];
    } else if (query.includes('WHERE pending = 1')) {
      return tasks.filter(t => t.pending === 1) as T[];
    } else if (query.includes('WHERE status = ?')) {
      const status = params[0];
      return tasks.filter(t => t.status === status && t.pending === 0) as T[];
    } else if (query.includes('WHERE pending = 0') && query.includes('status = 0')) {
      const weekFromNow = params[0];
      if (query.includes('due_ts <= ?')) {
        // Focus tasks
        return tasks.filter(t => 
          t.pending === 0 && 
          t.status === 0 && 
          (t.due_ts === null || t.due_ts <= weekFromNow)
        ) as T[];
      } else {
        // Backlog tasks
        return tasks.filter(t => 
          t.pending === 0 && 
          t.status === 0 && 
          (t.due_ts === null || t.due_ts > weekFromNow)
        ) as T[];
      }
    } else if (query.includes('WHERE status = 1')) {
      const thirtyDaysAgo = params[0];
      return tasks.filter(t => 
        t.status === 1 && 
        t.completed_ts >= thirtyDaysAgo
      ) as T[];
    }
    
    return tasks as T[];
  }
  
  async execAsync(query: string): Promise<void> {
    // Handle CREATE TABLE and other schema operations
    // These are no-ops in the mock
  }
  
  async closeAsync(): Promise<void> {
    // No-op
  }
  
  clear(): void {
    this.data.clear();
    this.data.set('tasks', []);
    this.data.set('migrations', []);
  }
}

// Mock SQLite database instance
let mockDatabase: InMemoryDatabase | null = null;

// Mock expo-sqlite module
export const SQLite = {
  openDatabaseAsync: async (name: string) => {
    if (!mockDatabase) {
      mockDatabase = new InMemoryDatabase();
    }
    return mockDatabase;
  }
};

// Export mock database functions
export async function initializeDatabase() {
  if (!mockDatabase) {
    mockDatabase = new InMemoryDatabase();
  }
  return mockDatabase;
}

export function getDatabase() {
  if (!mockDatabase) {
    throw new Error('Database not initialized');
  }
  return mockDatabase;
}

export async function closeDatabase() {
  mockDatabase = null;
}

export async function resetDatabase() {
  if (mockDatabase) {
    mockDatabase.clear();
  }
}

// Export the test database setup
export const createTestDatabase = () => {
  const mockDb = new InMemoryDatabase();
  
  // Add collections property for backward compatibility
  (mockDb as any).collections = {
    get: (name: string) => {
      if (name === 'tasks') {
        return {
          modelClass: {
            fromData: (data: any) => data,
          },
          create: async (fn: any) => {
            const task: any = {};
            if (fn) fn(task);
            await mockDb.runAsync(
              'INSERT INTO tasks (id, title, due_ts, urgent, status, pending, completed_ts, pinned_at, remote_id, created_ts, updated_ts) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
              task.id || generateId(),
              task.title || '',
              task.dueTs ?? null,
              task.urgent ? 1 : 0,
              task.status || 0,
              task.pending ? 1 : 0,
              task.completedTs ?? null,
              task.pinnedAt ?? null,
              task.remoteId ?? null,
              task.createdTs || Date.now(),
              task.updatedTs || Date.now()
            );
            return task;
          },
          find: async (id: string) => {
            return await mockDb.getFirstAsync('SELECT * FROM tasks WHERE id = ?', id);
          },
          query: () => ({
            fetch: async () => {
              return await mockDb.getAllAsync('SELECT * FROM tasks');
            }
          })
        };
      }
      return null;
    }
  };
  
  // Add write method for backward compatibility
  (mockDb as any).write = async (fn: () => Promise<any>) => {
    return await fn();
  };
  
  // Add unsafeResetDatabase for backward compatibility  
  (mockDb as any).unsafeResetDatabase = async () => {
    mockDb.clear();
  };
  
  mockDatabase = mockDb;
  return mockDb;
};

export const resetDatabaseInstance = () => {
  mockDatabase = null;
};

// Helper function to create test tasks
export const createTestTask = async (overrides = {}): Promise<TaskData> => {
  const task: TaskData = {
    id: generateId(),
    title: 'Test Task',
    dueTs: undefined,
    urgent: false,
    status: TaskStatus.Active,
    pending: false,
    completedTs: undefined,
    pinnedAt: undefined,
    remoteId: undefined,
    createdTs: Date.now(),
    updatedTs: Date.now(),
    ...overrides,
  };
  
  const db = await getDatabase();
  await db.runAsync(
    'INSERT INTO tasks (id, title, due_ts, urgent, status, pending, completed_ts, pinned_at, remote_id, created_ts, updated_ts) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
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
};

export const createTestTasks = async (count: number, overrides = {}): Promise<TaskData[]> => {
  const tasks: TaskData[] = [];
  for (let i = 0; i < count; i++) {
    const task = await createTestTask({
      title: `Test Task ${i + 1}`,
      ...overrides,
    });
    tasks.push(task);
  }
  return tasks;
};