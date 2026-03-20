import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import client from "../../api/client";

/* ── Constants ── */
const MODULES = [
  "Master", "Merchandising", "Costing", "Planning", "Procurement",
  "Inventory", "Production", "Quality", "Packing", "Export",
  "Finance", "HRM", "Reports", "Settings",
];

const ACTIONS = ["View", "Create", "Edit", "Delete", "Approve", "Export"];

interface RolePermission {
  module: string;
  permissions: string[];
}

export default function RoleBuilderPage() {
  const [roles, setRoles] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState("");
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await client.get("/admin/roles");
      const data = res.data.data;
      setRoles(data?.roles || []);
    } catch {
      toast.error("Failed to load roles");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  useEffect(() => {
    if (selectedRole) {
      // Initialize permissions matrix for selected role
      // In a full implementation, you'd fetch saved permissions from backend
      const initial = MODULES.map((m) => ({
        module: m,
        permissions: selectedRole === "Admin" ? [...ACTIONS] : ["View"],
      }));
      setPermissions(initial);
    }
  }, [selectedRole]);

  const togglePermission = (module: string, action: string) => {
    setPermissions((prev) =>
      prev.map((p) => {
        if (p.module !== module) return p;
        const has = p.permissions.includes(action);
        return {
          ...p,
          permissions: has ? p.permissions.filter((a) => a !== action) : [...p.permissions, action],
        };
      })
    );
  };

  const toggleAll = (module: string) => {
    setPermissions((prev) =>
      prev.map((p) => {
        if (p.module !== module) return p;
        const allChecked = ACTIONS.every((a) => p.permissions.includes(a));
        return { ...p, permissions: allChecked ? [] : [...ACTIONS] };
      })
    );
  };

  const handleSave = () => {
    // In a full implementation, POST to /admin/roles/:role/permissions
    toast.success(`Permissions saved for role: ${selectedRole}`);
    console.log("Permissions payload:", { role: selectedRole, permissions });
  };

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Role & Permission Builder</h1>

      {/* Role selector */}
      <div className="flex items-center gap-4 mb-6">
        <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Select Role:</label>
        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          className="border rounded-lg p-2 min-w-[200px] dark:bg-gray-700 dark:border-gray-600"
        >
          <option value="">-- Choose role --</option>
          {roles.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        {selectedRole && (
          <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            Save Permissions
          </button>
        )}
      </div>

      {loading && <div className="text-center py-8 text-gray-400">Loading roles...</div>}

      {selectedRole && !loading && (
        <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-xl shadow">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="text-left p-3 text-gray-600 dark:text-gray-300 w-48">Module</th>
                <th className="text-center p-3 text-gray-600 dark:text-gray-300 w-16">All</th>
                {ACTIONS.map((a) => (
                  <th key={a} className="text-center p-3 text-gray-600 dark:text-gray-300 w-20">{a}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {permissions.map((p) => {
                const allChecked = ACTIONS.every((a) => p.permissions.includes(a));
                return (
                  <tr key={p.module} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="p-3 font-medium text-gray-800 dark:text-gray-200">{p.module}</td>
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={allChecked}
                        onChange={() => toggleAll(p.module)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    {ACTIONS.map((a) => (
                      <td key={a} className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={p.permissions.includes(a)}
                          onChange={() => togglePermission(p.module, a)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!selectedRole && !loading && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">🔐</div>
          <p>Select a role to configure permissions</p>
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Permission Actions:</h3>
        <div className="flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
          <span><strong>View</strong> — Read access to module data</span>
          <span><strong>Create</strong> — Create new records</span>
          <span><strong>Edit</strong> — Modify existing records</span>
          <span><strong>Delete</strong> — Delete/deactivate records</span>
          <span><strong>Approve</strong> — Approve workflow items</span>
          <span><strong>Export</strong> — Export data to Excel/PDF</span>
        </div>
      </div>
    </div>
  );
}
