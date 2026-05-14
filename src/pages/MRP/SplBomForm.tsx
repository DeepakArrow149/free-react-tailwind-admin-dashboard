import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { splBomApi } from "../../api/mrp";
import api from "../../api/client";
import PageMeta from "../../components/common/PageMeta";

interface ItemRow { materialId: number; consumptionPerUnit: number; unit: string; wastagePct: number; remarks: string }
function emptyItem(): ItemRow { return { materialId: 0, consumptionPerUnit: 0, unit: "MTR", wastagePct: 3, remarks: "" }; }

export default function SplBomForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [materials, setMaterials] = useState<any[]>([]);
  const [form, setForm] = useState({ bomNo: "", orderId: 0, processId: 0, description: "" });
  const [items, setItems] = useState<ItemRow[]>([emptyItem()]);
  const [status, setStatus] = useState("DRAFT");

  useEffect(() => { api.get("/master/materials", { params: { limit: 500 } }).then(r => setMaterials(r.data.data || [])); }, []);

  useEffect(() => {
    if (!isEdit) return;
    splBomApi.get(Number(id)).then(r => {
      const d = r.data.data;
      setForm({ bomNo: d.bomNo, orderId: d.orderId, processId: d.processId, description: d.description || "" });
      setStatus(d.status);
      setItems(d.items.map((i: any) => ({ materialId: i.materialId, consumptionPerUnit: Number(i.consumptionPerUnit), unit: i.unit, wastagePct: Number(i.wastagePct), remarks: i.remarks || "" })));
    });
  }, [id, isEdit]);

  const updateItem = (idx: number, field: string, val: any) => setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: val } : it));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = isEdit ? { description: form.description, items: items.filter(it => it.materialId > 0) } : { ...form, items: items.filter(it => it.materialId > 0) };
      if (isEdit) await splBomApi.update(Number(id), payload); else await splBomApi.create(payload);
      navigate("/mrp/spl-bom");
    } catch (err: any) { alert(err?.response?.data?.message || "Save failed"); } finally { setSaving(false); }
  };

  const handleStatusChange = async (newStatus: string) => {
    try { await splBomApi.update(Number(id), { status: newStatus }); setStatus(newStatus); } catch { alert("Status update failed"); }
  };

  return (
    <>
      <PageMeta title={`${isEdit ? "Edit" : "New"} SPL BOM | ERP TRACK`} description="SPL Process BOM Form" />
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">{isEdit ? "Edit" : "New"} SPL Process BOM</h2>
          <div className="flex gap-2">
            {isEdit && status === "DRAFT" && <button onClick={() => handleStatusChange("APPROVED")} className="rounded-lg bg-green-500 px-3 py-1.5 text-xs text-white">Approve</button>}
            {isEdit && status === "APPROVED" && <button onClick={() => handleStatusChange("LOCKED")} className="rounded-lg bg-blue-500 px-3 py-1.5 text-xs text-white">Lock</button>}
            <button onClick={() => navigate("/mrp/spl-bom")} className="text-sm text-brand-500 hover:underline">← Back</button>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3 grid grid-cols-2 gap-4">
            {!isEdit && <>
              <div><label className="mb-1 block text-sm font-medium">BOM No *</label><input required value={form.bomNo} onChange={e => setForm(f => ({ ...f, bomNo: e.target.value }))} className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700" /></div>
              <div><label className="mb-1 block text-sm font-medium">Order ID *</label><input required type="number" value={form.orderId || ""} onChange={e => setForm(f => ({ ...f, orderId: Number(e.target.value) }))} className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700" /></div>
              <div><label className="mb-1 block text-sm font-medium">Process ID *</label><input required type="number" value={form.processId || ""} onChange={e => setForm(f => ({ ...f, processId: Number(e.target.value) }))} className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700" /></div>
            </>}
            <div className={isEdit ? "col-span-2" : ""}><label className="mb-1 block text-sm font-medium">Description</label><input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700" /></div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
            <div className="mb-3 flex items-center justify-between"><h3 className="font-medium">Items</h3><button type="button" onClick={() => setItems(p => [...p, emptyItem()])} className="text-sm text-brand-500">+ Add</button></div>
            {items.map((it, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center mb-2">
                <select value={it.materialId} onChange={e => updateItem(idx, "materialId", Number(e.target.value))} className="col-span-4 h-9 rounded border border-gray-300 bg-transparent px-2 text-sm dark:border-gray-700"><option value={0}>Material...</option>{materials.map(m => <option key={m.id} value={m.id}>{m.materialCode} - {m.materialName}</option>)}</select>
                <input type="number" step="0.001" placeholder="Cons/Unit" value={it.consumptionPerUnit || ""} onChange={e => updateItem(idx, "consumptionPerUnit", Number(e.target.value))} className="col-span-2 h-9 rounded border border-gray-300 bg-transparent px-2 text-sm dark:border-gray-700" />
                <select value={it.unit} onChange={e => updateItem(idx, "unit", e.target.value)} className="col-span-2 h-9 rounded border border-gray-300 bg-transparent px-2 text-sm dark:border-gray-700">{["MTR", "KG", "PCS", "DOZ", "SET"].map(u => <option key={u}>{u}</option>)}</select>
                <input type="number" step="0.1" placeholder="Waste%" value={it.wastagePct || ""} onChange={e => updateItem(idx, "wastagePct", Number(e.target.value))} className="col-span-2 h-9 rounded border border-gray-300 bg-transparent px-2 text-sm dark:border-gray-700" />
                <button type="button" onClick={() => { if (items.length > 1) setItems(p => p.filter((_, i) => i !== idx)); }} className="col-span-2 text-red-500 text-xs">✕</button>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => navigate("/mrp/spl-bom")} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium dark:border-gray-700">Cancel</button>
            <button type="submit" disabled={saving || status === "LOCKED"} className="rounded-lg bg-brand-500 px-6 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
          </div>
        </form>
      </div>
    </>
  );
}
