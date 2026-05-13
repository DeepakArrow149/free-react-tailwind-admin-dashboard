/**
 * Hover-revealed action row beneath an assistant chat bubble.
 *
 * Combines a clipboard Copy button (with a "Copied!" confirmation that
 * fades after 1.2s) and an optional Regenerate button. The caller wraps
 * this in an ancestor element with the `group` class so the row reveals
 * on hover of the bubble.
 */

import React, { useState } from 'react';

export interface MessageActionsProps {
  /** Text to copy when the user clicks Copy. */
  copyText: string;
  /** Optional Regenerate handler — button is hidden when undefined. */
  onRegenerate?: () => void;
}

export const MessageActions: React.FC<MessageActionsProps> = ({
  copyText,
  onRegenerate,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // Clipboard may be blocked; the bubble is still text-selectable,
      // so we fail silently rather than surfacing an error.
    }
  };

  return (
    <div className="mt-1 ml-1 flex items-center gap-3 text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
      <button
        type="button"
        onClick={handleCopy}
        title={copied ? 'Copied!' : 'Copy message'}
        aria-label="Copy message"
        className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400"
      >
        {copied ? (
          <>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Copied
          </>
        ) : (
          <>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy
          </>
        )}
      </button>
      {onRegenerate && (
        <button
          type="button"
          onClick={onRegenerate}
          title="Regenerate response"
          aria-label="Regenerate response"
          className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Regenerate
        </button>
      )}
    </div>
  );
};
