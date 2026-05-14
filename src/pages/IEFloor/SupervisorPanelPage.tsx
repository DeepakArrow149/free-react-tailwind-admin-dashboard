import { useState } from 'react';
import { useSupervisorLogs, useCreateSupervisorLog, useDeleteSupervisorLog, useDefects, useCreateDefect, useDhu, useTargetOverride, useUpsertTargetOverride } from '@/hooks/useIeFloor';
import { useLogTypes } from '@/hooks/useMasterLookups';
import { useLines } from '@/hooks/useLineBalancing';
import PageMeta from '@/components/common/PageMeta';

const LOG_TYPES = ['NOTE', 'ISSUE', 'RESOLUTION', 'QUALITY', 'MAINTENANCE', 'SAFETY'] as const;
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
const SEVERITIES = ['MINOR', 'MAJOR', 'CRITICAL'] as const;
const priorityColor: Record<string, string> = { LOW: 'bg-gray-100 text-gray-700', MEDIUM: 'bg-blue-100 text-blue-700', HIGH: 'bg-orange-100 text-orange-700', CRITICAL: 'bg-red-100 text-red-700' };

export default function SupervisorPanelPage() {
  const { data: linesData } = useLines();
  const lines = (linesData as { data?: { id: number; lineName: string }[] })?.data ?? linesData ?? [];
  const lineList = Array.isArray(lines) ? lines : [];

  const [lineId, setLineId] = useState<number>(0);
  const [tab, setTab] = useState<'logs' | 'defects' | 'dhu' | 'target'>('logs');

  return (
    <>
      <PageMeta title="Supervisor Panel" description="Supervisor logs, defects, DHU & target overrides" />
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Supervisor Panel</h1>
          <select className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" value={lineId} onChange={e => setLineId(Number(e.target.value))} aria-label="Select production line">
            <option value={0}>Select Line</option>
            {lineList.map((l: { id: number; lineName: string }) => <option key={l.id} value={l.id}>{l.lineName}</option>)}
          </select>
        </div>

        {!lineId && <p className="text-gray-500">Select a line to manage.</p>}

        {lineId > 0 && (
          <>
            {/* Tabs */}
            <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
              {(['logs', 'defects', 'dhu', 'target'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)} className={`flex-1 rounded-md px-3 py-2 text-sm font-medium capitalize ${tab === t ? 'bg-white text-gray-800 shadow dark:bg-gray-700 dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}>{t === 'dhu' ? 'DHU Analysis' : t === 'target' ? 'Target Override' : t}</button>
              ))}
            </div>

            {tab === 'logs' && <LogsPanel lineId={lineId} />}
            {tab === 'defects' && <DefectsPanel lineId={lineId} />}
            {tab === 'dhu' && <DhuPanel lineId={lineId} />}
            {tab === 'target' && <TargetPanel lineId={lineId} />}
          </>
        )}
      </div>
    </>
  );
}

function LogsPanel({ lineId }: { lineId: number }) {
  const { data, isLoading } = useSupervisorLogs(lineId);
  const create = useCreateSupervisorLog();
  const remove = useDeleteSupervisorLog(lineId);
  const logs = Array.isArray(data) ? data : [];
  const [form, setForm] = useState({ logType: 'NOTE', priority: 'MEDIUM', description: '' });

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        <h3 className="mb-3 font-semibold text-gray-800 dark:text-white">New Log Entry</h3>
        <div className="flex flex-wrap gap-3">
          <select className="rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" value={form.logType} onChange={e => setForm(p => ({ ...p, logType: e.target.value }))} aria-label="Log type">
            {LOG_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
          <select className="rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))} aria-label="Priority">
            {PRIORITIES.map(p => <option key={p}>{p}</option>)}
          </select>
          <input className="flex-1 rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" placeholder="Description" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50" disabled={!form.description || create.isPending} onClick={() => { create.mutate({ lineId, ...form }); setForm(p => ({ ...p, description: '' })); }}>
            Add Log
          </button>
        </div>
      </div>
      {isLoading && <p className="text-gray-500">Loading...</p>}
      <div className="space-y-2">
        {logs.map((log: { id: number; logType: string; priority: string; description: string; createdAt: string }) => (
          <div key={log.id} className="flex items-start justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700 dark:bg-gray-900">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${priorityColor[log.priority] ?? 'bg-gray-100'}`}>{log.priority}</span>
                <span className="text-xs text-gray-500">{log.logType}</span>
                <span className="text-xs text-gray-400">{new Date(log.createdAt).toLocaleString()}</span>
              </div>
              <p className="mt-1 text-sm text-gray-800 dark:text-gray-200">{log.description}</p>
            </div>
            <button className="ml-2 text-xs text-red-500 hover:text-red-700" onClick={() => remove.mutate(log.id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function DefectsPanel({ lineId }: { lineId: number }) {
  const { data, isLoading } = useDefects(lineId);
  const create = useCreateDefect();
  const defects = Array.isArray(data) ? data : [];
  const [form, setForm] = useState({ operationId: 0, defectType: '', defectCode: '', quantity: 1, severity: 'MINOR', remarks: '' });

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        <h3 className="mb-3 font-semibold text-gray-800 dark:text-white">Record Defect</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <input type="number" placeholder="Operation ID" className="rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" value={form.operationId || ''} onChange={e => setForm(p => ({ ...p, operationId: Number(e.target.value) }))} />
          <input placeholder="Defect Type" className="rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" value={form.defectType} onChange={e => setForm(p => ({ ...p, defectType: e.target.value }))} />
          <input placeholder="Defect Code" className="rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" value={form.defectCode} onChange={e => setForm(p => ({ ...p, defectCode: e.target.value }))} />
          <input type="number" placeholder="Qty" className="rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: Number(e.target.value) }))} />
          <select className="rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" value={form.severity} onChange={e => setForm(p => ({ ...p, severity: e.target.value }))} aria-label="Severity">
            {SEVERITIES.map(s => <option key={s}>{s}</option>)}
          </select>
          <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50" disabled={!form.operationId || !form.defectType || !form.defectCode || create.isPending} onClick={() => { create.mutate({ lineId, ...form }); setForm({ operationId: 0, defectType: '', defectCode: '', quantity: 1, severity: 'MINOR', remarks: '' }); }}>
            Record
          </button>
        </div>
      </div>
      {isLoading && <p className="text-gray-500">Loading...</p>}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800"><tr>
            <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-300">Type</th>
            <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-300">Code</th>
            <th className="px-3 py-2 text-right text-gray-600 dark:text-gray-300">Qty</th>
            <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-300">Severity</th>
            <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-300">Date</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {defects.map((d: { id: number; defectType: string; defectCode: string; quantity: number; severity: string; createdAt: string }) => (
              <tr key={d.id}>
                <td className="px-3 py-2 text-gray-800 dark:text-white">{d.defectType}</td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{d.defectCode}</td>
                <td className="px-3 py-2 text-right text-gray-600">{d.quantity}</td>
                <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${d.severity === 'CRITICAL' ? 'bg-red-100 text-red-700' : d.severity === 'MAJOR' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'}`}>{d.severity}</span></td>
                <td className="px-3 py-2 text-xs text-gray-400">{new Date(d.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DhuPanel({ lineId }: { lineId: number }) {
  const { data, isLoading } = useDhu(lineId);
  const dhu = data as { dhu?: number; totalOutput?: number; totalDefects?: number; byType?: Record<string, number>; bySeverity?: Record<string, number>; byOperation?: { operationName: string; defects: number; dhu: number }[] } | undefined;

  if (isLoading) return <p className="text-gray-500">Calculating DHU...</p>;
  if (!dhu) return <p className="text-gray-500">No data available for today.</p>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center dark:border-gray-700 dark:bg-gray-900">
          <p className="text-xs text-gray-500">DHU %</p>
          <p className={`text-3xl font-bold ${(dhu.dhu ?? 0) > 5 ? 'text-red-600' : 'text-green-600'}`}>{(dhu.dhu ?? 0).toFixed(2)}%</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center dark:border-gray-700 dark:bg-gray-900">
          <p className="text-xs text-gray-500">Total Output</p>
          <p className="text-3xl font-bold text-gray-800 dark:text-white">{dhu.totalOutput ?? 0}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center dark:border-gray-700 dark:bg-gray-900">
          <p className="text-xs text-gray-500">Total Defects</p>
          <p className="text-3xl font-bold text-gray-800 dark:text-white">{dhu.totalDefects ?? 0}</p>
        </div>
      </div>

      {dhu.byType && Object.keys(dhu.byType).length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <h3 className="mb-3 font-semibold text-gray-800 dark:text-white">By Defect Type</h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(dhu.byType).map(([type, count]) => (
              <div key={type} className="rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-600">
                <p className="text-xs text-gray-500">{type}</p>
                <p className="text-lg font-bold text-gray-800 dark:text-white">{count as number}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {dhu.byOperation && dhu.byOperation.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <h3 className="mb-3 font-semibold text-gray-800 dark:text-white">By Operation</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead><tr>
                <th className="px-3 py-2 text-left text-gray-600">Operation</th>
                <th className="px-3 py-2 text-right text-gray-600">Defects</th>
                <th className="px-3 py-2 text-right text-gray-600">DHU %</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {dhu.byOperation.map((op, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 text-gray-800 dark:text-white">{op.operationName}</td>
                    <td className="px-3 py-2 text-right">{op.defects}</td>
                    <td className={`px-3 py-2 text-right font-semibold ${op.dhu > 5 ? 'text-red-600' : 'text-green-600'}`}>{op.dhu.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function TargetPanel({ lineId }: { lineId: number }) {
  const { data } = useTargetOverride(lineId);
  const upsert = useUpsertTargetOverride();
  const [target, setTarget] = useState('');
  const [reason, setReason] = useState('');
  const current = data as { overrideTarget?: number; reason?: string } | undefined;

  return (
    <div className="space-y-4">
      {current && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <h3 className="mb-2 font-semibold text-gray-800 dark:text-white">Current Override</h3>
          <p className="text-lg text-gray-800 dark:text-white">Target: <span className="font-bold">{current.overrideTarget}</span></p>
          {current.reason && <p className="text-sm text-gray-500">Reason: {current.reason}</p>}
        </div>
      )}
      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        <h3 className="mb-3 font-semibold text-gray-800 dark:text-white">Set Target Override</h3>
        <div className="flex flex-wrap gap-3">
          <input type="number" placeholder="Override target" className="rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" value={target} onChange={e => setTarget(e.target.value)} />
          <input placeholder="Reason (optional)" className="flex-1 rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" value={reason} onChange={e => setReason(e.target.value)} />
          <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50" disabled={!target || upsert.isPending} onClick={() => { upsert.mutate({ lineId, overrideTarget: Number(target), reason: reason || undefined }); setTarget(''); setReason(''); }}>
            Save Override
          </button>
        </div>
      </div>
    </div>
  );
}
