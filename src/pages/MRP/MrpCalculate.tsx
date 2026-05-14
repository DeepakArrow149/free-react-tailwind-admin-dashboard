import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { mrpRunApi } from "../../api/mrp";
import api from "../../api/client";
import PageMeta from "../../components/common/PageMeta";

interface OrderOption { id: number; orderNo: string; buyer: { name: string }; style: { styleNo: string }; orderQty: number }

export default function MrpCalculate() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderOption[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
  const [includeBuffer, setIncludeBuffer] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.get("/merchandising/orders", { params: { limit: 200, status: "CONFIRMED" } }).then(r => setOrders(r.data.data || []));
  }, []);

  const filteredOrders = orders.filter(o =>
    o.orderNo.toLowerCase().includes(search.toLowerCase()) ||
    o.buyer.name.toLowerCase().includes(search.toLowerCase()) ||
    o.style.styleNo.toLowerCase().includes(search.toLowerCase())
  );

  const toggleOrder = (id: number) => {
    setSelectedOrders(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleCalculate = async () => {
    if (!selectedOrders.length) return alert("Select at least one order");
    setLoading(true);
    try {
      const { data: resp } = await mrpRunApi.calculate({ orderIds: selectedOrders, includeBuffer });
      setResult(resp.data);
    } catch (err: any) {
      alert(err?.response?.data?.message || "Calculation failed");
    } finally { setLoading(false); }
  };

  return (
    <>
      <PageMeta title="MRP Calculation | ERP TRACK" description="Run MRP Calculation" />
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">MRP Calculation</h2>
          <button onClick={() => navigate("/mrp/runs")} className="text-sm text-brand-500 hover:underline">← Back to MRP Runs</button>
        </div>

        {!result ? (
          <div className="space-y-4">
            {/* Order Selection */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/3">
              <h3 className="mb-3 font-medium text-gray-800 dark:text-white/90">1. Select Orders</h3>
              <input type="text" placeholder="Search orders..." value={search} onChange={e => setSearch(e.target.value)}
                className="mb-3 h-10 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm dark:border-gray-700 focus:border-brand-300 focus:outline-none" />
              <div className="max-h-60 overflow-y-auto space-y-1">
                {filteredOrders.map(o => (
                  <label key={o.id} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer">
                    <input type="checkbox" checked={selectedOrders.includes(o.id)} onChange={() => toggleOrder(o.id)}
                      className="rounded border-gray-300 text-brand-500 focus:ring-brand-500" />
                    <span className="text-sm font-medium text-gray-800 dark:text-white/80">{o.orderNo}</span>
                    <span className="text-xs text-gray-500">{o.buyer.name} / {o.style.styleNo}</span>
                    <span className="ml-auto text-xs text-gray-400">Qty: {o.orderQty}</span>
                  </label>
                ))}
                {filteredOrders.length === 0 && <p className="px-3 py-4 text-center text-sm text-gray-400">No confirmed orders found</p>}
              </div>
              <p className="mt-2 text-xs text-gray-500">{selectedOrders.length} order(s) selected</p>
            </div>

            {/* Options */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/3">
              <h3 className="mb-3 font-medium text-gray-800 dark:text-white/90">2. Options</h3>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={includeBuffer} onChange={e => setIncludeBuffer(e.target.checked)}
                  className="rounded border-gray-300 text-brand-500 focus:ring-brand-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Include buffer stock (wastage allowance)</span>
              </label>
            </div>

            <button onClick={handleCalculate} disabled={loading || !selectedOrders.length}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">
              {loading ? "Calculating..." : "Run MRP Calculation"}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
              <h3 className="font-medium text-green-800 dark:text-green-400">Calculation Complete</h3>
              <p className="text-sm text-green-700 dark:text-green-300">MRP Run #{result.id} created with {result.items?.length || 0} material lines.</p>
            </div>
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
              <table className="w-full table-auto text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    {["Material", "Required Qty", "Stock on Hand", "On Order", "Shortage", "Unit"].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(result.items || []).map((item: any) => (
                    <tr key={item.id} className="border-b border-gray-50 dark:border-gray-800">
                      <td className="px-4 py-3 text-gray-800 dark:text-white/80">{item.material?.materialName || item.materialId}</td>
                      <td className="px-4 py-3 text-right">{Number(item.requiredQty).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">{Number(item.stockOnHand || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">{Number(item.onOrderQty || 0).toFixed(2)}</td>
                      <td className={`px-4 py-3 text-right font-medium ${Number(item.shortageQty) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {Number(item.shortageQty || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{item.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-3">
              <button onClick={() => navigate(`/mrp/runs/${result.id}`)} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">View Full Run</button>
              <button onClick={() => { setResult(null); setSelectedOrders([]); }} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300">New Calculation</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
