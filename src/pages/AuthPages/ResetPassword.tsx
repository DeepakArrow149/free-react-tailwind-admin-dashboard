import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router";
import { api, apiRoutes } from "../../core/api";
import PageMeta from "../../components/common/PageMeta";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!token || !email) return setError("Invalid or expired reset link. Please request a new one.");
    if (password.length < 6) return setError("Password must be at least 6 characters");
    if (password !== confirm) return setError("Passwords do not match");

    setLoading(true);
    try {
      await api.post(apiRoutes.auth.resetPassword, { email, token, newPassword: password });
      setSuccess(true);
      setTimeout(() => navigate("/signin"), 3000);
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Reset failed. The link may have expired.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!token || !email) {
    return (
      <>
        <PageMeta title="Reset Password | ERP TRACK" description="Reset your password" />
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white">Invalid Reset Link</h2>
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              This password reset link is invalid or has expired.
            </p>
            <Link to="/forgot-password" className="text-sm font-medium text-brand-500 hover:text-brand-600">
              Request a New Link →
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageMeta title="Reset Password | ERP TRACK" description="Set a new password" />
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Set New Password</h1>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Enter your new password for <strong>{email}</strong></p>
            </div>

            {success ? (
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 dark:bg-green-500/10">
                  <span className="text-3xl">✅</span>
                </div>
                <h2 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white">Password Reset!</h2>
                <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                  Your password has been reset successfully. Redirecting to sign in...
                </p>
                <Link to="/signin" className="text-sm font-medium text-brand-500 hover:text-brand-600">
                  Go to Sign In →
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">New Password</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters" autoFocus
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Confirm Password</label>
                  <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Re-enter your password"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500" />
                </div>
                {error && (
                  <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">{error}</div>
                )}
                <button type="submit" disabled={loading}
                  className="w-full rounded-lg bg-brand-500 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">
                  {loading ? "Resetting..." : "Reset Password"}
                </button>
                <div className="text-center">
                  <Link to="/signin" className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
                    ← Back to Sign In
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
