import { useState, useEffect, useCallback } from 'react';
import { shippingBillApi } from '../../api/export';
import type { ShippingBill } from '../../api/export';
import { toast } from 'sonner';
import { PaginatedTable } from '../../components/table';

const STATUS_FLOW = ['DRAFT', 'FILED', 'LET_EXPORT', 'COMPLETED'];

export default function ShippingBillPage() {
  const [items, setItems] = useState<ShippingBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ sbNo: '', sbDate: '', portOfLoading: '', portOfDischarge: '', fobValue: '', currency: 'USD', invoiceId: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await shippingBillApi.list();
      setItems(data.data || []);
    } catch { toast.error('Failed to load shipping bills'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    try {
      await shippingBillApi.create({ ...form, fobValue: parseFloat(form.fobValue) || 0, invoiceId: parseInt(form.invoiceId) || 0 });
      toast.success('Shipping bill created');
      setShowForm(false);
      setForm({ sbNo: '', sbDate: '', portOfLoading: '', portOfDischarge: '', fobValue: '', currency: 'USD', invoiceId: '' });
      load();
    } catch { toast.error('Failed to create'); }
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      await shippingBillApi.updateStatus(id, { status });
      toast.success(`Status updated to ${status}`);
      load();
    } catch { toast.error('Failed to update status'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Shipping Bills</h2>
        <button onClick={() => setShowForm(!showForm)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          {showForm ? 'Cancel' : '+ New Shipping Bill'}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">New Shipping Bill</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'SB No', key: 'sbNo', type: 'text' },
              { label: 'SB Date', key: 'sbDate', type: 'date' },
              { label: 'Port of Loading', key: 'portOfLoading', type: 'text' },
              { label: 'Port of Discharge', key: 'portOfDischarge', type: 'text' },
              { label: 'FOB Value', key: 'fobValue', type: 'number' },
              { label: 'Currency', key: 'currency', type: 'text' },
              { label: 'Invoice ID', key: 'invoiceId', type: 'number' },
            ].map((f) => (
              <div key={f.key}>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">{f.label}</label>
                <input type={f.type} value={form[f.key as keyof typeof form]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm" />
              </div>
            ))}
          </div>
          <button onClick={handleCreate} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">Create</button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <p className="text-center py-8 text-gray-400">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-center py-8 text-gray-400">No shipping bills found</p>
      ) : (
      <PaginatedTable data={items} pageSize={20}>
        {(pageData) => (
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {['SB No', 'Date', 'Loading Port', 'Discharge Port', 'FOB Value', 'Currency', 'Status', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {pageData.map((sb) => {
                const nextStatus = STATUS_FLOW[STATUS_FLOW.indexOf(sb.status) + 1];
                return (
                  <tr key={sb.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                    <td className="px-4 py-3 font-medium">{sb.sbNo}</td>
                    <td className="px-4 py-3">{sb.sbDate ? new Date(sb.sbDate).toLocaleDateString() : '-'}</td>
                    <td className="px-4 py-3">{sb.portOfLoading}</td>
                    <td className="px-4 py-3">{sb.portOfDischarge}</td>
                    <td className="px-4 py-3 text-right">{sb.fobValue?.toLocaleString()}</td>
                    <td className="px-4 py-3">{sb.currency}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${sb.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : sb.status === 'LET_EXPORT' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>{sb.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      {nextStatus && (
                        <button onClick={() => updateStatus(sb.id, nextStatus)} className="rounded bg-blue-100 dark:bg-blue-900 px-2 py-1 text-xs text-blue-700 dark:text-blue-300 hover:bg-blue-200">
                          → {nextStatus}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
        )}
      </PaginatedTable>
      )}
    </div>
  );
}
