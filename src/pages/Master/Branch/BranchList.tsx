import { useEffect, useState } from "react";
import { masterApi, type BranchMaster, type CompanyMaster } from "../../../api/master";
import PageMeta from "../../../components/common/PageMeta";

export default function BranchList() {
  const [items, setItems] = useState<BranchMaster[]>([]);
  const [companies, setCompanies] = useState<CompanyMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ code: "", name: "", companyId: 0, address: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function fetchData() {
    setLoading(true);
    try {
      const [branchRes, companyRes] = await Promise.all([
        masterApi.listBranches(),
        masterApi.listCompanies(),
      ]);
      setItems(branchRes.data.data || []);
      setCompanies(companyRes.data.data || []);
    } catch (err) {
      console.error("Failed to fetch branches:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  function startEdit(item: BranchMaster) {
    setEditId(item.id);
    setForm({ code: item.code, name: item.name, companyId: item.companyId, address: item.address || "", phone: item.phone || "" });
    setShowForm(true);
  }

  function resetForm() {
    setEditId(null);
    setForm({ code: "", name: "", companyId: 0, address: "", phone: "" });
    setShowForm(false);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim() || !form.companyId) {
      setError("Code, Name, and Company are required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (editId) {
        await masterApi.updateBranch(editId, form);
      } else {
        await masterApi.createBranch(form);
      }
      resetForm();
      fetchData();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr?.response?.data?.message || "Failed to save branch");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this branch?")) return;
    try {
      await masterApi.deleteBranch(id);
      fetchData();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      alert(axiosErr?.response?.data?.message || "Failed to delete");
    }
  }

  const companyName = (id: number) => companies.find((c) => c.id === id)?.name || "—";

  return (
    <>
      <PageMeta title="Branches | ERP TRACK" description="Manage branch master" />
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3 p-5 lg:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Branch Master</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{items.length} branch(es)</p>
          </div>
          <button onClick={() => { showForm ? resetForm() : setShowForm(true); }} className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600">
            {showForm ? "Cancel" : (
              <><svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M10 4.167v11.666M4.167 10h11.666" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>Add Branch</>
            )}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Code *</label>
                <input type="text" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="e.g. BR01" className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white focus:border-brand-500 focus:ring-brand-500" maxLength={20} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Name *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Branch name" className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white focus:border-brand-500 focus:ring-brand-500" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Company *</label>
                <select value={form.companyId} onChange={(e) => setForm({ ...form, companyId: Number(e.target.value) })} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white focus:border-brand-500 focus:ring-brand-500">
                  <option value={0}>Select Company</option>
                  {companies.map((c) => (<option key={c.id} value={c.id}>{c.code} — {c.name}</option>))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
                <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone" className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white focus:border-brand-500 focus:ring-brand-500" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Address</label>
                <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Address" className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white focus:border-brand-500 focus:ring-brand-500" />
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
          <div className="flex flex-col items-center justify-center py-16 text-gray-400"><p className="text-sm">No branches added yet</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="py-3 px-4 text-left font-medium text-gray-500 dark:text-gray-400">Code</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-500 dark:text-gray-400">Name</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-500 dark:text-gray-400">Company</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-500 dark:text-gray-400">Phone</th>
                  <th className="py-3 px-4 text-right font-medium text-gray-500 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/2">
                    <td className="py-3 px-4 font-medium text-gray-800 dark:text-white/90">{item.code}</td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{item.name}</td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{companyName(item.companyId)}</td>
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
