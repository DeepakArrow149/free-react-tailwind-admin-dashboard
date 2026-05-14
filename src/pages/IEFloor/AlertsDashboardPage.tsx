import { useState } from 'react';
import { useAlerts, useAcknowledgeAlert, useResolveAlert, useAutoGenerateAlerts, useAlertActiveCount } from '@/hooks/useIeFloor';
import { useAlertTypes } from '@/hooks/useMasterLookups';
import { useLines } from '@/hooks/useLineBalancing';
import PageMeta from '@/components/common/PageMeta';

const ALERT_TYPES = ['LOW_EFFICIENCY', 'HIGH_WIP', 'BREAKDOWN', 'QUALITY_DHU', 'TARGET_MISS', 'BOTTLENECK', 'MANPOWER_SHORT', 'CHANGEOVER_DELAY', 'CUSTOM'] as const;
const severityColor: Record<string, string> = { LOW: 'bg-gray-100 text-gray-700', MEDIUM: 'bg-blue-100 text-blue-700', HIGH: 'bg-orange-100 text-orange-700', CRITICAL: 'bg-red-100 text-red-700' };
const statusColor: Record<string, string> = { ACTIVE: 'bg-red-100 text-red-700', ACKNOWLEDGED: 'bg-yellow-100 text-yellow-700', RESOLVED: 'bg-green-100 text-green-700' };

export default function AlertsDashboardPage() {
  const { data: linesData } = useLines();
  const lines = (linesData as { data?: { id: number; lineName: string }[] })?.data ?? linesData ?? [];
  const lineList = Array.isArray(lines) ? lines : [];

  const [lineId, setLineId] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');

  const { data, isLoading } = useAlerts({ lineId: lineId || undefined, status: statusFilter || undefined, alertType: typeFilter || undefined });
  const { data: countData } = useAlertActiveCount(lineId || 1);
  const acknowledge = useAcknowledgeAlert();
  const resolveAlert = useResolveAlert();
  const autoGenerate = useAutoGenerateAlerts();

  const alerts = Array.isArray(data) ? data : [];
  const activeCount = (countData as { count?: number })?.count ?? 0;

  const [resolveId, setResolveId] = useState<number | null>(null);
  const [resolution, setResolution] = useState('');

  return (
    <>
      <PageMeta title="Alerts Dashboard" description="Production floor alerts monitoring" />
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Alerts Dashboard</h1>
            {activeCount > 0 && (
              <span className="flex h-7 min-w-[28px] items-center justify-center rounded-full bg-red-600 px-2 text-sm font-bold text-white">{activeCount}</span>
            )}
          </div>
          <div className="flex gap-3">
            <select className="rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" value={lineId} onChange={e => setLineId(Number(e.target.value))} aria-label="Filter by line">
              <option value={0}>All Lines</option>
              {lineList.map((l: { id: number; lineName: string }) => <option key={l.id} value={l.id}>{l.lineName}</option>)}
            </select>
            <select className="rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} aria-label="Filter by status">
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="ACKNOWLEDGED">Acknowledged</option>
              <option value="RESOLVED">Resolved</option>
            </select>
            <select className="rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" value={typeFilter} onChange={e => setTypeFilter(e.target.value)} aria-label="Filter by alert type">
              <option value="">All Types</option>
              {ALERT_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            {lineId > 0 && (
              <button className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50" disabled={autoGenerate.isPending} onClick={() => autoGenerate.mutate(lineId)}>
                Auto-Generate
              </button>
            )}
          </div>
        </div>

        {isLoading && <p className="text-gray-500">Loading alerts...</p>}

        <div className="space-y-2">
          {alerts.map((a: { id: number; alertType: string; severity: string; title: string; description: string | null; status: string; createdAt: string }) => (
            <div key={a.id} className="rounded-lg border border-gray-200 p-4 dark:border-gray-700 dark:bg-gray-900">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${severityColor[a.severity] ?? 'bg-gray-100'}`}>{a.severity}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[a.status] ?? 'bg-gray-100'}`}>{a.status}</span>
                    <span className="text-xs text-gray-500">{a.alertType}</span>
                  </div>
                  <h3 className="mt-1 font-medium text-gray-800 dark:text-white">{a.title}</h3>
                  {a.description && <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{a.description}</p>}
                  <p className="mt-1 text-xs text-gray-400">{new Date(a.createdAt).toLocaleString()}</p>
                </div>
                <div className="ml-3 flex flex-col gap-1">
                  {a.status === 'ACTIVE' && (
                    <button className="rounded-lg bg-yellow-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-yellow-600" onClick={() => acknowledge.mutate(a.id)}>
                      Acknowledge
                    </button>
                  )}
                  {(a.status === 'ACTIVE' || a.status === 'ACKNOWLEDGED') && (
                    <>
                      {resolveId === a.id ? (
                        <div className="flex gap-1">
                          <input placeholder="Resolution" className="w-32 rounded border px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-white" value={resolution} onChange={e => setResolution(e.target.value)} />
                          <button className="rounded bg-green-600 px-2 py-1 text-xs text-white" onClick={() => { resolveAlert.mutate({ id: a.id, resolution }); setResolveId(null); setResolution(''); }}>OK</button>
                        </div>
                      ) : (
                        <button className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700" onClick={() => setResolveId(a.id)}>
                          Resolve
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
          {!isLoading && alerts.length === 0 && <p className="text-center text-gray-500">No alerts found.</p>}
        </div>
      </div>
    </>
  );
}
