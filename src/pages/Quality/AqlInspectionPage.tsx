import { useState, useEffect } from 'react';
import PageMeta from '../../components/common/PageMeta';
import { Pagination } from '../../components/table';
import { aqlApi, AqlInspection, AqlCalculateResult } from '../../api/quality';

const TABS = ['Inspections', 'AQL Calculator', 'New Inspection'] as const;
type Tab = (typeof TABS)[number];

const resultBadge = (r?: string) => {
  if (!r) return <span className="px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700">PENDING</span>;
  const cls = r === 'PASS' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
    : r === 'FAIL' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
    : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
  return <span className={`px-2 py-0.5 rounded text-xs ${cls}`}>{r}</span>;
};

export default function AqlInspectionPage() {
  const [tab, setTab] = useState<Tab>('Inspections');
  const [items, setItems] = useState<AqlInspection[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterOrderId, setFilterOrderId] = useState('');

  // Calculator state
  const [calcLot, setCalcLot] = useState(500);
  const [calcLevel, setCalcLevel] = useState('II');
  const [calcMajor, setCalcMajor] = useState(2.5);
  const [calcMinor, setCalcMinor] = useState(4.0);
  const [calcResult, setCalcResult] = useState<AqlCalculateResult | null>(null);

  // Create form
  interface DefectEntry {
    defectCode: string;
    defectName: string;
    defectCategory: string;
    count: number;
    location?: string;
  }

  interface AqlForm {
    orderId?: number | string;
    inspectionDate?: string;
    inspectionType: string;
    inspectionLevel: string;
    aqlMajor: number;
    aqlMinor: number;
    lotQty: number;
    sampleQty?: number;
    inspectorName?: string;
    buyerQcName?: string;
    defectEntries: DefectEntry[];
    [key: string]: string | number | boolean | DefectEntry[] | undefined;
  }

  const [form, setForm] = useState<AqlForm>({ inspectionType: 'FINAL', inspectionLevel: 'II', aqlMajor: 2.5, aqlMinor: 4.0, lotQty: 500, defectEntries: [] });
  const [defectRow, setDefectRow] = useState<DefectEntry>({ defectCode: '', defectName: '', defectCategory: 'MAJOR', count: 1, location: '' });

  const load = async () => {
    const params: Record<string, string | number | undefined> = { page, limit: 20 };
    if (filterOrderId) params.orderId = filterOrderId;
    const res = await aqlApi.list(params);
    setItems(res.data.data || []);
    setTotalPages(res.data.meta?.totalPages ?? 1);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [page, filterOrderId]);

  const handleCalc = async () => {
    const res = await aqlApi.calculate({ lotQty: calcLot, level: calcLevel, aqlMajor: calcMajor, aqlMinor: calcMinor });
    setCalcResult(res.data.data);
  };

  const addDefect = () => {
    setForm({ ...form, defectEntries: [...form.defectEntries, { ...defectRow }] });
    setDefectRow({ defectCode: '', defectName: '', defectCategory: 'MAJOR', count: 1, location: '' });
  };

  const handleCreate = async () => {
    await aqlApi.create(form);
    setForm({ inspectionType: 'FINAL', inspectionLevel: 'II', aqlMajor: 2.5, aqlMinor: 4.0, lotQty: 500, defectEntries: [] });
    setTab('Inspections');
    load();
  };

  const handleRecordResult = async (id: number) => {
    const foundMajor = parseInt(prompt('Found Major defects?') || '0');
    const foundMinor = parseInt(prompt('Found Minor defects?') || '0');
    await aqlApi.recordResult(id, { foundMajor, foundMinor, defectEntries: [] });
    load();
  };

  return (
    <>
      <PageMeta title="AQL Inspection | STITCH ERP" description="AQL garment inspection management" />
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white/90">AQL Inspection</h3>

        <div className="flex space-x-2 mb-4 border-b border-gray-200 dark:border-gray-700">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 -mb-px text-sm font-medium ${tab === t ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>
              {t}
            </button>
          ))}
        </div>

        {tab === 'Inspections' && (
          <>
            <div className="flex gap-3 mb-4">
              <input aria-label="Filter Order ID" className="border rounded px-3 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-700" placeholder="Filter Order ID" value={filterOrderId} onChange={e => { setFilterOrderId(e.target.value); setPage(1); }} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b dark:border-gray-700 text-left text-gray-500">
                  <th className="pb-2">No</th><th className="pb-2">Order</th><th className="pb-2">Type</th>
                  <th className="pb-2">Lot Qty</th><th className="pb-2">Sample</th><th className="pb-2">Found (Maj/Min)</th>
                  <th className="pb-2">Result</th><th className="pb-2">Actions</th>
                </tr></thead>
                <tbody>
                  {items.map(i => (
                    <tr key={i.id} className="border-b dark:border-gray-800">
                      <td className="py-2">{i.inspectionNo}</td>
                      <td>{i.order?.orderNo ?? i.orderId}</td>
                      <td>{i.inspectionType}</td>
                      <td>{i.lotQty}</td>
                      <td>{i.sampleSize} ({i.sampleCodeLetter})</td>
                      <td>{i.foundMajor ?? '-'} / {i.foundMinor ?? '-'}</td>
                      <td>{resultBadge(i.result ?? undefined)}</td>
                      <td>
                        {!i.result && <button onClick={() => handleRecordResult(i.id)} className="text-blue-600 hover:underline text-xs">Record</button>}
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
          </>
        )}

        {tab === 'AQL Calculator' && (
          <div className="max-w-md space-y-3">
            <div><label className="block text-xs text-gray-500 mb-1">Lot Qty</label><input type="number" aria-label="Lot Qty" className="border rounded px-3 py-1.5 text-sm w-full dark:bg-gray-800 dark:border-gray-700" value={calcLot} onChange={e => setCalcLot(+e.target.value)} /></div>
            <div><label className="block text-xs text-gray-500 mb-1">Inspection Level</label>
              <select aria-label="Inspection Level" className="border rounded px-3 py-1.5 text-sm w-full dark:bg-gray-800 dark:border-gray-700" value={calcLevel} onChange={e => setCalcLevel(e.target.value)}>
                <option value="I">Level I (Reduced)</option><option value="II">Level II (Normal)</option><option value="III">Level III (Tightened)</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs text-gray-500 mb-1">AQL Major</label><input type="number" step="0.1" aria-label="AQL Major" className="border rounded px-3 py-1.5 text-sm w-full dark:bg-gray-800 dark:border-gray-700" value={calcMajor} onChange={e => setCalcMajor(+e.target.value)} /></div>
              <div><label className="block text-xs text-gray-500 mb-1">AQL Minor</label><input type="number" step="0.1" aria-label="AQL Minor" className="border rounded px-3 py-1.5 text-sm w-full dark:bg-gray-800 dark:border-gray-700" value={calcMinor} onChange={e => setCalcMinor(+e.target.value)} /></div>
            </div>
            <button onClick={handleCalc} className="px-4 py-2 bg-blue-600 text-white rounded text-sm">Calculate</button>
            {calcResult && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded p-4 mt-3 space-y-1 text-sm">
                <p><span className="font-medium">Sample Code Letter:</span> {calcResult.sampleCodeLetter}</p>
                <p><span className="font-medium">Sample Size:</span> {calcResult.sampleSize}</p>
                <p><span className="font-medium">Major:</span> Accept ≤ {calcResult.acceptMajor}, Reject ≥ {calcResult.rejectMajor}</p>
                <p><span className="font-medium">Minor:</span> Accept ≤ {calcResult.acceptMinor}, Reject ≥ {calcResult.rejectMinor}</p>
              </div>
            )}
          </div>
        )}

        {tab === 'New Inspection' && (
          <div className="space-y-3 max-w-lg">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs text-gray-500 mb-1">Order ID*</label><input type="number" aria-label="Order ID" className="border rounded px-3 py-1.5 text-sm w-full dark:bg-gray-800 dark:border-gray-700" value={form.orderId ?? ''} onChange={e => setForm({ ...form, orderId: +e.target.value })} /></div>
              <div><label className="block text-xs text-gray-500 mb-1">Inspection Date*</label><input type="date" aria-label="Inspection Date" className="border rounded px-3 py-1.5 text-sm w-full dark:bg-gray-800 dark:border-gray-700" value={form.inspectionDate ?? ''} onChange={e => setForm({ ...form, inspectionDate: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs text-gray-500 mb-1">Lot Qty*</label><input type="number" aria-label="Lot Qty" className="border rounded px-3 py-1.5 text-sm w-full dark:bg-gray-800 dark:border-gray-700" value={form.lotQty} onChange={e => setForm({ ...form, lotQty: +e.target.value })} /></div>
              <div><label className="block text-xs text-gray-500 mb-1">Type</label>
                <select aria-label="Inspection Type" className="border rounded px-3 py-1.5 text-sm w-full dark:bg-gray-800 dark:border-gray-700" value={form.inspectionType} onChange={e => setForm({ ...form, inspectionType: e.target.value })}>
                  <option value="INLINE">Inline</option><option value="FINAL">Final</option><option value="PRE_SHIPMENT">Pre-Shipment</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="block text-xs text-gray-500 mb-1">Level</label>
                <select aria-label="Inspection Level" className="border rounded px-3 py-1.5 text-sm w-full dark:bg-gray-800 dark:border-gray-700" value={form.inspectionLevel} onChange={e => setForm({ ...form, inspectionLevel: e.target.value })}>
                  <option value="I">I</option><option value="II">II</option><option value="III">III</option>
                </select>
              </div>
              <div><label className="block text-xs text-gray-500 mb-1">AQL Major</label><input type="number" step="0.1" aria-label="AQL Major" className="border rounded px-3 py-1.5 text-sm w-full dark:bg-gray-800 dark:border-gray-700" value={form.aqlMajor} onChange={e => setForm({ ...form, aqlMajor: +e.target.value })} /></div>
              <div><label className="block text-xs text-gray-500 mb-1">AQL Minor</label><input type="number" step="0.1" aria-label="AQL Minor" className="border rounded px-3 py-1.5 text-sm w-full dark:bg-gray-800 dark:border-gray-700" value={form.aqlMinor} onChange={e => setForm({ ...form, aqlMinor: +e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs text-gray-500 mb-1">Inspector</label><input aria-label="Inspector" className="border rounded px-3 py-1.5 text-sm w-full dark:bg-gray-800 dark:border-gray-700" value={form.inspectorName ?? ''} onChange={e => setForm({ ...form, inspectorName: e.target.value })} /></div>
              <div><label className="block text-xs text-gray-500 mb-1">Buyer QC</label><input aria-label="Buyer QC" className="border rounded px-3 py-1.5 text-sm w-full dark:bg-gray-800 dark:border-gray-700" value={form.buyerQcName ?? ''} onChange={e => setForm({ ...form, buyerQcName: e.target.value })} /></div>
            </div>

            <h4 className="text-sm font-medium mt-4 text-gray-700 dark:text-gray-300">Defect Entries</h4>
            <div className="flex items-end gap-2">
              <input aria-label="Defect Code" className="border rounded px-2 py-1 text-xs w-20 dark:bg-gray-800 dark:border-gray-700" placeholder="Code" value={defectRow.defectCode} onChange={e => setDefectRow({ ...defectRow, defectCode: e.target.value })} />
              <input aria-label="Defect Name" className="border rounded px-2 py-1 text-xs flex-1 dark:bg-gray-800 dark:border-gray-700" placeholder="Name" value={defectRow.defectName} onChange={e => setDefectRow({ ...defectRow, defectName: e.target.value })} />
              <select aria-label="Defect Category" className="border rounded px-2 py-1 text-xs dark:bg-gray-800 dark:border-gray-700" value={defectRow.defectCategory} onChange={e => setDefectRow({ ...defectRow, defectCategory: e.target.value })}>
                <option value="CRITICAL">Critical</option><option value="MAJOR">Major</option><option value="MINOR">Minor</option>
              </select>
              <input type="number" aria-label="Defect Count" className="border rounded px-2 py-1 text-xs w-14 dark:bg-gray-800 dark:border-gray-700" value={defectRow.count} onChange={e => setDefectRow({ ...defectRow, count: +e.target.value })} />
              <button onClick={addDefect} className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">Add</button>
            </div>
            {form.defectEntries.length > 0 && (
              <ul className="text-xs space-y-1 mt-1 text-gray-600 dark:text-gray-400">
                {form.defectEntries.map((d: DefectEntry, i: number) => (
                  <li key={i}>{d.defectCode} - {d.defectName} ({d.defectCategory}) × {d.count}</li>
                ))}
              </ul>
            )}

            <button onClick={handleCreate} className="mt-3 px-5 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Create Inspection</button>
          </div>
        )}
      </div>
    </>
  );
}
