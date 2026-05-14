import { useState, useEffect, useCallback } from "react";
import { toast as sonnerToast } from "sonner";
import PageMeta from "../../components/common/PageMeta";
import { useAuthStore } from "../../store/authStore";
import { api, apiRoutes } from "../../core/api";

/* ── Types ── */
type GeneralSettings = { companyName: string; currency: string; fyStart: string; dateFormat: string };
const defaults: GeneralSettings = { companyName: "ERP TRACK", currency: "USD", fyStart: "April", dateFormat: "DD/MM/YYYY" };

/* ── Number Series Sub-Component ── */
interface NumberSeriesRow {
  id: number;
  module: string;
  prefix: string;
  separator: string;
  padding: number;
  currentValue: number;
  resetFrequency: string;
}

function NumberSeriesTable() {
  const [series, setSeries] = useState<NumberSeriesRow[]>([]);
  const [nsLoading, setNsLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ prefix: "", separator: "-", padding: 4 });
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ module: "", prefix: "", separator: "-", padding: 4, resetFrequency: "YEARLY" });

  const fetchSeries = useCallback(async () => {
    setNsLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res: any = await api.get(apiRoutes.admin.numberSeries);
      const d = res.data ?? res;
      setSeries(d?.numberSeries || d || []);
    } catch { /* silent */ }
    finally { setNsLoading(false); }
  }, []);

  useEffect(() => { fetchSeries(); }, [fetchSeries]);

  const startEdit = (row: NumberSeriesRow) => {
    setEditingId(row.id);
    setEditForm({ prefix: row.prefix, separator: row.separator, padding: row.padding });
  };

  const saveEdit = async (id: number) => {
    try {
      await api.put(apiRoutes.admin.numberSeriesDetail(id), editForm);
      sonnerToast.success("Number series updated");
      setEditingId(null);
      fetchSeries();
    } catch { sonnerToast.error("Failed to update"); }
  };

  const handleAdd = async () => {
    if (!addForm.module.trim() || !addForm.prefix.trim()) return sonnerToast.error("Module and prefix are required");
    try {
      await api.post(apiRoutes.admin.numberSeries, addForm);
      sonnerToast.success("Number series created");
      setShowAdd(false);
      setAddForm({ module: "", prefix: "", separator: "-", padding: 4, resetFrequency: "YEARLY" });
      fetchSeries();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to create";
      sonnerToast.error(msg);
    }
  };

  const genExample = (prefix: string, sep: string, pad: number, val: number) =>
    `${prefix}${sep}${new Date().getFullYear()}${sep}${String(val + 1).padStart(pad, "0")}`;

  return (
    <div className="rounded-xl border border-gray-200 p-5 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Number Series</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Configure auto-numbering prefixes for documents</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)}
          className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600">
          + Add Series
        </button>
      </div>

      {showAdd && (
        <div className="mb-4 rounded-lg border border-brand-200 bg-brand-50/50 p-3 dark:border-brand-800 dark:bg-brand-900/20">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <input type="text" placeholder="Module (e.g. PO)" value={addForm.module}
              onChange={(e) => setAddForm({ ...addForm, module: e.target.value })}
              className="rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
            <input type="text" placeholder="Prefix" value={addForm.prefix}
              onChange={(e) => setAddForm({ ...addForm, prefix: e.target.value })}
              className="rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
            <input type="text" placeholder="Separator" value={addForm.separator}
              onChange={(e) => setAddForm({ ...addForm, separator: e.target.value })}
              className="rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
            <input type="number" placeholder="Padding" value={addForm.padding} min={1} max={10}
              onChange={(e) => setAddForm({ ...addForm, padding: Number(e.target.value) })}
              className="rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
            <div className="flex gap-1">
              <button onClick={handleAdd} className="rounded bg-brand-500 px-3 py-1.5 text-xs text-white hover:bg-brand-600">Save</button>
              <button onClick={() => setShowAdd(false)} className="rounded border border-gray-300 px-3 py-1.5 text-xs dark:border-gray-600 dark:text-gray-300">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {nsLoading ? (
        <div className="py-8 text-center text-gray-400 text-sm">Loading...</div>
      ) : series.length === 0 ? (
        <div className="py-8 text-center text-gray-400 text-sm">No number series configured yet</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="py-2 px-3 text-left font-medium text-gray-500">Document</th>
                <th className="py-2 px-3 text-left font-medium text-gray-500">Prefix</th>
                <th className="py-2 px-3 text-left font-medium text-gray-500">Sep</th>
                <th className="py-2 px-3 text-left font-medium text-gray-500">Pad</th>
                <th className="py-2 px-3 text-left font-medium text-gray-500">Current</th>
                <th className="py-2 px-3 text-left font-medium text-gray-500">Next Example</th>
                <th className="py-2 px-3 text-center font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="text-gray-600 dark:text-gray-300">
              {series.map((s) => (
                <tr key={s.id} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-2 px-3 font-medium">{s.module}</td>
                  {editingId === s.id ? (
                    <>
                      <td className="py-2 px-3">
                        <input type="text" value={editForm.prefix} onChange={(e) => setEditForm({ ...editForm, prefix: e.target.value })}
                          className="w-20 rounded border border-gray-300 px-1.5 py-1 text-sm font-mono dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
                      </td>
                      <td className="py-2 px-3">
                        <input type="text" value={editForm.separator} onChange={(e) => setEditForm({ ...editForm, separator: e.target.value })}
                          className="w-10 rounded border border-gray-300 px-1.5 py-1 text-sm font-mono dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
                      </td>
                      <td className="py-2 px-3">
                        <input type="number" value={editForm.padding} min={1} max={10}
                          onChange={(e) => setEditForm({ ...editForm, padding: Number(e.target.value) })}
                          className="w-14 rounded border border-gray-300 px-1.5 py-1 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
                      </td>
                      <td className="py-2 px-3 font-mono text-xs">{s.currentValue}</td>
                      <td className="py-2 px-3 font-mono text-xs text-brand-500">{genExample(editForm.prefix, editForm.separator, editForm.padding, s.currentValue)}</td>
                      <td className="py-2 px-3 text-center">
                        <button onClick={() => saveEdit(s.id)} className="rounded bg-brand-500 px-2 py-1 text-xs text-white mr-1">Save</button>
                        <button onClick={() => setEditingId(null)} className="rounded border px-2 py-1 text-xs dark:border-gray-600 dark:text-gray-300">Cancel</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-2 px-3 font-mono">{s.prefix}</td>
                      <td className="py-2 px-3 font-mono">{s.separator}</td>
                      <td className="py-2 px-3">{s.padding}</td>
                      <td className="py-2 px-3 font-mono text-xs">{s.currentValue}</td>
                      <td className="py-2 px-3 font-mono text-xs text-brand-500">{genExample(s.prefix, s.separator, s.padding, s.currentValue)}</td>
                      <td className="py-2 px-3 text-center">
                        <button onClick={() => startEdit(s)} className="rounded p-1 text-gray-400 hover:text-blue-500" title="Edit">✏️</button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function Settings() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"general" | "account" | "system">("general");
  const [toast, setToast] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");

  /* general settings */
  const [general, setGeneral] = useState<GeneralSettings>(defaults);
  const [loading, setLoading] = useState(false);

  /* account */
  const [profile, setProfile] = useState({ fullName: user?.fullName || "", email: user?.email || "" });
  const [pw, setPw] = useState({ current: "", newPw: "", confirm: "" });

  const showToast = useCallback((msg: string, type: "success" | "error" = "success") => {
    setToast(msg); setToastType(type); setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => { setProfile({ fullName: user?.fullName || "", email: user?.email || "" }); }, [user]);

  // Load settings from API on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await api.get<{ success: boolean; data: Record<string, string> }>(apiRoutes.settings.general);
        if (res.data) {
          setGeneral({
            companyName: res.data.companyName || defaults.companyName,
            currency: res.data.currency || defaults.currency,
            fyStart: res.data.fiscalYearStart || defaults.fyStart,
            dateFormat: res.data.dateFormat || defaults.dateFormat,
          });
        }
      } catch {
        // Fallback to localStorage
        try {
          const raw = localStorage.getItem("erp_settings");
          if (raw) setGeneral({ ...defaults, ...JSON.parse(raw) });
        } catch { /* ignore */ }
      }
    };
    loadSettings();
  }, []);

  const handleSaveGeneral = async () => {
    setLoading(true);
    try {
      await api.put(apiRoutes.settings.general, {
        companyName: general.companyName,
        currency: general.currency,
        dateFormat: general.dateFormat,
        fiscalYearStart: general.fyStart,
      });
      showToast("Settings saved successfully");
    } catch {
      // Fallback to localStorage
      localStorage.setItem("erp_settings", JSON.stringify(general));
      showToast("Settings saved locally (API unavailable)", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!pw.current || !pw.newPw) return showToast("Fill all password fields", "error");
    if (pw.newPw !== pw.confirm) return showToast("Passwords do not match", "error");
    if (pw.newPw.length < 6) return showToast("Password must be at least 6 characters", "error");

    setLoading(true);
    try {
      await api.put(apiRoutes.settings.security, {
        currentPassword: pw.current,
        newPassword: pw.newPw,
      });
      showToast("Password changed successfully");
      setPw({ current: "", newPw: "", confirm: "" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to change password";
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: "general" as const, label: "General" },
    { id: "account" as const, label: "Account" },
    { id: "system" as const, label: "System" },
  ];

  return (
    <>
      <PageMeta title="Settings | ERP TRACK" description="System settings" />
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-lg animate-slide-in ${
          toastType === "error" ? "bg-red-500" : "bg-brand-500"
        }`}>
          {toast}
        </div>
      )}
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3 p-5 lg:p-6">
        <h2 className="mb-6 text-lg font-semibold text-gray-800 dark:text-white/90">Settings</h2>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex gap-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "border-b-2 border-brand-500 text-brand-500"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* General Settings */}
        {activeTab === "general" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-gray-200 p-5 dark:border-gray-700">
              <h3 className="mb-4 text-sm font-semibold text-gray-800 dark:text-white/90">Company Information</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Company Name</label>
                  <input
                    type="text"
                    value={general.companyName}
                    onChange={(e) => setGeneral({ ...general, companyName: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Currency</label>
                  <input
                    type="text"
                    value={general.currency}
                    onChange={(e) => setGeneral({ ...general, currency: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Financial Year Start</label>
                  <input
                    type="text"
                    value={general.fyStart}
                    onChange={(e) => setGeneral({ ...general, fyStart: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Date Format</label>
                  <select
                    value={general.dateFormat}
                    onChange={(e) => setGeneral({ ...general, dateFormat: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  >
                    <option>DD/MM/YYYY</option>
                    <option>MM/DD/YYYY</option>
                    <option>YYYY-MM-DD</option>
                  </select>
                </div>
              </div>
              <button onClick={handleSaveGeneral} disabled={loading} className="mt-4 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">
                {loading ? "Saving..." : "Save Company Info"}
              </button>
            </div>

            <NumberSeriesTable />
          </div>
        )}

        {/* Account Settings */}
        {activeTab === "account" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-gray-200 p-5 dark:border-gray-700">
              <h3 className="mb-4 text-sm font-semibold text-gray-800 dark:text-white/90">Profile</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
                  <input
                    type="text"
                    value={profile.fullName}
                    onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
                  <input
                    type="text"
                    value={user?.role || ""}
                    disabled
                    className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 p-5 dark:border-gray-700">
              <h3 className="mb-4 text-sm font-semibold text-gray-800 dark:text-white/90">Change Password</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Current Password</label>
                  <input
                    type="password"
                    value={pw.current}
                    onChange={(e) => setPw({ ...pw, current: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">New Password</label>
                  <input
                    type="password"
                    value={pw.newPw}
                    onChange={(e) => setPw({ ...pw, newPw: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Confirm New Password</label>
                  <input
                    type="password"
                    value={pw.confirm}
                    onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <button onClick={handleChangePassword} disabled={loading} className="mt-4 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">
                {loading ? "Updating..." : "Update Password"}
              </button>
            </div>
          </div>
        )}

        {/* System Settings */}
        {activeTab === "system" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-gray-200 p-5 dark:border-gray-700">
              <h3 className="mb-4 text-sm font-semibold text-gray-800 dark:text-white/90">Application</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">Version</p>
                    <p className="text-xs text-gray-500">ERP TRACK v1.0.0</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">Database</p>
                    <p className="text-xs text-gray-500">MySQL 9.6</p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-600 dark:bg-green-500/10 dark:text-green-400">Connected</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">API Server</p>
                    <p className="text-xs text-gray-500">API Endpoint</p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-600 dark:bg-green-500/10 dark:text-green-400">Running</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 p-5 dark:border-gray-700">
              <h3 className="mb-4 text-sm font-semibold text-gray-800 dark:text-white/90">Modules Status</h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { name: "Master Data", status: "active" },
                  { name: "Merchandising", status: "active" },
                  { name: "Costing", status: "active" },
                  { name: "Planning", status: "active" },
                  { name: "Procurement", status: "active" },
                  { name: "Inventory", status: "active" },
                  { name: "Production", status: "active" },
                  { name: "Quality", status: "active" },
                  { name: "Packing & Export", status: "active" },
                  { name: "Finance", status: "active" },
                  { name: "HRM", status: "active" },
                  { name: "Reports", status: "active" },
                ].map((mod) => (
                  <div key={mod.name} className="flex items-center justify-between rounded-lg border border-gray-100 p-3 dark:border-gray-700">
                    <span className="text-sm text-gray-700 dark:text-gray-300">{mod.name}</span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      mod.status === "active"
                        ? "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400"
                        : "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                    }`}>
                      {mod.status === "active" ? "Active" : "Planned"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
