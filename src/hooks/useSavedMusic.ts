import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SavedMusicItem {
  id: string;
  user_id: string;
  title: string;
  url: string;
  type: "track" | "playlist";
  source_platform: string | null;
  description: string | null;
  created_at: string;
}

function detectPlatform(url: string): string | null {
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
  if (url.includes("spotify.com")) return "spotify";
  if (url.includes("soundcloud.com")) return "soundcloud";
  return null;
}

export function useSavedMusic(userId: string | undefined) {
  const [items, setItems] = useState<SavedMusicItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchItems = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("saved_music")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch saved music:", error);
    } else {
      setItems((data as SavedMusicItem[]) || []);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const addItem = useCallback(async (item: {
    title: string;
    url: string;
    type: "track" | "playlist";
    description?: string;
  }) => {
    if (!userId) return null;
    const { data, error } = await supabase
      .from("saved_music")
      .insert({
        user_id: userId,
        title: item.title,
        url: item.url,
        type: item.type,
        source_platform: detectPlatform(item.url),
        description: item.description || null,
      } as any)
      .select()
      .single();

    if (error) {
      toast.error("Failed to save music");
      return null;
    }
    toast.success("Music saved to library");
    await fetchItems();
    return data as SavedMusicItem;
  }, [userId, fetchItems]);

  const updateItem = useCallback(async (id: string, updates: {
    title?: string;
    url?: string;
    type?: "track" | "playlist";
    description?: string | null;
  }) => {
    const updateData: any = { ...updates };
    if (updates.url) {
      updateData.source_platform = detectPlatform(updates.url);
    }
    const { error } = await supabase
      .from("saved_music")
      .update(updateData)
      .eq("id", id);

    if (error) {
      toast.error("Failed to update");
      return false;
    }
    await fetchItems();
    return true;
  }, [fetchItems]);

  const deleteItem = useCallback(async (id: string) => {
    const { error } = await supabase
      .from("saved_music")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete");
      return false;
    }
    toast.success("Removed from library");
    await fetchItems();
    return true;
  }, [fetchItems]);

  return { items, loading, fetchItems, addItem, updateItem, deleteItem };
}
