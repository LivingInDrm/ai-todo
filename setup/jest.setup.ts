import '@testing-library/jest-native/extend-expect';
import 'jest-extended';

// Mock expo-sqlite FIRST before any other imports
jest.mock('expo-sqlite', () => {
  const { SQLite } = require('./mock/sqliteDatabase');
  return SQLite;
});

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => 
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock React Native Reanimated
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

// Mock React Native Gesture Handler
jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native').View;
  return {
    Swipeable: View,
    DrawerLayout: View,
    State: {},
    ScrollView: View,
    Slider: View,
    Switch: View,
    TextInput: View,
    TouchableNativeFeedback: View,
    TouchableOpacity: View,
    TouchableHighlight: View,
    TouchableWithoutFeedback: View,
    PanGestureHandler: View,
    TapGestureHandler: View,
    FlingGestureHandler: View,
    ForceTouchGestureHandler: View,
    LongPressGestureHandler: View,
    NativeViewGestureHandler: View,
    PinchGestureHandler: View,
    RotationGestureHandler: View,
    RawButton: View,
    BaseButton: View,
    RectButton: View,
    BorderlessButton: View,
    FlatList: View,
    gestureHandlerRootHOC: (component: any) => component,
    GestureHandlerRootView: View,
    Directions: {},
  };
});

// Mock @gorhom/bottom-sheet
jest.mock('@gorhom/bottom-sheet', () => ({
  __esModule: true,
  default: require('react-native').View,
  BottomSheetModal: require('react-native').View,
  BottomSheetModalProvider: ({ children }: any) => children,
  BottomSheetScrollView: require('react-native').ScrollView,
  BottomSheetBackdrop: require('react-native').View,
  BottomSheetTextInput: require('react-native').TextInput,
  useBottomSheetModal: () => ({
    dismiss: jest.fn(),
    present: jest.fn(),
  }),
}));

// Mock expo-av
jest.mock('expo-av', () => ({
  Audio: {
    requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
    setAudioModeAsync: jest.fn(() => Promise.resolve()),
    Recording: {
      createAsync: jest.fn(() => Promise.resolve({
        recording: {
          startAsync: jest.fn(),
          stopAndUnloadAsync: jest.fn(() => Promise.resolve({ 
            uri: 'mock-audio-uri',
            durationMillis: 1000 
          })),
          getStatusAsync: jest.fn(() => Promise.resolve({ 
            isRecording: false,
            durationMillis: 0 
          })),
        },
        status: { isRecording: false }
      })),
    },
  },
}));

// Mock expo-file-system
jest.mock('expo-file-system', () => ({
  readAsStringAsync: jest.fn(() => Promise.resolve('mock-base64-audio')),
  EncodingType: {
    Base64: 'base64',
  },
}));

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ 
    status: 'granted',
    expires: 'never',
    granted: true,
    canAskAgain: true,
    ios: {
      status: 'granted',
      allowsSound: true,
      allowsAlert: true,
      allowsBadge: true,
    }
  })),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ 
    status: 'granted',
    expires: 'never',
    granted: true,
    canAskAgain: true,
    ios: {
      status: 'granted',
      allowsSound: true,
      allowsAlert: true,
      allowsBadge: true,
    }
  })),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('mock-notification-id')),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  cancelAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve()),
  getAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve([])),
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  removeNotificationSubscription: jest.fn(),
}));

// Mock @react-native-community/netinfo
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() => Promise.resolve({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
    details: {
      isConnectionExpensive: false,
    }
  })),
  addEventListener: jest.fn(() => ({ unsubscribe: jest.fn() })),
  refresh: jest.fn(() => Promise.resolve()),
  configure: jest.fn(),
  useNetInfo: jest.fn(() => ({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
  })),
}));

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

// Mock react-native-mmkv
jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    getString: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    clearAll: jest.fn(),
    getAllKeys: jest.fn(() => []),
  })),
}));

// Mock @react-native-community/datetimepicker
jest.mock('@react-native-community/datetimepicker', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: React.forwardRef((props: any, ref: any) => {
      return React.createElement('RNDateTimePicker', { ...props, ref });
    }),
  };
});

// Mock the database module BEFORE any imports that might use it
const { createMockTaskRepository } = require('./mock/mockTaskRepository');
const mockTaskRepository = createMockTaskRepository();

jest.mock('../db/database', () => {
  const { initializeDatabase, getDatabase } = require('./mock/sqliteDatabase');
  
  // Simple Task class for testing
  class Task {
    constructor(data: any) {
      Object.assign(this, data);
    }
    static fromData(data: any) {
      return new Task(data);
    }
  }
  
  return {
    __esModule: true,
    default: {
      collections: {
        get: () => ({
          create: async (fn: any) => {
            const task: any = {};
            if (fn) fn(task);
            const created = await mockTaskRepository.create(task);
            return Task.fromData(created);
          },
          find: async (id: string) => {
            const data = await mockTaskRepository.findById(id);
            return data ? Task.fromData(data) : null;
          },
          query: () => ({
            fetch: async () => {
              const results = await mockTaskRepository.getAllTasks();
              return results.map((data: any) => Task.fromData(data));
            }
          })
        })
      },
      write: async (fn: () => Promise<any>) => {
        await initializeDatabase();
        return await fn();
      },
      unsafeResetDatabase: async () => {
        mockTaskRepository.reset();
        await initializeDatabase();
        const db = getDatabase();
        if (db) {
          db.clear();
        }
      }
    },
    Task,
    taskRepository: mockTaskRepository,
    ensureDatabaseInitialized: initializeDatabase
  };
});

// MSW Setup
import { server } from './mock/server';
import { resetAllStores, resetTestDatabase } from './test-helpers';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

afterEach(async () => {
  // Reset MSW handlers
  server.resetHandlers();
  
  // Reset all stores to initial state
  resetAllStores();
  
  // Clear the test database
  await resetTestDatabase();
  
  // Clear all mocks
  jest.clearAllMocks();
});

afterAll(() => server.close());

// Global test utilities
(global as any).createMockTask = (overrides = {}) => ({
  id: 'mock-task-id',
  title: 'Mock Task',
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
});

// Silence console errors and warnings in tests
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = jest.fn((...args) => {
    // Only log actual errors, not React warnings
    if (!args[0]?.includes?.('Warning:')) {
      originalError(...args);
    }
  });
  console.warn = jest.fn();
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});