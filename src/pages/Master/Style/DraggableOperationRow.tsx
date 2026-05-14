import { useRef } from "react";
import { useDrag, useDrop } from "react-dnd";
import type { LocalOperation } from "./OperationBreakdownTab";
import type { OperationMaster } from "../../../api/production";
import type { MachineType } from "../../../api/lineBalancing";

const ITEM_TYPE = "OPERATION_ROW";

interface DragItem {
  index: number;
}

interface Props {
  index: number;
  operation: LocalOperation;
  operationsList: OperationMaster[];
  machineTypes: MachineType[];
  departments: readonly string[];
  onUpdate: (index: number, field: keyof LocalOperation, value: unknown) => void;
  onDelete: (index: number) => void;
  moveRow: (fromIndex: number, toIndex: number) => void;
  inputClass: string;
  selectClass: string;
}

export default function DraggableOperationRow({
  index,
  operation,
  operationsList,
  machineTypes,
  departments,
  onUpdate,
  onDelete,
  moveRow,
  inputClass,
  selectClass,
}: Props) {
  const ref = useRef<HTMLTableRowElement>(null);

  const [{ isDragging }, drag, preview] = useDrag({
    type: ITEM_TYPE,
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver }, drop] = useDrop<DragItem, void, { isOver: boolean }>({
    accept: ITEM_TYPE,
    hover(item, monitor) {
      if (!ref.current) return;
      const dragIndex = item.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex) return;

      const hoverBoundingRect = ref.current.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      // Only move when cursor has crossed half of the items height
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;

      moveRow(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  preview(drop(ref));

  const hasErrors = !operation.operationId || operation.sam <= 0;

  return (
    <tr
      ref={ref}
      className={`border-b border-gray-100 transition dark:border-gray-800 ${
        isDragging ? "opacity-40" : ""
      } ${isOver ? "bg-brand-50 dark:bg-brand-900/10" : ""} ${
        hasErrors ? "bg-red-50/50 dark:bg-red-900/5" : ""
      }`}
    >
      {/* Drag Handle */}
      <td className="px-2 py-1.5 text-center">
        <span
          ref={(node) => { drag(node); }}
          className="inline-flex cursor-grab items-center text-gray-400 hover:text-gray-600 active:cursor-grabbing dark:text-gray-500 dark:hover:text-gray-300"
          title="Drag to reorder"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 2a2 2 0 10.001 4.001A2 2 0 007 2zm0 6a2 2 0 10.001 4.001A2 2 0 007 8zm0 6a2 2 0 10.001 4.001A2 2 0 007 14zm6-8a2 2 0 10-.001-4.001A2 2 0 0013 6zm0 2a2 2 0 10.001 4.001A2 2 0 0013 8zm0 6a2 2 0 10.001 4.001A2 2 0 0013 14z" />
          </svg>
        </span>
      </td>

      {/* Seq # */}
      <td className="px-2 py-1.5 text-center">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {operation.sequence}
        </span>
      </td>

      {/* Operation */}
      <td className="px-2 py-1.5">
        <select
          className={`${selectClass} ${!operation.operationId ? "border-red-300 dark:border-red-700" : ""}`}
          value={operation.operationId || ""}
          onChange={(e) => onUpdate(index, "operationId", Number(e.target.value))}
          title="Select operation"
        >
          <option value="">Select Operation</option>
          {operationsList
            .filter((o) => o.isActive)
            .map((o) => (
              <option key={o.id} value={o.id}>
                {o.code} - {o.name}
              </option>
            ))}
        </select>
      </td>

      {/* Department */}
      <td className="px-2 py-1.5">
        <select
          className={selectClass}
          value={operation.department}
          onChange={(e) => onUpdate(index, "department", e.target.value)}
          title="Select department"
        >
          <option value="">—</option>
          {departments.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </td>

      {/* Machine Type */}
      <td className="px-2 py-1.5">
        <select
          className={selectClass}
          value={operation.machineTypeId || ""}
          onChange={(e) => onUpdate(index, "machineTypeId", e.target.value ? Number(e.target.value) : null)}
          title="Select machine type"
        >
          <option value="">None</option>
          {machineTypes
            .filter((m) => m.isActive)
            .map((m) => (
              <option key={m.id} value={m.id}>
                {m.code} - {m.name}
              </option>
            ))}
        </select>
      </td>

      {/* SAM */}
      <td className="px-2 py-1.5">
        <input
          type="number"
          step="0.001"
          min="0"
          className={`${inputClass} text-center ${operation.sam <= 0 ? "border-red-300 dark:border-red-700" : ""}`}
          value={operation.sam || ""}
          onChange={(e) => onUpdate(index, "sam", parseFloat(e.target.value) || 0)}
          placeholder="0.000"
        />
      </td>

      {/* Target/Hr (auto-calculated, read-only) */}
      <td className="px-2 py-1.5 text-center">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {operation.targetPerHour || "—"}
        </span>
      </td>

      {/* No of Machines */}
      <td className="px-2 py-1.5">
        <input
          type="number"
          min="1"
          className={`${inputClass} text-center`}
          value={operation.noOfMachines}
          onChange={(e) => onUpdate(index, "noOfMachines", parseInt(e.target.value) || 1)}
          title="Number of machines"
        />
      </td>

      {/* No of Operators */}
      <td className="px-2 py-1.5">
        <input
          type="number"
          min="1"
          className={`${inputClass} text-center`}
          value={operation.noOfOperators}
          onChange={(e) => onUpdate(index, "noOfOperators", parseInt(e.target.value) || 1)}
          title="Number of operators"
        />
      </td>

      {/* Remarks */}
      <td className="px-2 py-1.5">
        <input
          type="text"
          className={inputClass}
          value={operation.remarks}
          onChange={(e) => onUpdate(index, "remarks", e.target.value)}
          placeholder="Notes..."
          maxLength={200}
        />
      </td>

      {/* Delete */}
      <td className="px-2 py-1.5 text-center">
        <button
          type="button"
          onClick={() => onDelete(index)}
          className="rounded p-1 text-gray-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
          title="Remove operation"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </td>
    </tr>
  );
}
