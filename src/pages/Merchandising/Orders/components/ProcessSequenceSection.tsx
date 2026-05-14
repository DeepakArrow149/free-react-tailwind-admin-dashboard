/**
 * ProcessSequenceSection — container for the Process Sequence tab.
 *
 * Loads process groups + candidate fabric combinations + ProcessMaster list +
 * Portion/Color masters. Hosts the left-rail group list and the right-pane editor
 * (combinations selector + process sequence grid + dynamic loss detail subgrid).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import apiClient from '../../../../api/client';
import {
  orderProcessGroupApi,
  orderProcessSequenceApi,
  type ProcessGroup,
  type ProcessSequence,
  type ProcessLossDetail,
  type CandidateFabricCombination,
  type LossType,
  type ProcessSequenceInput,
} from '../../../../api/merchandising';
import type { CellOption } from './EditableCell';
import ProcessGroupList from './ProcessGroupList';
import FabricCombinationSelector, { type SelectionState } from './FabricCombinationSelector';
import ProcessSequenceGrid from './ProcessSequenceGrid';
import ProcessLossDetailGrid from './ProcessLossDetailGrid';

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

export default function ProcessSequenceSection({ orderId, orderStatus }: Props) {
  const [groups, setGroups] = useState<ProcessGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedSeqId, setSelectedSeqId] = useState<number | null>(null);
  const [candidates, setCandidates] = useState<CandidateFabricCombination[]>([]);
  const [processes, setProcesses] = useState<CellOption[]>([]);
  const [portions, setPortions] = useState<CellOption[]>([]);
  const [colors, setColors] = useState<CellOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const readOnly = !orderStatus || orderStatus !== 'DRAFT';

  const reload = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const [groupsResp, candidatesResp] = await Promise.all([
        orderProcessGroupApi.list(orderId),
        orderProcessGroupApi.candidateCombinations(orderId),
      ]);
      setGroups(groupsResp.data.data);
      setCandidates(candidatesResp.data.data);
      if (groupsResp.data.data.length > 0 && !selectedGroupId) {
        setSelectedGroupId(groupsResp.data.data[0].id);
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to load process sequence data');
    } finally {
      setLoading(false);
    }
  }, [orderId, selectedGroupId]);

  useEffect(() => {
    if (!orderId) { setLoading(false); return; }
    reload();
    Promise.all([
      loadMaster('/master/processes', 'id', 'processName', 'processCode'),
      loadMaster('/master/portions', 'id', 'name', 'code'),
      loadMaster('/master/colors', 'id', 'colorName', 'colorCode'),
    ]).then(([procs, ports, cols]) => {
      setProcesses(procs);
      setPortions(ports);
      setColors(cols);
    }).catch((e) => console.warn('Master load partial failure:', e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const selectedGroup = useMemo(
    () => groups.find((g) => g.id === selectedGroupId) ?? null,
    [groups, selectedGroupId]
  );

  const selectedSequence = useMemo<ProcessSequence | null>(() => {
    if (!selectedGroup || !selectedSeqId) return null;
    return selectedGroup.sequences.find((s) => s.id === selectedSeqId) ?? null;
  }, [selectedGroup, selectedSeqId]);

  // ── Group ops ──────────────────────────────────────────────────────
  const addGroup = async () => {
    if (!orderId) return;
    setSaving(true);
    try {
      const { data: resp } = await orderProcessGroupApi.create(orderId, {
        groupName: `Group ${groups.length + 1}`,
        selections: [],
      });
      setGroups((prev) => [...prev, resp.data]);
      setSelectedGroupId(resp.data.id);
      toast.success('Process group created');
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Create failed');
    } finally { setSaving(false); }
  };

  const renameGroup = (id: number, name: string) => {
    setGroups((prev) => prev.map((g) => g.id === id ? { ...g, groupName: name } : g));
    // Debounced PATCH on blur or after typing
    debouncedRename(id, name);
  };

  // Simple inline debounce per group
  const renameTimers = useMemo(() => new Map<number, ReturnType<typeof setTimeout>>(), []);
  const debouncedRename = (id: number, name: string) => {
    if (!orderId) return;
    const existing = renameTimers.get(id);
    if (existing) clearTimeout(existing);
    renameTimers.set(id, setTimeout(() => {
      orderProcessGroupApi.update(orderId, id, { groupName: name }).catch(() => reload());
    }, 600));
  };

  const deleteGroup = async (id: number) => {
    if (!orderId) return;
    if (!window.confirm('Delete this process group with all its sequences?')) return;
    try {
      await orderProcessGroupApi.delete(orderId, id);
      setGroups((prev) => prev.filter((g) => g.id !== id));
      if (selectedGroupId === id) setSelectedGroupId(null);
      toast.success('Group deleted');
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Delete failed');
    }
  };

  // ── Selection ops ──────────────────────────────────────────────────
  const updateSelections = async (rows: SelectionState[]) => {
    if (!orderId || !selectedGroup) return;
    setSaving(true);
    try {
      const { data: resp } = await orderProcessGroupApi.update(orderId, selectedGroup.id, {
        selections: rows.map((r) => ({
          fabricConsumptionId: r.fabricConsumptionId,
          fabricColorMapId:    r.fabricColorMapId,
          fabricYarnDetailId:  r.fabricYarnDetailId,
          reqQty:     r.reqQty,
          reqGramQty: r.reqGramQty,
        })),
      });
      setGroups((prev) => prev.map((g) => g.id === resp.data.id ? resp.data : g));
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Update failed');
      reload();
    } finally { setSaving(false); }
  };

  // ── Sequence ops ───────────────────────────────────────────────────
  const sequenceInputFrom = (s: ProcessSequence): ProcessSequenceInput => ({
    processId:   s.processId,
    lossType:    s.lossType,
    lossPercent: Number(s.lossPercent ?? 0),
    remarks:     s.remarks ?? null,
    lossDetails: s.lossDetails.map((d) => ({
      detailType:         d.detailType,
      referencePortionId: d.referencePortionId,
      referenceColorId:   d.referenceColorId,
      lossPercent:        Number(d.lossPercent ?? 0),
      remarks:            d.remarks ?? null,
    })),
  });

  const persistSequence = async (next: ProcessSequence) => {
    if (!orderId || !selectedGroup) return;
    setSaving(true);
    try {
      const { data: resp } = await orderProcessSequenceApi.update(
        orderId, selectedGroup.id, next.id, sequenceInputFrom(next)
      );
      setGroups((prev) => prev.map((g) => g.id === resp.data.id ? resp.data : g));
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Save failed');
      reload();
    } finally { setSaving(false); }
  };

  const patchSequence = (seqId: number, patch: Partial<ProcessSequence>) => {
    if (!selectedGroup) return;
    const updatedSeq = { ...selectedGroup.sequences.find((s) => s.id === seqId)!, ...patch } as ProcessSequence;
    // If switching lossType from PROCESS to anything else, ensure lossDetails has at least one row
    if (patch.lossType && patch.lossType !== 'PROCESS' && updatedSeq.lossDetails.length === 0) {
      updatedSeq.lossDetails = seedLossDetails(patch.lossType, selectedGroup);
    }
    if (patch.lossType === 'PROCESS') updatedSeq.lossDetails = [];

    setGroups((prev) => prev.map((g) => g.id === selectedGroup.id
      ? { ...g, sequences: g.sequences.map((s) => s.id === seqId ? updatedSeq : s) }
      : g));
    persistSequence(updatedSeq);
  };

  const addSequence = async () => {
    if (!orderId || !selectedGroup) return;
    if (processes.length === 0) { toast.error('No processes defined in master'); return; }
    setSaving(true);
    try {
      const { data: resp } = await orderProcessSequenceApi.create(orderId, selectedGroup.id, {
        processId:   processes[0].value as number,
        lossType:    'PROCESS',
        lossPercent: 0,
        lossDetails: [],
      });
      setGroups((prev) => prev.map((g) => g.id === resp.data.id ? resp.data : g));
      const newLast = resp.data.sequences[resp.data.sequences.length - 1];
      if (newLast) setSelectedSeqId(newLast.id);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Create failed');
    } finally { setSaving(false); }
  };

  const deleteSequence = async (seqId: number) => {
    if (!orderId || !selectedGroup) return;
    if (!window.confirm('Delete this process row?')) return;
    try {
      await orderProcessSequenceApi.delete(orderId, selectedGroup.id, seqId);
      if (selectedSeqId === seqId) setSelectedSeqId(null);
      reload();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Delete failed');
    }
  };

  const localReorder = (fromIdx: number, toIdx: number) => {
    if (!selectedGroup) return;
    setGroups((prev) => prev.map((g) => {
      if (g.id !== selectedGroup.id) return g;
      const seqs = g.sequences.slice();
      const [moved] = seqs.splice(fromIdx, 1);
      seqs.splice(toIdx, 0, moved);
      return { ...g, sequences: seqs };
    }));
  };

  const commitReorder = async (orderedIds: number[]) => {
    if (!orderId || !selectedGroup) return;
    setSaving(true);
    try {
      const { data: resp } = await orderProcessSequenceApi.reorder(orderId, selectedGroup.id, orderedIds);
      setGroups((prev) => prev.map((g) => g.id === resp.data.id ? resp.data : g));
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Reorder failed');
      reload();
    } finally { setSaving(false); }
  };

  const updateLossDetails = (rows: ProcessLossDetail[]) => {
    if (!selectedSequence || !selectedGroup) return;
    const next = { ...selectedSequence, lossDetails: rows };
    setGroups((prev) => prev.map((g) => g.id === selectedGroup.id
      ? { ...g, sequences: g.sequences.map((s) => s.id === next.id ? next : s) }
      : g));
    persistSequence(next);
  };

  if (!orderId) {
    return (
      <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-8 text-center dark:border-amber-800 dark:bg-amber-900/10">
        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Save the order header first</p>
        <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">Process groups can only be added after the buyer order is created and fabric consumption rows exist.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="flex justify-center py-12 text-sm text-gray-400">Loading process sequence...</div>;
  }

  return (
    <div className="space-y-4">
      {readOnly && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
          Read-only — order is <strong>{orderStatus}</strong>. Process planning can only be edited while the order is DRAFT.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <div className="xl:col-span-1">
          <ProcessGroupList
            groups={groups}
            selectedId={selectedGroupId}
            readOnly={readOnly}
            onSelect={setSelectedGroupId}
            onAdd={addGroup}
            onRename={renameGroup}
            onDelete={deleteGroup}
          />
        </div>

        <div className="space-y-4 xl:col-span-3">
          {!selectedGroup && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-white/2 dark:text-gray-400">
              Select a group on the left or click "+ Group" to start planning a process flow.
            </div>
          )}
          {selectedGroup && (
            <>
              <FabricCombinationSelector
                candidates={candidates}
                currentSelections={selectedGroup.selections}
                readOnly={readOnly}
                onChange={updateSelections}
              />
              <ProcessSequenceGrid
                rows={selectedGroup.sequences}
                selectedId={selectedSeqId}
                readOnly={readOnly}
                processOptions={processes}
                onSelect={setSelectedSeqId}
                onAdd={addSequence}
                onPatch={patchSequence}
                onDelete={deleteSequence}
                onReorder={commitReorder}
                onLocalReorder={localReorder}
              />
              {selectedSequence && selectedSequence.lossType !== 'PROCESS' && (
                <ProcessLossDetailGrid
                  lossType={selectedSequence.lossType}
                  rows={selectedSequence.lossDetails}
                  portionOptions={portions}
                  colorOptions={colors}
                  readOnly={readOnly}
                  onChange={updateLossDetails}
                />
              )}
            </>
          )}
        </div>
      </div>
      {saving && <div className="text-right text-xs text-gray-400">Saving…</div>}
    </div>
  );
}

/**
 * Seed loss detail rows when switching from PROCESS to ITEM / COLOR / ITEM_COLOR.
 *  ITEM       → one row per distinct portion in this group's selections
 *  COLOR      → one row per distinct color (garment/fabric/aop)
 *  ITEM_COLOR → cross-product of distinct portions × colors
 */
function seedLossDetails(lossType: LossType, group: ProcessGroup): ProcessLossDetail[] {
  const portionIds = new Set<number>();
  const colorIds = new Set<number>();
  for (const s of group.selections) {
    if (s.fabricConsumption?.portionId != null) portionIds.add(s.fabricConsumption.portionId);
    if (s.fabricColorMap?.garmentColor?.id) colorIds.add(s.fabricColorMap.garmentColor.id);
    if (s.fabricColorMap?.fabricColor?.id) colorIds.add(s.fabricColorMap.fabricColor.id);
    if (s.fabricColorMap?.aopColor?.id) colorIds.add(s.fabricColorMap.aopColor.id);
  }
  const portionArr = Array.from(portionIds);
  const colorArr = Array.from(colorIds);

  if (lossType === 'ITEM') {
    return portionArr.map((pid) => ({
      detailType: 'ITEM' as const,
      referencePortionId: pid,
      referenceColorId: null,
      lossPercent: 0,
    }));
  }
  if (lossType === 'COLOR') {
    return colorArr.map((cid) => ({
      detailType: 'COLOR' as const,
      referencePortionId: null,
      referenceColorId: cid,
      lossPercent: 0,
    }));
  }
  // ITEM_COLOR
  const out: ProcessLossDetail[] = [];
  for (const pid of portionArr) {
    for (const cid of colorArr) {
      out.push({
        detailType: 'ITEM_COLOR' as const,
        referencePortionId: pid,
        referenceColorId: cid,
        lossPercent: 0,
      });
    }
  }
  // Guarantee at least one row even when selections lack portion/color
  if (out.length === 0) {
    out.push({ detailType: 'ITEM_COLOR' as const, referencePortionId: null, referenceColorId: null, lossPercent: 0 });
  }
  return out;
}
