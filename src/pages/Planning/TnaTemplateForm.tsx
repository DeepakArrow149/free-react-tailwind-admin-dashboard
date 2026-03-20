import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { tnaTemplateApi, type TnaTemplate, type TnaTemplateItem } from "../../api/planning";
import PageMeta from "../../components/common/PageMeta";

interface MilestoneRow {
  milestoneCode: string;
  milestoneName: string;
  daysBeforeShipment: number;
  isCritical: boolean;
  sequence: number;
  responsibleRole: string;
}

const emptyMilestone = (): MilestoneRow => ({
  milestoneCode: "",
  milestoneName: "",
  daysBeforeShipment: 0,
  isCritical: false,
  sequence: 0,
  responsibleRole: "",
});

export default function TnaTemplateForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [templateName, setTemplateName] = useState("");
  const [description, setDescription] = useState("");
  const [milestones, setMilestones] = useState<MilestoneRow[]>([emptyMilestone()]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    tnaTemplateApi.get(Number(id)).then((resp) => {
      const t: TnaTemplate = resp.data;
      setTemplateName(t.templateName);
      setDescription(t.description || "");
      if (t.items && t.items.length > 0) {
        setMilestones(
          t.items.map((it: TnaTemplateItem) => ({
            milestoneCode: it.milestoneCode || "",
            milestoneName: it.milestoneName,
            daysBeforeShipment: it.daysBeforeShipment,
            isCritical: it.isCritical ?? false,
            sequence: it.sequence,
            responsibleRole: it.responsibleRole || "",
          }))
        );
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  const addMilestone = () => {
    setMilestones((prev) => [...prev, { ...emptyMilestone(), sequence: prev.length + 1 }]);
  };

  const removeMilestone = (idx: number) => {
    setMilestones((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateMilestone = (idx: number, field: keyof MilestoneRow, value: string | number | boolean) => {
    setMilestones((prev) => prev.map((m, i) => (i === idx ? { ...m, [field]: value } : m)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        templateName,
        description: description || undefined,
        items: milestones.map((m, i) => ({ ...m, sequence: m.sequence || i + 1 })),
      };
      if (isEdit) {
        await tnaTemplateApi.update(Number(id), payload);
      } else {
        await tnaTemplateApi.create(payload);
      }
      navigate("/planning/tna-templates");
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-gray-500">Loading...</div>;

  return (
    <>
      <PageMeta title={`${isEdit ? "Edit" : "New"} T&A Template | STITCH ERP`} description="T&A template form" />
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isEdit ? "Edit Template" : "New T&A Template"}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header fields */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Template Name *</label>
              <input
                required
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2 text-sm dark:text-white focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2 text-sm dark:text-white focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Milestones */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Milestones</h2>
              <button type="button" onClick={addMilestone} className="text-sm text-brand-600 hover:text-brand-700 font-medium">+ Add Milestone</button>
            </div>

            <div className="space-y-3">
              {milestones.map((m, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs text-gray-500 mb-1">Milestone Name *</label>
                      <input
                        required
                        value={m.milestoneName}
                        onChange={(e) => updateMilestone(i, "milestoneName", e.target.value)}
                        className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Days Before Shipment *</label>
                      <input
                        type="number"
                        required
                        value={m.daysBeforeShipment}
                        onChange={(e) => updateMilestone(i, "daysBeforeShipment", parseInt(e.target.value) || 0)}
                        className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Responsible</label>
                      <input
                        value={m.responsibleRole}
                        onChange={(e) => updateMilestone(i, "responsibleRole", e.target.value)}
                        placeholder="e.g. Merchandiser"
                        className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-2 pt-5">
                    <label className="flex items-center gap-1.5 text-xs text-gray-500">
                      <input type="checkbox" checked={m.isCritical} onChange={(e) => updateMilestone(i, "isCritical", e.target.checked)} className="rounded" />
                      Critical
                    </label>
                    {milestones.length > 1 && (
                      <button type="button" onClick={() => removeMilestone(i)} className="text-red-400 hover:text-red-600 text-xs">Remove</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3">
            <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50 transition">
              {saving ? "Saving..." : isEdit ? "Update Template" : "Create Template"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
