import { useState, useEffect } from 'react';
import { PageMeta } from '@/components/common';
import { PaginatedTable } from '@/components/table';
import { masterApi } from '@/api/master';
import { toastSuccess, toastError } from '@/utils/toast';

interface UnitRow {
  id: number;
  code: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function UnitList() {
  const [units, setUnits] = useState<UnitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ code: '', name: '' });

  const load = async () => {
    setLoading(true);
    try {
      const res = await masterApi.listUnits();
      setUnits(res.data?.data ?? res.data ?? []);
    } catch (e) {
      toastError(e, 'Failed to load units');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setForm({ code: '', name: '' });
    setEditId(null);
    setShowForm(false);
  };

  const handleSubmit = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      toastError(null, 'Code and Name are required');
      return;
    }
    try {
      if (editId) {
        await masterApi.updateUnit(editId, form);
        toastSuccess('Unit updated');
      } else {
        await masterApi.createUnit(form);
        toastSuccess('Unit created');
      }
      resetForm();
      load();
    } catch (e) {
      toastError(e, 'Save failed');
    }
  };

  const handleEdit = (u: UnitRow) => {
    setForm({ code: u.code, name: u.name });
    setEditId(u.id);
    setShowForm(true);
  };

  const handleToggle = async (u: UnitRow) => {
    try {
      await masterApi.updateUnit(u.id, { isActive: !u.isActive });
      toastSuccess('Status toggled');
      load();
    } catch (e) {
      toastError(e, 'Toggle failed');
    }
  };

  return (
    <>
      <PageMeta title="Unit Master" description="Manage units of measurement" />
      <div className="mx-auto max-w-5xl space-y-4 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Unit Master (UOM)</h1>
          <button
            onClick={() => { resetForm(); setShowForm(!showForm); }}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            {showForm ? 'Cancel' : '+ Add Unit'}
          </button>
        </div>

        {showForm && (
          <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                placeholder="Code (e.g. MTR)"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              />
              <input
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                placeholder="Name (e.g. Meter)"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <button
              onClick={handleSubmit}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
            >
              {editId ? 'Update' : 'Create'}
            </button>
          </div>
        )}

        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading…</div>
          ) : (
            <PaginatedTable data={units} pageSize={20}>
              {(pageData) => (
                <table className="w-full text-left text-sm">
                  <thead className="border-b bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 font-medium">Code</th>
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-gray-700">
                    {pageData.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-3 font-mono text-xs">{u.code}</td>
                        <td className="px-4 py-3">{u.name}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${u.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                            {u.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right space-x-2">
                          <button onClick={() => handleEdit(u)} className="text-xs text-brand-500 hover:underline">Edit</button>
                          <button onClick={() => handleToggle(u)} className="text-xs text-amber-500 hover:underline">
                            {u.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {pageData.length === 0 && (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No units found</td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </PaginatedTable>
          )}
        </div>
      </div>
    </>
  );
}
