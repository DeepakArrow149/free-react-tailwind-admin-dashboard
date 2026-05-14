/**
 * ConveyorBelt — A vertical animated conveyor belt rendered between
 * the left and right machine columns in the line layout.
 *
 * Visuals:
 *  • Wider belt track (64px) with roller-edge grooves
 *  • Animated chevron arrows scrolling in flow direction
 *  • Circled direction indicators spaced along the belt
 *  • U-Shape mode renders down-arrow top half, up-arrow bottom half
 *  • Flow direction badge at top, belt number at bottom
 *  • Dark-mode aware styling throughout
 */
import React, { useMemo, useId } from 'react';

interface Props {
  /** Total pixel height to span (matches the grid height) */
  height: number;
  /** Flow direction determines arrow direction */
  flowDirection: string;
  /** Conveyor label (e.g. "1") */
  label?: string;
  /** Whether the layout has a conveyor belt */
  hasConveyor?: boolean;
}

const FLOW_LABELS: Record<string, string> = {
  LEFT_TO_RIGHT: 'L → R',
  RIGHT_TO_LEFT: 'R → L',
  TOP_TO_BOTTOM: 'Top → Bot',
  BOTTOM_TO_TOP: 'Bot → Top',
  U_SHAPE: 'U-Shape',
};

/** Map flow → primary arrow char + whether the animation is reversed */
const FLOW_META: Record<string, { arrow: string; reverse: boolean }> = {
  LEFT_TO_RIGHT: { arrow: '▼', reverse: false },
  RIGHT_TO_LEFT: { arrow: '▲', reverse: true },
  TOP_TO_BOTTOM: { arrow: '▼', reverse: false },
  BOTTOM_TO_TOP: { arrow: '▲', reverse: true },
  U_SHAPE:       { arrow: '↕', reverse: false },
};

/* ---------- sub-components ---------- */

/** Animated chevron SVG track (fills a vertical area). */
const ChevronTrack: React.FC<{
  h: number;
  reverse: boolean;
  patId: string;
}> = React.memo(({ h, reverse, patId }) => (
  <svg width="28" height={h} className="absolute inset-x-0 mx-auto" style={{ top: 0 }}>
    <defs>
      <pattern id={patId} patternUnits="userSpaceOnUse" width="28" height="24">
        {/* chevron V pointing down; reversed via animation direction */}
        <polyline
          points="4,4 14,16 24,4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-gray-300 dark:text-gray-600"
        />
      </pattern>
    </defs>
    <rect
      width="28"
      height={h + 48}
      y={-24}
      fill={`url(#${patId})`}
      style={{
        animation: `conveyor-chevron-${reverse ? 'rev' : 'fwd'} 1.6s linear infinite`,
      }}
    />
  </svg>
));
ChevronTrack.displayName = 'ChevronTrack';

/** Small circled arrow indicator positioned absolutely. */
const ArrowBubble: React.FC<{ top: number; arrow: string }> = React.memo(({ top, arrow }) => (
  <div
    className="absolute left-1/2 z-10 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-[10px] font-bold text-gray-500 dark:text-gray-400 shadow"
    style={{ top }}
  >
    {arrow}
  </div>
));
ArrowBubble.displayName = 'ArrowBubble';

/* ---------- main component ---------- */

const ConveyorBelt: React.FC<Props> = ({
  height,
  flowDirection,
  label,
  hasConveyor = true,
}) => {
  const uid = useId();
  const h = height || 200;
  const meta = FLOW_META[flowDirection] ?? { arrow: '▼', reverse: false };
  const flowLabel = FLOW_LABELS[flowDirection] ?? flowDirection;
  const isUShape = flowDirection === 'U_SHAPE';

  /** Arrow positions distributed evenly along belt */
  const arrowPositions = useMemo(() => {
    const count = Math.max(Math.floor(h / 90), 2);
    const spacing = (h - 60) / (count - 1 || 1);
    return Array.from({ length: count }, (_, i) => 30 + i * spacing);
  }, [h]);

  if (!hasConveyor) {
    return (
      <div className="mx-1 flex flex-col items-center" style={{ minHeight: h }}>
        <div className="flex-1 w-px border-l-2 border-dashed border-gray-200 dark:border-gray-700" />
      </div>
    );
  }

  return (
    <div className="relative mx-1 flex flex-col items-center select-none" style={{ minHeight: h, width: 64 }}>
      {/* Belt track background with embossed roller edges */}
      <div className="absolute inset-x-0 top-0 bottom-0 rounded-[20px] bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 dark:from-gray-800/80 dark:via-gray-800/40 dark:to-gray-800/80 border border-gray-200 dark:border-gray-700 shadow-inner" />
      {/* Roller edge lines */}
      <div className="absolute left-[5px] top-2 bottom-2 w-px bg-gray-300/60 dark:bg-gray-600/40 rounded" />
      <div className="absolute right-[5px] top-2 bottom-2 w-px bg-gray-300/60 dark:bg-gray-600/40 rounded" />

      {/* Flow label badge */}
      <div className="relative z-20 -mt-1 mb-1 rounded-full bg-gradient-to-r from-gray-700 to-gray-600 dark:from-gray-500 dark:to-gray-600 px-2.5 py-0.5 text-[9px] font-bold text-white whitespace-nowrap shadow-sm">
        {flowLabel}
      </div>

      {/* Animated chevron overlay */}
      <div className="relative z-10 flex-1 w-full overflow-hidden" style={{ minHeight: 60 }}>
        {isUShape ? (
          <>
            {/* Top half: down chevrons */}
            <div className="absolute inset-x-0 top-0" style={{ height: h / 2 }}>
              <ChevronTrack h={h / 2} reverse={false} patId={`${uid}-dn`} />
            </div>
            {/* Bottom half: up chevrons */}
            <div className="absolute inset-x-0" style={{ top: h / 2, height: h / 2 }}>
              <ChevronTrack h={h / 2} reverse={true} patId={`${uid}-up`} />
            </div>
            {/* U-turn marker */}
            <div className="absolute left-1/2 z-20 -translate-x-1/2 flex items-center justify-center" style={{ top: h / 2 - 12 }}>
              <div className="h-6 w-10 rounded-b-full border-2 border-t-0 border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-[9px] font-bold text-amber-600 dark:text-amber-400">
                ⤻
              </div>
            </div>
          </>
        ) : (
          <ChevronTrack h={h} reverse={meta.reverse} patId={`${uid}-chv`} />
        )}

        {/* Arrow bubbles */}
        {isUShape ? (
          <>
            {arrowPositions.filter(t => t < h / 2 - 20).map((t, i) => (
              <ArrowBubble key={`d${i}`} top={t} arrow="▼" />
            ))}
            {arrowPositions.filter(t => t > h / 2 + 20).map((t, i) => (
              <ArrowBubble key={`u${i}`} top={t} arrow="▲" />
            ))}
          </>
        ) : (
          arrowPositions.map((t, i) => (
            <ArrowBubble key={i} top={t} arrow={meta.arrow} />
          ))
        )}
      </div>

      {/* Belt label at bottom */}
      {label && (
        <div className="relative z-20 mt-1 rounded-full bg-gray-200 dark:bg-gray-700 px-2 py-0.5 text-[8px] font-semibold text-gray-600 dark:text-gray-400 shadow-sm">
          Belt {label}
        </div>
      )}

      {/* Keyframes — injected once per instance */}
      <style>{`
        @keyframes conveyor-chevron-fwd {
          from { transform: translateY(0); }
          to   { transform: translateY(-24px); }
        }
        @keyframes conveyor-chevron-rev {
          from { transform: translateY(-24px); }
          to   { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default React.memo(ConveyorBelt);
