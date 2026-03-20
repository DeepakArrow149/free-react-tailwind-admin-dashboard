import { useEffect, useState, useCallback } from "react";
import { shiftApi, Shift } from "../../api/hrm";
import { toastSuccess, toastError } from "../../utils/toast";
import PageMeta from "../../components/common/PageMeta";

export default function ShiftsPage() {
  const [rows, setRows] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const blankForm = { code: "", name: "", startTime: "09:00", endTime: "18:00", breakMinutes: "60", isNightShift: false, isActive: true };
  const [form, setForm] = useState(blankForm);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await shiftApi.list();
      const d = r.data?.data ?? r.data ?? [];
      setRows(Array.isArray(d) ? d : []);
    } catch { setRows([]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openEdit = (s: Shift) => {
    setEditId(s.id);
    setForm({ code: s.code, name: s.name, startTime: s.startTime, endTime: s.endTime, breakMinutes: String(s.breakMinutes), isNightShift: s.isNightShift, isActive: s.isActive });
    setShowAdd(true);
  };

  const handleSave = async () => {
    try {
      const payload = { code: form.code, name: form.name, startTime: form.startTime, endTime: form.endTime, breakMinutes: Number(form.breakMinutes), isNightShift: form.isNightShift, isActive: form.isActive };
      if (editId) await shiftApi.update(editId, payload);
      else await shiftApi.create(payload);
      setShowAdd(false);
      setEditId(null);
      setForm(blankForm);
      load();
      toastSuccess(editId ? "Shift updated" : "Shift created");
    } catch (e) { toastError(e, "Failed"); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this shift?")) return;
    try { await shiftApi.delete(id); load(); toastSuccess("Deleted"); } catch (e) { toastError(e, "Cannot delete"); }
  };

  return (
    <>
      <PageMeta title="Shifts" description="Manage employee shifts" />
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Shifts</h1>
          <button onClick={() => { setEditId(null); setForm(blankForm); setShowAdd(true); }}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">+ New Shift</button>
        </div>

        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-md rounded-xl bg-white dark:bg-gray-800 p-6 shadow-xl space-y-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">{editId ? "Edit" : "Add"} Shift</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Code</label>
                  <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })}
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Name</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Start Time</label>
                  <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">End Time</label>
                  <input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Break (mins)</label>
                  <input type="number" value={form.breakMinutes} onChange={(e) => setForm({ ...form, breakMinutes: e.target.value })}
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
                </div>
                <div className="flex items-end pb-1 gap-4">
                  <label className="flex items-center gap-1 text-xs text-gray-700 dark:text-gray-300">
                    <input type="checkbox" checked={form.isNightShift} onChange={(e) => setForm({ ...form, isNightShift: e.target.checked })} /> Night
                  </label>
                  <label className="flex items-center gap-1 text-xs text-gray-700 dark:text-gray-300">
                    <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => { setShowAdd(false); setEditId(null); }} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">Cancel</button>
                <button onClick={handleSave} disabled={!form.code || !form.name}
                  className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">Save</button>
              </div>
            </div>
          </div>
        )}

        {loading ? <p className="text-gray-400 py-8 text-center">Loading…</p> : (
          <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {["Code", "Name", "Start", "End", "Break", "Night", "Active", "Employees", ""].map((h) => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {rows.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-3 py-3 font-medium text-gray-900 dark:text-white">{s.code}</td>
                    <td className="px-3 py-3 text-gray-700 dark:text-gray-300">{s.name}</td>
                    <td className="px-3 py-3 text-gray-600 dark:text-gray-400">{s.startTime}</td>
                    <td className="px-3 py-3 text-gray-600 dark:text-gray-400">{s.endTime}</td>
                    <td className="px-3 py-3 text-center text-gray-600 dark:text-gray-400">{s.breakMinutes}m</td>
                    <td className="px-3 py-3">{s.isNightShift ? "🌙" : "—"}</td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400" : "bg-gray-100 text-gray-500"}`}>{s.isActive ? "Yes" : "No"}</span>
                    </td>
                    <td className="px-3 py-3 text-center text-gray-600 dark:text-gray-400">{s._count?.employees ?? 0}</td>
                    <td className="px-3 py-3 flex gap-1">
                      <button onClick={() => openEdit(s)} className="text-xs text-blue-600 hover:underline">Edit</button>
                      <button onClick={() => handleDelete(s.id)} className="text-xs text-red-600 hover:underline">Del</button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">No shifts</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
