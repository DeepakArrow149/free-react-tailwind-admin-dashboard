import { useState, useEffect, useCallback } from 'react';
import { lcApi } from '../../api/export';
import type { LetterOfCredit } from '../../api/export';
import { toast } from 'sonner';
import { PaginatedTable } from '../../components/table';

export default function LcManagementPage() {
  const [items, setItems] = useState<LetterOfCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ lcNo: '', lcDate: '', issuingBank: '', advisingBank: '', lcValue: '', currency: 'USD', expiryDate: '', shipmentDate: '', applicant: '', beneficiary: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await lcApi.list(); setItems(data.data || []); } catch { toast.error('Failed to load LC'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    try {
      await lcApi.create({ ...form, lcValue: parseFloat(form.lcValue) || 0 });
      toast.success('Letter of Credit created');
      setShowForm(false);
      setForm({ lcNo: '', lcDate: '', issuingBank: '', advisingBank: '', lcValue: '', currency: 'USD', expiryDate: '', shipmentDate: '', applicant: '', beneficiary: '' });
      load();
    } catch { toast.error('Create LC failed'); }
  };

  const updateStatus = async (id: number, status: string) => {
    try { await lcApi.updateStatus(id, { status }); toast.success(`Status → ${status}`); load(); } catch { toast.error('Update failed'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Letter of Credit Management</h2>
        <button onClick={() => setShowForm(!showForm)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          {showForm ? 'Cancel' : '+ New LC'}
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">New Letter of Credit</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: 'LC No', key: 'lcNo' }, { label: 'LC Date', key: 'lcDate', type: 'date' },
              { label: 'Issuing Bank', key: 'issuingBank' }, { label: 'Advising Bank', key: 'advisingBank' },
              { label: 'LC Value', key: 'lcValue', type: 'number' }, { label: 'Currency', key: 'currency' },
              { label: 'Expiry Date', key: 'expiryDate', type: 'date' }, { label: 'Shipment Date', key: 'shipmentDate', type: 'date' },
              { label: 'Applicant', key: 'applicant' }, { label: 'Beneficiary', key: 'beneficiary' },
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

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total LCs', value: items.length },
          { label: 'Active', value: items.filter((l) => l.status === 'ACTIVE' || l.status === 'ADVISED').length },
          { label: 'Expiring within 30d', value: items.filter((l) => { const d = l.expiryDate ? (new Date(l.expiryDate).getTime() - Date.now()) / 86400000 : 999; return d > 0 && d <= 30; }).length },
          { label: 'Total Value', value: `$${items.reduce((s, l) => s + (l.lcValue || 0), 0).toLocaleString()}` },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{c.label}</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">{c.value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <p className="text-center py-8 text-gray-400">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-center py-8 text-gray-400">No LCs found</p>
      ) : (
      <PaginatedTable data={items} pageSize={20}>
        {(pageData) => (
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {['LC No', 'Date', 'Issuing Bank', 'Value', 'Expiry', 'Shipment Date', 'Status', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {pageData.map((lc) => (
                <tr key={lc.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                  <td className="px-4 py-3 font-medium">{lc.lcNo}</td>
                  <td className="px-4 py-3">{lc.lcDate ? new Date(lc.lcDate).toLocaleDateString() : '-'}</td>
                  <td className="px-4 py-3">{lc.issuingBank}</td>
                  <td className="px-4 py-3 text-right">{lc.currency} {lc.lcValue?.toLocaleString()}</td>
                  <td className="px-4 py-3">{lc.expiryDate ? new Date(lc.expiryDate).toLocaleDateString() : '-'}</td>
                  <td className="px-4 py-3">{lc.shipmentDate ? new Date(lc.shipmentDate).toLocaleDateString() : '-'}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${lc.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : lc.status === 'EXPIRED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{lc.status}</span></td>
                  <td className="px-4 py-3 flex gap-1">
                    {lc.status === 'DRAFT' && <button onClick={() => updateStatus(lc.id, 'ACTIVE')} className="rounded bg-green-100 px-2 py-1 text-xs text-green-700">Activate</button>}
                    {lc.status === 'ACTIVE' && <button onClick={() => updateStatus(lc.id, 'UTILIZED')} className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-700">Utilized</button>}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
        )}
      </PaginatedTable>
      )}
    </div>
  );
}
