import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  financialYearApi,
  accountApi,
  journalEntryApi,
  salesInvoiceApi,
  paymentReceiptApi,
  paymentOutApi,
  creditNoteApi,
  debitNoteApi,
  financeReportApi,
  fixedAssetApi,
  gstApi,
  bankReconApi,
  extendedReportApi,
  eInvoiceApi,
  ewayBillApi,
  tdsSectionApi,
  generalLedgerApi,
  bankStatementApi,
} from '@/api/finance';
import { toast } from 'sonner';

// ── helpers ──
interface ApiEnvelope<T = unknown> { success: boolean; data: T; message?: string; }
interface ApiErr { response?: { data?: { message?: string } }; message?: string; }
const errMsg = (e: ApiErr) => e?.response?.data?.message || e?.message || 'Request failed';

// ── Query-key registry ──
const K = {
  // Financial Year
  financialYears:   ['finance', 'financial-years'] as const,
  // Chart of Accounts
  accounts:         ['finance', 'accounts'] as const,
  accountTree:      ['finance', 'accounts', 'tree'] as const,
  // Journal Entries
  journalEntries:   ['finance', 'journal-entries'] as const,
  journalEntry:     (id: number) => ['finance', 'journal-entries', id] as const,
  // Sales Invoices
  salesInvoices:    ['finance', 'sales-invoices'] as const,
  salesInvoice:     (id: number) => ['finance', 'sales-invoices', id] as const,
  // Payment Receipts
  paymentReceipts:  ['finance', 'payment-receipts'] as const,
  // Payment Out
  paymentOuts:      ['finance', 'payment-outs'] as const,
  // Credit Notes
  creditNotes:      ['finance', 'credit-notes'] as const,
  // Debit Notes
  debitNotes:       ['finance', 'debit-notes'] as const,
  // Reports
  arAging:          ['finance', 'reports', 'ar-aging'] as const,
  trialBalance:     ['finance', 'reports', 'trial-balance'] as const,
  apAging:          ['finance', 'reports', 'ap-aging'] as const,
  balanceSheet:     ['finance', 'reports', 'balance-sheet'] as const,
  profitLoss:       ['finance', 'reports', 'profit-loss'] as const,
  cashFlow:         ['finance', 'reports', 'cash-flow'] as const,
  fundFlow:         ['finance', 'reports', 'fund-flow'] as const,
  // Fixed Assets
  fixedAssets:      ['finance', 'fixed-assets'] as const,
  fixedAsset:       (id: number) => ['finance', 'fixed-assets', id] as const,
  // GST
  gstReturns:       ['finance', 'gst-returns'] as const,
  // Bank Reconciliation
  bankRecon:        ['finance', 'bank-reconciliation'] as const,
  bankStatement:    ['finance', 'bank-statement'] as const,
  // E-Invoice
  eInvoices:        ['finance', 'e-invoices'] as const,
  eInvoice:         (id: number) => ['finance', 'e-invoices', id] as const,
  // E-Way Bill
  ewayBills:        ['finance', 'eway-bills'] as const,
  // TDS
  tdsSections:      ['finance', 'tds-sections'] as const,
  tdsSection:       (code: string) => ['finance', 'tds-sections', code] as const,
  // General Ledger
  generalLedger:    ['finance', 'general-ledger'] as const,
};

// ═══════ FINANCIAL YEARS ═══════

export function useFinancialYears() {
  return useQuery({
    queryKey: K.financialYears,
    queryFn: () => financialYearApi.list().then(r => r.data),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function useCreateFinancialYear() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => financialYearApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.financialYears }); toast.success('Financial year created'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useCloseFinancialYear() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => financialYearApi.close(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.financialYears }); toast.success('Financial year closed'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// ═══════ CHART OF ACCOUNTS ═══════

export function useAccounts(params?: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: [...K.accounts, params],
    queryFn: () => accountApi.list(params).then(r => r.data),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function useAccountTree() {
  return useQuery({
    queryKey: K.accountTree,
    queryFn: () => accountApi.tree().then(r => r.data),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function useCreateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => accountApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.accounts }); qc.invalidateQueries({ queryKey: K.accountTree }); toast.success('Account created'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useUpdateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => accountApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.accounts }); qc.invalidateQueries({ queryKey: K.accountTree }); toast.success('Account updated'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// ═══════ JOURNAL ENTRIES ═══════

export function useJournalEntries(params?: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: [...K.journalEntries, params],
    queryFn: () => journalEntryApi.list(params).then(r => r.data),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function useJournalEntry(id: number) {
  return useQuery({
    queryKey: K.journalEntry(id),
    queryFn: () => journalEntryApi.getById(id).then(r => r.data),
    select: (d: ApiEnvelope) => d.data,
    enabled: !!id,
  });
}

export function useCreateJournalEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => journalEntryApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.journalEntries }); toast.success('Journal entry created'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function usePostJournalEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => journalEntryApi.post(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.journalEntries }); toast.success('Journal entry posted'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useReverseJournalEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => journalEntryApi.reverse(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.journalEntries }); toast.success('Journal entry reversed'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// ═══════ SALES INVOICES ═══════

export function useSalesInvoices(params?: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: [...K.salesInvoices, params],
    queryFn: () => salesInvoiceApi.list(params).then(r => r.data),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function useSalesInvoice(id: number) {
  return useQuery({
    queryKey: K.salesInvoice(id),
    queryFn: () => salesInvoiceApi.getById(id).then(r => r.data),
    select: (d: ApiEnvelope) => d.data,
    enabled: !!id,
  });
}

export function useCreateSalesInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => salesInvoiceApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.salesInvoices }); toast.success('Sales invoice created'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useUpdateSalesInvoiceStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => salesInvoiceApi.updateStatus(id, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.salesInvoices }); toast.success('Invoice status updated'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// ═══════ PAYMENT RECEIPTS ═══════

export function usePaymentReceipts(params?: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: [...K.paymentReceipts, params],
    queryFn: () => paymentReceiptApi.list(params).then(r => r.data),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function useCreatePaymentReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => paymentReceiptApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.paymentReceipts }); toast.success('Payment receipt created'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// ═══════ PAYMENT OUT ═══════

export function usePaymentOuts(params?: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: [...K.paymentOuts, params],
    queryFn: () => paymentOutApi.list(params).then(r => r.data),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function useCreatePaymentOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => paymentOutApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.paymentOuts }); toast.success('Payment out created'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// ═══════ CREDIT NOTES ═══════

export function useCreditNotes(params?: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: [...K.creditNotes, params],
    queryFn: () => creditNoteApi.list(params).then(r => r.data),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function useCreateCreditNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => creditNoteApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.creditNotes }); toast.success('Credit note created'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useUpdateCreditNoteStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => creditNoteApi.updateStatus(id, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.creditNotes }); toast.success('Credit note status updated'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// ═══════ DEBIT NOTES ═══════

export function useDebitNotes(params?: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: [...K.debitNotes, params],
    queryFn: () => debitNoteApi.list(params).then(r => r.data),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function useCreateDebitNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => debitNoteApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.debitNotes }); toast.success('Debit note created'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useUpdateDebitNoteStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => debitNoteApi.updateStatus(id, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.debitNotes }); toast.success('Debit note status updated'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// ═══════ FINANCE REPORTS ═══════

export function useArAging() {
  return useQuery({
    queryKey: K.arAging,
    queryFn: () => financeReportApi.arAging().then(r => r.data),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function useTrialBalance() {
  return useQuery({
    queryKey: K.trialBalance,
    queryFn: () => financeReportApi.trialBalance().then(r => r.data),
    select: (d: ApiEnvelope) => d.data,
  });
}

export function useApAging() {
  return useQuery({
    queryKey: K.apAging,
    queryFn: () => extendedReportApi.apAging(),
  });
}

export function useBalanceSheet(financialYearId: number) {
  return useQuery({
    queryKey: [...K.balanceSheet, financialYearId],
    queryFn: () => extendedReportApi.balanceSheet(financialYearId),
    enabled: !!financialYearId,
  });
}

export function useProfitLoss(financialYearId: number, from?: string, to?: string) {
  return useQuery({
    queryKey: [...K.profitLoss, financialYearId, from, to],
    queryFn: () => extendedReportApi.profitLoss(financialYearId, from, to),
    enabled: !!financialYearId,
  });
}

export function useCashFlow(from: string, to: string) {
  return useQuery({
    queryKey: [...K.cashFlow, from, to],
    queryFn: () => extendedReportApi.cashFlow(from, to),
    enabled: !!from && !!to,
  });
}

export function useFundFlow(from: string, to: string) {
  return useQuery({
    queryKey: [...K.fundFlow, from, to],
    queryFn: () => extendedReportApi.fundFlow(from, to),
    enabled: !!from && !!to,
  });
}

// ═══════ FIXED ASSETS ═══════

export function useFixedAssets(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...K.fixedAssets, params],
    queryFn: () => fixedAssetApi.list(params),
  });
}

export function useFixedAsset(id: number) {
  return useQuery({
    queryKey: K.fixedAsset(id),
    queryFn: () => fixedAssetApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateFixedAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => fixedAssetApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.fixedAssets }); toast.success('Fixed asset created'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useDisposeFixedAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => fixedAssetApi.dispose(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.fixedAssets }); toast.success('Asset disposed'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useRunDepreciation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (period: string) => fixedAssetApi.runDepreciation(period),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.fixedAssets }); toast.success('Depreciation run complete'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// ═══════ GST RETURNS ═══════

export function useGstReturns(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...K.gstReturns, params],
    queryFn: () => gstApi.list(params),
  });
}

export function useGenerateGstr1() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (period: string) => gstApi.generateGstr1(period),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.gstReturns }); toast.success('GSTR-1 generated'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useGenerateGstr3b() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (period: string) => gstApi.generateGstr3b(period),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.gstReturns }); toast.success('GSTR-3B generated'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useFileGstReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, arn }: { id: number; arn: string }) => gstApi.file(id, arn),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.gstReturns }); toast.success('GST return filed'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useReconcile2B() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (period: string) => gstApi.reconcile2B(period),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.gstReturns }); toast.success('GSTR-2B reconciliation done'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// ═══════ BANK RECONCILIATION ═══════

export function useBankReconciliations(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...K.bankRecon, params],
    queryFn: () => bankReconApi.list(params),
  });
}

export function useCreateBankReconciliation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => bankReconApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.bankRecon }); toast.success('Bank reconciliation created'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useAddReconItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, items }: { id: number; items: Record<string, unknown>[] }) => bankReconApi.addItems(id, items),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.bankRecon }); toast.success('Reconciliation items added'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useReconcileItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, itemIds }: { id: number; itemIds: number[] }) => bankReconApi.reconcile(id, itemIds),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.bankRecon }); toast.success('Items reconciled'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useBankStatement(params: Record<string, unknown>) {
  return useQuery({
    queryKey: [...K.bankStatement, params],
    queryFn: () => bankReconApi.statement(params),
    enabled: !!params.accountId || !!params.bankAccountId,
  });
}

export function useImportBankStatement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: FormData) => bankStatementApi.import(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.bankStatement }); toast.success('Bank statement imported'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// ═══════ E-INVOICES ═══════

export function useEInvoices(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...K.eInvoices, params],
    queryFn: () => eInvoiceApi.list(params),
  });
}

export function useEInvoice(id: number) {
  return useQuery({
    queryKey: K.eInvoice(id),
    queryFn: () => eInvoiceApi.get(id),
    enabled: !!id,
  });
}

export function useGenerateEInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => eInvoiceApi.generate(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.eInvoices }); toast.success('E-Invoice generated'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useCancelEInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data?: Record<string, unknown> }) => eInvoiceApi.cancel(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.eInvoices }); toast.success('E-Invoice cancelled'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// ═══════ E-WAY BILLS ═══════

export function useEwayBills(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...K.ewayBills, params],
    queryFn: () => ewayBillApi.list(params),
  });
}

export function useGenerateEwayBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => ewayBillApi.generate(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.ewayBills }); toast.success('E-Way Bill generated'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useCancelEwayBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data?: Record<string, unknown> }) => ewayBillApi.cancel(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.ewayBills }); toast.success('E-Way Bill cancelled'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

export function useUpdateEwayBillTransport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => ewayBillApi.updateTransport(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: K.ewayBills }); toast.success('Transport details updated'); },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  });
}

// ═══════ TDS SECTIONS ═══════

export function useTdsSections() {
  return useQuery({
    queryKey: K.tdsSections,
    queryFn: () => tdsSectionApi.list(),
  });
}

export function useTdsSection(code: string) {
  return useQuery({
    queryKey: K.tdsSection(code),
    queryFn: () => tdsSectionApi.get(code),
    enabled: !!code,
  });
}

// ═══════ GENERAL LEDGER ═══════

export function useGeneralLedger(params: Record<string, unknown>) {
  return useQuery({
    queryKey: [...K.generalLedger, params],
    queryFn: () => generalLedgerApi.query(params),
    enabled: !!params.accountId,
  });
}
