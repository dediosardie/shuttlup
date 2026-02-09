import { supabase } from '../supabaseClient';

export interface AuthResponse {
  user: any | null;
  error: string | null;
}

export interface AuthState {
  user: any | null;
  loading: boolean;
}

// Session configuration
const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
const SESSION_CHECK_INTERVAL = 60 * 1000; // Check every minute

// Allowed email domains and specific emails
const ALLOWED_EMAIL_DOMAINS = ['pg.com','dns.com.ph'];
const ALLOWED_ADMIN_EMAILS = ['dediosardie11@gmail.com', 'advillanuevajr@gmail.com'];

/**
 * Validate if email is allowed to sign up
 */
export function validateEmailDomain(email: string): { isValid: boolean; error?: string } {
  const emailLower = email.toLowerCase().trim();
  
  // Check if it's an allowed admin email
  if (ALLOWED_ADMIN_EMAILS.includes(emailLower)) {
    return { isValid: true };
  }
  
  // Check if email domain is in allowed list
  const domain = emailLower.split('@')[1];
  if (domain && ALLOWED_EMAIL_DOMAINS.includes(domain)) {
    return { isValid: true };
  }
  
  return { 
    isValid: false, 
    error: `Sign up is restricted to @pg.com email addresses. Contact administrator for special access.` 
  };
}

/**
 * Authentication Service
 * Handles custom authentication with session expiration and concurrent login management
 */
export const authService = {
  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string): Promise<AuthResponse> {
    try {
      console.log('🔐 Signing in with Supabase Auth...');

      // Sign in using Supabase Auth (checks auth.users)
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (authError) {
        console.error('Supabase Auth sign-in error:', authError);
        return {
          user: null,
          error: authError.message === 'Invalid login credentials' 
            ? 'Invalid email or password' 
            : 'Authentication failed. Please try again.',
        };
      }

      if (!authData.user) {
        return {
          user: null,
          error: 'Invalid email or password',
        };
      }

      console.log('✅ Supabase Auth successful, fetching user details...');

      // Fetch user details from public.users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (userError || !userData) {
        console.error('User fetch error:', userError);
        await supabase.auth.signOut();
        return {
          user: null,
          error: 'User account not found',
        };
      }

      // Check if user account is active
      if (!userData.is_active) {
        // Sign out from Supabase Auth since account is not active
        await supabase.auth.signOut();
        return {
          user: null,
          error: 'Your account is pending approval. Please wait for an administrator to activate your account before signing in.',
        };
      }

      console.log('✅ User is active, creating session...');

      // Generate new session token (this will replace any existing session)
      const sessionToken = `session_${userData.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const expiresAt = new Date(Date.now() + SESSION_DURATION).toISOString();

      // Update session_id in database (replaces existing session if any)
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          session_id: sessionToken,
          session_expires_at: expiresAt
        })
        .eq('id', userData.id);

      if (updateError) {
        console.error('Failed to update session:', updateError);
        return {
          user: null,
          error: 'Failed to create session',
        };
      }

      console.log('✅ Session created successfully');

      // Store session in localStorage
      console.log('Storing session - user role from DB:', userData.role);
      localStorage.setItem('session_token', sessionToken);
      localStorage.setItem('user_id', userData.id);
      localStorage.setItem('user_email', userData.email);
      localStorage.setItem('user_role', userData.role);
      localStorage.setItem('session_expires_at', expiresAt);
      console.log('Stored in localStorage - user_role:', localStorage.getItem('user_role'));

      // Start session monitoring
      this.startSessionMonitoring();

      return {
        user: userData,
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
      // Validate email domain
      const validation = validateEmailDomain(email);
      if (!validation.isValid) {
        return {
          user: null,
          error: validation.error || 'Email not allowed',
        };
      }
      
      // Determine role based on email
      const emailLower = email.toLowerCase().trim();
      const isAdminEmail = ALLOWED_ADMIN_EMAILS.includes(emailLower);
      const userRole = isAdminEmail ? 'administration' : 'passenger';
      
      // Step 1: Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            full_name: fullName || email.split('@')[0],
          },
          emailRedirectTo: window.location.origin
        }
      });

      if (authError) {
        console.error('Supabase Auth signup error:', authError);
        let errorMessage = authError.message;
        
        // Handle specific error cases
        if (authError.message.includes('Signups not allowed')) {
          errorMessage = 'Signups are currently disabled. Please contact your administrator.';
        } else if (authError.message.includes('already registered')) {
          errorMessage = 'This email is already registered. Please try logging in instead.';
        }
        
        return {
          user: null,
          error: errorMessage,
        };
      }

      if (!authData.user) {
        return {
          user: null,
          error: 'Failed to create user account',
        };
      }

      // Step 2: Create user in shuttlup.users table with the same ID from Supabase Auth
      const { error } = await supabase
        .rpc('create_user_with_auth_id', {
          p_user_id: authData.user.id, // Pass the Supabase Auth user ID
          p_email: email,
          p_password: password,
          p_full_name: fullName || email.split('@')[0],
          p_role: userRole,
          p_is_active: true // Admin emails are auto-activated
        });

      if (error) {
        console.error('Database user creation error:', error);
        // Attempt to clean up the Supabase Auth user if database insertion fails
        try {
          await supabase.auth.admin.deleteUser(authData.user.id);
        } catch (cleanupError) {
          console.error('Failed to cleanup auth user:', cleanupError);
        }
        return {
          user: null,
          error: error.message,
        };
      }

      return {
        user: {
          id: authData.user.id, // Use the Supabase Auth user ID
          email: email,
          full_name: fullName || email.split('@')[0],
          role: userRole,
          is_active: true,
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
          .update({ 
            session_id: null,
            session_expires_at: null
          })
          .eq('id', userId);
      }

      // Stop session monitoring
      this.stopSessionMonitoring();

      // Clear all session data from localStorage
      localStorage.removeItem('session_token');
      localStorage.removeItem('user_id');
      localStorage.removeItem('user_email');
      localStorage.removeItem('user_role');
      localStorage.removeItem('session_expires_at');
      sessionStorage.clear();

      return { error: null };
    } catch (error: any) {
      console.error('Sign out error:', error);
      return { error: error.message || 'An error occurred during sign out' };
    }
  },

  /**
   * Send password reset request using Supabase Auth
   * Supabase will send an email with a reset link
   */
  async forgotPassword(email: string): Promise<{ error: string | null }> {
    try {
      console.log('Requesting password reset for:', email);

      // First, check if user exists in auth.users
      const { data: users, error: checkError } = await supabase
        .from('users')
        .select('id, email, is_active')
        .eq('email', email)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking user:', checkError);
      }

      if (!users) {
        console.warn('User not found, but returning success to prevent email enumeration');
        // Return success anyway to prevent email enumeration attacks
        return { error: null };
      }

      if (!users.is_active) {
        return { error: 'Account is not active. Please contact administrator.' };
      }

      console.log('User found, sending reset email via Supabase Auth...');

      // Use production URL for redirect (works for both local dev and production)
      const redirectUrl = `${window.location.origin}/reset-password`;
      console.log('📧 Sending password reset email with redirect URL:', redirectUrl);

      // Use Supabase Auth's built-in password reset
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        console.error('Password reset request error:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        
        // Provide more specific error messages
        if (error.message.includes('rate limit')) {
          return { error: 'Too many reset requests. Please wait a few minutes and try again.' };
        }
        
        return { error: error.message };
      }

      console.log('✅ Password reset request accepted by Supabase Auth');
      console.log('⚠️ Note: Check spam folder if email not received within 5 minutes');
      console.log('Response:', data);

      return { error: null };
    } catch (error: any) {
      console.error('Forgot password error:', error);
      return { error: error.message || 'An error occurred' };
    }
  },

  /**
   * Update user password (works for both logged-in users and password reset)
   * Updates BOTH auth.users (via Supabase) and public.users (via trigger/RPC)
   */
  async updatePassword(newPassword: string): Promise<{ error: string | null }> {
    try {
      console.log('Updating password...');

      // Get current user session
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { error: 'No active session' };
      }

      // Update password in Supabase Auth (updates auth.users)
      const { error: authError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (authError) {
        console.error('Supabase Auth password update error:', authError);
        return { error: authError.message };
      }

      console.log('✅ Password updated in auth.users via Supabase Auth');

      // Also update public.users to keep both tables in sync
      try {
        const { error: publicError } = await supabase
          .from('users')
          .update({
            password_hash: `updated_via_auth_${Date.now()}`, // Marker that it was updated
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (publicError) {
          console.warn('Failed to update public.users:', publicError);
          // Don't fail the whole operation
        } else {
          console.log('✅ Password marker updated in public.users');
        }
      } catch (publicUpdateError) {
        console.warn('Public users update error:', publicUpdateError);
      }

      // Clear local session to force re-login
      localStorage.removeItem('session_token');
      localStorage.removeItem('session_expires_at');

      console.log('✅ Password updated successfully in both systems');
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
      const expiresAt = localStorage.getItem('session_expires_at');

      if (!sessionToken || !userId || !userEmail) {
        return { user: null, error: 'No active session' };
      }

      // Check if session has expired
      if (expiresAt && new Date(expiresAt) < new Date()) {
        console.log('Session expired');
        await this.signOut();
        return { user: null, error: 'Session expired. Please log in again.' };
      }

      // Verify session in database
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name, role, is_active, session_id, session_expires_at')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Session verification error:', error);
        return { user: null, error: 'Failed to verify session' };
      }

      if (!data) {
        await this.clearSession();
        return { user: null, error: 'User not found' };
      }

      // Check if session was replaced (different session_id in DB)
      if (data.session_id !== sessionToken) {
        console.log('Session replaced by another login');
        await this.clearSession();
        return { 
          user: null, 
          error: 'Your session was replaced by a login from another device.' 
        };
      }

      // Check if session expired in database
      if (data.session_expires_at && new Date(data.session_expires_at) < new Date()) {
        console.log('Session expired in database');
        await this.signOut();
        return { user: null, error: 'Session expired. Please log in again.' };
      }

      // Check if user is inactive
      if (!data.is_active) {
        await this.signOut();
        return { user: null, error: 'Your account has been deactivated.' };
      }

      // Start session monitoring if not already running
      // This ensures monitoring continues after page refresh
      if (!this.sessionCheckInterval) {
        this.startSessionMonitoring();
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

  /**
   * Clear session data from localStorage only (no database update)
   */
  clearSession() {
    localStorage.removeItem('session_token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_role');
    localStorage.removeItem('session_expires_at');
    sessionStorage.clear();
  },

  /**
   * Session monitoring interval
   */
  sessionCheckInterval: null as any,

  /**
   * Start monitoring session validity
   */
  startSessionMonitoring() {
    // Clear any existing interval
    this.stopSessionMonitoring();

    // Check session immediately
    this.checkSessionValidity();

    // Set up periodic checks
    this.sessionCheckInterval = setInterval(() => {
      this.checkSessionValidity();
    }, SESSION_CHECK_INTERVAL);

    console.log('Session monitoring started');
  },

  /**
   * Stop monitoring session
   */
  stopSessionMonitoring() {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
      this.sessionCheckInterval = null;
      console.log('Session monitoring stopped');
    }
  },

  /**
   * Check if current session is still valid
   */
  async checkSessionValidity() {
    const sessionToken = localStorage.getItem('session_token');
    const userId = localStorage.getItem('user_id');
    const expiresAt = localStorage.getItem('session_expires_at');

    if (!sessionToken || !userId) {
      return;
    }

    // Check local expiration
    if (expiresAt && new Date(expiresAt) < new Date()) {
      console.log('Session expired locally');
      window.dispatchEvent(new CustomEvent('session-expired'));
      return;
    }

    // Check database session
    try {
      const { data } = await supabase
        .from('users')
        .select('session_id, session_expires_at')
        .eq('id', userId)
        .maybeSingle();

      if (!data) {
        console.log('User not found in database');
        window.dispatchEvent(new CustomEvent('session-expired'));
        return;
      }

      // Session was replaced
      if (data.session_id !== sessionToken) {
        console.log('Session replaced by another device');
        window.dispatchEvent(new CustomEvent('session-replaced'));
        return;
      }

      // Session expired in database
      if (data.session_expires_at && new Date(data.session_expires_at) < new Date()) {
        console.log('Session expired in database');
        window.dispatchEvent(new CustomEvent('session-expired'));
        return;
      }
    } catch (error) {
      console.error('Error checking session validity:', error);
    }
  },

  /**
   * Extend session expiration time
   */
  async extendSession(): Promise<{ error: string | null }> {
    try {
      const userId = localStorage.getItem('user_id');
      const sessionToken = localStorage.getItem('session_token');

      if (!userId || !sessionToken) {
        return { error: 'No active session' };
      }

      const newExpiresAt = new Date(Date.now() + SESSION_DURATION).toISOString();

      // Update database
      const { error } = await supabase
        .from('users')
        .update({ session_expires_at: newExpiresAt })
        .eq('id', userId)
        .eq('session_id', sessionToken);

      if (error) {
        return { error: error.message };
      }

      // Update localStorage
      localStorage.setItem('session_expires_at', newExpiresAt);

      return { error: null };
    } catch (error: any) {
      console.error('Extend session error:', error);
      return { error: error.message || 'Failed to extend session' };
    }
  },
};

// Clear session on browser/tab close
window.addEventListener('beforeunload', () => {
  // Note: We don't clear the database session here because the user might just be refreshing
  // The session will expire naturally or be replaced on next login
});

// Clear session data when page is hidden (optional - for stricter security)
// Uncomment if you want to force re-login on tab close
/*
window.addEventListener('pagehide', async () => {
  await authService.signOut();
});
*/
