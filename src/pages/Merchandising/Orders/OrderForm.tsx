import { useEffect, useState, useCallback, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router";
import {
  getBuyerOrder,
  createBuyerOrder,
  updateBuyerOrder,
  updateOrderStatus,
  type BuyerOrderFull,
  type OrderDetailInput,
  type CreateBuyerOrderInput,
} from "../../../api/merchandising";
import { masterApi, type Buyer, type StyleMaster, type Color, type Season,
  type CompanyMaster, type BranchMaster, type BuyingAgent, type PartyGroup,
  type ThreadQuality, type Merchant, type Material, type MaterialCategory,
  type SectionMaster, type CountMaster } from "../../../api/master";
import PageMeta from "../../../components/common/PageMeta";
import Label from "../../../components/form/Label";
import Input from "../../../components/form/input/InputField";
import Button from "../../../components/ui/button/Button";

// Types
let _lineIdCounter = 0;

interface LineItemRow {
  _id: number;            // local unique id for React key
  colorId: number;
  colorCode: string;
  colorName: string;
  sizeCode: string;
  orderedQty: number;
  unitPrice: number;
  // Extended per-color-row fields
  materialCategoryId: number | null;
  materialId: number | null;
  countId: number | null;
  poNo: string;
  meterQty: number | null;
  sectionId: number | null;
  unit: string;
  lineRemarks: string;
}

interface StyleDetail {
  id: number;
  styleNo: string;
  styleName: string;
  garmentType: string | null;
  colorSizes: Array<{
    id: number;
    colorId: number;
    sizeCode: string;
    skuCode: string;
    color: { id: number; colorCode: string; colorName: string };
  }>;
}

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
  const [activeTab, setActiveTab] = useState<"details" | "skuGrid" | "history">("details");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Lookups
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [styles, setStyles] = useState<StyleMaster[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [allColors, setAllColors] = useState<Color[]>([]);
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

  // Line items grid (replaces old SKU grid)
  const [lineItems, setLineItems] = useState<LineItemRow[]>([]);
  const [globalUnitPrice, setGlobalUnitPrice] = useState(0);

  // Additional lookups for line-item dropdowns
  const [materialCategories, setMaterialCategories] = useState<MaterialCategory[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [counts, setCounts] = useState<CountMaster[]>([]);
  const [sections, setSections] = useState<SectionMaster[]>([]);
  const [unitsList, setUnitsList] = useState<string[]>([]);

  // Original order (for edit/view)
  const [order, setOrder] = useState<BuyerOrderFull | null>(null);

  // ── Load lookups ──
  useEffect(() => {
    Promise.all([
      masterApi.listBuyers({ limit: 100 }),
      masterApi.listStyles({ limit: 100 }),
      masterApi.listSeasons(),
      masterApi.listColors(),
      masterApi.listCompanies({ limit: 100 }),
      masterApi.listBranches({ limit: 100 }),
      masterApi.listBuyingAgents({ limit: 100 }),
      masterApi.listPartyGroups(),
      masterApi.listThreadQualities(),
      masterApi.listMerchants(),
      masterApi.listMaterialCategories(),
      masterApi.listMaterials({ limit: 500 }),
      masterApi.listCounts(),
      masterApi.listSections(),
      masterApi.listUnits(),
    ]).then(([b, s, sn, c, co, br, ba, pg, tq, me, mc, mat, ct, sec, un]) => {
      setBuyers((b.data as { data: Buyer[] }).data || []);
      setStyles((s.data as { data: StyleMaster[] }).data || []);
      setSeasons((sn.data as { data: Season[] }).data || []);
      setAllColors((c.data as { data: Color[] }).data || []);
      setCompanies((co.data as { data: CompanyMaster[] }).data || []);
      setBranches((br.data as { data: BranchMaster[] }).data || []);
      setBuyingAgents((ba.data as { data: BuyingAgent[] }).data || []);
      setPartyGroups((pg.data as { data: PartyGroup[] }).data || []);
      setThreadQualities((tq.data as { data: ThreadQuality[] }).data || []);
      setMerchants((me.data as { data: Merchant[] }).data || []);
      setMaterialCategories((mc.data as { data: MaterialCategory[] }).data || []);
      setMaterials((mat.data as { data: Material[] }).data || []);
      setCounts((ct.data as { data: CountMaster[] }).data || []);
      setSections((sec.data as { data: SectionMaster[] }).data || []);
      // units endpoint returns string[]
      const unitsData = (un.data as { data: string[] }).data;
      setUnitsList(Array.isArray(unitsData) ? unitsData : ["PCS", "MTR", "KG", "SET", "DOZ", "YDS", "ROLL", "CONE"]);
    });
  }, []);

  // ── Load existing order ──
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

        // Rebuild line items from details
        rebuildLineItemsFromDetails(o.details);
      })
      .catch(() => navigate("/merchandising/orders"))
      .finally(() => setLoading(false));
  }, [id, isEdit, navigate]);

  // ── Rebuild line items from order details (edit mode) ──
  const rebuildLineItemsFromDetails = (details: BuyerOrderFull["details"]) => {
    const rows: LineItemRow[] = details.map((d) => ({
      _id: ++_lineIdCounter,
      colorId: d.colorId,
      colorCode: d.color.colorCode,
      colorName: d.color.colorName,
      sizeCode: d.sizeCode,
      orderedQty: d.orderedQty,
      unitPrice: Number(d.unitPrice),
      materialCategoryId: d.materialCategoryId,
      materialId: d.materialId,
      countId: d.countId,
      poNo: d.poNo || "",
      meterQty: d.meterQty ? Number(d.meterQty) : null,
      sectionId: d.sectionId,
      unit: d.unit || "",
      lineRemarks: d.lineRemarks || "",
    }));
    setLineItems(rows);
    if (rows.length > 0) {
      setGlobalUnitPrice(rows[0].unitPrice);
    }
  };

  // ── When style changes, generate flat line-item rows ──
  const handleStyleChange = useCallback(async (styleId: number) => {
    if (!styleId) return;
    try {
      const resp = await masterApi.getStyle(styleId);
      const style = ((resp.data as unknown) as { data: StyleDetail }).data;

      // Generate one row per color+size combo
      const rows: LineItemRow[] = style.colorSizes.map((cs) => ({
        _id: ++_lineIdCounter,
        colorId: cs.color.id,
        colorCode: cs.color.colorCode,
        colorName: cs.color.colorName,
        sizeCode: cs.sizeCode,
        orderedQty: 0,
        unitPrice: globalUnitPrice,
        materialCategoryId: null,
        materialId: null,
        countId: null,
        poNo: "",
        meterQty: null,
        sectionId: null,
        unit: "",
        lineRemarks: "",
      }));

      setLineItems(rows);
    } catch {
      setLineItems([]);
    }
  }, [globalUnitPrice]);

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
    if (field === "styleId") {
      handleStyleChange(Number(value));
    }
  };

  // Shared fields propagate to all rows of the same color
  const SHARED_FIELDS: (keyof LineItemRow)[] = [
    "materialCategoryId", "materialId", "countId", "poNo", "meterQty", "sectionId", "unit",
  ];

  const handleLineChange = (rowId: number, field: keyof LineItemRow, value: string | number | null) => {
    setLineItems((prev) => {
      const targetRow = prev.find((r) => r._id === rowId);
      if (!targetRow) return prev;
      const isShared = SHARED_FIELDS.includes(field);

      return prev.map((row) => {
        if (row._id === rowId) {
          const updated = { ...row, [field]: value };
          // When category changes, reset material for all same-color rows
          if (field === "materialCategoryId") {
            updated.materialId = null;
          }
          return updated;
        }
        // Propagate shared fields to same-color rows
        if (isShared && row.colorId === targetRow.colorId) {
          const updated = { ...row, [field]: value };
          if (field === "materialCategoryId") {
            updated.materialId = null;
          }
          return updated;
        }
        return row;
      });
    });
  };

  const applyGlobalPrice = () => {
    setLineItems((prev) => prev.map((row) => ({ ...row, unitPrice: globalUnitPrice })));
  };

  // Add a manual line-item row
  const addLineRow = () => {
    const newRow: LineItemRow = {
      _id: ++_lineIdCounter,
      colorId: 0,
      colorCode: "",
      colorName: "",
      sizeCode: "",
      orderedQty: 0,
      unitPrice: globalUnitPrice,
      materialCategoryId: null,
      materialId: null,
      countId: null,
      poNo: "",
      meterQty: null,
      sectionId: null,
      unit: "",
      lineRemarks: "",
    };
    setLineItems((prev) => [...prev, newRow]);
  };

  const removeLineRow = (rowId: number) => {
    setLineItems((prev) => prev.filter((r) => r._id !== rowId));
  };

  // Calculate totals
  const totalQty = lineItems.reduce((sum, row) => sum + row.orderedQty, 0);
  const totalValue = lineItems.reduce((sum, row) => sum + row.orderedQty * row.unitPrice, 0);

  // Build detail lines for API
  const buildDetails = (): OrderDetailInput[] => {
    const styleNo = styles.find((s) => s.id === form.styleId)?.styleNo || "STY";
    return lineItems
      .filter((row) => row.orderedQty > 0 && row.colorId > 0)
      .map((row) => ({
        colorId: row.colorId,
        colorName: row.colorName,
        sizeCode: row.sizeCode,
        skuCode: `${styleNo}-${row.colorCode}-${row.sizeCode}`,
        orderedQty: row.orderedQty,
        unitPrice: row.unitPrice,
        totalAmount: row.orderedQty * row.unitPrice,
        materialCategoryId: row.materialCategoryId || null,
        materialId: row.materialId || null,
        countId: row.countId || null,
        poNo: row.poNo || null,
        meterQty: row.meterQty || null,
        sectionId: row.sectionId || null,
        unit: row.unit || null,
        lineRemarks: row.lineRemarks || null,
      }));
  };

  // ── Submit ──
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    const details = buildDetails();
    if (details.length === 0) {
      setError("Please enter quantities for at least one SKU.");
      return;
    }

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
        details,
      };

      if (isEdit) {
        await updateBuyerOrder(Number(id), payload);
      } else {
        await createBuyerOrder(payload);
      }
      navigate("/merchandising/orders");
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr?.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  // ── Status transition ──
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
                    Rev. {order.revisionNo} · Created {new Date(order.createdAt).toLocaleDateString()}
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
            {(["details", "skuGrid", ...(isEdit ? ["history"] : [])] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as typeof activeTab)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors
                  ${activeTab === tab
                    ? "border-brand-500 text-brand-500"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
                  }`}
              >
                {tab === "details" ? "Order Details" : tab === "skuGrid" ? "SKU Grid" : "Revision History"}
              </button>
            ))}
          </div>

          {/* ── Details Tab ── */}
          {activeTab === "details" && (
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {/* Buyer */}
                <div>
                  <Label>Buyer *</Label>
                  <select
                    value={form.buyerId}
                    onChange={(e) => handleChange("buyerId", Number(e.target.value))}
                    disabled={!!isReadOnly}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  >
                    <option value={0}>Select Buyer</option>
                    {buyers.map((b) => (
                      <option key={b.id} value={b.id}>{b.code} — {b.name}</option>
                    ))}
                  </select>
                </div>

                {/* Style */}
                <div>
                  <Label>Style *</Label>
                  <select
                    value={form.styleId}
                    onChange={(e) => handleChange("styleId", Number(e.target.value))}
                    disabled={!!isReadOnly}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  >
                    <option value={0}>Select Style</option>
                    {styles
                      .filter((s) => !form.buyerId || s.buyerId === form.buyerId)
                      .map((s) => (
                        <option key={s.id} value={s.id}>{s.styleNo} — {s.styleName}</option>
                      ))
                    }
                  </select>
                </div>

                {/* Season */}
                <div>
                  <Label>Season</Label>
                  <select
                    value={form.seasonId}
                    onChange={(e) => handleChange("seasonId", Number(e.target.value))}
                    disabled={!!isReadOnly}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  >
                    <option value={0}>Select Season</option>
                    {seasons.map((s) => (
                      <option key={s.id} value={s.id}>{s.code} — {s.name}</option>
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
                    value={form.companyId}
                    onChange={(e) => handleChange("companyId", Number(e.target.value))}
                    disabled={!!isReadOnly}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  >
                    <option value={0}>Select Company</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Buying Agent */}
                <div>
                  <Label>Buying Agent</Label>
                  <select
                    value={form.buyingAgentId}
                    onChange={(e) => handleChange("buyingAgentId", Number(e.target.value))}
                    disabled={!!isReadOnly}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  >
                    <option value={0}>Select Buying Agent</option>
                    {buyingAgents.map((a) => (
                      <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                    ))}
                  </select>
                </div>

                {/* Merchant */}
                <div>
                  <Label>Merchant</Label>
                  <select
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
                    value={form.partyGroupId}
                    onChange={(e) => handleChange("partyGroupId", Number(e.target.value))}
                    disabled={!!isReadOnly}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  >
                    <option value={0}>Select Party Group</option>
                    {partyGroups.map((p) => (
                      <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
                    ))}
                  </select>
                </div>

                {/* Thread Quality */}
                <div>
                  <Label>Sewing Thread Quality</Label>
                  <select
                    value={form.threadQualityId}
                    onChange={(e) => handleChange("threadQualityId", Number(e.target.value))}
                    disabled={!!isReadOnly}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  >
                    <option value={0}>Select Thread Quality</option>
                    {threadQualities.map((t) => (
                      <option key={t.id} value={t.id}>{t.code} — {t.name}</option>
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

                {/* ── References & LC Section ── */}
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

                {/* ── Delivery Section ── */}
                <div className="sm:col-span-2 lg:col-span-3 mt-2">
                  <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-1">
                    Delivery
                  </h4>
                </div>

                {/* Delivery Branch */}
                <div>
                  <Label>Delivery Branch</Label>
                  <select
                    value={form.deliveryBranchId}
                    onChange={(e) => handleChange("deliveryBranchId", Number(e.target.value))}
                    disabled={!!isReadOnly}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  >
                    <option value={0}>Select Branch</option>
                    {branches
                      .filter((b) => !form.companyId || b.companyId === form.companyId)
                      .map((b) => (
                        <option key={b.id} value={b.id}>{b.code} — {b.name}</option>
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

              {/* Summary bar */}
              <div className="flex items-center gap-6 mt-6 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Qty</p>
                  <p className="text-lg font-bold text-gray-800 dark:text-white">{totalQty.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Value</p>
                  <p className="text-lg font-bold text-gray-800 dark:text-white">
                    {form.currency} {totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">SKU Lines</p>
                  <p className="text-lg font-bold text-gray-800 dark:text-white">{buildDetails().length}</p>
                </div>
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

          {/* ── SKU Grid Tab ── */}
          {activeTab === "skuGrid" && (
            <div>
              {/* Global Price + Add Row */}
              {!isReadOnly && (
                <div className="flex flex-wrap items-end gap-4 mb-5">
                  <div>
                    <Label>Unit Price ({form.currency})</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        value={String(globalUnitPrice)}
                        onChange={(e) => setGlobalUnitPrice(Number(e.target.value))}
                        placeholder="0.00"
                      />
                      <button
                        type="button"
                        onClick={applyGlobalPrice}
                        className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                      >
                        Apply to All
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={addLineRow}
                    className="rounded-lg bg-brand-500 px-4 py-2.5 text-xs font-medium text-white hover:bg-brand-600"
                  >
                    + Add Row
                  </button>
                </div>
              )}

              {lineItems.length === 0 ? (
                <div className="py-12 text-center text-gray-400">
                  {form.styleId
                    ? "No colors/sizes found for this style. Add rows manually."
                    : "Select a style first to load the line items."}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b-2 border-blue-600">
                        <th className="px-2 py-2 text-left font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50">Category<span className="text-red-500">*</span></th>
                        <th className="px-2 py-2 text-left font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50">Item<span className="text-red-500">*</span></th>
                        <th className="px-2 py-2 text-left font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50">Count</th>
                        <th className="px-2 py-2 text-left font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50">Po No.</th>
                        <th className="px-2 py-2 text-left font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50">Meter</th>
                        <th className="px-2 py-2 text-left font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50">Section<span className="text-red-500">*</span></th>
                        <th className="px-2 py-2 text-left font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50">Style No.</th>
                        <th className="px-2 py-2 text-left font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50">Size</th>
                        <th className="px-2 py-2 text-left font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50">Unit<span className="text-red-500">*</span></th>
                        <th className="px-2 py-2 text-left font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50">Color</th>
                        <th className="px-2 py-2 text-right font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50">Quantity<span className="text-red-500">*</span></th>
                        <th className="px-2 py-2 text-left font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50">Remarks</th>
                        {!isReadOnly && <th className="px-2 py-2 w-8 bg-gray-50 dark:bg-gray-800/50"></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((row) => {
                        const filteredMaterials = row.materialCategoryId
                          ? materials.filter((m) => m.categoryId === row.materialCategoryId)
                          : materials;
                        const styleNo = styles.find((s) => s.id === form.styleId)?.styleNo || "";

                        return (
                          <tr key={row._id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                            {/* Category */}
                            <td className="px-1 py-1">
                              <select
                                value={row.materialCategoryId || ""}
                                onChange={(e) => handleLineChange(row._id, "materialCategoryId", e.target.value ? Number(e.target.value) : null)}
                                disabled={!!isReadOnly}
                                className="w-full h-8 rounded border border-gray-200 bg-transparent px-1 text-xs text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:text-white/90 disabled:opacity-60"
                              >
                                <option value="">Category</option>
                                {materialCategories.map((mc) => (
                                  <option key={mc.id} value={mc.id}>{mc.name}</option>
                                ))}
                              </select>
                            </td>
                            {/* Item (Material) */}
                            <td className="px-1 py-1">
                              <select
                                value={row.materialId || ""}
                                onChange={(e) => handleLineChange(row._id, "materialId", e.target.value ? Number(e.target.value) : null)}
                                disabled={!!isReadOnly}
                                className="w-full h-8 rounded border border-gray-200 bg-transparent px-1 text-xs text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:text-white/90 disabled:opacity-60 min-w-28"
                              >
                                <option value="">Select</option>
                                {filteredMaterials.map((m) => (
                                  <option key={m.id} value={m.id}>{m.materialCode} — {m.materialName}</option>
                                ))}
                              </select>
                            </td>
                            {/* Count */}
                            <td className="px-1 py-1">
                              <select
                                value={row.countId || ""}
                                onChange={(e) => handleLineChange(row._id, "countId", e.target.value ? Number(e.target.value) : null)}
                                disabled={!!isReadOnly}
                                className="w-full h-8 rounded border border-gray-200 bg-transparent px-1 text-xs text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:text-white/90 disabled:opacity-60"
                              >
                                <option value="">Count</option>
                                {counts.map((c) => (
                                  <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                              </select>
                            </td>
                            {/* PO No */}
                            <td className="px-1 py-1">
                              <input
                                type="text"
                                value={row.poNo}
                                onChange={(e) => handleLineChange(row._id, "poNo", e.target.value)}
                                disabled={!!isReadOnly}
                                placeholder="Po No."
                                className="w-full h-8 rounded border border-gray-200 bg-transparent px-2 text-xs text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:text-white/90 disabled:opacity-60 min-w-16"
                              />
                            </td>
                            {/* Meter */}
                            <td className="px-1 py-1">
                              <input
                                type="number"
                                step="0.01"
                                value={row.meterQty ?? ""}
                                onChange={(e) => handleLineChange(row._id, "meterQty", e.target.value ? Number(e.target.value) : null)}
                                disabled={!!isReadOnly}
                                placeholder="Meter"
                                className="w-full h-8 rounded border border-gray-200 bg-transparent px-2 text-xs text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:text-white/90 disabled:opacity-60 min-w-16"
                              />
                            </td>
                            {/* Section */}
                            <td className="px-1 py-1">
                              <select
                                value={row.sectionId || ""}
                                onChange={(e) => handleLineChange(row._id, "sectionId", e.target.value ? Number(e.target.value) : null)}
                                disabled={!!isReadOnly}
                                className="w-full h-8 rounded border border-gray-200 bg-transparent px-1 text-xs text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:text-white/90 disabled:opacity-60"
                              >
                                <option value="">Section</option>
                                {sections.map((s) => (
                                  <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                              </select>
                            </td>
                            {/* Style No (read-only) */}
                            <td className="px-2 py-1">
                              <span className="text-xs text-gray-600 dark:text-gray-300">{styleNo}</span>
                            </td>
                            {/* Size */}
                            <td className="px-1 py-1">
                              {row.sizeCode ? (
                                <span className="text-xs text-gray-700 dark:text-gray-200">{row.sizeCode}</span>
                              ) : (
                                <input
                                  type="text"
                                  value={row.sizeCode}
                                  onChange={(e) => handleLineChange(row._id, "sizeCode", e.target.value)}
                                  disabled={!!isReadOnly}
                                  placeholder="Size"
                                  className="w-full h-8 rounded border border-gray-200 bg-transparent px-2 text-xs text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:text-white/90 disabled:opacity-60 min-w-12"
                                />
                              )}
                            </td>
                            {/* Unit */}
                            <td className="px-1 py-1">
                              <select
                                value={row.unit}
                                onChange={(e) => handleLineChange(row._id, "unit", e.target.value)}
                                disabled={!!isReadOnly}
                                className="w-full h-8 rounded border border-gray-200 bg-transparent px-1 text-xs text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:text-white/90 disabled:opacity-60"
                              >
                                <option value="">unit</option>
                                {unitsList.map((u) => (
                                  <option key={u} value={u}>{u}</option>
                                ))}
                              </select>
                            </td>
                            {/* Color */}
                            <td className="px-1 py-1">
                              {row.colorId > 0 ? (
                                <span className="text-xs text-gray-700 dark:text-gray-200">{row.colorName}</span>
                              ) : (
                                <select
                                  value={row.colorId || ""}
                                  onChange={(e) => {
                                    const cid = Number(e.target.value);
                                    const color = allColors.find((c) => c.id === cid);
                                    if (color) {
                                      setLineItems((prev) =>
                                        prev.map((r) =>
                                          r._id === row._id
                                            ? { ...r, colorId: color.id, colorCode: color.colorCode, colorName: color.colorName }
                                            : r
                                        )
                                      );
                                    }
                                  }}
                                  className="w-full h-8 rounded border border-gray-200 bg-transparent px-1 text-xs text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:text-white/90"
                                >
                                  <option value="">Color</option>
                                  {allColors.map((c) => (
                                    <option key={c.id} value={c.id}>{c.colorName}</option>
                                  ))}
                                </select>
                              )}
                            </td>
                            {/* Quantity */}
                            <td className="px-1 py-1">
                              <input
                                type="number"
                                min={0}
                                value={row.orderedQty || ""}
                                onChange={(e) => handleLineChange(row._id, "orderedQty", Number(e.target.value) || 0)}
                                disabled={!!isReadOnly}
                                className="w-full h-8 rounded border border-gray-200 bg-transparent px-2 text-right text-xs text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:text-white/90 disabled:opacity-60 min-w-16"
                              />
                            </td>
                            {/* Remarks */}
                            <td className="px-1 py-1">
                              <input
                                type="text"
                                value={row.lineRemarks}
                                onChange={(e) => handleLineChange(row._id, "lineRemarks", e.target.value)}
                                disabled={!!isReadOnly}
                                placeholder="Remarks"
                                className="w-full h-8 rounded border border-gray-200 bg-transparent px-2 text-xs text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:text-white/90 disabled:opacity-60 min-w-20"
                              />
                            </td>
                            {/* Remove */}
                            {!isReadOnly && (
                              <td className="px-1 py-1 text-center">
                                <button
                                  type="button"
                                  onClick={() => removeLineRow(row._id)}
                                  className="text-red-400 hover:text-red-600 text-xs"
                                  title="Remove row"
                                >
                                  ✕
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50 dark:bg-gray-800/50">
                        <td colSpan={10} className="px-3 py-2 text-right font-bold text-sm text-gray-700 dark:text-gray-200">
                          TOTAL :
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-sm text-gray-800 dark:text-white">
                          {totalQty.toLocaleString()}
                        </td>
                        <td></td>
                        {!isReadOnly && (
                          <td className="px-1 py-2 text-center">
                            <button
                              type="button"
                              onClick={addLineRow}
                              className="text-green-600 hover:text-green-800 text-lg font-bold"
                              title="Add row"
                            >
                              ⊕
                            </button>
                          </td>
                        )}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Revision History Tab ── */}
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
    </>
  );
}
