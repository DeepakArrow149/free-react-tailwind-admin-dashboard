import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import { employeeApi, departmentApi, designationApi, Employee, Department, Designation } from "../../api/hrm";

const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  ON_LEAVE: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  RESIGNED: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
  TERMINATED: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    firstName: "", lastName: "", departmentId: "", designationId: "",
    dateOfJoining: new Date().toISOString().split("T")[0],
    gender: "Male", phone: "", email: "", grossSalary: "",
    pfApplicable: true, esiApplicable: false,
    panNo: "", aadharNo: "", bankName: "", bankAccountNo: "", ifscCode: "",
  });

  useEffect(() => { load(); }, []);

  async function load() {
    const [e, d, dg] = await Promise.all([
      employeeApi.list(),
      departmentApi.list(),
      designationApi.list(),
    ]);
    setEmployees(e.data?.data?.data || e.data?.data || []);
    setDepartments(d.data?.data || []);
    setDesignations(dg.data?.data || []);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await employeeApi.create({
      ...form,
      departmentId: Number(form.departmentId),
      designationId: Number(form.designationId),
      grossSalary: Number(form.grossSalary),
    });
    setShowForm(false);
    load();
  }

  return (
    <>
      <PageMeta title="HRM — Employees" description="Employee management" />
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Employees</h2>

        <button onClick={() => setShowForm(!showForm)} className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
          {showForm ? "Cancel" : "+ New Employee"}
        </button>

        {showForm && (
          <form onSubmit={handleCreate} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-6 space-y-4">
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: "First Name", key: "firstName", req: true },
                { label: "Last Name", key: "lastName", req: true },
              ].map((f) => (
                <div key={f.key}>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{f.label}</label>
                  <input
                    value={(form as Record<string, unknown>)[f.key] as string}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    className="w-full border rounded px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required={f.req}
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Department</label>
                <select
                  value={form.departmentId}
                  onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                  className="w-full border rounded px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                >
                  <option value="">Select</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Designation</label>
                <select
                  value={form.designationId}
                  onChange={(e) => setForm({ ...form, designationId: e.target.value })}
                  className="w-full border rounded px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                >
                  <option value="">Select</option>
                  {designations.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              {[
                { label: "Date of Joining", key: "dateOfJoining", type: "date", req: true },
                { label: "Gender", key: "gender" },
                { label: "Phone", key: "phone" },
                { label: "Email", key: "email", type: "email" },
                { label: "Gross Salary ₹", key: "grossSalary", type: "number", req: true },
                { label: "PAN No", key: "panNo" },
                { label: "Aadhar No", key: "aadharNo" },
                { label: "Bank Name", key: "bankName" },
                { label: "Account No", key: "bankAccountNo" },
                { label: "IFSC Code", key: "ifscCode" },
              ].map((f) => (
                <div key={f.key}>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{f.label}</label>
                  <input
                    type={f.type || "text"}
                    value={(form as Record<string, unknown>)[f.key] as string}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    className="w-full border rounded px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required={f.req}
                  />
                </div>
              ))}
              <div className="flex items-center gap-4 col-span-2 pt-5">
                <label className="flex items-center gap-2 text-sm dark:text-gray-300">
                  <input type="checkbox" checked={form.pfApplicable} onChange={(e) => setForm({ ...form, pfApplicable: e.target.checked })} />
                  PF Applicable
                </label>
                <label className="flex items-center gap-2 text-sm dark:text-gray-300">
                  <input type="checkbox" checked={form.esiApplicable} onChange={(e) => setForm({ ...form, esiApplicable: e.target.checked })} />
                  ESI Applicable
                </label>
              </div>
            </div>
            <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm">
              Create Employee
            </button>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              <tr>
                {["Emp Code", "Name", "Department", "Designation", "DOJ", "Gross ₹", "PF", "ESI", "Status"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700">
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-3 py-2 font-mono">{emp.empCode}</td>
                  <td className="px-3 py-2">{emp.firstName} {emp.lastName}</td>
                  <td className="px-3 py-2">{emp.department?.name}</td>
                  <td className="px-3 py-2">{emp.designation?.name}</td>
                  <td className="px-3 py-2">{emp.dateOfJoining?.split("T")[0]}</td>
                  <td className="px-3 py-2 text-right">₹{Number(emp.grossSalary).toLocaleString()}</td>
                  <td className="px-3 py-2">{emp.pfApplicable ? "✓" : "—"}</td>
                  <td className="px-3 py-2">{emp.esiApplicable ? "✓" : "—"}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${statusColors[emp.status] || ""}`}>{emp.status}</span>
                  </td>
                </tr>
              ))}
              {employees.length === 0 && (
                <tr><td colSpan={9} className="text-center py-8 text-gray-400">No employees found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
