import { useState, useEffect } from 'react';
import { BREAKPOINTS } from '@/core/constants';

type BreakpointKey = keyof typeof BREAKPOINTS;

/**
 * Hook to detect if the viewport matches or exceeds a breakpoint.
 */
export function useMediaQuery(breakpoint: BreakpointKey): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const query = `(min-width: ${BREAKPOINTS[breakpoint]}px)`;
    const mql = window.matchMedia(query);

    const handleChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    setMatches(mql.matches);

    mql.addEventListener('change', handleChange);
    return () => mql.removeEventListener('change', handleChange);
  }, [breakpoint]);

  return matches;
}
