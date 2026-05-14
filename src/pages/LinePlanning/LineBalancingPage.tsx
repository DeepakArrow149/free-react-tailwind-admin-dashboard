import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router';
import { PageMeta } from '@/components/common';
import { useLineBalancingStore, type BalancingViewMode } from '@/store/lineBalancingStore';
import {
  useBalancings, useBalancing, useAutoBalance,
  useApproveBalancing, useDeleteBalancing,
  useAnalyzeBottlenecks, useSplitOperation,
  useLines, useBulletinsForLayout,
} from '@/hooks/useLineBalancing';
import type { LineBalancing, LineBalancingStation, LineBalancingStationOp, BottleneckResult, BulletinForLayout } from '@/api/lineBalancing';
import { productionOrderApi, type CreatePOFromBalancingInput } from '@/api/production';
import { toastSuccess, toastError } from '@/utils/toast';

// ───── Helpers ─────
const fmtSec = (s: number) => `${(s / 60).toFixed(2)} min`;
const fmtPct = (p: number) => `${p.toFixed(1)}%`;

const STATUS_BADGE: Record<string, string> = {
  DRAFT: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  APPROVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  ARCHIVED: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};

const SEVERITY_COLOR: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  high: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
};

// ═══════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════

export default function LineBalancingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const store = useLineBalancingStore();
  const { data: list, isLoading } = useBalancings();
  const { data: active } = useBalancing(store.activeBalancingId ?? 0);
  const autoBalance = useAutoBalance();
  const approve = useApproveBalancing();
  const deleteBal = useDeleteBalancing();
  const analyzeBottlenecks = useAnalyzeBottlenecks();
  const splitOp = useSplitOperation();
  const { data: linesData } = useLines();
  const { data: bulletins } = useBulletinsForLayout();
  const lineList = Array.isArray(linesData) ? linesData : [];
  const bulletinList = Array.isArray(bulletins) ? bulletins : [];

  const [showForm, setShowForm] = useState(false);
  const [abForm, setAbForm] = useState({ lineId: '', bulletinId: '', targetOutput: '', name: '' });
  const [bottleneckData, setBottleneckData] = useState<BottleneckResult | null>(null);
  const [splitForm, setSplitForm] = useState<{ stationOpId: number; splitRatio: string } | null>(null);
  const [showPOForm, setShowPOForm] = useState(false);
  const [poForm, setPoForm] = useState({ startDate: '', endDate: '', totalQty: '', priority: 'MEDIUM', remarks: '' });
  const [poCreating, setPoCreating] = useState(false);

  // Pre-fill lineId from URL query param (e.g. from Lines page)
  useEffect(() => {
    const lineId = searchParams.get('lineId');
    if (lineId) {
      setAbForm(prev => ({ ...prev, lineId }));
      setShowForm(true);
    }
  }, [searchParams]);

  const handleAutoBalance = async () => {
    const data = {
      lineId: Number(abForm.lineId),
      bulletinId: Number(abForm.bulletinId),
      targetOutput: Number(abForm.targetOutput),
      name: abForm.name || undefined,
    };
    try {
      const res = await autoBalance.mutateAsync(data);
      const result = (res as { data?: LineBalancing })?.data ?? res;
      if (result && 'id' in result) store.setActiveBalancing((result as LineBalancing).id);
      setShowForm(false);
    } catch (e) {
      toastError(e, 'Auto-balance failed');
    }
  };

  const handleAnalyze = async () => {
    if (!store.activeBalancingId) return;
    try {
      const res = await analyzeBottlenecks.mutateAsync(store.activeBalancingId);
      const data = (res as { data?: BottleneckResult })?.data ?? res;
      setBottleneckData(data as BottleneckResult);
      store.setBottleneckResults(data);
    } catch (e) {
      toastError(e, 'Bottleneck analysis failed');
    }
  };

  const handleSplit = async () => {
    if (!store.activeBalancingId || !splitForm) return;
    try {
      await splitOp.mutateAsync({
        balancingId: store.activeBalancingId,
        stationOpId: splitForm.stationOpId,
        splitRatio: Number(splitForm.splitRatio) || 0.5,
      });
      setSplitForm(null);
    } catch (e) {
      toastError(e, 'Operation split failed');
    }
  };

  const handleGeneratePO = async () => {
    if (!active) return;
    setPoCreating(true);
    try {
      const payload: CreatePOFromBalancingInput = {
        lineBalancingId: active.id,
        startDate: poForm.startDate,
        endDate: poForm.endDate,
        totalQty: poForm.totalQty ? Number(poForm.totalQty) : undefined,
        priority: poForm.priority as 'LOW' | 'MEDIUM' | 'HIGH',
        remarks: poForm.remarks || undefined,
      };
      await productionOrderApi.createFromBalancing(payload);
      toastSuccess('Production order created from line balancing');
      setShowPOForm(false);
      setPoForm({ startDate: '', endDate: '', totalQty: '', priority: 'MEDIUM', remarks: '' });
      navigate('/production/orders');
    } catch (e) {
      toastError(e, 'Failed to create production order');
    } finally {
      setPoCreating(false);
    }
  };

  return (
    <>
      <PageMeta title="Line Balancing" description="Digital factory twin — balance sewing lines" />
      <div className="flex h-[calc(100vh-64px)] flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold dark:text-white">Line Balancing</h2>
            <div className="flex rounded-lg border border-gray-200 dark:border-gray-600">
              {(['FACTORY_FLOOR', 'YAMAZUMI', 'TABLE'] as BalancingViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => store.setViewMode(mode)}
                  className={`px-3 py-1.5 text-xs font-medium ${store.viewMode === mode ? 'bg-brand-500 text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'}`}
                  aria-label={`Switch to ${mode} view`}
                >
                  {mode === 'FACTORY_FLOOR' ? 'Floor' : mode === 'YAMAZUMI' ? 'Yamazumi' : 'Table'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowForm(true)} className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600" aria-label="Create auto-balance">
              Auto-Balance
            </button>
            {active && (
              <button
                onClick={handleAnalyze}
                disabled={analyzeBottlenecks.isPending}
                className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600 disabled:opacity-50"
                aria-label="Analyze bottlenecks"
              >
                {analyzeBottlenecks.isPending ? 'Analyzing…' : 'Bottlenecks'}
              </button>
            )}
            {active?.status === 'DRAFT' && (
              <>
                <button onClick={() => approve.mutate(active.id)} className="rounded-lg bg-green-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-600" aria-label="Approve">Approve</button>
                <button onClick={() => deleteBal.mutate(active.id)} className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600" aria-label="Delete">Delete</button>
              </>
            )}
            {active?.status === 'APPROVED' && (
              <button
                onClick={() => setShowPOForm(true)}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                aria-label="Generate production order"
              >
                Generate PO
              </button>
            )}
            {active && active.bulletinId && (
              <button
                onClick={() => navigate(`/line-planning/simulation?bulletinId=${active.bulletinId}`)}
                className="rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-600"
                aria-label="Run simulation"
              >
                Simulate
              </button>
            )}
          </div>
        </div>

        {/* Auto-balance dialog */}
        {showForm && (
          <div className="border-b border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900 space-y-3">
            <h3 className="text-sm font-semibold dark:text-white">Create Auto-Balance</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <select className="rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" value={abForm.lineId} onChange={e => setAbForm({ ...abForm, lineId: e.target.value })} aria-label="Line">
                <option value="">Select Line</option>
                {lineList.map(l => <option key={l.id} value={l.id}>{l.lineName}</option>)}
              </select>
              <select className="rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" value={abForm.bulletinId} onChange={e => setAbForm({ ...abForm, bulletinId: e.target.value })} aria-label="Bulletin">
                <option value="">Select Bulletin</option>
                {bulletinList.map((b: BulletinForLayout) => (
                  <option
                    key={b.id}
                    value={b.id}
                    disabled={b.status !== 'APPROVED'}
                    title={b.status !== 'APPROVED' ? 'Bulletin must be APPROVED before balancing' : ''}
                  >
                    {b.status !== 'APPROVED' ? `[${b.status}] ` : ''}{b.bulletinNo} — {b.style.styleName} ({b._count.items} ops)
                  </option>
                ))}
              </select>
              <input className="rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" placeholder="Target output (pcs)" value={abForm.targetOutput} onChange={e => setAbForm({ ...abForm, targetOutput: e.target.value })} aria-label="Target output" />
              <input className="rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" placeholder="Name (optional)" value={abForm.name} onChange={e => setAbForm({ ...abForm, name: e.target.value })} aria-label="Balancing name" />
            </div>
            <div className="flex gap-2">
              <button onClick={handleAutoBalance} disabled={autoBalance.isPending} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50" aria-label="Run auto-balance">
                {autoBalance.isPending ? 'Running RPW…' : 'Run Auto-Balance'}
              </button>
              <button onClick={() => setShowForm(false)} className="rounded-lg bg-gray-200 px-4 py-2 text-sm dark:bg-gray-700 dark:text-white" aria-label="Cancel">Cancel</button>
            </div>
          </div>
        )}

        {/* Generate Production Order dialog */}
        {showPOForm && active && (
          <div className="border-b border-gray-200 bg-emerald-50 p-4 dark:border-gray-700 dark:bg-emerald-950 space-y-3">
            <h3 className="text-sm font-semibold dark:text-white">Generate Production Order from Line Balancing</h3>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-900 rounded-lg p-3">
              <div><span className="text-gray-400">Balancing:</span> {active.name}</div>
              <div><span className="text-gray-400">Line:</span> {active.line?.lineName ?? '—'}</div>
              <div><span className="text-gray-400">Bulletin:</span> {active.bulletin?.bulletinNo ?? '—'}</div>
              <div><span className="text-gray-400">Efficiency:</span> {fmtPct(Number(active.balanceEfficiency))}</div>
              <div><span className="text-gray-400">Stations:</span> {active.totalStations}</div>
              <div><span className="text-gray-400">Takt Time:</span> {fmtSec(Number(active.taktTimeSec))}</div>
              <div><span className="text-gray-400">Target Output:</span> {active.targetOutput} pcs</div>
              <div><span className="text-gray-400">Total SAM:</span> {Number(active.bulletin?.totalSam ?? 0).toFixed(2)} min</div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
              <input type="date" className="rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" value={poForm.startDate} onChange={e => setPoForm({ ...poForm, startDate: e.target.value })} aria-label="Start date" />
              <input type="date" className="rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" value={poForm.endDate} onChange={e => setPoForm({ ...poForm, endDate: e.target.value })} aria-label="End date" />
              <input type="number" className="rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" placeholder="Total Qty (optional)" value={poForm.totalQty} onChange={e => setPoForm({ ...poForm, totalQty: e.target.value })} aria-label="Total quantity" />
              <select className="rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" value={poForm.priority} onChange={e => setPoForm({ ...poForm, priority: e.target.value })} aria-label="Priority">
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
              <input className="rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" placeholder="Remarks (optional)" value={poForm.remarks} onChange={e => setPoForm({ ...poForm, remarks: e.target.value })} aria-label="Remarks" />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleGeneratePO}
                disabled={poCreating || !poForm.startDate || !poForm.endDate}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                aria-label="Confirm generate PO"
              >
                {poCreating ? 'Creating…' : 'Create Production Order'}
              </button>
              <button onClick={() => setShowPOForm(false)} className="rounded-lg bg-gray-200 px-4 py-2 text-sm dark:bg-gray-700 dark:text-white" aria-label="Cancel">Cancel</button>
            </div>
          </div>
        )}

        {/* Split Operation dialog */}
        {splitForm && (
          <div className="border-b border-gray-200 bg-amber-50 p-4 dark:border-gray-700 dark:bg-amber-950 space-y-3">
            <h3 className="text-sm font-semibold dark:text-white">Split Operation</h3>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-600 dark:text-gray-300">Op ID: {splitForm.stationOpId}</span>
              <label className="text-xs text-gray-500">Split Ratio (0.1–0.9):</label>
              <input
                type="number"
                min="0.1"
                max="0.9"
                step="0.05"
                className="w-20 rounded-lg border px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                value={splitForm.splitRatio}
                onChange={(e) => setSplitForm({ ...splitForm, splitRatio: e.target.value })}
                aria-label="Split ratio"
              />
              <button onClick={handleSplit} disabled={splitOp.isPending} className="rounded-lg bg-amber-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-amber-600 disabled:opacity-50" aria-label="Confirm split">
                {splitOp.isPending ? 'Splitting…' : 'Split'}
              </button>
              <button onClick={() => setSplitForm(null)} className="rounded-lg bg-gray-200 px-3 py-1.5 text-xs dark:bg-gray-700 dark:text-white" aria-label="Cancel split">Cancel</button>
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
                onClick={() => { store.setActiveBalancing(b.id); setBottleneckData(null); }}
                className={`w-full rounded-lg border p-2 text-left text-xs transition ${store.activeBalancingId === b.id ? 'border-brand-500 bg-white dark:bg-gray-900' : 'border-transparent hover:bg-white dark:hover:bg-gray-900'}`}
                aria-label={`Select balancing ${b.name}`}
              >
                <div className="font-medium dark:text-white truncate">{b.name}</div>
                <div className="flex items-center justify-between mt-1">
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${STATUS_BADGE[b.status] ?? STATUS_BADGE.DRAFT}`}>{b.status}</span>
                  <span className="text-gray-400">{b.totalStations} sta</span>
                </div>
                {/* Enriched master data */}
                <div className="mt-1.5 space-y-0.5 text-[10px] text-gray-400">
                  {b.line?.lineName && <div>Line: <span className="text-gray-600 dark:text-gray-300">{b.line.lineName}</span></div>}
                  {b.bulletin?.bulletinNo && (
                    <div>Bulletin: <span className="text-gray-600 dark:text-gray-300">{b.bulletin.bulletinNo}</span>
                      {b.bulletin.style?.styleNo && <span> · {b.bulletin.style.styleNo}</span>}
                    </div>
                  )}
                  {b.balanceEfficiency != null && (
                    <div>Eff: <span className="font-medium text-brand-600 dark:text-brand-400">{fmtPct(Number(b.balanceEfficiency))}</span>
                      {b.targetOutput ? <span> · {b.targetOutput} pcs</span> : null}
                    </div>
                  )}
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
                {store.viewMode === 'FACTORY_FLOOR' && <FactoryFloorView balancing={active} onSplit={(opId) => setSplitForm({ stationOpId: opId, splitRatio: '0.5' })} />}
                {store.viewMode === 'YAMAZUMI' && <YamazumiView balancing={active} />}
                {store.viewMode === 'TABLE' && <TableView balancing={active} onSplit={(opId) => setSplitForm({ stationOpId: opId, splitRatio: '0.5' })} />}
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-gray-400">
                Select or create a balancing to view
              </div>
            )}
          </div>

          {/* Right panel — Metrics + Bottlenecks */}
          {active && store.isMetricsPanelOpen && (
            <div className="w-64 shrink-0 overflow-y-auto border-l border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-950 space-y-4">
              <MetricsPanel balancing={active} />
              {bottleneckData && <BottleneckPanel data={bottleneckData} />}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════
// FACTORY FLOOR VIEW (with split button)
// ═══════════════════════════════════════════

function FactoryFloorView({ balancing, onSplit }: { balancing: LineBalancing; onSplit: (opId: number) => void }) {
  const taktSec = Number(balancing.taktTimeSec);

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-500 dark:text-gray-400">
        <strong>{balancing.name}</strong> · Takt: {fmtSec(taktSec)} · Target: {balancing.targetOutput} pcs
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {balancing.stations.map((station: LineBalancingStation) => {
          const isBottleneck = station.id === balancing.bottleneckStationId;
          const util = Number(station.utilizationPct);
          const borderColor = isBottleneck
            ? 'border-red-500 ring-2 ring-red-200 dark:ring-red-900'
            : util > 90 ? 'border-amber-400' : 'border-gray-200 dark:border-gray-700';

          return (
            <div key={station.id} className={`rounded-xl border-2 bg-white p-3 dark:bg-gray-900 ${borderColor}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold dark:text-white">#{station.stationNo}</span>
                {isBottleneck && <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600 dark:bg-red-900/30 dark:text-red-400">BTN</span>}
              </div>

              {/* Workstation info: operator, machine, position */}
              <div className="mb-2 space-y-0.5 text-[10px] text-gray-500 dark:text-gray-400">
                {station.workstation?.defaultOperator && (
                  <div className="truncate" title={`${station.workstation.defaultOperator.firstName} ${station.workstation.defaultOperator.lastName}`}>
                    <span className="text-gray-400">👤</span> {station.workstation.defaultOperator.firstName} {station.workstation.defaultOperator.lastName}
                  </div>
                )}
                {station.workstation?.machine && (
                  <div className="truncate" title={station.workstation.machine.machineName}>
                    <span className="text-gray-400">⚙</span> {station.workstation.machine.machineName}
                  </div>
                )}
                {station.workstation?.position?.label && (
                  <div className="truncate" title={station.workstation.position.label}>
                    <span className="text-gray-400">📍</span> {station.workstation.position.label}
                  </div>
                )}
              </div>

              <div className="mb-2 h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800">
                <div className={`h-2 rounded-full ${util > 95 ? 'bg-red-500' : util > 80 ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${Math.min(util, 100)}%` }} />
              </div>

              <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
                <div className="flex justify-between"><span>SAM</span><span>{Number(station.totalSam).toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Cycle</span><span>{fmtSec(Number(station.cycleTimeSec))}</span></div>
                <div className="flex justify-between"><span>Util</span><span className="font-bold">{fmtPct(util)}</span></div>
              </div>

              <div className="mt-2 max-h-24 overflow-y-auto space-y-1">
                {station.operations.map((op: LineBalancingStationOp) => (
                  <div key={op.id} className="flex items-center justify-between rounded bg-blue-50 px-2 py-0.5 text-[10px] dark:bg-blue-900/20 dark:text-blue-300 group">
                    <span className="truncate" title={op.bulletinItem?.operation?.name ?? `Op ${op.sequence}`}>
                      {op.bulletinItem?.operation?.code ?? `#${op.bulletinItemId}`} — {Number(op.sam).toFixed(2)}
                    </span>
                    <button
                      onClick={() => onSplit(op.id)}
                      className="hidden group-hover:inline-block ml-1 text-amber-600 hover:text-amber-800 font-bold"
                      title="Split operation"
                      aria-label={`Split operation ${op.id}`}
                    >
                      ✂
                    </button>
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
// YAMAZUMI VIEW
// ═══════════════════════════════════════════

function YamazumiView({ balancing }: { balancing: LineBalancing }) {
  const taktSec = Number(balancing.taktTimeSec);
  const maxCt = Math.max(...balancing.stations.map((s: LineBalancingStation) => Number(s.cycleTimeSec)), taktSec);
  const store = useLineBalancingStore();
  const chartHeight = 300;
  const scale = (sec: number) => (sec / maxCt) * chartHeight;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Yamazumi Chart — Takt: {fmtSec(taktSec)} · Efficiency: {fmtPct(Number(balancing.balanceEfficiency))}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => store.toggleShowTaktLine()}
            className={`rounded-lg px-2.5 py-1 text-[10px] font-medium border transition ${store.showTaktLine ? 'bg-red-50 border-red-300 text-red-600 dark:bg-red-900/20 dark:border-red-700 dark:text-red-400' : 'border-gray-200 text-gray-500 dark:border-gray-600 dark:text-gray-400'}`}
            aria-label="Toggle takt line"
          >
            {store.showTaktLine ? '✔ Takt Line' : 'Takt Line'}
          </button>
          <button
            onClick={() => store.toggleShowIdleTime()}
            className={`rounded-lg px-2.5 py-1 text-[10px] font-medium border transition ${store.showIdleTime ? 'bg-gray-100 border-gray-300 text-gray-700 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300' : 'border-gray-200 text-gray-500 dark:border-gray-600 dark:text-gray-400'}`}
            aria-label="Toggle idle time"
          >
            {store.showIdleTime ? '✔ Idle Time' : 'Idle Time'}
          </button>
        </div>
      </div>
      <div className="relative overflow-x-auto rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        {store.showTaktLine && (
          <div className="absolute left-0 right-0 border-t-2 border-dashed border-red-400 z-10" style={{ bottom: `${scale(taktSec) + 40}px` }}>
            <span className="absolute -top-4 left-2 text-[10px] font-bold text-red-500">TAKT {fmtSec(taktSec)}</span>
          </div>
        )}
        <div className="flex items-end gap-2" style={{ height: chartHeight + 40 }}>
          {balancing.stations.map((station: LineBalancingStation) => {
            const ct = Number(station.cycleTimeSec);
            const idle = Math.max(taktSec - ct, 0);
            const isBtn = station.id === balancing.bottleneckStationId;
            return (
              <div key={station.id} className="flex flex-col items-center" style={{ minWidth: 48 }}>
                {store.showIdleTime && idle > 0 && (
                  <div className="w-10 rounded-t bg-gray-200 dark:bg-gray-700" style={{ height: scale(idle) }} title={`Idle: ${fmtSec(idle)}`} />
                )}
                <div className={`w-10 rounded-b ${isBtn ? 'bg-red-500' : 'bg-brand-500'}`} style={{ height: Math.max(scale(ct), 4) }} title={`Cycle: ${fmtSec(ct)}`} />
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
// TABLE VIEW (with split button)
// ═══════════════════════════════════════════

function TableView({ balancing, onSplit }: { balancing: LineBalancing; onSplit: (opId: number) => void }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      <table className="w-full text-left text-sm">
        <thead className="border-b bg-gray-50 dark:bg-gray-800">
          <tr>
            <th className="px-4 py-3 font-medium">Stn</th>
            <th className="px-4 py-3 font-medium">Operator</th>
            <th className="px-4 py-3 font-medium">Machine</th>
            <th className="px-4 py-3 font-medium">Operations</th>
            <th className="px-4 py-3 font-medium text-right">Total SAM</th>
            <th className="px-4 py-3 font-medium text-right">Cycle Time</th>
            <th className="px-4 py-3 font-medium text-right">Idle Time</th>
            <th className="px-4 py-3 font-medium text-right">Util %</th>
          </tr>
        </thead>
        <tbody className="divide-y dark:divide-gray-700">
          {balancing.stations.map((station: LineBalancingStation) => {
            const isBtn = station.id === balancing.bottleneckStationId;
            const op0 = station.workstation?.defaultOperator;
            const mch = station.workstation?.machine;
            return (
              <tr key={station.id} className={isBtn ? 'bg-red-50 dark:bg-red-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}>
                <td className="px-4 py-2 font-bold">
                  #{station.stationNo}
                  {isBtn && <span className="ml-1 text-[10px] text-red-500 font-bold">BTN</span>}
                </td>
                <td className="px-4 py-2 text-xs">
                  {op0 ? <span title={op0.empCode}>{op0.firstName} {op0.lastName}</span> : <span className="text-gray-400">—</span>}
                </td>
                <td className="px-4 py-2 text-xs">
                  {mch ? <span title={mch.machineCode}>{mch.machineName}</span> : <span className="text-gray-400">—</span>}
                </td>
                <td className="px-4 py-2">
                  <div className="flex flex-wrap gap-1">
                    {station.operations.map((op: LineBalancingStationOp) => (
                      <span key={op.id} className="group inline-flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] dark:bg-blue-900/20 dark:text-blue-300">
                        {op.bulletinItem?.operation?.code ?? `#${op.bulletinItemId}`}
                        {op.machineType && <span className="text-gray-400">({op.machineType.code})</span>}
                        <button onClick={() => onSplit(op.id)} className="hidden group-hover:inline text-amber-600 font-bold" title="Split" aria-label={`Split op ${op.id}`}>✂</button>
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
    { label: 'Balance Efficiency', value: fmtPct(Number(balancing.balanceEfficiency)), highlight: true },
    { label: 'Total Stations', value: String(balancing.totalStations) },
    { label: 'Takt Time', value: fmtSec(Number(balancing.taktTimeSec)) },
    { label: 'Target Output', value: `${balancing.targetOutput} pcs` },
    { label: 'Smoothness Index', value: Number(balancing.smoothnessIndex).toFixed(4) },
    { label: 'Available Minutes', value: `${Number(balancing.availableMinutes).toFixed(0)} min` },
  ];

  const styleName = balancing.bulletin?.style?.styleName;
  const buyerName = balancing.bulletin?.style?.buyer?.name;
  const order = balancing.bulletin?.order;
  const line = balancing.line;
  const pos = balancing.productionOrders;

  return (
    <div>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Metrics</h3>
      <div className="space-y-2">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-lg bg-white p-2 dark:bg-gray-900">
            <div className="text-[10px] text-gray-400">{m.label}</div>
            <div className={`text-sm font-bold ${m.highlight ? 'text-brand-600 dark:text-brand-400' : 'dark:text-white'}`}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Master Data Info */}
      <h3 className="mt-4 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Master Data</h3>
      <div className="space-y-1">
        <Link to={balancing.bulletin?.style?.id ? `/master/styles/${balancing.bulletin.style.id}` : '#'} className="block rounded-lg bg-white p-2 dark:bg-gray-900 hover:ring-1 hover:ring-brand-300 transition">
          <div className="text-[10px] text-gray-400">Style →</div>
          <div className="text-sm font-bold dark:text-white">{balancing.bulletin?.style?.styleNo ?? '—'}{styleName ? ` — ${styleName}` : ''}</div>
        </Link>
        {buyerName && (
          <div className="rounded-lg bg-white p-2 dark:bg-gray-900">
            <div className="text-[10px] text-gray-400">Buyer</div>
            <div className="text-sm font-bold dark:text-white">{buyerName}</div>
          </div>
        )}
        <Link to="/production/bulletins" className="block rounded-lg bg-white p-2 dark:bg-gray-900 hover:ring-1 hover:ring-brand-300 transition">
          <div className="text-[10px] text-gray-400">Bulletin →</div>
          <div className="text-sm font-bold dark:text-white">{balancing.bulletin?.bulletinNo ?? '—'}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">
            SAM: {Number(balancing.bulletin?.totalSam ?? 0).toFixed(2)} · MP: {balancing.bulletin?.manpower ?? '—'} · Machines: {balancing.bulletin?.machines ?? '—'}
          </div>
        </Link>
        {order && (
          <Link to={`/merchandising/orders/${order.id}`} className="block rounded-lg bg-white p-2 dark:bg-gray-900 hover:ring-1 hover:ring-brand-300 transition">
            <div className="text-[10px] text-gray-400">Order →</div>
            <div className="text-sm font-bold dark:text-white">{order.orderNo}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">
              Qty: {order.totalQty}{order.exFactoryDate ? ` · ExFactory: ${new Date(order.exFactoryDate).toLocaleDateString()}` : ''}
            </div>
          </Link>
        )}
      </div>

      {/* Line Info */}
      <h3 className="mt-4 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Line Info</h3>
      <div className="space-y-1">
        <div className="rounded-lg bg-white p-2 dark:bg-gray-900">
          <div className="text-[10px] text-gray-400">Line</div>
          <div className="text-sm font-bold dark:text-white">{line?.lineName ?? '—'}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">Dept: {line?.department ?? '—'}</div>
        </div>
        <div className="rounded-lg bg-white p-2 dark:bg-gray-900 grid grid-cols-2 gap-1">
          <div>
            <div className="text-[10px] text-gray-400">Operators</div>
            <div className="text-xs font-bold dark:text-white">{line?.totalOperators ?? '—'}</div>
          </div>
          <div>
            <div className="text-[10px] text-gray-400">Machines</div>
            <div className="text-xs font-bold dark:text-white">{line?.totalMachines ?? '—'}</div>
          </div>
          <div>
            <div className="text-[10px] text-gray-400">Efficiency</div>
            <div className="text-xs font-bold dark:text-white">{line?.efficiency != null ? `${Number(line.efficiency).toFixed(0)}%` : '—'}</div>
          </div>
          <div>
            <div className="text-[10px] text-gray-400">Shift</div>
            <div className="text-xs font-bold dark:text-white">{line?.shift?.name ?? `${line?.shiftHours ?? 8}h`}</div>
          </div>
        </div>
        {line?.dailyCapacity != null && (
          <div className="rounded-lg bg-white p-2 dark:bg-gray-900">
            <div className="text-[10px] text-gray-400">Daily Capacity</div>
            <div className="text-sm font-bold dark:text-white">{line.dailyCapacity} pcs</div>
          </div>
        )}
      </div>

      {/* Active POs */}
      {pos && pos.length > 0 && (
        <>
          <h3 className="mt-4 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Production Orders</h3>
          <div className="space-y-1">
            {pos.map(po => (
              <Link key={po.id} to="/production/orders" className="flex items-center justify-between rounded-lg bg-white p-2 dark:bg-gray-900 hover:ring-1 hover:ring-brand-300 transition">
                <div className="text-xs font-medium dark:text-white">{po.poNumber}</div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-gray-400">{po.totalQty} pcs</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${po.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{po.status}</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// BOTTLENECK PANEL (NEW)
// ═══════════════════════════════════════════

function BottleneckPanel({ data }: { data: BottleneckResult }) {
  return (
    <div>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Bottleneck Analysis</h3>

      {/* Summary */}
      <div className="rounded-lg bg-white p-2 dark:bg-gray-900 mb-2 space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">Total</span>
          <span className="font-bold dark:text-white">{data.summary.totalBottlenecks}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-red-500">Critical</span>
          <span className="font-bold text-red-600">{data.summary.criticalCount}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-amber-500">High</span>
          <span className="font-bold text-amber-600">{data.summary.highCount}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-yellow-500">Medium</span>
          <span className="font-bold text-yellow-600">{data.summary.mediumCount}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">Overall Eff.</span>
          <span className="font-bold dark:text-white">{fmtPct(data.summary.overallEfficiency)}</span>
        </div>
      </div>

      {/* Bottleneck list */}
      {data.bottlenecks.map((bn) => (
        <div key={bn.stationId} className="rounded-lg bg-white p-2 dark:bg-gray-900 mb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold dark:text-white">Station #{bn.stationNo}</span>
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${SEVERITY_COLOR[bn.severity]}`}>
              {bn.severity.toUpperCase()}
            </span>
          </div>
          <div className="text-[10px] text-gray-400 mb-1">
            Util: {fmtPct(bn.utilizationPct)} · Cycle: {fmtSec(bn.cycleTimeSec)}
          </div>
          <div className="space-y-1">
            {bn.suggestions.map((s, i) => (
              <div key={i} className="rounded bg-gray-50 px-2 py-1 text-[10px] dark:bg-gray-800 dark:text-gray-300">
                <span className="font-medium text-brand-600 dark:text-brand-400">{s.type}:</span> {s.message}
              </div>
            ))}
          </div>
        </div>
      ))}

      {data.bottlenecks.length === 0 && (
        <div className="text-xs text-green-600 dark:text-green-400">No bottlenecks detected — line is well balanced!</div>
      )}
    </div>
  );
}
