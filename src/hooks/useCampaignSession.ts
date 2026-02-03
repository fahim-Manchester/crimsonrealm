import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Campaign, CampaignItem } from "@/hooks/useCampaigns";

export interface SessionState {
  isRunning: boolean;
  campaignTotalTime: number; // Total time from DB (in minutes)
  sessionTime: number; // Time this session (in seconds)
  taskTime: number; // Time on current task in this session (in seconds)
  currentTaskIndex: number;
  currentSessionNumber: number; // Which session we're on
}

// Track accumulated time per item during this session
export interface ItemSessionTime {
  [itemId: string]: number; // seconds spent on this item this session
}

export function useCampaignSession(campaign: Campaign | null) {
  const [items, setItems] = useState<CampaignItem[]>([]);
  const [sessionState, setSessionState] = useState<SessionState>({
    isRunning: false,
    campaignTotalTime: campaign?.time_spent || 0,
    sessionTime: 0,
    taskTime: 0,
    currentTaskIndex: 0,
    currentSessionNumber: (campaign?.session_count || 0) + 1
  });
  const [loading, setLoading] = useState(true);
  const [itemSessionTimes, setItemSessionTimes] = useState<ItemSessionTime>({});
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStartTimeRef = useRef<number>(0);

  const findParentProjectId = useCallback((item: CampaignItem) => {
    // If this item is nested under a territory (project item), attribute time to that territory.
    const guard = new Set<string>();
    let cursor: CampaignItem | undefined = item;
    while (cursor?.parent_item_id) {
      if (guard.has(cursor.id)) break;
      guard.add(cursor.id);

      const parent = items.find((i) => i.id === cursor!.parent_item_id);
      if (!parent) break;
      if (parent.project_id) return parent.project_id;
      cursor = parent;
    }
    return null;
  }, [items]);

  const incrementTaskMinutes = useCallback(async (taskId: string, minutes: number) => {
    if (minutes === 0) return;
    const { data, error } = await supabase
      .from("tasks")
      .select("time_logged")
      .eq("id", taskId)
      .maybeSingle();
    if (error || !data) return;
    const current = data.time_logged || 0;
    await supabase.from("tasks").update({ time_logged: current + minutes }).eq("id", taskId);
  }, []);

  const incrementProjectMinutes = useCallback(async (projectId: string, minutes: number) => {
    if (minutes === 0) return;
    const { data, error } = await supabase
      .from("projects")
      .select("time_spent")
      .eq("id", projectId)
      .maybeSingle();
    if (error || !data) return;
    const current = data.time_spent || 0;
    await supabase.from("projects").update({ time_spent: current + minutes }).eq("id", projectId);
  }, []);

  // Fetch campaign items
  const fetchItems = useCallback(async () => {
    if (!campaign) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("campaign_items")
      .select(`
        *,
        task:tasks(id, title, description, status, priority, time_logged),
        project:projects(id, name, description, status, time_spent)
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
      
      // Calculate campaign total from all item times (more accurate than campaign.time_spent)
      const totalSeconds = mappedItems.reduce((sum, item) => sum + (item.time_spent || 0), 0);
      const totalMinutes = Math.ceil(totalSeconds / 60);
      
      // Find first non-completed item as initial index
      const firstActiveIndex = mappedItems.findIndex(
        item => item.status !== 'completed' && item.status !== 'abandoned'
      );
      
      setSessionState(prev => ({ 
        ...prev, 
        currentTaskIndex: firstActiveIndex >= 0 ? firstActiveIndex : prev.currentTaskIndex,
        campaignTotalTime: totalMinutes
      }));
    }
    setLoading(false);
  }, [campaign]);

  // Start timer
  const startTimer = useCallback(() => {
    if (intervalRef.current) return;
    
    sessionStartTimeRef.current = Date.now();
    setSessionState(prev => ({ ...prev, isRunning: true }));
    
    intervalRef.current = setInterval(() => {
      setSessionState(prev => {
        const currentItem = items[prev.currentTaskIndex];
        if (currentItem) {
          setItemSessionTimes(prevTimes => ({
            ...prevTimes,
            [currentItem.id]: (prevTimes[currentItem.id] || 0) + 1
          }));
        }
        return {
          ...prev,
          sessionTime: prev.sessionTime + 1,
          taskTime: prev.taskTime + 1
        };
      });
    }, 1000);
  }, [items]);

  // Pause timer
  const pauseTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setSessionState(prev => ({ ...prev, isRunning: false }));
  }, []);

  // Save time for a specific item to both campaign_item and its source (task/project)
  const saveItemTime = useCallback(async (item: CampaignItem, timeSpentSeconds: number) => {
    if (timeSpentSeconds <= 0) return;
    
    const timeSpentMinutes = Math.ceil(timeSpentSeconds / 60);

    // Save time to campaign_item
    await supabase
      .from("campaign_items")
      .update({ 
        time_spent: (item.time_spent || 0) + timeSpentSeconds
      })
      .eq("id", item.id);

    // If it's a task, add time to the task's time_logged
    if (item.task_id) await incrementTaskMinutes(item.task_id, timeSpentMinutes);

    // If it's a project, add time to the project's time_spent
    if (item.project_id) await incrementProjectMinutes(item.project_id, timeSpentMinutes);

    // If it's nested under a territory, also attribute time to that territory (main db)
    const parentProjectId = findParentProjectId(item);
    if (parentProjectId) await incrementProjectMinutes(parentProjectId, timeSpentMinutes);
  }, [findParentProjectId, incrementProjectMinutes, incrementTaskMinutes]);

  // Switch to a different task (seamless switch, saves current task time)
  const switchToTask = useCallback(async (newIndex: number) => {
    const currentItem = items[sessionState.currentTaskIndex];
    const currentItemTime = sessionState.taskTime;
    
    // Save time for current item before switching
    if (currentItem && currentItemTime > 0) {
      await saveItemTime(currentItem, currentItemTime);
      
      // Update local item with new time
      setItems(prev => prev.map(item => 
        item.id === currentItem.id 
          ? { ...item, time_spent: (item.time_spent || 0) + currentItemTime } 
          : item
      ));
    }
    
    // Get the accumulated time for the new item this session
    const newItem = items[newIndex];
    const accumulatedTime = newItem ? (itemSessionTimes[newItem.id] || 0) : 0;
    
    // Switch to new task, restoring its accumulated time
    setSessionState(prev => ({
      ...prev,
      currentTaskIndex: newIndex,
      taskTime: accumulatedTime
    }));
  }, [items, sessionState.currentTaskIndex, sessionState.taskTime, saveItemTime, itemSessionTimes]);

  // Complete current task and move to next uncompleted
  const completeCurrentTask = useCallback(async () => {
    const currentItem = items[sessionState.currentTaskIndex];
    if (!currentItem) return;

    const timeSpentSeconds = sessionState.taskTime;

    // Save time to campaign_item and mark as completed
    await supabase
      .from("campaign_items")
      .update({ 
        completed: true,
        status: 'completed',
        completed_session: sessionState.currentSessionNumber,
        time_spent: (currentItem.time_spent || 0) + timeSpentSeconds
      })
      .eq("id", currentItem.id);

    // Save time to source task/project
    await saveItemTime(currentItem, timeSpentSeconds);

    // Update local items
    setItems(prev => prev.map(item => 
      item.id === currentItem.id 
        ? { 
            ...item, 
            completed: true, 
            status: 'completed',
            completed_session: sessionState.currentSessionNumber,
            time_spent: (item.time_spent || 0) + timeSpentSeconds 
          } 
        : item
    ));

    // Find next uncompleted item
    const updatedItems = items.map(item => 
      item.id === currentItem.id ? { ...item, status: 'completed' as const } : item
    );
    const nextActiveIndex = updatedItems.findIndex(
      (item, idx) => idx > sessionState.currentTaskIndex && item.status !== 'completed' && item.status !== 'abandoned'
    );
    
    // If no next item, try from beginning
    const firstActiveIndex = nextActiveIndex >= 0 
      ? nextActiveIndex 
      : updatedItems.findIndex(item => item.status !== 'completed' && item.status !== 'abandoned');

    // Reset task timer and move to next uncompleted item
    setSessionState(prev => ({
      ...prev,
      taskTime: 0,
      currentTaskIndex: firstActiveIndex >= 0 ? firstActiveIndex : prev.currentTaskIndex
    }));
    
    // Clear accumulated time for completed item
    setItemSessionTimes(prev => {
      const newTimes = { ...prev };
      delete newTimes[currentItem.id];
      return newTimes;
    });
  }, [items, sessionState.currentTaskIndex, sessionState.taskTime, sessionState.currentSessionNumber, saveItemTime]);

  // Abandon current task
  const abandonCurrentTask = useCallback(async () => {
    const currentItem = items[sessionState.currentTaskIndex];
    if (!currentItem) return;

    const timeSpentSeconds = sessionState.taskTime;

    // Save time and mark as abandoned
    await supabase
      .from("campaign_items")
      .update({ 
        status: 'abandoned',
        completed_session: sessionState.currentSessionNumber,
        time_spent: (currentItem.time_spent || 0) + timeSpentSeconds
      })
      .eq("id", currentItem.id);

    // Save time to source task/project
    await saveItemTime(currentItem, timeSpentSeconds);

    // Update local items
    setItems(prev => prev.map(item => 
      item.id === currentItem.id 
        ? { 
            ...item, 
            status: 'abandoned',
            completed_session: sessionState.currentSessionNumber,
            time_spent: (item.time_spent || 0) + timeSpentSeconds 
          } 
        : item
    ));

    // Find next uncompleted item
    const updatedItems = items.map(item => 
      item.id === currentItem.id ? { ...item, status: 'abandoned' as const } : item
    );
    const nextActiveIndex = updatedItems.findIndex(
      (item, idx) => idx > sessionState.currentTaskIndex && item.status !== 'completed' && item.status !== 'abandoned'
    );
    
    const firstActiveIndex = nextActiveIndex >= 0 
      ? nextActiveIndex 
      : updatedItems.findIndex(item => item.status !== 'completed' && item.status !== 'abandoned');

    setSessionState(prev => ({
      ...prev,
      taskTime: 0,
      currentTaskIndex: firstActiveIndex >= 0 ? firstActiveIndex : prev.currentTaskIndex
    }));
    
    setItemSessionTimes(prev => {
      const newTimes = { ...prev };
      delete newTimes[currentItem.id];
      return newTimes;
    });
  }, [items, sessionState.currentTaskIndex, sessionState.taskTime, sessionState.currentSessionNumber, saveItemTime]);

  // Update item time manually
  const updateItemTimeManually = useCallback(async (itemId: string, newTimeMinutes: number) => {
    const item = items.find(i => i.id === itemId);
    if (!item || !campaign) return;

    const newTimeSeconds = newTimeMinutes * 60;
    const oldTimeSeconds = item.time_spent || 0;
    const timeDiffMinutes = newTimeMinutes - Math.ceil(oldTimeSeconds / 60);

    // Update campaign_item
    await supabase
      .from("campaign_items")
      .update({ time_spent: newTimeSeconds })
      .eq("id", itemId);

    // Update source task/project with the difference
    if (item.task_id) await incrementTaskMinutes(item.task_id, timeDiffMinutes);

    if (item.project_id) await incrementProjectMinutes(item.project_id, timeDiffMinutes);

    const parentProjectId = findParentProjectId(item);
    if (parentProjectId) await incrementProjectMinutes(parentProjectId, timeDiffMinutes);

    // Update campaign total time with the difference
    const newCampaignTotal = (campaign.time_spent || 0) + timeDiffMinutes;
    await supabase
      .from("campaigns")
      .update({ time_spent: newCampaignTotal })
      .eq("id", campaign.id);

    // Update local state
    setItems(prev => prev.map(i => 
      i.id === itemId ? { ...i, time_spent: newTimeSeconds } : i
    ));

    // Update campaign total in session state
    setSessionState(prev => ({
      ...prev,
      campaignTotalTime: newCampaignTotal
    }));
  }, [items, campaign]);

  const setItemParent = useCallback(async (itemId: string, parentItemId: string | null) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    // Prevent self-parenting and simple cycles
    if (parentItemId === itemId) return;

    await supabase
      .from("campaign_items")
      .update({ parent_item_id: parentItemId })
      .eq("id", itemId);

    // Reorder locally so children appear directly after parent (and after existing children)
    setItems((prev) => {
      const next = [...prev];
      const fromIdx = next.findIndex((i) => i.id === itemId);
      if (fromIdx < 0) return prev;
      const [moved] = next.splice(fromIdx, 1);
      moved.parent_item_id = parentItemId;

      if (!parentItemId) {
        next.push(moved);
      } else {
        const parentIdx = next.findIndex((i) => i.id === parentItemId);
        if (parentIdx < 0) {
          next.push(moved);
        } else {
          // place after the parent and its current contiguous children
          let insertAt = parentIdx + 1;
          while (insertAt < next.length && next[insertAt].parent_item_id === parentItemId) insertAt++;
          next.splice(insertAt, 0, moved);
        }
      }

      // Persist display_order
      const updates = next.map((it, idx) =>
        supabase.from("campaign_items").update({ display_order: idx }).eq("id", it.id)
      );
      Promise.all(updates);
      return next;
    });
  }, [items]);

  // Calculate total campaign time from all item times
  const calculateTotalFromItems = useCallback((itemsList: CampaignItem[], currentTaskTimeSeconds: number = 0) => {
    // Sum all item time_spent (in seconds), convert to minutes
    const totalSeconds = itemsList.reduce((sum, item) => sum + (item.time_spent || 0), 0);
    // Add any unsaved current task time
    return Math.ceil((totalSeconds + currentTaskTimeSeconds) / 60);
  }, []);

  // End session and save time to database
  const endSession = useCallback(async () => {
    pauseTimer();
    
    if (!campaign) return 0;

    // Save current task's time before ending
    const currentItem = items[sessionState.currentTaskIndex];
    if (currentItem && sessionState.taskTime > 0) {
      await saveItemTime(currentItem, sessionState.taskTime);
    }

    // Recalculate total from all items (including the just-saved current task time)
    const updatedItems = currentItem && sessionState.taskTime > 0
      ? items.map(item => 
          item.id === currentItem.id 
            ? { ...item, time_spent: (item.time_spent || 0) + sessionState.taskTime }
            : item
        )
      : items;
    
    const newTotalTime = calculateTotalFromItems(updatedItems, 0);
    const newSessionCount = (campaign.session_count || 0) + 1;

    const { error } = await supabase
      .from("campaigns")
      .update({ 
        time_spent: newTotalTime,
        session_count: newSessionCount
      })
      .eq("id", campaign.id);

    if (error) {
      console.error("Failed to save session time:", error);
    }

    return Math.ceil(sessionState.sessionTime / 60);
  }, [campaign, sessionState.sessionTime, sessionState.taskTime, sessionState.currentTaskIndex, items, pauseTimer, saveItemTime, calculateTotalFromItems]);

  // Start a new session without leaving the page
  const startNewSession = useCallback(async () => {
    pauseTimer();
    
    if (!campaign) return;

    // Save current task's time if any
    const currentItem = items[sessionState.currentTaskIndex];
    if (currentItem && sessionState.taskTime > 0) {
      await saveItemTime(currentItem, sessionState.taskTime);
    }

    // Recalculate total from all items
    const updatedItems = currentItem && sessionState.taskTime > 0
      ? items.map(item => 
          item.id === currentItem.id 
            ? { ...item, time_spent: (item.time_spent || 0) + sessionState.taskTime }
            : item
        )
      : items;
    
    const newTotalTime = calculateTotalFromItems(updatedItems, 0);
    const newSessionCount = (campaign.session_count || 0) + 1;

    await supabase
      .from("campaigns")
      .update({ 
        time_spent: newTotalTime,
        session_count: newSessionCount
      })
      .eq("id", campaign.id);

    // Reset session state for new session
    setSessionState(prev => ({
      ...prev,
      isRunning: false,
      campaignTotalTime: newTotalTime,
      sessionTime: 0,
      taskTime: 0,
      currentSessionNumber: newSessionCount + 1
    }));

    // Clear session times
    setItemSessionTimes({});
    
    // Refresh items to get updated data
    await fetchItems();
  }, [campaign, items, sessionState, pauseTimer, saveItemTime, fetchItems]);

  // Uncheck/reset a completed item
  const uncheckItem = useCallback(async (itemId: string) => {
    await supabase
      .from("campaign_items")
      .update({ 
        completed: false,
        status: 'pending',
        completed_session: null
      })
      .eq("id", itemId);

    setItems(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, completed: false, status: 'pending', completed_session: null } 
        : item
    ));
  }, []);

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
  const addTaskToCampaign = useCallback(async (taskId: string, parentItemId?: string) => {
    if (!campaign) return;

    const { data, error } = await supabase
      .from("campaign_items")
      .insert({
        campaign_id: campaign.id,
        task_id: taskId,
        display_order: items.length,
        parent_item_id: parentItemId || null
      })
      .select(`
        *,
        task:tasks(id, title, description, status, priority, time_logged),
        project:projects(id, name, description, status, time_spent)
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
        project:projects(id, name, description, status, time_spent)
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

  // Add a temporary item (pop-up quest or hidden territory) - NOT saved to main tables
  const addTemporaryItem = useCallback(async (
    type: 'task' | 'project',
    name: string,
    description: string | null
  ) => {
    if (!campaign) return;

    const { data, error } = await supabase
      .from("campaign_items")
      .insert({
        campaign_id: campaign.id,
        display_order: items.length,
        is_temporary: true,
        temporary_type: type,
        temporary_name: name,
        temporary_description: description
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      throw error;
    }

    // Create a local item representation for temporary items
    const newItem: CampaignItem = {
      ...data,
      task: type === 'task' ? {
        id: data.id, // Use campaign_item id as pseudo-task id
        title: name,
        description: description,
        status: 'pending',
        priority: 'medium',
        time_logged: 0
      } : undefined,
      project: type === 'project' ? {
        id: data.id, // Use campaign_item id as pseudo-project id
        name: name,
        description: description,
        status: 'active',
        time_spent: 0
      } : undefined
    };
    
    setItems(prev => [...prev, newItem]);
    return newItem;
  }, [campaign, items.length]);

  // Mark a temporary item as permanent (save to main tables)
  const markItemPermanent = useCallback(async (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item || !item.is_temporary) return;

    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return;

    try {
      if (item.temporary_type === 'task') {
        // Create task in main tasks table
        const { data: newTask, error } = await supabase
          .from("tasks")
          .insert({
            user_id: userId,
            title: item.temporary_name || 'Untitled Quest',
            description: item.temporary_description,
            status: 'pending',
            priority: 'medium',
            time_logged: Math.ceil((item.time_spent || 0) / 60)
          })
          .select("id")
          .single();

        if (error) throw error;

        // Update campaign_item to link to real task and clear temporary flags
        await supabase
          .from("campaign_items")
          .update({
            task_id: newTask.id,
            is_temporary: false,
            temporary_type: null,
            temporary_name: null,
            temporary_description: null
          })
          .eq("id", itemId);

        // Update local state
        setItems(prev => prev.map(i => 
          i.id === itemId 
            ? {
                ...i,
                task_id: newTask.id,
                is_temporary: false,
                temporary_type: null,
                temporary_name: null,
                temporary_description: null,
                task: {
                  id: newTask.id,
                  title: item.temporary_name || 'Untitled Quest',
                  description: item.temporary_description || null,
                  status: 'pending',
                  priority: 'medium',
                  time_logged: Math.ceil((item.time_spent || 0) / 60)
                }
              }
            : i
        ));
      } else if (item.temporary_type === 'project') {
        // Create project in main projects table
        const { data: newProject, error } = await supabase
          .from("projects")
          .insert({
            user_id: userId,
            name: item.temporary_name || 'Untitled Territory',
            description: item.temporary_description,
            status: 'active',
            time_spent: Math.ceil((item.time_spent || 0) / 60)
          })
          .select("id")
          .single();

        if (error) throw error;

        // Update campaign_item to link to real project and clear temporary flags
        await supabase
          .from("campaign_items")
          .update({
            project_id: newProject.id,
            is_temporary: false,
            temporary_type: null,
            temporary_name: null,
            temporary_description: null
          })
          .eq("id", itemId);

        // Update local state
        setItems(prev => prev.map(i => 
          i.id === itemId 
            ? {
                ...i,
                project_id: newProject.id,
                is_temporary: false,
                temporary_type: null,
                temporary_name: null,
                temporary_description: null,
                project: {
                  id: newProject.id,
                  name: item.temporary_name || 'Untitled Territory',
                  description: item.temporary_description || null,
                  status: 'active',
                  time_spent: Math.ceil((item.time_spent || 0) / 60)
                }
              }
            : i
        ));
      }

      return true;
    } catch (error) {
      console.error("Failed to mark item permanent:", error);
      throw error;
    }
  }, [items]);

  // Set current task index (only allow selecting non-completed items)
  const setCurrentTaskIndex = useCallback((index: number) => {
    const targetItem = items[index];
    if (targetItem && (targetItem.status === 'completed' || targetItem.status === 'abandoned')) {
      return; // Can't select completed/abandoned items
    }
    switchToTask(index);
  }, [items, switchToTask]);

  // Initialize
  useEffect(() => {
    if (campaign) {
      fetchItems();
      setSessionState(prev => ({
        ...prev,
        campaignTotalTime: campaign.time_spent || 0,
        currentSessionNumber: (campaign.session_count || 0) + 1
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
    itemSessionTimes,
    startTimer,
    pauseTimer,
    completeCurrentTask,
    abandonCurrentTask,
    endSession,
    startNewSession,
    reorderItems,
    addTaskToCampaign,
    addProjectToCampaign,
    addTemporaryItem,
    markItemPermanent,
    setCurrentTaskIndex,
    uncheckItem,
    updateItemTimeManually,
    setItemParent,
    refreshItems: fetchItems
  };
}
