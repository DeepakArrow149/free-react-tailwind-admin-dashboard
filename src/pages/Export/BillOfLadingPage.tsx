import { useState, useEffect, useCallback } from 'react';
import { blApi } from '../../api/export';
import type { BillOfLading } from '../../api/export';
import { toast } from 'sonner';

export default function BillOfLadingPage() {
  const [items, setItems] = useState<BillOfLading[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ blNo: '', blDate: '', vesselName: '', voyageNo: '', containerNo: '', shippingLine: '', blType: 'ORIGINAL', freightTerms: 'PREPAID' });

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await blApi.list(); setItems(data.data); } catch { toast.error('Failed to load B/L'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    try {
      await blApi.create(form);
      toast.success('Bill of Lading created');
      setShowForm(false);
      setForm({ blNo: '', blDate: '', vesselName: '', voyageNo: '', containerNo: '', shippingLine: '', blType: 'ORIGINAL', freightTerms: 'PREPAID' });
      load();
    } catch { toast.error('Failed to create B/L'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Bill of Lading</h2>
        <button onClick={() => setShowForm(!showForm)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          {showForm ? 'Cancel' : '+ New B/L'}
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">New Bill of Lading</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: 'B/L No', key: 'blNo' }, { label: 'B/L Date', key: 'blDate', type: 'date' },
              { label: 'Vessel', key: 'vesselName' }, { label: 'Voyage No', key: 'voyageNo' },
              { label: 'Container No', key: 'containerNo' }, { label: 'Shipping Line', key: 'shippingLine' },
            ].map((f) => (
              <div key={f.key}>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">{f.label}</label>
                <input type={f.type || 'text'} value={form[f.key as keyof typeof form]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm" />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">B/L Type</label>
              <select value={form.blType} onChange={(e) => setForm({ ...form, blType: e.target.value })} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm">
                <option value="ORIGINAL">Original</option><option value="SURRENDER">Surrender</option><option value="SWITCH">Switch</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Freight Terms</label>
              <select value={form.freightTerms} onChange={(e) => setForm({ ...form, freightTerms: e.target.value })} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm">
                <option value="PREPAID">Prepaid</option><option value="COLLECT">Collect</option>
              </select>
            </div>
          </div>
          <button onClick={handleCreate} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">Create</button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {['B/L No', 'Date', 'Vessel', 'Voyage', 'Container', 'Line', 'Type', 'Freight', 'Status'].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {loading ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">No records found</td></tr>
            ) : (
              items.map((bl) => (
                <tr key={bl.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                  <td className="px-4 py-3 font-medium">{bl.blNo}</td>
                  <td className="px-4 py-3">{bl.blDate ? new Date(bl.blDate).toLocaleDateString() : '-'}</td>
                  <td className="px-4 py-3">{bl.vesselName}</td>
                  <td className="px-4 py-3">{bl.voyageNo}</td>
                  <td className="px-4 py-3">{bl.containerNo}</td>
                  <td className="px-4 py-3">{bl.shippingLine}</td>
                  <td className="px-4 py-3"><span className="rounded bg-purple-100 dark:bg-purple-900 px-2 py-0.5 text-xs text-purple-700 dark:text-purple-300">{bl.blType}</span></td>
                  <td className="px-4 py-3">{bl.freightTerms}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${bl.status === 'RELEASED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{bl.status}</span></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
