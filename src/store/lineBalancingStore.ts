import { create } from 'zustand';

export type BalancingViewMode = 'FACTORY_FLOOR' | 'YAMAZUMI' | 'TABLE';
export type LinePlanningTab = 'balancing' | 'bottlenecks' | 'simulation';

interface LineBalancingState {
  // Selection
  selectedLineId: number | null;
  selectedBulletinId: number | null;
  activeBalancingId: number | null;

  // View
  viewMode: BalancingViewMode;
  activeTab: LinePlanningTab;

  // Yamazumi chart settings
  showIdleTime: boolean;
  showTaktLine: boolean;

  // Drag state
  draggedOpId: number | null;
  dropTargetStationId: number | null;

  // Panels
  isOperationsPanelOpen: boolean;
  isMetricsPanelOpen: boolean;
  isBottleneckPanelOpen: boolean;

  // Bottleneck & simulation results (ephemeral)
  bottleneckResults: unknown | null;
  simulationResults: unknown | null;

  // Actions
  setSelectedLine: (lineId: number | null) => void;
  setSelectedBulletin: (bulletinId: number | null) => void;
  setActiveBalancing: (id: number | null) => void;
  setViewMode: (mode: BalancingViewMode) => void;
  setActiveTab: (tab: LinePlanningTab) => void;
  toggleShowIdleTime: () => void;
  toggleShowTaktLine: () => void;
  setDraggedOp: (opId: number | null) => void;
  setDropTargetStation: (stationId: number | null) => void;
  toggleOperationsPanel: () => void;
  toggleMetricsPanel: () => void;
  toggleBottleneckPanel: () => void;
  setBottleneckResults: (r: unknown | null) => void;
  setSimulationResults: (r: unknown | null) => void;
  reset: () => void;
}

const initialState = {
  selectedLineId: null,
  selectedBulletinId: null,
  activeBalancingId: null,
  viewMode: 'FACTORY_FLOOR' as const,
  activeTab: 'balancing' as const,
  showIdleTime: true,
  showTaktLine: true,
  draggedOpId: null,
  dropTargetStationId: null,
  isOperationsPanelOpen: true,
  isMetricsPanelOpen: true,
  isBottleneckPanelOpen: false,
  bottleneckResults: null,
  simulationResults: null,
};

export const useLineBalancingStore = create<LineBalancingState>((set) => ({
  ...initialState,

  setSelectedLine: (lineId) => set({ selectedLineId: lineId }),
  setSelectedBulletin: (bulletinId) => set({ selectedBulletinId: bulletinId }),
  setActiveBalancing: (id) => set({ activeBalancingId: id }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  toggleShowIdleTime: () => set((s) => ({ showIdleTime: !s.showIdleTime })),
  toggleShowTaktLine: () => set((s) => ({ showTaktLine: !s.showTaktLine })),
  setDraggedOp: (opId) => set({ draggedOpId: opId }),
  setDropTargetStation: (stationId) => set({ dropTargetStationId: stationId }),
  toggleOperationsPanel: () => set((s) => ({ isOperationsPanelOpen: !s.isOperationsPanelOpen })),
  toggleMetricsPanel: () => set((s) => ({ isMetricsPanelOpen: !s.isMetricsPanelOpen })),
  toggleBottleneckPanel: () => set((s) => ({ isBottleneckPanelOpen: !s.isBottleneckPanelOpen })),
  setBottleneckResults: (r) => set({ bottleneckResults: r }),
  setSimulationResults: (r) => set({ simulationResults: r }),
  reset: () => set(initialState),
}));
