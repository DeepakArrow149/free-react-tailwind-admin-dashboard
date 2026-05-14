/**
 * TnaTab — Time & Action milestone tracking inside JobDetailPopup
 *
 * Shows the T&A calendar milestones for the job's order:
 *   1. Health summary cards (total / completed / on-track / delayed / overdue)
 *   2. Next upcoming milestone highlight
 *   3. Milestone table with status badges, inline Complete & Reschedule actions
 */
import { useState } from 'react';
import { useTnaSummary } from '@/hooks/usePlanningBoard';
import { tnaCalendarApi } from '@/api/planning';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface Props {
  jobId: number;
  orderId: number;
}

// ── Status badge colors ──
const STATUS_COLORS: Record<string, string> = {
  COMPLETED:      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  ON_TRACK:       'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  PENDING:        'bg-gray-100 text-gray-600 dark:bg-gray-700/50 dark:text-gray-400',
  MINOR_DELAY:    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  MODERATE_DELAY: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  CRITICAL_DELAY: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  OVERDUE:        'bg-red-200 text-red-800 dark:bg-red-800/40 dark:text-red-300',
};

const HEALTH_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  GREEN: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-400', label: 'On Track' },
  AMBER: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400', label: 'Delays' },
  RED:   { bg: 'bg-red-50 dark:bg-red-900/20',   text: 'text-red-700 dark:text-red-400',   label: 'Critical' },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function TnaTab({ jobId, orderId }: Props) {
  const qc = useQueryClient();
  const { data: summary, isLoading } = useTnaSummary(jobId);
  const [rescheduleId, setRescheduleId] = useState<number | null>(null);
  const [newDate, setNewDate] = useState('');
  const [reason, setReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['planning-board', 'tna-summary', jobId] });
  };

  const handleComplete = async (milestoneId: number) => {
    setActionLoading(true);
    try {
      await tnaCalendarApi.complete(milestoneId, {
        actualDate: new Date().toISOString().slice(0, 10),
      });
      toast.success('Milestone marked complete');
      invalidate();
    } catch {
      toast.error('Failed to complete milestone');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleId || !newDate) return;
    setActionLoading(true);
    try {
      await tnaCalendarApi.reschedule(rescheduleId, {
        newPlannedDate: newDate,
        cascadeToSubsequent: true,
        remarks: reason || undefined,
      });
      toast.success('Milestone rescheduled (cascade applied)');
      setRescheduleId(null);
      setNewDate('');
      setReason('');
      invalidate();
    } catch {
      toast.error('Failed to reschedule milestone');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Loading / Empty ──
  if (isLoading) {
    return (
      <div className="min-h-[320px] space-y-4 animate-pulse">
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 bg-gray-100 dark:bg-gray-700/40 rounded-lg border border-gray-200 dark:border-gray-700" />
          ))}
        </div>
        <div className="h-3 w-32 bg-gray-200 dark:bg-gray-600 rounded" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 dark:bg-gray-700/30 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!summary || summary.totalMilestones === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-gray-400">No T&A calendar found for this order.</p>
        <p className="text-xs text-gray-400 mt-1">
          Generate a T&A from a template on the{' '}
          <a href="/planning/tna-calendar" className="text-blue-500 hover:underline">T&A Calendar</a>
          {' '}page (Order ID: {orderId}).
        </p>
      </div>
    );
  }

  const health = HEALTH_COLORS[summary.healthLevel] ?? HEALTH_COLORS.GREEN;

  return (
    <div className="space-y-4">
      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-5 gap-2">
        <SummaryCard label="Total" value={summary.totalMilestones} color="bg-gray-50 dark:bg-gray-700/30" textColor="text-gray-700 dark:text-gray-300" />
        <SummaryCard label="Completed" value={summary.completed} color="bg-green-50 dark:bg-green-900/20" textColor="text-green-700 dark:text-green-400" />
        <SummaryCard label="On Track" value={summary.onTrack} color="bg-emerald-50 dark:bg-emerald-900/20" textColor="text-emerald-700 dark:text-emerald-400" />
        <SummaryCard label="Delayed" value={summary.delayed} color="bg-amber-50 dark:bg-amber-900/20" textColor="text-amber-700 dark:text-amber-400" />
        <SummaryCard label="Overdue" value={summary.overdue} color="bg-red-50 dark:bg-red-900/20" textColor="text-red-700 dark:text-red-400" />
      </div>

      {/* ── Health + Next Milestone ── */}
      <div className="flex items-center gap-3">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full ${health.bg} ${health.text}`}>
          {summary.healthLevel === 'GREEN' ? '✅' : summary.healthLevel === 'AMBER' ? '⚠️' : '🔴'}
          {health.label} — {summary.completionPct}% complete
        </span>
        {summary.nextMilestone && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Next: <strong className="text-gray-700 dark:text-gray-200">{summary.nextMilestone.milestoneName}</strong>
            {' '}in {summary.nextMilestone.daysUntil}d ({fmtDate(summary.nextMilestone.plannedDate)})
            {summary.nextMilestone.isCritical && <span className="ml-1 text-red-500">●</span>}
          </span>
        )}
      </div>

      {/* ── Milestones Table ── */}
      <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">#</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">Milestone</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">Role</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">Planned</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">Actual</th>
              <th className="px-3 py-2 text-center font-medium text-gray-600 dark:text-gray-400">Delay</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">Status</th>
              <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {summary.milestones.map(m => (
              <tr
                key={m.id}
                className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 transition ${
                  m.isCritical && m.status !== 'COMPLETED' ? 'bg-red-50/30 dark:bg-red-900/5' : ''
                }`}
              >
                <td className="px-3 py-2 text-gray-400">{m.sequence}</td>
                <td className="px-3 py-2 font-medium text-gray-800 dark:text-white">
                  {m.milestoneName}
                  {m.isCritical && <span className="ml-1 text-red-500 text-[10px]">● Critical</span>}
                </td>
                <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{m.responsibleRole ?? '—'}</td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                  {fmtDate(m.plannedDate)}
                  {m.originalPlannedDate !== m.plannedDate && (
                    <span className="block text-[10px] text-gray-400 line-through">{fmtDate(m.originalPlannedDate)}</span>
                  )}
                </td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{m.actualDate ? fmtDate(m.actualDate) : '—'}</td>
                <td className="px-3 py-2 text-center">
                  {m.delayDays > 0 ? (
                    <span className="text-red-600 font-medium">+{m.delayDays}d</span>
                  ) : m.delayDays < 0 ? (
                    <span className="text-green-600 font-medium">{m.delayDays}d</span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <span className={`inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full ${
                    STATUS_COLORS[m.status] ?? STATUS_COLORS.PENDING
                  }`}>
                    {m.status.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">
                  {m.status !== 'COMPLETED' && (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleComplete(m.id)}
                        disabled={actionLoading}
                        className="text-[10px] text-green-600 hover:underline font-medium disabled:opacity-50"
                      >
                        ✓ Complete
                      </button>
                      <button
                        onClick={() => { setRescheduleId(m.id); setNewDate(''); setReason(''); }}
                        disabled={actionLoading}
                        className="text-[10px] text-blue-600 hover:underline font-medium disabled:opacity-50"
                      >
                        Reschedule
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Progress Bar ── */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span>{summary.completionPct}%</span>
        <div className="flex-1 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              summary.completionPct >= 100 ? 'bg-green-500' :
              summary.completionPct >= 50 ? 'bg-blue-500' :
              'bg-amber-500'
            }`}
            style={{ width: `${Math.min(summary.completionPct, 100)}%` }}
          />
        </div>
        <span>{summary.completed}/{summary.totalMilestones} milestones</span>
      </div>

      {/* ── Reschedule Modal ── */}
      {rescheduleId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={() => setRescheduleId(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 w-full max-w-sm space-y-3 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Reschedule Milestone</h3>
            <p className="text-xs text-gray-500">
              {summary.milestones.find(m => m.id === rescheduleId)?.milestoneName}
              {' '}— subsequent milestones will cascade.
            </p>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">New Date *</label>
              <input
                type="date"
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-xs dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Reason</label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-xs dark:text-white"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setRescheduleId(null)} className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5">Cancel</button>
              <button
                onClick={handleReschedule}
                disabled={!newDate || actionLoading}
                className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {actionLoading ? 'Saving...' : 'Reschedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Small reusable summary card ──
function SummaryCard({ label, value, color, textColor }: { label: string; value: number; color: string; textColor: string }) {
  return (
    <div className={`rounded-lg px-3 py-2 text-center ${color}`}>
      <div className={`text-base font-bold ${textColor}`}>{value}</div>
      <div className="text-[10px] text-gray-500 dark:text-gray-400">{label}</div>
    </div>
  );
}
