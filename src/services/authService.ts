import { supabase } from '../supabaseClient';

export interface AuthResponse {
  user: any | null;
  error: string | null;
}

export interface AuthState {
  user: any | null;
  loading: boolean;
}

/**
 * Authentication Service
 * Handles custom authentication using public.users table
 */
export const authService = {
  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string): Promise<AuthResponse> {
    try {
      // Call the database function to verify credentials
      const { data, error } = await supabase
        .rpc('authenticate_user', {
          p_email: email,
          p_password: password
        });

      if (error) {
        console.error('Authentication error:', error);
        return {
          user: null,
          error: error.message,
        };
      }

      if (!data || data.length === 0) {
        return {
          user: null,
          error: 'Invalid email or password',
        };
      }

      const user = data[0];

      // Check if user is active
      if (!user.is_active) {
        return {
          user: null,
          error: 'Your account is inactive. Please contact an administrator for activation.',
        };
      }

      // Check for existing session (single device login)
      if (user.session_id) {
        return {
          user: null,
          error: 'Account is already logged in from another device. Please log out from the other device first.',
        };
      }

      // Generate session token
      const sessionToken = `session_${user.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Update session_id in database
      const { error: updateError } = await supabase
        .from('users')
        .update({ session_id: sessionToken })
        .eq('id', user.id);

      if (updateError) {
        console.error('Failed to update session:', updateError);
        return {
          user: null,
          error: 'Failed to create session',
        };
      }

      // Store session in localStorage
      console.log('Storing session - user role from DB:', user.role);
      localStorage.setItem('session_token', sessionToken);
      localStorage.setItem('user_id', user.id);
      localStorage.setItem('user_email', user.email);
      localStorage.setItem('user_role', user.role);
      console.log('Stored in localStorage - user_role:', localStorage.getItem('user_role'));

      return {
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          is_active: user.is_active,
        },
        error: null,
      };
    } catch (error: any) {
      console.error('Sign in error:', error);
      return {
        user: null,
        error: error.message || 'An error occurred during sign in',
      };
    }
  },

  /**
   * Sign up new user with email and password
   */
  async signUp(email: string, password: string, fullName?: string): Promise<AuthResponse> {
    try {
      // Call the database function to create user with hashed password
      const { data, error } = await supabase
        .rpc('create_user_account', {
          p_email: email,
          p_password: password,
          p_full_name: fullName || email.split('@')[0],
          p_role: 'viewer',
          p_is_active: false // Requires admin approval
        });

      if (error) {
        console.error('Signup error:', error);
        return {
          user: null,
          error: error.message,
        };
      }

      return {
        user: {
          id: data.id,
          email: data.email,
          full_name: data.full_name,
          role: data.role,
          is_active: data.is_active,
        },
        error: null,
      };
    } catch (error: any) {
      console.error('Sign up error:', error);
      return {
        user: null,
        error: error.message || 'An error occurred during sign up',
      };
    }
  },

  /**
   * Sign out current user
   */
  async signOut(): Promise<{ error: string | null }> {
    try {
      const userId = localStorage.getItem('user_id');
      
      if (userId) {
        // Clear session_id from database
        await supabase
          .from('users')
          .update({ session_id: null })
          .eq('id', userId);
      }

      // Clear localStorage
      localStorage.removeItem('session_token');
      localStorage.removeItem('user_id');
      localStorage.removeItem('user_email');
      localStorage.removeItem('user_role');

      return { error: null };
    } catch (error: any) {
      console.error('Sign out error:', error);
      return { error: error.message || 'An error occurred during sign out' };
    }
  },

  /**
   * Send password reset request
   */
  async forgotPassword(email: string): Promise<{ error: string | null }> {
    try {
      // Call database function to generate password reset token
      const { error } = await supabase
        .rpc('request_password_reset', {
          p_email: email
        });

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (error: any) {
      console.error('Forgot password error:', error);
      return { error: error.message || 'An error occurred' };
    }
  },

  /**
   * Update user password (requires current session)
   */
  async updatePassword(newPassword: string): Promise<{ error: string | null }> {
    try {
      const userId = localStorage.getItem('user_id');
      
      if (!userId) {
        return { error: 'No active session' };
      }

      const { error } = await supabase
        .rpc('update_user_password', {
          p_user_id: userId,
          p_new_password: newPassword
        });

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (error: any) {
      console.error('Update password error:', error);
      return { error: error.message || 'An error occurred' };
    }
  },

  /**
   * Get current user session
   */
  async getSession(): Promise<{ user: any | null; error: string | null }> {
    try {
      const sessionToken = localStorage.getItem('session_token');
      const userId = localStorage.getItem('user_id');
      const userEmail = localStorage.getItem('user_email');
      const userRole = localStorage.getItem('user_role');

      if (!sessionToken || !userId || !userEmail) {
        return { user: null, error: 'No active session' };
      }

      // Verify session in database (optional verification)
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name, role, is_active')
        .eq('id', userId)
        .eq('session_id', sessionToken)
        .maybeSingle();

      if (error) {
        console.error('Session verification error:', error);
        // Return user from localStorage even if DB check fails
        return {
          user: {
            id: userId,
            email: userEmail,
            role: userRole,
            full_name: userEmail.split('@')[0],
            is_active: true,
          },
          error: null,
        };
      }

      if (!data) {
        // Clear invalid session
        localStorage.removeItem('session_token');
        localStorage.removeItem('user_id');
        localStorage.removeItem('user_email');
        localStorage.removeItem('user_role');
        return { user: null, error: 'Invalid or expired session' };
      }

      return {
        user: {
          id: data.id,
          email: data.email,
          full_name: data.full_name,
          role: data.role,
          is_active: data.is_active,
        },
        error: null,
      };
    } catch (error: any) {
      console.error('Get session error:', error);
      // Fallback to localStorage
      const userId = localStorage.getItem('user_id');
      const userEmail = localStorage.getItem('user_email');
      const userRole = localStorage.getItem('user_role');
      
      if (userId && userEmail) {
        return {
          user: {
            id: userId,
            email: userEmail,
            role: userRole,
            full_name: userEmail.split('@')[0],
            is_active: true,
          },
          error: null,
        };
      }
      
      return {
        user: null,
        error: error.message || 'An error occurred',
      };
    }
  },

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<{ user: any | null; error: string | null }> {
    return this.getSession();
  },

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const { user } = await this.getSession();
    return user !== null;
  },
};
