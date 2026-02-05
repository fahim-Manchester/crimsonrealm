
# Time Subsumption Feature Implementation Plan

## Overview
This plan implements dynamic time aggregation for parent quest items in campaigns, ensuring that when items are reparented (nested/unnested), their time is correctly added to or subtracted from the new/old parent's displayed total. The changes also sync to the source tasks/projects in Forge and Territories, but only while the campaign remains active.

---

## Requirements Summary

1. **Parent Time Aggregation**: Parent items display their own time + all descendants' time
2. **Dynamic Reparenting**: When moving a child:
   - Old parent subtracts the child's total time from its sync
   - New parent adds the child's total time to its sync
3. **Retroactive Support**: Historical time from previous sessions is included in subsumption
4. **Campaign Status Guard**: Reparenting is blocked on completed campaigns with a notification
5. **Data Preservation**: Deleting or completing a campaign does NOT affect already-synced time in Forge/Territories

---

## Technical Analysis

### Current State
- **Display aggregation** in `QuestItemList.tsx` already sums descendant times (lines 40-60) - this works correctly
- **`setItemParent`** in `useCampaignSession.ts` (lines 367-408) only updates `parent_item_id` in DB and reorders locally - **does NOT sync time changes to source**
- **Time syncing** only happens during timer events (switch task, complete, abandon, end session, manual edit)

### Gap to Fill
When reparenting occurs, the system needs to:
1. Calculate the total time of the moved item (including its own descendants)
2. Adjust the **source project** time in the `projects` table when the old/new parent is a Territory
3. Block reparenting if campaign status is "completed"

---

## Implementation Steps

### Step 1: Add Campaign Status Check in `setItemParent`

**File**: `src/hooks/useCampaignSession.ts`

Before allowing reparenting, check if campaign is completed and return early with an error flag:

```text
const setItemParent = useCallback(async (itemId: string, parentItemId: string | null) => {
  // Block if campaign is completed
  if (campaign?.status === 'completed') {
    return { blocked: true, reason: 'completed' };
  }
  
  const item = items.find((i) => i.id === itemId);
  if (!item) return { blocked: false };
  // ... rest of logic
}, [items, campaign]);
```

### Step 2: Create Helper to Calculate Descendant Time

**File**: `src/hooks/useCampaignSession.ts`

Add a utility function that sums an item's own time plus all descendant times:

```text
const getDescendantTotalSeconds = useCallback((itemId: string) => {
  const childrenMap = buildLocalChildrenMap(items);
  
  const sumTime = (id: string, visited: Set<string>): number => {
    if (visited.has(id)) return 0;
    visited.add(id);
    
    const item = items.find(i => i.id === id);
    if (!item) return 0;
    
    let total = item.time_spent || 0;
    const children = childrenMap.get(id) || [];
    for (const child of children) {
      total += sumTime(child.id, visited);
    }
    return total;
  };
  
  return sumTime(itemId, new Set());
}, [items]);
```

### Step 3: Modify `setItemParent` to Sync Time on Reparent

**File**: `src/hooks/useCampaignSession.ts`

When reparenting:
1. Calculate the moved item's total time (self + descendants)
2. Find the old parent's source project (if it's a Territory) and **subtract** the time
3. Find the new parent's source project (if it's a Territory) and **add** the time

```text
const setItemParent = useCallback(async (itemId: string, parentItemId: string | null) => {
  if (campaign?.status === 'completed') {
    return { blocked: true, reason: 'completed' };
  }
  
  const item = items.find((i) => i.id === itemId);
  if (!item) return { blocked: false };
  if (parentItemId === itemId) return { blocked: false };

  // Calculate total time of moved subtree
  const movedTimeSeconds = getDescendantTotalSeconds(itemId);
  const movedTimeMinutes = Math.ceil(movedTimeSeconds / 60);

  // Find old parent's project (if any)
  const oldParent = item.parent_item_id ? items.find(i => i.id === item.parent_item_id) : null;
  const oldParentProjectId = oldParent?.project_id || null;

  // Find new parent's project (if any)
  const newParent = parentItemId ? items.find(i => i.id === parentItemId) : null;
  const newParentProjectId = newParent?.project_id || null;

  // Subtract from old parent's source project
  if (oldParentProjectId && movedTimeMinutes > 0) {
    await decrementProjectMinutes(oldParentProjectId, movedTimeMinutes);
  }

  // Add to new parent's source project
  if (newParentProjectId && movedTimeMinutes > 0) {
    await incrementProjectMinutes(newParentProjectId, movedTimeMinutes);
  }

  // Update DB
  await supabase
    .from("campaign_items")
    .update({ parent_item_id: parentItemId })
    .eq("id", itemId);

  // Reorder locally (existing logic)
  // ...
  
  return { blocked: false };
}, [items, campaign, getDescendantTotalSeconds, incrementProjectMinutes]);
```

### Step 4: Add `decrementProjectMinutes` Helper

**File**: `src/hooks/useCampaignSession.ts`

Add a new function to safely subtract time (with floor at 0):

```text
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
```

### Step 5: Update UI to Handle Blocked Reparenting

**File**: `src/pages/CampaignSession.tsx`

Modify `handleSetParent` to check the return value and show appropriate notification:

```text
const handleSetParent = async (itemId: string, parentItemId: string | null) => {
  const result = await setItemParent(itemId, parentItemId);
  if (result?.blocked && result.reason === 'completed') {
    toast.error("You can't edit a completed campaign. Revive the campaign if you want to make edits.");
    return;
  }
  toast.success(parentItemId ? "Item embedded" : "Item unembedded");
};
```

### Step 6: Handle Multi-Level Nesting

When a child is moved and it has its own children, the entire subtree's time should be:
- Subtracted from the old ancestor Territory (if any)
- Added to the new ancestor Territory (if any)

The `getDescendantTotalSeconds` function handles this by recursively summing all descendants.

### Step 7: Edge Case - Nested Territory Contains Task

If we have:
```text
Territory A (project)
  └── Task B
```

And Task B is moved to:
```text
Territory C (project)
  └── Task B
```

The implementation should:
- Subtract Task B's time from Territory A's source project
- Add Task B's time to Territory C's source project

This is handled by checking `oldParent?.project_id` and `newParent?.project_id`.

---

## Data Flow Diagram

```text
User drags Item X under Territory Y
          │
          ▼
┌─────────────────────────────────┐
│ Check campaign.status           │
│ Is it "completed"?              │
└─────────────────────────────────┘
          │
    ┌─────┴─────┐
    │ YES       │ NO
    ▼           ▼
┌─────────┐  ┌─────────────────────────────────┐
│ Block   │  │ Calculate Item X's total time   │
│ + Toast │  │ (self + all descendants)        │
└─────────┘  └─────────────────────────────────┘
                        │
                        ▼
             ┌─────────────────────────────────┐
             │ Old parent is Territory?         │
             │ → Subtract time from project DB  │
             └─────────────────────────────────┘
                        │
                        ▼
             ┌─────────────────────────────────┐
             │ New parent (Y) is Territory?     │
             │ → Add time to project DB         │
             └─────────────────────────────────┘
                        │
                        ▼
             ┌─────────────────────────────────┐
             │ Update parent_item_id in DB      │
             │ Reorder items locally            │
             └─────────────────────────────────┘
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useCampaignSession.ts` | Add `decrementProjectMinutes`, `getDescendantTotalSeconds`, modify `setItemParent` to sync time and check campaign status |
| `src/pages/CampaignSession.tsx` | Update `handleSetParent` to handle blocked result and show toast |

---

## Testing Scenarios

1. **Basic reparent**: Move Task A under Territory B → Territory B's source gains Task A's time
2. **Unparent**: Remove Task A from Territory B → Territory B's source loses Task A's time
3. **Switch parent**: Move Task A from Territory B to Territory C → B loses time, C gains time
4. **Nested items**: Move Territory B (with children) under Territory C → C gains total of B + B's children
5. **Completed campaign**: Try to reparent in completed campaign → Blocked with toast message
6. **Delete campaign**: After deletion, Forge/Territories retain their synced times
7. **Zero time item**: Reparent an item with 0 time → No DB calls for time adjustment

---

## Notes

- **Time is stored in seconds** in `campaign_items.time_spent`
- **Time is stored in minutes** in `tasks.time_logged` and `projects.time_spent`
- The display aggregation in `QuestItemList.tsx` already works correctly; this plan focuses on syncing to source
- Campaign deletion already preserves source times (no additional work needed)
- Active timer behavior is unchanged - only the item being actively worked on accumulates time
