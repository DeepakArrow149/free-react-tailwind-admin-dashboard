import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  cuttingApi,
  productionUpdateApi,
  fgTransferApi,
  operationApi,
  bulletinApi,
  productionOrderApi,
  hourlyApi,
  bundleApi,
  type GenerateBulletinInput,
  type CreatePOFromBalancingInput,
} from '@/api/production';
import { toast } from 'sonner';

// ── helpers ──
interface ApiErr { response?: { data?: { message?: string } }; message?: string; }
const errMsg = (e: ApiErr) => e?.response?.data?.message || e?.message || 'Request failed';

// ── Query-key registry ──
const K = {
  // Cutting
  cuttings:           ['production', 'cutting'] as const,
  cutting:            (id: number) => ['production', 'cutting', id] as const,
  // Production Updates
  prodUpdates:        ['production', 'updates'] as const,
  prodSummary:        (orderId: number) => ['production', 'updates', 'summary', orderId] as const,
  prodDashboard:      ['production', 'updates', 'dashboard'] as const,
  // FG Transfer
  fgTransfers:        ['production', 'fg-transfer'] as const,
  // Operations
  operations:         ['production', 'operations'] as const,
  operation:          (id: number) => ['production', 'operations', id] as const,
  // Bulletins
  bulletins:          ['production', 'bulletins'] as const,
  bulletin:           (id: number) => ['production', 'bulletins', id] as const,
  bulletinByStyle:    (styleId: number) => ['production', 'bulletins', 'by-style', styleId] as const,
  // Production Orders
  productionOrders:   ['production', 'orders'] as const,
  productionOrder:    (id: number) => ['production', 'orders', id] as const,
  // Hourly Production
  hourly:             ['production', 'hourly'] as const,
  hourlySummary:      (poId: number, date: string) => ['production', 'hourly', 'summary', poId, date] as const,
  hourlyDhu:          (orderId: number) => ['production', 'hourly', 'dhu', orderId] as const,
  hourlyTopDefects:   (orderId: number) => ['production', 'hourly', 'top-defects', orderId] as const,
  // Bundles
  bundles:            ['production', 'bundles'] as const,
  bundleScan:         (barcode: string) => ['production', 'bundles', 'scan', barcode] as const,
};

// ═══════ CUTTING ═══════
// NOTE: cuttingApi already calls .then(r => r.data), so no ApiEnvelope select needed for list;
// get/create/update/confirm return unwrapped data directly.

export function useCuttings(params?: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: [...K.cuttings, params],
    queryFn: () => cuttingApi.list(params),
  });
}

export function useCutting(id: number) {
  return useQuery({
    queryKey: K.cutting(id),
    queryFn: () => cuttingApi.get(id),
    enabled: !!id,
  });
}

export function useCreateCutting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => cuttingApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.cuttings }); toast.success('Cutting entry created'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useUpdateCutting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => cuttingApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.cuttings }); toast.success('Cutting entry updated'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useConfirmCutting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => cuttingApi.confirm(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.cuttings }); toast.success('Cutting confirmed'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useDeleteCutting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => cuttingApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.cuttings }); toast.success('Cutting entry deleted'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// ═══════ PRODUCTION UPDATES ═══════

export function useProductionUpdates(params?: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: [...K.prodUpdates, params],
    queryFn: () => productionUpdateApi.list(params),
  });
}

export function useCreateProductionUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => productionUpdateApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.prodUpdates }); qc.invalidateQueries({ queryKey: K.prodDashboard }); toast.success('Production update recorded'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useProductionSummary(orderId: number) {
  return useQuery({
    queryKey: K.prodSummary(orderId),
    queryFn: () => productionUpdateApi.summary(orderId),
    enabled: !!orderId,
  });
}

export function useProductionDashboard() {
  return useQuery({
    queryKey: K.prodDashboard,
    queryFn: () => productionUpdateApi.dashboard(),
  });
}

// ═══════ FG TRANSFERS ═══════

export function useFgTransfers(params?: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: [...K.fgTransfers, params],
    queryFn: () => fgTransferApi.list(params),
  });
}

export function useCreateFgTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => fgTransferApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.fgTransfers }); toast.success('FG transfer created'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useConfirmFgTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => fgTransferApi.confirm(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.fgTransfers }); toast.success('FG transfer confirmed'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useDeleteFgTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => fgTransferApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.fgTransfers }); toast.success('FG transfer deleted'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// ═══════ OPERATIONS ═══════

export function useOperations(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...K.operations, params],
    queryFn: () => operationApi.list(params),
  });
}

export function useOperation(id: number) {
  return useQuery({
    queryKey: K.operation(id),
    queryFn: () => operationApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateOperation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => operationApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.operations }); toast.success('Operation created'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useUpdateOperation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => operationApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.operations }); toast.success('Operation updated'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useDeleteOperation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => operationApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.operations }); toast.success('Operation deleted'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// ═══════ BULLETINS ═══════

export function useBulletins(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...K.bulletins, params],
    queryFn: () => bulletinApi.list(params),
  });
}

export function useBulletin(id: number) {
  return useQuery({
    queryKey: K.bulletin(id),
    queryFn: () => bulletinApi.getById(id),
    enabled: !!id,
  });
}

export function useBulletinsByStyle(styleId: number) {
  return useQuery({
    queryKey: K.bulletinByStyle(styleId),
    queryFn: () => bulletinApi.getByStyle(styleId),
    enabled: !!styleId,
  });
}

export function useCreateBulletin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => bulletinApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.bulletins }); toast.success('Bulletin created'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useUpdateBulletin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => bulletinApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.bulletins }); toast.success('Bulletin updated'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useApproveBulletin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => bulletinApi.approve(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.bulletins }); toast.success('Bulletin approved'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useGenerateBulletinFromStyle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: GenerateBulletinInput) => bulletinApi.generateFromStyle(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.bulletins }); toast.success('Bulletin generated from style'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// ═══════ PRODUCTION ORDERS ═══════

export function useProductionOrders(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...K.productionOrders, params],
    queryFn: () => productionOrderApi.list(params),
  });
}

export function useProductionOrder(id: number) {
  return useQuery({
    queryKey: K.productionOrder(id),
    queryFn: () => productionOrderApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateProductionOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => productionOrderApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.productionOrders }); toast.success('Production order created'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useCreateProductionOrderFromBalancing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePOFromBalancingInput) => productionOrderApi.createFromBalancing(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.productionOrders }); toast.success('Production order created from balancing'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useUpdateProductionOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => productionOrderApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.productionOrders }); toast.success('Production order updated'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useStartProductionOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => productionOrderApi.start(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.productionOrders }); toast.success('Production order started'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useCompleteProductionOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => productionOrderApi.complete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.productionOrders }); toast.success('Production order completed'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useCancelProductionOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => productionOrderApi.cancel(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.productionOrders }); toast.success('Production order cancelled'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// ═══════ HOURLY PRODUCTION ═══════

export function useHourlyProduction(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...K.hourly, params],
    queryFn: () => hourlyApi.list(params),
  });
}

export function useCreateHourlyProduction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => hourlyApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.hourly }); toast.success('Hourly production recorded'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useHourlySummary(poId: number, date: string) {
  return useQuery({
    queryKey: K.hourlySummary(poId, date),
    queryFn: () => hourlyApi.summary(poId, date),
    enabled: !!poId && !!date,
  });
}

export function useHourlyDhu(orderId: number, from: string, to: string) {
  return useQuery({
    queryKey: [...K.hourlyDhu(orderId), from, to],
    queryFn: () => hourlyApi.dhu(orderId, from, to),
    enabled: !!orderId && !!from && !!to,
  });
}

export function useHourlyTopDefects(orderId: number, from?: string, to?: string) {
  return useQuery({
    queryKey: [...K.hourlyTopDefects(orderId), from, to],
    queryFn: () => hourlyApi.topDefects(orderId, from, to),
    enabled: !!orderId,
  });
}

// ═══════ BUNDLES ═══════

export function useBundles(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...K.bundles, params],
    queryFn: () => bundleApi.list(params),
  });
}

export function useCreateBundle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => bundleApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.bundles }); toast.success('Bundle created'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useGenerateBundlesFromCutting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cuttingEntryId: number) => bundleApi.generateFromCutting(cuttingEntryId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.bundles }); toast.success('Bundles generated from cutting'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useIssueBundleToLine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, lineNo }: { id: number; lineNo: string }) => bundleApi.issueToLine(id, lineNo),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.bundles }); toast.success('Bundle issued to line'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useCompleteBundle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => bundleApi.complete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.bundles }); toast.success('Bundle completed'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useScanBundleBarcode(barcode: string) {
  return useQuery({
    queryKey: K.bundleScan(barcode),
    queryFn: () => bundleApi.scanBarcode(barcode),
    enabled: !!barcode,
  });
}
