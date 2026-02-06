
# Timer Accuracy Fix Plan - Complete Overhaul

## Problems Confirmed

After reviewing the code and your feedback, I've identified **5 remaining root causes** that cause the timer to "hallucinate" and round to minutes:

---

### Root Cause #1: `setCurrentTaskIndex` Still Calls `switchToTask()` While Timer Running (Lines 1229-1244)

**The Bug:**
```typescript
// Line 1241-1243 in useCampaignSession.ts
if (timerState.isRunning && timerState.timedTaskId !== targetItem.id) {
  switchToTask(targetItem.id);  // ← This SAVES time to previous task
}
```

When you click a task while the timer is **running**, it calls `switchToTask()` which:
1. Calculates elapsed time since `runningSinceMs`
2. Saves that time to the current task
3. Resets `runningSinceMs` to now

But it also updates `itemAccumulatedMs` for the previous task, which causes double-counting because the derived `itemSessionTimes` already includes running time.

**Even worse**: If `runningSinceMs` is stale (from hours ago due to a reload bug), clicking any task adds that entire stale duration.

---

### Root Cause #2: `itemSessionTimes` Computation Uses Stale `itemAccumulatedMs` (Lines 128-143)

**The Bug:**
The `itemSessionTimes` memo computes display time like this:
```typescript
// For the timed item, add running time to accumulated
times[timedItem.id] = Math.floor(((timerState.itemAccumulatedMs[timedItem.id] || 0) + runningMs) / 1000);
```

But `itemAccumulatedMs` gets updated when you `switchToTask()`, `pauseTimer()`, etc. This means:
- While running: displays `accumulated + running`
- After pause: displays `accumulated` (which now includes the running time)

This is correct in theory, but when `switchToTask()` is called during selection (Root Cause #1), it prematurely commits time to `itemAccumulatedMs`, causing the display to show double.

---

### Root Cause #3: Task Row Time Display Rounds to 0 When < 60 Seconds (Lines 95-96 in SortableTaskItem.tsx)

**The Bug:**
```typescript
const totalTimeSpent = displayTimeSeconds ?? ((item.time_spent || 0) + sessionTimeSeconds);
```

This correctly sums persisted time + session time. **However**, the `displayTimeSeconds` passed from `QuestItemList` is computed from `aggregatedSecondsById` which uses `getOwnSeconds`:
```typescript
const getOwnSeconds = (item: CampaignItem) => (item.time_spent || 0) + (itemSessionTimes[item.id] || 0);
```

If `itemSessionTimes[item.id]` is 0 (because the item is NOT the timed item), the running time never shows. Only the **timed item** gets live session time - other items only show their persisted `time_spent` (which was rounded on previous saves).

**Why it appears "rounded to 1 minute":**
When you end a session or complete a task, `saveItemTime()` writes to the database:
```typescript
// Line 460-466
await supabase
  .from("campaign_items")
  .update({ time_spent: (item.time_spent || 0) + timeSpentSeconds })
  .eq("id", item.id);
```

This correctly saves seconds! **But** the source task/project tables use minutes:
```typescript
// Line 468-469
if (item.task_id) await incrementTaskMinutes(item.task_id, timeSpentMinutes);
```

The `incrementTaskMinutes` function adds `Math.ceil(timeSpentSeconds / 60)` to the task's `time_logged`. This rounding propagates confusion but doesn't affect `campaign_items.time_spent`.

**The real issue**: When you fetch items again (after reload or refresh), the `time_spent` in the database IS in seconds, but...

Wait - let me re-check. Looking at database query results:
```
time_spent:81   // 81 seconds = 1:21
time_spent:310  // 310 seconds = 5:10
time_spent:36   // 36 seconds
```

These ARE in seconds. So the database is correct. The problem is the **display** not updating live while running.

---

### Root Cause #4: Only Timed Item Gets Live Session Time Display

Looking at `QuestItemList.tsx` line 201:
```typescript
sessionTimeSeconds={isBeingTimed ? (itemSessionTimes[item.id] || 0) : 0}
```

**Only the currently timed item** receives live session time. Other items show their persisted `time_spent` (from DB) + 0.

This means:
- Item A (timed): shows DB time + live running time
- Item B (not timed): shows DB time only (static)

When you rapidly switch between items, the previously-timed item "freezes" at its last DB value until you refresh.

---

### Root Cause #5: `itemAccumulatedMs` Double-Counts on Task Switch

When `switchToTask()` runs (lines 547-597):
```typescript
// Line 590-593
itemAccumulatedMs: currentItem && prev.runningSinceMs ? {
  ...prev.itemAccumulatedMs,
  [currentItem.id]: (prev.itemAccumulatedMs[currentItem.id] || 0) + (now - prev.runningSinceMs)
} : prev.itemAccumulatedMs
```

This adds running time to `itemAccumulatedMs`. But the `itemSessionTimes` memo (lines 128-143) also adds running time for the timed item:
```typescript
if (timedItem && timerState.runningSinceMs) {
  const runningMs = Date.now() - timerState.runningSinceMs;
  times[timedItem.id] = Math.floor(((timerState.itemAccumulatedMs[timedItem.id] || 0) + runningMs) / 1000);
}
```

This is fine **while running**, but when `switchToTask()` commits time to `itemAccumulatedMs` and then sets `runningSinceMs = now`, the next tick will show:
- `itemAccumulatedMs[oldItem]` = accumulated + old running time (committed)
- `runningMs` for new item = 0 (just started)

The old item's display freezes correctly, but if there's any timing overlap or the state updates out of order, you get double-counting.

---

## Solution: Complete Timer State Redesign

### Principle: Single Source of Truth with Strict Separation

1. **Selection is purely visual** - clicking a task only changes `selectedTaskId`
2. **Timing is explicit** - only Play/Pause/Complete/Switch-while-running affects timing
3. **Live display is derived** - never mutate accumulated values for display purposes
4. **Commits happen only on explicit actions** - no automatic/periodic commits

### Changes Overview

**File 1: `src/hooks/useCampaignSession.ts`**

1. **Remove `switchToTask()` call from `setCurrentTaskIndex()`**
   - `setCurrentTaskIndex()` should ONLY update `selectedTaskId`
   - Add a new `startTimerOnSelectedTask()` function that users call explicitly

2. **Fix `itemSessionTimes` to show all accumulated items (not just timed)**
   - For non-timed items, show their accumulated session time (from `itemAccumulatedMs`)
   - For the timed item, show accumulated + running time
   - This fixes the "only timed item updates" problem

3. **Prevent stale `runningSinceMs` from causing hallucinations**
   - On hydration, if `isRunning` is true but we're loading state after a reload, validate sanity
   - Add a maximum elapsed time guard (e.g., if running > 4 hours, prompt user)

4. **Fix double-counting in `switchToTask()`**
   - Commit accumulated ms cleanly, then reset `runningSinceMs`
   - Don't add running time if timer wasn't actually running

5. **Add guards: only compute/save time when timer is genuinely running**
   - Check `timerState.isRunning && timerState.runningSinceMs` before any calculation

**File 2: `src/components/campaigns/QuestItemList.tsx`**

1. **Pass all session times, not just for timed item**
   - Currently passes `sessionTimeSeconds={isBeingTimed ? ... : 0}`
   - Change to pass full session time for all items

**File 3: `src/components/campaigns/SortableTaskItem.tsx`**

1. **Use sessionTimeSeconds for all items, not just current**
   - Already structured correctly, just needs correct data from parent

---

## Detailed Implementation

### Change 1: Decouple Selection from Timer Switching

**Current code (broken):**
```typescript
const setCurrentTaskIndex = useCallback((index: number) => {
  const targetItem = items[index];
  if (!targetItem) return;
  if (targetItem.status === 'completed' || targetItem.status === 'abandoned') return;
  
  setSelectedTaskId(targetItem.id);
  
  // THIS IS THE BUG: auto-switching while running
  if (timerState.isRunning && timerState.timedTaskId !== targetItem.id) {
    switchToTask(targetItem.id);
  }
}, [items, timerState.isRunning, timerState.timedTaskId, switchToTask]);
```

**Fixed code:**
```typescript
const setCurrentTaskIndex = useCallback((index: number) => {
  const targetItem = items[index];
  if (!targetItem) return;
  if (targetItem.status === 'completed' || targetItem.status === 'abandoned') return;
  
  // ONLY update selection - never auto-switch timer
  setSelectedTaskId(targetItem.id);
}, [items]);
```

**New function for explicit timer switch:**
```typescript
const startTimerOnTask = useCallback((taskId: string) => {
  const targetItem = items.find(i => i.id === taskId);
  if (!targetItem || targetItem.status === 'completed' || targetItem.status === 'abandoned') return;
  
  // If already timing this task, just ensure timer is running
  if (timerState.timedTaskId === taskId) {
    if (!timerState.isRunning) startTimer();
    return;
  }
  
  // If timer is running on different task, switch (commits time to old task)
  if (timerState.isRunning && timerState.timedTaskId) {
    switchToTask(taskId);
  } else {
    // Timer not running - just set timed task and start
    setTimerState(prev => ({
      ...prev,
      timedTaskId: taskId,
      taskAccumulatedMs: prev.itemAccumulatedMs[taskId] || 0
    }));
    setSelectedTaskId(taskId);
    startTimer(taskId);
  }
}, [items, timerState, startTimer, switchToTask]);
```

### Change 2: Fix `itemSessionTimes` to Show All Items

**Current code (incomplete):**
```typescript
const itemSessionTimes = useMemo(() => {
  const times: ItemSessionTime = {};
  const timedItem = timerState.timedTaskId ? items.find(i => i.id === timerState.timedTaskId) : null;
  
  // Only populate from itemAccumulatedMs (floor to seconds)
  for (const [itemId, accumulatedMs] of Object.entries(timerState.itemAccumulatedMs)) {
    times[itemId] = Math.floor(accumulatedMs / 1000);
  }
  
  // Add running time ONLY for timed item
  if (timedItem && timerState.runningSinceMs) {
    const runningMs = Date.now() - timerState.runningSinceMs;
    times[timedItem.id] = Math.floor(((timerState.itemAccumulatedMs[timedItem.id] || 0) + runningMs) / 1000);
  }
  
  return times;
}, [items, timerState.timedTaskId, timerState.itemAccumulatedMs, timerState.runningSinceMs, tick]);
```

**Fixed code:**
```typescript
const itemSessionTimes = useMemo(() => {
  const times: ItemSessionTime = {};
  
  // Populate ALL items from their accumulated session time
  for (const [itemId, accumulatedMs] of Object.entries(timerState.itemAccumulatedMs)) {
    times[itemId] = Math.floor(accumulatedMs / 1000);
  }
  
  // Add running time for the currently timed item (if running)
  if (timerState.isRunning && timerState.timedTaskId && timerState.runningSinceMs) {
    const runningMs = Date.now() - timerState.runningSinceMs;
    const accumulatedMs = timerState.itemAccumulatedMs[timerState.timedTaskId] || 0;
    times[timerState.timedTaskId] = Math.floor((accumulatedMs + runningMs) / 1000);
  }
  
  return times;
}, [timerState.isRunning, timerState.timedTaskId, timerState.itemAccumulatedMs, timerState.runningSinceMs, tick]);
```

### Change 3: Fix `switchToTask()` Guards

**Add guard at the beginning:**
```typescript
const switchToTask = useCallback(async (newTaskId: string) => {
  const currentItems = itemsRef.current;
  const newItem = currentItems.find(i => i.id === newTaskId);
  if (!newItem || newItem.status === 'completed' || newItem.status === 'abandoned') return;
  
  const currentState = timerStateRef.current;
  
  // GUARD: Only save time if timer was ACTUALLY running with valid timestamp
  if (!currentState.isRunning || !currentState.runningSinceMs) {
    // Timer not running - just switch selection, don't commit any time
    setTimerState(prev => ({
      ...prev,
      timedTaskId: newTaskId,
      taskAccumulatedMs: prev.itemAccumulatedMs[newTaskId] || 0
    }));
    setSelectedTaskId(newTaskId);
    return;
  }
  
  // ... rest of the function (only runs if timer was actually running)
}, [saveItemTime]);
```

### Change 4: QuestItemList - Pass Session Times to All Items

**Current code:**
```typescript
sessionTimeSeconds={isBeingTimed ? (itemSessionTimes[item.id] || 0) : 0}
```

**Fixed code:**
```typescript
sessionTimeSeconds={itemSessionTimes[item.id] || 0}
```

This way, all items show their accumulated session time, not just the timed one.

### Change 5: Add Stale Timer Validation on Hydration

**Enhance the hydration effect (lines 272-306):**
```typescript
useEffect(() => {
  if (!campaign || hydratedRef.current) return;
  
  const saved = loadTimerState(campaign.id);
  if (saved) {
    // Validate: if running but runningSinceMs is stale (> 4 hours), pause it
    if (saved.isRunning && saved.runningSinceMs) {
      const elapsedMs = Date.now() - saved.runningSinceMs;
      const elapsedHours = elapsedMs / 3600000;
      
      if (elapsedHours > 4) {
        console.warn(`Timer was running for ${elapsedHours.toFixed(1)}h - auto-pausing`);
        // Add the elapsed time to accumulated (up to 4 hours max)
        const maxMs = 4 * 3600000;
        const safeElapsedMs = Math.min(elapsedMs, maxMs);
        
        const pausedState: TimerState = {
          ...saved,
          isRunning: false,
          runningSinceMs: null,
          sessionAccumulatedMs: saved.sessionAccumulatedMs + safeElapsedMs,
          itemAccumulatedMs: saved.timedTaskId ? {
            ...saved.itemAccumulatedMs,
            [saved.timedTaskId]: (saved.itemAccumulatedMs[saved.timedTaskId] || 0) + safeElapsedMs
          } : saved.itemAccumulatedMs
        };
        
        setTimerState(pausedState);
        saveTimerState(campaign.id, pausedState);
        toast.info("Timer was auto-paused (running > 4 hours)");
      } else {
        // Valid running state
        setTimerState(saved);
        setTick(t => t + 1);
      }
    } else {
      // Paused state
      setTimerState(saved);
    }
    
    if (saved.timedTaskId) {
      setSelectedTaskId(saved.timedTaskId);
    }
  }
  hydratedRef.current = true;
}, [campaign?.id]);
```

---

## Files to Modify

1. **`src/hooks/useCampaignSession.ts`**
   - Line 1229-1244: Remove auto-switch from `setCurrentTaskIndex()`
   - Lines 128-143: Fix `itemSessionTimes` computation
   - Lines 547-597: Add guards to `switchToTask()`
   - Lines 272-306: Enhance hydration validation
   - Add new `startTimerOnTask()` function

2. **`src/components/campaigns/QuestItemList.tsx`**
   - Line 201: Pass session time for all items, not just timed

3. **`src/pages/CampaignSession.tsx`**
   - Export `startTimerOnTask` for UI use (optional, if UI needs explicit switch)

---

## Acceptance Tests

### Test 1: Selection Does Not Affect Time (CRITICAL)
1. Open campaign with items
2. Timer is PAUSED
3. Click rapidly between different items
4. **Expected**: No item time changes. All times stay exactly as they were.

### Test 2: Only Play Button Starts Timer
1. Click on Item A (selects it)
2. Timer still paused
3. Click Play
4. **Expected**: Timer starts on Item A, time accumulates

### Test 3: Tab Switch Does Not Hallucinate
1. Start timer on Item A
2. Wait 30 seconds
3. Switch to another browser tab for 60 seconds
4. Return
5. **Expected**: Item A shows ~90 seconds, not hours

### Test 4: Reload Preserves Correct Time
1. Start timer, accumulate 45 seconds
2. Reload page
3. **Expected**: Timer resumes correctly (or auto-paused if > 4 hours)

### Test 5: All Items Show Session Time
1. Work on Item A for 60s, switch to Item B for 30s
2. Both items should show their respective times (not just the current one)

### Test 6: Totals Are Consistent
1. Item A: 60s, Item B: 30s
2. Session Total: 90s
3. Campaign Total: Previous + 90s
4. **Expected**: All values add up correctly

---

## Summary

The timer bugs persist because:
1. **Selection auto-switches the timer** while running, causing time to be committed prematurely
2. **Only the timed item shows live time** - other items freeze at DB values
3. **Stale `runningSinceMs`** after reload causes massive time jumps
4. **Double-counting** when `switchToTask()` commits time that's already shown in display

The fix:
- Decouple selection from timing completely
- Show session time for ALL items (not just timed)
- Add guards to only commit time when timer is genuinely running
- Validate timer state sanity on hydration




Final Corrections & Hard Guarantees (Must-Apply)

The overhaul above is correct in direction, but the following constraints are mandatory to fully eliminate hallucinated time, double-counting, and rare catastrophic edge cases.

1. Strict Invariant: No Implicit Time Commits

Invariant (must always hold):

itemAccumulatedMs must never include the currently running segment of time for any task until an explicit user action occurs.

Explicit actions that may commit time:

Pause

Start a different task while running

Complete task

Abandon task

Explicit non-actions (must never commit time):

Selecting a task

Re-ordering tasks

Sorting / filtering

UI re-renders

Tab switches

Reloads

Hydration

If this invariant is violated even once, time will double-count.

2. Selection vs Timing Must Be Fully Decoupled

Selection is purely visual.

There must be two separate, non-overlapping actions:

selectTask(taskId)

Updates selectedTaskId

Never starts, pauses, switches, or commits time

Safe to call repeatedly and rapidly

startTask(taskId)

The only function allowed to:

Start timing

Switch the running task

Commit elapsed time to a previous task

If a different task is currently running:

Commit elapsed time to that task

Reset runningSinceMs

Set new timedTaskId

No other function may transition running state.

3. Canonical Timer State (Single Source of Truth)

The timer state must be represented using only these fields:

timedTaskId: string | null
isRunning: boolean
runningSinceMs: number | null
itemAccumulatedMs: Record<string, number> // committed session ms only


No derived or duplicated timing values may be stored in state.

4. Display Time Must Always Be Derived (Never Mutated)

All displayed task times must be derived as follows:

displayMs(taskId) =
  itemAccumulatedMs[taskId] +
  (
    isRunning &&
    taskId === timedTaskId &&
    runningSinceMs
      ? Date.now() - runningSinceMs
      : 0
  )


itemAccumulatedMs must never be mutated for display purposes.

5. Session Times Must Exist for All Items

itemSessionTimes must be generated from the full items list, not from
Object.entries(itemAccumulatedMs).

Every item must always receive a session time value (default 0), so that:

Previously worked-on items do not appear frozen

Session totals remain consistent

UI never “resets” time on unrelated items

6. Hydration Safety Guard (No Silent Time Injection)

On hydration or reload:

If isRunning === true and runningSinceMs is missing → force pause, add no time

If elapsed time since runningSinceMs is implausibly large:

Do not auto-add elapsed time

Pause the timer immediately

Show a user notification explaining the pause

Allow the user to manually apply elapsed time if desired

Under no circumstance should large elapsed durations be silently written into state.

Safety over completeness.

7. One Running Task Rule (Hard Enforcement)

At most one task may be running at any time.

Starting a new task while another is running must:

Commit elapsed time to the previous task

Stop the previous task

Start the new task

Overlapping running tasks are not allowed.

8. Display Format Contract

All timers (task, session, campaign) must always render as:

HH:MM:SS


Including:

Values under 1 minute (00:00:36)

Values under 1 hour (00:05:10)

No rounding to minutes, no adaptive formatting.

9. Acceptance Guarantee

If all rules above are enforced, the following become impossible:

Time increasing when selecting tasks

Time jumping after tab switch or reload

Session totals contradicting task totals

Tasks inheriting time from other tasks

“Phantom” minutes appearing after pauses

Auto-switching active tasks on reload

Any future regression must violate one of the rules above.