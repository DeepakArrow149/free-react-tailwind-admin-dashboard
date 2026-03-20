import { useState } from "react";
import { exportApi } from "../../api/hrm";
import { toastSuccess, toastError } from "../../utils/toast";
import PageMeta from "../../components/common/PageMeta";

export default function StatutoryExportsPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [downloading, setDownloading] = useState<string | null>(null);

  const download = async (type: "ecr" | "esi") => {
    setDownloading(type);
    try {
      const resp = type === "ecr"
        ? await exportApi.ecr({ month, year })
        : await exportApi.esi({ month, year });

      const blob = new Blob([resp.data], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type.toUpperCase()}_${year}_${String(month).padStart(2, "0")}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      toastSuccess(`${type.toUpperCase()} file downloaded`);
    } catch (e) { toastError(e, `Failed to download ${type.toUpperCase()}`); }
    setDownloading(null);
  };

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  return (
    <>
      <PageMeta title="Statutory Exports" description="PF ECR & ESI exports" />
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Statutory Exports</h1>

        {/* Period selector */}
        <div className="flex items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Month</label>
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
              className="rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white">
              {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Year</label>
            <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} min={2020} max={2099}
              className="w-24 rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
          </div>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* PF ECR */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-3">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">PF ECR (Electronic Challan cum Return)</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Generates text file in EPFO ECR format — UAN-based contribution data for all PF-applicable employees.
            </p>
            <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1 list-disc list-inside">
              <li>Fields: UAN, Name, Gross, EPF Wages, EPS Wages, EDLI Wages, EPF Contribution, EPS Contribution</li>
              <li>EPF @ 12% of basic, EPS @ 8.33% (capped at ₹15,000)</li>
            </ul>
            <button onClick={() => download("ecr")} disabled={downloading === "ecr"}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {downloading === "ecr" ? "Downloading…" : "Download ECR"}
            </button>
          </div>

          {/* ESI */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-3">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">ESI Return</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Generates ESI return file for all ESI-applicable employees — IP number, wages, and contribution details.
            </p>
            <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1 list-disc list-inside">
              <li>Fields: IP Number, Name, Working Days, Wages, IP Contribution, Reason Code</li>
              <li>Employee contribution @ 0.75%, Employer @ 3.25%</li>
            </ul>
            <button onClick={() => download("esi")} disabled={downloading === "esi"}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
              {downloading === "esi" ? "Downloading…" : "Download ESI Return"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
