/**
 * Plan Preview Card
 * Displays a structured AI-generated plan for review before building.
 * Renders the plan as formatted markdown with Build/Dismiss actions.
 */

import React from 'react';
import { Button } from '@/components/ui';

interface PlanPreviewProps {
  /** The structured plan text from the AI */
  plan: string;
  /** Callback when user approves and wants to build */
  onBuild: () => void;
  /** Callback to dismiss / discard the plan */
  onDismiss: () => void;
  /** Whether the build is currently in progress */
  isBuilding: boolean;
}

/** Render inline markdown: **bold**, `code` */
function renderInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code class="bg-gray-100 dark:bg-gray-700 px-1 rounded text-xs">$1</code>');
}

/** Parse plan text into renderable blocks */
function renderPlanContent(plan: string) {
  const lines = plan.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      elements.push(<div key={key++} className="h-1.5" />);
      continue;
    }

    // Section header: ### Section N: Title
    if (/^###\s+/.test(trimmed)) {
      const heading = trimmed.replace(/^###\s+/, '');
      elements.push(
        <h4
          key={key++}
          className="text-xs font-bold text-indigo-700 dark:text-indigo-300 mt-2 mb-0.5 flex items-center gap-1.5"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
          <span dangerouslySetInnerHTML={{ __html: renderInline(heading) }} />
        </h4>,
      );
      continue;
    }

    // Meta headers: **Form:**, **Description:**, **Layout:**, **Settings:**, **ERP**, **Follow-up**
    if (/^\*\*(Form|Description|Layout|Settings|ERP Integrations|Follow-up suggestions):\*\*/i.test(trimmed)) {
      elements.push(
        <p
          key={key++}
          className="text-xs text-gray-700 dark:text-gray-300 mt-1"
          dangerouslySetInnerHTML={{ __html: renderInline(trimmed) }}
        />,
      );
      continue;
    }

    // Bullet items: - field — type: ..., etc.
    if (/^[-•*]\s+/.test(trimmed)) {
      const bullet = trimmed.replace(/^[-•*]\s+/, '');
      elements.push(
        <div key={key++} className="flex items-start gap-1.5 ml-3 text-xs text-gray-600 dark:text-gray-400">
          <span className="text-gray-400 mt-0.5 shrink-0">•</span>
          <span dangerouslySetInnerHTML={{ __html: renderInline(bullet) }} />
        </div>,
      );
      continue;
    }

    // Regular text
    elements.push(
      <p
        key={key++}
        className="text-xs text-gray-600 dark:text-gray-400"
        dangerouslySetInnerHTML={{ __html: renderInline(trimmed) }}
      />,
    );
  }

  return elements;
}

export const PlanPreview: React.FC<PlanPreviewProps> = ({
  plan,
  onBuild,
  onDismiss,
  isBuilding,
}) => {
  return (
    <div className="mx-3 mb-3 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/20 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-purple-100/50 dark:bg-purple-900/30 border-b border-purple-200 dark:border-purple-800">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          <span className="text-sm font-semibold text-purple-800 dark:text-purple-200">
            Form Plan
          </span>
          {isBuilding && (
            <span className="text-xs text-purple-500 animate-pulse">Building...</span>
          )}
        </div>
        <button
          onClick={onDismiss}
          disabled={isBuilding}
          className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Plan content */}
      <div className="px-4 py-3 max-h-64 overflow-y-auto space-y-0.5">
        {renderPlanContent(plan)}
      </div>

      {/* Hint */}
      <div className="px-4 py-1.5 bg-purple-50/30 dark:bg-purple-900/10 border-t border-b border-purple-200 dark:border-purple-800">
        <p className="text-[10px] text-purple-500 dark:text-purple-400 text-center">
          Refine the plan by typing in the chat below, or click Build to generate the form.
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 px-4 py-2 bg-purple-50/30 dark:bg-purple-900/10">
        <Button
          size="sm"
          onClick={onBuild}
          disabled={isBuilding}
          className="flex-1"
        >
          {isBuilding ? (
            <span className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Building Form...
            </span>
          ) : (
            'Build This'
          )}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onDismiss}
          disabled={isBuilding}
        >
          Dismiss
        </Button>
      </div>
    </div>
  );
};
