import { useState, useEffect, useCallback, useRef } from "react";

interface UseLocalStorageStateOptions {
  debounceMs?: number;
}

/**
 * A hook that syncs state to localStorage with debounced writes.
 * Hydrates on mount, persists on changes.
 * Survives full page reloads.
 */
export function useLocalStorageState<T>(
  key: string,
  initialValue: T,
  options: UseLocalStorageStateOptions = {}
): [T, React.Dispatch<React.SetStateAction<T>>, () => void] {
  const { debounceMs = 200 } = options;
  
  // Initialize state - hydrate from localStorage on first render
  const [state, setState] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        return JSON.parse(stored) as T;
      }
    } catch {
      // Invalid JSON or localStorage unavailable
    }
    return initialValue;
  });

  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keyRef = useRef(key);
  keyRef.current = key;

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

  return [state, setState, clear];
}
