import { useState, useEffect, useCallback, useRef } from "react";

interface UseLocalStorageStateOptions {
  debounceMs?: number;
  /** If true, migrates data from old key to new key when key changes */
  migrateOnKeyChange?: boolean;
}

interface HydrationResult<T> {
  value: T;
  wasRestored: boolean;
}

/**
 * A hook that syncs state to localStorage with debounced writes.
 * Hydrates on mount and RE-HYDRATES when key changes.
 * Survives full page reloads.
 * 
 * Returns [state, setState, clear, wasRestored]
 * - wasRestored: true if state was loaded from localStorage (useful for "Draft restored" toast)
 */
export function useLocalStorageState<T>(
  key: string,
  initialValue: T,
  options: UseLocalStorageStateOptions = {}
): [T, React.Dispatch<React.SetStateAction<T>>, () => void, boolean] {
  const { debounceMs = 200, migrateOnKeyChange = true } = options;
  
  // Track previous key to detect key changes
  const prevKeyRef = useRef<string | null>(null);
  
  // Hydration helper
  const hydrateFromStorage = useCallback((storageKey: string): HydrationResult<T> => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as T;
        // Check if it's a meaningful value (not just default/empty)
        const isNonEmpty = parsed !== null && 
          (typeof parsed !== 'object' || Object.keys(parsed as object).some(k => {
            const val = (parsed as Record<string, unknown>)[k];
            return val !== '' && val !== null && val !== undefined && 
                   !(Array.isArray(val) && val.length === 0);
          }));
        return { value: parsed, wasRestored: isNonEmpty };
      }
    } catch {
      // Invalid JSON or localStorage unavailable
    }
    return { value: initialValue, wasRestored: false };
  }, [initialValue]);
  
  // Initialize state - hydrate from localStorage on first render
  const [state, setState] = useState<T>(() => {
    const result = hydrateFromStorage(key);
    prevKeyRef.current = key;
    return result.value;
  });
  
  // Track if state was restored from storage
  const [wasRestored, setWasRestored] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed !== null && typeof parsed === 'object' && 
          Object.keys(parsed).some(k => {
            const val = parsed[k];
            return val !== '' && val !== null && val !== undefined &&
                   !(Array.isArray(val) && val.length === 0);
          });
      }
    } catch {}
    return false;
  });

  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keyRef = useRef(key);
  keyRef.current = key;

  // RE-HYDRATE when key changes (e.g., anonymous → user-specific)
  useEffect(() => {
    const previousKey = prevKeyRef.current;
    
    // Key hasn't changed, skip
    if (previousKey === key) return;
    
    // Key changed - need to re-hydrate from new key
    const newKeyResult = hydrateFromStorage(key);
    
    if (newKeyResult.wasRestored) {
      // New key has data - use it
      setState(newKeyResult.value);
      setWasRestored(true);
    } else if (migrateOnKeyChange && previousKey) {
      // New key is empty but old key might have data - migrate it
      const oldKeyResult = hydrateFromStorage(previousKey);
      if (oldKeyResult.wasRestored) {
        // Migrate data from old key to new key
        setState(oldKeyResult.value);
        setWasRestored(true);
        // Persist to new key immediately
        try {
          localStorage.setItem(key, JSON.stringify(oldKeyResult.value));
          // Optionally clean up old key
          localStorage.removeItem(previousKey);
        } catch {
          // localStorage might be unavailable
        }
      }
    }
    
    prevKeyRef.current = key;
  }, [key, hydrateFromStorage, migrateOnKeyChange]);

  // Debounced write to localStorage
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(keyRef.current, JSON.stringify(state));
      } catch {
        // localStorage might be full or unavailable
      }
    }, debounceMs);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [state, debounceMs]);

  // Clear function to remove from localStorage and reset to initial
  const clear = useCallback(() => {
    try {
      localStorage.removeItem(keyRef.current);
    } catch {
      // ignore
    }
    setState(initialValue);
    setWasRestored(false);
  }, [initialValue]);

  // Also persist on pagehide/beforeunload for mobile reliability
  useEffect(() => {
    const persistImmediately = () => {
      try {
        localStorage.setItem(keyRef.current, JSON.stringify(state));
      } catch {
        // ignore
      }
    };

    const handlePageHide = () => persistImmediately();
    const handleBeforeUnload = () => persistImmediately();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        persistImmediately();
      }
    };

    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [state]);

  return [state, setState, clear, wasRestored];
}
