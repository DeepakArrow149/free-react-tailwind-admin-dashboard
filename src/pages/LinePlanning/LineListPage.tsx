import { useState } from 'react';
import { Link } from 'react-router';
import { PageMeta } from '@/components/common';
import { useLines } from '@/hooks/useLineBalancing';

interface CapacityLine {
  id: number;
  lineName: string;
  department: string;
  totalOperators: number;
  totalMachines: number;
  samCapacity: number | null;
  dailyCapacity: number | null;
  efficiency: number | null;
  shiftHours: number | null;
  _count?: { bookings?: number; workstations?: number; balancings?: number };
  layout?: { id: number; name: string; totalStations: number } | null;
  shift?: { id: number; name: string } | null;
}

export default function LineListPage() {
  const { data, isLoading } = useLines();
  const lines = (data ?? []) as CapacityLine[];
  const [search, setSearch] = useState('');

  const filtered = lines.filter(
    (l) =>
      l.lineName.toLowerCase().includes(search.toLowerCase()) ||
      l.department.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <>
      <PageMeta title="Lines" description="Production lines overview for line planning" />
      <div className="mx-auto max-w-7xl space-y-4 p-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Production Lines</h1>
          <div className="flex items-center gap-3">
            <input
              className="rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              placeholder="Search lines…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search lines"
            />
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="flex h-64 items-center justify-center text-gray-400">Loading lines…</div>
        ) : filtered.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-gray-400">
            {search ? 'No lines match your search' : 'No production lines configured'}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((line) => (
              <div
                key={line.id}
                className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 dark:text-white truncate">{line.lineName}</h3>
                  <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                    {line.department}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-gray-400">Operators</span>
                    <div className="font-bold text-sm text-gray-900 dark:text-white">{line.totalOperators}</div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-gray-400">Machines</span>
                    <div className="font-bold text-sm text-gray-900 dark:text-white">{line.totalMachines}</div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-gray-400">Stations</span>
                    <div className="font-bold text-sm text-gray-900 dark:text-white">
                      {line.layout?.totalStations ?? '—'}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-gray-400">Efficiency</span>
                    <div className="font-medium text-gray-700 dark:text-gray-300">{line.efficiency != null ? `${Number(line.efficiency).toFixed(0)}%` : '—'}</div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-gray-400">Layout</span>
                    <div className="font-medium text-gray-700 dark:text-gray-300">{line.layout?.name ?? 'None'}</div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-gray-400">Shift</span>
                    <div className="font-medium text-gray-700 dark:text-gray-300">{line.shift?.name ?? '—'}</div>
                  </div>
                  {line.dailyCapacity != null && (
                    <div className="col-span-3">
                      <span className="text-[10px] uppercase tracking-wider text-gray-400">Daily Capacity</span>
                      <div className="font-medium text-gray-700 dark:text-gray-300">{line.dailyCapacity} pcs · SAM Cap {line.samCapacity != null ? Number(line.samCapacity).toFixed(1) : '—'} · {line.shiftHours ?? 8}h shift</div>
                    </div>
                  )}
                </div>

                <div className="mt-3 flex gap-2 text-[10px]">
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-gray-800 dark:text-gray-400">
                    {line._count?.bookings ?? 0} bookings
                  </span>
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-gray-800 dark:text-gray-400">
                    {line._count?.balancings ?? 0} balancings
                  </span>
                </div>

                <div className="mt-3 flex gap-2">
                  <Link
                    to={`/line-planning/balancing?lineId=${line.id}`}
                    className="flex-1 rounded-lg bg-brand-500 px-3 py-1.5 text-center text-xs font-medium text-white hover:bg-brand-600"
                  >
                    Balance
                  </Link>
                  <Link
                    to={`/line-planning/layouts`}
                    className="flex-1 rounded-lg bg-gray-200 px-3 py-1.5 text-center text-xs font-medium dark:bg-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    Layout
                  </Link>
                  <Link
                    to="/production/orders"
                    className="flex-1 rounded-lg bg-gray-200 px-3 py-1.5 text-center text-xs font-medium dark:bg-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    Orders
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
