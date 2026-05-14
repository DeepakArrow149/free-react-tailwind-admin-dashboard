/**
 * ShipmentSchedulePanel — displays & manages shipment schedule rows for a buyer order.
 * Designed to be embedded inside the Order detail/form page.
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listShipments,
  createShipment,
  updateShipment,
  deleteShipment,
  type ShipmentSchedule,
  type CreateShipmentInput,
  type UpdateShipmentInput,
} from '@/api/merchandising';
import { toast } from 'sonner';

interface ShipmentSchedulePanelProps {
  orderId: number;
  readOnly?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  PLANNED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  PARTIAL: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  SHIPPED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

export default function ShipmentSchedulePanel({ orderId, readOnly = false }: ShipmentSchedulePanelProps) {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<Partial<CreateShipmentInput & UpdateShipmentInput>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['shipments', orderId],
    queryFn: () => listShipments(orderId),
    enabled: orderId > 0,
  });

  const shipments: ShipmentSchedule[] = data?.data ?? [];

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['shipments', orderId] });
  }, [qc, orderId]);

  const addMutation = useMutation({
    mutationFn: (input: CreateShipmentInput) => createShipment(orderId, input),
    onSuccess: () => { toast.success('Shipment added'); setShowAdd(false); setForm({}); invalidate(); },
    onError: () => toast.error('Failed to add shipment'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateShipmentInput }) => updateShipment(orderId, id, input),
    onSuccess: () => { toast.success('Shipment updated'); setEditingId(null); setForm({}); invalidate(); },
    onError: () => toast.error('Failed to update shipment'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteShipment(orderId, id),
    onSuccess: () => { toast.success('Shipment deleted'); invalidate(); },
    onError: () => toast.error('Failed to delete shipment'),
  });

  const startEdit = (s: ShipmentSchedule) => {
    setEditingId(s.id);
    setForm({
      plannedDate: s.plannedDate?.slice(0, 10),
      actualDate: s.actualDate?.slice(0, 10) ?? '',
      plannedQty: s.plannedQty,
      shippedQty: s.shippedQty,
      status: s.status,
      remarks: s.remarks ?? '',
    });
  };

  const startAdd = () => {
    setShowAdd(true);
    setForm({
      shipmentNo: (shipments.length > 0 ? Math.max(...shipments.map((s) => s.shipmentNo)) + 1 : 1),
      plannedDate: '',
      plannedQty: 0,
      remarks: '',
    });
  };

  const handleSaveNew = () => {
    if (!form.plannedDate || !form.plannedQty) {
      toast.error('Please fill planned date and qty');
      return;
    }
    addMutation.mutate({
      shipmentNo: form.shipmentNo ?? 1,
      plannedDate: form.plannedDate,
      plannedQty: form.plannedQty,
      remarks: form.remarks ?? null,
    });
  };

  const handleSaveEdit = () => {
    if (editingId == null) return;
    updateMutation.mutate({
      id: editingId,
      input: {
        plannedDate: form.plannedDate,
        actualDate: form.actualDate || null,
        plannedQty: form.plannedQty,
        shippedQty: form.shippedQty,
        status: form.status,
        remarks: form.remarks ?? null,
      },
    });
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-800 dark:text-white">
          Shipment Schedule
        </h3>
        {!readOnly && (
          <button
            onClick={startAdd}
            disabled={showAdd}
            className="rounded bg-brand-600 px-3 py-1 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            + Add Shipment
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="py-6 text-center text-sm text-gray-400">Loading shipments...</div>
      ) : shipments.length === 0 && !showAdd ? (
        <div className="py-6 text-center text-sm text-gray-400">No shipment schedules yet</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 text-xs uppercase text-gray-500 dark:border-gray-600 dark:text-gray-400">
              <tr>
                <th className="px-2 py-2">#</th>
                <th className="px-2 py-2">Planned Date</th>
                <th className="px-2 py-2">Actual Date</th>
                <th className="px-2 py-2 text-right">Planned Qty</th>
                <th className="px-2 py-2 text-right">Shipped Qty</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Remarks</th>
                {!readOnly && <th className="px-2 py-2 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {shipments.map((s) => (
                editingId === s.id ? (
                  <tr key={s.id} className="border-b border-gray-100 bg-blue-50/50 dark:border-gray-700 dark:bg-blue-900/10">
                    <td className="px-2 py-1.5">{s.shipmentNo}</td>
                    <td className="px-2 py-1.5">
                      <input type="date" value={form.plannedDate ?? ''} onChange={(e) => setForm((f) => ({ ...f, plannedDate: e.target.value }))}
                        aria-label="Planned date" className="w-32 rounded border px-1.5 py-0.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
                    </td>
                    <td className="px-2 py-1.5">
                      <input type="date" value={form.actualDate ?? ''} onChange={(e) => setForm((f) => ({ ...f, actualDate: e.target.value }))}
                        aria-label="Actual date" className="w-32 rounded border px-1.5 py-0.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <input type="number" value={form.plannedQty ?? 0} onChange={(e) => setForm((f) => ({ ...f, plannedQty: +e.target.value }))}
                        aria-label="Planned quantity" className="w-20 rounded border px-1.5 py-0.5 text-right text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <input type="number" value={form.shippedQty ?? 0} onChange={(e) => setForm((f) => ({ ...f, shippedQty: +e.target.value }))}
                        aria-label="Shipped quantity" className="w-20 rounded border px-1.5 py-0.5 text-right text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
                    </td>
                    <td className="px-2 py-1.5">
                      <select value={form.status ?? 'PLANNED'} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                        aria-label="Shipment status" className="rounded border px-1.5 py-0.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                        <option value="PLANNED">Planned</option>
                        <option value="PARTIAL">Partial</option>
                        <option value="SHIPPED">Shipped</option>
                        <option value="CANCELLED">Cancelled</option>
                      </select>
                    </td>
                    <td className="px-2 py-1.5">
                      <input type="text" value={form.remarks ?? ''} onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
                        aria-label="Remarks" className="w-28 rounded border px-1.5 py-0.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <button onClick={handleSaveEdit} className="mr-1 text-xs text-green-600 hover:underline">Save</button>
                      <button onClick={() => { setEditingId(null); setForm({}); }} className="text-xs text-gray-500 hover:underline">Cancel</button>
                    </td>
                  </tr>
                ) : (
                  <tr key={s.id} className="border-b border-gray-100 dark:border-gray-700">
                    <td className="px-2 py-1.5 font-medium">{s.shipmentNo}</td>
                    <td className="px-2 py-1.5">{s.plannedDate?.slice(0, 10)}</td>
                    <td className="px-2 py-1.5">{s.actualDate?.slice(0, 10) ?? '—'}</td>
                    <td className="px-2 py-1.5 text-right">{s.plannedQty.toLocaleString()}</td>
                    <td className="px-2 py-1.5 text-right">{s.shippedQty.toLocaleString()}</td>
                    <td className="px-2 py-1.5">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[s.status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-gray-500">{s.remarks ?? ''}</td>
                    {!readOnly && (
                      <td className="px-2 py-1.5 text-center">
                        <button onClick={() => startEdit(s)} className="mr-1 text-xs text-blue-600 hover:underline">Edit</button>
                        <button onClick={() => { if (confirm('Delete this shipment?')) deleteMutation.mutate(s.id); }}
                          className="text-xs text-red-600 hover:underline">Delete</button>
                      </td>
                    )}
                  </tr>
                )
              ))}

              {/* Add new row */}
              {showAdd && (
                <tr className="border-b border-gray-100 bg-green-50/50 dark:border-gray-700 dark:bg-green-900/10">
                  <td className="px-2 py-1.5 font-medium">{form.shipmentNo}</td>
                  <td className="px-2 py-1.5">
                    <input type="date" value={form.plannedDate ?? ''} onChange={(e) => setForm((f) => ({ ...f, plannedDate: e.target.value }))}
                      aria-label="Planned date" className="w-32 rounded border px-1.5 py-0.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
                  </td>
                  <td className="px-2 py-1.5 text-gray-400">—</td>
                  <td className="px-2 py-1.5 text-right">
                    <input type="number" value={form.plannedQty ?? 0} onChange={(e) => setForm((f) => ({ ...f, plannedQty: +e.target.value }))}
                      aria-label="Planned quantity" className="w-20 rounded border px-1.5 py-0.5 text-right text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
                  </td>
                  <td className="px-2 py-1.5 text-right text-gray-400">0</td>
                  <td className="px-2 py-1.5 text-gray-400">PLANNED</td>
                  <td className="px-2 py-1.5">
                    <input type="text" value={form.remarks ?? ''} onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
                      placeholder="Optional"
                      aria-label="Remarks" className="w-28 rounded border px-1.5 py-0.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <button onClick={handleSaveNew} className="mr-1 text-xs text-green-600 hover:underline">Save</button>
                    <button onClick={() => { setShowAdd(false); setForm({}); }} className="text-xs text-gray-500 hover:underline">Cancel</button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary row */}
      {shipments.length > 0 && (
        <div className="mt-2 flex gap-4 text-xs text-gray-500 dark:text-gray-400">
          <span>Total planned: <strong className="text-gray-700 dark:text-gray-200">{shipments.reduce((s, x) => s + x.plannedQty, 0).toLocaleString()}</strong></span>
          <span>Total shipped: <strong className="text-gray-700 dark:text-gray-200">{shipments.reduce((s, x) => s + x.shippedQty, 0).toLocaleString()}</strong></span>
          <span>Shipments: <strong className="text-gray-700 dark:text-gray-200">{shipments.length}</strong></span>
        </div>
      )}
    </div>
  );
}
