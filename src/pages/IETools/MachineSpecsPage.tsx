import { useState } from 'react';
import { useMachineSpecs, useCreateMachineSpec, useUpdateMachineSpec, useDeleteMachineSpec } from '@/hooks/useIeTools';
import PageMeta from '@/components/common/PageMeta';

export default function MachineSpecsPage() {
  const [machineType, setMachineType] = useState('');
  const [garmentType, setGarmentType] = useState('');
  const { data, isLoading } = useMachineSpecs({ machineType: machineType || undefined, garmentType: garmentType || undefined });
  const create = useCreateMachineSpec();
  const update = useUpdateMachineSpec();
  const remove = useDeleteMachineSpec();
  const specs = Array.isArray(data) ? data : [];

  const [form, setForm] = useState({ machineType: '', garmentType: '', specName: '', specValue: '', unit: '', minValue: '', maxValue: '' });
  const [editId, setEditId] = useState<number | null>(null);

  return (
    <>
      <PageMeta title="Machine Specifications" description="Manage machine specifications per garment type" />
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Machine Specifications</h1>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <input placeholder="Filter by machine type" className="rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" value={machineType} onChange={e => setMachineType(e.target.value)} />
          <input placeholder="Filter by garment type" className="rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" value={garmentType} onChange={e => setGarmentType(e.target.value)} />
        </div>

        {/* Create Form */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <h3 className="mb-3 font-semibold text-gray-800 dark:text-white">{editId ? 'Edit Spec' : 'Add Spec'}</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <input placeholder="Machine Type" className="rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" value={form.machineType} onChange={e => setForm(p => ({ ...p, machineType: e.target.value }))} />
            <input placeholder="Garment Type" className="rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" value={form.garmentType} onChange={e => setForm(p => ({ ...p, garmentType: e.target.value }))} />
            <input placeholder="Spec Name" className="rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" value={form.specName} onChange={e => setForm(p => ({ ...p, specName: e.target.value }))} />
            <input placeholder="Spec Value" className="rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" value={form.specValue} onChange={e => setForm(p => ({ ...p, specValue: e.target.value }))} />
            <input placeholder="Unit" className="rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} />
            <input type="number" placeholder="Min Value" className="rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" value={form.minValue} onChange={e => setForm(p => ({ ...p, minValue: e.target.value }))} />
            <input type="number" placeholder="Max Value" className="rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white" value={form.maxValue} onChange={e => setForm(p => ({ ...p, maxValue: e.target.value }))} />
            <div className="flex gap-2">
              <button
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                disabled={!form.machineType || !form.garmentType || !form.specName || !form.specValue}
                onClick={() => {
                  const payload = {
                    machineType: form.machineType,
                    garmentType: form.garmentType,
                    specName: form.specName,
                    specValue: form.specValue,
                    unit: form.unit || undefined,
                    minValue: form.minValue ? Number(form.minValue) : undefined,
                    maxValue: form.maxValue ? Number(form.maxValue) : undefined,
                  };
                  if (editId) {
                    update.mutate({ id: editId, ...payload });
                    setEditId(null);
                  } else {
                    create.mutate(payload);
                  }
                  setForm({ machineType: '', garmentType: '', specName: '', specValue: '', unit: '', minValue: '', maxValue: '' });
                }}
              >
                {editId ? 'Update' : 'Add'}
              </button>
              {editId && <button className="rounded-lg border px-3 py-2 text-sm text-gray-600" onClick={() => { setEditId(null); setForm({ machineType: '', garmentType: '', specName: '', specValue: '', unit: '', minValue: '', maxValue: '' }); }}>Cancel</button>}
            </div>
          </div>
        </div>

        {/* Table */}
        {isLoading && <p className="text-gray-500">Loading...</p>}
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800"><tr>
              <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-300">Machine Type</th>
              <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-300">Garment Type</th>
              <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-300">Spec Name</th>
              <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-300">Value</th>
              <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-300">Unit</th>
              <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-300">Range</th>
              <th className="px-3 py-2 text-center text-gray-600 dark:text-gray-300">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {specs.map((s: { id: number; machineType: string; garmentType: string; specName: string; specValue: string; unit: string | null; minValue: number | null; maxValue: number | null }) => (
                <tr key={s.id}>
                  <td className="px-3 py-2 text-gray-800 dark:text-white">{s.machineType}</td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{s.garmentType}</td>
                  <td className="px-3 py-2 text-gray-800 dark:text-white">{s.specName}</td>
                  <td className="px-3 py-2 font-medium text-gray-800 dark:text-white">{s.specValue}</td>
                  <td className="px-3 py-2 text-gray-500">{s.unit ?? '-'}</td>
                  <td className="px-3 py-2 text-gray-500">{s.minValue != null ? `${s.minValue} - ${s.maxValue}` : '-'}</td>
                  <td className="px-3 py-2 text-center">
                    <button className="mr-2 text-xs text-blue-600 hover:text-blue-800" onClick={() => { setEditId(s.id); setForm({ machineType: s.machineType, garmentType: s.garmentType, specName: s.specName, specValue: s.specValue, unit: s.unit ?? '', minValue: s.minValue?.toString() ?? '', maxValue: s.maxValue?.toString() ?? '' }); }}>Edit</button>
                    <button className="text-xs text-red-500 hover:text-red-700" onClick={() => remove.mutate(s.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
