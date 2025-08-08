/**
 * Centralized test helpers for consistent test setup and teardown
 */

import { createTestDatabase } from './mock/watermelondb';

// Global test database instance that can be reset
let testDatabase: any = null;

/**
 * Initialize a fresh test database instance
 */
export const initTestDatabase = () => {
  testDatabase = createTestDatabase();
  return testDatabase;
};

/**
 * Get the current test database instance
 */
export const getTestDatabase = () => {
  if (!testDatabase) {
    testDatabase = initTestDatabase();
  }
  return testDatabase;
};

/**
 * Reset all stores to initial state
 */
export const resetAllStores = () => {
  // Dynamically import stores to avoid circular dependency
  try {
    const useTaskStore = require('../features/task/taskStore').default;
    const useDraftStore = require('../features/draft/draftStore').default;
    
    // Reset task store
    if (useTaskStore && useTaskStore.setState) {
      useTaskStore.setState({
        tasks: [],
        loading: false,
        error: null,
        currentView: 0, // TaskView.Focus
      });
    }

    // Reset draft store
    if (useDraftStore && useDraftStore.setState) {
      useDraftStore.setState({
        drafts: [],
        isExpanded: true,
        loading: false,
        lastConfirmedIds: [],
      });
    }
  } catch (error) {
    // Stores might not be available in all test contexts
    // Only log if not expected error
    if (error instanceof Error && !error.message?.includes('Cannot read properties')) {
      console.debug('Could not reset stores:', error);
    }
  }
};

/**
 * Reset the test database and clear all data
 */
export const resetTestDatabase = async () => {
  // Get the current database instance from the mocked module
  try {
    const mockDb = require('../db/database').default;
    if (mockDb && mockDb.unsafeResetDatabase) {
      await mockDb.unsafeResetDatabase();
    }
  } catch (error) {
    // Database module might not be mocked in some tests
    // Only log if not the expected error
    if (error instanceof Error && !error.message?.includes('Cannot read properties of undefined')) {
      console.debug('Could not reset database:', error);
    }
  }
  
  // Also reset the local test database if it exists
  if (testDatabase) {
    await testDatabase.unsafeResetDatabase();
  }
};

/**
 * Complete test cleanup - resets database and stores
 */
export const cleanupTest = async () => {
  await resetTestDatabase();
  resetAllStores();
  jest.clearAllMocks();
};

/**
 * Setup test environment with fresh database and stores
 */
export const setupTest = async () => {
  // Clear any existing state
  await cleanupTest();
  
  // Initialize fresh database
  initTestDatabase();
  
  // Return the database for use in tests
  return getTestDatabase();
};

/**
 * Create a mock task with defaults
 */
export const createMockTask = (overrides = {}) => ({
  id: `mock-task-${Date.now()}-${Math.random()}`,
  title: 'Mock Task',
  dueTs: undefined,
  urgent: false,
  status: 0,
  pending: false,
  completedTs: undefined,
  createdTs: Date.now(),
  updatedTs: Date.now(),
  ...overrides,
});

/**
 * Create multiple mock tasks
 */
export const createMockTasks = (count: number, overrides = {}) => {
  return Array.from({ length: count }, (_, i) => 
    createMockTask({
      title: `Task ${i + 1}`,
      ...overrides,
    })
  );
};

/**
 * Wait for async operations to complete with timeout
 */
export const waitForAsync = (ms: number = 100) => 
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Mock successful API response
 */
export const mockApiSuccess = (data: any) => ({
  ok: true,
  status: 200,
  json: async () => data,
  text: async () => JSON.stringify(data),
});

/**
 * Mock API error response
 */
export const mockApiError = (message: string, status: number = 500) => ({
  ok: false,
  status,
  json: async () => ({ error: message }),
  text: async () => message,
});