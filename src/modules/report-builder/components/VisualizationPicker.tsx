/**
 * VisualizationPicker — Toolbar segment for switching between
 * Table / Bar / Line / Area / Pie / Donut / KPI.
 */

import { useReportBuilderStore } from '../store';
import { VISUALIZATIONS, classifyColumns, type Visualization } from '../types';

export function VisualizationPicker() {
  const activeReport = useReportBuilderStore((s) => s.activeReport);
  const setVisualization = useReportBuilderStore((s) => s.setVisualization);

  if (!activeReport) return null;

  const { dimensions, measures } = classifyColumns(activeReport.query.columns);

  return (
    <div className="flex items-center gap-0.5 rounded-md border border-gray-200 bg-white p-0.5 dark:border-gray-700 dark:bg-gray-900">
      {VISUALIZATIONS.map((v) => {
        const active = activeReport.visualization === v.id;
        const meetsContract =
          dimensions.length >= v.requirements.dimensions &&
          measures.length >= v.requirements.measures;
        return (
          <button
            key={v.id}
            type="button"
            onClick={() => setVisualization(v.id as Visualization)}
            disabled={!meetsContract && !active}
            title={`${v.label} — ${v.description}${
              !meetsContract ? `\n(needs ≥${v.requirements.dimensions} dim, ≥${v.requirements.measures} measure)` : ''
            }`}
            className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition ${
              active
                ? 'bg-blue-600 text-white'
                : meetsContract
                ? 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                : 'text-gray-300 cursor-not-allowed dark:text-gray-600'
            }`}
          >
            <span className="text-sm leading-none">{v.icon}</span>
            <span>{v.label}</span>
          </button>
        );
      })}
    </div>
  );
}
