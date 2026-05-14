import { useState, useEffect, useCallback } from 'react';
import { incentiveApi } from '../../api/export';
import type { ExportIncentive } from '../../api/export';
import { toast } from 'sonner';

export default function ExportIncentivesPage() {
  const [items, setItems] = useState<ExportIncentive[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ scheme: 'RoDTEP', scripsNo: '', amount: '', currency: 'INR', sbId: '', claimDate: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await incentiveApi.list(); setItems(data.data || []); } catch { toast.error('Failed to load incentives'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    try {
      await incentiveApi.create({ ...form, amount: parseFloat(form.amount) || 0, sbId: parseInt(form.sbId) || 0 });
      toast.success('Incentive claim created');
      setShowForm(false);
      setForm({ scheme: 'RoDTEP', scripsNo: '', amount: '', currency: 'INR', sbId: '', claimDate: '' });
      load();
    } catch { toast.error('Failed to create'); }
  };

  const totalClaimed = items.filter((i) => i.status === 'CLAIMED').reduce((s, i) => s + (i.amount || 0), 0);
  const totalPending = items.filter((i) => i.status === 'PENDING').reduce((s, i) => s + (i.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Export Incentives</h2>
        <button onClick={() => setShowForm(!showForm)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          {showForm ? 'Cancel' : '+ New Claim'}
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Claims', value: items.length },
          { label: 'Pending', value: items.filter((i) => i.status === 'PENDING').length },
          { label: 'Pending Amount', value: `₹${totalPending.toLocaleString()}` },
          { label: 'Claimed Amount', value: `₹${totalClaimed.toLocaleString()}` },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{c.label}</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">{c.value}</p>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">New Incentive Claim</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Scheme</label>
              <select value={form.scheme} onChange={(e) => setForm({ ...form, scheme: e.target.value })} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm">
                {['RoDTEP', 'MEIS', 'RoSCTL', 'DFIA', 'EPCG', 'AA'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {[
              { label: 'Scrips No', key: 'scripsNo' }, { label: 'Amount', key: 'amount', type: 'number' },
              { label: 'Currency', key: 'currency' }, { label: 'SB ID', key: 'sbId', type: 'number' },
              { label: 'Claim Date', key: 'claimDate', type: 'date' },
            ].map((f) => (
              <div key={f.key}>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">{f.label}</label>
                <input type={f.type || 'text'} value={form[f.key as keyof typeof form]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm" />
              </div>
            ))}
          </div>
          <button onClick={handleCreate} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">Create</button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {['Scheme', 'Scrips No', 'Amount', 'Currency', 'Claim Date', 'Status'].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No incentive claims</td></tr>
            ) : (
              items.map((inc) => (
                <tr key={inc.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                  <td className="px-4 py-3"><span className="rounded bg-blue-100 dark:bg-blue-900 px-2 py-0.5 text-xs text-blue-700 dark:text-blue-300 font-medium">{inc.scheme}</span></td>
                  <td className="px-4 py-3 font-medium">{inc.scripsNo}</td>
                  <td className="px-4 py-3 text-right">{inc.amount?.toLocaleString()}</td>
                  <td className="px-4 py-3">{inc.currency}</td>
                  <td className="px-4 py-3">{inc.claimDate ? new Date(inc.claimDate).toLocaleDateString() : '-'}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${inc.status === 'CLAIMED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{inc.status}</span></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
