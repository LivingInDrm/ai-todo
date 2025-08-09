import { initializeDatabase, getDatabase, closeDatabase, resetDatabase } from './sqliteDatabase';
import { taskRepository } from './repositories/taskRepository';
import Task from './models/Task';

// Initialize database on app start
let databaseInitialized = false;

export async function ensureDatabaseInitialized() {
  if (!databaseInitialized) {
    await initializeDatabase();
    databaseInitialized = true;
  }
}

// Export the default database object with compatibility layer
const database = {
  // WatermelonDB compatibility methods
  collections: {
    get: (name: string) => {
      if (name === 'tasks') {
        return {
          create: async (prepareCreate: (task: any) => void) => {
            const taskData: any = {};
            prepareCreate(taskData);
            const created = await taskRepository.create(taskData);
            return Task.fromData(created);
          },
          find: async (id: string) => {
            const data = await taskRepository.findById(id);
            if (!data) {
              throw new Error(`Task with id ${id} not found`);
            }
            return Task.fromData(data);
          },
          query: (...conditions: any[]) => {
            return {
              fetch: async () => {
                // Parse conditions to determine query type
                let isPending = false;
                
                for (const condition of conditions) {
                  if (condition?.field === 'pending' || condition?.column === 'pending') {
                    isPending = condition.value === true || condition.value === 1;
                  }
                }
                
                if (isPending) {
                  const results = await taskRepository.getDraftTasks();
                  return results.map(data => Task.fromData(data));
                } else {
                  const results = await taskRepository.getAllTasks();
                  return results.map(data => Task.fromData(data));
                }
              }
            };
          }
        };
      }
      throw new Error(`Collection ${name} not found`);
    }
  },
  
  write: async <T>(work: () => Promise<T>): Promise<T> => {
    // Ensure database is initialized
    await ensureDatabaseInitialized();
    // Execute the work directly (no transaction needed for single operations)
    return await work();
  },
  
  batch: async (...operations: any[]): Promise<void> => {
    // Ensure database is initialized
    await ensureDatabaseInitialized();
    
    // Import withTransaction from sqliteDatabase
    const { withTransaction } = await import('./sqliteDatabase');
    
    // Execute all operations within a transaction for atomicity
    await withTransaction(async () => {
      for (const op of operations) {
        if (typeof op === 'function') {
          await op();
        }
      }
    });
  },
  
  unsafeResetDatabase: async (): Promise<void> => {
    await resetDatabase();
  }
};

export default database;
export { Task, taskRepository };