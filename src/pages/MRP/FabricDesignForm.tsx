import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { fabricDesignApi } from "../../api/mrp";
import PageMeta from "../../components/common/PageMeta";

export default function FabricDesignForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    designNo: "", orderId: 0, materialId: 0, fabricType: "", fabricWeight: 0, fabricWidth: 0,
    shrinkageWarp: 0, shrinkageWeft: 0, gsm: 0, construction: "", yarnCount: "", weaveType: "",
    finishType: "", colorFastness: "", remarks: ""
  });

  useEffect(() => {
    if (!isEdit) return;
    fabricDesignApi.get(Number(id)).then(r => {
      const d = r.data.data;
      setForm({
        designNo: d.designNo, orderId: d.orderId, materialId: d.materialId || 0,
        fabricType: d.fabricType || "", fabricWeight: Number(d.fabricWeight) || 0, fabricWidth: Number(d.fabricWidth) || 0,
        shrinkageWarp: Number(d.shrinkageWarp) || 0, shrinkageWeft: Number(d.shrinkageWeft) || 0,
        gsm: Number(d.gsm) || 0, construction: d.construction || "", yarnCount: d.yarnCount || "",
        weaveType: d.weaveType || "", finishType: d.finishType || "", colorFastness: d.colorFastness || "", remarks: d.remarks || ""
      });
    });
  }, [id, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { ...form, materialId: form.materialId || null };
      if (isEdit) await fabricDesignApi.update(Number(id), payload); else await fabricDesignApi.create(payload);
      navigate("/mrp/fabric-designs");
    } catch (err: any) { alert(err?.response?.data?.message || "Save failed"); } finally { setSaving(false); }
  };

  const field = (label: string, name: string, opts?: { type?: string; step?: string; span?: number }) => (
    <div className={opts?.span ? `col-span-${opts.span}` : ""}>
      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      <input type={opts?.type || "text"} step={opts?.step} value={(form as any)[name] || ""} onChange={e => setForm(f => ({ ...f, [name]: opts?.type === "number" ? Number(e.target.value) : e.target.value }))}
        className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 focus:border-brand-300 focus:outline-none" />
    </div>
  );

  return (
    <>
      <PageMeta title={`${isEdit ? "Edit" : "New"} Fabric Design | ERP TRACK`} description="Fabric Design Form" />
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between"><h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">{isEdit ? "Edit" : "New"} Fabric Design Sheet</h2>
          <button onClick={() => navigate("/mrp/fabric-designs")} className="text-sm text-brand-500 hover:underline">← Back</button></div>
        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
          <div className="grid grid-cols-3 gap-4">
            {field("Design No *", "designNo")}
            {field("Order ID *", "orderId", { type: "number" })}
            {field("Material ID", "materialId", { type: "number" })}
          </div>
          <div className="grid grid-cols-3 gap-4">
            {field("Fabric Type", "fabricType")}
            {field("Weight (g/m²)", "fabricWeight", { type: "number", step: "0.01" })}
            {field("Width (cm)", "fabricWidth", { type: "number", step: "0.1" })}
          </div>
          <div className="grid grid-cols-3 gap-4">
            {field("Shrinkage Warp %", "shrinkageWarp", { type: "number", step: "0.1" })}
            {field("Shrinkage Weft %", "shrinkageWeft", { type: "number", step: "0.1" })}
            {field("GSM", "gsm", { type: "number", step: "0.1" })}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {field("Construction", "construction")}
            {field("Yarn Count", "yarnCount")}
          </div>
          <div className="grid grid-cols-3 gap-4">
            {field("Weave Type", "weaveType")}
            {field("Finish Type", "finishType")}
            {field("Color Fastness", "colorFastness")}
          </div>
          {field("Remarks", "remarks")}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => navigate("/mrp/fabric-designs")} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium dark:border-gray-700">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-brand-500 px-6 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
          </div>
        </form>
      </div>
    </>
  );
}
