import { useCallback } from 'react';
import { useNavigate } from 'react-router';

/**
 * Hook to navigate back or fallback to a default route
 */
export function useGoBack(fallback = '/') {
  const navigate = useNavigate();

  const goBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(fallback);
    }
  }, [navigate, fallback]);

  return goBack;
}
