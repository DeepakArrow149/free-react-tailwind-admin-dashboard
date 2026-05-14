import { useEffect, useState, useCallback } from "react";
import { designationApi, Designation } from "../../api/hrm";
import { toastSuccess, toastError } from "../../utils/toast";
import PageMeta from "../../components/common/PageMeta";
import { PaginatedTable } from "../../components/table";

export default function DesignationsPage() {
  const [rows, setRows] = useState<Designation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", level: "1" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await designationApi.list();
      const d = r.data?.data ?? r.data ?? [];
      setRows(Array.isArray(d) ? d : []);
    } catch { setRows([]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    try {
      await designationApi.create({ name: form.name, level: Number(form.level) });
      setShowAdd(false);
      setForm({ name: "", level: "1" });
      load();
      toastSuccess("Designation created");
    } catch (e) { toastError(e, "Failed"); }
  };

  return (
    <>
      <PageMeta title="Designations" description="Manage designations" />
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Designations</h1>
          <button onClick={() => setShowAdd(true)}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">+ New</button>
        </div>

        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-sm rounded-xl bg-white dark:bg-gray-800 p-6 shadow-xl space-y-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Add Designation</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Name</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Level</label>
                  <input type="number" min={1} value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">Cancel</button>
                <button onClick={handleCreate} disabled={!form.name}
                  className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">Save</button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-gray-400 py-8 text-center">Loading…</p>
        ) : (
          <PaginatedTable data={rows} pageSize={20}>
            {(pageData) => (
          <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {["Name", "Level"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {pageData.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{r.name}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{r.level}</td>
                  </tr>
                ))}
                {pageData.length === 0 && (
                  <tr><td colSpan={2} className="px-4 py-8 text-center text-gray-400">No designations</td></tr>
                )}
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
