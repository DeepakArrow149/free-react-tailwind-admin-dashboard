import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ticketApi,
  pmApi,
  sparePartApi,
  lookupApi,
  checklistApi,
  type CreateTicketPayload,
  type UpdateTicketPayload,
  type CreatePmSchedulePayload,
  type ExecutePmPayload,
  type CreateSparePartPayload,
  type CreateChecklistPayload,
} from '@/api/maintenance';

// ── Helpers ──
interface ApiEnvelope<T = unknown> { success: boolean; data: T; message?: string; }
interface ApiErr { response?: { data?: { message?: string } }; message?: string; }
const errMsg = (e: ApiErr) => e?.response?.data?.message || e?.message || 'Request failed';

// ── Query-key registry ──
const K = {
  tickets:         ['maintenance', 'tickets'] as const,
  ticket:          (id: number) => ['maintenance', 'tickets', id] as const,
  ticketDashboard: ['maintenance', 'tickets', 'dashboard'] as const,
  pmSchedules:     ['maintenance', 'pm-schedules'] as const,
  pmSchedule:      (id: number) => ['maintenance', 'pm-schedules', id] as const,
  pmLogs:          ['maintenance', 'pm-logs'] as const,
  overdueCount:    ['maintenance', 'pm-overdue'] as const,
  spareParts:      ['maintenance', 'spare-parts'] as const,
  sparePart:       (id: number) => ['maintenance', 'spare-parts', id] as const,
  lowStock:        ['maintenance', 'spare-parts', 'low-stock'] as const,
  categories:      ['maintenance', 'categories'] as const,
  stoppageReasons: ['maintenance', 'stoppage-reasons'] as const,
  checklists:      ['maintenance', 'checklists'] as const,
};

// ═══════════════════════════════════
// TICKET HOOKS
// ═══════════════════════════════════

export function useTickets(params?: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: [...K.tickets, params],
    queryFn: () => ticketApi.list(params),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function useTicket(id: number) {
  return useQuery({
    queryKey: K.ticket(id),
    queryFn: () => ticketApi.get(id),
    select: (d: ApiEnvelope) => d.data,
    enabled: !!id,
  });
}

export function useTicketDashboard() {
  return useQuery({
    queryKey: K.ticketDashboard,
    queryFn: () => ticketApi.dashboard(),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTicketPayload) => ticketApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: K.tickets });
      qc.invalidateQueries({ queryKey: K.ticketDashboard });
      toast.success('Ticket created');
    },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useUpdateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateTicketPayload }) => ticketApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: K.tickets });
      toast.success('Ticket updated');
    },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useChangeTicketStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => ticketApi.changeStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: K.tickets });
      qc.invalidateQueries({ queryKey: K.ticketDashboard });
      toast.success('Ticket status updated');
    },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useAssignTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, assignedTo }: { id: number; assignedTo: number }) => ticketApi.assign(id, assignedTo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: K.tickets });
      toast.success('Ticket assigned');
    },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useDeleteTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => ticketApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: K.tickets });
      qc.invalidateQueries({ queryKey: K.ticketDashboard });
      toast.success('Ticket deleted');
    },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// ═══════════════════════════════════
// PM HOOKS
// ═══════════════════════════════════

export function usePmSchedules(params?: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: [...K.pmSchedules, params],
    queryFn: () => pmApi.list(params),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function usePmSchedule(id: number) {
  return useQuery({
    queryKey: K.pmSchedule(id),
    queryFn: () => pmApi.get(id),
    select: (d: ApiEnvelope) => d.data,
    enabled: !!id,
  });
}

export function usePmLogs(params?: Record<string, string | number | undefined>) {
  return useQuery({
    queryKey: [...K.pmLogs, params],
    queryFn: () => pmApi.logs(params),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function useOverdueCount() {
  return useQuery({
    queryKey: K.overdueCount,
    queryFn: () => pmApi.overdueCount(),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function useCreatePmSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePmSchedulePayload) => pmApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: K.pmSchedules });
      toast.success('PM schedule created');
    },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useUpdatePmSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreatePmSchedulePayload> }) => pmApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: K.pmSchedules });
      toast.success('PM schedule updated');
    },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useExecutePm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ExecutePmPayload }) => pmApi.execute(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: K.pmSchedules });
      qc.invalidateQueries({ queryKey: K.pmLogs });
      qc.invalidateQueries({ queryKey: K.overdueCount });
      toast.success('PM execution logged');
    },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// ═══════════════════════════════════
// SPARE PARTS HOOKS
// ═══════════════════════════════════

export function useSpareParts(params?: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: [...K.spareParts, params],
    queryFn: () => sparePartApi.list(params),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function useSparePart(id: number) {
  return useQuery({
    queryKey: K.sparePart(id),
    queryFn: () => sparePartApi.get(id),
    select: (d: ApiEnvelope) => d.data,
    enabled: !!id,
  });
}

export function useLowStock() {
  return useQuery({
    queryKey: K.lowStock,
    queryFn: () => sparePartApi.lowStock(),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function useCreateSparePart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSparePartPayload) => sparePartApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: K.spareParts });
      toast.success('Spare part created');
    },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useUpdateSparePart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateSparePartPayload> }) => sparePartApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: K.spareParts });
      toast.success('Spare part updated');
    },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useDeleteSparePart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => sparePartApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: K.spareParts });
      toast.success('Spare part deleted');
    },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useSpareForTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { ticketId: number; sparePartId: number; qty: number }) => sparePartApi.use(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: K.spareParts });
      qc.invalidateQueries({ queryKey: K.tickets });
      toast.success('Spare part usage recorded');
    },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useAdjustStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, adjustment, reason }: { id: number; adjustment: number; reason: string }) =>
      sparePartApi.adjustStock(id, { adjustment, reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: K.spareParts });
      qc.invalidateQueries({ queryKey: K.lowStock });
      toast.success('Stock adjusted');
    },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// ═══════════════════════════════════
// LOOKUP HOOKS
// ═══════════════════════════════════

export function useBreakdownCategories() {
  return useQuery({
    queryKey: K.categories,
    queryFn: () => lookupApi.listCategories(),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { code: string; name: string; description?: string }) => lookupApi.createCategory(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: K.categories });
      toast.success('Category created');
    },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name?: string; description?: string } }) =>
      lookupApi.updateCategory(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: K.categories });
      toast.success('Category updated');
    },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => lookupApi.deleteCategory(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: K.categories });
      toast.success('Category deleted');
    },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useStoppageReasons() {
  return useQuery({
    queryKey: K.stoppageReasons,
    queryFn: () => lookupApi.listStoppageReasons(),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function useCreateStoppageReason() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { code: string; name: string; category: string; description?: string }) =>
      lookupApi.createStoppageReason(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: K.stoppageReasons });
      toast.success('Stoppage reason created');
    },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useUpdateStoppageReason() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name?: string; category?: string; description?: string } }) =>
      lookupApi.updateStoppageReason(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: K.stoppageReasons });
      toast.success('Stoppage reason updated');
    },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useDeleteStoppageReason() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => lookupApi.deleteStoppageReason(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: K.stoppageReasons });
      toast.success('Stoppage reason deleted');
    },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// ═══════════════════════════════════
// CHECKLIST HOOKS
// ═══════════════════════════════════

export function useChecklists(params?: Record<string, string | number | undefined>) {
  return useQuery({
    queryKey: [...K.checklists, params],
    queryFn: () => checklistApi.list(params),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function useCreateChecklist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateChecklistPayload) => checklistApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: K.checklists });
      toast.success('Checklist created');
    },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useUpdateChecklist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateChecklistPayload> }) => checklistApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: K.checklists });
      toast.success('Checklist updated');
    },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useDeleteChecklist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => checklistApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: K.checklists });
      toast.success('Checklist deleted');
    },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}
