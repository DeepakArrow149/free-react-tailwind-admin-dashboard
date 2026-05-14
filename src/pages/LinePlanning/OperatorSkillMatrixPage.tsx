import { useState, useEffect } from 'react';
import { PageMeta } from '@/components/common';
import { useSkillMatrix, useSkills, useCreateSkill, useUpdateSkill, useDeleteSkill } from '@/hooks/useLineBalancing';
import { employeeApi } from '@/api/hrm';
import { machineTypeApi } from '@/api/lineBalancing';

interface ApiResponseEnvelope { data?: unknown; [key: string]: unknown }

const SKILL_LEVELS: Record<number, { label: string; bg: string }> = {
  0: { label: '—', bg: 'bg-gray-100 dark:bg-gray-800' },
  1: { label: 'L1', bg: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  2: { label: 'L2', bg: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  3: { label: 'L3', bg: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  4: { label: 'L4', bg: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  5: { label: 'L5', bg: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
};

export default function OperatorSkillMatrixPage() {
  const { data: matrix, isLoading } = useSkillMatrix();
  const { data: skills } = useSkills();
  const createSkill = useCreateSkill();
  const updateSkill = useUpdateSkill();
  const deleteSkill = useDeleteSkill();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ employeeId: '', machineTypeId: '', skillLevel: '3' });
  const [employees, setEmployees] = useState<Array<{ id: number; empCode: string; firstName: string; lastName: string }>>([]);
  const [machineTypes, setMachineTypes] = useState<Array<{ id: number; code: string; name: string }>>([]);
  // Inline edit state — which cell is being edited
  const [editingCell, setEditingCell] = useState<{ empId: number; mtId: number } | null>(null);
  const [editLevel, setEditLevel] = useState('0');

  useEffect(() => {
    if (showForm) {
      employeeApi.list().then((r: ApiResponseEnvelope) => {
        const raw: unknown = r?.data ?? r;
        const list = Array.isArray(raw) ? raw : (raw as ApiResponseEnvelope)?.data ?? [];
        setEmployees(list as Array<{ id: number; empCode: string; firstName: string; lastName: string }>);
      }).catch(() => {});
      machineTypeApi.list().then((r: ApiResponseEnvelope) => {
        const raw: unknown = r?.data ?? r;
        const list = Array.isArray(raw) ? raw : (raw as ApiResponseEnvelope)?.data ?? [];
        setMachineTypes(list as Array<{ id: number; code: string; name: string }>);
      }).catch(() => {});
    }
  }, [showForm]);

  const handleCreate = async () => {
    await createSkill.mutateAsync({
      employeeId: Number(form.employeeId),
      machineTypeId: Number(form.machineTypeId),
      skillLevel: Number(form.skillLevel),
    });
    setShowForm(false);
    setForm({ employeeId: '', machineTypeId: '', skillLevel: '3' });
  };

  /** Find the skill record ID for an employee + machineType pair */
  const findSkillId = (empId: number, mtId: number): number | null => {
    const list = Array.isArray(skills) ? skills : [];
    const found = list.find((s: { id?: number; employeeId: number; machineTypeId: number }) => s.employeeId === empId && s.machineTypeId === mtId);
    return found?.id ?? null;
  };

  const handleCellClick = (empId: number, mtId: number, currentLevel: number) => {
    setEditingCell({ empId, mtId });
    setEditLevel(String(currentLevel));
  };

  const handleCellSave = async () => {
    if (!editingCell) return;
    const newLevel = Number(editLevel);
    const skillId = findSkillId(editingCell.empId, editingCell.mtId);
    try {
      if (newLevel === 0 && skillId) {
        // Delete the skill
        await deleteSkill.mutateAsync(skillId);
      } else if (newLevel > 0 && skillId) {
        // Update existing skill
        await updateSkill.mutateAsync({ id: skillId, data: { skillLevel: newLevel } });
      } else if (newLevel > 0 && !skillId) {
        // Create new skill
        await createSkill.mutateAsync({
          employeeId: editingCell.empId,
          machineTypeId: editingCell.mtId,
          skillLevel: newLevel,
        });
      }
    } catch { /* errors handled by hook toast */ }
    setEditingCell(null);
  };

  return (
    <>
      <PageMeta title="Operator Skill Matrix" description="View and manage operator skill levels across machine types" />
      <div className="mx-auto max-w-7xl space-y-4 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Operator Skill Matrix</h1>
          <div className="flex items-center gap-3">
            {/* Legend */}
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((lv) => (
                <span key={lv} className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${SKILL_LEVELS[lv].bg}`}>
                  {SKILL_LEVELS[lv].label}
                </span>
              ))}
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
              aria-label="Add skill"
            >
              {showForm ? 'Cancel' : '+ Add Skill'}
            </button>
          </div>
        </div>

        {/* Add skill form */}
        {showForm && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900 space-y-3">
            <h3 className="text-sm font-semibold dark:text-white">Add Skill Record</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <select
                className="rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                value={form.employeeId}
                onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                aria-label="Select employee"
              >
                <option value="">Select Employee</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.empCode} — {emp.firstName} {emp.lastName}</option>
                ))}
              </select>
              <select
                className="rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                value={form.machineTypeId}
                onChange={(e) => setForm({ ...form, machineTypeId: e.target.value })}
                aria-label="Select machine type"
              >
                <option value="">Select Machine Type</option>
                {machineTypes.map(mt => (
                  <option key={mt.id} value={mt.id}>{mt.code} — {mt.name}</option>
                ))}
              </select>
              <select
                className="rounded-lg border px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                value={form.skillLevel}
                onChange={(e) => setForm({ ...form, skillLevel: e.target.value })}
                aria-label="Skill level"
              >
                {[1, 2, 3, 4, 5].map((lv) => (
                  <option key={lv} value={lv}>Level {lv}</option>
                ))}
              </select>
              <button
                onClick={handleCreate}
                disabled={createSkill.isPending || !form.employeeId || !form.machineTypeId}
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                aria-label="Save skill"
              >
                {createSkill.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        )}

        {/* Matrix table */}
        {isLoading ? (
          <div className="flex h-64 items-center justify-center text-gray-400">Loading skill matrix…</div>
        ) : !matrix || matrix.machineTypes.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-gray-400">
            No skills recorded yet. Add skills to build the matrix.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="sticky left-0 bg-gray-50 dark:bg-gray-800 px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">
                    Operator
                  </th>
                  {matrix.machineTypes.map((mt) => (
                    <th key={mt.id} className="px-3 py-3 text-center font-medium text-gray-700 dark:text-gray-300 min-w-[60px]">
                      <div className="text-xs truncate" title={mt.name}>{mt.code}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700">
                {matrix.rows.map((row) => (
                  <tr key={row.employee.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="sticky left-0 bg-white dark:bg-gray-900 px-4 py-2 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                      {row.employee.empCode} — {row.employee.firstName} {row.employee.lastName}
                    </td>
                    {matrix.machineTypes.map((mt) => {
                      const level = row.skills[String(mt.id)] ?? 0;
                      const info = SKILL_LEVELS[level] ?? SKILL_LEVELS[0];
                      const isEditing = editingCell?.empId === row.employee.id && editingCell?.mtId === mt.id;
                      return (
                        <td key={mt.id} className="px-3 py-2 text-center">
                          {isEditing ? (
                            <select
                              autoFocus
                              className="rounded border px-1 py-0.5 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                              value={editLevel}
                              onChange={(e) => setEditLevel(e.target.value)}
                              onBlur={handleCellSave}
                              onKeyDown={(e) => { if (e.key === 'Enter') handleCellSave(); if (e.key === 'Escape') setEditingCell(null); }}
                              aria-label={`Edit skill level for ${row.employee.empCode} on ${mt.code}`}
                            >
                              <option value="0">— Remove</option>
                              {[1, 2, 3, 4, 5].map(lv => <option key={lv} value={lv}>L{lv}</option>)}
                            </select>
                          ) : (
                            <button
                              onClick={() => handleCellClick(row.employee.id, mt.id, level)}
                              className={`inline-block rounded px-2 py-0.5 text-xs font-bold cursor-pointer hover:ring-2 hover:ring-brand-300 transition ${info.bg}`}
                              title="Click to edit skill level"
                              aria-label={`Skill ${info.label} — click to edit`}
                            >
                              {info.label}
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
        )}

        {/* Summary stats */}
        {matrix && matrix.rows.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
              <div className="text-xs text-gray-400">Total Operators</div>
              <div className="text-xl font-bold dark:text-white">{matrix.rows.length}</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
              <div className="text-xs text-gray-400">Machine Types</div>
              <div className="text-xl font-bold dark:text-white">{matrix.machineTypes.length}</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
              <div className="text-xs text-gray-400">Total Skills</div>
              <div className="text-xl font-bold dark:text-white">{(skills ?? []).length}</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
              <div className="text-xs text-gray-400">Coverage</div>
              <div className="text-xl font-bold dark:text-white">
                {matrix.rows.length > 0 && matrix.machineTypes.length > 0
                  ? `${((((skills ?? []).length) / (matrix.rows.length * matrix.machineTypes.length)) * 100).toFixed(0)}%`
                  : '0%'}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
