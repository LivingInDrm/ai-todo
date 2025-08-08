/**
 * Voice Input Flow Tests
 * Tests voice recording, transcription, and draft creation
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { server, errorHandlers } from '../../setup/mock/handlers';
import { TaskStatus } from '../../lib/types';

// Mock the database module at the top level
jest.mock('../../db/database', () => {
  const mockDatabase = require('../../setup/mock/watermelondb').createTestDatabase();
  return {
    __esModule: true,
    default: mockDatabase,
    Task: mockDatabase.collections.get('tasks').modelClass,
  };
});

// Import after mocking
import useDraftStore from '../../features/draft/draftStore';
import useTaskStore from '../../features/task/taskStore';
import voiceFlow from '../../features/voice/voiceFlow';

describe('Voice Input Flow', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    // Reset store states
    useTaskStore.setState({ tasks: [], loading: false, error: null });
    useDraftStore.setState({ drafts: [], isExpanded: true, loading: false, lastConfirmedIds: [] });
  });

  afterEach(async () => {
    jest.clearAllMocks();
    server.resetHandlers();
  });

  describe('TC-Voice-01: Single sentence multiple tasks', () => {
    it('should parse multiple tasks from single voice input', async () => {
      const { result: draftResult } = renderHook(() => useDraftStore());
      
      // Mock audio file URI
      const mockAudioUri = 'file://mock-audio.m4a';
      
      // The mock handlers will return:
      // - Transcription: "明天九点写周报，下午三点开会"
      // - Parsed tasks: 2 tasks with appropriate due times
      
      await act(async () => {
        await voiceFlow.processVoiceInput(mockAudioUri);
      });

      await waitFor(() => {
        expect(draftResult.current.drafts).toHaveLength(2);
      });

      const drafts = draftResult.current.drafts;
      
      // Verify draft properties
      expect(drafts[0].title).toContain('写周报');
      expect(drafts[0].selected).toBe(true);
      expect(drafts[0].pending).toBe(true);
      expect(drafts[0].operation).toBe('add');
      
      expect(drafts[1].title).toContain('开会');
      expect(drafts[1].selected).toBe(true);
      expect(drafts[1].pending).toBe(true);
      expect(drafts[1].operation).toBe('add');
    });
  });

  describe('TC-Voice-02: Batch confirmation', () => {
    it('should confirm all selected drafts and create tasks', async () => {
      const { result: draftResult } = renderHook(() => useDraftStore());
      const { result: taskResult } = renderHook(() => useTaskStore());

      // First create some drafts
      await act(async () => {
        await draftResult.current.addDraftTasks([
          { title: 'Draft Task 1', pending: true, status: TaskStatus.Active },
          { title: 'Draft Task 2', pending: true, status: TaskStatus.Active },
        ]);
      });

      await waitFor(() => {
        expect(draftResult.current.drafts).toHaveLength(2);
      });

      // Confirm selected drafts
      await act(async () => {
        const result = await draftResult.current.confirmSelectedDrafts();
        expect(result.added).toBe(2);
        expect(result.completed).toBe(0);
      });

      // Verify drafts are cleared
      await waitFor(() => {
        expect(draftResult.current.drafts).toHaveLength(0);
      });

      // Verify tasks are created
      await act(async () => {
        await taskResult.current.fetchTasks();
      });

      expect(taskResult.current.tasks).toHaveLength(2);
      expect(taskResult.current.tasks[0].pending).toBe(false);
      expect(taskResult.current.tasks[1].pending).toBe(false);
    });

    it('should support undo after confirmation', async () => {
      const { result: draftResult } = renderHook(() => useDraftStore());
      const { result: taskResult } = renderHook(() => useTaskStore());

      // Create and confirm drafts
      await act(async () => {
        await draftResult.current.addDraftTasks([
          { title: 'Task to Undo', pending: true, status: TaskStatus.Active },
        ]);
      });

      const draftIds = draftResult.current.drafts.map(d => d.id);

      await act(async () => {
        await draftResult.current.confirmDrafts(draftIds);
      });

      // Store confirmed IDs for undo
      const confirmedIds = draftResult.current.lastConfirmedIds;
      expect(confirmedIds).toHaveLength(1);

      // Undo the confirmation
      await act(async () => {
        await draftResult.current.undoLastConfirmation();
      });

      // Verify tasks are removed
      await act(async () => {
        await taskResult.current.fetchTasks();
      });

      expect(taskResult.current.tasks).toHaveLength(0);
    });
  });

  describe('TC-Voice-03: Draft limit of 10', () => {
    it('should only create first 10 drafts from large input', async () => {
      const { result: draftResult } = renderHook(() => useDraftStore());

      // Create 12 draft tasks
      const manyDrafts = Array.from({ length: 12 }, (_, i) => ({
        title: `Task ${i + 1}`,
        pending: true,
        status: TaskStatus.Active,
      }));

      await act(async () => {
        await draftResult.current.addDraftTasks(manyDrafts);
      });

      // Should only have 10 drafts
      expect(draftResult.current.drafts).toHaveLength(10);
      
      // Verify first 10 are present
      for (let i = 0; i < 10; i++) {
        expect(draftResult.current.drafts[i].title).toBe(`Task ${i + 1}`);
      }
    });
  });

  describe('TC-Voice-04: Parse failure handling', () => {
    it('should handle invalid voice input gracefully', async () => {
      const { result: draftResult } = renderHook(() => useDraftStore());
      
      // Use error handlers to simulate parse failure
      server.use(...errorHandlers);
      
      const mockAudioUri = 'file://mock-audio.m4a';
      
      await expect(async () => {
        await act(async () => {
          await voiceFlow.processVoiceInput(mockAudioUri);
        });
      }).rejects.toThrow();

      // No drafts should be created
      expect(draftResult.current.drafts).toHaveLength(0);
    });

    it('should show appropriate error for unrecognized input', async () => {
      const { result: draftResult } = renderHook(() => useDraftStore());
      
      // Mock empty transcription
      jest.spyOn(global, 'fetch').mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ text: '' }),
        } as Response)
      );
      
      const mockAudioUri = 'file://mock-audio.m4a';
      
      await expect(async () => {
        await act(async () => {
          await voiceFlow.processVoiceInput(mockAudioUri);
        });
      }).rejects.toThrow('No text recognized from audio');

      expect(draftResult.current.drafts).toHaveLength(0);
    });
  });

  describe('TC-Voice-05: Offline mode', () => {
    it('should disable voice input when offline', () => {
      // Mock offline state by clearing OpenAI config
      const originalEnv = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
      delete process.env.EXPO_PUBLIC_OPENAI_API_KEY;

      const isAvailable = voiceFlow.isAvailable();
      expect(isAvailable).toBe(false);

      // Restore environment
      process.env.EXPO_PUBLIC_OPENAI_API_KEY = originalEnv;
    });

    it('should prevent voice processing when offline', async () => {
      const originalEnv = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
      delete process.env.EXPO_PUBLIC_OPENAI_API_KEY;

      const mockAudioUri = 'file://mock-audio.m4a';
      
      await expect(async () => {
        await voiceFlow.processVoiceInput(mockAudioUri);
      }).rejects.toThrow();

      process.env.EXPO_PUBLIC_OPENAI_API_KEY = originalEnv;
    });
  });

  describe('Draft selection and management', () => {
    it('should toggle individual draft selection', async () => {
      const { result: draftResult } = renderHook(() => useDraftStore());

      await act(async () => {
        await draftResult.current.addDraftTasks([
          { title: 'Task 1', pending: true, status: TaskStatus.Active },
          { title: 'Task 2', pending: true, status: TaskStatus.Active },
        ]);
      });

      const firstDraftId = draftResult.current.drafts[0].id;

      // Toggle selection
      act(() => {
        draftResult.current.toggleDraftSelection(firstDraftId);
      });

      expect(draftResult.current.drafts[0].selected).toBe(false);
      expect(draftResult.current.drafts[1].selected).toBe(true);
    });

    it('should toggle all draft selections', async () => {
      const { result: draftResult } = renderHook(() => useDraftStore());

      await act(async () => {
        await draftResult.current.addDraftTasks([
          { title: 'Task 1', pending: true, status: TaskStatus.Active },
          { title: 'Task 2', pending: true, status: TaskStatus.Active },
          { title: 'Task 3', pending: true, status: TaskStatus.Active },
        ]);
      });

      // All should be selected by default
      expect(draftResult.current.drafts.every(d => d.selected)).toBe(true);

      // Toggle all off
      act(() => {
        draftResult.current.toggleAllSelection();
      });

      expect(draftResult.current.drafts.every(d => !d.selected)).toBe(true);

      // Toggle all on
      act(() => {
        draftResult.current.toggleAllSelection();
      });

      expect(draftResult.current.drafts.every(d => d.selected)).toBe(true);
    });

    it('should confirm single draft immediately', async () => {
      const { result: draftResult } = renderHook(() => useDraftStore());
      const { result: taskResult } = renderHook(() => useTaskStore());

      await act(async () => {
        await draftResult.current.addDraftTasks([
          { title: 'Single Draft', pending: true, status: TaskStatus.Active },
          { title: 'Other Draft', pending: true, status: TaskStatus.Active },
        ]);
      });

      const firstDraftId = draftResult.current.drafts[0].id;

      // Confirm single draft
      await act(async () => {
        await draftResult.current.confirmSingleDraft(firstDraftId);
      });

      // Should have one draft remaining
      expect(draftResult.current.drafts).toHaveLength(1);
      expect(draftResult.current.drafts[0].title).toBe('Other Draft');

      // Task should be created
      await act(async () => {
        await taskResult.current.fetchTasks();
      });

      expect(taskResult.current.tasks.some(t => t.title === 'Single Draft')).toBe(true);
    });

    it('should clear unselected drafts', async () => {
      const { result: draftResult } = renderHook(() => useDraftStore());

      await act(async () => {
        await draftResult.current.addDraftTasks([
          { title: 'Selected', pending: true, status: TaskStatus.Active },
          { title: 'Unselected', pending: true, status: TaskStatus.Active },
        ]);
      });

      // Deselect second draft
      act(() => {
        draftResult.current.toggleDraftSelection(draftResult.current.drafts[1].id);
      });

      // Clear unselected
      await act(async () => {
        await draftResult.current.clearUnselectedDrafts();
      });

      expect(draftResult.current.drafts).toHaveLength(1);
      expect(draftResult.current.drafts[0].title).toBe('Selected');
    });
  });
});