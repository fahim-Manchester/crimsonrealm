import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EntryGroup {
  id: string;
  name: string;
  section: string;
  display_order: number;
}

interface CleaveResult {
  name: string;
  entryIds: string[];
}

type SectionType = "resources" | "projects" | "tasks";

export function useCleaveDismantle<T extends { id: string }>(
  section: SectionType,
  userId: string | undefined,
  onGroupsChanged: () => void
) {
  const [groups, setGroups] = useState<EntryGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [cleaving, setCleaving] = useState(false);

  const fetchGroups = useCallback(async () => {
    if (!userId) return;
    
    const { data, error } = await supabase
      .from("entry_groups")
      .select("*")
      .eq("section", section)
      .eq("user_id", userId)
      .order("display_order");

    if (error) {
      console.error("Failed to fetch groups:", error);
    } else {
      setGroups(data || []);
    }
  }, [section, userId]);

  const cleaveWithAI = useCallback(async (
    entries: T[],
    numGroups?: number,
    luckyMode?: boolean
  ) => {
    if (!userId || entries.length === 0) {
      toast.error("No entries to categorize");
      return;
    }

    setCleaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("cleave", {
        body: { entries, section, numGroups, luckyMode, userId },
      });

      if (error) throw error;
      if (data?.code === "DAILY_LIMIT_EXCEEDED") {
        toast.error(data.error || "Daily AI limit reached. Resets at midnight UTC.");
        return;
      }
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      const aiGroups = data.groups as CleaveResult[];

      // Create groups in database and assign entries
      for (let i = 0; i < aiGroups.length; i++) {
        const group = aiGroups[i];
        
        // Create the group
        const { data: newGroup, error: groupError } = await supabase
          .from("entry_groups")
          .insert({
            name: group.name,
            section,
            user_id: userId,
            display_order: i,
          })
          .select()
          .single();

        if (groupError) {
          console.error("Failed to create group:", groupError);
          continue;
        }

        // Update entries with the new group_id
        if (group.entryIds.length > 0) {
          const { error: updateError } = await supabase
            .from(section)
            .update({ group_id: newGroup.id })
            .in("id", group.entryIds);

          if (updateError) {
            console.error("Failed to update entries:", updateError);
          }
        }
      }

      toast.success(`Cleaved into ${aiGroups.length} groups!`);
      await fetchGroups();
      onGroupsChanged();
    } catch (error) {
      console.error("Cleave error:", error);
      toast.error("Failed to cleave entries");
    } finally {
      setCleaving(false);
    }
  }, [section, userId, fetchGroups, onGroupsChanged]);

  const createManualGroup = useCallback(async (name: string) => {
    if (!userId) return null;

    const { data, error } = await supabase
      .from("entry_groups")
      .insert({
        name,
        section,
        user_id: userId,
        display_order: groups.length,
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to create group");
      return null;
    }

    toast.success("Group created");
    await fetchGroups();
    return data;
  }, [section, userId, groups.length, fetchGroups]);

  const dismantleGroup = useCallback(async (groupId: string) => {
    if (!userId) return;

    setLoading(true);
    try {
      // First, remove group_id from all entries in this group
      const { error: updateError } = await supabase
        .from(section)
        .update({ group_id: null })
        .eq("group_id", groupId);

      if (updateError) throw updateError;

      // Then delete the group
      const { error: deleteError } = await supabase
        .from("entry_groups")
        .delete()
        .eq("id", groupId);

      if (deleteError) throw deleteError;

      toast.success("Group dismantled");
      await fetchGroups();
      onGroupsChanged();
    } catch (error) {
      console.error("Dismantle error:", error);
      toast.error("Failed to dismantle group");
    } finally {
      setLoading(false);
    }
  }, [section, userId, fetchGroups, onGroupsChanged]);

  const dismantleAllGroups = useCallback(async () => {
    if (!userId || groups.length === 0) return;

    setLoading(true);
    try {
      // Remove group_id from all entries
      const { error: updateError } = await supabase
        .from(section)
        .update({ group_id: null })
        .eq("user_id", userId);

      if (updateError) throw updateError;

      // Delete all groups for this section
      const { error: deleteError } = await supabase
        .from("entry_groups")
        .delete()
        .eq("section", section)
        .eq("user_id", userId);

      if (deleteError) throw deleteError;

      toast.success("All groups dismantled");
      await fetchGroups();
      onGroupsChanged();
    } catch (error) {
      console.error("Dismantle all error:", error);
      toast.error("Failed to dismantle groups");
    } finally {
      setLoading(false);
    }
  }, [section, userId, groups.length, fetchGroups, onGroupsChanged]);

  const moveEntryToGroup = useCallback(async (entryId: string, groupId: string | null) => {
    const { error } = await supabase
      .from(section)
      .update({ group_id: groupId })
      .eq("id", entryId);

    if (error) {
      toast.error("Failed to move entry");
      return false;
    }

    onGroupsChanged();
    return true;
  }, [section, onGroupsChanged]);

  const renameGroup = useCallback(async (groupId: string, newName: string) => {
    const { error } = await supabase
      .from("entry_groups")
      .update({ name: newName })
      .eq("id", groupId);

    if (error) {
      toast.error("Failed to rename group");
      return false;
    }

    await fetchGroups();
    return true;
  }, [fetchGroups]);

  return {
    groups,
    loading,
    cleaving,
    fetchGroups,
    cleaveWithAI,
    createManualGroup,
    dismantleGroup,
    dismantleAllGroups,
    moveEntryToGroup,
    renameGroup,
  };
}
