import api from './client';

// Generic paginated response
export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface SingleResponse<T> {
  success: boolean;
  data: T;
}

// ── Types ──
export interface Buyer {
  id: number;
  code: string;
  name: string;
  country: string | null;
  currency: string;
  paymentTerms: string | null;
  creditDays: number | null;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  gstin: string | null;
  buyerGroup: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: number;
  code: string;
  name: string;
  supplierType: string;
  country: string | null;
  currency: string;
  leadTimeDays: number | null;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface Material {
  id: number;
  materialCode: string;
  materialName: string;
  categoryId: number;
  materialType: string;
  unitOfMeasure: string;
  standardCost: number | null;
  isActive: boolean;
  category?: { id: number; name: string };
  preferredSupplier?: { id: number; name: string; code: string } | null;
  createdAt: string;
}

export interface StyleMaster {
  id: number;
  styleNo: string;
  styleName: string;
  buyerId: number;
  buyer?: { id: number; name: string; code: string };
  season?: { id: number; name: string; code: string } | null;
  category?: { id: number; name: string } | null;
  createdAt: string;
}

export interface Color {
  id: number;
  colorCode: string;
  colorName: string;
  hexValue: string | null;
}

export interface Season {
  id: number;
  code: string;
  name: string;
  year: number;
}

export interface Category {
  id: number;
  name: string;
  department: string | null;
}

export interface CompanyMaster {
  id: number;
  code: string;
  name: string;
  address: unknown;
  gstin: string | null;
  pan: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface BranchMaster {
  id: number;
  code: string;
  name: string;
  companyId: number;
  address: unknown;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  company?: { id: number; name: string; code: string };
  createdAt: string;
}

export interface BuyingAgent {
  id: number;
  code: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface MaterialCategory {
  id: number;
  name: string;
  parentId: number | null;
  description: string | null;
}

export interface PartyGroup {
  id: number;
  code: string;
  name: string;
  isActive: boolean;
}

export interface SectionMaster {
  id: number;
  code: string;
  name: string;
  isActive: boolean;
}

export interface ThreadQuality {
  id: number;
  code: string;
  name: string;
  isActive: boolean;
}

export interface CountMaster {
  id: number;
  code: string;
  name: string;
  isActive: boolean;
}

export interface Merchant {
  id: number;
  fullName: string;
  username: string;
  email: string;
}

export interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  isActive?: boolean;
}

// ── API Methods ──
export const masterApi = {
  // Buyers
  listBuyers: (params?: ListParams) => api.get<PaginatedResponse<Buyer>>('/master/buyers', { params }),
  getBuyer: (id: number) => api.get<SingleResponse<Buyer>>(`/master/buyers/${id}`),
  createBuyer: (data: Partial<Buyer>) => api.post<SingleResponse<Buyer>>('/master/buyers', data),
  updateBuyer: (id: number, data: Partial<Buyer>) => api.patch<SingleResponse<Buyer>>(`/master/buyers/${id}`, data),
  deleteBuyer: (id: number) => api.delete(`/master/buyers/${id}`),

  // Suppliers
  listSuppliers: (params?: ListParams) => api.get<PaginatedResponse<Supplier>>('/master/suppliers', { params }),
  getSupplier: (id: number) => api.get<SingleResponse<Supplier>>(`/master/suppliers/${id}`),
  createSupplier: (data: Partial<Supplier>) => api.post<SingleResponse<Supplier>>('/master/suppliers', data),
  updateSupplier: (id: number, data: Partial<Supplier>) => api.patch<SingleResponse<Supplier>>(`/master/suppliers/${id}`, data),
  deleteSupplier: (id: number) => api.delete(`/master/suppliers/${id}`),

  // Materials
  listMaterials: (params?: ListParams) => api.get<PaginatedResponse<Material>>('/master/materials', { params }),
  getMaterial: (id: number) => api.get<SingleResponse<Material>>(`/master/materials/${id}`),
  createMaterial: (data: Partial<Material>) => api.post<SingleResponse<Material>>('/master/materials', data),
  updateMaterial: (id: number, data: Partial<Material>) => api.patch<SingleResponse<Material>>(`/master/materials/${id}`, data),
  deleteMaterial: (id: number) => api.delete(`/master/materials/${id}`),

  // Styles
  listStyles: (params?: ListParams) => api.get<PaginatedResponse<StyleMaster>>('/master/styles', { params }),
  getStyle: (id: number) => api.get<SingleResponse<StyleMaster>>(`/master/styles/${id}`),
  createStyle: (data: Partial<StyleMaster>) => api.post<SingleResponse<StyleMaster>>('/master/styles', data),
  updateStyle: (id: number, data: Partial<StyleMaster>) => api.patch<SingleResponse<StyleMaster>>(`/master/styles/${id}`, data),
  deleteStyle: (id: number) => api.delete(`/master/styles/${id}`),

  // Lookups
  listColors: () => api.get<SingleResponse<Color[]>>('/master/colors'),
  createColor: (data: Partial<Color>) => api.post('/master/colors', data),
  listSeasons: () => api.get<SingleResponse<Season[]>>('/master/seasons'),
  createSeason: (data: Partial<Season>) => api.post('/master/seasons', data),
  listCategories: () => api.get<SingleResponse<Category[]>>('/master/categories'),
  createCategory: (data: Partial<Category>) => api.post('/master/categories', data),
  listCurrencies: () => api.get('/master/currencies'),
  listUnits: () => api.get('/master/units'),
  listMaterialCategories: () => api.get<SingleResponse<MaterialCategory[]>>('/master/material-categories'),

  // Companies
  listCompanies: (params?: ListParams) => api.get<PaginatedResponse<CompanyMaster>>('/master/companies', { params }),
  getCompany: (id: number) => api.get<SingleResponse<CompanyMaster>>(`/master/companies/${id}`),
  createCompany: (data: Partial<CompanyMaster>) => api.post<SingleResponse<CompanyMaster>>('/master/companies', data),
  updateCompany: (id: number, data: Partial<CompanyMaster>) => api.patch<SingleResponse<CompanyMaster>>(`/master/companies/${id}`, data),
  deleteCompany: (id: number) => api.delete(`/master/companies/${id}`),

  // Branches
  listBranches: (params?: ListParams) => api.get<PaginatedResponse<BranchMaster>>('/master/branches', { params }),
  getBranch: (id: number) => api.get<SingleResponse<BranchMaster>>(`/master/branches/${id}`),
  createBranch: (data: Partial<BranchMaster>) => api.post<SingleResponse<BranchMaster>>('/master/branches', data),
  updateBranch: (id: number, data: Partial<BranchMaster>) => api.patch<SingleResponse<BranchMaster>>(`/master/branches/${id}`, data),
  deleteBranch: (id: number) => api.delete(`/master/branches/${id}`),

  // Buying Agents
  listBuyingAgents: (params?: ListParams) => api.get<PaginatedResponse<BuyingAgent>>('/master/buying-agents', { params }),
  getBuyingAgent: (id: number) => api.get<SingleResponse<BuyingAgent>>(`/master/buying-agents/${id}`),
  createBuyingAgent: (data: Partial<BuyingAgent>) => api.post<SingleResponse<BuyingAgent>>('/master/buying-agents', data),
  updateBuyingAgent: (id: number, data: Partial<BuyingAgent>) => api.patch<SingleResponse<BuyingAgent>>(`/master/buying-agents/${id}`, data),
  deleteBuyingAgent: (id: number) => api.delete(`/master/buying-agents/${id}`),

  // Simple Lookups
  listPartyGroups: () => api.get<SingleResponse<PartyGroup[]>>('/master/party-groups'),
  createPartyGroup: (data: Partial<PartyGroup>) => api.post('/master/party-groups', data),
  listSections: () => api.get<SingleResponse<SectionMaster[]>>('/master/sections'),
  createSection: (data: Partial<SectionMaster>) => api.post('/master/sections', data),
  listThreadQualities: () => api.get<SingleResponse<ThreadQuality[]>>('/master/thread-qualities'),
  createThreadQuality: (data: Partial<ThreadQuality>) => api.post('/master/thread-qualities', data),
  listCounts: () => api.get<SingleResponse<CountMaster[]>>('/master/counts'),
  createCount: (data: Partial<CountMaster>) => api.post('/master/counts', data),
  listMerchants: () => api.get<SingleResponse<Merchant[]>>('/master/merchants'),
};
