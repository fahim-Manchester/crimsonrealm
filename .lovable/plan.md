
# Timestamp-Authoritative Timer System for Campaign Mode

## Overview
This plan fixes the timer drift issue that occurs when the browser tab is minimized or backgrounded. Currently, the timer uses `setInterval` to count seconds, but browsers throttle intervals in background tabs, causing significant time loss. After this fix, you can minimize the app for hours and return to find accurate elapsed times.

---

## Problem Analysis

### Current Implementation (Lines 166-188 in `useCampaignSession.ts`)
```typescript
intervalRef.current = setInterval(() => {
  setSessionState(prev => ({
    ...prev,
    sessionTime: prev.sessionTime + 1,  // ❌ Counts ticks
    taskTime: prev.taskTime + 1          // ❌ Counts ticks
  }));
}, 1000);
```

**Why this fails:**
- Browsers throttle `setInterval` in background tabs to ~1 tick per second (or less)
- If you're away for 60 minutes, the timer might only record a few minutes
- No persistence - refreshing loses all progress

---

## Solution Architecture

### New State Model (Timestamp-Authoritative)

Replace tick counting with timestamp deltas:

| Field | Type | Purpose |
|-------|------|---------|
| `runningSince` | `number \| null` | Epoch ms when timer started (null if paused) |
| `accumulatedSessionMs` | `number` | Total ms already counted before current run |
| `accumulatedTaskMs` | `number` | Total ms on current task before current run |
| `itemAccumulatedMs` | `Record<string, number>` | Per-item accumulated ms |

### Time Calculation (Always Correct)
```typescript
const getElapsedMs = (accumulatedMs: number, runningSince: number | null) => {
  if (!runningSince) return accumulatedMs;
  return accumulatedMs + (Date.now() - runningSince);
};
```

---

## Implementation Steps

### Step 1: Define Timestamp-Based State Types

**File**: `src/hooks/useCampaignSession.ts`

Add new interfaces:

```typescript
interface TimerState {
  isRunning: boolean;
  runningSince: number | null;        // Epoch ms when started
  accumulatedSessionMs: number;       // Session time already counted
  accumulatedTaskMs: number;          // Current task time already counted
  itemAccumulatedMs: Record<string, number>;  // Per-item accumulated time
  currentTaskIndex: number;
  currentSessionNumber: number;
}

const STORAGE_KEY_PREFIX = 'campaignTimer:';
```

### Step 2: Create Persistence Helpers

Add functions to save/load timer state from localStorage:

```typescript
const getStorageKey = (campaignId: string) => `${STORAGE_KEY_PREFIX}${campaignId}`;

const saveTimerState = (campaignId: string, state: TimerState) => {
  localStorage.setItem(getStorageKey(campaignId), JSON.stringify(state));
};

const loadTimerState = (campaignId: string): TimerState | null => {
  const stored = localStorage.getItem(getStorageKey(campaignId));
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
};

const clearTimerState = (campaignId: string) => {
  localStorage.removeItem(getStorageKey(campaignId));
};
```

### Step 3: Replace Tick-Based Timer with Timestamp Logic

**Start Timer:**
```typescript
const startTimer = useCallback(() => {
  const now = Date.now();
  setTimerState(prev => ({
    ...prev,
    isRunning: true,
    runningSince: now
  }));
  // Save to localStorage immediately
  saveTimerState(campaign.id, { ...timerState, isRunning: true, runningSince: now });
}, [campaign, timerState]);
```

**Pause Timer:**
```typescript
const pauseTimer = useCallback(() => {
  if (!timerState.runningSince) return;
  
  const now = Date.now();
  const elapsedSinceStart = now - timerState.runningSince;
  
  setTimerState(prev => ({
    ...prev,
    isRunning: false,
    runningSince: null,
    accumulatedSessionMs: prev.accumulatedSessionMs + elapsedSinceStart,
    accumulatedTaskMs: prev.accumulatedTaskMs + elapsedSinceStart,
    itemAccumulatedMs: {
      ...prev.itemAccumulatedMs,
      [currentItemId]: (prev.itemAccumulatedMs[currentItemId] || 0) + elapsedSinceStart
    }
  }));
  // Clear from localStorage
  clearTimerState(campaign.id);
}, [timerState, campaign, currentItemId]);
```

### Step 4: Create Derived Time Getters

Replace the current `sessionTime` and `taskTime` state values with computed getters:

```typescript
// Compute current session time in seconds
const sessionTimeSeconds = useMemo(() => {
  const totalMs = timerState.accumulatedSessionMs + 
    (timerState.runningSince ? Date.now() - timerState.runningSince : 0);
  return Math.floor(totalMs / 1000);
}, [timerState.accumulatedSessionMs, timerState.runningSince, tick]);

// Compute current task time in seconds
const taskTimeSeconds = useMemo(() => {
  const totalMs = timerState.accumulatedTaskMs + 
    (timerState.runningSince ? Date.now() - timerState.runningSince : 0);
  return Math.floor(totalMs / 1000);
}, [timerState.accumulatedTaskMs, timerState.runningSince, tick]);
```

### Step 5: Add UI Refresh Tick (Display Only)

The interval is only for UI updates, not for time tracking:

```typescript
const [tick, setTick] = useState(0);

useEffect(() => {
  if (!timerState.isRunning) return;
  
  const intervalId = setInterval(() => {
    setTick(t => t + 1);  // Just triggers re-render
  }, 250);  // Faster refresh for smoother display
  
  return () => clearInterval(intervalId);
}, [timerState.isRunning]);
```

### Step 6: Add Visibility/Focus Resync

Immediately recompute times when returning to the tab:

```typescript
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      setTick(t => t + 1);  // Force immediate re-render
    } else if (document.visibilityState === 'hidden') {
      // Commit current state to localStorage on hide
      if (timerState.isRunning && campaign) {
        saveTimerState(campaign.id, timerState);
      }
    }
  };
  
  const handleFocus = () => {
    setTick(t => t + 1);  // Force immediate re-render
  };
  
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('focus', handleFocus);
  
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('focus', handleFocus);
  };
}, [timerState, campaign]);
```

### Step 7: Add beforeunload Handler

Save state before tab closes (best effort):

```typescript
useEffect(() => {
  const handleBeforeUnload = () => {
    if (timerState.isRunning && campaign) {
      saveTimerState(campaign.id, timerState);
    }
  };
  
  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [timerState, campaign]);
```

### Step 8: Hydrate Timer State on Mount

When the campaign session page loads, restore any saved timer state:

```typescript
useEffect(() => {
  if (!campaign) return;
  
  const saved = loadTimerState(campaign.id);
  if (saved && saved.isRunning && saved.runningSince) {
    // Timer was running when page closed - restore it
    setTimerState(saved);
    setTick(t => t + 1);  // Trigger immediate calculation
  }
}, [campaign]);
```

### Step 9: Update SessionState Return Interface

Modify the return object to use computed values:

```typescript
// In the return object, map to the expected shape
const sessionState: SessionState = {
  isRunning: timerState.isRunning,
  campaignTotalTime: campaignTotalTime,
  sessionTime: sessionTimeSeconds,
  taskTime: taskTimeSeconds,
  currentTaskIndex: timerState.currentTaskIndex,
  currentSessionNumber: timerState.currentSessionNumber
};
```

### Step 10: Update Task Switching Logic

When switching tasks, properly accumulate time:

```typescript
const switchToTask = useCallback(async (newIndex: number) => {
  const currentItem = items[timerState.currentTaskIndex];
  const now = Date.now();
  
  // Calculate time spent on current task
  const taskElapsedMs = timerState.accumulatedTaskMs + 
    (timerState.runningSince ? now - timerState.runningSince : 0);
  
  // Save time for current item before switching
  if (currentItem && taskElapsedMs > 0) {
    await saveItemTime(currentItem, Math.floor(taskElapsedMs / 1000));
    // Update local item with new time
    setItems(prev => prev.map(item => 
      item.id === currentItem.id 
        ? { ...item, time_spent: (item.time_spent || 0) + Math.floor(taskElapsedMs / 1000) } 
        : item
    ));
  }
  
  // Get accumulated time for new item
  const newItem = items[newIndex];
  const newItemAccumulated = newItem ? (timerState.itemAccumulatedMs[newItem.id] || 0) : 0;
  
  // Switch to new task, reset task timer but keep session timer running
  setTimerState(prev => ({
    ...prev,
    currentTaskIndex: newIndex,
    accumulatedTaskMs: newItemAccumulated,
    runningSince: prev.isRunning ? now : null,  // Reset runningSince for new task
    accumulatedSessionMs: prev.accumulatedSessionMs + (prev.runningSince ? now - prev.runningSince : 0)
  }));
}, [items, timerState, saveItemTime]);
```

---

## Data Flow Diagram

```text
┌─────────────────────────────────────────────────────────────────┐
│                    TIMER STATE (Source of Truth)                 │
├─────────────────────────────────────────────────────────────────┤
│  runningSince: 1738123456789 (epoch ms)                         │
│  accumulatedSessionMs: 1800000 (30 min already counted)         │
│  accumulatedTaskMs: 300000 (5 min on current task)              │
│  itemAccumulatedMs: { "item-1": 600000, "item-2": 300000 }      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    COMPUTED VALUES (On Every Render)             │
├─────────────────────────────────────────────────────────────────┤
│  sessionTimeSeconds = floor(                                     │
│    (accumulatedSessionMs + (Date.now() - runningSince)) / 1000  │
│  )                                                               │
│                                                                  │
│  taskTimeSeconds = floor(                                        │
│    (accumulatedTaskMs + (Date.now() - runningSince)) / 1000     │
│  )                                                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    UI REFRESH (Every 250ms)                      │
├─────────────────────────────────────────────────────────────────┤
│  setInterval triggers setTick(t => t + 1)                        │
│  → useMemo recomputes derived values                             │
│  → SessionClock components re-render with new times              │
│                                                                  │
│  NOTE: This interval is ONLY for display refresh                 │
│        Time tracking uses Date.now() - runningSince              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useCampaignSession.ts` | Replace tick-based timer with timestamp-authoritative system, add localStorage persistence, add visibility/focus handlers |

---

## Acceptance Tests

| Test | Expected Result |
|------|-----------------|
| Start timer, switch tabs for 60 minutes, return | Session and task timers show ~60 minutes elapsed |
| Start timer, minimize browser for 30 minutes, restore | Timers immediately show correct elapsed time |
| Start timer, close tab, reopen page | Timer resumes from where it left off (hydrated from localStorage) |
| Switch tasks while running | Previous task time is saved correctly, new task timer starts fresh or resumes accumulated |
| End session after background time | Total time saved to DB matches real elapsed time |
| Campaign total after multiple sessions | Cumulative time is accurate across all sessions |

---

## Technical Notes

- **No behavior changes**: All existing logic for saving to DB, switching tasks, completing items, etc. remains the same
- **Only the time source changes**: Instead of counting ticks, we compute from timestamps
- **localStorage key**: `campaignTimer:{campaignId}` - unique per campaign
- **Cleanup**: localStorage is cleared when session ends normally or when timer is paused
- **Browser support**: `Date.now()`, `visibilitychange`, and `localStorage` are supported in all modern browsers
- **Time precision**: Using milliseconds internally, converting to seconds for display and DB writes
