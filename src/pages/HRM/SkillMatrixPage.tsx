import { useState } from 'react';
import { PageMeta } from '@/components/common';
import { useSkillMatrix, useCreateSkill } from '@/hooks/useLineBalancing';
import type { SkillMatrix } from '@/api/lineBalancing';
import { toastError } from '@/utils/toast';

const LEVEL_COLORS: Record<number, string> = {
  1: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  2: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  3: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  4: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  5: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
};

export default function SkillMatrixPage() {
  const { data: matrix, isLoading, isError } = useSkillMatrix();
  const createSkill = useCreateSkill();
  const [editingCell, setEditingCell] = useState<{ empId: number; mtId: number } | null>(null);
  const [editLevel, setEditLevel] = useState(1);

  if (isLoading) return <div className="p-8 text-center text-gray-400">Loading skill matrix…</div>;
  if (isError || !matrix) return <div className="p-8 text-center text-red-500">Failed to load skill matrix</div>;

  const { machineTypes, rows } = matrix as SkillMatrix;

  const handleCellClick = (empId: number, mtId: number, currentLevel: number) => {
    setEditingCell({ empId, mtId });
    setEditLevel(currentLevel || 1);
  };

  const handleSave = async () => {
    if (!editingCell) return;
    try {
      // Check if skill exists (level > 0 in matrix)
      const row = rows.find(r => r.employee.id === editingCell.empId);
      const mtCode = machineTypes.find(m => m.id === editingCell.mtId)?.code ?? '';
      const existing = row?.skills?.[mtCode];

      if (existing && existing > 0) {
        // Update — we'd need the skill ID; for simplicity, use create with upsert behavior
        await createSkill.mutateAsync({
          employeeId: editingCell.empId,
          machineTypeId: editingCell.mtId,
          skillLevel: editLevel,
        });
      } else {
        await createSkill.mutateAsync({
          employeeId: editingCell.empId,
          machineTypeId: editingCell.mtId,
          skillLevel: editLevel,
        });
      }
      setEditingCell(null);
    } catch (e) {
      toastError(e, 'Failed to save skill');
    }
  };

  return (
    <>
      <PageMeta title="Skill Matrix" description="Operator skills by machine type" />
      <div className="mx-auto max-w-full space-y-4 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Operator Skill Matrix</h1>
          <div className="flex items-center gap-2 text-xs">
            {[1, 2, 3, 4, 5].map(l => (
              <span key={l} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${LEVEL_COLORS[l]}`}>
                L{l}
              </span>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="sticky left-0 z-10 bg-gray-50 px-4 py-3 font-medium dark:bg-gray-800">Employee</th>
                {machineTypes.map(mt => (
                  <th key={mt.id} className="px-3 py-3 text-center font-medium text-xs whitespace-nowrap" title={mt.name}>
                    {mt.code}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700">
              {rows.length === 0 && (
                <tr><td colSpan={machineTypes.length + 1} className="px-4 py-8 text-center text-gray-400">No skills data. Add operator skills to populate the matrix.</td></tr>
              )}
              {rows.map(row => (
                <tr key={row.employee.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="sticky left-0 z-10 bg-white px-4 py-2 font-medium whitespace-nowrap dark:bg-gray-900">
                    <span className="text-xs text-gray-400 mr-1">{row.employee.empCode}</span>
                    {row.employee.firstName} {row.employee.lastName}
                  </td>
                  {machineTypes.map(mt => {
                    const level = row.skills?.[mt.code] ?? 0;
                    const isEditing = editingCell?.empId === row.employee.id && editingCell?.mtId === mt.id;

                    return (
                      <td key={mt.id} className="px-1 py-1 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1">
                            <select
                              value={editLevel}
                              onChange={(e) => setEditLevel(Number(e.target.value))}
                              className="w-12 rounded border px-1 py-0.5 text-xs dark:bg-gray-800 dark:border-gray-600"
                              aria-label={`Skill level for ${row.employee.empCode} on ${mt.code}`}
                            >
                              {[1, 2, 3, 4, 5].map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                            <button onClick={handleSave} className="text-xs text-green-600" aria-label="Save skill level">✓</button>
                            <button onClick={() => setEditingCell(null)} className="text-xs text-gray-400" aria-label="Cancel edit">✕</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleCellClick(row.employee.id, mt.id, level)}
                            className={`inline-flex h-7 w-7 items-center justify-center rounded text-xs font-bold ${level > 0 ? LEVEL_COLORS[level] : 'bg-gray-100 text-gray-300 dark:bg-gray-800 dark:text-gray-600'}`}
                            title={level > 0 ? `Level ${level} — click to edit` : 'Click to add skill'}
                            aria-label={`${row.employee.empCode} ${mt.code}: Level ${level}`}
                          >
                            {level > 0 ? level : '·'}
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
