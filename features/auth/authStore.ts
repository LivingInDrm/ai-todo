import { create } from 'zustand';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../../services/supabase';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  
  // Actions
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isLoading: false,
  isInitialized: false,
  error: null,
  
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
              break;
            case 'SIGNED_OUT':
              console.log('User signed out');
              // Clear local data if needed
              break;
            case 'TOKEN_REFRESHED':
              console.log('Token refreshed');
              break;
          }
        }
      );
      
      // Store subscription for cleanup if needed
      (window as any).__authSubscription = subscription;
      
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
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        set({ error: error.message });
      } else {
        set({ 
          user: null,
          session: null,
        });
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
}));