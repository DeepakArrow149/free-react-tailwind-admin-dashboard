/**
 * OperationProgressTab — Operation-level progress entry & summary
 *
 * Renders inside JobDetailPopup as the "Operations" tab.
 * Shows:
 *   1. Date picker for progress entry
 *   2. Inline editable table of operations from the bulletin
 *   3. Save button for batch upsert
 *   4. Totals row with defect rate & efficiency
 *   5. Line Layout overlay (collapsible)
 */
import { useState, useMemo } from 'react';
import { useOperationProgress, useRecordOperationProgress, useJobLayout } from '@/hooks/usePlanningBoard';
import type { OperationProgressRow, JobLayoutPosition } from '@/api/planningBoard';

interface Props {
  jobId: number;
}

/* ── helpers ─────────────────────────────── */

function today() {
  return new Date().toISOString().slice(0, 10);
}

function pctColor(val: number) {
  if (val >= 90) return 'text-green-600';
  if (val >= 70) return 'text-blue-600';
  if (val > 0) return 'text-amber-600';
  return 'text-gray-400';
}

function heatBg(output: number, target: number) {
  if (!target) return 'bg-gray-50 dark:bg-gray-800';
  const pct = (output / target) * 100;
  if (pct >= 90) return 'bg-green-50 dark:bg-green-900/20';
  if (pct >= 50) return 'bg-blue-50 dark:bg-blue-900/20';
  if (pct > 0) return 'bg-amber-50 dark:bg-amber-900/20';
  return 'bg-gray-50 dark:bg-gray-800';
}

/* ── entry draft type ────────────────────── */

interface DraftEntry {
  bulletinItemId: number;
  outputQty: number;
  defectQty: number;
  reworkQty: number;
  operatorId: number | null;
  workstationId: number | null;
  cycleTimeSec: number | null;
  remarks: string | null;
}

/* ── Component ────────────────────────────── */

export default function OperationProgressTab({ jobId }: Props) {
  const { data: summary, isLoading, error } = useOperationProgress(jobId);
  const recordMutation = useRecordOperationProgress();
  const { data: layout } = useJobLayout(jobId);
  const [progressDate, setProgressDate] = useState(today());
  const [drafts, setDrafts] = useState<Map<number, DraftEntry>>(new Map());
  const [showLayout, setShowLayout] = useState(false);

  /* prefill drafts from existing entries for selected date */
  const existingForDate = useMemo(() => {
    if (!summary?.progressEntries) return new Map<number, DraftEntry>();
    const m = new Map<number, DraftEntry>();
    for (const e of summary.progressEntries) {
      if (e.progressDate.slice(0, 10) === progressDate) {
        m.set(e.bulletinItemId, {
          bulletinItemId: e.bulletinItemId,
          outputQty: e.outputQty,
          defectQty: e.defectQty,
          reworkQty: e.reworkQty,
          operatorId: e.operatorId,
          workstationId: e.workstationId,
          cycleTimeSec: e.cycleTimeSec,
          remarks: e.remarks,
        });
      }
    }
    return m;
  }, [summary, progressDate]);

  function getDraft(itemId: number): DraftEntry {
    return drafts.get(itemId) ?? existingForDate.get(itemId) ?? {
      bulletinItemId: itemId,
      outputQty: 0,
      defectQty: 0,
      reworkQty: 0,
      operatorId: null,
      workstationId: null,
      cycleTimeSec: null,
      remarks: null,
    };
  }

  function updateDraft(itemId: number, field: keyof DraftEntry, value: number | string | null) {
    const prev = getDraft(itemId);
    setDrafts(d => new Map(d).set(itemId, { ...prev, [field]: value }));
  }

  function handleSave() {
    if (!summary) return;
    const entries = summary.rows.map((r) => {
      const d = getDraft(r.bulletinItemId);
      return {
        bulletinItemId: r.bulletinItemId,
        outputQty: d.outputQty,
        defectQty: d.defectQty,
        reworkQty: d.reworkQty,
        operatorId: d.operatorId,
        workstationId: d.workstationId,
        cycleTimeSec: d.cycleTimeSec,
        remarks: d.remarks,
      };
    }).filter(e => e.outputQty > 0 || e.defectQty > 0 || e.reworkQty > 0);

    if (entries.length === 0) return;
    recordMutation.mutate({ jobId, data: { progressDate, entries } });
  }

  const isDirty = drafts.size > 0;

  /* ── Loading / Error states ─── */

  if (isLoading) return (
    <div className="min-h-[320px] space-y-4 animate-pulse">
      <div className="flex justify-between">
        <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-7 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 bg-gray-100 dark:bg-gray-700/40 rounded-lg border border-gray-200 dark:border-gray-700" />
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-8 bg-gray-100 dark:bg-gray-700/30 rounded" />
        ))}
      </div>
    </div>
  );
  if (error) return <div className="p-6 text-center text-sm text-red-500">Failed to load operation data</div>;
  if (!summary || summary.rows.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-gray-500">No operation bulletin found for this job.</p>
        <p className="text-xs text-gray-400 mt-1">Create an approved Operation Bulletin for this order/style first.</p>
      </div>
    );
  }

  /* ── Render ───────────────── */

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <label htmlFor="progress-date" className="text-xs text-gray-500">Date</label>
          <input
            id="progress-date"
            type="date"
            value={progressDate}
            onChange={(e) => { setProgressDate(e.target.value); setDrafts(new Map()); }}
            className="border rounded px-2 py-1 text-xs dark:bg-gray-700 dark:border-gray-600"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400">
            {summary.bulletinItemCount} ops · Target {summary.dailyTargetQty}/day
          </span>
          <button
            onClick={handleSave}
            disabled={!isDirty || recordMutation.isPending}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              isDirty
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-700'
            }`}
          >
            {recordMutation.isPending ? 'Saving...' : 'Save Progress'}
          </button>
        </div>
      </div>

      {/* Totals cards */}
      <div className="grid grid-cols-5 gap-2">
        <TotalCard label="Total Output" value={summary.totals.totalOutput} />
        <TotalCard label="Defects" value={summary.totals.totalDefects} color="red" />
        <TotalCard label="Rework" value={summary.totals.totalRework} color="amber" />
        <TotalCard
          label="Defect Rate"
          value={`${summary.totals.overallDefectRate.toFixed(1)}%`}
          color={summary.totals.overallDefectRate > 5 ? 'red' : summary.totals.overallDefectRate > 2 ? 'amber' : 'green'}
        />
        <TotalCard
          label="Efficiency"
          value={summary.totals.overallAvgEfficiency != null ? `${summary.totals.overallAvgEfficiency.toFixed(1)}%` : '—'}
          color="blue"
        />
      </div>

      {/* Operations table */}
      <div className="border rounded-lg overflow-hidden dark:border-gray-700">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400">
              <th className="px-2 py-1.5 text-left w-8">#</th>
              <th className="px-2 py-1.5 text-left">Operation</th>
              <th className="px-2 py-1.5 text-center w-14">SAM</th>
              <th className="px-2 py-1.5 text-center w-16">Machine</th>
              <th className="px-2 py-1.5 text-center w-16">Output</th>
              <th className="px-2 py-1.5 text-center w-14">Defect</th>
              <th className="px-2 py-1.5 text-center w-14">Rework</th>
              <th className="px-2 py-1.5 text-center w-16">Eff %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {summary.rows.map((row) => (
              <OperationRow
                key={row.bulletinItemId}
                row={row}
                draft={getDraft(row.bulletinItemId)}
                onUpdate={(field, val) => updateDraft(row.bulletinItemId, field, val)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Line Layout Overlay toggle */}
      {layout && layout.layout && (
        <div>
          <button
            onClick={() => setShowLayout(!showLayout)}
            className="flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-700 transition-colors"
          >
            <span>{showLayout ? '▼' : '▶'}</span>
            <span>Line Layout — {layout.layout.name} ({layout.layout.totalStations} stations)</span>
          </button>
          {showLayout && (
            <LineLayoutOverlay
              positions={layout.layout.positions}
              rowCount={layout.layout.rowCount}
              flowDirection={layout.layout.flowDirection}
              dailyTarget={layout.dailyTargetQty}
            />
          )}
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ──────────────────────── */

function OperationRow({
  row,
  draft,
  onUpdate,
}: {
  row: OperationProgressRow;
  draft: DraftEntry;
  onUpdate: (field: keyof DraftEntry, val: number | string | null) => void;
}) {
  return (
    <tr className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors">
      <td className="px-2 py-1 text-gray-400">{row.seqNo}</td>
      <td className="px-2 py-1">
        <div className="font-medium text-gray-700 dark:text-gray-200">{row.operationName}</div>
        <div className="text-[10px] text-gray-400">{row.operationCode}</div>
      </td>
      <td className="px-2 py-1 text-center text-gray-500">{Number(row.sam).toFixed(2)}</td>
      <td className="px-2 py-1 text-center text-gray-400">{row.machineType ?? '—'}</td>
      <td className="px-2 py-1 text-center">
        <input
          type="number"
          min={0}
          value={draft.outputQty || ''}
          onChange={(e) => onUpdate('outputQty', parseInt(e.target.value) || 0)}
          className="w-14 border rounded px-1 py-0.5 text-center text-xs dark:bg-gray-700 dark:border-gray-600"
          placeholder="0"
        />
      </td>
      <td className="px-2 py-1 text-center">
        <input
          type="number"
          min={0}
          value={draft.defectQty || ''}
          onChange={(e) => onUpdate('defectQty', parseInt(e.target.value) || 0)}
          className="w-12 border rounded px-1 py-0.5 text-center text-xs dark:bg-gray-700 dark:border-gray-600"
          placeholder="0"
        />
      </td>
      <td className="px-2 py-1 text-center">
        <input
          type="number"
          min={0}
          value={draft.reworkQty || ''}
          onChange={(e) => onUpdate('reworkQty', parseInt(e.target.value) || 0)}
          className="w-12 border rounded px-1 py-0.5 text-center text-xs dark:bg-gray-700 dark:border-gray-600"
          placeholder="0"
        />
      </td>
      <td className={`px-2 py-1 text-center ${row.avgEfficiency != null ? pctColor(row.avgEfficiency) : 'text-gray-400'}`}>
        {row.avgEfficiency != null ? `${row.avgEfficiency.toFixed(0)}%` : '—'}
      </td>
    </tr>
  );
}

function TotalCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  const colorClasses: Record<string, string> = {
    red: 'text-red-600',
    amber: 'text-amber-600',
    green: 'text-green-600',
    blue: 'text-blue-600',
  };
  return (
    <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-2 text-center">
      <div className="text-[10px] text-gray-400 mb-0.5">{label}</div>
      <div className={`text-sm font-semibold ${color ? colorClasses[color] ?? '' : 'text-gray-700 dark:text-white'}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
    </div>
  );
}

/* ── Line Layout Overlay ─────────────────── */

function LineLayoutOverlay({
  positions,
  rowCount,
  flowDirection,
  dailyTarget,
}: {
  positions: JobLayoutPosition[];
  rowCount: number;
  flowDirection: string;
  dailyTarget: number;
}) {
  const maxCol = Math.max(...positions.map(p => p.gridCol), 1);

  return (
    <div className="mt-3 border rounded-lg p-3 bg-gray-50 dark:bg-gray-800/50 dark:border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-gray-400">
          Flow: {flowDirection} · {rowCount} rows · {positions.length} positions
        </span>
        <div className="flex items-center gap-2 text-[9px] text-gray-400">
          <span className="inline-block w-3 h-3 rounded bg-green-100 border border-green-300" /> ≥90%
          <span className="inline-block w-3 h-3 rounded bg-blue-100 border border-blue-300" /> ≥50%
          <span className="inline-block w-3 h-3 rounded bg-amber-100 border border-amber-300" /> &gt;0%
          <span className="inline-block w-3 h-3 rounded bg-gray-100 border border-gray-300" /> Idle
        </div>
      </div>

      <div
        className="grid gap-1.5"
        style={{
          gridTemplateColumns: `repeat(${maxCol}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rowCount}, auto)`,
        }}
      >
        {positions
          .sort((a, b) => a.gridRow - b.gridRow || a.gridCol - b.gridCol)
          .map((pos) => (
            <LayoutCell key={`${pos.gridRow}-${pos.gridCol}`} pos={pos} dailyTarget={dailyTarget} />
          ))}
      </div>
    </div>
  );
}

function LayoutCell({ pos, dailyTarget }: { pos: JobLayoutPosition; dailyTarget: number }) {
  const bgClass = pos.positionType === 'WORKSTATION'
    ? heatBg(pos.latestOutput, dailyTarget)
    : 'bg-gray-200/50 dark:bg-gray-700/50';

  return (
    <div
      className={`${bgClass} rounded p-1.5 border border-gray-200 dark:border-gray-600 min-h-[44px] relative group`}
      style={{ gridRow: pos.gridRow, gridColumn: pos.gridCol }}
    >
      {/* Position label */}
      <div className="text-[9px] font-medium text-gray-600 dark:text-gray-300 truncate">
        {pos.operationName ?? pos.label ?? `Pos ${pos.positionNo}`}
      </div>
      {pos.machineType && (
        <div className="text-[8px] text-gray-400 truncate">{pos.machineType}</div>
      )}
      {pos.positionType === 'WORKSTATION' && (
        <div className="text-[10px] font-semibold mt-0.5">
          <span className={pos.latestOutput > 0 ? 'text-green-600' : 'text-gray-300'}>{pos.latestOutput}</span>
          {pos.latestDefects > 0 && (
            <span className="text-red-500 ml-1">-{pos.latestDefects}</span>
          )}
        </div>
      )}

      {/* Tooltip on hover */}
      <div className="absolute z-10 hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-1 bg-gray-900 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap shadow-lg">
        <div className="font-medium">{pos.operationName ?? pos.label ?? `Position ${pos.positionNo}`}</div>
        {pos.operationCode && <div className="text-gray-300">Code: {pos.operationCode}</div>}
        <div>{pos.positionType} · Row {pos.gridRow} Col {pos.gridCol}</div>
        {pos.positionType === 'WORKSTATION' && (
          <div>Output: {pos.latestOutput} · Defects: {pos.latestDefects}</div>
        )}
      </div>
    </div>
  );
}
