import { useMemo, useRef } from 'react';
import { usePlanningBoardStore, type ViewMode } from '@/store/planningBoardStore';
import LineRow from './LineRow';
import type { BoardData, PlanningJob } from '@/api/planningBoard';

/** Return a colour class based on utilisation percentage */
function utilizationColor(pct: number): string {
  if (pct >= 95) return 'bg-red-500';
  if (pct >= 80) return 'bg-amber-400';
  if (pct >= 50) return 'bg-green-500';
  return 'bg-gray-300 dark:bg-gray-600';
}

/** Compute rough utilisation % for a line: occupied working days / total working days in range */
function computeLineUtilization(jobs: PlanningJob[], dates: Date[]): number {
  if (!dates.length) return 0;
  const workingDays = dates.filter((d) => !isWeekend(d)).length;
  if (workingDays === 0) return 0;
  const occupied = new Set<string>();
  for (const job of jobs) {
    const start = new Date(job.startDate);
    const end = new Date(job.endDate);
    const cur = new Date(Math.max(start.getTime(), dates[0].getTime()));
    const limit = new Date(Math.min(end.getTime(), dates[dates.length - 1].getTime()));
    while (cur <= limit) {
      if (!isWeekend(cur)) occupied.add(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
    }
  }
  return Math.min(100, Math.round((occupied.size / workingDays) * 100));
}

interface Props {
  boardData: BoardData;
}

/** Generate array of dates between from and to (inclusive) */
function generateDateRange(from: string, to: string): Date[] {
  const dates: Date[] = [];
  const current = new Date(from);
  const end = new Date(to);
  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

function formatHeaderDate(d: Date, zoom: string): string {
  if (zoom === 'day') return d.getDate().toString();
  if (zoom === 'week') return `W${getWeekNumber(d)}`;
  return d.toLocaleDateString('en-US', { month: 'short' });
}

function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6;
}

function isToday(d: Date): boolean {
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/* ── Swim-lane packing: stack overlapping jobs vertically ── */
function computeSubRows(jobs: PlanningJob[]): { subRowMap: Map<number, number>; maxSubRows: number } {
  const sorted = [...jobs].sort((a, b) => {
    const d = new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    return d !== 0 ? d : new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
  });
  const subRowMap = new Map<number, number>();
  const subRowEnds: number[] = []; // latest endDate (ms) per sub-row
  for (const job of sorted) {
    const start = new Date(job.startDate).getTime();
    let placed = false;
    for (let r = 0; r < subRowEnds.length; r++) {
      if (start > subRowEnds[r]) { // starts strictly AFTER previous job ends
        subRowMap.set(job.id, r);
        subRowEnds[r] = new Date(job.endDate).getTime();
        placed = true;
        break;
      }
    }
    if (!placed) {
      subRowMap.set(job.id, subRowEnds.length);
      subRowEnds.push(new Date(job.endDate).getTime());
    }
  }
  return { subRowMap, maxSubRows: Math.max(1, subRowEnds.length) };
}

const JOB_HEIGHTS: Record<ViewMode, number> = { SIMPLE: 28, DETAIL: 56, REALTIME: 64 };
const BASE_TOPS:   Record<ViewMode, number> = { SIMPLE: 22, DETAIL: 8,  REALTIME: 8  };
const SUB_ROW_GAP = 4;
const EMPTY_SUBROW_MAP = new Map<number, number>();

function getRowHeight(maxSubRows: number, mode: ViewMode): number {
  if (maxSubRows <= 1) return 72;
  return BASE_TOPS[mode] + maxSubRows * (JOB_HEIGHTS[mode] + SUB_ROW_GAP) + 4;
}

export default function TimelineGrid({ boardData }: Props) {
  const { fromDate, toDate, dayColumnWidth, zoomLevel, viewMode } = usePlanningBoardStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  const dates = useMemo(() => generateDateRange(fromDate, toDate), [fromDate, toDate]);

  // Group dates by month for month header row
  const monthGroups = useMemo(() => {
    const groups: { label: string; colSpan: number }[] = [];
    let current = '';
    for (const d of dates) {
      const label = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
      if (label !== current) {
        groups.push({ label, colSpan: 1 });
        current = label;
      } else {
        groups[groups.length - 1].colSpan++;
      }
    }
    return groups;
  }, [dates]);

  const totalWidth = dates.length * dayColumnWidth;
  const lineNameWidth = 160;

  // Find today's column offset for the red "today" line
  const todayIndex = dates.findIndex(isToday);

  // Pre-compute swim-lane layout for every line
  const lineMetrics = useMemo(() => {
    const map = new Map<number, { subRowMap: Map<number, number>; rowHeight: number }>();
    for (const line of boardData.lines) {
      const { subRowMap, maxSubRows } = computeSubRows(line.jobs ?? []);
      map.set(line.id, { subRowMap, rowHeight: getRowHeight(maxSubRows, viewMode) });
    }
    return map;
  }, [boardData.lines, viewMode]);

  // Pre-compute utilisation per line for heat-map bars
  const lineUtilMap = useMemo(() => {
    const map = new Map<number, number>();
    for (const line of boardData.lines) {
      map.set(line.id, computeLineUtilization(line.jobs ?? [], dates));
    }
    return map;
  }, [boardData.lines, dates]);

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Frozen left column: line names */}
      <div className="shrink-0 border-r border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 z-10"
        style={{ width: lineNameWidth }}
      >
        {/* Header placeholders matching top rows */}
        <div className="h-[28px] border-b border-gray-200 dark:border-gray-700 flex items-center px-2">
          <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Lines
          </span>
        </div>
        <div className="h-[24px] border-b border-gray-200 dark:border-gray-700" />
        <div className="h-[20px] border-b border-gray-300 dark:border-gray-600" />

        {/* Line name rows */}
        {boardData.lines.map((line) => {
          const util = lineUtilMap.get(line.id) ?? 0;
          return (
          <div
            key={line.id}
            className="border-b border-gray-200 dark:border-gray-700 flex flex-col justify-center px-2 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
            style={{ height: lineMetrics.get(line.id)?.rowHeight ?? 72 }}
          >
            <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
              {line.lineName}
            </span>
            <span className="text-[10px] text-gray-500 dark:text-gray-400">
              {line.department} · {line.totalOperators ?? '--'} ops
            </span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[10px] text-gray-400">{line.jobs?.length ?? 0} jobs</span>
            </div>
            {/* Capacity heat-map bar */}
            <div className="mt-1 w-full h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden" title={`Utilization ${util}%`}>
              <div className={`h-full rounded-full transition-all ${utilizationColor(util)}`} style={{ width: `${util}%` }} />
            </div>
            <span className="text-[9px] text-gray-400 mt-0.5">{util}% utilized</span>
          </div>
          );
        })}
      </div>

      {/* Scrollable timeline area */}
      <div ref={scrollRef} className="flex-1 overflow-auto">
        <div style={{ minWidth: totalWidth }}>
          {/* Month header row */}
          <div className="flex h-[28px] border-b border-gray-200 dark:border-gray-700">
            {monthGroups.map((g, i) => (
              <div
                key={i}
                className="flex items-center justify-center text-[10px] font-semibold text-gray-600 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                style={{ width: g.colSpan * dayColumnWidth }}
              >
                {g.label}
              </div>
            ))}
          </div>

          {/* Day-of-week header */}
          <div className="flex h-[24px] border-b border-gray-200 dark:border-gray-700">
            {dates.map((d, i) => (
              <div
                key={i}
                className={`flex items-center justify-center text-[9px] border-r border-gray-100 dark:border-gray-700 ${
                  isWeekend(d)
                    ? 'bg-gray-100 dark:bg-gray-700/50 text-gray-400'
                    : isToday(d)
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
                style={{ width: dayColumnWidth }}
              >
                {DAYS[d.getDay()].charAt(0)}
              </div>
            ))}
          </div>

          {/* Date number header */}
          <div className="flex h-[20px] border-b border-gray-300 dark:border-gray-600">
            {dates.map((d, i) => (
              <div
                key={i}
                className={`flex items-center justify-center text-[10px] font-medium border-r border-gray-100 dark:border-gray-700 ${
                  isWeekend(d)
                    ? 'bg-gray-100 dark:bg-gray-700/50 text-gray-400'
                    : isToday(d)
                    ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold'
                    : 'text-gray-600 dark:text-gray-300'
                }`}
                style={{ width: dayColumnWidth }}
              >
                {formatHeaderDate(d, zoomLevel)}
              </div>
            ))}
          </div>

          {/* Line rows with jobs */}
          <div className="relative">
            {/* Today indicator line */}
            {todayIndex >= 0 && (
              <div
                className="absolute top-0 bottom-0 w-[2px] bg-red-500 z-20 pointer-events-none"
                style={{ left: todayIndex * dayColumnWidth + dayColumnWidth / 2 }}
              />
            )}

            {boardData.lines.map((line) => {
              const m = lineMetrics.get(line.id);
              return (
                <LineRow
                  key={line.id}
                  line={line}
                  dates={dates}
                  dayColumnWidth={dayColumnWidth}
                  fromDate={new Date(fromDate)}
                  rowHeight={m?.rowHeight ?? 72}
                  subRowMap={m?.subRowMap ?? EMPTY_SUBROW_MAP}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
