import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const DEBOUNCE_MS = 2000;
const LOCAL_KEY = "realm-music-prefs-cache";

export interface MusicPrefsData {
  settings: Record<string, any>;
  main_queue: any[];
  downtime_queue: any[];
}

const defaultPrefs: MusicPrefsData = {
  settings: {},
  main_queue: [],
  downtime_queue: [],
};

export function useMusicPreferences(userId: string | undefined) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRef = useRef<MusicPrefsData>(defaultPrefs);

  // Load from localStorage immediately
  const loadLocal = useCallback((): MusicPrefsData => {
    try {
      const stored = localStorage.getItem(LOCAL_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    return defaultPrefs;
  }, []);

  const saveLocal = useCallback((data: MusicPrefsData) => {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
    } catch {}
  }, []);

  // Load from DB
  const loadFromDB = useCallback(async (): Promise<MusicPrefsData | null> => {
    if (!userId) return null;
    const { data, error } = await supabase
      .from("music_preferences")
      .select("settings, main_queue, downtime_queue")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Failed to load music prefs:", error);
      return null;
    }
    if (!data) return null;
    return {
      settings: (data.settings as Record<string, any>) || {},
      main_queue: (data.main_queue as any[]) || [],
      downtime_queue: (data.downtime_queue as any[]) || [],
    };
  }, [userId]);

  // Save to DB (debounced)
  const saveToDB = useCallback(async (prefs: MusicPrefsData) => {
    if (!userId) return;
    latestRef.current = prefs;
    saveLocal(prefs);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const { error } = await supabase
        .from("music_preferences")
        .upsert({
          user_id: userId,
          settings: prefs.settings as any,
          main_queue: prefs.main_queue as any,
          downtime_queue: prefs.downtime_queue as any,
          updated_at: new Date().toISOString(),
        } as any, { onConflict: "user_id" });

      if (error) {
        console.error("Failed to save music prefs:", error);
      }
    }, DEBOUNCE_MS);
  }, [userId, saveLocal]);

  // Flush on unmount/page hide
  useEffect(() => {
    const flush = () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
        // Save to localStorage synchronously as last resort
        saveLocal(latestRef.current);
      }
    };
    window.addEventListener("pagehide", flush);
    return () => {
      flush();
      window.removeEventListener("pagehide", flush);
    };
  }, [saveLocal]);

  return { loadLocal, loadFromDB, saveToDB };
}
