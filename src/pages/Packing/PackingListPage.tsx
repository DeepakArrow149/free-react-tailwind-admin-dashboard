import { useState, useEffect } from 'react';
import PageMeta from '../../components/common/PageMeta';
import { Pagination } from '../../components/table';
import { packingListApi, PackingList, PackingListDetail, CartonDetail } from '../../api/packing';
import { downloadPdf } from '../../utils/downloadPdf';

const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    CONFIRMED: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    SHIPPED: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  };
  return <span className={`px-2 py-0.5 rounded text-xs ${map[s] ?? 'bg-gray-100'}`}>{s}</span>;
};

export default function PackingListPage() {
  const [items, setItems] = useState<PackingList[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showForm, setShowForm] = useState(false);
  interface PackingForm {
    orderId?: number | string;
    buyerId?: number | string;
    plDate?: string;
    details: PackingListDetail[];
    cartons: CartonDetail[];
    [key: string]: string | number | boolean | PackingListDetail[] | CartonDetail[] | undefined;
  }

  interface CartonRow {
    cartonNo: string;
    qtyPerCarton: number;
    lengthCm?: number;
    widthCm?: number;
    heightCm?: number;
    grossWeightKg?: number;
    cbm?: number;
  }

  const [form, setForm] = useState<PackingForm>({ details: [], cartons: [] });
  const [detailRow, setDetailRow] = useState<PackingListDetail>({ skuCode: '', packedQty: 0 });
  const [cartonRow, setCartonRow] = useState<CartonRow>({ cartonNo: '', qtyPerCarton: 0 });

  const load = async () => {
    const res = await packingListApi.list({ page, limit: 20 });
    setItems(res.data.data || []);
    setTotalPages(res.data.meta?.totalPages ?? 1);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [page]);

  const addDetail = () => {
    setForm({ ...form, details: [...form.details, { ...detailRow }] });
    setDetailRow({ skuCode: '', packedQty: 0 });
  };

  const addCarton = () => {
    const l = cartonRow.lengthCm || 0, w = cartonRow.widthCm || 0, h = cartonRow.heightCm || 0;
    const cbm = (l * w * h) / 1_000_000;
    setForm({ ...form, cartons: [...form.cartons, { ...cartonRow, cbm: +cbm.toFixed(4) }] });
    setCartonRow({ cartonNo: '', qtyPerCarton: 0 });
  };

  const handleCreate = async () => {
    await packingListApi.create(form);
    setForm({ details: [], cartons: [] });
    setShowForm(false);
    load();
  };

  const handleConfirm = async (id: number) => {
    await packingListApi.updateStatus(id, { status: 'CONFIRMED' });
    load();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this packing list?')) return;
    await packingListApi.delete(id);
    load();
  };

  const totalCbm = form.cartons.reduce((s: number, c: CartonDetail) => s + (Number(c.cbm) || 0), 0);

  return (
    <>
      <PageMeta title="Packing Lists | STITCH ERP" description="Packing list management" />
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Packing Lists</h3>
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
            {showForm ? 'Cancel' : '+ New Packing List'}
          </button>
        </div>

        {showForm && (
          <div className="mb-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div><label className="block text-xs text-gray-500 mb-1">Order ID*</label><input type="number" aria-label="Order ID" className="border rounded px-3 py-1.5 text-sm w-full dark:bg-gray-800 dark:border-gray-700" value={form.orderId ?? ''} onChange={e => setForm({ ...form, orderId: +e.target.value })} /></div>
              <div><label className="block text-xs text-gray-500 mb-1">Buyer ID*</label><input type="number" aria-label="Buyer ID" className="border rounded px-3 py-1.5 text-sm w-full dark:bg-gray-800 dark:border-gray-700" value={form.buyerId ?? ''} onChange={e => setForm({ ...form, buyerId: +e.target.value })} /></div>
              <div><label className="block text-xs text-gray-500 mb-1">PL Date*</label><input type="date" aria-label="PL Date" className="border rounded px-3 py-1.5 text-sm w-full dark:bg-gray-800 dark:border-gray-700" value={form.plDate ?? ''} onChange={e => setForm({ ...form, plDate: e.target.value })} /></div>
            </div>

            {/* SKU Details */}
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">SKU Details</h4>
            <div className="flex gap-2 items-end">
              <input className="border rounded px-2 py-1 text-xs dark:bg-gray-800 dark:border-gray-700 w-28" placeholder="SKU Code" value={detailRow.skuCode} onChange={e => setDetailRow({ ...detailRow, skuCode: e.target.value })} />
              <input className="border rounded px-2 py-1 text-xs dark:bg-gray-800 dark:border-gray-700 w-20" placeholder="Color" value={detailRow.colorCode ?? ''} onChange={e => setDetailRow({ ...detailRow, colorCode: e.target.value })} />
              <input className="border rounded px-2 py-1 text-xs dark:bg-gray-800 dark:border-gray-700 w-16" placeholder="Size" value={detailRow.sizeCode ?? ''} onChange={e => setDetailRow({ ...detailRow, sizeCode: e.target.value })} />
              <input type="number" className="border rounded px-2 py-1 text-xs dark:bg-gray-800 dark:border-gray-700 w-16" placeholder="Qty" value={detailRow.packedQty || ''} onChange={e => setDetailRow({ ...detailRow, packedQty: +e.target.value })} />
              <button onClick={addDetail} className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">Add</button>
            </div>
            {form.details.length > 0 && (
              <div className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                {form.details.map((d: PackingListDetail, i: number) => <div key={i}>{d.skuCode} | {d.colorCode ?? '-'} | {d.sizeCode ?? '-'} | Qty: {d.packedQty}</div>)}
              </div>
            )}

            {/* Carton Details */}
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Carton Details</h4>
            <div className="flex gap-2 items-end flex-wrap">
              <input className="border rounded px-2 py-1 text-xs dark:bg-gray-800 dark:border-gray-700 w-20" placeholder="Carton No" value={cartonRow.cartonNo} onChange={e => setCartonRow({ ...cartonRow, cartonNo: e.target.value })} />
              <input type="number" className="border rounded px-2 py-1 text-xs dark:bg-gray-800 dark:border-gray-700 w-14" placeholder="Qty" value={cartonRow.qtyPerCarton || ''} onChange={e => setCartonRow({ ...cartonRow, qtyPerCarton: +e.target.value })} />
              <input type="number" className="border rounded px-2 py-1 text-xs dark:bg-gray-800 dark:border-gray-700 w-16" placeholder="L cm" value={cartonRow.lengthCm || ''} onChange={e => setCartonRow({ ...cartonRow, lengthCm: +e.target.value })} />
              <input type="number" className="border rounded px-2 py-1 text-xs dark:bg-gray-800 dark:border-gray-700 w-16" placeholder="W cm" value={cartonRow.widthCm || ''} onChange={e => setCartonRow({ ...cartonRow, widthCm: +e.target.value })} />
              <input type="number" className="border rounded px-2 py-1 text-xs dark:bg-gray-800 dark:border-gray-700 w-16" placeholder="H cm" value={cartonRow.heightCm || ''} onChange={e => setCartonRow({ ...cartonRow, heightCm: +e.target.value })} />
              <input type="number" className="border rounded px-2 py-1 text-xs dark:bg-gray-800 dark:border-gray-700 w-20" placeholder="Gross kg" value={cartonRow.grossWeightKg || ''} onChange={e => setCartonRow({ ...cartonRow, grossWeightKg: +e.target.value })} />
              <button onClick={addCarton} className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">Add</button>
            </div>
            {form.cartons.length > 0 && (
              <div className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                {form.cartons.map((c: CartonDetail, i: number) => <div key={i}>{c.cartonNo} | Qty: {c.qtyPerCarton} | {c.lengthCm}×{c.widthCm}×{c.heightCm}cm | CBM: {c.cbm}</div>)}
                <div className="font-medium mt-1">Total CBM: {totalCbm.toFixed(4)}</div>
              </div>
            )}

            <button onClick={handleCreate} className="px-5 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Create</button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b dark:border-gray-700 text-left text-gray-500">
              <th className="pb-2">PL No</th><th className="pb-2">Order</th><th className="pb-2">Buyer</th>
              <th className="pb-2">Cartons</th><th className="pb-2">Qty</th><th className="pb-2">CBM</th>
              <th className="pb-2">Status</th><th className="pb-2">Actions</th>
            </tr></thead>
            <tbody>
              {items.map(i => (
                <tr key={i.id} className="border-b dark:border-gray-800">
                  <td className="py-2">{i.plNo}</td>
                  <td>{i.order?.orderNo ?? i.orderId}</td>
                  <td>{i.buyer?.name ?? i.buyerId}</td>
                  <td>{i.totalCartons}</td>
                  <td>{i.totalQty}</td>
                  <td>{Number(i.totalCbm ?? 0).toFixed(4)}</td>
                  <td>{statusBadge(i.status)}</td>
                  <td className="space-x-1">
                    <button onClick={() => downloadPdf('packing-list', i.id)} className="text-purple-600 hover:underline text-xs">PDF</button>
                    {i.status === 'DRAFT' && <>
                      <button onClick={() => handleConfirm(i.id)} className="text-blue-600 hover:underline text-xs">Confirm</button>
                      <button onClick={() => handleDelete(i.id)} className="text-red-600 hover:underline text-xs">Delete</button>
                    </>}
                    {i.status === 'CONFIRMED' && (
                      <button onClick={async () => { await packingListApi.updateStatus(i.id, { status: 'SHIPPED' }); load(); }} className="text-green-600 hover:underline text-xs">Ship</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={(p) => setPage(p)}
            pageSize={20}
          />
        </div>
      </div>
    </>
  );
}
