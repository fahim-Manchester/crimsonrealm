import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface Campaign {
  id: string;
  user_id: string;
  name: string;
  difficulty: string;
  planned_time: number;
  time_spent: number;
  status: string;
  session_count: number;
  created_at: string;
  updated_at: string;
}

export interface CampaignItem {
  id: string;
  campaign_id: string;
  task_id: string | null;
  project_id: string | null;
  display_order: number;
  completed: boolean;
  time_spent: number | null;
  status: string | null;
  completed_session: number | null;
  parent_item_id: string | null;
  created_at: string;
  // Temporary item fields
  is_temporary: boolean;
  temporary_type: string | null;
  temporary_name: string | null;
  temporary_description: string | null;
  // Joined relations
  task?: {
    id: string;
    title: string;
    description: string | null;
    status: string | null;
    priority: string | null;
    time_logged: number | null;
  };
  project?: {
    id: string;
    name: string;
    description: string | null;
    status: string | null;
    time_spent: number | null;
  };
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  priority: string | null;
  time_logged: number | null;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string | null;
  time_spent: number | null;
}

export function useCampaigns() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
  const [availableProjects, setAvailableProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCampaigns = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("campaigns")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch campaigns");
      console.error(error);
    } else {
      const baseCampaigns = (data || []) as Campaign[];

      // Derive accurate campaign time from campaign_items (seconds) so dashboard always matches session totals.
      // This avoids relying on campaigns.time_spent which can lag behind if a session wasn't explicitly ended.
      const ids = baseCampaigns.map((c) => c.id);
      if (ids.length === 0) {
        setCampaigns(baseCampaigns);
        return;
      }

      const { data: itemTimes, error: itemErr } = await supabase
        .from("campaign_items")
        .select("campaign_id, time_spent")
        .in("campaign_id", ids);

      if (itemErr) {
        // Fallback to stored campaign time if this aggregation fails
        console.error(itemErr);
        setCampaigns(baseCampaigns);
        return;
      }

      const secondsByCampaign = new Map<string, number>();
      for (const row of itemTimes || []) {
        const campaignId = row.campaign_id as string;
        const seconds = (row.time_spent as number | null) || 0;
        secondsByCampaign.set(campaignId, (secondsByCampaign.get(campaignId) || 0) + seconds);
      }

      const merged = baseCampaigns.map((c) => {
        const seconds = secondsByCampaign.get(c.id) || 0;
        const derivedMinutes = Math.ceil(seconds / 60);
        // Use derived time when it's greater (or when stored is 0), but never reduce time_spent on the UI.
        const time_spent = Math.max(c.time_spent || 0, derivedMinutes);
        return { ...c, time_spent };
      });

      setCampaigns(merged);
    }
  }, [user]);

  const fetchAvailableTasks = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("tasks")
      .select("id, title, description, status, priority, time_logged")
      .eq("user_id", user.id)
      .neq("status", "completed")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
    } else {
      setAvailableTasks(data || []);
    }
  }, [user]);

  const fetchAvailableProjects = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("projects")
      .select("id, name, description, status, time_spent")
      .eq("user_id", user.id)
      .neq("status", "completed")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
    } else {
      setAvailableProjects(data || []);
    }
  }, [user]);

  const fetchCampaignItems = useCallback(async (campaignId: string): Promise<CampaignItem[]> => {
    const { data, error } = await supabase
      .from("campaign_items")
      .select(`
        *,
        task:tasks(id, title, description, status, priority, time_logged),
        project:projects(id, name, description, status, time_spent)
      `)
      .eq("campaign_id", campaignId)
      .order("display_order", { ascending: true });

    if (error) {
      console.error(error);
      return [];
    }

    return (data || []).map(item => ({
      ...item,
      task: item.task as CampaignItem['task'],
      project: item.project as CampaignItem['project']
    }));
  }, []);

  const createCampaign = useCallback(async (
    name: string, 
    difficulty: string,
    plannedTime: number,
    taskIds: string[],
    projectIds: string[],
    temporaryItems: { id: string; type: "popup_quest" | "hidden_territory"; name: string; description: string | null }[] = []
  ) => {
    if (!user) return null;

    const { data: campaign, error } = await supabase
      .from("campaigns")
      .insert({
        user_id: user.id,
        name,
        difficulty,
        planned_time: plannedTime,
        status: "active"
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to create campaign");
      console.error(error);
      return null;
    }

    // Add tasks to campaign (explicit is_temporary: false to avoid NULL constraint violation)
    const taskItems = taskIds.map((taskId, index) => ({
      campaign_id: campaign.id,
      task_id: taskId,
      display_order: index,
      is_temporary: false
    }));

    // Add projects to campaign (explicit is_temporary: false to avoid NULL constraint violation)
    const projectItems = projectIds.map((projectId, index) => ({
      campaign_id: campaign.id,
      project_id: projectId,
      display_order: taskIds.length + index,
      is_temporary: false
    }));

    // Add temporary items (Pop-up Quests and Hidden Territories)
    // Convert creator types to database types: popup_quest → task, hidden_territory → project
    const tempItems = temporaryItems.map((item, index) => ({
      campaign_id: campaign.id,
      is_temporary: true,
      temporary_type: item.type === "popup_quest" ? "task" : "project",
      temporary_name: item.name,
      temporary_description: item.description,
      display_order: taskIds.length + projectIds.length + index
    }));

    const allItems = [...taskItems, ...projectItems, ...tempItems];

    if (allItems.length > 0) {
      const { error: itemsError } = await supabase
        .from("campaign_items")
        .insert(allItems);

      if (itemsError) {
        console.error(itemsError);
        toast.error("Campaign created but failed to add items");
      }
    }

    toast.success("Campaign forged successfully!");
    await fetchCampaigns();
    return campaign;
  }, [user, fetchCampaigns]);

  const updateCampaignTimeSpent = useCallback(async (campaignId: string, additionalTime: number) => {
    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign) return;

    const { error } = await supabase
      .from("campaigns")
      .update({ time_spent: campaign.time_spent + additionalTime })
      .eq("id", campaignId);

    if (error) {
      console.error(error);
    } else {
      await fetchCampaigns();
    }
  }, [campaigns, fetchCampaigns]);

  const updateCampaignStatus = useCallback(async (campaignId: string, status: string) => {
    const { error } = await supabase
      .from("campaigns")
      .update({ status })
      .eq("id", campaignId);

    if (error) {
      toast.error("Failed to update campaign status");
      console.error(error);
    } else {
      await fetchCampaigns();
    }
  }, [fetchCampaigns]);

  const updateCampaign = useCallback(async (
    campaignId: string, 
    updates: { name?: string; planned_time?: number; difficulty?: string }
  ) => {
    const { error } = await supabase
      .from("campaigns")
      .update(updates)
      .eq("id", campaignId);

    if (error) {
      toast.error("Failed to update campaign");
      console.error(error);
    } else {
      toast.success("Campaign updated");
      await fetchCampaigns();
    }
  }, [fetchCampaigns]);

  const resetRoutineCampaign = useCallback(async (campaignId: string) => {
    // Reset all campaign_items for this campaign: uncheck them, clear time_spent
    const { error: itemsError } = await supabase
      .from("campaign_items")
      .update({ 
        completed: false, 
        status: 'pending',
        time_spent: 0,
        completed_session: null
      })
      .eq("campaign_id", campaignId);

    if (itemsError) {
      toast.error("Failed to reset campaign items");
      console.error(itemsError);
      return;
    }

    // Reset campaign time and session count but keep status as routine
    const { error } = await supabase
      .from("campaigns")
      .update({ 
        time_spent: 0,
        session_count: 0
      })
      .eq("id", campaignId);

    if (error) {
      toast.error("Failed to reset campaign");
      console.error(error);
    } else {
      toast.success("Routine campaign reset!");
      await fetchCampaigns();
    }
  }, [fetchCampaigns]);

  const deleteCampaign = useCallback(async (campaignId: string) => {
    const { error } = await supabase
      .from("campaigns")
      .delete()
      .eq("id", campaignId);

    if (error) {
      toast.error("Failed to delete campaign");
      console.error(error);
    } else {
      toast.success("Campaign disbanded");
      await fetchCampaigns();
    }
  }, [fetchCampaigns]);

  const toggleItemCompleted = useCallback(async (itemId: string, completed: boolean) => {
    const { error } = await supabase
      .from("campaign_items")
      .update({ completed })
      .eq("id", itemId);

    if (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchCampaigns(),
        fetchAvailableTasks(),
        fetchAvailableProjects()
      ]);
      setLoading(false);
    };

    if (user) {
      loadData();
    }
  }, [user, fetchCampaigns, fetchAvailableTasks, fetchAvailableProjects]);

  return {
    campaigns,
    availableTasks,
    availableProjects,
    loading,
    createCampaign,
    updateCampaignTimeSpent,
    updateCampaignStatus,
    updateCampaign,
    resetRoutineCampaign,
    deleteCampaign,
    fetchCampaignItems,
    toggleItemCompleted,
    refreshCampaigns: fetchCampaigns
  };
}
