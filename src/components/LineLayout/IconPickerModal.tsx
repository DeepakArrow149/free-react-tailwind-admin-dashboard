import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useMachineIcons } from '@/hooks/useMachineIcons';
import type { MachineIcon } from '@/api/machineIcons';
import DynamicMachineIcon from './DynamicMachineIcon';

/* ================================================================
 *  MACHINE METADATA — descriptions & "used-in" for preview panel
 * ================================================================ */
interface MachineMeta { description: string; usedIn: string[] }

const META: Record<string, MachineMeta> = {
  SNLS: { description: 'Single-needle lockstitch — the workhorse of garment sewing. Produces the strongest Class 301 stitch for joining panels.', usedIn: ['Sleeve attach', 'Side seam', 'Collar join', 'Pocket attach', 'Topstitch', 'Label'] },
  DNLS: { description: 'Double-needle lockstitch creates two parallel rows simultaneously for reinforcement and decorative topstitching.', usedIn: ['Waistband topstitch', 'Yoke stitch', 'Pocket topstitch', 'Placket stitch'] },
  OL:   { description: 'Overlock (serger) trims and encloses raw edges with 3/4/5-thread stitch. Essential for seam finishing and knits.', usedIn: ['Edge finishing', 'Side seam (knits)', 'Shoulder join', 'Neckband attach'] },
  FL:   { description: 'Flatlock / Coverstitch creates flat seams and hems on knit garments. Chain stitch top, cover stitch bottom.', usedIn: ['Bottom hem', 'Sleeve hem', 'Neckline cover', 'Elastic attach'] },
  BT:   { description: 'Bartack reinforces stress points with dense zigzag stitching. Critical for durability at pockets and openings.', usedIn: ['Belt loop bartack', 'Pocket mouth', 'Fly bartack', 'Zipper end'] },
  BH:   { description: 'Buttonhole machine creates precision buttonholes with automatic sizing — keyhole, straight, or rounded.', usedIn: ['Front placket', 'Cuff holes', 'Collar holes', 'Waistband'] },
  BS:   { description: 'Button sewing machine attaches buttons at high speed with consistent tension and shank wrap.', usedIn: ['Front buttons', 'Cuff buttons', 'Collar buttons', 'Snap attach'] },
  KS:   { description: 'Kansai Special multi-needle chain stitch for waistband and belt loop attach — multiple parallel rows.', usedIn: ['Waistband attach', 'Belt loop set', 'Elastic attach'] },
  IRON: { description: 'Industrial steam iron & vacuum pressing table. Essential for mid-process and final pressing to shape garments.', usedIn: ['Seam opening', 'Collar press', 'Final press', 'Crease setting'] },
  FOA:  { description: 'Feed Off the Arm (cylinder bed) machine lets tubular fabric pass around a cylinder arm.', usedIn: ['Inseam join', 'Sleeve inseam', 'Armhole stitch', 'Cuff attach'] },
  MANUAL:  { description: 'Manual hand operations — marking, trimming, turning, thread cutting, and inspection.', usedIn: ['Thread trim', 'Marking', 'Turning collars', 'Hand stitch', 'QC check'] },
  CUTTING: { description: 'Industrial fabric cutting — straight knife, band knife, or auto cutter for precision layer cutting.', usedIn: ['Pattern cutting', 'Layer cutting', 'Sample cutting', 'Spreading'] },
  FUSING:  { description: 'Continuous fusing machine bonds interlining to fabric using heat & pressure for stability.', usedIn: ['Collar fusing', 'Cuff fusing', 'Front band fusing', 'Pocket flap'] },
};
const DEFAULT_META: MachineMeta = { description: 'Industrial garment manufacturing equipment.', usedIn: [] };

function getMetadata(code?: string | null): MachineMeta {
  if (!code) return DEFAULT_META;
  const u = code.toUpperCase();
  if (META[u]) return META[u];
  for (const k of Object.keys(META)) { if (u.includes(k)) return META[k]; }
  return DEFAULT_META;
}

/* ================================================================
 *  CATEGORY CONFIG — color tokens per category
 * ================================================================ */
const CAT_STYLE: Record<string, { label: string; badge: string; dotColor: string }> = {
  SEWING:     { label: 'Sewing',     badge: 'bg-blue-50 text-blue-700 dark:bg-blue-900/25 dark:text-blue-300',        dotColor: 'bg-blue-500' },
  CUTTING:    { label: 'Cutting',    badge: 'bg-orange-50 text-orange-700 dark:bg-orange-900/25 dark:text-orange-300', dotColor: 'bg-orange-500' },
  FINISHING:  { label: 'Finishing',   badge: 'bg-green-50 text-green-700 dark:bg-green-900/25 dark:text-green-300',    dotColor: 'bg-green-500' },
  PRESSING:   { label: 'Pressing',   badge: 'bg-amber-50 text-amber-700 dark:bg-amber-900/25 dark:text-amber-300',    dotColor: 'bg-amber-500' },
  MANUAL:     { label: 'Manual',     badge: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',          dotColor: 'bg-gray-400' },
  SPECIAL:    { label: 'Special',    badge: 'bg-purple-50 text-purple-700 dark:bg-purple-900/25 dark:text-purple-300', dotColor: 'bg-purple-500' },
  EMBROIDERY: { label: 'Embroidery', badge: 'bg-pink-50 text-pink-700 dark:bg-pink-900/25 dark:text-pink-300',        dotColor: 'bg-pink-500' },
  UTILITY:    { label: 'Utility',    badge: 'bg-teal-50 text-teal-700 dark:bg-teal-900/25 dark:text-teal-300',        dotColor: 'bg-teal-500' },
};
const DEFAULT_CAT = { label: 'Other', badge: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400', dotColor: 'bg-gray-400' };
function catStyle(cat?: string | null) { return CAT_STYLE[cat ?? ''] ?? DEFAULT_CAT; }

const TAB_ORDER = ['ALL', 'SEWING', 'CUTTING', 'FINISHING', 'PRESSING', 'SPECIAL', 'MANUAL'] as const;

/* ================================================================
 *  SUB-COMPONENT: CategoryTabs
 * ================================================================ */
const CategoryTabs: React.FC<{
  active: string;
  counts: Record<string, number>;
  onChange: (cat: string) => void;
}> = ({ active, counts, onChange }) => (
  <div className="flex items-center gap-1 overflow-x-auto px-5 py-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
    {TAB_ORDER.map(tab => {
      const isAll = tab === 'ALL';
      const c = isAll ? Object.values(counts).reduce((a, b) => a + b, 0) : (counts[tab] ?? 0);
      const isActive = active === tab;
      const st = isAll ? null : catStyle(tab);
      return (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all
            ${isActive
              ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white ring-1 ring-gray-200 dark:ring-gray-600'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-700/40'}
          `}
        >
          {st && <span className={`w-2 h-2 rounded-full ${st.dotColor} ${isActive ? '' : 'opacity-60'}`} />}
          {isAll ? 'All' : st?.label ?? tab}
          <span className={`text-[10px] ${isActive ? 'text-gray-500 dark:text-gray-400' : 'text-gray-400 dark:text-gray-500'}`}>
            {c}
          </span>
        </button>
      );
    })}
  </div>
);

/* ================================================================
 *  SUB-COMPONENT: MachineCard
 * ================================================================ */
const MachineCard: React.FC<{
  icon: MachineIcon;
  isSelected: boolean;
  isFocused: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
}> = ({ icon, isSelected, isFocused, onClick, onMouseEnter }) => {
  const st = catStyle(icon.category);
  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      data-icon-id={icon.id}
      className={`
        group relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-150 text-left
        focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400
        ${isSelected
          ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-900/20 shadow-md ring-1 ring-blue-200 dark:ring-blue-700'
          : isFocused
            ? 'border-blue-300 dark:border-blue-600 bg-white dark:bg-gray-800 shadow-md'
            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md'
        }
      `}
      title={`${icon.name} (${icon.code})`}
    >
      {isSelected && (
        <span className="absolute top-1.5 right-1.5 flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </span>
      )}

      <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gray-50 dark:bg-gray-700/40 group-hover:scale-105 transition-transform">
        <DynamicMachineIcon icon={icon} size={40} animated />
      </div>

      <span className="text-[11px] font-semibold text-gray-800 dark:text-gray-200 text-center leading-tight line-clamp-2 w-full">
        {icon.name}
      </span>

      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium ${st.badge}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${st.dotColor}`} />
        {st.label}
      </span>

      <span className="text-[9px] font-mono text-gray-400 dark:text-gray-500">
        {icon.code}
      </span>
    </button>
  );
};

/* ================================================================
 *  SUB-COMPONENT: PreviewPanel
 * ================================================================ */
const PreviewPanel: React.FC<{ icon: MachineIcon | null }> = ({ icon }) => {
  if (!icon) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4 text-center text-gray-400 dark:text-gray-500">
        <svg className="w-12 h-12 mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
        </svg>
        <p className="text-sm font-medium">Select a machine</p>
        <p className="text-xs mt-1">Hover or click any card to preview</p>
      </div>
    );
  }

  const st = catStyle(icon.category);
  const meta = getMetadata(icon.code);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="flex flex-col items-center gap-3 px-4 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
          <DynamicMachineIcon icon={icon} size={64} />
        </div>
        <div className="text-center">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{icon.name}</h3>
          <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500">{icon.code}</span>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${st.badge}`}>
          <span className={`w-2 h-2 rounded-full ${st.dotColor}`} />
          {st.label}
        </span>
      </div>

      <div className="px-4 py-3 space-y-3">
        <div>
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">Description</h4>
          <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{meta.description}</p>
        </div>

        {meta.usedIn.length > 0 && (
          <div>
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">Used In</h4>
            <div className="flex flex-wrap gap-1">
              {meta.usedIn.map(op => (
                <span key={op} className="inline-flex px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-[10px] text-gray-600 dark:text-gray-300 font-medium">
                  {op}
                </span>
              ))}
            </div>
          </div>
        )}

        <div>
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">Color</h4>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-md border border-gray-200 dark:border-gray-700" style={{ backgroundColor: icon.colorHex }} />
            <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400">{icon.colorHex}</span>
          </div>
        </div>

        {icon.tags && (
          <div>
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">Tags</h4>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 italic">{icon.tags}</p>
          </div>
        )}
      </div>
    </div>
  );
};

/* ================================================================
 *  MAIN: IconPickerModal
 * ================================================================ */
interface IconPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (icon: MachineIcon) => void;
  selectedIconId?: number | null;
  title?: string;
}

const IconPickerModal: React.FC<IconPickerModalProps> = ({
  open,
  onClose,
  onSelect,
  selectedIconId,
  title = 'Select Machine Icon',
}) => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  const [previewIcon, setPreviewIcon] = useState<MachineIcon | null>(null);
  const [focusIndex, setFocusIndex] = useState(-1);
  const searchRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const { data: icons, isLoading } = useMachineIcons();

  // Debounced search (300ms)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setSearch('');
      setDebouncedSearch('');
      setActiveTab('ALL');
      setFocusIndex(-1);
      if (selectedIconId && icons) {
        const current = icons.find(i => i.id === selectedIconId);
        setPreviewIcon(current ?? null);
      } else {
        setPreviewIcon(null);
      }
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [open, selectedIconId, icons]);

  // Category counts
  const categoryCounts = useMemo(() => {
    if (!icons) return {};
    const counts: Record<string, number> = {};
    icons.filter(i => i.isActive).forEach(i => {
      counts[i.category] = (counts[i.category] || 0) + 1;
    });
    return counts;
  }, [icons]);

  // Filtered icons
  const filtered = useMemo(() => {
    if (!icons) return [];
    let result = icons.filter(i => i.isActive);
    if (activeTab !== 'ALL') result = result.filter(i => i.category === activeTab);
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(
        i => i.name.toLowerCase().includes(q) ||
          i.code.toLowerCase().includes(q) ||
          (i.tags && i.tags.toLowerCase().includes(q)) ||
          i.category.toLowerCase().includes(q)
      );
    }
    return result;
  }, [icons, activeTab, debouncedSearch]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const cols = 4;
    const len = filtered.length;
    if (!len) return;

    if (e.key === 'Escape') { onClose(); return; }

    let next = focusIndex;
    if (e.key === 'ArrowRight') next = Math.min(focusIndex + 1, len - 1);
    else if (e.key === 'ArrowLeft') next = Math.max(focusIndex - 1, 0);
    else if (e.key === 'ArrowDown') next = Math.min(focusIndex + cols, len - 1);
    else if (e.key === 'ArrowUp') next = Math.max(focusIndex - cols, 0);
    else if (e.key === 'Enter' && focusIndex >= 0 && focusIndex < len) {
      onSelect(filtered[focusIndex]);
      return;
    } else return;

    e.preventDefault();
    setFocusIndex(next);
    setPreviewIcon(filtered[next]);
    const el = gridRef.current?.querySelector(`[data-icon-id="${filtered[next].id}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [filtered, focusIndex, onClose, onSelect]);

  const handleSelect = useCallback((icon: MachineIcon) => {
    onSelect(icon);
  }, [onSelect]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-225 max-h-[85vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">{title}</h2>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">Browse and select a machine icon for assignment</p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Search bar ── */}
        <div className="px-5 py-2.5 border-b border-gray-100 dark:border-gray-800">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={searchRef}
              type="text"
              placeholder="Search by name, code, or tag…"
              value={search}
              onChange={e => { setSearch(e.target.value); setFocusIndex(-1); }}
              className="w-full pl-9 pr-4 py-2 text-sm border rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500 dark:text-white transition-shadow"
            />
            {search && (
              <button
                onClick={() => { setSearch(''); setDebouncedSearch(''); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                aria-label="Clear search"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* ── Category tabs ── */}
        <CategoryTabs active={activeTab} counts={categoryCounts} onChange={cat => { setActiveTab(cat); setFocusIndex(-1); }} />

        {/* ── Content: Grid + Preview ── */}
        <div className="flex flex-1 min-h-0">
          {/* Icon Grid */}
          <div ref={gridRef} className="flex-1 overflow-y-auto p-4" tabIndex={0}>
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="flex flex-col items-center gap-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-blue-500" />
                  <span className="text-xs text-gray-400">Loading icons…</span>
                </div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
                <svg className="w-10 h-10 mb-2 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-sm font-medium">No icons found</p>
                <p className="text-xs mt-1">Try a different search or category</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {filtered.map((icon, idx) => (
                  <MachineCard
                    key={icon.id}
                    icon={icon}
                    isSelected={selectedIconId === icon.id}
                    isFocused={focusIndex === idx}
                    onClick={() => handleSelect(icon)}
                    onMouseEnter={() => { setPreviewIcon(icon); setFocusIndex(idx); }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Preview Panel (right side) — hidden on mobile */}
          <div className="hidden md:flex w-64 shrink-0 border-l border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20">
            <PreviewPanel icon={previewIcon} />
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/40">
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-gray-400 dark:text-gray-500">
              {filtered.length} icon{filtered.length !== 1 ? 's' : ''}{debouncedSearch ? ' matching' : ' available'}
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-600">
              <kbd className="px-1 py-0.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 font-mono text-[9px]">↑↓←→</kbd>
              navigate
              <kbd className="px-1 py-0.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 font-mono text-[9px] ml-1">↵</kbd>
              select
              <kbd className="px-1 py-0.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 font-mono text-[9px] ml-1">esc</kbd>
              close
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(IconPickerModal);
