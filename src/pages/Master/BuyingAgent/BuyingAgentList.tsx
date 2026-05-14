import { useEffect, useState } from "react";
import { masterApi, type BuyingAgent } from "../../../api/master";
import PageMeta from "../../../components/common/PageMeta";

export default function BuyingAgentList() {
  const [items, setItems] = useState<BuyingAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ code: "", name: "", contactPerson: "", phone: "", email: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function fetchData() {
    setLoading(true);
    try {
      const { data: resp } = await masterApi.listBuyingAgents();
      setItems(resp.data || []);
    } catch (err) {
      console.error("Failed to fetch buying agents:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  function startEdit(item: BuyingAgent) {
    setEditId(item.id);
    setForm({ code: item.code, name: item.name, contactPerson: item.contactPerson || "", phone: item.phone || "", email: item.email || "" });
    setShowForm(true);
  }

  function resetForm() {
    setEditId(null);
    setForm({ code: "", name: "", contactPerson: "", phone: "", email: "" });
    setShowForm(false);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim()) { setError("Code and Name are required"); return; }
    setSaving(true);
    setError("");
    try {
      if (editId) {
        await masterApi.updateBuyingAgent(editId, form);
      } else {
        await masterApi.createBuyingAgent(form);
      }
      resetForm();
      fetchData();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr?.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this buying agent?")) return;
    try {
      await masterApi.deleteBuyingAgent(id);
      fetchData();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      alert(axiosErr?.response?.data?.message || "Failed to delete");
    }
  }

  return (
    <>
      <PageMeta title="Buying Agents | ERP TRACK" description="Manage buying agents" />
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3 p-5 lg:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Buying Agent Master</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{items.length} agent(s)</p>
          </div>
          <button onClick={() => { if (showForm) { resetForm(); } else { setShowForm(true); } }} className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600">
            {showForm ? "Cancel" : (
              <><svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M10 4.167v11.666M4.167 10h11.666" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>Add Agent</>
            )}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Code *</label>
                <input type="text" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="e.g. AGT01" className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white focus:border-brand-500 focus:ring-brand-500" maxLength={20} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Name *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Agent name" className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white focus:border-brand-500 focus:ring-brand-500" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Contact Person</label>
                <input type="text" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} placeholder="Contact person" className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white focus:border-brand-500 focus:ring-brand-500" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
                <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone" className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white focus:border-brand-500 focus:ring-brand-500" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white focus:border-brand-500 focus:ring-brand-500" />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-4">
              <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 disabled:opacity-50">{saving ? "Saving..." : editId ? "Update" : "Save"}</button>
              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
          </form>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" /></div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400"><p className="text-sm">No buying agents added yet</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="py-3 px-4 text-left font-medium text-gray-500 dark:text-gray-400">Code</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-500 dark:text-gray-400">Name</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-500 dark:text-gray-400">Contact</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-500 dark:text-gray-400">Phone</th>
                  <th className="py-3 px-4 text-right font-medium text-gray-500 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/2">
                    <td className="py-3 px-4 font-medium text-gray-800 dark:text-white/90">{item.code}</td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{item.name}</td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{item.contactPerson || "—"}</td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{item.phone || "—"}</td>
                    <td className="py-3 px-4 text-right">
                      <button onClick={() => startEdit(item)} className="text-brand-500 hover:text-brand-700 text-xs font-medium mr-3">Edit</button>
                      <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700 text-xs font-medium">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
