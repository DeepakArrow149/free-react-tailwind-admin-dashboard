import { useState, useEffect } from 'react';
import PageMeta from '../../components/common/PageMeta';
import { Pagination } from '../../components/table';
import { containerApi, ContainerStuffing } from '../../api/packing';

const MAX_CBM: Record<string, number> = { '20FT': 28, '40FT': 58, '40HQ': 68 };

const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    STUFFED: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    DISPATCHED: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  };
  return <span className={`px-2 py-0.5 rounded text-xs ${map[s] ?? 'bg-gray-100'}`}>{s}</span>;
};

export default function ContainerStuffingPage() {
  const [items, setItems] = useState<ContainerStuffing[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showForm, setShowForm] = useState(false);
  interface ContainerForm {
    containerSize: string;
    containerNo?: string;
    sealNo?: string;
    stuffingDate?: string;
    vehicleNo?: string;
    totalCartons: number;
    totalCbm: number;
    remarks?: string;
    [key: string]: string | number | boolean | undefined;
  }

  const [form, setForm] = useState<ContainerForm>({ containerSize: '40HQ', totalCartons: 0, totalCbm: 0 });

  const load = async () => {
    const res = await containerApi.list({ page, limit: 20 });
    setItems(res.data.data || []);
    setTotalPages(res.data.meta?.totalPages ?? 1);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [page]);

  const maxCbm = MAX_CBM[form.containerSize] ?? 58;
  const utilPct = maxCbm > 0 ? ((form.totalCbm || 0) / maxCbm * 100) : 0;

  const handleCreate = async () => {
    await containerApi.create(form);
    setForm({ containerSize: '40HQ', totalCartons: 0, totalCbm: 0 });
    setShowForm(false);
    load();
  };

  const handleStatus = async (id: number, status: string) => {
    await containerApi.updateStatus(id, { status });
    load();
  };

  return (
    <>
      <PageMeta title="Container Stuffing | STITCH ERP" description="Container stuffing management" />
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Container Stuffing</h3>
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
            {showForm ? 'Cancel' : '+ New Container'}
          </button>
        </div>

        {showForm && (
          <div className="mb-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div><label className="block text-xs text-gray-500 mb-1">Container Size*</label>
                <select aria-label="Container Size" className="border rounded px-3 py-1.5 text-sm w-full dark:bg-gray-800 dark:border-gray-700" value={form.containerSize} onChange={e => setForm({ ...form, containerSize: e.target.value })}>
                  <option value="20FT">20FT (~28 CBM)</option><option value="40FT">40FT (~58 CBM)</option><option value="40HQ">40HQ (~68 CBM)</option>
                </select>
              </div>
              <div><label className="block text-xs text-gray-500 mb-1">Container No</label><input aria-label="Container No" className="border rounded px-3 py-1.5 text-sm w-full dark:bg-gray-800 dark:border-gray-700" value={form.containerNo ?? ''} onChange={e => setForm({ ...form, containerNo: e.target.value })} /></div>
              <div><label className="block text-xs text-gray-500 mb-1">Seal No</label><input aria-label="Seal No" className="border rounded px-3 py-1.5 text-sm w-full dark:bg-gray-800 dark:border-gray-700" value={form.sealNo ?? ''} onChange={e => setForm({ ...form, sealNo: e.target.value })} /></div>
              <div><label className="block text-xs text-gray-500 mb-1">Stuffing Date</label><input type="date" aria-label="Stuffing Date" className="border rounded px-3 py-1.5 text-sm w-full dark:bg-gray-800 dark:border-gray-700" value={form.stuffingDate ?? ''} onChange={e => setForm({ ...form, stuffingDate: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="block text-xs text-gray-500 mb-1">Vehicle No</label><input aria-label="Vehicle No" className="border rounded px-3 py-1.5 text-sm w-full dark:bg-gray-800 dark:border-gray-700" value={form.vehicleNo ?? ''} onChange={e => setForm({ ...form, vehicleNo: e.target.value })} /></div>
              <div><label className="block text-xs text-gray-500 mb-1">Total Cartons</label><input type="number" aria-label="Total Cartons" className="border rounded px-3 py-1.5 text-sm w-full dark:bg-gray-800 dark:border-gray-700" value={form.totalCartons} onChange={e => setForm({ ...form, totalCartons: +e.target.value })} /></div>
              <div><label className="block text-xs text-gray-500 mb-1">Total CBM</label><input type="number" step="0.01" aria-label="Total CBM" className="border rounded px-3 py-1.5 text-sm w-full dark:bg-gray-800 dark:border-gray-700" value={form.totalCbm} onChange={e => setForm({ ...form, totalCbm: +e.target.value })} /></div>
            </div>

            {/* Utilization Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Utilization: {utilPct.toFixed(1)}%</span>
                <span>{form.totalCbm || 0} / {maxCbm} CBM</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div className={`h-3 rounded-full transition-all ${utilPct > 100 ? 'bg-red-500' : utilPct > 80 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(utilPct, 100)}%` }} />
              </div>
            </div>

            <div><label className="block text-xs text-gray-500 mb-1">Remarks</label><textarea aria-label="Remarks" className="border rounded px-3 py-1.5 text-sm w-full dark:bg-gray-800 dark:border-gray-700" rows={2} value={form.remarks ?? ''} onChange={e => setForm({ ...form, remarks: e.target.value })} /></div>
            <button onClick={handleCreate} className="px-5 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Create</button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b dark:border-gray-700 text-left text-gray-500">
              <th className="pb-2">Stuffing No</th><th className="pb-2">Container</th><th className="pb-2">Size</th>
              <th className="pb-2">Cartons</th><th className="pb-2">CBM</th><th className="pb-2">Utilization</th>
              <th className="pb-2">Status</th><th className="pb-2">Actions</th>
            </tr></thead>
            <tbody>
              {items.map(i => (
                <tr key={i.id} className="border-b dark:border-gray-800">
                  <td className="py-2">{i.stuffingNo}</td>
                  <td>{i.containerNo ?? '-'}</td>
                  <td>{i.containerSize}</td>
                  <td>{i.totalCartons}</td>
                  <td>{Number(i.totalCbm ?? 0).toFixed(2)}</td>
                  <td>{Number(i.utilizationPct ?? 0).toFixed(1)}%</td>
                  <td>{statusBadge(i.status)}</td>
                  <td className="space-x-1">
                    {i.status === 'DRAFT' && <button onClick={() => handleStatus(i.id, 'STUFFED')} className="text-blue-600 hover:underline text-xs">Stuff</button>}
                    {i.status === 'STUFFED' && <button onClick={() => handleStatus(i.id, 'DISPATCHED')} className="text-green-600 hover:underline text-xs">Dispatch</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={(p) => setPage(p)}
            pageSize={20}
          />
        </div>
      </div>
    </>
  );
}
