import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { mrpRunApi } from "../../api/mrp";
import PageMeta from "../../components/common/PageMeta";

export default function MrpRunDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [run, setRun] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    mrpRunApi.get(Number(id)).then(r => setRun(r.data.data)).catch(() => alert("Failed to load")).finally(() => setLoading(false));
  }, [id]);

  const handleStatusUpdate = async (status: string) => {
    try { const { data: resp } = await mrpRunApi.updateStatus(Number(id), status); setRun(resp.data); } catch { alert("Status update failed"); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-r-transparent" /></div>;
  if (!run) return <div className="py-20 text-center text-gray-400">MRP Run not found</div>;

  return (
    <>
      <PageMeta title={`MRP Run #${run.id} | ERP TRACK`} description="MRP Run Detail" />
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <button onClick={() => navigate("/mrp/runs")} className="text-sm text-brand-500 hover:underline">← Back to MRP Runs</button>
            <h2 className="mt-1 text-xl font-semibold text-gray-800 dark:text-white/90">MRP Run #{run.id}</h2>
          </div>
          <div className="flex gap-2">
            {run.status === "DRAFT" && <button onClick={() => handleStatusUpdate("CONFIRMED")} className="rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600">Confirm</button>}
            {run.status === "CONFIRMED" && <button onClick={() => handleStatusUpdate("INDENT_RAISED")} className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600">Raise Indent</button>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Status", value: run.status },
            { label: "Order", value: run.order?.orderNo || "-" },
            { label: "Items", value: run.items?.length || 0 },
            { label: "Date", value: new Date(run.createdAt).toLocaleDateString("en-IN") },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/3">
              <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
              <p className="mt-1 text-lg font-semibold text-gray-800 dark:text-white/90">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
          <table className="w-full table-auto text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                {["Material", "Consumption/Pc", "Wastage %", "Required Qty", "Stock", "On Order", "Shortage", "Unit"].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(run.items || []).map((item: any) => (
                <tr key={item.id} className="border-b border-gray-50 dark:border-gray-800">
                  <td className="px-4 py-3 font-medium text-gray-800 dark:text-white/80">{item.material?.materialName || item.materialId}</td>
                  <td className="px-4 py-3 text-right">{Number(item.consumptionPerPiece || 0).toFixed(4)}</td>
                  <td className="px-4 py-3 text-right">{Number(item.wastagePct || 0).toFixed(1)}%</td>
                  <td className="px-4 py-3 text-right font-medium">{Number(item.requiredQty || 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">{Number(item.stockOnHand || 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">{Number(item.onOrderQty || 0).toFixed(2)}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${Number(item.shortageQty) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {Number(item.shortageQty || 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{item.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
