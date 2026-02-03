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
  created_at: string;
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
      setCampaigns(data || []);
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
      .select("id, name, description, status")
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
        project:projects(id, name, description, status)
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
    projectIds: string[]
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

    // Add tasks to campaign
    const taskItems = taskIds.map((taskId, index) => ({
      campaign_id: campaign.id,
      task_id: taskId,
      display_order: index
    }));

    // Add projects to campaign
    const projectItems = projectIds.map((projectId, index) => ({
      campaign_id: campaign.id,
      project_id: projectId,
      display_order: taskIds.length + index
    }));

    const allItems = [...taskItems, ...projectItems];

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
    deleteCampaign,
    fetchCampaignItems,
    toggleItemCompleted,
    refreshCampaigns: fetchCampaigns
  };
}
