import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { toast } from 'sonner';
import {
  costingApi,
  type CostSheetDetail,
  type CostSheetLine,
  type CostSheetApprovalStatus,
  type PhaseRow,
} from '../../../api/costing';
import { commentsApi, type Comment } from '../../../api/comments';
import PageMeta from '../../../components/common/PageMeta';
import { PageHeader } from '../../../components/common/PageHeader';

// ═══════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════

const APPROVAL_BADGE: Record<CostSheetApprovalStatus, string> = {
  DRAFT:          'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  SUBMITTED:      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  IE_APPROVED:    'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  AUDIT_APPROVED: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  CEO_APPROVED:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  REJECTED:       'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const LINE_STATUS_BADGE: Record<string, string> = {
  PENDING:  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  APPROVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

function money(value: number | string | null | undefined, currency = 'USD') {
  if (value == null) return '—';
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(n);
}

function num(value: number | string | null | undefined, digits = 2) {
  if (value == null) return '—';
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) return '—';
  return n.toFixed(digits);
}

function pct(value: number | string | null | undefined) {
  if (value == null) return '—';
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) return '—';
  return `${n.toFixed(2)}%`;
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ═══════════════════════════════════════════
// Generic primitives
// ═══════════════════════════════════════════

function Card({ title, action, children, className = '' }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 ${className}`}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm py-1.5 border-b border-gray-50 dark:border-gray-800 last:border-0">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className="font-medium text-gray-800 dark:text-white/90 text-right">{value}</span>
    </div>
  );
}

function StatusChip({ status }: { status: CostSheetApprovalStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${APPROVAL_BADGE[status]}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function LineStatusChip({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${LINE_STATUS_BADGE[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

function CollapsibleSection({ title, summary, defaultOpen = true, children }: {
  title: string; summary?: React.ReactNode; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
            {open ? '−' : '+'}
          </span>
          <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">{title}</h3>
          <div className="flex flex-wrap items-center gap-2 ml-2">{summary}</div>
        </div>
        <svg className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="border-t border-gray-100 px-5 py-4 dark:border-gray-800">{children}</div>}
    </div>
  );
}

function SummaryChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2.5 py-1 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">
      <span className="text-gray-500 dark:text-gray-400">{label}:</span>
      <span className="font-medium">{value}</span>
    </span>
  );
}

// ═══════════════════════════════════════════
// Material line tables
// ═══════════════════════════════════════════

function MaterialTable({ lines, onUsnClick, currency, supplementary = false }: {
  lines: CostSheetLine[]; onUsnClick: (line: CostSheetLine) => void; currency: string; supplementary?: boolean;
}) {
  if (lines.length === 0) {
    return <p className="text-sm text-gray-400 italic">No items added.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:text-gray-400">
            <th className="px-2 py-2 text-left font-medium">USN Code</th>
            <th className="px-2 py-2 text-left font-medium">Status</th>
            <th className="px-2 py-2 text-left font-medium">Item Name</th>
            <th className="px-2 py-2 text-left font-medium">Image</th>
            <th className="px-2 py-2 text-left font-medium">{supplementary ? 'Reason' : 'Source'}</th>
            <th className="px-2 py-2 text-right font-medium">Wastage</th>
            <th className="px-2 py-2 text-right font-medium">{supplementary ? 'Total Qty' : 'Total Required Qty'}</th>
            <th className="px-2 py-2 text-right font-medium">Price</th>
            <th className="px-2 py-2 text-right font-medium">{supplementary ? 'Total Value' : 'Costing Value'}</th>
            {supplementary && <th className="px-2 py-2 text-left font-medium">File</th>}
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => (
            <tr key={l.id} className="border-b border-gray-50 hover:bg-gray-50/50 dark:border-gray-800 dark:hover:bg-white/2">
              <td className="px-2 py-2">
                {l.usnCode ? (
                  <button type="button" onClick={() => onUsnClick(l)} className="font-medium text-brand-500 hover:underline">
                    {l.usnCode}
                  </button>
                ) : <span className="text-gray-400">—</span>}
              </td>
              <td className="px-2 py-2"><LineStatusChip status={l.status} /></td>
              <td className="px-2 py-2 text-gray-800 dark:text-white/90">{l.itemName}</td>
              <td className="px-2 py-2">
                {l.imageUrl
                  ? <img src={l.imageUrl} alt={l.itemName} className="h-8 w-8 rounded object-cover" />
                  : <div className="h-8 w-8 rounded bg-gray-100 dark:bg-gray-800" />}
              </td>
              <td className="px-2 py-2 text-gray-600 dark:text-gray-400">
                {supplementary
                  ? (l.supplementaryReason ? l.supplementaryReason.replace(/_/g, ' ') : '—')
                  : (l.source ? l.source.replace('_', '-') : '—')}
              </td>
              <td className="px-2 py-2 text-right text-gray-700 dark:text-gray-300">{pct(l.wastagePct)}</td>
              <td className="px-2 py-2 text-right text-gray-700 dark:text-gray-300">{num(l.totalQty, 2)} {l.unit}</td>
              <td className="px-2 py-2 text-right text-gray-700 dark:text-gray-300">{money(l.unitPrice, currency)}</td>
              <td className="px-2 py-2 text-right font-medium text-gray-900 dark:text-white">{money(l.totalValue, currency)}</td>
              {supplementary && (
                <td className="px-2 py-2">
                  {l.fileUrl
                    ? <a href={l.fileUrl} target="_blank" rel="noopener" className="text-brand-500 hover:underline">.pdf</a>
                    : <span className="text-gray-400">—</span>}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OperationalTable({ lines }: { lines: CostSheetLine[] }) {
  if (lines.length === 0) {
    return <p className="text-sm text-gray-400 italic">No operational rows.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:text-gray-400">
            <th className="px-2 py-2 text-left font-medium">Item Name</th>
            <th className="px-2 py-2 text-right font-medium">SMV</th>
            <th className="px-2 py-2 text-right font-medium">MC/Line</th>
            <th className="px-2 py-2 text-right font-medium">Efficiency %</th>
            <th className="px-2 py-2 text-right font-medium">Required Day</th>
            <th className="px-2 py-2 text-right font-medium">Avg Production/Line</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => (
            <tr key={l.id} className="border-b border-gray-50 hover:bg-gray-50/50 dark:border-gray-800 dark:hover:bg-white/2">
              <td className="px-2 py-2 text-gray-800 dark:text-white/90">{l.itemName}</td>
              <td className="px-2 py-2 text-right">{num(l.smv ?? null, 2)}</td>
              <td className="px-2 py-2 text-right">{l.mcPerLine ?? '—'}</td>
              <td className="px-2 py-2 text-right">{pct(l.efficiencyPct ?? null)}</td>
              <td className="px-2 py-2 text-right">{num(l.requiredDays ?? null, 2)}</td>
              <td className="px-2 py-2 text-right">{l.avgProductionPerLine != null ? `${l.avgProductionPerLine} pcs` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ═══════════════════════════════════════════
// Phase comparison cards
// ═══════════════════════════════════════════

function PhaseGrid({ phases, currency }: { phases: PhaseRow[]; currency: string }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {phases.map((p) => (
        <div key={p.phase} className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/3">
          <h4 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">{p.label}</h4>
          <div className="space-y-1.5 text-sm">
            <FieldRow label={p.phase === 1 ? 'Total Order Value' : p.phase === 3 ? 'Total Shipment Value' : p.phase === 4 ? 'Total Bank Realized' : 'Total Order Value'} value={money(p.totalOrderValue, currency)} />
            <FieldRow label="COGS" value={money(p.cogs, currency)} />
            <FieldRow label="Commercial & Interest" value={money(p.commercialInterest, currency)} />
            <FieldRow label="Buying Commission" value={money(p.buyingCommission, currency)} />
            <FieldRow label="CM" value={money(p.cm, currency)} />
            <FieldRow label="Per Pcs CM" value={money(p.perPcsCm, currency)} />
            <FieldRow
              label="MC Earning/Day"
              value={
                <span className={`${(p.mcEarningPerDay ?? 0) < 0 ? 'text-red-500' : ''}`}>
                  {money(p.mcEarningPerDay, currency)}
                </span>
              }
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════
// Activity timeline
// ═══════════════════════════════════════════

const STEPS: { key: CostSheetApprovalStatus | 'CREATE'; label: string; icon: string }[] = [
  { key: 'CREATE',         label: 'Cost Sheet Create', icon: '📝' },
  { key: 'SUBMITTED',      label: 'Costing Submit',    icon: '📤' },
  { key: 'IE_APPROVED',    label: 'IE Approved',       icon: '👁' },
  { key: 'AUDIT_APPROVED', label: 'Audit Approved',    icon: '🚚' },
  { key: 'CEO_APPROVED',   label: 'CEO Approved',      icon: '📊' },
];

function ActivityTimeline({ detail }: { detail: CostSheetDetail }) {
  const status = detail.approvalStatus;
  const ordinal = (k: string): number => {
    const idx = STEPS.findIndex((s) => s.key === k);
    return idx === -1 ? 0 : idx;
  };
  const cur = status === 'REJECTED' ? 0 : ordinal(status === 'DRAFT' ? 'CREATE' : status);

  return (
    <div className="px-5 py-6">
      <div className="flex items-center">
        {STEPS.map((s, i) => {
          const reached = i <= cur;
          return (
            <div key={s.key} className="flex flex-1 items-center">
              <div className="flex flex-col items-center">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm transition-colors
                  ${reached ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                  {s.icon}
                </div>
                <span className="mt-2 text-xs text-gray-600 dark:text-gray-400 text-center max-w-22.5">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`mx-1 h-0.5 flex-1 ${i < cur ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
              )}
            </div>
          );
        })}
      </div>
      {status === 'REJECTED' && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          <strong>Rejected:</strong> {detail.rejectionRemarks ?? 'No reason recorded'}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// Line item detail drawer + comments thread
// ═══════════════════════════════════════════

function LineItemDrawer({ line, sheetId, onClose, currency }: {
  line: CostSheetLine; sheetId: number; onClose: () => void; currency: string;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [posting, setPosting] = useState(false);
  const [body, setBody] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const meta = (line.detailMeta ?? {}) as Record<string, unknown>;

  const loadComments = useCallback(async () => {
    try {
      const { data: resp } = await commentsApi.list('COSTING_SHEET_LINE', line.id);
      setComments(resp.data);
    } catch (e) {
      console.warn('Failed to load comments', e);
    }
  }, [line.id]);

  useEffect(() => { loadComments(); }, [loadComments]);

  const send = async () => {
    if (!body.trim()) return;
    setPosting(true);
    try {
      await commentsApi.create({
        module: 'COSTING_SHEET_LINE', recordId: line.id, body, attachmentUrl,
      });
      setBody('');
      setAttachmentUrl(null);
      await loadComments();
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to post comment');
    } finally {
      setPosting(false);
    }
  };

  // Group threaded comments: top-level + replies
  const threaded = useMemo(() => {
    const map = new Map<number, Comment & { replies: Comment[] }>();
    const roots: (Comment & { replies: Comment[] })[] = [];
    comments.forEach((c) => map.set(c.id, { ...c, replies: [] }));
    comments.forEach((c) => {
      const node = map.get(c.id)!;
      if (c.parentId && map.has(c.parentId)) map.get(c.parentId)!.replies.push(node);
      else roots.push(node);
    });
    return roots;
  }, [comments]);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-4xl overflow-y-auto bg-white shadow-2xl dark:bg-gray-900">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-900">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{line.itemName} <span className="ml-2 text-sm text-gray-500">({line.usnCode ?? `Line #${line.id}`})</span></h3>
          <button type="button" onClick={onClose} title="Close" aria-label="Close" className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <div>
              <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">Product Information</h4>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                <FieldRow label="Item Name" value={line.itemName} />
                <FieldRow label="Composition" value={(meta.composition as string) ?? '—'} />
                <FieldRow label="GSM" value={(meta.gsm as string) ?? '—'} />
                <FieldRow label="Develop Supplier" value={(meta.developSupplier as string) ?? line.supplier?.name ?? '—'} />
                <FieldRow label="Source" value={line.source ?? '—'} />
                <FieldRow label="Yarn Count" value={(meta.yarnCount as string) ?? '—'} />
                <FieldRow label="Fabric Construction" value={(meta.fabricConstruction as string) ?? '—'} />
                <FieldRow label="UM" value={line.unit} />
              </div>
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">Consumption Information</h4>
              <div className="grid grid-cols-3 gap-x-6 gap-y-1">
                <FieldRow label="Costed Consumption (Wastage)" value={`${num(line.totalQty, 4)} ${line.unit} (${pct(line.wastagePct)})`} />
                <FieldRow label="Approved Consumption" value={(meta.approvedConsumption as string) ?? '—'} />
                <FieldRow label="Actual Consumption" value={(meta.actualConsumption as string) ?? '—'} />
              </div>
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">Quantity & Requirement Details</h4>
              <div className="grid grid-cols-3 gap-x-6 gap-y-1">
                <FieldRow label="Required Qty" value={`${num((meta.requiredQty as number) ?? line.totalQty, 2)}`} />
                <FieldRow label="PI Qty" value={num((meta.piQty as number) ?? null, 2)} />
                <FieldRow label="Received Qty" value={num((meta.receivedQty as number) ?? null, 2)} />
                <FieldRow label="Utilized Quantity" value={num((meta.utilizedQty as number) ?? null, 2)} />
                <FieldRow label="Acceptance Qty" value={num((meta.acceptanceQty as number) ?? null, 2)} />
                <FieldRow label="Stock Qty" value={num((meta.stockQty as number) ?? null, 2)} />
              </div>
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">Pricing Details</h4>
              <div className="grid grid-cols-3 gap-x-6 gap-y-1">
                <FieldRow label="Costed Unit Price" value={money(line.unitPrice, currency)} />
                <FieldRow label="Approved Unit Price" value={money((meta.approvedUnitPrice as number) ?? null, currency)} />
                <FieldRow label="PI Unit Price" value={money((meta.piUnitPrice as number) ?? null, currency)} />
              </div>
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">Value Summary</h4>
              <div className="grid grid-cols-5 gap-x-6 gap-y-1">
                <FieldRow label="Costed Amount" value={money(line.totalValue, currency)} />
                <FieldRow label="PI Amount" value={money((meta.piAmount as number) ?? null, currency)} />
                <FieldRow label="LC Amount" value={money((meta.lcAmount as number) ?? null, currency)} />
                <FieldRow label="Acceptance Amount" value={money((meta.acceptanceAmount as number) ?? null, currency)} />
                <FieldRow label="Save Amount" value={money((meta.saveAmount as number) ?? null, currency)} />
              </div>
            </div>
          </div>

          {/* Comments column */}
          <div className="lg:col-span-1">
            <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">Discussion</h4>
            <div className="rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/30">
              <div className="max-h-96 overflow-y-auto p-3 space-y-3">
                {threaded.length === 0 && (
                  <p className="text-xs text-gray-400 italic">No comments yet.</p>
                )}
                {threaded.map((c) => (
                  <CommentBubble key={c.id} comment={c} />
                ))}
              </div>
              <div className="border-t border-gray-200 p-3 dark:border-gray-700">
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={2}
                  placeholder="Type a message..."
                  className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                />
                <div className="mt-2 flex items-center justify-between">
                  <input
                    type="text"
                    placeholder="Attachment URL (optional)"
                    value={attachmentUrl ?? ''}
                    onChange={(e) => setAttachmentUrl(e.target.value || null)}
                    className="h-7 flex-1 rounded border border-gray-200 bg-white px-2 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  />
                  <button
                    type="button"
                    onClick={send}
                    disabled={posting || !body.trim()}
                    className="ml-2 rounded-md bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>

            <input type="hidden" data-sheet-id={sheetId} />
          </div>
        </div>
      </div>
    </div>
  );
}

function CommentBubble({ comment }: { comment: Comment & { replies?: Comment[] } }) {
  return (
    <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-gray-900">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-800 dark:text-white/90">{comment.user?.fullName ?? `User #${comment.userId}`}</span>
        <span className="text-[10px] text-gray-400">{new Date(comment.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</span>
      </div>
      <p className="mt-1 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{comment.body}</p>
      {comment.attachmentUrl && (
        <a href={comment.attachmentUrl} target="_blank" rel="noopener" className="mt-2 inline-block text-xs text-brand-500 hover:underline">
          📎 Attachment
        </a>
      )}
      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-4 mt-3 space-y-2 border-l-2 border-gray-100 pl-3 dark:border-gray-800">
          {comment.replies.map((r) => <CommentBubble key={r.id} comment={r} />)}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// Main detail page
// ═══════════════════════════════════════════

export default function CostingDetail() {
  const { id } = useParams();
  const sheetId = Number(id);
  const [detail, setDetail] = useState<CostSheetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(false);
  const [activeLine, setActiveLine] = useState<CostSheetLine | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: resp } = await costingApi.detail(sheetId);
      setDetail(resp.data);
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to load cost sheet');
    } finally {
      setLoading(false);
    }
  }, [sheetId]);

  useEffect(() => { if (Number.isFinite(sheetId)) load(); }, [sheetId, load]);

  const runTransition = async (action: () => Promise<unknown>, successMessage: string) => {
    setActioning(true);
    try {
      await action();
      toast.success(successMessage);
      await load();
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Action failed';
      toast.error(msg);
    } finally {
      setActioning(false);
    }
  };

  const onSubmit = () => runTransition(() => costingApi.submit(sheetId), 'Submitted for approval');
  const onIe     = () => runTransition(() => costingApi.ieApprove(sheetId), 'IE approved');
  const onAudit  = () => runTransition(() => costingApi.auditApprove(sheetId), 'Audit approved');
  const onCeo    = () => runTransition(() => costingApi.ceoApprove(sheetId), 'CEO approved');
  const onReject = () => {
    const remarks = window.prompt('Rejection reason?');
    if (!remarks?.trim()) return;
    runTransition(() => costingApi.reject(sheetId, remarks), 'Cost sheet rejected');
  };

  if (loading || !detail) {
    return (
      <div className="flex justify-center py-20 text-gray-400">Loading...</div>
    );
  }

  const status = detail.approvalStatus;
  const currency = detail.currency || 'USD';
  const fobValue = detail.fobPrice != null ? Number(detail.fobPrice) : Number(detail.sellingPricePerPc);

  return (
    <>
      <PageMeta title={`${detail.costingNo} | Cost Sheet`} description="Cost sheet detail view" />

      <PageHeader
        title="Cost sheet"
        breadcrumbs={[
          { label: 'Dashboard', path: '/' },
          { label: 'All Cost Sheet', path: '/costing/sheets' },
          { label: `Cost details ${detail.costingNo}` },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip status={status} />
            <button type="button" className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">Trim Card</button>
            <button type="button" className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">Assign To</button>
            <button type="button" className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">Feasibility</button>
            <button type="button" className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">Order Breakdown</button>
            <button type="button" className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">T&amp;A</button>
            <a
              href={costingApi.exportExcelUrl(sheetId)}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
              target="_blank" rel="noopener"
            >
              Export ↓
            </a>
            {status === 'DRAFT' &&        <button disabled={actioning} onClick={onSubmit} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50">Submit to Approval</button>}
            {status === 'SUBMITTED' &&    <button disabled={actioning} onClick={onIe}     className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">IE Approve</button>}
            {status === 'IE_APPROVED' &&  <button disabled={actioning} onClick={onAudit}  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">Audit Approve</button>}
            {status === 'AUDIT_APPROVED' && <button disabled={actioning} onClick={onCeo}  className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50">CEO Approve</button>}
            {(status === 'SUBMITTED' || status === 'IE_APPROVED' || status === 'AUDIT_APPROVED') && (
              <button disabled={actioning} onClick={onReject} className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">Reject</button>
            )}
          </div>
        }
      />

      {/* ── Top row: Production / Cost / Financial / FOB ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4 mb-6">
        <Card title="Production Details">
          <FieldRow label="Buyer" value={detail.style.buyer.name} />
          <FieldRow label="Style" value={detail.style.styleNo} />
          <FieldRow label="Quantity & Pack" value={`${detail.orderQty.toLocaleString()}    ${detail.packSize ?? 1} PCS`} />
          <FieldRow label="No. of Color" value={detail.colorCount ?? '—'} />
          <FieldRow label="Planned Line" value={detail.plannedLine ?? '—'} />
          <FieldRow label="Season" value={`${detail.seasonStart ? fmtDate(detail.seasonStart) : '—'} to ${detail.seasonEnd ? fmtDate(detail.seasonEnd) : '—'}`} />
        </Card>
        <Card title="Cost Details">
          <FieldRow label="Revenue Per MC" value={<span className="text-emerald-600">{money(detail.revenuePerMc, currency)}</span>} />
          <FieldRow label="EPM" value={money(detail.epm, currency)} />
          <FieldRow label="COGS %" value={pct(detail.cogsPct)} />
          <FieldRow label="Sales Contract Number" value={detail.salesContractNumber ?? '—'} />
          {detail.salesContractFileUrl && (
            <div className="mt-2 flex items-center gap-2 rounded-md bg-gray-50 p-2 dark:bg-gray-800/50">
              <span className="text-red-500">📄</span>
              <a href={detail.salesContractFileUrl} target="_blank" rel="noopener" className="flex-1 text-xs text-brand-500 hover:underline">Sales Contract.pdf</a>
            </div>
          )}
        </Card>
        <Card title="Financial Details">
          <FieldRow label="COGS" value={money(detail.cogsAmount, currency)} />
          <FieldRow label="Commercial + Finance" value={`${pct(detail.commercialFinancePct)}    ${money(detail.commercialFinanceAmount, currency)}`} />
          <FieldRow label="Buying Commission" value={`${pct(detail.buyingCommissionPct)}    ${money(detail.buyingCommissionAmount, currency)}`} />
          <FieldRow label="CM" value={money(detail.cmAmount, currency)} />
          <FieldRow label="Payment Term" value={detail.paymentTerm ?? '—'} />
        </Card>
        <Card title="FOB">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{money(fobValue, currency)}</div>
            </div>
            <div className="relative h-24 w-24 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
              {detail.productImageUrl
                ? <img src={detail.productImageUrl} alt="Product" className="h-full w-full object-cover" />
                : <div className="flex h-full w-full items-center justify-center text-3xl text-gray-300">👕</div>}
              <a
                href={detail.productImageUrl ?? '#'}
                download
                className="absolute right-1 top-1 rounded bg-brand-500 p-1 text-xs text-white hover:bg-brand-600"
              >↓</a>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Operational Breakdown ── */}
      <div className="mb-4">
        <CollapsibleSection title="Operational Breakdown:" defaultOpen>
          <OperationalTable lines={detail.sections.operational} />
        </CollapsibleSection>
      </div>

      {/* ── Fabric ── */}
      <div className="mb-4">
        <CollapsibleSection
          title="Fabric:"
          summary={
            <>
              <SummaryChip label="Single Unit Price" value={`$${num(detail.summary.fabric.singleUnitPrice, 2)}`} />
              <SummaryChip label="Avg Mat Price"     value={`$${num(detail.summary.fabric.avgMatPrice, 2)}`} />
              <SummaryChip label="Total Qty"         value={num(detail.summary.fabric.totalQty, 0)} />
              <SummaryChip label="Total Cost"        value={`$${num(detail.summary.fabric.totalCost, 2)}`} />
              <SummaryChip label="Cost"              value={pct(detail.summary.fabric.costPct)} />
            </>
          }
        >
          <MaterialTable lines={detail.sections.fabric} currency={currency} onUsnClick={setActiveLine} />
        </CollapsibleSection>
      </div>

      {/* ── Stitching Trim ── */}
      <div className="mb-4">
        <CollapsibleSection
          title="Stitching Trim:"
          summary={
            <>
              <SummaryChip label="Single Unit Price" value={`$${num(detail.summary.stitchingTrim.singleUnitPrice, 2)}`} />
              <SummaryChip label="Avg Mat Price"     value={`$${num(detail.summary.stitchingTrim.avgMatPrice, 2)}`} />
              <SummaryChip label="Total Qty"         value={num(detail.summary.stitchingTrim.totalQty, 0)} />
              <SummaryChip label="Total Cost"        value={`$${num(detail.summary.stitchingTrim.totalCost, 2)}`} />
              <SummaryChip label="Cost"              value={pct(detail.summary.stitchingTrim.costPct)} />
            </>
          }
        >
          <MaterialTable lines={detail.sections.stitchingTrim} currency={currency} onUsnClick={setActiveLine} />
        </CollapsibleSection>
      </div>

      {/* ── Supplementary ── */}
      <div className="mb-4">
        <CollapsibleSection
          title="Supplementary:"
          summary={
            <>
              <SummaryChip label="Single Unit Price" value={`$${num(detail.summary.supplementary.singleUnitPrice, 2)}`} />
              <SummaryChip label="Avg Mat Price"     value={`$${num(detail.summary.supplementary.avgMatPrice, 2)}`} />
              <SummaryChip label="Total Qty"         value={num(detail.summary.supplementary.totalQty, 0)} />
              <SummaryChip label="Total Cost"        value={`$${num(detail.summary.supplementary.totalCost, 2)}`} />
              <SummaryChip label="Cost"              value={pct(detail.summary.supplementary.costPct)} />
            </>
          }
        >
          <MaterialTable lines={detail.sections.supplementary} currency={currency} onUsnClick={setActiveLine} supplementary />
        </CollapsibleSection>
      </div>

      {/* ── Phase-wise Costing Comparison ── */}
      <div className="mb-4">
        <CollapsibleSection title="Phase-wise Costing Comparison:" defaultOpen>
          <PhaseGrid phases={detail.phaseComparison} currency={currency} />
        </CollapsibleSection>
      </div>

      {/* ── Supply Chain ── */}
      {detail.supplyChain && (
        <div className="mb-4">
          <CollapsibleSection title="Supply Chain & Payment Management Overview:" defaultOpen>
            <SupplyChainTable view={detail.supplyChain} currency={currency} />
          </CollapsibleSection>
        </div>
      )}

      <div className="flex justify-center my-6">
        {detail.approvalStatus === 'DRAFT' && (
          <button onClick={onSubmit} disabled={actioning}
            className="rounded-lg bg-gray-900 px-8 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50">
            Submit to Approval
          </button>
        )}
      </div>

      <CollapsibleSection title="Costing Activity" defaultOpen>
        <ActivityTimeline detail={detail} />
        {detail.approvals.length > 0 && (
          <div className="mt-2 space-y-1 px-3 text-xs text-gray-500 dark:text-gray-400">
            {detail.approvals.map((a) => (
              <div key={a.id}>
                <span className="font-medium">{new Date(a.createdAt).toLocaleString()}</span>
                {' — '}{a.action.replace(/_/g, ' ')}{a.actorRole ? ` by ${a.actorRole}` : ''}
                {a.remarks ? ` — ${a.remarks}` : ''}
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      {activeLine && (
        <LineItemDrawer line={activeLine} sheetId={sheetId} onClose={() => setActiveLine(null)} currency={currency} />
      )}
    </>
  );
}

// ═══════════════════════════════════════════
// Supply chain sub-table
// ═══════════════════════════════════════════

function SupplyChainTable({ view, currency }: { view: NonNullable<CostSheetDetail['supplyChain']>; currency: string }) {
  const rows = useMemo(() => {
    const len = Math.max(view.purchaseOrders.length, view.lettersOfCredit.length, view.salesInvoices.length, 1);
    return Array.from({ length: len }, (_, i) => ({
      po: view.purchaseOrders[i] ?? null,
      lc: view.lettersOfCredit[i] ?? null,
      inv: view.salesInvoices[i] ?? null,
    }));
  }, [view]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:text-gray-400">
            <th className="px-2 py-2 text-left font-medium">PI Number</th>
            <th className="px-2 py-2 text-right font-medium">PI Qty</th>
            <th className="px-2 py-2 text-right font-medium">PI Value</th>
            <th className="px-2 py-2 text-left font-medium">File</th>
            <th className="px-2 py-2 text-left font-medium">PO Number</th>
            <th className="px-2 py-2 text-right font-medium">PO Qty</th>
            <th className="px-2 py-2 text-right font-medium">PO Value</th>
            <th className="px-2 py-2 text-left font-medium">LC Number</th>
            <th className="px-2 py-2 text-right font-medium">LC Value</th>
            <th className="px-2 py-2 text-left font-medium">File</th>
            <th className="px-2 py-2 text-left font-medium">Acceptance Number</th>
            <th className="px-2 py-2 text-right font-medium">Acceptance Qty</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const piQty = r.po?.details.reduce((s, d) => s + Number(d.qty), 0) ?? null;
            return (
              <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50 dark:border-gray-800 dark:hover:bg-white/2">
                <td className="px-2 py-2 text-gray-700 dark:text-gray-300">{view.order?.piNo ?? '—'}</td>
                <td className="px-2 py-2 text-right">{piQty != null ? `${piQty} y` : '—'}</td>
                <td className="px-2 py-2 text-right">{r.po ? money(r.po.subTotal, currency) : '—'}</td>
                <td className="px-2 py-2"><span className="text-red-500">📄</span> .pdf</td>
                <td className="px-2 py-2">{r.po ? <span className="text-brand-500">{r.po.poNo}</span> : '—'}</td>
                <td className="px-2 py-2 text-right">{piQty != null ? piQty : '—'}</td>
                <td className="px-2 py-2 text-right">{r.po ? money(r.po.totalAmount, currency) : '—'}</td>
                <td className="px-2 py-2">{r.lc?.lcNo ?? '—'}</td>
                <td className="px-2 py-2 text-right">{r.lc ? money(r.lc.lcAmount, currency) : '—'}</td>
                <td className="px-2 py-2">{r.lc ? <><span className="text-red-500">📄</span> .pdf</> : '—'}</td>
                <td className="px-2 py-2">{r.inv?.invoiceNo ?? '—'}</td>
                <td className="px-2 py-2 text-right">{r.inv ? money(r.inv.totalAmount, currency) : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Render the costing-detail Link helper too — used by list/test
export function CostingDetailLink({ id, label }: { id: number; label: string }) {
  return <Link to={`/costing/sheets/${id}/detail`} className="font-medium text-brand-500 hover:underline">{label}</Link>;
}
