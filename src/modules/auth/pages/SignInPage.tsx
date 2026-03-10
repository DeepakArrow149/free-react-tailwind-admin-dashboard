/**
 * Sign In Page — Multi-Tenant Login
 *
 * Login format: username@companycode  (e.g. admin@abc, planner@uty)
 * Super Admin:  superadmin@system
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { PageMeta } from '@/components/common';
import { Button } from '@/components/ui';
import { Input, Label, Checkbox } from '@/components/form';
import { useAuthStore } from '@/store';
import { api } from '@/core/api';
import { apiRoutes } from '@/core/api';
import { tokenService } from '@/core/services';
import type { LoginResponse } from '@/types/tenant';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setUser } = useAuthStore();
  const navigate = useNavigate();

  // Show auth error from session expiry / forced logout
  useEffect(() => {
    const authError = sessionStorage.getItem('auth_error');
    if (authError) {
      setError(authError);
      sessionStorage.removeItem('auth_error');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate format
      const parts = email.split('@');
      if (parts.length !== 2 || !parts[0] || !parts[1]) {
        setError('Enter email as username@companycode (e.g. admin@abc)');
        setLoading(false);
        return;
      }

      const response = await api.post<{ success: boolean; data: LoginResponse }>(
        apiRoutes.auth.login,
        { email: email.toLowerCase(), password },
      );

      const { accessToken, refreshToken, user, availableBranches } = response.data;

      tokenService.setTokens(accessToken, refreshToken);
      setUser({
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        roles: [user.role],
        role: user.role,
        roleName: user.roleName,
        companyCode: user.companyCode,
        companyName: user.companyName,
        branchId: user.branchId,
        branchName: user.branchName,
        branchCode: user.branchCode,
        isSuperAdmin: user.isSuperAdmin,
      });

      // Store available branches in auth store
      if (availableBranches) {
        useAuthStore.setState({ availableBranches });
      }

      // Route based on role
      if (user.isSuperAdmin) {
        navigate('/super-admin');
      } else {
        navigate('/');
      }
    } catch (err: unknown) {
      // Extract backend error message if available
      let message = 'Login failed. Please check your credentials.';
      if (err && typeof err === 'object' && 'message' in err) {
        message = (err as { message: string }).message;
      }
      // Axios-wrapped errors have response.data.message
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { message?: string } } };
        if (axiosErr.response?.data?.message) {
          message = axiosErr.response.data.message;
        }
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <PageMeta title="Sign In" />

      <div className="mx-auto w-full max-w-md pt-10">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to dashboard
        </Link>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <div className="mb-5 sm:mb-8">
          <h1 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
            Sign In
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Enter your credentials as <strong>username@companycode</strong>
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Login form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label required>Email</Label>
            <Input
              type="text"
              placeholder="admin@companycode"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <Label required>Password</Label>
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              endAdornment={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {showPassword ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    )}
                  </svg>
                </button>
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Checkbox
              label="Keep me logged in"
              checked={rememberMe}
              onChange={() => setRememberMe(!rememberMe)}
            />
            <Link
              to="/auth/forgot-password"
              className="text-sm text-brand-500 hover:text-brand-600"
            >
              Forgot password?
            </Link>
          </div>

          <Button type="submit" fullWidth loading={loading}>
            Sign in
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-gray-700 dark:text-gray-400 sm:text-start">
          Don't have an account?{' '}
          <Link to="/auth/signup" className="text-brand-500 hover:text-brand-600">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}
