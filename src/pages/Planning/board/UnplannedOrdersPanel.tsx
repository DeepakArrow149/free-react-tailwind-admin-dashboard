import { useState, useCallback } from 'react';
import { useDrag } from 'react-dnd';
import { usePlanningBoardStore } from '@/store/planningBoardStore';
import { useUnplannedOrders } from '@/hooks/usePlanningBoard';
import type { UnplannedOrder } from '@/api/planningBoard';

const DND_ITEM_TYPE = 'UNPLANNED_ORDER';

const ORDER_TYPE_COLORS: Record<string, string> = {
  CONFIRMED: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  PROJECT:   'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  SAMPLE:    'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
  CMT:       'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  FOB:       'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400',
};

function PriorityBadge({ p }: { p: number }) {
  const cls = p <= 2 ? 'text-red-600 dark:text-red-400' : p <= 3 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400';
  return <span className={`text-[9px] font-bold ${cls}`} title={`Priority ${p}`}>P{p}</span>;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function DraggableOrderCard({ order }: { order: UnplannedOrder }) {
  const [{ isDragging }, drag] = useDrag({
    type: DND_ITEM_TYPE,
    item: {
      type: DND_ITEM_TYPE,
      orderId: order.id,
      orderNo: order.orderNo,
      remainingQty: order.remainingQty,
      sam: order.sam,
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const dragRef = useCallback((node: HTMLDivElement | null) => { drag(node); }, [drag]);

  const daysUntilDue = Math.ceil(
    (new Date(order.exFactoryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  const isUrgent = daysUntilDue <= 14;
  const isOverdue = daysUntilDue < 0;

  return (
    <div
      ref={dragRef}
      className={`border rounded-lg p-2 cursor-grab active:cursor-grabbing transition-all hover:shadow-md ${
        isDragging ? 'opacity-40 scale-95' : ''
      } ${
        isOverdue
          ? 'border-red-300 bg-red-50 dark:border-red-600 dark:bg-red-900/20'
          : isUrgent
          ? 'border-amber-300 bg-amber-50 dark:border-amber-600 dark:bg-amber-900/20'
          : 'border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-700'
      }`}
    >
      <div className="flex items-start gap-2">
        {/* Garment image thumbnail */}
        {order.garmentImages && (
          <img
            src={(() => {
              try { return JSON.parse(order.garmentImages!)[0] ?? ''; }
              catch { return ''; }
            })()}
            alt=""
            className="w-10 h-10 rounded object-cover shrink-0"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
              {order.orderNo}
            </span>
            {order.orderType && order.orderType !== 'CONFIRMED' && (
              <span className={`text-[8px] rounded px-1 ${ORDER_TYPE_COLORS[order.orderType] ?? 'bg-gray-100 text-gray-600'}`}>
                {order.orderType}
              </span>
            )}
            {order.orderPriority != null && order.orderPriority <= 3 && (
              <PriorityBadge p={order.orderPriority} />
            )}
            {order.allocatedQty > 0 && (
              <span className="text-[8px] bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 rounded px-1">
                PARTIAL
              </span>
            )}
          </div>
          <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
            {order.buyer.name} · {order.style.styleNo}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300">
              {order.remainingQty.toLocaleString()} pcs
            </span>
            {order.sam != null && (
              <span className="text-[10px] text-gray-400">
                SAM {Number(order.sam).toFixed(1)}
              </span>
            )}
            <span
              className={`text-[10px] ml-auto ${
                isOverdue ? 'text-red-600 font-bold' : isUrgent ? 'text-amber-600 font-medium' : 'text-gray-400'
              }`}
            >
              {isOverdue ? `${Math.abs(daysUntilDue)}d overdue` : `${daysUntilDue}d to ship`}
            </span>
          </div>
          <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
            Ex-F: {fmtDate(order.exFactoryDate)}
          </div>
        </div>
      </div>

      {/* Allocation progress if partial */}
      {order.allocatedQty > 0 && (
        <div className="mt-1">
          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1">
            <div
              className="h-1 rounded-full bg-blue-500"
              style={{ width: `${Math.round((order.allocatedQty / order.totalQty) * 100)}%` }}
            />
          </div>
          <span className="text-[9px] text-gray-400">
            {order.allocatedQty}/{order.totalQty} allocated
          </span>
        </div>
      )}

      {/* No SAM warning */}
      {!order.sam && (
        <div className="mt-1 text-[9px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded px-1 py-0.5">
          ⚠ No SAM — drag will require manual entry
        </div>
      )}
    </div>
  );
}

export default function UnplannedOrdersPanel() {
  const { activeScenarioId, isUnplannedPanelOpen, toggleUnplannedPanel } = usePlanningBoardStore();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useUnplannedOrders(activeScenarioId, { search, page, limit: 30 });
  const orders = data?.orders ?? [];
  const meta = data?.meta ?? { page: 1, totalPages: 1, total: 0 };

  if (!isUnplannedPanelOpen) return null;

  return (
    <div className="w-[280px] shrink-0 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h3 className="text-xs font-semibold text-gray-800 dark:text-gray-200">Unplanned Orders</h3>
          <span className="text-[10px] text-gray-500">{meta.total} remaining</span>
        </div>
        <button
          onClick={toggleUnplannedPanel}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          ✕
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search order, buyer, style..."
          className="w-full text-xs border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-700 dark:text-white"
        />
      </div>

      {/* Hint */}
      <div className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800">
        <span className="text-[10px] text-blue-600 dark:text-blue-400">
          💡 Drag an order onto a line to plan it
        </span>
      </div>

      {/* Order list */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-2">
        {isLoading ? (
          <div className="text-center py-8 text-xs text-gray-400">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-8 text-xs text-gray-400">
            {search ? 'No matching orders' : 'All orders have been planned! 🎉'}
          </div>
        ) : (
          orders.map((order) => (
            <DraggableOrderCard key={order.id} order={order} />
          ))
        )}
      </div>

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-2 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50 dark:text-white"
          >
            ‹ Prev
          </button>
          <span className="text-[10px] text-gray-500">{page}/{meta.totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
            disabled={page >= meta.totalPages}
            className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50 dark:text-white"
          >
            Next ›
          </button>
        </div>
      )}
    </div>
  );
}
