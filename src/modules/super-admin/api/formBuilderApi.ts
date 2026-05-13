/**
 * Form Builder API Client
 * Frontend API layer for CRUD operations on form definitions,
 * submissions, and lookup data.
 * Company-scoped: non-super-admin users are automatically scoped server-side.
 * Super admins can pass ?companyId= to filter by company.
 */

import { api, apiRoutes } from '@/core/api';
import { useAuthStore } from '@/store/authStore';
import type { FormDefinition, ConditionalVisibility, SectionVisibility, CalculatedField, ModuleAssignment } from '../form-builder/types';

// ─── Company Context Helper ──────────────────────────────────

function getCompanyQueryParam(): string {
  const user = useAuthStore.getState().user;
  // Super admins can optionally filter by company; company admins are scoped server-side.
  // When a selectedCompanyId is available in the store, pass it as a query param
  // so the form builder shows only that company's forms.
  if (user?.isSuperAdmin) {
    const selectedCompanyId = (useAuthStore.getState() as unknown as Record<string, unknown>).selectedCompanyId;
    if (selectedCompanyId) return `companyId=${selectedCompanyId}`;
  }
  return '';
}

function appendCompanyParam(url: string): string {
  const param = getCompanyQueryParam();
  if (!param) return url;
  return url.includes('?') ? `${url}&${param}` : `${url}?${param}`;
}

// ─── API Response types ──────────────────────────────────────

interface FormListItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  status: string;
  layout: string;
  fieldCount: number;
  submissionCount: number;
  lastSubmissionAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface FormDetailResponse {
  id: string;
  name: string;
  slug: string;
  description: string;
  status: string;
  kind?: string;
  entityTableName?: string | null;
  bindingMode?: string;
  boundModel?: string | null;
  boundTableName?: string | null;
  boundValueField?: string | null;
  boundDisplayField?: string | null;
  autoApplyMigrations?: boolean;
  layout: string;
  settings: Record<string, unknown>;
  sections: Array<{
    id: string;
    title: string;
    description: string;
    collapsible: boolean;
    visibility: SectionVisibility | null;
    sortOrder: number;
    fields: Array<{
      id: string;
      type: string;
      label: string;
      name: string;
      placeholder: string;
      helpText: string;
      defaultValue: string;
      width: string;
      options: Array<{ label: string; value: string }>;
      validation: Record<string, unknown>;
      conditionalVisibility: ConditionalVisibility | null;
      calculated: CalculatedField | null;
      readOnly: boolean;
      sortOrder: number;
    }>;
  }>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  moduleAssignment?: {
    targetModule: string;
    menuParentId: string;
    menuLabel: string;
    menuIcon: string;
    menuSortOrder: number;
    allowedRoles: string[];
  };
}

export interface FormSubmission {
  id: string;
  data: Record<string, unknown>;
  submittedBy: string | null;
  ipAddress: string | null;
  reviewStatus: 'pending' | 'reviewed' | 'flagged';
  createdAt: string;
}

interface SubmissionsResponse {
  data: FormSubmission[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

// ─── API Functions ───────────────────────────────────────────

export async function fetchForms(): Promise<FormListItem[]> {
  const url = appendCompanyParam(apiRoutes.forms.list);
  const res = await api.get<{ success: boolean; data: FormListItem[] }>(url);
  return res.data;
}

export async function fetchForm(id: string): Promise<FormDetailResponse> {
  const res = await api.get<{ success: boolean; data: FormDetailResponse }>(apiRoutes.forms.detail(id));
  return res.data;
}

export async function createFormApi(form: FormDefinition): Promise<{ id: string; name: string; slug: string }> {
  const payload = mapFormToPayload(form);
  const res = await api.post<{ success: boolean; data: { id: string; name: string; slug: string } }>(
    apiRoutes.forms.create,
    payload,
  );
  return res.data;
}

export async function updateFormApi(id: string, form: FormDefinition): Promise<void> {
  const payload = mapFormToPayload(form);
  await api.put(apiRoutes.forms.update(id), payload);
}

export async function deleteFormApi(id: string): Promise<void> {
  await api.delete(apiRoutes.forms.delete(id));
}

export async function cloneFormApi(id: string): Promise<{ id: string; name: string; slug: string }> {
  const res = await api.post<{ success: boolean; data: { id: string; name: string; slug: string } }>(
    apiRoutes.forms.clone(id),
  );
  return res.data;
}

export async function publishFormApi(id: string): Promise<void> {
  await api.post(apiRoutes.forms.publish(id));
}

// ─── Module Assignment ───────────────────────────────────────

export async function assignToModule(
  formId: string,
  assignment: ModuleAssignment,
): Promise<void> {
  await api.put(apiRoutes.forms.moduleAssignment(formId), {
    targetModule: assignment.targetModule || null,
    customModuleName: assignment.customModuleName || null,
    menuParentId: assignment.menuParentId || null,
    menuLabel: assignment.menuLabel || null,
    menuIcon: assignment.menuIcon || null,
    menuSortOrder: assignment.menuSortOrder ?? 999,
    allowedRoles: assignment.allowedRoles ?? [],
  });
}

export async function fetchModuleAssignment(
  formId: string,
): Promise<ModuleAssignment | null> {
  const res = await api.get<{ success: boolean; data: Record<string, unknown> }>(
    apiRoutes.forms.moduleAssignment(formId),
  );
  const d = res.data;
  if (!d || !d.targetModule) return null;
  return {
    targetModule: d.targetModule as string,
    menuParentId: (d.menuParentId as string) || null,
    menuLabel: (d.menuLabel as string) || '',
    menuIcon: (d.menuIcon as string) || '',
    menuSortOrder: (d.menuSortOrder as number) ?? 999,
    allowedRoles: (d.allowedRoles as string[]) || [],
  };
}

export interface DynamicMenuItem {
  formId: string;
  slug: string;
  targetModule: string;
  menuParentId: string;
  menuLabel: string;
  menuIcon: string;
  menuSortOrder: number;
  allowedRoles: string[];
}

export async function fetchMenuItems(): Promise<DynamicMenuItem[]> {
  const url = appendCompanyParam(apiRoutes.forms.menuItems);
  const res = await api.get<{ success: boolean; data: DynamicMenuItem[] }>(url);
  return res.data || [];
}

// ─── Submissions ─────────────────────────────────────────────

export async function submitFormData(
  formId: string,
  data: Record<string, unknown>,
): Promise<{ id: number; message: string }> {
  const res = await api.post<{ success: boolean; data: { id: number }; message: string }>(
    apiRoutes.forms.submit(formId),
    { data },
  );
  return { id: res.data.id, message: res.message || 'Submitted' };
}

export async function fetchSubmissions(
  formId: string,
  page = 1,
  limit = 20,
): Promise<SubmissionsResponse> {
  const res = await api.get<{ success: boolean; data: FormSubmission[]; pagination: SubmissionsResponse['pagination'] }>(
    `${apiRoutes.forms.submissions(formId)}?page=${page}&limit=${limit}`,
  );
  return { data: res.data, pagination: res.pagination };
}

export async function deleteSubmission(formId: string, submissionId: string): Promise<void> {
  await api.delete(`${apiRoutes.forms.submissions(formId)}/${submissionId}`);
}

export async function updateSubmissionData(
  formId: string,
  submissionId: string,
  data: Record<string, unknown>,
): Promise<void> {
  await api.put(`${apiRoutes.forms.submissions(formId)}/${submissionId}/data`, { data });
}

export async function bulkDeleteSubmissions(formId: string, ids: string[]): Promise<{ deletedCount: number }> {
  const res = await api.post<{ success: boolean; data: { deletedCount: number } }>(
    `${apiRoutes.forms.submissions(formId)}/bulk-delete`,
    { ids: ids.map(Number) },
  );
  return res.data;
}

export async function changeFormStatus(id: string, status: 'draft' | 'published' | 'archived'): Promise<void> {
  await api.put(`${apiRoutes.forms.detail(id)}/status`, { status });
}

// ─── Lookup Data ─────────────────────────────────────────────

export async function fetchLookupOptions(
  formSlug: string,
  displayField: string,
  valueField: string,
): Promise<Array<{ label: string; value: string }>> {
  // Fetch submissions for the target form, extract unique display/value pairs
  const forms = await fetchForms();
  const targetForm = forms.find((f) => f.slug === formSlug);
  if (!targetForm) return [];

  const res = await fetchSubmissions(targetForm.id, 1, 200);
  return res.data
    .map((sub) => ({
      label: String(sub.data[displayField] || ''),
      value: String(sub.data[valueField] || ''),
    }))
    .filter((opt) => opt.label && opt.value);
}

// ─── Version History ─────────────────────────────────────────

export interface FormVersion {
  id: string;
  versionNumber: number;
  label: string;
  createdBy: string;
  createdAt: string;
}

export interface FormVersionDetail extends FormVersion {
  snapshot: Record<string, unknown>;
}

export async function fetchVersions(formId: string): Promise<FormVersion[]> {
  const res = await api.get<{ success: boolean; data: FormVersion[] }>(apiRoutes.forms.versions(formId));
  return res.data;
}

export async function fetchVersionDetail(formId: string, versionId: string): Promise<FormVersionDetail> {
  const res = await api.get<{ success: boolean; data: FormVersionDetail }>(
    apiRoutes.forms.versionDetail(formId, versionId),
  );
  return res.data;
}

export async function restoreVersion(formId: string, versionId: string): Promise<void> {
  await api.post(apiRoutes.forms.versionRestore(formId, versionId));
}

// ─── Analytics ───────────────────────────────────────────────

export interface FormAnalyticsData {
  totalSubmissions: number;
  uniqueSubmitters: number;
  avgPerDay: number;
  dailyCounts: Array<{ date: string; count: number }>;
  fieldStats: Array<{ fieldName: string; label: string; type: string; completionRate: number }>;
  formCreatedAt: string;
  formStatus: string;
}

export async function fetchAnalytics(formId: string): Promise<FormAnalyticsData> {
  const res = await api.get<{ success: boolean; data: FormAnalyticsData }>(apiRoutes.forms.analytics(formId));
  return res.data;
}

// ─── Response Insights (value distributions) ─────────────────

export interface FieldInsight {
  fieldName: string;
  label: string;
  type: string;
  distribution?: Record<string, number>;
  numericStats?: { min: number; max: number; avg: number; median: number };
  topValues?: Array<{ value: string; count: number }>;
  emptyCount: number;
  filledCount: number;
}

export interface ResponseInsightsData {
  sampleSize: number;
  insights: FieldInsight[];
}

export async function fetchResponseInsights(formId: string): Promise<ResponseInsightsData> {
  const res = await api.get<{ success: boolean; data: ResponseInsightsData }>(
    apiRoutes.forms.responseInsights(formId),
  );
  return res.data;
}

// ─── Review Status ───────────────────────────────────────────

export async function updateReviewStatus(
  formId: string,
  submissionId: string,
  status: 'pending' | 'reviewed' | 'flagged',
): Promise<void> {
  await api.put(
    `${apiRoutes.forms.submissions(formId)}/${submissionId}/review`,
    { status },
  );
}

// ─── Import / Export ─────────────────────────────────────────

export async function exportFormJson(formId: string): Promise<void> {
  // Download as file via the browser
  const res = await api.get<Record<string, unknown>>(apiRoutes.forms.exportForm(formId));
  const blob = new Blob([JSON.stringify(res, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `form-export.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function importFormJson(data: Record<string, unknown>): Promise<{ id: string; name: string; slug: string }> {
  const res = await api.post<{ success: boolean; data: { id: string; name: string; slug: string } }>(
    apiRoutes.forms.importForm,
    data,
  );
  return res.data;
}

// ─── Templates ─────────────────────────────────────────────

export interface FormTemplate {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  icon: string;
  isSystem: boolean;
  createdBy: string;
  createdAt: string;
}

export async function fetchTemplates(): Promise<FormTemplate[]> {
  const url = appendCompanyParam(apiRoutes.forms.templatesList);
  const res = await api.get<{ success: boolean; data: FormTemplate[] }>(url);
  return res.data;
}

export async function createTemplate(data: {
  name: string;
  category: string;
  description: string;
  icon: string;
  snapshot: Record<string, unknown>;
}): Promise<{ id: string }> {
  const res = await api.post<{ success: boolean; data: { id: string } }>(
    apiRoutes.forms.templatesCreate,
    data,
  );
  return res.data;
}

export async function useTemplate(templateId: string, name?: string): Promise<{ id: string; name: string; slug: string }> {
  const res = await api.post<{ success: boolean; data: { id: string; name: string; slug: string } }>(
    apiRoutes.forms.templateUse(templateId),
    { name },
  );
  return res.data;
}

export async function deleteTemplate(templateId: string): Promise<void> {
  await api.delete(apiRoutes.forms.templateDelete(templateId));
}

export async function saveFormAsTemplate(form: FormDefinition, category = 'custom', icon = '📋'): Promise<{ id: string }> {
  const snapshot = mapFormToPayload(form);
  return createTemplate({
    name: `${form.name} Template`,
    category,
    description: form.description || '',
    icon,
    snapshot,
  });
}

// ─── Helpers ─────────────────────────────────────────────────

function mapFormToPayload(form: FormDefinition) {
  return {
    name: form.name,
    slug: form.slug,
    description: form.description,
    status: form.status,
    kind: form.kind ?? 'process',
    bindingMode: form.bindingMode ?? 'standalone',
    boundModel: form.boundModel ?? null,
    boundTableName: form.boundTableName ?? null,
    boundValueField: form.boundValueField ?? null,
    boundDisplayField: form.boundDisplayField ?? null,
    layout: form.settings.layout,
    settings: form.settings,
    sections: form.sections.map((sec) => ({
      title: sec.title,
      description: sec.description,
      collapsible: sec.collapsed,
      visibility: sec.visibility || null,
      fields: sec.fields.map((f) => ({
        type: f.type,
        label: f.label,
        name: f.name,
        placeholder: f.placeholder,
        helpText: f.helpText,
        defaultValue: f.defaultValue,
        width: f.width,
        options: f.options,
        validation: f.validation,
        conditionalVisibility: f.conditionalVisibility || null,
        lookupConfig: f.lookupConfig || null,
        calculated: f.calculated || null,
        readOnly: f.readOnly,
      })),
    })),
  };
}

/**
 * Convert a backend FormDetailResponse to a frontend FormDefinition
 */
export function mapResponseToForm(data: FormDetailResponse): FormDefinition {
  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    description: data.description,
    status: data.status as 'draft' | 'published' | 'archived',
    kind: (data.kind as 'process' | 'entity' | undefined) ?? 'process',
    entityTableName: data.entityTableName ?? null,
    bindingMode: (data.bindingMode as 'standalone' | 'bound' | undefined) ?? 'standalone',
    boundModel: data.boundModel ?? null,
    boundTableName: data.boundTableName ?? null,
    boundValueField: data.boundValueField ?? null,
    boundDisplayField: data.boundDisplayField ?? null,
    autoApplyMigrations: data.autoApplyMigrations !== false, // default true
    settings: {
      layout: (data.layout === 'two-column' ? 'two-column' : 'single-column') as 'single-column' | 'two-column',
      submitButtonText: (data.settings?.submitButtonText as string) || 'Submit',
      successMessage: (data.settings?.successMessage as string) || 'Form submitted successfully!',
      submitAction: (data.settings?.submitAction as 'store' | 'email' | 'webhook') || 'store',
      notifyEmail: (data.settings?.notifyEmail as string) || '',
      webhookUrl: (data.settings?.webhookUrl as string) || '',
      requireAuth: (data.settings?.requireAuth as boolean) ?? false,
      allowMultiple: (data.settings?.allowMultiple as boolean) ?? false,
    },
    sections: data.sections.map((sec) => ({
      id: sec.id,
      title: sec.title,
      description: sec.description,
      collapsed: sec.collapsible,
      visibility: sec.visibility || undefined,
      fields: sec.fields.map((f) => ({
        id: f.id,
        type: f.type as import('../form-builder/types').FieldType,
        label: f.label,
        name: f.name,
        placeholder: f.placeholder,
        helpText: f.helpText,
        defaultValue: f.defaultValue,
        width: (f.width as 'full' | 'half' | 'third') || 'full',
        options: f.options || [],
        validation: {
          required: (f.validation?.required as boolean) ?? false,
          minLength: f.validation?.minLength as number | undefined,
          maxLength: f.validation?.maxLength as number | undefined,
          min: f.validation?.min as number | undefined,
          max: f.validation?.max as number | undefined,
          pattern: f.validation?.pattern as string | undefined,
          patternMessage: f.validation?.patternMessage as string | undefined,
        },
        conditionalVisibility: f.conditionalVisibility || undefined,
        calculated: f.calculated || undefined,
        readOnly: f.readOnly,
      })),
    })),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    // Module Bridge assignment (populated when form is assigned to an ERP module)
    moduleAssignment: data.moduleAssignment
      ? {
          targetModule: data.moduleAssignment.targetModule || '',
          menuParentId: data.moduleAssignment.menuParentId || '',
          menuLabel: data.moduleAssignment.menuLabel || '',
          menuIcon: data.moduleAssignment.menuIcon || '',
          menuSortOrder: data.moduleAssignment.menuSortOrder ?? 999,
          allowedRoles: data.moduleAssignment.allowedRoles || [],
        }
      : undefined,
  };
}

// ─── File Upload ─────────────────────────────────────────────

interface UploadResult {
  url: string;
  originalName: string;
  size: number;
  mimeType: string;
}

export async function uploadFormFile(file: File): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await api.post<{ success: boolean; data: UploadResult }>(
    apiRoutes.forms.upload,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return res.data;
}

// ─── Global Field Registry ───────────────────────────────────

export interface GlobalFieldItem {
  id: string;
  fieldKey: string;
  label: string;
  fieldType: string;
  category: string;
  moduleScope: string | null;
  defaultOptions: unknown[] | null;
  defaultValidation: Record<string, unknown> | null;
  description: string | null;
  isSystem: boolean;
  companyId: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  /** Only in detail endpoint */
  usageCount?: number;
}

export async function fetchGlobalFields(params?: {
  category?: string;
  module?: string;
  search?: string;
}): Promise<GlobalFieldItem[]> {
  const qp = new URLSearchParams();
  if (params?.category) qp.set('category', params.category);
  if (params?.module) qp.set('module', params.module);
  if (params?.search) qp.set('search', params.search);
  const qs = qp.toString();
  const url = apiRoutes.globalFields.list + (qs ? `?${qs}` : '');

  const res = await api.get<{ success: boolean; data: GlobalFieldItem[] }>(url);
  return res.data;
}

export async function fetchGlobalFieldCategories(): Promise<string[]> {
  const res = await api.get<{ success: boolean; data: string[] }>(
    apiRoutes.globalFields.categories,
  );
  return res.data;
}

export async function fetchGlobalFieldDetail(id: number | string): Promise<GlobalFieldItem> {
  const res = await api.get<{ success: boolean; data: GlobalFieldItem }>(
    apiRoutes.globalFields.detail(id),
  );
  return res.data;
}

export async function seedGlobalFields(): Promise<{ seeded: number }> {
  const res = await api.post<{ success: boolean; data: { seeded: number } }>(
    apiRoutes.globalFields.seed,
  );
  return res.data;
}

// ─── Developer Pack — schema export ──────────────────────────

export interface DeveloperPack {
  formName: string;
  formSlug: string;
  modelName: string;
  tableName: string;
  viewName: string;
  prisma: string;
  sql: string;
  view: string;
  typescript: string;
  openapi: string;
  sampleQueries: string;
}

/**
 * Fetch the auto-generated developer artifacts for a form:
 * Prisma, SQL DDL, materialized View DDL, TypeScript types, OpenAPI spec,
 * and 5 sample queries.
 */
export async function fetchDeveloperPack(formId: string): Promise<DeveloperPack> {
  const res = await api.get<{ success: boolean; data: DeveloperPack }>(
    `/forms/${formId}/schema?format=all`,
  );
  return res.data;
}

/** Trigger a (re)build of the materialized SQL view for a form. */
export async function refreshFormView(formId: string): Promise<{ viewName: string }> {
  const res = await api.post<{ success: boolean; data: { viewName: string } }>(
    `/forms/${formId}/schema/refresh-view`,
  );
  return res.data;
}

// ─── Two-Track: Entity records (real-table CRUD) ─────────────

export interface EntityRecord {
  id: number;
  company_id?: number | null;
  form_id: number;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  review_status: string;
  [k: string]: unknown;
}

export interface EntityListResponse {
  data: EntityRecord[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface EntityFieldDef {
  name: string;
  label: string;
  type: string;
  validation?: Record<string, unknown>;
  options?: Array<{ label: string; value: string }>;
  readOnly?: boolean;
}

export interface EntitySchemaResponse {
  slug: string;
  name: string;
  kind: string;
  tableName: string | null;
  tableCreatedAt: string | null;
  status: string;
  fields: EntityFieldDef[];
}

export interface EntityMigration {
  id: number;
  form_id: number;
  table_name: string;
  change_type: string;
  ddl_sql: string;
  rollback_sql: string | null;
  status: string;
  error_message: string | null;
  applied_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  applied_at: string | null;
  created_at: string;
}

export interface EntityMigrationPlan {
  tableName: string;
  isFirstCreate: boolean;
  changes: Array<{
    changeType: string;
    ddl: string;
    rollback: string;
    description: string;
  }>;
}

export async function fetchEntitySchema(slug: string): Promise<EntitySchemaResponse> {
  const res = await api.get<{ success: boolean; data: EntitySchemaResponse }>(`/entities/${slug}/schema`);
  return res.data;
}

export async function listEntityRecords(
  slug: string,
  params: { page?: number; limit?: number; search?: string } = {},
): Promise<EntityListResponse> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.search) qs.set('search', params.search);
  const url = `/entities/${slug}${qs.toString() ? '?' + qs.toString() : ''}`;
  const res = await api.get<{ success: boolean; data: EntityRecord[]; pagination: EntityListResponse['pagination'] }>(url);
  return { data: res.data, pagination: res.pagination };
}

export async function getEntityRecord(slug: string, id: number | string): Promise<EntityRecord> {
  const res = await api.get<{ success: boolean; data: EntityRecord }>(`/entities/${slug}/${id}`);
  return res.data;
}

export async function createEntityRecord(slug: string, body: Record<string, unknown>): Promise<EntityRecord> {
  const res = await api.post<{ success: boolean; data: EntityRecord }>(`/entities/${slug}`, body);
  return res.data;
}

export async function updateEntityRecord(slug: string, id: number | string, body: Record<string, unknown>): Promise<EntityRecord> {
  const res = await api.put<{ success: boolean; data: EntityRecord }>(`/entities/${slug}/${id}`, body);
  return res.data;
}

export async function deleteEntityRecord(slug: string, id: number | string): Promise<void> {
  await api.delete(`/entities/${slug}/${id}`);
}

export async function planEntityMigration(slug: string): Promise<EntityMigrationPlan> {
  const res = await api.get<{ success: boolean; data: EntityMigrationPlan }>(`/entities/${slug}/migrations/plan`);
  return res.data;
}

export async function listEntityMigrations(slug: string): Promise<EntityMigration[]> {
  const res = await api.get<{ success: boolean; data: EntityMigration[] }>(`/entities/${slug}/migrations`);
  return res.data;
}

// ─── ERP Master catalog (existing Prisma tables) ─────────────

export interface ErpMaster {
  label: string;
  model: string;
  module: string;
  displayField: string;
  valueField: string;
  columns: Record<string, string>;
}

export interface ErpMasterCatalog {
  total: number;
  modules: string[];
  grouped: Record<string, ErpMaster[]>;
  flat: ErpMaster[];
}

/** List ERP master tables that an entity form can bind to. */
export async function fetchErpMasters(search?: string, moduleFilter?: string): Promise<ErpMasterCatalog> {
  const qs = new URLSearchParams();
  if (search) qs.set('search', search);
  if (moduleFilter) qs.set('module', moduleFilter);
  const url = `/erp-masters${qs.toString() ? '?' + qs.toString() : ''}`;
  const res = await api.get<{ success: boolean; data: ErpMasterCatalog }>(url);
  return res.data;
}

/** Fetch a 5-row sample of an ERP master to preview its data. */
export async function fetchErpMasterPreview(model: string): Promise<{
  model: string;
  meta: ErpMaster | null;
  sample: Array<{ id: number; label: string; code?: string }>;
}> {
  const res = await api.get<{ success: boolean; data: { model: string; meta: ErpMaster | null; sample: Array<{ id: number; label: string; code?: string }> } }>(
    `/erp-masters/${model}/preview`,
  );
  return res.data;
}

/**
 * Fetch dropdown options for an ERP master — used by lookup fields when
 * sourceKind='erp_master'. Returns up to 50 (configurable) {label, value}.
 */
export async function fetchErpMasterOptions(
  model: string,
  search?: string,
  limit?: number,
): Promise<{
  model: string;
  displayField: string;
  valueField: string;
  options: Array<{ label: string; value: string; code?: string }>;
}> {
  const qs = new URLSearchParams();
  if (search) qs.set('search', search);
  if (limit) qs.set('limit', String(limit));
  const url = `/erp-masters/${model}/options${qs.toString() ? '?' + qs.toString() : ''}`;
  const res = await api.get<{ success: boolean; data: { model: string; displayField: string; valueField: string; options: Array<{ label: string; value: string; code?: string }> } }>(url);
  return res.data;
}

// ─── Phase 4.2 — Convert process form → entity form ──────────

export interface ConversionFieldMapping {
  fieldName: string;
  fieldType: string;
  sqlType: string;
  required: boolean;
  storesAsJson: boolean;
  coercion: 'string' | 'number' | 'integer' | 'boolean' | 'date' | 'datetime' | 'json' | 'skip';
}

export interface ConversionWarning {
  level: 'info' | 'warn' | 'error';
  message: string;
  fieldName?: string;
  rowCount?: number;
}

export interface ConversionPlan {
  formId: number;
  formSlug: string;
  formName: string;
  tableName: string;
  rowCount: number;
  fieldMappings: ConversionFieldMapping[];
  warnings: ConversionWarning[];
  ddl: string;
  isReversible: boolean;
}

export interface ConversionResult {
  formId: number;
  tableName: string;
  rowsMigrated: number;
  rowsSkipped: number;
  rowsErrored: number;
  errors: Array<{ submissionId: number; error: string }>;
  ddlMigrationId: number;
  durationMs: number;
}

/** Preview the conversion — returns DDL, mappings, row count, warnings. */
export async function planConvertToEntity(formId: string): Promise<ConversionPlan> {
  const res = await api.get<{ success: boolean; data: ConversionPlan }>(
    `/forms/${formId}/convert-to-entity/plan`,
  );
  return res.data;
}

/** Run the conversion: CREATE TABLE → migrate rows → flip kind to 'entity'. */
export async function applyConvertToEntity(
  formId: string,
  opts: { batchSize?: number; failFast?: boolean } = {},
): Promise<ConversionResult> {
  const res = await api.post<{ success: boolean; data: ConversionResult }>(
    `/forms/${formId}/convert-to-entity`,
    opts,
  );
  return res.data;
}

// ─── Bulk import / export (Phase 4.x — industrial data ops) ──

export interface ImportRowError {
  rowIndex: number;
  field?: string;
  message: string;
}

export interface ImportPreview {
  dryRun: true;
  totalRows: number;
  validRows: number;
  errors: ImportRowError[];
  sample: Record<string, unknown>[];
  unknownColumns: string[];
  tableName: string;
}

export interface ImportResult {
  dryRun: false;
  tableName: string;
  totalRows: number;
  validRows: number;
  inserted: number;
  errored: number;
  validationErrors: ImportRowError[];
  insertErrors: Array<{ rowIndex: number; error: string }>;
  durationMs: number;
}

/**
 * Trigger a download of entity rows in the requested format.
 * Builds a temporary <a> with the JWT-authed download URL and clicks it.
 */
export function downloadEntityExport(
  slug: string,
  format: 'csv' | 'json' | 'xlsx',
  search?: string,
  limit?: number,
): void {
  const qs = new URLSearchParams({ format });
  if (search) qs.set('search', search);
  if (limit) qs.set('limit', String(limit));
  // Use api.get to ensure auth headers; convert response to blob.
  api.get<Blob>(
    `/entities/${slug}/export?${qs.toString()}`,
    { responseType: 'blob' },
  ).then((blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug}-${new Date().toISOString().slice(0, 10)}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}

/**
 * Upload a file as a dry-run import preview. The server validates each row
 * and returns counts, sample, and any errors. No DB writes.
 */
export async function previewEntityImport(slug: string, file: File): Promise<ImportPreview> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('dryRun', 'true');
  const res = await api.post<{ success: boolean; data: ImportPreview }>(
    `/entities/${slug}/import`,
    fd,
  );
  return res.data;
}

/** Commit an import. Reuploads the same file with dryRun=false. */
export async function applyEntityImport(slug: string, file: File): Promise<ImportResult> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('dryRun', 'false');
  const res = await api.post<{ success: boolean; data: ImportResult }>(
    `/entities/${slug}/import`,
    fd,
  );
  return res.data;
}

/** Approve & apply a single pending migration row (manual-approval mode). */
export async function approveMigrationStep(slug: string, migId: number): Promise<{ status: string; tableName: string; ddl: string }> {
  const res = await api.post<{ success: boolean; data: { status: string; tableName: string; ddl: string } }>(
    `/entities/${slug}/migrations/${migId}/approve`,
  );
  return res.data;
}

/** Rollback a previously-applied migration row by running its stored rollback DDL. */
export async function rollbackMigrationStep(slug: string, migId: number): Promise<{ status: string; tableName: string; rollbackDdl: string }> {
  const res = await api.post<{ success: boolean; data: { status: string; tableName: string; rollbackDdl: string } }>(
    `/entities/${slug}/migrations/${migId}/rollback`,
  );
  return res.data;
}

export async function applyEntityMigration(slug: string): Promise<{ tableName: string; appliedChanges: number }> {
  const res = await api.post<{ success: boolean; data: { tableName: string; appliedChanges: number; migrationIds: number[] } }>(
    `/entities/${slug}/migrations/apply`,
  );
  return res.data;
}
