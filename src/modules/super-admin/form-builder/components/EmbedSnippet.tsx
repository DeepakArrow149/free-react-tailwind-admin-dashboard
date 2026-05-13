/**
 * EmbedSnippet – Generates iframe/HTML embed code for a published form.
 * Users can copy-to-clipboard the embed snippet.
 */

import { useState, useMemo } from 'react';
import type { FormDefinition } from '../types';
import { toast } from 'sonner';

interface Props {
  form: FormDefinition;
  onClose: () => void;
}

export default function EmbedSnippet({ form, onClose }: Props) {
  const [width, setWidth] = useState('100%');
  const [height, setHeight] = useState('600');
  const [border, setBorder] = useState(false);

  const formUrl = useMemo(
    () => `${window.location.origin}/forms/${form.slug}`,
    [form.slug],
  );

  const iframeCode = useMemo(() => {
    const borderStyle = border ? 'border:1px solid #e5e7eb;border-radius:8px;' : 'border:none;';
    return `<iframe
  src="${formUrl}"
  width="${width}"
  height="${height}px"
  style="${borderStyle}overflow:hidden;"
  title="${form.name}"
  loading="lazy"
  allow="clipboard-write"
></iframe>`;
  }, [formUrl, width, height, border, form.name]);

  const scriptCode = useMemo(() => {
    return `<!-- ${form.name} Embed -->
<div id="stitch-form-${form.slug}"></div>
<script>
(function() {
  var c = document.getElementById('stitch-form-${form.slug}');
  var f = document.createElement('iframe');
  f.src = '${formUrl}';
  f.width = '${width}';
  f.height = '${height}';
  f.style.cssText = '${border ? 'border:1px solid #e5e7eb;border-radius:8px;' : 'border:none;'}overflow:hidden;';
  f.title = '${form.name.replace(/'/g, "\\'")}';
  f.loading = 'lazy';
  c.appendChild(f);
})();
</script>`;
  }, [formUrl, width, height, border, form.name, form.slug]);

  const [tab, setTab] = useState<'iframe' | 'script'>('iframe');

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => toast.success('Copied to clipboard!'),
      () => toast.error('Failed to copy'),
    );
  };

  if (form.status !== 'published') {
    return (
      <div className="flex h-[calc(100vh-140px)] flex-col">
        <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            ← Back
          </button>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Embed Code</h2>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <p className="text-lg font-medium text-gray-600 dark:text-gray-400">⚠️ Form Not Published</p>
            <p className="mt-2 text-sm text-gray-400">
              You must publish this form before you can generate an embed code.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-140px)] flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          ← Back
        </button>
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
          🧩 Embed: {form.name}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-50 p-6 dark:bg-gray-900">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Direct Link */}
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
              Direct Link
            </h3>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={formUrl}
                className="flex-1 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(formUrl)}
                className="rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700"
              >
                Copy
              </button>
            </div>
          </div>

          {/* Configuration */}
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">
              Configuration
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                  Width
                </label>
                <input
                  type="text"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                  placeholder="e.g. 100%, 600px"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                  Height (px)
                </label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={border}
                    onChange={(e) => setBorder(e.target.checked)}
                    className="rounded"
                  />
                  Show Border
                </label>
              </div>
            </div>
          </div>

          {/* Embed Code */}
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Embed Code</h3>
              <div className="flex gap-1 rounded-md bg-gray-100 p-0.5 dark:bg-gray-700">
                <button
                  type="button"
                  onClick={() => setTab('iframe')}
                  className={`rounded px-3 py-1 text-xs font-medium transition ${
                    tab === 'iframe'
                      ? 'bg-white text-gray-700 shadow-sm dark:bg-gray-600 dark:text-gray-200'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  iframe
                </button>
                <button
                  type="button"
                  onClick={() => setTab('script')}
                  className={`rounded px-3 py-1 text-xs font-medium transition ${
                    tab === 'script'
                      ? 'bg-white text-gray-700 shadow-sm dark:bg-gray-600 dark:text-gray-200'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  Script
                </button>
              </div>
            </div>

            <div className="relative">
              <pre className="overflow-x-auto rounded-md bg-gray-900 p-4 text-xs text-green-400">
                <code>{tab === 'iframe' ? iframeCode : scriptCode}</code>
              </pre>
              <button
                type="button"
                onClick={() => copyToClipboard(tab === 'iframe' ? iframeCode : scriptCode)}
                className="absolute right-2 top-2 rounded bg-gray-700 px-2 py-1 text-xs text-gray-300 hover:bg-gray-600"
              >
                📋 Copy
              </button>
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">Preview</h3>
            <div className="overflow-hidden rounded-md border border-gray-200 dark:border-gray-600">
              <iframe
                src={formUrl}
                width={width}
                height={`${height}px`}
                style={{
                  border: border ? '1px solid #e5e7eb' : 'none',
                  borderRadius: border ? 8 : 0,
                  maxWidth: '100%',
                }}
                title={`Preview: ${form.name}`}
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
