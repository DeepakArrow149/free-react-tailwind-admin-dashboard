/**
 * Drag-drop attachment picker for a PO line.
 * Shows existing attachments as chips with download + remove.
 */

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { orderPoLineApi, type PoLineAttachment } from '../../../../api/merchandising';

interface Props {
  orderId: number;
  lineId: number;
  attachments: PoLineAttachment[];
  readOnly?: boolean;
  onChange: (next: PoLineAttachment[]) => void;
  onClose?: () => void;
}

export default function AttachmentPicker({ orderId, lineId, attachments, readOnly, onChange, onClose }: Props) {
  const [uploading, setUploading] = useState(false);

  const handleDrop = async (files: File[]) => {
    if (!files.length || readOnly) return;
    setUploading(true);
    try {
      const next = [...attachments];
      for (const f of files) {
        const { data: resp } = await orderPoLineApi.uploadAttachment(orderId, lineId, f);
        next.push(resp.data);
      }
      onChange(next);
      toast.success(`Uploaded ${files.length} file(s)`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? e?.message ?? 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async (id: number) => {
    if (readOnly) return;
    if (!confirm('Remove this attachment?')) return;
    try {
      await orderPoLineApi.deleteAttachment(orderId, lineId, id);
      onChange(attachments.filter((a) => a.id !== id));
      toast.success('Attachment removed');
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Remove failed');
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    multiple: true,
    disabled: readOnly || uploading,
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">Attachments</h4>
        {onClose && (
          <button type="button" onClick={onClose} className="text-xs text-gray-400 hover:text-gray-600" title="Close">
            ✕
          </button>
        )}
      </div>

      {!readOnly && (
        <div
          {...getRootProps()}
          className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 text-center transition ${
            isDragActive
              ? 'border-brand-400 bg-brand-50 dark:bg-brand-900/20'
              : 'border-gray-300 hover:border-brand-300 dark:border-gray-700'
          } ${uploading ? 'opacity-50' : 'cursor-pointer'}`}
        >
          <input {...getInputProps()} />
          <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.9 5 5 0 119.8-1A4.5 4.5 0 0118 16M12 12v9m0-9l-3 3m3-3l3 3" />
          </svg>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {isDragActive ? 'Drop the files here…' : 'Drag & drop or click to upload'}
          </p>
          <p className="text-xs text-gray-400">PDF, Excel, Images, Docs (max 10 MB each)</p>
        </div>
      )}

      {attachments.length === 0 ? (
        <p className="text-xs italic text-gray-400">No attachments yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {attachments.map((a) => (
            <li key={a.id} className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900">
              <span className="text-red-500">📎</span>
              <a href={a.fileUrl} target="_blank" rel="noopener" className="flex-1 truncate text-brand-500 hover:underline" title={a.fileName}>
                {a.fileName}
              </a>
              <span className="text-xs text-gray-400">{a.fileSize ? `${Math.round(a.fileSize / 1024)} KB` : ''}</span>
              {!readOnly && (
                <button type="button" onClick={() => handleRemove(a.id)} className="text-gray-400 hover:text-red-500" title="Remove">
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
