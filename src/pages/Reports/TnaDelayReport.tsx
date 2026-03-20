import { useState, useEffect } from 'react';
import { analyticsApi, TnaDelayRow, TnaDelaySummary } from '../../api/analytics';
import { toast } from 'sonner';

export default function TnaDelayReport() {
  const [rows, setRows] = useState<TnaDelayRow[]>([]);
  const [summary, setSummary] = useState<TnaDelaySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await analyticsApi.tnaDelays();
        setSummary(data.data.summary);
        setRows(data.data.rows);
      } catch {
        toast.error('Failed to load T&A data');
      }
      setLoading(false);
    })();
  }, []);

  const filtered = rows.filter((r) => {
    if (statusFilter === 'OVERDUE' && !r.isOverdue) return false;
    if (statusFilter === 'COMPLETED' && r.status !== 'COMPLETED') return false;
    if (statusFilter === 'PENDING' && r.status === 'COMPLETED') return false;
    if (search) {
      const s = search.toLowerCase();
      return r.orderNo?.toLowerCase().includes(s) || r.buyer?.toLowerCase().includes(s) || r.activity?.toLowerCase().includes(s);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white">T&A Delay Analysis</h2>

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {[
            { label: 'Total Activities', value: summary.totalActivities, color: 'bg-blue-50 dark:bg-blue-900/30' },
            { label: 'Completed', value: summary.completed, color: 'bg-green-50 dark:bg-green-900/30' },
            { label: 'Pending', value: summary.pending, color: 'bg-yellow-50 dark:bg-yellow-900/30' },
            { label: 'Overdue', value: summary.overdue, color: 'bg-red-50 dark:bg-red-900/30' },
            { label: 'Avg Delay', value: `${summary.avgDelayDays}d`, color: 'bg-orange-50 dark:bg-orange-900/30' },
            { label: 'Max Delay', value: `${summary.maxDelay}d`, color: 'bg-purple-50 dark:bg-purple-900/30' },
          ].map((c) => (
            <div key={c.label} className={`rounded-xl border border-gray-200 dark:border-gray-700 p-4 ${c.color}`}>
              <p className="text-sm text-gray-500 dark:text-gray-400">{c.label}</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{c.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        {(['ALL', 'OVERDUE', 'PENDING', 'COMPLETED'] as const).map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${statusFilter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
            {s}
          </button>
        ))}
        <input type="text" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="ml-auto rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm w-64" />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {['Order', 'Buyer', 'Style', 'Activity', 'Planned Date', 'Actual Date', 'Status', 'Delay (Days)'].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No data found</td></tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className={`hover:bg-gray-50 dark:hover:bg-gray-750 ${r.isOverdue ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}>
                  <td className="px-4 py-3 font-medium">{r.orderNo}</td>
                  <td className="px-4 py-3">{r.buyer}</td>
                  <td className="px-4 py-3">{r.style}</td>
                  <td className="px-4 py-3">{r.activity}</td>
                  <td className="px-4 py-3">{r.plannedDate ? new Date(r.plannedDate).toLocaleDateString() : '-'}</td>
                  <td className="px-4 py-3">{r.actualDate ? new Date(r.actualDate).toLocaleDateString() : '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.status === 'COMPLETED' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'}`}>{r.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    {r.isOverdue ? (<span className="font-bold text-red-600 dark:text-red-400">{r.delayDays}d</span>) : (<span className="text-gray-400">—</span>)}
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
