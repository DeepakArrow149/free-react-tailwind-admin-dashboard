import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import client from "../../api/client";
import { PaginatedTable } from "../../components/table";
import TableSkeleton from '@/components/common/TableSkeleton';

/* ── Types ── */
interface EInvoice {
  id: number;
  invoiceId: number;
  irn: string | null;
  ackNo: string | null;
  ackDate: string | null;
  status: string;
  gstin: string;
  buyerGstin: string | null;
  docType: string;
  supplyType: string;
  totalValue: number | null;
  taxableValue: number | null;
  cgstAmount: number | null;
  sgstAmount: number | null;
  igstAmount: number | null;
  cessAmount: number | null;
  errorMessage: string | null;
  cancelReason: string | null;
  cancelDate: string | null;
  createdAt: string;
  invoice?: { id: number; invoiceNo: string; invoiceDate?: string; totalAmount?: number; buyer?: { id: number; name: string } };
  ewayBill?: EWayBill | null;
}

interface EWayBill {
  id: number;
  ewbNo: string | null;
  ewbDate: string | null;
  validUpto: string | null;
  status: string;
  transporterName: string | null;
  transMode: string | null;
  vehicleNo: string | null;
  transDistance: number | null;
  invoiceId?: number;
  eInvoiceId?: number;
  fromPincode?: string | null;
  toPincode?: string | null;
  invoice?: { id: number; invoiceNo: string } | null;
  eInvoice?: { irn: string | null } | null;
  cancelReason?: string | null;
}

interface SalesInvoice {
  id: number;
  invoiceNo: string;
  invoiceDate: string;
  totalAmount: number;
  buyer?: { id: number; name: string };
}

/* ── Component ── */
export default function EInvoicePage() {
  const [tab, setTab] = useState<"einvoice" | "ewb">("einvoice");
  const [eInvoices, setEInvoices] = useState<EInvoice[]>([]);
  const [ewayBills, setEwayBills] = useState<EWayBill[]>([]);
  const [loading, setLoading] = useState(false);

  /* Generate modal */
  const [showGenerate, setShowGenerate] = useState(false);
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | "">("");
  const [gstin, setGstin] = useState("");
  const [supplyType, setSupplyType] = useState("B2B");

  /* EWB Generate modal */
  const [showEwbGenerate, setShowEwbGenerate] = useState(false);
  const [ewbForm, setEwbForm] = useState({
    invoiceId: "" as number | "",
    eInvoiceId: "" as number | "",
    transporterName: "",
    transMode: "ROAD",
    vehicleNo: "",
    transDistance: "",
    fromPincode: "",
    toPincode: "",
  });

  /* Cancel modal */
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [cancelType, setCancelType] = useState<"einvoice" | "ewb">("einvoice");
  const [cancelReason, setCancelReason] = useState("");

  const fetchEInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await client.get("/finance/gst/e-invoices");
      setEInvoices(res.data.data || []);
    } catch { toast.error("Failed to fetch E-Invoices"); }
    setLoading(false);
  }, []);

  const fetchEwayBills = useCallback(async () => {
    setLoading(true);
    try {
      const res = await client.get("/finance/gst/eway-bills");
      setEwayBills(res.data.data || []);
    } catch { toast.error("Failed to fetch E-Way Bills"); }
    setLoading(false);
  }, []);

  const fetchInvoices = useCallback(async () => {
    try {
      const res = await client.get("/finance/sales-invoices", { params: { limit: 200 } });
      setInvoices(res.data.data || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (tab === "einvoice") fetchEInvoices();
    else fetchEwayBills();
  }, [tab, fetchEInvoices, fetchEwayBills]);

  /* Generate E-Invoice */
  const handleGenerate = async () => {
    if (!selectedInvoiceId || !gstin) { toast.error("Invoice and GSTIN required"); return; }
    try {
      await client.post("/finance/gst/e-invoices/generate", { invoiceId: selectedInvoiceId, gstin, supplyType });
      toast.success("E-Invoice generated");
      setShowGenerate(false);
      setSelectedInvoiceId(""); setGstin("");
      fetchEInvoices();
    } catch (e: unknown) { toast.error((e as Record<string, Record<string, Record<string, string>>>)?.response?.data?.message || "Failed"); }
  };

  /* Generate E-Way Bill */
  const handleEwbGenerate = async () => {
    if (!ewbForm.invoiceId) { toast.error("Invoice is required"); return; }
    try {
      await client.post("/finance/gst/eway-bills/generate", {
        ...ewbForm,
        invoiceId: Number(ewbForm.invoiceId),
        eInvoiceId: ewbForm.eInvoiceId ? Number(ewbForm.eInvoiceId) : null,
        transDistance: ewbForm.transDistance ? Number(ewbForm.transDistance) : null,
      });
      toast.success("E-Way Bill generated");
      setShowEwbGenerate(false);
      setEwbForm({ invoiceId: "", eInvoiceId: "", transporterName: "", transMode: "ROAD", vehicleNo: "", transDistance: "", fromPincode: "", toPincode: "" });
      fetchEwayBills();
    } catch (e: unknown) { toast.error((e as Record<string, Record<string, Record<string, string>>>)?.response?.data?.message || "Failed"); }
  };

  /* Cancel */
  const handleCancel = async () => {
    if (!cancelId || !cancelReason) { toast.error("Reason required"); return; }
    const url = cancelType === "einvoice"
      ? `/finance/gst/e-invoices/${cancelId}/cancel`
      : `/finance/gst/eway-bills/${cancelId}/cancel`;
    try {
      await client.patch(url, { cancelReason });
      toast.success("Cancelled");
      setCancelId(null); setCancelReason("");
      if (cancelType === "einvoice") fetchEInvoices(); else fetchEwayBills();
    } catch (e: unknown) { toast.error((e as Record<string, Record<string, Record<string, string>>>)?.response?.data?.message || "Failed"); }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: "bg-yellow-100 text-yellow-700",
      GENERATED: "bg-green-100 text-green-700",
      CANCELLED: "bg-red-100 text-red-700",
      ERROR: "bg-red-100 text-red-800",
      EXPIRED: "bg-gray-200 text-gray-600",
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || "bg-gray-100"}`}>{status}</span>;
  };

  return (
    <div className="p-6 max-w-350 mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">GST E-Invoice & E-Way Bill</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 w-fit">
        {(["einvoice", "ewb"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              tab === t ? "bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-300" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "einvoice" ? "E-Invoices" : "E-Way Bills"}
          </button>
        ))}
      </div>

      {/* E-INVOICE TAB */}
      {tab === "einvoice" && (
        <>
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => { setShowGenerate(true); fetchInvoices(); }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
            >
              + Generate E-Invoice
            </button>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label: "Total", value: eInvoices.length, color: "blue" },
              { label: "Generated", value: eInvoices.filter((e) => e.status === "GENERATED").length, color: "green" },
              { label: "Pending", value: eInvoices.filter((e) => e.status === "PENDING").length, color: "yellow" },
              { label: "Cancelled", value: eInvoices.filter((e) => e.status === "CANCELLED").length, color: "red" },
            ].map((c) => (
              <div key={c.label} className={`bg-${c.color}-50 dark:bg-gray-700 rounded-xl p-4 border border-${c.color}-200 dark:border-gray-600`}>
                <p className="text-sm text-gray-500 dark:text-gray-400">{c.label}</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-white">{c.value}</p>
              </div>
            ))}
          </div>

          {/* Table */}
          {loading ? <TableSkeleton rows={5} cols={9} /> : (
          <PaginatedTable data={eInvoices} pageSize={20}>
            {(pageData) => (
          <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-xl shadow">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                <tr>
                  <th className="text-left p-3">Invoice#</th>
                  <th className="text-left p-3">Buyer</th>
                  <th className="text-left p-3">IRN</th>
                  <th className="text-left p-3">GSTIN</th>
                  <th className="text-left p-3">Supply Type</th>
                  <th className="text-right p-3">Total Value</th>
                  <th className="text-center p-3">Status</th>
                  <th className="text-left p-3">Date</th>
                  <th className="text-center p-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {eInvoices.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-8 text-gray-400">No E-Invoices found</td></tr>
                ) : (
                  pageData.map((e) => (
                    <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="p-3 font-medium">{e.invoice?.invoiceNo || `INV-${e.invoiceId}`}</td>
                      <td className="p-3">{e.invoice?.buyer?.name || "—"}</td>
                      <td className="p-3 text-xs font-mono">{e.irn ? e.irn.substring(0, 20) + "..." : "—"}</td>
                      <td className="p-3">{e.gstin}</td>
                      <td className="p-3">{e.supplyType}</td>
                      <td className="p-3 text-right">₹{Number(e.totalValue || 0).toLocaleString()}</td>
                      <td className="p-3 text-center">{statusBadge(e.status)}</td>
                      <td className="p-3 text-xs">{new Date(e.createdAt).toLocaleDateString()}</td>
                      <td className="p-3 text-center">
                        {e.status === "GENERATED" && (
                          <button
                            onClick={() => { setCancelId(e.id); setCancelType("einvoice"); }}
                            className="text-red-600 text-xs hover:underline"
                          >Cancel</button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
            )}
          </PaginatedTable>
          )}
        </>
      )}

      {/* E-WAY BILL TAB */}
      {tab === "ewb" && (
        <>
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => { setShowEwbGenerate(true); fetchInvoices(); fetchEInvoices(); }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
            >
              + Generate E-Way Bill
            </button>
          </div>

          {loading ? <TableSkeleton rows={5} cols={10} /> : (
          <PaginatedTable data={ewayBills} pageSize={20}>
            {(pageData) => (
          <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-xl shadow">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                <tr>
                  <th className="text-left p-3">EWB No</th>
                  <th className="text-left p-3">Invoice#</th>
                  <th className="text-left p-3">Linked IRN</th>
                  <th className="text-left p-3">Transporter</th>
                  <th className="text-left p-3">Mode</th>
                  <th className="text-left p-3">Vehicle</th>
                  <th className="text-right p-3">Distance (km)</th>
                  <th className="text-left p-3">Valid Upto</th>
                  <th className="text-center p-3">Status</th>
                  <th className="text-center p-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {ewayBills.length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-8 text-gray-400">No E-Way Bills found</td></tr>
                ) : (
                  pageData.map((e) => (
                    <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="p-3 font-mono text-xs">{e.ewbNo || "—"}</td>
                      <td className="p-3">{e.invoice?.invoiceNo || `INV-${e.invoiceId}`}</td>
                      <td className="p-3 text-xs">{e.eInvoice?.irn ? String(e.eInvoice.irn).substring(0, 15) + "..." : "—"}</td>
                      <td className="p-3">{e.transporterName || "—"}</td>
                      <td className="p-3">{e.transMode || "—"}</td>
                      <td className="p-3">{e.vehicleNo || "—"}</td>
                      <td className="p-3 text-right">{e.transDistance ?? "—"}</td>
                      <td className="p-3 text-xs">{e.validUpto ? new Date(e.validUpto).toLocaleDateString() : "—"}</td>
                      <td className="p-3 text-center">{statusBadge(e.status)}</td>
                      <td className="p-3 text-center">
                        {e.status === "GENERATED" && (
                          <button
                            onClick={() => { setCancelId(e.id); setCancelType("ewb"); }}
                            className="text-red-600 text-xs hover:underline"
                          >Cancel</button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
            )}
          </PaginatedTable>
          )}
        </>
      )}

      {/* GENERATE E-INVOICE MODAL */}
      {showGenerate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Generate E-Invoice</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Sales Invoice *</label>
                <select
                  value={selectedInvoiceId}
                  onChange={(e) => setSelectedInvoiceId(Number(e.target.value))}
                  aria-label="Sales Invoice"
                  className="w-full border rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="">Select invoice...</option>
                  {invoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNo} — ₹{Number(inv.totalAmount).toLocaleString()} ({inv.buyer?.name || "—"})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Seller GSTIN *</label>
                <input
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  placeholder="29AABCU9603R1ZM"
                  aria-label="Seller GSTIN"
                  className="w-full border rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Supply Type</label>
                <select
                  value={supplyType}
                  onChange={(e) => setSupplyType(e.target.value)}
                  aria-label="Supply Type"
                  className="w-full border rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600"
                >
                  {["B2B", "B2C", "SEZWP", "SEZWOP", "EXPWP", "EXPWOP"].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowGenerate(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
              <button onClick={handleGenerate} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Generate IRN</button>
            </div>
          </div>
        </div>
      )}

      {/* GENERATE E-WAY BILL MODAL */}
      {showEwbGenerate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">Generate E-Way Bill</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Sales Invoice *</label>
                <select
                  value={ewbForm.invoiceId}
                  onChange={(e) => setEwbForm({ ...ewbForm, invoiceId: Number(e.target.value) })}
                  aria-label="Sales Invoice"
                  className="w-full border rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="">Select invoice...</option>
                  {invoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>{inv.invoiceNo}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Link E-Invoice (optional)</label>
                <select
                  value={ewbForm.eInvoiceId}
                  onChange={(e) => setEwbForm({ ...ewbForm, eInvoiceId: Number(e.target.value) })}
                  aria-label="Link E-Invoice"
                  className="w-full border rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="">None</option>
                  {eInvoices.filter((e) => e.status === "GENERATED").map((e) => (
                    <option key={e.id} value={e.id}>{e.irn?.substring(0, 30) || `EI-${e.id}`}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Transporter Name</label>
                  <input value={ewbForm.transporterName} onChange={(e) => setEwbForm({ ...ewbForm, transporterName: e.target.value })} aria-label="Transporter Name" className="w-full border rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Mode</label>
                  <select value={ewbForm.transMode} onChange={(e) => setEwbForm({ ...ewbForm, transMode: e.target.value })} aria-label="Transport Mode" className="w-full border rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600">
                    {["ROAD", "RAIL", "AIR", "SHIP"].map((m) => <option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Vehicle No</label>
                  <input value={ewbForm.vehicleNo} onChange={(e) => setEwbForm({ ...ewbForm, vehicleNo: e.target.value })} aria-label="Vehicle Number" className="w-full border rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Distance (km)</label>
                  <input type="number" value={ewbForm.transDistance} onChange={(e) => setEwbForm({ ...ewbForm, transDistance: e.target.value })} aria-label="Transport Distance in kilometers" className="w-full border rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">From Pincode</label>
                  <input value={ewbForm.fromPincode} onChange={(e) => setEwbForm({ ...ewbForm, fromPincode: e.target.value })} maxLength={6} aria-label="From Pincode" className="w-full border rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">To Pincode</label>
                  <input value={ewbForm.toPincode} onChange={(e) => setEwbForm({ ...ewbForm, toPincode: e.target.value })} maxLength={6} aria-label="To Pincode" className="w-full border rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowEwbGenerate(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
              <button onClick={handleEwbGenerate} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Generate EWB</button>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL MODAL */}
      {cancelId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">Cancel {cancelType === "einvoice" ? "E-Invoice" : "E-Way Bill"}</h2>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Reason *</label>
              <textarea
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Enter cancellation reason..."
                aria-label="Cancellation reason"
                className="w-full border rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => { setCancelId(null); setCancelReason(""); }} className="px-4 py-2 border rounded-lg text-sm">Back</button>
              <button onClick={handleCancel} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">Confirm Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
