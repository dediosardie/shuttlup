import { useState, FormEvent, useEffect } from 'react';
import { authService, validateEmailDomain } from '../services/authService';
import logo from '../assets/logo.svg';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

type ViewMode = 'login' | 'signup' | 'forgot-password' | 'reset-password';

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Check for password reset mode on mount
  useEffect(() => {
    // Log current URL for debugging
    console.log('🔍 Current URL:', window.location.href);
    console.log('🔍 Search params:', window.location.search);
    console.log('🔍 Hash params:', window.location.hash);
    
    // Check if URL has reset parameter (from Supabase email link)
    const urlParams = new URLSearchParams(window.location.search);
    const isReset = urlParams.get('reset');
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const type = hashParams.get('type');

    console.log('🔍 Reset param:', isReset);
    console.log('🔍 Access token exists:', !!accessToken);
    console.log('🔍 Type:', type);

    if (isReset === 'true' || (type === 'recovery' && accessToken)) {
      console.log('✅ Password reset mode detected - showing reset form');
      setViewMode('reset-password');
      setSuccessMessage('Enter your new password below');
    } else {
      console.log('ℹ️ No password reset detected - showing login form');
    }
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    // Validation
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }

    // Validate email domain for signup
    if (viewMode === 'signup') {
      const validation = validateEmailDomain(email);
      if (!validation.isValid) {
        setError(validation.error || 'Email not allowed');
        return;
      }
    }

    if (viewMode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      if (viewMode === 'login') {
        const { user, error: signInError } = await authService.signIn(email, password);
        
        console.log('Login result:', { user, error: signInError });
        
        if (signInError) {
          setError(signInError || 'Failed to sign in');
        } else if (user) {
          console.log('Login successful, calling onLoginSuccess');
          // App.tsx will handle role-based redirection via useEffect
          onLoginSuccess();
        } else {
          console.error('No user or error returned from signIn');
          setError('Login failed - please try again');
        }
      } else if (viewMode === 'signup') {
        const { user, error: signUpError } = await authService.signUp(email, password, fullName);
        
        if (signUpError) {
          setError(signUpError || 'Failed to sign up');
        } else if (user) {
          // Check if user is auto-activated (admin email)
          if (user.is_active) {
            setSuccessMessage('Account created successfully! You can now sign in with your credentials.');
          } else {
            setSuccessMessage('Account created successfully! Please wait for an administrator to approve your account before signing in.');
          }
          setTimeout(() => {
            setViewMode('login');
            setSuccessMessage('');
          }, 5000);
        }
      } else if (viewMode === 'reset-password') {
        // Use Supabase Auth to update password
        const { error: updateError } = await authService.updatePassword(password);
        
        if (updateError) {
          setError(updateError || 'Failed to reset password');
        } else {
          setSuccessMessage('Password reset successfully! Redirecting to login...');
          
          // Clear URL parameters
          window.history.replaceState({}, document.title, window.location.pathname);
          
          setTimeout(() => {
            setViewMode('login');
            setSuccessMessage('');
            setPassword('');
            setConfirmPassword('');
          }, 2000);
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!email) {
      setError('Email is required');
      return;
    }

    setIsLoading(true);

    try {
      const { error: resetError } = await authService.forgotPassword(email);
      
      if (resetError) {
        setError(resetError || 'Failed to send reset email');
      } else {
        setSuccessMessage('Password reset email sent! Check your inbox (and spam folder). The email may take a few minutes to arrive.');
        
        // Show additional help message
        console.log('📧 Password reset email sent to:', email);
        console.log('⚠️ Important: Check your spam/junk folder');
        console.log('⏱️ Email may take 1-5 minutes to arrive');
        console.log('🔍 If no email after 5 minutes, check Supabase Dashboard → Logs');
        
        setTimeout(() => {
          setViewMode('login');
          setSuccessMessage('');
        }, 8000); // Give user more time to read the message
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <img src={logo} alt="Shutt'L Up" className="w-auto h-52 drop-shadow-lg" />
          </div>
          <h1 className="text-3xl font-bold text-text-primary">Safety, Comfort and On-Time</h1>
          {/* <p className="text-text-secondary mt-2">Safety, Comfort and On-Time</p> */}
        </div>

        {/* Login Card */}
        <div className="bg-bg-secondary rounded-lg shadow-xl border border-border-muted p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-text-primary">
              {viewMode === 'login' && 'Sign In'}
              {viewMode === 'signup' && 'Create Account'}
              {viewMode === 'forgot-password' && 'Reset Password'}
              {viewMode === 'reset-password' && 'New Password'}
            </h2>
            <p className="text-text-secondary mt-1">
              {viewMode === 'login' && 'Enter your credentials to access your account'}
              {viewMode === 'signup' && 'Create a new account to get started'}
              {viewMode === 'forgot-password' && 'Enter your email to receive a reset link'}
              {viewMode === 'reset-password' && 'Enter your new password'}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-accent-soft border border-accent rounded-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-accent mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-text-primary">{error}</p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="mb-4 p-4 bg-accent-soft border border-accent rounded-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-accent mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-text-primary">{successMessage}</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={viewMode === 'forgot-password' ? handleForgotPassword : handleSubmit}>
            <div className="space-y-4">
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-bg-elevated border border-border-muted rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
                  placeholder="you@example.com"
                  required
                />
              </div>

              {/* Full Name Field (only for signup) */}
              {viewMode === 'signup' && (
                <>
                  <div className="mb-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                    <p className="text-xs text-blue-400">
                      ℹ️ Sign up is restricted to <strong>@pg.com</strong> email addresses only.
                    </p>
                  </div>
                  <div>
                    <label htmlFor="fullName" className="block text-sm font-medium text-text-secondary mb-2">
                      Full Name
                    </label>
                    <input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-bg-elevated border border-border-muted rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
                      placeholder="John Doe"
                      required
                    />
                  </div>
                </>
              )}

              {/* Password Field (not shown in forgot-password) */}
              {viewMode !== 'forgot-password' && (
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-text-secondary mb-2">
                    {viewMode === 'reset-password' ? 'New Password' : 'Password'}
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-bg-elevated border border-border-muted rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
                    placeholder="••••••••"
                    required
                  />
                </div>
              )}

              {/* Confirm Password (only for signup and reset) */}
              {(viewMode === 'signup' || viewMode === 'reset-password') && (
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-text-secondary mb-2">
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-bg-elevated border border-border-muted rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
                    placeholder="••••••••"
                    required
                  />
                </div>
              )}

              {/* Forgot Password Link (only on login) */}
              {viewMode === 'login' && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setViewMode('forgot-password')}
                    className="text-sm text-accent hover:text-accent-hover font-medium transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full px-4 py-3 bg-accent text-black font-medium rounded-lg hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  <>
                    {viewMode === 'login' && 'Sign In'}
                    {viewMode === 'signup' && 'Create Account'}
                    {viewMode === 'forgot-password' && 'Send Reset Link'}
                    {viewMode === 'reset-password' && 'Update Password'}
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Toggle Between Login/Signup */}
          <div className="mt-6 text-center">
            {viewMode === 'login' && (
              <p className="text-sm text-text-secondary">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('signup');
                    setError('');
                    setSuccessMessage('');
                  }}
                  className="text-accent hover:text-accent-hover font-medium transition-colors"
                >
                  Sign up
                </button>
              </p>
            )}
            {viewMode === 'signup' && (
              <p className="text-sm text-text-secondary">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('login');
                    setError('');
                    setSuccessMessage('');
                  }}
                  className="text-accent hover:text-accent-hover font-medium transition-colors"
                >
                  Sign in
                </button>
              </p>
            )}
            {(viewMode === 'forgot-password') && (
              <p className="text-sm text-text-secondary">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('login');
                    setError('');
                    setSuccessMessage('');
                  }}
                  className="text-accent hover:text-accent-hover font-medium transition-colors"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-text-muted">
          <p>© 2024 Shutt'L Up. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
