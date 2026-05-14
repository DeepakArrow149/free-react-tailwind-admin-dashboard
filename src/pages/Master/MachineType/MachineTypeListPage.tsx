import { useState } from 'react';
import { PageMeta } from '@/components/common';
import { PaginatedTable } from '@/components/table';
import { useMachineTypes, useCreateMachineType, useUpdateMachineType, useToggleMachineType } from '@/hooks/useLineBalancing';
import type { MachineType } from '@/api/lineBalancing';
import DynamicMachineIcon from '@/components/LineLayout/DynamicMachineIcon';
import IconPickerModal from '@/components/LineLayout/IconPickerModal';
import type { MachineIcon } from '@/api/machineIcons';

const CATEGORIES = ['SEWING', 'CUTTING', 'FINISHING', 'PRESSING', 'EMBROIDERY', 'PRINTING', 'SPECIAL', 'MANUAL', 'UTILITY', 'OTHER'];

export default function MachineTypeListPage() {
  const { data: types = [], isLoading } = useMachineTypes();
  const createMut = useCreateMachineType();
  const updateMut = useUpdateMachineType();
  const toggleMut = useToggleMachineType();

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ code: '', name: '', category: '', iconId: null as number | null });
  const [iconPickerOpen, setIconPickerOpen] = useState(false);

  const resetForm = () => { setForm({ code: '', name: '', category: '', iconId: null }); setEditId(null); setShowForm(false); };

  const handleSubmit = async () => {
    const payload = { ...form, iconId: form.iconId || undefined };
    if (editId) {
      updateMut.mutate({ id: editId, data: payload }, { onSuccess: resetForm });
    } else {
      createMut.mutate(payload, { onSuccess: resetForm });
    }
  };

  const handleEdit = (t: MachineType) => {
    setForm({ code: t.code, name: t.name, category: t.category ?? '', iconId: t.icon?.id ?? null });
    setEditId(t.id);
    setShowForm(true);
  };

  const handleToggle = (id: number) => toggleMut.mutate(id);

  const handleIconSelect = (icon: MachineIcon) => {
    setForm({ ...form, iconId: icon.id });
    setIconPickerOpen(false);
  };

  return (
    <>
      <PageMeta title="Machine Types" description="Manage sewing machine type master data" />
      <div className="mx-auto max-w-5xl space-y-4 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Machine Types</h1>
          <button
            onClick={() => { resetForm(); setShowForm(!showForm); }}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
            aria-label="Add machine type"
          >
            {showForm ? 'Cancel' : '+ Add Type'}
          </button>
        </div>

        {showForm && (
          <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <input
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                placeholder="Code (e.g. SNLS)"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                aria-label="Machine type code"
              />
              <input
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                placeholder="Name (e.g. Single Needle Lockstitch)"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                aria-label="Machine type name"
              />
              <select
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                aria-label="Machine type category"
              >
                <option value="">-- Category --</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {/* Icon Picker Button */}
              <button
                type="button"
                onClick={() => setIconPickerOpen(true)}
                className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-white"
                aria-label="Select icon"
              >
                {form.iconId ? (
                  <DynamicMachineIcon code={form.code} size={20} />
                ) : (
                  <span className="w-5 h-5 rounded bg-gray-200 dark:bg-gray-600" />
                )}
                <span className="truncate">{form.iconId ? 'Change Icon' : 'Select Icon'}</span>
              </button>
            </div>
            <button
              onClick={handleSubmit}
              disabled={createMut.isPending || updateMut.isPending}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
              aria-label="Save machine type"
            >
              {editId ? 'Update' : 'Create'}
            </button>
          </div>
        )}

        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
          {isLoading ? (
            <div className="p-8 text-center text-gray-400">Loading…</div>
          ) : (
            <PaginatedTable data={types} pageSize={20}>
              {(pageData) => (
                <table className="w-full text-left text-sm">
                  <thead className="border-b bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 font-medium w-14">Icon</th>
                      <th className="px-4 py-3 font-medium">Code</th>
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Category</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-gray-700">
                    {pageData.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-2">
                          <DynamicMachineIcon code={t.code} icon={t.icon} size={28} />
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">{t.code}</td>
                        <td className="px-4 py-3">{t.name}</td>
                        <td className="px-4 py-3">{t.category ?? '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${t.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                            {t.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right space-x-2">
                          <button onClick={() => handleEdit(t)} className="text-xs text-brand-500 hover:underline" aria-label={`Edit ${t.code}`}>Edit</button>
                          <button onClick={() => handleToggle(t.id)} className="text-xs text-amber-500 hover:underline" aria-label={`Toggle ${t.code}`}>
                            {t.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {pageData.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No machine types found</td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </PaginatedTable>
          )}
        </div>
      </div>

      <IconPickerModal
        open={iconPickerOpen}
        onClose={() => setIconPickerOpen(false)}
        onSelect={handleIconSelect}
        selectedIconId={form.iconId}
      />
    </>
  );
}
