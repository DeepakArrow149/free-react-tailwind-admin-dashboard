import { useState, useEffect } from 'react';
import { analyticsApi, StylePnlRow, StylePnlSummary } from '../../api/analytics';
import { toast } from 'sonner';

export default function StylePnlReport() {
  const [rows, setRows] = useState<StylePnlRow[]>([]);
  const [summary, setSummary] = useState<StylePnlSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await analyticsApi.stylePnl();
        setSummary(data.data.summary);
        setRows(data.data.rows);
      } catch {
        toast.error('Failed to load style P&L');
      }
      setLoading(false);
    })();
  }, []);

  const filtered = rows.filter((r) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return r.orderNo?.toLowerCase().includes(s) || r.buyer?.toLowerCase().includes(s) || r.style?.toLowerCase().includes(s);
  });

  const profitableCount = rows.filter((r) => r.grossProfit > 0).length;
  const lossCount = rows.filter((r) => r.grossProfit < 0).length;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Style-wise P&L Report</h2>

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Total Orders', value: summary.totalOrders, sub: `${profitableCount} profitable, ${lossCount} loss` },
            { label: 'Total Revenue', value: `₹${summary.totalRevenue.toLocaleString()}`, sub: '' },
            { label: 'Total Cost', value: `₹${summary.totalCost.toLocaleString()}`, sub: '' },
            { label: 'Gross Profit', value: `₹${summary.totalProfit.toLocaleString()}`, sub: summary.totalProfit >= 0 ? '↑ Positive' : '↓ Loss' },
            { label: 'Avg Margin', value: `${summary.avgMargin}%`, sub: '' },
          ].map((c) => (
            <div key={c.label} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">{c.label}</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{c.value}</p>
              {c.sub && <p className="text-xs text-gray-400 mt-0.5">{c.sub}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="flex justify-end">
        <input type="text" placeholder="Search order / buyer / style…" value={search} onChange={(e) => setSearch(e.target.value)} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm w-72" />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {['Order', 'Buyer', 'Style', 'Status', 'Qty', 'Revenue', 'Cost/Pc', 'Total Cost', 'Fabric', 'Trim', 'CMT', 'Profit', 'Margin %'].map((h) => (
                <th key={h} className="px-3 py-3 text-left font-medium text-gray-600 dark:text-gray-300 text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {loading ? (
              <tr><td colSpan={13} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={13} className="px-4 py-8 text-center text-gray-400">No data found</td></tr>
            ) : (
              filtered.map((r, i) => (
                <tr key={i} className={`hover:bg-gray-50 dark:hover:bg-gray-750 ${r.grossProfit < 0 ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}>
                  <td className="px-3 py-2.5 font-medium text-xs">{r.orderNo}</td>
                  <td className="px-3 py-2.5 text-xs">{r.buyer}</td>
                  <td className="px-3 py-2.5 text-xs">{r.style}</td>
                  <td className="px-3 py-2.5"><span className="rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 text-xs">{r.status}</span></td>
                  <td className="px-3 py-2.5 text-right text-xs">{r.qty?.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right text-xs">₹{r.revenue.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right text-xs">₹{r.costPerPiece.toFixed(2)}</td>
                  <td className="px-3 py-2.5 text-right text-xs">₹{r.totalCost.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right text-xs">₹{r.fabricCost.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right text-xs">₹{r.trimCost.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right text-xs">₹{r.cmtCost.toLocaleString()}</td>
                  <td className={`px-3 py-2.5 text-right text-xs font-bold ${r.grossProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    ₹{r.grossProfit.toLocaleString()}
                  </td>
                  <td className="px-3 py-2.5 text-right text-xs">
                    <span className={`font-medium ${r.marginPct >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{r.marginPct}%</span>
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
