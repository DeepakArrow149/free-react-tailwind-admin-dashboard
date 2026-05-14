/**
 * LayoutToolbar — Controls above the drag-drop grid:
 *  • Add Position button
 *  • Auto-Place from Style (auto-generates bulletin) or from existing Bulletin
 *  • Grid size controls (rows/cols)
 *  • Flow direction toggle
 *  • Zoom slider
 *  • Toggle flow lines, grid headers, snap-to-grid
 *  • Undo/Redo buttons
 */
import React, { useState, useEffect } from 'react';
import { masterApi, type StyleMaster } from '@/api/master';
import { useBulletinsForLayout } from '@/hooks/useLineBalancing';
import { useLayoutEditorStore } from '@/store/layoutEditorStore';

type AutoPlaceSource = 'style' | 'bulletin';

interface Props {
  /** Current layout id */
  layoutId: number;
  /** Current row / col counts */
  rowCount: number;
  colCount: number;
  flowDirection: string;
  /** Grid zoom 50-150% */
  zoom: number;
  onZoomChange: (z: number) => void;
  onAddPosition: () => void;
  onAutoPlace: (sourceId: number, cols: number, source: AutoPlaceSource) => void;
  autoPlacePending: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

const LayoutToolbar: React.FC<Props> = ({
  rowCount,
  colCount,
  flowDirection,
  zoom,
  onZoomChange,
  onAddPosition,
  onAutoPlace,
  autoPlacePending,
  onUndo,
  onRedo,
}) => {
  const showFlowLines = useLayoutEditorStore((s) => s.showFlowLines);
  const showGridHeaders = useLayoutEditorStore((s) => s.showGridHeaders);
  const setShowFlowLines = useLayoutEditorStore((s) => s.setShowFlowLines);
  const setShowGridHeaders = useLayoutEditorStore((s) => s.setShowGridHeaders);
  const canUndo = useLayoutEditorStore((s) => s.canUndo());
  const canRedo = useLayoutEditorStore((s) => s.canRedo());
  const [styles, setStyles] = useState<StyleMaster[]>([]);
  const [showAutoPlace, setShowAutoPlace] = useState(false);
  const [apSource, setApSource] = useState<AutoPlaceSource>('style');
  const [apStyleId, setApStyleId] = useState<number | null>(null);
  const [apBulletinId, setApBulletinId] = useState<number | null>(null);
  const [apCols, setApCols] = useState(2);

  // Load styles with operations
  useEffect(() => {
    masterApi.listStyles({ limit: 500 }).then(res => {
      const list = res.data?.data ?? [];
      setStyles(list.filter((s: StyleMaster) => (s.totalOperations ?? 0) > 0));
    }).catch(() => {});
  }, []);

  // Load bulletins
  const { data: bulletins } = useBulletinsForLayout();

  const handleAutoPlace = () => {
    if (apSource === 'style' && apStyleId) {
      onAutoPlace(apStyleId, apCols, 'style');
      setShowAutoPlace(false);
    } else if (apSource === 'bulletin' && apBulletinId) {
      onAutoPlace(apBulletinId, apCols, 'bulletin');
      setShowAutoPlace(false);
    }
  };

  const canGenerate = apSource === 'style' ? !!apStyleId : !!apBulletinId;
  const selectedStyle = styles.find(s => s.id === apStyleId);
  const selectedBulletin = bulletins?.find(b => b.id === apBulletinId);

  const FLOW_LABEL: Record<string, string> = {
    TOP_TO_BOTTOM: '↓ T-B',
    BOTTOM_TO_TOP: '↑ B-T',
    LEFT_TO_RIGHT: '→ L-R',
    RIGHT_TO_LEFT: '← R-L',
    U_SHAPE: '↩ U',
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {/* Add station */}
        <button
          onClick={onAddPosition}
          className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600"
        >
          + Add Station
        </button>

        {/* Auto-place toggle */}
        <button
          onClick={() => setShowAutoPlace(!showAutoPlace)}
          className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600"
        >
          {showAutoPlace ? 'Cancel Auto-Place' : '⚡ Auto-Place Operations'}
        </button>

        {/* Separator */}
        <div className="h-5 w-px bg-gray-300 dark:bg-gray-600" />

        {/* Info badges */}
        <span className="rounded bg-gray-100 px-2 py-1 text-[10px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
          {colCount} cols × {rowCount} rows
        </span>
        <span className="rounded bg-gray-100 px-2 py-1 text-[10px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
          Flow: {FLOW_LABEL[flowDirection] ?? flowDirection}
        </span>

        {/* Separator */}
        <div className="h-5 w-px bg-gray-300 dark:bg-gray-600" />

        {/* View toggles */}
        <button
          onClick={() => setShowFlowLines(!showFlowLines)}
          className={`rounded px-2 py-1 text-[10px] font-medium transition-colors ${showFlowLines ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}
          title="Toggle flow lines"
        >
          Flow Lines
        </button>
        <button
          onClick={() => setShowGridHeaders(!showGridHeaders)}
          className={`rounded px-2 py-1 text-[10px] font-medium transition-colors ${showGridHeaders ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}
          title="Toggle grid headers"
        >
          Headers
        </button>

        {/* Undo/Redo */}
        {onUndo && (
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="rounded px-2 py-1 text-[10px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30"
            title="Undo"
          >
            ↩ Undo
          </button>
        )}
        {onRedo && (
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="rounded px-2 py-1 text-[10px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30"
            title="Redo"
          >
            Redo ↪
          </button>
        )}

        {/* Zoom */}
        <div className="ml-auto flex items-center gap-1.5">
          <label htmlFor="layout-zoom" className="text-[10px] text-gray-500 dark:text-gray-400">Zoom</label>
          <input
            id="layout-zoom"
            type="range"
            min={50}
            max={150}
            step={10}
            value={zoom}
            onChange={(e) => onZoomChange(Number(e.target.value))}
            className="h-1 w-20 cursor-pointer accent-brand-500"
          />
          <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">{zoom}%</span>
        </div>
      </div>

      {/* Auto-Place panel */}
      {showAutoPlace && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950 space-y-3">
          {/* Source toggle */}
          <div className="flex items-center gap-4">
            <p className="text-xs font-medium text-amber-800 dark:text-amber-300">Source:</p>
            <label className="flex items-center gap-1.5 text-xs text-amber-900 dark:text-amber-200 cursor-pointer">
              <input
                type="radio"
                name="ap-source"
                value="style"
                checked={apSource === 'style'}
                onChange={() => setApSource('style')}
                className="accent-amber-600"
                aria-label="Auto-place from style"
              />
              From Style
              <span className="text-[9px] text-amber-600 dark:text-amber-400">(auto-generates bulletin)</span>
            </label>
            <label className="flex items-center gap-1.5 text-xs text-amber-900 dark:text-amber-200 cursor-pointer">
              <input
                type="radio"
                name="ap-source"
                value="bulletin"
                checked={apSource === 'bulletin'}
                onChange={() => setApSource('bulletin')}
                className="accent-amber-600"
                aria-label="Auto-place from bulletin"
              />
              From Bulletin
              <span className="text-[9px] text-amber-600 dark:text-amber-400">(existing approved)</span>
            </label>
          </div>

          <div className="flex items-end gap-3">
            {/* Source selector */}
            <div className="flex-1">
              {apSource === 'style' ? (
                <>
                  <label className="mb-1 block text-[10px] font-medium text-gray-600 dark:text-gray-400">Style</label>
                  <select
                    className="w-full rounded-lg border px-2 py-1.5 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    value={apStyleId ?? ''}
                    onChange={(e) => setApStyleId(e.target.value ? Number(e.target.value) : null)}
                    aria-label="Select style"
                  >
                    <option value="">— Select Style —</option>
                    {styles.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.styleNo} — {s.styleName} ({s.totalOperations ?? 0} ops, SAM: {Number(s.totalSam ?? 0).toFixed(2)})
                      </option>
                    ))}
                  </select>
                </>
              ) : (
                <>
                  <label className="mb-1 block text-[10px] font-medium text-gray-600 dark:text-gray-400">Bulletin</label>
                  <select
                    className="w-full rounded-lg border px-2 py-1.5 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    value={apBulletinId ?? ''}
                    onChange={(e) => setApBulletinId(e.target.value ? Number(e.target.value) : null)}
                    aria-label="Select bulletin"
                  >
                    <option value="">— Select Bulletin —</option>
                    {bulletins?.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.bulletinNo} — {b.style?.styleName ?? 'N/A'} ({b._count?.items ?? 0} ops, SAM: {Number(b.totalSam ?? 0).toFixed(2)}) [{b.status}]
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>

            {/* Columns */}
            <div>
              <label className="mb-1 block text-[10px] font-medium text-gray-600 dark:text-gray-400">Columns</label>
              <input
                type="number"
                min={2}
                max={20}
                value={apCols}
                onChange={(e) => setApCols(Number(e.target.value) || 2)}
                className="w-16 rounded-lg border px-2 py-1.5 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                aria-label="Number of columns"
              />
            </div>

            {/* Generate button */}
            <button
              onClick={handleAutoPlace}
              disabled={autoPlacePending || !canGenerate}
              className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600 disabled:opacity-50"
            >
              {autoPlacePending ? 'Placing…' : 'Generate'}
            </button>
          </div>

          {/* Selection info */}
          {apSource === 'style' && selectedStyle && (
            <div className="rounded-md bg-white/60 p-2 text-xs text-amber-900 dark:bg-gray-800/60 dark:text-amber-200">
              <strong>{selectedStyle.styleNo}</strong> — {selectedStyle.styleName} · {selectedStyle.totalOperations ?? 0} operations · Total SAM: {Number(selectedStyle.totalSam ?? 0).toFixed(3)}
              <div className="mt-0.5 text-[9px] text-amber-700 dark:text-amber-400">
                A DRAFT Operation Bulletin will be auto-generated and linked to this layout.
              </div>
            </div>
          )}
          {apSource === 'bulletin' && selectedBulletin && (
            <div className="rounded-md bg-white/60 p-2 text-xs text-amber-900 dark:bg-gray-800/60 dark:text-amber-200">
              <strong>{selectedBulletin.bulletinNo}</strong> — {selectedBulletin.style?.styleName ?? 'N/A'} · {selectedBulletin._count?.items ?? 0} operations · Total SAM: {Number(selectedBulletin.totalSam ?? 0).toFixed(3)} · Status: {selectedBulletin.status}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LayoutToolbar;
