/**
 * AmendOrderDialog — modal for amending a CONFIRMED/IN_PRODUCTION buyer order.
 *
 * Backend `PATCH /orders/:id/amend` requires a non-empty `changeReason` and
 * accepts a subset of editable fields. v1 collects the reason + a handful of
 * dates and the priority/tolerance fields commonly amended in apparel orders.
 * Each amend creates a Revision History entry visible on the Revisions tab.
 */

import { useState } from 'react';
import { toast } from 'sonner';
import { amendBuyerOrder, type AmendBuyerOrderInput, type BuyerOrderFull } from '../../../../api/merchandising';

interface Props {
  order: BuyerOrderFull;
  open: boolean;
  onClose: () => void;
  onAmended: (refreshed: BuyerOrderFull) => void;
}

export default function AmendOrderDialog({ order, open, onClose, onAmended }: Props) {
  const [reason, setReason] = useState('');
  const [exFactoryDate, setExFactoryDate] = useState(order.exFactoryDate ? order.exFactoryDate.slice(0, 10) : '');
  const [planCutDate, setPlanCutDate] = useState((order as any).planCutDate ? (order as any).planCutDate.slice(0, 10) : '');
  const [earliestShipDate, setEarliestShipDate] = useState((order as any).earliestShipDate ? (order as any).earliestShipDate.slice(0, 10) : '');
  const [latestShipDate, setLatestShipDate] = useState((order as any).latestShipDate ? (order as any).latestShipDate.slice(0, 10) : '');
  const [orderPriority, setOrderPriority] = useState<number | ''>((order as any).orderPriority ?? '');
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const submit = async () => {
    const trimmed = reason.trim();
    if (!trimmed) { toast.error('A reason for the amendment is required'); return; }
    setSubmitting(true);
    try {
      const payload: AmendBuyerOrderInput = { changeReason: trimmed };
      if (exFactoryDate    !== (order.exFactoryDate ? order.exFactoryDate.slice(0,10) : ''))     payload.exFactoryDate    = exFactoryDate || undefined;
      if (planCutDate      !== ((order as any).planCutDate ? (order as any).planCutDate.slice(0,10) : ''))     payload.planCutDate      = planCutDate || null;
      if (earliestShipDate !== ((order as any).earliestShipDate ? (order as any).earliestShipDate.slice(0,10) : '')) payload.earliestShipDate = earliestShipDate || null;
      if (latestShipDate   !== ((order as any).latestShipDate ? (order as any).latestShipDate.slice(0,10) : ''))     payload.latestShipDate   = latestShipDate || null;
      if (orderPriority !== '' && orderPriority !== (order as any).orderPriority) payload.orderPriority = Number(orderPriority);

      const resp = await amendBuyerOrder(order.id, payload);
      toast.success('Order amended; revision recorded.');
      onAmended(resp.data);
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Amend failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl dark:bg-gray-900">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Amend Order {order.orderNo}</h3>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Confirmed orders can only be changed via amendments. Each amendment is recorded in the Revision History.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Reason *</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Why is this order being amended?"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Ex-Factory Date</label>
              <input type="date" value={exFactoryDate} onChange={(e) => setExFactoryDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90"
                aria-label="Ex-Factory Date" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Plan Cut Date</label>
              <input type="date" value={planCutDate} onChange={(e) => setPlanCutDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90"
                aria-label="Plan Cut Date" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Earliest Ship Date</label>
              <input type="date" value={earliestShipDate} onChange={(e) => setEarliestShipDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90"
                aria-label="Earliest Ship Date" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Latest Ship Date</label>
              <input type="date" value={latestShipDate} onChange={(e) => setLatestShipDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90"
                aria-label="Latest Ship Date" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Priority (1 = highest)</label>
              <select value={orderPriority} onChange={(e) => setOrderPriority(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90"
                aria-label="Order priority">
                <option value="">— unchanged —</option>
                <option value={1}>1 — Highest</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
                <option value={5}>5 — Lowest</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={submitting}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
            Cancel
          </button>
          <button type="button" onClick={submit} disabled={submitting || !reason.trim()}
            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50">
            {submitting ? 'Saving...' : 'Save Amendment'}
          </button>
        </div>
      </div>
    </div>
  );
}
