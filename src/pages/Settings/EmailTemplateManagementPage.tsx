import { useState, useCallback, useEffect } from 'react';
import { api } from '../../core/api';
import { apiRoutes } from '../../core/api/apiRoutes';
import PageMeta from '../../components/common/PageMeta';
import { toast } from 'sonner';

interface EmailTemplate {
  id: number;
  templateCode: string;
  templateName: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  variables?: string[];
  eventTrigger?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const EVENT_TRIGGERS = [
  'ORDER_CONFIRMED', 'PO_APPROVED', 'GRN_RECEIVED', 'SHIPMENT_DISPATCHED',
  'INVOICE_GENERATED', 'APPROVAL_PENDING', 'LC_EXPIRY_ALERT', 'PASSWORD_RESET',
  'PAYMENT_RECEIVED', 'QUALITY_HOLD',
];

const emptyForm = {
  templateCode: '',
  templateName: '',
  subject: '',
  bodyHtml: '',
  bodyText: '',
  variables: '',
  eventTrigger: '',
  isActive: true,
};

export default function EmailTemplateManagementPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [previewId, setPreviewId] = useState<number | null>(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(apiRoutes.admin.emailTemplates);
      const body = res?.data as { data?: EmailTemplate[] } | EmailTemplate[] | undefined;
      setTemplates(Array.isArray(body) ? body : body?.data || []);
    } catch {
      toast.error('Failed to load email templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (tmpl: EmailTemplate) => {
    setEditingId(tmpl.id);
    setForm({
      templateCode: tmpl.templateCode,
      templateName: tmpl.templateName,
      subject: tmpl.subject,
      bodyHtml: tmpl.bodyHtml,
      bodyText: tmpl.bodyText || '',
      variables: Array.isArray(tmpl.variables) ? tmpl.variables.join(', ') : '',
      eventTrigger: tmpl.eventTrigger || '',
      isActive: tmpl.isActive,
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.templateCode || !form.templateName || !form.subject || !form.bodyHtml) {
      toast.error('Code, name, subject, and body are required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        templateCode: form.templateCode,
        templateName: form.templateName,
        subject: form.subject,
        bodyHtml: form.bodyHtml,
        bodyText: form.bodyText || null,
        variables: form.variables ? form.variables.split(',').map((v: string) => v.trim()).filter(Boolean) : [],
        eventTrigger: form.eventTrigger || null,
        isActive: form.isActive,
      };

      if (editingId) {
        await api.put(apiRoutes.admin.emailTemplateDetail(editingId), payload);
        toast.success('Template updated');
      } else {
        await api.post(apiRoutes.admin.emailTemplates, payload);
        toast.success('Template created');
      }
      setShowForm(false);
      fetchTemplates();
    } catch (err: unknown) {
      const axErr = err as { response?: { data?: { message?: string } } };
      toast.error(axErr?.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this email template?')) return;
    try {
      await api.delete(apiRoutes.admin.emailTemplateDetail(id));
      toast.success('Template deleted');
      fetchTemplates();
    } catch {
      toast.error('Delete failed');
    }
  };

  const previewTemplate = templates.find((t) => t.id === previewId);

  return (
    <>
      <PageMeta title="Email Templates" description="Manage email notification templates" />
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Email Templates</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Manage templates for automated email notifications
            </p>
          </div>
          <button
            onClick={openCreate}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + New Template
          </button>
        </div>

        {/* Template List */}
        {loading ? (
          <div className="text-center py-10 text-gray-500">Loading…</div>
        ) : templates.length === 0 ? (
          <div className="text-center py-10 text-gray-500">No email templates found. Create one to get started.</div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3">Active</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {templates.map((tmpl) => (
                  <tr key={tmpl.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 font-mono text-xs">{tmpl.templateCode}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{tmpl.templateName}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-xs truncate">{tmpl.subject}</td>
                    <td className="px-4 py-3">
                      {tmpl.eventTrigger ? (
                        <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                          {tmpl.eventTrigger}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        tmpl.isActive
                          ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                      }`}>
                        {tmpl.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button onClick={() => setPreviewId(tmpl.id)} className="text-blue-600 hover:underline text-xs">Preview</button>
                      <button onClick={() => openEdit(tmpl)} className="text-amber-600 hover:underline text-xs">Edit</button>
                      <button onClick={() => handleDelete(tmpl.id)} className="text-red-600 hover:underline text-xs">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Preview Modal */}
        {previewTemplate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setPreviewId(null)}>
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Preview: {previewTemplate.templateName}</h3>
                <button onClick={() => setPreviewId(null)} className="text-gray-500 hover:text-gray-700">✕</button>
              </div>
              <div className="space-y-3 text-sm">
                <div><strong>Subject:</strong> {previewTemplate.subject}</div>
                {previewTemplate.variables && previewTemplate.variables.length > 0 && (
                  <div><strong>Variables:</strong> {previewTemplate.variables.map((v) => `{{${v}}}`).join(', ')}</div>
                )}
                <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                  <div dangerouslySetInnerHTML={{ __html: previewTemplate.bodyHtml }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create / Edit Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowForm(false)}>
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {editingId ? 'Edit Template' : 'New Email Template'}
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Template Code *</label>
                    <input
                      value={form.templateCode}
                      onChange={(e) => setForm({ ...form, templateCode: e.target.value })}
                      disabled={!!editingId}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm disabled:opacity-50"
                      placeholder="ORDER_CONFIRMED"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Template Name *</label>
                    <input
                      value={form.templateName}
                      onChange={(e) => setForm({ ...form, templateName: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                      placeholder="Order Confirmation"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject *</label>
                  <input
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                    placeholder="Order {{orderNo}} Confirmed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Body HTML *</label>
                  <textarea
                    value={form.bodyHtml}
                    onChange={(e) => setForm({ ...form, bodyHtml: e.target.value })}
                    rows={8}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-mono"
                    placeholder="<h2>Order Confirmed</h2><p>Dear {{buyerName}},...</p>"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Variables (comma-separated)</label>
                    <input
                      value={form.variables}
                      onChange={(e) => setForm({ ...form, variables: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                      placeholder="orderNo, buyerName, date"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Event Trigger</label>
                    <select
                      value={form.eventTrigger}
                      onChange={(e) => setForm({ ...form, eventTrigger: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                    >
                      <option value="">None (manual)</option>
                      {EVENT_TRIGGERS.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="rounded"
                  />
                  <label className="text-sm text-gray-700 dark:text-gray-300">Active</label>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => setShowForm(false)}
                    className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={saving}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : editingId ? 'Update' : 'Create'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
