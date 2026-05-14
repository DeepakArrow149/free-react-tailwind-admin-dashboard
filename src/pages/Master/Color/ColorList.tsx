import { useEffect, useState } from "react";
import { masterApi, type Color } from "../../../api/master";
import PageMeta from "../../../components/common/PageMeta";
import { PaginatedTable } from "@/components/table";

export default function ColorList() {
  const [colors, setColors] = useState<Color[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ colorCode: "", colorName: "", hexValue: "#000000" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function fetchColors() {
    setLoading(true);
    try {
      const { data: resp } = await masterApi.listColors();
      setColors(resp.data || []);
    } catch (err) {
      console.error("Failed to fetch colors:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchColors();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.colorCode.trim() || !form.colorName.trim()) {
      setError("Code and Name are required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await masterApi.createColor(form);
      setForm({ colorCode: "", colorName: "", hexValue: "#000000" });
      setShowForm(false);
      fetchColors();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr?.response?.data?.message || "Failed to save color");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageMeta title="Colors | ERP TRACK" description="Manage color master" />
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3 p-5 lg:p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Color Master</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{colors.length} color(s)</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600"
          >
            {showForm ? (
              "Cancel"
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M10 4.167v11.666M4.167 10h11.666" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                Add Color
              </>
            )}
          </button>
        </div>

        {/* Inline Add Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Code *</label>
                <input
                  type="text"
                  value={form.colorCode}
                  onChange={(e) => setForm({ ...form, colorCode: e.target.value.toUpperCase() })}
                  placeholder="e.g. BLK"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white focus:border-brand-500 focus:ring-brand-500"
                  maxLength={10}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Name *</label>
                <input
                  type="text"
                  value={form.colorName}
                  onChange={(e) => setForm({ ...form, colorName: e.target.value })}
                  placeholder="e.g. Black"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white focus:border-brand-500 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Hex Value</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={form.hexValue}
                    onChange={(e) => setForm({ ...form, hexValue: e.target.value })}
                    className="h-9.5 w-12 cursor-pointer rounded border border-gray-300 dark:border-gray-600"
                  />
                  <input
                    type="text"
                    value={form.hexValue}
                    onChange={(e) => setForm({ ...form, hexValue: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white focus:border-brand-500 focus:ring-brand-500"
                    maxLength={7}
                  />
                </div>
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
            {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
          </form>
        )}

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          </div>
        ) : colors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <svg className="mb-4 h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
            <p className="text-sm">No colors added yet</p>
          </div>
        ) : (
          <PaginatedTable data={colors} pageSize={20}>
            {(pageData) => (
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="py-3 px-4 text-left font-medium text-gray-500 dark:text-gray-400">Code</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-500 dark:text-gray-400">Name</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-500 dark:text-gray-400">Color</th>
                  <th className="py-3 px-4 text-left font-medium text-gray-500 dark:text-gray-400">Hex</th>
                </tr>
              </thead>
              <tbody>
                {pageData.map((c) => (
                  <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/2">
                    <td className="py-3 px-4 font-medium text-gray-800 dark:text-white/90">{c.colorCode}</td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{c.colorName}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-6 w-6 rounded-full border border-gray-200 dark:border-gray-600"
                          style={{ backgroundColor: c.hexValue || "#ccc" }}
                        />
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-gray-500">{c.hexValue || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
            )}
          </PaginatedTable>
        )}
      </div>
    </>
  );
}
