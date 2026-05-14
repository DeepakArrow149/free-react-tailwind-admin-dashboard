/**
 * ProductionFlowTab — Multi-stage production pipeline visualization
 *
 * Renders inside JobDetailPopup as the "Production Flow" tab.
 * Shows:
 *   1. Overall progress bar (min of all stages)
 *   2. Stage pipeline cards with WIP indicators
 *   3. Bottleneck highlight
 *   4. Daily trend sparkline chart
 *   5. Estimated completion
 */
import { useStageSummary } from '@/hooks/usePlanningBoard';
import type { StageSummaryStage, StageSummaryTrend } from '@/api/planningBoard';

const STAGE_ICONS: Record<string, string> = {
  cutting: '✂️',
  sewingInput: '📥',
  sewingOutput: '🧵',
  qcPass: '✅',
  finishing: '🔧',
  packed: '📦',
};

function pctColor(pct: number) {
  if (pct >= 80) return 'bg-green-500';
  if (pct >= 50) return 'bg-blue-500';
  if (pct > 0) return 'bg-amber-500';
  return 'bg-gray-300';
}

function statusBadge(status: string) {
  switch (status) {
    case 'COMPLETE':
      return <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Done</span>;
    case 'IN_PROGRESS':
      return <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">Active</span>;
    default:
      return <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">Pending</span>;
  }
}

// ── Sparkline Chart (pure SVG) ──
function SparklineChart({ data, allocatedQty }: { data: StageSummaryTrend[]; allocatedQty: number }) {
  if (data.length < 2) {
    return <div className="text-[10px] text-gray-400 text-center py-4">Need 2+ days of data for trend chart</div>;
  }

  const W = 540;
  const H = 100;
  const PAD = { top: 10, right: 10, bottom: 20, left: 10 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  // Find max value across all stages
  const maxVal = Math.max(
    allocatedQty,
    ...data.flatMap(d => [d.cutting, d.sewingInput, d.sewingOutput, d.qcPass, d.finishing, d.packed])
  );

  const xScale = (i: number) => PAD.left + (i / (data.length - 1)) * plotW;
  const yScale = (v: number) => PAD.top + plotH - (v / maxVal) * plotH;

  const lines: { key: string; color: string; values: number[] }[] = [
    { key: 'cutting', color: '#f59e0b', values: data.map(d => d.cutting) },
    { key: 'sewingOutput', color: '#3b82f6', values: data.map(d => d.sewingOutput) },
    { key: 'qcPass', color: '#10b981', values: data.map(d => d.qcPass) },
    { key: 'finishing', color: '#8b5cf6', values: data.map(d => d.finishing) },
    { key: 'packed', color: '#ef4444', values: data.map(d => d.packed) },
  ];

  // Accumulate values for area-under visualization
  const makePath = (values: number[]) =>
    values.map((v, i) => `${i === 0 ? 'M' : 'L'}${xScale(i).toFixed(1)},${yScale(v).toFixed(1)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 120 }}>
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map(f => (
        <line key={f} x1={PAD.left} x2={W - PAD.right} y1={yScale(f * maxVal)} y2={yScale(f * maxVal)}
          stroke="#e5e7eb" strokeWidth={0.5} />
      ))}
      {/* Stage lines */}
      {lines.map(l => (
        <path key={l.key} d={makePath(l.values)} fill="none" stroke={l.color} strokeWidth={1.5} opacity={0.85} />
      ))}
      {/* X-axis date labels (first, mid, last) */}
      {[0, Math.floor(data.length / 2), data.length - 1].map(i => (
        <text key={i} x={xScale(i)} y={H - 2} textAnchor="middle" className="text-[8px]" fill="#9ca3af">
          {data[i].date.slice(5)}
        </text>
      ))}
    </svg>
  );
}

function ChartLegend() {
  const items = [
    { label: 'Cutting', color: '#f59e0b' },
    { label: 'Sewing Out', color: '#3b82f6' },
    { label: 'QC Pass', color: '#10b981' },
    { label: 'Finishing', color: '#8b5cf6' },
    { label: 'Packed', color: '#ef4444' },
  ];
  return (
    <div className="flex flex-wrap gap-3 justify-center">
      {items.map(i => (
        <div key={i.label} className="flex items-center gap-1">
          <div className="w-2.5 h-0.5 rounded" style={{ backgroundColor: i.color }} />
          <span className="text-[9px] text-gray-500">{i.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── WIP Arrow between stages ──
function WipArrow({ wip }: { wip: number }) {
  return (
    <div className="flex flex-col items-center justify-center px-0.5 min-w-[28px]">
      <span className="text-gray-400 text-[10px]">→</span>
      {wip > 0 && (
        <span className="text-[8px] text-amber-600 font-medium bg-amber-50 px-1 rounded">
          {wip.toLocaleString()}
        </span>
      )}
    </div>
  );
}

// ── Main Component ──
/* ── Skeleton loading placeholder with stable height ── */
function FlowSkeleton() {
  return (
    <div className="space-y-4 animate-pulse min-h-[320px]">
      {/* Overall progress skeleton */}
      <div className="bg-gray-100 dark:bg-gray-700/40 rounded-lg p-3">
        <div className="flex justify-between mb-2">
          <div className="h-3 w-28 bg-gray-200 dark:bg-gray-600 rounded" />
          <div className="h-3 w-12 bg-gray-200 dark:bg-gray-600 rounded" />
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2" />
      </div>
      {/* Pipeline skeleton */}
      <div>
        <div className="h-3 w-24 bg-gray-200 dark:bg-gray-600 rounded mb-3" />
        <div className="flex gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-1">
              <div className="w-[100px] h-[96px] bg-gray-100 dark:bg-gray-700/40 rounded-lg border border-gray-200 dark:border-gray-700" />
              {i < 5 && <div className="text-gray-200 dark:text-gray-700">→</div>}
            </div>
          ))}
        </div>
      </div>
      {/* Chart skeleton */}
      <div>
        <div className="h-3 w-20 bg-gray-200 dark:bg-gray-600 rounded mb-2" />
        <div className="h-[80px] bg-gray-100 dark:bg-gray-700/40 rounded-lg border border-gray-200 dark:border-gray-700" />
      </div>
    </div>
  );
}

export default function ProductionFlowTab({ jobId }: { jobId: number }) {
  const { data: summary, isLoading } = useStageSummary(jobId);

  if (isLoading) {
    return <FlowSkeleton />;
  }

  if (!summary || !summary.stages.length) {
    return (
      <div className="min-h-[320px] flex flex-col items-center justify-center text-center">
        <div className="text-2xl mb-2">📊</div>
        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">No production data yet</p>
        <p className="text-[10px] text-gray-400 mt-1">Record progress to see the pipeline.</p>
      </div>
    );
  }

  const { stages, bottleneck, overallPct, estimatedCompletion, estimatedDaysRemaining, dailyTrend, allocatedQty } = summary;

  return (
    <div className="space-y-4">
      {/* ── Overall Progress ── */}
      <div className="bg-gray-50 dark:bg-gray-700/40 rounded-lg p-3">
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300">Overall Completion</h4>
          <div className="flex items-center gap-2">
            {estimatedCompletion && (
              <span className="text-[10px] text-gray-500">
                Est. complete: <span className="font-medium text-gray-700 dark:text-gray-200">{estimatedCompletion}</span>
                {estimatedDaysRemaining != null && (
                  <span className="text-gray-400 ml-1">({estimatedDaysRemaining}d)</span>
                )}
              </span>
            )}
            <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{overallPct}%</span>
          </div>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${pctColor(overallPct)}`}
            style={{ width: `${Math.min(100, overallPct)}%` }}
          />
        </div>
        {bottleneck && (
          <div className="mt-1.5 flex items-center gap-1 text-[10px] text-red-600">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            Bottleneck: <span className="font-semibold">{stages.find(s => s.key === bottleneck)?.label ?? bottleneck}</span>
          </div>
        )}
      </div>

      {/* ── Stage Pipeline ── */}
      <div>
        <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Production Pipeline</h4>
        <div className="flex items-stretch overflow-x-auto pb-2 gap-1">
          {stages.map((stage: StageSummaryStage, idx: number) => {
            const isBtn = stage.key === bottleneck;
            const balance = Math.max(0, allocatedQty - stage.totalQty);
            return (
              <div key={stage.key} className="flex items-stretch">
                {/* Stage Card */}
                <div
                  className={`group flex-shrink-0 min-w-[92px] w-[92px] border rounded-lg p-2.5 transition-all hover:shadow-md ${
                    isBtn
                      ? 'border-red-400 bg-red-50 dark:bg-red-900/20 ring-1 ring-red-300'
                      : stage.status === 'COMPLETE'
                      ? 'border-green-200 bg-green-50/40 dark:border-green-800/50 dark:bg-green-900/10'
                      : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800'
                  }`}
                >
                  {/* Icon + Label */}
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-sm leading-none">{STAGE_ICONS[stage.key] ?? '⚙️'}</span>
                    <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 leading-tight">
                      {stage.label}
                    </span>
                  </div>
                  {/* Qty + target */}
                  <div className="text-base font-bold text-gray-800 dark:text-gray-200 leading-tight">
                    {stage.totalQty.toLocaleString()}
                  </div>
                  <div className="text-[9px] text-gray-500 dark:text-gray-400 mt-0.5">
                    / {allocatedQty.toLocaleString()} pcs
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 mt-2">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-500 ${pctColor(stage.pct)}`}
                      style={{ width: `${Math.min(100, stage.pct)}%` }}
                    />
                  </div>
                  {/* Pct + Status */}
                  <div className="flex items-center justify-between mt-1.5 gap-1">
                    <span className={`text-[10px] font-bold ${
                      isBtn ? 'text-red-600' : stage.pct >= 100 ? 'text-green-600' : 'text-gray-600 dark:text-gray-400'
                    }`}>{stage.pct}%</span>
                    {statusBadge(stage.status)}
                  </div>
                  {/* Hover details */}
                  <div className="mt-1.5 pt-1.5 border-t border-gray-100 dark:border-gray-700/50 space-y-0.5 text-[9px] text-gray-400 dark:text-gray-500">
                    <div className="flex justify-between">
                      <span>Balance</span>
                      <span className={balance > 0 ? 'text-amber-600 font-medium' : 'text-green-600'}>{balance.toLocaleString()}</span>
                    </div>
                    {stage.dailyRate > 0 && (
                      <div className="flex justify-between">
                        <span>Rate</span>
                        <span className="font-medium">{stage.dailyRate}/day</span>
                      </div>
                    )}
                    {isBtn && (
                      <div className="text-[8px] text-red-500 font-semibold mt-0.5 flex items-center gap-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
                        Bottleneck
                      </div>
                    )}
                  </div>
                </div>
                {/* WIP Arrow */}
                {idx < stages.length - 1 && <WipArrow wip={stages[idx + 1].wipFromPrevious} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Daily Trend Chart ── */}
      <div>
        <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Daily Trend</h4>
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-2 bg-white dark:bg-gray-800">
          <SparklineChart data={dailyTrend} allocatedQty={allocatedQty} />
          <ChartLegend />
        </div>
      </div>

      {/* ── Stage Detail Mini-Table ── */}
      <div>
        <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Stage Details</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-1 px-1">Stage</th>
                <th className="text-right py-1 px-1">Output</th>
                <th className="text-right py-1 px-1">Target</th>
                <th className="text-right py-1 px-1">%</th>
                <th className="text-right py-1 px-1">WIP</th>
                <th className="text-right py-1 px-1">Rate/day</th>
                <th className="text-center py-1 px-1">Status</th>
              </tr>
            </thead>
            <tbody>
              {stages.map((s: StageSummaryStage) => (
                <tr
                  key={s.key}
                  className={`border-b border-gray-100 dark:border-gray-700/50 ${
                    s.key === bottleneck ? 'bg-red-50 dark:bg-red-900/10' : ''
                  }`}
                >
                  <td className="py-1 px-1 text-gray-700 dark:text-gray-300 font-medium">
                    {STAGE_ICONS[s.key] ?? '⚙️'} {s.label}
                    {s.key === bottleneck && (
                      <span className="ml-1 text-[8px] text-red-500">⚠ Bottleneck</span>
                    )}
                  </td>
                  <td className="py-1 px-1 text-right">{s.totalQty.toLocaleString()}</td>
                  <td className="py-1 px-1 text-right text-gray-500">{allocatedQty.toLocaleString()}</td>
                  <td className="py-1 px-1 text-right font-medium">
                    <span className={
                      s.pct >= 80 ? 'text-green-600' : s.pct >= 50 ? 'text-blue-600' : s.pct > 0 ? 'text-amber-600' : 'text-gray-400'
                    }>
                      {s.pct}%
                    </span>
                  </td>
                  <td className="py-1 px-1 text-right">
                    {s.wipFromPrevious > 0 ? (
                      <span className="text-amber-600">{s.wipFromPrevious.toLocaleString()}</span>
                    ) : '--'}
                  </td>
                  <td className="py-1 px-1 text-right">{s.dailyRate > 0 ? s.dailyRate : '--'}</td>
                  <td className="py-1 px-1 text-center">{statusBadge(s.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
