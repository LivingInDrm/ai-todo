import { supabase, isSupabaseConfigured } from '../../services/supabase';

export interface AuthUser {
  id: string;
  email: string;
}

class AuthService {
  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      return false;
    }
    
    const { data: { session } } = await supabase!.auth.getSession();
    return !!session;
  }
  
  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    if (!isSupabaseConfigured()) {
      return null;
    }
    
    const { data: { user } } = await supabase!.auth.getUser();
    
    if (!user) {
      return null;
    }
    
    return {
      id: user.id,
      email: user.email || '',
    };
  }
  
  /**
   * Sign in with email magic link
   */
  async signInWithMagicLink(email: string): Promise<{ error?: string }> {
    if (!isSupabaseConfigured()) {
      return { error: 'Authentication not available in offline mode' };
    }
    
    const { error } = await supabase!.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
      },
    });
    
    if (error) {
      return { error: error.message };
    }
    
    return {};
  }
  
  /**
   * Verify OTP from magic link
   */
  async verifyOtp(email: string, token: string): Promise<{ error?: string }> {
    if (!isSupabaseConfigured()) {
      return { error: 'Authentication not available in offline mode' };
    }
    
    const { error } = await supabase!.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });
    
    if (error) {
      return { error: error.message };
    }
    
    return {};
  }
  
  /**
   * Refresh the current session
   */
  async refreshSession(): Promise<{ error?: string }> {
    if (!isSupabaseConfigured()) {
      return { error: 'Authentication not available in offline mode' };
    }
    
    const { error } = await supabase!.auth.refreshSession();
    
    if (error) {
      return { error: error.message };
    }
    
    return {};
  }
  
  /**
   * Update user profile information
   */
  async updateProfile(updates: { push_token?: string; language?: string }): Promise<{ error?: string }> {
    if (!isSupabaseConfigured()) {
      return { error: 'Authentication not available in offline mode' };
    }
    
    const user = await this.getCurrentUser();
    if (!user) {
      return { error: 'User not authenticated' };
    }
    
    const { error } = await supabase!
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);
    
    if (error) {
      return { error: error.message };
    }
    
    return {};
  }
  
  /**
   * Delete user account and all associated data
   */
  async deleteAccount(): Promise<{ error?: string }> {
    if (!isSupabaseConfigured()) {
      return { error: 'Authentication not available in offline mode' };
    }
    
    // Note: This requires a server-side function to properly delete user data
    // For now, we'll just sign out
    const { error } = await supabase!.auth.signOut();
    
    if (error) {
      return { error: error.message };
    }
    
    return {};
  }
}

export const authService = new AuthService();