import React from 'react';

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
}

/** Machine color palette — matches backend MACHINE_COLORS */
export const MACHINE_COLORS: Record<string, string> = {
  SNLS: '#3b82f6', // blue — Single Needle Lockstitch
  DNLS: '#10b981', // emerald — Double Needle Lockstitch
  OL:   '#ef4444', // red — Overlock
  FL:   '#f59e0b', // amber — Flatlock / Coverstitch
  BT:   '#8b5cf6', // violet — Bartack
  BH:   '#06b6d4', // cyan — Buttonhole
  BA:   '#8b5cf6', // violet — Bartack (alias)
  BS:   '#14b8a6', // teal — Button Stitch
  KS:   '#ec4899', // pink — Kansai Special
  IRON: '#f97316', // orange — Iron / Pressing
  PRESS:'#f97316', // orange — Press
  MANUAL:'#6b7280',// gray — Hand / Manual
  FOA:  '#6366f1', // indigo — Feed Off Arm
};

/*
 * ══════════════════════════════════════════════════════════
 *  Detailed industrial sewing machine SVG illustrations
 *  Viewbox: 0 0 64 56  —  designed for display at 48–56px
 *  Each icon shows: table/bed, arm, handwheel, needle area,
 *  thread spool, foot pedal — color-coded per machine type.
 * ══════════════════════════════════════════════════════════
 */

/** Single Needle Lockstitch — the classic industrial sewing machine */
const IconSNLS: React.FC<IconProps> = ({ size = 48, color = MACHINE_COLORS.SNLS, className }) => (
  <svg width={size} height={size} viewBox="0 0 64 56" fill="none" className={className}>
    {/* Table / Bed */}
    <rect x="4" y="30" width="56" height="6" rx="2" fill={color} opacity={0.18} />
    <rect x="4" y="30" width="56" height="6" rx="2" stroke={color} strokeWidth="1.5" opacity={0.5} />
    {/* Legs */}
    <rect x="10" y="36" width="4" height="12" rx="1" fill={color} opacity={0.25} />
    <rect x="50" y="36" width="4" height="12" rx="1" fill={color} opacity={0.25} />
    <rect x="8" y="47" width="8" height="2.5" rx="1" fill={color} opacity={0.3} />
    <rect x="48" y="47" width="8" height="2.5" rx="1" fill={color} opacity={0.3} />
    {/* Machine arm */}
    <path d="M18 30V14a4 4 0 014-4h6l10 8v12" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill={color} fillOpacity={0.08} />
    {/* Handwheel */}
    <circle cx="42" cy="16" r="5" stroke={color} strokeWidth="2" fill={color} fillOpacity={0.12} />
    <circle cx="42" cy="16" r="1.5" fill={color} opacity={0.6} />
    {/* Thread spool */}
    <rect x="22" y="6" width="3" height="5" rx="1" fill={color} opacity={0.35} />
    <line x1="23.5" y1="6" x2="23.5" y2="3" stroke={color} strokeWidth="1" opacity={0.5} />
    {/* Needle bar + needle */}
    <line x1="34" y1="18" x2="34" y2="30" stroke={color} strokeWidth="2" />
    <line x1="34" y1="30" x2="34" y2="34" stroke={color} strokeWidth="1.2" strokeDasharray="1.5 1" />
    {/* Presser foot */}
    <rect x="31" y="28" width="6" height="2.5" rx="0.5" fill={color} opacity={0.5} />
    {/* Throat plate */}
    <rect x="30" y="30" width="8" height="3" rx="1" fill={color} fillOpacity={0.15} stroke={color} strokeWidth="0.8" strokeOpacity={0.3} />
    {/* Foot pedal */}
    <path d="M26 50l6-3 6 3" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill={color} fillOpacity={0.1} />
  </svg>
);

/** Double Needle Lockstitch */
const IconDNLS: React.FC<IconProps> = ({ size = 48, color = MACHINE_COLORS.DNLS, className }) => (
  <svg width={size} height={size} viewBox="0 0 64 56" fill="none" className={className}>
    <rect x="4" y="30" width="56" height="6" rx="2" fill={color} opacity={0.18} />
    <rect x="4" y="30" width="56" height="6" rx="2" stroke={color} strokeWidth="1.5" opacity={0.5} />
    <rect x="10" y="36" width="4" height="12" rx="1" fill={color} opacity={0.25} />
    <rect x="50" y="36" width="4" height="12" rx="1" fill={color} opacity={0.25} />
    <rect x="8" y="47" width="8" height="2.5" rx="1" fill={color} opacity={0.3} />
    <rect x="48" y="47" width="8" height="2.5" rx="1" fill={color} opacity={0.3} />
    <path d="M18 30V14a4 4 0 014-4h6l10 8v12" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill={color} fillOpacity={0.08} />
    <circle cx="42" cy="16" r="5" stroke={color} strokeWidth="2" fill={color} fillOpacity={0.12} />
    <circle cx="42" cy="16" r="1.5" fill={color} opacity={0.6} />
    {/* Two thread spools */}
    <rect x="20" y="6" width="3" height="5" rx="1" fill={color} opacity={0.35} />
    <rect x="25" y="6" width="3" height="5" rx="1" fill={color} opacity={0.35} />
    {/* Two needles */}
    <line x1="32" y1="18" x2="32" y2="30" stroke={color} strokeWidth="1.8" />
    <line x1="36" y1="18" x2="36" y2="30" stroke={color} strokeWidth="1.8" />
    <line x1="32" y1="30" x2="32" y2="34" stroke={color} strokeWidth="1" strokeDasharray="1.5 1" />
    <line x1="36" y1="30" x2="36" y2="34" stroke={color} strokeWidth="1" strokeDasharray="1.5 1" />
    <rect x="29" y="28" width="10" height="2.5" rx="0.5" fill={color} opacity={0.5} />
    <rect x="28" y="30" width="12" height="3" rx="1" fill={color} fillOpacity={0.15} stroke={color} strokeWidth="0.8" strokeOpacity={0.3} />
    <path d="M26 50l6-3 6 3" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill={color} fillOpacity={0.1} />
  </svg>
);

/** Overlock (3/4/5-thread) — wider arm, knife area */
const IconOL: React.FC<IconProps> = ({ size = 48, color = MACHINE_COLORS.OL, className }) => (
  <svg width={size} height={size} viewBox="0 0 64 56" fill="none" className={className}>
    <rect x="4" y="30" width="56" height="6" rx="2" fill={color} opacity={0.18} />
    <rect x="4" y="30" width="56" height="6" rx="2" stroke={color} strokeWidth="1.5" opacity={0.5} />
    <rect x="10" y="36" width="4" height="12" rx="1" fill={color} opacity={0.25} />
    <rect x="50" y="36" width="4" height="12" rx="1" fill={color} opacity={0.25} />
    <rect x="8" y="47" width="8" height="2.5" rx="1" fill={color} opacity={0.3} />
    <rect x="48" y="47" width="8" height="2.5" rx="1" fill={color} opacity={0.3} />
    {/* Wider arm body for overlock */}
    <path d="M16 30V12a4 4 0 014-4h10l12 10v12" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill={color} fillOpacity={0.1} />
    <circle cx="44" cy="16" r="4.5" stroke={color} strokeWidth="2" fill={color} fillOpacity={0.12} />
    <circle cx="44" cy="16" r="1.5" fill={color} opacity={0.6} />
    {/* Multiple thread cones */}
    <rect x="20" y="3" width="2.5" height="6" rx="0.8" fill={color} opacity={0.3} />
    <rect x="24" y="3" width="2.5" height="6" rx="0.8" fill={color} opacity={0.3} />
    <rect x="28" y="3" width="2.5" height="6" rx="0.8" fill={color} opacity={0.3} />
    {/* Knife area */}
    <path d="M37 22l2-4" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    <path d="M39 18l1.5-1" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
    {/* Needle + looper */}
    <line x1="35" y1="20" x2="35" y2="30" stroke={color} strokeWidth="2" />
    <path d="M33 28c2 2 4 2 6 0" stroke={color} strokeWidth="1.2" opacity={0.5} />
    <rect x="32" y="28" width="6" height="2.5" rx="0.5" fill={color} opacity={0.5} />
    <path d="M26 50l6-3 6 3" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill={color} fillOpacity={0.1} />
  </svg>
);

/** Flatlock / Coverstitch */
const IconFL: React.FC<IconProps> = ({ size = 48, color = MACHINE_COLORS.FL, className }) => (
  <svg width={size} height={size} viewBox="0 0 64 56" fill="none" className={className}>
    <rect x="4" y="30" width="56" height="6" rx="2" fill={color} opacity={0.18} />
    <rect x="4" y="30" width="56" height="6" rx="2" stroke={color} strokeWidth="1.5" opacity={0.5} />
    <rect x="10" y="36" width="4" height="12" rx="1" fill={color} opacity={0.25} />
    <rect x="50" y="36" width="4" height="12" rx="1" fill={color} opacity={0.25} />
    <rect x="8" y="47" width="8" height="2.5" rx="1" fill={color} opacity={0.3} />
    <rect x="48" y="47" width="8" height="2.5" rx="1" fill={color} opacity={0.3} />
    <path d="M18 30V14a4 4 0 014-4h8v20" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill={color} fillOpacity={0.08} />
    <circle cx="42" cy="16" r="5" stroke={color} strokeWidth="2" fill={color} fillOpacity={0.12} />
    <circle cx="42" cy="16" r="1.5" fill={color} opacity={0.6} />
    {/* Cover plate indicator — dashed stitch lines */}
    <line x1="28" y1="22" x2="40" y2="22" stroke={color} strokeWidth="1.5" strokeDasharray="3 1.5" />
    <line x1="28" y1="25" x2="40" y2="25" stroke={color} strokeWidth="1.5" strokeDasharray="3 1.5" />
    <line x1="28" y1="28" x2="40" y2="28" stroke={color} strokeWidth="1.5" strokeDasharray="3 1.5" />
    <rect x="30" y="30" width="8" height="3" rx="1" fill={color} fillOpacity={0.15} stroke={color} strokeWidth="0.8" strokeOpacity={0.3} />
    <path d="M26 50l6-3 6 3" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill={color} fillOpacity={0.1} />
  </svg>
);

/** Bartack */
const IconBT: React.FC<IconProps> = ({ size = 48, color = MACHINE_COLORS.BT, className }) => (
  <svg width={size} height={size} viewBox="0 0 64 56" fill="none" className={className}>
    <rect x="4" y="30" width="56" height="6" rx="2" fill={color} opacity={0.18} />
    <rect x="4" y="30" width="56" height="6" rx="2" stroke={color} strokeWidth="1.5" opacity={0.5} />
    <rect x="10" y="36" width="4" height="12" rx="1" fill={color} opacity={0.25} />
    <rect x="50" y="36" width="4" height="12" rx="1" fill={color} opacity={0.25} />
    <rect x="8" y="47" width="8" height="2.5" rx="1" fill={color} opacity={0.3} />
    <rect x="48" y="47" width="8" height="2.5" rx="1" fill={color} opacity={0.3} />
    {/* Compact head unit */}
    <path d="M22 30V16a3 3 0 013-3h8a3 3 0 013 3v14" stroke={color} strokeWidth="2.5" strokeLinecap="round" fill={color} fillOpacity={0.08} />
    <circle cx="42" cy="18" r="4" stroke={color} strokeWidth="1.8" fill={color} fillOpacity={0.12} />
    <circle cx="42" cy="18" r="1.2" fill={color} opacity={0.5} />
    {/* Bartack stitch pattern */}
    <line x1="28" y1="20" x2="34" y2="20" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <line x1="28" y1="23" x2="34" y2="23" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <line x1="28" y1="26" x2="34" y2="26" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <rect x="30" y="30" width="6" height="3" rx="1" fill={color} opacity={0.15} />
    <path d="M26 50l6-3 6 3" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill={color} fillOpacity={0.1} />
  </svg>
);

/** Buttonhole */
const IconBH: React.FC<IconProps> = ({ size = 48, color = MACHINE_COLORS.BH, className }) => (
  <svg width={size} height={size} viewBox="0 0 64 56" fill="none" className={className}>
    <rect x="4" y="30" width="56" height="6" rx="2" fill={color} opacity={0.18} />
    <rect x="4" y="30" width="56" height="6" rx="2" stroke={color} strokeWidth="1.5" opacity={0.5} />
    <rect x="10" y="36" width="4" height="12" rx="1" fill={color} opacity={0.25} />
    <rect x="50" y="36" width="4" height="12" rx="1" fill={color} opacity={0.25} />
    <rect x="8" y="47" width="8" height="2.5" rx="1" fill={color} opacity={0.3} />
    <rect x="48" y="47" width="8" height="2.5" rx="1" fill={color} opacity={0.3} />
    <path d="M20 30V14a4 4 0 014-4h8a4 4 0 014 4v16" stroke={color} strokeWidth="2.5" strokeLinecap="round" fill={color} fillOpacity={0.08} />
    <circle cx="42" cy="16" r="5" stroke={color} strokeWidth="2" fill={color} fillOpacity={0.12} />
    <circle cx="42" cy="16" r="1.5" fill={color} opacity={0.6} />
    {/* Buttonhole clamp */}
    <rect x="27" y="20" width="10" height="8" rx="1.5" stroke={color} strokeWidth="1.5" fill={color} fillOpacity={0.06} />
    {/* Buttonhole shape */}
    <ellipse cx="32" cy="24" rx="2" ry="3" stroke={color} strokeWidth="1.5" />
    <line x1="32" y1="21" x2="32" y2="27" stroke={color} strokeWidth="0.8" />
    <path d="M26 50l6-3 6 3" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill={color} fillOpacity={0.1} />
  </svg>
);

/** Button Stitch */
const IconBS: React.FC<IconProps> = ({ size = 48, color = MACHINE_COLORS.BS, className }) => (
  <svg width={size} height={size} viewBox="0 0 64 56" fill="none" className={className}>
    <rect x="4" y="30" width="56" height="6" rx="2" fill={color} opacity={0.18} />
    <rect x="4" y="30" width="56" height="6" rx="2" stroke={color} strokeWidth="1.5" opacity={0.5} />
    <rect x="10" y="36" width="4" height="12" rx="1" fill={color} opacity={0.25} />
    <rect x="50" y="36" width="4" height="12" rx="1" fill={color} opacity={0.25} />
    <rect x="8" y="47" width="8" height="2.5" rx="1" fill={color} opacity={0.3} />
    <rect x="48" y="47" width="8" height="2.5" rx="1" fill={color} opacity={0.3} />
    <path d="M20 30V14a4 4 0 014-4h8a4 4 0 014 4v16" stroke={color} strokeWidth="2.5" strokeLinecap="round" fill={color} fillOpacity={0.08} />
    <circle cx="42" cy="16" r="5" stroke={color} strokeWidth="2" fill={color} fillOpacity={0.12} />
    <circle cx="42" cy="16" r="1.5" fill={color} opacity={0.6} />
    {/* Button */}
    <circle cx="32" cy="23" r="4" stroke={color} strokeWidth="1.8" fill={color} fillOpacity={0.1} />
    <circle cx="30.5" cy="21.5" r="0.8" fill={color} opacity={0.6} />
    <circle cx="33.5" cy="21.5" r="0.8" fill={color} opacity={0.6} />
    <circle cx="30.5" cy="24.5" r="0.8" fill={color} opacity={0.6} />
    <circle cx="33.5" cy="24.5" r="0.8" fill={color} opacity={0.6} />
    <path d="M26 50l6-3 6 3" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill={color} fillOpacity={0.1} />
  </svg>
);

/** Kansai Special — multi-needle */
const IconKS: React.FC<IconProps> = ({ size = 48, color = MACHINE_COLORS.KS, className }) => (
  <svg width={size} height={size} viewBox="0 0 64 56" fill="none" className={className}>
    <rect x="4" y="30" width="56" height="6" rx="2" fill={color} opacity={0.18} />
    <rect x="4" y="30" width="56" height="6" rx="2" stroke={color} strokeWidth="1.5" opacity={0.5} />
    <rect x="10" y="36" width="4" height="12" rx="1" fill={color} opacity={0.25} />
    <rect x="50" y="36" width="4" height="12" rx="1" fill={color} opacity={0.25} />
    <rect x="8" y="47" width="8" height="2.5" rx="1" fill={color} opacity={0.3} />
    <rect x="48" y="47" width="8" height="2.5" rx="1" fill={color} opacity={0.3} />
    {/* Wide arm for multi-needle */}
    <path d="M14 30V12a4 4 0 014-4h14a4 4 0 014 4v18" stroke={color} strokeWidth="2.5" strokeLinecap="round" fill={color} fillOpacity={0.08} />
    <circle cx="44" cy="16" r="4.5" stroke={color} strokeWidth="2" fill={color} fillOpacity={0.12} />
    <circle cx="44" cy="16" r="1.5" fill={color} opacity={0.6} />
    {/* Multiple needle bars */}
    <line x1="24" y1="18" x2="24" y2="30" stroke={color} strokeWidth="1.2" />
    <line x1="28" y1="18" x2="28" y2="30" stroke={color} strokeWidth="1.2" />
    <line x1="32" y1="18" x2="32" y2="30" stroke={color} strokeWidth="1.2" />
    <line x1="36" y1="18" x2="36" y2="30" stroke={color} strokeWidth="1.2" />
    <rect x="22" y="28" width="16" height="2.5" rx="0.5" fill={color} opacity={0.5} />
    <path d="M26 50l6-3 6 3" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill={color} fillOpacity={0.1} />
  </svg>
);

/** Iron / Pressing — steam iron on pressing table */
const IconIRON: React.FC<IconProps> = ({ size = 48, color = MACHINE_COLORS.IRON, className }) => (
  <svg width={size} height={size} viewBox="0 0 64 56" fill="none" className={className}>
    {/* Pressing table */}
    <rect x="4" y="32" width="56" height="5" rx="2" fill={color} opacity={0.18} />
    <rect x="4" y="32" width="56" height="5" rx="2" stroke={color} strokeWidth="1.5" opacity={0.5} />
    <rect x="10" y="37" width="4" height="10" rx="1" fill={color} opacity={0.25} />
    <rect x="50" y="37" width="4" height="10" rx="1" fill={color} opacity={0.25} />
    <rect x="8" y="46" width="8" height="2.5" rx="1" fill={color} opacity={0.3} />
    <rect x="48" y="46" width="8" height="2.5" rx="1" fill={color} opacity={0.3} />
    {/* Iron body */}
    <path d="M18 32l-4-6h36l-4 6" fill={color} fillOpacity={0.15} stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M22 26V16l10-6 10 6v10" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill={color} fillOpacity={0.08} />
    {/* Steam holes */}
    <circle cx="28" cy="29" r="1" fill={color} opacity={0.4} />
    <circle cx="32" cy="29" r="1" fill={color} opacity={0.4} />
    <circle cx="36" cy="29" r="1" fill={color} opacity={0.4} />
    {/* Steam lines */}
    <path d="M28 14c0-2 2-3 2-5M32 12c0-2 2-3 2-5M36 14c0-2 2-3 2-5" stroke={color} strokeWidth="1" strokeLinecap="round" opacity={0.4} />
    {/* Handle */}
    <path d="M27 18h10" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    {/* Foot pedal */}
    <path d="M26 51l6-3 6 3" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill={color} fillOpacity={0.1} />
  </svg>
);

/** Feed Off Arm — cylinder bed machine */
const IconFOA: React.FC<IconProps> = ({ size = 48, color = MACHINE_COLORS.FOA, className }) => (
  <svg width={size} height={size} viewBox="0 0 64 56" fill="none" className={className}>
    <rect x="4" y="30" width="56" height="6" rx="2" fill={color} opacity={0.18} />
    <rect x="4" y="30" width="56" height="6" rx="2" stroke={color} strokeWidth="1.5" opacity={0.5} />
    <rect x="10" y="36" width="4" height="12" rx="1" fill={color} opacity={0.25} />
    <rect x="50" y="36" width="4" height="12" rx="1" fill={color} opacity={0.25} />
    <rect x="8" y="47" width="8" height="2.5" rx="1" fill={color} opacity={0.3} />
    <rect x="48" y="47" width="8" height="2.5" rx="1" fill={color} opacity={0.3} />
    {/* Arm */}
    <path d="M16 30V14a4 4 0 014-4h6" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    {/* Head unit on arm */}
    <rect x="26" y="8" width="12" height="10" rx="2" stroke={color} strokeWidth="2" fill={color} fillOpacity={0.08} />
    <circle cx="44" cy="16" r="5" stroke={color} strokeWidth="2" fill={color} fillOpacity={0.12} />
    <circle cx="44" cy="16" r="1.5" fill={color} opacity={0.6} />
    {/* Cylinder bed */}
    <ellipse cx="32" cy="30" rx="8" ry="3" fill={color} fillOpacity={0.2} stroke={color} strokeWidth="1.5" />
    {/* Needle */}
    <line x1="32" y1="18" x2="32" y2="27" stroke={color} strokeWidth="2" />
    <path d="M26 50l6-3 6 3" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill={color} fillOpacity={0.1} />
  </svg>
);

/** Manual / Hand work — scissors + hand icon */
const IconMANUAL: React.FC<IconProps> = ({ size = 48, color = MACHINE_COLORS.MANUAL, className }) => (
  <svg width={size} height={size} viewBox="0 0 64 56" fill="none" className={className}>
    {/* Work table */}
    <rect x="4" y="34" width="56" height="5" rx="2" fill={color} opacity={0.18} />
    <rect x="4" y="34" width="56" height="5" rx="2" stroke={color} strokeWidth="1.5" opacity={0.5} />
    <rect x="10" y="39" width="4" height="10" rx="1" fill={color} opacity={0.25} />
    <rect x="50" y="39" width="4" height="10" rx="1" fill={color} opacity={0.25} />
    {/* Hand */}
    <path d="M26 20c0-1.5 1-3 2.5-3s2.5 1.5 2.5 3v8" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    <path d="M31 18c0-1.5 1-3 2.5-3s2.5 1.5 2.5 3v10" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    <path d="M36 20c0-1.5 1-3 2.5-3s2.5 1.5 2.5 3v8" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    <path d="M26 28c-2 0-4 2-4 4v2h22v-2c0-2-2-4-4-4" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill={color} fillOpacity={0.06} />
    {/* Scissors on table */}
    <path d="M14 30l6-4M14 30l6 4" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="13" cy="30" r="2" stroke={color} strokeWidth="1.2" fill={color} fillOpacity={0.15} />
    {/* Thread */}
    <path d="M46 26c3-1 5 0 6 2s0 5-2 5" stroke={color} strokeWidth="1" opacity={0.4} strokeLinecap="round" />
  </svg>
);

/** Registry of all machine icon components */
const ICON_MAP: Record<string, React.FC<IconProps>> = {
  SNLS: IconSNLS,
  DNLS: IconDNLS,
  OL: IconOL,
  FL: IconFL,
  BT: IconBT,
  BA: IconBT,
  BH: IconBH,
  BS: IconBS,
  KS: IconKS,
  IRON: IconIRON,
  PRESS: IconIRON,
  FOA: IconFOA,
  MANUAL: IconMANUAL,
};

/**
 * Get the icon component for a machine type code.
 * Falls back to SNLS icon if code not found.
 */
export function getMachineIcon(code?: string | null): React.FC<IconProps> {
  if (!code) return IconSNLS;
  const upper = code.toUpperCase();
  // Direct match
  if (ICON_MAP[upper]) return ICON_MAP[upper];
  // Partial match (e.g. "SNLS-AUTO" → SNLS)
  for (const key of Object.keys(ICON_MAP)) {
    if (upper.includes(key)) return ICON_MAP[key];
  }
  return IconSNLS;
}

/**
 * Get the color for a machine type code.
 */
export function getMachineColor(code?: string | null): string {
  if (!code) return MACHINE_COLORS.SNLS;
  const upper = code.toUpperCase();
  if (MACHINE_COLORS[upper]) return MACHINE_COLORS[upper];
  for (const key of Object.keys(MACHINE_COLORS)) {
    if (upper.includes(key)) return MACHINE_COLORS[key];
  }
  return MACHINE_COLORS.SNLS;
}

export {
  IconSNLS, IconDNLS, IconOL, IconFL, IconBT, IconBH, IconBS, IconKS, IconIRON, IconFOA, IconMANUAL,
};
