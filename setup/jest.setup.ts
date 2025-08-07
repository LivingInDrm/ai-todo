import '@testing-library/jest-native/extend-expect';
import 'jest-extended';

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
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('mock-notification-id')),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  setNotificationHandler: jest.fn(),
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

// MSW Setup
import { server } from './mock/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Global test utilities
global.createMockTask = (overrides = {}) => ({
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