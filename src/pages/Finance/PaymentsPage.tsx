import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import {
  paymentReceiptApi,
  paymentOutApi,
  journalEntryApi,
  financeReportApi,
  PaymentReceipt,
  PaymentOut,
  JournalEntry,
  TrialBalanceRow,
} from "../../api/finance";

const tabs = ["Receipts", "Payments Out", "Journal Entries", "Trial Balance"] as const;
type Tab = (typeof tabs)[number];

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  CONFIRMED: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  POSTED: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  REVERSED: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
};

export default function PaymentsPage() {
  const [tab, setTab] = useState<Tab>("Receipts");
  const [receipts, setReceipts] = useState<PaymentReceipt[]>([]);
  const [paymentOuts, setPaymentOuts] = useState<PaymentOut[]>([]);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [trialBalance, setTrialBalance] = useState<TrialBalanceRow[]>([]);
  const [showReceiptForm, setShowReceiptForm] = useState(false);
  const [showPayOutForm, setShowPayOutForm] = useState(false);

  /* ─── Receipt form ─── */
  const [rcptForm, setRcptForm] = useState({
    buyerId: "",
    invoiceId: "",
    receiptDate: new Date().toISOString().split("T")[0],
    amount: "",
    currency: "USD",
    exchangeRate: "1",
    paymentMode: "BANK_TRANSFER",
    bankRef: "",
  });

  /* ─── Payment Out form ─── */
  const [payForm, setPayForm] = useState({
    supplierId: "",
    purchaseInvoiceId: "",
    paymentDate: new Date().toISOString().split("T")[0],
    amount: "",
    paymentMode: "BANK_TRANSFER",
    bankRef: "",
    tdsAmount: "0",
  });

  useEffect(() => {
    if (tab === "Receipts") loadReceipts();
    if (tab === "Payments Out") loadPayOuts();
    if (tab === "Journal Entries") loadJournals();
    if (tab === "Trial Balance") loadTrialBalance();
  }, [tab]);

  async function loadReceipts() {
    const r = await paymentReceiptApi.list();
    setReceipts(r.data?.data?.data || []);
  }
  async function loadPayOuts() {
    const r = await paymentOutApi.list();
    setPaymentOuts(r.data?.data?.data || []);
  }
  async function loadJournals() {
    const r = await journalEntryApi.list();
    setJournals(r.data?.data?.data || []);
  }
  async function loadTrialBalance() {
    const r = await financeReportApi.trialBalance();
    setTrialBalance(r.data?.data || []);
  }

  async function handleCreateReceipt(e: React.FormEvent) {
    e.preventDefault();
    await paymentReceiptApi.create({
      buyerId: Number(rcptForm.buyerId),
      invoiceId: Number(rcptForm.invoiceId),
      receiptDate: rcptForm.receiptDate,
      amount: Number(rcptForm.amount),
      currency: rcptForm.currency,
      exchangeRate: Number(rcptForm.exchangeRate),
      paymentMode: rcptForm.paymentMode,
      bankRef: rcptForm.bankRef || undefined,
    });
    setShowReceiptForm(false);
    loadReceipts();
  }

  async function handleCreatePayOut(e: React.FormEvent) {
    e.preventDefault();
    await paymentOutApi.create({
      supplierId: Number(payForm.supplierId),
      purchaseInvoiceId: Number(payForm.purchaseInvoiceId),
      paymentDate: payForm.paymentDate,
      amount: Number(payForm.amount),
      paymentMode: payForm.paymentMode,
      bankRef: payForm.bankRef || undefined,
      tdsAmount: Number(payForm.tdsAmount),
    });
    setShowPayOutForm(false);
    loadPayOuts();
  }

  async function handlePostJE(id: number) {
    await journalEntryApi.post(id);
    loadJournals();
  }

  async function handleReverseJE(id: number) {
    await journalEntryApi.reverse(id);
    loadJournals();
  }

  /* Trial balance totals */
  const tbTotals = trialBalance.reduce(
    (acc, r) => ({ debit: acc.debit + r.debit, credit: acc.credit + r.credit }),
    { debit: 0, credit: 0 },
  );

  return (
    <>
      <PageMeta title="Finance — Payments & Ledger" description="Payment receipts, supplier payments, journal entries, trial balance" />
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">
          Payments & Ledger
        </h2>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setShowReceiptForm(false); setShowPayOutForm(false); }}
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

        {/* ═══ Receipts ═══ */}
        {tab === "Receipts" && (
          <div>
            <button
              onClick={() => setShowReceiptForm(!showReceiptForm)}
              className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              {showReceiptForm ? "Cancel" : "+ Record Receipt"}
            </button>

            {showReceiptForm && (
              <form onSubmit={handleCreateReceipt} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-6 grid grid-cols-4 gap-4">
                {[
                  { label: "Buyer ID", key: "buyerId", type: "number", req: true },
                  { label: "Invoice ID", key: "invoiceId", type: "number", req: true },
                  { label: "Receipt Date", key: "receiptDate", type: "date", req: true },
                  { label: "Amount", key: "amount", type: "number", req: true },
                  { label: "Currency", key: "currency" },
                  { label: "Exchange Rate", key: "exchangeRate", type: "number" },
                  { label: "Bank Ref", key: "bankRef" },
                ].map((f) => (
                  <div key={f.key}>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{f.label}</label>
                    <input
                      type={f.type || "text"}
                      value={(rcptForm as Record<string, unknown>)[f.key] as string}
                      onChange={(e) => setRcptForm({ ...rcptForm, [f.key]: e.target.value })}
                      className="w-full border rounded px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      required={f.req}
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Payment Mode</label>
                  <select
                    value={rcptForm.paymentMode}
                    onChange={(e) => setRcptForm({ ...rcptForm, paymentMode: e.target.value })}
                    className="w-full border rounded px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    {["BANK_TRANSFER", "LC_NEGOTIATION", "CHEQUE", "CASH"].map((m) => (
                      <option key={m} value={m}>{m.replace(/_/g, " ")}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-4">
                  <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm">
                    Record Receipt
                  </button>
                </div>
              </form>
            )}

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
                    <td className="px-3 py-2 text-right">{r.currency} {Number(r.amount).toLocaleString()}</td>
                    <td className="px-3 py-2">{r.paymentMode?.replace(/_/g, " ")}</td>
                    <td className={`px-3 py-2 text-right ${Number(r.forexGainLoss) >= 0 ? "text-green-600" : "text-red-600"}`}>
                      ₹{Number(r.forexGainLoss).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs ${statusColors[r.status] || ""}`}>{r.status}</span>
                    </td>
                  </tr>
                ))}
                {receipts.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-8 text-gray-400">No receipts found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ═══ Payments Out ═══ */}
        {tab === "Payments Out" && (
          <div>
            <button
              onClick={() => setShowPayOutForm(!showPayOutForm)}
              className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              {showPayOutForm ? "Cancel" : "+ New Payment"}
            </button>

            {showPayOutForm && (
              <form onSubmit={handleCreatePayOut} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-6 grid grid-cols-4 gap-4">
                {[
                  { label: "Supplier ID", key: "supplierId", type: "number", req: true },
                  { label: "Purchase Invoice ID", key: "purchaseInvoiceId", type: "number", req: true },
                  { label: "Payment Date", key: "paymentDate", type: "date", req: true },
                  { label: "Amount", key: "amount", type: "number", req: true },
                  { label: "TDS Amount", key: "tdsAmount", type: "number" },
                  { label: "Bank Ref", key: "bankRef" },
                ].map((f) => (
                  <div key={f.key}>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{f.label}</label>
                    <input
                      type={f.type || "text"}
                      value={(payForm as Record<string, unknown>)[f.key] as string}
                      onChange={(e) => setPayForm({ ...payForm, [f.key]: e.target.value })}
                      className="w-full border rounded px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      required={f.req}
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Payment Mode</label>
                  <select
                    value={payForm.paymentMode}
                    onChange={(e) => setPayForm({ ...payForm, paymentMode: e.target.value })}
                    className="w-full border rounded px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    {["BANK_TRANSFER", "CHEQUE", "CASH"].map((m) => (
                      <option key={m} value={m}>{m.replace(/_/g, " ")}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-4">
                  <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm">
                    Record Payment
                  </button>
                  {Number(payForm.tdsAmount) > 0 && (
                    <span className="ml-4 text-sm text-gray-500">
                      Net: ₹{(Number(payForm.amount) - Number(payForm.tdsAmount)).toLocaleString()}
                    </span>
                  )}
                </div>
              </form>
            )}

            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                <tr>
                  {["Payment #", "Supplier", "PI #", "Date", "Amount", "TDS", "Net", "Mode", "Status"].map((h) => (
                    <th key={h} className="px-3 py-2 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700">
                {paymentOuts.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-3 py-2 font-mono">{p.paymentNo}</td>
                    <td className="px-3 py-2">{p.supplier?.name}</td>
                    <td className="px-3 py-2 font-mono">{p.purchaseInvoice?.invoiceNo}</td>
                    <td className="px-3 py-2">{p.paymentDate?.split("T")[0]}</td>
                    <td className="px-3 py-2 text-right">₹{Number(p.amount).toLocaleString()}</td>
                    <td className="px-3 py-2 text-right text-red-500">₹{Number(p.tdsAmount).toLocaleString()}</td>
                    <td className="px-3 py-2 text-right font-semibold">₹{Number(p.netAmount).toLocaleString()}</td>
                    <td className="px-3 py-2">{p.paymentMode?.replace(/_/g, " ")}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs ${statusColors[p.status] || ""}`}>{p.status}</span>
                    </td>
                  </tr>
                ))}
                {paymentOuts.length === 0 && (
                  <tr><td colSpan={9} className="text-center py-8 text-gray-400">No payments found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ═══ Journal Entries ═══ */}
        {tab === "Journal Entries" && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                <tr>
                  {["JE #", "Date", "Type", "Narration", "Debit", "Credit", "Status", ""].map((h) => (
                    <th key={h} className="px-3 py-2 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700">
                {journals.map((j) => (
                  <tr key={j.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-3 py-2 font-mono">{j.jeNo}</td>
                    <td className="px-3 py-2">{j.jeDate?.split("T")[0]}</td>
                    <td className="px-3 py-2">{j.jeType}</td>
                    <td className="px-3 py-2 max-w-xs truncate">{j.narration}</td>
                    <td className="px-3 py-2 text-right">₹{Number(j.totalDebit).toLocaleString()}</td>
                    <td className="px-3 py-2 text-right">₹{Number(j.totalCredit).toLocaleString()}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs ${statusColors[j.status] || ""}`}>{j.status}</span>
                    </td>
                    <td className="px-3 py-2 space-x-2">
                      {j.status === "DRAFT" && (
                        <button onClick={() => handlePostJE(j.id)} className="text-green-600 hover:underline text-xs">Post</button>
                      )}
                      {j.status === "POSTED" && (
                        <button onClick={() => handleReverseJE(j.id)} className="text-red-600 hover:underline text-xs">Reverse</button>
                      )}
                    </td>
                  </tr>
                ))}
                {journals.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-8 text-gray-400">No journal entries found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ═══ Trial Balance ═══ */}
        {tab === "Trial Balance" && (
          <div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                <tr>
                  {["Account Code", "Account Name", "Type", "Debit", "Credit", "Balance"].map((h) => (
                    <th key={h} className="px-3 py-2 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700">
                {trialBalance.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-3 py-2 font-mono">{r.accountCode}</td>
                    <td className="px-3 py-2">{r.accountName}</td>
                    <td className="px-3 py-2">
                      <span className="px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                        {r.accountType}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">₹{r.debit.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right">₹{r.credit.toLocaleString()}</td>
                    <td className={`px-3 py-2 text-right font-semibold ${r.balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                      ₹{Math.abs(r.balance).toLocaleString()}{r.balance < 0 ? " CR" : " DR"}
                    </td>
                  </tr>
                ))}
                {trialBalance.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-8 text-gray-400">No accounts found</td></tr>
                )}
              </tbody>
              {trialBalance.length > 0 && (
                <tfoot className="bg-gray-100 dark:bg-gray-700 font-bold">
                  <tr>
                    <td colSpan={3} className="px-3 py-2">Totals</td>
                    <td className="px-3 py-2 text-right">₹{tbTotals.debit.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right">₹{tbTotals.credit.toLocaleString()}</td>
                    <td className={`px-3 py-2 text-right ${Math.abs(tbTotals.debit - tbTotals.credit) < 0.01 ? "text-green-600" : "text-red-600"}`}>
                      {Math.abs(tbTotals.debit - tbTotals.credit) < 0.01 ? "✓ Balanced" : `Diff: ₹${Math.abs(tbTotals.debit - tbTotals.credit).toLocaleString()}`}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </>
  );
}
