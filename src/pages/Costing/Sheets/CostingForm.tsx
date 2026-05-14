import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router";
import { costingApi, type CreateCostingSheetInput } from "../../../api/costing";
import api from "../../../api/client";
import PageMeta from "../../../components/common/PageMeta";

interface StyleOption { id: number; styleNo: string; styleName: string }
interface OrderOption { id: number; orderNo: string; totalQty: number }

const STAGES = ["INITIAL", "BUDGETED", "ACTUAL"];

const COST_FIELDS = [
  { key: "fabricCost", label: "Fabric Cost", icon: "🧵" },
  { key: "trimCost", label: "Trim & Accessories", icon: "🔘" },
  { key: "cmtCost", label: "CMT (Cut-Make-Trim)", icon: "✂️" },
  { key: "washCost", label: "Wash / Laundry", icon: "💧" },
  { key: "embellishmentCost", label: "Embellishment", icon: "✨" },
  { key: "testingCost", label: "Testing & QC", icon: "🔬" },
  { key: "overheadCost", label: "Overhead / Admin", icon: "🏭" },
  { key: "freightCost", label: "Freight / Logistics", icon: "🚢" },
] as const;

type CostKey = (typeof COST_FIELDS)[number]["key"];

const defaults: CreateCostingSheetInput = {
  orderId: null,
  styleId: 0,
  stage: "INITIAL",
  orderQty: 0,
  fabricCost: 0,
  trimCost: 0,
  cmtCost: 0,
  washCost: 0,
  embellishmentCost: 0,
  testingCost: 0,
  overheadCost: 0,
  freightCost: 0,
  commissionPct: 0,
  sellingPricePerPc: 0,
  currency: "USD",
  exchangeRate: 1,
  remarks: null,
  // v2 header fields (optional, nullable)
  revenuePerMc: null,
  epm: null,
  commercialFinancePct: null,
  commercialFinanceAmount: null,
  buyingCommissionPct: null,
  buyingCommissionAmount: null,
  cmAmount: null,
  paymentTerm: null,
  fobPrice: null,
  colorCount: null,
  plannedLine: null,
  packSize: null,
  seasonStart: null,
  seasonEnd: null,
  salesContractNumber: null,
};

export default function CostingForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [costingNo, setCostingNo] = useState("");
  const [form, setForm] = useState<CreateCostingSheetInput>({ ...defaults });

  // Dropdown data
  const [styles, setStyles] = useState<StyleOption[]>([]);
  const [orders, setOrders] = useState<OrderOption[]>([]);

  useEffect(() => {
    Promise.all([
      api.get("/master/styles", { params: { limit: 500 } }),
      api.get("/merchandising/orders", { params: { limit: 500 } }),
    ]).then(([stylesRes, ordersRes]) => {
      setStyles(stylesRes.data.data || []);
      setOrders(ordersRes.data.data || []);
    });
  }, []);

  const loadSheet = useCallback(async () => {
    if (!isEdit) return;
    setLoading(true);
    try {
      const { data: resp } = await costingApi.get(Number(id));
      const s = resp.data;
      setCostingNo(s.costingNo);
      setForm({
        orderId: s.orderId,
        styleId: s.styleId,
        stage: s.stage,
        orderQty: s.orderQty,
        fabricCost: Number(s.fabricCost),
        trimCost: Number(s.trimCost),
        cmtCost: Number(s.cmtCost),
        washCost: Number(s.washCost),
        embellishmentCost: Number(s.embellishmentCost),
        testingCost: Number(s.testingCost),
        overheadCost: Number(s.overheadCost),
        freightCost: Number(s.freightCost),
        commissionPct: Number(s.commissionPct),
        sellingPricePerPc: Number(s.sellingPricePerPc),
        currency: s.currency,
        exchangeRate: Number(s.exchangeRate),
        remarks: s.remarks,
      });
    } catch {
      setError("Failed to load costing sheet");
    } finally {
      setLoading(false);
    }
  }, [id, isEdit]);

  useEffect(() => { loadSheet(); }, [loadSheet]);

  const setField = <K extends keyof CreateCostingSheetInput>(key: K, value: CreateCostingSheetInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // Auto-calculate totals
  const calcs = useMemo(() => {
    const totalDirect = COST_FIELDS.reduce<number>((sum, f) => sum + Number(form[f.key] || 0), 0);
    const commissionAmt = totalDirect * (Number(form.commissionPct) / 100);
    const totalCostPerPc = totalDirect + commissionAmt;
    const qty = Number(form.orderQty) || 1;
    const totalSellingPrice = Number(form.sellingPricePerPc) * qty;
    const totalCostAll = totalCostPerPc * qty;
    const marginAmount = totalSellingPrice - totalCostAll;
    const marginPct = totalSellingPrice > 0 ? (marginAmount / totalSellingPrice) * 100 : 0;
    return { totalDirect, commissionAmt, totalCostPerPc, totalSellingPrice, totalCostAll, marginAmount, marginPct };
  }, [form]);

  const handleSave = async () => {
    setError("");
    if (!form.styleId) { setError("Please select a style"); return; }

    setSaving(true);
    try {
      if (isEdit) {
        await costingApi.update(Number(id), form);
      } else {
        await costingApi.create(form);
      }
      navigate("/costing/sheets");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20 text-gray-400">Loading...</div>;

  return (
    <>
      <PageMeta title={`${isEdit ? "Edit" : "New"} Cost Sheet | ERP TRACK`} description="Cost sheet form" />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
            {isEdit ? `Cost Sheet: ${costingNo}` : "New Cost Sheet"}
          </h2>
          <button onClick={() => navigate("/costing/sheets")} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800">
            Back
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-300 bg-red-100 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left column — Cost components */}
          <div className="lg:col-span-2 space-y-5">
            {/* Header Fields */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
              <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">General</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Style *</label>
                  <select
                    aria-label="Style"
                    title="Style"
                    value={form.styleId}
                    onChange={(e) => setField("styleId", Number(e.target.value))}
                    className="h-9 w-full rounded-lg border border-gray-300 bg-transparent px-2 text-sm dark:border-gray-700 dark:text-white/90"
                  >
                    <option value={0}>Select</option>
                    {styles.map((s) => <option key={s.id} value={s.id}>{s.styleNo} — {s.styleName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Order</label>
                  <select
                    aria-label="Order"
                    title="Order"
                    value={form.orderId ?? ""}
                    onChange={(e) => {
                      const oid = e.target.value ? Number(e.target.value) : null;
                      setField("orderId", oid);
                      if (oid) {
                        const o = orders.find((x) => x.id === oid);
                        if (o) setField("orderQty", o.totalQty);
                      }
                    }}
                    className="h-9 w-full rounded-lg border border-gray-300 bg-transparent px-2 text-sm dark:border-gray-700 dark:text-white/90"
                  >
                    <option value="">— None —</option>
                    {orders.map((o) => <option key={o.id} value={o.id}>{o.orderNo} (Qty: {o.totalQty})</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Stage</label>
                  <select
                    aria-label="Stage"
                    title="Stage"
                    value={form.stage}
                    onChange={(e) => setField("stage", e.target.value)}
                    className="h-9 w-full rounded-lg border border-gray-300 bg-transparent px-2 text-sm dark:border-gray-700 dark:text-white/90"
                  >
                    {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Order Qty</label>
                  <input
                    aria-label="Order Qty"
                    title="Order Qty"
                    type="number"
                    min="0"
                    value={form.orderQty || ""}
                    onChange={(e) => setField("orderQty", Number(e.target.value))}
                    className="h-9 w-full rounded-lg border border-gray-300 bg-transparent px-2 text-sm text-right dark:border-gray-700 dark:text-white/90"
                  />
                </div>
              </div>
            </div>

            {/* Production & Commercial Details (v2) */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
              <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Production & Commercial Details</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">No. of Colors</label>
                  <input type="number" min="0" placeholder="9" value={form.colorCount ?? ""} onChange={(e) => setField("colorCount", e.target.value ? Number(e.target.value) : null)} className="h-9 w-full rounded-lg border border-gray-300 bg-transparent px-2 text-sm text-right dark:border-gray-700 dark:text-white/90" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Planned Line</label>
                  <input type="number" min="0" placeholder="1" value={form.plannedLine ?? ""} onChange={(e) => setField("plannedLine", e.target.value ? Number(e.target.value) : null)} className="h-9 w-full rounded-lg border border-gray-300 bg-transparent px-2 text-sm text-right dark:border-gray-700 dark:text-white/90" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Pack Size (Pcs)</label>
                  <input type="number" min="0" placeholder="1" value={form.packSize ?? ""} onChange={(e) => setField("packSize", e.target.value ? Number(e.target.value) : null)} className="h-9 w-full rounded-lg border border-gray-300 bg-transparent px-2 text-sm text-right dark:border-gray-700 dark:text-white/90" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Season Start</label>
                  <input type="date" title="Season start" value={form.seasonStart ?? ""} onChange={(e) => setField("seasonStart", e.target.value || null)} className="h-9 w-full rounded-lg border border-gray-300 bg-transparent px-2 text-sm dark:border-gray-700 dark:text-white/90" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Season End</label>
                  <input type="date" title="Season end" value={form.seasonEnd ?? ""} onChange={(e) => setField("seasonEnd", e.target.value || null)} className="h-9 w-full rounded-lg border border-gray-300 bg-transparent px-2 text-sm dark:border-gray-700 dark:text-white/90" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Payment Term</label>
                  <input type="text" placeholder="LC 90 Days" value={form.paymentTerm ?? ""} onChange={(e) => setField("paymentTerm", e.target.value || null)} className="h-9 w-full rounded-lg border border-gray-300 bg-transparent px-2 text-sm dark:border-gray-700 dark:text-white/90" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Sales Contract No</label>
                  <input type="text" placeholder="SC-12345" value={form.salesContractNumber ?? ""} onChange={(e) => setField("salesContractNumber", e.target.value || null)} className="h-9 w-full rounded-lg border border-gray-300 bg-transparent px-2 text-sm dark:border-gray-700 dark:text-white/90" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">FOB Price</label>
                  <input type="number" step="0.01" min="0" placeholder="0" value={form.fobPrice ?? ""} onChange={(e) => setField("fobPrice", e.target.value ? Number(e.target.value) : null)} className="h-9 w-full rounded-lg border border-gray-300 bg-transparent px-2 text-sm text-right dark:border-gray-700 dark:text-white/90" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Revenue / MC</label>
                  <input type="number" step="0.01" min="0" placeholder="0" value={form.revenuePerMc ?? ""} onChange={(e) => setField("revenuePerMc", e.target.value ? Number(e.target.value) : null)} className="h-9 w-full rounded-lg border border-gray-300 bg-transparent px-2 text-sm text-right dark:border-gray-700 dark:text-white/90" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">EPM</label>
                  <input type="number" step="0.0001" min="0" placeholder="0" value={form.epm ?? ""} onChange={(e) => setField("epm", e.target.value ? Number(e.target.value) : null)} className="h-9 w-full rounded-lg border border-gray-300 bg-transparent px-2 text-sm text-right dark:border-gray-700 dark:text-white/90" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Commercial+Finance %</label>
                  <input type="number" step="0.1" min="0" max="100" placeholder="3" value={form.commercialFinancePct ?? ""} onChange={(e) => setField("commercialFinancePct", e.target.value ? Number(e.target.value) : null)} className="h-9 w-full rounded-lg border border-gray-300 bg-transparent px-2 text-sm text-right dark:border-gray-700 dark:text-white/90" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Commercial+Finance Amt</label>
                  <input type="number" step="0.01" min="0" placeholder="0" value={form.commercialFinanceAmount ?? ""} onChange={(e) => setField("commercialFinanceAmount", e.target.value ? Number(e.target.value) : null)} className="h-9 w-full rounded-lg border border-gray-300 bg-transparent px-2 text-sm text-right dark:border-gray-700 dark:text-white/90" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Buying Commission %</label>
                  <input type="number" step="0.1" min="0" max="100" placeholder="0" value={form.buyingCommissionPct ?? ""} onChange={(e) => setField("buyingCommissionPct", e.target.value ? Number(e.target.value) : null)} className="h-9 w-full rounded-lg border border-gray-300 bg-transparent px-2 text-sm text-right dark:border-gray-700 dark:text-white/90" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Buying Commission Amt</label>
                  <input type="number" step="0.01" min="0" placeholder="0" value={form.buyingCommissionAmount ?? ""} onChange={(e) => setField("buyingCommissionAmount", e.target.value ? Number(e.target.value) : null)} className="h-9 w-full rounded-lg border border-gray-300 bg-transparent px-2 text-sm text-right dark:border-gray-700 dark:text-white/90" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">CM Amount</label>
                  <input type="number" step="0.01" min="0" placeholder="0" value={form.cmAmount ?? ""} onChange={(e) => setField("cmAmount", e.target.value ? Number(e.target.value) : null)} className="h-9 w-full rounded-lg border border-gray-300 bg-transparent px-2 text-sm text-right dark:border-gray-700 dark:text-white/90" />
                </div>
              </div>
              <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">After saving, add per-line items (Fabric / Trim / Supplementary / Operational) from the detail view.</p>
            </div>

            {/* Cost Components */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
              <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Cost Components (per piece)</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {COST_FIELDS.map((f) => (
                  <div key={f.key} className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50/50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/30">
                    <span className="text-lg">{f.icon}</span>
                    <div className="flex-1">
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400">{f.label}</label>
                    </div>
                    <input
                      aria-label={f.label}
                      title={f.label}
                      type="number"
                      step="0.01"
                      min="0"
                      value={Number(form[f.key as CostKey]) || ""}
                      onChange={(e) => setField(f.key as CostKey, Number(e.target.value))}
                      className="h-8 w-28 rounded border border-gray-200 bg-white px-2 text-sm text-right dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                    />
                  </div>
                ))}
              </div>

              {/* Commission */}
              <div className="mt-4 flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50/50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/30">
                <span className="text-lg">💰</span>
                <div className="flex-1"><label className="text-xs font-medium text-gray-600 dark:text-gray-400">Commission %</label></div>
                <input
                  aria-label="Commission percent"
                  title="Commission percent"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={form.commissionPct || ""}
                  onChange={(e) => setField("commissionPct", Number(e.target.value))}
                  className="h-8 w-28 rounded border border-gray-200 bg-white px-2 text-sm text-right dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                />
              </div>

              {/* Selling Price */}
              <div className="mt-4 flex items-center gap-3 rounded-lg border border-brand-200 bg-brand-50/50 px-4 py-3 dark:border-brand-800 dark:bg-brand-900/20">
                <span className="text-lg">🏷️</span>
                <div className="flex-1"><label className="text-xs font-medium text-brand-700 dark:text-brand-400">Selling Price per Piece</label></div>
                <input
                  aria-label="Selling Price per Piece"
                  title="Selling Price per Piece"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.sellingPricePerPc || ""}
                  onChange={(e) => setField("sellingPricePerPc", Number(e.target.value))}
                  className="h-8 w-28 rounded border border-brand-200 bg-white px-2 text-sm text-right font-medium dark:border-brand-700 dark:bg-gray-900 dark:text-white/90"
                />
              </div>

              {/* Remarks */}
              <div className="mt-4">
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Remarks</label>
                <textarea
                  value={form.remarks ?? ""}
                  onChange={(e) => setField("remarks", e.target.value || null)}
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-700 dark:text-white/90"
                  placeholder="Notes..."
                />
              </div>
            </div>
          </div>

          {/* Right column — Summary panel */}
          <div className="space-y-5">
            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 sticky top-4">
              <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Cost Summary</h3>

              <div className="space-y-3">
                {COST_FIELDS.map((f) => (
                  <div key={f.key} className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">{f.label}</span>
                    <span className="font-medium text-gray-800 dark:text-white/80">${Number(form[f.key as CostKey] || 0).toFixed(2)}</span>
                  </div>
                ))}

                <hr className="border-gray-200 dark:border-gray-700" />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Sub-total</span>
                  <span className="font-semibold text-gray-800 dark:text-white/80">${calcs.totalDirect.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Commission ({form.commissionPct}%)</span>
                  <span className="text-gray-800 dark:text-white/80">${calcs.commissionAmt.toFixed(2)}</span>
                </div>

                <hr className="border-gray-200 dark:border-gray-700" />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total Cost / Pc</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">${calcs.totalCostPerPc.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Selling / Pc</span>
                  <span className="font-medium text-brand-600 dark:text-brand-400">${Number(form.sellingPricePerPc).toFixed(2)}</span>
                </div>

                <hr className="border-gray-200 dark:border-gray-700" />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Margin</span>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${calcs.marginPct < 8 ? "text-red-500" : "text-green-600"}`}>
                      {calcs.marginPct.toFixed(1)}%
                    </div>
                    <div className={`text-xs ${calcs.marginAmount < 0 ? "text-red-400" : "text-green-500"}`}>
                      ${calcs.marginAmount.toFixed(2)} / pc
                    </div>
                  </div>
                </div>

                {calcs.marginPct < 8 && calcs.marginPct !== 0 && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-600 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
                    ⚠️ Below minimum margin threshold (8%)
                  </div>
                )}

                <hr className="border-gray-200 dark:border-gray-700" />

                {form.orderQty > 0 && (
                  <div className="space-y-2 rounded-lg bg-gray-50 p-3 dark:bg-gray-800/30">
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>Order Qty</span>
                      <span>{form.orderQty.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>Total Cost</span>
                      <span>${calcs.totalCostAll.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>Total Selling</span>
                      <span>${calcs.totalSellingPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold">
                      <span className="text-gray-700 dark:text-gray-300">Total Margin</span>
                      <span className={calcs.marginAmount < 0 ? "text-red-500" : "text-green-600"}>
                        ${(calcs.marginAmount * (form.orderQty || 1)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Save buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => navigate("/costing/sheets")}
                className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 rounded-lg bg-brand-500 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
              >
                {saving ? "Saving..." : isEdit ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
