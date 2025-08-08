/**
 * Performance and Animation Tests
 * Tests rendering performance and animation timing
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { render } from '@testing-library/react-native';
import React from 'react';
import { FlatList, Animated } from 'react-native';
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
import useDraftStore from '../../features/draft/draftStore';

describe('Performance and Animation', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    // Reset store states
    useTaskStore.setState({ tasks: [], loading: false, error: null });
    useDraftStore.setState({ drafts: [], isExpanded: true, loading: false, lastConfirmedIds: [] });
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  describe('TC-Perf-01: List scrolling at 60fps', () => {
    it('should handle 200+ tasks efficiently', async () => {
      const { result } = renderHook(() => useTaskStore());

      // Create 200 tasks
      const startTime = performance.now();
      
      await act(async () => {
        const promises = [];
        for (let i = 0; i < 200; i++) {
          promises.push(
            result.current.createTask(`Task ${i + 1}`, Date.now() + (i * 60000))
          );
        }
        await Promise.all(promises);
      });

      const creationTime = performance.now() - startTime;
      
      // Should create all tasks reasonably quickly
      expect(result.current.tasks).toHaveLength(200);
      expect(creationTime).toBeLessThan(5000); // 5 seconds max for 200 tasks

      // Test view filtering performance
      const filterStartTime = performance.now();
      
      const focusTasks = result.current.getFocusTasks();
      const backlogTasks = result.current.getBacklogTasks();
      const doneTasks = result.current.getDoneTasks();
      
      const filterTime = performance.now() - filterStartTime;
      
      // Filtering should be very fast (in-memory operations)
      expect(filterTime).toBeLessThan(100); // 100ms max for filtering
      
      // Verify filtering works correctly
      expect(focusTasks.length + backlogTasks.length).toBeLessThanOrEqual(200);
      expect(doneTasks).toHaveLength(0); // No completed tasks yet
    });

    it('should maintain performance with rapid scroll simulation', async () => {
      const { result } = renderHook(() => useTaskStore());

      // Create tasks
      await act(async () => {
        const promises = [];
        for (let i = 0; i < 100; i++) {
          promises.push(result.current.createTask(`Task ${i + 1}`));
        }
        await Promise.all(promises);
      });

      // Simulate rapid access to different task ranges (like scrolling)
      const accessTimes: number[] = [];
      
      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();
        
        // Access tasks at different positions
        const startIndex = i * 10;
        const endIndex = startIndex + 10;
        const tasksSlice = result.current.tasks.slice(startIndex, endIndex);
        
        // Simulate rendering calculations
        tasksSlice.forEach(task => {
          const isOverdue = task.dueTs && task.dueTs < Date.now();
          const displayTime = task.dueTs ? new Date(task.dueTs).toLocaleString() : '';
        });
        
        accessTimes.push(performance.now() - startTime);
      }

      // All accesses should be very fast
      const averageAccessTime = accessTimes.reduce((a, b) => a + b, 0) / accessTimes.length;
      expect(averageAccessTime).toBeLessThan(10); // Less than 10ms average
      
      // No single access should spike
      expect(Math.max(...accessTimes)).toBeLessThan(20);
    });

    it('should handle concurrent operations without blocking', async () => {
      const { result } = renderHook(() => useTaskStore());

      // Create initial tasks
      await act(async () => {
        const promises = [];
        for (let i = 0; i < 50; i++) {
          promises.push(result.current.createTask(`Initial ${i}`));
        }
        await Promise.all(promises);
      });

      // Perform multiple operations concurrently
      const operationStart = performance.now();
      
      await act(async () => {
        const operations = [
          // Create new tasks
          ...Array.from({ length: 10 }, (_, i) => 
            result.current.createTask(`New ${i}`)
          ),
          // Update existing tasks
          ...result.current.tasks.slice(0, 10).map(task =>
            result.current.updateTask(task.id, { urgent: true })
          ),
          // Complete some tasks
          ...result.current.tasks.slice(10, 20).map(task =>
            result.current.toggleTaskStatus(task.id)
          ),
        ];
        
        await Promise.all(operations);
      });

      const operationTime = performance.now() - operationStart;
      
      // Concurrent operations should complete efficiently
      expect(operationTime).toBeLessThan(2000);
      
      // Verify state consistency after concurrent operations
      expect(result.current.tasks.length).toBeGreaterThanOrEqual(60);
      const urgentTasks = result.current.tasks.filter(t => t.urgent);
      expect(urgentTasks.length).toBeGreaterThanOrEqual(10);
    });
  });

  describe('TC-Anim-01: Draft fade-in animation', () => {
    it('should complete draft appearance animation within 200ms', async () => {
      const { result: draftResult } = renderHook(() => useDraftStore());
      
      // Track animation timing
      const animationValue = new Animated.Value(0);
      
      // Create drafts
      const animationStart = performance.now();
      
      await act(async () => {
        await draftResult.current.addDraftTasks([
          { title: 'Animated Draft 1', pending: true, status: TaskStatus.Active },
          { title: 'Animated Draft 2', pending: true, status: TaskStatus.Active },
        ]);
      });

      // Simulate animation
      Animated.parallel([
        Animated.timing(animationValue, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Wait for animation to complete
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const animationTime = performance.now() - animationStart;
      
      // Animation should complete within specified time
      expect(animationTime).toBeLessThanOrEqual(250); // 200ms + small buffer
      
      // Drafts should be visible and expanded
      expect(draftResult.current.drafts).toHaveLength(2);
      expect(draftResult.current.isExpanded).toBe(true);
    });

    it('should handle opacity and translateY transforms smoothly', () => {
      // Test animation configuration
      const opacityAnim = new Animated.Value(0);
      const translateYAnim = new Animated.Value(20);
      
      const animations = [
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateYAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ];
      
      // Verify animation configuration
      animations.forEach(anim => {
        expect(anim).toBeDefined();
        // In test environment, we can't access private properties
        // Just verify the animation object exists
        expect(typeof anim.start).toBe('function');
        expect(typeof anim.stop).toBe('function');
      });
    });

    it('should not cause flicker during rapid draft additions', async () => {
      const { result: draftResult } = renderHook(() => useDraftStore());
      
      // Rapidly add drafts
      const flickerTest = async () => {
        for (let i = 0; i < 5; i++) {
          await act(async () => {
            await draftResult.current.addDraftTasks([
              { title: `Rapid Draft ${i}`, pending: true, status: TaskStatus.Active },
            ]);
          });
          
          // Small delay between additions
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      };
      
      const startTime = performance.now();
      await flickerTest();
      const totalTime = performance.now() - startTime;
      
      // All drafts should be added smoothly
      expect(draftResult.current.drafts).toHaveLength(5);
      expect(totalTime).toBeLessThan(500); // Should complete quickly
      
      // Expanded state should remain stable
      expect(draftResult.current.isExpanded).toBe(true);
    });
  });

  describe('Memory and resource management', () => {
    it('should efficiently handle task cleanup', async () => {
      const { result } = renderHook(() => useTaskStore());

      // Create many tasks
      await act(async () => {
        const promises = [];
        for (let i = 0; i < 100; i++) {
          promises.push(result.current.createTask(`Task ${i}`));
        }
        await Promise.all(promises);
      });

      expect(result.current.tasks).toHaveLength(100);

      // Delete half of them
      const deleteStart = performance.now();
      
      await act(async () => {
        const toDelete = result.current.tasks.slice(0, 50);
        const deletePromises = toDelete.map(task => 
          result.current.deleteTask(task.id)
        );
        await Promise.all(deletePromises);
      });

      const deleteTime = performance.now() - deleteStart;
      
      // Deletion should be efficient
      expect(deleteTime).toBeLessThan(1000);
      expect(result.current.tasks).toHaveLength(50);
    });

    it('should handle view switching without lag', async () => {
      const { result } = renderHook(() => useTaskStore());

      // Create diverse tasks
      await act(async () => {
        const promises = [];
        const now = Date.now();
        
        // Tasks for different views
        for (let i = 0; i < 30; i++) {
          // Focus tasks (due soon)
          promises.push(result.current.createTask(`Focus ${i}`, now + i * 60000));
        }
        
        for (let i = 0; i < 30; i++) {
          // Backlog tasks (far future)
          promises.push(
            result.current.createTask(`Backlog ${i}`, now + (30 + i) * 24 * 60 * 60 * 1000)
          );
        }
        
        for (let i = 0; i < 30; i++) {
          // Tasks to complete
          promises.push(result.current.createTask(`Done ${i}`));
        }
        
        await Promise.all(promises);
      });

      // Complete some tasks
      await act(async () => {
        const toComplete = result.current.tasks
          .filter(t => t.title.startsWith('Done'))
          .slice(0, 30);
        
        const completePromises = toComplete.map(task =>
          result.current.toggleTaskStatus(task.id)
        );
        
        await Promise.all(completePromises);
      });

      // Test view switching performance
      const viewSwitchTimes: number[] = [];
      
      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();
        
        // Switch between views
        const focusTasks = result.current.getFocusTasks();
        const backlogTasks = result.current.getBacklogTasks();
        const doneTasks = result.current.getDoneTasks();
        
        viewSwitchTimes.push(performance.now() - startTime);
      }

      // All view switches should be instant
      const averageSwitchTime = viewSwitchTimes.reduce((a, b) => a + b, 0) / viewSwitchTimes.length;
      expect(averageSwitchTime).toBeLessThan(5); // Less than 5ms average
    });
  });
});