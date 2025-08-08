/**
 * Three-View System and Sorting Tests
 * Tests view filtering and sorting logic from taskStore
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
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
import useTaskStore from '../../features/task/taskStore';

describe('Three-View System and Sorting', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    // Reset the store state
    useTaskStore.setState({ tasks: [], loading: false, error: null });
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  describe('TC-View-01: Focus view sorting', () => {
    it('should sort tasks by due_ts ascending (earliest first)', async () => {
      const { result } = renderHook(() => useTaskStore());

      const now = Date.now();
      const tomorrow = now + (24 * 60 * 60 * 1000);
      const dayAfter = now + (2 * 24 * 60 * 60 * 1000);
      const nextWeek = now + (6 * 24 * 60 * 60 * 1000);

      // Create tasks with different due dates
      await act(async () => {
        await result.current.createTask('Task Next Week', nextWeek);
        await result.current.createTask('Task Tomorrow', tomorrow);
        await result.current.createTask('Task Day After', dayAfter);
        await result.current.createTask('Task No Date'); // No due date
      });

      await waitFor(() => {
        expect(result.current.tasks).toHaveLength(4);
      });

      // Get Focus tasks (should include only tasks with dates within 7 days)
      const focusTasks = result.current.getFocusTasks();
      
      // Verify sorting order (no date tasks are in Backlog, not Focus)
      expect(focusTasks).toHaveLength(3);
      expect(focusTasks[0].title).toBe('Task Tomorrow');
      expect(focusTasks[1].title).toBe('Task Day After');
      expect(focusTasks[2].title).toBe('Task Next Week');
    });

    it('should include overdue tasks in Focus view', async () => {
      const { result } = renderHook(() => useTaskStore());

      const yesterday = Date.now() - (24 * 60 * 60 * 1000);
      const lastWeek = Date.now() - (7 * 24 * 60 * 60 * 1000);

      // Create overdue tasks
      await act(async () => {
        await result.current.createTask('Overdue Yesterday', yesterday);
        await result.current.createTask('Overdue Last Week', lastWeek);
        await result.current.createTask('Current Task', Date.now());
      });

      const focusTasks = result.current.getFocusTasks();
      
      // All should be in Focus, sorted by due date
      expect(focusTasks).toHaveLength(3);
      expect(focusTasks[0].title).toBe('Overdue Last Week');
      expect(focusTasks[1].title).toBe('Overdue Yesterday');
      expect(focusTasks[2].title).toBe('Current Task');
    });
  });

  describe('TC-View-02: Backlog view filtering', () => {
    it('should show tasks without dates in Backlog', async () => {
      const { result } = renderHook(() => useTaskStore());

      // Create task without date
      await act(async () => {
        await result.current.createTask('读书');
      });

      await waitFor(() => {
        expect(result.current.tasks).toHaveLength(1);
      });

      // Verify task is in Backlog (no date tasks go to Backlog)
      const backlogTasks = result.current.getBacklogTasks();
      const focusTasks = result.current.getFocusTasks();
      
      expect(backlogTasks).toHaveLength(1);
      expect(backlogTasks[0].title).toBe('读书');
      expect(focusTasks).toHaveLength(0); // No date tasks don't appear in Focus
    });

    it('should sort Backlog by created_ts descending (newest first)', async () => {
      const { result } = renderHook(() => useTaskStore());

      // Create tasks with slight time delays
      await act(async () => {
        await result.current.createTask('First Task');
      });
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await act(async () => {
        await result.current.createTask('Second Task');
      });
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await act(async () => {
        await result.current.createTask('Third Task');
      });

      const backlogTasks = result.current.getBacklogTasks();
      
      // Newest should be first
      expect(backlogTasks[0].title).toBe('Third Task');
      expect(backlogTasks[1].title).toBe('Second Task');
      expect(backlogTasks[2].title).toBe('First Task');
    });

    it('should exclude tasks due within 7 days from Backlog', async () => {
      const { result } = renderHook(() => useTaskStore());

      const tomorrow = Date.now() + (24 * 60 * 60 * 1000);
      const nextMonth = Date.now() + (30 * 24 * 60 * 60 * 1000);

      await act(async () => {
        await result.current.createTask('Tomorrow Task', tomorrow);
        await result.current.createTask('Next Month Task', nextMonth);
      });

      const backlogTasks = result.current.getBacklogTasks();
      
      // Only far future task should be in Backlog
      expect(backlogTasks).toHaveLength(1);
      expect(backlogTasks[0].title).toBe('Next Month Task');
    });
  });

  describe('TC-View-03: Done view 30-day cleanup', () => {
    it('should only show completed tasks from last 30 days', async () => {
      const { result } = renderHook(() => useTaskStore());

      // Create tasks
      await act(async () => {
        await result.current.createTask('Recent Task');
        await result.current.createTask('Old Task');
      });

      const recentId = result.current.tasks[0].id;
      const oldId = result.current.tasks[1].id;

      // Complete both tasks
      await act(async () => {
        await result.current.toggleTaskStatus(recentId);
        await result.current.toggleTaskStatus(oldId);
      });

      // Manually set completed timestamp for old task
      const oldCompletedTs = Date.now() - (31 * 24 * 60 * 60 * 1000);
      await act(async () => {
        await result.current.updateTask(oldId, { 
          completedTs: oldCompletedTs 
        });
      });

      const doneTasks = result.current.getDoneTasks();
      
      // Only recent task should be visible
      expect(doneTasks).toHaveLength(1);
      expect(doneTasks[0].title).toBe('Recent Task');
    });

    it('should sort Done tasks by completed_ts descending (most recent first)', async () => {
      const { result } = renderHook(() => useTaskStore());

      // Create and complete tasks with different timestamps
      await act(async () => {
        await result.current.createTask('Task 1');
        await result.current.createTask('Task 2');
        await result.current.createTask('Task 3');
      });

      const task1Id = result.current.tasks[0].id;
      const task2Id = result.current.tasks[1].id;
      const task3Id = result.current.tasks[2].id;

      // Complete in specific order with time delays
      await act(async () => {
        await result.current.toggleTaskStatus(task1Id);
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      await act(async () => {
        await result.current.toggleTaskStatus(task2Id);
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      await act(async () => {
        await result.current.toggleTaskStatus(task3Id);
      });

      const doneTasks = result.current.getDoneTasks();
      
      // Most recently completed should be first
      expect(doneTasks[0].title).toBe('Task 3');
      expect(doneTasks[1].title).toBe('Task 2');
      expect(doneTasks[2].title).toBe('Task 1');
    });
  });

  describe('View filtering edge cases', () => {
    it('should handle tasks at exact 7-day boundary', async () => {
      const { result } = renderHook(() => useTaskStore());

      const exactly7Days = Date.now() + (7 * 24 * 60 * 60 * 1000);
      const moreThan7Days = exactly7Days + 1;

      await act(async () => {
        await result.current.createTask('Exactly 7 Days', exactly7Days);
        await result.current.createTask('More Than 7 Days', moreThan7Days);
      });

      const focusTasks = result.current.getFocusTasks();
      const backlogTasks = result.current.getBacklogTasks();
      
      // Exactly 7 days should be in Focus
      expect(focusTasks.some(t => t.title === 'Exactly 7 Days')).toBe(true);
      // More than 7 days should be in Backlog
      expect(backlogTasks.some(t => t.title === 'More Than 7 Days')).toBe(true);
    });

    it('should not show completed tasks in Focus or Backlog', async () => {
      const { result } = renderHook(() => useTaskStore());

      await act(async () => {
        await result.current.createTask('Active Task');
        await result.current.createTask('Completed Task');
      });

      const completedId = result.current.tasks[1].id;

      await act(async () => {
        await result.current.toggleTaskStatus(completedId);
      });

      const focusTasks = result.current.getFocusTasks();
      const backlogTasks = result.current.getBacklogTasks();
      const doneTasks = result.current.getDoneTasks();
      
      // Completed task should only be in Done view
      expect(focusTasks.some(t => t.title === 'Completed Task')).toBe(false);
      expect(backlogTasks.some(t => t.title === 'Completed Task')).toBe(false);
      expect(doneTasks.some(t => t.title === 'Completed Task')).toBe(true);
    });
  });
});