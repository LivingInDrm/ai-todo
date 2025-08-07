import { Database, Model } from '@nozbe/watermelondb';
import schema from '../../db/schema';

// Mock Task model for testing
class MockTask extends Model {
  static table = 'tasks';
  
  title!: string;
  due_ts!: number | null;
  status!: number;
  pending!: boolean;
  created_ts!: number;
  updated_ts!: number;
  completed_ts!: number | null;
  pinned!: boolean;
  recurring!: string | null;
  reminder_ts!: number | null;
  list_id!: string | null;
  note!: string;
}

// Create a mock database for testing
export const createTestDatabase = () => {
  // Create a simple mock adapter
  const mockAdapter = {
    schema,
    migrations: null,
    
    // Mock the required adapter methods
    batch: jest.fn(async () => {}),
    query: jest.fn(async () => []),
    count: jest.fn(async () => 0),
    find: jest.fn(async () => null),
    create: jest.fn(async (table: string, record: any) => ({
      ...record,
      id: record.id || 'mock-id-' + Date.now(),
      _status: 'created',
      _changed: '',
    })),
    update: jest.fn(async (table: string, record: any) => record),
    destroyPermanently: jest.fn(async () => {}),
    markAsDeleted: jest.fn(async () => {}),
    unsafeResetDatabase: jest.fn(async () => {}),
    getLocal: jest.fn(async () => null),
    setLocal: jest.fn(async () => {}),
    removeLocal: jest.fn(async () => {}),
    
    // Mock setup method
    setup: jest.fn(async () => {}),
  };
  
  const database = new Database({
    adapter: mockAdapter as any,
    modelClasses: [MockTask],
  });
  
  // Store created records for testing
  const mockRecords: any[] = [];
  
  // Override create to store records
  const originalCreate = mockAdapter.create;
  mockAdapter.create = jest.fn(async (table: string, record: any) => {
    const created = await originalCreate(table, record);
    mockRecords.push(created);
    return created;
  });
  
  // Override query to return stored records
  mockAdapter.query = jest.fn(async () => mockRecords);
  
  return database;
};

// Helper to set up and tear down test database
export const setupTestDatabase = () => {
  let database: Database;
  
  beforeEach(async () => {
    database = createTestDatabase();
  });
  
  afterEach(async () => {
    if (database) {
      await database.write(async () => {
        await database.unsafeResetDatabase();
      });
    }
  });
  
  return () => database;
};

// Helper to create test tasks
export const createTestTask = async (database: Database, overrides = {}) => {
  const tasksCollection = database.get<MockTask>('tasks');
  
  const mockTask = {
    id: 'task-' + Date.now() + '-' + Math.random(),
    title: 'Test Task',
    due_ts: null,
    status: 0,
    pending: false,
    created_ts: Date.now(),
    updated_ts: Date.now(),
    completed_ts: null,
    pinned: false,
    recurring: null,
    reminder_ts: null,
    list_id: null,
    note: '',
    ...overrides,
    _status: 'created',
    _changed: '',
  };
  
  // Simulate creating a task
  const adapter = (database as any).adapter;
  await adapter.create('tasks', mockTask);
  
  return mockTask;
};

// Helper to create multiple test tasks
export const createTestTasks = async (database: Database, count: number, overrides = {}) => {
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

// Mock the database instance for stores
export const mockDatabase = createTestDatabase();

// Mock database provider for testing components
export const MockDatabaseProvider = ({ children, database = mockDatabase }: any) => {
  const DatabaseProvider = require('@nozbe/watermelondb/DatabaseProvider').default;
  return DatabaseProvider({ database, children });
};