import React, { useRef } from 'react';
import { useDrop } from 'react-dnd';
import { usePlanningBoardStore } from '@/store/planningBoardStore';
import { useCreateJob, useUpdateJob } from '@/hooks/usePlanningBoard';
import JobBlock from './JobBlock';
import type { BoardLine, PlanningJob } from '@/api/planningBoard';

interface Props {
  line: BoardLine & { jobs: PlanningJob[] };
  dates: Date[];
  dayColumnWidth: number;
  fromDate: Date;
  rowHeight: number;
  subRowMap: Map<number, number>;
}

function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6;
}

/** DND item type for order dropping from unplanned panel */
export const DND_ITEM_TYPE = 'UNPLANNED_ORDER';
export const DND_JOB_TYPE = 'PLANNING_JOB';

export default function LineRow({ line, dates, dayColumnWidth, fromDate, rowHeight, subRowMap }: Props) {
  const { activeScenarioId, viewMode } = usePlanningBoardStore();
  const createJob = useCreateJob();
  const updateJob = useUpdateJob();
  const rowRef = useRef<HTMLDivElement>(null);

  // Drop: accept unplanned orders being dragged onto this line
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: [DND_ITEM_TYPE, DND_JOB_TYPE],
    drop: (item: { type?: string; orderId?: number; id?: number; remainingQty?: number; allocatedQty?: number; sam?: number; jobId?: number; lineId?: number }, monitor) => {
      if (!activeScenarioId) return;

      // Determine the drop date from mouse position
      const clientOffsetX = monitor.getClientOffset()?.x ?? 0;
      const rowRect = rowRef.current?.getBoundingClientRect();
      // Walk up to the actual scroll container (has overflow)
      let scrollContainer = rowRef.current?.parentElement;
      while (scrollContainer && scrollContainer.scrollWidth <= scrollContainer.clientWidth) {
        scrollContainer = scrollContainer.parentElement;
      }
      const scrollLeft = scrollContainer?.scrollLeft ?? 0;
      const relativeX = clientOffsetX - (rowRect?.left ?? 0) + scrollLeft;
      const dayIndex = Math.floor(relativeX / dayColumnWidth);
      const dropDate = new Date(fromDate);
      dropDate.setDate(dropDate.getDate() + Math.max(0, dayIndex));
      const startDateStr = dropDate.toISOString().slice(0, 10);

      // Check jobId FIRST — existing jobs also carry orderId
      if (item.jobId) {
        updateJob.mutate({
          id: item.jobId,
          data: {
            lineId: line.id,
            startDate: startDateStr,
          },
        });
      } else if (item.type === DND_ITEM_TYPE || item.orderId) {
        // New job from unplanned order
        const orderId = item.orderId ?? item.id;
        if (!orderId) return;
        createJob.mutate({
          scenarioId: activeScenarioId,
          orderId,
          lineId: line.id,
          startDate: startDateStr,
          allocatedQty: item.remainingQty ?? item.allocatedQty ?? 0,
          samPerPiece: item.sam,
        });
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  // Calculate job position and width in the row
  function getJobPosition(job: PlanningJob) {
    const jobStart = new Date(job.startDate);
    const jobEnd = new Date(job.endDate);

    const startOffset = Math.max(
      0,
      Math.floor((jobStart.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24))
    );
    const endOffset = Math.floor(
      (jobEnd.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const width = Math.max(1, endOffset - startOffset + 1);

    return {
      left: startOffset * dayColumnWidth,
      width: width * dayColumnWidth - 2, // 2px gap
    };
  }

  return (
    <div
      ref={(node: HTMLDivElement | null) => {
        (rowRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        drop(node);
      }}
      className={`relative border-b border-gray-200 dark:border-gray-700 transition-colors ${
        isOver && canDrop
          ? 'bg-blue-50 dark:bg-blue-900/20'
          : 'hover:bg-gray-50/50 dark:hover:bg-gray-700/20'
      }`}
      style={{ height: rowHeight }}
    >
      {/* Background grid cells */}
      <div className="absolute inset-0 flex pointer-events-none">
        {dates.map((d, i) => (
          <div
            key={i}
            className={`border-r border-gray-100 dark:border-gray-700/50 ${
              isWeekend(d) ? 'bg-gray-50 dark:bg-gray-700/30' : ''
            }`}
            style={{ width: dayColumnWidth }}
          />
        ))}
      </div>

      {/* Drop indicator */}
      {isOver && canDrop && (
        <div className="absolute inset-0 border-2 border-blue-400 border-dashed rounded pointer-events-none z-10 bg-blue-50/30 dark:bg-blue-900/10" />
      )}

      {/* Job blocks */}
      {line.jobs.map((job) => {
        const pos = getJobPosition(job);
        return (
          <JobBlock
            key={job.id}
            job={job}
            left={pos.left}
            width={pos.width}
            viewMode={viewMode}
            subRow={subRowMap.get(job.id) ?? 0}
            dayColumnWidth={dayColumnWidth}
            fromDate={fromDate.toISOString().slice(0, 10)}
            onResize={(jobId, newEndDate) => {
              updateJob.mutate({ id: jobId, data: { endDate: newEndDate } });
            }}
          />
        );
      })}
    </div>
  );
}
