import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  rfqApi,
  purchaseOrderApi,
  grnApi,
  subcontractApi,
  vendorRatingApi,
  supplierReturnApi,
  purchaseInvoiceApi,
} from '@/api/procurement';
import { toast } from 'sonner';

// ── helpers ──
interface ApiEnvelope<T = unknown> { success: boolean; data: T; message?: string; }
interface ApiErr { response?: { data?: { message?: string } }; message?: string; }
const errMsg = (e: ApiErr) => e?.response?.data?.message || e?.message || 'Request failed';

// ── Query-key registry ──
const K = {
  // RFQ
  rfqs:             ['procurement', 'rfq'] as const,
  rfq:              (id: number) => ['procurement', 'rfq', id] as const,
  rfqComparison:    (id: number) => ['procurement', 'rfq', id, 'comparison'] as const,
  // Purchase Orders
  purchaseOrders:   ['procurement', 'purchase-orders'] as const,
  purchaseOrder:    (id: number) => ['procurement', 'purchase-orders', id] as const,
  // GRN
  grns:             ['procurement', 'grn'] as const,
  grn:              (id: number) => ['procurement', 'grn', id] as const,
  // Subcontract
  subcontractPending: ['procurement', 'subcontract', 'pending'] as const,
  subcontractOutward: (id: number) => ['procurement', 'subcontract', 'outward', id] as const,
  // Vendor Rating
  vendorRatings:    ['procurement', 'vendor-ratings'] as const,
  vendorRating:     (id: number) => ['procurement', 'vendor-ratings', id] as const,
  // Supplier Returns
  supplierReturns:  ['procurement', 'supplier-returns'] as const,
  supplierReturn:   (id: number) => ['procurement', 'supplier-returns', id] as const,
  // Purchase Invoices
  purchaseInvoices: ['procurement', 'purchase-invoices'] as const,
  purchaseInvoice:  (id: number) => ['procurement', 'purchase-invoices', id] as const,
};

// ═══════ RFQ ═══════

export function useRfqs(params?: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: [...K.rfqs, params],
    queryFn: () => rfqApi.list(params).then(r => r.data),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function useRfq(id: number) {
  return useQuery({
    queryKey: K.rfq(id),
    queryFn: () => rfqApi.get(id).then(r => r.data),
    select: (d: ApiEnvelope) => d.data,
    enabled: !!id,
  });
}

export function useRfqComparison(rfqId: number) {
  return useQuery({
    queryKey: K.rfqComparison(rfqId),
    queryFn: () => rfqApi.comparison(rfqId).then(r => r.data),
    select: (d: ApiEnvelope) => d.data,
    enabled: !!rfqId,
  });
}

export function useCreateRfq() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => rfqApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.rfqs }); toast.success('RFQ created'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useUpdateRfq() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => rfqApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.rfqs }); toast.success('RFQ updated'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useDeleteRfq() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => rfqApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.rfqs }); toast.success('RFQ deleted'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useSendRfq() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, supplierIds }: { id: number; supplierIds: number[] }) => rfqApi.send(id, supplierIds),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.rfqs }); toast.success('RFQ sent to suppliers'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useAddQuotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ rfqId, data }: { rfqId: number; data: Record<string, unknown> }) => rfqApi.addQuotation(rfqId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.rfqs }); toast.success('Quotation added'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// ═══════ PURCHASE ORDERS ═══════

export function usePurchaseOrders(params?: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: [...K.purchaseOrders, params],
    queryFn: () => purchaseOrderApi.list(params).then(r => r.data),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function usePurchaseOrder(id: number) {
  return useQuery({
    queryKey: K.purchaseOrder(id),
    queryFn: () => purchaseOrderApi.get(id).then(r => r.data),
    select: (d: ApiEnvelope) => d.data,
    enabled: !!id,
  });
}

export function useCreatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => purchaseOrderApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.purchaseOrders }); toast.success('Purchase order created'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useUpdatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => purchaseOrderApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.purchaseOrders }); toast.success('Purchase order updated'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useChangePurchaseOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => purchaseOrderApi.changeStatus(id, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.purchaseOrders }); toast.success('PO status updated'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useApprovePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => purchaseOrderApi.approve(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.purchaseOrders }); toast.success('Purchase order approved'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useDeletePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => purchaseOrderApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.purchaseOrders }); toast.success('Purchase order deleted'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// ═══════ GRN ═══════

export function useGrns(params?: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: [...K.grns, params],
    queryFn: () => grnApi.list(params).then(r => r.data),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function useGrn(id: number) {
  return useQuery({
    queryKey: K.grn(id),
    queryFn: () => grnApi.get(id).then(r => r.data),
    select: (d: ApiEnvelope) => d.data,
    enabled: !!id,
  });
}

export function useCreateGrn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => grnApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.grns }); toast.success('GRN created'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useConfirmGrn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => grnApi.confirm(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.grns }); toast.success('GRN confirmed'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// ═══════ SUBCONTRACT ═══════

export function useSubcontractPending() {
  return useQuery({
    queryKey: K.subcontractPending,
    queryFn: () => subcontractApi.listPending().then(r => r.data),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function useSubcontractOutward(id: number) {
  return useQuery({
    queryKey: K.subcontractOutward(id),
    queryFn: () => subcontractApi.getOutward(id).then(r => r.data),
    select: (d: ApiEnvelope) => d.data,
    enabled: !!id,
  });
}

export function useCreateSubcontractOutward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => subcontractApi.createOutward(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.subcontractPending }); toast.success('Subcontract outward created'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useCreateSubcontractInward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => subcontractApi.createInward(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.subcontractPending }); toast.success('Subcontract inward recorded'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// ═══════ VENDOR RATINGS ═══════

export function useVendorRatings(params?: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: [...K.vendorRatings, params],
    queryFn: () => vendorRatingApi.list(params).then(r => r.data),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function useVendorRating(id: number) {
  return useQuery({
    queryKey: K.vendorRating(id),
    queryFn: () => vendorRatingApi.get(id).then(r => r.data),
    select: (d: ApiEnvelope) => d.data,
    enabled: !!id,
  });
}

export function useGenerateVendorRating() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => vendorRatingApi.generate(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.vendorRatings }); toast.success('Vendor rating generated'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// ═══════ SUPPLIER RETURNS ═══════

export function useSupplierReturns(params?: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: [...K.supplierReturns, params],
    queryFn: () => supplierReturnApi.list(params).then(r => r.data),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function useSupplierReturn(id: number) {
  return useQuery({
    queryKey: K.supplierReturn(id),
    queryFn: () => supplierReturnApi.get(id).then(r => r.data),
    select: (d: ApiEnvelope) => d.data,
    enabled: !!id,
  });
}

export function useCreateSupplierReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => supplierReturnApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.supplierReturns }); toast.success('Supplier return created'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useConfirmSupplierReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => supplierReturnApi.confirm(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.supplierReturns }); toast.success('Supplier return confirmed'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// ═══════ PURCHASE INVOICES ═══════

export function usePurchaseInvoices(params?: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: [...K.purchaseInvoices, params],
    queryFn: () => purchaseInvoiceApi.list(params).then(r => r.data),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function usePurchaseInvoice(id: number) {
  return useQuery({
    queryKey: K.purchaseInvoice(id),
    queryFn: () => purchaseInvoiceApi.get(id).then(r => r.data),
    select: (d: ApiEnvelope) => d.data,
    enabled: !!id,
  });
}

export function useCreatePurchaseInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => purchaseInvoiceApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.purchaseInvoices }); toast.success('Purchase invoice created'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useDeletePurchaseInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => purchaseInvoiceApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.purchaseInvoices }); toast.success('Purchase invoice deleted'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useMarkPurchaseInvoicePaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => purchaseInvoiceApi.markPaid(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.purchaseInvoices }); toast.success('Purchase invoice marked as paid'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}
