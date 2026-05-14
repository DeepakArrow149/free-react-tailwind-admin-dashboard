import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router";
import { masterApi } from "../../../api/master";
import PageMeta from "../../../components/common/PageMeta";
import Label from "../../../components/form/Label";
import Input from "../../../components/form/input/InputField";
import Button from "../../../components/ui/button/Button";
import { useMaterialTypes } from '@/hooks/useMasterLookups';

interface MaterialCategory {
  id: number;
  name: string;
}

interface Supplier {
  id: number;
  code: string;
  name: string;
}

interface UOM {
  id: number;
  code: string;
  name: string;
}

const MATERIAL_TYPES = [
  "SHELL_FABRIC",
  "LINING",
  "INTERLINING",
  "TRIM",
  "ACCESSORY",
  "PACKING",
  "THREAD",
  "LABEL",
  "OTHER",
] as const;

const selectClass =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

export default function MaterialForm() {
  const { id } = useParams();
  const isEdit = id && id !== "new";
  const navigate = useNavigate();

  const [form, setForm] = useState({
    materialCode: "",
    materialName: "",
    categoryId: "",
    materialType: "SHELL_FABRIC",
    description: "",
    unitOfMeasure: "MTR",
    hsnCode: "",
    gstRate: 5,
    standardCost: 0,
    reorderLevel: 0,
    reorderQty: 0,
    leadTimeDays: 15,
    minOrderQty: 0,
    shelfLifeDays: "",
    preferredSupplierId: "",
  });
  const [categories, setCategories] = useState<MaterialCategory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [units, setUnits] = useState<UOM[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load lookup data
  useEffect(() => {
    Promise.all([
      masterApi.listMaterialCategories(),
      masterApi.listSuppliers({ limit: 100 }),
      masterApi.listUnits(),
    ]).then(([catRes, suppRes, unitRes]) => {
      if (catRes?.data?.data) setCategories(catRes.data.data as unknown as MaterialCategory[]);
      if (suppRes) setSuppliers(suppRes.data.data as unknown as Supplier[]);
      if (unitRes) setUnits(unitRes.data.data as unknown as UOM[]);
    }).catch((err) => {
      console.error('Failed to load lookup data:', err);
    });
  }, []);

  // Load material for edit
  useEffect(() => {
    if (isEdit) {
      masterApi
        .getMaterial(Number(id))
        .then(({ data: resp }) => {
          const m = resp.data;
          setForm({
            materialCode: m.materialCode,
            materialName: m.materialName,
            categoryId: String(m.categoryId),
            materialType: m.materialType,
            description: "",
            unitOfMeasure: m.unitOfMeasure || "MTR",
            hsnCode: "",
            gstRate: 5,
            standardCost: m.standardCost || 0,
            reorderLevel: 0,
            reorderQty: 0,
            leadTimeDays: 15,
            minOrderQty: 0,
            shelfLifeDays: "",
            preferredSupplierId: "",
          });
        })
        .catch(() => navigate("/master/materials"));
    }
  }, [id, isEdit, navigate]);

  const handleChange = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        materialCode: form.materialCode,
        materialName: form.materialName,
        categoryId: Number(form.categoryId),
        materialType: form.materialType,
        unitOfMeasure: form.unitOfMeasure,
        gstRate: Number(form.gstRate),
        standardCost: Number(form.standardCost) || undefined,
        reorderLevel: Number(form.reorderLevel),
        reorderQty: Number(form.reorderQty),
        leadTimeDays: Number(form.leadTimeDays),
        minOrderQty: Number(form.minOrderQty),
      };

      if (form.description) payload.description = form.description;
      if (form.hsnCode) payload.hsnCode = form.hsnCode;
      if (form.shelfLifeDays) payload.shelfLifeDays = Number(form.shelfLifeDays);
      if (form.preferredSupplierId)
        payload.preferredSupplierId = Number(form.preferredSupplierId);

      if (isEdit) {
        await masterApi.updateMaterial(Number(id), payload as Partial<Parameters<typeof masterApi.updateMaterial>[1]>);
      } else {
        await masterApi.createMaterial(payload as Partial<Parameters<typeof masterApi.createMaterial>[0]>);
      }
      navigate("/master/materials");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Save failed";
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr?.response?.data?.message || message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageMeta title={`${isEdit ? "Edit" : "New"} Material | ERP TRACK`} description="" />
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {isEdit ? "Edit Material" : "New Material"}
          </h2>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-100 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {/* Material Code */}
            <div>
              <Label>Material Code *</Label>
              <Input
                placeholder="MAT001"
                value={form.materialCode}
                onChange={(e) => handleChange("materialCode", e.target.value)}
                disabled={!!isEdit}
              />
            </div>

            {/* Material Name */}
            <div>
              <Label>Material Name *</Label>
              <Input
                placeholder="Cotton Fabric 60s"
                value={form.materialName}
                onChange={(e) => handleChange("materialName", e.target.value)}
              />
            </div>

            {/* Category */}
            <div>
              <Label>Category *</Label>
              <select
                className={selectClass}
                value={form.categoryId}
                onChange={(e) => handleChange("categoryId", e.target.value)}
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Material Type */}
            <div>
              <Label>Material Type *</Label>
              <select
                className={selectClass}
                value={form.materialType}
                onChange={(e) => handleChange("materialType", e.target.value)}
              >
                {MATERIAL_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>

            {/* Unit of Measure */}
            <div>
              <Label>Unit of Measure</Label>
              <select
                className={selectClass}
                value={form.unitOfMeasure}
                onChange={(e) => handleChange("unitOfMeasure", e.target.value)}
              >
                <option value="MTR">MTR - Meters</option>
                <option value="YDS">YDS - Yards</option>
                <option value="KGS">KGS - Kilograms</option>
                <option value="PCS">PCS - Pieces</option>
                <option value="DZN">DZN - Dozens</option>
                <option value="GRS">GRS - Gross</option>
                {units.map((u) => (
                  <option key={u.code} value={u.code}>
                    {u.code} - {u.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Standard Cost */}
            <div>
              <Label>Standard Cost</Label>
              <Input
                type="number"
                value={String(form.standardCost)}
                onChange={(e) => handleChange("standardCost", e.target.value)}
              />
            </div>

            {/* HSN Code */}
            <div>
              <Label>HSN Code</Label>
              <Input
                placeholder="52091100"
                value={form.hsnCode}
                onChange={(e) => handleChange("hsnCode", e.target.value)}
                maxLength={8}
              />
            </div>

            {/* GST Rate */}
            <div>
              <Label>GST Rate (%)</Label>
              <Input
                type="number"
                value={String(form.gstRate)}
                onChange={(e) => handleChange("gstRate", e.target.value)}
              />
            </div>

            {/* Preferred Supplier */}
            <div>
              <Label>Preferred Supplier</Label>
              <select
                className={selectClass}
                value={form.preferredSupplierId}
                onChange={(e) => handleChange("preferredSupplierId", e.target.value)}
              >
                <option value="">None</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} - {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Reorder Level */}
            <div>
              <Label>Reorder Level</Label>
              <Input
                type="number"
                value={String(form.reorderLevel)}
                onChange={(e) => handleChange("reorderLevel", e.target.value)}
              />
            </div>

            {/* Reorder Qty */}
            <div>
              <Label>Reorder Quantity</Label>
              <Input
                type="number"
                value={String(form.reorderQty)}
                onChange={(e) => handleChange("reorderQty", e.target.value)}
              />
            </div>

            {/* Lead Time Days */}
            <div>
              <Label>Lead Time (Days)</Label>
              <Input
                type="number"
                value={String(form.leadTimeDays)}
                onChange={(e) => handleChange("leadTimeDays", e.target.value)}
              />
            </div>

            {/* Min Order Qty */}
            <div>
              <Label>Min Order Quantity</Label>
              <Input
                type="number"
                value={String(form.minOrderQty)}
                onChange={(e) => handleChange("minOrderQty", e.target.value)}
              />
            </div>

            {/* Shelf Life Days */}
            <div>
              <Label>Shelf Life (Days)</Label>
              <Input
                type="number"
                placeholder="Optional"
                value={form.shelfLifeDays}
                onChange={(e) => handleChange("shelfLifeDays", e.target.value)}
              />
            </div>

            {/* Description - full width */}
            <div className="sm:col-span-2 lg:col-span-3">
              <Label>Description</Label>
              <textarea
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                rows={3}
                placeholder="Material specifications..."
                value={form.description}
                onChange={(e) => handleChange("description", e.target.value)}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex items-center gap-3">
            <Button size="sm" disabled={loading}>
              {loading ? "Saving..." : isEdit ? "Update Material" : "Create Material"}
            </Button>
            <button
              type="button"
              onClick={() => navigate("/master/materials")}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
