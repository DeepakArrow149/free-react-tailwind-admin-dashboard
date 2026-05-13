/**
 * Form Preview Card
 * Shows a preview of the AI-generated form definition with an "Apply" button.
 * When diffSummary is provided, renders visual change badges (added/removed/modified).
 */

import React from 'react';
import { Button } from '@/components/ui';
import type { FormDiffSummary } from './diffUtils';

interface FormPreviewProps {
  formDefinition: Record<string, unknown>;
  onApply: (form: Record<string, unknown>) => void;
  onDismiss: () => void;
  /** Optional diff summary when modifying an existing form */
  diffSummary?: FormDiffSummary | null;
  /** Whether this form was built from a plan */
  fromPlan?: boolean;
}

export const FormPreview: React.FC<FormPreviewProps> = ({
  formDefinition,
  onApply,
  onDismiss,
  diffSummary,
  fromPlan = false,
}) => {
  const sections = (formDefinition.sections as Array<Record<string, unknown>>) || [];
  const totalFields = sections.reduce(
    (sum, sec) => sum + ((sec.fields as unknown[]) || []).length,
    0,
  );

  const isModification = diffSummary?.hasChanges;

  return (
    <div className="mx-3 mb-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-blue-100/50 dark:bg-blue-900/30 border-b border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">
            {fromPlan ? 'Built from Plan' : isModification ? 'Modified Form' : 'Generated Form'}
          </span>
        </div>
        <button onClick={onDismiss} className="text-gray-400 hover:text-gray-600" aria-label="Dismiss preview">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Diff summary badges */}
      {isModification && diffSummary && (
        <div className="flex gap-2 px-4 py-2 bg-amber-50/50 dark:bg-amber-900/10 border-b border-blue-200 dark:border-blue-800">
          {diffSummary.totalAdded > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">
              +{diffSummary.totalAdded} added
            </span>
          )}
          {diffSummary.totalRemoved > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">
              -{diffSummary.totalRemoved} removed
            </span>
          )}
          {diffSummary.totalModified > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
              ~{diffSummary.totalModified} modified
            </span>
          )}
        </div>
      )}

      {/* Info */}
      <div className="px-4 py-3">
        <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">
          {(formDefinition.name as string) || 'Untitled Form'}
        </h4>
        {typeof formDefinition.description === 'string' && formDefinition.description && (
          <p className="text-xs text-gray-500 mt-0.5">
            {formDefinition.description}
          </p>
        )}

        <div className="flex gap-4 mt-2 text-xs text-gray-500">
          <span>{sections.length} section{sections.length !== 1 ? 's' : ''}</span>
          <span>{totalFields} field{totalFields !== 1 ? 's' : ''}</span>
          <span className="capitalize">{(formDefinition.settings as Record<string, unknown>)?.layout as string || 'single-column'}</span>
        </div>

        {/* Section details with diff annotations */}
        {sections.length > 0 && (
          <div className="mt-2 space-y-1">
            {sections.slice(0, 4).map((sec, i) => {
              const secTitle = ((sec.title as string) || `Section ${i + 1}`).toLowerCase().trim();
              const secDiff = diffSummary?.sections.find(
                (sd) => sd.title.toLowerCase().trim() === secTitle,
              );

              return (
                <div key={i} className="text-xs flex items-center gap-1">
                  {secDiff?.type === 'added' && (
                    <span className="text-green-600 font-bold" title="New section">+</span>
                  )}
                  {secDiff?.type === 'removed' && (
                    <span className="text-red-600 font-bold" title="Removed section">-</span>
                  )}
                  {secDiff?.type === 'modified' && (
                    <span className="text-blue-600 font-bold" title="Modified section">~</span>
                  )}
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {(sec.title as string) || `Section ${i + 1}`}:
                  </span>{' '}
                  <span className="text-gray-400">
                    {((sec.fields as Array<Record<string, unknown>>) || [])
                      .slice(0, 4)
                      .map((f) => f.label as string)
                      .join(', ')}
                    {((sec.fields as unknown[]) || []).length > 4 && '...'}
                  </span>
                </div>
              );
            })}
            {sections.length > 4 && (
              <p className="text-xs text-gray-400">+{sections.length - 4} more sections</p>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 px-4 py-2 bg-blue-50/30 dark:bg-blue-900/10 border-t border-blue-200 dark:border-blue-800">
        <Button
          size="sm"
          onClick={() => onApply(formDefinition)}
          className="flex-1"
        >
          {isModification ? 'Apply Changes (Ctrl+Z to undo)' : 'Apply to Form Builder'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onDismiss}
        >
          Dismiss
        </Button>
      </div>
    </div>
  );
};
