import { useState, useEffect } from 'react';
import { PageMeta } from '@/components/common';
import { PaginatedTable } from '@/components/table';
import { lineApi, type CapacityLineRow } from '@/api/lineBalancing';
import { toastSuccess, toastError } from '@/utils/toast';

const DEPARTMENTS = ['SEWING', 'CUTTING', 'FINISHING', 'PACKING', 'PRESSING', 'EMBROIDERY'];

const defaultForm = {
  lineName: '',
  department: 'SEWING',
  totalMachines: 0,
  totalOperators: 0,
  samCapacity: 0,
  dailyCapacity: 0,
  efficiency: 0,
  shiftHours: 8,
  remarks: '',
};

export default function LineMasterPage() {
  const [lines, setLines] = useState<CapacityLineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...defaultForm });
  const [filterDept, setFilterDept] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterDept) params.department = filterDept;
      const res = await lineApi.list(params);
      setLines(res.data ?? res ?? []);
    } catch (e) {
      toastError(e, 'Failed to load lines');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [filterDept]);

  const resetForm = () => {
    setForm({ ...defaultForm });
    setEditId(null);
    setShowForm(false);
  };

  const handleSubmit = async () => {
    if (!form.lineName.trim()) {
      toastError(null, 'Line Name is required');
      return;
    }
    try {
      const payload = {
        ...form,
        totalMachines: Number(form.totalMachines) || 0,
        totalOperators: Number(form.totalOperators) || 0,
        samCapacity: Number(form.samCapacity) || 0,
        dailyCapacity: Number(form.dailyCapacity) || 0,
        efficiency: Number(form.efficiency) || 0,
        shiftHours: Number(form.shiftHours) || 8,
      };
      if (editId) {
        await lineApi.update(editId, payload);
        toastSuccess('Line updated');
      } else {
        await lineApi.create(payload);
        toastSuccess('Line created');
      }
      resetForm();
      load();
    } catch (e) {
      toastError(e, 'Save failed');
    }
  };

  const handleEdit = (l: CapacityLineRow) => {
    setForm({
      lineName: l.lineName,
      department: l.department,
      totalMachines: l.totalMachines,
      totalOperators: l.totalOperators,
      samCapacity: l.samCapacity ?? 0,
      dailyCapacity: l.dailyCapacity ?? 0,
      efficiency: l.efficiency ?? 0,
      shiftHours: l.shiftHours ?? 8,
      remarks: l.remarks ?? '',
    });
    setEditId(l.id);
    setShowForm(true);
  };

  const handleToggle = async (l: CapacityLineRow) => {
    try {
      await lineApi.update(l.id, { isActive: !l.isActive });
      toastSuccess('Status toggled');
      load();
    } catch (e) {
      toastError(e, 'Toggle failed');
    }
  };

  const inp = "rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white";

  return (
    <>
      <PageMeta title="Line Master" description="Manage production lines" />
      <div className="mx-auto max-w-7xl space-y-4 p-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Line Master</h1>
          <div className="flex items-center gap-2">
            <select
              className={inp}
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
            >
              <option value="">All Departments</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <button
              onClick={() => { resetForm(); setShowForm(!showForm); }}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
            >
              {showForm ? 'Cancel' : '+ Add Line'}
            </button>
          </div>
        </div>

        {showForm && (
          <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <input className={inp} placeholder="Line Name *" value={form.lineName} onChange={(e) => setForm({ ...form, lineName: e.target.value })} />
              <select className={inp} value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <input className={inp} type="number" placeholder="Total Machines" value={form.totalMachines || ''} onChange={(e) => setForm({ ...form, totalMachines: Number(e.target.value) })} />
              <input className={inp} type="number" placeholder="Total Operators" value={form.totalOperators || ''} onChange={(e) => setForm({ ...form, totalOperators: Number(e.target.value) })} />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <input className={inp} type="number" step="0.01" placeholder="SAM Capacity" value={form.samCapacity || ''} onChange={(e) => setForm({ ...form, samCapacity: Number(e.target.value) })} />
              <input className={inp} type="number" placeholder="Daily Capacity" value={form.dailyCapacity || ''} onChange={(e) => setForm({ ...form, dailyCapacity: Number(e.target.value) })} />
              <input className={inp} type="number" step="0.1" placeholder="Efficiency %" value={form.efficiency || ''} onChange={(e) => setForm({ ...form, efficiency: Number(e.target.value) })} />
              <input className={inp} type="number" step="0.5" placeholder="Shift Hours" value={form.shiftHours || ''} onChange={(e) => setForm({ ...form, shiftHours: Number(e.target.value) })} />
            </div>
            <input className={`${inp} w-full`} placeholder="Remarks" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
            <button onClick={handleSubmit} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
              {editId ? 'Update' : 'Create'}
            </button>
          </div>
        )}

        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading…</div>
          ) : (
            <PaginatedTable data={lines} pageSize={20}>
              {(pageData) => (
                <table className="w-full text-left text-sm">
                  <thead className="border-b bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 font-medium">Line Name</th>
                      <th className="px-4 py-3 font-medium">Department</th>
                      <th className="px-4 py-3 font-medium text-right">Machines</th>
                      <th className="px-4 py-3 font-medium text-right">Operators</th>
                      <th className="px-4 py-3 font-medium text-right">Daily Cap</th>
                      <th className="px-4 py-3 font-medium text-right">Eff %</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-gray-700">
                    {pageData.map((l) => (
                      <tr key={l.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-3 font-medium">{l.lineName}</td>
                        <td className="px-4 py-3">{l.department}</td>
                        <td className="px-4 py-3 text-right">{l.totalMachines}</td>
                        <td className="px-4 py-3 text-right">{l.totalOperators}</td>
                        <td className="px-4 py-3 text-right">{l.dailyCapacity ?? '—'}</td>
                        <td className="px-4 py-3 text-right">{l.efficiency != null ? `${l.efficiency}%` : '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${l.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                            {l.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right space-x-2">
                          <button onClick={() => handleEdit(l)} className="text-xs text-brand-500 hover:underline">Edit</button>
                          <button onClick={() => handleToggle(l)} className="text-xs text-amber-500 hover:underline">
                            {l.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {pageData.length === 0 && (
                      <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No lines found</td></tr>
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
