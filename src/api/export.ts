import client from './client';

export interface ShippingBill {
  id: number; sbNo: string; orderId: number;
  order?: { id: number; orderNo: string };
  sbDate: string; portOfLoading?: string; portOfDischarge?: string;
  iecCode?: string; adCode?: string; letExportDate?: string;
  customsRefNo?: string; status: string; remarks?: string;
}

export interface BillOfLading {
  id: number; blNo: string; shippingBillId: number;
  shippingBill?: { id: number; sbNo: string };
  carrierName?: string; vesselName?: string; voyageNo?: string;
  portOfLoading?: string; portOfDischarge?: string;
  etd?: string; eta?: string; blDate?: string;
  freightAmount?: number; freightTerms?: string; status: string;
}

export interface CertificateOfOrigin {
  id: number; cooNo: string; orderId: number;
  order?: { id: number; orderNo: string };
  issuedBy?: string; issueDate?: string;
  destinationCountry?: string; preferentialScheme?: string;
}

export interface LetterOfCredit {
  id: number; lcNo: string; buyerId: number; orderId: number;
  order?: { id: number; orderNo: string };
  buyer?: { id: number; name: string };
  bankName?: string; lcAmount: number; currency: string;
  issueDate?: string; expiryDate?: string; latestShipmentDate?: string;
  tolerancePct?: number; status: string;
  discrepancyDetails?: string; amendmentHistory?: Record<string, unknown>[];
}

export interface ExportIncentive {
  id: number; claimNo: string; orderId: number;
  order?: { id: number; orderNo: string };
  invoiceId?: number; incentiveType: string;
  hsCode?: string; fobValue: number; ratePct?: number;
  claimAmount?: number; status: string;
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
