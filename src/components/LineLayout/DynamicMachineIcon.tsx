import React, { useMemo, useRef, useEffect } from 'react';
import { useMachineIcons } from '@/hooks/useMachineIcons';
import type { MachineIcon } from '@/api/machineIcons';
import { getMachineIcon, getMachineColor } from '@/icons/MachineIcons';

interface DynamicMachineIconProps {
  /** Machine type code (e.g. 'SNLS', 'OL') — used for DB lookup + fallback */
  code?: string | null;
  /** Direct icon object from API (avoids extra fetch) */
  icon?: MachineIcon | null;
  /** Override color */
  color?: string;
  /** Size in pixels */
  size?: number;
  /** CSS class */
  className?: string;
  /** Show animated pulse on hover */
  animated?: boolean;
}

/**
 * DynamicMachineIcon — renders an icon from the MachineIcon DB table.
 * Falls back to the hardcoded SVG library (MachineIcons.tsx) when
 * no DB icon is available.
 *
 * Usage:
 *   <DynamicMachineIcon code="SNLS" size={40} />
 *   <DynamicMachineIcon icon={machineType.icon} size={48} />
 */
const DynamicMachineIcon: React.FC<DynamicMachineIconProps> = ({
  code,
  icon: directIcon,
  color,
  size = 40,
  className = '',
  animated = false,
}) => {
  // Fetch all icons once (cached by React Query)
  const { data: dbIcons } = useMachineIcons();

  // Resolve the icon from either direct prop or DB lookup
  const resolvedIcon = useMemo(() => {
    if (directIcon) return directIcon;
    if (!code || !dbIcons) return null;
    const upper = code.toUpperCase();
    return dbIcons.find(i => i.code === upper) || null;
  }, [directIcon, code, dbIcons]);

  // Determine color
  const iconColor = color || resolvedIcon?.colorHex || getMachineColor(code);

  // Ref-based SVG injection (avoids dangerouslySetInnerHTML reconciliation bugs)
  const svgRef = useRef<HTMLSpanElement>(null);
  const coloredSvg = useMemo(
    () =>
      resolvedIcon?.svgContent
        ? resolvedIcon.svgContent.replace(/currentColor/g, iconColor)
        : null,
    [resolvedIcon?.svgContent, iconColor]
  );

  useEffect(() => {
    if (svgRef.current && coloredSvg) {
      svgRef.current.innerHTML = coloredSvg;
    } else if (svgRef.current) {
      svgRef.current.innerHTML = '';
    }
  }, [coloredSvg]);

  // If we have DB SVG content, render via ref
  if (resolvedIcon?.svgContent) {
    return (
      <span
        ref={svgRef}
        className={`inline-flex items-center justify-center ${animated ? 'transition-transform hover:scale-110' : ''} ${className}`}
        style={{ width: size, height: size }}
        title={resolvedIcon.name}
      />
    );
  }

  // If we have an image URL, render as img
  if (resolvedIcon?.imageUrl) {
    return (
      <img
        src={resolvedIcon.imageUrl}
        alt={resolvedIcon.name}
        width={size}
        height={size}
        className={`object-contain ${animated ? 'transition-transform hover:scale-110' : ''} ${className}`}
        title={resolvedIcon.name}
      />
    );
  }

  // Fallback to hardcoded icon library
  const FallbackIcon = getMachineIcon(code);
  return (
    <span className={`inline-flex items-center justify-center ${animated ? 'transition-transform hover:scale-110' : ''} ${className}`}>
      <FallbackIcon size={size} color={iconColor} />
    </span>
  );
};

export default React.memo(DynamicMachineIcon);
