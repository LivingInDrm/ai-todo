import { Database, Model, Collection } from '@nozbe/watermelondb';
import schema from '../../db/schema';

// Simple in-memory storage for test data
class InMemoryStorage {
  private data: Map<string, any[]> = new Map();
  
  constructor() {
    this.data.set('tasks', []);
  }
  
  getTable(tableName: string): any[] {
    if (!this.data.has(tableName)) {
      this.data.set(tableName, []);
    }
    return this.data.get(tableName)!;
  }
  
  create(tableName: string, record: any): any {
    const table = this.getTable(tableName);
    const newRecord = {
      ...record,
      id: record.id || `mock-${tableName}-${Date.now()}-${Math.random()}`,
      _status: 'created',
      _changed: '',
    };
    table.push(newRecord);
    return newRecord;
  }
  
  find(tableName: string, id: string): any {
    const table = this.getTable(tableName);
    return table.find(r => r.id === id);
  }
  
  query(tableName: string, conditions: any[] = []): any[] {
    return this.getTable(tableName).filter(record => {
      // Simple filter implementation for testing
      if (conditions.length === 0) return true;
      
      return conditions.every(condition => {
        if (condition.type === 'where' && condition.field === 'pending') {
          return record.pending === condition.value;
        }
        return true;
      });
    });
  }
  
  update(tableName: string, id: string, updates: any): any {
    const table = this.getTable(tableName);
    const index = table.findIndex(r => r.id === id);
    if (index >= 0) {
      table[index] = { ...table[index], ...updates, _status: 'updated' };
      return table[index];
    }
    return null;
  }
  
  delete(tableName: string, id: string): void {
    const table = this.getTable(tableName);
    const index = table.findIndex(r => r.id === id);
    if (index >= 0) {
      table.splice(index, 1);
    }
  }
  
  clear(): void {
    this.data.clear();
    this.data.set('tasks', []);
  }
}

// Mock Task Model
class MockTaskModel {
  static table = 'tasks';
  
  id: string;
  title: string;
  dueTs?: number;
  urgent: boolean;
  status: number;
  pending: boolean;
  completedTs?: number;
  createdTs: number;
  updatedTs: number;
  
  constructor(data: any) {
    this.id = data.id;
    this.title = data.title;
    this.dueTs = data.dueTs;
    this.urgent = data.urgent || false;
    this.status = data.status || 0;
    this.pending = data.pending || false;
    this.completedTs = data.completedTs;
    this.createdTs = data.createdTs || Date.now();
    this.updatedTs = data.updatedTs || Date.now();
  }
  
  // Mock model methods
  get isCompleted(): boolean {
    return this.status === 1;
  }
  
  async markAsCompleted(): Promise<void> {
    this.status = 1;
    this.completedTs = Date.now();
  }
  
  async markAsActive(): Promise<void> {
    this.status = 0;
    this.completedTs = undefined;
  }
  
  async markAsDeleted(): Promise<void> {
    // Mock deletion
  }
  
  async confirmDraft(): Promise<void> {
    this.pending = false;
  }
  
  async postpone(newDueTs: number): Promise<void> {
    this.dueTs = newDueTs;
    this.updatedTs = Date.now();
  }
  
  async update(fn: (task: any) => void): Promise<void> {
    fn(this);
    this.updatedTs = Date.now();
  }
}

// Mock Collection
class MockCollection {
  private storage: InMemoryStorage;
  private tableName: string;
  
  constructor(storage: InMemoryStorage, tableName: string) {
    this.storage = storage;
    this.tableName = tableName;
  }
  
  async create(prepareCreate: (record: any) => void): Promise<MockTaskModel> {
    const record = new MockTaskModel({});
    prepareCreate(record);
    
    const created = this.storage.create(this.tableName, {
      id: record.id,
      title: record.title,
      dueTs: record.dueTs,
      urgent: record.urgent,
      status: record.status,
      pending: record.pending,
      completedTs: record.completedTs,
      createdTs: record.createdTs,
      updatedTs: record.updatedTs,
    });
    
    return new MockTaskModel(created);
  }
  
  async find(id: string): Promise<MockTaskModel | null> {
    const record = this.storage.find(this.tableName, id);
    return record ? new MockTaskModel(record) : null;
  }
  
  query(...conditions: any[]): {
    fetch: () => Promise<MockTaskModel[]>;
  } {
    return {
      fetch: async () => {
        const records = this.storage.query(this.tableName, conditions);
        return records.map(r => new MockTaskModel(r));
      }
    };
  }
}

// Mock Database
class MockDatabase {
  private storage: InMemoryStorage;
  private _collections: Map<string, MockCollection>;
  
  constructor() {
    this.storage = new InMemoryStorage();
    this._collections = new Map();
    this._collections.set('tasks', new MockCollection(this.storage, 'tasks'));
  }
  
  get collections() {
    return {
      get: (name: string) => {
        if (!this._collections.has(name)) {
          this._collections.set(name, new MockCollection(this.storage, name));
        }
        return this._collections.get(name)!;
      }
    };
  }
  
  async write<T>(work: () => Promise<T>): Promise<T> {
    // Simple synchronous execution for testing
    return await work();
  }
  
  async unsafeResetDatabase(): Promise<void> {
    this.storage.clear();
  }
}

// Export the fixed createTestDatabase function
export const createTestDatabase = (): any => {
  return new MockDatabase();
};

// Helper functions remain the same
export const setupTestDatabase = () => {
  let database: any;
  
  beforeEach(async () => {
    database = createTestDatabase();
  });
  
  afterEach(async () => {
    if (database) {
      await database.unsafeResetDatabase();
    }
  });
  
  return () => database;
};

export const createTestTask = async (database: any, overrides = {}) => {
  const tasksCollection = database.collections.get('tasks');
  
  return await tasksCollection.create((task: any) => {
    Object.assign(task, {
      title: 'Test Task',
      dueTs: null,
      status: 0,
      pending: false,
      createdTs: Date.now(),
      updatedTs: Date.now(),
      completedTs: null,
      urgent: false,
      ...overrides,
    });
  });
};

export const createTestTasks = async (database: any, count: number, overrides = {}) => {
  const tasks = [];
  for (let i = 0; i < count; i++) {
    const task = await createTestTask(database, {
      title: `Test Task ${i + 1}`,
      ...overrides,
    });
    tasks.push(task);
  }
  return tasks;
};