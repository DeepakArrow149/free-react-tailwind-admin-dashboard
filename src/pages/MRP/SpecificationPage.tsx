import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router";
import { specificationApi } from "../../api/mrp";
import PageMeta from "../../components/common/PageMeta";
import { toast } from "sonner";
import { useSpecTypes } from '@/hooks/useMasterLookups';

const SPEC_TYPES = ["MEASUREMENT", "CONSTRUCTION", "BUYER_REQ", "WASH_CARE", "PACKAGING"];

interface Spec { id?: number; specType: string; specKey: string; specValue: string; unit: string; tolerance: string; sortOrder: number; isMandatory: boolean }

export default function SpecificationPage() {
  const { orderId } = useParams();
  const oid = Number(orderId);
  const [specs, setSpecs] = useState<Spec[]>([]);
  const [typeFilter, setTypeFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data: resp } = await specificationApi.listForOrder(oid, typeFilter ? { specType: typeFilter } : undefined);
      setSpecs(resp.data.map((s: any) => ({ id: s.id, specType: s.specType, specKey: s.specKey, specValue: s.specValue, unit: s.unit || "", tolerance: s.tolerance || "", sortOrder: s.sortOrder, isMandatory: s.isMandatory })));
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [oid, typeFilter]);

  useEffect(() => { fetch(); }, [fetch]);

  const addRow = () => setSpecs(prev => [...prev, { specType: typeFilter || "MEASUREMENT", specKey: "", specValue: "", unit: "", tolerance: "", sortOrder: (prev.length + 1) * 10, isMandatory: false }]);
  const updateRow = (idx: number, field: string, val: any) => setSpecs(prev => prev.map((s, i) => i === idx ? { ...s, [field]: val } : s));
  const removeRow = (idx: number) => setSpecs(prev => prev.filter((_, i) => i !== idx));

  const handleBulkSave = async () => {
    const items = specs.filter(s => s.specKey && s.specValue);
    if (items.length === 0) { toast.error("Add at least 1 specification"); return; }
    setSaving(true);
    try { await specificationApi.bulkCreate(oid, items); toast.success("Specifications saved"); fetch(); }
    catch (err: any) { toast.error(err?.response?.data?.message || "Save failed"); }
    finally { setSaving(false); }
  };

  const typeSections = SPEC_TYPES.filter(t => !typeFilter || t === typeFilter);

  return (
    <>
      <PageMeta title={`Specifications - Order ${oid} | ERP TRACK`} description="Garment specifications" />
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Garment Specifications — Order #{oid}</h2>
          <div className="flex gap-2">
            <button onClick={addRow} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700">+ Add Spec</button>
            <button onClick={handleBulkSave} disabled={saving} className="rounded-lg bg-brand-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">{saving ? "Saving..." : "Save All"}</button>
          </div>
        </div>

        <div className="flex gap-2">
          <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); }} className="h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700">
            <option value="">All Types</option>{SPEC_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>

        {loading ? <p className="py-8 text-center text-gray-400">Loading...</p> : typeSections.map(type => {
          const filtered = specs.filter(s => s.specType === type);
          if (filtered.length === 0 && typeFilter) return null;
          return (
            <div key={type} className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase">{type.replace("_", " ")}</h3>
              <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/3">
                {filtered.length === 0 ? <p className="text-sm text-gray-400">No specs in this category</p>
                : filtered.map((s) => {
                  const idx = specs.indexOf(s);
                  return (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center mb-2">
                      <input placeholder="Key" value={s.specKey} onChange={e => updateRow(idx, "specKey", e.target.value)} className="col-span-3 h-9 rounded border border-gray-300 bg-transparent px-2 text-sm dark:border-gray-700" />
                      <input placeholder="Value" value={s.specValue} onChange={e => updateRow(idx, "specValue", e.target.value)} className="col-span-3 h-9 rounded border border-gray-300 bg-transparent px-2 text-sm dark:border-gray-700" />
                      <input placeholder="Unit" value={s.unit} onChange={e => updateRow(idx, "unit", e.target.value)} className="col-span-1 h-9 rounded border border-gray-300 bg-transparent px-2 text-sm dark:border-gray-700" />
                      <input placeholder="Tolerance" value={s.tolerance} onChange={e => updateRow(idx, "tolerance", e.target.value)} className="col-span-2 h-9 rounded border border-gray-300 bg-transparent px-2 text-sm dark:border-gray-700" />
                      <label className="col-span-1 flex items-center gap-1"><input type="checkbox" checked={s.isMandatory} onChange={e => updateRow(idx, "isMandatory", e.target.checked)} /><span className="text-xs">Req</span></label>
                      <button onClick={() => removeRow(idx)} className="col-span-2 text-red-500 text-xs">Remove</button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
