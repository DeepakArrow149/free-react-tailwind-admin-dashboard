import { useState, useCallback, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { PageMeta } from '@/components/common';
import {
  useLayouts,
  useCreateLayout,
  useDeleteLayout,
  useLayout,
  useAutoPlaceLayout,
  useAddPosition,
  useUpdatePosition,
  useRemovePosition,
  useReorderPositions,
} from '@/hooks/useLineBalancing';
import type { LineLayout, LayoutPosition } from '@/api/lineBalancing';
import { masterApi, type StyleMaster } from '@/api/master';
import { LayoutGrid, LayoutToolbar, StationEditor } from '@/components/LineLayout';
import InspectPanel from '@/components/LineLayout/InspectPanel';
import { useLayoutEditorStore } from '@/store/layoutEditorStore';

export default function LineLayoutPage() {
  // ── Data hooks ──
  const { data: layouts, isLoading } = useLayouts();
  const createLayout = useCreateLayout();
  const deleteLayout = useDeleteLayout();
  const autoPlace = useAutoPlaceLayout();
  const addPositionMut = useAddPosition();
  const updatePositionMut = useUpdatePosition();
  const removePositionMut = useRemovePosition();
  const reorderMut = useReorderPositions();

  // Styles for layout creation & auto-place
  const [styles, setStyles] = useState<StyleMaster[]>([]);
  useEffect(() => {
    masterApi.listStyles({ limit: 500 }).then(res => {
      const list = res.data?.data ?? [];
      setStyles(list.filter((s: StyleMaster) => (s.totalOperations ?? 0) > 0));
    }).catch(() => {});
  }, []);

  // ── UI state ──
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { data: activeLayout } = useLayout(selectedId ?? 0);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    rowCount: 2,
    hasConveyor: true,
    flowDirection: 'TOP_TO_BOTTOM',
    styleId: null as number | null,
    bulletinId: null as number | null,
  });

  // Edit-station modal
  const [editingPos, setEditingPos] = useState<LayoutPosition | null>(null);

  // Grid zoom
  const [zoom, setZoom] = useState(100);

  // Layout editor store: undo/redo & inspect
  const selectedPositionId = useLayoutEditorStore((s) => s.selectedPositionId);
  const undo = useLayoutEditorStore((s) => s.undo);
  const redo = useLayoutEditorStore((s) => s.redo);
  const pushHistory = useLayoutEditorStore((s) => s.pushHistory);

  // ── Derived values (must be declared before hooks that reference them) ──
  const positions = useMemo(() => activeLayout?.positions ?? [], [activeLayout?.positions]);
  const maxRow = positions.length > 0 ? Math.max(...positions.map(p => p.gridRow)) : 0;
  const maxCol = positions.length > 0 ? Math.max(...positions.map(p => p.gridCol)) : 0;
  // Ensure grid always has at least 2 rows and room for 1 more station
  const minRows = Math.max(activeLayout?.rowCount ?? 2, 2);
  const gridRows = Math.max(minRows, maxRow + 2);
  const gridCols = Math.max(maxCol + 1, 2);

  // Push positions into undo history whenever they change
  useEffect(() => {
    if (positions.length > 0) {
      pushHistory(positions, 'sync');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positions]);

  // Selected position for inspect panel
  const inspectedPosition = useMemo(
    () => positions.find(p => p.id === selectedPositionId) ?? null,
    [positions, selectedPositionId]
  );

  // ── Callbacks ──
  const handleCreate = async () => {
    try {
      const result = await createLayout.mutateAsync({
        ...form,
        totalStations: 0,
        positions: [],
      });
      // Auto-select the newly created layout so the grid renders immediately
      const payload = result?.data ?? result;
      const newId = payload?.id;
      if (newId) setSelectedId(newId);
      // Warn when auto-place silently failed
      if (payload?._warning) {
        toast.warning(payload._warning);
      } else if (form.styleId && (payload?.positions?.length ?? 0) === 0) {
        toast.warning('Layout created but operations could not be auto-placed. Use the toolbar to retry.');
      }
      setShowCreateForm(false);
      setForm({ name: '', description: '', rowCount: 2, hasConveyor: true, flowDirection: 'TOP_TO_BOTTOM', styleId: null, bulletinId: null });
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      toast.error(err?.response?.data?.message ?? err?.message ?? 'Failed to create layout');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this layout and all its positions?')) return;
    await deleteLayout.mutateAsync(id);
    if (selectedId === id) setSelectedId(null);
  };

  const handleAddPosition = useCallback(() => {
    if (!selectedId) return;
    // Find first empty cell
    const occupied = new Set(positions.map(p => `${p.gridRow}-${p.gridCol}`));
    let targetRow = 0, targetCol = 0;
    // Row-first scan: fill left then right per row (matches sewing line flow)
    // Row 0: (0,0) left, (0,1) right → Row 1: (1,0) left, (1,1) right → …
    const searchRows = gridRows + 1; // allow auto-grow by 1 row
    outer: for (let r = 0; r < searchRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        if (!occupied.has(`${r}-${c}`)) {
          targetRow = r;
          targetCol = c;
          break outer;
        }
      }
    }
    const nextNo = positions.length + 1;
    addPositionMut.mutate({
      layoutId: selectedId,
      data: {
        positionNo: nextNo,
        label: `WS-${nextNo}`,
        positionType: 'WORKSTATION',
        gridRow: targetRow,
        gridCol: targetCol,
        sortOrder: nextNo,
        operationId: null,
        machineTypeId: null,
      },
    });
  }, [selectedId, positions, gridRows, gridCols, addPositionMut]);

  /** Add a station at a specific cell (from clicking empty DroppableCell) */
  const handleAddPositionAt = useCallback(
    (row: number, col: number) => {
      if (!selectedId) return;
      const nextNo = positions.length + 1;
      addPositionMut.mutate({
        layoutId: selectedId,
        data: {
          positionNo: nextNo,
          label: `WS-${nextNo}`,
          positionType: 'WORKSTATION',
          gridRow: row,
          gridCol: col,
          sortOrder: nextNo,
          operationId: null,
          machineTypeId: null,
        },
      });
    },
    [selectedId, positions, addPositionMut]
  );

  const handleReorder = useCallback(
    (positionId: number, toRow: number, toCol: number) => {
      if (!selectedId) return;
      // Optimistic: build full positions array with this one position moved
      const updated = positions.map(p =>
        p.id === positionId ? { id: p.id, gridRow: toRow, gridCol: toCol } : { id: p.id, gridRow: p.gridRow, gridCol: p.gridCol }
      );
      reorderMut.mutate({ layoutId: selectedId, positions: updated });
    },
    [selectedId, positions, reorderMut]
  );

  const handleEditSave = useCallback(
    (posId: number, data: Record<string, unknown>) => {
      updatePositionMut.mutate({ posId, data });
    },
    [updatePositionMut]
  );

  const handleRemovePosition = useCallback(
    (posId: number) => {
      if (!confirm('Remove this station?')) return;
      removePositionMut.mutate(posId);
    },
    [removePositionMut]
  );

  const handleAutoPlace = useCallback(
    (sourceId: number, cols: number, source: 'style' | 'bulletin' = 'style') => {
      if (!selectedId) return;
      const data = source === 'style' ? { styleId: sourceId, cols } : { bulletinId: sourceId, cols };
      autoPlace.mutate({ layoutId: selectedId, data });
    },
    [selectedId, autoPlace]
  );

  // ── Render ──
  return (
    <>
      <PageMeta title="Line Layouts" description="Configure sewing line station layouts" />
      <div className="mx-auto max-w-400 space-y-4 p-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Line Layouts</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Drag &amp; drop workstations to design your factory floor layout
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            {showCreateForm ? 'Cancel' : '+ New Layout'}
          </button>
        </div>

        {/* ── Create Layout Form ── */}
        {showCreateForm && (
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900 space-y-4">
            <h2 className="text-lg font-semibold dark:text-white">Create New Layout</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Name *</label>
                <input
                  className="w-full rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  placeholder="e.g. Line 1 – Basic T-Shirt"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Description</label>
                <input
                  className="w-full rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  placeholder="Optional description"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Rows</label>
                <select
                  className="w-full rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  value={form.rowCount}
                  onChange={e => setForm({ ...form, rowCount: Number(e.target.value) })}
                  aria-label="Row count"
                >
                  {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} rows</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Flow Direction</label>
                <select
                  className="w-full rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  value={form.flowDirection}
                  onChange={e => setForm({ ...form, flowDirection: e.target.value })}
                  aria-label="Flow direction"
                >
                  <option value="TOP_TO_BOTTOM">Top → Bottom</option>
                  <option value="BOTTOM_TO_TOP">Bottom → Top</option>
                  <option value="LEFT_TO_RIGHT">Left → Right</option>
                  <option value="RIGHT_TO_LEFT">Right → Left</option>
                  <option value="U_SHAPE">U-Shape</option>
                </select>
              </div>
            </div>

            {/* Optional style link */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                  Link to Style (optional)
                </label>
                <select
                  className="w-full rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  value={form.styleId ?? ''}
                  onChange={e => {
                    const sid = e.target.value ? Number(e.target.value) : null;
                    setForm({ ...form, styleId: sid, bulletinId: null });
                  }}
                  aria-label="Link style"
                >
                  <option value="">— None —</option>
                  {styles.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.styleNo} — {s.styleName} ({s.totalOperations ?? 0} ops, SAM: {Number(s.totalSam ?? 0).toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={form.hasConveyor}
                    onChange={e => setForm({ ...form, hasConveyor: e.target.checked })}
                    className="rounded"
                  />
                  Has Conveyor Belt
                </label>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={!form.name || createLayout.isPending}
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
              >
                {createLayout.isPending ? 'Creating…' : 'Create Layout'}
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── Main Content: Layout list + drag-drop grid ── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4 xl:grid-cols-5">
          {/* Left panel: Layout list */}
          <div className="space-y-2 lg:col-span-1">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Saved Layouts</h3>
            {isLoading && <div className="p-4 text-sm text-gray-400">Loading…</div>}
            {layouts?.map((l: LineLayout) => (
              <button
                key={l.id}
                onClick={() => setSelectedId(l.id)}
                className={`w-full rounded-xl border p-3 text-left transition ${
                  selectedId === l.id
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                    : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium dark:text-white">{l.name}</span>
                  <span className="text-[10px] text-gray-400">{l.totalStations} stn</span>
                </div>
                <div className="mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">
                  {{
                    TOP_TO_BOTTOM: '↓ Top-Bottom',
                    BOTTOM_TO_TOP: '↑ Bottom-Top',
                    LEFT_TO_RIGHT: '→ L-R',
                    RIGHT_TO_LEFT: '← R-L',
                    U_SHAPE: '↩ U-Shape',
                  }[l.flowDirection as string] ?? l.flowDirection} · {l.rowCount}R
                  {l.style && <span className="ml-1 rounded bg-blue-50 px-1 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">{l.style.styleNo}</span>}
                </div>
                {l.bulletin && (
                  <div className="mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">
                    Bulletin: {l.bulletin.bulletinNo} ({l.bulletin.totalSam} SAM)
                  </div>
                )}
              </button>
            ))}
            {!isLoading && (!layouts || layouts.length === 0) && (
              <div className="rounded-lg border border-dashed border-gray-300 p-4 text-center text-xs text-gray-400 dark:border-gray-700">
                No layouts yet.<br />Create one to get started.
              </div>
            )}
          </div>

          {/* Right panel: Interactive layout editor */}
          <div className="lg:col-span-3 xl:col-span-4">
            {activeLayout ? (
              <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
                {/* Layout header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-semibold dark:text-white">{activeLayout.name}</h2>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      {activeLayout.description && <span>{activeLayout.description}</span>}
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-gray-800">{activeLayout.totalStations} stations</span>
                      {activeLayout.hasConveyor && (
                        <span className="rounded bg-green-50 px-1.5 py-0.5 text-green-700 dark:bg-green-900/30 dark:text-green-400">Conveyor</span>
                      )}
                      {activeLayout.style && (
                        <span className="rounded bg-blue-50 px-1.5 py-0.5 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                          Style: {activeLayout.style.styleNo}
                        </span>
                      )}
                      {activeLayout.bulletin && (
                        <span className="rounded bg-purple-50 px-1.5 py-0.5 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                          Bulletin: {activeLayout.bulletin.bulletinNo} ({activeLayout.bulletin.totalSam} SAM)
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(activeLayout.id)}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    Delete Layout
                  </button>
                </div>

                {/* Toolbar */}
                <LayoutToolbar
                  layoutId={activeLayout.id}
                  rowCount={gridRows}
                  colCount={gridCols}
                  flowDirection={activeLayout.flowDirection}
                  zoom={zoom}
                  onZoomChange={setZoom}
                  onAddPosition={handleAddPosition}
                  onAutoPlace={handleAutoPlace}
                  autoPlacePending={autoPlace.isPending}
                  onUndo={undo}
                  onRedo={redo}
                />

                {/* Drag-drop grid */}
                <LayoutGrid
                  positions={positions}
                  rowCount={gridRows}
                  colCount={gridCols}
                  zoom={zoom}
                  flowDirection={activeLayout.flowDirection}
                  hasConveyor={activeLayout.hasConveyor}
                  onReorder={handleReorder}
                  onEdit={setEditingPos}
                  onRemove={handleRemovePosition}
                  onAddPosition={handleAddPositionAt}
                />

                {/* Station count legend */}
                <div className="flex flex-wrap gap-3 text-[10px] text-gray-500 dark:text-gray-400">
                  {(['WORKSTATION', 'INPUT', 'OUTPUT', 'QC', 'PRESSING', 'HELPER'] as const).map(t => {
                    const count = positions.filter(p => p.positionType === t).length;
                    if (count === 0) return null;
                    return <span key={t} className="rounded bg-gray-50 px-1.5 py-0.5 dark:bg-gray-800">{t}: {count}</span>;
                  })}
                </div>
              </div>
            ) : (
              <div className="flex h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                <svg className="mb-2 h-12 w-12 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
                <span className="text-sm text-gray-400 dark:text-gray-500">Select a layout to open the drag-drop editor</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Station edit modal */}
      <StationEditor
        position={editingPos}
        isOpen={!!editingPos}
        onClose={() => setEditingPos(null)}
        onSave={handleEditSave}
      />

      {/* Inspect panel (slide-in from right) */}
      <InspectPanel
        position={inspectedPosition}
        onEdit={(pos) => setEditingPos(pos)}
        onRemove={handleRemovePosition}
      />
    </>
  );
}
