import { useState } from "react";
import PageMeta from "@/components/common/PageMeta";
import {
  useBreakdownCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useStoppageReasons,
  useCreateStoppageReason,
  useUpdateStoppageReason,
  useDeleteStoppageReason,
} from "@/hooks/useMaintenance";
import type { BreakdownCategory, StoppageReason } from "@/api/maintenance";

export default function MaintenanceLookupsPage() {
  // ── Breakdown Categories ──
  const { data: catsRaw, isLoading: loadingCats } = useBreakdownCategories();
  const categories: BreakdownCategory[] = Array.isArray(catsRaw) ? catsRaw : [];
  const createCat = useCreateCategory();
  const updateCat = useUpdateCategory();
  const deleteCat = useDeleteCategory();

  const [catForm, setCatForm] = useState({ code: "", name: "", description: "" });
  const [editCatId, setEditCatId] = useState<number | null>(null);

  // ── Stoppage Reasons ──
  const { data: srRaw, isLoading: loadingSr } = useStoppageReasons();
  const reasons: StoppageReason[] = Array.isArray(srRaw) ? srRaw : [];
  const createSr = useCreateStoppageReason();
  const updateSr = useUpdateStoppageReason();
  const deleteSr = useDeleteStoppageReason();

  const [srForm, setSrForm] = useState({ code: "", name: "", category: "", description: "" });
  const [editSrId, setEditSrId] = useState<number | null>(null);

  // ── Category handlers ──
  const handleSaveCat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catForm.code || !catForm.name) return;
    if (editCatId) {
      updateCat.mutate({ id: editCatId, data: { name: catForm.name, description: catForm.description || undefined } }, {
        onSuccess: () => { setEditCatId(null); setCatForm({ code: "", name: "", description: "" }); },
      });
    } else {
      createCat.mutate({ code: catForm.code, name: catForm.name, description: catForm.description || undefined }, {
        onSuccess: () => setCatForm({ code: "", name: "", description: "" }),
      });
    }
  };

  const handleEditCat = (c: BreakdownCategory) => {
    setEditCatId(c.id);
    setCatForm({ code: c.code, name: c.name, description: c.description ?? "" });
  };

  const handleDeleteCat = (id: number) => {
    if (confirm("Delete this category?")) deleteCat.mutate(id);
  };

  // ── Stoppage Reason handlers ──
  const handleSaveSr = (e: React.FormEvent) => {
    e.preventDefault();
    if (!srForm.code || !srForm.name || !srForm.category) return;
    if (editSrId) {
      updateSr.mutate({ id: editSrId, data: { name: srForm.name, category: srForm.category, description: srForm.description || undefined } }, {
        onSuccess: () => { setEditSrId(null); setSrForm({ code: "", name: "", category: "", description: "" }); },
      });
    } else {
      createSr.mutate({ code: srForm.code, name: srForm.name, category: srForm.category, description: srForm.description || undefined }, {
        onSuccess: () => setSrForm({ code: "", name: "", category: "", description: "" }),
      });
    }
  };

  const handleEditSr = (s: StoppageReason) => {
    setEditSrId(s.id);
    setSrForm({ code: s.code, name: s.name, category: s.category, description: s.description ?? "" });
  };

  const handleDeleteSr = (id: number) => {
    if (confirm("Delete this stoppage reason?")) deleteSr.mutate(id);
  };

  return (
    <>
      <PageMeta title="Maintenance Lookups" description="Breakdown categories & stoppage reasons" />
      <div className="space-y-6">
        {/* ── BREAKDOWN CATEGORIES ── */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white/90">Breakdown Categories</h3>

          <form onSubmit={handleSaveCat} className="flex gap-3 flex-wrap mb-4">
            <input
              className="border rounded px-3 py-1.5 text-sm w-24 dark:bg-gray-800 dark:border-gray-700"
              placeholder="Code"
              value={catForm.code}
              onChange={e => setCatForm(f => ({ ...f, code: e.target.value }))}
              disabled={!!editCatId}
              required
            />
            <input
              className="border rounded px-3 py-1.5 text-sm w-40 dark:bg-gray-800 dark:border-gray-700"
              placeholder="Name"
              value={catForm.name}
              onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))}
              required
            />
            <input
              className="border rounded px-3 py-1.5 text-sm w-48 dark:bg-gray-800 dark:border-gray-700"
              placeholder="Description (optional)"
              value={catForm.description}
              onChange={e => setCatForm(f => ({ ...f, description: e.target.value }))}
            />
            <button type="submit" disabled={createCat.isPending || updateCat.isPending} className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm font-medium disabled:opacity-50">
              {editCatId ? "Update" : "Add"}
            </button>
            {editCatId && (
              <button type="button" onClick={() => { setEditCatId(null); setCatForm({ code: "", name: "", description: "" }); }} className="px-3 py-1.5 border rounded text-sm dark:border-gray-600 dark:text-gray-300">
                Cancel
              </button>
            )}
          </form>

          {loadingCats ? <p className="text-sm text-gray-500">Loading…</p> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-xs font-medium text-gray-500 uppercase">
                  <th className="pb-2 pr-3">Code</th>
                  <th className="pb-2 pr-3">Name</th>
                  <th className="pb-2 pr-3">Description</th>
                  <th className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map(c => (
                  <tr key={c.id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-2 pr-3 font-mono text-xs">{c.code}</td>
                    <td className="py-2 pr-3">{c.name}</td>
                    <td className="py-2 pr-3 text-xs text-gray-500">{c.description ?? '—'}</td>
                    <td className="py-2 flex gap-2">
                      <button onClick={() => handleEditCat(c)} className="text-blue-600 hover:underline text-xs">Edit</button>
                      <button onClick={() => handleDeleteCat(c.id)} className="text-red-600 hover:underline text-xs">Del</button>
                    </td>
                  </tr>
                ))}
                {categories.length === 0 && (
                  <tr><td colSpan={4} className="py-4 text-center text-gray-400">No categories yet</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* ── STOPPAGE REASONS ── */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white/90">Stoppage Reasons</h3>

          <form onSubmit={handleSaveSr} className="flex gap-3 flex-wrap mb-4">
            <input
              className="border rounded px-3 py-1.5 text-sm w-24 dark:bg-gray-800 dark:border-gray-700"
              placeholder="Code"
              value={srForm.code}
              onChange={e => setSrForm(f => ({ ...f, code: e.target.value }))}
              disabled={!!editSrId}
              required
            />
            <input
              className="border rounded px-3 py-1.5 text-sm w-40 dark:bg-gray-800 dark:border-gray-700"
              placeholder="Name"
              value={srForm.name}
              onChange={e => setSrForm(f => ({ ...f, name: e.target.value }))}
              required
            />
            <input
              className="border rounded px-3 py-1.5 text-sm w-32 dark:bg-gray-800 dark:border-gray-700"
              placeholder="Category"
              value={srForm.category}
              onChange={e => setSrForm(f => ({ ...f, category: e.target.value }))}
              required
            />
            <input
              className="border rounded px-3 py-1.5 text-sm w-44 dark:bg-gray-800 dark:border-gray-700"
              placeholder="Description"
              value={srForm.description}
              onChange={e => setSrForm(f => ({ ...f, description: e.target.value }))}
            />
            <button type="submit" disabled={createSr.isPending || updateSr.isPending} className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm font-medium disabled:opacity-50">
              {editSrId ? "Update" : "Add"}
            </button>
            {editSrId && (
              <button type="button" onClick={() => { setEditSrId(null); setSrForm({ code: "", name: "", category: "", description: "" }); }} className="px-3 py-1.5 border rounded text-sm dark:border-gray-600 dark:text-gray-300">
                Cancel
              </button>
            )}
          </form>

          {loadingSr ? <p className="text-sm text-gray-500">Loading…</p> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-xs font-medium text-gray-500 uppercase">
                  <th className="pb-2 pr-3">Code</th>
                  <th className="pb-2 pr-3">Name</th>
                  <th className="pb-2 pr-3">Category</th>
                  <th className="pb-2 pr-3">Description</th>
                  <th className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reasons.map(r => (
                  <tr key={r.id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-2 pr-3 font-mono text-xs">{r.code}</td>
                    <td className="py-2 pr-3">{r.name}</td>
                    <td className="py-2 pr-3 text-xs">{r.category}</td>
                    <td className="py-2 pr-3 text-xs text-gray-500">{r.description ?? '—'}</td>
                    <td className="py-2 flex gap-2">
                      <button onClick={() => handleEditSr(r)} className="text-blue-600 hover:underline text-xs">Edit</button>
                      <button onClick={() => handleDeleteSr(r.id)} className="text-red-600 hover:underline text-xs">Del</button>
                    </td>
                  </tr>
                ))}
                {reasons.length === 0 && (
                  <tr><td colSpan={5} className="py-4 text-center text-gray-400">No stoppage reasons yet</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
