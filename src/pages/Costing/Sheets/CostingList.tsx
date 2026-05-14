import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router";
import { costingApi, type CostingSheetSummary } from "../../../api/costing";
import PageMeta from "../../../components/common/PageMeta";
import { Pagination } from "../../../components/table";
import TableSkeleton from '@/components/common/TableSkeleton';

const STAGE_COLORS: Record<string, string> = {
  INITIAL: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  BUDGETED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  ACTUAL: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

const APPROVAL_COLORS: Record<string, string> = {
  DRAFT:          "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  SUBMITTED:      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  IE_APPROVED:    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  AUDIT_APPROVED: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  CEO_APPROVED:   "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  REJECTED:       "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const STAGES = ["", "INITIAL", "BUDGETED", "ACTUAL"];
const APPROVAL_STATUSES = ["", "DRAFT", "SUBMITTED", "IE_APPROVED", "AUDIT_APPROVED", "CEO_APPROVED", "REJECTED"];

function fmtCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2 }).format(value);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function CostingList() {
  const [sheets, setSheets] = useState<CostingSheetSummary[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [approvalFilter, setApprovalFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchSheets = useCallback(async (params?: Record<string, unknown>) => {
    setLoading(true);
    try {
      const { data: resp } = await costingApi.list({
        page: meta.page,
        limit: meta.limit,
        search: search || undefined,
        stage: stageFilter || undefined,
        approvalStatus: approvalFilter || undefined,
        ...params,
      });
      setSheets(resp.data);
      if (resp.meta) setMeta(resp.meta);
    } catch (err) {
      console.error("Failed to fetch costing sheets:", err);
    } finally {
      setLoading(false);
    }
  }, [meta.page, meta.limit, search, stageFilter, approvalFilter]);

  useEffect(() => { fetchSheets(); }, [fetchSheets]);

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this costing sheet?")) return;
    try {
      await costingApi.delete(id);
      fetchSheets();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Delete failed");
    }
  };

  return (
    <>
      <PageMeta title="Cost Sheets | ERP TRACK" description="Costing Management" />
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Cost Sheets</h2>
          <Link
            to="/costing/sheets/new"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Cost Sheet
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            placeholder="Search costing no, style..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setMeta((m) => ({ ...m, page: 1 })); }}
            className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 dark:text-white/90 dark:border-gray-700 focus:border-brand-300 focus:outline-none sm:w-72"
          />
          <select
            title="Stage filter"
            value={stageFilter}
            onChange={(e) => { setStageFilter(e.target.value); setMeta((m) => ({ ...m, page: 1 })); }}
            className="h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 dark:text-white/90 dark:border-gray-700 focus:border-brand-300 focus:outline-none"
          >
            {STAGES.map((s) => <option key={s} value={s}>{s || "All Stages"}</option>)}
          </select>
          <select
            title="Approval status filter"
            value={approvalFilter}
            onChange={(e) => { setApprovalFilter(e.target.value); setMeta((m) => ({ ...m, page: 1 })); }}
            className="h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 dark:text-white/90 dark:border-gray-700 focus:border-brand-300 focus:outline-none"
          >
            {APPROVAL_STATUSES.map((s) => <option key={s} value={s}>{s ? s.replace(/_/g, ' ') : "All Statuses"}</option>)}
          </select>
        </div>

        {/* Table */}
        {loading ? <TableSkeleton rows={5} cols={8} /> : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
          <table className="w-full table-auto text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                {["Costing No", "Style", "Buyer", "Order", "Stage", "Approval", "Cost/Pc", "Sell/Pc", "Margin%", "Date", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sheets.length === 0 ? (
                <tr><td colSpan={11} className="px-4 py-12 text-center text-gray-400">No costing sheets found</td></tr>
              ) : (
                sheets.map((sheet) => (
                  <tr key={sheet.id} className="border-b border-gray-50 hover:bg-gray-50/50 dark:border-gray-800 dark:hover:bg-white/2">
                    <td className="px-4 py-3">
                      <Link to={`/costing/sheets/${sheet.id}/detail`} className="font-medium text-brand-500 hover:underline">
                        {sheet.costingNo}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-800 dark:text-white/80">{sheet.style.styleNo}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{sheet.style.buyer.name}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{sheet.order?.orderNo || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STAGE_COLORS[sheet.stage] || ""}`}>
                        {sheet.stage}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${APPROVAL_COLORS[sheet.approvalStatus] || ""}`}>
                        {(sheet.approvalStatus ?? 'DRAFT').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-white/80">{fmtCurrency(Number(sheet.totalCostPerPc))}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{fmtCurrency(Number(sheet.sellingPricePerPc))}</td>
                    <td className="px-4 py-3">
                      <span className={`font-medium ${Number(sheet.marginPct) < 8 ? "text-red-500" : "text-green-600"}`}>
                        {Number(sheet.marginPct).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{fmtDate(sheet.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link to={`/costing/sheets/${sheet.id}/detail`} className="text-brand-500 hover:text-brand-600" title="View">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </Link>
                        <Link to={`/costing/sheets/${sheet.id}/edit`} className="text-brand-500 hover:text-brand-600" title="Edit">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </Link>
                        <button type="button" onClick={() => handleDelete(sheet.id)} className="text-red-500 hover:text-red-600" title="Delete">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        )}

        {/* Pagination */}
        <Pagination
          currentPage={meta.page}
          totalPages={meta.totalPages}
          onPageChange={(p) => fetchSheets({ page: p })}
          totalItems={meta.total}
          pageSize={meta.limit}
        />
      </div>
    </>
  );
}
