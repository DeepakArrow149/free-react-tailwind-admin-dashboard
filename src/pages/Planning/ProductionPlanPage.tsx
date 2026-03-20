import { useState, useEffect } from 'react';
import api from '../../api/client';
import { toast } from 'sonner';

interface Order {
  id: number;
  orderNo: string;
  buyer?: { name: string };
  style?: { styleNo: string };
  totalQty: number;
  exFactoryDate: string;
  status: string;
}

interface CapacityLine {
  id: number;
  lineNo: string;
  section: string;
  operators: number;
  samCapacity: number;
}

interface Allocation {
  id?: number;
  orderId: number;
  lineId: number;
  orderNo: string;
  lineNo: string;
  allocatedQty: number;
  startDate: string;
  endDate: string;
  priority: number;
}

export default function ProductionPlanPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [lines, setLines] = useState<CapacityLine[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(true);

  // New allocation form
  const [form, setForm] = useState({ orderId: '', lineId: '', allocatedQty: '', startDate: '', endDate: '', priority: '1' });

  useEffect(() => {
    (async () => {
      try {
        const [ordersRes, linesRes] = await Promise.all([
          api.get('/merchandising/orders', { params: { status: 'CONFIRMED,IN_PRODUCTION' } }),
          api.get('/planning/capacity'),
        ]);
        setOrders(ordersRes.data?.data || []);
        setLines(linesRes.data?.data || []);
      } catch { toast.error('Failed to load data'); }
      setLoading(false);
    })();
  }, []);

  const handleAllocate = () => {
    const order = orders.find((o) => o.id === parseInt(form.orderId));
    const line = lines.find((l) => l.id === parseInt(form.lineId));
    if (!order || !line) { toast.error('Select valid order and line'); return; }

    setAllocations([
      ...allocations,
      {
        orderId: order.id,
        lineId: line.id,
        orderNo: order.orderNo,
        lineNo: line.lineNo,
        allocatedQty: parseInt(form.allocatedQty) || 0,
        startDate: form.startDate,
        endDate: form.endDate,
        priority: parseInt(form.priority) || 1,
      },
    ]);
    toast.success(`Allocated ${form.allocatedQty} pcs of ${order.orderNo} to Line ${line.lineNo}`);
    setForm({ orderId: '', lineId: '', allocatedQty: '', startDate: '', endDate: '', priority: '1' });
  };

  const removeAllocation = (idx: number) => {
    setAllocations(allocations.filter((_, i) => i !== idx));
  };

  // Line utilization calculation
  const lineUtilization = lines.map((line) => {
    const lineAllocs = allocations.filter((a) => a.lineId === line.id);
    const totalAllocated = lineAllocs.reduce((s, a) => s + a.allocatedQty, 0);
    return { ...line, allocated: totalAllocated, orders: lineAllocs.length };
  });

  // Unplanned orders
  const plannedOrderIds = new Set(allocations.map((a) => a.orderId));
  const unplannedOrders = orders.filter((o) => !plannedOrderIds.has(o.id));

  if (loading) return <div className="p-6 text-gray-400">Loading production plan…</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Production Plan — Order-to-Line Allocation</h2>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Confirmed Orders', value: orders.length },
          { label: 'Unplanned', value: unplannedOrders.length },
          { label: 'Active Lines', value: lines.length },
          { label: 'Allocations', value: allocations.length },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{c.label}</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Allocation Form */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Allocate Order to Line</h3>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Order</label>
            <select value={form.orderId} onChange={(e) => setForm({ ...form, orderId: e.target.value })} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm">
              <option value="">Select Order</option>
              {orders.map((o) => <option key={o.id} value={o.id}>{o.orderNo} ({o.buyer?.name})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Line</label>
            <select value={form.lineId} onChange={(e) => setForm({ ...form, lineId: e.target.value })} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm">
              <option value="">Select Line</option>
              {lines.map((l) => <option key={l.id} value={l.id}>Line {l.lineNo} ({l.section}, {l.operators} ops)</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Qty</label>
            <input type="number" value={form.allocatedQty} onChange={(e) => setForm({ ...form, allocatedQty: e.target.value })} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Start</label>
            <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">End</label>
            <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm" />
          </div>
          <div className="flex items-end">
            <button onClick={handleAllocate} className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Allocate</button>
          </div>
        </div>
      </div>

      {/* Line Utilization */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Line Utilization</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {lineUtilization.map((l) => (
            <div key={l.id} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-800 dark:text-white">Line {l.lineNo}</span>
                <span className="text-xs text-gray-500">{l.section}</span>
              </div>
              <p className="text-sm text-gray-500">{l.operators} operators · SAM cap: {l.samCapacity}</p>
              <p className="text-sm mt-1">{l.orders} orders · {l.allocated.toLocaleString()} pcs allocated</p>
              <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-600 mt-2">
                <div className={`h-2 rounded-full ${l.allocated > 0 ? 'bg-blue-500' : 'bg-gray-300'}`} style={{ width: `${Math.min(100, l.allocated > 0 ? 30 + Math.min(70, l.orders * 20) : 0)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Allocation Table */}
      {allocations.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Current Allocations</h3>
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {['Order', 'Line', 'Qty', 'Start', 'End', 'Priority', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {allocations.map((a, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                    <td className="px-4 py-3 font-medium">{a.orderNo}</td>
                    <td className="px-4 py-3">Line {a.lineNo}</td>
                    <td className="px-4 py-3 text-right">{a.allocatedQty.toLocaleString()}</td>
                    <td className="px-4 py-3">{a.startDate}</td>
                    <td className="px-4 py-3">{a.endDate}</td>
                    <td className="px-4 py-3">{a.priority}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => removeAllocation(i)} className="text-red-600 hover:text-red-800 text-xs">Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Unplanned Orders */}
      {unplannedOrders.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Unplanned Orders ({unplannedOrders.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {unplannedOrders.slice(0, 12).map((o) => (
              <div key={o.id} className="rounded-lg border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20 p-4">
                <p className="font-medium text-gray-800 dark:text-white">{o.orderNo}</p>
                <p className="text-sm text-gray-500">{o.buyer?.name} · {o.style?.styleNo}</p>
                <p className="text-sm text-gray-500">{o.totalQty?.toLocaleString()} pcs · EF: {o.exFactoryDate ? new Date(o.exFactoryDate).toLocaleDateString() : '-'}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
