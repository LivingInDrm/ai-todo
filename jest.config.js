module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: [
    '<rootDir>/setup/jest.setup.ts',
    'jest-extended/all'
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|@gorhom|@nozbe|@supabase|expo|@expo|react-native-worklets)'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    'react-native-worklets/plugin': '<rootDir>/__mocks__/react-native-worklets/plugin.js'
  },
  testPathIgnorePatterns: ['/node_modules/', '/e2e/'],
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'features/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'services/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**'
  ],
  testTimeout: 10000,
  testEnvironment: 'node'
};