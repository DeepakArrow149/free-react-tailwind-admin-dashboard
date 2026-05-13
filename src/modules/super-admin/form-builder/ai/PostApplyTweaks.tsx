/**
 * Post-Apply Tweak Card
 * After the user applies an AI-generated form, this card surfaces a compact
 * diff with quick-tweak chips for the most-recently-changed fields. Each
 * chip sends a follow-up prompt so the user can refine without retyping
 * "Make the foo field required" themselves.
 */

import React from 'react';
import type { FieldDiff, FormDiffSummary } from './diffUtils';

interface PostApplyTweaksProps {
  summary: FormDiffSummary;
  onTweak: (prompt: string) => void;
  onDismiss: () => void;
}

const MAX_VISIBLE = 5;

export const PostApplyTweaks: React.FC<PostApplyTweaksProps> = ({ summary, onTweak, onDismiss }) => {
  // Flatten across sections, prefer added > modified > removed so the most
  // actionable rows appear first.
  const allDiffs: FieldDiff[] = summary.sections.flatMap((s) => s.fieldDiffs);
  const ordered = [
    ...allDiffs.filter((d) => d.type === 'added'),
    ...allDiffs.filter((d) => d.type === 'modified'),
    ...allDiffs.filter((d) => d.type === 'removed'),
  ];

  if (ordered.length === 0) return null;

  const visible = ordered.slice(0, MAX_VISIBLE);
  const hiddenCount = ordered.length - visible.length;

  return (
    <div className="mx-3 mb-2 rounded-lg border border-green-200 dark:border-green-800 bg-green-50/70 dark:bg-green-900/15 p-2.5 animate-fade-in-up">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-green-700 dark:text-green-300">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Applied · {summary.totalAdded} added · {summary.totalModified} modified
          {summary.totalRemoved > 0 ? ` · ${summary.totalRemoved} removed` : ''}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss tweak suggestions"
          title="Dismiss"
          className="text-green-700/60 hover:text-green-900 dark:text-green-300/60 dark:hover:text-green-100"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <p className="text-[10px] text-green-700/80 dark:text-green-300/80 mb-1.5">Quick tweaks</p>

      <ul className="space-y-1">
        {visible.map((diff, idx) => {
          const markerColor =
            diff.type === 'added'
              ? 'text-green-600 dark:text-green-400'
              : diff.type === 'modified'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-red-600 dark:text-red-400';
          const marker = diff.type === 'added' ? '+' : diff.type === 'modified' ? '±' : '−';

          return (
            <li key={`${diff.type}-${diff.name}-${idx}`} className="flex items-center justify-between gap-2 text-[11px]">
              <div className="min-w-0 flex items-center gap-1 flex-1">
                <span className={`${markerColor} font-mono w-2.5 shrink-0`} title={diff.type}>
                  {marker}
                </span>
                <span className="font-mono text-gray-700 dark:text-gray-300 truncate">{diff.name}</span>
                {diff.label && diff.label !== diff.name && (
                  <span className="text-gray-400 italic truncate max-w-[8rem]">"{diff.label}"</span>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                {diff.type === 'removed' ? (
                  <button
                    type="button"
                    onClick={() => onTweak(`Restore the \`${diff.name}\` field.`)}
                    className="px-1.5 py-0.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-[10px] text-gray-600 dark:text-gray-300 hover:border-blue-300 hover:text-blue-600 dark:hover:border-blue-700 dark:hover:text-blue-300 transition-colors"
                  >
                    Restore
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => onTweak(`Make the \`${diff.name}\` field required.`)}
                      title={`Make \`${diff.name}\` required`}
                      className="px-1.5 py-0.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-[10px] text-gray-600 dark:text-gray-300 hover:border-blue-300 hover:text-blue-600 dark:hover:border-blue-700 dark:hover:text-blue-300 transition-colors"
                    >
                      Require
                    </button>
                    <button
                      type="button"
                      onClick={() => onTweak(`Add helpful placeholder text and help text to the \`${diff.name}\` field.`)}
                      title={`Add placeholder + help text to \`${diff.name}\``}
                      className="px-1.5 py-0.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-[10px] text-gray-600 dark:text-gray-300 hover:border-blue-300 hover:text-blue-600 dark:hover:border-blue-700 dark:hover:text-blue-300 transition-colors"
                    >
                      Help text
                    </button>
                    <button
                      type="button"
                      onClick={() => onTweak(`Remove the \`${diff.name}\` field.`)}
                      title={`Remove \`${diff.name}\``}
                      className="px-1.5 py-0.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-[10px] text-gray-600 dark:text-gray-300 hover:border-red-300 hover:text-red-600 dark:hover:border-red-700 dark:hover:text-red-400 transition-colors"
                    >
                      Remove
                    </button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {hiddenCount > 0 && (
        <p className="mt-1.5 text-[10px] text-gray-500 dark:text-gray-400">
          + {hiddenCount} more change{hiddenCount === 1 ? '' : 's'} not shown
        </p>
      )}

      {/* Whole-form quick actions */}
      <div className="mt-2 pt-2 border-t border-green-200/70 dark:border-green-800/60 flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => onTweak('Add sensible validation rules to every new field.')}
          className="px-1.5 py-0.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-[10px] text-gray-600 dark:text-gray-300 hover:border-blue-300 hover:text-blue-600 dark:hover:border-blue-700 dark:hover:text-blue-300 transition-colors"
        >
          Validate all
        </button>
        <button
          type="button"
          onClick={() => onTweak('Group related fields into clearer sections.')}
          className="px-1.5 py-0.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-[10px] text-gray-600 dark:text-gray-300 hover:border-blue-300 hover:text-blue-600 dark:hover:border-blue-700 dark:hover:text-blue-300 transition-colors"
        >
          Re-group sections
        </button>
        <button
          type="button"
          onClick={() => onTweak('Switch to a two-column layout where it improves readability.')}
          className="px-1.5 py-0.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-[10px] text-gray-600 dark:text-gray-300 hover:border-blue-300 hover:text-blue-600 dark:hover:border-blue-700 dark:hover:text-blue-300 transition-colors"
        >
          Two-column
        </button>
      </div>
    </div>
  );
};
