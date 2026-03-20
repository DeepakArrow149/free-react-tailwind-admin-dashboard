import { useState, useEffect } from 'react';
import { analyticsApi, BuyerAnalysisRow, BuyerAnalysisSummary } from '../../api/analytics';
import { toast } from 'sonner';

export default function BuyerAnalysisReport() {
  const [rows, setRows] = useState<BuyerAnalysisRow[]>([]);
  const [summary, setSummary] = useState<BuyerAnalysisSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await analyticsApi.buyerAnalysis();
        setSummary(data.data.summary);
        setRows(data.data.rows);
      } catch {
        toast.error('Failed to load buyer analysis');
      }
      setLoading(false);
    })();
  }, []);

  const filtered = rows.filter((r) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return r.name?.toLowerCase().includes(s) || r.code?.toLowerCase().includes(s) || r.country?.toLowerCase().includes(s);
  });

  const maxValue = Math.max(...rows.map((r) => r.totalValue), 1);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Buyer-wise Order Analysis</h2>

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Active Buyers', value: summary.totalBuyers },
            { label: 'Total Orders', value: summary.totalOrders },
            { label: 'Total Qty', value: summary.totalQty.toLocaleString() },
            { label: 'Total Value', value: `₹${summary.totalValue.toLocaleString()}` },
          ].map((c) => (
            <div key={c.label} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">{c.label}</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{c.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="flex justify-end">
        <input type="text" placeholder="Search buyer…" value={search} onChange={(e) => setSearch(e.target.value)} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm w-72" />
      </div>

      {/* Table + Bar */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {['#', 'Code', 'Buyer', 'Country', 'Currency', 'Orders', 'Qty', 'Value', 'Share', 'Status Breakdown'].map((h) => (
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
              filtered.map((r, i) => {
                const pct = Math.round((r.totalValue / maxValue) * 100);
                return (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                    <td className="px-4 py-3 text-center">{i + 1}</td>
                    <td className="px-4 py-3 font-mono text-xs">{r.code}</td>
                    <td className="px-4 py-3 font-medium">{r.name}</td>
                    <td className="px-4 py-3">{r.country}</td>
                    <td className="px-4 py-3">{r.currency}</td>
                    <td className="px-4 py-3 text-right">{r.totalOrders}</td>
                    <td className="px-4 py-3 text-right">{r.totalQty.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-medium">₹{r.totalValue.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="h-2 w-24 rounded-full bg-gray-200 dark:bg-gray-600">
                        <div className="h-2 rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(r.byStatus).map(([st, v]) => (
                          <span key={st} className="rounded bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 text-xs">{st}: {v.count}</span>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
