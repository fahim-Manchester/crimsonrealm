
# Fix Drag-and-Drop: Embedding & Reordering

## Problem Analysis

After reviewing the code, I found several issues causing both embedding and reordering to fail:

### Issue 1: Nest Drop Zone Has `pointer-events-none`
In `SortableTaskItem.tsx` (line 144), the nest drop zone has `pointer-events-none`, which prevents it from ever receiving any drop events. This completely breaks the embedding feature.

### Issue 2: Collision Detection Confusion
The current approach uses separate drop zones for nesting (`nest:{itemId}`) and sortable reordering (item's `id`). But with `pointer-events-none` on the nest zone, all drops go to the sortable layer, and the `handleDragEnd` only sees the sortable item IDs, never the nest IDs.

### Issue 3: Indentation Not Reflecting Actual Data
The `getIndentLevel` function works correctly, but if `parent_item_id` isn't being set properly in the database during nesting, the indentation won't show.

---

## Solution: Use Drop Position to Determine Intent

Instead of separate overlay drop zones, use a simpler approach based on **where on the target item the user drops**:
- **Drop on left/center portion** → Reorder (same level)
- **Drop on right portion** (or hold briefly) → Nest under target

However, for simplicity and reliability, I'll implement a different approach using explicit "drop to nest" zones that actually work:

### Approach: Overlay Drop Zone with Proper Pointer Events

1. **Remove `pointer-events-none`** from the nest drop zone
2. **Make the nest zone smaller** (e.g., right 25% of the row) so most of the row area is for reordering
3. **Show visual feedback** when hovering over the nest zone

---

## Implementation Plan

### Step 1: Fix `SortableTaskItem.tsx` - Make Nest Zone Interactive

**Current code (broken):**
```tsx
<div
  ref={setNestRef}
  className={cn(
    "absolute inset-0 rounded-sm pointer-events-none", // <-- Problem!
    isNestOver && "ring-2 ring-accent/40"
  )}
/>
```

**Fixed code:**
```tsx
<div
  ref={setNestRef}
  className={cn(
    "absolute right-0 top-0 bottom-0 w-1/4 rounded-r-sm z-10",
    isNestOver && "bg-accent/20 ring-2 ring-accent/40"
  )}
/>
```

This creates a visible "nest zone" on the right 25% of each item that users can drop onto.

### Step 2: Update `QuestItemList.tsx` - Add Visual Feedback During Drag

Add a visual indicator when dragging to show where the nest zone is:
- When an item is being dragged, show a subtle indicator on potential parent items
- Use `useDndMonitor` to track drag state

### Step 3: Add "Unembed" Button to Nested Items

Since the user chose "reorder within same level", add a small button to unembed items instead of relying only on drag:
- Show a small "↰" or unembed icon on nested items
- Clicking it calls `onSetParent(itemId, null)`

### Step 4: Verify `setItemParent` Updates Database Correctly

Ensure `useCampaignSession.ts` properly updates `parent_item_id` in the database and that the optimistic UI update reflects immediately.

---

## Detailed Code Changes

### File: `src/components/campaigns/SortableTaskItem.tsx`

**Changes:**
1. Remove `pointer-events-none` from nest zone
2. Position nest zone on right 25% of the row
3. Add visual feedback (background color change) when hovering
4. Add an "Unembed" button for nested items
5. Show a subtle right-side indicator during drag

### File: `src/components/campaigns/QuestItemList.tsx`

**Changes:**
1. Add drag monitoring to show nest targets more clearly
2. Ensure the `RootDropZone` for unembedding works properly
3. Add visual "drop here to unembed" feedback

### File: `src/hooks/useCampaignSession.ts`

**Changes:**
1. Verify `setItemParent` properly awaits the database update before updating local state
2. Ensure display order is recalculated after nesting

---

## Visual Mockup

```text
Quest Items:
┌──────────────────────────────────────────────────┬─────────┐
│ ⚒️ Tinker with Loveable              10m        │ [NEST]  │
├──────────────────────────────────────────────────┴─────────┤
│   ↳ ⚒️ Minor Debugging                5m          [↰]     │  ← Indented + unembed button
├────────────────────────────────────────────────────────────┤
│ ⚒️ Go and Collect mail                 —                   │
└────────────────────────────────────────────────────────────┘
```

- **[NEST]** = Drop zone (right 25%) - visible during drag
- **[↰]** = Unembed button for nested items
- Nested items have left margin (24px per level)

---

## Technical Summary

| File | Change |
|------|--------|
| `SortableTaskItem.tsx` | Fix nest zone pointer events, add unembed button, position nest zone on right |
| `QuestItemList.tsx` | Add drag state tracking, improve visual feedback |
| `useCampaignSession.ts` | Ensure setItemParent awaits DB update properly |

This fix will enable:
1. **Reordering**: Drag items up/down to reorder within their current level
2. **Embedding**: Drop on the right portion of an item to nest under it
3. **Unembedding**: Click the unembed button on nested items OR drop on empty space
4. **Visual hierarchy**: Nested items show proper indentation
