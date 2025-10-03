import { useState, useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';

export function usePersistedState<T>(
  key: string,
  initialValue: T
): [T, Dispatch<SetStateAction<T>>] {
  // Initialize with provided value to avoid SSR window access
  const [state, setState] = useState<T>(initialValue);

  // Read from localStorage on client after mount
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const item = window.localStorage.getItem(key);
        if (item != null) {
          setState(JSON.parse(item));
        }
      }
    } catch (error) {
      console.error(`Error loading ${key} from localStorage:`, error);
    }
    // Run only on mount or key change
  }, [key]);

  // Persist to localStorage when state changes (client only)
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(state));
      }
    } catch (error) {
      console.error(`Error saving ${key} to localStorage:`, error);
    }
  }, [key, state]);

  return [state, setState];
}
