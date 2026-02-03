
# Fix Campaign Session Features

## Summary of Issues Identified

After reviewing the code, I found several problems with the current implementation:

### 1. Quick-Add Saves to Main Database (Wrong)
Currently, `CampaignCreator.tsx` (lines 112-141) and `AddItemDialog.tsx` (lines 147-173) insert directly into the `tasks` and `projects` tables when using quick-add. This is incorrect - quick-added items should only exist in `campaign_items` until the user explicitly chooses to make them permanent.

### 2. Same Task/Territory Can't Be Added to Multiple Campaigns
The `AddItemDialog.tsx` (lines 68-69, 80-81) filters out tasks and projects that already exist in any campaign_items - but they should only be filtered within the same campaign.

### 3. Tasks Can't Be Embedded Under Territories
While `parent_item_id` exists in the schema, there's no UI to drag tasks under territories, no visual indentation, and no aggregated time calculation for territories.

### 4. Territories Don't Look Distinct
The `SortableTaskItem.tsx` shows the same styling for tasks and territories, just with different icons.

### 5. Time Not Being Properly Aggregated
When tasks are embedded under a territory, the territory's time should be the sum of all embedded items.

---

## Implementation Plan

### Phase 1: Database Schema Update
Add new columns to track quick-add items vs permanent items:

- **campaign_items table**: Add `is_temporary` (boolean, default false) and `display_name` (text, nullable) columns
  - `is_temporary = true` means it was quick-added and hasn't been saved to main tables
  - `display_name` stores the name when there's no linked task/project

### Phase 2: Fix Quick-Add to NOT Save to Main Tables

**Files**: `AddItemDialog.tsx`, `CampaignCreator.tsx`

Changes:
1. Instead of inserting into `tasks`/`projects` tables, insert into `campaign_items` with:
   - `is_temporary = true`
   - `display_name = user's entered name`
   - `task_id = null` and `project_id = null`
2. Add a new column to distinguish whether the item is a task-type or project-type: store this as metadata (e.g., `item_type: 'task' | 'project'`)

### Phase 3: Add "Make Permanent" Button

**Files**: `SortableTaskItem.tsx`, `useCampaignSession.ts`

Add a toggle/button for temporary items to make them permanent:
1. Show a save icon next to temporary items
2. When clicked, create the actual task/project in the main database
3. Update the `campaign_item` to reference the new record and set `is_temporary = false`
4. Handle duplicate name detection (append "#1", "#2", etc.)

### Phase 4: Allow Same Task/Territory Across Campaigns

**File**: `AddItemDialog.tsx`

Change:
- Remove the filter that excludes items already in this campaign
- Users should be able to add the same task to multiple campaigns

### Phase 5: Implement Task-Under-Territory Embedding

**Files**: `CampaignSession.tsx`, `SortableTaskItem.tsx`, `useCampaignSession.ts`

1. When dragging a task onto a territory, set `parent_item_id` to the territory's item ID
2. Visual changes:
   - Items with `parent_item_id` get `ml-8` (left margin) indentation
   - Territories get a distinct background color (e.g., `bg-accent/5` with amber border)
3. Time aggregation:
   - Calculate territory time as sum of all child item times + its own direct time
   - Display this aggregated time on the territory row
4. Only allow selecting territories as "current task" too (territories are workable items)

### Phase 6: Update Drag-and-Drop Logic

**File**: `CampaignSession.tsx`

Modify the DnD logic to:
1. Detect when dropping onto a territory (project-type item)
2. Set `parent_item_id` accordingly
3. Update display order to place child items after parent
4. Allow dragging items out of territories to become top-level

### Phase 7: Time Persistence Logic

**File**: `useCampaignSession.ts`

Ensure time is saved to source records incrementally:
1. On task switch: save current task's time to `campaign_item.time_spent` and (if linked) to `tasks.time_logged` or `projects.time_spent`
2. On complete/abandon: same as above plus status update
3. For territories: when child times change, update parent territory's aggregated view

---

## Technical Details

### Database Migration
```sql
-- Add columns for temporary items
ALTER TABLE public.campaign_items 
  ADD COLUMN IF NOT EXISTS is_temporary boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS item_type text DEFAULT 'task';

-- Add comment for clarity
COMMENT ON COLUMN public.campaign_items.is_temporary IS 'True if quick-added and not yet saved to main tasks/projects tables';
COMMENT ON COLUMN public.campaign_items.display_name IS 'Display name for temporary items without linked task/project';
COMMENT ON COLUMN public.campaign_items.item_type IS 'Type of item: task or project';
```

### Component Changes Summary

| Component | Changes |
|-----------|---------|
| `SortableTaskItem.tsx` | Add indentation for nested items, distinct territory styling, "make permanent" button |
| `AddItemDialog.tsx` | Change quick-add to create temporary campaign_items instead of main table records |
| `CampaignCreator.tsx` | Same quick-add fix as AddItemDialog |
| `CampaignSession.tsx` | Update drag-drop to support embedding, render nested items correctly |
| `useCampaignSession.ts` | Add functions: `setItemParent()`, `makeItemPermanent()`, calculate aggregated time |
| `useCampaigns.ts` | Update `CampaignItem` interface with new fields |

### Visual Hierarchy Example
```text
Quest Items:
  [Territory] Loveable Practice          30m total  [map icon]
      [Task] Build login page            15m        [hammer icon]
      [Task] Test authentication         10m        [hammer icon]
      [Task] Pop-up: Fix bug #1           5m        [star + hammer icon] [save btn]
  [Task] Send emails                     10m        [hammer icon]
```

### Key Behaviors
1. **Territories styled differently**: Amber/gold tinted background, map icon, shows aggregated time
2. **Nested items indented**: Left margin shows parent-child relationship
3. **Temporary items marked**: Star or sparkle icon + save button to make permanent
4. **Time flows up**: Child time counted in parent territory totals
5. **Territories selectable**: Can work directly on a territory like a task
