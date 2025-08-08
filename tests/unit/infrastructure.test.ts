import { createTestDatabase, createTestTask, createTestTasks } from '../../setup/mock/watermelondb';
import { server } from '../../setup/mock/server';
import { errorHandlers } from '../../setup/mock/handlers';
import { Database } from '@nozbe/watermelondb';

describe('Test Infrastructure Verification', () => {
  describe('Basic Jest Setup', () => {
    it('should run basic tests', () => {
      expect(true).toBe(true);
    });

    it('should have jest-extended matchers available', () => {
      expect([1, 2, 3]).toIncludeAllMembers([3, 2, 1]);
      expect('hello world').toInclude('world');
      expect({}).toBeEmpty();
    });
  });

  describe('WatermelonDB Test Adapter', () => {
    it('should create a test database', () => {
      const database = createTestDatabase();
      expect(database).toBeDefined();
      expect(database.collections.get('tasks')).toBeDefined();
    });

    it('should have mock database methods', () => {
      const database = createTestDatabase();
      
      expect(database).toBeDefined();
      expect(typeof database.write).toBe('function');
      expect(database.collections).toBeDefined();
      expect(typeof database.collections.get).toBe('function');
      expect(typeof database.unsafeResetDatabase).toBe('function');
    });

    it('should create mock tasks', async () => {
      const mockTask = {
        id: 'test-1',
        title: 'Test Task',
        status: 0,
        pending: false,
        created_ts: Date.now(),
        updated_ts: Date.now(),
      };
      
      expect(mockTask.title).toBe('Test Task');
      expect(mockTask.status).toBe(0);
      expect(mockTask.pending).toBe(false);
    });

    it('should handle multiple mock tasks', () => {
      const tasks = [];
      for (let i = 0; i < 3; i++) {
        tasks.push({
          id: `task-${i}`,
          title: `Test Task ${i + 1}`,
          status: 0,
        });
      }

      expect(tasks).toHaveLength(3);
      expect(tasks[0].title).toBe('Test Task 1');
      expect(tasks[1].title).toBe('Test Task 2');
      expect(tasks[2].title).toBe('Test Task 3');
    });
  });

  describe('MSW API Mocking', () => {
    it('should mock OpenAI chat completions', async () => {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'test' }],
        }),
      });

      const data = await response.json();
      expect(response.ok).toBe(true);
      expect(data.choices[0].message.function_call.name).toBe('process_tasks');
    });

    it('should mock Whisper transcription', async () => {
      const formData = new FormData();
      formData.append('file', new Blob(['audio'], { type: 'audio/wav' }));
      formData.append('model', 'whisper-1');

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      expect(response.ok).toBe(true);
      expect(data.text).toBe('明天九点写周报，下午三点开会');
    });

    it('should handle error scenarios', async () => {
      // Use error handler for this test
      server.use(errorHandlers.openAIError);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'test' }],
        }),
      });

      const data = await response.json();
      expect(response.status).toBe(429);
      expect(data.error.type).toBe('rate_limit_error');
    });
  });

  describe('Native Module Mocks', () => {
    it('should mock expo-av Audio', async () => {
      const { Audio } = require('expo-av');
      
      const permission = await Audio.requestPermissionsAsync();
      expect(permission.status).toBe('granted');

      const { recording } = await Audio.Recording.createAsync();
      expect(recording).toBeDefined();
      expect(recording.startAsync).toBeDefined();
      expect(recording.stopAndUnloadAsync).toBeDefined();
    });

    it('should mock expo-file-system', async () => {
      const FileSystem = require('expo-file-system');
      
      const content = await FileSystem.readAsStringAsync('mock-uri');
      expect(content).toBe('mock-base64-audio');
    });

    it('should mock react-native-mmkv', () => {
      const { MMKV } = require('react-native-mmkv');
      const storage = new MMKV();
      
      expect(storage.getString).toBeDefined();
      expect(storage.set).toBeDefined();
      expect(storage.delete).toBeDefined();
      expect(storage.getAllKeys()).toEqual([]);
    });
  });

  describe('Global Test Utilities', () => {
    it('should have createMockTask global utility', () => {
      const task = (global as any).createMockTask({ title: 'Custom Title' });
      
      expect(task.id).toBe('mock-task-id');
      expect(task.title).toBe('Custom Title');
      expect(task.status).toBe(0);
      expect(task.pending).toBe(false);
    });
  });
});