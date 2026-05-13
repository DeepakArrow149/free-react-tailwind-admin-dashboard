/**
 * AI Chat Input Bar
 * Text input with send button, character counter, quick action chips, and
 * single-image attachment (drag-drop or click to attach).
 */

import React, { useState, useRef, useEffect } from 'react';
import type { ChatAttachment } from '../../api/aiApi';

export type ActionMode = 'auto' | 'plan' | 'direct' | 'modify' | 'explain';

interface ChatInputProps {
  onSend: (message: string, attachments?: ChatAttachment[]) => void;
  disabled?: boolean;
  placeholder?: string;
  /** When true, shows modification-oriented quick prompts */
  hasActiveForm?: boolean;
  /** Current plan-and-build workflow status */
  planStatus?: 'idle' | 'reviewing' | 'building';
  /** Explicit action override; `auto` uses message-based detection */
  actionMode?: ActionMode;
  onActionModeChange?: (mode: ActionMode) => void;
}

const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4 MB raw → ~5.3 MB base64

type AttachmentDraft = ChatAttachment & {
  /** Object URL for inline preview (revoked when removed). */
  previewUrl: string;
};

async function fileToAttachment(file: File): Promise<AttachmentDraft | { error: string }> {
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return { error: `Only PNG, JPEG, WEBP, or GIF images are supported (got "${file.type || 'unknown'}").` };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { error: `Image too large: ${(file.size / 1024 / 1024).toFixed(1)} MB (max 4 MB).` };
  }
  // Read as base64 (strip the "data:...;base64," prefix the server doesn't want).
  const dataBase64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const result = reader.result as string;
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(file);
  });
  return {
    kind: 'image',
    mimeType: file.type as AttachmentDraft['mimeType'],
    dataBase64,
    name: file.name,
    previewUrl: URL.createObjectURL(file),
  };
}

export const CREATION_PROMPTS = [
  'Create a new employee feedback form',
  'Create a buyer order form',
  'Create a material inspection form',
  'Create a style development form',
  'Add a file upload section',
];

export const MODIFICATION_PROMPTS = [
  'Add validation rules to all fields',
  'Make this a two-column layout',
  'Add a remarks section',
  'Add approval workflow fields',
  'Optimize field labels for clarity',
];

const PLAN_REFINEMENT_PROMPTS = [
  'Add a validation section',
  'Remove the approval fields',
  'Use two-column layout',
  'Add ERP lookups for employee data',
  'Simplify — fewer fields',
];

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  disabled = false,
  placeholder = 'Describe the form you want to create...',
  hasActiveForm = false,
  planStatus = 'idle',
  actionMode = 'auto',
  onActionModeChange,
}) => {
  const [message, setMessage] = useState('');
  const [showQuickPrompts, setShowQuickPrompts] = useState(false);
  const [attachment, setAttachment] = useState<AttachmentDraft | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Revoke object URLs when the draft changes or unmounts to avoid leaks.
  useEffect(() => {
    return () => {
      if (attachment) URL.revokeObjectURL(attachment.previewUrl);
    };
  }, [attachment]);

  const handleFiles = async (files: FileList | File[]) => {
    setAttachmentError(null);
    const file = Array.from(files)[0];
    if (!file) return;
    const result = await fileToAttachment(file);
    if ('error' in result) {
      setAttachmentError(result.error);
      return;
    }
    // Replace any prior attachment (single-image limit).
    if (attachment) URL.revokeObjectURL(attachment.previewUrl);
    setAttachment(result);
  };

  const removeAttachment = () => {
    if (attachment) URL.revokeObjectURL(attachment.previewUrl);
    setAttachment(null);
    setAttachmentError(null);
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  const handleSend = () => {
    const trimmed = message.trim();
    // Allow sending with just an attachment (no text) — default to a sensible prompt.
    const finalMessage = trimmed || (attachment ? 'Build a form from this image.' : '');
    if (!finalMessage || disabled) return;
    if (attachment) {
      // Strip the previewUrl — it's UI-only, not part of the wire payload.
      const { previewUrl: _previewUrl, ...wireAttachment } = attachment;
      void _previewUrl;
      onSend(finalMessage, [wireAttachment]);
      URL.revokeObjectURL(attachment.previewUrl);
    } else {
      onSend(finalMessage);
    }
    setMessage('');
    setAttachment(null);
    setAttachmentError(null);
    setShowQuickPrompts(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const modeOptions = hasActiveForm
    ? ([
        { id: 'auto', label: 'Auto', hint: 'Detect intent from your message' },
        { id: 'modify', label: 'Modify', hint: 'Edit the current form directly' },
        { id: 'explain', label: 'Explain', hint: 'Describe what the form does' },
      ] as const)
    : ([
        { id: 'auto', label: 'Auto', hint: 'Detect intent from your message' },
        { id: 'plan', label: 'Plan', hint: 'Outline a plan before building' },
        { id: 'direct', label: 'Build', hint: 'Generate the form directly' },
      ] as const);

  return (
    <div
      className={`relative border-t bg-white dark:bg-gray-900 p-3 transition-colors ${
        isDragging
          ? 'border-blue-400 bg-blue-50/60 dark:bg-blue-900/20'
          : 'border-gray-200 dark:border-gray-700'
      }`}
      onDragEnter={(e) => {
        if (e.dataTransfer?.types?.includes('Files')) {
          e.preventDefault();
          setIsDragging(true);
        }
      }}
      onDragOver={(e) => {
        if (e.dataTransfer?.types?.includes('Files')) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
        }
      }}
      onDragLeave={(e) => {
        // Only clear when leaving the wrapper (not entering a child).
        if (e.currentTarget === e.target) setIsDragging(false);
      }}
      onDrop={(e) => {
        if (!e.dataTransfer?.files?.length) return;
        e.preventDefault();
        setIsDragging(false);
        void handleFiles(e.dataTransfer.files);
      }}
    >
      {isDragging && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-md border-2 border-dashed border-blue-400 bg-blue-50/40 dark:bg-blue-900/30">
          <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
            Drop image to attach
          </span>
        </div>
      )}

      {/* Attachment preview / error */}
      {attachment && (
        <div className="mb-2 flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-1.5">
          <img
            src={attachment.previewUrl}
            alt={attachment.name || 'attachment'}
            className="h-10 w-10 rounded object-cover shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium text-gray-700 dark:text-gray-200 truncate">
              {attachment.name || 'attachment'}
            </p>
            <p className="text-[10px] text-gray-400">
              {attachment.mimeType.replace('image/', '').toUpperCase()} · {(attachment.dataBase64.length * 0.75 / 1024).toFixed(0)} KB
            </p>
          </div>
          <button
            type="button"
            onClick={removeAttachment}
            aria-label="Remove attachment"
            title="Remove attachment"
            className="shrink-0 rounded-full p-1 text-gray-400 hover:bg-gray-200 hover:text-red-600 dark:hover:bg-gray-700"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      {attachmentError && (
        <p className="mb-2 text-[10px] text-red-600 dark:text-red-400">
          {attachmentError}
        </p>
      )}

      {/* Hidden file picker — triggered by the attach button below. */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(',')}
        aria-label="Attach image"
        title="Attach image"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) void handleFiles(e.target.files);
          // Reset so re-selecting the same file fires the change event again.
          e.target.value = '';
        }}
      />

      {/* Action mode pills */}
      {onActionModeChange && planStatus === 'idle' && (
        <div className="mb-2 flex items-center gap-1 text-[10px]">
          <span className="mr-1 text-gray-400 dark:text-gray-500">Mode</span>
          {modeOptions.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onActionModeChange(m.id as ActionMode)}
              title={m.hint}
              className={`px-2 py-0.5 rounded-full transition-colors ${
                actionMode === m.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}

      {/* Quick prompts */}
      {showQuickPrompts && !message && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {(planStatus === 'reviewing'
            ? PLAN_REFINEMENT_PROMPTS
            : hasActiveForm
              ? MODIFICATION_PROMPTS
              : CREATION_PROMPTS
          ).map((prompt) => (
            <button
              key={prompt}
              onClick={() => { setMessage(prompt); setShowQuickPrompts(false); }}
              className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Quick prompt toggle */}
        <button
          type="button"
          onClick={() => setShowQuickPrompts(!showQuickPrompts)}
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
          title="Quick prompts"
          aria-label="Quick prompts"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </button>

        {/* Attach image */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Attach image (PNG / JPEG / WEBP / GIF, max 4 MB)"
          aria-label="Attach image"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </button>

        {/* Text input */}
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        />

        {/* Send button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={(!message.trim() && !attachment) || disabled}
          aria-label="Send message"
          title="Send message"
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>

      {/* Character counter */}
      {message.length > 100 && (
        <p className={`text-[10px] mt-1 text-right ${message.length > 4500 ? 'text-red-500' : 'text-gray-400'}`}>
          {message.length}/5000
        </p>
      )}
    </div>
  );
};
