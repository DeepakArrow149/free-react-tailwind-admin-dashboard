import { create } from 'zustand';
import type { LayoutPosition } from '@/api/lineBalancing';

interface HistoryEntry {
  positions: LayoutPosition[];
  label: string;
}

interface LayoutEditorState {
  // ── Selection ──
  selectedPositionId: number | null;
  hoveredPositionId: number | null;

  // ── Inspect Panel ──
  inspectOpen: boolean;

  // ── View ──
  showFlowLines: boolean;
  showGridHeaders: boolean;
  snapToGrid: boolean;
  zoom: number;

  // ── Undo/Redo ──
  history: HistoryEntry[];
  historyIndex: number;

  // ── Actions ──
  selectPosition: (id: number | null) => void;
  hoverPosition: (id: number | null) => void;
  toggleInspect: () => void;
  openInspect: () => void;
  closeInspect: () => void;
  setShowFlowLines: (v: boolean) => void;
  setShowGridHeaders: (v: boolean) => void;
  setSnapToGrid: (v: boolean) => void;
  setZoom: (z: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;

  // ── History ──
  pushHistory: (positions: LayoutPosition[], label: string) => void;
  undo: () => HistoryEntry | null;
  redo: () => HistoryEntry | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearHistory: () => void;
}

export const useLayoutEditorStore = create<LayoutEditorState>((set, get) => ({
  // ── Initial state ──
  selectedPositionId: null,
  hoveredPositionId: null,
  inspectOpen: false,
  showFlowLines: true,
  showGridHeaders: true,
  snapToGrid: true,
  zoom: 1,
  history: [],
  historyIndex: -1,

  // ── Actions ──
  selectPosition: (id) => {
    set({ selectedPositionId: id });
    if (id !== null) set({ inspectOpen: true });
  },
  hoverPosition: (id) => set({ hoveredPositionId: id }),
  toggleInspect: () => set((s) => ({ inspectOpen: !s.inspectOpen })),
  openInspect: () => set({ inspectOpen: true }),
  closeInspect: () => set({ inspectOpen: false, selectedPositionId: null }),
  setShowFlowLines: (v) => set({ showFlowLines: v }),
  setShowGridHeaders: (v) => set({ showGridHeaders: v }),
  setSnapToGrid: (v) => set({ snapToGrid: v }),
  setZoom: (z) => set({ zoom: Math.max(0.25, Math.min(3, z)) }),
  zoomIn: () => set((s) => ({ zoom: Math.min(3, s.zoom + 0.1) })),
  zoomOut: () => set((s) => ({ zoom: Math.max(0.25, s.zoom - 0.1) })),
  resetZoom: () => set({ zoom: 1 }),

  // ── History ──
  pushHistory: (positions, label) => {
    const { history, historyIndex } = get();
    // Trim future entries
    const trimmed = history.slice(0, historyIndex + 1);
    const entry: HistoryEntry = { positions: JSON.parse(JSON.stringify(positions)), label };
    trimmed.push(entry);
    // Keep max 50 entries
    if (trimmed.length > 50) trimmed.shift();
    set({ history: trimmed, historyIndex: trimmed.length - 1 });
  },
  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return null;
    const newIdx = historyIndex - 1;
    set({ historyIndex: newIdx });
    return history[newIdx];
  },
  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return null;
    const newIdx = historyIndex + 1;
    set({ historyIndex: newIdx });
    return history[newIdx];
  },
  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,
  clearHistory: () => set({ history: [], historyIndex: -1 }),
}));
