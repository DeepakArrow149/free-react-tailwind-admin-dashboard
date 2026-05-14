import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { processApi } from "../../api/mrp";
import PageMeta from "../../components/common/PageMeta";

const TYPES = ["CUTTING", "SEWING", "WASHING", "PRINTING", "EMBROIDERY", "FINISHING", "PACKING", "OTHER"];

export default function ProcessForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ processCode: "", processName: "", processType: "SEWING", description: "", sequence: 0, defaultSam: 0, isActive: true });

  useEffect(() => {
    if (!isEdit) return;
    processApi.get(Number(id)).then(r => {
      const d = r.data.data;
      setForm({ processCode: d.processCode, processName: d.processName, processType: d.processType, description: d.description || "", sequence: d.sequence, defaultSam: Number(d.defaultSam || 0), isActive: d.isActive });
    });
  }, [id, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) await processApi.update(Number(id), form);
      else await processApi.create(form);
      navigate("/mrp/processes");
    } catch (err: any) { alert(err?.response?.data?.message || "Save failed"); } finally { setSaving(false); }
  };

  return (
    <>
      <PageMeta title={`${isEdit ? "Edit" : "New"} Process | ERP TRACK`} description="Process form" />
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">{isEdit ? "Edit" : "New"} Process</h2>
          <button onClick={() => navigate("/mrp/processes")} className="text-sm text-brand-500 hover:underline">← Back</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Process Code *</label>
              <input required value={form.processCode} onChange={e => setForm(f => ({ ...f, processCode: e.target.value }))} className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 focus:border-brand-300 focus:outline-none" /></div>
            <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Process Name *</label>
              <input required value={form.processName} onChange={e => setForm(f => ({ ...f, processName: e.target.value }))} className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 focus:border-brand-300 focus:outline-none" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Type *</label>
              <select value={form.processType} onChange={e => setForm(f => ({ ...f, processType: e.target.value }))} className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 focus:border-brand-300 focus:outline-none">
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select></div>
            <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Sequence</label>
              <input type="number" value={form.sequence} onChange={e => setForm(f => ({ ...f, sequence: Number(e.target.value) }))} className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 focus:border-brand-300 focus:outline-none" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Default SAM (min)</label>
              <input type="number" step="0.01" value={form.defaultSam} onChange={e => setForm(f => ({ ...f, defaultSam: Number(e.target.value) }))} className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 focus:border-brand-300 focus:outline-none" /></div>
            <div className="flex items-end"><label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="rounded border-gray-300 text-brand-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
            </label></div>
          </div>
          <div><label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700 focus:border-brand-300 focus:outline-none" /></div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => navigate("/mrp/processes")} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-300">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-brand-500 px-6 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
          </div>
        </form>
      </div>
    </>
  );
}
