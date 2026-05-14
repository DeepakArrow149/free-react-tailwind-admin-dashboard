/**
 * NewOrderQuickStartModal — minimal 4-field draft creation modal.
 *
 * Asks only Buyer, Style, Order Date, Ex-Factory Date — the absolute minimum the
 * backend requires. On submit it creates a DRAFT order and routes to its detail
 * page, where the user can populate the remaining tabs (PO Matrix, Fabric
 * Consumption, Process Sequence, Shipments). Replaces the old "+ New Order"
 * link that opened a blank OrderForm with all the dependent tabs locked.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { createBuyerOrder, type CreateBuyerOrderInput } from '../../../../api/merchandising';
import { masterApi, type Buyer, type StyleMaster } from '../../../../api/master';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function NewOrderQuickStartModal({ open, onClose }: Props) {
  const navigate = useNavigate();
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [styles, setStyles] = useState<StyleMaster[]>([]);
  const [buyerId, setBuyerId] = useState<number | ''>('');
  const [styleId, setStyleId] = useState<number | ''>('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [exFactoryDate, setExFactoryDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    Promise.all([
      masterApi.listBuyers({ limit: 200 }),
      masterApi.listStyles({ limit: 500 }),
    ]).then(([b, s]) => {
      setBuyers((b.data as { data: Buyer[] }).data ?? []);
      setStyles((s.data as { data: StyleMaster[] }).data ?? []);
    }).catch(() => toast.error('Failed to load buyers / styles'));
  }, [open]);

  if (!open) return null;

  const filteredStyles = buyerId ? styles.filter((s) => s.buyerId === buyerId) : styles;

  const submit = async () => {
    if (!buyerId) { toast.error('Buyer is required'); return; }
    if (!styleId) { toast.error('Style is required'); return; }
    if (!orderDate) { toast.error('Order Date is required'); return; }
    if (!exFactoryDate) { toast.error('Ex-Factory Date is required'); return; }

    setSubmitting(true);
    try {
      const buyer = buyers.find((b) => b.id === buyerId);
      const payload: CreateBuyerOrderInput = {
        buyerId: Number(buyerId),
        styleId: Number(styleId),
        orderDate,
        exFactoryDate,
        currency: buyer?.currency ?? 'USD',
        paymentTerms: buyer?.paymentTerms ?? null,
      };
      const resp = await createBuyerOrder(payload);
      toast.success(`Draft ${resp.data.orderNo} created — fill in the remaining tabs`);
      onClose();
      navigate(`/merchandising/orders/${resp.data.id}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to create draft');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-gray-900">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Start a New Buyer Order</h3>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Provide the four required fields to create a DRAFT. PO matrix, fabric consumption, process sequence and shipments are managed in their dedicated tabs after the draft is created.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Buyer *</label>
            <select aria-label="Buyer" value={buyerId} onChange={(e) => { setBuyerId(e.target.value ? Number(e.target.value) : ''); setStyleId(''); }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90">
              <option value="">— Select buyer —</option>
              {buyers.map((b) => <option key={b.id} value={b.id}>{b.code} — {b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Style *</label>
            <select aria-label="Style" value={styleId} onChange={(e) => setStyleId(e.target.value ? Number(e.target.value) : '')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90"
              disabled={!buyerId}>
              <option value="">{buyerId ? '— Select style —' : '— Choose buyer first —'}</option>
              {filteredStyles.map((s) => <option key={s.id} value={s.id}>{s.styleNo} — {s.styleName}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Order Date *</label>
              <input type="date" aria-label="Order Date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Ex-Factory Date *</label>
              <input type="date" aria-label="Ex-Factory Date" value={exFactoryDate} onChange={(e) => setExFactoryDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90" />
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={submitting}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
            Cancel
          </button>
          <button type="button" onClick={submit} disabled={submitting || !buyerId || !styleId || !orderDate || !exFactoryDate}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">
            {submitting ? 'Creating...' : 'Create Draft'}
          </button>
        </div>
      </div>
    </div>
  );
}
