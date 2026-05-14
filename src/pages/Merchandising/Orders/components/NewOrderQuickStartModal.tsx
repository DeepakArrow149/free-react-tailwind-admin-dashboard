/**
 * NewOrderQuickStartModal — 2-column draft creation modal.
 *
 * Left: minimum fields a merchandiser needs to lock in a DRAFT — Buyer, Style,
 * Order Date, Ex-Factory Date, Season, Order Type, Buyer PO. Currency and
 * payment terms are shown as read-only chips (carried from the buyer master)
 * so the user knows what will be applied.
 *
 * Right: visual preview pane for the selected style — primary thumbnail,
 * style metadata, SAM, season, description, tech pack link.
 *
 * On submit it creates a DRAFT order and routes to its detail page where the
 * PO matrix, fabric consumption, process sequence and shipments tabs unlock.
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { createBuyerOrder, type CreateBuyerOrderInput } from '../../../../api/merchandising';
import { masterApi, type Buyer, type Season, type StyleMaster } from '../../../../api/master';
import { uploadUrl } from '@/core/utils';

interface Props {
  open: boolean;
  onClose: () => void;
}

type OrderType = NonNullable<CreateBuyerOrderInput['orderType']>;
const ORDER_TYPES: OrderType[] = ['CONFIRMED', 'PROJECT', 'SAMPLE', 'CMT', 'FOB'];

const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90';
const labelClass = 'block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1';

export default function NewOrderQuickStartModal({ open, onClose }: Props) {
  const navigate = useNavigate();
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [styles, setStyles] = useState<StyleMaster[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);

  const [buyerId, setBuyerId] = useState<number | ''>('');
  const [styleId, setStyleId] = useState<number | ''>('');
  const [seasonId, setSeasonId] = useState<number | ''>('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [exFactoryDate, setExFactoryDate] = useState('');
  const [orderType, setOrderType] = useState<OrderType>('CONFIRMED');
  const [buyerPoNo, setBuyerPoNo] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    Promise.all([
      masterApi.listBuyers({ limit: 200 }),
      masterApi.listStyles({ limit: 500 }),
      masterApi.listSeasons(),
    ]).then(([b, s, seas]) => {
      setBuyers((b.data as { data: Buyer[] }).data ?? []);
      setStyles((s.data as { data: StyleMaster[] }).data ?? []);
      setSeasons((seas.data as { data: Season[] }).data ?? []);
    }).catch((err) => {
      console.error('[NewOrderQuickStartModal] lookup load failed', err);
      setError('Failed to load buyers / styles / seasons. Check your network and try again.');
    });
  }, [open]);

  const selectedBuyer = useMemo(() => buyers.find((b) => b.id === buyerId), [buyers, buyerId]);
  const selectedStyle = useMemo(() => styles.find((s) => s.id === styleId), [styles, styleId]);
  const filteredStyles = useMemo(
    () => (buyerId ? styles.filter((s) => s.buyerId === buyerId) : styles),
    [styles, buyerId],
  );

  if (!open) return null;

  const submit = async () => {
    setError(null);
    if (!buyerId) { setError('Buyer is required'); return; }
    if (!styleId) { setError('Style is required'); return; }
    if (!orderDate) { setError('Order Date is required'); return; }
    if (!exFactoryDate) { setError('Ex-Factory Date is required'); return; }
    if (exFactoryDate < orderDate) { setError('Ex-Factory Date cannot be before Order Date.'); return; }

    setSubmitting(true);
    try {
      const payload: CreateBuyerOrderInput = {
        buyerId: Number(buyerId),
        styleId: Number(styleId),
        seasonId: seasonId ? Number(seasonId) : null,
        orderDate,
        exFactoryDate,
        orderType,
        buyerPoNo: buyerPoNo.trim() || null,
        currency: selectedBuyer?.currency ?? 'USD',
        paymentTerms: selectedBuyer?.paymentTerms ?? null,
      };
      console.info('[NewOrderQuickStartModal] submit', payload);
      const resp = await createBuyerOrder(payload);
      toast.success(`Draft ${resp.data.orderNo} created — fill in the remaining tabs`);
      onClose();
      navigate(`/merchandising/orders/${resp.data.id}`);
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { message?: string } }; message?: string };
      const status = e?.response?.status;
      const serverMsg = e?.response?.data?.message;
      const friendly =
        status === 401 ? 'Your session has expired — please sign in again.' :
        status === 403 ? 'You don’t have permission to create orders. Ask an admin for the Merchandiser role.' :
        serverMsg ?? e?.message ?? 'Failed to create draft (network or server error)';
      console.error('[NewOrderQuickStartModal] createBuyerOrder failed', err);
      setError(friendly);
      toast.error(friendly);
    } finally {
      setSubmitting(false);
    }
  };

  const primaryImage = selectedStyle?.images?.[0];

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl rounded-xl bg-white shadow-2xl dark:bg-gray-900">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Start a New Buyer Order</h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Create a DRAFT with the essentials. PO matrix, fabric consumption, process sequence and shipments are managed in their dedicated tabs after the draft is created.
          </p>
        </div>

        {error && (
          <div role="alert" className="mx-6 mt-4 flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            <svg className="mt-0.5 h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.7 7.3a1 1 0 011.4 0L10 7.6l.3-.3a1 1 0 111.4 1.4L11.4 9l.3.3a1 1 0 11-1.4 1.4L10 10.4l-.3.3a1 1 0 01-1.4-1.4L8.6 9l-.3-.3a1 1 0 010-1.4z" clipRule="evenodd" /></svg>
            <div className="flex-1">{error}</div>
            <button type="button" aria-label="Dismiss" onClick={() => setError(null)} className="text-red-500 hover:text-red-700">×</button>
          </div>
        )}

        {/* Two-column body */}
        <div className="grid gap-6 px-6 py-5 md:grid-cols-[1fr_280px]">
          {/* Left — form */}
          <div className="space-y-3">
            <div>
              <label className={labelClass}>Buyer *</label>
              <select
                aria-label="Buyer"
                value={buyerId}
                onChange={(e) => {
                  setBuyerId(e.target.value ? Number(e.target.value) : '');
                  setStyleId('');
                }}
                className={inputClass}
              >
                <option value="">— Select buyer —</option>
                {buyers.map((b) => <option key={b.id} value={b.id}>{b.code} — {b.name}</option>)}
              </select>
              {selectedBuyer && (
                <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px]">
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">{selectedBuyer.currency}</span>
                  {selectedBuyer.paymentTerms && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">{selectedBuyer.paymentTerms}</span>
                  )}
                  {selectedBuyer.country && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">{selectedBuyer.country}</span>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className={labelClass}>Style *</label>
              <select
                aria-label="Style"
                value={styleId}
                onChange={(e) => setStyleId(e.target.value ? Number(e.target.value) : '')}
                disabled={!buyerId}
                className={inputClass}
              >
                <option value="">{buyerId ? '— Select style —' : '— Choose buyer first —'}</option>
                {filteredStyles.map((s) => <option key={s.id} value={s.id}>{s.styleNo} — {s.styleName}</option>)}
              </select>
              {buyerId && filteredStyles.length === 0 && (
                <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">No styles registered for this buyer yet. Create one in Master → Styles.</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Order Date *</label>
                <input type="date" aria-label="Order Date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Ex-Factory Date *</label>
                <input
                  type="date"
                  aria-label="Ex-Factory Date"
                  value={exFactoryDate}
                  min={orderDate || undefined}
                  onChange={(e) => setExFactoryDate(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Season</label>
                <select aria-label="Season" value={seasonId} onChange={(e) => setSeasonId(e.target.value ? Number(e.target.value) : '')} className={inputClass}>
                  <option value="">— None —</option>
                  {seasons.map((s) => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Order Type</label>
                <select aria-label="Order Type" value={orderType} onChange={(e) => setOrderType(e.target.value as OrderType)} className={inputClass}>
                  {ORDER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className={labelClass}>Buyer PO No</label>
              <input
                type="text"
                aria-label="Buyer PO No"
                value={buyerPoNo}
                onChange={(e) => setBuyerPoNo(e.target.value)}
                placeholder="Optional — e.g. PO-2026-0042"
                className={inputClass}
              />
            </div>
          </div>

          {/* Right — style preview */}
          <aside className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/40">
            {selectedStyle ? (
              <>
                <div className="mb-3 flex h-40 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                  {primaryImage ? (
                    <img src={uploadUrl(primaryImage)} alt={selectedStyle.styleName} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center text-gray-300 dark:text-gray-600">
                      <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4-4a2 2 0 012.8 0L14 14m-2-2l2-2a2 2 0 012.8 0L20 12M4 6h16v12H4V6z" /></svg>
                      <span className="mt-1 text-[11px]">No image uploaded</span>
                    </div>
                  )}
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="text-sm font-semibold text-gray-800 dark:text-white/90">{selectedStyle.styleNo}</div>
                  <div className="text-gray-600 dark:text-gray-300">{selectedStyle.styleName}</div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {selectedStyle.garmentType && <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200">{selectedStyle.garmentType}</span>}
                    {selectedStyle.productionType && <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200">{selectedStyle.productionType}</span>}
                    {selectedStyle.season?.name && <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200">{selectedStyle.season.name}</span>}
                  </div>
                  {selectedStyle.totalSam != null && Number(selectedStyle.totalSam) > 0 && (
                    <div className="pt-1 text-gray-500 dark:text-gray-400">
                      SAM: <strong className="text-gray-700 dark:text-gray-200">{Number(selectedStyle.totalSam).toFixed(2)}</strong>
                      {selectedStyle.totalOperations ? <> · Ops: <strong className="text-gray-700 dark:text-gray-200">{selectedStyle.totalOperations}</strong></> : null}
                    </div>
                  )}
                  {selectedStyle.description && (
                    <p className="line-clamp-3 pt-1 text-[11px] text-gray-500 dark:text-gray-400">{selectedStyle.description}</p>
                  )}
                  {selectedStyle.techPackUrl && (
                    <a href={uploadUrl(selectedStyle.techPackUrl)} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center text-[11px] font-medium text-brand-600 hover:underline dark:text-brand-400">
                      View Tech Pack →
                    </a>
                  )}
                </div>
              </>
            ) : (
              <div className="flex h-full min-h-[200px] flex-col items-center justify-center text-center text-xs text-gray-400 dark:text-gray-500">
                <svg className="mb-2 h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                Select a style to see its preview here.
              </div>
            )}
          </aside>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-800">
          <p className="text-[11px] text-gray-400 dark:text-gray-500">Currency & payment terms come from the selected buyer.</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={submitting || !buyerId || !styleId || !orderDate || !exFactoryDate}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {submitting ? 'Creating…' : 'Create Draft'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
