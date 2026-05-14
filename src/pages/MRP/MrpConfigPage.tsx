import { useEffect, useState, useCallback } from "react";
import { mrpConfigApi } from "../../api/mrp";
import PageMeta from "../../components/common/PageMeta";
import { toast } from "sonner";

interface ConfigEntry { id: number; configKey: string; configValue: string; description: string }

export default function MrpConfigPage() {
  const [configs, setConfigs] = useState<ConfigEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKey, setNewKey] = useState("");
  const [newVal, setNewVal] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const fetch = useCallback(async () => {
    setLoading(true);
    try { const { data: resp } = await mrpConfigApi.list(); setConfigs(resp.data || []); } catch (err) { console.error(err); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleUpsert = async () => {
    if (!newKey || !newVal) { toast.error("Key and value required"); return; }
    try { await mrpConfigApi.upsert({ configKey: newKey, configValue: newVal, description: newDesc }); toast.success("Saved"); setNewKey(""); setNewVal(""); setNewDesc(""); fetch(); }
    catch (err: any) { toast.error(err?.response?.data?.message || "Failed"); }
  };

  const handleDelete = async (key: string) => { if (!confirm(`Delete config "${key}"?`)) return; try { await mrpConfigApi.delete(key); toast.success("Deleted"); fetch(); } catch { toast.error("Failed"); } };

  return (
    <>
      <PageMeta title="MRP Configuration | ERP TRACK" description="MRP system configuration" />
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">MRP Configuration</h2>

        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
          <h3 className="mb-3 font-medium text-gray-700 dark:text-gray-300">Add / Update Config</h3>
          <div className="grid grid-cols-12 gap-3">
            <input placeholder="Config Key" value={newKey} onChange={e => setNewKey(e.target.value)} className="col-span-3 h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700" />
            <input placeholder="Value" value={newVal} onChange={e => setNewVal(e.target.value)} className="col-span-3 h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700" />
            <input placeholder="Description (optional)" value={newDesc} onChange={e => setNewDesc(e.target.value)} className="col-span-4 h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700" />
            <button onClick={handleUpsert} className="col-span-2 h-10 rounded-lg bg-brand-500 text-sm font-medium text-white hover:bg-brand-600">Save</button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
          {loading ? <p className="p-6 text-center text-gray-400">Loading...</p> : (
            <table className="w-full table-auto text-sm">
              <thead><tr className="border-b border-gray-100 dark:border-gray-800">
                {["Key", "Value", "Description", "Updated", "Actions"].map(h => <th key={h} className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">{h}</th>)}
              </tr></thead>
              <tbody>
                {configs.length === 0 ? <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">No configuration entries</td></tr>
                : configs.map(c => (
                  <tr key={c.id} className="border-b border-gray-50 dark:border-gray-800">
                    <td className="px-4 py-3 font-mono text-sm font-medium text-brand-600">{c.configKey}</td>
                    <td className="px-4 py-3 font-mono">{c.configValue}</td>
                    <td className="px-4 py-3 text-gray-500">{c.description || '-'}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{new Date((c as any).updatedAt).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => { setNewKey(c.configKey); setNewVal(c.configValue); setNewDesc(c.description); }} className="text-brand-500 text-xs">Edit</button>
                        <button onClick={() => handleDelete(c.configKey)} className="text-red-500 text-xs">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
