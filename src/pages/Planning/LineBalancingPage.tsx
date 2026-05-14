import { useState } from 'react';
import { PageMeta } from '@/components/common';
import { useLineBalancingStore, type BalancingViewMode } from '@/store/lineBalancingStore';
import {
  useBalancings, useBalancing, useAutoBalance,
  useApproveBalancing, useDeleteBalancing,
} from '@/hooks/useLineBalancing';
import type { LineBalancing } from '@/api/lineBalancing';

// ───── Helpers ─────
const fmtSec = (s: number) => `${(s / 60).toFixed(2)} min`;
const fmtPct = (p: number) => `${p.toFixed(1)}%`;

const STATUS_BADGE: Record<string, string> = {
  DRAFT: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  APPROVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  ARCHIVED: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};

// ═══════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════

export default function LineBalancingPage() {
  const store = useLineBalancingStore();
  const { data: list, isLoading } = useBalancings();
  const { data: active } = useBalancing(store.activeBalancingId ?? 0);
  const autoBalance = useAutoBalance();
  const approve = useApproveBalancing();
  const deleteBal = useDeleteBalancing();

  // Auto-balance form
  const [showForm, setShowForm] = useState(false);
  const [abForm, setAbForm] = useState({ lineId: '', bulletinId: '', targetOutput: '', name: '' });

  const handleAutoBalance = async () => {
    const data = {
      lineId: Number(abForm.lineId),
      bulletinId: Number(abForm.bulletinId),
      targetOutput: Number(abForm.targetOutput),
      name: abForm.name || undefined,
    };
    const res = await autoBalance.mutateAsync(data);
    const result = (res as { data?: LineBalancing })?.data ?? res;
    if (result && 'id' in result) store.setActiveBalancing((result as LineBalancing).id);
    setShowForm(false);
  };

  return (
    <>
      <PageMeta title="Line Balancing" description="Digital factory twin — balance sewing lines" />
      <div className="flex h-[calc(100vh-64px)] flex-col">
        {/* Toolbar */}
        <BalancingToolbar
          viewMode={store.viewMode}
          onViewChange={store.setViewMode}
          onAutoBalance={() => setShowForm(true)}
          activeBalancing={active ?? null}
          onApprove={() => active && approve.mutate(active.id)}
          onDelete={() => active && deleteBal.mutate(active.id)}
        />

        {/* Auto-balance dialog */}
        {showForm && (
          <div className="border-b border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900 space-y-3">
            <h3 className="text-sm font-semibold dark:text-white">Create Auto-Balance</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <input className="rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" placeholder="Line ID" value={abForm.lineId} onChange={e => setAbForm({ ...abForm, lineId: e.target.value })} aria-label="Line ID" />
              <input className="rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" placeholder="Bulletin ID" value={abForm.bulletinId} onChange={e => setAbForm({ ...abForm, bulletinId: e.target.value })} aria-label="Bulletin ID" />
              <input className="rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" placeholder="Target output (pcs)" value={abForm.targetOutput} onChange={e => setAbForm({ ...abForm, targetOutput: e.target.value })} aria-label="Target output" />
              <input className="rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" placeholder="Name (optional)" value={abForm.name} onChange={e => setAbForm({ ...abForm, name: e.target.value })} aria-label="Balancing name" />
            </div>
            <div className="flex gap-2">
              <button onClick={handleAutoBalance} disabled={autoBalance.isPending} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50" aria-label="Run auto-balance">
                {autoBalance.isPending ? 'Running RPW…' : 'Run Auto-Balance'}
              </button>
              <button onClick={() => setShowForm(false)} className="rounded-lg bg-gray-200 px-4 py-2 text-sm dark:bg-gray-700 dark:text-white" aria-label="Cancel auto-balance">Cancel</button>
            </div>
          </div>
        )}

        {/* Content area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left sidebar — balancing list */}
          <div className="w-64 shrink-0 overflow-y-auto border-r border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-950 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Balancings</h3>
            {isLoading && <div className="text-xs text-gray-400">Loading…</div>}
            {(list ?? []).map((b: LineBalancing) => (
              <button
                key={b.id}
                onClick={() => store.setActiveBalancing(b.id)}
                className={`w-full rounded-lg border p-2 text-left text-xs transition ${store.activeBalancingId === b.id ? 'border-brand-500 bg-white dark:bg-gray-900' : 'border-transparent hover:bg-white dark:hover:bg-gray-900'}`}
                aria-label={`Select balancing ${b.name}`}
              >
                <div className="font-medium dark:text-white truncate">{b.name}</div>
                <div className="flex items-center justify-between mt-1">
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${STATUS_BADGE[b.status] ?? STATUS_BADGE.DRAFT}`}>{b.status}</span>
                  <span className="text-gray-400">{b.totalStations} sta</span>
                </div>
              </button>
            ))}
            {!isLoading && (!list || list.length === 0) && (
              <div className="text-xs text-gray-400">No balancings yet</div>
            )}
          </div>

          {/* Main view */}
          <div className="flex-1 overflow-auto p-4">
            {active ? (
              <>
                {store.viewMode === 'FACTORY_FLOOR' && <FactoryFloorView balancing={active} />}
                {store.viewMode === 'YAMAZUMI' && <YamazumiView balancing={active} />}
                {store.viewMode === 'TABLE' && <TableView balancing={active} />}
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-gray-400">
                Select or create a balancing to view
              </div>
            )}
          </div>

          {/* Metrics panel */}
          {active && store.isMetricsPanelOpen && (
            <MetricsPanel balancing={active} />
          )}
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════
// TOOLBAR
// ═══════════════════════════════════════════

function BalancingToolbar({
  viewMode, onViewChange, onAutoBalance, activeBalancing, onApprove, onDelete,
}: {
  viewMode: BalancingViewMode;
  onViewChange: (m: BalancingViewMode) => void;
  onAutoBalance: () => void;
  activeBalancing: LineBalancing | null;
  onApprove: () => void;
  onDelete: () => void;
}) {
  const views: { mode: BalancingViewMode; label: string }[] = [
    { mode: 'FACTORY_FLOOR', label: 'Floor' },
    { mode: 'YAMAZUMI', label: 'Yamazumi' },
    { mode: 'TABLE', label: 'Table' },
  ];

  return (
    <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-bold dark:text-white">Line Balancing</h2>
        <div className="flex rounded-lg border border-gray-200 dark:border-gray-600">
          {views.map(v => (
            <button
              key={v.mode}
              onClick={() => onViewChange(v.mode)}
              className={`px-3 py-1.5 text-xs font-medium ${viewMode === v.mode ? 'bg-brand-500 text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'}`}
              aria-label={`Switch to ${v.label} view`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onAutoBalance} className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600" aria-label="Create auto-balance">
          Auto-Balance
        </button>
        {activeBalancing?.status === 'DRAFT' && (
          <>
            <button onClick={onApprove} className="rounded-lg bg-green-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-600" aria-label="Approve balancing">Approve</button>
            <button onClick={onDelete} className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600" aria-label="Delete balancing">Delete</button>
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// FACTORY FLOOR VIEW
// ═══════════════════════════════════════════

function FactoryFloorView({ balancing }: { balancing: LineBalancing }) {
  const taktSec = Number(balancing.taktTimeSec);

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-500 dark:text-gray-400">
        <strong>{balancing.name}</strong> · Takt: {fmtSec(taktSec)} · Target: {balancing.targetOutput} pcs
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {balancing.stations.map((station) => {
          const isBottleneck = station.id === balancing.bottleneckStationId;
          const util = Number(station.utilizationPct);
          const borderColor = isBottleneck
            ? 'border-red-500 ring-2 ring-red-200 dark:ring-red-900'
            : util > 90
              ? 'border-amber-400'
              : 'border-gray-200 dark:border-gray-700';

          return (
            <div key={station.id} className={`rounded-xl border-2 bg-white p-3 dark:bg-gray-900 ${borderColor}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold dark:text-white">#{station.stationNo}</span>
                {isBottleneck && <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600 dark:bg-red-900/30 dark:text-red-400">BTN</span>}
              </div>

              {/* Utilization bar */}
              <div className="mb-2 h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800">
                <div
                  className={`h-2 rounded-full ${util > 95 ? 'bg-red-500' : util > 80 ? 'bg-amber-500' : 'bg-green-500'}`}
                  style={{ width: `${Math.min(util, 100)}%` }}
                />
              </div>

              <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
                <div className="flex justify-between"><span>SAM</span><span>{Number(station.totalSam).toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Cycle</span><span>{fmtSec(Number(station.cycleTimeSec))}</span></div>
                <div className="flex justify-between"><span>Util</span><span className="font-bold">{fmtPct(util)}</span></div>
              </div>

              {/* Operations */}
              <div className="mt-2 max-h-24 overflow-y-auto space-y-1">
                {station.operations.map(op => (
                  <div key={op.id} className="rounded bg-blue-50 px-2 py-0.5 text-[10px] dark:bg-blue-900/20 dark:text-blue-300 truncate" title={op.bulletinItem?.operation?.name ?? `Op ${op.sequence}`}>
                    {op.bulletinItem?.operation?.code ?? `#${op.bulletinItemId}`} — {Number(op.sam).toFixed(2)} min
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// YAMAZUMI VIEW (Stacked bar chart in pure CSS)
// ═══════════════════════════════════════════

function YamazumiView({ balancing }: { balancing: LineBalancing }) {
  const taktSec = Number(balancing.taktTimeSec);
  const maxCt = Math.max(...balancing.stations.map(s => Number(s.cycleTimeSec)), taktSec);
  const store = useLineBalancingStore();

  const chartHeight = 300;
  const scale = (sec: number) => (sec / maxCt) * chartHeight;

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Yamazumi Chart — Takt: {fmtSec(taktSec)} · Efficiency: {fmtPct(Number(balancing.balanceEfficiency))}
      </div>
      <div className="relative overflow-x-auto rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        {/* Takt line */}
        {store.showTaktLine && (
          <div
            className="absolute left-0 right-0 border-t-2 border-dashed border-red-400 z-10"
            style={{ bottom: `${scale(taktSec) + 40}px` }}
          >
            <span className="absolute -top-4 left-2 text-[10px] font-bold text-red-500">TAKT {fmtSec(taktSec)}</span>
          </div>
        )}

        <div className="flex items-end gap-2" style={{ height: chartHeight + 40 }}>
          {balancing.stations.map((station) => {
            const ct = Number(station.cycleTimeSec);
            const idle = Math.max(taktSec - ct, 0);
            const isBtn = station.id === balancing.bottleneckStationId;

            return (
              <div key={station.id} className="flex flex-col items-center" style={{ minWidth: 48 }}>
                {/* Idle time */}
                {store.showIdleTime && idle > 0 && (
                  <div
                    className="w-10 rounded-t bg-gray-200 dark:bg-gray-700"
                    style={{ height: scale(idle) }}
                    title={`Idle: ${fmtSec(idle)}`}
                  />
                )}
                {/* Work time — stack operations */}
                <div
                  className={`w-10 rounded-b ${isBtn ? 'bg-red-500' : 'bg-brand-500'}`}
                  style={{ height: Math.max(scale(ct), 4) }}
                  title={`Cycle: ${fmtSec(ct)}`}
                />
                <span className="mt-1 text-[10px] font-medium dark:text-gray-400">#{station.stationNo}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// TABLE VIEW
// ═══════════════════════════════════════════

function TableView({ balancing }: { balancing: LineBalancing }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      <table className="w-full text-left text-sm">
        <thead className="border-b bg-gray-50 dark:bg-gray-800">
          <tr>
            <th className="px-4 py-3 font-medium">Stn</th>
            <th className="px-4 py-3 font-medium">Operations</th>
            <th className="px-4 py-3 font-medium text-right">Total SAM</th>
            <th className="px-4 py-3 font-medium text-right">Cycle Time</th>
            <th className="px-4 py-3 font-medium text-right">Idle Time</th>
            <th className="px-4 py-3 font-medium text-right">Util %</th>
          </tr>
        </thead>
        <tbody className="divide-y dark:divide-gray-700">
          {balancing.stations.map(station => {
            const isBtn = station.id === balancing.bottleneckStationId;
            return (
              <tr key={station.id} className={`${isBtn ? 'bg-red-50 dark:bg-red-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>
                <td className="px-4 py-2 font-bold">
                  #{station.stationNo}
                  {isBtn && <span className="ml-1 text-[10px] text-red-500 font-bold">BTN</span>}
                </td>
                <td className="px-4 py-2">
                  <div className="flex flex-wrap gap-1">
                    {station.operations.map(op => (
                      <span key={op.id} className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] dark:bg-blue-900/20 dark:text-blue-300">
                        {op.bulletinItem?.operation?.code ?? `#${op.bulletinItemId}`}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-2 text-right font-mono text-xs">{Number(station.totalSam).toFixed(2)}</td>
                <td className="px-4 py-2 text-right font-mono text-xs">{fmtSec(Number(station.cycleTimeSec))}</td>
                <td className="px-4 py-2 text-right font-mono text-xs">{fmtSec(Number(station.idleTimeSec))}</td>
                <td className="px-4 py-2 text-right font-mono text-xs font-bold">{fmtPct(Number(station.utilizationPct))}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ═══════════════════════════════════════════
// METRICS PANEL
// ═══════════════════════════════════════════

function MetricsPanel({ balancing }: { balancing: LineBalancing }) {
  const metrics = [
    { label: 'Total Stations', value: String(balancing.totalStations) },
    { label: 'Takt Time', value: fmtSec(Number(balancing.taktTimeSec)) },
    { label: 'Target Output', value: `${balancing.targetOutput} pcs` },
    { label: 'Balance Efficiency', value: fmtPct(Number(balancing.balanceEfficiency)), highlight: true },
    { label: 'Smoothness Index', value: Number(balancing.smoothnessIndex).toFixed(4) },
    { label: 'Available Minutes', value: `${Number(balancing.availableMinutes).toFixed(0)} min` },
    { label: 'Bulletin', value: balancing.bulletin?.bulletinNo ?? '—' },
    { label: 'Total SAM', value: `${Number(balancing.bulletin?.totalSam ?? 0).toFixed(2)} min` },
    { label: 'Line', value: balancing.line?.lineName ?? '—' },
  ];

  return (
    <div className="w-56 shrink-0 overflow-y-auto border-l border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-950">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Metrics</h3>
      <div className="space-y-2">
        {metrics.map(m => (
          <div key={m.label} className="rounded-lg bg-white p-2 dark:bg-gray-900">
            <div className="text-[10px] text-gray-400">{m.label}</div>
            <div className={`text-sm font-bold ${m.highlight ? 'text-brand-600 dark:text-brand-400' : 'dark:text-white'}`}>{m.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
