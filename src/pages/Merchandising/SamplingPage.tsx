import { useEffect, useState, useCallback } from "react";
import { samplingApi } from "../../api/sampling";
import { toastSuccess, toastError } from "../../utils/toast";
import PageMeta from "../../components/common/PageMeta";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  SUBMITTED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  APPROVED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = any;

export default function SamplingPage() {
  const [samples, setSamples] = useState<R[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchSamples = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await samplingApi.list({ page, limit: 20 });
      setSamples(resp.data ?? resp ?? []);
      setTotal(resp.meta?.total ?? 0);
    } catch { setSamples([]); }
    setLoading(false);
  }, [page]);

  useEffect(() => { fetchSamples(); }, [fetchSamples]);

  const handleSubmit = async (id: number) => {
    try { await samplingApi.submit(id); fetchSamples(); toastSuccess("Sample submitted"); } catch (e) { toastError(e, "Failed to submit sample"); }
  };
  const handleApprove = async (id: number) => {
    try { await samplingApi.approve(id); fetchSamples(); toastSuccess("Sample approved"); } catch (e) { toastError(e, "Failed to approve sample"); }
  };
  const handleReject = async (id: number) => {
    const reason = prompt("Rejection reason:");
    if (!reason) return;
    try { await samplingApi.reject(id, { reason }); fetchSamples(); toastSuccess("Sample rejected"); } catch (e) { toastError(e, "Failed to reject sample"); }
  };
  const handleDelete = async (id: number) => {
    if (!confirm("Delete this sample request?")) return;
    try { await samplingApi.delete(id); fetchSamples(); toastSuccess("Sample deleted"); } catch (e) { toastError(e, "Failed to delete sample"); }
  };

  const totalPages = Math.ceil(total / 20) || 1;

  return (
    <>
      <PageMeta title="Sampling" description="Manage sample requests and approvals" />
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sampling</h1>

        {loading ? (
          <p className="text-gray-500 dark:text-gray-400">Loading…</p>
        ) : (
          <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {["Sample No", "Buyer", "Style", "Type", "Status", "Req Date", "Due Date", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {samples.map((s: R) => (
                  <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{s.sampleNo}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{s.buyer?.name ?? s.buyerId}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{s.style?.styleNo ?? s.styleId}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{s.sampleType ?? s.type ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[s.status] ?? statusColors.DRAFT}`}>{s.status}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{s.requestDate ? fmtDate(s.requestDate) : "—"}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{s.dueDate ? fmtDate(s.dueDate) : "—"}</td>
                    <td className="px-4 py-3 space-x-2">
                      {s.status === "DRAFT" && (
                        <>
                          <button onClick={() => handleSubmit(s.id)} className="text-xs text-blue-600 hover:underline">Submit</button>
                          <button onClick={() => handleDelete(s.id)} className="text-xs text-red-600 hover:underline">Delete</button>
                        </>
                      )}
                      {s.status === "SUBMITTED" && (
                        <>
                          <button onClick={() => handleApprove(s.id)} className="text-xs text-green-600 hover:underline">Approve</button>
                          <button onClick={() => handleReject(s.id)} className="text-xs text-red-600 hover:underline">Reject</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {samples.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-6 text-center text-gray-400">No sample requests found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center gap-2 pt-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-sm border rounded disabled:opacity-40 dark:border-gray-600 dark:text-gray-300">Prev</button>
            <span className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400">Page {page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-sm border rounded disabled:opacity-40 dark:border-gray-600 dark:text-gray-300">Next</button>
          </div>
        )}
      </div>
    </>
  );
}
