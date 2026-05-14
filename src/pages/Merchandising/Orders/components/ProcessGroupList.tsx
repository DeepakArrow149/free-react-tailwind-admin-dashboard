/**
 * ProcessGroupList — left-rail list of process groups for the order.
 * Inline-edit the group name; add/delete from the toolbar.
 */

import type { ProcessGroup } from '../../../../api/merchandising';

interface Props {
  groups: ProcessGroup[];
  selectedId: number | null;
  readOnly?: boolean;
  onSelect: (id: number) => void;
  onAdd: () => void;
  onRename: (id: number, name: string) => void;
  onDelete: (id: number) => void;
}

export default function ProcessGroupList({ groups, selectedId, readOnly, onSelect, onAdd, onRename, onDelete }: Props) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/3">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">Process Groups</h4>
        {!readOnly && (
          <button type="button" onClick={onAdd}
            className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600">
            + Group
          </button>
        )}
      </div>
      <ul className="divide-y divide-gray-100 dark:divide-gray-800">
        {groups.length === 0 && (
          <li className="px-4 py-8 text-center text-xs text-gray-400">
            No groups yet. {!readOnly && 'Click "+ Group" to create one.'}
          </li>
        )}
        {groups.map((g) => {
          const isSel = g.id === selectedId;
          return (
            <li key={g.id}
                onClick={() => onSelect(g.id)}
                className={`flex items-center justify-between gap-2 px-4 py-3 cursor-pointer ${isSel ? 'bg-brand-50 dark:bg-brand-900/10' : 'hover:bg-gray-50 dark:hover:bg-white/2'}`}>
              <div className="min-w-0 flex-1">
                {readOnly ? (
                  <div className="truncate text-sm font-medium text-gray-800 dark:text-white/90">{g.groupName}</div>
                ) : (
                  <input
                    type="text"
                    value={g.groupName}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => onRename(g.id, e.target.value)}
                    className="w-full rounded bg-transparent px-1 py-0.5 text-sm font-medium text-gray-800 outline-none focus:bg-white focus:ring-2 focus:ring-brand-200 dark:text-white/90 dark:focus:bg-gray-900"
                    aria-label="Group name"
                  />
                )}
                <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  {g.selections.length} selection{g.selections.length === 1 ? '' : 's'} · {g.sequences.length} step{g.sequences.length === 1 ? '' : 's'} · req {Number(g.totalReqQty ?? 0).toFixed(1)}
                </div>
              </div>
              {!readOnly && (
                <button type="button"
                  onClick={(e) => { e.stopPropagation(); onDelete(g.id); }}
                  className="text-xs text-red-500 hover:text-red-600" aria-label="Delete group">×</button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
