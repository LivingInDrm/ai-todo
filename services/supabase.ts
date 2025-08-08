import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

// Supabase URL and Anon Key from environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase configuration missing. Running in offline mode.');
}

// Custom storage adapter for React Native using SecureStore
const SecureStoreAdapter = {
  getItem: async (key: string) => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error('SecureStore getItem error:', error);
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error('SecureStore setItem error:', error);
    }
  },
  removeItem: async (key: string) => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error('SecureStore removeItem error:', error);
    }
  },
};

// Create Supabase client with custom storage
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: SecureStoreAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

// Type definitions for database tables
export interface SupabaseTask {
  id: string;
  user_id: string;
  title: string;
  due_ts: number | null;
  urgent: number;
  status: number; // 0 = active, 1 = completed
  pending: number; // 0 = confirmed, 1 = draft
  pinned_at: number;
  completed_ts: number | null;
  created_ts: number;
  updated_ts: number;
}

export interface SupabaseProfile {
  id: string;
  email: string;
  push_token?: string;
  language?: string;
  created_at: string;
  updated_at: string;
}

// Helper to check if Supabase is available
export const isSupabaseConfigured = () => {
  return supabase !== null;
};

// Database table names
export const TABLES = {
  TASKS: 'tasks',
  PROFILES: 'profiles',
} as const;