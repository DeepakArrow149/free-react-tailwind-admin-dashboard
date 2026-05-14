/**
 * StationEditor — Modal for editing a single layout position's details
 * (label, type, machineType, operationBulletinItem) with dynamic machine
 * icon preview (DB-backed) and SAM info display.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import type { LayoutPosition, BulletinForLayout } from '@/api/lineBalancing';
import { bulletinApi, type BulletinDetail } from '@/api/production';
import { useMachineTypes, useBulletinsForLayout } from '@/hooks/useLineBalancing';
import { usePositionTypes } from '@/hooks/useMasterLookups';
import DynamicMachineIcon from './DynamicMachineIcon';
import { getMachineColor } from '@/icons/MachineIcons';

const _POS_DEFAULTS = ['WORKSTATION', 'INPUT', 'OUTPUT', 'QC', 'PRESSING', 'HELPER'] as const;

/** Badge colours per position type */
const TYPE_BADGE: Record<string, string> = {
  WORKSTATION: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  INPUT: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  OUTPUT: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  QC: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  PRESSING: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  HELPER: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

interface Props {
  position: LayoutPosition | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (posId: number, data: Record<string, unknown>) => void;
}

const StationEditor: React.FC<Props> = ({ position, isOpen, onClose, onSave }) => {
  const { data: machineTypes } = useMachineTypes();
  const { data: bulletins } = useBulletinsForLayout();
  const { data: POSITION_TYPES = [..._POS_DEFAULTS] } = usePositionTypes();

  const [label, setLabel] = useState('');
  const [positionType, setPositionType] = useState<string>('WORKSTATION');
  const [machineTypeId, setMachineTypeId] = useState<number | null>(null);
  const [operationId, setOperationId] = useState<number | null>(null);

  // Bulletin → operation picker
  const [selectedBulletinId, setSelectedBulletinId] = useState<number | null>(null);
  const [bulletinItems, setBulletinItems] = useState<BulletinDetail['items']>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // Fetch bulletin items
  useEffect(() => {
    if (!selectedBulletinId) { setBulletinItems([]); return; }
    let cancelled = false;
    setLoadingItems(true);
    bulletinApi.getById(selectedBulletinId)
      .then((res: { data?: BulletinDetail } | BulletinDetail) => {
        if (cancelled) return;
        const detail = ('data' in res && res.data) ? res.data : res as BulletinDetail;
        setBulletinItems(detail.items ?? []);
      })
      .catch(() => { if (!cancelled) setBulletinItems([]); })
      .finally(() => { if (!cancelled) setLoadingItems(false); });
    return () => { cancelled = true; };
  }, [selectedBulletinId]);

  // Reset when position changes
  useEffect(() => {
    if (position) {
      setLabel(position.label ?? '');
      setPositionType(position.positionType);
      setMachineTypeId(position.machineTypeId ?? null);
      setOperationId(position.operationId ?? null);
    }
  }, [position]);

  const activeMachines = useMemo(
    () =>
      Array.isArray(machineTypes)
        ? (machineTypes as { id: number; code: string; name: string; isActive: boolean }[]).filter(m => m.isActive)
        : [],
    [machineTypes]
  );

  const selectedMachine = activeMachines.find(m => m.id === machineTypeId);
  const mColor = getMachineColor(selectedMachine?.code);

  // SAM from the selected operation
  const selectedOp = useMemo(() => {
    if (!operationId || !bulletinItems?.length) return null;
    return bulletinItems.find(i => i.id === operationId) ?? null;
  }, [operationId, bulletinItems]);

  const handleSave = () => {
    if (!position) return;
    onSave(position.id, {
      label: label || null,
      positionType,
      machineTypeId,
      operationId,
    });
    onClose();
  };

  if (!position) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Station" size="md">
      <div className="space-y-4 p-5">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Edit Position #{position.positionNo}
        </h2>

        {/* Large Machine Icon Preview Card */}
        <div className="flex items-center gap-4 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 p-4 dark:from-gray-800 dark:to-gray-800/60 border border-gray-200 dark:border-gray-700">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-700">
            <DynamicMachineIcon code={selectedMachine?.code} size={48} color={mColor} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {selectedMachine ? `${selectedMachine.code} — ${selectedMachine.name}` : 'No machine assigned'}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span>Grid: R{position.gridRow + 1}, C{position.gridCol + 1}</span>
              {selectedOp && (
                <>
                  <span className="text-gray-300 dark:text-gray-600">|</span>
                  <span className="font-medium text-blue-600 dark:text-blue-400">
                    SAM: {selectedOp.sam}
                  </span>
                </>
              )}
            </div>
            <div className="mt-1">
              <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${TYPE_BADGE[positionType] ?? TYPE_BADGE.HELPER}`}>
                {positionType}
              </span>
            </div>
          </div>
        </div>

        {/* Label */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Label</label>
          <input
            className="w-full rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. WS-1"
          />
        </div>

        {/* Position Type */}
        <div>
          <label htmlFor="station-type" className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Station Type</label>
          <select
            id="station-type"
            className="w-full rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            value={positionType}
            onChange={(e) => setPositionType(e.target.value)}
          >
            {POSITION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Machine Type with icon thumbnails */}
        <div>
          <label htmlFor="station-machine-type" className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Machine Type</label>
          <div className="flex items-center gap-2">
            <select
              id="station-machine-type"
              className="flex-1 rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              value={machineTypeId ?? ''}
              onChange={(e) => setMachineTypeId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">— None —</option>
              {activeMachines.map(m => (
                <option key={m.id} value={m.id}>{m.code} — {m.name}</option>
              ))}
            </select>
            {/* Small icon preview next to dropdown */}
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
              <DynamicMachineIcon code={selectedMachine?.code} size={24} color={mColor} />
            </div>
          </div>
        </div>

        {/* Bulletin → Operation picker */}
        <div>
          <label htmlFor="station-bulletin" className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
            Link to Bulletin Operation (optional)
          </label>
          <select
            id="station-bulletin"
            className="w-full rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            value={selectedBulletinId ?? ''}
            onChange={(e) => {
              setSelectedBulletinId(e.target.value ? Number(e.target.value) : null);
              setOperationId(null);
            }}
          >
            <option value="">— Select Bulletin —</option>
            {(bulletins ?? []).map((b: BulletinForLayout) => (
              <option key={b.id} value={b.id}>
                {b.bulletinNo} — {b.style.styleName} ({b._count.items} ops)
              </option>
            ))}
          </select>
        </div>

        {/* Operation dropdown with SAM display */}
        {selectedBulletinId && (
          <div>
            <label htmlFor="station-operation" className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
              Operation
            </label>
            {loadingItems ? (
              <div className="rounded-lg border px-3 py-2 text-sm text-gray-400 dark:border-gray-600 dark:bg-gray-800">Loading operations…</div>
            ) : bulletinItems && bulletinItems.length > 0 ? (
              <>
                <select
                  id="station-operation"
                  className="w-full rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  value={operationId ?? ''}
                  onChange={(e) => setOperationId(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">— Select Operation —</option>
                  {bulletinItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      #{item.seqNo} — {item.operation?.name ?? item.operation?.code ?? `Op #${item.operationId}`} (SAM: {item.sam}{item.machineType ? `, ${item.machineType}` : ''})
                    </option>
                  ))}
                </select>
                {/* SAM highlight when an operation is selected */}
                {selectedOp && (
                  <div className="mt-2 flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 dark:border-blue-800 dark:bg-blue-900/20">
                    <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                      SAM: {selectedOp.sam}
                    </span>
                    {selectedOp.machineType && (
                      <span className="text-xs text-blue-500 dark:text-blue-400">
                        Machine: {selectedOp.machineType}
                      </span>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-lg border px-3 py-2 text-sm text-gray-400 dark:border-gray-600 dark:bg-gray-800">No operations in this bulletin</div>
            )}
          </div>
        )}

        {/* Save / Cancel */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            Save Changes
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default StationEditor;
