import { useState, useEffect } from 'react';
import { analyticsApi, InventoryAgingRow, InventoryAgingSummary } from '../../api/analytics';
import { toast } from 'sonner';

const BUCKET_COLORS: Record<string, string> = {
  '0-30 days': 'bg-green-500',
  '31-60 days': 'bg-blue-500',
  '61-90 days': 'bg-yellow-500',
  '91-180 days': 'bg-orange-500',
  '180+ days': 'bg-red-500',
};

export default function InventoryAgingReport() {
  const [rows, setRows] = useState<InventoryAgingRow[]>([]);
  const [summary, setSummary] = useState<InventoryAgingSummary>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [bucketFilter, setBucketFilter] = useState('ALL');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await analyticsApi.inventoryAging();
        setSummary(data.data.summary);
        setRows(data.data.rows);
      } catch {
        toast.error('Failed to load inventory aging');
      }
      setLoading(false);
    })();
  }, []);

  const filtered = rows.filter((r) => {
    if (bucketFilter !== 'ALL' && r.agingBucket !== bucketFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return r.materialCode?.toLowerCase().includes(s) || r.materialName?.toLowerCase().includes(s) || r.warehouse?.toLowerCase().includes(s);
    }
    return true;
  });

  const bucketOrder = ['0-30 days', '31-60 days', '61-90 days', '91-180 days', '180+ days'];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Inventory Aging Report</h2>

      {/* Bucket Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {bucketOrder.map((b) => {
          const s = summary[b] ?? { count: 0, totalQty: 0, totalValue: 0 };
          return (
            <button key={b} onClick={() => setBucketFilter(bucketFilter === b ? 'ALL' : b)}
              className={`rounded-xl border p-4 text-left transition ${bucketFilter === b ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-200 dark:border-gray-700'} bg-white dark:bg-gray-800`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`h-3 w-3 rounded-full ${BUCKET_COLORS[b]}`} />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{b}</span>
              </div>
              <p className="text-lg font-bold text-gray-800 dark:text-white">{s.count} items</p>
              <p className="text-xs text-gray-500">{s.totalQty.toLocaleString()} qty · ₹{s.totalValue.toLocaleString()}</p>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="flex justify-end">
        <input type="text" placeholder="Search material / warehouse…" value={search} onChange={(e) => setSearch(e.target.value)} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm w-72" />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {['Material Code', 'Material Name', 'Type', 'Warehouse', 'Qty', 'Value (₹)', 'Last Inward', 'Age (Days)', 'Bucket'].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {loading ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">No data found</td></tr>
            ) : (
              filtered.map((r, i) => (
                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                  <td className="px-4 py-3 font-medium">{r.materialCode}</td>
                  <td className="px-4 py-3">{r.materialName}</td>
                  <td className="px-4 py-3">{r.materialType}</td>
                  <td className="px-4 py-3">{r.warehouse}</td>
                  <td className="px-4 py-3 text-right">{r.qty.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">{r.value.toLocaleString()}</td>
                  <td className="px-4 py-3">{r.lastInwardDate ? new Date(r.lastInwardDate).toLocaleDateString() : 'N/A'}</td>
                  <td className="px-4 py-3 text-right font-medium">{r.agingDays}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium text-white ${BUCKET_COLORS[r.agingBucket] || 'bg-gray-500'}`}>
                      {r.agingBucket}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
