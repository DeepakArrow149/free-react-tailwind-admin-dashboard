import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router";
import {
  bomApi,
  type BomFull,
  type BomItemInput,
  type CreateBomInput,
} from "../../../api/costing";
import api from "../../../api/client";
import PageMeta from "../../../components/common/PageMeta";
import { useMaterialTypes } from '@/hooks/useMasterLookups';

interface StyleOption { id: number; styleNo: string; styleName: string }
interface MaterialOption { id: number; materialCode: string; materialName: string }
interface SupplierOption { id: number; code: string; name: string }

const _BOM_MAT_DEFAULTS = [
  "SHELL_FABRIC", "LINING", "INTERLINING", "TRIM", "ACCESSORY", "PACKING", "THREAD",
];
const UNITS = ["MTR", "KG", "PCS", "DOZ", "SET", "ROLL", "YRD"];

function emptyItem(): BomItemInput {
  return {
    materialType: "SHELL_FABRIC",
    itemDescription: "",
    materialId: null,
    supplierId: null,
    unit: "MTR",
    consumptionPerPiece: 0,
    wastagePct: 3,
    unitPrice: 0,
    colorScope: "ALL",
    sizeScope: "ALL",
    applicableColors: null,
    applicableSizes: null,
    remarks: null,
  };
}

function calcItemCost(item: BomItemInput) {
  const consumption = Number(item.consumptionPerPiece) * (1 + Number(item.wastagePct) / 100);
  return Math.round(consumption * Number(item.unitPrice) * 100) / 100;
}

export default function BomForm() {
  const { data: MATERIAL_TYPES = _BOM_MAT_DEFAULTS } = useMaterialTypes();
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [styleId, setStyleId] = useState<number>(0);
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<BomItemInput[]>([emptyItem()]);
  const [status, setStatus] = useState("DRAFT");
  const [bomNo, setBomNo] = useState("");
  const [version, setVersion] = useState(1);

  // Dropdown data
  const [styles, setStyles] = useState<StyleOption[]>([]);
  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);

  // Load dropdown data
  useEffect(() => {
    Promise.all([
      api.get("/master/styles", { params: { limit: 500 } }),
      api.get("/master/materials", { params: { limit: 500 } }),
      api.get("/master/suppliers", { params: { limit: 500 } }),
    ]).then(([stylesRes, materialsRes, suppliersRes]) => {
      setStyles(stylesRes.data.data || []);
      setMaterials(materialsRes.data.data || []);
      setSuppliers(suppliersRes.data.data || []);
    });
  }, []);

  // Load existing BOM
  const loadBom = useCallback(async () => {
    if (!isEdit) return;
    setLoading(true);
    try {
      const { data: resp } = await bomApi.get(Number(id));
      const bom: BomFull = resp.data;
      setBomNo(bom.bomNo);
      setVersion(bom.version);
      setStyleId(bom.styleId);
      setDescription(bom.description || "");
      setStatus(bom.status);
      setItems(
        bom.items.map((item) => ({
          materialType: item.materialType,
          itemDescription: item.itemDescription,
          materialId: item.materialId ?? null,
          supplierId: item.supplierId ?? null,
          unit: item.unit,
          consumptionPerPiece: Number(item.consumptionPerPiece),
          wastagePct: Number(item.wastagePct),
          unitPrice: Number(item.unitPrice),
          colorScope: item.colorScope,
          sizeScope: item.sizeScope,
          applicableColors: item.applicableColors as string[] | null,
          applicableSizes: item.applicableSizes as string[] | null,
          remarks: item.remarks ?? null,
        }))
      );
    } catch {
      setError("Failed to load BOM");
    } finally {
      setLoading(false);
    }
  }, [id, isEdit]);

  useEffect(() => { loadBom(); }, [loadBom]);

  // Item handlers
  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };
  const updateItem = (index: number, field: string, value: unknown) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const grandTotal = items.reduce((sum, item) => sum + calcItemCost(item), 0);

  // Save
  const handleSave = async () => {
    setError("");
    if (!styleId) { setError("Please select a style"); return; }
    if (items.some((it) => !it.itemDescription.trim())) { setError("All items must have a description"); return; }

    setSaving(true);
    try {
      const payload: CreateBomInput = { styleId, description: description || undefined, items };
      if (isEdit) {
        await bomApi.update(Number(id), { description: description || undefined, items });
      } else {
        await bomApi.create(payload);
      }
      navigate("/costing/bom");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  // Status actions
  const handleStatusChange = async (newStatus: string) => {
    try {
      await bomApi.updateStatus(Number(id), newStatus);
      loadBom();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(message || "Status update failed");
    }
  };

  if (loading) return <div className="flex justify-center py-20 text-gray-400">Loading...</div>;

  const isDraft = status === "DRAFT";

  return (
    <>
      <PageMeta title={`${isEdit ? "Edit" : "New"} BOM | ERP TRACK`} description="Bill of Materials form" />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
              {isEdit ? `BOM: ${bomNo} (v${version})` : "New Bill of Materials"}
            </h2>
            {isEdit && (
              <span className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                status === "DRAFT" ? "bg-gray-100 text-gray-700" :
                status === "APPROVED" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
              }`}>
                {status}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {isEdit && status === "DRAFT" && (
              <button onClick={() => handleStatusChange("APPROVED")} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
                Approve
              </button>
            )}
            {isEdit && status === "APPROVED" && (
              <button onClick={() => handleStatusChange("LOCKED")} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                Lock
              </button>
            )}
            <button onClick={() => navigate("/costing/bom")} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800">
              Back
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-300 bg-red-100 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800">
            {error}
          </div>
        )}

        {/* Style & Description */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Style *</label>
              <select
                aria-label="Style"
                title="Style"
                value={styleId}
                onChange={(e) => setStyleId(Number(e.target.value))}
                disabled={isEdit}
                className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 dark:text-white/90 dark:border-gray-700 disabled:opacity-50"
              >
                <option value={0}>Select Style</option>
                {styles.map((s) => (
                  <option key={s.id} value={s.id}>{s.styleNo} — {s.styleName}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={!isDraft}
                placeholder="BOM description / notes"
                className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 dark:text-white/90 dark:border-gray-700 disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        {/* BOM Items Grid */}
        <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3 dark:border-gray-800">
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">BOM Items</h3>
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold text-gray-700 dark:text-white/80">
                Grand Total: <span className="text-brand-500">${grandTotal.toFixed(2)}</span> /pc
              </span>
              {isDraft && (
                <button onClick={addItem} className="inline-flex items-center gap-1 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Add Item
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  {["#", "Type", "Description", "Material", "Supplier", "Unit", "Cons/Pc", "Waste%", "Price", "Cost/Pc", ""].map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const lineCost = calcItemCost(item);
                  return (
                    <tr key={index} className="border-b border-gray-50 dark:border-gray-800">
                      <td className="px-3 py-2 text-gray-400">{index + 1}</td>
                      <td className="px-3 py-2">
                        <select
                          aria-label="Material type"
                          title="Material type"
                          value={item.materialType}
                          onChange={(e) => updateItem(index, "materialType", e.target.value)}
                          disabled={!isDraft}
                          className="h-8 w-28 rounded border border-gray-200 bg-transparent px-1 text-xs dark:border-gray-700 disabled:opacity-50"
                        >
                          {MATERIAL_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={item.itemDescription}
                          onChange={(e) => updateItem(index, "itemDescription", e.target.value)}
                          disabled={!isDraft}
                          placeholder="e.g. 100% Cotton Twill"
                          className="h-8 w-44 rounded border border-gray-200 bg-transparent px-2 text-xs dark:border-gray-700 disabled:opacity-50"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          aria-label="Material"
                          title="Material"
                          value={item.materialId ?? ""}
                          onChange={(e) => updateItem(index, "materialId", e.target.value ? Number(e.target.value) : null)}
                          disabled={!isDraft}
                          className="h-8 w-36 rounded border border-gray-200 bg-transparent px-1 text-xs dark:border-gray-700 disabled:opacity-50"
                        >
                          <option value="">— None —</option>
                          {materials.map((m) => <option key={m.id} value={m.id}>{m.materialCode}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          aria-label="Supplier"
                          title="Supplier"
                          value={item.supplierId ?? ""}
                          onChange={(e) => updateItem(index, "supplierId", e.target.value ? Number(e.target.value) : null)}
                          disabled={!isDraft}
                          className="h-8 w-32 rounded border border-gray-200 bg-transparent px-1 text-xs dark:border-gray-700 disabled:opacity-50"
                        >
                          <option value="">— None —</option>
                          {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          aria-label="Unit"
                          title="Unit"
                          value={item.unit}
                          onChange={(e) => updateItem(index, "unit", e.target.value)}
                          disabled={!isDraft}
                          className="h-8 w-16 rounded border border-gray-200 bg-transparent px-1 text-xs dark:border-gray-700 disabled:opacity-50"
                        >
                          {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          aria-label="Consumption per piece"
                          title="Consumption per piece"
                          type="number"
                          step="0.0001"
                          min="0"
                          value={item.consumptionPerPiece || ""}
                          onChange={(e) => updateItem(index, "consumptionPerPiece", Number(e.target.value))}
                          disabled={!isDraft}
                          className="h-8 w-20 rounded border border-gray-200 bg-transparent px-2 text-xs text-right dark:border-gray-700 disabled:opacity-50"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          aria-label="Wastage percent"
                          title="Wastage percent"
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={item.wastagePct || ""}
                          onChange={(e) => updateItem(index, "wastagePct", Number(e.target.value))}
                          disabled={!isDraft}
                          className="h-8 w-16 rounded border border-gray-200 bg-transparent px-2 text-xs text-right dark:border-gray-700 disabled:opacity-50"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          aria-label="Unit price"
                          title="Unit price"
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unitPrice || ""}
                          onChange={(e) => updateItem(index, "unitPrice", Number(e.target.value))}
                          disabled={!isDraft}
                          className="h-8 w-20 rounded border border-gray-200 bg-transparent px-2 text-xs text-right dark:border-gray-700 disabled:opacity-50"
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-gray-800 dark:text-white/80 whitespace-nowrap">
                        ${lineCost.toFixed(2)}
                      </td>
                      <td className="px-3 py-2">
                        {isDraft && items.length > 1 && (
                          <button type="button" onClick={() => removeItem(index)} title="Remove row" aria-label="Remove row" className="text-red-400 hover:text-red-600">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 dark:bg-gray-800/50">
                  <td colSpan={9} className="px-3 py-2 text-right font-semibold text-gray-700 dark:text-gray-300">Total Cost / Piece</td>
                  <td className="px-3 py-2 text-right font-bold text-brand-500">${grandTotal.toFixed(2)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Save button */}
        {isDraft && (
          <div className="flex justify-end gap-3">
            <button
              onClick={() => navigate("/costing/bom")}
              className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {saving ? "Saving..." : isEdit ? "Update BOM" : "Create BOM"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
