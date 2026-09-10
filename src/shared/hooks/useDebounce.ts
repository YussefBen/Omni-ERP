import { useEffect, useState } from 'react';
import { DEBOUNCE_DELAY_MS } from '../config/constants';

export function useDebounce<T>(value: T, delay: number = DEBOUNCE_DELAY_MS): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    // Nettoyage : toute nouvelle frappe annule le minuteur précédent.
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}