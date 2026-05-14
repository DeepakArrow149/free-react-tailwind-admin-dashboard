import { useState, useEffect, useCallback } from 'react';
import { subcontractApi } from '../../api/procurement';
import type { SubcontractOutward } from '../../api/procurement';
import { toast } from 'sonner';
import { PaginatedTable } from '../../components/table';

export default function SubcontractPage() {
  const [tab, setTab] = useState<'pending' | 'outward' | 'create'>('pending');
  const [pending, setPending] = useState<SubcontractOutward[]>([]);
  const [outward, setOutward] = useState<SubcontractOutward | null>(null);
  const [loading, setLoading] = useState(true);
  const [outwardId, setOutwardId] = useState('');

  // Create form
  const [form, setForm] = useState({
    challanNo: '', supplierId: '', orderId: '', processType: 'WASHING',
    dispatchDate: '', expectedReturnDate: '', items: '[]', ewayBillNo: '', remarks: '',
  });

  // Inward form
  const [inwardForm, setInwardForm] = useState({ challanOutwardId: 0, receivedDate: '', receivedQty: '', rejectedQty: '0', excessQty: '0', shortageQty: '0', dcNo: '' });
  const [showInward, setShowInward] = useState(false);

  const loadPending = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await subcontractApi.listPending();
      setPending(data.data || []);
    } catch { toast.error('Failed to load pending subcontracts'); }
    setLoading(false);
  }, []);

  useEffect(() => { loadPending(); }, [loadPending]);

  const handleCreateOutward = async () => {
    try {
      let items;
      try { items = JSON.parse(form.items); } catch { toast.error('Items must be valid JSON array, e.g. [{"sku":"AB01","qty":100}]'); return; }
      await subcontractApi.createOutward({
        challanNo: form.challanNo,
        supplierId: parseInt(form.supplierId) || 0,
        orderId: parseInt(form.orderId) || 0,
        processType: form.processType,
        dispatchDate: form.dispatchDate,
        expectedReturnDate: form.expectedReturnDate,
        items,
        ewayBillNo: form.ewayBillNo,
        remarks: form.remarks,
      });
      toast.success('Outward challan created');
      setTab('pending');
      loadPending();
    } catch { toast.error('Failed to create outward challan'); }
  };

  const handleGetOutward = async () => {
    try {
      const { data } = await subcontractApi.getOutward(parseInt(outwardId));
      setOutward(data.data);
    } catch { toast.error('Challan not found'); }
  };

  const handleInward = async () => {
    try {
      await subcontractApi.createInward({
        challanOutwardId: inwardForm.challanOutwardId,
        receivedDate: inwardForm.receivedDate,
        receivedQty: parseInt(inwardForm.receivedQty) || 0,
        rejectedQty: parseInt(inwardForm.rejectedQty) || 0,
        excessQty: parseInt(inwardForm.excessQty) || 0,
        shortageQty: parseInt(inwardForm.shortageQty) || 0,
        dcNo: inwardForm.dcNo,
      });
      toast.success('Inward received');
      setShowInward(false);
      loadPending();
    } catch { toast.error('Failed to record inward'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Subcontracting</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
        {(['pending', 'outward', 'create'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium rounded-t-lg ${tab === t ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
            {t === 'pending' ? 'Pending Returns' : t === 'outward' ? 'View Challan' : 'New Outward'}
          </button>
        ))}
      </div>

      {/* ─── Pending Tab ─── */}
      {tab === 'pending' && (
        loading ? (
          <p className="text-center py-8 text-gray-400">Loading…</p>
        ) : pending.length === 0 ? (
          <p className="text-center py-8 text-gray-400">No pending subcontracts</p>
        ) : (
        <PaginatedTable data={pending} pageSize={20}>
          {(pageData) => (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {['Challan No', 'Supplier', 'Order', 'Process', 'Dispatch', 'Expected Return', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {pageData.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                    <td className="px-4 py-3 font-medium">{p.challanNo}</td>
                    <td className="px-4 py-3">{p.supplier?.name || p.supplierId}</td>
                    <td className="px-4 py-3">{p.order?.orderNo || p.orderId}</td>
                    <td className="px-4 py-3"><span className="rounded bg-purple-100 dark:bg-purple-900 px-2 py-0.5 text-xs text-purple-700 dark:text-purple-300">{p.processType}</span></td>
                    <td className="px-4 py-3">{p.dispatchDate ? new Date(p.dispatchDate).toLocaleDateString() : '-'}</td>
                    <td className="px-4 py-3">{p.expectedReturnDate ? new Date(p.expectedReturnDate).toLocaleDateString() : '-'}</td>
                    <td className="px-4 py-3"><span className="rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 px-2 py-0.5 text-xs">{p.status}</span></td>
                    <td className="px-4 py-3">
                      <button onClick={() => { setInwardForm({ ...inwardForm, challanOutwardId: p.id }); setShowInward(true); }} className="rounded bg-green-100 dark:bg-green-900 px-2 py-1 text-xs text-green-700 dark:text-green-300">
                        Record Inward
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
          )}
        </PaginatedTable>
        )
      )}

      {/* ─── View Challan Tab ─── */}
      {tab === 'outward' && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <input type="number" placeholder="Outward Challan ID" value={outwardId} onChange={(e) => setOutwardId(e.target.value)} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm" />
            <button onClick={handleGetOutward} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white">Fetch</button>
          </div>
          {outward && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-3">
              <h3 className="text-lg font-semibold">{outward.challanNo}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><span className="text-gray-500">Supplier:</span> {outward.supplier?.name}</div>
                <div><span className="text-gray-500">Order:</span> {outward.order?.orderNo}</div>
                <div><span className="text-gray-500">Process:</span> {outward.processType}</div>
                <div><span className="text-gray-500">Status:</span> {outward.status}</div>
                <div><span className="text-gray-500">Dispatch:</span> {outward.dispatchDate ? new Date(outward.dispatchDate).toLocaleDateString() : '-'}</div>
                <div><span className="text-gray-500">Expected:</span> {outward.expectedReturnDate ? new Date(outward.expectedReturnDate).toLocaleDateString() : '-'}</div>
                <div><span className="text-gray-500">E-Way Bill:</span> {outward.ewayBillNo || '-'}</div>
              </div>
              <h4 className="font-medium mt-4">Items</h4>
              <div className="flex flex-wrap gap-2">
                {outward.items?.map((item, i) => (
                  <span key={i} className="rounded bg-gray-100 dark:bg-gray-700 px-2 py-1 text-xs">{item.sku}: {item.qty}</span>
                ))}
              </div>
              {outward.inwards && outward.inwards.length > 0 && (
                <>
                  <h4 className="font-medium mt-4">Inward History</h4>
                  {outward.inwards.map((inv, i) => (
                    <div key={i} className="rounded bg-green-50 dark:bg-green-900/20 p-3 text-sm">
                      Received: {inv.receivedQty} | Rejected: {inv.rejectedQty} | Date: {inv.receivedDate ? new Date(inv.receivedDate).toLocaleDateString() : '-'}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── Create Outward Tab ─── */}
      {tab === 'create' && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">New Outward Challan</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Challan No', key: 'challanNo' }, { label: 'Supplier ID', key: 'supplierId', type: 'number' },
              { label: 'Order ID', key: 'orderId', type: 'number' },
            ].map((f) => (
              <div key={f.key}>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">{f.label}</label>
                <input type={f.type || 'text'} value={form[f.key as keyof typeof form]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm" />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Process Type</label>
              <select value={form.processType} onChange={(e) => setForm({ ...form, processType: e.target.value })} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm">
                {['WASHING', 'DYEING', 'PRINTING', 'EMBROIDERY', 'PLEATING', 'QUILTING', 'OTHER'].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Dispatch Date</label>
              <input type="date" value={form.dispatchDate} onChange={(e) => setForm({ ...form, dispatchDate: e.target.value })} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Expected Return</label>
              <input type="date" value={form.expectedReturnDate} onChange={(e) => setForm({ ...form, expectedReturnDate: e.target.value })} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">E-Way Bill No</label>
              <input type="text" value={form.ewayBillNo} onChange={(e) => setForm({ ...form, ewayBillNo: e.target.value })} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Items (JSON)</label>
            <textarea value={form.items} onChange={(e) => setForm({ ...form, items: e.target.value })} rows={3} placeholder='[{"sku":"ITEM-001","qty":100}]' className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm font-mono" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Remarks</label>
            <textarea value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} rows={2} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm" />
          </div>
          <button onClick={handleCreateOutward} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">Create Outward Challan</button>
        </div>
      )}

      {/* ─── Inward Modal ─── */}
      {showInward && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-lg space-y-4 m-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Record Inward</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Received Date', key: 'receivedDate', type: 'date' },
                { label: 'Received Qty', key: 'receivedQty', type: 'number' },
                { label: 'Rejected Qty', key: 'rejectedQty', type: 'number' },
                { label: 'Excess Qty', key: 'excessQty', type: 'number' },
                { label: 'Shortage Qty', key: 'shortageQty', type: 'number' },
                { label: 'DC No', key: 'dcNo' },
              ].map((f) => (
                <div key={f.key}>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">{f.label}</label>
                  <input type={f.type || 'text'} value={inwardForm[f.key as keyof typeof inwardForm]} onChange={(e) => setInwardForm({ ...inwardForm, [f.key]: e.target.value })} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm" />
                </div>
              ))}
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={handleInward} className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white">Save Inward</button>
              <button onClick={() => setShowInward(false)} className="rounded-lg bg-gray-200 dark:bg-gray-600 px-4 py-2 text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
