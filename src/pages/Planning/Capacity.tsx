import { useEffect, useState, useCallback } from "react";
import {
  capacityLineApi,
  capacityBookingApi,
  capacityUtilApi,
  type CapacityLine,
  type CapacityBooking,
  type CapacityUtilization,
  type CreateCapacityLineInput,
  type CreateCapacityBookingInput,
} from "../../api/planning";
import { listBuyerOrders, type BuyerOrderSummary } from "../../api/merchandising";
import PageMeta from "../../components/common/PageMeta";

const deptColors: Record<string, string> = {
  CUTTING: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  SEWING: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  FINISHING: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  PACKING: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

const statusColors: Record<string, string> = {
  PLANNED: "bg-yellow-100 text-yellow-700",
  ACTIVE: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
      <div className={`h-3 rounded-full ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

function utilColor(pct: number) {
  if (pct > 90) return "bg-red-500";
  if (pct > 70) return "bg-amber-500";
  if (pct > 40) return "bg-blue-500";
  return "bg-green-500";
}

type Tab = "utilization" | "lines" | "bookings";

export default function Capacity() {
  const [tab, setTab] = useState<Tab>("utilization");

  /* ── Utilization ── */
  const today = new Date();
  const defaultFrom = today.toISOString().slice(0, 10);
  const twoWeeksLater = new Date(today.getTime() + 14 * 86400000).toISOString().slice(0, 10);
  const [utilFrom, setUtilFrom] = useState(defaultFrom);
  const [utilTo, setUtilTo] = useState(twoWeeksLater);
  const [utilDept, setUtilDept] = useState("");
  const [util, setUtil] = useState<CapacityUtilization[]>([]);
  const [utilLoading, setUtilLoading] = useState(false);

  const fetchUtil = useCallback(async () => {
    if (!utilFrom || !utilTo) return;
    setUtilLoading(true);
    try {
      const resp = await capacityUtilApi.get({ fromDate: utilFrom, toDate: utilTo, department: utilDept || undefined });
      setUtil(resp.data || []);
    } catch (e) { console.error(e); }
    finally { setUtilLoading(false); }
  }, [utilFrom, utilTo, utilDept]);

  useEffect(() => { if (tab === "utilization") fetchUtil(); }, [tab, fetchUtil]);

  /* ── Lines ── */
  const [lines, setLines] = useState<CapacityLine[]>([]);
  const [lineLoading, setLineLoading] = useState(false);
  const [showLineForm, setShowLineForm] = useState(false);
  const [editLine, setEditLine] = useState<CapacityLine | null>(null);
  const [lineForm, setLineForm] = useState<CreateCapacityLineInput>({
    lineName: "", department: "SEWING", totalMachines: 0, totalOperators: 0,
    samCapacity: 0, dailyCapacity: 0, efficiency: 60, shiftHours: 8, remarks: "",
  });

  const fetchLines = useCallback(async () => {
    setLineLoading(true);
    try {
      const resp = await capacityLineApi.list();
      setLines(resp.data || []);
    } catch (e) { console.error(e); }
    finally { setLineLoading(false); }
  }, []);

  useEffect(() => { if (tab === "lines") fetchLines(); }, [tab, fetchLines]);

  const openEditLine = (line: CapacityLine) => {
    setEditLine(line);
    setLineForm({
      lineName: line.lineName, department: line.department, totalMachines: line.totalMachines,
      totalOperators: line.totalOperators, samCapacity: line.samCapacity, dailyCapacity: line.dailyCapacity,
      efficiency: line.efficiency, shiftHours: line.shiftHours, remarks: line.remarks || "",
    });
    setShowLineForm(true);
  };

  const saveLine = async () => {
    try {
      if (editLine) {
        await capacityLineApi.update(editLine.id, lineForm);
      } else {
        await capacityLineApi.create(lineForm);
      }
      setShowLineForm(false);
      setEditLine(null);
      fetchLines();
    } catch (err) { console.error(err); alert("Failed to save line"); }
  };

  const deactivateLine = async (id: number) => {
    if (!confirm("Deactivate this line?")) return;
    try { await capacityLineApi.delete(id); fetchLines(); }
    catch (err: unknown) { alert((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Cannot delete - has active bookings"); }
  };

  /* ── Bookings ── */
  const [bookings, setBookings] = useState<CapacityBooking[]>([]);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [bookingForm, setBookingForm] = useState<CreateCapacityBookingInput>({
    lineId: 0, orderId: 0, startDate: defaultFrom, endDate: twoWeeksLater, dailyAllocQty: 0,
  });
  const [orders, setOrders] = useState<BuyerOrderSummary[]>([]);
  const [allLines, setAllLines] = useState<CapacityLine[]>([]);

  const fetchBookings = useCallback(async () => {
    setBookingLoading(true);
    try {
      const resp = await capacityBookingApi.list();
      setBookings(resp.data || []);
    } catch (e) { console.error(e); }
    finally { setBookingLoading(false); }
  }, []);

  const fetchOrdersAndLines = useCallback(async () => {
    try {
      const [orderResp, lineResp] = await Promise.all([
        listBuyerOrders({ status: "CONFIRMED", limit: 200 }),
        capacityLineApi.list({ isActive: true }),
      ]);
      setOrders(orderResp.data || []);
      setAllLines(lineResp.data || []);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { if (tab === "bookings") { fetchBookings(); fetchOrdersAndLines(); } }, [tab, fetchBookings, fetchOrdersAndLines]);

  const saveBooking = async () => {
    if (!bookingForm.lineId || !bookingForm.orderId) return;
    try {
      await capacityBookingApi.create(bookingForm);
      setShowBookingForm(false);
      fetchBookings();
    } catch (err) { console.error(err); alert("Failed to create booking"); }
  };

  const updateBookingStatus = async (id: number, status: string) => {
    try { await capacityBookingApi.update(id, { status }); fetchBookings(); }
    catch (err) { console.error(err); }
  };

  const deleteBooking = async (id: number) => {
    if (!confirm("Delete this booking?")) return;
    try { await capacityBookingApi.delete(id); fetchBookings(); }
    catch (err) { console.error(err); }
  };

  /* ── Summary stats ── */
  const totalCapacity = util.reduce((s, u) => s + u.totalCapacity, 0);
  const totalBooked = util.reduce((s, u) => s + u.bookedQty, 0);
  const totalAvailable = util.reduce((s, u) => s + u.availableQty, 0);
  const avgUtil = totalCapacity > 0 ? Math.round((totalBooked / totalCapacity) * 100) : 0;

  const tabs: { key: Tab; label: string }[] = [
    { key: "utilization", label: "Utilization Dashboard" },
    { key: "lines", label: "Factory Lines" },
    { key: "bookings", label: "Order Bookings" },
  ];

  return (
    <>
      <PageMeta title="Capacity Planning | STITCH ERP" description="Factory capacity management" />
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Capacity Planning</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Define lines, allocate orders, and monitor utilization</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition ${tab === t.key ? "bg-white dark:bg-gray-800 border border-b-white dark:border-gray-700 dark:border-b-gray-800 text-brand-600" : "text-gray-500 hover:text-gray-700 dark:text-gray-400"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ═══ UTILIZATION TAB ═══ */}
        {tab === "utilization" && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">From</label>
                <input type="date" value={utilFrom} onChange={e => setUtilFrom(e.target.value)} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">To</label>
                <input type="date" value={utilTo} onChange={e => setUtilTo(e.target.value)} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Department</label>
                <select value={utilDept} onChange={e => setUtilDept(e.target.value)} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-white">
                  <option value="">All Departments</option>
                  <option value="CUTTING">Cutting</option>
                  <option value="SEWING">Sewing</option>
                  <option value="FINISHING">Finishing</option>
                  <option value="PACKING">Packing</option>
                </select>
              </div>
              <button onClick={fetchUtil} disabled={utilLoading} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">
                {utilLoading ? "Loading..." : "Refresh"}
              </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total Capacity", value: totalCapacity.toLocaleString(), sub: "pieces" },
                { label: "Booked", value: totalBooked.toLocaleString(), sub: "pieces" },
                { label: "Available", value: totalAvailable.toLocaleString(), sub: "pieces" },
                { label: "Avg Utilization", value: `${avgUtil}%`, sub: avgUtil > 85 ? "Near Full" : "Healthy" },
              ].map((c, i) => (
                <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400">{c.label}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{c.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{c.sub}</p>
                </div>
              ))}
            </div>

            {/* Line-wise utilization */}
            <div className="space-y-3">
              {util.map(line => (
                <div key={line.lineId} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-900 dark:text-white">{line.lineName}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${deptColors[line.department] || "bg-gray-100 text-gray-600"}`}>{line.department}</span>
                      <span className="text-xs text-gray-400">{line.totalMachines} machines · {line.totalOperators} operators · {line.efficiency}% eff</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{line.utilizationPct}%</span>
                      <span className="text-xs text-gray-400 ml-2">{line.bookedQty}/{line.totalCapacity} pcs</span>
                    </div>
                  </div>
                  <Bar pct={line.utilizationPct} color={utilColor(line.utilizationPct)} />
                  {line.bookings.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {line.bookings.map(b => (
                        <span key={b.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-300">
                          {b.orderNo} · {b.buyerName} · {b.dailyAllocQty}/day
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {util.length === 0 && !utilLoading && (
                <p className="text-center text-gray-400 py-8">No active capacity lines found. Add lines in the &quot;Factory Lines&quot; tab.</p>
              )}
            </div>
          </div>
        )}

        {/* ═══ LINES TAB ═══ */}
        {tab === "lines" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={() => { setEditLine(null); setLineForm({ lineName: "", department: "SEWING", totalMachines: 0, totalOperators: 0, samCapacity: 0, dailyCapacity: 0, efficiency: 60, shiftHours: 8, remarks: "" }); setShowLineForm(true); }}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Add Line
              </button>
            </div>

            {lineLoading ? (
              <p className="text-center text-gray-400 py-8">Loading...</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      {["Line Name", "Department", "Machines", "Operators", "SAM/Day", "Daily Capacity", "Efficiency %", "Shift Hrs", "Bookings", "Actions"].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800/50">
                    {lines.map(line => (
                      <tr key={line.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 ${!line.isActive ? "opacity-50" : ""}`}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{line.lineName}</td>
                        <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${deptColors[line.department] || ""}`}>{line.department}</span></td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{line.totalMachines}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{line.totalOperators}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{line.samCapacity}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">{line.dailyCapacity}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{line.efficiency}%</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{line.shiftHours}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{line._count?.bookings ?? 0}</td>
                        <td className="px-4 py-3 text-sm">
                          <button onClick={() => openEditLine(line)} className="text-brand-500 hover:text-brand-700 mr-3">Edit</button>
                          {line.isActive && (
                            <button onClick={() => deactivateLine(line.id)} className="text-red-500 hover:text-red-700">Deactivate</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Line Form Modal */}
            {showLineForm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-lg mx-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{editLine ? "Edit Line" : "Add Factory Line"}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Line Name</label>
                      <input value={lineForm.lineName || ""} onChange={e => setLineForm({ ...lineForm, lineName: e.target.value })} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm dark:text-white" placeholder="e.g. LINE-04" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Department</label>
                      <select value={lineForm.department} onChange={e => setLineForm({ ...lineForm, department: e.target.value })} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm dark:text-white">
                        <option value="CUTTING">Cutting</option>
                        <option value="SEWING">Sewing</option>
                        <option value="FINISHING">Finishing</option>
                        <option value="PACKING">Packing</option>
                      </select>
                    </div>
                    {[
                      { key: "totalMachines", label: "Machines", type: "number" },
                      { key: "totalOperators", label: "Operators", type: "number" },
                      { key: "samCapacity", label: "SAM/Day", type: "number" },
                      { key: "dailyCapacity", label: "Daily Capacity (pcs)", type: "number" },
                      { key: "efficiency", label: "Efficiency %", type: "number" },
                      { key: "shiftHours", label: "Shift Hours", type: "number" },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="block text-xs font-medium text-gray-500 mb-1">{f.label}</label>
                        <input type={f.type} value={(lineForm as unknown as Record<string, unknown>)[f.key] as number ?? ""} onChange={e => setLineForm({ ...lineForm, [f.key]: Number(e.target.value) })}
                          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm dark:text-white" />
                      </div>
                    ))}
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Remarks</label>
                      <input value={lineForm.remarks || ""} onChange={e => setLineForm({ ...lineForm, remarks: e.target.value })} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm dark:text-white" />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 mt-6">
                    <button onClick={() => { setShowLineForm(false); setEditLine(null); }} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800">Cancel</button>
                    <button onClick={saveLine} className="px-4 py-2.5 rounded-lg bg-brand-500 text-sm font-medium text-white hover:bg-brand-600">{editLine ? "Update" : "Create"}</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ BOOKINGS TAB ═══ */}
        {tab === "bookings" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={() => { setBookingForm({ lineId: allLines[0]?.id || 0, orderId: 0, startDate: defaultFrom, endDate: twoWeeksLater, dailyAllocQty: 0 }); setShowBookingForm(true); }}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Book Capacity
              </button>
            </div>

            {bookingLoading ? (
              <p className="text-center text-gray-400 py-8">Loading...</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      {["Line", "Dept", "Order", "Buyer / Style", "Start", "End", "Daily Qty", "Total Qty", "Status", "Actions"].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800/50">
                    {bookings.map(b => (
                      <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{b.line?.lineName}</td>
                        <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${deptColors[b.line?.department || ""] || ""}`}>{b.line?.department}</span></td>
                        <td className="px-4 py-3 text-sm text-brand-600 font-medium">{b.order?.orderNo}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{b.order?.buyer?.name} / {b.order?.style?.styleNo}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{fmtDate(b.startDate)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{fmtDate(b.endDate)}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">{b.dailyAllocQty}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{b.totalAllocQty}</td>
                        <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[b.status] || ""}`}>{b.status}</span></td>
                        <td className="px-4 py-3 text-sm space-x-2">
                          {b.status === "PLANNED" && (
                            <button onClick={() => updateBookingStatus(b.id, "ACTIVE")} className="text-blue-500 hover:text-blue-700">Start</button>
                          )}
                          {b.status === "ACTIVE" && (
                            <button onClick={() => updateBookingStatus(b.id, "COMPLETED")} className="text-green-500 hover:text-green-700">Complete</button>
                          )}
                          {(b.status === "PLANNED" || b.status === "ACTIVE") && (
                            <button onClick={() => deleteBooking(b.id)} className="text-red-500 hover:text-red-700">Delete</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {bookings.length === 0 && (
                  <p className="text-center text-gray-400 py-8">No bookings found. Click &quot;Book Capacity&quot; to allocate orders to lines.</p>
                )}
              </div>
            )}

            {/* Booking Form Modal */}
            {showBookingForm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-lg mx-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Book Capacity</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Factory Line</label>
                      <select value={bookingForm.lineId} onChange={e => setBookingForm({ ...bookingForm, lineId: Number(e.target.value) })}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm dark:text-white">
                        <option value={0}>Select line...</option>
                        {allLines.map(l => <option key={l.id} value={l.id}>{l.lineName} ({l.department}) — {l.dailyCapacity} pcs/day</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Buyer Order</label>
                      <select value={bookingForm.orderId} onChange={e => setBookingForm({ ...bookingForm, orderId: Number(e.target.value) })}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm dark:text-white">
                        <option value={0}>Select order...</option>
                        {orders.map(o => <option key={o.id} value={o.id}>{o.orderNo} — {o.buyer?.name} / {o.style?.styleNo} ({o.totalQty} pcs)</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
                        <input type="date" value={bookingForm.startDate} onChange={e => setBookingForm({ ...bookingForm, startDate: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm dark:text-white" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
                        <input type="date" value={bookingForm.endDate} onChange={e => setBookingForm({ ...bookingForm, endDate: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm dark:text-white" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Daily Allocated Qty (pieces)</label>
                      <input type="number" value={bookingForm.dailyAllocQty} onChange={e => setBookingForm({ ...bookingForm, dailyAllocQty: Number(e.target.value) })}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">SAM / Piece (optional)</label>
                      <input type="number" step="0.01" value={bookingForm.samPerPiece ?? ""} onChange={e => setBookingForm({ ...bookingForm, samPerPiece: e.target.value ? Number(e.target.value) : null })}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm dark:text-white" />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 mt-6">
                    <button onClick={() => setShowBookingForm(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800">Cancel</button>
                    <button onClick={saveBooking} className="px-4 py-2.5 rounded-lg bg-brand-500 text-sm font-medium text-white hover:bg-brand-600">Create Booking</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
