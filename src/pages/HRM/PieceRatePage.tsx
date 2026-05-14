import { useEffect, useState, useCallback } from "react";
import { pieceRateApi, operatorProductionApi } from "../../api/hrm";
import { toastSuccess, toastError } from "../../utils/toast";
import PageMeta from "../../components/common/PageMeta";
import { Pagination } from "../../components/table";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

interface OperatorProduction {
  id: number;
  employeeId?: number;
  employee?: { firstName: string; lastName: string };
  date?: string;
  quantity?: number;
  pieceRateCard?: { ratePerPiece: number };
  remarks?: string;
}

interface R {
  id: number;
  operationId?: number;
  operation?: { name: string };
  styleId?: number;
  style?: { styleNo: string };
  ratePerPiece?: number;
  effectiveFrom?: string;
  effectiveTo?: string;
  isActive?: boolean;
  remarks?: string;
}

export default function PieceRatePage() {
  const [tab, setTab] = useState<"cards" | "production">("cards");
  const [cards, setCards] = useState<R[]>([]);
  const [production, setProduction] = useState<OperatorProduction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Create card form
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    operationId: "", styleId: "", ratePerPiece: "", effectiveFrom: "", effectiveTo: "", remarks: "",
  });

  // Record production form
  const [showProd, setShowProd] = useState(false);
  const [prodForm, setProdForm] = useState({ employeeId: "", pieceRateCardId: "", date: "", quantity: "", remarks: "" });

  const fetchCards = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await pieceRateApi.list({ page, limit: 20 });
      setCards(resp.data?.data ?? resp.data ?? []);
      setTotalPages(resp.data?.meta?.totalPages ?? 1);
    } catch { setCards([]); }
    setLoading(false);
  }, [page]);

  const fetchProduction = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await operatorProductionApi.list({ page, limit: 20 });
      setProduction(resp.data?.data ?? resp.data ?? []);
      setTotalPages(resp.data?.meta?.totalPages ?? 1);
    } catch { setProduction([]); }
    setLoading(false);
  }, [page]);

  useEffect(() => { if (tab === "cards") fetchCards(); else fetchProduction(); }, [tab, fetchCards, fetchProduction]);

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await pieceRateApi.create({
        operationId: Number(form.operationId),
        styleId: Number(form.styleId) || undefined,
        ratePerPiece: Number(form.ratePerPiece),
        effectiveFrom: form.effectiveFrom,
        effectiveTo: form.effectiveTo || undefined,
        remarks: form.remarks || undefined,
      });
      setShowForm(false);
      setForm({ operationId: "", styleId: "", ratePerPiece: "", effectiveFrom: "", effectiveTo: "", remarks: "" });
      fetchCards();
      toastSuccess("Piece-rate card created");
    } catch (err) { toastError(err, "Failed to create card"); }
    setSaving(false);
  };

  const handleRecordProduction = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await operatorProductionApi.record({
        employeeId: Number(prodForm.employeeId),
        pieceRateCardId: Number(prodForm.pieceRateCardId),
        date: prodForm.date,
        quantity: Number(prodForm.quantity),
        remarks: prodForm.remarks || undefined,
      });
      setShowProd(false);
      setProdForm({ employeeId: "", pieceRateCardId: "", date: "", quantity: "", remarks: "" });
      fetchProduction();
      toastSuccess("Production recorded");
    } catch (err) { toastError(err, "Failed to record production"); }
    setSaving(false);
  };

  const _cardColumns = [
    { header: "Operation", accessor: (r: R) => r.operation?.name ?? r.operationId },
    { header: "Style", accessor: (r: R) => r.style?.styleNo ?? r.styleId ?? "-" },
    { header: "Rate/Piece", accessor: (r: R) => `₹${Number(r.ratePerPiece ?? 0).toFixed(2)}` },
    { header: "Effective From", accessor: (r: R) => r.effectiveFrom ? fmtDate(r.effectiveFrom) : "-" },
    { header: "Effective To", accessor: (r: R) => r.effectiveTo ? fmtDate(r.effectiveTo) : "Open" },
    { header: "Active", accessor: (r: R) => r.isActive !== false ? "Yes" : "No" },
  ];
  void _cardColumns;

  const _prodColumns = [
    { header: "Employee", accessor: (r: OperatorProduction) => r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : r.employeeId },
    { header: "Date", accessor: (r: OperatorProduction) => r.date ? fmtDate(r.date) : "-" },
    { header: "Quantity", accessor: "quantity" },
    { header: "Rate", accessor: (r: OperatorProduction) => `₹${Number(r.pieceRateCard?.ratePerPiece ?? 0).toFixed(2)}` },
    { header: "Earnings", accessor: (r: OperatorProduction) => `₹${(Number(r.quantity ?? 0) * Number(r.pieceRateCard?.ratePerPiece ?? 0)).toFixed(2)}` },
    { header: "Remarks", accessor: "remarks" },
  ];
  void _prodColumns;

  const tabCls = (t: string) =>
    `px-4 py-2 text-sm font-medium rounded-t-lg ${tab === t ? "bg-white dark:bg-gray-800 text-blue-600 border-b-2 border-blue-600" : "text-gray-500 dark:text-gray-400 hover:text-gray-700"}`;

  return (
    <>
      <PageMeta title="Piece-Rate Pay" description="Manage operator piece-rate cards and production tracking" />
      <div className="p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Piece-Rate Pay</h1>
          <div className="flex gap-2">
            {tab === "cards" && (
              <button onClick={() => setShowForm(!showForm)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                {showForm ? "Cancel" : "+ New Rate Card"}
              </button>
            )}
            {tab === "production" && (
              <button onClick={() => setShowProd(!showProd)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                {showProd ? "Cancel" : "+ Record Production"}
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-2 border-b dark:border-gray-700">
          <button className={tabCls("cards")} onClick={() => { setTab("cards"); setPage(1); }}>Rate Cards</button>
          <button className={tabCls("production")} onClick={() => { setTab("production"); setPage(1); }}>Production Log</button>
        </div>

        {/* Create Card Form */}
        {tab === "cards" && showForm && (
          <form onSubmit={handleCreateCard} className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-white dark:bg-gray-800 p-4 rounded-xl border dark:border-gray-700">
            {Object.entries(form).map(([key, val]) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 capitalize">{key.replace(/([A-Z])/g, " $1")}</label>
                <input value={val} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                  type={key.includes("Date") || key.includes("From") || key.includes("To") ? "date" : "text"}
                  aria-label={key.replace(/([A-Z])/g, " $1").trim()}
                  className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              </div>
            ))}
            <div className="md:col-span-3 flex justify-end">
              <button type="submit" disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
                {saving ? "Saving…" : "Create Card"}
              </button>
            </div>
          </form>
        )}

        {/* Record Production Form */}
        {tab === "production" && showProd && (
          <form onSubmit={handleRecordProduction} className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-white dark:bg-gray-800 p-4 rounded-xl border dark:border-gray-700">
            {Object.entries(prodForm).map(([key, val]) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 capitalize">{key.replace(/([A-Z])/g, " $1")}</label>
                <input value={val} onChange={e => setProdForm(p => ({ ...p, [key]: e.target.value }))}
                  type={key === "date" ? "date" : "text"}
                  aria-label={key.replace(/([A-Z])/g, " $1").trim()}
                  className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              </div>
            ))}
            <div className="flex items-end">
              <button type="submit" disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
                {saving ? "Saving…" : "Record"}
              </button>
            </div>
          </form>
        )}

        {loading ? <p className="text-gray-500 dark:text-gray-400">Loading…</p> : (
          <>
            <div className="overflow-x-auto">
              {tab === "cards" ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b dark:border-gray-700 text-left text-gray-500">
                      <th className="pb-2 pr-3">Operation</th><th className="pb-2 pr-3">Style</th>
                      <th className="pb-2 pr-3">Rate/Piece</th><th className="pb-2 pr-3">Effective From</th>
                      <th className="pb-2 pr-3">Effective To</th><th className="pb-2">Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cards.length === 0 ? (
                      <tr><td colSpan={6} className="py-8 text-center text-gray-400">No piece-rate cards found</td></tr>
                    ) : cards.map((r: R) => (
                      <tr key={r.id} className="border-b dark:border-gray-800">
                        <td className="py-2 pr-3">{r.operation?.name ?? r.operationId}</td>
                        <td className="py-2 pr-3">{r.style?.styleNo ?? r.styleId ?? "-"}</td>
                        <td className="py-2 pr-3">{`\u20B9${Number(r.ratePerPiece ?? 0).toFixed(2)}`}</td>
                        <td className="py-2 pr-3">{r.effectiveFrom ? fmtDate(r.effectiveFrom) : "-"}</td>
                        <td className="py-2 pr-3">{r.effectiveTo ? fmtDate(r.effectiveTo) : "Open"}</td>
                        <td className="py-2">{r.isActive !== false ? "Yes" : "No"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b dark:border-gray-700 text-left text-gray-500">
                      <th className="pb-2 pr-3">Employee</th><th className="pb-2 pr-3">Date</th>
                      <th className="pb-2 pr-3">Quantity</th><th className="pb-2 pr-3">Rate</th>
                      <th className="pb-2 pr-3">Earnings</th><th className="pb-2">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {production.length === 0 ? (
                      <tr><td colSpan={6} className="py-8 text-center text-gray-400">No production records found</td></tr>
                    ) : production.map((r: OperatorProduction) => (
                      <tr key={r.id} className="border-b dark:border-gray-800">
                        <td className="py-2 pr-3">{r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : r.employeeId}</td>
                        <td className="py-2 pr-3">{r.date ? fmtDate(r.date) : "-"}</td>
                        <td className="py-2 pr-3">{r.quantity}</td>
                        <td className="py-2 pr-3">{`\u20B9${Number(r.pieceRateCard?.ratePerPiece ?? 0).toFixed(2)}`}</td>
                        <td className="py-2 pr-3">{`\u20B9${(Number(r.quantity ?? 0) * Number(r.pieceRateCard?.ratePerPiece ?? 0)).toFixed(2)}`}</td>
                        <td className="py-2">{r.remarks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="mt-3">
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} pageSize={20} />
            </div>
          </>
        )}
      </div>
    </>
  );
}
