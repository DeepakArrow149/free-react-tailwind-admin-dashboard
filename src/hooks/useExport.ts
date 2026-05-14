import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  shippingBillApi,
  blApi,
  cooApi,
  lcApi,
  incentiveApi,
  excelExportApi,
  commercialInvoiceApi,
  shippingInstructionApi,
  docChecklistApi,
  incentiveRateApi,
} from '@/api/export';
import { toast } from 'sonner';

// ── helpers ──
interface ApiEnvelope<T = unknown> { success: boolean; data: T; message?: string; }
interface ApiErr { response?: { data?: { message?: string } }; message?: string; }
const errMsg = (e: ApiErr) => e?.response?.data?.message || e?.message || 'Request failed';

// ── Query-key registry ──
const K = {
  // Shipping Bills
  shippingBills:        ['export', 'shipping-bills'] as const,
  // Bills of Lading
  billsOfLading:        ['export', 'bills-of-lading'] as const,
  // COO
  coo:                  ['export', 'coo'] as const,
  // LC
  lcs:                  ['export', 'lc'] as const,
  // Incentives
  incentives:           ['export', 'incentives'] as const,
  // Commercial Invoices
  commercialInvoices:   ['export', 'commercial-invoices'] as const,
  commercialInvoice:    (id: number) => ['export', 'commercial-invoices', id] as const,
  // Shipping Instructions
  shippingInstructions: ['export', 'shipping-instructions'] as const,
  shippingInstruction:  (id: number) => ['export', 'shipping-instructions', id] as const,
  // Doc Checklists
  docChecklists:        ['export', 'doc-checklists'] as const,
  docChecklistByOrder:  (orderId: number) => ['export', 'doc-checklists', 'order', orderId] as const,
  // Incentive Rates
  incentiveRates:       ['export', 'incentive-rates'] as const,
  incentiveRateLookup:  ['export', 'incentive-rates', 'lookup'] as const,
};

// ═══════ SHIPPING BILLS ═══════

export function useShippingBills(params?: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: [...K.shippingBills, params],
    queryFn: () => shippingBillApi.list(params).then(r => r.data),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function useCreateShippingBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => shippingBillApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.shippingBills }); toast.success('Shipping bill created'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useUpdateShippingBillStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => shippingBillApi.updateStatus(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.shippingBills }); toast.success('Shipping bill status updated'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// ═══════ BILLS OF LADING ═══════

export function useBillsOfLading(params?: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: [...K.billsOfLading, params],
    queryFn: () => blApi.list(params).then(r => r.data),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function useCreateBillOfLading() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => blApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.billsOfLading }); toast.success('Bill of Lading created'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useUpdateBillOfLadingStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => blApi.updateStatus(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.billsOfLading }); toast.success('B/L status updated'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// ═══════ CERTIFICATE OF ORIGIN ═══════

export function useCertificatesOfOrigin(params?: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: [...K.coo, params],
    queryFn: () => cooApi.list(params).then(r => r.data),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function useCreateCertificateOfOrigin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => cooApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.coo }); toast.success('Certificate of Origin created'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// ═══════ LETTERS OF CREDIT ═══════

export function useLettersOfCredit(params?: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: [...K.lcs, params],
    queryFn: () => lcApi.list(params).then(r => r.data),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function useCreateLetterOfCredit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => lcApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.lcs }); toast.success('Letter of Credit created'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useUpdateLcStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => lcApi.updateStatus(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.lcs }); toast.success('LC status updated'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// ═══════ EXPORT INCENTIVES ═══════

export function useExportIncentives(params?: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: [...K.incentives, params],
    queryFn: () => incentiveApi.list(params).then(r => r.data),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function useCreateExportIncentive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => incentiveApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.incentives }); toast.success('Export incentive created'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useUpdateIncentiveStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => incentiveApi.updateStatus(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.incentives }); toast.success('Incentive status updated'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// ═══════ EXCEL EXPORTS ═══════

export function useExportOrders() {
  return useMutation({
    mutationFn: () => excelExportApi.orders(),
    onSuccess: () => toast.success('Orders exported'),
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useExportPurchaseOrders() {
  return useMutation({
    mutationFn: () => excelExportApi.purchaseOrders(),
    onSuccess: () => toast.success('Purchase orders exported'),
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useExportMaterials() {
  return useMutation({
    mutationFn: () => excelExportApi.materials(),
    onSuccess: () => toast.success('Materials exported'),
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// ═══════ COMMERCIAL INVOICES ═══════

export function useCommercialInvoices(params?: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: [...K.commercialInvoices, params],
    queryFn: () => commercialInvoiceApi.list(params).then(r => r.data),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function useCommercialInvoice(id: number) {
  return useQuery({
    queryKey: K.commercialInvoice(id),
    queryFn: () => commercialInvoiceApi.get(id).then(r => r.data),
    select: (d: ApiEnvelope) => d.data,
    enabled: !!id,
  });
}

export function useCreateCommercialInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => commercialInvoiceApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.commercialInvoices }); toast.success('Commercial invoice created'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useUpdateCommercialInvoiceStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => commercialInvoiceApi.updateStatus(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.commercialInvoices }); toast.success('Commercial invoice status updated'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// ═══════ SHIPPING INSTRUCTIONS ═══════

export function useShippingInstructions(params?: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: [...K.shippingInstructions, params],
    queryFn: () => shippingInstructionApi.list(params).then(r => r.data),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function useShippingInstruction(id: number) {
  return useQuery({
    queryKey: K.shippingInstruction(id),
    queryFn: () => shippingInstructionApi.get(id).then(r => r.data),
    select: (d: ApiEnvelope) => d.data,
    enabled: !!id,
  });
}

export function useCreateShippingInstruction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => shippingInstructionApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.shippingInstructions }); toast.success('Shipping instruction created'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useUpdateShippingInstruction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => shippingInstructionApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.shippingInstructions }); toast.success('Shipping instruction updated'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// ═══════ DOCUMENT CHECKLISTS ═══════

export function useDocChecklists(params?: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: [...K.docChecklists, params],
    queryFn: () => docChecklistApi.list(params).then(r => r.data),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function useDocChecklistByOrder(orderId: number) {
  return useQuery({
    queryKey: K.docChecklistByOrder(orderId),
    queryFn: () => docChecklistApi.getByOrder(orderId).then(r => r.data),
    select: (d: ApiEnvelope) => d.data,
    enabled: !!orderId,
  });
}

export function useGenerateDocChecklist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => docChecklistApi.generate(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.docChecklists }); toast.success('Document checklist generated'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useUpdateChecklistItemStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, data }: { itemId: number; data: Record<string, unknown> }) => docChecklistApi.updateItemStatus(itemId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.docChecklists }); toast.success('Checklist item updated'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// ═══════ INCENTIVE RATES ═══════

export function useIncentiveRates(params?: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: [...K.incentiveRates, params],
    queryFn: () => incentiveRateApi.list(params).then(r => r.data),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function useIncentiveRateLookup(params: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: [...K.incentiveRateLookup, params],
    queryFn: () => incentiveRateApi.lookup(params).then(r => r.data),
    select: (d: ApiEnvelope) => d.data,
    enabled: !!params.hsCode || !!params.scheme,
  });
}

export function useCreateIncentiveRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => incentiveRateApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.incentiveRates }); toast.success('Incentive rate created'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useUpdateIncentiveRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => incentiveRateApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.incentiveRates }); toast.success('Incentive rate updated'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}
