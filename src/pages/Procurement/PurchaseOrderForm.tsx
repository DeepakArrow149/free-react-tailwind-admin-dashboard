import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { purchaseOrderApi } from "../../api/procurement";
import { purchaseOrderSchema } from "../../utils/form-schemas";
import { toast } from "sonner";
import PageMeta from "../../components/common/PageMeta";
import { downloadPdf } from "../../utils/downloadPdf";

interface LineItem {
  materialId?: number;
  itemDescription: string;
  specification?: string;
  qty: number;
  unit: string;
  unitPrice: number;
  taxPct: number;
}

const emptyLine = (): LineItem => ({
  itemDescription: "", qty: 0, unit: "MTR", unitPrice: 0, taxPct: 0,
});

export default function PurchaseOrderForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    supplierId: 0, orderId: undefined as number | undefined,
    poType: "RAW_MATERIAL", poDate: new Date().toISOString().slice(0, 10),
    expectedDate: "", currency: "INR", exchangeRate: 1,
    paymentTerms: "", deliveryAddress: "", remarks: "",
  });
  const [lines, setLines] = useState<LineItem[]>([emptyLine()]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    purchaseOrderApi.get(Number(id)).then((resp) => {
      const po = resp.data;
      setForm({
        supplierId: po.supplierId, orderId: po.orderId,
        poType: po.poType, poDate: po.poDate?.slice(0, 10),
        expectedDate: po.expectedDate?.slice(0, 10) || "",
        currency: po.currency, exchangeRate: Number(po.exchangeRate),
        paymentTerms: po.paymentTerms || "", deliveryAddress: po.deliveryAddress || "",
        remarks: po.remarks || "",
      });
      if (po.details?.length) {
        setLines(po.details.map((d: Record<string, unknown>) => ({
          materialId: d.materialId, itemDescription: d.itemDescription,
          specification: d.specification || "", qty: Number(d.qty), unit: d.unit,
          unitPrice: Number(d.unitPrice), taxPct: Number(d.taxPct),
        })));
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  const addLine = () => setLines((p) => [...p, emptyLine()]);
  const removeLine = (i: number) => setLines((p) => p.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: keyof LineItem, value: string | number | boolean) =>
    setLines((p) => p.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)));

  const subTotal = lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const taxTotal = lines.reduce((s, l) => s + (l.qty * l.unitPrice * l.taxPct / 100), 0);
  const grandTotal = subTotal + taxTotal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    // Build the payload and validate with Zod
    const payload = {
      supplierId: form.supplierId,
      poDate: form.poDate,
      deliveryDate: form.expectedDate || undefined,
      currency: form.currency,
      paymentTerms: form.paymentTerms || undefined,
      remarks: form.remarks || undefined,
      details: lines.map(l => ({
        materialId: l.materialId || 0,
        description: l.itemDescription,
        uom: l.unit,
        quantity: l.qty,
        unitPrice: l.unitPrice,
        taxPercent: l.taxPct || undefined,
      })),
    };

    const result = purchaseOrderSchema.safeParse(payload);
    if (!result.success) {
      const errs: Record<string, string> = {};
      for (const issue of result.error.issues) {
        errs[issue.path.join('.')] = issue.message;
      }
      setFieldErrors(errs);
      const firstErr = result.error.issues[0]?.message || 'Please fix the form errors';
      toast.error(firstErr);
      return;
    }

    setSaving(true);
    try {
      const submitPayload = { ...form, details: lines };
      if (isEdit) {
        await purchaseOrderApi.update(Number(id), submitPayload);
      } else {
        await purchaseOrderApi.create(submitPayload);
      }
      navigate("/procurement/po");
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="p-6 text-gray-500">Loading...</div>;

  return (
    <>
      <PageMeta title={`${isEdit ? "Edit" : "New"} Purchase Order | STITCH ERP`} description="Purchase order form" />
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => navigate(-1)} title="Back" aria-label="Back" className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{isEdit ? "Edit Purchase Order" : "New Purchase Order"}</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Supplier ID *</label>
              <input aria-label="Supplier ID" title="Supplier ID" type="number" required value={form.supplierId || ""} onChange={(e) => setForm({ ...form, supplierId: parseInt(e.target.value) || 0 })}
                className={`w-full rounded-lg border ${fieldErrors['supplierId'] ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-900 px-4 py-2 text-sm dark:text-white`} />
              {fieldErrors['supplierId'] && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors['supplierId']}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">PO Type</label>
              <select aria-label="PO Type" title="PO Type" value={form.poType} onChange={(e) => setForm({ ...form, poType: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2 text-sm dark:text-white">
                <option value="RAW_MATERIAL">Raw Material</option>
                <option value="PROCESS">Process</option>
                <option value="ACCESSORY">Accessory</option>
                <option value="PACKING">Packing</option>
                <option value="CAPITAL">Capital</option>
                <option value="GENERAL">General</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">PO Date *</label>
              <input aria-label="PO Date" title="PO Date" type="date" required value={form.poDate} onChange={(e) => setForm({ ...form, poDate: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2 text-sm dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expected Date</label>
              <input aria-label="Expected Date" title="Expected Date" type="date" value={form.expectedDate} onChange={(e) => setForm({ ...form, expectedDate: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2 text-sm dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Buyer Order ID</label>
              <input aria-label="Buyer Order ID" title="Buyer Order ID" type="number" value={form.orderId || ""} onChange={(e) => setForm({ ...form, orderId: parseInt(e.target.value) || undefined })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2 text-sm dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Terms</label>
              <input aria-label="Payment Terms" title="Payment Terms" value={form.paymentTerms} onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2 text-sm dark:text-white" />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Remarks</label>
              <textarea aria-label="Remarks" title="Remarks" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} rows={2}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2 text-sm dark:text-white" />
            </div>
          </div>

          {/* Line Items */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Line Items</h2>
              <button type="button" onClick={addLine} className="text-sm text-brand-600 hover:text-brand-700 font-medium">+ Add Line</button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="px-2 py-2 text-left text-xs text-gray-500">Description *</th>
                    <th className="px-2 py-2 text-right text-xs text-gray-500 w-20">Qty *</th>
                    <th className="px-2 py-2 text-left text-xs text-gray-500 w-20">Unit</th>
                    <th className="px-2 py-2 text-right text-xs text-gray-500 w-24">Price *</th>
                    <th className="px-2 py-2 text-right text-xs text-gray-500 w-16">Tax%</th>
                    <th className="px-2 py-2 text-right text-xs text-gray-500 w-28">Total</th>
                    <th className="px-2 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, i) => {
                    const lineTotal = l.qty * l.unitPrice;
                    return (
                      <tr key={i} className="border-b border-gray-50 dark:border-gray-800">
                        <td className="px-2 py-1">
                          <input aria-label="Description" title="Description" required value={l.itemDescription} onChange={(e) => updateLine(i, "itemDescription", e.target.value)}
                            className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1.5 text-sm dark:text-white" />
                        </td>
                        <td className="px-2 py-1">
                          <input aria-label="Quantity" title="Quantity" type="number" required value={l.qty || ""} onChange={(e) => updateLine(i, "qty", parseFloat(e.target.value) || 0)}
                            className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1.5 text-sm text-right dark:text-white" />
                        </td>
                        <td className="px-2 py-1">
                          <input aria-label="Unit" title="Unit" value={l.unit} onChange={(e) => updateLine(i, "unit", e.target.value)}
                            className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1.5 text-sm dark:text-white" />
                        </td>
                        <td className="px-2 py-1">
                          <input aria-label="Unit price" title="Unit price" type="number" step="0.01" required value={l.unitPrice || ""} onChange={(e) => updateLine(i, "unitPrice", parseFloat(e.target.value) || 0)}
                            className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1.5 text-sm text-right dark:text-white" />
                        </td>
                        <td className="px-2 py-1">
                          <input aria-label="Tax percent" title="Tax percent" type="number" value={l.taxPct || ""} onChange={(e) => updateLine(i, "taxPct", parseFloat(e.target.value) || 0)}
                            className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1.5 text-sm text-right dark:text-white" />
                        </td>
                        <td className="px-2 py-1 text-right font-medium text-gray-900 dark:text-white">{lineTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                        <td className="px-2 py-1">
                          {lines.length > 1 && <button type="button" onClick={() => removeLine(i)} className="text-red-400 hover:text-red-600 text-xs">✕</button>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-72 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Sub Total:</span><span className="font-medium text-gray-900 dark:text-white">{subTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Tax:</span><span className="font-medium text-gray-900 dark:text-white">{taxTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
                <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-1"><span className="font-medium text-gray-700 dark:text-gray-300">Grand Total:</span><span className="font-bold text-lg text-gray-900 dark:text-white">{form.currency} {grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
                {grandTotal <= 100000 && <p className="text-xs text-green-600">Will be auto-approved (≤ ₹1,00,000)</p>}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800">Cancel</button>
            {isEdit && (
              <button type="button" onClick={() => downloadPdf('purchase-order', Number(id))} className="rounded-lg border border-purple-300 dark:border-purple-600 px-4 py-2 text-sm font-medium text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition">
                Download PDF
              </button>
            )}
            <button type="submit" disabled={saving} className="rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50 transition">
              {saving ? "Saving..." : isEdit ? "Update PO" : "Create PO"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
