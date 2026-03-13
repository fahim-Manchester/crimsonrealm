import { useState, useEffect, useCallback, useRef } from "react";
import type { CampaignItem } from "@/hooks/useCampaigns";

export type AutoAdvanceTrigger = "manual" | "pomodoro" | "target_time";
export type CompletionBehavior = "mark_complete" | "switch_only";

export interface QueueSettings {
  enabled: boolean;
  autoAdvanceTrigger: AutoAdvanceTrigger;
  completionBehavior: CompletionBehavior;
  /** Per-item target times in seconds, keyed by campaign_item ID */
  targetTimes: Record<string, number>;
}

export interface TaskQueueState {
  /** Ordered list of campaign_item IDs in the queue */
  queue: string[];
  /** Index of the currently active item in the queue */
  currentQueueIndex: number;
  settings: QueueSettings;
}

const QUEUE_STORAGE_PREFIX = "taskQueue:";

const getStorageKey = (campaignId: string) => `${QUEUE_STORAGE_PREFIX}${campaignId}`;

const defaultSettings: QueueSettings = {
  enabled: false,
  autoAdvanceTrigger: "manual",
  completionBehavior: "switch_only",
  targetTimes: {},
};

const defaultState: TaskQueueState = {
  queue: [],
  currentQueueIndex: 0,
  settings: defaultSettings,
};

function loadQueueState(campaignId: string): TaskQueueState {
  try {
    const raw = localStorage.getItem(getStorageKey(campaignId));
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...defaultState,
        ...parsed,
        settings: { ...defaultSettings, ...parsed?.settings },
      };
    }
  } catch { /* ignore */ }
  return { ...defaultState };
}

function saveQueueState(campaignId: string, state: TaskQueueState) {
  try {
    localStorage.setItem(getStorageKey(campaignId), JSON.stringify(state));
  } catch { /* ignore */ }
}

export function useTaskQueue(campaignId: string | null, items: CampaignItem[]) {
  const [state, setState] = useState<TaskQueueState>(() =>
    campaignId ? loadQueueState(campaignId) : { ...defaultState }
  );

  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  // Hydrate on campaign change
  useEffect(() => {
    if (campaignId) {
      setState(loadQueueState(campaignId));
    }
  }, [campaignId]);

  // Persist on state change
  useEffect(() => {
    if (campaignId) {
      saveQueueState(campaignId, state);
    }
  }, [campaignId, state]);

  // Clean queue of deleted items
  useEffect(() => {
    const itemIds = new Set(items.map(i => i.id));
    setState(prev => {
      const cleaned = prev.queue.filter(id => itemIds.has(id));
      if (cleaned.length !== prev.queue.length) {
        const newIndex = Math.min(prev.currentQueueIndex, Math.max(0, cleaned.length - 1));
        return { ...prev, queue: cleaned, currentQueueIndex: newIndex };
      }
      return prev;
    });
  }, [items]);

  const addToQueue = useCallback((itemId: string) => {
    setState(prev => {
      if (prev.queue.includes(itemId)) return prev;
      return { ...prev, queue: [...prev.queue, itemId] };
    });
  }, []);

  const removeFromQueue = useCallback((itemId: string) => {
    setState(prev => {
      const idx = prev.queue.indexOf(itemId);
      if (idx < 0) return prev;
      const newQueue = prev.queue.filter(id => id !== itemId);
      const newIndex = prev.currentQueueIndex >= newQueue.length
        ? Math.max(0, newQueue.length - 1)
        : prev.currentQueueIndex > idx
          ? prev.currentQueueIndex - 1
          : prev.currentQueueIndex;
      return { ...prev, queue: newQueue, currentQueueIndex: newIndex };
    });
  }, []);

  const reorderQueue = useCallback((newQueue: string[]) => {
    setState(prev => ({ ...prev, queue: newQueue }));
  }, []);

  const clearQueue = useCallback(() => {
    setState(prev => ({ ...prev, queue: [], currentQueueIndex: 0 }));
  }, []);

  const refreshQueue = useCallback(() => {
    // Remove completed/abandoned items from queue
    setState(prev => {
      const activeItems = new Set(
        items.filter(i => i.status !== "completed" && i.status !== "abandoned").map(i => i.id)
      );
      const cleaned = prev.queue.filter(id => activeItems.has(id));
      return { ...prev, queue: cleaned, currentQueueIndex: 0 };
    });
  }, [items]);

  const setQueueIndex = useCallback((index: number) => {
    setState(prev => ({
      ...prev,
      currentQueueIndex: Math.max(0, Math.min(index, prev.queue.length - 1)),
    }));
  }, []);

  const advanceQueue = useCallback((): string | null => {
    const cur = stateRef.current;
    const nextIndex = cur.currentQueueIndex + 1;
    if (nextIndex >= cur.queue.length) return null; // end of queue
    setState(prev => ({ ...prev, currentQueueIndex: nextIndex }));
    return cur.queue[nextIndex];
  }, []);

  const updateSettings = useCallback((partial: Partial<QueueSettings>) => {
    setState(prev => ({
      ...prev,
      settings: { ...prev.settings, ...partial },
    }));
  }, []);

  const setTargetTime = useCallback((itemId: string, seconds: number) => {
    setState(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        targetTimes: { ...prev.settings.targetTimes, [itemId]: seconds },
      },
    }));
  }, []);

  const removeTargetTime = useCallback((itemId: string) => {
    setState(prev => {
      const newTargets = { ...prev.settings.targetTimes };
      delete newTargets[itemId];
      return {
        ...prev,
        settings: { ...prev.settings, targetTimes: newTargets },
      };
    });
  }, []);

  // Derived values
  const currentQueueItemId = state.queue[state.currentQueueIndex] ?? null;
  const isQueueActive = state.settings.enabled && state.queue.length > 0;
  const queueProgress = {
    current: state.currentQueueIndex + 1,
    total: state.queue.length,
    isComplete: state.currentQueueIndex >= state.queue.length - 1 && state.queue.length > 0,
  };

  // Get queue items with their data
  const queueItems = state.queue
    .map(id => items.find(i => i.id === id))
    .filter(Boolean) as CampaignItem[];

  return {
    queue: state.queue,
    queueItems,
    currentQueueIndex: state.currentQueueIndex,
    currentQueueItemId,
    isQueueActive,
    queueProgress,
    settings: state.settings,
    addToQueue,
    removeFromQueue,
    reorderQueue,
    clearQueue,
    refreshQueue,
    setQueueIndex,
    advanceQueue,
    updateSettings,
    setTargetTime,
    removeTargetTime,
  };
}
