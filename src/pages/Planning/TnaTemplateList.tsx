import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router";
import { tnaTemplateApi, type TnaTemplate } from "../../api/planning";
import PageMeta from "../../components/common/PageMeta";
import TableSkeleton from '@/components/common/TableSkeleton';
import { formatDateShort as formatDate } from '@/core/utils';

export default function TnaTemplateList() {
  const [templates, setTemplates] = useState<TnaTemplate[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await tnaTemplateApi.list({ search: search || undefined });
      setTemplates(resp.data || []);
    } catch (err) {
      console.error("Failed to fetch templates:", err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this template?")) return;
    try { await tnaTemplateApi.delete(id); fetchTemplates(); } catch (err) { console.error(err); }
  };

  return (
    <>
      <PageMeta title="T&A Templates | STITCH ERP" description="T&A template management" />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">T&A Templates</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Define milestone templates for Time & Action calendars
            </p>
          </div>
          <Link
            to="/planning/tna-templates/new"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 transition"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            New Template
          </Link>
        </div>

        {/* Search */}
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm dark:text-white focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Table */}
        {loading ? <TableSkeleton rows={5} cols={4} /> : (
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Template Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Milestones</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Created</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {templates.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No templates found</td></tr>
              ) : templates.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                  <td className="px-4 py-3">
                    <Link to={`/planning/tna-templates/${t.id}`} className="font-medium text-brand-600 dark:text-brand-400 hover:underline">
                      {t.templateName}
                    </Link>
                    {t.description && <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{t.totalMilestones}</td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(t.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link to={`/planning/tna-templates/${t.id}`} className="text-xs text-brand-600 hover:underline">Edit</Link>
                      <button onClick={() => handleDelete(t.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>
    </>
  );
}
