/**
 * ── PDF Download Utility ──
 *
 * Opens a server-generated PDF in a new browser tab.
 * The backend streams the PDF with `Content-Disposition: inline`,
 * so the browser's native PDF viewer handles display.
 *
 * We append the auth token as a query param since window.open()
 * cannot set Authorization headers.
 */
import { env } from '@/core/config/env';
import { tokenService } from '@/core/services/tokenService';
import { apiRoutes } from '@/core/api/apiRoutes';

/**
 * Open a document PDF in a new browser tab.
 *
 * @param docType - One of: 'purchase-order', 'grn', 'sales-invoice',
 *                  'purchase-invoice', 'commercial-invoice', 'packing-list'
 * @param id      - The record ID
 */
export function downloadPdf(docType: string, id: number | string) {
  const token = tokenService.getAccessToken();
  const base = env.API_BASE_URL;
  const path = apiRoutes.documents.pdf(docType, id);
  const url = `${base}${path}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}
