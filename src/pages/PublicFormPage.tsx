/**
 * PublicFormPage – Renders a published form for anonymous / external users.
 * Accessed at  /forms/:slug  (outside the dashboard layout).
 * Fetches the form definition by slug from a public API endpoint
 * and renders FormPreview in live submission mode.
 */

import { useEffect, useState, useMemo } from 'react';
import { useParams, useSearchParams, Link } from 'react-router';
import FormPreview from '../modules/super-admin/form-builder/components/FormPreview';
import type { FormDefinition } from '../modules/super-admin/form-builder/types';
import { api } from '../core/api';
import { mapResponseToForm } from '../modules/super-admin/api/formBuilderApi';

export default function PublicFormPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState<FormDefinition | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Collect URL query params as prefill values
  const prefill = useMemo(() => {
    const params: Record<string, string> = {};
    searchParams.forEach((val, key) => { params[key] = val; });
    return Object.keys(params).length > 0 ? params : undefined;
  }, [searchParams]);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    api
      .get<{ success: boolean; data: Record<string, unknown> }>(`/forms/public/${slug}`)
      .then((res) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setForm(mapResponseToForm(res.data as any));
      })
      .catch((err: unknown) => {
        const e = err as { response?: { data?: { message?: string } } };
        const msg = e?.response?.data?.message || 'Form not found or not published.';
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="rounded-xl bg-white p-10 text-center shadow-lg dark:bg-gray-800">
          <span className="mb-3 block text-4xl">🚫</span>
          <h1 className="mb-2 text-lg font-bold text-gray-700 dark:text-gray-200">Form Unavailable</h1>
          <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">{error}</p>
          <Link
            to="/"
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
          >
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 dark:bg-gray-900">
      <div className="mx-auto max-w-2xl px-4">
        {/* Powered-by branding */}
        <div className="mb-4 text-center text-xs text-gray-400 dark:text-gray-500">
          Powered by <span className="font-semibold text-blue-500">STITCH ERP</span> Form Builder
        </div>
        <FormPreview form={form} live prefill={prefill} />
      </div>
    </div>
  );
}
