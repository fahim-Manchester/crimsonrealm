import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface UserSettings {
  id: string;
  user_id: string;
  phone_number: string | null;
  sms_enabled: boolean;
  external_unlocked: boolean;
}

export function useUserSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    if (!user) { setLoading(false); return; }

    const { data, error } = await supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Failed to load user settings:", error);
    }
    setSettings(data as UserSettings | null);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const upsertSettings = useCallback(async (updates: Partial<Omit<UserSettings, "id" | "user_id">>) => {
    if (!user) return;

    if (settings) {
      const { data, error } = await supabase
        .from("user_settings")
        .update(updates)
        .eq("user_id", user.id)
        .select()
        .single();
      if (error) throw error;
      setSettings(data as UserSettings);
    } else {
      const { data, error } = await supabase
        .from("user_settings")
        .insert({ user_id: user.id, ...updates })
        .select()
        .single();
      if (error) throw error;
      setSettings(data as UserSettings);
    }
  }, [user, settings]);

  return { settings, loading, upsertSettings, refetch: fetchSettings };
}
