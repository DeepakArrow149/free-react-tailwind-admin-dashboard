import { useJobReport } from '@/hooks/usePlanningBoard';
import type { QualityDefect } from '@/api/planningBoard';

interface Props {
  jobId: number;
}

export default function ReportTab({ jobId }: Props) {
  const { data: report, isLoading } = useJobReport(jobId);

  if (isLoading) return (
    <div className="min-h-[320px] space-y-4 animate-pulse">
      <div className="h-16 bg-gray-100 dark:bg-gray-700/40 rounded-lg border border-gray-200 dark:border-gray-700" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 bg-gray-100 dark:bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-700" />
        ))}
      </div>
    </div>
  );
  if (!report) return <div className="text-xs text-gray-400 py-6 text-center">No report data available</div>;

  const handleExportCsv = () => {
    const rows = [
      ['Job Report', `Job #${report.jobId}`],
      ['Order', report.orderNo],
      ['Line', report.lineName ?? 'Unassigned'],
      ['Status', report.status],
      [''],
      ['Metric', 'Value'],
      ['Allocated Qty', String(report.allocatedQty)],
      ['Completed Qty', String(report.completedQty)],
      ['Completion %', `${report.completionPct}%`],
      ['Planned Efficiency', `${report.efficiency.planned}%`],
      ['Actual Efficiency', `${report.efficiency.actual}%`],
      ['Efficiency Variance', `${report.efficiency.delta}%`],
      [''],
      ['Quality'],
      ['DHU %', `${report.quality.dhuPct}%`],
      ['Total Checked', String(report.quality.totalChecked)],
      ['Total Defects', String(report.quality.totalDefects)],
      [''],
      ['T&A Status'],
      ['Total Milestones', String(report.tna.totalMilestones)],
      ['Completed', String(report.tna.completed)],
      ['Overdue', String(report.tna.overdue)],
      ['Health', report.tna.healthLevel],
      [''],
      ['Alerts'],
      ['Total', String(report.alerts.total)],
      ['Active', String(report.alerts.active)],
    ];

    // Add alert type breakdown
    for (const [type, count] of Object.entries(report.alerts.byType)) {
      rows.push([`  ${type}`, String(count)]);
    }

    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `job-${report.jobId}-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Header with export */}
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300">Consolidated Job Report</h4>
        <button
          onClick={handleExportCsv}
          className="text-[10px] px-2.5 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Export CSV
        </button>
      </div>

      {/* Report header card */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
        <div className="grid grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 block">Order</span>
            <span className="font-medium text-gray-800 dark:text-gray-200">{report.orderNo}</span>
          </div>
          <div>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 block">Line</span>
            <span className="font-medium text-gray-800 dark:text-gray-200">{report.lineName ?? 'Unassigned'}</span>
          </div>
          <div>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 block">Status</span>
            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
              report.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
              report.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {report.status}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 block">Completion</span>
            <span className="font-bold text-gray-800 dark:text-gray-200">{report.completionPct}%</span>
          </div>
        </div>
      </div>

      {/* 2x2 Summary Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Efficiency */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
          <h5 className="text-[10px] font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Efficiency
          </h5>
          <div className="space-y-1 text-xs">
            <ReportRow label="Planned" value={`${report.efficiency.planned}%`} />
            <ReportRow label="Actual" value={`${report.efficiency.actual}%`} />
            <ReportRow
              label="Variance"
              value={`${report.efficiency.delta >= 0 ? '+' : ''}${report.efficiency.delta}%`}
              color={report.efficiency.delta >= 0 ? 'green' : 'red'}
            />
            <ReportRow label="Output" value={`${report.completedQty.toLocaleString()} / ${report.allocatedQty.toLocaleString()}`} />
          </div>
        </div>

        {/* Quality */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
          <h5 className="text-[10px] font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> Quality
          </h5>
          <div className="space-y-1 text-xs">
            <ReportRow label="DHU %" value={`${report.quality.dhuPct}%`} color={report.quality.dhuPct > 5 ? 'red' : 'green'} />
            <ReportRow label="Checked" value={report.quality.totalChecked.toLocaleString()} />
            <ReportRow label="Defects" value={report.quality.totalDefects.toLocaleString()} />
            {report.quality.topDefects.length > 0 && (
              <div className="mt-1 pt-1 border-t border-gray-100 dark:border-gray-700">
                <span className="text-[9px] text-gray-400">Top: </span>
                <span className="text-[10px] text-gray-600 dark:text-gray-400">
                  {report.quality.topDefects.slice(0, 3).map((d: QualityDefect) => d.name).join(', ')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* T&A */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
          <h5 className="text-[10px] font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${
              report.tna.healthLevel === 'GREEN' ? 'bg-green-500' :
              report.tna.healthLevel === 'AMBER' ? 'bg-amber-500' : 'bg-red-500'
            }`} />
            T&A Progress
          </h5>
          <div className="space-y-1 text-xs">
            <ReportRow label="Health" value={report.tna.healthLevel} color={
              report.tna.healthLevel === 'GREEN' ? 'green' :
              report.tna.healthLevel === 'AMBER' ? 'amber' : 'red'
            } />
            <ReportRow label="Milestones" value={`${report.tna.completed} / ${report.tna.totalMilestones}`} />
            <ReportRow label="Overdue" value={String(report.tna.overdue)} color={report.tna.overdue > 0 ? 'red' : 'green'} />
            <ReportRow label="Completion" value={`${report.tna.completionPct}%`} />
          </div>
        </div>

        {/* Alerts */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
          <h5 className="text-[10px] font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Alerts
          </h5>
          <div className="space-y-1 text-xs">
            <ReportRow label="Total" value={String(report.alerts.total)} />
            <ReportRow label="Active" value={String(report.alerts.active)} color={report.alerts.active > 0 ? 'red' : 'green'} />
            {Object.entries(report.alerts.byType).slice(0, 3).map(([type, count]) => (
              <ReportRow key={type} label={type.replace(/_/g, ' ')} value={String(count)} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportRow({ label, value, color }: { label: string; value: string; color?: string }) {
  const textColor = color === 'green' ? 'text-green-600 dark:text-green-400'
    : color === 'red' ? 'text-red-600 dark:text-red-400'
    : color === 'amber' ? 'text-amber-600 dark:text-amber-400'
    : 'text-gray-800 dark:text-gray-200';
  return (
    <div className="flex justify-between py-0.5">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className={`font-medium ${textColor}`}>{value}</span>
    </div>
  );
}
