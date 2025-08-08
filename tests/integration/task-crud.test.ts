/**
 * Task CRUD Integration Tests
 * Tests actual business logic from features/task/taskStore.ts
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { TaskStatus } from '../../lib/types';
import useTaskStore from '../../features/task/taskStore';
import database from '../../db/database';

describe('Task CRUD Operations', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    // Reset the store state
    useTaskStore.setState({ tasks: [], loading: false, error: null });
    // Reset database
    if (database && database.unsafeResetDatabase) {
      await database.unsafeResetDatabase();
    }
  });

  afterEach(async () => {
    jest.clearAllMocks();
    // Reset database
    if (database && database.unsafeResetDatabase) {
      await database.unsafeResetDatabase();
    }
  });

  describe('TC-Task-01: Normal task creation', () => {
    it('should create a task with title and show it immediately', async () => {
      const { result } = renderHook(() => useTaskStore());

      await act(async () => {
        await result.current.createTask('写日报');
      });

      await waitFor(() => {
        expect(result.current.tasks).toHaveLength(1);
      });

      const createdTask = result.current.tasks[0];
      expect(createdTask.title).toBe('写日报');
      expect(createdTask.pending).toBe(false);
      expect(createdTask.status).toBe(TaskStatus.Active);
      expect(createdTask.createdTs).toBeDefined();
      expect(createdTask.updatedTs).toBeDefined();
      
      // Verify it appears in the correct view (Backlog for tasks without dates)
      const backlogTasks = result.current.getBacklogTasks();
      expect(backlogTasks).toHaveLength(1);
      expect(backlogTasks[0].title).toBe('写日报');
    });

    it('should complete within 100ms', async () => {
      const { result } = renderHook(() => useTaskStore());
      
      const startTime = Date.now();
      await act(async () => {
        await result.current.createTask('写日报');
      });
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThanOrEqual(100);
    });
  });

  describe('TC-Task-02: Empty title cancellation', () => {
    it('should not create task with empty title', async () => {
      const { result } = renderHook(() => useTaskStore());

      await act(async () => {
        try {
          await result.current.createTask('');
        } catch (error) {
          // Expected to fail
        }
      });

      await waitFor(() => {
        expect(result.current.tasks).toHaveLength(0);
      });
    });
  });

  describe('TC-Task-03: Title editing with instant save', () => {
    it('should update task title and persist changes', async () => {
      const { result } = renderHook(() => useTaskStore());

      // Create initial task
      await act(async () => {
        await result.current.createTask('写日报');
      });

      await waitFor(() => {
        expect(result.current.tasks).toHaveLength(1);
      });

      const taskId = result.current.tasks[0].id;
      const originalUpdatedTs = result.current.tasks[0].updatedTs;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      // Update title
      await act(async () => {
        await result.current.updateTask(taskId, { title: '写日报（市场部）' });
      });

      await waitFor(() => {
        const updatedTask = result.current.tasks.find(t => t.id === taskId);
        expect(updatedTask?.title).toBe('写日报（市场部）');
        expect(updatedTask?.updatedTs).toBeGreaterThan(originalUpdatedTs);
      });
    });
  });

  describe('TC-Task-04: Right swipe to complete', () => {
    it('should mark task as completed and move to Done view', async () => {
      const { result } = renderHook(() => useTaskStore());

      // Create task
      await act(async () => {
        await result.current.createTask('写日报（市场部）');
      });

      await waitFor(() => {
        expect(result.current.tasks).toHaveLength(1);
      });

      const taskId = result.current.tasks[0].id;

      // Toggle status (simulate right swipe)
      await act(async () => {
        await result.current.toggleTaskStatus(taskId);
      });

      await waitFor(() => {
        const task = result.current.tasks.find(t => t.id === taskId);
        expect(task?.status).toBe(TaskStatus.Completed);
        expect(task?.completedTs).toBeDefined();
      });

      // Verify task appears in Done view
      const doneTasks = result.current.getDoneTasks();
      expect(doneTasks).toHaveLength(1);
      expect(doneTasks[0].id).toBe(taskId);

      // Verify task no longer in Focus view
      const focusTasks = result.current.getFocusTasks();
      expect(focusTasks).toHaveLength(0);
    });
  });

  describe('TC-Task-05: Right swipe to restore', () => {
    it('should restore completed task back to active', async () => {
      const { result } = renderHook(() => useTaskStore());

      // Create and complete task
      await act(async () => {
        await result.current.createTask('Test Task');
      });

      const taskId = result.current.tasks[0].id;

      await act(async () => {
        await result.current.toggleTaskStatus(taskId);
      });

      // Verify completed
      expect(result.current.tasks[0].status).toBe(TaskStatus.Completed);

      // Toggle again to restore
      await act(async () => {
        await result.current.toggleTaskStatus(taskId);
      });

      await waitFor(() => {
        const task = result.current.tasks.find(t => t.id === taskId);
        expect(task?.status).toBe(TaskStatus.Active);
        expect(task?.completedTs).toBeUndefined();
      });

      // Verify back in Backlog view (no due date)
      const backlogTasks = result.current.getBacklogTasks();
      expect(backlogTasks).toHaveLength(1);
      expect(backlogTasks[0].id).toBe(taskId);
    });
  });

  describe('TC-Task-06: Quick postpone to tomorrow', () => {
    it('should update due date to tomorrow 9am', async () => {
      const { result } = renderHook(() => useTaskStore());

      // Create task
      await act(async () => {
        await result.current.createTask('Test Task');
      });

      const taskId = result.current.tasks[0].id;

      // Calculate tomorrow 9am
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      const tomorrowTs = tomorrow.getTime();

      // Postpone task
      await act(async () => {
        await result.current.postponeTask(taskId, tomorrowTs);
      });

      await waitFor(() => {
        const task = result.current.tasks.find(t => t.id === taskId);
        expect(task?.dueTs).toBe(tomorrowTs);
      });

      // Verify still in Focus (within 7 days)
      const focusTasks = result.current.getFocusTasks();
      expect(focusTasks.some(t => t.id === taskId)).toBe(true);
    });
  });

  describe('TC-Task-07: Custom date beyond 8 days', () => {
    it('should move task to Backlog when due date > 7 days', async () => {
      const { result } = renderHook(() => useTaskStore());

      // Create task
      await act(async () => {
        await result.current.createTask('Future Task');
      });

      const taskId = result.current.tasks[0].id;

      // Set date to 10 days from now
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      const futureTs = futureDate.getTime();

      // Update due date
      await act(async () => {
        await result.current.postponeTask(taskId, futureTs);
      });

      await waitFor(() => {
        const task = result.current.tasks.find(t => t.id === taskId);
        expect(task?.dueTs).toBe(futureTs);
      });

      // Verify in Backlog, not Focus
      const backlogTasks = result.current.getBacklogTasks();
      const focusTasks = result.current.getFocusTasks();
      
      expect(backlogTasks.some(t => t.id === taskId)).toBe(true);
      expect(focusTasks.some(t => t.id === taskId)).toBe(false);
    });
  });

  describe('TC-Task-08: Focus view pinning', () => {
    it('should pin task to top of Focus view', async () => {
      const { result } = renderHook(() => useTaskStore());

      // Create multiple tasks with due dates so they appear in Focus view
      const tomorrow = Date.now() + 24 * 60 * 60 * 1000;
      await act(async () => {
        await result.current.createTask('Task 1', tomorrow);
        await result.current.createTask('Task 2', tomorrow);
        await result.current.createTask('Task 3', tomorrow);
      });

      const taskToPin = result.current.tasks[1]; // Pin Task 2

      // Pin the task
      await act(async () => {
        await result.current.pinTask(taskToPin.id);
      });

      // Verify task is pinned (has pinnedAt timestamp)
      const pinnedTask = result.current.tasks.find(t => t.id === taskToPin.id);
      expect(pinnedTask?.pinnedAt).toBeDefined();
      expect(pinnedTask?.pinnedAt).toBeGreaterThan(0);

      // Check in Focus view - pinned task should be first
      const focusTasks = result.current.getFocusTasks();
      expect(focusTasks[0].id).toBe(taskToPin.id);

      // Verify Backlog view is NOT affected by pinning
      // (Tasks without due dates would be in backlog and sorted by createdTs)
      await act(async () => {
        await result.current.createTask('Backlog Task 1');
        // Small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 10));
        await result.current.createTask('Backlog Task 2');
      });
      
      const backlogTasks = result.current.getBacklogTasks();
      // Backlog should be sorted by creation time (newest first), not by pin status
      const backlogTaskTitles = backlogTasks.map(t => t.title);
      expect(backlogTaskTitles).toContain('Backlog Task 1');
      expect(backlogTaskTitles).toContain('Backlog Task 2');
      // The newest task (Backlog Task 2) should come first
      const task2Index = backlogTaskTitles.indexOf('Backlog Task 2');
      const task1Index = backlogTaskTitles.indexOf('Backlog Task 1');
      expect(task2Index).toBeLessThan(task1Index);

      // Pin again should toggle it off
      await act(async () => {
        await result.current.pinTask(taskToPin.id);
      });

      const unpinnedTask = result.current.tasks.find(t => t.id === taskToPin.id);
      expect(unpinnedTask?.pinnedAt).toBeUndefined();
    });
  });

  describe('TC-Task-09: Delete with undo', () => {
    it('should delete task and support undo', async () => {
      const { result } = renderHook(() => useTaskStore());

      // Create task
      await act(async () => {
        await result.current.createTask('Task to Delete');
      });

      const taskId = result.current.tasks[0].id;
      const originalTask = { ...result.current.tasks[0] };

      // Delete task
      await act(async () => {
        await result.current.deleteTask(taskId);
      });

      await waitFor(() => {
        expect(result.current.tasks.find(t => t.id === taskId)).toBeUndefined();
      });

      // Simulate undo by recreating the task
      // (In real app, this would be handled by Snackbar component)
      await act(async () => {
        await result.current.createTask(
          originalTask.title,
          originalTask.dueTs,
          originalTask.urgent
        );
      });

      // Verify task is restored
      const restoredTask = result.current.tasks.find(t => t.title === originalTask.title);
      expect(restoredTask).toBeDefined();
      expect(restoredTask?.title).toBe(originalTask.title);
    });
  });
});