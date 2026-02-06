
# Fix: Clicking Task While Timer Running Should Switch Timer

## Current Behavior
When you click a task while the timer is running on another task:
- The clicked task gets visually "selected" (subtle dashed border)
- But the timer **continues running on the original task**
- You have to pause, then unpause to actually switch

## Desired Behavior
When you click a task while the timer is running:
- The timer should **immediately switch** to the new task
- The old task's time gets committed to memory
- The new task starts accumulating time right away

## Root Cause
In the previous fix, we made `setCurrentTaskIndex()` only update the visual selection (`selectedTaskId`) and never touch the timer. This was to prevent "hallucinated time" from stale states.

However, this created a confusing UX where clicking a task doesn't actually switch to it.

## Solution
Modify `setCurrentTaskIndex()` to:
1. Always update the visual selection
2. **If the timer is running**, also call `switchToTask()` to actually switch the timer

This is safe now because we fixed `switchToTask()` to:
- Only commit time to memory (not database)
- Properly reset the timer for the new task
- Let `endSession()` handle all database persistence

## Implementation

### File: `src/hooks/useCampaignSession.ts`

**Change `setCurrentTaskIndex` (Lines 1311-1320):**

Current code:
```typescript
const setCurrentTaskIndex = useCallback((index: number) => {
  const targetItem = items[index];
  if (!targetItem) return;
  if (targetItem.status === 'completed' || targetItem.status === 'abandoned') {
    return;
  }
  
  // ONLY update UI selection - never touch timer state
  setSelectedTaskId(targetItem.id);
}, [items]);
```

New code:
```typescript
const setCurrentTaskIndex = useCallback((index: number) => {
  const targetItem = items[index];
  if (!targetItem) return;
  if (targetItem.status === 'completed' || targetItem.status === 'abandoned') {
    return;
  }
  
  // Always update UI selection
  setSelectedTaskId(targetItem.id);
  
  // If timer is running on a DIFFERENT task, switch the timer to this task
  // This commits the old task's time to itemAccumulatedMs and starts timing the new task
  const currentState = timerStateRef.current;
  if (currentState.isRunning && currentState.timedTaskId && currentState.timedTaskId !== targetItem.id) {
    switchToTask(targetItem.id);
  }
}, [items, switchToTask]);
```

### Visual Clarity Fix

Since clicking now switches the timer, there won't be a "selected but not timed" state during active timing. The visuals will be clearer:
- **Timer running:** Only the actively timed task is highlighted (no confusing dual selection)
- **Timer paused:** The selected task is highlighted (ready to start)

## Why This is Safe Now

Previously, this caused time hallucination because:
1. `switchToTask()` was saving to the database mid-session
2. `itemAccumulatedMs` values were getting double-counted

Now it's safe because:
1. `switchToTask()` only commits to memory (`itemAccumulatedMs`)
2. Database saves only happen in `endSession()`
3. Display correctly shows `accumulated + running` time

## Test Cases

### Test 1: Switch Tasks While Running
1. Start timer on Task A
2. Wait 10 seconds
3. Click Task B
4. **Expected:** Task A shows 10s frozen, Task B starts counting from 0, timer continues running

### Test 2: Rapid Clicking While Running
1. Start timer on Task A
2. Click Task B, then Task C within 5 seconds
3. End session
4. **Expected:** Task A has ~0-2s, Task B has ~2-4s, Task C has rest. Totals match.

### Test 3: Visual Clarity
1. Start timer on Task A
2. Click Task B
3. **Expected:** Task B is now the ONLY highlighted task (no dual selection)

## Summary

This change restores the intuitive behavior where clicking a task while the timer is running immediately switches to that task, while maintaining all the safety fixes we implemented for time tracking accuracy.
