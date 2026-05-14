import { usePlanningBoardStore } from '@/store/planningBoardStore';
import type { PlanningAlert } from '@/api/planningBoard';

interface Props {
  alerts: PlanningAlert[];
}

const SEVERITY_STYLES: Record<string, string> = {
  error: 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400',
  warning: 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400',
  info: 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400',
};

const SEVERITY_ICONS: Record<string, string> = {
  error: '🔴',
  warning: '🟡',
  info: '🔵',
};

const TYPE_LABELS: Record<string, string> = {
  OVERLAP: 'Overlap',
  DELIVERY_RISK: 'Delivery Risk',
  OVER_ALLOCATION: 'Over-Allocation',
  CAPACITY_OVERFLOW: 'Capacity Overflow',
  NO_SAM: 'Missing SAM',
  LOW_EFFICIENCY: 'Low Efficiency',
};

export default function AlertsPanel({ alerts }: Props) {
  const { isAlertsPanelOpen, toggleAlertsPanel, openJobPopup } = usePlanningBoardStore();

  if (!isAlertsPanelOpen) return null;

  const errorCount = alerts.filter((a) => a.severity === 'error').length;
  const warningCount = alerts.filter((a) => a.severity === 'warning').length;

  return (
    <div className="w-[280px] shrink-0 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h3 className="text-xs font-semibold text-gray-800 dark:text-gray-200">
            Alerts ({alerts.length})
          </h3>
          <div className="flex gap-2 mt-0.5">
            {errorCount > 0 && <span className="text-[10px] text-red-600">{errorCount} errors</span>}
            {warningCount > 0 && <span className="text-[10px] text-amber-600">{warningCount} warnings</span>}
          </div>
        </div>
        <button onClick={toggleAlertsPanel} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1.5">
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-xs text-gray-400">
            ✅ No alerts — board looks clean!
          </div>
        ) : (
          alerts.map((alert, i) => (
            <div
              key={i}
              className={`border rounded-lg px-2.5 py-2 cursor-pointer hover:shadow-sm transition-shadow ${SEVERITY_STYLES[alert.severity]}`}
              onClick={() => alert.jobId && openJobPopup(alert.jobId)}
            >
              <div className="flex items-start gap-1.5">
                <span className="text-xs">{SEVERITY_ICONS[alert.severity]}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-semibold uppercase opacity-70">
                    {TYPE_LABELS[alert.type] ?? alert.type}
                  </div>
                  <div className="text-xs mt-0.5">{alert.message}</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
