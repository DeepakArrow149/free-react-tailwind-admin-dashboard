/**
 * LayoutGrid — Vertical sewing-line layout with conveyor belt,
 * optional flow-line overlay, column/row headers, and zoom from store.
 *
 * Structure (for a 2-column default):
 *
 *        C1           C2
 *   ┌─────────┐  ║ Belt ║  ┌─────────┐
 * R1│  WS #1  │  ║  ↓   ║  │  WS #2  │
 *   └─────────┘  ║      ║  └─────────┘
 *   ┌─────────┐  ║      ║  ┌─────────┐
 * R2│  WS #3  │  ║      ║  │  WS #4  │
 *   └─────────┘  ║      ║  └─────────┘
 *
 * Drag-and-drop supported via react-dnd.
 * FlowLines overlay draws SVG arrows between consecutive positions
 * when enabled via layoutEditorStore.showFlowLines.
 * Grid headers show col (C1,C2…) and row (R1,R2…) labels when enabled.
 */
import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import DroppableCell from './DroppableCell';
import DraggableStation from './DraggableStation';
import type { DragPayload } from './DraggableStation';
import type { LayoutPosition } from '@/api/lineBalancing';
import ConveyorBelt from './ConveyorBelt';
import { useLayoutEditorStore } from '@/store/layoutEditorStore';

interface Props {
  positions: LayoutPosition[];
  rowCount: number;
  colCount: number;
  zoom?: number;
  flowDirection?: string;
  hasConveyor?: boolean;
  onReorder: (positionId: number, toRow: number, toCol: number) => void;
  onEdit: (pos: LayoutPosition) => void;
  onRemove: (posId: number) => void;
  onAddPosition?: (row: number, col: number) => void;
}

/* ---- Flow-line overlay (smooth Bézier curves with animated dots) ---- */

interface FlowLine {
  x1: number; y1: number; x2: number; y2: number;
}

/**
 * Compute an SVG cubic-Bézier `d` attribute between two points.
 * Uses gentle S-curves for vertical flow and smooth arcs for diagonal/
 * horizontal connections.  `idx` alternates curve direction so paths
 * don't stack on top of each other.
 */
function bezierPath(l: FlowLine, idx: number): string {
  const dx = l.x2 - l.x1;
  const dy = l.y2 - l.y1;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  const sign = idx % 2 === 0 ? 1 : -1;

  if (absDy > absDx * 1.5) {
    // Mostly vertical — gentle S-curve with tiny horizontal wobble
    const off = Math.min(absDy * 0.06, 16) * sign;
    return [
      `M${l.x1},${l.y1}`,
      `C${l.x1 + off},${l.y1 + dy * 0.35}`,
      ` ${l.x2 - off},${l.y1 + dy * 0.65}`,
      ` ${l.x2},${l.y2}`,
    ].join(' ');
  }

  if (absDx > absDy * 1.5) {
    // Mostly horizontal — slight vertical arc
    const off = Math.min(absDx * 0.08, 18) * sign;
    return [
      `M${l.x1},${l.y1}`,
      `C${l.x1 + dx * 0.35},${l.y1 + off}`,
      ` ${l.x1 + dx * 0.65},${l.y2 + off}`,
      ` ${l.x2},${l.y2}`,
    ].join(' ');
  }

  // Diagonal — smooth quadratic through a slightly offset midpoint
  const mx = (l.x1 + l.x2) / 2;
  const my = (l.y1 + l.y2) / 2;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const off = Math.min(dist * 0.08, 18) * sign;
  const nx = -dy / (dist || 1);
  const ny = dx / (dist || 1);
  return `M${l.x1},${l.y1} Q${mx + nx * off},${my + ny * off} ${l.x2},${l.y2}`;
}

const FlowLinesOverlay: React.FC<{
  lines: FlowLine[];
  width: number;
  height: number;
}> = React.memo(({ lines, width, height }) => {
  if (!lines.length) return null;
  return (
    <svg
      className="pointer-events-none absolute inset-0 z-30"
      width={width}
      height={height}
      style={{ overflow: 'visible' }}
    >
      <defs>
        {/* Gradient for the path stroke */}
        <linearGradient id="flow-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.5" />
        </linearGradient>
        {/* Soft glow filter */}
        <filter id="flow-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Arrowhead */}
        <marker id="flow-arrow" markerWidth="7" markerHeight="5" refX="6" refY="2.5" orient="auto">
          <path d="M0,0 L7,2.5 L0,5" fill="#818cf8" fillOpacity="0.8" />
        </marker>
      </defs>

      {lines.map((l, i) => {
        const d = bezierPath(l, i);
        const pathId = `flow-path-${i}`;
        return (
          <g key={i}>
            {/* Glow backdrop */}
            <path d={d} fill="none" stroke="#3b82f6" strokeOpacity="0.15" strokeWidth="6" filter="url(#flow-glow)" />
            {/* Main curve */}
            <path
              id={pathId}
              d={d}
              fill="none"
              stroke="url(#flow-grad)"
              strokeWidth="2"
              strokeLinecap="round"
              markerEnd="url(#flow-arrow)"
            />
            {/* Animated travelling dot */}
            <circle r="3" fill="#818cf8" fillOpacity="0.9">
              <animateMotion dur="2s" repeatCount="indefinite" path={d} />
            </circle>
          </g>
        );
      })}
    </svg>
  );
});
FlowLinesOverlay.displayName = 'FlowLinesOverlay';

/* ---- Grid headers ---- */

const ColHeaders: React.FC<{ count: number; cellW: number; offsetLeft: number; conveyorOffset: number; leftCols: number }> = React.memo(
  ({ count, cellW, offsetLeft, conveyorOffset, leftCols }) => (
    <div className="flex items-end gap-2 pb-1 pl-8" style={{ marginLeft: offsetLeft }}>
      {Array.from({ length: count }, (_, i) => (
        <React.Fragment key={i}>
          <div
            className="flex items-center justify-center text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider"
            style={{ width: cellW }}
          >
            C{i + 1}
          </div>
          {/* spacer for conveyor between left and right cols */}
          {i === leftCols - 1 && <div style={{ width: conveyorOffset }} />}
        </React.Fragment>
      ))}
    </div>
  )
);
ColHeaders.displayName = 'ColHeaders';

/* ---- Main Component ---- */

const LayoutGrid: React.FC<Props> = ({
  positions,
  rowCount,
  colCount,
  zoom = 100,
  flowDirection = 'LEFT_TO_RIGHT',
  hasConveyor = true,
  onReorder,
  onEdit,
  onRemove,
  onAddPosition,
}) => {
  const showFlowLines = useLayoutEditorStore((s) => s.showFlowLines);
  const showGridHeaders = useLayoutEditorStore((s) => s.showGridHeaders);
  const selectPosition = useLayoutEditorStore((s) => s.selectPosition);

  const gridRef = useRef<HTMLDivElement>(null);
  const [flowLines, setFlowLines] = useState<FlowLine[]>([]);
  const [gridSize, setGridSize] = useState({ w: 0, h: 0 });

  // Build a lookup: "row-col" → position
  const posMap = useMemo(() => {
    const m = new Map<string, LayoutPosition>();
    for (const p of positions) {
      m.set(`${p.gridRow}-${p.gridCol}`, p);
    }
    return m;
  }, [positions]);

  // Sorted positions (by sortOrder) for flow lines
  const sortedPositions = useMemo(
    () => [...positions].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [positions]
  );

  const rows = Math.max(rowCount, 1);
  const cols = Math.max(colCount, 1);
  const scale = zoom / 100;

  const leftCols = Math.floor(cols / 2) || 1;
  const rightCols = cols - leftCols;

  const handleDrop = useCallback(
    (payload: DragPayload, toRow: number, toCol: number) => {
      if (payload.fromRow === toRow && payload.fromCol === toCol) return;
      onReorder(payload.positionId, toRow, toCol);
    },
    [onReorder]
  );

  const handleStationClick = useCallback(
    (pos: LayoutPosition) => {
      selectPosition(pos.id);
    },
    [selectPosition]
  );

  // Approximate dimensions
  const cellW = 136 * scale;
  const cellH = 120 * scale;
  const gap = 8;
  const conveyorW = 64;
  const gridPixelHeight = rows * (cellH + gap);

  // Compute flow lines when positions or visibility changes
  useEffect(() => {
    if (!showFlowLines || sortedPositions.length < 2 || !gridRef.current) {
      setFlowLines([]);
      return;
    }

    // Compute center of each cell based on grid position
    const centerOf = (row: number, col: number) => {
      const isRight = col >= leftCols;
      const localCol = isRight ? col - leftCols : col;
      const xBase = isRight
        ? leftCols * (cellW + gap) + conveyorW + gap + localCol * (cellW + gap)
        : 32 + localCol * (cellW + gap); // 32 for row headers offset
      const y = (showGridHeaders ? 20 : 0) + row * (cellH + gap) + cellH / 2;
      const x = xBase + cellW / 2;
      return { x, y };
    };

    const lines: FlowLine[] = [];
    for (let i = 0; i < sortedPositions.length - 1; i++) {
      const a = sortedPositions[i];
      const b = sortedPositions[i + 1];
      const from = centerOf(a.gridRow, a.gridCol);
      const to = centerOf(b.gridRow, b.gridCol);
      lines.push({ x1: from.x, y1: from.y, x2: to.x, y2: to.y });
    }
    setFlowLines(lines);

    // Measure grid size
    if (gridRef.current) {
      setGridSize({
        w: gridRef.current.scrollWidth,
        h: gridRef.current.scrollHeight,
      });
    }
  }, [showFlowLines, sortedPositions, leftCols, cellW, cellH, gap, conveyorW, rows, showGridHeaders, scale]);

  /** Render one side's columns as a vertical CSS grid */
  const renderSide = useCallback(
    (startCol: number, numCols: number) => (
      <div
        className="inline-grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${numCols}, minmax(${cellW}px, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(${cellH - 4}px, auto))`,
        }}
      >
        {Array.from({ length: rows }, (_, ri) =>
          Array.from({ length: numCols }, (_, localCi) => {
            const ci = startCol + localCi;
            const key = `${ri}-${ci}`;
            const pos = posMap.get(key);
            return (
              <DroppableCell
                key={key}
                row={ri}
                col={ci}
                isEmpty={!pos}
                onDrop={handleDrop}
                onAddClick={onAddPosition ? () => onAddPosition(ri, ci) : undefined}
              >
                {pos && (
                  <div onClick={() => handleStationClick(pos)}>
                    <DraggableStation
                      position={pos}
                      onEdit={onEdit}
                      onRemove={onRemove}
                    />
                  </div>
                )}
              </DroppableCell>
            );
          })
        )}
      </div>
    ),
    [rows, cellW, cellH, posMap, handleDrop, onAddPosition, handleStationClick, onEdit, onRemove]
  );

  return (
    <DndProvider backend={HTML5Backend}>
      <div
        className="overflow-auto rounded-xl border border-gray-200 bg-gray-50/50 p-4 dark:border-gray-700 dark:bg-gray-800/30"
        style={{ maxHeight: '75vh' }}
      >
        {/* Optional column headers */}
        {showGridHeaders && (
          <ColHeaders
            count={cols}
            cellW={cellW}
            offsetLeft={0}
            conveyorOffset={conveyorW}
            leftCols={leftCols}
          />
        )}

        <div
          ref={gridRef}
          className="relative flex items-start justify-center gap-1 transition-transform"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
          }}
        >
          {/* Optional row headers */}
          {showGridHeaders && (
            <div className="flex flex-col gap-2 pr-1 pt-0">
              {Array.from({ length: rows }, (_, ri) => (
                <div
                  key={ri}
                  className="flex items-center justify-center text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase"
                  style={{ height: cellH, minWidth: 24 }}
                >
                  R{ri + 1}
                </div>
              ))}
            </div>
          )}

          {/* Left side columns */}
          {renderSide(0, leftCols)}

          {/* Central conveyor belt */}
          <ConveyorBelt
            height={gridPixelHeight}
            flowDirection={flowDirection}
            hasConveyor={hasConveyor}
            label="1"
          />

          {/* Right side columns */}
          {rightCols > 0 && renderSide(leftCols, rightCols)}

          {/* Flow lines overlay */}
          {showFlowLines && (
            <FlowLinesOverlay lines={flowLines} width={gridSize.w} height={gridSize.h} />
          )}
        </div>

        {positions.length === 0 && (
          <div className="flex h-40 items-center justify-center text-sm text-gray-400 dark:text-gray-500">
            No positions yet — use <strong className="mx-1">+ Add Station</strong> or <strong className="mx-1">Auto-Place</strong> to populate the line.
          </div>
        )}

        {/* Summary bar */}
        {positions.length > 0 && (
          <div className="mt-3 flex items-center justify-center gap-1 text-[10px] text-gray-400 dark:text-gray-500">
            <span>WORKSTATIONS: {positions.length}</span>
            <span className="mx-2">·</span>
            <span>{leftCols} col{leftCols > 1 ? 's' : ''} left</span>
            <span className="mx-1">|</span>
            <span>conveyor</span>
            <span className="mx-1">|</span>
            <span>{rightCols} col{rightCols > 1 ? 's' : ''} right</span>
          </div>
        )}
      </div>
    </DndProvider>
  );
};

export default React.memo(LayoutGrid);
