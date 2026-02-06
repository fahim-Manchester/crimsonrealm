import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Campaign, CampaignItem } from "@/hooks/useCampaigns";

export interface SessionState {
  isRunning: boolean;
  campaignTotalTime: number; // Total time from DB (in minutes)
  sessionTime: number; // Time this session (in seconds)
  taskTime: number; // Time on current task in this session (in seconds)
  currentTaskIndex: number; // Backwards-compatible index for UI
  currentSessionNumber: number;
  timedTaskId: string | null; // NEW: The actual task being timed (by ID)
  selectedTaskId: string | null; // NEW: The task currently selected in UI (separate from timing)
}

// Track accumulated time per item during this session
export interface ItemSessionTime {
  [itemId: string]: number; // seconds spent on this item this session
}

// Timestamp-authoritative timer state
interface TimerState {
  isRunning: boolean;
  runningSinceMs: number | null;        // Epoch ms when started (null if paused)
  sessionAccumulatedMs: number;         // Session time already counted
  taskAccumulatedMs: number;            // Current task time already counted
  itemAccumulatedMs: Record<string, number>;  // Per-item accumulated time in ms
  timedTaskId: string | null;           // ID-based: which task is being timed
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
    const parsed = JSON.parse(stored);
    // Migration: convert old currentTaskIndex-based state to new timedTaskId-based state
    if (parsed && typeof parsed.currentTaskIndex === 'number' && !parsed.timedTaskId) {
      // Old format - will be migrated after items load
      return {
        ...parsed,
        timedTaskId: null // Will be set from items
      };
    }
    return parsed;
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

const createDefaultTimerState = (sessionNumber: number): TimerState => ({
  isRunning: false,
  runningSinceMs: null,
  sessionAccumulatedMs: 0,
  taskAccumulatedMs: 0,
  itemAccumulatedMs: {},
  timedTaskId: null,
  currentSessionNumber: sessionNumber
});

export function useCampaignSession(campaign: Campaign | null) {
  const [items, setItems] = useState<CampaignItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Separate UI selection from timing - selecting a task does NOT start timing!
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  
  // Timestamp-authoritative timer state
  const [timerState, setTimerState] = useState<TimerState>(() => 
    createDefaultTimerState((campaign?.session_count || 0) + 1)
  );
  
  // CRITICAL: Ref for synchronous access in event handlers (fixes stale closure issue)
  const timerStateRef = useRef(timerState);
  useEffect(() => { timerStateRef.current = timerState; }, [timerState]);
  
  const campaignRef = useRef(campaign);
  useEffect(() => { campaignRef.current = campaign; }, [campaign]);
  
  const itemsRef = useRef(items);
  useEffect(() => { itemsRef.current = items; }, [items]);
  
  // Track whether we've hydrated from localStorage
  const hydratedRef = useRef(false);
  
  // Tick counter for UI refresh only (not for time tracking)
  const [tick, setTick] = useState(0);
  
  // Track campaign total from DB
  const [campaignTotalTime, setCampaignTotalTime] = useState(campaign?.time_spent || 0);

  // Compute current session time in seconds (derived from timestamps)
  const sessionTimeSeconds = useMemo(() => {
    const totalMs = timerState.sessionAccumulatedMs + 
      (timerState.runningSinceMs ? Date.now() - timerState.runningSinceMs : 0);
    return Math.floor(totalMs / 1000);
  }, [timerState.sessionAccumulatedMs, timerState.runningSinceMs, tick]);

  // Compute current task time in seconds (derived from timestamps)
  const taskTimeSeconds = useMemo(() => {
    const totalMs = timerState.taskAccumulatedMs + 
      (timerState.runningSinceMs ? Date.now() - timerState.runningSinceMs : 0);
    return Math.floor(totalMs / 1000);
  }, [timerState.taskAccumulatedMs, timerState.runningSinceMs, tick]);

  // Compute per-item session times (derived from timestamps)
  // FIXED: Show accumulated time for ALL items, not just timed item
  // Only add running time if timer is genuinely running
  const itemSessionTimes = useMemo(() => {
    const times: ItemSessionTime = {};
    
    // Populate ALL items from their accumulated session time (committed ms)
    for (const [itemId, accumulatedMs] of Object.entries(timerState.itemAccumulatedMs)) {
      times[itemId] = Math.floor(accumulatedMs / 1000);
    }
    
    // Add running time ONLY for the currently timed item AND only if timer is running
    // This is the key invariant: running time is only added to display, never to itemAccumulatedMs
    // until an explicit user action (pause/switch/complete/end)
    if (timerState.isRunning && timerState.timedTaskId && timerState.runningSinceMs) {
      const runningMs = Date.now() - timerState.runningSinceMs;
      const accumulatedMs = timerState.itemAccumulatedMs[timerState.timedTaskId] || 0;
      times[timerState.timedTaskId] = Math.floor((accumulatedMs + runningMs) / 1000);
    }
    
    return times;
  }, [timerState.isRunning, timerState.timedTaskId, timerState.itemAccumulatedMs, timerState.runningSinceMs, tick]);

  // Get current task index from timedTaskId (for backwards compatibility)
  const currentTaskIndex = useMemo(() => {
    if (!timerState.timedTaskId) {
      // Fall back to first non-completed item
      const firstActive = items.findIndex(i => i.status !== 'completed' && i.status !== 'abandoned');
      return firstActive >= 0 ? firstActive : 0;
    }
    const idx = items.findIndex(i => i.id === timerState.timedTaskId);
    return idx >= 0 ? idx : 0;
  }, [items, timerState.timedTaskId]);

  // Build session state for external consumers (backwards compatible)
  const sessionState: SessionState = useMemo(() => ({
    isRunning: timerState.isRunning,
    campaignTotalTime,
    sessionTime: sessionTimeSeconds,
    taskTime: taskTimeSeconds,
    currentTaskIndex,
    currentSessionNumber: timerState.currentSessionNumber,
    timedTaskId: timerState.timedTaskId,
    selectedTaskId
  }), [
    timerState.isRunning, 
    timerState.currentSessionNumber, 
    timerState.timedTaskId,
    campaignTotalTime, 
    sessionTimeSeconds, 
    taskTimeSeconds,
    currentTaskIndex,
    selectedTaskId
  ]);

  // UI refresh interval (display only, not for time tracking)
  useEffect(() => {
    if (!timerState.isRunning) return;
    
    const intervalId = setInterval(() => {
      setTick(t => t + 1);
    }, 250); // Fast refresh for smooth display
    
    return () => clearInterval(intervalId);
  }, [timerState.isRunning]);

  // Track last commit time for periodic commits
  const lastCommitRef = useRef<number>(Date.now());
  const COMMIT_INTERVAL_MS = 90_000; // 90 seconds

  // Visibility/focus resync - uses refs to avoid stale closures
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setTick(t => t + 1); // Force immediate re-render
      } else if (document.visibilityState === 'hidden') {
        // Commit current state to localStorage on hide using REF (not state)
        const currentState = timerStateRef.current;
        const currentCampaign = campaignRef.current;
        if (currentState.isRunning && currentCampaign) {
          saveTimerState(currentCampaign.id, currentState);
        }
      }
    };
    
    const handleFocus = () => {
      setTick(t => t + 1); // Force immediate re-render
    };
    
    // pagehide is more reliable on mobile than beforeunload
    const handlePageHide = () => {
      const currentState = timerStateRef.current;
      const currentCampaign = campaignRef.current;
      if (currentState.isRunning && currentCampaign) {
        saveTimerState(currentCampaign.id, currentState);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('pagehide', handlePageHide);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, []); // Empty deps - handlers use refs

  // Save state before tab closes (best effort) - uses refs
  useEffect(() => {
    const handleBeforeUnload = () => {
      const currentState = timerStateRef.current;
      const currentCampaign = campaignRef.current;
      if (currentState.isRunning && currentCampaign) {
        saveTimerState(currentCampaign.id, currentState);
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []); // Empty deps - handler uses refs

  // Periodic persistence while running (NO database writes).
  // The previous periodic DB commit rounded to minutes and also caused totals to drift/double-count.
  // We only persist locally here; DB writes happen on explicit actions (pause/switch/complete/end).
  useEffect(() => {
    if (!timerState.isRunning || !campaign) return;

    const intervalId = setInterval(() => {
      // Avoid work in background tabs; we persist on visibility/pagehide too.
      if (document.visibilityState !== 'visible') return;

      const now = Date.now();
      const msSinceLastCommit = now - lastCommitRef.current;
      if (msSinceLastCommit < COMMIT_INTERVAL_MS) return;

      const currentState = timerStateRef.current;
      const currentCampaign = campaignRef.current;
      if (currentCampaign) {
        saveTimerState(currentCampaign.id, currentState);
      }

      lastCommitRef.current = now;
    }, 30_000); // Check every 30 seconds

    return () => clearInterval(intervalId);
  }, [timerState.isRunning, campaign?.id]);

  // Hydrate timer state on mount - BEFORE items fetch
  // ENHANCED: Validate timer state sanity on reload to prevent hallucinated time
  useEffect(() => {
    if (!campaign || hydratedRef.current) return;
    
    const saved = loadTimerState(campaign.id);
    if (saved) {
      // GUARD 1: If isRunning but runningSinceMs is missing, force pause (corrupted state)
      if (saved.isRunning && !saved.runningSinceMs) {
        console.warn('Timer marked running but runningSinceMs missing - auto-pausing');
        const pausedState: TimerState = {
          ...saved,
          isRunning: false,
          runningSinceMs: null
        };
        setTimerState(pausedState);
        saveTimerState(campaign.id, pausedState);
        if (saved.timedTaskId) setSelectedTaskId(saved.timedTaskId);
        hydratedRef.current = true;
        return;
      }
      
      // GUARD 2: If runningSinceMs is stale (> 4 hours), auto-pause and show warning
      // Do NOT auto-add the elapsed time - let user decide
      if (saved.isRunning && saved.runningSinceMs) {
        const elapsedMs = Date.now() - saved.runningSinceMs;
        const elapsedHours = elapsedMs / 3600000;
        
        if (elapsedHours > 4) {
          console.warn(`Timer was running for ${elapsedHours.toFixed(1)}h - auto-pausing without adding time`);
          
          // Pause without adding the stale time - user can manually adjust if needed
          const pausedState: TimerState = {
            ...saved,
            isRunning: false,
            runningSinceMs: null
            // Importantly: NOT adding elapsedMs to accumulated values
          };
          
          setTimerState(pausedState);
          saveTimerState(campaign.id, pausedState);
          if (saved.timedTaskId) setSelectedTaskId(saved.timedTaskId);
          hydratedRef.current = true;
          // Toast will be shown by the component if needed
          return;
        }
        
        // Valid running state (< 4 hours) - restore it
        setTimerState(saved);
        setTick(t => t + 1); // Trigger immediate calculation
      } else {
        // Paused state - restore accumulated values
        setTimerState(saved);
      }
      
      // Set selected task to match timed task initially
      if (saved.timedTaskId) {
        setSelectedTaskId(saved.timedTaskId);
      }
    }
    hydratedRef.current = true;
  }, [campaign?.id]);

  const findParentProjectId = useCallback((item: CampaignItem) => {
    const currentItems = itemsRef.current;
    const guard = new Set<string>();
    let cursor: CampaignItem | undefined = item;
    while (cursor?.parent_item_id) {
      if (guard.has(cursor.id)) break;
      guard.add(cursor.id);

      const parent = currentItems.find((i) => i.id === cursor!.parent_item_id);
      if (!parent) break;
      if (parent.project_id) return parent.project_id;
      cursor = parent;
    }
    return null;
  }, []);

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
    const newTime = Math.max(0, current - minutes);
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

  // Fetch campaign items - does NOT override timedTaskId from localStorage
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
      
      // Calculate campaign total from all item times
      const totalSeconds = mappedItems.reduce((sum, item) => sum + (item.time_spent || 0), 0);
      const totalMinutes = Math.ceil(totalSeconds / 60);
      setCampaignTotalTime(totalMinutes);
      
      // Validate timedTaskId still exists - if not, clear it
      setTimerState(prev => {
        if (prev.timedTaskId) {
          const stillExists = mappedItems.find(i => i.id === prev.timedTaskId);
          if (!stillExists) {
            // Task was deleted, find first active task
            const firstActive = mappedItems.find(i => i.status !== 'completed' && i.status !== 'abandoned');
            return {
              ...prev,
              timedTaskId: firstActive?.id || null,
              taskAccumulatedMs: 0 // Reset since task no longer exists
            };
          }
        }
        return prev;
      });
      
      // If no selected task yet, select first active
      if (!selectedTaskId) {
        const firstActive = mappedItems.find(i => i.status !== 'completed' && i.status !== 'abandoned');
        if (firstActive) {
          setSelectedTaskId(firstActive.id);
        }
      }
    }
    setLoading(false);
  }, [campaign, selectedTaskId]);

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

    // If it's nested under a territory, also attribute time to that territory
    const parentProjectId = findParentProjectId(item);
    if (parentProjectId) await incrementProjectMinutes(parentProjectId, timeSpentMinutes);
  }, [findParentProjectId, incrementProjectMinutes, incrementTaskMinutes]);

  // Start timer on currently selected task (or specified task)
  const startTimer = useCallback((taskId?: string) => {
    if (timerState.isRunning) return;
    
    const targetTaskId = taskId || selectedTaskId;
    if (!targetTaskId) {
      // Find first active task
      const firstActive = items.find(i => i.status !== 'completed' && i.status !== 'abandoned');
      if (!firstActive) return;
      setSelectedTaskId(firstActive.id);
    }
    
    const now = Date.now();
    const actualTaskId = targetTaskId || items.find(i => i.status !== 'completed' && i.status !== 'abandoned')?.id;
    
    if (!actualTaskId) return;
    
    const newState: TimerState = {
      ...timerState,
      isRunning: true,
      runningSinceMs: now,
      timedTaskId: actualTaskId,
      // If switching to a different task, reset task time
      taskAccumulatedMs: timerState.timedTaskId === actualTaskId 
        ? timerState.taskAccumulatedMs 
        : (timerState.itemAccumulatedMs[actualTaskId] || 0)
    };
    
    setTimerState(newState);
    setSelectedTaskId(actualTaskId);
    
    // Save to localStorage immediately
    if (campaign) {
      saveTimerState(campaign.id, newState);
    }
  }, [timerState, selectedTaskId, items, campaign]);

  // Pause timer
  const pauseTimer = useCallback(() => {
    if (!timerState.isRunning) {
      setTimerState(prev => ({ ...prev, isRunning: false }));
      return;
    }
    
    const now = Date.now();
    const elapsedSinceStart = timerState.runningSinceMs ? now - timerState.runningSinceMs : 0;
    const currentItemId = timerState.timedTaskId;
    
    const newState: TimerState = {
      ...timerState,
      isRunning: false,
      runningSinceMs: null,
      sessionAccumulatedMs: timerState.sessionAccumulatedMs + elapsedSinceStart,
      taskAccumulatedMs: timerState.taskAccumulatedMs + elapsedSinceStart,
      itemAccumulatedMs: currentItemId ? {
        ...timerState.itemAccumulatedMs,
        [currentItemId]: (timerState.itemAccumulatedMs[currentItemId] || 0) + elapsedSinceStart
      } : timerState.itemAccumulatedMs
    };
    
    setTimerState(newState);
    
    // Save paused state (so we can restore accumulated time on reload)
    if (campaign) {
      saveTimerState(campaign.id, newState);
    }
  }, [timerState, campaign]);

  // Switch to a different task - ONLY affects timing if timer is running
  // FIXED: Remove DB saves from switchToTask - let endSession handle ALL persistence
  // This prevents double-saving and ensures time is never lost
  const switchToTask = useCallback(async (newTaskId: string) => {
    const currentItems = itemsRef.current;
    const newItem = currentItems.find(i => i.id === newTaskId);
    if (!newItem || newItem.status === 'completed' || newItem.status === 'abandoned') return;
    
    const currentState = timerStateRef.current;
    
    // GUARD: If timer was NOT actually running, just update selection - no time commits
    if (!currentState.isRunning || !currentState.runningSinceMs) {
      // Timer not running - just switch task ID, don't commit any time
      setTimerState(prev => ({
        ...prev,
        timedTaskId: newTaskId,
        taskAccumulatedMs: prev.itemAccumulatedMs[newTaskId] || 0
      }));
      setSelectedTaskId(newTaskId);
      return;
    }
    
    // Timer IS running - commit time to itemAccumulatedMs (NO DB saves here!)
    // All DB persistence happens in endSession/startNewSession
    const currentItem = currentState.timedTaskId 
      ? currentItems.find(i => i.id === currentState.timedTaskId)
      : null;
    
    const now = Date.now();
    const sessionElapsedMs = now - currentState.runningSinceMs;
    const newItemAccumulatedMs = timerStateRef.current.itemAccumulatedMs[newTaskId] || 0;
    
    // Switch to new task - commit old task time to itemAccumulatedMs, reset for new task
    setTimerState(prev => {
      const updatedItemAccumulatedMs = { ...prev.itemAccumulatedMs };
      
      // Commit the running time for the old item to itemAccumulatedMs ONLY
      // This ensures time is tracked but NOT saved to DB until endSession
      if (currentItem && prev.runningSinceMs) {
        updatedItemAccumulatedMs[currentItem.id] = 
          (prev.itemAccumulatedMs[currentItem.id] || 0) + (now - prev.runningSinceMs);
      }
      
      return {
        ...prev,
        timedTaskId: newTaskId,
        taskAccumulatedMs: newItemAccumulatedMs,
        sessionAccumulatedMs: prev.sessionAccumulatedMs + sessionElapsedMs,
        runningSinceMs: now, // Timer continues running on new task
        itemAccumulatedMs: updatedItemAccumulatedMs
      };
    });
    
    setSelectedTaskId(newTaskId);
  }, []);

  // Complete current task and move to next uncompleted
  const completeCurrentTask = useCallback(async () => {
    const currentItems = itemsRef.current;
    const currentState = timerStateRef.current;
    const currentItem = currentState.timedTaskId 
      ? currentItems.find(i => i.id === currentState.timedTaskId)
      : null;
      
    if (!currentItem) return;

    const now = Date.now();
    const taskElapsedMs = currentState.taskAccumulatedMs + 
      (currentState.runningSinceMs ? now - currentState.runningSinceMs : 0);
    const timeSpentSeconds = Math.floor(taskElapsedMs / 1000);

    // Save time to campaign_item and mark as completed
    await supabase
      .from("campaign_items")
      .update({ 
        completed: true,
        status: 'completed',
        completed_session: currentState.currentSessionNumber,
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
            completed_session: currentState.currentSessionNumber,
            time_spent: (item.time_spent || 0) + timeSpentSeconds 
          } 
        : item
    ));

    // Find next uncompleted item
    const currentIndex = currentItems.findIndex(i => i.id === currentItem.id);
    const updatedItems = currentItems.map(item => 
      item.id === currentItem.id ? { ...item, status: 'completed' as const } : item
    );
    
    const nextActiveIndex = updatedItems.findIndex(
      (item, idx) => idx > currentIndex && item.status !== 'completed' && item.status !== 'abandoned'
    );
    
    const firstActiveItem = nextActiveIndex >= 0 
      ? updatedItems[nextActiveIndex]
      : updatedItems.find(item => item.status !== 'completed' && item.status !== 'abandoned');

    const sessionElapsedMs = currentState.runningSinceMs ? now - currentState.runningSinceMs : 0;

    // Reset task timer and move to next uncompleted item
    setTimerState(prev => {
      const newItemAccumulatedMs = { ...prev.itemAccumulatedMs };
      delete newItemAccumulatedMs[currentItem.id];
      
      return {
        ...prev,
        taskAccumulatedMs: 0,
        sessionAccumulatedMs: prev.sessionAccumulatedMs + sessionElapsedMs,
        runningSinceMs: prev.isRunning ? now : null,
        timedTaskId: firstActiveItem?.id || null,
        itemAccumulatedMs: newItemAccumulatedMs
      };
    });
    
    if (firstActiveItem) {
      setSelectedTaskId(firstActiveItem.id);
    }
  }, [saveItemTime]);

  // Abandon current task
  const abandonCurrentTask = useCallback(async () => {
    const currentItems = itemsRef.current;
    const currentState = timerStateRef.current;
    const currentItem = currentState.timedTaskId 
      ? currentItems.find(i => i.id === currentState.timedTaskId)
      : null;
      
    if (!currentItem) return;

    const now = Date.now();
    const taskElapsedMs = currentState.taskAccumulatedMs + 
      (currentState.runningSinceMs ? now - currentState.runningSinceMs : 0);
    const timeSpentSeconds = Math.floor(taskElapsedMs / 1000);

    // Save time and mark as abandoned
    await supabase
      .from("campaign_items")
      .update({ 
        status: 'abandoned',
        completed_session: currentState.currentSessionNumber,
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
            completed_session: currentState.currentSessionNumber,
            time_spent: (item.time_spent || 0) + timeSpentSeconds 
          } 
        : item
    ));

    // Find next uncompleted item
    const currentIndex = currentItems.findIndex(i => i.id === currentItem.id);
    const updatedItems = currentItems.map(item => 
      item.id === currentItem.id ? { ...item, status: 'abandoned' as const } : item
    );
    
    const nextActiveIndex = updatedItems.findIndex(
      (item, idx) => idx > currentIndex && item.status !== 'completed' && item.status !== 'abandoned'
    );
    
    const firstActiveItem = nextActiveIndex >= 0 
      ? updatedItems[nextActiveIndex]
      : updatedItems.find(item => item.status !== 'completed' && item.status !== 'abandoned');

    const sessionElapsedMs = currentState.runningSinceMs ? now - currentState.runningSinceMs : 0;

    setTimerState(prev => {
      const newItemAccumulatedMs = { ...prev.itemAccumulatedMs };
      delete newItemAccumulatedMs[currentItem.id];
      
      return {
        ...prev,
        taskAccumulatedMs: 0,
        sessionAccumulatedMs: prev.sessionAccumulatedMs + sessionElapsedMs,
        runningSinceMs: prev.isRunning ? now : null,
        timedTaskId: firstActiveItem?.id || null,
        itemAccumulatedMs: newItemAccumulatedMs
      };
    });
    
    if (firstActiveItem) {
      setSelectedTaskId(firstActiveItem.id);
    }
  }, [saveItemTime]);

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

    setCampaignTotalTime(newCampaignTotal);
  }, [items, campaign, incrementTaskMinutes, incrementProjectMinutes, findParentProjectId]);

  const setItemParent = useCallback(async (itemId: string, parentItemId: string | null): Promise<{ blocked: boolean; reason?: string }> => {
    if (campaign?.status === 'completed') {
      return { blocked: true, reason: 'completed' };
    }

    const item = items.find((i) => i.id === itemId);
    if (!item) return { blocked: false };

    if (parentItemId === itemId) return { blocked: false };

    const movedTimeSeconds = getDescendantTotalSeconds(itemId, items);
    const movedTimeMinutes = Math.ceil(movedTimeSeconds / 60);

    const oldParent = item.parent_item_id ? items.find(i => i.id === item.parent_item_id) : null;
    const oldParentProjectId = oldParent?.project_id || null;

    const newParent = parentItemId ? items.find(i => i.id === parentItemId) : null;
    const newParentProjectId = newParent?.project_id || null;

    if (oldParentProjectId !== newParentProjectId && movedTimeMinutes > 0) {
      if (oldParentProjectId) {
        await decrementProjectMinutes(oldParentProjectId, movedTimeMinutes);
      }
      if (newParentProjectId) {
        await incrementProjectMinutes(newParentProjectId, movedTimeMinutes);
      }
    }

    await supabase
      .from("campaign_items")
      .update({ parent_item_id: parentItemId })
      .eq("id", itemId);

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
          let insertAt = parentIdx + 1;
          while (insertAt < next.length && next[insertAt].parent_item_id === parentItemId) insertAt++;
          next.splice(insertAt, 0, moved);
        }
      }

      const updates = next.map((it, idx) =>
        supabase.from("campaign_items").update({ display_order: idx }).eq("id", it.id)
      );
      Promise.all(updates);
      return next;
    });

    return { blocked: false };
  }, [items, campaign, getDescendantTotalSeconds, decrementProjectMinutes, incrementProjectMinutes]);

  const calculateTotalFromItems = useCallback((itemsList: CampaignItem[], currentTaskTimeSeconds: number = 0) => {
    const totalSeconds = itemsList.reduce((sum, item) => sum + (item.time_spent || 0), 0);
    return Math.ceil((totalSeconds + currentTaskTimeSeconds) / 60);
  }, []);

  // End session and save time to database
  // FIXED: Save ALL accumulated item times, not just the current task
  // This ensures time is never lost when switching between tasks during a session
  const endSession = useCallback(async () => {
    if (!campaign) return 0;

    // Get current state BEFORE pausing (so we can compute running time)
    const currentState = timerStateRef.current;
    const currentItems = itemsRef.current;
    const now = Date.now();
    
    // Compute final accumulated values inline (including any running time)
    // This ensures we don't lose time due to async state updates
    const elapsedSinceStart = currentState.isRunning && currentState.runningSinceMs 
      ? now - currentState.runningSinceMs 
      : 0;
    
    // Build final itemAccumulatedMs with running time added for current task
    const finalItemAccumulatedMs = { ...currentState.itemAccumulatedMs };
    if (currentState.timedTaskId && elapsedSinceStart > 0) {
      finalItemAccumulatedMs[currentState.timedTaskId] = 
        (finalItemAccumulatedMs[currentState.timedTaskId] || 0) + elapsedSinceStart;
    }
    
    // Now pause the timer (clears running state)
    pauseTimer();
    
    // Save time for ALL items that accumulated time this session
    let updatedItems = [...currentItems];
    for (const [itemId, accumulatedMs] of Object.entries(finalItemAccumulatedMs)) {
      const timeSeconds = Math.floor(accumulatedMs / 1000);
      if (timeSeconds <= 0) continue;
      
      const item = currentItems.find(i => i.id === itemId);
      if (!item) continue;
      
      // Save to database
      await saveItemTime(item, timeSeconds);
      
      // Update local items array
      updatedItems = updatedItems.map(i => 
        i.id === itemId 
          ? { ...i, time_spent: (i.time_spent || 0) + timeSeconds }
          : i
      );
    }
    
    // Update local state with all the saved times
    setItems(updatedItems);
    
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

    clearTimerState(campaign.id);

    const finalSessionMs = currentState.sessionAccumulatedMs + elapsedSinceStart;
    return Math.floor(finalSessionMs / 60000);
  }, [campaign, pauseTimer, saveItemTime, calculateTotalFromItems]);

  // Start a new session without leaving the page
  // FIXED: Save ALL accumulated item times, not just the current task
  const startNewSession = useCallback(async () => {
    if (!campaign) return;

    // Get current state BEFORE pausing (so we can compute running time)
    const currentState = timerStateRef.current;
    const currentItems = itemsRef.current;
    const now = Date.now();
    
    // Compute final accumulated values inline (including any running time)
    const elapsedSinceStart = currentState.isRunning && currentState.runningSinceMs 
      ? now - currentState.runningSinceMs 
      : 0;
    
    // Build final itemAccumulatedMs with running time added for current task
    const finalItemAccumulatedMs = { ...currentState.itemAccumulatedMs };
    if (currentState.timedTaskId && elapsedSinceStart > 0) {
      finalItemAccumulatedMs[currentState.timedTaskId] = 
        (finalItemAccumulatedMs[currentState.timedTaskId] || 0) + elapsedSinceStart;
    }
    
    // Now pause the timer
    pauseTimer();
    
    // Save time for ALL items that accumulated time this session
    let updatedItems = [...currentItems];
    for (const [itemId, accumulatedMs] of Object.entries(finalItemAccumulatedMs)) {
      const timeSeconds = Math.floor(accumulatedMs / 1000);
      if (timeSeconds <= 0) continue;
      
      const item = currentItems.find(i => i.id === itemId);
      if (!item) continue;
      
      // Save to database
      await saveItemTime(item, timeSeconds);
      
      // Update local items array
      updatedItems = updatedItems.map(i => 
        i.id === itemId 
          ? { ...i, time_spent: (i.time_spent || 0) + timeSeconds }
          : i
      );
    }
    
    const newTotalTime = calculateTotalFromItems(updatedItems, 0);
    const newSessionCount = (campaign.session_count || 0) + 1;

    await supabase
      .from("campaigns")
      .update({ 
        time_spent: newTotalTime,
        session_count: newSessionCount
      })
      .eq("id", campaign.id);

    // Find first active task for new session
    const firstActive = currentItems.find(i => i.status !== 'completed' && i.status !== 'abandoned');

    setTimerState({
      isRunning: false,
      runningSinceMs: null,
      sessionAccumulatedMs: 0,
      taskAccumulatedMs: 0,
      itemAccumulatedMs: {},
      timedTaskId: firstActive?.id || null,
      currentSessionNumber: newSessionCount + 1
    });

    if (firstActive) {
      setSelectedTaskId(firstActive.id);
    }

    setCampaignTotalTime(newTotalTime);
    clearTimerState(campaign.id);
    await fetchItems();
  }, [campaign, pauseTimer, saveItemTime, fetchItems, calculateTotalFromItems]);

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

  // Add a temporary item (pop-up quest or hidden territory)
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

    const newItem: CampaignItem = {
      ...data,
      task: type === 'task' ? {
        id: data.id,
        title: name,
        description: description,
        status: 'pending',
        priority: 'medium',
        time_logged: 0
      } : undefined,
      project: type === 'project' ? {
        id: data.id,
        name: name,
        description: description,
        status: 'active',
        time_spent: 0
      } : undefined
    };
    
    setItems(prev => [...prev, newItem]);
    return newItem;
  }, [campaign, items.length]);

  // Mark a temporary item as permanent
  const markItemPermanent = useCallback(async (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item || !item.is_temporary) return;

    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return;

    try {
      if (item.temporary_type === 'task') {
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

  // Select a task in UI - does NOT start timing!
  const selectTask = useCallback((taskId: string) => {
    const targetItem = items.find(i => i.id === taskId);
    if (targetItem && (targetItem.status === 'completed' || targetItem.status === 'abandoned')) {
      return; // Can't select completed/abandoned items
    }
    setSelectedTaskId(taskId);
  }, [items]);

  // FIXED: setCurrentTaskIndex ALWAYS switches to the clicked task
  // No more dual selection - clicking a task makes it the active one
  // switchToTask handles both running (commits old time) and paused (just switches) cases
  const setCurrentTaskIndex = useCallback((index: number) => {
    const targetItem = items[index];
    if (!targetItem) return;
    if (targetItem.status === 'completed' || targetItem.status === 'abandoned') return;
    
    const currentState = timerStateRef.current;
    
    // If already on this task, do nothing
    if (currentState.timedTaskId === targetItem.id) return;
    
    // ALWAYS switch to the clicked task - whether timer is running or paused
    // switchToTask handles both cases:
    // - If running: commits old task time to memory, switches timer to new task
    // - If paused: just switches task IDs without committing time
    switchToTask(targetItem.id);
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
    selectTask,
    switchToTask,
    uncheckItem,
    updateItemTimeManually,
    setItemParent,
    refreshItems: fetchItems,
    selectedTaskId,
    timedTaskId: timerState.timedTaskId
  };
}
