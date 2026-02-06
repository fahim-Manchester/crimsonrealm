
# Timer Bug Fix Plan - Complete Resolution

## Summary of Issues Found

After analyzing the code and your video recordings, I've identified **3 critical bugs**:

### Bug 1: Dual Selection Visual Confusion
When clicking a new task while the timer runs on another, **both tasks appear highlighted** because:
- `isCurrentTask` (the timed task) shows a strong primary highlight
- `isSelected` (the clicked task) shows a lighter primary highlight
- Users expect only ONE item to be visually "active"

### Bug 2: Time Data Loss on Session End (Critical)
When ending a session after switching tasks, **time from previous tasks is lost**:
- `switchToTask()` commits running time to `itemAccumulatedMs[oldTask]`
- But `endSession()` only saves `taskAccumulatedMs` for the current task
- All time accumulated in `itemAccumulatedMs` for OTHER tasks is **never persisted to the database**

This is why Task 2's progress gets "erased" - it was actually Task 1's time that was lost and never saved.

### Bug 3: Session Total Glitches
A consequence of Bug 2 - incomplete persistence causes mismatched totals.

---

## Solution Plan

### Fix 1: Single Visual Selection (Clarify UI Intent)

**Problem**: Two different highlights cause confusion.

**Solution**: When the timer is running, the **timed task** should always appear as the primary selection. The `selectedTaskId` should only affect which task STARTS timing when you press Play.

Changes to `SortableTaskItem.tsx`:
- Modify the highlighting logic so that during active timing, ONLY the timed task gets the "active" highlight
- The selected task (when different from timed) gets a subtle "will start next" indicator instead of looking selected

**Current styling logic:**
```typescript
if (isCurrentTask) return "border-primary bg-primary/20 ring-2 ring-primary/30";  // Timed
if (isHighlighted && !isCurrentTask) return "border-primary/50 bg-primary/10 ring-1 ring-primary/20";  // Selected
```

**New styling logic:**
```typescript
// If timer is running, only the timed task gets primary highlight
// Selected-but-not-timed gets a very subtle "next up" indicator (dashed border, no ring)
if (isCurrentTask) return "border-primary bg-primary/20 ring-2 ring-primary/30";
if (isHighlighted && !isCurrentTask && !isTimerRunning) {
  return "border-primary/50 bg-primary/10 ring-1 ring-primary/20";  // Only when paused
}
if (isHighlighted && !isCurrentTask && isTimerRunning) {
  return "border-dashed border-muted-foreground/50";  // Subtle "next" indicator
}
```

Add `isTimerRunning` prop to `SortableTaskItem` to know if any task is currently being timed.

---

### Fix 2: Save ALL Accumulated Item Times on Session End (Critical)

**Problem**: `endSession()` only saves the current task's time, losing time from other tasks worked on during the session.

**Solution**: Iterate through ALL items in `itemAccumulatedMs` and save each one's accumulated time.

Changes to `useCampaignSession.ts` - `endSession()`:

**Current (broken):**
```typescript
const endSession = useCallback(async () => {
  pauseTimer();
  
  const currentTaskTimeSeconds = Math.floor(currentState.taskAccumulatedMs / 1000);
  
  if (currentItem && currentTaskTimeSeconds > 0) {
    await saveItemTime(currentItem, currentTaskTimeSeconds);  // Only saves ONE task
  }
```

**Fixed:**
```typescript
const endSession = useCallback(async () => {
  // First, pause timer to commit running time to itemAccumulatedMs
  pauseTimer();
  
  const currentState = timerStateRef.current;
  const currentItems = itemsRef.current;
  
  // Save time for ALL items that accumulated time this session
  for (const [itemId, accumulatedMs] of Object.entries(currentState.itemAccumulatedMs)) {
    const timeSeconds = Math.floor(accumulatedMs / 1000);
    if (timeSeconds <= 0) continue;
    
    const item = currentItems.find(i => i.id === itemId);
    if (!item) continue;
    
    await saveItemTime(item, timeSeconds);
    
    // Update local state
    setItems(prev => prev.map(i => 
      i.id === itemId 
        ? { ...i, time_spent: (i.time_spent || 0) + timeSeconds }
        : i
    ));
  }
  
  // ... rest of function
```

---

### Fix 3: Apply Same Fix to `startNewSession()`

The `startNewSession()` function has the same bug - it only saves the current task's time.

Apply identical fix: iterate through `itemAccumulatedMs` and save all items.

---

### Fix 4: Prevent Double-Saving in switchToTask()

Currently, `switchToTask()` calls `saveItemTime()` for the old task when switching. This is fine, but we need to ensure `endSession()` doesn't save it again.

After saving in `switchToTask()`, we should clear that item from `itemAccumulatedMs`:

```typescript
// After saving old item's time, clear its accumulated ms to prevent double-save
setTimerState(prev => {
  const updatedItemAccumulatedMs = { ...prev.itemAccumulatedMs };
  delete updatedItemAccumulatedMs[oldItemId];  // Already saved, don't save again
  
  return {
    ...prev,
    // ...
    itemAccumulatedMs: updatedItemAccumulatedMs
  };
});
```

Wait - looking more carefully at the current code, `switchToTask()` DOES save to DB and update local items, but it also keeps the value in `itemAccumulatedMs`. This causes potential double-saving.

**Better approach**: Instead of saving in `switchToTask()`, just commit to `itemAccumulatedMs` and let `endSession()` handle all DB saves. This is cleaner and avoids race conditions.

Changes to `switchToTask()`:
- Remove the `saveItemTime()` call
- Remove the `setItems()` update
- Just commit to `itemAccumulatedMs` and switch tasks
- All persistence happens in `endSession()`

---

### Fix 5: Ensure pauseTimer() Commits Running Time Correctly

The `pauseTimer()` function commits running time to `itemAccumulatedMs`. This needs to be called BEFORE reading `itemAccumulatedMs` in `endSession()`.

Current code already calls `pauseTimer()` first, but we need to ensure the state is updated synchronously. Use a ref-based approach:

```typescript
const endSession = useCallback(async () => {
  // Pause and commit running time
  pauseTimer();
  
  // IMPORTANT: Read from ref to get post-pause state
  // React state updates are async, but we update ref synchronously in pauseTimer
  await new Promise(r => setTimeout(r, 0));  // Allow state to settle
  
  const finalState = timerStateRef.current;
  // Now finalState.itemAccumulatedMs includes the committed running time
```

Actually, the current `pauseTimer()` sets state asynchronously, so `timerStateRef.current` might not have the new values immediately. We need to compute the final values inline:

```typescript
const endSession = useCallback(async () => {
  const now = Date.now();
  const currentState = timerStateRef.current;
  
  // Compute what pauseTimer WOULD commit
  const elapsedSinceStart = currentState.isRunning && currentState.runningSinceMs 
    ? now - currentState.runningSinceMs 
    : 0;
  
  const finalItemAccumulatedMs = { ...currentState.itemAccumulatedMs };
  if (currentState.timedTaskId && elapsedSinceStart > 0) {
    finalItemAccumulatedMs[currentState.timedTaskId] = 
      (finalItemAccumulatedMs[currentState.timedTaskId] || 0) + elapsedSinceStart;
  }
  
  // Now save ALL items
  for (const [itemId, accumulatedMs] of Object.entries(finalItemAccumulatedMs)) {
    // ...save each item
  }
  
  // Then clear state
  pauseTimer();
```

---

## Files to Modify

### 1. `src/hooks/useCampaignSession.ts`

**endSession() - Lines ~910-953:**
- Compute final accumulated values inline (including running time)
- Iterate through ALL items in itemAccumulatedMs
- Save each item's accumulated time to database
- Prevent double-saving

**startNewSession() - Lines ~956-1012:**
- Apply same fix as endSession()

**switchToTask() - Lines ~580-649:**
- Remove DB save call (saveItemTime)
- Remove local items update
- Keep only the itemAccumulatedMs commit
- This ensures all persistence is handled by endSession()

### 2. `src/components/campaigns/SortableTaskItem.tsx`

**Add new prop:**
- `isTimerRunning?: boolean` - whether any timer is currently running

**Update styling logic - Lines ~148-175:**
- When timer is running, only timed task gets strong highlight
- Selected-but-not-timed task gets subtle "next up" indicator

### 3. `src/components/campaigns/QuestItemList.tsx`

**Pass isTimerRunning prop - Lines ~188-204:**
- Add prop to know if timer is running globally

### 4. `src/pages/CampaignSession.tsx`

**No changes needed** - already passes timedTaskId and selectedTaskId correctly

---

## Technical Details

### New State Flow for Time Persistence

1. **Start Timer**: Set `runningSinceMs = Date.now()`, set `timedTaskId`
2. **While Running**: Display shows `itemAccumulatedMs[id] + (now - runningSinceMs)` for timed task
3. **Pause Timer**: Commit running time to `itemAccumulatedMs[timedTaskId]`, clear `runningSinceMs`
4. **Switch Task (while running)**: Commit old task's time to `itemAccumulatedMs[oldTaskId]`, set new `timedTaskId`, reset `runningSinceMs = now`
5. **End Session**: 
   - Compute final values (including any running time)
   - For each item in `itemAccumulatedMs`: save to DB
   - Clear localStorage

### Invariants to Maintain

1. **itemAccumulatedMs never includes running time** - running time is only added for display
2. **All DB saves happen in endSession/startNewSession** - no mid-session DB writes for time
3. **switchToTask only commits to itemAccumulatedMs** - no DB saves
4. **Single visual selection** - during timing, only timed task is highlighted

---

## Test Cases

### Test 1: Switch Tasks and End Session
1. Start timer on Task A, wait 10 seconds
2. Click Task B to switch (while running)
3. Wait 15 seconds on Task B
4. End session
5. **Expected**: Task A shows +10s, Task B shows +15s, both saved to DB

### Test 2: Rapid Task Switching
1. Start timer
2. Click Task A, B, C rapidly (switching while running)
3. End session
4. **Expected**: Each task shows only time actually spent on it, totals match

### Test 3: Visual Selection Clarity
1. Start timer on Task A
2. Click Task B (while timer runs)
3. **Expected**: Task A has strong "ACTIVE" highlight, Task B has subtle "next up" indicator

### Test 4: Return to Campaign
1. Work on multiple tasks, end session
2. Navigate away and return to campaign
3. **Expected**: All task times match what was displayed before leaving

---

## Summary

The core issue is that **`endSession()` only saves time for the currently timed task**, while time spent on OTHER tasks during the session (stored in `itemAccumulatedMs`) is lost forever.

The fix ensures ALL accumulated session time is persisted to the database when ending a session, and clarifies the visual distinction between "actively timed" vs "selected for next" tasks.
