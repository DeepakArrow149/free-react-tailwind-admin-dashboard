/**
 * TemplateLibraryPage — Standalone page at /super-admin/template-library
 * Renders the full TemplateLibrary component inside the dashboard layout
 * as a dedicated page (rather than a modal overlay from FormList).
 */

import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router';

const TemplateLibrary = lazy(
  () => import('../modules/super-admin/form-builder/components/TemplateLibrary'),
);

export default function TemplateLibraryPage() {
  const navigate = useNavigate();

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">📚 Template Library</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Browse pre-built and custom form templates. Use a template to quickly create new forms.
          </p>
        </div>
        <button
          onClick={() => navigate('/super-admin/form-builder')}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          ← Back to Form Builder
        </button>
      </div>

      {/* Template Library */}
      <Suspense
        fallback={
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          </div>
        }
      >
        <TemplateLibrary
          onClose={() => navigate('/super-admin/form-builder')}
          onFormCreated={() => navigate('/super-admin/form-builder')}
        />
      </Suspense>
    </div>
  );
}
