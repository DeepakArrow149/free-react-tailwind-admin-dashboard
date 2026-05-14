import { useState, useEffect } from 'react';
import { analyticsApi, ProductionEfficiencyRow, ProductionEfficiencySummary } from '../../api/analytics';
import { toast } from 'sonner';

export default function ProductionEfficiencyReport() {
  const [rows, setRows] = useState<ProductionEfficiencyRow[]>([]);
  const [summary, setSummary] = useState<ProductionEfficiencySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await analyticsApi.productionEfficiency(from || undefined, to || undefined);
      setSummary(data.data.summary);
      setRows(data.data.rows);
    } catch { toast.error('Failed to load production efficiency'); }
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const filtered = rows.filter(
    (r) =>
      r.poNo?.toLowerCase().includes(search.toLowerCase()) ||
      r.buyer?.toLowerCase().includes(search.toLowerCase()) ||
      r.style?.toLowerCase().includes(search.toLowerCase()),
  );

  const getBarColor = (v: number) => (v >= 80 ? 'bg-green-500' : v >= 50 ? 'bg-yellow-500' : 'bg-red-500');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Production Efficiency Report</h2>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Orders', value: summary.totalOrders, color: 'blue' },
            { label: 'Target Qty', value: summary.totalTarget.toLocaleString(), color: 'purple' },
            { label: 'Output Qty', value: summary.totalOutput.toLocaleString(), color: 'green' },
            { label: 'Reject Qty', value: summary.totalReject.toLocaleString(), color: 'red' },
            { label: 'Avg Efficiency', value: `${summary.avgEfficiency}%`, color: 'orange' },
          ].map((c) => (
            <div key={c.label} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
              <p className="text-sm text-gray-500 dark:text-gray-400">{c.label}</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{c.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm" />
        </div>
        <button onClick={load} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Apply</button>
        <div className="ml-auto">
          <input type="text" placeholder="Search PO / Buyer / Style…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search PO, Buyer, or Style" className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm w-64" />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {['PO No', 'Order', 'Buyer', 'Style', 'Status', 'Target', 'Output', 'Reject', 'Efficiency', 'Reject %'].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {loading ? (
              <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400">No data found</td></tr>
            ) : (
              filtered.map((r, i) => (
                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                  <td className="px-4 py-3 font-medium">{r.poNo}</td>
                  <td className="px-4 py-3">{r.orderNo}</td>
                  <td className="px-4 py-3">{r.buyer}</td>
                  <td className="px-4 py-3">{r.style}</td>
                  <td className="px-4 py-3"><span className="rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 text-xs font-medium">{r.status}</span></td>
                  <td className="px-4 py-3 text-right">{r.targetQty.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">{r.outputQty.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">{r.rejectQty.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-20 rounded-full bg-gray-200 dark:bg-gray-600">
                        <div className={`h-2 rounded-full ${getBarColor(r.efficiency)}`} style={{ width: `${Math.min(100, r.efficiency)}%` }} />
                      </div>
                      <span className="text-xs font-medium">{r.efficiency}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">{r.rejectRate}%</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
