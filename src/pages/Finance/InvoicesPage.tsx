import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import {
  salesInvoiceApi,
  paymentReceiptApi,
  creditNoteApi,
  debitNoteApi,
  financeReportApi,
  SalesInvoice,
  PaymentReceipt,
  CreditNote,
  DebitNote,
  ArAgingRow,
} from "../../api/finance";

const tabs = ["Sales Invoices", "Receipts", "Credit Notes", "Debit Notes", "AR Aging"] as const;
type Tab = (typeof tabs)[number];

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  SUBMITTED: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  IRN_GENERATED: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300",
  PARTIALLY_PAID: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  PAID: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  CONFIRMED: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
};

export default function InvoicesPage() {
  const [tab, setTab] = useState<Tab>("Sales Invoices");
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [receipts, setReceipts] = useState<PaymentReceipt[]>([]);
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [debitNotes, setDebitNotes] = useState<DebitNote[]>([]);
  const [arAging, setArAging] = useState<ArAgingRow[]>([]);
  const [showForm, setShowForm] = useState(false);

  /* ─── Invoice form state ─── */
  const [invForm, setInvForm] = useState({
    orderId: "",
    buyerId: "",
    invoiceDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    currency: "USD",
    exchangeRate: "1",
    discountAmount: "0",
    hsnCode: "",
  });
  const [lineItems, setLineItems] = useState([
    { skuCode: "", description: "", qty: "", unitPrice: "", igstPct: "0" },
  ]);

  useEffect(() => {
    if (tab === "Sales Invoices") loadInvoices();
    if (tab === "Receipts") loadReceipts();
    if (tab === "Credit Notes") loadCreditNotes();
    if (tab === "Debit Notes") loadDebitNotes();
    if (tab === "AR Aging") loadArAging();
  }, [tab]);

  async function loadInvoices() {
    const r = await salesInvoiceApi.list();
    setInvoices(r.data?.data?.data || []);
  }
  async function loadReceipts() {
    const r = await paymentReceiptApi.list();
    setReceipts(r.data?.data?.data || []);
  }
  async function loadCreditNotes() {
    const r = await creditNoteApi.list();
    setCreditNotes(r.data?.data?.data || []);
  }
  async function loadDebitNotes() {
    const r = await debitNoteApi.list();
    setDebitNotes(r.data?.data?.data || []);
  }
  async function loadArAging() {
    const r = await financeReportApi.arAging();
    setArAging(r.data?.data || []);
  }

  async function handleCreateInvoice(e: React.FormEvent) {
    e.preventDefault();
    const details = lineItems.map((l) => ({
      skuCode: l.skuCode,
      description: l.description,
      qty: Number(l.qty),
      unitPrice: Number(l.unitPrice),
      igstPct: Number(l.igstPct),
    }));
    await salesInvoiceApi.create({
      orderId: Number(invForm.orderId),
      buyerId: Number(invForm.buyerId),
      invoiceDate: invForm.invoiceDate,
      dueDate: invForm.dueDate,
      currency: invForm.currency,
      exchangeRate: Number(invForm.exchangeRate),
      discountAmount: Number(invForm.discountAmount),
      hsnCode: invForm.hsnCode || undefined,
      details,
    });
    setShowForm(false);
    loadInvoices();
  }

  async function handleSubmitInvoice(id: number) {
    await salesInvoiceApi.updateStatus(id, "SUBMITTED");
    loadInvoices();
  }

  function addLine() {
    setLineItems([...lineItems, { skuCode: "", description: "", qty: "", unitPrice: "", igstPct: "0" }]);
  }

  const bucketColors: Record<string, string> = {
    CURRENT: "text-green-600 dark:text-green-400",
    "1-30": "text-yellow-600 dark:text-yellow-400",
    "31-60": "text-orange-600 dark:text-orange-400",
    "61-90": "text-red-500 dark:text-red-400",
    "90+": "text-red-700 dark:text-red-300 font-bold",
  };

  return (
    <>
      <PageMeta title="Finance — Invoices & Receivables" description="Manage sales invoices, payments, credit/debit notes" />
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">
          Invoices & Receivables
        </h2>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setShowForm(false); }}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t
                  ? "border-blue-600 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* ═══ Sales Invoices ═══ */}
        {tab === "Sales Invoices" && (
          <div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              {showForm ? "Cancel" : "+ New Invoice"}
            </button>

            {showForm && (
              <form onSubmit={handleCreateInvoice} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-6 space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  {[
                    { label: "Order ID", key: "orderId", type: "number" },
                    { label: "Buyer ID", key: "buyerId", type: "number" },
                    { label: "Invoice Date", key: "invoiceDate", type: "date" },
                    { label: "Due Date", key: "dueDate", type: "date" },
                    { label: "Currency", key: "currency" },
                    { label: "Exchange Rate", key: "exchangeRate", type: "number" },
                    { label: "Discount ₹", key: "discountAmount", type: "number" },
                    { label: "HSN Code", key: "hsnCode" },
                  ].map((f) => (
                    <div key={f.key}>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{f.label}</label>
                      <input
                        type={f.type || "text"}
                        value={(invForm as Record<string, unknown>)[f.key] as string}
                        onChange={(e) => setInvForm({ ...invForm, [f.key]: e.target.value })}
                        className="w-full border rounded px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        required={["orderId", "buyerId", "dueDate"].includes(f.key)}
                      />
                    </div>
                  ))}
                </div>

                <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300">Line Items</h4>
                {lineItems.map((l, i) => (
                  <div key={i} className="grid grid-cols-5 gap-2">
                    {[
                      { ph: "SKU Code", key: "skuCode" },
                      { ph: "Description", key: "description" },
                      { ph: "Qty", key: "qty", type: "number" },
                      { ph: "Unit Price", key: "unitPrice", type: "number" },
                      { ph: "IGST %", key: "igstPct", type: "number" },
                    ].map((f) => (
                      <input
                        key={f.key}
                        placeholder={f.ph}
                        type={f.type || "text"}
                        value={(l as Record<string, unknown>)[f.key] as string}
                        onChange={(e) => {
                          const copy = [...lineItems];
                          (copy[i] as Record<string, unknown>)[f.key] = e.target.value;
                          setLineItems(copy);
                        }}
                        className="border rounded px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        required={["skuCode", "description", "qty", "unitPrice"].includes(f.key)}
                      />
                    ))}
                  </div>
                ))}
                <button type="button" onClick={addLine} className="text-blue-600 text-sm hover:underline">
                  + Add Line
                </button>

                <button type="submit" className="mt-2 px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm">
                  Create Invoice
                </button>
              </form>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                  <tr>
                    {["Invoice #", "Buyer", "Order", "Date", "Currency", "Total", "INR Amt", "Status", ""].map((h) => (
                      <th key={h} className="px-3 py-2 text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-3 py-2 font-mono">{inv.invoiceNo}</td>
                      <td className="px-3 py-2">{inv.buyer?.name}</td>
                      <td className="px-3 py-2 font-mono">{inv.order?.orderNo}</td>
                      <td className="px-3 py-2">{inv.invoiceDate?.split("T")[0]}</td>
                      <td className="px-3 py-2">{inv.currency}</td>
                      <td className="px-3 py-2 text-right">{Number(inv.totalAmount).toLocaleString()}</td>
                      <td className="px-3 py-2 text-right">₹{Number(inv.inrAmount).toLocaleString()}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${statusColors[inv.status] || ""}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {inv.status === "DRAFT" && (
                          <button
                            onClick={() => handleSubmitInvoice(inv.id)}
                            className="text-blue-600 hover:underline text-xs"
                          >
                            Submit
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {invoices.length === 0 && (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-gray-400">No invoices found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══ Receipts ═══ */}
        {tab === "Receipts" && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                <tr>
                  {["Receipt #", "Buyer", "Invoice", "Date", "Amount", "Mode", "Forex G/L", "Status"].map((h) => (
                    <th key={h} className="px-3 py-2 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700">
                {receipts.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-3 py-2 font-mono">{r.receiptNo}</td>
                    <td className="px-3 py-2">{r.buyer?.name}</td>
                    <td className="px-3 py-2 font-mono">{r.invoice?.invoiceNo}</td>
                    <td className="px-3 py-2">{r.receiptDate?.split("T")[0]}</td>
                    <td className="px-3 py-2 text-right">
                      {r.currency} {Number(r.amount).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">{r.paymentMode?.replace(/_/g, " ")}</td>
                    <td className={`px-3 py-2 text-right ${Number(r.forexGainLoss) >= 0 ? "text-green-600" : "text-red-600"}`}>
                      ₹{Number(r.forexGainLoss).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs ${statusColors[r.status] || ""}`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {receipts.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-gray-400">No receipts found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ═══ Credit Notes ═══ */}
        {tab === "Credit Notes" && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                <tr>
                  {["CN #", "Buyer", "Original Invoice", "Amount", "Reason", "Status"].map((h) => (
                    <th key={h} className="px-3 py-2 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700">
                {creditNotes.map((cn) => (
                  <tr key={cn.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-3 py-2 font-mono">{cn.cnNo}</td>
                    <td className="px-3 py-2">{cn.buyer?.name}</td>
                    <td className="px-3 py-2 font-mono">{cn.originalInvoice?.invoiceNo}</td>
                    <td className="px-3 py-2 text-right">₹{Number(cn.amount).toLocaleString()}</td>
                    <td className="px-3 py-2 max-w-xs truncate">{cn.reason}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs ${statusColors[cn.status] || ""}`}>
                        {cn.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {creditNotes.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-400">No credit notes found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ═══ Debit Notes ═══ */}
        {tab === "Debit Notes" && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                <tr>
                  {["DN #", "Supplier", "Purchase Invoice", "Amount", "Reason", "Status"].map((h) => (
                    <th key={h} className="px-3 py-2 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700">
                {debitNotes.map((dn) => (
                  <tr key={dn.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-3 py-2 font-mono">{dn.dnNo}</td>
                    <td className="px-3 py-2">{dn.supplier?.name}</td>
                    <td className="px-3 py-2 font-mono">{dn.purchaseInvoice?.invoiceNo}</td>
                    <td className="px-3 py-2 text-right">₹{Number(dn.amount).toLocaleString()}</td>
                    <td className="px-3 py-2 max-w-xs truncate">{dn.reason}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs ${statusColors[dn.status] || ""}`}>
                        {dn.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {debitNotes.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-400">No debit notes found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ═══ AR Aging ═══ */}
        {tab === "AR Aging" && (
          <div>
            <div className="grid grid-cols-5 gap-3 mb-4">
              {["CURRENT", "1-30", "31-60", "61-90", "90+"].map((bucket) => {
                const rows = arAging.filter((r) => r.bucket === bucket);
                const total = rows.reduce((s, r) => s + r.outstanding, 0);
                return (
                  <div key={bucket} className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow text-center">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{bucket} days</div>
                    <div className={`text-lg font-bold ${bucketColors[bucket]}`}>
                      ₹{total.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-400">{rows.length} invoices</div>
                  </div>
                );
              })}
            </div>

            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                <tr>
                  {["Invoice #", "Buyer", "Total", "Outstanding", "Days Due", "Bucket"].map((h) => (
                    <th key={h} className="px-3 py-2 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700">
                {arAging.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-3 py-2 font-mono">{r.invoiceNo}</td>
                    <td className="px-3 py-2">{r.buyer?.name}</td>
                    <td className="px-3 py-2 text-right">{r.currency} {r.totalAmount.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right font-semibold">
                      {r.currency} {r.outstanding.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right">{r.daysDue}</td>
                    <td className="px-3 py-2">
                      <span className={`font-semibold ${bucketColors[r.bucket]}`}>{r.bucket}</span>
                    </td>
                  </tr>
                ))}
                {arAging.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-400">No outstanding receivables</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
