import { useState, useEffect } from 'react';
import { analyticsApi, SupplierScorecardRow } from '../../api/analytics';
import { toast } from 'sonner';

const ratingColors: Record<string, string> = {
  A: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',
  B: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
  C: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300',
  D: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300',
};

export default function SupplierScorecardReport() {
  const [rows, setRows] = useState<SupplierScorecardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState<string>('ALL');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await analyticsApi.supplierScorecard();
        setRows(data.data as unknown as SupplierScorecardRow[]);
      } catch {
        toast.error('Failed to load supplier scorecard');
      }
      setLoading(false);
    })();
  }, []);

  const filtered = rows.filter((r) => {
    if (ratingFilter !== 'ALL' && r.rating !== ratingFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return r.name?.toLowerCase().includes(s) || r.code?.toLowerCase().includes(s) || r.country?.toLowerCase().includes(s);
    }
    return true;
  });

  const ratingCounts = rows.reduce(
    (acc, r) => {
      acc[r.rating] = (acc[r.rating] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Supplier Performance Scorecard</h2>

      {/* Rating distribution */}
      <div className="flex gap-4">
        {['A', 'B', 'C', 'D'].map((r) => (
          <button key={r} onClick={() => setRatingFilter(ratingFilter === r ? 'ALL' : r)}
            className={`flex-1 rounded-xl border p-4 transition ${ratingFilter === r ? 'ring-2 ring-blue-500' : 'border-gray-200 dark:border-gray-700'} bg-white dark:bg-gray-800`}>
            <div className="flex items-center justify-between">
              <span className={`rounded-full px-3 py-1 text-sm font-bold ${ratingColors[r]}`}>Grade {r}</span>
              <span className="text-2xl font-bold text-gray-800 dark:text-white">{ratingCounts[r] || 0}</span>
            </div>
            <p className="mt-1 text-xs text-gray-500">{r === 'A' ? '≥80 score' : r === 'B' ? '60-79' : r === 'C' ? '40-59' : '<40'}</p>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex justify-end">
        <input type="text" placeholder="Search supplier…" value={search} onChange={(e) => setSearch(e.target.value)} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm w-72" />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {['Rank', 'Code', 'Supplier', 'Country', 'POs', 'Value', 'OTD %', 'Quality', 'Overall', 'Grade'].map((h) => (
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
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                  <td className="px-4 py-3 text-center font-medium">{i + 1}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.code}</td>
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3">{r.country}</td>
                  <td className="px-4 py-3 text-right">{r.totalPOs}</td>
                  <td className="px-4 py-3 text-right">₹{r.totalValue.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-16 rounded-full bg-gray-200 dark:bg-gray-600"><div className={`h-2 rounded-full ${r.otdPercentage >= 80 ? 'bg-green-500' : r.otdPercentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${r.otdPercentage}%` }} /></div>
                      <span className="text-xs">{r.otdPercentage}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">{r.qualityScore}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-16 rounded-full bg-gray-200 dark:bg-gray-600"><div className="h-2 rounded-full bg-blue-500" style={{ width: `${r.overallScore}%` }} /></div>
                      <span className="text-xs font-medium">{r.overallScore}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${ratingColors[r.rating]}`}>{r.rating}</span></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
