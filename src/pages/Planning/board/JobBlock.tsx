import { useCallback, useRef } from 'react';
import { useDrag } from 'react-dnd';
import { usePlanningBoardStore, type ViewMode } from '@/store/planningBoardStore';
import type { PlanningJob } from '@/api/planningBoard';

const DND_JOB_TYPE = 'PLANNING_JOB';

interface Props {
  job: PlanningJob;
  left: number;
  width: number;
  viewMode: ViewMode;
  subRow?: number;
  dayColumnWidth: number;
  fromDate: string;
  onResize?: (jobId: number, newEndDate: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  PLANNED: 'bg-blue-400/80 dark:bg-blue-600/80 border-blue-500',
  SETUP: 'bg-amber-400/80 dark:bg-amber-600/80 border-amber-500',
  IN_PROGRESS: 'bg-green-400/80 dark:bg-green-600/80 border-green-500',
  COMPLETED: 'bg-gray-300/80 dark:bg-gray-500/80 border-gray-400',
  CANCELLED: 'bg-red-300/80 dark:bg-red-600/80 border-red-400',
};

export default function JobBlock({ job, left, width, viewMode, subRow = 0, dayColumnWidth, fromDate, onResize }: Props) {
  const {
    hoveredJobId, setHoveredJob, openJobPopup,
    selectedJobIds, toggleJobSelection, openSplitDialog,
  } = usePlanningBoardStore();

  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const blockHeight = viewMode === 'SIMPLE' ? 28 : viewMode === 'DETAIL' ? 56 : 64;
  const blockTop = (viewMode === 'SIMPLE' ? 22 : 8) + subRow * (blockHeight + 4);

  const [{ isDragging }, drag] = useDrag({
    type: DND_JOB_TYPE,
    item: { jobId: job.id, orderId: job.orderId, lineId: job.lineId },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const dragRef = useCallback((node: HTMLDivElement | null) => { drag(node); }, [drag]);

  // Resize handlers using native mouse events
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!onResize || job.status === 'COMPLETED' || job.status === 'CANCELLED') return;

    resizeRef.current = { startX: e.clientX, startWidth: width };

    const handleMouseMove = (me: MouseEvent) => {
      if (!resizeRef.current) return;
      const dx = me.clientX - resizeRef.current.startX;
      const newWidth = Math.max(dayColumnWidth, resizeRef.current.startWidth + dx);
      // Round to nearest day
      const days = Math.round(newWidth / dayColumnWidth);
      const startDateObj = new Date(fromDate);
      const startOffset = Math.round(left / dayColumnWidth);
      const newEndDateObj = new Date(startDateObj);
      newEndDateObj.setDate(newEndDateObj.getDate() + startOffset + days - 1);
      // Visual feedback: update width in the DOM directly for smooth dragging
      const el = document.getElementById(`job-block-${job.id}`);
      if (el) el.style.width = `${days * dayColumnWidth - 2}px`;
    };

    const handleMouseUp = (me: MouseEvent) => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      if (!resizeRef.current) return;
      const dx = me.clientX - resizeRef.current.startX;
      const newWidth = Math.max(dayColumnWidth, resizeRef.current.startWidth + dx);
      const days = Math.round(newWidth / dayColumnWidth);
      const startDateObj = new Date(fromDate);
      const startOffset = Math.round(left / dayColumnWidth);
      const newEndDateObj = new Date(startDateObj);
      newEndDateObj.setDate(newEndDateObj.getDate() + startOffset + days - 1);
      resizeRef.current = null;
      onResize(job.id, newEndDateObj.toISOString().slice(0, 10));
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [onResize, job.id, job.status, width, left, dayColumnWidth, fromDate]);

  const isSelected = selectedJobIds.includes(job.id);
  const isHovered = hoveredJobId === job.id;

  const completionPct = job.allocatedQty > 0
    ? Math.round((job.completedQty / job.allocatedQty) * 100)
    : 0;

  // Use brand color if available, otherwise status color
  const bgColor = job.colorHex
    ? undefined
    : STATUS_COLORS[job.status] || STATUS_COLORS.PLANNED;
  const customStyle = job.colorHex
    ? { backgroundColor: job.colorHex + 'CC', borderColor: job.colorHex }
    : {};

  const isLateDelivery = job.order?.exFactoryDate
    ? new Date(job.endDate) > new Date(job.order.exFactoryDate)
    : false;

  return (
    <div
      ref={dragRef}
      id={`job-block-${job.id}`}
      className={`absolute top-1 cursor-pointer rounded border text-white transition-all select-none group ${
        bgColor ?? ''
      } ${isSelected ? 'ring-2 ring-yellow-400 ring-offset-1' : ''} ${
        isDragging ? 'opacity-40' : 'opacity-100'
      } ${isHovered ? 'z-30 shadow-lg scale-[1.02]' : 'z-10 shadow-sm hover:shadow-md'} ${
        isLateDelivery ? 'border-red-500 border-2' : ''
      }`}
      style={{
        left: Math.max(0, left),
        width: Math.max(24, width),
        height: blockHeight,
        top: blockTop,
        ...customStyle,
      }}
      onMouseEnter={() => setHoveredJob(job.id)}
      onMouseLeave={() => setHoveredJob(null)}
      onClick={(e) => {
        if (e.ctrlKey || e.metaKey) {
          toggleJobSelection(job.id);
        } else {
          openJobPopup(job.id);
        }
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        openSplitDialog(job.id);
      }}
      title={`${job.order?.orderNo ?? 'N/A'} | ${job.order?.buyer?.name ?? ''} | ${job.allocatedQty} pcs | ${job.order?.style?.styleNo ?? ''}`}
    >
      {/* Simple View */}
      {viewMode === 'SIMPLE' && (
        <div className="flex items-center h-full px-1.5 overflow-hidden gap-1">
          <span className="text-[10px] font-bold truncate leading-none">
            {job.order?.orderNo ?? `#${job.orderId}`}
          </span>
          {job.totalSplits > 1 && (
            <span className="text-[8px] bg-white/30 rounded px-0.5">
              {job.splitIndex + 1}/{job.totalSplits}
            </span>
          )}
          {width > 80 && (
            <span className="text-[9px] opacity-80 truncate">
              {job.allocatedQty}
            </span>
          )}
        </div>
      )}

      {/* Detail View */}
      {viewMode === 'DETAIL' && (
        <div className="flex flex-col h-full px-1.5 py-0.5 overflow-hidden">
          <div className="flex items-center gap-1">
            {/* Garment thumbnail */}
            {job.order?.garmentImages && (
              <img
                src={typeof job.order.garmentImages === 'string'
                  ? (JSON.parse(job.order.garmentImages)[0] ?? '')
                  : ''}
                alt=""
                className="w-6 h-6 rounded object-cover shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            )}
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-bold truncate leading-tight">
                {job.order?.orderNo ?? `#${job.orderId}`}
              </span>
              <span className="text-[9px] opacity-80 truncate leading-tight">
                {job.order?.buyer?.name ?? ''}
              </span>
            </div>
            {job.totalSplits > 1 && (
              <span className="text-[8px] bg-white/30 rounded px-0.5 ml-auto shrink-0">
                {job.splitIndex + 1}/{job.totalSplits}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 mt-auto">
            <span className="text-[9px] opacity-80">{job.allocatedQty} pcs</span>
            <span className="text-[9px] opacity-60">· {job.order?.style?.styleNo ?? ''}</span>
            {width > 120 && (
              <span className="text-[9px] opacity-80 ml-auto">
                {completionPct}%
              </span>
            )}
          </div>
          {/* Completion bar */}
          {completionPct > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-black/10 rounded-b">
              <div
                className="h-full bg-white/60 rounded-b"
                style={{ width: `${Math.min(100, completionPct)}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Real-time View */}
      {viewMode === 'REALTIME' && (
        <div className="flex flex-col h-full px-1.5 py-0.5 overflow-hidden">
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold truncate">{job.order?.orderNo ?? `#${job.orderId}`}</span>
            <span className="text-[9px] opacity-80 truncate ml-auto">{job.order?.buyer?.name ?? ''}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[9px]">{job.allocatedQty} pcs</span>
            <span className="text-[9px] opacity-80">SAM: {Number(job.samPerPiece).toFixed(1)}</span>
            <span className="text-[9px] opacity-80">Eff: {Number(job.plannedEfficiency)}%</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[9px] opacity-80">Target: {job.dailyTargetQty}/day</span>
            <span className="text-[9px] opacity-80">Done: {job.completedQty}</span>
          </div>
          {/* Delivery risk indicator */}
          {isLateDelivery && (
            <div className="absolute top-0 right-0 bg-red-600 text-[7px] text-white px-1 rounded-bl font-bold">
              LATE
            </div>
          )}
          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 right-0 h-[4px] bg-black/10 rounded-b">
            <div
              className={`h-full rounded-b ${completionPct >= 100 ? 'bg-green-300' : 'bg-white/60'}`}
              style={{ width: `${Math.min(100, completionPct)}%` }}
            />
          </div>
        </div>
      )}

      {/* Late delivery flash */}
      {isLateDelivery && viewMode !== 'REALTIME' && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-white animate-pulse" />
      )}

      {/* Resize handle */}
      {onResize && job.status !== 'COMPLETED' && job.status !== 'CANCELLED' && (
        <div
          className="absolute top-0 right-0 w-[6px] h-full cursor-col-resize opacity-0 group-hover:opacity-100 bg-white/40 hover:bg-white/70 transition-opacity rounded-r"
          onMouseDown={handleResizeStart}
          title="Drag to resize"
        />
      )}
    </div>
  );
}
