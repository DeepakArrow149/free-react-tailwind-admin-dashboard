import { useState, useEffect } from 'react';
import PageMeta from '../../components/common/PageMeta';
import { PaginatedTable } from '../../components/table';
import {
  shippingBillApi, ShippingBill,
  blApi, BillOfLading,
  cooApi, CertificateOfOrigin,
  lcApi, LetterOfCredit,
  incentiveApi, ExportIncentive,
} from '../../api/export';

const TABS = ['Shipping Bills', 'B/L', 'COO', 'LC', 'Incentives'] as const;
type Tab = (typeof TABS)[number];

const badge = (s: string) => {
  const map: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    FILED: 'bg-blue-100 text-blue-700', LET_EXPORT: 'bg-yellow-100 text-yellow-700',
    SHIPPED: 'bg-green-100 text-green-700', ISSUED: 'bg-blue-100 text-blue-700',
    SURRENDERED: 'bg-orange-100 text-orange-700', RELEASED: 'bg-green-100 text-green-700',
    RECEIVED: 'bg-blue-100 text-blue-700', AMENDED: 'bg-yellow-100 text-yellow-700',
    DOCS_SUBMITTED: 'bg-indigo-100 text-indigo-700', DISCREPANCY: 'bg-red-100 text-red-700',
    NEGOTIATED: 'bg-purple-100 text-purple-700', REALIZED: 'bg-green-100 text-green-700',
    EXPIRED: 'bg-red-100 text-red-700', CLAIMED: 'bg-yellow-100 text-yellow-700',
    SANCTIONED: 'bg-blue-100 text-blue-700', CREDITED: 'bg-green-100 text-green-700',
  };
  return <span className={`px-2 py-0.5 rounded text-xs ${map[s] ?? 'bg-gray-100'}`}>{s}</span>;
};

export default function ExportDocumentsPage() {
  const [tab, setTab] = useState<Tab>('Shipping Bills');
  const [sbs, setSbs] = useState<ShippingBill[]>([]);
  const [bls, setBls] = useState<BillOfLading[]>([]);
  const [coos, setCoos] = useState<CertificateOfOrigin[]>([]);
  const [lcs, setLcs] = useState<LetterOfCredit[]>([]);
  const [incentives, setIncentives] = useState<ExportIncentive[]>([]);

  const loadSb = async () => { const r = await shippingBillApi.list(); setSbs(r.data.data || []); };
  const loadBl = async () => { const r = await blApi.list(); setBls(r.data.data || []); };
  const loadCoo = async () => { const r = await cooApi.list(); setCoos(r.data.data || []); };
  const loadLc = async () => { const r = await lcApi.list(); setLcs(r.data.data || []); };
  const loadInc = async () => { const r = await incentiveApi.list(); setIncentives(r.data.data || []); };

  useEffect(() => {
    if (tab === 'Shipping Bills') loadSb();
    else if (tab === 'B/L') loadBl();
    else if (tab === 'COO') loadCoo();
    else if (tab === 'LC') loadLc();
    else loadInc();
  }, [tab]);

  // Quick-create forms using prompt() for brevity
  const createSb = async () => {
    const orderId = prompt('Order ID?'); if (!orderId) return;
    await shippingBillApi.create({ orderId: +orderId, sbDate: new Date().toISOString().split('T')[0] });
    loadSb();
  };
  const createBl = async () => {
    const sbId = prompt('Shipping Bill ID?'); if (!sbId) return;
    await blApi.create({ shippingBillId: +sbId });
    loadBl();
  };
  const createCoo2 = async () => {
    const orderId = prompt('Order ID?'); if (!orderId) return;
    const dest = prompt('Destination Country (2-letter)?') || undefined;
    await cooApi.create({ orderId: +orderId, issueDate: new Date().toISOString().split('T')[0], destinationCountry: dest });
    loadCoo();
  };
  const createLc2 = async () => {
    const orderId = prompt('Order ID?'); const buyerId = prompt('Buyer ID?');
    const amt = prompt('LC Amount?'); if (!orderId || !buyerId || !amt) return;
    await lcApi.create({ orderId: +orderId, buyerId: +buyerId, lcAmount: +amt });
    loadLc();
  };
  const createInc = async () => {
    const orderId = prompt('Order ID?'); const fob = prompt('FOB Value?');
    const rate = prompt('Rate %?'); const type = prompt('Type (RODTEP/DUTY_DRAWBACK/ADVANCE_AUTH)?') || 'RODTEP';
    if (!orderId || !fob) return;
    await incentiveApi.create({ orderId: +orderId, fobValue: +fob, ratePct: +(rate || '0'), incentiveType: type });
    loadInc();
  };

  return (
    <>
      <PageMeta title="Export Documents | STITCH ERP" description="Export shipping documentation" />
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white/90">Export & Shipping</h3>
        <div className="flex space-x-2 mb-4 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 -mb-px text-sm font-medium whitespace-nowrap ${tab === t ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>{t}</button>
          ))}
        </div>

        {tab === 'Shipping Bills' && (
          <>
            <button onClick={createSb} className="mb-3 px-3 py-1.5 bg-blue-600 text-white rounded text-sm">+ New SB</button>
            <PaginatedTable data={sbs} pageSize={20}>
              {(pageData) => (
            <table className="w-full text-sm">
              <thead><tr className="border-b dark:border-gray-700 text-left text-gray-500">
                <th className="pb-2">SB No</th><th className="pb-2">Order</th><th className="pb-2">Date</th><th className="pb-2">Port</th><th className="pb-2">Status</th><th className="pb-2">Actions</th>
              </tr></thead>
              <tbody>{pageData.map(s => (
                <tr key={s.id} className="border-b dark:border-gray-800">
                  <td className="py-2">{s.sbNo}</td><td>{s.order?.orderNo}</td><td>{s.sbDate?.split('T')[0]}</td>
                  <td className="text-xs">{s.portOfLoading}</td><td>{badge(s.status)}</td>
                  <td className="space-x-1">
                    {s.status === 'DRAFT' && <button onClick={async () => { await shippingBillApi.updateStatus(s.id, { status: 'FILED' }); loadSb(); }} className="text-blue-600 text-xs hover:underline">File</button>}
                    {s.status === 'FILED' && <button onClick={async () => { await shippingBillApi.updateStatus(s.id, { status: 'LET_EXPORT', letExportDate: new Date().toISOString().split('T')[0] }); loadSb(); }} className="text-yellow-600 text-xs hover:underline">LEO</button>}
                    {s.status === 'LET_EXPORT' && <button onClick={async () => { await shippingBillApi.updateStatus(s.id, { status: 'SHIPPED' }); loadSb(); }} className="text-green-600 text-xs hover:underline">Ship</button>}
                  </td>
                </tr>
              ))}</tbody>
            </table>
              )}
            </PaginatedTable>
          </>
        )}

        {tab === 'B/L' && (
          <>
            <button onClick={createBl} className="mb-3 px-3 py-1.5 bg-blue-600 text-white rounded text-sm">+ New B/L</button>
            <PaginatedTable data={bls} pageSize={20}>
              {(pageData) => (
            <table className="w-full text-sm">
              <thead><tr className="border-b dark:border-gray-700 text-left text-gray-500">
                <th className="pb-2">BL No</th><th className="pb-2">Carrier</th><th className="pb-2">Vessel</th><th className="pb-2">ETD</th><th className="pb-2">ETA</th><th className="pb-2">Status</th>
              </tr></thead>
              <tbody>{pageData.map(b => (
                <tr key={b.id} className="border-b dark:border-gray-800">
                  <td className="py-2">{b.blNo}</td><td>{b.carrierName ?? '-'}</td><td>{b.vesselName ?? '-'}</td>
                  <td>{b.etd?.split('T')[0] ?? '-'}</td><td>{b.eta?.split('T')[0] ?? '-'}</td><td>{badge(b.status)}</td>
                </tr>
              ))}</tbody>
            </table>
              )}
            </PaginatedTable>
          </>
        )}

        {tab === 'COO' && (
          <>
            <button onClick={createCoo2} className="mb-3 px-3 py-1.5 bg-blue-600 text-white rounded text-sm">+ New COO</button>
            <PaginatedTable data={coos} pageSize={20}>
              {(pageData) => (
            <table className="w-full text-sm">
              <thead><tr className="border-b dark:border-gray-700 text-left text-gray-500">
                <th className="pb-2">COO No</th><th className="pb-2">Order</th><th className="pb-2">Country</th><th className="pb-2">Scheme</th><th className="pb-2">Date</th>
              </tr></thead>
              <tbody>{pageData.map(c => (
                <tr key={c.id} className="border-b dark:border-gray-800">
                  <td className="py-2">{c.cooNo}</td><td>{c.order?.orderNo}</td>
                  <td>{c.destinationCountry ?? '-'}</td><td>{c.preferentialScheme ?? '-'}</td><td>{c.issueDate?.split('T')[0] ?? '-'}</td>
                </tr>
              ))}</tbody>
            </table>
              )}
            </PaginatedTable>
          </>
        )}

        {tab === 'LC' && (
          <>
            <button onClick={createLc2} className="mb-3 px-3 py-1.5 bg-blue-600 text-white rounded text-sm">+ New LC</button>
            <PaginatedTable data={lcs} pageSize={20}>
              {(pageData) => (
            <table className="w-full text-sm">
              <thead><tr className="border-b dark:border-gray-700 text-left text-gray-500">
                <th className="pb-2">LC No</th><th className="pb-2">Order</th><th className="pb-2">Buyer</th><th className="pb-2">Bank</th><th className="pb-2">Amount</th><th className="pb-2">Expiry</th><th className="pb-2">Status</th>
              </tr></thead>
              <tbody>{pageData.map(l => (
                <tr key={l.id} className="border-b dark:border-gray-800">
                  <td className="py-2">{l.lcNo}</td><td>{l.order?.orderNo}</td><td>{l.buyer?.name}</td>
                  <td>{l.bankName ?? '-'}</td><td>{l.currency} {Number(l.lcAmount).toLocaleString()}</td>
                  <td>{l.expiryDate?.split('T')[0] ?? '-'}</td><td>{badge(l.status)}</td>
                </tr>
              ))}</tbody>
            </table>
              )}
            </PaginatedTable>
          </>
        )}

        {tab === 'Incentives' && (
          <>
            <button onClick={createInc} className="mb-3 px-3 py-1.5 bg-blue-600 text-white rounded text-sm">+ New Incentive</button>
            <PaginatedTable data={incentives} pageSize={20}>
              {(pageData) => (
            <table className="w-full text-sm">
              <thead><tr className="border-b dark:border-gray-700 text-left text-gray-500">
                <th className="pb-2">Claim No</th><th className="pb-2">Order</th><th className="pb-2">Type</th><th className="pb-2">FOB</th><th className="pb-2">Rate%</th><th className="pb-2">Claim Amt</th><th className="pb-2">Status</th>
              </tr></thead>
              <tbody>{pageData.map(i => (
                <tr key={i.id} className="border-b dark:border-gray-800">
                  <td className="py-2">{i.claimNo}</td><td>{i.order?.orderNo}</td><td>{i.incentiveType}</td>
                  <td>{Number(i.fobValue).toLocaleString()}</td><td>{Number(i.ratePct ?? 0).toFixed(2)}%</td>
                  <td>{Number(i.claimAmount ?? 0).toLocaleString()}</td><td>{badge(i.status)}</td>
                </tr>
              ))}</tbody>
            </table>
              )}
            </PaginatedTable>
          </>
        )}
      </div>
    </>
  );
}
