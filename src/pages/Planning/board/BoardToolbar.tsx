import { useState } from 'react';
import { usePlanningBoardStore, type ViewMode } from '@/store/planningBoardStore';
import { useScenarios, useCreateScenario, usePublishScenario, useAutoAllocate, useRecalculateScenario, usePlanningKPIs, useBoardData } from '@/hooks/usePlanningBoard';
import type { ApiResponse } from '@/types';

const VIEW_MODES: { value: ViewMode; label: string; icon: string }[] = [
  { value: 'SIMPLE', label: 'Simple', icon: '▦' },
  { value: 'DETAIL', label: 'Detail', icon: '▤' },
  { value: 'REALTIME', label: 'Real-time', icon: '◉' },
];

export default function BoardToolbar() {
  const {
    viewMode, setViewMode, zoomLevel, zoomIn, zoomOut,
    fromDate, toDate, setDateRange, activeScenarioId, setActiveScenario,
    departmentFilter, setDepartmentFilter,
    toggleUnplannedPanel, toggleAlertsPanel,
    isUnplannedPanelOpen,
    selectedJobIds,
    openMergeDialog,
  } = usePlanningBoardStore();

  const { data: scenarios } = useScenarios();
  const createScenario = useCreateScenario();
  const publishScenario = usePublishScenario();
  const autoAllocate = useAutoAllocate();
  const recalculate = useRecalculateScenario();

  const [showNewScenario, setShowNewScenario] = useState(false);
  const [newName, setNewName] = useState('');

  const scenarioList = scenarios ?? [];

  const activeScenario = scenarioList.find((s) => s.id === activeScenarioId);

  // KPI data
  const { data: kpis } = usePlanningKPIs();
  const { data: boardData } = useBoardData(activeScenarioId, fromDate, toDate);

  const handleCreateScenario = () => {
    if (!newName.trim()) return;
    createScenario.mutate({ name: newName.trim() }, {
      onSuccess: (res: ApiResponse<{ id: number }>) => {
        const data = (res.data ?? res) as { id: number };
        setActiveScenario(data.id);
        setNewName('');
        setShowNewScenario(false);
      },
    });
  };

  const handleAutoAllocate = () => {
    if (!activeScenarioId) return;
    autoAllocate.mutate({ scenarioId: activeScenarioId });
  };

  // ── Excel/CSV Export ──
  const handleExport = () => {
    if (!boardData) return;
    const rows = boardData.lines.flatMap((line) =>
      line.jobs.map((job) => ({
        Line: line.lineName,
        Department: line.department ?? '',
        OrderNo: job.orderNo ?? '',
        Style: job.styleNo ?? '',
        Buyer: job.buyerName ?? '',
        AllocatedQty: job.allocatedQty,
        CompletedQty: job.completedQty ?? 0,
        SAM: job.samPerPiece ?? '',
        StartDate: job.startDate,
        EndDate: job.endDate,
        ExFactory: job.exFactoryDate ?? '',
        Status: job.status,
        Efficiency: job.efficiency ?? '',
        Priority: job.priority ?? '',
      })),
    );
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const csvContent = [
      headers.join(','),
      ...rows.map((r) => headers.map((h) => `"${(r as Record<string, string | number>)[h] ?? ''}"`).join(',')),
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `planning-board-${fromDate}-to-${toDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Navigate date range
  const shiftDays = (delta: number) => {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    from.setDate(from.getDate() + delta);
    to.setDate(to.getDate() + delta);
    setDateRange(from.toISOString().slice(0, 10), to.toISOString().slice(0, 10));
  };

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2">
      {/* Row 1: Scenario + View Modes + Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Scenario Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Scenario:</label>
          <select
            title="Select planning scenario"
            value={activeScenarioId ?? ''}
            onChange={(e) => setActiveScenario(e.target.value ? Number(e.target.value) : null)}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-700 dark:text-white min-w-[160px]"
          >
            <option value="">Select scenario</option>
            {scenarioList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.status === 'PUBLISHED' ? '✔' : s.status === 'ARCHIVED' ? '⌛' : ''}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowNewScenario(true)}
            className="text-xs px-2 py-1 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50"
            title="New scenario"
          >
            + New
          </button>
          {activeScenario?.status === 'DRAFT' && (
            <button
              onClick={() => publishScenario.mutate(activeScenarioId!)}
              className="text-xs px-2 py-1 bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400 rounded hover:bg-green-100"
              title="Publish scenario"
            >
              Publish
            </button>
          )}
        </div>

        <div className="h-5 w-px bg-gray-300 dark:bg-gray-600" />

        {/* View Mode Toggle */}
        <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-md p-0.5">
          {VIEW_MODES.map((mode) => (
            <button
              key={mode.value}
              onClick={() => setViewMode(mode.value)}
              className={`text-xs px-3 py-1 rounded transition-colors ${
                viewMode === mode.value
                  ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm font-medium'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <span className="mr-1">{mode.icon}</span>
              {mode.label}
            </button>
          ))}
        </div>

        <div className="h-5 w-px bg-gray-300 dark:bg-gray-600" />

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <button onClick={zoomOut} className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white" title="Zoom out">−</button>
          <span className="text-xs text-gray-500 dark:text-gray-400 w-12 text-center capitalize">{zoomLevel}</span>
          <button onClick={zoomIn} className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white" title="Zoom in">+</button>
        </div>

        <div className="h-5 w-px bg-gray-300 dark:bg-gray-600" />

        {/* Date Navigation */}
        <div className="flex items-center gap-1">
          <button onClick={() => shiftDays(-7)} className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white">‹</button>
          <input
            type="date"
            title="From date"
            value={fromDate}
            onChange={(e) => {
              const f = e.target.value;
              const t = new Date(f);
              t.setDate(t.getDate() + 27);
              setDateRange(f, t.toISOString().slice(0, 10));
            }}
            className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 dark:text-white"
          />
          <span className="text-xs text-gray-400">→</span>
          <input
            type="date"
            title="To date"
            value={toDate}
            onChange={(e) => setDateRange(fromDate, e.target.value)}
            className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 dark:text-white"
          />
          <button onClick={() => shiftDays(7)} className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white">›</button>
          <button
            onClick={() => {
              const now = new Date();
              const mon = new Date(now);
              const off = now.getDay() === 0 ? -6 : 1 - now.getDay();
              mon.setDate(now.getDate() + off);
              const end = new Date(mon);
              end.setDate(mon.getDate() + 27);
              setDateRange(mon.toISOString().slice(0, 10), end.toISOString().slice(0, 10));
            }}
            className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30"
          >
            Today
          </button>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Department Filter */}
        <select
          title="Department filter"
          value={departmentFilter ?? ''}
          onChange={(e) => setDepartmentFilter(e.target.value || null)}
          className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 dark:text-white"
        >
          <option value="">All Departments</option>
          <option value="SEWING">Sewing</option>
          <option value="CUTTING">Cutting</option>
          <option value="FINISHING">Finishing</option>
          <option value="PACKING">Packing</option>
        </select>

        {/* Action Buttons */}
        <button
          onClick={toggleUnplannedPanel}
          className={`text-xs px-3 py-1 rounded transition-colors ${
            isUnplannedPanelOpen
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          Orders
        </button>

        <button
          onClick={toggleAlertsPanel}
          className="text-xs px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
        >
          Alerts
        </button>

        <button
          onClick={handleAutoAllocate}
          disabled={!activeScenarioId || autoAllocate.isPending}
          className="text-xs px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {autoAllocate.isPending ? 'Allocating...' : 'Auto Allocate'}
        </button>

        {/* Merge selected jobs */}
        {selectedJobIds.length >= 2 && (
          <button
            onClick={() => openMergeDialog()}
            className="text-xs px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {`Merge (${selectedJobIds.length})`}
          </button>
        )}

        {/* Recalculate scenario */}
        <button
          onClick={() => activeScenarioId && recalculate.mutate({ scenarioId: activeScenarioId })}
          disabled={!activeScenarioId || recalculate.isPending}
          className="text-xs px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
          title="Recalculate all job end dates in scenario"
        >
          {recalculate.isPending ? 'Recalculating...' : '↻ Recalc'}
        </button>

        {/* Calendar Panel */}
        <button
          onClick={() => usePlanningBoardStore.getState().toggleCalendarPanel()}
          className="text-xs px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
          title="Working calendar settings"
        >
          📅
        </button>

        {/* Brand Colors */}
        <button
          onClick={() => usePlanningBoardStore.getState().toggleBrandColors()}
          className="text-xs px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
          title="Brand colour settings"
        >
          🎨
        </button>

        {/* Export CSV */}
        <button
          onClick={handleExport}
          disabled={!boardData}
          className="text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Export board data as CSV"
        >
          ↓ Export
        </button>
      </div>

      {/* ── KPI Strip (inline below toolbar) ── */}
      {kpis && (
        <div className="flex items-center gap-4 mt-1.5 text-[11px] text-gray-500 dark:text-gray-400">
          <span>📊 <strong className="text-gray-700 dark:text-gray-300">{kpis.activeJobs ?? 0}</strong> active jobs</span>
          <span>✅ <strong className="text-gray-700 dark:text-gray-300">{kpis.completedJobs ?? 0}</strong> completed</span>
          <span>📦 On-time: <strong className={`${(kpis.onTimeDeliveryPct ?? 0) >= 90 ? 'text-green-600' : 'text-red-600'}`}>
            {kpis.onTimeDeliveryPct ?? 0}%
          </strong></span>
          <span>⚠️ <strong className="text-gray-700 dark:text-gray-300">{kpis.alertCount ?? 0}</strong> alerts</span>
          <span>📈 Utilization: <strong className="text-gray-700 dark:text-gray-300">{kpis.lineUtilization ?? 0}%</strong></span>
        </div>
      )}

      {/* New Scenario Dialog */}
      {showNewScenario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-96">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-3">New Planning Scenario</h3>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Scenario name (e.g. Week 12 Plan)"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm dark:bg-gray-700 dark:text-white mb-4"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreateScenario()}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowNewScenario(false); setNewName(''); }}
                className="text-xs px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateScenario}
                disabled={!newName.trim() || createScenario.isPending}
                className="text-xs px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
