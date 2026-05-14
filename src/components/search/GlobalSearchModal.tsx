/**
 * Global Search Modal (Cmd+K / Ctrl+K)
 * Cross-module search with keyboard navigation.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router';
import client from '@/api/client';

interface SearchResult {
  type: 'order' | 'buyer' | 'supplier' | 'material' | 'style' | 'po' | 'employee';
  id: number;
  title: string;
  subtitle?: string;
  link: string;
}

const MODULE_ICONS: Record<string, string> = {
  order: '📦',
  buyer: '🏢',
  supplier: '🏭',
  material: '🧵',
  style: '👔',
  po: '📋',
  employee: '👤',
};

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function GlobalSearchModal({ open, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const abortRef = useRef<AbortController | null>(null);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);

      try {
        const searchResults: SearchResult[] = [];
        const q = query.trim();

        // Search multiple endpoints in parallel
        const requests = [
          client.get('/merchandising/orders', { params: { search: q, page: 1, limit: 5 }, signal: controller.signal })
            .then(r => (r.data.data?.rows || r.data.data || []).map((o: any) => ({
              type: 'order' as const, id: o.id, title: o.orderNo || `Order #${o.id}`,
              subtitle: o.buyerName || o.buyer?.name, link: `/orders/${o.id}`,
            }))),
          client.get('/merchandising/buyers', { params: { search: q, page: 1, limit: 5 }, signal: controller.signal })
            .then(r => (r.data.data?.rows || r.data.data || []).map((b: any) => ({
              type: 'buyer' as const, id: b.id, title: b.name,
              subtitle: b.contactPerson || b.email, link: `/master/buyers`,
            }))),
          client.get('/merchandising/suppliers', { params: { search: q, page: 1, limit: 5 }, signal: controller.signal })
            .then(r => (r.data.data?.rows || r.data.data || []).map((s: any) => ({
              type: 'supplier' as const, id: s.id, title: s.name,
              subtitle: s.contactPerson || s.email, link: `/master/suppliers`,
            }))),
          client.get('/merchandising/materials', { params: { search: q, page: 1, limit: 5 }, signal: controller.signal })
            .then(r => (r.data.data?.rows || r.data.data || []).map((m: any) => ({
              type: 'material' as const, id: m.id, title: m.name || m.itemName,
              subtitle: m.category || m.unit, link: `/master/materials`,
            }))),
        ];

        const settled = await Promise.allSettled(requests);
        for (const r of settled) {
          if (r.status === 'fulfilled') searchResults.push(...r.value);
        }

        if (!controller.signal.aborted) {
          setResults(searchResults);
          setSelected(0);
        }
      } catch {
        // Silently ignore abort errors
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const goToResult = useCallback((result: SearchResult) => {
    onClose();
    navigate(result.link);
  }, [navigate, onClose]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected(s => Math.min(s + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected(s => Math.max(s - 1, 0));
    } else if (e.key === 'Enter' && results[selected]) {
      goToResult(results[selected]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-xl rounded-xl bg-white shadow-2xl dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-gray-200 px-4 dark:border-gray-700">
          <svg className="h-5 w-5 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            className="h-14 w-full bg-transparent text-base text-gray-900 placeholder-gray-400 outline-none dark:text-white"
            placeholder="Search orders, buyers, suppliers, materials..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <kbd className="rounded border border-gray-300 px-1.5 py-0.5 text-xs font-medium text-gray-500 dark:border-gray-600">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto custom-scrollbar">
          {loading && (
            <div className="flex items-center gap-2 px-4 py-6 text-sm text-gray-400">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
              Searching...
            </div>
          )}

          {!loading && query.length >= 2 && results.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              No results found for "{query}"
            </div>
          )}

          {!loading && results.length > 0 && (
            <ul className="py-2">
              {results.map((r, i) => (
                <li key={`${r.type}-${r.id}`}>
                  <button
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                      i === selected
                        ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400'
                        : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/50'
                    }`}
                    onClick={() => goToResult(r)}
                    onMouseEnter={() => setSelected(i)}
                  >
                    <span className="text-lg">{MODULE_ICONS[r.type] || '📄'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{r.title}</div>
                      {r.subtitle && <div className="text-xs text-gray-400 truncate">{r.subtitle}</div>}
                    </div>
                    <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                      {r.type}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {!loading && !query && (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              <p>Type to search across all modules</p>
              <p className="mt-1 text-xs text-gray-300 dark:text-gray-600">
                Orders · Buyers · Suppliers · Materials
              </p>
            </div>
          )}
        </div>

        {/* Footer  */}
        {results.length > 0 && (
          <div className="border-t border-gray-200 px-4 py-2 text-xs text-gray-400 dark:border-gray-700 flex items-center gap-4">
            <span><kbd className="rounded border px-1 dark:border-gray-600">↑↓</kbd> Navigate</span>
            <span><kbd className="rounded border px-1 dark:border-gray-600">↵</kbd> Open</span>
            <span><kbd className="rounded border px-1 dark:border-gray-600">ESC</kbd> Close</span>
          </div>
        )}
      </div>
    </div>
  );
}
