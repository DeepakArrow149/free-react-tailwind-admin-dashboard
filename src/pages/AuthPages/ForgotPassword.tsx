import { useState } from "react";
import { Link } from "react-router";
import { api, apiRoutes } from "../../core/api";
import PageMeta from "../../components/common/PageMeta";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return setError("Please enter your email");
    setError("");
    setLoading(true);
    try {
      await api.post(apiRoutes.auth.forgotPassword, { email: email.trim() });
      setSent(true);
    } catch (err) {
      // Always show success to prevent email enumeration
      setSent(true);
      void err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageMeta title="Forgot Password | ERP TRACK" description="Reset your password" />
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Forgot Password</h1>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Enter your email and we&apos;ll send you a password reset link
              </p>
            </div>

            {sent ? (
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 dark:bg-green-500/10">
                  <span className="text-3xl">✉️</span>
                </div>
                <h2 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white">Check Your Email</h2>
                <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
                  If an account exists for <strong>{email}</strong>, you&apos;ll receive a password reset link shortly.
                </p>
                <Link to="/signin" className="text-sm font-medium text-brand-500 hover:text-brand-600">
                  ← Back to Sign In
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoFocus
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  />
                  {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
                </div>
                <button type="submit" disabled={loading}
                  className="w-full rounded-lg bg-brand-500 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">
                  {loading ? "Sending..." : "Send Reset Link"}
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
