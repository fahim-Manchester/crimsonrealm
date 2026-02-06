
# Fix: Seamless Task Switching (Remove Dual Selection Confusion)

## The Problem

When you click a task:
- **If timer is running**: It correctly switches the timer to the new task
- **If timer is paused**: It only updates `selectedTaskId` (visual selection) but NOT `timedTaskId` (the actual task to time)

This causes the confusing visual where:
- Task 1 gets a dashed border (selected)
- Task 2 still shows "ACTIVE" label (still marked as the timed task)

Both tasks appear "selected" in different ways - very confusing!

---

## The Solution

**Clicking a task should ALWAYS switch to it, regardless of whether the timer is running or paused.**

When you click a task:
1. Switch `timedTaskId` to that task
2. Switch `selectedTaskId` to that task  
3. If timer was running on another task, commit its time to memory first
4. If timer was paused, just switch the task ID (no time to commit)

This means **only ONE task is ever highlighted** - the one that will be timed when you press Play.

---

## Visual Behavior After Fix

**Timer paused:**
- Click Task A → Task A is highlighted (red border), shows as ready to time
- Press Resume → Timer starts on Task A

**Timer running:**
- Click Task B → Timer switches to Task B immediately
- Task B is now highlighted (red border), Task A's time is committed

**No more dashed borders. No dual selection. One task, one highlight.**

---

## Changes Required

### File 1: `src/hooks/useCampaignSession.ts`

**Modify `setCurrentTaskIndex()` (Lines 1311-1327):**

```typescript
const setCurrentTaskIndex = useCallback((index: number) => {
  const targetItem = items[index];
  if (!targetItem) return;
  if (targetItem.status === 'completed' || targetItem.status === 'abandoned') return;
  
  const currentState = timerStateRef.current;
  
  // If already on this task, do nothing
  if (currentState.timedTaskId === targetItem.id) return;
  
  // ALWAYS switch to the clicked task - whether timer is running or paused
  // switchToTask handles both cases:
  // - If running: commits old task time, switches timer to new task
  // - If paused: just switches task IDs without committing time
  switchToTask(targetItem.id);
}, [items, switchToTask]);
```

The key insight: `switchToTask()` already handles both cases correctly:
- Lines 589-597: If timer is NOT running, it just switches `timedTaskId` and `selectedTaskId`
- Lines 600-631: If timer IS running, it commits time and switches

So we just need to call `switchToTask()` unconditionally!

### File 2: `src/components/campaigns/SortableTaskItem.tsx`

**Simplify the styling logic (Lines 149-184):**

Remove the dashed border logic entirely. Since clicking always switches the timer:
- Only the timed task (`isCurrentTask`) ever gets highlighted
- `isSelected` becomes redundant when timer is running (they're always the same)

```typescript
const getItemStyles = () => {
  if (isCompleted) return "bg-accent/10 border-accent/30";
  if (isAbandoned) return "bg-destructive/10 border-destructive/30";
  
  // The active/selected task - ONLY ONE task can be this at a time
  if (isCurrentTask) return "border-primary bg-primary/20 ring-2 ring-primary/30";
  
  // NOT the current task - show type-specific styles
  if (isTemporary && item.temporary_type === 'task') {
    return "bg-amber-500/10 border-amber-500/40 hover:border-amber-500/60";
  }
  if (isTemporary && item.temporary_type === 'project') {
    return "bg-purple-500/10 border-purple-500/40 hover:border-purple-500/60";
  }
  if (isTerritory) {
    return "bg-accent/5 border-accent/40 hover:border-accent/60";
  }
  return "border-border/50 hover:border-border bg-card/50";
};
```

**Remove unused prop handling:**
- Remove the `isTimerRunning` check in styling (no longer needed)
- The `isSelected` prop can remain for backwards compatibility but won't affect styling when timer is involved

### File 3: `src/components/campaigns/QuestItemList.tsx`

**Simplify the props passed (Lines 189-206):**

Since `selectedTaskId` and `timedTaskId` are now always synced when you click:

```typescript
// Simplified: timedTaskId IS the selected task
const isBeingTimed = timedTaskId === item.id;

return (
  <SortableTaskItem
    key={item.id}
    item={item}
    isCurrentTask={isBeingTimed}
    // isSelected can be removed or kept same as isCurrentTask
    isSelected={isBeingTimed}
    isTimerRunning={isTimerRunning}
    // ... rest unchanged
  />
);
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `useCampaignSession.ts` | `setCurrentTaskIndex()` always calls `switchToTask()` |
| `SortableTaskItem.tsx` | Remove dashed border logic, simplify to single highlight |
| `QuestItemList.tsx` | Sync `isSelected` with `isCurrentTask` |

---

## Behavior After Fix

1. **Click any task** → That task becomes the "active" one with red border
2. **Press Play** → Timer starts on that task
3. **Click another task while running** → Timer switches immediately
4. **No dashed borders**, no dual selection, no confusion

---

## Test Cases

| Test | Expected |
|------|----------|
| Timer paused, click Task B | Only Task B is highlighted (red border) |
| Press Resume | Timer starts on Task B |
| Click Task C while running | Task C becomes highlighted, Task B's time is saved to memory |
| End session | All task times are saved to database |
