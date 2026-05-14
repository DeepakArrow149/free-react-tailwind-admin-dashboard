import { usePlanningBoardStore } from '@/store/planningBoardStore';
import { useJobDetail, useDeleteJob, useStageSummary } from '@/hooks/usePlanningBoard';
import type { JobProgress, JobLog } from '@/api/planningBoard';
import { useState, useRef, useCallback } from 'react';
import ProductionFlowTab from './ProductionFlowTab';
import OperationProgressTab from './OperationProgressTab';
import TnaTab from './TnaTab';
import AnalyticsTab from './AnalyticsTab';
import ReportTab from './ReportTab';

type TabKey = 'overview' | 'flow' | 'operations' | 'tna' | 'progress' | 'analytics' | 'reports' | 'shipment' | 'logs';

const TAB_LABELS: Record<TabKey, string> = {
  overview: 'Overview',
  flow: 'Production Flow',
  operations: 'Operations',
  tna: 'T&A',
  progress: 'Progress',
  analytics: 'Analytics',
  reports: 'Reports',
  shipment: 'Shipment Info',
  logs: 'Logs',
};

const TAB_KEYS: TabKey[] = ['overview', 'flow', 'operations', 'tna', 'progress', 'analytics', 'reports', 'shipment', 'logs'];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function JobDetailPopup() {
  const { jobPopupId, closeJobPopup, openProgressPopup, openSplitDialog } = usePlanningBoardStore();
  const { data: jobDetail, isLoading } = useJobDetail(jobPopupId);
  const deleteJob = useDeleteJob();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  // Lazy-mount + keep-alive: track which tabs have been visited
  const visitedTabs = useRef(new Set<TabKey>(['overview']));

  const handleTabChange = useCallback((tab: TabKey) => {
    visitedTabs.current.add(tab);
    setActiveTab(tab);
  }, []);

  if (!jobPopupId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={closeJobPopup}>
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-[680px] max-w-[95vw] h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {isLoading || !jobDetail ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="mt-2 text-sm text-gray-500">Loading...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header — flex-shrink-0 prevents collapse */}
            <div
              className="flex-shrink-0 flex items-center gap-3 px-5 py-3 rounded-t-xl"
              style={{ backgroundColor: jobDetail.colorHex ? jobDetail.colorHex + '30' : '#EBF5FF' }}
            >
              {/* Garment thumbnail */}
              {jobDetail.order?.garmentImages && (
                <img
                  src={(() => {
                    try { return JSON.parse(String(jobDetail.order.garmentImages))[0] ?? ''; }
                    catch { return ''; }
                  })()}
                  alt=""
                  className="w-14 h-14 rounded-lg object-cover border-2 border-white shadow"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              )}
              <div className="flex-1">
                <h2 className="text-sm font-bold text-gray-800 dark:text-white">
                  {jobDetail.order?.orderNo ?? `Job #${jobDetail.id}`}
                  {jobDetail.totalSplits > 1 && (
                    <span className="ml-2 text-xs font-normal text-gray-500">
                      Split {jobDetail.splitIndex + 1} of {jobDetail.totalSplits}
                    </span>
                  )}
                </h2>
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  {jobDetail.order?.buyer?.name ?? ''} · {jobDetail.order?.style?.styleNo ?? ''}
                  {jobDetail.order?.style?.styleName ? ` · ${jobDetail.order.style.styleName}` : ''}
                </p>
                <span
                  className={`inline-block text-[10px] mt-1 px-2 py-0.5 rounded-full font-medium ${
                    jobDetail.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                    jobDetail.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                    jobDetail.status === 'SETUP' ? 'bg-amber-100 text-amber-700' :
                    jobDetail.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}
                >
                  {jobDetail.status}
                </span>
              </div>
              <button onClick={closeJobPopup} className="text-gray-400 hover:text-gray-700 dark:hover:text-white text-lg px-1">✕</button>
            </div>

            {/* Tabs — flex-shrink-0 prevents collapse */}
            <div className="flex-shrink-0 flex border-b border-gray-200 dark:border-gray-700 px-5 overflow-x-auto">
              {TAB_KEYS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  className={`px-3 py-2 text-xs border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-medium'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  {TAB_LABELS[tab]}
                </button>
              ))}
            </div>

            {/* Tab Content — min-h-0 enables flex scroll, flex-1 fills remaining space */}
            <div className="flex-1 min-h-0 overflow-y-auto p-5">
              {/* ── LAZY-MOUNT + KEEP-ALIVE TABS ─────────────────── */}
              {/* Tabs are only mounted upon first visit, then kept alive via CSS hidden.
                  This prevents layout collapse (no teardown) and avoids re-fetching data. */}

              {/* Overview — always mounted */}
              <div className={activeTab !== 'overview' ? 'hidden' : undefined}>
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-3">
                    <MetricCard label="Allocated" value={`${jobDetail.allocatedQty.toLocaleString()} pcs`} />
                    <MetricCard label="Completed" value={`${jobDetail.completedQty.toLocaleString()} pcs`} />
                    <MetricCard
                      label="Completion"
                      value={`${jobDetail.metrics.completionPct}%`}
                      color={jobDetail.metrics.completionPct >= 100 ? 'green' : jobDetail.metrics.completionPct >= 50 ? 'blue' : 'amber'}
                    />
                    <MetricCard
                      label="Efficiency"
                      value={`${jobDetail.metrics.actualEfficiency}%`}
                      subtext={`Plan: ${jobDetail.metrics.plannedVsActual.planned}%`}
                      color={jobDetail.metrics.actualEfficiency >= Number(jobDetail.plannedEfficiency) ? 'green' : 'amber'}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-gray-700 dark:text-gray-300">Planning Details</h4>
                      <DetailRow label="Line" value={jobDetail.line?.lineName ?? '--'} />
                      <DetailRow label="Start Date" value={fmtDate(jobDetail.startDate)} />
                      <DetailRow label="End Date" value={fmtDate(jobDetail.endDate)} />
                      <DetailRow label="Setup Days" value={String(jobDetail.setupDays)} />
                      <DetailRow label="Priority" value={String(jobDetail.priority)} />
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-gray-700 dark:text-gray-300">Capacity Params</h4>
                      <DetailRow label="SAM/Piece" value={Number(jobDetail.samPerPiece).toFixed(2)} />
                      <DetailRow label="Operators" value={String(jobDetail.plannedOperators)} />
                      <DetailRow label="Planned Eff." value={`${Number(jobDetail.plannedEfficiency)}%`} />
                      <DetailRow label="Absenteeism" value={`${Number(jobDetail.absenteeismPct)}%`} />
                      <DetailRow label="Daily Target" value={`${jobDetail.dailyTargetQty} pcs`} />
                      <DetailRow label="Total Mins" value={jobDetail.totalPlannedMins.toLocaleString()} />
                    </div>
                  </div>

                  {jobDetail.remarks && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
                      {jobDetail.remarks}
                    </div>
                  )}
                </div>
              </div>

              {/* Production Flow — lazy mount + keep alive */}
              {visitedTabs.current.has('flow') && (
                <div className={activeTab !== 'flow' ? 'hidden' : undefined}>
                  <ProductionFlowTab jobId={jobDetail.id} />
                </div>
              )}

              {/* Operations — lazy mount + keep alive */}
              {visitedTabs.current.has('operations') && (
                <div className={activeTab !== 'operations' ? 'hidden' : undefined}>
                  <OperationProgressTab jobId={jobDetail.id} />
                </div>
              )}

              {/* T&A — lazy mount + keep alive */}
              {visitedTabs.current.has('tna') && (
                <div className={activeTab !== 'tna' ? 'hidden' : undefined}>
                  <TnaTab jobId={jobDetail.id} orderId={jobDetail.orderId} />
                </div>
              )}

              {/* Analytics — lazy mount + keep alive */}
              {visitedTabs.current.has('analytics') && (
                <div className={activeTab !== 'analytics' ? 'hidden' : undefined}>
                  <AnalyticsTab
                    jobId={jobDetail.id}
                    allocatedQty={jobDetail.allocatedQty}
                    completedQty={jobDetail.completedQty}
                    plannedEfficiency={Number(jobDetail.plannedEfficiency ?? 0)}
                    actualEfficiency={jobDetail.metrics.actualEfficiency}
                  />
                </div>
              )}

              {/* Reports — lazy mount + keep alive */}
              {visitedTabs.current.has('reports') && (
                <div className={activeTab !== 'reports' ? 'hidden' : undefined}>
                  <ReportTab jobId={jobDetail.id} />
                </div>
              )}

              {/* Progress — always inline, no async data */}
              <div className={activeTab !== 'progress' ? 'hidden' : undefined}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300">Progress History</h4>
                    <button
                      onClick={() => { closeJobPopup(); openProgressPopup(jobDetail.id); }}
                      className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      + Add Progress
                    </button>
                  </div>

                  {jobDetail.progress && jobDetail.progress.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                            <th className="text-left py-1 px-1">Date</th>
                            <th className="text-right py-1 px-1">Cut</th>
                            <th className="text-right py-1 px-1">Sew In</th>
                            <th className="text-right py-1 px-1">Sew Out</th>
                            <th className="text-right py-1 px-1">QC</th>
                            <th className="text-right py-1 px-1">Finish</th>
                            <th className="text-right py-1 px-1">Pack</th>
                            <th className="text-right py-1 px-1">Eff%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {jobDetail.progress.map((p: JobProgress) => (
                            <tr key={p.id} className="border-b border-gray-100 dark:border-gray-700/50">
                              <td className="py-1 px-1 text-gray-700 dark:text-gray-300">{fmtDate(p.progressDate)}</td>
                              <td className="py-1 px-1 text-right">{p.cuttingQty || '--'}</td>
                              <td className="py-1 px-1 text-right">{p.sewingInputQty || '--'}</td>
                              <td className="py-1 px-1 text-right">{p.sewingOutputQty || '--'}</td>
                              <td className="py-1 px-1 text-right">{p.qcPassQty || '--'}</td>
                              <td className="py-1 px-1 text-right">{p.finishingQty || '--'}</td>
                              <td className="py-1 px-1 text-right">{p.packedQty || '--'}</td>
                              <td className="py-1 px-1 text-right font-medium">{p.efficiencyPct ?? '--'}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-xs text-gray-400">No progress recorded yet</div>
                  )}
                </div>
              </div>

              {/* Shipment — always inline, uses internal hook */}
              <div className={activeTab !== 'shipment' ? 'hidden' : undefined}>
                <ShipmentTabContent jobDetail={jobDetail} />
              </div>

              {/* Logs — always inline, no async data */}
              <div className={activeTab !== 'logs' ? 'hidden' : undefined}>
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Audit Trail</h4>
                  {jobDetail.logs && jobDetail.logs.length > 0 ? (
                    jobDetail.logs.map((log: JobLog) => (
                      <div key={log.id} className="flex gap-2 text-xs border-l-2 border-gray-200 dark:border-gray-600 pl-3 py-1">
                        <span className="text-[10px] text-gray-400 whitespace-nowrap min-w-[110px]">
                          {new Date(log.changedAt).toLocaleString('en-IN')}
                        </span>
                        <span className={`font-medium ${
                          log.action === 'CREATED' ? 'text-green-600' :
                          log.action === 'DELETED' ? 'text-red-600' :
                          log.action === 'SPLIT' ? 'text-purple-600' :
                          'text-blue-600'
                        }`}>
                          {log.action}
                        </span>
                        {log.newValues && (
                          <span className="text-gray-500 truncate">
                            {JSON.stringify(log.newValues).slice(0, 80)}
                          </span>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-xs text-gray-400">No logs</div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer actions — flex-shrink-0 prevents collapse */}
            <div className="flex-shrink-0 flex items-center gap-2 px-5 py-3 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => { closeJobPopup(); openProgressPopup(jobDetail.id); }}
                className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Record Progress
              </button>
              {jobDetail.status === 'PLANNED' && (
                <button
                  onClick={() => { closeJobPopup(); openSplitDialog(jobDetail.id); }}
                  className="text-xs px-3 py-1.5 bg-purple-600 text-white rounded hover:bg-purple-700"
                >
                  Split Job
                </button>
              )}
              <div className="flex-1" />
              <button
                onClick={() => {
                  if (confirm('Delete this planning job?')) {
                    deleteJob.mutate(jobDetail.id);
                    closeJobPopup();
                  }
                }}
                className="text-xs px-3 py-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
              >
                Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Shipment Tab with stage-aware status badges ─── */
function ShipmentTabContent({ jobDetail }: { jobDetail: any }) {
  const { data: summary } = useStageSummary(jobDetail.id);

  const stageLabels = [
    { key: 'cutting', label: 'Cutting', field: 'cuttingQty' },
    { key: 'sewingInput', label: 'Sewing In', field: 'sewingInputQty' },
    { key: 'sewingOutput', label: 'Sewing Out', field: 'sewingOutputQty' },
    { key: 'qcPass', label: 'QC Pass', field: 'qcPassQty' },
    { key: 'finishing', label: 'Finishing', field: 'finishingQty' },
    { key: 'packed', label: 'Packed', field: 'packedQty' },
  ];

  const qty = jobDetail.allocatedQty || 0;

  // Aggregate totals from progress rows
  const totals = (jobDetail.progress ?? []).reduce(
    (acc: Record<string, number>, p: JobProgress) => {
      stageLabels.forEach((s) => {
        acc[s.key] = (acc[s.key] || 0) + ((p as any)[s.field] || 0);
      });
      return acc;
    },
    {} as Record<string, number>,
  );

  // Build stage info from summary if available
  const summaryMap = new Map(
    (summary?.stages ?? []).map((s: any) => [s.key, s]),
  );

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300">Shipment & Material Status</h4>

      {/* Top row: Order Info + Completion estimate */}
      <div className="grid grid-cols-2 gap-3">
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
          <h5 className="text-[10px] font-semibold text-gray-500 uppercase mb-2">Order Info</h5>
          <DetailRow label="Order #" value={jobDetail.order?.orderNo ?? '--'} />
          <DetailRow label="SO #" value={jobDetail.order?.soNo ?? '--'} />
          <DetailRow label="Total Order Qty" value={`${jobDetail.order?.totalQty?.toLocaleString() ?? '--'} pcs`} />
          <DetailRow label="Ex-Factory" value={jobDetail.order?.exFactoryDate ? fmtDate(jobDetail.order.exFactoryDate) : '--'} />
        </div>
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
          <h5 className="text-[10px] font-semibold text-gray-500 uppercase mb-2">Completion Forecast</h5>
          <DetailRow
            label="Overall Progress"
            value={summary ? `${summary.overallPct}%` : '--'}
          />
          <DetailRow
            label="Est. Completion"
            value={summary?.estimatedCompletion ? fmtDate(summary.estimatedCompletion) : '--'}
          />
          <DetailRow
            label="Days Remaining"
            value={summary?.estimatedDaysRemaining != null ? `${summary.estimatedDaysRemaining} days` : '--'}
          />
          {summary?.bottleneck && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] text-red-600 dark:text-red-400 font-medium">
                Bottleneck: {summary.bottleneck}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Production stages with status badges */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
        <h5 className="text-[10px] font-semibold text-gray-500 uppercase mb-2">Production Status</h5>
        {qty > 0 ? (
          <div className="space-y-2">
            {stageLabels.map((stage) => {
              const val = totals[stage.key] || 0;
              const pct = Math.round((val / qty) * 100);
              const summaryStage = summaryMap.get(stage.key);
              const status: string = summaryStage?.status ?? (pct >= 100 ? 'COMPLETE' : pct > 0 ? 'IN_PROGRESS' : 'NOT_STARTED');
              const isBottleneck = summary?.bottleneck === stage.key;

              return (
                <div key={stage.key}>
                  <div className="flex items-center justify-between text-[10px] mb-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-600 dark:text-gray-400">{stage.label}</span>
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium ${
                        status === 'COMPLETE'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : status === 'IN_PROGRESS'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                      }`}>
                        {status === 'COMPLETE' ? '✓ Complete' : status === 'IN_PROGRESS' ? '● In Progress' : '○ Not Started'}
                      </span>
                      {isBottleneck && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                          ⚠ Bottleneck
                        </span>
                      )}
                    </div>
                    <span className="text-gray-500 dark:text-gray-400">
                      {val.toLocaleString()}/{qty.toLocaleString()} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${
                        isBottleneck ? 'bg-red-500' : pct >= 100 ? 'bg-green-500' : pct >= 50 ? 'bg-blue-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-xs text-gray-400 py-2">No progress data</div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value, subtext, color }: {
  label: string; value: string; subtext?: string; color?: string;
}) {
  const borderColor = color === 'green' ? 'border-green-400' : color === 'amber' ? 'border-amber-400' : color === 'blue' ? 'border-blue-400' : 'border-gray-200';
  return (
    <div className={`border ${borderColor} dark:border-opacity-50 rounded-lg p-2 text-center`}>
      <div className="text-[10px] text-gray-500 dark:text-gray-400">{label}</div>
      <div className="text-sm font-bold text-gray-800 dark:text-gray-200">{value}</div>
      {subtext && <div className="text-[10px] text-gray-400">{subtext}</div>}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-0.5">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-gray-800 dark:text-gray-200 font-medium">{value}</span>
    </div>
  );
}

/* ProgressBar — kept for backward compat */
function _ProgressBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-[10px] text-gray-600 dark:text-gray-400 mb-0.5">
        <span>{label}</span>
        <span>{value}/{max} ({pct}%)</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full ${pct >= 100 ? 'bg-green-500' : pct >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}
void _ProgressBar; // suppress unused warning
