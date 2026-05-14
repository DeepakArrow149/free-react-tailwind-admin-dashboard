/**
 * Reusable Excel export button.
 * Shows a download icon with loading spinner during export.
 */

import { useState } from 'react';
import { toast } from 'sonner';

interface ExportButtonProps {
  /** Function that performs the export (should trigger blob download) */
  onExport: () => Promise<void>;
  /** Button label */
  label?: string;
}

export default function ExportButton({ onExport, label = 'Export Excel' }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  const handleClick = async () => {
    setExporting(true);
    try {
      await onExport();
      toast.success('Export downloaded successfully');
    } catch {
      toast.error('Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={exporting}
      className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
    >
      {exporting ? (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
      ) : (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )}
      {label}
    </button>
  );
}
