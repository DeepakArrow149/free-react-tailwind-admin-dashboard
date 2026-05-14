import { useJobAlerts, useJobQualitySummary } from '@/hooks/usePlanningBoard';
import type { AlertItem, QualityDefect } from '@/api/planningBoard';

interface Props {
  jobId: number;
  allocatedQty: number;
  completedQty: number;
  plannedEfficiency: number;
  actualEfficiency: number;
}

export default function AnalyticsTab({ jobId, allocatedQty, completedQty, plannedEfficiency, actualEfficiency }: Props) {
  const { data: alertsData, isLoading: alertsLoading } = useJobAlerts(jobId);
  const { data: qualityData, isLoading: qualityLoading } = useJobQualitySummary(jobId);

  const completionPct = allocatedQty > 0 ? Math.round((completedQty / allocatedQty) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* ── Efficiency Section ── */}
      <section>
        <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          Efficiency Overview
        </h4>
        <div className="grid grid-cols-4 gap-2">
          <MiniCard label="Completion" value={`${completionPct}%`} color={completionPct >= 90 ? 'green' : completionPct >= 50 ? 'blue' : 'amber'} />
          <MiniCard label="Planned Eff." value={`${plannedEfficiency}%`} />
          <MiniCard label="Actual Eff." value={`${actualEfficiency}%`} color={actualEfficiency >= plannedEfficiency ? 'green' : 'red'} />
          <MiniCard
            label="Variance"
            value={`${actualEfficiency >= plannedEfficiency ? '+' : ''}${Math.round((actualEfficiency - plannedEfficiency) * 100) / 100}%`}
            color={actualEfficiency >= plannedEfficiency ? 'green' : 'red'}
          />
        </div>
        <div className="mt-2">
          <div className="flex justify-between text-[10px] text-gray-500 mb-0.5">
            <span>Output Progress</span>
            <span>{completedQty.toLocaleString()} / {allocatedQty.toLocaleString()} pcs</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${completionPct >= 100 ? 'bg-green-500' : completionPct >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`}
              style={{ width: `${Math.min(100, completionPct)}%` }}
            />
          </div>
        </div>
      </section>

      {/* ── Quality Section ── */}
      <section>
        <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-purple-500" />
          Quality Summary
        </h4>
        {qualityLoading ? (
          <div className="text-xs text-gray-400 py-3 text-center">Loading quality data...</div>
        ) : qualityData ? (
          <div className="space-y-2">
            <div className="grid grid-cols-4 gap-2">
              <MiniCard label="DHU %" value={`${qualityData.dhuPct}%`} color={qualityData.dhuPct > 5 ? 'red' : qualityData.dhuPct > 3 ? 'amber' : 'green'} />
              <MiniCard label="Checked" value={qualityData.totalChecked.toLocaleString()} />
              <MiniCard label="Defects" value={qualityData.totalDefects.toLocaleString()} color={qualityData.totalDefects > 0 ? 'amber' : 'green'} />
              <MiniCard label="IE Rework" value={qualityData.ieReworkCount.toLocaleString()} color={qualityData.ieReworkCount > 0 ? 'amber' : 'green'} />
            </div>

            {/* Top Defects */}
            {qualityData.topDefects.length > 0 && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-2">
                <h5 className="text-[10px] font-semibold text-gray-500 uppercase mb-1.5">Top Defects</h5>
                <div className="space-y-1">
                  {qualityData.topDefects.slice(0, 5).map((d: QualityDefect, i: number) => {
                    const maxCount = qualityData.topDefects[0].count;
                    const pct = maxCount > 0 ? Math.round((d.count / maxCount) * 100) : 0;
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-600 dark:text-gray-400 w-24 truncate">{d.name}</span>
                        <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full bg-purple-400" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] text-gray-500 w-8 text-right">{d.count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Defect Categories */}
            {Object.keys(qualityData.defectsByCategory).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(qualityData.defectsByCategory).map(([cat, count]) => (
                  <span key={cat} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px] text-gray-600 dark:text-gray-400">
                    {cat}: <strong>{count as number}</strong>
                  </span>
                ))}
              </div>
            )}

            {qualityData.totalChecked === 0 && qualityData.ieDefectCount === 0 && (
              <div className="text-xs text-gray-400 py-2 text-center">No quality data recorded yet</div>
            )}
          </div>
        ) : (
          <div className="text-xs text-gray-400 py-2 text-center">No quality data</div>
        )}
      </section>

      {/* ── Alerts Section ── */}
      <section>
        <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          Alerts
          {alertsData && alertsData.activeCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full text-[10px] font-medium">
              {alertsData.activeCount} active
            </span>
          )}
        </h4>
        {alertsLoading ? (
          <div className="text-xs text-gray-400 py-3 text-center">Loading alerts...</div>
        ) : alertsData && alertsData.alerts.length > 0 ? (
          <div className="space-y-2">
            {/* Summary badges */}
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(alertsData.byType).map(([type, cnt]) => (
                <span key={type} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px] text-gray-600 dark:text-gray-400">
                  {type.replace(/_/g, ' ')}: <strong>{cnt as number}</strong>
                </span>
              ))}
            </div>

            {/* Alerts list */}
            <div className="max-h-48 overflow-y-auto space-y-1.5">
              {alertsData.alerts.map((alert: AlertItem) => (
                <div
                  key={alert.id}
                  className={`flex items-start gap-2 p-2 rounded-lg border text-xs ${
                    alert.status === 'ACTIVE'
                      ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                      : alert.status === 'ACKNOWLEDGED'
                      ? 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20'
                      : 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                  }`}
                >
                  <SeverityDot severity={alert.severity} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-gray-800 dark:text-gray-200 text-[10px]">
                        {alert.alertType.replace(/_/g, ' ')}
                      </span>
                      <span className={`px-1 py-0.5 rounded text-[9px] font-medium ${
                        alert.status === 'ACTIVE' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' :
                        alert.status === 'ACKNOWLEDGED' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' :
                        'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                      }`}>
                        {alert.status}
                      </span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-[10px] mt-0.5 truncate">{alert.message}</p>
                    {alert.threshold != null && alert.currentValue != null && (
                      <span className="text-[9px] text-gray-400">
                        Value: {alert.currentValue} / Threshold: {alert.threshold}
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] text-gray-400 whitespace-nowrap">
                    {new Date(alert.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-xs text-gray-400 py-3 text-center">No alerts for this job period</div>
        )}
      </section>
    </div>
  );
}

function MiniCard({ label, value, color }: { label: string; value: string; color?: string }) {
  const border = color === 'green' ? 'border-green-300 dark:border-green-700'
    : color === 'red' ? 'border-red-300 dark:border-red-700'
    : color === 'amber' ? 'border-amber-300 dark:border-amber-700'
    : color === 'blue' ? 'border-blue-300 dark:border-blue-700'
    : 'border-gray-200 dark:border-gray-700';
  return (
    <div className={`border ${border} rounded-lg p-1.5 text-center`}>
      <div className="text-[9px] text-gray-500 dark:text-gray-400">{label}</div>
      <div className="text-xs font-bold text-gray-800 dark:text-gray-200">{value}</div>
    </div>
  );
}

function SeverityDot({ severity }: { severity: string }) {
  const color = severity === 'CRITICAL' ? 'bg-red-500' : severity === 'WARNING' ? 'bg-amber-500' : severity === 'HIGH' ? 'bg-orange-500' : 'bg-blue-400';
  return <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${color}`} />;
}
