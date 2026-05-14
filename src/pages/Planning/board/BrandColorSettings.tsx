import { useState } from 'react';
import { useBrandColors } from '@/hooks/usePlanningBoard';
import { planningBoardApi } from '@/api/planningBoard';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface BrandColorEntry {
  brandName: string;
  colorHex: string;
}

/**
 * BrandColorSettings — modal for managing brand-to-color mappings
 * used on the Gantt board to distinguish buyer brands visually.
 */
export default function BrandColorSettings({ onClose }: { onClose: () => void }) {
  const { data: brandColors, isLoading } = useBrandColors();
  const qc = useQueryClient();

  const [entries, setEntries] = useState<BrandColorEntry[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Initialize entries from server data once
  if (brandColors && !initialized) {
    setEntries(
      brandColors.map((bc) => ({ brandName: bc.brandName, colorHex: bc.colorHex }))
    );
    setInitialized(true);
  }

  const saveMutation = useMutation({
    mutationFn: (colors: BrandColorEntry[]) =>
      planningBoardApi.setBrandColors(colors),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planning-board', 'brand-colors'] });
      toast.success('Brand colors saved');
      onClose();
    },
    onError: () => toast.error('Failed to save brand colors'),
  });

  const addEntry = () => {
    setEntries([...entries, { brandName: '', colorHex: '#3B82F6' }]);
  };

  const removeEntry = (index: number) => {
    setEntries(entries.filter((_, i) => i !== index));
  };

  const updateEntry = (index: number, field: keyof BrandColorEntry, value: string) => {
    const updated = [...entries];
    updated[index] = { ...updated[index], [field]: value };
    setEntries(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-[480px] max-h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white">🎨 Brand Color Settings</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
          {isLoading && <p className="text-xs text-gray-400">Loading…</p>}

          {entries.map((entry, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={entry.brandName}
                onChange={(e) => updateEntry(i, 'brandName', e.target.value)}
                placeholder="Brand name (e.g. H&M)"
                className="flex-1 text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-700 dark:text-white"
              />
              <input
                type="color"
                value={entry.colorHex}
                onChange={(e) => updateEntry(i, 'colorHex', e.target.value)}
                className="w-10 h-8 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                title="Pick color"
              />
              <div
                className="w-8 h-8 rounded border border-gray-200 dark:border-gray-600 shrink-0"
                style={{ backgroundColor: entry.colorHex }}
              />
              <button
                onClick={() => removeEntry(i)}
                className="text-red-400 hover:text-red-600 text-sm px-1"
                title="Remove"
              >
                ×
              </button>
            </div>
          ))}

          <button
            onClick={addEntry}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-2"
          >
            + Add brand color
          </button>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="text-xs px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            Cancel
          </button>
          <button
            onClick={() => saveMutation.mutate(entries.filter(e => e.brandName.trim()))}
            disabled={saveMutation.isPending}
            className="text-xs px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {saveMutation.isPending ? 'Saving…' : 'Save Colors'}
          </button>
        </div>
      </div>
    </div>
  );
}
