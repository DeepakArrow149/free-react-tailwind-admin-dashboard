import { useState } from "react";
import PageMeta from "@/components/common/PageMeta";
import {
  useChecklists,
  useCreateChecklist,
  useUpdateChecklist,
  useDeleteChecklist,
} from "@/hooks/useMaintenance";
import type { MaintenanceChecklist } from "@/api/maintenance";

interface CheckItem {
  label: string;
  type: "boolean" | "text" | "number";
  required: boolean;
}

export default function ChecklistsPage() {
  const { data: listsRaw, isLoading } = useChecklists();
  const checklists: MaintenanceChecklist[] = Array.isArray(listsRaw) ? listsRaw : [];
  const createChecklist = useCreateChecklist();
  const updateChecklist = useUpdateChecklist();
  const deleteChecklist = useDeleteChecklist();

  const [tab, setTab] = useState<"list" | "form">("list");
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [machineTypeId, setMachineTypeId] = useState("");
  const [items, setItems] = useState<CheckItem[]>([{ label: "", type: "boolean", required: true }]);

  const tabs: { key: typeof tab; label: string }[] = [
    { key: "list", label: "Checklists" },
    { key: "form", label: editId ? "Edit Checklist" : "New Checklist" },
  ];

  // ── Items helpers ──
  const addItem = () => setItems(prev => [...prev, { label: "", type: "boolean", required: true }]);
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: keyof CheckItem, value: string | boolean) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  };

  // ── Form submit ──
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = items.filter(i => i.label.trim());
    if (!name.trim() || validItems.length === 0) return;

    const payload = {
      name: name.trim(),
      machineTypeId: machineTypeId ? Number(machineTypeId) : undefined,
      items: validItems,
    };

    if (editId) {
      updateChecklist.mutate({ id: editId, data: payload }, {
        onSuccess: () => resetForm(),
      });
    } else {
      createChecklist.mutate(payload, {
        onSuccess: () => resetForm(),
      });
    }
  };

  const resetForm = () => {
    setEditId(null);
    setName("");
    setMachineTypeId("");
    setItems([{ label: "", type: "boolean", required: true }]);
    setTab("list");
  };

  const handleEdit = (cl: MaintenanceChecklist) => {
    setEditId(cl.id);
    setName(cl.name);
    setMachineTypeId(cl.machineTypeId?.toString() ?? "");
    setItems(
      Array.isArray(cl.items) && cl.items.length
        ? (cl.items as CheckItem[])
        : [{ label: "", type: "boolean", required: true }]
    );
    setTab("form");
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this checklist?")) deleteChecklist.mutate(id);
  };

  return (
    <>
      <PageMeta title="Maintenance Checklists" description="Manage inspection checklists" />
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => { if (t.key === "form" && !editId) { resetForm(); setTab("form"); } else setTab(t.key); }}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── LIST TAB ── */}
        {tab === "list" && (
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">All Checklists</h3>
              <button
                onClick={() => { resetForm(); setTab("form"); }}
                className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm font-medium"
              >
                + New Checklist
              </button>
            </div>

            {isLoading ? <p className="text-sm text-gray-500">Loading…</p> : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-xs font-medium text-gray-500 uppercase">
                    <th className="pb-2 pr-3">Name</th>
                    <th className="pb-2 pr-3">Machine Type</th>
                    <th className="pb-2 pr-3">Items</th>
                    <th className="pb-2 pr-3">Updated</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {checklists.map(cl => (
                    <tr key={cl.id} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-2 pr-3 font-medium">{cl.name}</td>
                      <td className="py-2 pr-3 text-xs">{cl.machineTypeId ?? "—"}</td>
                      <td className="py-2 pr-3 text-xs">{Array.isArray(cl.items) ? cl.items.length : 0} items</td>
                      <td className="py-2 pr-3 text-xs text-gray-500">
                        {cl.updatedAt ? new Date(cl.updatedAt).toLocaleDateString() : "—"}
                      </td>
                      <td className="py-2 flex gap-2">
                        <button onClick={() => handleEdit(cl)} className="text-blue-600 hover:underline text-xs">Edit</button>
                        <button onClick={() => handleDelete(cl.id)} className="text-red-600 hover:underline text-xs">Del</button>
                      </td>
                    </tr>
                  ))}
                  {checklists.length === 0 && (
                    <tr><td colSpan={5} className="py-6 text-center text-gray-400">No checklists yet. Create one to get started.</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── FORM TAB ── */}
        {tab === "form" && (
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white/90">
              {editId ? "Edit Checklist" : "New Checklist"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
              {/* Basic info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Checklist Name *</label>
                  <input
                    className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Machine Type ID</label>
                  <input
                    className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700"
                    value={machineTypeId}
                    onChange={e => setMachineTypeId(e.target.value)}
                    type="number"
                    placeholder="Optional"
                  />
                </div>
              </div>

              {/* Check Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Check Items *</label>
                  <button type="button" onClick={addItem} className="text-xs text-blue-600 font-medium hover:underline">
                    + Add Item
                  </button>
                </div>

                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded border border-gray-100 dark:border-gray-700">
                      <span className="text-xs font-mono text-gray-400 w-5">{idx + 1}</span>
                      <input
                        className="flex-1 border rounded px-2 py-1 text-sm dark:bg-gray-800 dark:border-gray-600"
                        placeholder="Check item label"
                        value={item.label}
                        onChange={e => updateItem(idx, "label", e.target.value)}
                      />
                      <select
                        className="border rounded px-2 py-1 text-xs dark:bg-gray-800 dark:border-gray-600"
                        value={item.type}
                        onChange={e => updateItem(idx, "type", e.target.value)}
                      >
                        <option value="boolean">Yes/No</option>
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                      </select>
                      <label className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300">
                        <input
                          type="checkbox"
                          checked={item.required}
                          onChange={e => updateItem(idx, "required", e.target.checked)}
                          className="rounded"
                        />
                        Req
                      </label>
                      {items.length > 1 && (
                        <button type="button" onClick={() => removeItem(idx)} className="text-red-500 text-xs hover:text-red-700">
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={createChecklist.isPending || updateChecklist.isPending}
                  className="px-5 py-2 bg-blue-600 text-white rounded text-sm font-medium disabled:opacity-50"
                >
                  {editId ? "Update Checklist" : "Create Checklist"}
                </button>
                <button type="button" onClick={resetForm} className="px-4 py-2 border rounded text-sm dark:border-gray-600 dark:text-gray-300">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </>
  );
}
