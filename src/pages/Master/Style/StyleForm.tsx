import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router";
import { masterApi, type Category, type Season, type StyleMaster } from "../../../api/master";
import PageMeta from "../../../components/common/PageMeta";
import Label from "../../../components/form/Label";
import Input from "../../../components/form/input/InputField";
import Button from "../../../components/ui/button/Button";
import OperationBreakdownTab from "./OperationBreakdownTab";

interface BuyerOption {
  id: number;
  code: string;
  name: string;
}

const selectClass =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

const PRODUCTION_TYPES = ["KNIT", "WOVEN", "DENIM", "LEATHER"] as const;

export default function StyleForm() {
  const { id } = useParams();
  const isEdit = id && id !== "new";
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"general" | "operations">("general");
  const [form, setForm] = useState({
    styleNo: "",
    styleName: "",
    buyerId: "",
    categoryId: "",
    seasonId: "",
    garmentType: "",
    description: "",
    productionType: "",
  });

  const [buyers, setBuyers] = useState<BuyerOption[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [styleData, setStyleData] = useState<StyleMaster | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load lookups (independent calls so one failure doesn't block others)
  useEffect(() => {
    masterApi.listBuyers({ limit: 100 })
      .then((res) => { if (res.data.data) setBuyers(res.data.data as unknown as BuyerOption[]); })
      .catch((err) => console.error('Failed to load buyers:', err));
    masterApi.listCategories()
      .then((res) => { if (res.data.data) setCategories(res.data.data as unknown as Category[]); })
      .catch((err) => console.error('Failed to load categories:', err));
    masterApi.listSeasons()
      .then((res) => { if (res.data.data) setSeasons(res.data.data as unknown as Season[]); })
      .catch((err) => console.error('Failed to load seasons:', err));
  }, []);

  // Load style for edit
  useEffect(() => {
    if (isEdit) {
      masterApi
        .getStyle(Number(id))
        .then(({ data: resp }) => {
          const s = resp.data;
          setStyleData(s);
          setForm({
            styleNo: s.styleNo,
            styleName: s.styleName,
            buyerId: String(s.buyerId),
            categoryId: s.category ? String(s.category.id) : "",
            seasonId: s.season ? String(s.season.id) : "",
            garmentType: s.garmentType || "",
            description: s.description || "",
            productionType: s.productionType || "",
          });
        })
        .catch(() => navigate("/master/styles"));
    }
  }, [id, isEdit, navigate]);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        styleNo: form.styleNo,
        styleName: form.styleName,
        buyerId: Number(form.buyerId),
      };
      if (form.categoryId) payload.categoryId = Number(form.categoryId);
      if (form.seasonId) payload.seasonId = Number(form.seasonId);
      if (form.garmentType) payload.garmentType = form.garmentType;
      if (form.description) payload.description = form.description;
      if (form.productionType) payload.productionType = form.productionType;

      if (isEdit) {
        await masterApi.updateStyle(Number(id), payload as Partial<Parameters<typeof masterApi.updateStyle>[1]>);
        navigate("/master/styles");
      } else {
        const res = await masterApi.createStyle(payload as Partial<Parameters<typeof masterApi.createStyle>[0]>);
        const created = res?.data?.data ?? res?.data;
        if (created?.id) {
          // Redirect to edit page so Operations tab is immediately available
          navigate(`/master/styles/${created.id}`, { replace: true });
        } else {
          navigate("/master/styles");
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Save failed";
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr?.response?.data?.message || message);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { key: "general" as const, label: "General Info" },
    { key: "operations" as const, label: "Operation Breakdown" },
  ];

  return (
    <>
      <PageMeta title={`${isEdit ? "Edit" : "New"} Style | ERP TRACK`} description="" />
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {isEdit ? "Edit Style" : "New Style"}
          </h2>
          {isEdit && styleData && styleData.totalOperations !== undefined && styleData.totalOperations > 0 && (
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              <span>Operations: <strong className="text-gray-800 dark:text-white">{styleData.totalOperations}</strong></span>
              <span>Total SAM: <strong className="text-gray-800 dark:text-white">{Number(styleData.totalSam ?? 0).toFixed(3)}</strong></span>
            </div>
          )}
        </div>

        {/* Tab Bar */}
        <div className="mb-6 flex border-b border-gray-200 dark:border-gray-700">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? "border-b-2 border-brand-500 text-brand-600 dark:text-brand-400"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                {tab.label}
                {tab.key === "operations" && styleData?.totalOperations ? (
                  <span className="ml-1.5 inline-flex items-center rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                    {styleData.totalOperations}
                  </span>
                ) : null}
              </button>
            ))}
          </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-100 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Tab: General Info */}
        {activeTab === "general" && (
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {/* Style No */}
              <div>
                <Label>Style No *</Label>
                <Input
                  placeholder="STY001"
                  value={form.styleNo}
                  onChange={(e) => handleChange("styleNo", e.target.value)}
                  disabled={!!isEdit}
                />
              </div>

              {/* Style Name */}
              <div>
                <Label>Style Name *</Label>
                <Input
                  placeholder="Polo T-Shirt Classic"
                  value={form.styleName}
                  onChange={(e) => handleChange("styleName", e.target.value)}
                />
              </div>

              {/* Buyer */}
              <div>
                <Label>Buyer *</Label>
                <select
                  aria-label="Buyer"
                  className={selectClass}
                  value={form.buyerId}
                  onChange={(e) => handleChange("buyerId", e.target.value)}
                >
                  <option value="">Select Buyer</option>
                  {buyers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} - {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div>
                <Label>Category</Label>
                <select
                  aria-label="Category"
                  className={selectClass}
                  value={form.categoryId}
                  onChange={(e) => handleChange("categoryId", e.target.value)}
                >
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Season */}
              <div>
                <Label>Season</Label>
                <select
                  aria-label="Season"
                  className={selectClass}
                  value={form.seasonId}
                  onChange={(e) => handleChange("seasonId", e.target.value)}
                >
                  <option value="">Select Season</option>
                  {seasons.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} - {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Production Type */}
              <div>
                <Label>Production Type</Label>
                <select
                  aria-label="Production Type"
                  className={selectClass}
                  value={form.productionType}
                  onChange={(e) => handleChange("productionType", e.target.value)}
                >
                  <option value="">Select Production Type</option>
                  {PRODUCTION_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Garment Type */}
              <div>
                <Label>Garment Type</Label>
                <Input
                  placeholder="T-Shirt / Trouser / Jacket"
                  value={form.garmentType}
                  onChange={(e) => handleChange("garmentType", e.target.value)}
                />
              </div>

              {/* Description */}
              <div className="sm:col-span-2">
                <Label>Description</Label>
                <textarea
                  className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  rows={3}
                  placeholder="Style description..."
                  value={form.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex items-center gap-3">
              <Button size="sm" disabled={loading}>
                {loading ? "Saving..." : isEdit ? "Update Style" : "Create Style"}
              </Button>
              <button
                type="button"
                onClick={() => navigate("/master/styles")}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Tab: Operation Breakdown */}
        {activeTab === "operations" && (
          isEdit ? (
            <OperationBreakdownTab
              styleId={Number(id)}
              styleNo={styleData?.styleNo || form.styleNo || ""}
              onTotalUpdate={(totalSam, totalOps) => {
                setStyleData((prev) => prev ? { ...prev, totalSam, totalOperations: totalOps } : prev);
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 py-16 dark:border-gray-700">
              <svg className="mb-3 h-12 w-12 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Save the style first to add operations</p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">After creating the style, you'll be redirected here to define the operation breakdown.</p>
              <button
                type="button"
                onClick={() => setActiveTab("general")}
                className="mt-4 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
              >
                Go to General Info
              </button>
            </div>
          )
        )}
      </div>
    </>
  );
}
