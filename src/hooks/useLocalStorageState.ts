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
 * CRITICAL FIX: Uses ref-backed state to ensure persistImmediately listeners
 * always write the latest state, even if React hasn't re-rendered yet.
 * 
 * Returns [state, setState, clear, wasRestored, persistNow]
 * - wasRestored: true if state was loaded from localStorage (useful for "Draft restored" toast)
 * - persistNow: function to immediately flush current state to localStorage
 */
export function useLocalStorageState<T>(
  key: string,
  initialValue: T,
  options: UseLocalStorageStateOptions = {}
): [T, React.Dispatch<React.SetStateAction<T>>, () => void, boolean, () => void] {
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
  const [state, setStateInternal] = useState<T>(() => {
    const result = hydrateFromStorage(key);
    prevKeyRef.current = key;
    return result.value;
  });
  
  // REF-BACKED STATE: Always holds the latest state value synchronously
  // This is critical for persistImmediately to capture state even before React re-renders
  const stateRef = useRef<T>(state);
  
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

  /**
   * WRAPPED SETTER: Updates both React state AND the ref synchronously.
   * This ensures that if visibilitychange/pagehide fires immediately after a click,
   * we persist the NEW state, not the stale closure value.
   */
  const setState = useCallback((action: React.SetStateAction<T>) => {
    setStateInternal(prev => {
      const nextValue = typeof action === 'function' 
        ? (action as (prev: T) => T)(prev) 
        : action;
      // Update the ref SYNCHRONOUSLY so persistImmediately sees the latest
      stateRef.current = nextValue;
      return nextValue;
    });
  }, []);

  // Keep stateRef in sync if state changes from other sources (e.g., re-hydration)
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // RE-HYDRATE when key changes (e.g., anonymous → user-specific)
  useEffect(() => {
    const previousKey = prevKeyRef.current;
    
    // Key hasn't changed, skip
    if (previousKey === key) return;
    
    // Key changed - need to re-hydrate from new key
    const newKeyResult = hydrateFromStorage(key);
    
    if (newKeyResult.wasRestored) {
      // New key has data - use it
      setStateInternal(newKeyResult.value);
      stateRef.current = newKeyResult.value;
      setWasRestored(true);
    } else if (migrateOnKeyChange && previousKey) {
      // New key is empty but old key might have data - migrate it
      const oldKeyResult = hydrateFromStorage(previousKey);
      if (oldKeyResult.wasRestored) {
        // Migrate data from old key to new key
        setStateInternal(oldKeyResult.value);
        stateRef.current = oldKeyResult.value;
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
    setStateInternal(initialValue);
    stateRef.current = initialValue;
    setWasRestored(false);
  }, [initialValue]);

  /**
   * PERSIST NOW: Immediately flush the current state to localStorage.
   * Call this after critical actions (Quick Add, Remove) to ensure durability
   * even if the browser backgrounds the page before the debounce fires.
   */
  const persistNow = useCallback(() => {
    try {
      localStorage.setItem(keyRef.current, JSON.stringify(stateRef.current));
    } catch {
      // localStorage might be unavailable
    }
  }, []);

  // Persist on pagehide/beforeunload/visibilitychange for mobile reliability
  // CRITICAL: Uses stateRef.current to capture the LATEST state
  useEffect(() => {
    const persistImmediately = () => {
      try {
        localStorage.setItem(keyRef.current, JSON.stringify(stateRef.current));
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
  }, []); // Empty deps - uses refs for latest values

  return [state, setState, clear, wasRestored, persistNow];
}
