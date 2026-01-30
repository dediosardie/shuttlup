import { useState, FormEvent } from 'react';
import { authService } from '../services/authService';

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    // Validation
    if (!email || !password) {
      setError('Email and password are required');
      return;
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
          setSuccessMessage('Account created successfully! Your account is pending approval from an administrator.');
          setTimeout(() => {
            setViewMode('login');
            setSuccessMessage('');
          }, 5000);
        }
      } else if (viewMode === 'reset-password') {
        const { error: updateError } = await authService.updatePassword(password);
        
        if (updateError) {
          setError(updateError || 'Failed to update password');
        } else {
          setSuccessMessage('Password updated successfully!');
          setTimeout(() => {
            setViewMode('login');
            setSuccessMessage('');
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
        setSuccessMessage('Password reset email sent! Check your inbox.');
        setTimeout(() => {
          setViewMode('login');
          setSuccessMessage('');
        }, 3000);
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-600 rounded-2xl mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Vehicle Management</h1>
          <p className="text-slate-600 mt-2">Fleet maintenance and tracking system</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">
              {viewMode === 'login' && 'Sign In'}
              {viewMode === 'signup' && 'Create Account'}
              {viewMode === 'forgot-password' && 'Reset Password'}
              {viewMode === 'reset-password' && 'New Password'}
            </h2>
            <p className="text-slate-600 mt-1">
              {viewMode === 'login' && 'Enter your credentials to access your account'}
              {viewMode === 'signup' && 'Create a new account to get started'}
              {viewMode === 'forgot-password' && 'Enter your email to receive a reset link'}
              {viewMode === 'reset-password' && 'Enter your new password'}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-emerald-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-emerald-800">{successMessage}</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={viewMode === 'forgot-password' ? handleForgotPassword : handleSubmit}>
            <div className="space-y-4">
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="you@example.com"
                  required
                />
              </div>

              {/* Full Name Field (only for signup) */}
              {viewMode === 'signup' && (
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-slate-700 mb-2">
                    Full Name
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="John Doe"
                    required
                  />
                </div>
              )}

              {/* Password Field (not shown in forgot-password) */}
              {viewMode !== 'forgot-password' && (
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                    {viewMode === 'reset-password' ? 'New Password' : 'Password'}
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="••••••••"
                    required
                  />
                </div>
              )}

              {/* Confirm Password (only for signup and reset) */}
              {(viewMode === 'signup' || viewMode === 'reset-password') && (
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-2">
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
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
                    className="text-sm text-red-600 hover:text-red-700 font-medium"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full px-4 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
            {(viewMode === 'forgot-password') && (
              <p className="text-sm text-slate-600">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('login');
                    setError('');
                    setSuccessMessage('');
                  }}
                  className="text-red-600 hover:text-red-700 font-medium"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-slate-600">
          <p>© 2026 Vehicle Management System. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
