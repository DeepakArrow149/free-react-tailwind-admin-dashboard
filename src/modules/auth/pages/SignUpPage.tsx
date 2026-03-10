/**
 * Sign Up Page
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { PageMeta } from '@/components/common';
import { Button } from '@/components/ui';
import { Input, Label, Checkbox } from '@/components/form';

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email address';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    if (!agreeTerms) newErrors.terms = 'You must agree to the terms';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      // TODO: Replace with actual API call
      // const response = await api.post(apiRoutes.auth.register, formData);
      await new Promise((r) => setTimeout(r, 1000)); // Simulate API call
      navigate('/auth/signin');
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <PageMeta title="Sign Up" />

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
            Create an Account
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Enter your details to create your account!
          </p>
        </div>

        {/* Social signup buttons */}
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5">
          <button className="inline-flex items-center justify-center gap-3 rounded-lg bg-gray-100 px-7 py-3 text-sm font-normal text-gray-700 transition-colors hover:bg-gray-200 dark:bg-white/5 dark:text-white/90 dark:hover:bg-white/10">
            <svg className="h-5 w-5" viewBox="0 0 20 20">
              <path d="M18.75 10.19c0-.72-.06-1.25-.19-1.79H10.18v3.25h4.92a4.2 4.2 0 01-1.83 2.84l2.66 2.02a8.14 8.14 0 002.82-6.32z" fill="#4285F4" />
              <path d="M10.18 18.75a8.47 8.47 0 005.91-2.12l-2.66-2.02a5.25 5.25 0 01-7.9-2.79l-2.86 2.1a8.57 8.57 0 007.51 4.83z" fill="#34A853" />
              <path d="M5.1 11.73a5.17 5.17 0 010-3.46l-2.9-2.1a8.57 8.57 0 000 7.66l2.9-2.1z" fill="#FBBC05" />
              <path d="M10.18 4.63a4.83 4.83 0 013.45 1.3l2.52-2.41A8.51 8.51 0 0010.18 1.25 8.57 8.57 0 002.2 6.07l2.9 2.2a5.15 5.15 0 015.08-3.64z" fill="#EB4335" />
            </svg>
            Sign up with Google
          </button>
          <button className="inline-flex items-center justify-center gap-3 rounded-lg bg-gray-100 px-7 py-3 text-sm font-normal text-gray-700 transition-colors hover:bg-gray-200 dark:bg-white/5 dark:text-white/90 dark:hover:bg-white/10">
            <svg className="h-5 w-5 fill-current" viewBox="0 0 21 20">
              <path d="M15.67 1.88h2.76l-6.02 6.88 7.08 9.37H13.94l-4.35-5.68-4.97 5.68H1.87l6.44-7.36L1.51 1.88h5.69l3.93 5.19 4.54-5.19zm-.97 14.6h1.53L6.37 3.44H4.73l9.97 13.04z" />
            </svg>
            Sign up with X
          </button>
        </div>

        {/* Divider */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200 dark:border-gray-800" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-5 py-2 text-gray-400 dark:bg-gray-900">Or</span>
          </div>
        </div>

        {/* Sign up form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <Label required>First Name</Label>
              <Input
                placeholder="Enter your first name"
                value={formData.firstName}
                onChange={handleChange('firstName')}
                error={!!errors.firstName}
                hint={errors.firstName}
                required
              />
            </div>
            <div>
              <Label required>Last Name</Label>
              <Input
                placeholder="Enter your last name"
                value={formData.lastName}
                onChange={handleChange('lastName')}
                error={!!errors.lastName}
                hint={errors.lastName}
                required
              />
            </div>
          </div>

          <div>
            <Label required>Email</Label>
            <Input
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange('email')}
              error={!!errors.email}
              hint={errors.email}
              required
            />
          </div>

          <div>
            <Label required>Password</Label>
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Create a password"
              value={formData.password}
              onChange={handleChange('password')}
              error={!!errors.password}
              hint={errors.password || 'Must be at least 8 characters'}
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

          <div>
            <Label required>Confirm Password</Label>
            <Input
              type="password"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={handleChange('confirmPassword')}
              error={!!errors.confirmPassword}
              hint={errors.confirmPassword}
              required
            />
          </div>

          <div>
            <Checkbox
              label={
                <>
                  I agree to the{' '}
                  <a href="#" className="text-brand-500 hover:text-brand-600">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="#" className="text-brand-500 hover:text-brand-600">
                    Privacy Policy
                  </a>
                </>
              }
              checked={agreeTerms}
              onChange={() => setAgreeTerms(!agreeTerms)}
            />
            {errors.terms && (
              <p className="mt-1 text-xs text-error-500">{errors.terms}</p>
            )}
          </div>

          <Button type="submit" fullWidth loading={loading}>
            Create Account
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-gray-700 dark:text-gray-400 sm:text-start">
          Already have an account?{' '}
          <Link to="/auth/signin" className="text-brand-500 hover:text-brand-600">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
