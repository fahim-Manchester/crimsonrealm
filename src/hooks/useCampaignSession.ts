import { useState, useEffect, useCallback, useRef, useMemo } from "react";
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

// Timestamp-authoritative timer state
interface TimerState {
  isRunning: boolean;
  runningSince: number | null;        // Epoch ms when started (null if paused)
  accumulatedSessionMs: number;       // Session time already counted
  accumulatedTaskMs: number;          // Current task time already counted
  itemAccumulatedMs: Record<string, number>;  // Per-item accumulated time in ms
  currentTaskIndex: number;
  currentSessionNumber: number;
}

const STORAGE_KEY_PREFIX = 'campaignTimer:';

// Persistence helpers
const getStorageKey = (campaignId: string) => `${STORAGE_KEY_PREFIX}${campaignId}`;

const saveTimerState = (campaignId: string, state: TimerState) => {
  try {
    localStorage.setItem(getStorageKey(campaignId), JSON.stringify(state));
  } catch {
    // localStorage might be full or unavailable
  }
};

const loadTimerState = (campaignId: string): TimerState | null => {
  try {
    const stored = localStorage.getItem(getStorageKey(campaignId));
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
};

const clearTimerState = (campaignId: string) => {
  try {
    localStorage.removeItem(getStorageKey(campaignId));
  } catch {
    // ignore
  }
};

export function useCampaignSession(campaign: Campaign | null) {
  const [items, setItems] = useState<CampaignItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Timestamp-authoritative timer state
  const [timerState, setTimerState] = useState<TimerState>(() => ({
    isRunning: false,
    runningSince: null,
    accumulatedSessionMs: 0,
    accumulatedTaskMs: 0,
    itemAccumulatedMs: {},
    currentTaskIndex: 0,
    currentSessionNumber: (campaign?.session_count || 0) + 1
  }));
  
  // Tick counter for UI refresh only (not for time tracking)
  const [tick, setTick] = useState(0);
  
  // Track campaign total from DB
  const [campaignTotalTime, setCampaignTotalTime] = useState(campaign?.time_spent || 0);

  // Compute current session time in seconds (derived from timestamps)
  const sessionTimeSeconds = useMemo(() => {
    const totalMs = timerState.accumulatedSessionMs + 
      (timerState.runningSince ? Date.now() - timerState.runningSince : 0);
    return Math.floor(totalMs / 1000);
  }, [timerState.accumulatedSessionMs, timerState.runningSince, tick]);

  // Compute current task time in seconds (derived from timestamps)
  const taskTimeSeconds = useMemo(() => {
    const totalMs = timerState.accumulatedTaskMs + 
      (timerState.runningSince ? Date.now() - timerState.runningSince : 0);
    return Math.floor(totalMs / 1000);
  }, [timerState.accumulatedTaskMs, timerState.runningSince, tick]);

  // Compute per-item session times (derived from timestamps)
  const itemSessionTimes = useMemo(() => {
    const times: ItemSessionTime = {};
    const currentItem = items[timerState.currentTaskIndex];
    
    for (const [itemId, accumulatedMs] of Object.entries(timerState.itemAccumulatedMs)) {
      times[itemId] = Math.floor(accumulatedMs / 1000);
    }
    
    // Add running time for current item
    if (currentItem && timerState.runningSince) {
      const runningMs = Date.now() - timerState.runningSince;
      times[currentItem.id] = Math.floor(((timerState.itemAccumulatedMs[currentItem.id] || 0) + runningMs) / 1000);
    }
    
    return times;
  }, [items, timerState.currentTaskIndex, timerState.itemAccumulatedMs, timerState.runningSince, tick]);

  // Build session state for external consumers (backwards compatible)
  const sessionState: SessionState = useMemo(() => ({
    isRunning: timerState.isRunning,
    campaignTotalTime,
    sessionTime: sessionTimeSeconds,
    taskTime: taskTimeSeconds,
    currentTaskIndex: timerState.currentTaskIndex,
    currentSessionNumber: timerState.currentSessionNumber
  }), [timerState.isRunning, timerState.currentTaskIndex, timerState.currentSessionNumber, campaignTotalTime, sessionTimeSeconds, taskTimeSeconds]);

  // UI refresh interval (display only, not for time tracking)
  useEffect(() => {
    if (!timerState.isRunning) return;
    
    const intervalId = setInterval(() => {
      setTick(t => t + 1);
    }, 250); // Fast refresh for smooth display
    
    return () => clearInterval(intervalId);
  }, [timerState.isRunning]);

  // Visibility/focus resync - immediately recompute times when returning to tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setTick(t => t + 1); // Force immediate re-render
      } else if (document.visibilityState === 'hidden') {
        // Commit current state to localStorage on hide
        if (timerState.isRunning && campaign) {
          saveTimerState(campaign.id, timerState);
        }
      }
    };
    
    const handleFocus = () => {
      setTick(t => t + 1); // Force immediate re-render
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [timerState, campaign]);

  // Save state before tab closes (best effort)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (timerState.isRunning && campaign) {
        saveTimerState(campaign.id, timerState);
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [timerState, campaign]);

  // Hydrate timer state on mount (restore from localStorage if running)
  useEffect(() => {
    if (!campaign) return;
    
    const saved = loadTimerState(campaign.id);
    if (saved && saved.isRunning && saved.runningSince) {
      // Timer was running when page closed - restore it
      setTimerState(saved);
      setTick(t => t + 1); // Trigger immediate calculation
    }
  }, [campaign?.id]);

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

  // Decrement time from a project (for reparenting), floor at 0
  const decrementProjectMinutes = useCallback(async (projectId: string, minutes: number) => {
    if (minutes === 0) return;
    const { data, error } = await supabase
      .from("projects")
      .select("time_spent")
      .eq("id", projectId)
      .maybeSingle();
    if (error || !data) return;
    const current = data.time_spent || 0;
    const newTime = Math.max(0, current - minutes); // Never go negative
    await supabase.from("projects").update({ time_spent: newTime }).eq("id", projectId);
  }, []);

  // Build local children map for descendant calculations
  const buildLocalChildrenMap = useCallback((itemsList: CampaignItem[]) => {
    const map = new Map<string, CampaignItem[]>();
    for (const item of itemsList) {
      if (!item.parent_item_id) continue;
      const list = map.get(item.parent_item_id) || [];
      list.push(item);
      map.set(item.parent_item_id, list);
    }
    return map;
  }, []);

  // Calculate total time of an item plus all its descendants (in seconds)
  const getDescendantTotalSeconds = useCallback((itemId: string, itemsList: CampaignItem[]) => {
    const childrenMap = buildLocalChildrenMap(itemsList);
    
    const sumTime = (id: string, visited: Set<string>): number => {
      if (visited.has(id)) return 0;
      visited.add(id);
      
      const item = itemsList.find(i => i.id === id);
      if (!item) return 0;
      
      let total = item.time_spent || 0;
      const children = childrenMap.get(id) || [];
      for (const child of children) {
        total += sumTime(child.id, visited);
      }
      return total;
    };
    
    return sumTime(itemId, new Set());
  }, [buildLocalChildrenMap]);

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
      
      setCampaignTotalTime(totalMinutes);
      setTimerState(prev => ({ 
        ...prev, 
        currentTaskIndex: firstActiveIndex >= 0 ? firstActiveIndex : prev.currentTaskIndex
      }));
    }
    setLoading(false);
  }, [campaign]);

  // Start timer (timestamp-authoritative)
  const startTimer = useCallback(() => {
    if (timerState.isRunning) return;
    
    const now = Date.now();
    const newState: TimerState = {
      ...timerState,
      isRunning: true,
      runningSince: now
    };
    
    setTimerState(newState);
    
    // Save to localStorage immediately
    if (campaign) {
      saveTimerState(campaign.id, newState);
    }
  }, [timerState, campaign]);

  // Pause timer (timestamp-authoritative)
  const pauseTimer = useCallback(() => {
    if (!timerState.isRunning || !timerState.runningSince) {
      setTimerState(prev => ({ ...prev, isRunning: false }));
      return;
    }
    
    const now = Date.now();
    const elapsedSinceStart = now - timerState.runningSince;
    const currentItem = items[timerState.currentTaskIndex];
    const currentItemId = currentItem?.id;
    
    setTimerState(prev => ({
      ...prev,
      isRunning: false,
      runningSince: null,
      accumulatedSessionMs: prev.accumulatedSessionMs + elapsedSinceStart,
      accumulatedTaskMs: prev.accumulatedTaskMs + elapsedSinceStart,
      itemAccumulatedMs: currentItemId ? {
        ...prev.itemAccumulatedMs,
        [currentItemId]: (prev.itemAccumulatedMs[currentItemId] || 0) + elapsedSinceStart
      } : prev.itemAccumulatedMs
    }));
    
    // Clear from localStorage
    if (campaign) {
      clearTimerState(campaign.id);
    }
  }, [timerState, items, campaign]);

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
    const currentItem = items[timerState.currentTaskIndex];
    const now = Date.now();
    
    // Calculate time spent on current task using timestamps
    const taskElapsedMs = timerState.accumulatedTaskMs + 
      (timerState.runningSince ? now - timerState.runningSince : 0);
    const taskElapsedSeconds = Math.floor(taskElapsedMs / 1000);
    
    // Save time for current item before switching
    if (currentItem && taskElapsedSeconds > 0) {
      await saveItemTime(currentItem, taskElapsedSeconds);
      
      // Update local item with new time
      setItems(prev => prev.map(item => 
        item.id === currentItem.id 
          ? { ...item, time_spent: (item.time_spent || 0) + taskElapsedSeconds } 
          : item
      ));
    }
    
    // Get the accumulated time for the new item this session
    const newItem = items[newIndex];
    const newItemAccumulatedMs = newItem ? (timerState.itemAccumulatedMs[newItem.id] || 0) : 0;
    
    // Calculate session elapsed to accumulate before resetting runningSince
    const sessionElapsedMs = timerState.runningSince ? now - timerState.runningSince : 0;
    
    // Switch to new task, reset task timer but keep session timer running
    setTimerState(prev => ({
      ...prev,
      currentTaskIndex: newIndex,
      accumulatedTaskMs: newItemAccumulatedMs,
      accumulatedSessionMs: prev.accumulatedSessionMs + sessionElapsedMs,
      runningSince: prev.isRunning ? now : null,
      // Mark current item's time as committed
      itemAccumulatedMs: currentItem ? {
        ...prev.itemAccumulatedMs,
        [currentItem.id]: (prev.itemAccumulatedMs[currentItem.id] || 0) + 
          (prev.runningSince ? now - prev.runningSince : 0)
      } : prev.itemAccumulatedMs
    }));
  }, [items, timerState, saveItemTime]);

  // Complete current task and move to next uncompleted
  const completeCurrentTask = useCallback(async () => {
    const currentItem = items[timerState.currentTaskIndex];
    if (!currentItem) return;

    const now = Date.now();
    const taskElapsedMs = timerState.accumulatedTaskMs + 
      (timerState.runningSince ? now - timerState.runningSince : 0);
    const timeSpentSeconds = Math.floor(taskElapsedMs / 1000);

    // Save time to campaign_item and mark as completed
    await supabase
      .from("campaign_items")
      .update({ 
        completed: true,
        status: 'completed',
        completed_session: timerState.currentSessionNumber,
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
            completed_session: timerState.currentSessionNumber,
            time_spent: (item.time_spent || 0) + timeSpentSeconds 
          } 
        : item
    ));

    // Find next uncompleted item
    const updatedItems = items.map(item => 
      item.id === currentItem.id ? { ...item, status: 'completed' as const } : item
    );
    const nextActiveIndex = updatedItems.findIndex(
      (item, idx) => idx > timerState.currentTaskIndex && item.status !== 'completed' && item.status !== 'abandoned'
    );
    
    // If no next item, try from beginning
    const firstActiveIndex = nextActiveIndex >= 0 
      ? nextActiveIndex 
      : updatedItems.findIndex(item => item.status !== 'completed' && item.status !== 'abandoned');

    // Calculate session elapsed to accumulate
    const sessionElapsedMs = timerState.runningSince ? now - timerState.runningSince : 0;

    // Reset task timer and move to next uncompleted item
    setTimerState(prev => {
      const newItemAccumulatedMs = { ...prev.itemAccumulatedMs };
      delete newItemAccumulatedMs[currentItem.id];
      
      return {
        ...prev,
        accumulatedTaskMs: 0,
        accumulatedSessionMs: prev.accumulatedSessionMs + sessionElapsedMs,
        runningSince: prev.isRunning ? now : null,
        currentTaskIndex: firstActiveIndex >= 0 ? firstActiveIndex : prev.currentTaskIndex,
        itemAccumulatedMs: newItemAccumulatedMs
      };
    });
  }, [items, timerState, saveItemTime]);

  // Abandon current task
  const abandonCurrentTask = useCallback(async () => {
    const currentItem = items[timerState.currentTaskIndex];
    if (!currentItem) return;

    const now = Date.now();
    const taskElapsedMs = timerState.accumulatedTaskMs + 
      (timerState.runningSince ? now - timerState.runningSince : 0);
    const timeSpentSeconds = Math.floor(taskElapsedMs / 1000);

    // Save time and mark as abandoned
    await supabase
      .from("campaign_items")
      .update({ 
        status: 'abandoned',
        completed_session: timerState.currentSessionNumber,
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
            completed_session: timerState.currentSessionNumber,
            time_spent: (item.time_spent || 0) + timeSpentSeconds 
          } 
        : item
    ));

    // Find next uncompleted item
    const updatedItems = items.map(item => 
      item.id === currentItem.id ? { ...item, status: 'abandoned' as const } : item
    );
    const nextActiveIndex = updatedItems.findIndex(
      (item, idx) => idx > timerState.currentTaskIndex && item.status !== 'completed' && item.status !== 'abandoned'
    );
    
    const firstActiveIndex = nextActiveIndex >= 0 
      ? nextActiveIndex 
      : updatedItems.findIndex(item => item.status !== 'completed' && item.status !== 'abandoned');

    // Calculate session elapsed to accumulate
    const sessionElapsedMs = timerState.runningSince ? now - timerState.runningSince : 0;

    setTimerState(prev => {
      const newItemAccumulatedMs = { ...prev.itemAccumulatedMs };
      delete newItemAccumulatedMs[currentItem.id];
      
      return {
        ...prev,
        accumulatedTaskMs: 0,
        accumulatedSessionMs: prev.accumulatedSessionMs + sessionElapsedMs,
        runningSince: prev.isRunning ? now : null,
        currentTaskIndex: firstActiveIndex >= 0 ? firstActiveIndex : prev.currentTaskIndex,
        itemAccumulatedMs: newItemAccumulatedMs
      };
    });
  }, [items, timerState, saveItemTime]);

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
    setCampaignTotalTime(newCampaignTotal);
  }, [items, campaign, incrementTaskMinutes, incrementProjectMinutes, findParentProjectId]);

  const setItemParent = useCallback(async (itemId: string, parentItemId: string | null): Promise<{ blocked: boolean; reason?: string }> => {
    // Block if campaign is completed
    if (campaign?.status === 'completed') {
      return { blocked: true, reason: 'completed' };
    }

    const item = items.find((i) => i.id === itemId);
    if (!item) return { blocked: false };

    // Prevent self-parenting and simple cycles
    if (parentItemId === itemId) return { blocked: false };

    // Calculate total time of moved subtree (self + all descendants)
    const movedTimeSeconds = getDescendantTotalSeconds(itemId, items);
    const movedTimeMinutes = Math.ceil(movedTimeSeconds / 60);

    // Find old parent's project (if any) - only direct parent that is a Territory
    const oldParent = item.parent_item_id ? items.find(i => i.id === item.parent_item_id) : null;
    const oldParentProjectId = oldParent?.project_id || null;

    // Find new parent's project (if any)
    const newParent = parentItemId ? items.find(i => i.id === parentItemId) : null;
    const newParentProjectId = newParent?.project_id || null;

    // Sync time changes to source projects only if parents changed and are territories
    if (oldParentProjectId !== newParentProjectId && movedTimeMinutes > 0) {
      // Subtract from old parent's source project
      if (oldParentProjectId) {
        await decrementProjectMinutes(oldParentProjectId, movedTimeMinutes);
      }

      // Add to new parent's source project
      if (newParentProjectId) {
        await incrementProjectMinutes(newParentProjectId, movedTimeMinutes);
      }
    }

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

    return { blocked: false };
  }, [items, campaign, getDescendantTotalSeconds, decrementProjectMinutes, incrementProjectMinutes]);

  // Calculate total campaign time from all item times
  const calculateTotalFromItems = useCallback((itemsList: CampaignItem[], currentTaskTimeSeconds: number = 0) => {
    // Sum all item time_spent (in seconds), convert to minutes
    const totalSeconds = itemsList.reduce((sum, item) => sum + (item.time_spent || 0), 0);
    // Add any unsaved current task time
    return Math.ceil((totalSeconds + currentTaskTimeSeconds) / 60);
  }, []);

  // End session and save time to database
  const endSession = useCallback(async () => {
    // Pause first to commit any running time
    pauseTimer();
    
    if (!campaign) return 0;

    // Calculate current task time from accumulated state
    const currentTaskTimeSeconds = Math.floor(timerState.accumulatedTaskMs / 1000);

    // Save current task's time before ending
    const currentItem = items[timerState.currentTaskIndex];
    if (currentItem && currentTaskTimeSeconds > 0) {
      await saveItemTime(currentItem, currentTaskTimeSeconds);
    }

    // Recalculate total from all items (including the just-saved current task time)
    const updatedItems = currentItem && currentTaskTimeSeconds > 0
      ? items.map(item => 
          item.id === currentItem.id 
            ? { ...item, time_spent: (item.time_spent || 0) + currentTaskTimeSeconds }
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

    // Clear localStorage
    clearTimerState(campaign.id);

    return Math.floor((timerState.accumulatedSessionMs) / 60000);
  }, [campaign, timerState, items, pauseTimer, saveItemTime, calculateTotalFromItems]);

  // Start a new session without leaving the page
  const startNewSession = useCallback(async () => {
    // Pause first to commit any running time
    pauseTimer();
    
    if (!campaign) return;

    // Calculate current task time from accumulated state
    const currentTaskTimeSeconds = Math.floor(timerState.accumulatedTaskMs / 1000);

    // Save current task's time if any
    const currentItem = items[timerState.currentTaskIndex];
    if (currentItem && currentTaskTimeSeconds > 0) {
      await saveItemTime(currentItem, currentTaskTimeSeconds);
    }

    // Recalculate total from all items
    const updatedItems = currentItem && currentTaskTimeSeconds > 0
      ? items.map(item => 
          item.id === currentItem.id 
            ? { ...item, time_spent: (item.time_spent || 0) + currentTaskTimeSeconds }
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

    // Reset timer state for new session
    setTimerState(prev => ({
      isRunning: false,
      runningSince: null,
      accumulatedSessionMs: 0,
      accumulatedTaskMs: 0,
      itemAccumulatedMs: {},
      currentTaskIndex: prev.currentTaskIndex,
      currentSessionNumber: newSessionCount + 1
    }));

    setCampaignTotalTime(newTotalTime);
    
    // Clear localStorage
    clearTimerState(campaign.id);
    
    // Refresh items to get updated data
    await fetchItems();
  }, [campaign, items, timerState, pauseTimer, saveItemTime, fetchItems, calculateTotalFromItems]);

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
      setCampaignTotalTime(campaign.time_spent || 0);
      setTimerState(prev => ({
        ...prev,
        currentSessionNumber: (campaign.session_count || 0) + 1
      }));
    }
  }, [campaign, fetchItems]);

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
