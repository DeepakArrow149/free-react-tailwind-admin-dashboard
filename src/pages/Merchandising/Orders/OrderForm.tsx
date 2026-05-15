import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router";
import {
  getBuyerOrder,
  createBuyerOrder,
  updateBuyerOrder,
  updateOrderStatus,
  amendBuyerOrder,
  type BuyerOrderFull,
  type CreateBuyerOrderInput,
} from "../../../api/merchandising";
import POMatrixSection from "./components/POMatrixSection";
import FabricConsumptionSection from "./components/FabricConsumptionSection";
import ProcessSequenceSection from "./components/ProcessSequenceSection";
import AmendOrderDialog from "./components/AmendOrderDialog";
import { masterApi, type Buyer, type StyleMaster, type Season,
  type CompanyMaster, type BranchMaster, type BuyingAgent, type PartyGroup,
  type ThreadQuality, type Merchant } from "../../../api/master";
import ShipmentSchedulePanel from "./ShipmentSchedulePanel";
import PageMeta from "../../../components/common/PageMeta";
import Label from "../../../components/form/Label";
import Input from "../../../components/form/input/InputField";
import Button from "../../../components/ui/button/Button";

const SHIP_MODES = ["SEA", "AIR", "ROAD"];
const INCOTERMS = ["FOB", "CIF", "CFR", "EXW"];

const STATUS_ACTIONS: Record<string, { label: string; next: string; color: string }[]> = {
  DRAFT: [
    { label: "Confirm Order", next: "CONFIRMED", color: "bg-blue-500 hover:bg-blue-600" },
    { label: "Cancel", next: "CANCELLED", color: "bg-red-500 hover:bg-red-600" },
  ],
  CONFIRMED: [
    { label: "Start Production", next: "IN_PRODUCTION", color: "bg-yellow-500 hover:bg-yellow-600" },
    { label: "Cancel", next: "CANCELLED", color: "bg-red-500 hover:bg-red-600" },
  ],
  IN_PRODUCTION: [{ label: "Mark Ready to Ship", next: "READY_TO_SHIP", color: "bg-purple-500 hover:bg-purple-600" }],
  READY_TO_SHIP: [{ label: "Mark Shipped", next: "SHIPPED", color: "bg-indigo-500 hover:bg-indigo-600" }],
  SHIPPED: [{ label: "Mark Invoiced", next: "INVOICED", color: "bg-teal-500 hover:bg-teal-600" }],
  INVOICED: [{ label: "Close Order", next: "CLOSED", color: "bg-green-500 hover:bg-green-600" }],
};

export default function OrderForm() {
  const { id } = useParams();
  const isEdit = id && id !== "new";
  const navigate = useNavigate();

  // ── State ──
  const [activeTab, setActiveTab] = useState<"details" | "poMatrix" | "fabricConsumption" | "processSequence" | "shipments" | "history">("details");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [amendOpen, setAmendOpen] = useState(false);

  // Lookups
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [styles, setStyles] = useState<StyleMaster[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [companies, setCompanies] = useState<CompanyMaster[]>([]);
  const [branches, setBranches] = useState<BranchMaster[]>([]);
  const [buyingAgents, setBuyingAgents] = useState<BuyingAgent[]>([]);
  const [partyGroups, setPartyGroups] = useState<PartyGroup[]>([]);
  const [threadQualities, setThreadQualities] = useState<ThreadQuality[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);

  // Form header
  const [form, setForm] = useState({
    buyerId: 0, styleId: 0, seasonId: 0,
    companyId: 0, buyingAgentId: 0, merchantId: 0,
    partyGroupId: 0, threadQualityId: 0,
    buyerPoNo: "", buyerPoDate: "",
    orderDate: new Date().toISOString().slice(0, 10),
    exFactoryDate: "",
    shipMode: "SEA", destinationPort: "", incoterm: "FOB",
    currency: "USD", exchangeRate: "",
    paymentTerms: "", remarks: "",
    lcNo: "", lcDate: "",
    fileNo: "", piNo: "",
    deliveryAddress: "", deliveryBranchId: 0,
    referenceNo: "",
  });

  // Original order (for edit/view)
  const [order, setOrder] = useState<BuyerOrderFull | null>(null);

  // â”€â”€ Load lookups â”€â”€
  useEffect(() => {
    Promise.all([
      masterApi.listBuyers({ limit: 100 }),
      masterApi.listStyles({ limit: 100 }),
      masterApi.listSeasons(),
      masterApi.listCompanies({ limit: 100 }),
      masterApi.listBranches({ limit: 100 }),
      masterApi.listBuyingAgents({ limit: 100 }),
      masterApi.listPartyGroups(),
      masterApi.listThreadQualities(),
      masterApi.listMerchants(),
    ]).then(([b, s, sn, co, br, ba, pg, tq, me]) => {
      setBuyers((b.data as { data: Buyer[] }).data || []);
      setStyles((s.data as { data: StyleMaster[] }).data || []);
      setSeasons((sn.data as { data: Season[] }).data || []);
      setCompanies((co.data as { data: CompanyMaster[] }).data || []);
      setBranches((br.data as { data: BranchMaster[] }).data || []);
      setBuyingAgents((ba.data as { data: BuyingAgent[] }).data || []);
      setPartyGroups((pg.data as { data: PartyGroup[] }).data || []);
      setThreadQualities((tq.data as { data: ThreadQuality[] }).data || []);
      setMerchants((me.data as { data: Merchant[] }).data || []);
    });
  }, []);

  // â”€â”€ Load existing order â”€â”€
  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    getBuyerOrder(Number(id))
      .then((resp) => {
        const o = resp.data;
        setOrder(o);
        setForm({
          buyerId: o.buyerId,
          styleId: o.styleId,
          seasonId: o.seasonId || 0,
          companyId: o.companyId || 0,
          buyingAgentId: o.buyingAgentId || 0,
          merchantId: o.merchantId || 0,
          partyGroupId: o.partyGroupId || 0,
          threadQualityId: o.threadQualityId || 0,
          buyerPoNo: o.buyerPoNo || "",
          buyerPoDate: o.buyerPoDate ? o.buyerPoDate.slice(0, 10) : "",
          orderDate: o.orderDate.slice(0, 10),
          exFactoryDate: o.exFactoryDate.slice(0, 10),
          shipMode: o.shipMode,
          destinationPort: o.destinationPort || "",
          incoterm: o.incoterm,
          currency: o.currency,
          exchangeRate: o.exchangeRate ? String(o.exchangeRate) : "",
          paymentTerms: o.paymentTerms || "",
          remarks: o.remarks || "",
          lcNo: o.lcNo || "",
          lcDate: o.lcDate ? o.lcDate.slice(0, 10) : "",
          fileNo: o.fileNo || "",
          piNo: o.piNo || "",
          deliveryAddress: o.deliveryAddress || "",
          deliveryBranchId: o.deliveryBranchId || 0,
          referenceNo: o.referenceNo || "",
        });
      })
      .catch(() => navigate("/merchandising/orders"))
      .finally(() => setLoading(false));
  }, [id, isEdit, navigate]);

  // ── Handlers ──
  const handleChange = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === "buyerId") {
      const buyer = buyers.find((b) => b.id === Number(value));
      if (buyer) {
        setForm((prev) => ({
          ...prev,
          buyerId: Number(value),
          currency: buyer.currency,
          paymentTerms: buyer.paymentTerms || prev.paymentTerms,
        }));
      }
    }
  };

  // ── Submit (header-only; PO Lines + Matrix are managed in the PO Matrix tab) ──
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    // Fix 1: required-field validation
    if (!form.buyerId) { setError("Buyer is required."); return; }
    if (!form.styleId) { setError("Style is required."); return; }
    if (!form.orderDate)    { setError("Order Date is required."); return; }
    if (!form.exFactoryDate) { setError("Ex-Factory Date is required."); return; }

    setSaving(true);
    try {
      const payload: CreateBuyerOrderInput = {
        buyerId: form.buyerId,
        styleId: form.styleId,
        seasonId: form.seasonId || null,
        companyId: form.companyId || null,
        buyingAgentId: form.buyingAgentId || null,
        merchantId: form.merchantId || null,
        partyGroupId: form.partyGroupId || null,
        threadQualityId: form.threadQualityId || null,
        buyerPoNo: form.buyerPoNo || null,
        buyerPoDate: form.buyerPoDate || null,
        orderDate: form.orderDate,
        exFactoryDate: form.exFactoryDate,
        shipMode: form.shipMode,
        destinationPort: form.destinationPort || null,
        incoterm: form.incoterm,
        currency: form.currency,
        exchangeRate: form.exchangeRate ? Number(form.exchangeRate) : null,
        paymentTerms: form.paymentTerms || null,
        lcNo: form.lcNo || null,
        lcDate: form.lcDate || null,
        fileNo: form.fileNo || null,
        piNo: form.piNo || null,
        deliveryAddress: form.deliveryAddress || null,
        deliveryBranchId: form.deliveryBranchId || null,
        referenceNo: form.referenceNo || null,
        remarks: form.remarks || null,
        // PO Lines + Matrix are managed via the dedicated PO Matrix tab; header save does not send SKUs.
      };

      if (isEdit) {
        await updateBuyerOrder(Number(id), payload);
        // Refresh local state so the read-only/amend gating reflects any header changes
        const refreshed = await getBuyerOrder(Number(id));
        setOrder(refreshed.data);
      } else {
        const resp = await createBuyerOrder(payload);
        // Route into the freshly-created draft so all tabs (PO Matrix, Fabric, Process) become accessible.
        navigate(`/merchandising/orders/${resp.data.id}`);
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr?.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  // â”€â”€ Status transition â”€â”€
  const handleStatusChange = async (newStatus: string) => {
    if (!order) return;
    const remarks = newStatus === "CANCELLED" ? prompt("Cancellation reason:") : undefined;
    if (newStatus === "CANCELLED" && !remarks) return;

    try {
      await updateOrderStatus(order.id, newStatus, remarks || undefined);
      const resp = await getBuyerOrder(order.id);
      setOrder(resp.data);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      alert(axiosErr?.response?.data?.message || "Status update failed");
    }
  };

  const isReadOnly = isEdit && order && order.status !== "DRAFT";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-400">Loading order...</p>
      </div>
    );
  }

  return (
    <>
      <PageMeta title={`${isEdit ? (isReadOnly ? "View" : "Edit") : "New"} Buyer Order | ERP TRACK`} description="" />
      <div className="space-y-5">
        {/* Order Header Card */}
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3 p-5 lg:p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                {isEdit ? (order ? `Order ${order.orderNo}` : "Edit Order") : "New Buyer Order"}
              </h2>
              {order && (
                <div className="mt-1 space-y-0.5">
                  {order.soNo && (
                    <p className="text-sm text-brand-600 dark:text-brand-400 font-medium">
                      SO: {order.soNo}
                    </p>
                  )}
                  {order.buyerPoNo && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Buyer PO: {order.buyerPoNo}
                      {order.buyerPoDate && ` (${new Date(order.buyerPoDate).toLocaleDateString()})`}
                    </p>
                  )}
                  <p className="text-sm text-gray-500">
                    Rev. {order.revisionNo} Â· Created {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
            {/* Status badge and actions */}
            {order && (
              <div className="flex items-center gap-3">
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold
                  ${order.status === "DRAFT" ? "bg-gray-100 text-gray-700" : ""}
                  ${order.status === "CONFIRMED" ? "bg-blue-100 text-blue-700" : ""}
                  ${order.status === "IN_PRODUCTION" ? "bg-yellow-100 text-yellow-700" : ""}
                  ${order.status === "READY_TO_SHIP" ? "bg-purple-100 text-purple-700" : ""}
                  ${order.status === "SHIPPED" ? "bg-indigo-100 text-indigo-700" : ""}
                  ${order.status === "INVOICED" ? "bg-teal-100 text-teal-700" : ""}
                  ${order.status === "CLOSED" ? "bg-green-100 text-green-700" : ""}
                  ${order.status === "CANCELLED" ? "bg-red-100 text-red-700" : ""}
                `}>
                  {order.status.replace(/_/g, " ")}
                </span>
                {STATUS_ACTIONS[order.status]?.map((action) => (
                  <button
                    key={action.next}
                    onClick={() => handleStatusChange(action.next)}
                    className={`rounded-lg px-4 py-2 text-xs font-medium text-white ${action.color}`}
                  >
                    {action.label}
                  </button>
                ))}
                {(order.status === "CONFIRMED" || order.status === "IN_PRODUCTION") && (
                  <button
                    type="button"
                    onClick={() => setAmendOpen(true)}
                    className="rounded-lg bg-orange-500 hover:bg-orange-600 px-4 py-2 text-xs font-medium text-white"
                  >
                    Amend Order
                  </button>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 border border-red-300 rounded-lg dark:bg-red-900/30 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
            {(["details", "poMatrix", "fabricConsumption", "processSequence", ...(isEdit ? ["shipments", "history"] : [])] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab as typeof activeTab)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors
                  ${activeTab === tab
                    ? "border-brand-500 text-brand-500"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
                  }`}
              >
                {tab === "details" ? "Order Details"
                  : tab === "poMatrix" ? "PO Matrix"
                  : tab === "fabricConsumption" ? "Fabric Consumption"
                  : tab === "processSequence" ? "Process Sequence"
                  : tab === "shipments" ? "Shipments"
                  : "Revision History"}
              </button>
            ))}
          </div>

          {/* â”€â”€ Details Tab â”€â”€ */}
          {activeTab === "details" && (
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {/* Buyer */}
                <div>
                  <Label>Buyer *</Label>
                  <select
                    aria-label="Buyer"
                    title="Buyer"
                    value={form.buyerId}
                    onChange={(e) => handleChange("buyerId", Number(e.target.value))}
                    disabled={!!isReadOnly}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  >
                    <option value={0}>Select Buyer</option>
                    {buyers.map((b) => (
                      <option key={b.id} value={b.id}>{b.code} â€” {b.name}</option>
                    ))}
                  </select>
                </div>

                {/* Style */}
                <div>
                  <Label>Style *</Label>
                  <select
                    aria-label="Style"
                    title="Style"
                    value={form.styleId}
                    onChange={(e) => handleChange("styleId", Number(e.target.value))}
                    disabled={!!isReadOnly}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  >
                    <option value={0}>Select Style</option>
                    {styles
                      .filter((s) => !form.buyerId || s.buyerId === form.buyerId)
                      .map((s) => (
                        <option key={s.id} value={s.id}>{s.styleNo} â€” {s.styleName}</option>
                      ))
                    }
                  </select>
                </div>

                {/* Season */}
                <div>
                  <Label>Season</Label>
                  <select
                    aria-label="Season"
                    title="Season"
                    value={form.seasonId}
                    onChange={(e) => handleChange("seasonId", Number(e.target.value))}
                    disabled={!!isReadOnly}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  >
                    <option value={0}>Select Season</option>
                    {seasons.map((s) => (
                      <option key={s.id} value={s.id}>{s.code} â€” {s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Buyer PO No */}
                <div>
                  <Label>Buyer PO No</Label>
                  <Input
                    placeholder="Buyer's PO reference"
                    value={form.buyerPoNo}
                    onChange={(e) => handleChange("buyerPoNo", e.target.value)}
                    disabled={!!isReadOnly}
                    maxLength={50}
                  />
                </div>

                {/* Buyer PO Date */}
                <div>
                  <Label>Buyer PO Date</Label>
                  <Input
                    type="date"
                    value={form.buyerPoDate}
                    onChange={(e) => handleChange("buyerPoDate", e.target.value)}
                    disabled={!!isReadOnly}
                  />
                </div>

                {/* SO Number (auto-generated, read-only) */}
                {isEdit && order?.soNo && (
                  <div>
                    <Label>SO Number</Label>
                    <Input
                      value={order.soNo}
                      disabled
                    />
                    <p className="text-xs text-gray-400 mt-1">Auto-generated</p>
                  </div>
                )}

                {/* Company */}
                <div>
                  <Label>Company</Label>
                  <select
                    aria-label="Company"
                    title="Company"
                    value={form.companyId}
                    onChange={(e) => handleChange("companyId", Number(e.target.value))}
                    disabled={!!isReadOnly}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  >
                    <option value={0}>Select Company</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>{c.code} â€” {c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Buying Agent */}
                <div>
                  <Label>Buying Agent</Label>
                  <select
                    aria-label="Buying Agent"
                    title="Buying Agent"
                    value={form.buyingAgentId}
                    onChange={(e) => handleChange("buyingAgentId", Number(e.target.value))}
                    disabled={!!isReadOnly}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  >
                    <option value={0}>Select Buying Agent</option>
                    {buyingAgents.map((a) => (
                      <option key={a.id} value={a.id}>{a.code} â€” {a.name}</option>
                    ))}
                  </select>
                </div>

                {/* Merchant */}
                <div>
                  <Label>Merchant</Label>
                  <select
                    aria-label="Merchant"
                    title="Merchant"
                    value={form.merchantId}
                    onChange={(e) => handleChange("merchantId", Number(e.target.value))}
                    disabled={!!isReadOnly}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  >
                    <option value={0}>Select Merchant</option>
                    {merchants.map((m) => (
                      <option key={m.id} value={m.id}>{m.fullName}</option>
                    ))}
                  </select>
                </div>

                {/* Party Group */}
                <div>
                  <Label>Party Group</Label>
                  <select
                    aria-label="Party Group"
                    title="Party Group"
                    value={form.partyGroupId}
                    onChange={(e) => handleChange("partyGroupId", Number(e.target.value))}
                    disabled={!!isReadOnly}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  >
                    <option value={0}>Select Party Group</option>
                    {partyGroups.map((p) => (
                      <option key={p.id} value={p.id}>{p.code} â€” {p.name}</option>
                    ))}
                  </select>
                </div>

                {/* Thread Quality */}
                <div>
                  <Label>Sewing Thread Quality</Label>
                  <select
                    aria-label="Sewing Thread Quality"
                    title="Sewing Thread Quality"
                    value={form.threadQualityId}
                    onChange={(e) => handleChange("threadQualityId", Number(e.target.value))}
                    disabled={!!isReadOnly}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  >
                    <option value={0}>Select Thread Quality</option>
                    {threadQualities.map((t) => (
                      <option key={t.id} value={t.id}>{t.code} â€” {t.name}</option>
                    ))}
                  </select>
                </div>

                {/* Order Date */}
                <div>
                  <Label>Order Date *</Label>
                  <Input
                    type="date"
                    value={form.orderDate}
                    onChange={(e) => handleChange("orderDate", e.target.value)}
                    disabled={!!isReadOnly}
                  />
                </div>

                {/* Ex-Factory Date */}
                <div>
                  <Label>Ex-Factory Date *</Label>
                  <Input
                    type="date"
                    value={form.exFactoryDate}
                    onChange={(e) => handleChange("exFactoryDate", e.target.value)}
                    disabled={!!isReadOnly}
                  />
                </div>

                {/* Ship Mode */}
                <div>
                  <Label>Ship Mode</Label>
                  <select
                    aria-label="Ship Mode"
                    title="Ship Mode"
                    value={form.shipMode}
                    onChange={(e) => handleChange("shipMode", e.target.value)}
                    disabled={!!isReadOnly}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  >
                    {SHIP_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                {/* Destination Port */}
                <div>
                  <Label>Destination Port</Label>
                  <Input
                    placeholder="e.g. New York"
                    value={form.destinationPort}
                    onChange={(e) => handleChange("destinationPort", e.target.value)}
                    disabled={!!isReadOnly}
                  />
                </div>

                {/* Incoterm */}
                <div>
                  <Label>Incoterm</Label>
                  <select
                    aria-label="Incoterm"
                    title="Incoterm"
                    value={form.incoterm}
                    onChange={(e) => handleChange("incoterm", e.target.value)}
                    disabled={!!isReadOnly}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  >
                    {INCOTERMS.map((i) => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>

                {/* Currency */}
                <div>
                  <Label>Currency</Label>
                  <Input
                    value={form.currency}
                    onChange={(e) => handleChange("currency", e.target.value)}
                    disabled={!!isReadOnly}
                    maxLength={3}
                  />
                </div>

                {/* Exchange Rate */}
                <div>
                  <Label>Exchange Rate (to INR)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 83.50"
                    value={form.exchangeRate}
                    onChange={(e) => handleChange("exchangeRate", e.target.value)}
                    disabled={!!isReadOnly}
                  />
                </div>

                {/* Payment Terms */}
                <div>
                  <Label>Payment Terms</Label>
                  <Input
                    placeholder="Net 30"
                    value={form.paymentTerms}
                    onChange={(e) => handleChange("paymentTerms", e.target.value)}
                    disabled={!!isReadOnly}
                  />
                </div>

                {/* Remarks */}
                <div className="sm:col-span-2 lg:col-span-3">
                  <Label>Remarks</Label>
                  <textarea
                    placeholder="Order notes..."
                    value={form.remarks}
                    onChange={(e) => setForm((prev) => ({ ...prev, remarks: e.target.value }))}
                    disabled={!!isReadOnly}
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  />
                </div>

                {/* â”€â”€ References & LC Section â”€â”€ */}
                <div className="sm:col-span-2 lg:col-span-3 mt-2">
                  <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-1">
                    References &amp; LC
                  </h4>
                </div>

                {/* LC No */}
                <div>
                  <Label>LC No</Label>
                  <Input
                    placeholder="Letter of Credit No."
                    value={form.lcNo}
                    onChange={(e) => handleChange("lcNo", e.target.value)}
                    disabled={!!isReadOnly}
                    maxLength={50}
                  />
                </div>

                {/* LC Date */}
                <div>
                  <Label>LC Date</Label>
                  <Input
                    type="date"
                    value={form.lcDate}
                    onChange={(e) => handleChange("lcDate", e.target.value)}
                    disabled={!!isReadOnly}
                  />
                </div>

                {/* File No */}
                <div>
                  <Label>File No</Label>
                  <Input
                    placeholder="File reference"
                    value={form.fileNo}
                    onChange={(e) => handleChange("fileNo", e.target.value)}
                    disabled={!!isReadOnly}
                    maxLength={50}
                  />
                </div>

                {/* PI No */}
                <div>
                  <Label>PI No</Label>
                  <Input
                    placeholder="Proforma Invoice No."
                    value={form.piNo}
                    onChange={(e) => handleChange("piNo", e.target.value)}
                    disabled={!!isReadOnly}
                    maxLength={50}
                  />
                </div>

                {/* Reference No */}
                <div>
                  <Label>Reference No</Label>
                  <Input
                    placeholder="General reference"
                    value={form.referenceNo}
                    onChange={(e) => handleChange("referenceNo", e.target.value)}
                    disabled={!!isReadOnly}
                    maxLength={50}
                  />
                </div>

                {/* â”€â”€ Delivery Section â”€â”€ */}
                <div className="sm:col-span-2 lg:col-span-3 mt-2">
                  <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-1">
                    Delivery
                  </h4>
                </div>

                {/* Delivery Branch */}
                <div>
                  <Label>Delivery Branch</Label>
                  <select
                    aria-label="Delivery Branch"
                    title="Delivery Branch"
                    value={form.deliveryBranchId}
                    onChange={(e) => handleChange("deliveryBranchId", Number(e.target.value))}
                    disabled={!!isReadOnly}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  >
                    <option value={0}>Select Branch</option>
                    {branches
                      .filter((b) => !form.companyId || b.companyId === form.companyId)
                      .map((b) => (
                        <option key={b.id} value={b.id}>{b.code} â€” {b.name}</option>
                      ))}
                  </select>
                </div>

                {/* Delivery Address */}
                <div className="sm:col-span-2">
                  <Label>Delivery Address</Label>
                  <textarea
                    placeholder="Delivery address..."
                    value={form.deliveryAddress}
                    onChange={(e) => setForm((prev) => ({ ...prev, deliveryAddress: e.target.value }))}
                    disabled={!!isReadOnly}
                    rows={2}
                    className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  />
                </div>
              </div>

              {/* Summary bar — values come from server-side rollups on the loaded order */}
              <div className="flex items-center gap-6 mt-6 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Qty</p>
                  <p className="text-lg font-bold text-gray-800 dark:text-white">
                    {(order?.totalQty ?? 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Value</p>
                  <p className="text-lg font-bold text-gray-800 dark:text-white">
                    {form.currency} {Number(order?.totalValue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
                {!order && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 italic">
                    Save the header first, then add PO Lines in the PO Matrix tab.
                  </p>
                )}
              </div>

              {/* Save / Cancel */}
              {!isReadOnly && (
                <div className="flex items-center gap-3 mt-6 pt-5 border-t border-gray-100 dark:border-gray-800">
                  <Button size="sm" disabled={saving}>
                    {saving ? "Saving..." : isEdit ? "Update Order" : "Create Order"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => navigate("/merchandising/orders")}
                    className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </form>
          )}

          {/* ── PO Matrix Tab (new Excel-style entry) ── */}
          {activeTab === "poMatrix" && (
            <POMatrixSection orderId={order?.id ?? null} orderStatus={order?.status} />
          )}

          {/* ── Fabric Consumption Tab (engineering) ── */}
          {activeTab === "fabricConsumption" && (
            <FabricConsumptionSection orderId={order?.id ?? null} orderStatus={order?.status} />
          )}

          {/* ── Process Sequence Tab (engineering process flow) ── */}
          {activeTab === "processSequence" && (
            <ProcessSequenceSection orderId={order?.id ?? null} orderStatus={order?.status} />
          )}

          {/* ── Shipments Tab ── */}
          {activeTab === "shipments" && order && (
            <ShipmentSchedulePanel orderId={order.id} readOnly={!!isReadOnly} />
          )}

          {/* â”€â”€ Revision History Tab â”€â”€ */}
          {activeTab === "history" && order && (
            <div>
              {order.revisions.length === 0 ? (
                <p className="py-8 text-center text-gray-400">No revisions yet.</p>
              ) : (
                <div className="space-y-3">
                  {order.revisions.map((rev) => (
                    <div key={rev.id} className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                          Revision #{rev.revisionNo}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(rev.changeDate).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{rev.changeReason}</p>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded bg-red-50 p-2 dark:bg-red-900/20">
                          <span className="font-medium text-red-600">Old:</span>{" "}
                          <code className="text-red-700 dark:text-red-400">{JSON.stringify(rev.oldValues)}</code>
                        </div>
                        <div className="rounded bg-green-50 p-2 dark:bg-green-900/20">
                          <span className="font-medium text-green-600">New:</span>{" "}
                          <code className="text-green-700 dark:text-green-400">{JSON.stringify(rev.newValues)}</code>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {order && (
        <AmendOrderDialog
          order={order}
          open={amendOpen}
          onClose={() => setAmendOpen(false)}
          onAmended={(refreshed) => setOrder(refreshed)}
        />
      )}
    </>
  );
}
