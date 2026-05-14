import { useState } from 'react';
import { useObVersions, useCreateObVersion, useApproveObVersion, useDeleteObVersion } from '@/hooks/useIeTools';
import PageMeta from '@/components/common/PageMeta';

const statusBadge: Record<string, string> = { DRAFT: 'bg-gray-100 text-gray-700', APPROVED: 'bg-green-100 text-green-700', SUPERSEDED: 'bg-yellow-100 text-yellow-700' };

export default function ObVersionsPage() {
  const [styleId, setStyleId] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState('');
  const { data, isLoading } = useObVersions({ styleId: styleId || undefined, status: statusFilter || undefined });
  const create = useCreateObVersion();
  const approve = useApproveObVersion();
  const remove = useDeleteObVersion();
  const versions = Array.isArray(data) ? data : [];

  const [newStyleId, setNewStyleId] = useState('');
  const [notes, setNotes] = useState('');

  return (
    <>
      <PageMeta title="OB Versions" description="Manage Operation Bulletin versions" />
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">OB Versions</h1>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <input type="number" placeholder="Filter by Style ID" className="rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" value={styleId || ''} onChange={e => setStyleId(Number(e.target.value))} />
          <select className="rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            <option value="DRAFT">Draft</option>
            <option value="APPROVED">Approved</option>
            <option value="SUPERSEDED">Superseded</option>
          </select>
        </div>

        {/* Create Form */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <h3 className="mb-3 font-semibold text-gray-800 dark:text-white">Create New Version</h3>
          <div className="flex flex-wrap gap-3">
            <input type="number" placeholder="Style ID" className="w-32 rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" value={newStyleId} onChange={e => setNewStyleId(e.target.value)} />
            <input placeholder="Notes (optional)" className="flex-1 rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" value={notes} onChange={e => setNotes(e.target.value)} />
            <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50" disabled={!newStyleId || create.isPending} onClick={() => { create.mutate({ styleId: Number(newStyleId), notes: notes || undefined }); setNewStyleId(''); setNotes(''); }}>
              Create
            </button>
          </div>
        </div>

        {/* List */}
        {isLoading && <p className="text-gray-500">Loading...</p>}
        <div className="space-y-2">
          {versions.map((v: { id: number; styleId: number; version: number; status: string; notes: string | null; approvedAt: string | null; createdAt: string; style?: { styleNo: string; styleName: string } }) => (
            <div key={v.id} className="rounded-lg border border-gray-200 p-4 dark:border-gray-700 dark:bg-gray-900">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-gray-800 dark:text-white">v{v.version}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge[v.status] ?? 'bg-gray-100'}`}>{v.status}</span>
                  {v.style && <span className="text-sm text-gray-500">{v.style.styleNo} - {v.style.styleName}</span>}
                </div>
                <div className="flex gap-2">
                  {v.status === 'DRAFT' && (
                    <>
                      <button className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700" onClick={() => approve.mutate(v.id)}>Approve</button>
                      <button className="text-xs text-red-500 hover:text-red-700" onClick={() => remove.mutate(v.id)}>Delete</button>
                    </>
                  )}
                </div>
              </div>
              {v.notes && <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{v.notes}</p>}
              <div className="mt-1 flex gap-4 text-xs text-gray-400">
                <span>Created: {new Date(v.createdAt).toLocaleDateString()}</span>
                {v.approvedAt && <span>Approved: {new Date(v.approvedAt).toLocaleDateString()}</span>}
              </div>
            </div>
          ))}
          {!isLoading && versions.length === 0 && <p className="text-center text-gray-500">No OB versions found.</p>}
        </div>
      </div>
    </>
  );
}
