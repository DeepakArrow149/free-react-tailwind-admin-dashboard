import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router";
import { masterApi, type Category, type Season } from "../../../api/master";
import PageMeta from "../../../components/common/PageMeta";
import Label from "../../../components/form/Label";
import Input from "../../../components/form/input/InputField";
import Button from "../../../components/ui/button/Button";

interface BuyerOption {
  id: number;
  code: string;
  name: string;
}

const selectClass =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

export default function StyleForm() {
  const { id } = useParams();
  const isEdit = id && id !== "new";
  const navigate = useNavigate();

  const [form, setForm] = useState({
    styleNo: "",
    styleName: "",
    buyerId: "",
    categoryId: "",
    seasonId: "",
    department: "",
    garmentType: "",
    description: "",
  });

  const [buyers, setBuyers] = useState<BuyerOption[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load lookups
  useEffect(() => {
    Promise.all([
      masterApi.listBuyers({ limit: 200 }),
      masterApi.listCategories(),
      masterApi.listSeasons(),
    ]).then(([buyRes, catRes, seaRes]) => {
      if (buyRes.data.data) setBuyers(buyRes.data.data as unknown as BuyerOption[]);
      if (catRes.data.data) setCategories(catRes.data.data as unknown as Category[]);
      if (seaRes.data.data) setSeasons(seaRes.data.data as unknown as Season[]);
    });
  }, []);

  // Load style for edit
  useEffect(() => {
    if (isEdit) {
      masterApi
        .getStyle(Number(id))
        .then(({ data: resp }) => {
          const s = resp.data;
          setForm({
            styleNo: s.styleNo,
            styleName: s.styleName,
            buyerId: String(s.buyerId),
            categoryId: s.category ? String(s.category.id) : "",
            seasonId: s.season ? String(s.season.id) : "",
            department: "",
            garmentType: "",
            description: "",
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
      if (form.department) payload.department = form.department;
      if (form.garmentType) payload.garmentType = form.garmentType;
      if (form.description) payload.description = form.description;

      if (isEdit) {
        await masterApi.updateStyle(Number(id), payload as Partial<Parameters<typeof masterApi.updateStyle>[1]>);
      } else {
        await masterApi.createStyle(payload as Partial<Parameters<typeof masterApi.createStyle>[0]>);
      }
      navigate("/master/styles");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Save failed";
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr?.response?.data?.message || message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageMeta title={`${isEdit ? "Edit" : "New"} Style | ERP TRACK`} description="" />
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {isEdit ? "Edit Style" : "New Style"}
          </h2>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-100 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
            {error}
          </div>
        )}

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

            {/* Department */}
            <div>
              <Label>Department</Label>
              <Input
                placeholder="Knits / Woven / Denim"
                value={form.department}
                onChange={(e) => handleChange("department", e.target.value)}
              />
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
      </div>
    </>
  );
}
