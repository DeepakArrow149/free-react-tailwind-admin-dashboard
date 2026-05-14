import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { templateBomApi } from "../../api/mrp";
import api from "../../api/client";
import PageMeta from "../../components/common/PageMeta";

interface ItemRow { materialId: number; consumptionPerUnit: number; unit: string; wastagePct: number; remarks: string }
interface MaterialOption { id: number; materialCode: string; materialName: string }

function emptyItem(): ItemRow { return { materialId: 0, consumptionPerUnit: 0, unit: "MTR", wastagePct: 3, remarks: "" }; }

export default function TemplateBomForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [form, setForm] = useState({ templateCode: "", templateName: "", garmentType: "", description: "", isActive: true });
  const [items, setItems] = useState<ItemRow[]>([emptyItem()]);

  useEffect(() => { api.get("/master/materials", { params: { limit: 500 } }).then(r => setMaterials(r.data.data || [])); }, []);

  useEffect(() => {
    if (!isEdit) return;
    templateBomApi.get(Number(id)).then(r => {
      const d = r.data.data;
      setForm({ templateCode: d.templateCode, templateName: d.templateName, garmentType: d.garmentType || "", description: d.description || "", isActive: d.isActive });
      setItems(d.items.map((i: any) => ({ materialId: i.materialId, consumptionPerUnit: Number(i.consumptionPerUnit), unit: i.unit, wastagePct: Number(i.wastagePct), remarks: i.remarks || "" })));
    });
  }, [id, isEdit]);

  const updateItem = (idx: number, field: string, val: any) => setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: val } : it));
  const addItem = () => setItems(prev => [...prev, emptyItem()]);
  const removeItem = (idx: number) => { if (items.length > 1) setItems(prev => prev.filter((_, i) => i !== idx)); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { ...form, items: items.filter(it => it.materialId > 0) };
      if (isEdit) await templateBomApi.update(Number(id), payload); else await templateBomApi.create(payload);
      navigate("/mrp/template-boms");
    } catch (err: any) { alert(err?.response?.data?.message || "Save failed"); } finally { setSaving(false); }
  };

  return (
    <>
      <PageMeta title={`${isEdit ? "Edit" : "New"} Template BOM | ERP TRACK`} description="Template BOM Form" />
      <div className="space-y-6">
        <div className="flex items-center justify-between"><h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">{isEdit ? "Edit" : "New"} Template BOM</h2>
          <button onClick={() => navigate("/mrp/template-boms")} className="text-sm text-brand-500 hover:underline">← Back</button></div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="mb-1 block text-sm font-medium">Template Code *</label><input required value={form.templateCode} onChange={e => setForm(f => ({ ...f, templateCode: e.target.value }))} className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 focus:border-brand-300 focus:outline-none" /></div>
              <div><label className="mb-1 block text-sm font-medium">Template Name *</label><input required value={form.templateName} onChange={e => setForm(f => ({ ...f, templateName: e.target.value }))} className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 focus:border-brand-300 focus:outline-none" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="mb-1 block text-sm font-medium">Garment Type</label><input value={form.garmentType} onChange={e => setForm(f => ({ ...f, garmentType: e.target.value }))} className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 focus:border-brand-300 focus:outline-none" /></div>
              <div><label className="mb-1 block text-sm font-medium">Description</label><input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 focus:border-brand-300 focus:outline-none" /></div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
            <div className="mb-3 flex items-center justify-between"><h3 className="font-medium">Items</h3><button type="button" onClick={addItem} className="text-sm text-brand-500">+ Add Item</button></div>
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <select value={it.materialId} onChange={e => updateItem(idx, "materialId", Number(e.target.value))} className="col-span-4 h-9 rounded border border-gray-300 bg-transparent px-2 text-sm dark:border-gray-700">
                    <option value={0}>Select Material</option>
                    {materials.map(m => <option key={m.id} value={m.id}>{m.materialCode} - {m.materialName}</option>)}
                  </select>
                  <input type="number" step="0.001" placeholder="Consumption" value={it.consumptionPerUnit || ""} onChange={e => updateItem(idx, "consumptionPerUnit", Number(e.target.value))} className="col-span-2 h-9 rounded border border-gray-300 bg-transparent px-2 text-sm dark:border-gray-700" />
                  <select value={it.unit} onChange={e => updateItem(idx, "unit", e.target.value)} className="col-span-2 h-9 rounded border border-gray-300 bg-transparent px-2 text-sm dark:border-gray-700">
                    {["MTR", "KG", "PCS", "DOZ", "SET", "YRD"].map(u => <option key={u}>{u}</option>)}
                  </select>
                  <input type="number" step="0.1" placeholder="Wastage%" value={it.wastagePct || ""} onChange={e => updateItem(idx, "wastagePct", Number(e.target.value))} className="col-span-2 h-9 rounded border border-gray-300 bg-transparent px-2 text-sm dark:border-gray-700" />
                  <div className="col-span-2 flex gap-1">
                    <input placeholder="Remarks" value={it.remarks} onChange={e => updateItem(idx, "remarks", e.target.value)} className="h-9 flex-1 rounded border border-gray-300 bg-transparent px-2 text-sm dark:border-gray-700" />
                    <button type="button" onClick={() => removeItem(idx)} className="text-red-500 text-xs px-1">✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => navigate("/mrp/template-boms")} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium dark:border-gray-700">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-brand-500 px-6 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
          </div>
        </form>
      </div>
    </>
  );
}
