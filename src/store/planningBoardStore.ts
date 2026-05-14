import { create } from 'zustand';

export type ViewMode = 'SIMPLE' | 'DETAIL' | 'REALTIME';
export type ZoomLevel = 'day' | 'week' | 'month';

interface PlanningBoardState {
  // View controls
  viewMode: ViewMode;
  zoomLevel: ZoomLevel;
  dayColumnWidth: number;

  // Date range
  fromDate: string;
  toDate: string;

  // Active scenario
  activeScenarioId: number | null;

  // Filters
  departmentFilter: string | null;
  lineFilter: number | null;
  brandFilter: string | null;

  // Selection state
  selectedJobIds: number[];
  hoveredJobId: number | null;

  // Panel states
  isUnplannedPanelOpen: boolean;
  isAlertsPanelOpen: boolean;
  isCalendarPanelOpen: boolean;
  isBrandColorsOpen: boolean;

  // Popup states
  jobPopupId: number | null;       // for shipment/detail popup
  progressPopupId: number | null;  // for progress entry popup
  splitDialogId: number | null;    // for split dialog
  mergeDialogOpen: boolean;         // for merge dialog

  // Actions
  setViewMode: (mode: ViewMode) => void;
  setZoomLevel: (level: ZoomLevel) => void;
  setDateRange: (from: string, to: string) => void;
  setActiveScenario: (id: number | null) => void;
  setDepartmentFilter: (dept: string | null) => void;
  setLineFilter: (lineId: number | null) => void;
  setBrandFilter: (brand: string | null) => void;
  toggleJobSelection: (jobId: number) => void;
  clearSelection: () => void;
  setHoveredJob: (id: number | null) => void;
  toggleUnplannedPanel: () => void;
  toggleAlertsPanel: () => void;
  toggleCalendarPanel: () => void;
  toggleBrandColors: () => void;
  openJobPopup: (id: number) => void;
  closeJobPopup: () => void;
  openProgressPopup: (id: number) => void;
  closeProgressPopup: () => void;
  openSplitDialog: (id: number) => void;
  closeSplitDialog: () => void;
  openMergeDialog: () => void;
  closeMergeDialog: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

// Default: show current week + 4 weeks
const today = new Date();
const mondayOffset = today.getDay() === 0 ? -6 : 1 - today.getDay();
const monday = new Date(today);
monday.setDate(today.getDate() + mondayOffset);
const defaultFrom = monday.toISOString().slice(0, 10);
const fourWeeksOut = new Date(monday);
fourWeeksOut.setDate(monday.getDate() + 27);
const defaultTo = fourWeeksOut.toISOString().slice(0, 10);

const ZOOM_WIDTHS: Record<ZoomLevel, number> = {
  day: 40,
  week: 20,
  month: 8,
};

export const usePlanningBoardStore = create<PlanningBoardState>((set, get) => ({
  viewMode: 'SIMPLE',
  zoomLevel: 'day',
  dayColumnWidth: ZOOM_WIDTHS.day,
  fromDate: defaultFrom,
  toDate: defaultTo,
  activeScenarioId: null,
  departmentFilter: null,
  lineFilter: null,
  brandFilter: null,
  selectedJobIds: [],
  hoveredJobId: null,
  isUnplannedPanelOpen: true,
  isAlertsPanelOpen: false,
  isCalendarPanelOpen: false,
  isBrandColorsOpen: false,
  jobPopupId: null,
  progressPopupId: null,
  splitDialogId: null,
  mergeDialogOpen: false,

  setViewMode: (mode) => set({ viewMode: mode }),
  setZoomLevel: (level) => set({ zoomLevel: level, dayColumnWidth: ZOOM_WIDTHS[level] }),
  setDateRange: (from, to) => set({ fromDate: from, toDate: to }),
  setActiveScenario: (id) => set({ activeScenarioId: id }),
  setDepartmentFilter: (dept) => set({ departmentFilter: dept }),
  setLineFilter: (lineId) => set({ lineFilter: lineId }),
  setBrandFilter: (brand) => set({ brandFilter: brand }),

  toggleJobSelection: (jobId) =>
    set((s) => ({
      selectedJobIds: s.selectedJobIds.includes(jobId)
        ? s.selectedJobIds.filter((id) => id !== jobId)
        : [...s.selectedJobIds, jobId],
    })),
  clearSelection: () => set({ selectedJobIds: [] }),
  setHoveredJob: (id) => set({ hoveredJobId: id }),

  toggleUnplannedPanel: () => set((s) => ({ isUnplannedPanelOpen: !s.isUnplannedPanelOpen })),
  toggleAlertsPanel: () => set((s) => ({ isAlertsPanelOpen: !s.isAlertsPanelOpen })),
  toggleCalendarPanel: () => set((s) => ({ isCalendarPanelOpen: !s.isCalendarPanelOpen })),
  toggleBrandColors: () => set((s) => ({ isBrandColorsOpen: !s.isBrandColorsOpen })),

  openJobPopup: (id) => set({ jobPopupId: id }),
  closeJobPopup: () => set({ jobPopupId: null }),
  openProgressPopup: (id) => set({ progressPopupId: id }),
  closeProgressPopup: () => set({ progressPopupId: null }),
  openSplitDialog: (id) => set({ splitDialogId: id }),
  closeSplitDialog: () => set({ splitDialogId: null }),
  openMergeDialog: () => set({ mergeDialogOpen: true }),
  closeMergeDialog: () => set({ mergeDialogOpen: false }),

  zoomIn: () => {
    const { zoomLevel } = get();
    if (zoomLevel === 'month') set({ zoomLevel: 'week', dayColumnWidth: ZOOM_WIDTHS.week });
    else if (zoomLevel === 'week') set({ zoomLevel: 'day', dayColumnWidth: ZOOM_WIDTHS.day });
  },
  zoomOut: () => {
    const { zoomLevel } = get();
    if (zoomLevel === 'day') set({ zoomLevel: 'week', dayColumnWidth: ZOOM_WIDTHS.week });
    else if (zoomLevel === 'week') set({ zoomLevel: 'month', dayColumnWidth: ZOOM_WIDTHS.month });
  },
}));
