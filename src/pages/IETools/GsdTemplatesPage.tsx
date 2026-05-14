import { useState } from 'react';
import { useGsdMotions, useCreateGsdMotion, useDeleteGsdMotion, useSeedGsdMotions, useGsdTemplates, useCreateGsdTemplate, useDeleteGsdTemplate } from '@/hooks/useIeTools';
import PageMeta from '@/components/common/PageMeta';

export default function GsdTemplatesPage() {
  const [tab, setTab] = useState<'motions' | 'templates'>('motions');

  return (
    <>
      <PageMeta title="GSD Templates" description="General Sewing Data motions and templates" />
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">GSD Motions & Templates</h1>

        <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
          <button onClick={() => setTab('motions')} className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${tab === 'motions' ? 'bg-white text-gray-800 shadow dark:bg-gray-700 dark:text-white' : 'text-gray-500'}`}>Motions</button>
          <button onClick={() => setTab('templates')} className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${tab === 'templates' ? 'bg-white text-gray-800 shadow dark:bg-gray-700 dark:text-white' : 'text-gray-500'}`}>Templates</button>
        </div>

        {tab === 'motions' && <MotionsPanel />}
        {tab === 'templates' && <TemplatesPanel />}
      </div>
    </>
  );
}

function MotionsPanel() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useGsdMotions({ search: search || undefined });
  const create = useCreateGsdMotion();
  const remove = useDeleteGsdMotion();
  const seed = useSeedGsdMotions();
  const motions = Array.isArray(data) ? data : [];

  const [form, setForm] = useState({ code: '', description: '', tmuValue: 0, category: 'REACH' });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input placeholder="Search motions..." className="flex-1 rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" value={search} onChange={e => setSearch(e.target.value)} />
        <button className="rounded-lg bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50" disabled={seed.isPending} onClick={() => seed.mutate()}>
          Seed Defaults
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        <h3 className="mb-3 font-semibold text-gray-800 dark:text-white">Add Motion</h3>
        <div className="flex flex-wrap gap-3">
          <input placeholder="Code" className="w-24 rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} />
          <input placeholder="Description" className="flex-1 rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          <input type="number" placeholder="TMU" className="w-24 rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" value={form.tmuValue || ''} onChange={e => setForm(p => ({ ...p, tmuValue: Number(e.target.value) }))} />
          <input placeholder="Category" className="w-32 rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} />
          <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50" disabled={!form.code || !form.description || create.isPending} onClick={() => { create.mutate(form); setForm({ code: '', description: '', tmuValue: 0, category: 'REACH' }); }}>
            Add
          </button>
        </div>
      </div>

      {isLoading && <p className="text-gray-500">Loading...</p>}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800"><tr>
            <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-300">Code</th>
            <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-300">Description</th>
            <th className="px-3 py-2 text-right text-gray-600 dark:text-gray-300">TMU</th>
            <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-300">Category</th>
            <th className="px-3 py-2 text-center text-gray-600 dark:text-gray-300">Actions</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {motions.map((m: { id: number; code: string; description: string; tmuValue: number; category: string; isDefault: boolean }) => (
              <tr key={m.id}>
                <td className="px-3 py-2 font-mono text-gray-800 dark:text-white">{m.code}</td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{m.description}</td>
                <td className="px-3 py-2 text-right text-gray-600">{m.tmuValue}</td>
                <td className="px-3 py-2 text-gray-500">{m.category}</td>
                <td className="px-3 py-2 text-center">
                  {!m.isDefault && <button className="text-xs text-red-500 hover:text-red-700" onClick={() => remove.mutate(m.id)}>Delete</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TemplatesPanel() {
  const { data, isLoading } = useGsdTemplates();
  const create = useCreateGsdTemplate();
  const remove = useDeleteGsdTemplate();
  const templates = Array.isArray(data) ? data : [];

  const [name, setName] = useState('');

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        <h3 className="mb-3 font-semibold text-gray-800 dark:text-white">Create Template</h3>
        <div className="flex gap-3">
          <input placeholder="Template name" className="flex-1 rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" value={name} onChange={e => setName(e.target.value)} />
          <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50" disabled={!name || create.isPending} onClick={() => { create.mutate({ name, items: [] }); setName(''); }}>
            Create
          </button>
        </div>
      </div>

      {isLoading && <p className="text-gray-500">Loading...</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((t: { id: number; name: string; description: string | null; totalTmu: number; calculatedSAM: number; allowancePct: number }) => (
          <div key={t.id} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
            <div className="flex items-start justify-between">
              <h4 className="font-medium text-gray-800 dark:text-white">{t.name}</h4>
              <button className="text-xs text-red-500 hover:text-red-700" onClick={() => remove.mutate(t.id)}>Delete</button>
            </div>
            {t.description && <p className="mt-1 text-sm text-gray-500">{t.description}</p>}
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
              <div><p className="text-xs text-gray-500">TMU</p><p className="font-bold text-gray-800 dark:text-white">{t.totalTmu}</p></div>
              <div><p className="text-xs text-gray-500">SAM</p><p className="font-bold text-blue-600">{t.calculatedSAM.toFixed(4)}</p></div>
              <div><p className="text-xs text-gray-500">Allowance</p><p className="font-bold text-gray-800 dark:text-white">{t.allowancePct}%</p></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
