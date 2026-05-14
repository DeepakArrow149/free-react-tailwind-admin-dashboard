import { useEffect, useState, useCallback, useMemo } from "react";
import { samplingApi } from "../../api/sampling";
import PageMeta from "../../components/common/PageMeta";
import { useSampleTypes } from '@/hooks/useMasterLookups';

/* ── helpers ── */
function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const STATUSES = ["DRAFT", "SUBMITTED", "IN_PROGRESS", "APPROVED", "REJECTED"] as const;
type Status = (typeof STATUSES)[number];

const _SAMPLE_DEFAULTS = ["FIT", "SIZE_SET", "PRE_PRODUCTION", "TOP", "GOLD_SEAL", "SHIPMENT"] as const;

const statusMeta: Record<Status, { label: string; bg: string; text: string; ring: string }> = {
  DRAFT:        { label: "Draft",       bg: "bg-gray-100  dark:bg-gray-700",   text: "text-gray-700 dark:text-gray-300", ring: "ring-gray-300 dark:ring-gray-600" },
  SUBMITTED:    { label: "Submitted",   bg: "bg-blue-50   dark:bg-blue-900/20", text: "text-blue-700 dark:text-blue-400", ring: "ring-blue-200 dark:ring-blue-800" },
  IN_PROGRESS:  { label: "In Progress", bg: "bg-yellow-50 dark:bg-yellow-900/20", text: "text-yellow-700 dark:text-yellow-400", ring: "ring-yellow-200 dark:ring-yellow-800" },
  APPROVED:     { label: "Approved",    bg: "bg-green-50  dark:bg-green-900/20", text: "text-green-700 dark:text-green-400", ring: "ring-green-200 dark:ring-green-800" },
  REJECTED:     { label: "Rejected",    bg: "bg-red-50    dark:bg-red-900/20",  text: "text-red-700 dark:text-red-400",   ring: "ring-red-200 dark:ring-red-800" },
};

const typeLabel: Record<string, string> = {
  FIT: "Fit", SIZE_SET: "Size Set", PRE_PRODUCTION: "PP", TOP: "TOP", GOLD_SEAL: "Gold Seal", SHIPMENT: "Shipment",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Sample = Record<string, any>;

export default function Samples() {
  const { data: SAMPLE_TYPES = [..._SAMPLE_DEFAULTS] } = useSampleTypes();
  const [samples, setSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"board" | "timeline">("board");
  const [filterType, setFilterType] = useState<string>("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await samplingApi.list({ limit: 200 });
      setSamples(resp.data ?? resp ?? []);
    } catch { setSamples([]); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── actions ── */
  const submitSample  = async (id: number) => { try { await samplingApi.submit(id); fetchAll(); } catch {/* */} };
  const approveSample = async (id: number) => { try { await samplingApi.approve(id); fetchAll(); } catch {/* */} };
  const rejectSample  = async (id: number) => {
    const reason = prompt("Rejection reason:");
    if (!reason) return;
    try { await samplingApi.reject(id, { reason }); fetchAll(); } catch {/* */}
  };

  /* ── filtered + grouped ── */
  const filtered = useMemo(
    () => (filterType ? samples.filter((s) => (s.sampleType ?? s.type) === filterType) : samples),
    [samples, filterType]
  );

  const byStatus = useMemo(() => {
    const map: Record<Status, Sample[]> = { DRAFT: [], SUBMITTED: [], IN_PROGRESS: [], APPROVED: [], REJECTED: [] };
    filtered.forEach((s) => { const st = (s.status as Status) ?? "DRAFT"; if (map[st]) map[st].push(s); });
    return map;
  }, [filtered]);

  /* ── summary cards ── */
  const totalCount     = samples.length;
  const approvedCount  = samples.filter((s) => s.status === "APPROVED").length;
  const pendingCount   = samples.filter((s) => ["DRAFT", "SUBMITTED", "IN_PROGRESS"].includes(s.status)).length;
  const approvalRate   = totalCount ? Math.round((approvedCount / totalCount) * 100) : 0;

  /* ── kanban card ── */
  const SampleCard = ({ s }: { s: Sample }) => {
    const meta = statusMeta[(s.status as Status) ?? "DRAFT"];
    return (
      <div className={`rounded-lg border p-3 ${meta.ring} ring-1 ${meta.bg} space-y-2`}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-800 dark:text-white">{s.sampleNo ?? `#${s.id}`}</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.bg} ${meta.text}`}>
            {typeLabel[(s.sampleType ?? s.type) as string] ?? s.sampleType ?? "—"}
          </span>
        </div>
        <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
          {s.buyer?.name ?? `Buyer #${s.buyerId}`} — {s.style?.styleNo ?? `Style #${s.styleId}`}
        </p>
        <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400">
          <span>Req: {fmtDate(s.requestDate)}</span>
          <span>Due: {fmtDate(s.dueDate ?? s.requiredDate)}</span>
        </div>
        {/* mini actions */}
        <div className="flex gap-1 pt-1">
          {s.status === "DRAFT" && (
            <button onClick={() => submitSample(s.id)} className="rounded bg-blue-500 px-2 py-0.5 text-[10px] text-white hover:bg-blue-600">Submit</button>
          )}
          {s.status === "SUBMITTED" && (
            <>
              <button onClick={() => approveSample(s.id)} className="rounded bg-green-500 px-2 py-0.5 text-[10px] text-white hover:bg-green-600">Approve</button>
              <button onClick={() => rejectSample(s.id)} className="rounded bg-red-500 px-2 py-0.5 text-[10px] text-white hover:bg-red-600">Reject</button>
            </>
          )}
        </div>
      </div>
    );
  };

  /* ── timeline row ── */
  const stageOrder: Status[] = ["DRAFT", "SUBMITTED", "IN_PROGRESS", "APPROVED"];
  const stageIdx = (s: string) => { const i = stageOrder.indexOf(s as Status); return i >= 0 ? i : -1; };

  return (
    <>
      <PageMeta title="Sample Tracker" description="Visual sample development tracker" />
      <div className="p-6 space-y-5">
        {/* header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sample Tracker</h1>
          <div className="flex gap-2">
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white">
              <option value="">All Types</option>
              {SAMPLE_TYPES.map((t) => <option key={t} value={t}>{typeLabel[t]}</option>)}
            </select>
            <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
              <button onClick={() => setView("board")} className={`px-3 py-1.5 text-xs font-medium ${view === "board" ? "bg-brand-500 text-white" : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300"}`}>Board</button>
              <button onClick={() => setView("timeline")} className={`px-3 py-1.5 text-xs font-medium ${view === "timeline" ? "bg-brand-500 text-white" : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300"}`}>Timeline</button>
            </div>
          </div>
        </div>

        {/* summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Samples", value: totalCount, color: "text-blue-600 dark:text-blue-400" },
            { label: "Pending", value: pendingCount, color: "text-yellow-600 dark:text-yellow-400" },
            { label: "Approved", value: approvedCount, color: "text-green-600 dark:text-green-400" },
            { label: "Approval Rate", value: `${approvalRate}%`, color: approvalRate >= 80 ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400" },
          ].map((c) => (
            <div key={c.label} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">{c.label}</p>
              <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <p className="text-gray-400 dark:text-gray-500">Loading…</p>
        ) : view === "board" ? (
          /* ── KANBAN BOARD ── */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {STATUSES.map((st) => {
              const meta = statusMeta[st];
              const cards = byStatus[st];
              return (
                <div key={st} className="flex flex-col rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <div className={`flex items-center justify-between rounded-t-xl px-3 py-2 ${meta.bg}`}>
                    <span className={`text-xs font-semibold ${meta.text}`}>{meta.label}</span>
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${meta.text} ${meta.bg}`}>{cards.length}</span>
                  </div>
                  <div className="flex-1 space-y-2 p-2 max-h-[60vh] overflow-y-auto">
                    {cards.length === 0 && <p className="text-xs text-gray-400 text-center py-4">—</p>}
                    {cards.map((s) => <SampleCard key={s.id} s={s} />)}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── TIMELINE VIEW ── */
          <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {["Sample", "Buyer / Style", "Type", "Request", "Due", "Progress", "Status"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map((s) => {
                  const meta = statusMeta[(s.status as Status) ?? "DRAFT"];
                  const currentStage = stageIdx(s.status);
                  return (
                    <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{s.sampleNo ?? `#${s.id}`}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{s.buyer?.name ?? `Buyer #${s.buyerId}`} / {s.style?.styleNo ?? `Style #${s.styleId}`}</td>
                      <td className="px-4 py-3 text-xs">{typeLabel[(s.sampleType ?? s.type) as string] ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{fmtDate(s.requestDate)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{fmtDate(s.dueDate ?? s.requiredDate)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 items-center">
                          {stageOrder.map((stage, i) => (
                            <div key={stage} className={`h-2 flex-1 rounded-full ${
                              s.status === "REJECTED" ? (i <= 1 ? "bg-red-400" : "bg-gray-200 dark:bg-gray-600")
                              : i <= currentStage ? "bg-green-400" : "bg-gray-200 dark:bg-gray-600"
                            }`} title={statusMeta[stage].label} />
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${meta.bg} ${meta.text}`}>{meta.label}</span>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No samples found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
