import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Campaign, CampaignItem } from "@/hooks/useCampaigns";

export interface SessionState {
  isRunning: boolean;
  campaignTotalTime: number; // Total time from DB (in minutes)
  sessionTime: number; // Time this session (in seconds)
  taskTime: number; // Time on current task (in seconds)
  currentTaskIndex: number;
}

export function useCampaignSession(campaign: Campaign | null) {
  const [items, setItems] = useState<CampaignItem[]>([]);
  const [sessionState, setSessionState] = useState<SessionState>({
    isRunning: false,
    campaignTotalTime: campaign?.time_spent || 0,
    sessionTime: 0,
    taskTime: 0,
    currentTaskIndex: 0
  });
  const [loading, setLoading] = useState(true);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStartTimeRef = useRef<number>(0);

  // Fetch campaign items
  const fetchItems = useCallback(async () => {
    if (!campaign) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("campaign_items")
      .select(`
        *,
        task:tasks(id, title, description, status, priority, time_logged),
        project:projects(id, name, description, status)
      `)
      .eq("campaign_id", campaign.id)
      .order("display_order", { ascending: true });

    if (error) {
      console.error(error);
    } else {
      const mappedItems = (data || []).map(item => ({
        ...item,
        task: item.task as CampaignItem['task'],
        project: item.project as CampaignItem['project']
      }));
      setItems(mappedItems);
    }
    setLoading(false);
  }, [campaign]);

  // Start timer
  const startTimer = useCallback(() => {
    if (intervalRef.current) return;
    
    sessionStartTimeRef.current = Date.now();
    setSessionState(prev => ({ ...prev, isRunning: true }));
    
    intervalRef.current = setInterval(() => {
      setSessionState(prev => ({
        ...prev,
        sessionTime: prev.sessionTime + 1,
        taskTime: prev.taskTime + 1
      }));
    }, 1000);
  }, []);

  // Pause timer
  const pauseTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setSessionState(prev => ({ ...prev, isRunning: false }));
  }, []);

  // Complete current task and move to next
  const completeCurrentTask = useCallback(async () => {
    const currentItem = items[sessionState.currentTaskIndex];
    if (!currentItem) return;

    // Mark item as completed
    await supabase
      .from("campaign_items")
      .update({ completed: true })
      .eq("id", currentItem.id);

    // Reset task timer and move to next
    setSessionState(prev => ({
      ...prev,
      taskTime: 0,
      currentTaskIndex: Math.min(prev.currentTaskIndex + 1, items.length - 1)
    }));

    // Update local items
    setItems(prev => prev.map(item => 
      item.id === currentItem.id ? { ...item, completed: true } : item
    ));
  }, [items, sessionState.currentTaskIndex]);

  // End session and save time to database
  const endSession = useCallback(async () => {
    pauseTimer();
    
    if (!campaign) return;

    const sessionMinutes = Math.ceil(sessionState.sessionTime / 60);
    const newTotalTime = (campaign.time_spent || 0) + sessionMinutes;

    const { error } = await supabase
      .from("campaigns")
      .update({ time_spent: newTotalTime })
      .eq("id", campaign.id);

    if (error) {
      console.error("Failed to save session time:", error);
    }

    return sessionMinutes;
  }, [campaign, sessionState.sessionTime, pauseTimer]);

  // Reorder items
  const reorderItems = useCallback(async (newItems: CampaignItem[]) => {
    setItems(newItems);
    
    // Update display_order in database
    const updates = newItems.map((item, index) => 
      supabase
        .from("campaign_items")
        .update({ display_order: index })
        .eq("id", item.id)
    );

    await Promise.all(updates);
  }, []);

  // Add task to campaign
  const addTaskToCampaign = useCallback(async (taskId: string) => {
    if (!campaign) return;

    const { data, error } = await supabase
      .from("campaign_items")
      .insert({
        campaign_id: campaign.id,
        task_id: taskId,
        display_order: items.length
      })
      .select(`
        *,
        task:tasks(id, title, description, status, priority, time_logged),
        project:projects(id, name, description, status)
      `)
      .single();

    if (error) {
      console.error(error);
      return null;
    }

    const newItem = {
      ...data,
      task: data.task as CampaignItem['task'],
      project: data.project as CampaignItem['project']
    };
    
    setItems(prev => [...prev, newItem]);
    return newItem;
  }, [campaign, items.length]);

  // Add project to campaign
  const addProjectToCampaign = useCallback(async (projectId: string) => {
    if (!campaign) return;

    const { data, error } = await supabase
      .from("campaign_items")
      .insert({
        campaign_id: campaign.id,
        project_id: projectId,
        display_order: items.length
      })
      .select(`
        *,
        task:tasks(id, title, description, status, priority, time_logged),
        project:projects(id, name, description, status)
      `)
      .single();

    if (error) {
      console.error(error);
      return null;
    }

    const newItem = {
      ...data,
      task: data.task as CampaignItem['task'],
      project: data.project as CampaignItem['project']
    };
    
    setItems(prev => [...prev, newItem]);
    return newItem;
  }, [campaign, items.length]);

  // Set current task index
  const setCurrentTaskIndex = useCallback((index: number) => {
    setSessionState(prev => ({
      ...prev,
      currentTaskIndex: index,
      taskTime: 0
    }));
  }, []);

  // Initialize
  useEffect(() => {
    if (campaign) {
      fetchItems();
      setSessionState(prev => ({
        ...prev,
        campaignTotalTime: campaign.time_spent || 0
      }));
    }
  }, [campaign, fetchItems]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    items,
    sessionState,
    loading,
    startTimer,
    pauseTimer,
    completeCurrentTask,
    endSession,
    reorderItems,
    addTaskToCampaign,
    addProjectToCampaign,
    setCurrentTaskIndex,
    refreshItems: fetchItems
  };
}
