import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router";
import { bomApprovalApi } from "../../api/mrp";
import PageMeta from "../../components/common/PageMeta";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  APPROVED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export default function BomApprovalPage() {
  const { bomId } = useParams();
  const bid = Number(bomId);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try { const { data: resp } = await bomApprovalApi.getItems(bid); setItems(resp.data || []); }
    catch (err) { console.error(err); } finally { setLoading(false); }
  }, [bid]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleApprove = async (itemId: number) => {
    try { await bomApprovalApi.approve(bid, itemId, { approvalStatus: "APPROVED" }); toast.success("Item approved"); fetch(); }
    catch (err: any) { toast.error(err?.response?.data?.message || "Failed"); }
  };

  const handleReject = async (itemId: number, remarks: string) => {
    try { await bomApprovalApi.approve(bid, itemId, { approvalStatus: "REJECTED", rejectionRemarks: remarks }); toast.success("Item rejected"); fetch(); }
    catch (err: any) { toast.error(err?.response?.data?.message || "Failed"); }
  };

  const handleApproveAll = async () => {
    if (!confirm("Approve all pending items?")) return;
    setApproving(true);
    try { await bomApprovalApi.approveAll(bid); toast.success("All items approved"); fetch(); }
    catch (err: any) { toast.error(err?.response?.data?.message || "Failed"); }
    finally { setApproving(false); }
  };

  const pendingCount = items.filter(i => i.approvalStatus === "PENDING").length;

  return (
    <>
      <PageMeta title={`BOM Approval - #${bid} | ERP TRACK`} description="Itemwise BOM approval" />
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">BOM Itemwise Approval — #{bid}</h2>
            <p className="text-sm text-gray-500">{pendingCount} pending / {items.length} total items</p>
          </div>
          <button onClick={handleApproveAll} disabled={approving || pendingCount === 0} className="rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-50">{approving ? "Approving..." : "Approve All Pending"}</button>
        </div>

        {loading ? <p className="py-8 text-center text-gray-400">Loading...</p> : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
            <table className="w-full table-auto text-sm">
              <thead><tr className="border-b border-gray-100 dark:border-gray-800">
                {["#", "Material", "Consumption", "Unit", "Wastage %", "Req'd Qty", "Status", "Remarks", "Actions"].map(h => <th key={h} className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">{h}</th>)}
              </tr></thead>
              <tbody>
                {items.length === 0 ? <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400">No BOM items</td></tr>
                : items.map((item, idx) => (
                  <tr key={item.id} className="border-b border-gray-50 dark:border-gray-800">
                    <td className="px-4 py-3 text-gray-400">{idx + 1}</td>
                    <td className="px-4 py-3 font-medium">{item.material?.materialName || `Material #${item.materialId}`}</td>
                    <td className="px-4 py-3 text-right">{Number(item.consumptionPerUnit).toFixed(3)}</td>
                    <td className="px-4 py-3">{item.unit}</td>
                    <td className="px-4 py-3 text-right">{Number(item.wastagePct).toFixed(1)}%</td>
                    <td className="px-4 py-3 text-right font-medium">{Number(item.requiredQty).toFixed(2)}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[item.approvalStatus] || ""}`}>{item.approvalStatus}</span></td>
                    <td className="px-4 py-3 text-xs text-gray-500">{item.rejectionRemarks || '-'}</td>
                    <td className="px-4 py-3">
                      {item.approvalStatus === "PENDING" && (
                        <div className="flex gap-2">
                          <button onClick={() => handleApprove(item.id)} className="rounded bg-green-500 px-2 py-1 text-xs text-white hover:bg-green-600">Approve</button>
                          <button onClick={() => { const r = prompt("Rejection reason?"); if (r) handleReject(item.id, r); }} className="rounded bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-600">Reject</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
