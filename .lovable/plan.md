
# Timer Accuracy & Stability Fix Plan

## Diagnosed Bug Sources

Based on my analysis, I identified **6 critical bugs** causing the timer "hallucinations":

### Bug #1: Active Task Changes on Reload (Position-Based Selection)
**Location**: `useCampaignSession.ts` lines 377-385

On `fetchItems()`, the code sets `currentTaskIndex` to the first non-completed item:
```typescript
const firstActiveIndex = mappedItems.findIndex(
  item => item.status !== 'completed' && item.status !== 'abandoned'
);
setTimerState(prev => ({ 
  ...prev, 
  currentTaskIndex: firstActiveIndex >= 0 ? firstActiveIndex : prev.currentTaskIndex
}));
```

**Problem**: This overwrites any persisted `currentTaskIndex` from localStorage. If items are reordered or the list changes, the "active" task changes arbitrarily.

### Bug #2: Selection Triggers Timer Switch Logic (Immediate Time Attribution)
**Location**: `useCampaignSession.ts` lines 1133-1140

`setCurrentTaskIndex` calls `switchToTask(index)`:
```typescript
const setCurrentTaskIndex = useCallback((index: number) => {
  const targetItem = items[index];
  if (targetItem && (targetItem.status === 'completed' || targetItem.status === 'abandoned')) {
    return;
  }
  switchToTask(index);  // <-- This saves time to current task before switching!
}, [items, switchToTask]);
```

**Problem**: `switchToTask()` (lines 465-507) calculates elapsed time and saves it to the item. If the user rapidly clicks between tasks (or if the timer isn't running), it still accumulates time. Even worse: if `runningSince` is stale from a previous session, clicking any task can add huge time chunks.

### Bug #3: Timer State Hydration Race Condition
**Location**: `useCampaignSession.ts` lines 247-257

Timer state is restored from localStorage:
```typescript
useEffect(() => {
  if (!campaign) return;
  const saved = loadTimerState(campaign.id);
  if (saved && saved.isRunning && saved.runningSince) {
    setTimerState(saved);
    setTick(t => t + 1);
  }
}, [campaign?.id]);
```

**Problem**: This effect runs after the initial `fetchItems()` effect (lines 1142-1152), which sets `currentTaskIndex` based on list position. The hydration restores `currentTaskIndex` from localStorage, but by then `fetchItems` may have already triggered `switchToTask` with wrong index, attributing stale time.

### Bug #4: `runningSince` Persists Stale Values Across Page Reloads
When the page reloads, if `runningSince` is restored from localStorage (e.g., set to a timestamp from hours ago), and the user then:
1. Clicks a task (triggering `switchToTask`)
2. The calculation `Date.now() - runningSince` yields hours of "elapsed" time
3. This huge delta gets saved to the task

This explains why "Cook eggs" got 12 hours - it wasn't actively worked on, but the stale `runningSince` from a previous session was never cleared.

### Bug #5: Double-Counting in Periodic Commit
**Location**: `useCampaignSession.ts` lines 186-245

The periodic commit interval:
1. Commits time to the database (lines 210-215)
2. Updates local item state (lines 218-222)
3. Resets `runningSince` to now and adds to accumulated (lines 225-234)

**Problem**: The accumulated values are added to `timerState`, but then `saveTimerState(campaign.id, timerState)` on line 240 uses the **old** timerState (before the `setTimerState` call on line 225). This can cause double-counting on reload.

### Bug #6: Visibility Change Saves Stale Closure State
**Location**: `useCampaignSession.ts` lines 140-172

The visibility change handlers use `timerState` from the effect dependency closure:
```typescript
if (timerState.isRunning && campaign) {
  saveTimerState(campaign.id, timerState);
}
```

**Problem**: Due to React's stale closure issue, `timerState` may not be the latest value. This is especially problematic because these handlers fire during tab switches - exactly when accurate persistence matters most.

---

## Solution Architecture

### Core Principle: Timestamp-Authoritative, Idempotent Accounting

**The fundamental fix**: Time should only be calculated and saved at explicit user actions (start/pause/complete/switch), never automatically on selection or re-renders.

### 1. Separate "Active Task Selection" from "Timer State"

**New data model**:
```typescript
interface TimerState {
  // Timer running state
  isRunning: boolean;
  runningSinceMs: number | null;    // Epoch timestamp when started
  
  // Accumulated time (only updated on pause/switch/complete)
  sessionAccumulatedMs: number;
  taskAccumulatedMs: number;
  
  // Which task is being timed (not which is "selected")
  timedTaskId: string | null;       // NEW: explicit task ID, not index!
  
  // Per-item session times
  itemAccumulatedMs: Record<string, number>;
  
  // Session metadata
  currentSessionNumber: number;
}
```

**Key change**: Replace `currentTaskIndex` with `timedTaskId`. This is an **ID**, not an index, so it survives reordering and reload.

### 2. Split Selection from Timing

**Two separate operations**:
- `selectTask(taskId)` - Only changes UI highlight (no timer impact)
- `startTask(taskId)` - Starts timing on specified task
- `pauseTimer()` - Pauses timing, saves accumulated time
- `resumeTimer()` - Resumes timing on current timed task

**Selecting a task does NOT start the timer**. The Play button explicitly starts timing.

### 3. Fix Time Calculation Flow

**When to save time** (and only then):
1. `pauseTimer()` - Calculate elapsed, add to accumulated, clear `runningSinceMs`
2. `completeCurrentTask()` - Same as pause, then save to DB
3. `switchToTask()` - Only called if timer IS running; pause current, start new
4. `endSession()` - Final save to DB

**Calculate elapsed correctly**:
```typescript
const getElapsedMs = () => {
  if (!timerState.runningSinceMs) return 0;
  return Date.now() - timerState.runningSinceMs;
};

const totalTaskMs = timerState.taskAccumulatedMs + getElapsedMs();
```

### 4. Fix Hydration Order

On mount:
1. **First** load timer state from localStorage (including `timedTaskId`)
2. **Then** fetch items
3. **Then** find the item matching `timedTaskId` for display

Never override the restored `timedTaskId` with position-based lookup.

### 5. Use Refs for Visibility/Unload Persistence

Store timer state in a ref that updates synchronously:
```typescript
const timerStateRef = useRef(timerState);
useEffect(() => { timerStateRef.current = timerState; }, [timerState]);

// In visibility handler:
const handleVisibilityChange = () => {
  if (document.visibilityState === 'hidden') {
    saveTimerState(campaign.id, timerStateRef.current); // Uses ref, not closure
  }
};
```

### 6. Always Show HH:MM:SS Format

Update `SessionClock.tsx`:
```typescript
const formatTime = (seconds: number) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`; // Always HH:MM:SS
};
```

---

## Implementation Files

### File 1: `src/hooks/useCampaignSession.ts` (Major Rewrite)

**Changes**:
1. Replace `currentTaskIndex` with `timedTaskId` (string ID)
2. Add `selectedTaskId` for UI selection (separate from timing)
3. Remove automatic `currentTaskIndex` setting in `fetchItems`
4. Fix hydration order: load timer state first, then items
5. Make `setCurrentTaskIndex` only change UI selection (no `switchToTask`)
6. Add explicit `startTimerOnTask(taskId)` function
7. Fix stale closure issue with refs for all event handlers
8. Remove double-counting in periodic commit
9. Add guards: only save time if `runningSinceMs` exists and `isRunning`

### File 2: `src/components/campaigns/SessionClock.tsx`

**Changes**:
1. Always format as `HH:MM:SS` (remove the conditional `hrs > 0` check)

### File 3: `src/pages/CampaignSession.tsx`

**Changes**:
1. Update to use new `selectedTaskId` for UI highlighting
2. Update to use `timedTaskId` for "ACTIVE" badge
3. Show correct current task in header based on `timedTaskId`

### File 4: `src/components/campaigns/QuestItemList.tsx`

**Changes**:
1. Accept `selectedTaskId` and `timedTaskId` as separate props
2. Visual distinction: "selected" (highlighted) vs "timing" (ACTIVE badge)

### File 5: `src/components/campaigns/SortableTaskItem.tsx`

**Changes**:
1. Separate `isSelected` from `isBeingTimed` props
2. Show ACTIVE badge only when `isBeingTimed`
3. Show selection highlight when `isSelected`

---

## Technical Details

### New Timer State Shape
```typescript
interface TimerState {
  isRunning: boolean;
  runningSinceMs: number | null;
  sessionAccumulatedMs: number;
  taskAccumulatedMs: number;
  timedTaskId: string | null;
  itemAccumulatedMs: Record<string, number>;
  currentSessionNumber: number;
}
```

### Hydration Flow (Fixed)
```typescript
// 1. Initialize from localStorage FIRST
const [timerState, setTimerState] = useState<TimerState>(() => {
  if (campaign?.id) {
    const saved = loadTimerState(campaign.id);
    if (saved) return saved;
  }
  return defaultTimerState;
});

// 2. Separate UI selection state
const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

// 3. On items load, don't override timedTaskId
// Just validate it still exists
useEffect(() => {
  if (items.length && timerState.timedTaskId) {
    const stillExists = items.find(i => i.id === timerState.timedTaskId);
    if (!stillExists) {
      // Task was deleted, clear it
      setTimerState(prev => ({ ...prev, timedTaskId: null }));
    }
  }
}, [items, timerState.timedTaskId]);
```

### Event Listener Fix (Refs)
```typescript
const timerStateRef = useRef(timerState);
useEffect(() => { timerStateRef.current = timerState; }, [timerState]);

useEffect(() => {
  const handleVisibility = () => {
    if (document.visibilityState === 'hidden' && campaign) {
      saveTimerState(campaign.id, timerStateRef.current);
    }
  };
  document.addEventListener('visibilitychange', handleVisibility);
  return () => document.removeEventListener('visibilitychange', handleVisibility);
}, [campaign?.id]); // Only campaign.id in deps, not timerState
```

---

## Acceptance Tests

### Test 1: Selection Does Not Start Timer
1. Open campaign session (timer paused)
2. Click on different tasks rapidly
3. **Expected**: No task time increases, all times stay 0

### Test 2: Timer Accuracy After Tab Switch
1. Start timer on Task A
2. Wait 10 seconds
3. Switch to different browser tab for 60 seconds
4. Return to app
5. **Expected**: Task A shows ~70 seconds, not hours

### Test 3: Reload Preserves Active Task
1. Start timer on Task C (3rd in list)
2. Reload the page
3. **Expected**: Task C is still the timed task, same time continues

### Test 4: Paused Timer Stays Paused
1. Start timer, accumulate 30 seconds
2. Pause timer
3. Reload page
4. **Expected**: Timer shows 30 seconds, still paused, no growth

### Test 5: Totals Add Up
1. Work on Task A for 60s, Task B for 120s
2. Check session total = 180s
3. Check campaign total = previous + 180s
4. **Expected**: All totals match

### Test 6: HH:MM:SS Format
1. Timer under 1 hour shows `00:05:32`
2. Timer over 1 hour shows `01:23:45`
3. **Expected**: Always 3-part format

---

## Migration Notes

### Corrupted Data
The existing time values in the database (like "Cook eggs" with 12 hours) are corrupted and cannot be automatically fixed. Users may want to:
- Manually edit item times using the existing edit function
- Reset routine campaigns to clear bad data

### localStorage Cleanup
Old timer state format will be migrated or cleared on first load under new code.

---

## Summary

The timer bugs stem from 6 interrelated issues that create a cascade of problems:
1. Position-based task tracking → wrong task after reorder/reload
2. Selection triggering timer logic → time added on every click
3. Stale `runningSince` values → massive time jumps
4. Race conditions in hydration → wrong state on startup
5. Closure staleness → wrong data persisted on tab switch
6. Double-counting in periodic commits → inflated totals

The fix introduces:
- ID-based task tracking (survives reorder)
- Separation of selection from timing
- Correct hydration order
- Ref-based event handlers
- Guards preventing time attribution without active timing
- Consistent HH:MM:SS display format

This is a significant refactor of `useCampaignSession.ts` but necessary to make the timer reliable.
