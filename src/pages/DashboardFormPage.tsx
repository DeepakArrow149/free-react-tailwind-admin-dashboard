/**
 * DashboardFormPage — Renders a published form inside the ERP dashboard layout.
 * Accessed at /app/forms/:slug via the dynamic sidebar menu.
 *
 * Fetches the form by slug, renders FormPreview in live mode,
 * and shows a breadcrumb that includes the parent module name.
 */

import { useEffect, useState, useMemo } from 'react';
import { useParams, useSearchParams, Link } from 'react-router';
import FormPreview from '../modules/super-admin/form-builder/components/FormPreview';
import type { FormDefinition } from '../modules/super-admin/form-builder/types';
import { MODULE_TARGETS } from '../modules/super-admin/form-builder/types';
import { api } from '../core/api';
import { mapResponseToForm } from '../modules/super-admin/api/formBuilderApi';

interface PrefillSuggestion {
  values: Record<string, unknown>;
  source: string;
  submittedAt: string;
  submissionId: string;
}

export default function DashboardFormPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState<FormDefinition | null>(null);
  const [moduleName, setModuleName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Smart-prefill banner state
  const [prefillSuggestion, setPrefillSuggestion] = useState<PrefillSuggestion | null>(null);
  const [appliedSuggestion, setAppliedSuggestion] = useState<Record<string, string> | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Collect URL query params as prefill values
  const urlPrefill = useMemo(() => {
    const params: Record<string, string> = {};
    searchParams.forEach((val, key) => { params[key] = val; });
    return Object.keys(params).length > 0 ? params : undefined;
  }, [searchParams]);

  // Merge URL prefill with applied suggestion. URL params take precedence over
  // the suggestion (explicit > implicit).
  const prefill = useMemo(() => {
    const merged: Record<string, string> = { ...(appliedSuggestion || {}) };
    if (urlPrefill) Object.assign(merged, urlPrefill);
    return Object.keys(merged).length > 0 ? merged : undefined;
  }, [appliedSuggestion, urlPrefill]);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setPrefillSuggestion(null);
    setAppliedSuggestion(null);
    setBannerDismissed(false);

    // First resolve slug to form ID, then fetch the full authenticated form detail
    api
      .get<{ success: boolean; data: { id: string }[] }>('/forms/list')
      .then((listRes) => {
        const match = listRes.data?.find(
          (f: Record<string, unknown>) => (f as Record<string, unknown>).slug === slug,
        );
        if (!match) throw new Error('Form not found');
        const formId = (match as { id: string }).id;
        // Fetch full form definition AND check for prefill suggestion in parallel.
        // The prefill endpoint returns 204 (no content) when there's nothing to
        // suggest — we treat that as "no banner" silently.
        return Promise.all([
          api.get<{ success: boolean; data: Record<string, unknown> }>(`/forms/${formId}`),
          api
            .get<{ success: boolean; data: PrefillSuggestion }>(`/forms/${formId}/prefill`)
            .then((r) => r?.data ?? null)
            .catch(() => null),
        ]);
      })
      .then(([formRes, suggestion]) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped = mapResponseToForm(formRes.data as any);
        setForm(mapped);

        // Resolve module label from assignment
        const ma = mapped.moduleAssignment;
        if (ma?.targetModule) {
          const found = MODULE_TARGETS.find((m) => m.id === ma.targetModule);
          setModuleName(found?.label ?? ma.targetModule);
        }

        if (suggestion && suggestion.values && Object.keys(suggestion.values).length > 0) {
          setPrefillSuggestion(suggestion);
        }
      })
      .catch((err: unknown) => {
        const e = err as { response?: { data?: { message?: string } }; message?: string };
        setError(e?.response?.data?.message || e?.message || 'Form not found or not published.');
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const handleUsePrefill = () => {
    if (!prefillSuggestion) return;
    // Map all values to strings (FormPreview's prefill prop is Record<string,string>).
    // Non-string values get JSON-serialised; the inner FormPreview maps them back.
    const stringified: Record<string, string> = {};
    for (const [k, v] of Object.entries(prefillSuggestion.values)) {
      if (v === null || v === undefined) continue;
      stringified[k] = typeof v === 'object' ? JSON.stringify(v) : String(v);
    }
    setAppliedSuggestion(stringified);
    setPrefillSuggestion(null);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="rounded-xl bg-white p-10 text-center shadow dark:bg-gray-800">
          <span className="mb-3 block text-4xl">🚫</span>
          <h1 className="mb-2 text-lg font-bold text-gray-700 dark:text-gray-200">Form Unavailable</h1>
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">{error}</p>
          <Link
            to="/"
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
          >
            Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Link to="/" className="hover:text-blue-600 transition">Dashboard</Link>
        <span>›</span>
        {moduleName && (
          <>
            <span className="capitalize">{moduleName}</span>
            <span>›</span>
          </>
        )}
        <span className="font-medium text-gray-700 dark:text-gray-200">{form.name}</span>
      </nav>

      {/* Smart prefill banner — appears when the user has a previous submission
          for this form. One-click "Use" merges last-submission values into the
          form's prefill state. URL query params always win over suggestions. */}
      {prefillSuggestion && !bannerDismissed && (
        <div className="mx-auto mb-4 max-w-3xl">
          <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/40">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300">
              <span aria-hidden="true">✨</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Use values from your previous submission?
              </p>
              <p className="mt-0.5 text-xs text-blue-700 dark:text-blue-300">
                Last submitted on{' '}
                {new Date(prefillSuggestion.submittedAt).toLocaleString()}
                {' — '}
                {Object.keys(prefillSuggestion.values).length} field
                {Object.keys(prefillSuggestion.values).length === 1 ? '' : 's'} available.
              </p>
            </div>
            <div className="flex flex-shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={handleUsePrefill}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition"
              >
                Use
              </button>
              <button
                type="button"
                onClick={() => setBannerDismissed(true)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition dark:text-blue-300 dark:hover:bg-blue-900/40"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="mx-auto max-w-3xl">
        <FormPreview form={form} live prefill={prefill} />
      </div>
    </div>
  );
}
