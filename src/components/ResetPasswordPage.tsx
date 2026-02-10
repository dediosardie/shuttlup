import { useState, useEffect, FormEvent } from 'react';
import { authService } from '../services/authService';
import logo from '../assets/logo.svg';

interface ResetPasswordPageProps {
  onResetSuccess?: () => void;
}

export default function ResetPasswordPage({ onResetSuccess }: ResetPasswordPageProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [hasValidToken, setHasValidToken] = useState(false);
  const [recoveryToken, setRecoveryToken] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Validate recovery token from URL on mount
  useEffect(() => {
    const validateToken = async () => {
      console.log('🔍 Checking for recovery token in URL...');
      
      // Get token from URL query parameter
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');

      console.log('Token found:', !!token);

      if (!token) {
        setError('No reset token found. Please request a new password reset from the login page.');
        setIsValidating(false);
        return;
      }

      // Validate the token
      try {
        console.log('🔐 Validating recovery token...');
        const { valid, email, error: validationError } = await authService.validateRecoveryToken(token);

        if (!valid || validationError) {
          console.error('❌ Token validation failed:', validationError);
          setError(validationError || 'Invalid or expired reset link. Please request a new password reset.');
          setHasValidToken(false);
        } else {
          console.log('✅ Token is valid for user:', email);
          setHasValidToken(true);
          setRecoveryToken(token);
          setUserEmail(email || '');
          setSuccessMessage('Please enter your new password below.');
        }
      } catch (err: any) {
        console.error('❌ Error validating token:', err);
        setError('Failed to validate reset link. Please try again.');
        setHasValidToken(false);
      }

      setIsValidating(false);
    };

    validateToken();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    // Validation
    if (!password || !confirmPassword) {
      setError('Please enter and confirm your new password');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    // Check password strength
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    
    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      setError('Password must contain uppercase, lowercase, and numbers');
      return;
    }

    setIsLoading(true);

    try {
      console.log('🔐 Resetting password with custom token...');
      
      // Reset password using custom token
      const { error: resetError } = await authService.resetPasswordWithToken(recoveryToken, password);

      if (resetError) {
        setError(resetError);
      } else {
        setSuccessMessage('✅ Password reset successfully! Redirecting to login...');
        console.log('✅ Password reset successful - synced to both auth.users and public.users');
        
        // Redirect to login after 2 seconds
        setTimeout(() => {
          console.log('🔄 Redirecting to login page...');
          
          // Clear token from URL and redirect
          window.history.replaceState({}, '', '/');
          
          if (onResetSuccess) {
            console.log('Using onResetSuccess callback');
            onResetSuccess();
          } else {
            console.log('Using window.location.href for full page reload');
            // Force full page reload to ensure login page shows
            window.location.href = '/';
          }
        }, 2000);
      }
    } catch (err: any) {
      console.error('❌ Reset error:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    console.log('🔙 Navigating back to login...');
    if (onResetSuccess) {
      onResetSuccess();
    } else {
      window.location.replace('/');
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center">
            <div className="inline-flex items-center justify-center mb-4">
              <img src={logo} alt="Shutt'L Up" className="w-auto h-52 drop-shadow-lg" />
            </div>
            <div className="bg-bg-secondary rounded-lg shadow-xl border border-border-muted p-8">
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-blue"></div>
                <p className="text-text-primary">Validating reset link...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <img src={logo} alt="Shutt'L Up" className="w-auto h-52 drop-shadow-lg" />
          </div>
          <h1 className="text-3xl font-bold text-text-primary">Safety, Comfort and On-Time</h1>
        </div>

        {/* Reset Password Card */}
        <div className="bg-bg-secondary rounded-lg shadow-xl border border-border-muted p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-text-primary">
              {hasValidToken ? 'Set New Password' : 'Reset Link Invalid'}
            </h2>
            {hasValidToken && userEmail && (
              <p className="text-text-secondary mt-2 text-sm">
                Resetting password for: <span className="font-medium">{userEmail}</span>
              </p>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-error-light border border-error-dark rounded-lg">
              <p className="text-error-dark text-sm">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="mb-4 p-4 bg-success-light border border-success-dark rounded-lg">
              <p className="text-success-dark text-sm">{successMessage}</p>
            </div>
          )}

          {/* Reset Form or Error State */}
          {hasValidToken ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* New Password Input */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-text-primary mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-border-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue bg-bg-primary text-text-primary"
                    placeholder="Enter new password"
                    required
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-secondary hover:text-text-primary"
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="mt-2 text-xs text-text-secondary">
                  Must be at least 6 characters with uppercase, lowercase, and numbers
                </p>
              </div>

              {/* Confirm Password Input */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-text-primary mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-border-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue bg-bg-primary text-text-primary"
                    placeholder="Confirm new password"
                    required
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-secondary hover:text-text-primary"
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-accent-blue text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Resetting Password...
                  </>
                ) : (
                  'Reset Password'
                )}
              </button>

              {/* Security Notice */}
              <div className="mt-4 p-4 bg-bg-primary border border-border-muted rounded-lg">
                <div className="flex items-start space-x-2">
                  <svg className="w-5 h-5 text-accent-blue flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <div className="text-xs text-text-secondary">
                    <p className="font-medium text-text-primary mb-1">Security Tips:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Use a strong, unique password</li>
                      <li>Don't reuse passwords from other sites</li>
                      <li>Consider using a password manager</li>
                    </ul>
                  </div>
                </div>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-bg-primary border border-border-muted rounded-lg">
                <p className="text-text-secondary text-sm">
                  This reset link is invalid or has expired. Reset links are only valid for 1 hour for security reasons.
                </p>
              </div>
              
              <button
                onClick={handleBackToLogin}
                className="w-full bg-accent-blue text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-600 transition-colors"
              >
                Back to Login
              </button>

              <p className="text-center text-sm text-text-secondary">
                Need to request a new link? Go to login and click "Forgot Password"
              </p>
            </div>
          )}
        </div>

        {/* Additional Help */}
        <div className="mt-6 text-center">
          <p className="text-text-secondary text-sm">
            Need help?{' '}
            <a href="mailto:support@shuttlup.com" className="text-accent-blue hover:underline">
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
