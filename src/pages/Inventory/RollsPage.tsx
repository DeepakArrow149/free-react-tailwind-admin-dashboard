import { useEffect, useState, useCallback } from "react";
import { rollApi } from "../../api/inventory";
import { toastSuccess, toastError } from "../../utils/toast";
import PageMeta from "../../components/common/PageMeta";
import { Pagination } from "../../components/table";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

interface R {
  id: number;
  rollNo: string;
  material?: { materialName: string };
  materialId?: number;
  warehouse?: { name: string };
  warehouseId?: number;
  grnId?: number;
  receivedLength?: number;
  receivedWidth?: number;
  actualLength?: number;
  shade?: string;
  shrinkagePct?: number;
  remarks?: string;
  createdAt?: string;
}

export default function RollsPage() {
  const [rolls, setRolls] = useState<R[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");

  // Form
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    rollNo: "", materialId: "", warehouseId: "", grnId: "",
    receivedLength: "", receivedWidth: "", actualLength: "",
    shade: "", shrinkagePct: "", remarks: "",
  });

  const fetchRolls = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await rollApi.list({ page, limit: 20, search: search || undefined });
      setRolls(resp.data ?? []);
      setTotalPages(resp.meta?.totalPages ?? 1);
    } catch { setRolls([]); }
    setLoading(false);
  }, [page, search]);

  useEffect(() => { fetchRolls(); }, [fetchRolls]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await rollApi.create({
        ...form,
        materialId: Number(form.materialId) || undefined,
        warehouseId: Number(form.warehouseId) || undefined,
        grnId: Number(form.grnId) || undefined,
        receivedLength: Number(form.receivedLength) || undefined,
        receivedWidth: Number(form.receivedWidth) || undefined,
        actualLength: Number(form.actualLength) || undefined,
        shrinkagePct: Number(form.shrinkagePct) || undefined,
      });
      setShowForm(false);
      setForm({ rollNo: "", materialId: "", warehouseId: "", grnId: "", receivedLength: "", receivedWidth: "", actualLength: "", shade: "", shrinkagePct: "", remarks: "" });
      fetchRolls();
      toastSuccess("Roll created");
    } catch (err) { toastError(err, "Failed to create roll"); }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this roll?")) return;
    try { await rollApi.delete(id); fetchRolls(); toastSuccess("Roll deleted"); }
    catch (err) { toastError(err, "Failed to delete"); }
  };

  const _columns = [
    { header: "Roll No", accessor: "rollNo" },
    { header: "Material", accessor: (r: R) => r.material?.materialName ?? r.materialId },
    { header: "Warehouse", accessor: (r: R) => r.warehouse?.name ?? r.warehouseId },
    { header: "Recv Length", accessor: "receivedLength" },
    { header: "Actual Length", accessor: "actualLength" },
    { header: "Shade", accessor: "shade" },
    { header: "Shrinkage %", accessor: "shrinkagePct" },
    { header: "Created", accessor: (r: R) => r.createdAt ? fmtDate(r.createdAt) : "-" },
    { header: "", accessor: (r: R) => (
      <button onClick={() => handleDelete(r.id)} className="text-red-600 hover:underline text-sm">Delete</button>
    )},
  ];
  void _columns;

  return (
    <>
      <PageMeta title="Fabric Rolls" description="Manage roll-wise fabric inventory" />
      <div className="p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Fabric Rolls</h1>
          <button onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            {showForm ? "Cancel" : "+ New Roll"}
          </button>
        </div>

        {/* Search */}
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search rolls…" aria-label="Search rolls" className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white w-64" />

        {/* Create Form */}
        {showForm && (
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-white dark:bg-gray-800 p-4 rounded-xl border dark:border-gray-700">
            {Object.entries(form).map(([key, val]) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 capitalize" htmlFor={`roll-${key}`}>{key.replace(/([A-Z])/g, " $1")}</label>
                <input id={`roll-${key}`} value={val} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                  placeholder={key.replace(/([A-Z])/g, " $1")}
                  className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              </div>
            ))}
            <div className="md:col-span-3 flex justify-end">
              <button type="submit" disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
                {saving ? "Saving…" : "Create Roll"}
              </button>
            </div>
          </form>
        )}

        {loading ? <p className="text-gray-500 dark:text-gray-400">Loading…</p> : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b dark:border-gray-700 text-left text-gray-500">
                    <th className="pb-2 pr-3">Roll No</th><th className="pb-2 pr-3">Material</th>
                    <th className="pb-2 pr-3">Warehouse</th><th className="pb-2 pr-3">Recv Length</th>
                    <th className="pb-2 pr-3">Actual Length</th><th className="pb-2 pr-3">Shade</th>
                    <th className="pb-2 pr-3">Shrinkage %</th><th className="pb-2 pr-3">Created</th>
                    <th className="pb-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {rolls.length === 0 ? (
                    <tr><td colSpan={9} className="py-8 text-center text-gray-400">No rolls found</td></tr>
                  ) : rolls.map((r: R) => (
                    <tr key={r.id} className="border-b dark:border-gray-800">
                      <td className="py-2 pr-3">{r.rollNo}</td>
                      <td className="py-2 pr-3">{r.material?.materialName ?? r.materialId}</td>
                      <td className="py-2 pr-3">{r.warehouse?.name ?? r.warehouseId}</td>
                      <td className="py-2 pr-3">{r.receivedLength}</td>
                      <td className="py-2 pr-3">{r.actualLength}</td>
                      <td className="py-2 pr-3">{r.shade}</td>
                      <td className="py-2 pr-3">{r.shrinkagePct}</td>
                      <td className="py-2 pr-3">{r.createdAt ? fmtDate(r.createdAt) : "-"}</td>
                      <td className="py-2">
                        <button onClick={() => handleDelete(r.id)} className="text-red-600 hover:underline text-sm">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3">
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} pageSize={20} />
            </div>
          </>
        )}
      </div>
    </>
  );
}
