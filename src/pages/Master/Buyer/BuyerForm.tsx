import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router";
import { masterApi, type Buyer } from "../../../api/master";
import PageMeta from "../../../components/common/PageMeta";
import Label from "../../../components/form/Label";
import Input from "../../../components/form/input/InputField";
import Button from "../../../components/ui/button/Button";

export default function BuyerForm() {
  const { id } = useParams();
  const isEdit = id && id !== "new";
  const navigate = useNavigate();

  const [form, setForm] = useState({
    code: "", name: "", country: "", currency: "USD",
    paymentTerms: "", creditDays: 30, contactPerson: "",
    email: "", phone: "", gstin: "", buyerGroup: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isEdit) {
      masterApi.getBuyer(Number(id)).then(({ data: resp }) => {
        const b = resp.data;
        setForm({
          code: b.code, name: b.name, country: b.country || "",
          currency: b.currency, paymentTerms: b.paymentTerms || "",
          creditDays: b.creditDays || 30, contactPerson: b.contactPerson || "",
          email: b.email || "", phone: b.phone || "",
          gstin: b.gstin || "", buyerGroup: b.buyerGroup || "",
        });
      }).catch(() => navigate("/master/buyers"));
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
      const payload: Partial<Buyer> = {
        ...form,
        creditDays: Number(form.creditDays),
        country: form.country || undefined,
        paymentTerms: form.paymentTerms || undefined,
        contactPerson: form.contactPerson || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        gstin: form.gstin || undefined,
        buyerGroup: form.buyerGroup || undefined,
      };

      if (isEdit) {
        await masterApi.updateBuyer(Number(id), payload);
      } else {
        await masterApi.createBuyer(payload);
      }
      navigate("/master/buyers");
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
      <PageMeta title={`${isEdit ? "Edit" : "New"} Buyer | ERP TRACK`} description="" />
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3 p-5 lg:p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {isEdit ? "Edit Buyer" : "New Buyer"}
          </h2>
        </div>

        {error && (
          <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 border border-red-300 rounded-lg dark:bg-red-900/30 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label>Buyer Code *</Label>
              <Input
                placeholder="BYR001"
                value={form.code}
                onChange={(e) => handleChange("code", e.target.value)}
                disabled={!!isEdit}
              />
            </div>
            <div>
              <Label>Name *</Label>
              <Input
                placeholder="Buyer name"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
              />
            </div>
            <div>
              <Label>Country</Label>
              <Input
                placeholder="US"
                value={form.country}
                onChange={(e) => handleChange("country", e.target.value)}
                maxLength={2}
              />
            </div>
            <div>
              <Label>Currency</Label>
              <Input
                placeholder="USD"
                value={form.currency}
                onChange={(e) => handleChange("currency", e.target.value)}
                maxLength={3}
              />
            </div>
            <div>
              <Label>Payment Terms</Label>
              <Input
                placeholder="Net 30"
                value={form.paymentTerms}
                onChange={(e) => handleChange("paymentTerms", e.target.value)}
              />
            </div>
            <div>
              <Label>Credit Days</Label>
              <Input
                type="number"
                value={String(form.creditDays)}
                onChange={(e) => handleChange("creditDays", e.target.value)}
              />
            </div>
            <div>
              <Label>Contact Person</Label>
              <Input
                placeholder="John Doe"
                value={form.contactPerson}
                onChange={(e) => handleChange("contactPerson", e.target.value)}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="buyer@example.com"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                placeholder="+1-555-0100"
                value={form.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
              />
            </div>
            <div>
              <Label>GSTIN</Label>
              <Input
                placeholder="22AAAAA0000A1Z5"
                value={form.gstin}
                onChange={(e) => handleChange("gstin", e.target.value)}
              />
            </div>
            <div>
              <Label>Buyer Group</Label>
              <Input
                placeholder="Group A"
                value={form.buyerGroup}
                onChange={(e) => handleChange("buyerGroup", e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 mt-6 pt-5 border-t border-gray-100 dark:border-gray-800">
            <Button size="sm" disabled={loading}>
              {loading ? "Saving..." : isEdit ? "Update" : "Create"}
            </Button>
            <button
              type="button"
              onClick={() => navigate("/master/buyers")}
              className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
