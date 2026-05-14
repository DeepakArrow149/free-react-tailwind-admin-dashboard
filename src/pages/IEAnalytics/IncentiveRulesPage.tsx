import { useState } from 'react';
import { useIncentiveRules, useCreateIncentiveRule, useUpdateIncentiveRule, useDeleteIncentiveRule } from '@/hooks/useIeAnalytics';
import PageMeta from '@/components/common/PageMeta';

interface RuleRow { id: number; minEfficiency: number; maxEfficiency: number; incentivePercent: number; label?: string }

export default function IncentiveRulesPage() {
  const { data, isLoading } = useIncentiveRules();
  const rules: RuleRow[] = Array.isArray(data) ? data : [];

  const createMut = useCreateIncentiveRule();
  const updateMut = useUpdateIncentiveRule();
  const deleteMut = useDeleteIncentiveRule();

  const [form, setForm] = useState({ minEfficiency: '', maxEfficiency: '', incentivePercent: '', label: '' });
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ minEfficiency: '', maxEfficiency: '', incentivePercent: '', label: '' });

  const handleAdd = () => {
    if (!form.minEfficiency || !form.maxEfficiency || !form.incentivePercent) return;
    createMut.mutate({
      minEfficiency: parseFloat(form.minEfficiency),
      maxEfficiency: parseFloat(form.maxEfficiency),
      incentivePercent: parseFloat(form.incentivePercent),
      label: form.label || undefined,
    }, { onSuccess: () => setForm({ minEfficiency: '', maxEfficiency: '', incentivePercent: '', label: '' }) });
  };

  const startEdit = (r: RuleRow) => {
    setEditId(r.id);
    setEditForm({ minEfficiency: String(r.minEfficiency), maxEfficiency: String(r.maxEfficiency), incentivePercent: String(r.incentivePercent), label: r.label ?? '' });
  };

  const handleUpdate = () => {
    if (editId === null) return;
    updateMut.mutate({ id: editId, data: { minEfficiency: parseFloat(editForm.minEfficiency), maxEfficiency: parseFloat(editForm.maxEfficiency), incentivePercent: parseFloat(editForm.incentivePercent), label: editForm.label || undefined } },
      { onSuccess: () => setEditId(null) });
  };

  return (
    <>
      <PageMeta title="Incentive Rules" description="Manage incentive slabs and ranges" />
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Incentive Rules</h1>

        {/* Info */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Incentive rules define efficiency slabs. Each slab maps an efficiency range to an incentive percentage.
            Ranges must not overlap.
          </p>
        </div>

        {/* Add form */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <h2 className="mb-3 font-semibold text-gray-800 dark:text-white">Add New Rule</h2>
          <div className="grid gap-3 sm:grid-cols-5">
            <div>
              <label className="mb-1 block text-xs text-gray-500">Min Efficiency %</label>
              <input type="number" step="0.1" value={form.minEfficiency} onChange={e => setForm(f => ({ ...f, minEfficiency: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" placeholder="0" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Max Efficiency %</label>
              <input type="number" step="0.1" value={form.maxEfficiency} onChange={e => setForm(f => ({ ...f, maxEfficiency: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" placeholder="100" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Incentive %</label>
              <input type="number" step="0.1" value={form.incentivePercent} onChange={e => setForm(f => ({ ...f, incentivePercent: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" placeholder="5" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Label (optional)</label>
              <input type="text" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" placeholder="e.g. Slab A" />
            </div>
            <div className="flex items-end">
              <button onClick={handleAdd} disabled={createMut.isPending} className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50">
                {createMut.isPending ? 'Adding...' : 'Add Rule'}
              </button>
            </div>
          </div>
        </div>

        {/* Rules table */}
        {isLoading && <p className="text-gray-500">Loading rules...</p>}
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800"><tr>
              <th className="px-4 py-3 text-left text-gray-600 dark:text-gray-300">Label</th>
              <th className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">Min Eff %</th>
              <th className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">Max Eff %</th>
              <th className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">Incentive %</th>
              <th className="px-4 py-3 text-center text-gray-600 dark:text-gray-300">Range Bar</th>
              <th className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {rules.map(r => (
                <tr key={r.id}>
                  {editId === r.id ? (
                    <>
                      <td className="px-4 py-2"><input type="text" value={editForm.label} onChange={e => setEditForm(f => ({ ...f, label: e.target.value }))} className="w-full rounded border px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" /></td>
                      <td className="px-4 py-2"><input type="number" step="0.1" value={editForm.minEfficiency} onChange={e => setEditForm(f => ({ ...f, minEfficiency: e.target.value }))} className="w-20 rounded border px-2 py-1 text-right text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" /></td>
                      <td className="px-4 py-2"><input type="number" step="0.1" value={editForm.maxEfficiency} onChange={e => setEditForm(f => ({ ...f, maxEfficiency: e.target.value }))} className="w-20 rounded border px-2 py-1 text-right text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" /></td>
                      <td className="px-4 py-2"><input type="number" step="0.1" value={editForm.incentivePercent} onChange={e => setEditForm(f => ({ ...f, incentivePercent: e.target.value }))} className="w-20 rounded border px-2 py-1 text-right text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" /></td>
                      <td className="px-4 py-2" />
                      <td className="px-4 py-2 text-right">
                        <button onClick={handleUpdate} className="mr-2 text-green-600 hover:underline">Save</button>
                        <button onClick={() => setEditId(null)} className="text-gray-500 hover:underline">Cancel</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-gray-800 dark:text-white">{r.label || '—'}</td>
                      <td className="px-4 py-3 text-right font-mono text-gray-800 dark:text-white">{r.minEfficiency.toFixed(1)}</td>
                      <td className="px-4 py-3 text-right font-mono text-gray-800 dark:text-white">{r.maxEfficiency.toFixed(1)}</td>
                      <td className="px-4 py-3 text-right font-bold text-green-600">{r.incentivePercent.toFixed(1)}%</td>
                      <td className="px-4 py-3">
                        <div className="relative h-4 w-full rounded bg-gray-100 dark:bg-gray-800">
                          <div className="absolute top-0 h-4 rounded bg-green-500" style={{ left: `${r.minEfficiency}%`, width: `${Math.min(r.maxEfficiency - r.minEfficiency, 100)}%` }} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => startEdit(r)} className="mr-3 text-blue-600 hover:underline">Edit</button>
                        <button onClick={() => deleteMut.mutate(r.id)} className="text-red-600 hover:underline">Delete</button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!isLoading && rules.length === 0 && <p className="text-center text-gray-500">No incentive rules configured. Add a rule above to get started.</p>}
      </div>
    </>
  );
}
