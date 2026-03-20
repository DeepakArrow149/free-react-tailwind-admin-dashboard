import { useState, useCallback } from "react";
import { toast } from "sonner";
import client from "../../api/client";

interface ImportableModel {
  key: string;
  label: string;
  columns: string[];
}

interface PreviewResult {
  totalRows: number;
  validRows: number;
  errorRows: number;
  errors: Array<{ row: number; field: string; message: string }>;
  preview: Record<string, unknown>[];
}

export default function ExcelImportPage() {
  const [models, setModels] = useState<ImportableModel[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [step, setStep] = useState<"select" | "upload" | "map" | "preview" | "done">("select");
  const [loading, setLoading] = useState(false);

  /* Raw parsed data */
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);

  /* Column mapping: model column → file header */
  const [mapping, setMapping] = useState<Record<string, string>>({});

  /* Preview */
  const [preview, setPreview] = useState<PreviewResult | null>(null);

  /* Import result */
  const [importResult, setImportResult] = useState<{ created: number; skipped: number; total: number } | null>(null);

  const fetchModels = useCallback(async () => {
    try {
      const res = await client.get("/admin/import/models");
      setModels(res.data.data || []);
    } catch {
      toast.error("Failed to load importable models");
    }
  }, []);

  const handleModelSelect = async (key: string) => {
    if (!models.length) await fetchModels();
    setSelectedModel(key);
    setStep("upload");
    setRawRows([]);
    setFileHeaders([]);
    setMapping({});
    setPreview(null);
    setImportResult(null);
  };

  /* Parse CSV/TSV from file input */
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) { toast.error("File must have headers + at least 1 data row"); return; }

      const separator = lines[0].includes("\t") ? "\t" : ",";
      const headers = lines[0].split(separator).map((h) => h.trim().replace(/^"|"$/g, ""));
      const rows = lines.slice(1).map((line) => {
        const vals = line.split(separator).map((v) => v.trim().replace(/^"|"$/g, ""));
        const row: Record<string, string> = {};
        headers.forEach((h, i) => { row[h] = vals[i] || ""; });
        return row;
      });

      setFileHeaders(headers);
      setRawRows(rows);

      // Auto-map: exact / case-insensitive match
      const model = models.find((m) => m.key === selectedModel);
      if (model) {
        const autoMap: Record<string, string> = {};
        model.columns.forEach((col) => {
          const match = headers.find((h) => h.toLowerCase() === col.toLowerCase());
          if (match) autoMap[col] = match;
        });
        setMapping(autoMap);
      }

      setStep("map");
      toast.success(`Parsed ${rows.length} rows from file`);
    };
    reader.readAsText(file);
  };

  const handlePreview = async () => {
    const model = models.find((m) => m.key === selectedModel);
    if (!model) return;

    // Transform rows using column mapping
    const mappedRows = rawRows.map((raw) => {
      const row: Record<string, string> = {};
      model.columns.forEach((col) => {
        const srcHeader = mapping[col];
        if (srcHeader && raw[srcHeader] !== undefined) {
          row[col] = raw[srcHeader];
        }
      });
      return row;
    });

    setLoading(true);
    try {
      const res = await client.post("/admin/import/preview", { model: selectedModel, rows: mappedRows });
      setPreview(res.data.data);
      setStep("preview");
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Preview failed");
    }
    setLoading(false);
  };

  const handleExecuteImport = async () => {
    const model = models.find((m) => m.key === selectedModel);
    if (!model) return;

    const mappedRows = rawRows.map((raw) => {
      const row: Record<string, string> = {};
      model.columns.forEach((col) => {
        const srcHeader = mapping[col];
        if (srcHeader && raw[srcHeader] !== undefined) {
          row[col] = raw[srcHeader];
        }
      });
      return row;
    });

    setLoading(true);
    try {
      const res = await client.post("/admin/import/execute", { model: selectedModel, rows: mappedRows });
      setImportResult(res.data.data);
      setStep("done");
      toast.success("Import completed!");
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Import failed");
    }
    setLoading(false);
  };

  const modelObj = models.find((m) => m.key === selectedModel);

  return (
    <div className="p-6 max-w-[1100px] mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Excel / CSV Import</h1>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {["select", "upload", "map", "preview", "done"].map((s, i) => (
          <div key={s} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step === s ? "bg-blue-600 text-white" :
              ["select", "upload", "map", "preview", "done"].indexOf(step) > i ? "bg-green-500 text-white" :
              "bg-gray-200 dark:bg-gray-700 text-gray-500"
            }`}>
              {["select", "upload", "map", "preview", "done"].indexOf(step) > i ? "✓" : i + 1}
            </div>
            {i < 4 && <div className="w-12 h-0.5 bg-gray-200 dark:bg-gray-700" />}
          </div>
        ))}
      </div>

      {/* STEP 1: Model Selection */}
      {step === "select" && (
        <div>
          <h2 className="text-lg font-semibold mb-4">1. Select data type to import</h2>
          {!models.length ? (
            <button onClick={fetchModels} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Load Import Options</button>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {models.map((m) => (
                <button
                  key={m.key}
                  onClick={() => handleModelSelect(m.key)}
                  className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:shadow-md transition text-left"
                >
                  <h3 className="font-medium text-gray-800 dark:text-white">{m.label}</h3>
                  <p className="text-xs text-gray-400 mt-1">{m.columns.length} fields</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* STEP 2: File Upload */}
      {step === "upload" && (
        <div>
          <h2 className="text-lg font-semibold mb-4">2. Upload CSV/TSV file for: <span className="text-blue-600">{modelObj?.label}</span></h2>
          <p className="text-sm text-gray-500 mb-2">Expected columns: {modelObj?.columns.join(", ")}</p>
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-12 text-center">
            <p className="text-gray-500 mb-4">Drop your .csv or .tsv file here, or click to browse</p>
            <input
              type="file"
              accept=".csv,.tsv,.txt"
              onChange={handleFileUpload}
              className="text-sm"
            />
          </div>
          <button onClick={() => { setStep("select"); setSelectedModel(""); }} className="mt-4 text-sm text-gray-500 hover:underline">← Change model</button>
        </div>
      )}

      {/* STEP 3: Column Mapping */}
      {step === "map" && modelObj && (
        <div>
          <h2 className="text-lg font-semibold mb-4">3. Map columns</h2>
          <p className="text-sm text-gray-500 mb-4">{rawRows.length} rows loaded. Map file columns to {modelObj.label} fields:</p>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="text-left p-3 text-gray-600 dark:text-gray-300">Model Field</th>
                  <th className="text-left p-3 text-gray-600 dark:text-gray-300">→</th>
                  <th className="text-left p-3 text-gray-600 dark:text-gray-300">File Column</th>
                  <th className="text-left p-3 text-gray-600 dark:text-gray-300">Sample Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {modelObj.columns.map((col) => (
                  <tr key={col}>
                    <td className="p-3 font-medium">{col}</td>
                    <td className="p-3">→</td>
                    <td className="p-3">
                      <select
                        value={mapping[col] || ""}
                        onChange={(e) => setMapping({ ...mapping, [col]: e.target.value })}
                        className="border rounded p-1 dark:bg-gray-700 dark:border-gray-600 w-full"
                      >
                        <option value="">-- skip --</option>
                        {fileHeaders.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3 text-xs text-gray-400 font-mono">
                      {mapping[col] && rawRows[0] ? rawRows[0][mapping[col]] || "—" : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={() => setStep("upload")} className="px-4 py-2 border rounded-lg text-sm">← Back</button>
            <button onClick={handlePreview} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
              {loading ? "Validating..." : "Validate & Preview →"}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Preview */}
      {step === "preview" && preview && (
        <div>
          <h2 className="text-lg font-semibold mb-4">4. Preview & Confirm</h2>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 dark:bg-gray-700 p-4 rounded-xl border border-blue-200 dark:border-gray-600">
              <p className="text-sm text-gray-500">Total Rows</p>
              <p className="text-2xl font-bold">{preview.totalRows}</p>
            </div>
            <div className="bg-green-50 dark:bg-gray-700 p-4 rounded-xl border border-green-200 dark:border-gray-600">
              <p className="text-sm text-gray-500">Valid</p>
              <p className="text-2xl font-bold text-green-600">{preview.validRows}</p>
            </div>
            <div className="bg-red-50 dark:bg-gray-700 p-4 rounded-xl border border-red-200 dark:border-gray-600">
              <p className="text-sm text-gray-500">Errors</p>
              <p className="text-2xl font-bold text-red-600">{preview.errorRows}</p>
            </div>
          </div>

          {preview.errors.length > 0 && (
            <div className="mb-6 bg-red-50 dark:bg-gray-800 border border-red-200 dark:border-red-900 rounded-xl p-4">
              <h3 className="text-sm font-medium text-red-700 mb-2">Validation Errors:</h3>
              <ul className="text-xs text-red-600 space-y-1 max-h-40 overflow-y-auto">
                {preview.errors.map((e, i) => (
                  <li key={i}>Row {e.row}: {e.field} — {e.message}</li>
                ))}
              </ul>
            </div>
          )}

          {preview.preview.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">First {preview.preview.length} valid rows:</h3>
              <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-xl shadow">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      {modelObj?.columns.map((c) => (
                        <th key={c} className="text-left p-2">{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {preview.preview.map((row, i) => (
                      <tr key={i}>
                        {modelObj?.columns.map((c) => (
                          <td key={c} className="p-2">{String(row[c] || "—")}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep("map")} className="px-4 py-2 border rounded-lg text-sm">← Fix Mapping</button>
            <button
              onClick={handleExecuteImport}
              disabled={loading || preview.validRows === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? "Importing..." : `Import ${preview.validRows} rows →`}
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: Done */}
      {step === "done" && importResult && (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Import Complete!</h2>
          <p className="text-gray-500 mb-6">
            {importResult.created} records created, {importResult.skipped} skipped out of {importResult.total} total.
          </p>
          <button
            onClick={() => { setStep("select"); setSelectedModel(""); setRawRows([]); setPreview(null); setImportResult(null); }}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Import More Data
          </button>
        </div>
      )}
    </div>
  );
}
