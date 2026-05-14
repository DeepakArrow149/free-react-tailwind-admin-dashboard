import { useEffect, useState, useCallback } from "react";
import { holidayApi } from "../../api/hrm";
import { toastSuccess, toastError } from "../../utils/toast";
import PageMeta from "../../components/common/PageMeta";
import { PaginatedTable } from "../../components/table";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

interface R {
  id: number;
  name: string;
  date: string;
  type: string;
  isOptional: boolean;
}

export default function HolidaysPage() {
  const [holidays, setHolidays] = useState<R[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear().toString());

  // Form
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", date: "", type: "NATIONAL", isOptional: false });

  const fetchHolidays = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await holidayApi.list({ year: Number(year) || undefined });
      setHolidays(resp.data?.data ?? resp.data ?? []);
    } catch { setHolidays([]); }
    setLoading(false);
  }, [year]);

  useEffect(() => { fetchHolidays(); }, [fetchHolidays]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await holidayApi.create(form);
      setShowForm(false);
      setForm({ name: "", date: "", type: "NATIONAL", isOptional: false });
      fetchHolidays();
      toastSuccess("Holiday created");
    } catch (err) { toastError(err, "Failed to create holiday"); }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this holiday?")) return;
    try { await holidayApi.delete(id); fetchHolidays(); toastSuccess("Holiday deleted"); }
    catch (err) { toastError(err, "Failed to delete"); }
  };

  const typeColors: Record<string, string> = {
    NATIONAL: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    RESTRICTED: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    COMPANY: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  };

  const _columns = [
    { header: "Name", accessor: "name" },
    { header: "Date", accessor: (r: R) => r.date ? fmtDate(r.date) : "-" },
    { header: "Type", accessor: (r: R) => (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[r.type] ?? ""}`}>{r.type}</span>
    )},
    { header: "Optional", accessor: (r: R) => r.isOptional ? "Yes" : "No" },
    { header: "", accessor: (r: R) => (
      <button onClick={() => handleDelete(r.id)} className="text-red-600 hover:underline text-sm">Delete</button>
    )},
  ];
  void _columns;

  return (
    <>
      <PageMeta title="Holiday Calendar" description="Manage company holidays and restricted days" />
      <div className="p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Holiday Calendar</h1>
          <div className="flex items-center gap-3">
            <input value={year} onChange={e => setYear(e.target.value)} type="number" placeholder="Year" aria-label="Filter year"
              className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white w-24" />
            <button onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
              {showForm ? "Cancel" : "+ Add Holiday"}
            </button>
          </div>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white dark:bg-gray-800 p-4 rounded-xl border dark:border-gray-700">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Name</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required aria-label="Holiday name"
                className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Date</label>
              <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} required aria-label="Holiday date"
                className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Type</label>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} aria-label="Holiday type"
                className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                <option value="NATIONAL">National</option>
                <option value="RESTRICTED">Restricted</option>
                <option value="COMPANY">Company</option>
              </select>
            </div>
            <div className="flex items-end gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={form.isOptional} onChange={e => setForm(p => ({ ...p, isOptional: e.target.checked }))} />
                Optional
              </label>
              <button type="submit" disabled={saving}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
                {saving ? "Saving…" : "Add"}
              </button>
            </div>
          </form>
        )}

        {loading ? <p className="text-gray-500 dark:text-gray-400">Loading…</p> : (
          <PaginatedTable data={holidays} pageSize={20}>
            {(pageData) => (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b dark:border-gray-700 text-left text-gray-500">
                      <th className="pb-2 pr-3">Name</th><th className="pb-2 pr-3">Date</th>
                      <th className="pb-2 pr-3">Type</th><th className="pb-2 pr-3">Optional</th>
                      <th className="pb-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageData.length === 0 ? (
                      <tr><td colSpan={5} className="py-8 text-center text-gray-400">{`No holidays for ${year}`}</td></tr>
                    ) : pageData.map((r: R) => (
                      <tr key={r.id} className="border-b dark:border-gray-800">
                        <td className="py-2 pr-3">{r.name}</td>
                        <td className="py-2 pr-3">{r.date ? fmtDate(r.date) : "-"}</td>
                        <td className="py-2 pr-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[r.type] ?? ""}`}>{r.type}</span>
                        </td>
                        <td className="py-2 pr-3">{r.isOptional ? "Yes" : "No"}</td>
                        <td className="py-2">
                          <button onClick={() => handleDelete(r.id)} className="text-red-600 hover:underline text-sm">Delete</button>
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
    </>
  );
}
