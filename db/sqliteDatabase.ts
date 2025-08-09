import * as SQLite from 'expo-sqlite';

// Database configuration
const DATABASE_NAME = 'ai_todo.db';
const CURRENT_VERSION = 3;

// SQLite database instance
let db: SQLite.SQLiteDatabase | null = null;

/**
 * Initialize the SQLite database
 */
export async function initializeDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  
  try {
    // Open or create the database
    db = await SQLite.openDatabaseAsync(DATABASE_NAME);
    
    // Enable foreign keys
    await db.execAsync('PRAGMA foreign_keys = ON;');
    
    // Run migrations
    await runMigrations(db);
    
    return db;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

/**
 * Get the current database instance
 */
export function getDatabase(): SQLite.SQLiteDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

/**
 * Run database migrations
 */
async function runMigrations(database: SQLite.SQLiteDatabase): Promise<void> {
  try {
    // Create migrations table if it doesn't exist
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS migrations (
        version INTEGER PRIMARY KEY,
        applied_at INTEGER NOT NULL
      );
    `);
    
    // Get current version
    const result = await database.getFirstAsync<{ version: number }>(
      'SELECT MAX(version) as version FROM migrations'
    );
    const currentVersion = result?.version ?? 0;
    
    // Run migrations in a transaction for atomicity
    await database.execAsync('BEGIN TRANSACTION');
    try {
      if (currentVersion < 1) {
        await runMigrationV1(database);
      }
      if (currentVersion < 2) {
        await runMigrationV2(database);
      }
      if (currentVersion < 3) {
        await runMigrationV3(database);
      }
      await database.execAsync('COMMIT');
    } catch (migrationError) {
      await database.execAsync('ROLLBACK');
      throw migrationError;
    }
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

/**
 * Migration V1: Create initial tasks table
 */
async function runMigrationV1(database: SQLite.SQLiteDatabase): Promise<void> {
  // Create the tasks table
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      due_ts INTEGER,
      urgent INTEGER DEFAULT 0,
      status INTEGER DEFAULT 0,
      pending INTEGER DEFAULT 0,
      completed_ts INTEGER,
      created_ts INTEGER NOT NULL,
      updated_ts INTEGER NOT NULL
    )
  `);
  
  // Create indexes separately for better compatibility
  await database.execAsync('CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)');
  await database.execAsync('CREATE INDEX IF NOT EXISTS idx_tasks_pending ON tasks(pending)');
  await database.execAsync('CREATE INDEX IF NOT EXISTS idx_tasks_due_ts ON tasks(due_ts)');
  
  await database.runAsync(
    'INSERT INTO migrations (version, applied_at) VALUES (?, ?)',
    1, Date.now()
  );
}

/**
 * Migration V2: Add pinned_at field
 */
async function runMigrationV2(database: SQLite.SQLiteDatabase): Promise<void> {
  // Check if column already exists using PRAGMA
  const columns = await database.getAllAsync('PRAGMA table_info(tasks)');
  const columnExists = columns.some((col: any) => col.name === 'pinned_at');
  
  if (!columnExists) {
    await database.execAsync(`
      ALTER TABLE tasks ADD COLUMN pinned_at INTEGER;
    `);
  }
  
  await database.runAsync(
    'INSERT INTO migrations (version, applied_at) VALUES (?, ?)',
    2, Date.now()
  );
}

/**
 * Migration V3: Add remote_id field for Supabase sync
 */
async function runMigrationV3(database: SQLite.SQLiteDatabase): Promise<void> {
  // Check if column already exists using PRAGMA
  const columns = await database.getAllAsync('PRAGMA table_info(tasks)');
  const columnExists = columns.some((col: any) => col.name === 'remote_id');
  
  if (!columnExists) {
    await database.execAsync(`
      ALTER TABLE tasks ADD COLUMN remote_id TEXT;
    `);
  }
  
  // Always ensure the index exists
  await database.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_tasks_remote_id ON tasks(remote_id);
  `);
  
  await database.runAsync(
    'INSERT INTO migrations (version, applied_at) VALUES (?, ?)',
    3, Date.now()
  );
}

/**
 * Close the database connection
 */
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
  }
}

/**
 * Reset the database (for testing purposes)
 */
export async function resetDatabase(): Promise<void> {
  if (db) {
    await db.execAsync('DELETE FROM tasks');
  }
}

/**
 * Generate a unique ID for new records
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Execute a function within a database transaction
 * Ensures atomicity of multiple database operations
 */
export async function withTransaction<T>(
  callback: (db: SQLite.SQLiteDatabase) => Promise<T>
): Promise<T> {
  const database = getDatabase();
  
  try {
    await database.execAsync('BEGIN TRANSACTION');
    const result = await callback(database);
    await database.execAsync('COMMIT');
    return result;
  } catch (error) {
    await database.execAsync('ROLLBACK');
    throw error;
  }
}