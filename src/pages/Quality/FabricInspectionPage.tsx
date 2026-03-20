import { useState, useEffect } from 'react';
import PageMeta from '../../components/common/PageMeta';
import { fabricApi, FabricInspection } from '../../api/quality';

const resultBadge = (r?: string) => {
  if (!r) return <span className="px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700">PENDING</span>;
  const cls = r === 'PASS' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
    : r === 'FAIL' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
    : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
  return <span className={`px-2 py-0.5 rounded text-xs ${cls}`}>{r}</span>;
};

export default function FabricInspectionPage() {
  const [items, setItems] = useState<FabricInspection[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterGrnId, setFilterGrnId] = useState('');
  const [showForm, setShowForm] = useState(false);
  interface FabricForm {
    grnId?: number | string;
    rollId?: string;
    inspectionDate?: string;
    inspectionType: string;
    totalDefectPoints: number;
    inspectorName?: string;
    inspectedLength?: number | string;
    inspectedWidth?: number | string;
    remarks?: string;
    [key: string]: string | number | boolean | undefined;
  }

  const [form, setForm] = useState<FabricForm>({ inspectionType: '4_POINT', totalDefectPoints: 0 });

  const load = async () => {
    const params: Record<string, string | number | undefined> = { page, limit: 20 };
    if (filterGrnId) params.grnId = filterGrnId;
    const res = await fabricApi.list(params);
    setItems(res.data.data.data);
    setTotalPages(res.data.data.totalPages);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [page, filterGrnId]);

  const handleCreate = async () => {
    await fabricApi.create(form);
    setForm({ inspectionType: '4_POINT', totalDefectPoints: 0 });
    setShowForm(false);
    load();
  };

  // Preview penalty calculation
  const sqYards = form.inspectedLength && form.inspectedWidth
    ? (Number(form.inspectedLength) * Number(form.inspectedWidth)) / 9
    : 0;
  const previewPenalty = sqYards > 0 ? ((form.totalDefectPoints || 0) / sqYards) * 100 : 0;
  const previewResult = previewPenalty <= 28 ? 'PASS' : previewPenalty <= 40 ? 'CONDITIONAL' : 'FAIL';

  return (
    <>
      <PageMeta title="Fabric Inspection | STITCH ERP" description="4-Point fabric inspection system" />
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Fabric Inspection (4-Point System)</h3>
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
            {showForm ? 'Cancel' : '+ New Inspection'}
          </button>
        </div>

        {showForm && (
          <div className="mb-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div><label className="block text-xs text-gray-500 mb-1">Roll ID</label><input className="border rounded px-3 py-1.5 text-sm w-full dark:bg-gray-800 dark:border-gray-700" value={form.rollId ?? ''} onChange={e => setForm({ ...form, rollId: e.target.value })} /></div>
              <div><label className="block text-xs text-gray-500 mb-1">GRN ID</label><input type="number" className="border rounded px-3 py-1.5 text-sm w-full dark:bg-gray-800 dark:border-gray-700" value={form.grnId ?? ''} onChange={e => setForm({ ...form, grnId: +e.target.value })} /></div>
              <div><label className="block text-xs text-gray-500 mb-1">Inspection Date*</label><input type="date" className="border rounded px-3 py-1.5 text-sm w-full dark:bg-gray-800 dark:border-gray-700" value={form.inspectionDate ?? ''} onChange={e => setForm({ ...form, inspectionDate: e.target.value })} /></div>
              <div><label className="block text-xs text-gray-500 mb-1">Inspector</label><input className="border rounded px-3 py-1.5 text-sm w-full dark:bg-gray-800 dark:border-gray-700" value={form.inspectorName ?? ''} onChange={e => setForm({ ...form, inspectorName: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="block text-xs text-gray-500 mb-1">Inspected Length (yards)*</label><input type="number" step="0.01" className="border rounded px-3 py-1.5 text-sm w-full dark:bg-gray-800 dark:border-gray-700" value={form.inspectedLength ?? ''} onChange={e => setForm({ ...form, inspectedLength: +e.target.value })} /></div>
              <div><label className="block text-xs text-gray-500 mb-1">Inspected Width (inches)*</label><input type="number" step="0.01" className="border rounded px-3 py-1.5 text-sm w-full dark:bg-gray-800 dark:border-gray-700" value={form.inspectedWidth ?? ''} onChange={e => setForm({ ...form, inspectedWidth: +e.target.value })} /></div>
              <div><label className="block text-xs text-gray-500 mb-1">Total Defect Points*</label><input type="number" className="border rounded px-3 py-1.5 text-sm w-full dark:bg-gray-800 dark:border-gray-700" value={form.totalDefectPoints} onChange={e => setForm({ ...form, totalDefectPoints: +e.target.value })} /></div>
            </div>

            {sqYards > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded p-3 text-sm space-y-1">
                <p>Penalty per 100 sq yd: <span className="font-semibold">{previewPenalty.toFixed(2)}</span></p>
                <p>Result: {resultBadge(previewResult)}</p>
                <p className="text-xs text-gray-400">
                  ≤28 = PASS &nbsp;|&nbsp; 28-40 = CONDITIONAL &nbsp;|&nbsp; &gt;40 = FAIL
                </p>
              </div>
            )}

            <div><label className="block text-xs text-gray-500 mb-1">Remarks</label><textarea className="border rounded px-3 py-1.5 text-sm w-full dark:bg-gray-800 dark:border-gray-700" rows={2} value={form.remarks ?? ''} onChange={e => setForm({ ...form, remarks: e.target.value })} /></div>
            <button onClick={handleCreate} className="px-5 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Create</button>
          </div>
        )}

        <div className="flex gap-3 mb-4">
          <input className="border rounded px-3 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-700" placeholder="Filter by GRN ID" value={filterGrnId} onChange={e => { setFilterGrnId(e.target.value); setPage(1); }} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b dark:border-gray-700 text-left text-gray-500">
              <th className="pb-2">No</th><th className="pb-2">Roll ID</th><th className="pb-2">GRN</th>
              <th className="pb-2">Date</th><th className="pb-2">Defect Pts</th>
              <th className="pb-2">Penalty/100sqyd</th><th className="pb-2">Result</th>
            </tr></thead>
            <tbody>
              {items.map(i => (
                <tr key={i.id} className="border-b dark:border-gray-800">
                  <td className="py-2">{i.inspectionNo}</td>
                  <td>{i.rollId ?? '-'}</td>
                  <td>{i.grnId ?? '-'}</td>
                  <td>{i.inspectionDate?.split('T')[0]}</td>
                  <td>{i.totalDefectPoints}</td>
                  <td>{Number(i.penaltyPer100sqyd ?? 0).toFixed(2)}</td>
                  <td>{resultBadge(i.result ?? undefined)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-between items-center mt-3">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-sm border rounded disabled:opacity-40 dark:border-gray-700">Prev</button>
          <span className="text-sm text-gray-500">Page {page}/{totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-sm border rounded disabled:opacity-40 dark:border-gray-700">Next</button>
        </div>
      </div>
    </>
  );
}
