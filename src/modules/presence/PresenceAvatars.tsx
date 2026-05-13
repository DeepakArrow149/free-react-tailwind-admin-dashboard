/**
 * PresenceAvatars — overlapping avatar stack showing other people editing
 * the same resource. Renders nothing when nobody else is around.
 *
 * Hover any avatar to see who it is. Beyond 3 visible avatars we collapse
 * the remainder into a "+N" chip.
 */

import React from 'react';
import type { PresenceMember } from './usePresence';

interface PresenceAvatarsProps {
  /** Members EXCLUDING the current user (use `others` from usePresence). */
  members: PresenceMember[];
  /** Max avatars to show before collapsing into "+N". */
  max?: number;
}

/** Deterministic color per user id — same person always gets the same tint. */
const TINTS = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-violet-500',
  'bg-cyan-500',
  'bg-orange-500',
  'bg-pink-500',
];

function tintFor(userId: number): string {
  return TINTS[Math.abs(userId) % TINTS.length];
}

function initialsFor(member: PresenceMember): string {
  const source = member.userName || member.email || `U${member.userId}`;
  const parts = source.trim().split(/\s+/).slice(0, 2);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export const PresenceAvatars: React.FC<PresenceAvatarsProps> = ({ members, max = 3 }) => {
  if (members.length === 0) return null;

  const visible = members.slice(0, max);
  const overflow = members.length - visible.length;

  return (
    <div
      className="flex items-center -space-x-1.5"
      role="group"
      aria-label={`${members.length} other ${members.length === 1 ? 'person' : 'people'} editing`}
    >
      {visible.map((m) => (
        <div
          key={m.sessionId}
          title={`${m.userName}${m.email ? ` <${m.email}>` : ''} — also editing`}
          className={`w-6 h-6 rounded-full ${tintFor(m.userId)} text-white text-[10px] font-semibold flex items-center justify-center ring-2 ring-white dark:ring-gray-900 shadow-sm`}
        >
          {initialsFor(m)}
        </div>
      ))}
      {overflow > 0 && (
        <div
          title={`${overflow} more`}
          className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-[10px] font-semibold flex items-center justify-center ring-2 ring-white dark:ring-gray-900 shadow-sm"
        >
          +{overflow}
        </div>
      )}
    </div>
  );
};
