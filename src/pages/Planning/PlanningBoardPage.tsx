import { useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { usePlanningBoardStore } from '@/store/planningBoardStore';
import { useBoardData, useScenarios } from '@/hooks/usePlanningBoard';
import BoardToolbar from './board/BoardToolbar';
import TimelineGrid from './board/TimelineGrid';
import UnplannedOrdersPanel from './board/UnplannedOrdersPanel';
import AlertsPanel from './board/AlertsPanel';
import JobDetailPopup from './board/JobDetailPopup';
import ProgressEntryPopup from './board/ProgressEntryPopup';
import SplitDialog from './board/SplitDialog';
import MergeDialog from './board/MergeDialog';
import CalendarPanel from './board/CalendarPanel';
import BrandColorSettings from './board/BrandColorSettings';

/**
 * PlanningBoardPage — the main APS (Advanced Planning & Scheduling) page.
 * Composes: Toolbar → Timeline Grid ← Side Panels, plus overlay popups.
 * Wrapped in DndProvider for drag-and-drop from Unplanned panel → grid.
 */
export default function PlanningBoardPage() {
  const {
    activeScenarioId, setActiveScenario,
    fromDate, toDate,
    isUnplannedPanelOpen, isAlertsPanelOpen, isCalendarPanelOpen,
    isBrandColorsOpen, toggleBrandColors,
    departmentFilter,
  } = usePlanningBoardStore();

  /* ── Auto-select first scenario ── */
  const { data: scenarios } = useScenarios();
  useEffect(() => {
    if (!activeScenarioId && scenarios && scenarios.length > 0) {
      setActiveScenario(scenarios[0].id);
    }
  }, [scenarios, activeScenarioId, setActiveScenario]);

  /* ── Board data fetch (30 s auto-refresh) ── */
  const { data: boardData, isLoading, isError, error } = useBoardData(
    activeScenarioId,
    fromDate,
    toDate,
  );

  /* ── Filter lines by department ── */
  const filteredBoardData = boardData
    ? {
        ...boardData,
        lines: departmentFilter
          ? boardData.lines.filter((l) => l.department === departmentFilter)
          : boardData.lines,
      }
    : null;

  /* ── Render ── */
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex flex-col h-[calc(100vh-64px)] bg-gray-50 dark:bg-gray-900">
        {/* Top toolbar */}
        <BoardToolbar />

        {/* Content area: side panel(s) + grid */}
        <div className="flex flex-1 overflow-hidden relative">
          {/* ── Timeline Grid (stretches to fill) ── */}
          <div className="flex-1 overflow-auto">
            {isLoading && (
              <div className="flex items-center justify-center h-full">
                <div className="text-sm text-gray-500 dark:text-gray-400 flex flex-col items-center gap-3">
                  <svg className="animate-spin h-8 w-8 text-blue-500" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Loading planning board…
                </div>
              </div>
            )}

            {isError && (
              <div className="flex items-center justify-center h-full">
                <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-6 max-w-md text-center">
                  <p className="text-red-600 dark:text-red-400 font-medium mb-1">Failed to load board data</p>
                  <p className="text-sm text-red-500 dark:text-red-400/80">
                    {(error as Error)?.message || 'An unexpected error occurred.'}
                  </p>
                </div>
              </div>
            )}

            {!isLoading && !isError && !activeScenarioId && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-3 p-8">
                  <div className="text-4xl">📋</div>
                  <p className="text-gray-600 dark:text-gray-400 font-medium">No Scenario Selected</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    Create a planning scenario using the toolbar above to get started.
                  </p>
                </div>
              </div>
            )}

            {!isLoading && !isError && activeScenarioId && !filteredBoardData && (
              <div className="flex items-center justify-center h-full">
                <div className="text-sm text-gray-500 dark:text-gray-400 flex flex-col items-center gap-3">
                  <svg className="animate-spin h-6 w-6 text-blue-500" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Loading board data…
                </div>
              </div>
            )}

            {!isLoading && !isError && activeScenarioId && filteredBoardData && filteredBoardData.lines.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-3 p-8">
                  <div className="text-4xl">🏭</div>
                  <p className="text-gray-600 dark:text-gray-400 font-medium">No Production Lines</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    {departmentFilter
                      ? `No lines found in department "${departmentFilter}". Try clearing the filter.`
                      : 'Set up production lines in Capacity Planning before using the board.'}
                  </p>
                </div>
              </div>
            )}

            {!isLoading && !isError && activeScenarioId && filteredBoardData && filteredBoardData.lines.length > 0 && (
              <TimelineGrid boardData={filteredBoardData} />
            )}
          </div>

          {/* ── Right-side panels (slide in/out) ── */}
          {isUnplannedPanelOpen && (
            <aside className="w-70 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0 overflow-y-auto">
              <UnplannedOrdersPanel />
            </aside>
          )}

          {isAlertsPanelOpen && (
            <aside className="w-70 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0 overflow-y-auto">
              <AlertsPanel alerts={filteredBoardData?.alerts ?? []} />
            </aside>
          )}

          {isCalendarPanelOpen && (
            <aside className="w-70 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0 overflow-y-auto">
              <CalendarPanel />
            </aside>
          )}
        </div>

        {/* ── Status bar ── */}
        <div className="flex items-center justify-between h-7 px-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 text-[11px] text-gray-500 dark:text-gray-400 shrink-0">
          <div className="flex items-center gap-4">
            <span>{filteredBoardData?.lines.length ?? 0} lines</span>
            <span>{filteredBoardData?.lines.reduce((n, l) => n + l.jobs.length, 0) ?? 0} jobs</span>
            {filteredBoardData && filteredBoardData.alerts.length > 0 && (
              <span className="text-amber-600 dark:text-amber-400">
                {filteredBoardData.alerts.filter(a => a.severity === 'error').length} errors ·{' '}
                {filteredBoardData.alerts.filter(a => a.severity === 'warning').length} warnings
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span>Scenario: {boardData?.scenario?.name ?? '—'}</span>
            <span>
              {fromDate} → {toDate}
            </span>
          </div>
        </div>

        {/* ── Overlay popups (rendered once, visibility controlled via store) ── */}
        <JobDetailPopup />
        <ProgressEntryPopup />
        <SplitDialog />
        <MergeDialog />
        {isBrandColorsOpen && <BrandColorSettings onClose={toggleBrandColors} />}
      </div>
    </DndProvider>
  );
}
