import { useState, useEffect, useRef, useMemo } from 'react';
import { PageMeta } from '@/components/common';
import { PaginatedTable } from '@/components/table';
import { operationApi, type OperationMaster } from '@/api/production';
import { machineTypeApi, type MachineType } from '@/api/lineBalancing';
import { toastSuccess, toastError } from '@/utils/toast';

const DEPARTMENTS = ['SEWING', 'CUTTING', 'FINISHING', 'PACKING'];
const MACHINE_CATEGORIES = ['SEWING', 'CUTTING', 'FINISHING', 'PRESSING', 'EMBROIDERY', 'PRINTING', 'SPECIAL', 'OTHER'];

export default function OperationMasterPage() {
  const [operations, setOperations] = useState<OperationMaster[]>([]);
  const [machineTypes, setMachineTypes] = useState<MachineType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ code: '', name: '', department: 'SEWING', machineTypeId: null as number | null });

  // Machine type dropdown state
  const [mtSearch, setMtSearch] = useState('');
  const [mtOpen, setMtOpen] = useState(false);
  const mtRef = useRef<HTMLDivElement>(null);

  // Category filter
  const [categoryFilter, setCategoryFilter] = useState('');

  const load = async (machineCategory?: string) => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (machineCategory) params.machineCategory = machineCategory;
      const res = await operationApi.list(params);
      setOperations(res.data ?? res ?? []);
    } catch (e) {
      toastError(e, 'Failed to load operations');
    }
    setLoading(false);
  };

  const loadMachineTypes = async () => {
    try {
      const res = await machineTypeApi.list({ isActive: true });
      setMachineTypes(res.data ?? res ?? []);
    } catch { /* silent */ }
  };

  useEffect(() => { load(); loadMachineTypes(); }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (mtRef.current && !mtRef.current.contains(e.target as Node)) setMtOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Filtered machine types for dropdown
  const filteredMT = useMemo(() => {
    if (!mtSearch.trim()) return machineTypes;
    const q = mtSearch.toLowerCase();
    return machineTypes.filter(mt => mt.code.toLowerCase().includes(q) || mt.name.toLowerCase().includes(q));
  }, [machineTypes, mtSearch]);

  // Selected machine type label
  const selectedMT = machineTypes.find(mt => mt.id === form.machineTypeId);

  const resetForm = () => {
    setForm({ code: '', name: '', department: 'SEWING', machineTypeId: null });
    setMtSearch('');
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
        await operationApi.update(editId, form);
        toastSuccess('Operation updated');
      } else {
        await operationApi.create(form);
        toastSuccess('Operation created');
      }
      resetForm();
      load(categoryFilter || undefined);
    } catch (e) {
      toastError(e, 'Save failed');
    }
  };

  const handleEdit = (op: OperationMaster) => {
    setForm({ code: op.code, name: op.name, department: op.department, machineTypeId: op.machineTypeId });
    setMtSearch('');
    setEditId(op.id);
    setShowForm(true);
  };

  const handleToggle = async (op: OperationMaster) => {
    try {
      await operationApi.update(op.id, { isActive: !op.isActive });
      toastSuccess('Status toggled');
      load(categoryFilter || undefined);
    } catch (e) {
      toastError(e, 'Toggle failed');
    }
  };

  const handleCategoryFilter = (cat: string) => {
    setCategoryFilter(cat);
    load(cat || undefined);
  };

  return (
    <>
      <PageMeta title="Operation Master" description="Manage manufacturing operations" />
      <div className="mx-auto max-w-6xl space-y-4 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Operation Master</h1>
          <button
            onClick={() => { resetForm(); setShowForm(!showForm); }}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            {showForm ? 'Cancel' : '+ Add Operation'}
          </button>
        </div>

        {showForm && (
          <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <input
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                placeholder="Code (e.g. SEW-001)"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              />
              <input
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                placeholder="Name (e.g. Attach Collar)"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <select
                aria-label="Department"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
              >
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>

              {/* Searchable Machine Type Dropdown */}
              <div className="relative" ref={mtRef}>
                <input
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  placeholder="Search Machine Type…"
                  value={mtOpen ? mtSearch : (selectedMT ? `${selectedMT.code} - ${selectedMT.name}` : '')}
                  onFocus={() => { setMtOpen(true); setMtSearch(''); }}
                  onChange={(e) => setMtSearch(e.target.value)}
                />
                {form.machineTypeId && !mtOpen && (
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, machineTypeId: null })}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                    title="Clear"
                  >✕</button>
                )}
                {mtOpen && (
                  <ul className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800">
                    <li
                      className="cursor-pointer px-3 py-2 text-sm text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => { setForm({ ...form, machineTypeId: null }); setMtOpen(false); }}
                    >— None —</li>
                    {filteredMT.map(mt => (
                      <li
                        key={mt.id}
                        className={`cursor-pointer px-3 py-2 text-sm hover:bg-brand-50 dark:hover:bg-gray-700 ${mt.id === form.machineTypeId ? 'bg-brand-50 font-medium text-brand-600 dark:bg-brand-900/20 dark:text-brand-400' : 'dark:text-white'}`}
                        onClick={() => { setForm({ ...form, machineTypeId: mt.id }); setMtOpen(false); }}
                      >
                        <span className="font-mono text-xs mr-2">{mt.code}</span>
                        {mt.name}
                        {mt.category && <span className="ml-2 text-xs text-gray-400">({mt.category})</span>}
                      </li>
                    ))}
                    {filteredMT.length === 0 && (
                      <li className="px-3 py-2 text-sm text-gray-400">No machine types found</li>
                    )}
                  </ul>
                )}
              </div>
            </div>
            <button
              onClick={handleSubmit}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
            >
              {editId ? 'Update' : 'Create'}
            </button>
          </div>
        )}

        {/* Machine Category Filter Bar */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleCategoryFilter('')}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${!categoryFilter ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'}`}
          >All Categories</button>
          {MACHINE_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => handleCategoryFilter(cat)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${categoryFilter === cat ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'}`}
            >{cat}</button>
          ))}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading…</div>
          ) : (
            <PaginatedTable data={operations} pageSize={20}>
              {(pageData) => (
                <table className="w-full text-left text-sm">
                  <thead className="border-b bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 font-medium">Code</th>
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Department</th>
                      <th className="px-4 py-3 font-medium">Machine Type</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-gray-700">
                    {pageData.map((op) => (
                      <tr key={op.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-3 font-mono text-xs">{op.code}</td>
                        <td className="px-4 py-3">{op.name}</td>
                        <td className="px-4 py-3">{op.department}</td>
                        <td className="px-4 py-3">
                          {op.machineType ? (
                            <span className="inline-flex items-center gap-1">
                              <span className="font-mono text-xs">{op.machineType.code}</span>
                              <span className="text-gray-400">-</span>
                              <span>{op.machineType.name}</span>
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${op.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                            {op.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right space-x-2">
                          <button onClick={() => handleEdit(op)} className="text-xs text-brand-500 hover:underline">Edit</button>
                          <button onClick={() => handleToggle(op)} className="text-xs text-amber-500 hover:underline">
                            {op.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {pageData.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No operations found</td></tr>
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
