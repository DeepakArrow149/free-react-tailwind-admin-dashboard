/**
 * FabricConsumptionSection — container for the Fabric Consumption tab.
 *
 * Loads fabric consumption rows, masters (style components, portions, structures,
 * fabrics, knit/wash types, UOM, counts, colors), and the order's PO matrix sizes
 * for CAD auto-generation. Renders the main grid + three editable sub-grids for
 * the currently selected row.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import apiClient from '../../../../api/client';
import {
  orderFabricConsumptionApi,
  type FabricConsumption,
  type FabricCadDetail,
  type FabricYarnDetail,
  type FabricColorMap,
  type FabricConsumptionInput,
} from '../../../../api/merchandising';
import FabricConsumptionGrid, { type FabricGridMasters } from './FabricConsumptionGrid';
import FabricCadGrid from './FabricCadGrid';
import FabricYarnGrid from './FabricYarnGrid';
import FabricColorMapGrid from './FabricColorMapGrid';
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

async function loadFabricMaterials(): Promise<{ all: CellOption[]; byStructure: Record<number, CellOption[]> }> {
  // Fabric specs carry the structure FK. We list specs and group by structure.
  const { data: resp } = await apiClient.get<{ data: Record<string, unknown>[] }>('/master/fabrics', { params: { limit: 500 } });
  const rows = (resp.data ?? []) as Array<{
    materialId: number; fabricStructureId?: number | null;
    material?: { materialCode?: string; materialName?: string };
  }>;
  const all: CellOption[] = rows.map((r) => ({
    value: r.materialId,
    label: `${r.material?.materialCode ?? ''} — ${r.material?.materialName ?? ''}`,
  }));
  const byStructure: Record<number, CellOption[]> = {};
  for (const r of rows) {
    if (r.fabricStructureId == null) continue;
    if (!byStructure[r.fabricStructureId]) byStructure[r.fabricStructureId] = [];
    byStructure[r.fabricStructureId].push({
      value: r.materialId,
      label: `${r.material?.materialCode ?? ''} — ${r.material?.materialName ?? ''}`,
    });
  }
  return { all, byStructure };
}

export default function FabricConsumptionSection({ orderId, orderStatus }: Props) {
  const [rows, setRows] = useState<FabricConsumption[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [masters, setMasters] = useState<FabricGridMasters & { counts: CellOption[]; colors: CellOption[] }>({
    styleComponents: [], portions: [], fabricStructures: [], materials: [], materialsByStructure: {},
    knitTypes: [], washTypes: [], uoms: [], counts: [], colors: [],
  });

  const readOnly = !orderStatus || orderStatus !== 'DRAFT';

  const reload = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const { data: resp } = await orderFabricConsumptionApi.list(orderId);
      setRows(resp.data);
      if (resp.data.length > 0 && !selectedId) setSelectedId(resp.data[0].id);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to load fabric consumption rows');
    } finally {
      setLoading(false);
    }
  }, [orderId, selectedId]);

  useEffect(() => {
    if (!orderId) { setLoading(false); return; }
    reload();
    Promise.all([
      loadMaster('/master/style-components', 'id', 'name', 'code'),
      loadMaster('/master/portions', 'id', 'name', 'code'),
      loadMaster('/master/fabric-structures', 'id', 'name', 'code'),
      loadFabricMaterials(),
      loadMaster('/master/knit-types', 'id', 'name', 'code'),
      loadMaster('/master/wash-types', 'id', 'name', 'code'),
      loadMaster('/master/units', 'id', 'name', 'code'),
      loadMaster('/master/counts', 'id', 'name', 'code'),
      loadMaster('/master/colors', 'id', 'colorName', 'colorCode'),
    ]).then(([styleComponents, portions, fabricStructures, mats, knitTypes, washTypes, uoms, counts, colors]) => {
      setMasters({
        styleComponents, portions, fabricStructures,
        materials: mats.all, materialsByStructure: mats.byStructure,
        knitTypes, washTypes, uoms, counts, colors,
      });
    }).catch((e) => {
      console.warn('Master loading partial failure:', e);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const selected = useMemo(() => rows.find((r) => r.id === selectedId) ?? null, [rows, selectedId]);

  const rowToInput = (r: FabricConsumption): FabricConsumptionInput => ({
    styleComponentId: r.styleComponentId,
    portionId: r.portionId,
    collarTwill: r.collarTwill,
    isMainPart: r.isMainPart,
    isFolding: r.isFolding,
    isCollar: r.isCollar,
    isHandCutting: r.isHandCutting,
    fabricStructureId: r.fabricStructureId,
    materialId: r.materialId,
    buyGsm: r.buyGsm == null ? null : Number(r.buyGsm),
    requiredGsm: r.requiredGsm == null ? null : Number(r.requiredGsm),
    washTypeId: r.washTypeId,
    knitTypeId: r.knitTypeId,
    designReference: r.designReference,
    uomId: r.uomId,
    cadReference: r.cadReference,
    cadEfficiency: r.cadEfficiency == null ? null : Number(r.cadEfficiency),
    fabricQty: Number(r.fabricQty ?? 0),
    remarks: r.remarks,
    cadDetails: r.cadDetails.map(({ id, totalWeight, size, ...rest }) => { void id; void totalWeight; void size; return rest; }),
    yarnDetails: r.yarnDetails.map(({ id, count, ...rest }) => { void id; void count; return { ...rest, compositionPercent: Number(rest.compositionPercent), qty: Number(rest.qty) }; }),
    colorMaps: r.colorMaps.map(({ id, garmentColor, fabricColor, aopColor, ...rest }) => { void id; void garmentColor; void fabricColor; void aopColor; return rest; }),
  });

  // Persist the patched row (header-only edits). Sub-grids handle their own saves.
  const persistRow = async (next: FabricConsumption) => {
    if (!orderId) return;
    setSaving(true);
    try {
      const { data: resp } = await orderFabricConsumptionApi.update(orderId, next.id, rowToInput(next));
      setRows((prev) => prev.map((r) => r.id === next.id ? resp.data : r));
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Save failed');
      reload();
    } finally {
      setSaving(false);
    }
  };

  const patchRow = (id: number, patch: Partial<FabricConsumption>) => {
    setRows((prev) => {
      const next = prev.map((r) => r.id === id ? { ...r, ...patch } : r);
      const target = next.find((r) => r.id === id);
      if (target) persistRow(target);
      return next;
    });
  };

  const addRow = async () => {
    if (!orderId) return;
    try {
      const { data: resp } = await orderFabricConsumptionApi.create(orderId, {
        isMainPart: false, fabricQty: 0,
        cadDetails: [], yarnDetails: [], colorMaps: [],
      });
      setRows((prev) => [...prev, resp.data]);
      setSelectedId(resp.data.id);
      toast.success('Fabric row added');
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to add fabric row');
    }
  };

  const duplicateRow = async (id: number) => {
    if (!orderId) return;
    try {
      const { data: resp } = await orderFabricConsumptionApi.duplicate(orderId, id);
      setRows((prev) => [...prev, resp.data]);
      setSelectedId(resp.data.id);
      toast.success('Row duplicated');
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to duplicate row');
    }
  };

  const deleteRow = async (id: number) => {
    if (!orderId) return;
    if (!window.confirm('Delete this fabric consumption row and all its CAD/Yarn/Color details?')) return;
    try {
      await orderFabricConsumptionApi.delete(orderId, id);
      setRows((prev) => prev.filter((r) => r.id !== id));
      if (selectedId === id) setSelectedId(null);
      toast.success('Row deleted');
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to delete row');
    }
  };

  const updateCadRows = (cadRows: FabricCadDetail[]) => {
    if (!selected) return;
    const next = { ...selected, cadDetails: cadRows };
    setRows((prev) => prev.map((r) => r.id === next.id ? next : r));
    persistRow(next);
  };

  const updateYarnRows = (yarnRows: FabricYarnDetail[]) => {
    if (!selected) return;
    const next = { ...selected, yarnDetails: yarnRows };
    setRows((prev) => prev.map((r) => r.id === next.id ? next : r));
    persistRow(next);
  };

  const updateColorMaps = (cmRows: FabricColorMap[]) => {
    if (!selected) return;
    const next = { ...selected, colorMaps: cmRows };
    setRows((prev) => prev.map((r) => r.id === next.id ? next : r));
    persistRow(next);
  };

  const autoGenerateCad = async () => {
    if (!orderId || !selected) return;
    const input = window.prompt('Default gram per piece (used for new CAD rows):', '0');
    if (input === null) return;
    const defaultGram = Number(input);
    if (Number.isNaN(defaultGram) || defaultGram < 0) {
      toast.error('Invalid gram value');
      return;
    }
    try {
      const { data: resp } = await orderFabricConsumptionApi.autoGenerateCad(orderId, selected.id, { defaultGram });
      setRows((prev) => prev.map((r) => r.id === resp.data.id ? resp.data : r));
      toast.success(`CAD rows generated from PO Matrix`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Auto-generate failed');
    }
  };

  if (!orderId) {
    return (
      <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-8 text-center dark:border-amber-800 dark:bg-amber-900/10">
        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Save the order header first</p>
        <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">Fabric Consumption rows can only be added after the buyer order has been created.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="flex justify-center py-12 text-sm text-gray-400">Loading fabric consumption...</div>;
  }

  return (
    <div className="space-y-4">
      {readOnly && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
          Read-only — order is <strong>{orderStatus}</strong>. Engineering data can only be edited while the order is DRAFT.
        </div>
      )}

      <FabricConsumptionGrid
        rows={rows}
        selectedId={selectedId}
        masters={masters}
        readOnly={readOnly}
        onSelect={setSelectedId}
        onPatch={patchRow}
        onAdd={addRow}
        onDuplicate={duplicateRow}
        onDelete={deleteRow}
      />

      {selected && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <FabricCadGrid
              rows={selected.cadDetails}
              readOnly={readOnly}
              onChange={updateCadRows}
              onAutoGenerate={autoGenerateCad}
            />
          </div>
          <div className="xl:col-span-1">
            <FabricYarnGrid
              rows={selected.yarnDetails}
              counts={masters.counts}
              readOnly={readOnly}
              onChange={updateYarnRows}
            />
          </div>
          <div className="xl:col-span-3">
            <FabricColorMapGrid
              rows={selected.colorMaps}
              colors={masters.colors}
              readOnly={readOnly}
              onChange={updateColorMaps}
            />
          </div>
        </div>
      )}
      {saving && <div className="text-right text-xs text-gray-400">Saving…</div>}
    </div>
  );
}
