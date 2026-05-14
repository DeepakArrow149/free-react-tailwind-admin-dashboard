import { useState } from 'react';
import { useCalendarDays } from '@/hooks/usePlanningBoard';
import { usePlanningBoardStore } from '@/store/planningBoardStore';
import { planningBoardApi, type CalendarDay } from '@/api/planningBoard';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

type DayType = 'WORKING' | 'HALF_DAY' | 'HOLIDAY' | 'WEEKEND';

const DAY_LABELS: Record<DayType, { label: string; color: string }> = {
  WORKING:  { label: 'Working',  color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  HALF_DAY: { label: 'Half Day', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  HOLIDAY:  { label: 'Holiday',  color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  WEEKEND:  { label: 'Weekend',  color: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400' },
};

/**
 * CalendarPanel — manage working calendar from the planning board sidebar.
 * Shows each day in the current date range and lets planner toggle day types.
 */
export default function CalendarPanel() {
  const { fromDate, toDate, toggleCalendarPanel } = usePlanningBoardStore();
  const { data: calendarDays, isLoading } = useCalendarDays(fromDate, toDate);
  const qc = useQueryClient();

  const [editingDate, setEditingDate] = useState<string | null>(null);

  const setCalendar = useMutation({
    mutationFn: (data: { days: Array<{ calendarDate: string; dayType: string; remarks?: string }> }) =>
      planningBoardApi.setCalendarDays(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planning-board', 'calendar'] });
      toast.success('Calendar updated');
      setEditingDate(null);
    },
  });

  const handleDayTypeChange = (dateStr: string, newType: DayType) => {
    setCalendar.mutate({
      days: [{ calendarDate: dateStr, dayType: newType }],
    });
  };

  // Generate all dates in range
  const allDates: string[] = [];
  const cur = new Date(fromDate);
  const end = new Date(toDate);
  while (cur <= end) {
    allDates.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }

  // Merge API data with defaults
  const dayMap = new Map(calendarDays?.map((d) => [d.calendarDate?.slice(0, 10), d]) ?? []);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white">📅 Working Calendar</h3>
        <button
          onClick={toggleCalendarPanel}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          ✕
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 px-4 py-2 border-b border-gray-100 dark:border-gray-700">
        {Object.entries(DAY_LABELS).map(([type, { label, color }]) => (
          <span key={type} className={`text-[10px] px-2 py-0.5 rounded-full ${color}`}>
            {label}
          </span>
        ))}
      </div>

      {/* Day list */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {isLoading && <div className="text-xs text-gray-400 text-center py-4">Loading…</div>}
        {allDates.map((dateStr) => {
          const dayData = dayMap.get(dateStr);
          const dayOfWeek = new Date(dateStr).getDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          const dayType: DayType = (dayData as CalendarDay | undefined)?.dayType ?? (isWeekend ? 'WEEKEND' : 'WORKING');
          const dayName = new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
          const { color } = DAY_LABELS[dayType];

          return (
            <div
              key={dateStr}
              className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50"
            >
              <span className="text-xs text-gray-700 dark:text-gray-300 min-w-[110px]">{dayName}</span>
              {editingDate === dateStr ? (
                <div className="flex gap-1">
                  {(Object.keys(DAY_LABELS) as DayType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => handleDayTypeChange(dateStr, type)}
                      className={`text-[10px] px-2 py-0.5 rounded ${DAY_LABELS[type].color} hover:ring-2 ring-blue-400`}
                    >
                      {DAY_LABELS[type].label}
                    </button>
                  ))}
                </div>
              ) : (
                <button
                  onClick={() => setEditingDate(dateStr)}
                  className={`text-[10px] px-2 py-0.5 rounded-full cursor-pointer hover:ring-2 ring-blue-300 ${color}`}
                >
                  {DAY_LABELS[dayType].label}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
