import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { allowanceApi } from "../../api/mrp";
import PageMeta from "../../components/common/PageMeta";
import { useMaterialTypes, useAllowanceTypes } from '@/hooks/useMasterLookups';

const _AF_MAT_DEFAULTS = ["SHELL_FABRIC", "LINING", "INTERLINING", "TRIM", "ACCESSORY", "PACKING", "THREAD", "LABEL", "OTHER"];
const _AF_ALLOW_DEFAULTS = ["CUTTING_LOSS", "SHRINKAGE", "DEFECT", "EXTRA", "OTHER"];

export default function AllowanceForm() {
  const { data: MATERIAL_TYPES = _AF_MAT_DEFAULTS } = useMaterialTypes();
  const { data: ALLOWANCE_TYPES = _AF_ALLOW_DEFAULTS } = useAllowanceTypes();
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ allowanceName: "", materialType: "SHELL_FABRIC", processId: null as number | null, allowancePct: 0, allowanceType: "CUTTING_LOSS", isDefault: false, isActive: true });

  useEffect(() => {
    if (!isEdit) return;
    allowanceApi.get(Number(id)).then(r => { const d = r.data.data; setForm({ allowanceName: d.allowanceName, materialType: d.materialType, processId: d.processId, allowancePct: Number(d.allowancePct), allowanceType: d.allowanceType, isDefault: d.isDefault, isActive: d.isActive }); });
  }, [id, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try { if (isEdit) await allowanceApi.update(Number(id), form); else await allowanceApi.create(form); navigate("/mrp/allowances"); } catch (err: any) { alert(err?.response?.data?.message || "Save failed"); } finally { setSaving(false); }
  };

  return (
    <>
      <PageMeta title={`${isEdit ? "Edit" : "New"} Allowance | ERP TRACK`} description="Allowance form" />
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between"><h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">{isEdit ? "Edit" : "New"} Allowance</h2>
          <button onClick={() => navigate("/mrp/allowances")} className="text-sm text-brand-500 hover:underline">← Back</button></div>
        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
          <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Name *</label>
            <input required value={form.allowanceName} onChange={e => setForm(f => ({ ...f, allowanceName: e.target.value }))} className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 focus:border-brand-300 focus:outline-none" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Material Type</label>
              <select value={form.materialType} onChange={e => setForm(f => ({ ...f, materialType: e.target.value }))} className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 focus:border-brand-300 focus:outline-none">{MATERIAL_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
            <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Allowance Type</label>
              <select value={form.allowanceType} onChange={e => setForm(f => ({ ...f, allowanceType: e.target.value }))} className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 focus:border-brand-300 focus:outline-none">{ALLOWANCE_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Allowance % *</label>
              <input required type="number" step="0.1" min="0" max="100" value={form.allowancePct} onChange={e => setForm(f => ({ ...f, allowancePct: Number(e.target.value) }))} className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 focus:border-brand-300 focus:outline-none" /></div>
            <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Process ID (optional)</label>
              <input type="number" value={form.processId || ""} onChange={e => setForm(f => ({ ...f, processId: e.target.value ? Number(e.target.value) : null }))} className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 focus:border-brand-300 focus:outline-none" /></div>
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.isDefault} onChange={e => setForm(f => ({ ...f, isDefault: e.target.checked }))} className="rounded border-gray-300 text-brand-500" /><span className="text-sm">Default</span></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="rounded border-gray-300 text-brand-500" /><span className="text-sm">Active</span></label>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => navigate("/mrp/allowances")} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium dark:border-gray-700">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-brand-500 px-6 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
          </div>
        </form>
      </div>
    </>
  );
}
