import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router";
import { masterApi } from "../../../api/master";
import PageMeta from "../../../components/common/PageMeta";
import Label from "../../../components/form/Label";
import Input from "../../../components/form/input/InputField";
import Button from "../../../components/ui/button/Button";

const SUPPLIER_TYPES = ["FABRIC", "TRIM", "ACCESSORY", "SUBCONTRACTOR", "LOGISTICS"];

export default function SupplierForm() {
  const { id } = useParams();
  const isEdit = id && id !== "new";
  const navigate = useNavigate();

  const [form, setForm] = useState({
    code: "", name: "", supplierType: "FABRIC", country: "",
    currency: "INR", leadTimeDays: 15, paymentTerms: "",
    gstin: "", pan: "", contactPerson: "", email: "", phone: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isEdit) {
      masterApi.getSupplier(Number(id)).then(({ data: resp }) => {
        const s = resp.data;
        setForm({
          code: s.code, name: s.name, supplierType: s.supplierType,
          country: s.country || "", currency: s.currency,
          leadTimeDays: s.leadTimeDays || 15, paymentTerms: "",
          gstin: "", pan: "", contactPerson: s.contactPerson || "",
          email: s.email || "", phone: s.phone || "",
        });
      }).catch(() => navigate("/master/suppliers"));
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
      const payload = {
        ...form,
        leadTimeDays: Number(form.leadTimeDays),
        country: form.country || undefined,
        paymentTerms: form.paymentTerms || undefined,
        gstin: form.gstin || undefined,
        pan: form.pan || undefined,
        contactPerson: form.contactPerson || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
      };
      if (isEdit) {
        await masterApi.updateSupplier(Number(id), payload);
      } else {
        await masterApi.createSupplier(payload);
      }
      navigate("/master/suppliers");
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
      <PageMeta title={`${isEdit ? "Edit" : "New"} Supplier | ERP TRACK`} description="" />
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3 p-5 lg:p-6">
        <h2 className="mb-6 text-lg font-semibold text-gray-800 dark:text-white/90">
          {isEdit ? "Edit Supplier" : "New Supplier"}
        </h2>

        {error && (
          <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 border border-red-300 rounded-lg dark:bg-red-900/30 dark:text-red-400">{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label>Supplier Code *</Label>
              <Input placeholder="SUP001" value={form.code} onChange={(e) => handleChange("code", e.target.value)} disabled={!!isEdit} />
            </div>
            <div>
              <Label>Name *</Label>
              <Input placeholder="Supplier name" value={form.name} onChange={(e) => handleChange("name", e.target.value)} />
            </div>
            <div>
              <Label>Type *</Label>
              <select
                value={form.supplierType}
                onChange={(e) => handleChange("supplierType", e.target.value)}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                {SUPPLIER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <Label>Country</Label>
              <Input placeholder="IN" value={form.country} onChange={(e) => handleChange("country", e.target.value)} maxLength={2} />
            </div>
            <div>
              <Label>Currency</Label>
              <Input placeholder="INR" value={form.currency} onChange={(e) => handleChange("currency", e.target.value)} maxLength={3} />
            </div>
            <div>
              <Label>Lead Time (days)</Label>
              <Input type="number" value={String(form.leadTimeDays)} onChange={(e) => handleChange("leadTimeDays", e.target.value)} />
            </div>
            <div>
              <Label>GSTIN</Label>
              <Input placeholder="22AAAAA0000A1Z5" value={form.gstin} onChange={(e) => handleChange("gstin", e.target.value)} />
            </div>
            <div>
              <Label>PAN</Label>
              <Input placeholder="AAAAA0000A" value={form.pan} onChange={(e) => handleChange("pan", e.target.value)} />
            </div>
            <div>
              <Label>Contact Person</Label>
              <Input placeholder="Name" value={form.contactPerson} onChange={(e) => handleChange("contactPerson", e.target.value)} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" placeholder="supplier@example.com" value={form.email} onChange={(e) => handleChange("email", e.target.value)} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input placeholder="+91-9876543210" value={form.phone} onChange={(e) => handleChange("phone", e.target.value)} />
            </div>
          </div>

          <div className="flex items-center gap-3 mt-6 pt-5 border-t border-gray-100 dark:border-gray-800">
            <Button size="sm" disabled={loading}>{loading ? "Saving..." : isEdit ? "Update" : "Create"}</Button>
            <button type="button" onClick={() => navigate("/master/suppliers")}
              className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300">Cancel</button>
          </div>
        </form>
      </div>
    </>
  );
}
