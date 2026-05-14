/**
 * Container component for the new PO matrix entry workflow.
 *
 * Loads:
 *   - PO lines for the order
 *   - Master dropdowns (Port, Item Description, Size Group, UOM, Color)
 *
 * Renders:
 *   - POLineGrid (top)            — list of PO lines, click to select
 *   - ColorSizeMatrix (middle)    — matrix for the selected PO line
 *   - AttachmentPicker (right)    — attachments for the selected PO line
 *
 * Only meaningful once the order has been saved (has an id). For new
 * (unsaved) orders, shows a banner directing the user to save first.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import apiClient from '../../../../api/client';
import { orderPoLineApi, type PoLine } from '../../../../api/merchandising';
import POLineGrid from './POLineGrid';
import ColorSizeMatrix from './ColorSizeMatrix';
import AttachmentPicker from './AttachmentPicker';
import type { CellOption } from './EditableCell';

interface Props {
  orderId: number | null;
  orderStatus?: string;
}

async function loadMaster(path: string, valueKey = 'id', labelKey = 'name', extraLabelKey?: string) {
  const { data: resp } = await apiClient.get<{ data: Record<string, unknown>[] }>(path, { params: { limit: 500 } });
  const rows = resp.data ?? [];
  return rows.map((r): CellOption => {
    const label = extraLabelKey
      ? `${String(r[extraLabelKey] ?? '')} — ${String(r[labelKey] ?? '')}`
      : String(r[labelKey] ?? r['code'] ?? r['id']);
    return { value: r[valueKey] as number, label };
  });
}

export default function POMatrixSection({ orderId, orderStatus }: Props) {
  const [lines, setLines] = useState<PoLine[]>([]);
  const [selectedLineId, setSelectedLineId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAttachments, setShowAttachments] = useState(false);
  const [masters, setMasters] = useState<{
    ports: CellOption[]; items: CellOption[]; sizeGroups: CellOption[]; uoms: CellOption[]; colors: CellOption[];
  }>({ ports: [], items: [], sizeGroups: [], uoms: [], colors: [] });

  const readOnly = !orderStatus || orderStatus !== 'DRAFT';

  const reload = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const { data: resp } = await orderPoLineApi.list(orderId);
      setLines(resp.data);
      if (resp.data.length > 0 && !selectedLineId) setSelectedLineId(resp.data[0].id);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to load PO lines');
    } finally {
      setLoading(false);
    }
  }, [orderId, selectedLineId]);

  useEffect(() => {
    if (!orderId) { setLoading(false); return; }
    reload();
    Promise.all([
      loadMaster('/master/ports', 'id', 'name', 'code'),
      loadMaster('/master/item-descriptions', 'id', 'description', 'code'),
      loadMaster('/master/size-groups', 'id', 'groupName'),
      loadMaster('/master/units', 'id', 'name', 'code'),
      loadMaster('/master/colors', 'id', 'colorName', 'colorCode'),
    ]).then(([ports, items, sizeGroups, uoms, colors]) => {
      setMasters({ ports, items, sizeGroups, uoms, colors });
    }).catch((e) => {
      console.warn('Master loading partial failure:', e);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const selectedLine = useMemo(() => lines.find((l) => l.id === selectedLineId) ?? null, [lines, selectedLineId]);

  if (!orderId) {
    return (
      <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-8 text-center dark:border-amber-800 dark:bg-amber-900/10">
        <svg className="mx-auto h-10 w-10 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.008v.008H12v-.008z" />
        </svg>
        <p className="mt-3 text-sm font-medium text-amber-800 dark:text-amber-300">Save the order header first</p>
        <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">PO lines and the color × size matrix can only be added after the buyer order has been created.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="flex justify-center py-12 text-sm text-gray-400">Loading PO lines...</div>;
  }

  return (
    <div className="space-y-4">
      {readOnly && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
          Read-only — order is <strong>{orderStatus}</strong>. Use the <em>Amend</em> action to make changes.
        </div>
      )}

      <POLineGrid
        orderId={orderId}
        lines={lines}
        selectedLineId={selectedLineId}
        masters={{ ports: masters.ports, items: masters.items, sizeGroups: masters.sizeGroups, uoms: masters.uoms }}
        readOnly={readOnly}
        onSelect={setSelectedLineId}
        onChange={setLines}
      />

      {selectedLine && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          <div className="lg:col-span-3">
            <ColorSizeMatrix
              orderId={orderId}
              poLine={selectedLine}
              colors={masters.colors}
              readOnly={readOnly}
              onChange={(updated) => setLines((prev) => prev.map((l) => l.id === updated.id ? updated : l))}
            />
          </div>
          <div className="lg:col-span-1">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-white/3">
              <button type="button" onClick={() => setShowAttachments((s) => !s)}
                className="w-full text-left text-sm font-semibold text-gray-800 dark:text-white/90 hover:text-brand-500">
                📎 Attachments ({selectedLine.attachments.length})
              </button>
              {showAttachments && (
                <div className="mt-3">
                  <AttachmentPicker
                    orderId={orderId}
                    lineId={selectedLine.id}
                    attachments={selectedLine.attachments}
                    readOnly={readOnly}
                    onChange={(next) => setLines((prev) => prev.map((l) => l.id === selectedLine.id ? { ...l, attachments: next } : l))}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
