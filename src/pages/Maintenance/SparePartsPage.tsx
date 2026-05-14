import { useState } from "react";
import PageMeta from "@/components/common/PageMeta";
import { PaginatedTable } from "@/components/table";
import {
  useSpareParts,
  useCreateSparePart,
  useUpdateSparePart,
  useDeleteSparePart,
  useAdjustStock,
  useLowStock,
} from "@/hooks/useMaintenance";
import type { SparePart, CreateSparePartPayload } from "@/api/maintenance";

function fmtCurrency(val: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val);
}

const TABS = ["Inventory", "Create", "Low Stock"] as const;
type Tab = (typeof TABS)[number];

const emptyForm: CreateSparePartPayload = {
  partCode: "",
  partName: "",
  uom: "PCS",
  currentStock: 0,
  reorderLevel: 5,
  reorderQty: 10,
  unitCost: 0,
};

export default function SparePartsPage() {
  const [tab, setTab] = useState<Tab>("Inventory");
  const [form, setForm] = useState<CreateSparePartPayload>({ ...emptyForm });
  const [editId, setEditId] = useState<number | null>(null);
  const [adjustId, setAdjustId] = useState<number | null>(null);
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustReason, setAdjustReason] = useState("");

  // Data
  const { data: partsRaw, isLoading } = useSpareParts();
  const parts: SparePart[] = Array.isArray(partsRaw)
    ? partsRaw
    : (partsRaw as { data?: SparePart[] })?.data ?? [];
  const { data: lowStockRaw } = useLowStock();
  const lowStockParts: SparePart[] = Array.isArray(lowStockRaw) ? lowStockRaw : [];

  // Mutations
  const createPart = useCreateSparePart();
  const updatePart = useUpdateSparePart();
  const deletePart = useDeleteSparePart();
  const adjustStock = useAdjustStock();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.partCode || !form.partName) return;
    if (editId) {
      updatePart.mutate({ id: editId, data: form }, {
        onSuccess: () => { setEditId(null); setForm({ ...emptyForm }); setTab("Inventory"); },
      });
    } else {
      createPart.mutate(form, {
        onSuccess: () => { setForm({ ...emptyForm }); setTab("Inventory"); },
      });
    }
  };

  const handleEdit = (p: SparePart) => {
    setEditId(p.id);
    setForm({
      partCode: p.partCode,
      partName: p.partName,
      uom: p.uom,
      currentStock: p.currentStock,
      reorderLevel: p.reorderLevel,
      reorderQty: p.reorderQty,
      unitCost: p.unitCost,
      category: p.category ?? undefined,
      location: p.location ?? undefined,
    });
    setTab("Create");
  };

  const handleAdjust = () => {
    if (!adjustId || !adjustQty || !adjustReason) return;
    adjustStock.mutate({ id: adjustId, adjustment: adjustQty, reason: adjustReason }, {
      onSuccess: () => { setAdjustId(null); setAdjustQty(0); setAdjustReason(""); },
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this spare part?")) deletePart.mutate(id);
  };

  const isLow = (p: SparePart) => p.currentStock <= p.reorderLevel;

  return (
    <>
      <PageMeta title="Spare Parts" description="Spare parts inventory management" />
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white/90">Spare Parts</h3>

        {/* Tabs */}
        <div className="flex space-x-2 mb-4 border-b border-gray-200 dark:border-gray-700">
          {TABS.map(t => (
            <button key={t} onClick={() => { setTab(t); if (t !== "Create") setEditId(null); }} className={`px-4 py-2 -mb-px text-sm font-medium ${tab === t ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"}`}>
              {t}{t === "Low Stock" && lowStockParts.length > 0 ? ` (${lowStockParts.length})` : ""}
            </button>
          ))}
        </div>

        {/* ── INVENTORY TAB ── */}
        {tab === "Inventory" && (
          isLoading ? <p className="text-sm text-gray-500">Loading…</p> : (
            <PaginatedTable pageSize={15}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-xs font-medium text-gray-500 uppercase">
                    <th className="pb-2 pr-3">Code</th>
                    <th className="pb-2 pr-3">Name</th>
                    <th className="pb-2 pr-3">UOM</th>
                    <th className="pb-2 pr-3">Stock</th>
                    <th className="pb-2 pr-3">Reorder Lvl</th>
                    <th className="pb-2 pr-3">Unit Cost</th>
                    <th className="pb-2 pr-3">Location</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {parts.map(p => (
                    <tr key={p.id} className={`border-b border-gray-100 dark:border-gray-800 ${isLow(p) ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
                      <td className="py-2 pr-3 font-mono text-xs">{p.partCode}</td>
                      <td className="py-2 pr-3">{p.partName}</td>
                      <td className="py-2 pr-3 text-xs">{p.uom}</td>
                      <td className="py-2 pr-3">
                        <span className={isLow(p) ? "text-red-600 font-bold dark:text-red-400" : ""}>{p.currentStock}</span>
                      </td>
                      <td className="py-2 pr-3 text-xs">{p.reorderLevel}</td>
                      <td className="py-2 pr-3 text-xs">{fmtCurrency(p.unitCost)}</td>
                      <td className="py-2 pr-3 text-xs">{p.location ?? '—'}</td>
                      <td className="py-2 flex gap-1">
                        <button onClick={() => handleEdit(p)} className="text-blue-600 hover:underline text-xs">Edit</button>
                        <button onClick={() => setAdjustId(p.id)} className="text-green-600 hover:underline text-xs">Adjust</button>
                        <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:underline text-xs">Del</button>
                      </td>
                    </tr>
                  ))}
                  {parts.length === 0 && (
                    <tr><td colSpan={8} className="py-6 text-center text-gray-400">No spare parts</td></tr>
                  )}
                </tbody>
              </table>
            </PaginatedTable>
          )
        )}

        {/* ── CREATE/EDIT TAB ── */}
        {tab === "Create" && (
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Part Code *</label>
              <input className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700" value={form.partCode} onChange={e => setForm(f => ({ ...f, partCode: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Part Name *</label>
              <input className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700" value={form.partName} onChange={e => setForm(f => ({ ...f, partName: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">UOM</label>
              <input className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700" value={form.uom} onChange={e => setForm(f => ({ ...f, uom: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Category</label>
              <input className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700" value={form.category ?? ""} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Current Stock</label>
              <input type="number" min={0} className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700" value={form.currentStock ?? 0} onChange={e => setForm(f => ({ ...f, currentStock: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Reorder Level</label>
              <input type="number" min={0} className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700" value={form.reorderLevel ?? 5} onChange={e => setForm(f => ({ ...f, reorderLevel: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Reorder Qty</label>
              <input type="number" min={1} className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700" value={form.reorderQty ?? 10} onChange={e => setForm(f => ({ ...f, reorderQty: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Unit Cost (₹)</label>
              <input type="number" min={0} step="0.01" className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700" value={form.unitCost ?? 0} onChange={e => setForm(f => ({ ...f, unitCost: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Location</label>
              <input className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700" value={form.location ?? ""} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <button type="submit" disabled={createPart.isPending || updatePart.isPending} className="px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
                {editId ? "Update" : "Create"} Part
              </button>
              {editId && (
                <button type="button" onClick={() => { setEditId(null); setForm({ ...emptyForm }); }} className="px-5 py-2 border rounded text-sm dark:border-gray-600 dark:text-gray-300">
                  Cancel
                </button>
              )}
            </div>
          </form>
        )}

        {/* ── LOW STOCK TAB ── */}
        {tab === "Low Stock" && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-xs font-medium text-gray-500 uppercase">
                  <th className="pb-2 pr-3">Code</th>
                  <th className="pb-2 pr-3">Name</th>
                  <th className="pb-2 pr-3">Current Stock</th>
                  <th className="pb-2 pr-3">Reorder Level</th>
                  <th className="pb-2">Deficit</th>
                </tr>
              </thead>
              <tbody>
                {lowStockParts.map(p => (
                  <tr key={p.id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-2 pr-3 font-mono text-xs">{p.partCode}</td>
                    <td className="py-2 pr-3">{p.partName}</td>
                    <td className="py-2 pr-3 text-red-600 font-bold dark:text-red-400">{p.currentStock}</td>
                    <td className="py-2 pr-3">{p.reorderLevel}</td>
                    <td className="py-2 text-red-600 dark:text-red-400">{p.reorderLevel - p.currentStock}</td>
                  </tr>
                ))}
                {lowStockParts.length === 0 && (
                  <tr><td colSpan={5} className="py-6 text-center text-gray-400">All parts adequately stocked</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Adjust Stock Modal */}
        {adjustId && (
          <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-sm shadow-xl">
              <h4 className="text-base font-semibold mb-4 dark:text-white">Adjust Stock</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Quantity (+/-)</label>
                  <input type="number" className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700" value={adjustQty} onChange={e => setAdjustQty(Number(e.target.value))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Reason</label>
                  <input className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700" value={adjustReason} onChange={e => setAdjustReason(e.target.value)} placeholder="e.g. Physical count correction" />
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={handleAdjust} disabled={!adjustQty || !adjustReason || adjustStock.isPending} className="px-4 py-2 bg-green-600 text-white rounded text-sm font-medium disabled:opacity-50">
                    Adjust
                  </button>
                  <button onClick={() => setAdjustId(null)} className="px-4 py-2 border rounded text-sm dark:border-gray-600 dark:text-gray-300">Cancel</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
