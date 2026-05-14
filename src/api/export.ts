import client from './client';

export interface ShippingBill {
  id: number; sbNo: string; orderId: number;
  order?: { id: number; orderNo: string };
  sbDate: string; portOfLoading?: string; portOfDischarge?: string;
  iecCode?: string; adCode?: string; letExportDate?: string;
  customsRefNo?: string; status: string; remarks?: string;
  fobValue?: number; currency?: string; invoiceId?: number;
}

export interface BillOfLading {
  id: number; blNo: string; shippingBillId: number;
  shippingBill?: { id: number; sbNo: string };
  carrierName?: string; vesselName?: string; voyageNo?: string;
  portOfLoading?: string; portOfDischarge?: string;
  etd?: string; eta?: string; blDate?: string;
  freightAmount?: number; freightTerms?: string; status: string;
  containerNo?: string; shippingLine?: string; blType?: string;
}

export interface CertificateOfOrigin {
  id: number; cooNo: string; orderId: number;
  order?: { id: number; orderNo: string };
  issuedBy?: string; issueDate?: string;
  destinationCountry?: string; preferentialScheme?: string;
  issuingAuthority?: string; status?: string;
}

export interface LetterOfCredit {
  id: number; lcNo: string; buyerId: number; orderId: number;
  order?: { id: number; orderNo: string };
  buyer?: { id: number; name: string };
  bankName?: string; lcAmount: number; currency: string;
  issueDate?: string; expiryDate?: string; latestShipmentDate?: string;
  tolerancePct?: number; status: string;
  discrepancyDetails?: string; amendmentHistory?: Record<string, unknown>[];
  /** Aliases used by pages */
  lcValue?: number; lcDate?: string; issuingBank?: string;
  advisingBank?: string; shipmentDate?: string;
  applicant?: string; beneficiary?: string;
}

export interface ExportIncentive {
  id: number; claimNo: string; orderId: number;
  order?: { id: number; orderNo: string };
  invoiceId?: number; incentiveType: string;
  hsCode?: string; fobValue: number; ratePct?: number;
  claimAmount?: number; status: string;
  amount?: number; scheme?: string; scripsNo?: string;
  currency?: string; claimDate?: string;
}

export const shippingBillApi = {
  list: (p?: Record<string, string | number | boolean | undefined>) => client.get('/export/shipping-bills', { params: p }),
  create: (d: Record<string, unknown>) => client.post('/export/shipping-bills', d),
  updateStatus: (id: number, d: Record<string, unknown>) => client.put(`/export/shipping-bills/${id}/status`, d),
};

export const blApi = {
  list: (p?: Record<string, string | number | boolean | undefined>) => client.get('/export/bills-of-lading', { params: p }),
  create: (d: Record<string, unknown>) => client.post('/export/bills-of-lading', d),
  updateStatus: (id: number, d: Record<string, unknown>) => client.put(`/export/bills-of-lading/${id}/status`, d),
};

export const cooApi = {
  list: (p?: Record<string, string | number | boolean | undefined>) => client.get('/export/coo', { params: p }),
  create: (d: Record<string, unknown>) => client.post('/export/coo', d),
};

export const lcApi = {
  list: (p?: Record<string, string | number | boolean | undefined>) => client.get('/export/lc', { params: p }),
  create: (d: Record<string, unknown>) => client.post('/export/lc', d),
  updateStatus: (id: number, d: Record<string, unknown>) => client.put(`/export/lc/${id}/status`, d),
};

export const incentiveApi = {
  list: (p?: Record<string, string | number | boolean | undefined>) => client.get('/export/incentives', { params: p }),
  create: (d: Record<string, unknown>) => client.post('/export/incentives', d),
  updateStatus: (id: number, d: Record<string, unknown>) => client.put(`/export/incentives/${id}/status`, d),
};

/* ── Excel Download Helpers ── */
const downloadExcel = async (url: string, defaultName: string) => {
  const resp = await client.get(url, { responseType: "blob" });
  const blob = new Blob([resp.data], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  const disposition = resp.headers["content-disposition"];
  const match = disposition?.match(/filename="?(.+?)"?$/);
  link.download = match?.[1] ?? defaultName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
};

export const excelExportApi = {
  orders: () => downloadExcel("/reports/orders", "Buyer_Orders.xlsx"),
  purchaseOrders: () => downloadExcel("/reports/purchase-orders", "Purchase_Orders.xlsx"),
  materials: () => downloadExcel("/reports/materials", "Materials.xlsx"),
};

// ── Commercial Invoice API ──
export const commercialInvoiceApi = {
  list: (p?: Record<string, string | number | boolean | undefined>) => client.get('/export/commercial-invoices', { params: p }),
  get: (id: number) => client.get(`/export/commercial-invoices/${id}`),
  create: (d: Record<string, unknown>) => client.post('/export/commercial-invoices', d),
  updateStatus: (id: number, d: Record<string, unknown>) => client.put(`/export/commercial-invoices/${id}/status`, d),
};

// ── Shipping Instructions API ──
export const shippingInstructionApi = {
  list: (p?: Record<string, string | number | boolean | undefined>) => client.get('/export/shipping-instructions', { params: p }),
  get: (id: number) => client.get(`/export/shipping-instructions/${id}`),
  create: (d: Record<string, unknown>) => client.post('/export/shipping-instructions', d),
  update: (id: number, d: Record<string, unknown>) => client.put(`/export/shipping-instructions/${id}`, d),
};

// ── Document Checklist API ──
export const docChecklistApi = {
  list: (p?: Record<string, string | number | boolean | undefined>) => client.get('/export/doc-checklists', { params: p }),
  generate: (d: Record<string, unknown>) => client.post('/export/doc-checklists', d),
  getByOrder: (orderId: number) => client.get(`/export/doc-checklists/order/${orderId}`),
  updateItemStatus: (itemId: number, d: Record<string, unknown>) => client.patch(`/export/doc-checklists/items/${itemId}/status`, d),
};

// ── Incentive Rate API ──
export const incentiveRateApi = {
  list: (p?: Record<string, string | number | boolean | undefined>) => client.get('/export/incentive-rates', { params: p }),
  create: (d: Record<string, unknown>) => client.post('/export/incentive-rates', d),
  update: (id: number, d: Record<string, unknown>) => client.put(`/export/incentive-rates/${id}`, d),
  lookup: (p: Record<string, string | number | boolean | undefined>) => client.get('/export/incentive-rates/lookup', { params: p }),
};
