import { useState, useEffect, useCallback } from "react";
import PageMeta from "../../components/common/PageMeta";
import { useAuthStore } from "../../store/authStore";

/* ── localStorage helpers ── */
const STORAGE_KEY = "erp_settings";
type GeneralSettings = { companyName: string; currency: string; fyStart: string; dateFormat: string };
const defaults: GeneralSettings = { companyName: "ERP TRACK", currency: "USD", fyStart: "April", dateFormat: "DD/MM/YYYY" };

function loadSettings(): GeneralSettings {
  try { return { ...defaults, ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") }; } catch { return defaults; }
}
function saveSettings(s: GeneralSettings) { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }

export default function Settings() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"general" | "account" | "system">("general");
  const [toast, setToast] = useState<string | null>(null);

  /* general settings */
  const [general, setGeneral] = useState<GeneralSettings>(loadSettings);

  /* account */
  const [profile, setProfile] = useState({ fullName: user?.fullName || "", email: user?.email || "" });
  const [pw, setPw] = useState({ current: "", newPw: "", confirm: "" });

  const showToast = useCallback((msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); }, []);

  useEffect(() => { setProfile({ fullName: user?.fullName || "", email: user?.email || "" }); }, [user]);

  const handleSaveGeneral = () => { saveSettings(general); showToast("Settings saved"); };

  const handleChangePassword = () => {
    if (!pw.current || !pw.newPw) return showToast("Fill all password fields");
    if (pw.newPw !== pw.confirm) return showToast("Passwords do not match");
    if (pw.newPw.length < 8) return showToast("Password must be at least 8 characters");
    // No backend endpoint yet — show feedback
    showToast("Password change will be available after API integration");
    setPw({ current: "", newPw: "", confirm: "" });
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
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg animate-slide-in">
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
              <button onClick={handleSaveGeneral} className="mt-4 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
                Save Company Info
              </button>
            </div>

            <div className="rounded-xl border border-gray-200 p-5 dark:border-gray-700">
              <h3 className="mb-4 text-sm font-semibold text-gray-800 dark:text-white/90">Number Series</h3>
              <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
                Configure auto-numbering prefixes for orders, invoices, and other documents.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="py-2 px-3 text-left font-medium text-gray-500">Document</th>
                      <th className="py-2 px-3 text-left font-medium text-gray-500">Prefix</th>
                      <th className="py-2 px-3 text-left font-medium text-gray-500">Example</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-600 dark:text-gray-300">
                    <tr className="border-b border-gray-100 dark:border-gray-800"><td className="py-2 px-3">Buyer Order</td><td className="py-2 px-3 font-mono">BO</td><td className="py-2 px-3 font-mono">BO-2025-0001</td></tr>
                    <tr className="border-b border-gray-100 dark:border-gray-800"><td className="py-2 px-3">Purchase Order</td><td className="py-2 px-3 font-mono">PO</td><td className="py-2 px-3 font-mono">PO-2025-0001</td></tr>
                    <tr className="border-b border-gray-100 dark:border-gray-800"><td className="py-2 px-3">GRN</td><td className="py-2 px-3 font-mono">GRN</td><td className="py-2 px-3 font-mono">GRN-2025-0001</td></tr>
                    <tr className="border-b border-gray-100 dark:border-gray-800"><td className="py-2 px-3">Invoice</td><td className="py-2 px-3 font-mono">INV</td><td className="py-2 px-3 font-mono">INV-2025-0001</td></tr>
                    <tr className="border-b border-gray-100 dark:border-gray-800"><td className="py-2 px-3">Material Issue</td><td className="py-2 px-3 font-mono">MI</td><td className="py-2 px-3 font-mono">MI-2025-0001</td></tr>
                    <tr className="border-b border-gray-100 dark:border-gray-800"><td className="py-2 px-3">Cutting Order</td><td className="py-2 px-3 font-mono">CO</td><td className="py-2 px-3 font-mono">CO-2025-0001</td></tr>
                    <tr className="border-b border-gray-100 dark:border-gray-800"><td className="py-2 px-3">Packing List</td><td className="py-2 px-3 font-mono">PL</td><td className="py-2 px-3 font-mono">PL-2025-0001</td></tr>
                    <tr><td className="py-2 px-3">Inspection</td><td className="py-2 px-3 font-mono">QC</td><td className="py-2 px-3 font-mono">QC-2025-0001</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
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
              <button onClick={handleChangePassword} className="mt-4 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
                Update Password
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
                    <p className="text-xs text-gray-500">http://localhost:4000</p>
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
