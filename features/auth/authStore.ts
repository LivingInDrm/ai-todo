import { create } from 'zustand';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../../services/supabase';
import database from '../../db/database';
import { Q } from '@nozbe/watermelondb';
import AsyncStorage from '@react-native-async-storage/async-storage';
import reminderService from '../notify/reminderService';
import { taskSyncService } from '../task/taskSync';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  subscription: { unsubscribe: () => void } | null;
  
  // Actions
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
  cleanup: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isLoading: false,
  isInitialized: false,
  error: null,
  subscription: null,
  
  initialize: async () => {
    if (!supabase) {
      set({ isInitialized: true });
      return;
    }
    
    try {
      set({ isLoading: true });
      
      // Get current session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Auth initialization error:', error);
        set({ error: error.message });
      } else {
        set({ 
          session,
          user: session?.user ?? null,
        });
      }
      
      // Set up auth state listener
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log('Auth state changed:', event);
          set({ 
            session,
            user: session?.user ?? null,
          });
          
          // Handle specific auth events
          switch (event) {
            case 'SIGNED_IN':
              console.log('User signed in');
              // Trigger initial sync after sign in
              if (session?.user) {
                taskSyncService.initializeRealtimeSync();
              }
              break;
            case 'SIGNED_OUT':
              console.log('User signed out');
              break;
            case 'TOKEN_REFRESHED':
              console.log('Token refreshed');
              break;
          }
        }
      );
      
      // Store subscription for cleanup
      set({ subscription });
      
    } catch (error) {
      console.error('Auth initialization error:', error);
      set({ error: 'Failed to initialize authentication' });
    } finally {
      set({ isLoading: false, isInitialized: true });
    }
  },
  
  signIn: async (email: string, password: string) => {
    if (!supabase) {
      set({ error: 'Authentication not available in offline mode' });
      return;
    }
    
    set({ isLoading: true, error: null });
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        set({ error: error.message });
      } else {
        set({ 
          session: data.session,
          user: data.user,
        });
      }
    } catch (error) {
      console.error('Sign in error:', error);
      set({ error: 'Failed to sign in' });
    } finally {
      set({ isLoading: false });
    }
  },
  
  signUp: async (email: string, password: string) => {
    if (!supabase) {
      set({ error: 'Authentication not available in offline mode' });
      return;
    }
    
    set({ isLoading: true, error: null });
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) {
        set({ error: error.message });
      } else if (data.user && !data.session) {
        // Email confirmation required
        set({ error: 'Please check your email to confirm your account' });
      } else {
        set({ 
          session: data.session,
          user: data.user,
        });
      }
    } catch (error) {
      console.error('Sign up error:', error);
      set({ error: 'Failed to sign up' });
    } finally {
      set({ isLoading: false });
    }
  },
  
  signOut: async () => {
    if (!supabase) {
      set({ user: null, session: null });
      return;
    }
    
    set({ isLoading: true, error: null });
    
    try {
      // Clear local task data before signing out
      console.log('Clearing local data before sign out...');
      
      // Cancel all notifications
      await reminderService.clearAllReminders();
      
      // Clear offline sync queue
      await AsyncStorage.removeItem('task_sync_offline_queue');
      
      // Clear all local tasks from database
      await database.write(async () => {
        const tasks = await database.collections
          .get('tasks')
          .query()
          .fetch();
        
        // Mark all tasks as deleted
        for (const task of tasks) {
          await task.markAsDeleted();
        }
      });
      
      // Clean up sync service
      await taskSyncService.cleanup();
      
      // Clear any other user-specific cached data
      const keysToRemove = [
        'task_notification_ids',
        'user_preferences',
        'last_sync_timestamp',
      ];
      
      for (const key of keysToRemove) {
        await AsyncStorage.removeItem(key);
      }
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        set({ error: error.message });
      } else {
        set({ 
          user: null,
          session: null,
        });
        console.log('Sign out completed, local data cleared');
      }
    } catch (error) {
      console.error('Sign out error:', error);
      set({ error: 'Failed to sign out' });
    } finally {
      set({ isLoading: false });
    }
  },
  
  clearError: () => {
    set({ error: null });
  },
  
  cleanup: () => {
    const { subscription } = get();
    if (subscription) {
      subscription.unsubscribe();
      set({ subscription: null });
    }
  },
}));