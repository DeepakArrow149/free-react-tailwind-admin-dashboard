import { useState, useEffect } from 'react';
import PageMeta from '../../components/common/PageMeta';
import { claimApi, BuyerClaim } from '../../api/quality';

const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    OPEN: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    UNDER_REVIEW: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
    ACCEPTED: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    SETTLED: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  };
  return <span className={`px-2 py-0.5 rounded text-xs ${map[s] ?? 'bg-gray-100 dark:bg-gray-700'}`}>{s}</span>;
};

export default function BuyerClaimsPage() {
  const [items, setItems] = useState<BuyerClaim[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  interface ClaimForm {
    orderId?: number | string;
    buyerId?: number | string;
    claimDate?: string;
    claimType: string;
    currency: string;
    claimedAmount?: number | string;
    description?: string;
    remarks?: string;
    [key: string]: string | number | boolean | undefined;
  }

  const [form, setForm] = useState<ClaimForm>({ claimType: 'QUALITY_DEFECT', currency: 'USD' });

  const load = async () => {
    const params: Record<string, string | number | undefined> = { page, limit: 20 };
    if (filterStatus) params.status = filterStatus;
    const res = await claimApi.list(params);
    setItems(res.data.data.data);
    setTotalPages(res.data.data.totalPages);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [page, filterStatus]);

  const handleCreate = async () => {
    await claimApi.create(form);
    setForm({ claimType: 'QUALITY_DEFECT', currency: 'USD' });
    setShowForm(false);
    load();
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    const acceptedAmount = status === 'ACCEPTED' ? prompt('Accepted amount?') : undefined;
    await claimApi.updateStatus(id, { status, acceptedAmount: acceptedAmount ? parseFloat(acceptedAmount) : undefined });
    load();
  };

  const handleSettle = async (id: number) => {
    const acceptedAmount = prompt('Settlement amount?');
    const creditNoteNo = prompt('Credit Note No?');
    if (!acceptedAmount) return;
    await claimApi.settle(id, { acceptedAmount: parseFloat(acceptedAmount), creditNoteNo });
    load();
  };

  return (
    <>
      <PageMeta title="Buyer Claims | STITCH ERP" description="Buyer quality claims management" />
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Buyer Claims</h3>
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
            {showForm ? 'Cancel' : '+ New Claim'}
          </button>
        </div>

        {showForm && (
          <div className="mb-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div><label className="block text-xs text-gray-500 mb-1">Order ID*</label><input type="number" className="border rounded px-3 py-1.5 text-sm w-full dark:bg-gray-800 dark:border-gray-700" value={form.orderId ?? ''} onChange={e => setForm({ ...form, orderId: +e.target.value })} /></div>
              <div><label className="block text-xs text-gray-500 mb-1">Buyer ID*</label><input type="number" className="border rounded px-3 py-1.5 text-sm w-full dark:bg-gray-800 dark:border-gray-700" value={form.buyerId ?? ''} onChange={e => setForm({ ...form, buyerId: +e.target.value })} /></div>
              <div><label className="block text-xs text-gray-500 mb-1">Claim Date*</label><input type="date" className="border rounded px-3 py-1.5 text-sm w-full dark:bg-gray-800 dark:border-gray-700" value={form.claimDate ?? ''} onChange={e => setForm({ ...form, claimDate: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div><label className="block text-xs text-gray-500 mb-1">Claim Type*</label>
                <select className="border rounded px-3 py-1.5 text-sm w-full dark:bg-gray-800 dark:border-gray-700" value={form.claimType} onChange={e => setForm({ ...form, claimType: e.target.value })}>
                  <option value="QUALITY_DEFECT">Quality Defect</option>
                  <option value="SHORT_SHIPMENT">Short Shipment</option>
                  <option value="LATE_DELIVERY">Late Delivery</option>
                  <option value="WRONG_GOODS">Wrong Goods</option>
                  <option value="PACKAGING">Packaging</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div><label className="block text-xs text-gray-500 mb-1">Claimed Amount*</label><input type="number" step="0.01" className="border rounded px-3 py-1.5 text-sm w-full dark:bg-gray-800 dark:border-gray-700" value={form.claimedAmount ?? ''} onChange={e => setForm({ ...form, claimedAmount: +e.target.value })} /></div>
              <div><label className="block text-xs text-gray-500 mb-1">Currency</label>
                <select className="border rounded px-3 py-1.5 text-sm w-full dark:bg-gray-800 dark:border-gray-700" value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}>
                  <option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option><option value="INR">INR</option>
                </select>
              </div>
            </div>
            <div><label className="block text-xs text-gray-500 mb-1">Description*</label><textarea className="border rounded px-3 py-1.5 text-sm w-full dark:bg-gray-800 dark:border-gray-700" rows={2} value={form.description ?? ''} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div><label className="block text-xs text-gray-500 mb-1">Remarks</label><textarea className="border rounded px-3 py-1.5 text-sm w-full dark:bg-gray-800 dark:border-gray-700" rows={2} value={form.remarks ?? ''} onChange={e => setForm({ ...form, remarks: e.target.value })} /></div>
            <button onClick={handleCreate} className="px-5 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Create Claim</button>
          </div>
        )}

        <div className="flex gap-3 mb-4">
          <select className="border rounded px-3 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-700" value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
            <option value="">All Status</option>
            <option value="OPEN">Open</option><option value="UNDER_REVIEW">Under Review</option>
            <option value="ACCEPTED">Accepted</option><option value="REJECTED">Rejected</option>
            <option value="SETTLED">Settled</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b dark:border-gray-700 text-left text-gray-500">
              <th className="pb-2">Claim No</th><th className="pb-2">Order</th><th className="pb-2">Buyer</th>
              <th className="pb-2">Type</th><th className="pb-2">Amount</th><th className="pb-2">Accepted</th>
              <th className="pb-2">Status</th><th className="pb-2">Actions</th>
            </tr></thead>
            <tbody>
              {items.map(c => (
                <tr key={c.id} className="border-b dark:border-gray-800">
                  <td className="py-2">{c.claimNo}</td>
                  <td>{c.order?.orderNo ?? c.orderId}</td>
                  <td>{c.buyer?.name ?? c.buyerId}</td>
                  <td className="text-xs">{c.claimType.replace(/_/g, ' ')}</td>
                  <td>{c.currency} {Number(c.claimedAmount).toLocaleString()}</td>
                  <td>{c.acceptedAmount ? `${c.currency} ${Number(c.acceptedAmount).toLocaleString()}` : '-'}</td>
                  <td>{statusBadge(c.status)}</td>
                  <td className="space-x-1">
                    {c.status === 'OPEN' && (
                      <>
                        <button onClick={() => handleUpdateStatus(c.id, 'UNDER_REVIEW')} className="text-yellow-600 hover:underline text-xs">Review</button>
                        <button onClick={() => handleUpdateStatus(c.id, 'REJECTED')} className="text-red-600 hover:underline text-xs">Reject</button>
                      </>
                    )}
                    {c.status === 'UNDER_REVIEW' && (
                      <>
                        <button onClick={() => handleUpdateStatus(c.id, 'ACCEPTED')} className="text-green-600 hover:underline text-xs">Accept</button>
                        <button onClick={() => handleUpdateStatus(c.id, 'REJECTED')} className="text-red-600 hover:underline text-xs">Reject</button>
                      </>
                    )}
                    {c.status === 'ACCEPTED' && (
                      <button onClick={() => handleSettle(c.id)} className="text-purple-600 hover:underline text-xs">Settle</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-between items-center mt-3">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-sm border rounded disabled:opacity-40 dark:border-gray-700">Prev</button>
          <span className="text-sm text-gray-500">Page {page}/{totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-sm border rounded disabled:opacity-40 dark:border-gray-700">Next</button>
        </div>
      </div>
    </>
  );
}
