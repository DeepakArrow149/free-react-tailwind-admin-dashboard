import { useState, useEffect, useCallback } from 'react';
import { PageMeta } from '@/components/common';
import { PaginatedTable } from '@/components/table';
import { employeeApi, departmentApi, designationApi } from '@/api/hrm';
import type { Employee, Department, Designation } from '@/api/hrm';
import { toastSuccess, toastError } from '@/utils/toast';

/** Production departments whose staff are considered "operators" */
const PROD_DEPARTMENTS = ['SEWING', 'CUTTING', 'FINISHING', 'PACKING', 'PRESSING', 'EMBROIDERY'];

export default function OperatorListPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [filterDept, setFilterDept] = useState('');

  const defaultForm = {
    firstName: '',
    lastName: '',
    departmentId: '',
    designationId: '',
    dateOfJoining: new Date().toISOString().slice(0, 10),
    gender: 'Male',
    phone: '',
    grossSalary: 0,
  };
  const [form, setForm] = useState({ ...defaultForm });

  /** Filter departments to only production-related ones */
  const prodDepts = departments.filter(
    (d) => PROD_DEPARTMENTS.some((pd) => d.name.toUpperCase().includes(pd)),
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [empRes, deptRes, desigRes] = await Promise.all([
        employeeApi.list(),
        departmentApi.list(),
        designationApi.list(),
      ]);
      const allDepts: Department[] = deptRes.data?.data ?? deptRes.data ?? [];
      setDepartments(allDepts);
      setDesignations(desigRes.data?.data ?? desigRes.data ?? []);

      const allEmps: Employee[] = empRes.data?.data ?? empRes.data ?? [];
      // Filter to production department employees
      const prodDeptIds = allDepts
        .filter((d) => PROD_DEPARTMENTS.some((pd) => d.name.toUpperCase().includes(pd)))
        .map((d) => d.id);

      let operators = allEmps.filter((e) => prodDeptIds.includes(e.departmentId));
      if (filterDept) {
        const matchId = allDepts.find((d) => d.name.toUpperCase().includes(filterDept))?.id;
        if (matchId) operators = operators.filter((e) => e.departmentId === matchId);
      }
      setEmployees(operators);
    } catch (e) {
      toastError(e, 'Failed to load operators');
    }
    setLoading(false);
  }, [filterDept]);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setForm({ ...defaultForm });
    setEditId(null);
    setShowForm(false);
  };

  const handleSubmit = async () => {
    if (!form.firstName.trim()) {
      toastError(null, 'First name is required');
      return;
    }
    if (!form.departmentId) {
      toastError(null, 'Department is required');
      return;
    }
    try {
      const payload = {
        ...form,
        departmentId: Number(form.departmentId),
        designationId: Number(form.designationId) || undefined,
        grossSalary: Number(form.grossSalary) || 0,
      };
      if (editId) {
        await employeeApi.update(editId, payload);
        toastSuccess('Operator updated');
      } else {
        await employeeApi.create(payload);
        toastSuccess('Operator created');
      }
      resetForm();
      load();
    } catch (e) {
      toastError(e, 'Save failed');
    }
  };

  const handleEdit = (emp: Employee) => {
    setForm({
      firstName: emp.firstName,
      lastName: emp.lastName,
      departmentId: String(emp.departmentId),
      designationId: String(emp.designationId),
      dateOfJoining: emp.dateOfJoining?.slice(0, 10) ?? '',
      gender: emp.gender ?? 'Male',
      phone: emp.phone ?? '',
      grossSalary: emp.grossSalary,
    });
    setEditId(emp.id);
    setShowForm(true);
  };

  const handleTerminate = async (emp: Employee) => {
    if (!confirm(`Terminate ${emp.firstName} ${emp.lastName}?`)) return;
    try {
      await employeeApi.terminate(emp.id, { terminationDate: new Date().toISOString().slice(0, 10), reason: 'Deactivated from Operator Master' });
      toastSuccess('Operator terminated');
      load();
    } catch (e) {
      toastError(e, 'Terminate failed');
    }
  };

  const inp = "rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white";

  return (
    <>
      <PageMeta title="Operator Master" description="Manage production operators" />
      <div className="mx-auto max-w-7xl space-y-4 p-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Operator Master</h1>
          <div className="flex items-center gap-2">
            <select className={inp} value={filterDept} onChange={(e) => setFilterDept(e.target.value)}>
              <option value="">All Production Depts</option>
              {PROD_DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <button
              onClick={() => { resetForm(); setShowForm(!showForm); }}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
            >
              {showForm ? 'Cancel' : '+ Add Operator'}
            </button>
          </div>
        </div>

        {showForm && (
          <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <input className={inp} placeholder="First Name *" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              <input className={inp} placeholder="Last Name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
              <select className={inp} value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
                <option value="">-- Department --</option>
                {prodDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <select className={inp} value={form.designationId} onChange={(e) => setForm({ ...form, designationId: e.target.value })}>
                <option value="">-- Designation --</option>
                {designations.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <input className={inp} type="date" value={form.dateOfJoining} onChange={(e) => setForm({ ...form, dateOfJoining: e.target.value })} />
              <select className={inp} value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              <input className={inp} placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <input className={inp} type="number" placeholder="Gross Salary" value={form.grossSalary || ''} onChange={(e) => setForm({ ...form, grossSalary: Number(e.target.value) })} />
            </div>
            <button onClick={handleSubmit} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
              {editId ? 'Update' : 'Create'}
            </button>
          </div>
        )}

        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading…</div>
          ) : (
            <PaginatedTable data={employees} pageSize={20}>
              {(pageData) => (
                <table className="w-full text-left text-sm">
                  <thead className="border-b bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 font-medium">Emp Code</th>
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Department</th>
                      <th className="px-4 py-3 font-medium">Designation</th>
                      <th className="px-4 py-3 font-medium">DOJ</th>
                      <th className="px-4 py-3 font-medium">Phone</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-gray-700">
                    {pageData.map((emp) => (
                      <tr key={emp.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-3 font-mono text-xs">{emp.empCode}</td>
                        <td className="px-4 py-3">{emp.firstName} {emp.lastName}</td>
                        <td className="px-4 py-3">{emp.department?.name ?? '—'}</td>
                        <td className="px-4 py-3">{emp.designation?.name ?? '—'}</td>
                        <td className="px-4 py-3">{emp.dateOfJoining ? new Date(emp.dateOfJoining).toLocaleDateString() : '—'}</td>
                        <td className="px-4 py-3">{emp.phone ?? '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${emp.status === 'ACTIVE' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                            {emp.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right space-x-2">
                          <button onClick={() => handleEdit(emp)} className="text-xs text-brand-500 hover:underline">Edit</button>
                          {emp.status === 'ACTIVE' && (
                            <button onClick={() => handleTerminate(emp)} className="text-xs text-red-500 hover:underline">Terminate</button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {pageData.length === 0 && (
                      <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No operators found</td></tr>
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
