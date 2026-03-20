import { useState, useEffect, useCallback } from 'react';
import { cooApi } from '../../api/export';
import type { CertificateOfOrigin } from '../../api/export';
import { toast } from 'sonner';

export default function CooPage() {
  const [items, setItems] = useState<CertificateOfOrigin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ cooNo: '', issueDate: '', issuingAuthority: '', destinationCountry: '', invoiceId: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await cooApi.list(); setItems(data.data); } catch { toast.error('Failed to load COO'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    try {
      await cooApi.create({ ...form, invoiceId: parseInt(form.invoiceId) || 0 });
      toast.success('Certificate of Origin created');
      setShowForm(false);
      setForm({ cooNo: '', issueDate: '', issuingAuthority: '', destinationCountry: '', invoiceId: '' });
      load();
    } catch { toast.error('Create COO failed'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Certificate of Origin</h2>
        <button onClick={() => setShowForm(!showForm)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          {showForm ? 'Cancel' : '+ New COO'}
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">New Certificate of Origin</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'COO No', key: 'cooNo' }, { label: 'Issue Date', key: 'issueDate', type: 'date' },
              { label: 'Issuing Authority', key: 'issuingAuthority' }, { label: 'Destination Country', key: 'destinationCountry' },
              { label: 'Invoice ID', key: 'invoiceId', type: 'number' },
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
              {['COO No', 'Issue Date', 'Issuing Authority', 'Destination', 'Status'].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No certificates found</td></tr>
            ) : (
              items.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                  <td className="px-4 py-3 font-medium">{c.cooNo}</td>
                  <td className="px-4 py-3">{c.issueDate ? new Date(c.issueDate).toLocaleDateString() : '-'}</td>
                  <td className="px-4 py-3">{c.issuingAuthority}</td>
                  <td className="px-4 py-3">{c.destinationCountry}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${c.status === 'ISSUED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{c.status}</span></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
