import { useEffect, useState, useCallback } from "react";
import { hourlyApi } from "../../api/production";
import PageMeta from "../../components/common/PageMeta";

interface HourlyEntry {
  hour: string;
  target: number;
  actual: number;
  defects: number;
  remarks?: string;
}

interface HourlySummary {
  totalTarget: number;
  totalActual: number;
  totalDefects: number;
  efficiency: string;
}

const HOUR_SLOTS = [
  "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00",
];

export default function HourlyProductionPage() {
  const [poId, setPoId] = useState("");
  const [lineNo, setLineNo] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [entries, setEntries] = useState<HourlyEntry[]>([]);
  const [summary, setSummary] = useState<HourlySummary | null>(null);
  const [loading, setLoading] = useState(false);

  // ── New entry form ──
  const [form, setForm] = useState({ hour: "08:00", target: "", actual: "", defects: "0", remarks: "" });
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!poId) return;
    setLoading(true);
    try {
      const [listResp, sumResp] = await Promise.all([
        hourlyApi.list({ productionOrderId: poId, lineNo: lineNo || undefined, date }),
        hourlyApi.summary(Number(poId), date),
      ]);
      setEntries(listResp.data ?? listResp ?? []);
      setSummary(sumResp.data ?? sumResp ?? null);
    } catch { setEntries([]); setSummary(null); }
    setLoading(false);
  }, [poId, lineNo, date]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poId) return;
    setSaving(true);
    try {
      await hourlyApi.create({
        productionOrderId: Number(poId),
        lineNo: lineNo || undefined,
        productionDate: date,
        hour: form.hour,
        target: Number(form.target) || 0,
        actual: Number(form.actual) || 0,
        defects: Number(form.defects) || 0,
        remarks: form.remarks || undefined,
      });
      setForm({ hour: "08:00", target: "", actual: "", defects: "0", remarks: "" });
      fetchData();
      toastSuccess("Entry saved");
    } catch (e) { toastError(e, "Failed to save entry"); }
    setSaving(false);
  };

  return (
    <>
      <PageMeta title="Hourly Production" description="Track hourly production output and defects" />
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Hourly Production</h1>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <input placeholder="Production Order ID" value={poId} onChange={e => setPoId(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white w-48" />
          <input placeholder="Line No" value={lineNo} onChange={e => setLineNo(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white w-32" />
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
        </div>

        {loading ? (
          <p className="text-gray-500 dark:text-gray-400">Loading…</p>
        ) : (
          <>
            {/* Hour Grid */}
            <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Hour</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Target</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actual</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Defects</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Efficiency %</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {HOUR_SLOTS.map((slot) => {
                    const entry = entries.find((e) => e.hour === slot);
                    const eff = entry && entry.target > 0 ? ((entry.actual / entry.target) * 100).toFixed(1) : "—";
                    return (
                      <tr key={slot} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{slot}</td>
                        <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{entry?.target ?? "—"}</td>
                        <td className={`px-4 py-3 text-right font-medium ${entry && entry.actual < (entry.target ?? 0) ? "text-red-600" : "text-green-600"}`}>
                          {entry?.actual ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">{entry?.defects ?? "—"}</td>
                        <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{eff}</td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{entry?.remarks ?? ""}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Add Entry */}
            {poId && (
              <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow space-y-3">
                <h3 className="font-semibold text-gray-800 dark:text-gray-200">Add Entry</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <select value={form.hour} onChange={e => setForm(f => ({ ...f, hour: e.target.value }))}
                    className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    {HOUR_SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <input placeholder="Target" value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))}
                    className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" type="number" required />
                  <input placeholder="Actual" value={form.actual} onChange={e => setForm(f => ({ ...f, actual: e.target.value }))}
                    className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" type="number" required />
                  <input placeholder="Defects" value={form.defects} onChange={e => setForm(f => ({ ...f, defects: e.target.value }))}
                    className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" type="number" />
                  <input placeholder="Remarks" value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))}
                    className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                </div>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                  {saving ? "Saving…" : "Add"}
                </button>
              </form>
            )}

            {/* Summary */}
            {summary && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">Day Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{summary.totalTarget ?? 0}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total Target</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{summary.totalActual ?? 0}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total Actual</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">{summary.totalDefects ?? 0}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total Defects</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">{summary.efficiency ?? "—"}%</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Efficiency</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
