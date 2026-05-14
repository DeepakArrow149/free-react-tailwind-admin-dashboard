import { useEffect, useState, useCallback } from "react";
import { bulletinApi } from "../../api/production";
import { masterApi, type StyleMaster } from "../../api/master";
import { toastSuccess, toastError } from "../../utils/toast";
import PageMeta from "../../components/common/PageMeta";
import { Modal } from "../../components/ui/Modal";

interface BulletinRecord {
  id: number;
  bulletinNo: string;
  style?: { styleNo: string };
  styleId: number;
  totalSam?: number;
  targetPerHour?: number;
  status: string;
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  APPROVED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
};

export default function OperationBulletinPage() {
  // ── Bulletins ──
  const [bulletins, setBulletins] = useState<BulletinRecord[]>([]);
  const [loadingBul, setLoadingBul] = useState(false);
  const [styleFilter, setStyleFilter] = useState("");

  // ── Import from Style ──
  const [showImportModal, setShowImportModal] = useState(false);
  const [styles, setStyles] = useState<StyleMaster[]>([]);
  const [loadingStyles, setLoadingStyles] = useState(false);
  const [selectedStyleId, setSelectedStyleId] = useState<number | "">("");
  const [importManpower, setImportManpower] = useState(0);
  const [importMachines, setImportMachines] = useState(0);
  const [importing, setImporting] = useState(false);

  const fetchBulletins = useCallback(async () => {
    setLoadingBul(true);
    try {
      const resp = await bulletinApi.list({ styleId: styleFilter || undefined });
      setBulletins(resp.data ?? resp ?? []);
    } catch { setBulletins([]); }
    setLoadingBul(false);
  }, [styleFilter]);

  useEffect(() => { fetchBulletins(); }, [fetchBulletins]);

  const handleApprove = async (id: number) => {
    try { await bulletinApi.approve(id); fetchBulletins(); toastSuccess("Bulletin approved"); } catch (e) { toastError(e, "Failed to approve"); }
  };

  const openImportModal = async () => {
    setShowImportModal(true);
    setSelectedStyleId("");
    setImportManpower(0);
    setImportMachines(0);
    if (styles.length === 0) {
      setLoadingStyles(true);
      try {
        const res = await masterApi.listStyles({ limit: 500 });
        const list = res.data?.data ?? [];
        // Only show styles that have operations defined (totalOperations > 0)
        setStyles(list.filter((s: StyleMaster) => (s.totalOperations ?? 0) > 0));
      } catch { setStyles([]); }
      setLoadingStyles(false);
    }
  };

  const handleImportFromStyle = async () => {
    if (!selectedStyleId) return;
    setImporting(true);
    try {
      await bulletinApi.generateFromStyle({
        styleId: Number(selectedStyleId),
        manpower: importManpower || 0,
        machines: importMachines || 0,
      });
      toastSuccess("Bulletin generated from style operations");
      setShowImportModal(false);
      fetchBulletins();
    } catch (e) { toastError(e, "Failed to generate bulletin"); }
    setImporting(false);
  };

  const selectedStyleData = styles.find((s) => s.id === Number(selectedStyleId));

  return (
    <>
      <PageMeta title="Operation Bulletins" description="Manage operation bulletins for production" />
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Operation Bulletins</h1>

        <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <input placeholder="Filter by Style ID" value={styleFilter} onChange={e => setStyleFilter(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white w-48" />
              </div>
              <button
                onClick={openImportModal}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Import from Style
              </button>
            </div>

            {loadingBul ? (
              <p className="text-gray-500 dark:text-gray-400">Loading…</p>
            ) : (
              <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Bulletin No</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Style</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total SAM</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Target/Hr</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {bulletins.map((b) => (
                      <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{b.bulletinNo}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{b.style?.styleNo ?? b.styleId}</td>
                        <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{b.totalSam?.toFixed(2) ?? "—"}</td>
                        <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{b.targetPerHour ?? "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[b.status] ?? statusColors.DRAFT}`}>{b.status}</span>
                        </td>
                        <td className="px-4 py-3">
                          {b.status === "DRAFT" && (
                            <button onClick={() => handleApprove(b.id)} className="text-xs text-blue-600 hover:underline">Approve</button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {bulletins.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">No bulletins found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
        </div>

        {/* ── Import from Style Modal ── */}
        <Modal isOpen={showImportModal} onClose={() => setShowImportModal(false)} title="Import Bulletin from Style" size="md">
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Select a style with defined operations to auto-generate an Operation Bulletin.
            </p>

            {/* Style Selector */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Style *</label>
              {loadingStyles ? (
                <p className="text-sm text-gray-400">Loading styles…</p>
              ) : (
                <select
                  className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  value={selectedStyleId}
                  onChange={(e) => setSelectedStyleId(e.target.value ? Number(e.target.value) : "")}
                  title="Select a style"
                >
                  <option value="">-- Select Style --</option>
                  {styles.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.styleNo} — {s.styleName} ({s.totalOperations ?? 0} ops, SAM: {Number(s.totalSam ?? 0).toFixed(2)})
                    </option>
                  ))}
                </select>
              )}
              {styles.length === 0 && !loadingStyles && (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">No styles with operations found. Define operations in Style Master first.</p>
              )}
            </div>

            {/* Preview */}
            {selectedStyleData && (
              <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-900/10 dark:text-blue-300">
                <strong>{selectedStyleData.styleNo}</strong> — {selectedStyleData.totalOperations ?? 0} operations, Total SAM: {Number(selectedStyleData.totalSam ?? 0).toFixed(3)}
              </div>
            )}

            {/* Manpower / Machines */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Manpower</label>
                <input type="number" min={0} value={importManpower || ""} onChange={(e) => setImportManpower(parseInt(e.target.value) || 0)}
                  placeholder="0" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Machines</label>
                <input type="number" min={0} value={importMachines || ""} onChange={(e) => setImportMachines(parseInt(e.target.value) || 0)}
                  placeholder="0" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 border-t pt-4 dark:border-gray-700">
              <button onClick={() => setShowImportModal(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800">
                Cancel
              </button>
              <button onClick={handleImportFromStyle} disabled={!selectedStyleId || importing}
                className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                {importing ? "Generating…" : "Generate Bulletin"}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </>
  );
}
